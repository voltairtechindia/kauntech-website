"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Handshake with /contact/thank-you: the conversion only fires when this flag is
// present, so a refresh or a direct visit to the thank-you URL can't inflate leads.
export const LEAD_FLAG = "kt_lead_submitted";

type FieldName = "Name" | "Company" | "Phone" | "Email" | "Message";
const FIELDS: FieldName[] = ["Name", "Company", "Phone", "Email", "Message"];

const REQUIRED: Record<FieldName, string> = {
  Name: "Please tell us your name.",
  Company: "Please add your company name.",
  Phone: "Please add a phone number we can reach you on.",
  Email: "Please add your work email.",
  Message: "Please tell us what you need help with.",
};

// Mirrors the server's EMAIL_RE (app/api/contact/route.ts) but also insists on a
// dotted TLD — the browser's own type="email" check happily accepts "a@b".
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const PHONE_CHARS_RE = /^[+\d][\d\s().-]*$/;

/** "" when the field is good; otherwise the message to show under it. */
function validateField(name: FieldName, raw: string): string {
  const value = raw.trim();
  if (!value) return REQUIRED[name];

  if (name === "Email" && !EMAIL_RE.test(value)) {
    return "That doesn't look like an email address. Example: priya@acmelogistics.in";
  }
  if (name === "Phone") {
    if (!PHONE_CHARS_RE.test(value)) {
      return "Use only digits, spaces and + ( ) - in a phone number.";
    }
    const digits = (value.match(/\d/g) ?? []).length;
    if (digits < 7 || digits > 15) {
      return "That phone number doesn't look right. Example: +91 90000 12345";
    }
  }
  if (name === "Message" && value.length < 5) {
    return "Tell us a little more so we can reply properly.";
  }
  return "";
}

