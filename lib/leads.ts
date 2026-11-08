/**
 * Every form on the site sends here.
 *
 * The site is static (GitHub Pages), so there is no server of our own. Each
 * submission goes to the "Website Leads" Google Apps Script, which adds a row to
 * the Website Leads sheet (one tab per form) and emails business@voltairtech.com (the Kauntech support inbox).
 * The script lives in the voltairtechindia@gmail.com Google account.
 */
export const LEADS_URL =
  process.env.NEXT_PUBLIC_LEADS_URL ||
  "https://script.google.com/macros/s/AKfycbxDZHyP-NUZ6upTBAHzXynSdvcqvgYPA4u6FDCmeGfGg9wSXwUpRJXfGSqGcSOHCUsp/exec";

const SITE = "kauntech";

type Value = string | number | boolean | null | undefined;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Send one form submission. `honeypot` is the hidden field bots fill in; the
 * script drops those silently. Throws when the sheet could not be reached so the
 * form can show its "email us instead" message.
 */
export async function sendLead(
  form: string,
  fields: Record<string, Value>,
  opts: { file?: File | null; honeypot?: string } = {},
): Promise<void> {
  const payload: Record<string, unknown> = { site: SITE, form };
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null || v === "") continue;
    payload[k] = typeof v === "string" ? v.trim() : v;
  }
  if (typeof location !== "undefined") payload.page = location.href;
  if (opts.honeypot) payload._hp = opts.honeypot;
  if (opts.file) {
    payload.file = {
      name: opts.file.name,
      type: opts.file.type,
      data: await fileToBase64(opts.file),
    };
  }

  // Enquiries (not job applications) also go to the admin panel's Inquiries
  // page through our own Function (functions/api/inquiry.ts). Best effort: the
  // Sheet and the email below are what the visitor's success depends on.
  if ((form === "contact" || form === "chat") && typeof window !== "undefined") {
    fetch("/api/inquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }

  // text/plain keeps this a "simple" request: no CORS preflight, which Apps
  // Script cannot answer. The script still reads the body as JSON.
  const res = await fetch(LEADS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
  if (!res.ok || !data?.ok) throw new Error("lead_not_saved");
}
