/**
 * POST /api/inquiry  (the same JSON lib/leads.ts sends to the Google Sheet)
 *
 * Saves contact-form and chat enquiries to Supabase `contact_submissions`, the
 * table the admin panel's Inquiries page reads. The Google Sheet and the email
 * to the team still come from the Apps Script; this is the admin copy.
 */
import { json, prepare, type PagesContext } from "../_lib/runtime";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function onRequestPost(ctx: PagesContext): Promise<Response> {
  prepare(ctx);
  let body: Record<string, unknown>;
  try {
    body = await ctx.request.json();
  } catch {
    return json({ detail: "Invalid JSON body." }, 400);
  }
  // Honeypot: bots fill the hidden field. Accept silently, store nothing.
  if (str(body._hp)) return json({ ok: true });

  const form = str(body.form, 40) || "contact";
  const name = str(body.name);
  const company = str(body.company);
  const rawEmail = str(body.email, 320);
  const email = EMAIL_RE.test(rawEmail) ? rawEmail : "";
  const phone = str(body.phone, 50);
  const message =
    str(body.message, 5000) ||
    str(body.question, 5000) ||
    (form === "chat" ? "(Asked to be contacted from the chat)" : "");

  if (!name) return json({ detail: "name is required." }, 400);
  if (!email && !phone) return json({ detail: "An email or phone number is required." }, 400);
  if (!message) return json({ detail: "message is required." }, 400);

  const { LIMITS, getClientIp, istDay, rlHit } = await import("../../lib/rate-limit");
  const { insertContactSubmission } = await import("../../lib/contact");
  const ip = getClientIp(ctx.request);
  const [burst, daily] = await Promise.all([
    rlHit(`contact:burst:${ip}`, LIMITS.contactBurst.limit, LIMITS.contactBurst.windowSeconds),
    rlHit(`contact:day:${istDay()}:${ip}`, LIMITS.contactDaily.limit, LIMITS.contactDaily.windowSeconds),
  ]);
  if (!burst.allowed || !daily.allowed) return json({ detail: "Too many submissions." }, 429);

  const services = str(body.services, 2000)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const metadata: Record<string, unknown> = {
    form,
    reply_channel: /whatsapp/i.test(str(body.reply_on)) || (!email && phone) ? "whatsapp" : "email",
  };
  if (services.length) metadata.services = services;
  if (str(body.industry)) metadata.industry_title = str(body.industry);
  if (str(body.service_page)) metadata.service_title = str(body.service_page);
  if (str(body.source)) metadata.source = str(body.source);
  if (str(body.question)) metadata.chat_question = str(body.question, 2000);

  try {
    await insertContactSubmission({
      name,
      company: company || null,
      phone: phone || null,
      email,
      message,
      page_url: str(body.page, 500) || null,
      user_agent: ctx.request.headers.get("user-agent"),
      metadata,
    });
    return json({ ok: true });
  } catch (err) {
    console.error("[inquiry] insert failed", err);
    return json({ detail: "Could not save." }, 500);
  }
}
