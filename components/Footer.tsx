"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="brand-container" style={{ marginBottom: 16, display: "flex" }}>
              <img src="/assets/logo-gold.png" alt="Kauntech Logo" className="nav-logo-img" />
              <span className="logo-text">
                KAUN<span>TECH</span>
              </span>
            </Link>
            <p>
              The only offline-first business card scanner engineered for absolute speed, AI
              enrichment, and strict adherence to India&apos;s DPDP Act 2023. We do not retain your
              data.
            </p>
            <div style={{ fontSize: "0.8rem", color: "var(--gold)", fontFamily: "var(--mono)" }}>
              <i className="fa-solid fa-shield-halved" /> AES-256 Encrypted · On-Device
            </div>
          </div>

          <div className="footer-col">
            <h4>Product</h4>
            <Link href="/features">Offline Superpowers</Link>
            <Link href="/features">AI Enrichment</Link>
            <Link href="/how-it-works">30s Workflow</Link>
            <Link href="/pricing">Pricing Plans</Link>
            <Link href="/pricing">Top-Ups & Tokens</Link>
          </div>

          <div className="footer-col">
            <h4>Compliance</h4>
            <Link href="/compliance">DPDP Act 2023</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/delete-request">Data Deletion Request</Link>
            <Link href="/privacy#google-disclosure">Google API Limited Use</Link>
          </div>

          <div className="footer-col">
            <h4>Stay Updated</h4>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-dim)",
                marginBottom: 12,
              }}
            >
              Subscribe to our newsletter for exclusive networking tips and DPDP regulatory updates.
            </p>
            <form
              className="footer-newsletter"
              onSubmit={(e) => {
                e.preventDefault();
                alert("Thank you for subscribing to Kauntech updates!");
              }}
            >
              <input type="email" placeholder="Enter your business email" required />
              <button type="submit">Subscribe Now</button>
            </form>
          </div>
        </div>

        <div className="footer-bottom">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>© 2026 Kauntech Technologies Pvt. Ltd. All rights reserved.</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
              Built with 1 year of hard work, upgraded to new heights with AI.
            </div>
          </div>
          <div className="footer-social">
            <a
              href="https://www.linkedin.com/company/120934522/admin/dashboard/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
            >
              <i className="fa-brands fa-linkedin-in" />
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61589123915607"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <i className="fa-brands fa-facebook-f" />
            </a>
            <a
              href="https://www.instagram.com/kauntech/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <i className="fa-brands fa-instagram" />
            </a>
            <a
              href="https://kauntech.quora.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Quora"
            >
              <i className="fa-brands fa-quora" />
            </a>
            <a
              href="https://discord.gg/AVYMsrhk"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
            >
              <i className="fa-brands fa-discord" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