export default function Contact() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  // Seed with the "empty" verdict so the first server render agrees with the
  // first client render (an untouched form is exactly five missing fields).
  const [problems, setProblems] = useState<Partial<Record<FieldName, string>>>(
    () => ({ ...REQUIRED })
  );
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [error, setError] = useState("");

  // The thank-you page is static: warm it so the post-submit hop is instant.
  useEffect(() => {
    router.prefetch("/contact/thank-you");
  }, [router]);

  // Re-validate every field, push each verdict into the element's own validity via
  // setCustomValidity (so form.checkValidity() — and the button — agree with the
  // messages we render), and recompute whether the form can be submitted.
  const syncValidity = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const next: Partial<Record<FieldName, string>> = {};
    for (const name of FIELDS) {
      const el = form.elements.namedItem(name) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      if (!el) continue;
      const msg = validateField(name, el.value);
      el.setCustomValidity(msg);
      next[name] = msg;
    }
    setProblems(next);
    setCanSubmit(form.checkValidity());
  }, []);

  // Autofill and back-forward restore don't fire input events; check once on mount.
  useEffect(() => syncValidity(), [syncValidity]);

  // Only complain about a field once the user has left it — no yelling mid-type.
  const handleBlur = (e: React.FocusEvent<HTMLFormElement>) => {
    // React types e.target as the form; the real target is whichever control blurred.
    const name = (e.target as unknown as { name?: string }).name as FieldName;
    if (FIELDS.includes(name)) setTouched((t) => ({ ...t, [name]: true }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitting(true);
    setError("");
    const data = new FormData(form);

    // Supabase via our own API route — the single store. Inquiries are read back
    // in kauntech-admin (lib/inquiries.ts).
    let ok = false;
    let detail = "";
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("Name"),
          company: data.get("Company"),
          phone: data.get("Phone"),
          email: data.get("Email"),
          message: data.get("Message"),
          website: data.get("website"), // honeypot — bots fill this
          page_url: typeof location !== "undefined" ? location.href : undefined,
        }),
      });
      ok = res.ok;
      if (!ok) {
        const j = (await res.json().catch(() => null)) as {
          detail?: string;
        } | null;
        if (j && typeof j.detail === "string") detail = j.detail;
      }
    } catch (err) {
      console.error(err);
    }

    if (ok) {
      try {
        sessionStorage.setItem(LEAD_FLAG, "1");
      } catch {
        // private mode / storage disabled — the thank-you page still renders,
        // it just won't fire the conversion. Better than blocking the redirect.
      }
      form.reset();
      router.push("/contact/thank-you");
      return; // keep the button in its "Sending..." state through the navigation
    }

    setError(
      detail ||
        "Sorry, we couldn't send your message just now. Please email business@voltairtech.com and we'll get right back to you."
    );
    setSubmitting(false);
  };

  const shown = (name: FieldName) => (touched[name] ? problems[name] ?? "" : "");
  const fieldProps = (name: FieldName, id: string) => ({
    name,
    id,
    className: "contact-field",
    required: true,
    "aria-invalid": shown(name) ? true : undefined,
    "aria-describedby": shown(name) ? `${id}-err` : undefined,
  });

  const fieldError = (name: FieldName, id: string) => {
    const msg = shown(name);
    if (!msg) return null;
    return (
      <p className="field-error" id={`${id}-err`}>
        <i className="fa-solid fa-circle-exclamation" />
        <span>{msg}</span>
      </p>
    );
  };

  // Hint under the button. If they've filled everything but something is
  // malformed, say so — never leave a dead button unexplained.
  const anyShownProblem = FIELDS.some((n) => shown(n));
  const allFilled = FIELDS.every((n) => problems[n] !== REQUIRED[n]);
  const hint = canSubmit
    ? "We only use these details to reply to you. No spam, ever."
    : anyShownProblem || allFilled
      ? "Please fix the highlighted fields above."
      : "Fill in all five fields to send your message.";

  const labelStyle = {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--text-dim)",
  } as const;
  const rowStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 20,
  } as const;
  const cellStyle = { display: "flex", flexDirection: "column", gap: 8 } as const;

  return (
    <section className="cta-banner" id="contact">
      <div className="container">
        <div
          className="cta-box reveal"
          style={{
            padding: 48,
            borderRadius: 24,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            width: "100%",
            maxWidth: 1050,
            margin: "0 auto",
          }}
        >
          <h1 className="contact-heading">Talk to the Kauntech team</h1>
          <p
            style={{
              fontSize: "1.1rem",
              color: "var(--text-dim)",
              margin: "16px auto 28px",
              maxWidth: 620,
              lineHeight: 1.6,
            }}
          >
            Fill in the form and we&apos;ll reply within one business day.
          </p>

          <ul className="contact-uses">
            <li>
              <i className="fa-solid fa-circle-play" />
              <span>
                <strong>Book a demo</strong> — watch Kauntech scan a stack of cards, fully offline.
              </span>
            </li>
            <li>
              <i className="fa-solid fa-tag" />
              <span>
                <strong>Get a price for your team</strong> — bulk seats, K-Token packs, custom plans.
              </span>
            </li>
            <li>
              <i className="fa-solid fa-comments" />
              <span>
                <strong>Ask a question</strong> — integrations, DPDP compliance, switching from
                another scanner.
              </span>
            </li>
          </ul>

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            onInput={syncValidity}
            onChange={syncValidity}
            onBlur={handleBlur}
            noValidate
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              textAlign: "left",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* Honeypot: hidden from humans; bots that fill it are dropped server-side.
                The data-*-ignore attrs stop password managers from autofilling it,
                which would otherwise silently drop a real user's submission. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            />

            <div style={rowStyle}>
              <div style={cellStyle}>
                <label htmlFor="cName" style={labelStyle}>
                  Your name
                </label>
                <input
                  type="text"
                  placeholder="Priya Sharma"
                  autoComplete="name"
                  maxLength={200}
                  {...fieldProps("Name", "cName")}
                />
                {fieldError("Name", "cName")}
              </div>
              <div style={cellStyle}>
                <label htmlFor="cCompany" style={labelStyle}>
                  Company
                </label>
                <input
                  type="text"
                  placeholder="Acme Logistics Pvt. Ltd."
                  autoComplete="organization"
                  maxLength={200}
                  {...fieldProps("Company", "cCompany")}
                />
                {fieldError("Company", "cCompany")}
              </div>
            </div>

            <div style={rowStyle}>
              <div style={cellStyle}>
                <label htmlFor="cPhone" style={labelStyle}>
                  Phone
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="+91 90000 12345"
                  autoComplete="tel"
                  maxLength={50}
                  {...fieldProps("Phone", "cPhone")}
                />
                {fieldError("Phone", "cPhone")}
              </div>
              <div style={cellStyle}>
                <label htmlFor="cEmail" style={labelStyle}>
                  Work email
                </label>
                <input
                  type="email"
                  inputMode="email"
                  placeholder="priya@acmelogistics.in"
                  autoComplete="email"
                  maxLength={320}
                  {...fieldProps("Email", "cEmail")}
                />
                {fieldError("Email", "cEmail")}
              </div>
            </div>

            <div style={cellStyle}>
              <label htmlFor="cMessage" style={labelStyle}>
                What do you need help with?
              </label>
              <textarea
                rows={4}
                placeholder="e.g. We're a 20-person sales team scanning ~200 cards a month and want a demo."
                maxLength={5000}
                style={{ resize: "vertical" }}
                {...fieldProps("Message", "cMessage")}
              />
              {fieldError("Message", "cMessage")}
            </div>

            <button
              type="submit"
              className="btn-primary contact-submit"
              disabled={!canSubmit || submitting}
            >
              <span>{submitting ? "Sending..." : "Send message"}</span>
              <i className={submitting ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-paper-plane"} />
            </button>

            <p className="contact-note">{hint}</p>

            {error && (
              <div role="alert" aria-live="assertive" className="contact-error">
                <i className="fa-solid fa-circle-exclamation" />
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
