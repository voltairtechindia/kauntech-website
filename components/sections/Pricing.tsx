"use client";

import Link from "next/link";
import { Check, CircleCheck, Coins, Rocket } from "lucide-react";
import Ic from "@/components/ui/Icon";
import Brand from "@/components/ui/BrandIcons";

// Plans bill yearly only (monthly retired 2026-09). Prices and scan pools mirror
// the app paywall: kauntech-app constants/plans.ts and app/(tabs)/plan.tsx.
export default function Pricing() {
  return (
    <section id="pricing">
      <div className="container">
        <div className="section-header reveal" style={{ marginBottom: 24 }}>
          <span className="section-label">Flexible Investment</span>
          <h1>Choose Your Kauntech Plan</h1>
          <p>
            Unlock absolute offline scanning power, AI enrichment, and multi-channel automations
            tailored to your scale.
          </p>
        </div>

        <div className="pricing-header-top reveal">
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(129, 140, 248, 0.15))",
              border: "1px solid var(--gold)",
              padding: "20px 32px",
              borderRadius: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              textAlign: "left",
              maxWidth: 750,
              margin: "0 auto",
              boxShadow: "0 12px 35px rgba(249, 115, 22, 0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontWeight: 800,
                fontSize: "1.1rem",
                color: "var(--gold)",
              }}
            >
              <i className="ic" style={{ fontSize: "1.3rem" }} aria-hidden="true">
                <Rocket />
              </i>
              <span>Exclusive Pre-Launch Rewards</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.95rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <i
                  className="ic"
                  style={{ color: "#34d399", marginTop: 3, flexShrink: 0 }}
                  aria-hidden="true"
                >
                  <CircleCheck />
                </i>
                <span>
                  <strong>First 1,000 Downloads (First 15 Days):</strong> Instantly unlock a 7-Day
                  Pro Trial fully equipped with AI Intel enrichment.
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <i
                  className="ic"
                  style={{ color: "#ff4500", marginTop: 3, flexShrink: 0, fontSize: "1.1rem" }}
                  aria-hidden="true"
                >
                  <Brand name="reddit" />
                </i>
                <span>
                  <strong>First 100 Reddit Reviewers:</strong> Share your genuine review or feedback
                  on{" "}
                  <a
                    href="https://www.reddit.com/r/Kauntech"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--gold)", textDecoration: "underline" }}
                  >
                    r/Kauntech
                  </a>{" "}
                  to earn an elite 7-Day Pro/Ultra upgrade!
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="pricing-grid reveal reveal-delay-1">
          <div className="price-card">
            <h2 className="price-name">Free</h2>
            <div className="price-amount">
              <span className="currency">₹</span>0<span className="period">/ forever</span>
            </div>
            <div className="price-desc">
              Perfect for individual professionals exploring offline business card scanning.
            </div>
            <ul className="price-features">
              <li><span className="pf-check"><Ic icon={Check} /></span> 49 Scans / month</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> 100 K-Tokens / month</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> 1 VCard · 2 Products · 2 Templates</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> QR Code &amp; NFC Scanning</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> CSV Export included</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> Webhook &amp; WhatsApp Sync</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> Offline-First Mode</li>
            </ul>
          </div>

          <div className="price-card featured">
            <h2 className="price-name" style={{ color: "var(--gold)" }}>Pro</h2>
            <div className="price-amount">
              <span className="currency">₹</span>
              1,499
              <span className="period">/ year</span>
              <div className="annual-price">$12.99 / year</div>
            </div>
            <div className="price-desc">
              For active sales professionals demanding AI enrichment and CRM automations.
            </div>
            <ul className="price-features">
              <li><span className="pf-check"><Ic icon={Check} /></span> 2,000 Scans / year</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> 50 AI Intel / month, unused roll over</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> 1,000 K-Tokens / year</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> AI Fix included</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> AR template cards (600 tokens/card)</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> 3 VCards · 4 Products · 4 Templates</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> Google Sheets &amp; Gmail Sync</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> Telegram Bot Integration</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> Webhook &amp; WhatsApp Automation</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> Unlock more slots with tokens</li>
            </ul>
          </div>

          <div className="price-card ultra">
            <h2 className="price-name" style={{ color: "var(--indigo)" }}>Ultra</h2>
            <div className="price-amount">
              <span className="currency">₹</span>
              2,499
              <span className="period">/ year</span>
              <div className="annual-price">$19.99 / year</div>
            </div>
            <div className="price-desc">
              Everything in Pro, plus more scans, AI Strategy, team collaboration, and cloud backup.
            </div>
            <ul className="price-features">
              <li><span className="pf-check"><Ic icon={Check} /></span> 2,500 Scans / year</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> 60 AI Intel + 30 AI Strategy / month, unused roll over</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> 1,000 K-Tokens / year</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> Full AR Studio · custom 3D, video, build from scratch</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> 5 VCards · 8 Products · 6 Templates</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> Company Logo on QR · Custom QR Link</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> 250 MB Cloud Storage</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> Multi-User Team Collaboration</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> Everything in Pro · Dedicated VIP Support</li>
            </ul>
          </div>

          <div className="price-card">
            <h2 className="price-name">Enterprise</h2>
            <div className="price-amount">
              <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text)" }}>
                Per user
              </span>
              <div className="annual-price">5 user minimum</div>
            </div>
            <div className="price-desc">
              Talk to us for a customized plan for your team.
            </div>
            <ul className="price-features">
              <li><span className="pf-check"><Ic icon={Check} /></span> 4,000 Scans / year per user</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> 75 AI Intel + 25 AI Strategy / month per user</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> Everything in Ultra</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> On-Premise Storage Options</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> Custom Hardware Integrations</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> Advanced Analytics Dashboard</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> Account Manager</li>
              <li><span className="pf-check"><Ic icon={Check} /></span> Complete White Labeling</li>
            </ul>
            <Link
              className="price-btn outline"
              href="/contact"
              style={{ display: "block", textAlign: "center", textDecoration: "none" }}
            >
              Get Quote
            </Link>
          </div>
        </div>

        <div className="section-header reveal" style={{ marginTop: 64, marginBottom: 24 }}>
          <span className="section-label">Need More Power</span>
          <h2>Token Top-Up Packs</h2>
          <p>
            Running low on K-Tokens? Grab a one-time top-up pack anytime to recharge your balance -
            larger packs cost less per token. Available on any paid plan.
          </p>
        </div>

        <div
          className="topup-grid reveal reveal-delay-1"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 20,
            marginBottom: 64,
          }}
        >
          {[
            { tokens: "1,500", price: "100" },
            { tokens: "4,000", price: "250", badge: "Popular" },
            { tokens: "10,000", price: "500", badge: "Best Value" },
          ].map((pack) => (
            <div
              key={pack.price}
              style={{
                position: "relative",
                background: "var(--bg-card)",
                border: pack.badge
                  ? "1px solid var(--gold)"
                  : "1px solid var(--border)",
                borderRadius: 16,
                padding: "28px 24px",
                textAlign: "center",
              }}
            >
              {pack.badge && (
                <span
                  style={{
                    position: "absolute",
                    top: -11,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--gold)",
                    color: "#1a1206",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    padding: "4px 12px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                  }}
                >
                  {pack.badge}
                </span>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  color: "var(--gold)",
                  marginBottom: 6,
                }}
              >
                <Ic icon={Coins} />
                <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text)" }}>
                  {pack.tokens}
                </span>
              </div>
              <div
                style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginBottom: 14 }}
              >
                K-Tokens
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>
                <span style={{ fontSize: "1rem", verticalAlign: "top", marginRight: 2 }}>₹</span>
                {pack.price}
              </div>
            </div>
          ))}
        </div>

        <div
          className="cta-box reveal"
          style={{
            padding: "40px 48px",
            borderRadius: 24,
            marginBottom: 80,
            textAlign: "left",
            background: "var(--bg-card)",
            borderColor: "rgba(249, 115, 22, 0.3)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <div className="bento-icon gold" style={{ margin: 0 }}>
              <Ic icon={Coins} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--gold)" }}>
                Understanding Kauntech AI Tokens Economy
              </h3>
              <p style={{ fontSize: "0.95rem", color: "var(--text-dim)", margin: 0 }}>
                AI features consume K-Tokens seamlessly. When scan limits are exhausted, additional
                scans also consume tokens flexibly.
              </p>
            </div>
          </div>

          <div className="token-econ-grid">
            {[
              {
                tier: "PRO TIER FEATURE",
                color: "var(--gold)",
                name: "AI Fix",
                cost: "1",
                unit: "Token / use",
                ex: "Example: With 1,000 K-Tokens balance, execute up to 1,000 automated AI fixes for contact formatting.",
              },
              {
                tier: "PRO TIER FEATURE",
                color: "var(--indigo)",
                name: "AI Intel",
                cost: "2",
                unit: "Tokens / scan",
                ex: "Example: With 1,000 K-Tokens balance, enrich up to 500 business cards with deep company intelligence.",
              },
              {
                tier: "ULTRA TIER FEATURE",
                color: "#34d399",
                name: "AI Strategy",
                cost: "6",
                unit: "Tokens / scan",
                ex: "Example: With 3,000 K-Tokens balance, generate up to 500 comprehensive sales strategies & icebreakers.",
              },
            ].map((b) => (
              <div
                key={b.name}
                style={{
                  background: "var(--bg)",
                  padding: 20,
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    color: b.color,
                    fontSize: "0.85rem",
                    marginBottom: 8,
                  }}
                >
                  {b.tier}
                </div>
                <h4 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 4 }}>{b.name}</h4>
                <div
                  style={{
                    fontSize: "1.8rem",
                    fontWeight: 800,
                    color: "var(--text)",
                    marginBottom: 8,
                  }}
                >
                  {b.cost}{" "}
                  <span style={{ fontSize: "0.9rem", fontWeight: 400, color: "var(--text-dim)" }}>
                    {b.unit}
                  </span>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", margin: 0 }}>{b.ex}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
