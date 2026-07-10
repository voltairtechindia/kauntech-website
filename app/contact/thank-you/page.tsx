import type { Metadata } from "next";
import Link from "next/link";
import LeadConversion from "@/components/LeadConversion";

export const metadata: Metadata = {
  title: "Thanks — we've got your message",
  description: "Your message has reached the Kauntech team. We'll reply within one business day.",
  // A conversion landing page has no search value and must never be indexed.
  robots: { index: false, follow: false },
};

export default function ContactThankYouPage() {
  return (
    <main style={{ paddingTop: 80 }}>
      <LeadConversion />
      <section className="cta-banner">
        <div className="container">
          <div
            className="cta-box"
            style={{
              padding: 48,
              borderRadius: 24,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              width: "100%",
              maxWidth: 720,
              margin: "0 auto",
              textAlign: "center",
            }}
          >
            <i className="fa-solid fa-circle-check thankyou-icon" />
            <h1 className="contact-heading" style={{ marginTop: 20 }}>
              Thanks — your message is in
            </h1>
            <p
              style={{
                fontSize: "1.1rem",
                color: "var(--text-dim)",
                margin: "16px auto 32px",
                maxWidth: 520,
                lineHeight: 1.6,
              }}
            >
              A member of the Kauntech team will get back to you within one business day, usually on
              the email you gave us.
            </p>

            <div className="thankyou-next">
              <p>While you wait:</p>
              <ul>
                <li>
                  <i className="fa-solid fa-mobile-screen" />
                  <span>
                    <Link href="/">Download the app</Link> and scan your first card free — no account
                    needed.
                  </span>
                </li>
                <li>
                  <i className="fa-solid fa-indian-rupee-sign" />
                  <span>
                    Compare <Link href="/pricing">plans and K-Token packs</Link> before we talk.
                  </span>
                </li>
                <li>
                  <i className="fa-solid fa-circle-question" />
                  <span>
                    Get an instant answer in our <Link href="/faq">FAQ</Link>.
                  </span>
                </li>
              </ul>
            </div>

            <p style={{ color: "var(--text-dim)", fontSize: "0.95rem", marginTop: 28 }}>
              Need us sooner? Email{" "}
              <a href="mailto:business@voltairtech.com">business@voltairtech.com</a>.
            </p>

            <Link
              href="/"
              className="btn-secondary"
              style={{ marginTop: 28, display: "inline-flex" }}
            >
              <i className="fa-solid fa-arrow-left" />
              <span>Back to home</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
