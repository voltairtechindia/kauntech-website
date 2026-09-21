"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Ic from "@/components/ui/Icon";
import Brand from "@/components/ui/BrandIcons";

const socials = [
  { href: "https://www.linkedin.com/company/120934522/", label: "LinkedIn", name: "linkedin" as const },
  { href: "https://www.facebook.com/profile.php?id=61589123915607", label: "Facebook", name: "facebook" as const },
  { href: "https://www.instagram.com/kauntech/", label: "Instagram", name: "instagram" as const },
  { href: "https://kauntech.quora.com/", label: "Quora", name: "quora" as const },
  { href: "https://discord.gg/AVYMsrhk", label: "Discord", name: "discord" as const },
  { href: "https://www.reddit.com/r/Kauntech/", label: "Reddit", name: "reddit" as const },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="brand-container" style={{ marginBottom: 16, display: "flex" }}>
              <img src="/assets/logo-gold.webp" alt="Kauntech Logo" className="nav-logo-img" width={40} height={40} loading="lazy" decoding="async" />
              <span className="logo-text">
                KAUN<span>TECH</span>
              </span>
            </Link>
            <p>
              The only offline-first business card scanner engineered for absolute speed, AI
              enrichment, and strict adherence to India&apos;s DPDP Act 2023. You stay in control of
              your data - disable cloud backup or delete it anytime.
            </p>
            <span className="footer-sec">
              <Ic icon={ShieldCheck} /> AES-256 Encrypted · On-Device OCR
            </span>
          </div>

          <div className="footer-col">
            <h4>Product</h4>
            <Link href="/features">Offline Superpowers</Link>
            <Link href="/features">AI Enrichment</Link>
            <Link href="/how-it-works">30s Workflow</Link>
            <Link href="/pricing">Pricing Plans</Link>
            <Link href="/pricing">Top-Ups & Tokens</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/career">Careers</Link>
            <Link href="/enterprise">Enterprise</Link>
            <Link href="/enterprise/admin-auth">Enterprise sign-in</Link>
            <Link href="/contact">Contact</Link>
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
                marginBottom: 16,
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
              <div className="fnews">
                <input type="email" placeholder="Enter your business email" required />
                <button type="submit" aria-label="Subscribe">
                  <Ic icon={ArrowRight} />
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="footer-bottom">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>© 2026 Kauntech. All rights reserved.</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
              Built with 1 year of hard work, upgraded to new heights with AI.
            </div>
            <a
              href="https://www.producthunt.com/products/kauntech-app?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-kauntech-app"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", marginTop: 4 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1172104&theme=light&t=1781509202784"
                alt="Kauntech App - Scan. Sync. Sell. Repeat. | Product Hunt"
                width="250"
                height="54"
                style={{ width: "180px", height: "auto", display: "block" }}
                loading="lazy"
                decoding="async"
              />
            </a>
          </div>
          <div className="footer-social">
            {socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                <Brand name={s.name} />
              </a>
            ))}
          </div>
        </div>

        <span className="footer-mark" aria-hidden="true">
          KAUNTECH
        </span>
      </div>
    </footer>
  );
}
