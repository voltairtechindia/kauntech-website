"use client";

import { useState } from "react";

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbztbMN_DrSEfxk7F6gljRxpYBp7qhkybE0on_Jfc5JvtIAg7ymdZCDVHVd3Szm3pPj0/exec";

const fieldStyle: React.CSSProperties = {
  padding: "14px 18px",
  borderRadius: 12,
  background: "var(--bg)",
  border: "1px solid var(--border)",
  color: "#fff",
  fontFamily: "var(--font)",
  fontSize: "1rem",
};

export default function Contact() {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitting(true);
    try {
      const data = new FormData(form);
      await fetch(SCRIPT_URL, { method: "POST", body: data, mode: "no-cors" });
    } catch (err) {
      console.error(err);
    } finally {
      alert(
        "Thank you! Your message has been successfully shared. Our team will revert as soon as possible."
      );
      form.reset();
      setSubmitting(false);
    }
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
            style={{ display: "flex", flexDirection: "column", gap: 20, textAlign: "left" }}
          >
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
                  placeholder="e.g. Harshal Vadgama"
                  required
                  style={fieldStyle}
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
                  placeholder="e.g. Kauntech AI"
                  required
                  style={fieldStyle}
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
                  placeholder="e.g. +91 98765 43210"
                  required
                  style={fieldStyle}
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
                  placeholder="e.g. business@kauntech.com"
                  required
                  style={fieldStyle}
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
                placeholder="Tell us about your requirements, event dates, or custom feature requests..."
                required
                style={{ ...fieldStyle, resize: "vertical" }}
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
          </form>
        </div>
      </div>
    </section>
  );
}
