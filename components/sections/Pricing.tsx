"use client";

import { useState } from "react";
import Link from "next/link";

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing">
      <div className="container">
        <div className="section-header reveal" style={{ marginBottom: 24 }}>
          <span className="section-label">Flexible Investment</span>
          <h2>Choose Your Kauntech Plan</h2>
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
              <i className="fa-solid fa-rocket" style={{ fontSize: "1.3rem" }} />
              <span>Exclusive Pre-Launch Rewards</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.95rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <i
                  className="fa-solid fa-circle-check"
                  style={{ color: "#34d399", marginTop: 3, flexShrink: 0 }}
                />
                <span>
                  <strong>First 1,000 Downloads (First 15 Days):</strong> Instantly unlock a 7-Day
                  Pro Trial fully equipped with AI Intel enrichment.
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <i
                  className="fa-brands fa-reddit-alien"
                  style={{ color: "#ff4500", marginTop: 3, flexShrink: 0, fontSize: "1.1rem" }}
                />
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
                  to earn an elite 14-Day Pro/Ultra upgrade!
                </span>
              </div>
            </div>
          </div>

          <div className="pricing-toggle">
            <button
              className={`toggle-btn${!annual ? " active" : ""}`}
              onClick={() => setAnnual(false)}
              type="button"
            >
              Monthly Billing
            </button>
            <button
              className={`toggle-btn${annual ? " active" : ""}`}
              onClick={() => setAnnual(true)}
              type="button"
            >
              <span>Annual Billing</span>
              <span className="save-badge">SAVE up to 23%</span>
            </button>
          </div>
        </div>

        <div className="pricing-grid reveal reveal-delay-1">
          <div className="price-card">
            <div className="price-name">Free</div>
            <div className="price-amount">
              <span className="currency">₹</span>0<span className="period">/ forever</span>
            </div>
            <div className="price-desc">
              Perfect for individual professionals exploring offline business card scanning.
            </div>
            <ul className="price-features">
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> 49 Scans included</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> 50 K-Tokens</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> 2 Products</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> 1 VCard Export</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> CSV Export included</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> Webhook &amp; WhatsApp Sync</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> 100% Offline Mode</li>
            </ul>
          </div>

          <div className="price-card featured">
            <div className="price-name" style={{ color: "var(--gold)" }}>Pro</div>
            <div className="price-amount">
              <span className="currency">₹</span>
              {annual ? "399" : "499"}
              <span className="period">/ month</span>
              {annual && <div className="annual-price">₹4,788 billed annually</div>}
            </div>
            <div className="price-desc">
              For active sales professionals demanding AI enrichment and CRM automations.
            </div>
            <ul className="price-features">
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> 500 Scans / month</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> 1,000 K-Tokens (1,250 on Annual)</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> AI Intel (2 tokens/scan)</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> AI Fix included (1 token/fix)</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> 4 Products &amp; 4 Templates</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> Google Sheets &amp; Gmail Sync</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> Telegram Bot Integration</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> Webhook &amp; WhatsApp Automation</li>
            </ul>
          </div>

          <div className="price-card ultra">
            <div className="price-name" style={{ color: "var(--indigo)" }}>Ultra</div>
            <div className="price-amount">
              <span className="currency">₹</span>
              {annual ? "999" : "1,299"}
              <span className="period">/ month</span>
              {annual && <div className="annual-price">₹11,988 billed annually</div>}
            </div>
            <div className="price-desc">
              The ultimate enterprise suite with advanced AI, multiple languages, and AR support.
            </div>
            <ul className="price-features">
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> 1,500 Scans / month</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> 3,000 K-Tokens (1,250/mo on Annual)</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> AI Strategy (6 tokens/scan)</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> 10+ Indian Languages Support</li>
              <li><span className="pf-check"><i className="fa-solid fa-clock" /></span> AR Business Card (Coming Soon)</li>
              <li><span className="pf-check"><i className="fa-solid fa-clock" /></span> NFC Card Integration (Coming Soon)</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> Multi-User Team Collaboration</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> Dedicated VIP Support</li>
            </ul>
          </div>

          <div className="price-card">
            <div className="price-name">Custom</div>
            <div className="price-amount">
              <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text)" }}>
                Let&apos;s Talk
              </span>
            </div>
            <div className="price-desc">
              For large corporations needing white-labeling, custom LLMs, or massive event capacity.
            </div>
            <ul className="price-features">
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> Unlimited Scans &amp; Tokens</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> On-Premise Storage Options</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> Custom Hardware Integrations</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> Advanced Analytics Dashboard</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> Account Manager</li>
              <li><span className="pf-check"><i className="fa-solid fa-check" /></span> Complete White Labeling</li>
            </ul>
            <Link
              className="price-btn outline"
              href="/contact"
              style={{ display: "block", textAlign: "center", textDecoration: "none" }}
            >
              Contact Sales
            </Link>
          </div>
        </div>

        <div className="section-header reveal" style={{ marginTop: 64, marginBottom: 24 }}>
          <span className="section-label">Need More Power</span>
          <h2>Token Top-Up Packs</h2>
          <p>
            Running low on K-Tokens? Grab a one-time top-up pack anytime to recharge your balance —
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
            { tokens: "200", price: "99" },
            { tokens: "600", price: "249" },
            { tokens: "1,500", price: "549" },
            { tokens: "4,000", price: "1,299", badge: "Best Value" },
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
                <i className="fa-solid fa-coins" />
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
              <i className="fa-solid fa-coins" />
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
