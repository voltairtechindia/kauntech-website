"use client";

import { useState } from "react";
import FeatureModal from "@/components/FeatureModal";

export default function Features() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section id="features">
      <div className="container">
        <div className="section-header reveal">
          <span className="section-label">Powerful Capabilities</span>
          <h2>Engineered for Offline Speed &amp; Privacy</h2>
          <p>
            Explore the ultimate toolset designed for sales professionals, event organizers, and
            enterprise teams who demand reliability without internet dependence.
          </p>
        </div>

        <div className="bento-grid">
          <div className="bento-card large reveal">
            <span className="bento-section-title">Section A · Core Architecture</span>
            <div className="bento-icon gold">
              <i className="fa-solid fa-layer-group" />
            </div>
            <h3>Offline Superpowers</h3>
            <p>
              Experience zero-latency contact capture in remote locations, basement conference
              halls, and flights. Your workflow never stops.
            </p>
            <ul className="feature-list">
              <li>
                <span className="check"><i className="fa-solid fa-check" /></span>{" "}
                <strong>Works Without Internet:</strong> Scan and process cards anywhere, anytime.
              </li>
              <li>
                <span className="check"><i className="fa-solid fa-check" /></span>{" "}
                <strong>Local Data Storage:</strong> All sensitive contact data stays encrypted on
                your device.
              </li>
              <li>
                <span className="check"><i className="fa-solid fa-check" /></span>{" "}
                <strong>Smart Sync:</strong> Automatically queues and backs up to cloud the moment
                network returns.
              </li>
              <li>
                <span className="check"><i className="fa-solid fa-check" /></span>{" "}
                <strong>Audio Notes:</strong> Record voice memos offline right after the pitch.
              </li>
              <li>
                <span className="check"><i className="fa-solid fa-check" /></span>{" "}
                <strong>DPDP Compliant:</strong> Future-ready privacy protection.
              </li>
            </ul>
          </div>

          <div className="bento-card reveal reveal-delay-1">
            <span className="bento-section-title">Section B · Omnichannel Capture</span>
            <div className="bento-icon indigo"><i className="fa-solid fa-camera-rotate" /></div>
            <h3>Input Flexibility</h3>
            <p>Four lightning-fast ways to capture visitor information without friction.</p>
            <ul className="feature-list">
              <li><span className="check"><i className="fa-solid fa-check" /></span> <strong>Business Card OCR:</strong> Point and shoot AI recognition.</li>
              <li><span className="check"><i className="fa-solid fa-check" /></span> <strong>QR Code Scanner:</strong> Instant digital card capture.</li>
              <li><span className="check"><i className="fa-solid fa-check" /></span> <strong>NFC Tap:</strong> Tap phone to exchange details seamlessly.</li>
              <li><span className="check"><i className="fa-solid fa-check" /></span> <strong>Manual Entry:</strong> Full keyboard input with custom fields.</li>
            </ul>
          </div>

          <div className="bento-card reveal reveal-delay-2">
            <span className="bento-section-title">Section C · Intelligence</span>
            <div className="bento-icon purple"><i className="fa-solid fa-brain" /></div>
            <h3>AI Enrichment</h3>
            <p>Transform raw contact details into actionable intelligence instantly.</p>
            <ul className="feature-list">
              <li><span className="check"><i className="fa-solid fa-check" /></span> <strong>Company Intel:</strong> Get founders, industry, and size.</li>
              <li><span className="check"><i className="fa-solid fa-check" /></span> <strong>Lead Scoring:</strong> Prioritize hot leads instantly.</li>
              <li><span className="check"><i className="fa-solid fa-check" /></span> <strong>Icebreakers:</strong> AI generated conversation starters.</li>
              <li><span className="check"><i className="fa-solid fa-check" /></span> <strong>Email Opener:</strong> Personalized cold email templates.</li>
            </ul>
          </div>

          <div className="bento-card large reveal reveal-delay-3">
            <span className="bento-section-title">Section D · Multi-Channel Automation</span>
            <div className="bento-icon green"><i className="fa-solid fa-shuffle" /></div>
            <h3>Output Channels &amp; Automations</h3>
            <p>
              Set up your post-scan automation rules once, and let Kauntech route enriched contacts
              to your favorite tools instantly.
            </p>
            <ul
              className="feature-list"
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}
            >
              <li><span className="check"><i className="fa-solid fa-check" /></span> <strong>WhatsApp:</strong> Direct team/group chat routing.</li>
              <li><span className="check"><i className="fa-solid fa-check" /></span> <strong>Email:</strong> Auto-compose personalized drafts.</li>
              <li><span className="check"><i className="fa-solid fa-check" /></span> <strong>Google Sheets:</strong> Real-time spreadsheet sync.</li>
              <li><span className="check"><i className="fa-solid fa-check" /></span> <strong>Webhook:</strong> Connect to any CRM or ERP.</li>
              <li style={{ gridColumn: "span 2" }}>
                <span className="check"><i className="fa-solid fa-check" /></span>{" "}
                <strong>Telegram:</strong> Dedicated bot integration for instant notifications.
              </li>
            </ul>
          </div>

          <div className="bento-card reveal reveal-delay-1">
            <span className="bento-section-title">Section E · Translation</span>
            <div className="bento-icon blue"><i className="fa-solid fa-language" /></div>
            <h3>Multi-Language Support</h3>
            <p>Powered by emerging Indian LLMs, our translation engine is evolving.</p>
            <ul className="feature-list">
              <li><span className="check"><i className="fa-solid fa-clock" /></span> <strong>Coming Soon:</strong> Scan different languages.</li>
              <li><span className="check"><i className="fa-solid fa-clock" /></span> <strong>Auto-Translate:</strong> Convert to English instantly.</li>
              <li><span className="check"><i className="fa-solid fa-clock" /></span> <strong>Smart Reply:</strong> Send Mail/WhatsApp in English or revert in original language.</li>
              <li><span className="check"><i className="fa-solid fa-vial" /></span> <strong>Status:</strong> Currently under process.</li>
            </ul>
          </div>

          <div className="bento-card reveal reveal-delay-2">
            <span className="bento-section-title">Section F · Brand Identity</span>
            <div className="bento-icon red"><i className="fa-solid fa-palette" /></div>
            <h3>Customization</h3>
            <p>
              Tailor the scanning experience and digital cards to match your corporate brand
              identity.
            </p>
            <ul className="feature-list">
              <li><span className="check"><i className="fa-solid fa-check" /></span> <strong>Custom QR Logo:</strong> Brand your digital QR codes.</li>
              <li><span className="check"><i className="fa-solid fa-check" /></span> <strong>Custom QR Links:</strong> Personalized short URLs.</li>
              <li><span className="check"><i className="fa-solid fa-check" /></span> <strong>Templates:</strong> Save frequently used messages.</li>
              <li><span className="check"><i className="fa-solid fa-check" /></span> <strong>K-Tokens:</strong> Flexible AI credit system.</li>
            </ul>
            <button
              className="explore-btn"
              type="button"
              style={{ marginTop: 20 }}
              onClick={() => setModalOpen(true)}
            >
              <span>Explore All Features</span>
              <i className="fa-solid fa-arrow-up-right-from-square" />
            </button>
          </div>

          <div
            className="bento-card reveal reveal-delay-3"
            style={{ display: "flex", flexDirection: "column", justifyContent: "flex-start" }}
          >
            <span className="bento-section-title">Section G · Privacy</span>
            <div className="bento-icon gold"><i className="fa-solid fa-server" /></div>
            <h3 style={{ color: "var(--gold)" }}>Our Offline Storage Philosophy</h3>
            <p style={{ fontSize: "0.95rem" }}>
              We do not save or store your scanned images or contact details on our servers. We
              simply don&apos;t want it. Kauntech was built to solve a very specific problem our
              founder faced with network drops at critical events.
            </p>
            <p style={{ fontSize: "0.95rem", marginTop: 12, marginBottom: 0 }}>
              Our primary goal is to get more downloads so that this problem can be solved for
              everyone globally. Your data belongs to you, and it stays securely on your device.
            </p>
          </div>
        </div>
      </div>

      <FeatureModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}
