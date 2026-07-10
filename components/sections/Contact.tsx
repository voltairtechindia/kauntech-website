"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Handshake with /contact/thank-you: the conversion only fires when this flag is
// present, so a refresh or a direct visit to the thank-you URL can't inflate leads.
export const LEAD_FLAG = "kt_lead_submitted";

export default function Contact() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [error, setError] = useState("");

  // The thank-you page is static: warm it so the post-submit hop is instant.
  useEffect(() => {
    router.prefetch("/contact/thank-you");
  }, [router]);

  // Gate the button on native validity: every required field filled, email/phone
  // well-formed. Recomputed on any input/change (covers autofill + paste).
  const syncValidity = () => setCanSubmit(!!formRef.current?.checkValidity());

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
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="cName" style={labelStyle}>
                  Your name
                </label>
                <input
                  type="text"
                  id="cName"
                  name="Name"
                  placeholder="Priya Sharma"
                  autoComplete="name"
                  maxLength={200}
                  required
                  className="contact-field"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="cCompany" style={labelStyle}>
                  Company
                </label>
                <input
                  type="text"
                  id="cCompany"
                  name="Company"
                  placeholder="Acme Logistics Pvt. Ltd."
                  autoComplete="organization"
                  maxLength={200}
                  required
                  className="contact-field"
                />
              </div>
            </div>

            <div style={rowStyle}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="cPhone" style={labelStyle}>
                  Phone
                </label>
                <input
                  type="tel"
                  id="cPhone"
                  name="Phone"
                  placeholder="+91 90000 12345"
                  autoComplete="tel"
                  maxLength={50}
                  required
                  className="contact-field"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="cEmail" style={labelStyle}>
                  Work email
                </label>
                <input
                  type="email"
                  id="cEmail"
                  name="Email"
                  placeholder="priya@acmelogistics.in"
                  autoComplete="email"
                  maxLength={320}
                  required
                  className="contact-field"
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label htmlFor="cMessage" style={labelStyle}>
                What do you need help with?
              </label>
              <textarea
                id="cMessage"
                name="Message"
                rows={4}
                placeholder="e.g. We're a 20-person sales team scanning ~200 cards a month and want a demo."
                maxLength={5000}
                required
                className="contact-field"
                style={{ resize: "vertical" }}
              />
            </div>

            <button
              type="submit"
              className="btn-primary contact-submit"
              disabled={!canSubmit || submitting}
            >
              <span>{submitting ? "Sending..." : "Send message"}</span>
              <i className={submitting ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-paper-plane"} />
            </button>

            <p className="contact-note">
              {canSubmit || submitting
                ? "We only use these details to reply to you. No spam, ever."
                : "Fill in all five fields to send your message."}
            </p>

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
