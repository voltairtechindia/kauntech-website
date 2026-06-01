"use client";

import { useState } from "react";

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbztbMN_DrSEfxk7F6gljRxpYBp7qhkybE0on_Jfc5JvtIAg7ymdZCDVHVd3Szm3pPj0/exec";

type Status = { kind: "success" | "error"; text: string } | null;

export default function Contact() {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitting(true);
    setStatus(null);
    const data = new FormData(form);

    // Canonical store: Supabase via our own API route (returns real success).
    let ok = false;
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
    } catch (err) {
      console.error(err);
    }

    // Best-effort mirror to the existing Google Sheet (fire-and-forget).
    try {
      await fetch(SCRIPT_URL, { method: "POST", body: data, mode: "no-cors" });
    } catch (err) {
      console.error(err);
    }

    if (ok) {
      setStatus({
        kind: "success",
        text: "Thank you! Your message has been received — our team will revert as soon as possible.",
      });
      form.reset();
    } else {
      setStatus({
        kind: "error",
        text: "Sorry, we couldn't submit your message just now. Please email business@voltairtech.com and we'll get right back to you.",
      });
    }
    setSubmitting(false);
  };

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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <i
              className="fa-solid fa-envelope-open-text"
              style={{ fontSize: "2rem", color: "var(--gold)" }}
            />
            <h2 style={{ fontSize: "2.4rem", fontWeight: 900, margin: 0 }}>
              Get in Touch / Request Demo
            </h2>
          </div>
          <p
            style={{
              fontSize: "1.1rem",
              color: "var(--text-dim)",
              marginBottom: 32,
              maxWidth: 850,
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.6,
            }}
          >
            Have questions about Kauntech, enterprise custom plans, or AI token allotments? Fill out
            the form below and our team will revert as soon as possible.
          </p>

          <form
            onSubmit={handleSubmit}
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: 20,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="cName" style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-dim)" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  id="cName"
                  name="Name"
                  placeholder="e.g. Priya Sharma"
                  required
                  className="contact-field"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="cCompany" style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-dim)" }}>
                  Company Name *
                </label>
                <input
                  type="text"
                  id="cCompany"
                  name="Company"
                  placeholder="e.g. Acme Logistics Pvt. Ltd."
                  required
                  className="contact-field"
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: 20,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="cPhone" style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-dim)" }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="cPhone"
                  name="Phone"
                  placeholder="e.g. +91 90000 12345"
                  required
                  className="contact-field"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="cEmail" style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-dim)" }}>
                  Email ID *
                </label>
                <input
                  type="email"
                  id="cEmail"
                  name="Email"
                  placeholder="e.g. priya@acmelogistics.in"
                  required
                  className="contact-field"
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label htmlFor="cMessage" style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-dim)" }}>
                Message / Inquiry *
              </label>
              <textarea
                id="cMessage"
                name="Message"
                rows={4}
                placeholder="Tell us your team size, daily card volume, and any custom features or integrations you need..."
                required
                className="contact-field"
                style={{ resize: "vertical" }}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 16,
                justifyContent: "flex-end",
                marginTop: 10,
              }}
            >
              <button
                type="reset"
                className="btn-secondary"
                style={{ padding: "14px 28px", fontSize: "0.95rem" }}
              >
                <i className="fa-solid fa-rotate-left" />
                <span>Reset Form</span>
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                style={{ padding: "14px 36px", fontSize: "0.95rem" }}
              >
                <span>{submitting ? "Sending..." : "Send Message"}</span>
                <i className={submitting ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-paper-plane"} />
              </button>
            </div>

            {status && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 18px",
                  borderRadius: 12,
                  fontSize: "0.95rem",
                  lineHeight: 1.5,
                  background:
                    status.kind === "success"
                      ? "rgba(34,197,94,0.12)"
                      : "rgba(239,68,68,0.12)",
                  border:
                    status.kind === "success"
                      ? "1px solid rgba(34,197,94,0.45)"
                      : "1px solid rgba(239,68,68,0.45)",
                  color: status.kind === "success" ? "#4ade80" : "#f87171",
                }}
              >
                <i
                  className={
                    status.kind === "success"
                      ? "fa-solid fa-circle-check"
                      : "fa-solid fa-circle-exclamation"
                  }
                />
                <span>{status.text}</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
