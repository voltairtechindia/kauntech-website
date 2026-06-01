import Link from "next/link";

export default function Hero() {
  return (
    <section className="hero" id="hero">
      <div className="container">
        <div className="hero-content reveal">
          <div className="hero-badge reveal">
            INDIA&apos;S FIRST &amp; ONLY TRULY OFFLINE OCR SCANNER
          </div>
          <h1 className="reveal reveal-delay-1">
            Extract Business Cards Offline.{" "}
            <span className="highlight">Automate Leads Online.</span> Ensure Absolute Privacy.
          </h1>
          <p className="hero-subtitle reveal reveal-delay-2">
            The premier AI driven contact platform built for complete offline operation and strict
            DPDP Act 2023 compliance.
            <br />
            Capture details, enrich profiles, and route leads to your workflow in under 30 seconds
            regardless of internet connectivity.
          </p>

          <div className="hero-ctas">
            <Link href="/pricing" className="btn-primary">
              <span>Start Free Trial</span>
              <i className="fa-solid fa-arrow-right" />
            </Link>
            <button className="btn-secondary" type="button">
              <i className="fa-solid fa-wifi-slash" />
              <span>See Offline Demo</span>
            </button>
          </div>

          <div className="store-badges reveal reveal-delay-2" style={{ marginTop: "2rem" }}>
            <div
              style={{
                fontSize: "0.8rem",
                fontFamily: "var(--mono)",
                color: "var(--gold)",
                textTransform: "uppercase",
                letterSpacing: 2,
                marginBottom: 12,
              }}
            >
              Launching Soon On
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div
                className="store-badge"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  padding: "8px 16px",
                  borderRadius: 12,
                  cursor: "not-allowed",
                  opacity: 0.8,
                }}
              >
                <i className="fa-brands fa-google-play" style={{ fontSize: "1.5rem", color: "#fff" }} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-dim)", textTransform: "uppercase" }}>
                    Get it on
                  </span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                    Google Play
                  </span>
                </div>
              </div>
              <div
                className="store-badge"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  padding: "8px 16px",
                  borderRadius: 12,
                  cursor: "not-allowed",
                  opacity: 0.8,
                }}
              >
                <i className="fa-brands fa-apple" style={{ fontSize: "1.5rem", color: "#fff" }} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-dim)", textTransform: "uppercase" }}>
                    Download on the
                  </span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                    App Store
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <span className="stat-num">30s</span>
              <span className="stat-label">Scan to Sync Workflow</span>
            </div>
            <div className="stat">
              <span className="stat-num">100%</span>
              <span className="stat-label">Offline Functionality</span>
            </div>
            <div className="stat">
              <span className="stat-num">DPDP</span>
              <span className="stat-label">Act 2023 Compliant</span>
            </div>
          </div>
        </div>

        <div className="hero-visual reveal reveal-delay-2">
          <div className="phone-mockup anim-container">
            <div className="phone-notch" />

            <div className="anim-screen screen-1" style={{ padding: 0, display: "block" }}>
              <img
                src="/assets/app-home.webp"
                alt="Kauntech app home screen showing scanned business card contacts"
                width={460}
                height={1024}
                decoding="async"
                fetchPriority="high"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 44 }}
              />
            </div>

            <div className="anim-screen screen-2" style={{ padding: 0, background: "#000" }}>
              <div className="camera-view" style={{ border: "none", borderRadius: 44 }}>
                <img
                  src="/assets/harshal_business_card.webp"
                  alt="Business card being scanned by Kauntech's offline OCR engine"
                  width={800}
                  height={800}
                  loading="lazy"
                  decoding="async"
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }}
                />
                <div className="scan-line" />
                <div
                  className="anim-label"
                  style={{
                    position: "absolute",
                    bottom: 40,
                    left: 0,
                    right: 0,
                    textShadow: "0 2px 4px #000",
                  }}
                >
                  Extracting AI Intel...
                </div>
              </div>
            </div>

            <div className="anim-screen screen-3">
              <div className="app-header">
                <div className="app-brand">
                  <img src="/assets/logo-gold.webp" alt="Kauntech logo" width={28} height={28} decoding="async" />
                  <span>KAUNTECH AI</span>
                </div>
              </div>

              <div className="extracted-data">
                <div className="ex-field field-name">
                  <i className="fa-solid fa-user" /> Harshal Vadgama
                </div>
                <div className="ex-field field-role">
                  <i className="fa-solid fa-briefcase" /> Founder · Kauntech
                </div>
                <div className="ex-field field-phone">
                  <i className="fa-solid fa-phone" /> +91 98765 43210
                  <div className="action-toast wa-toast">
                    <i className="fa-brands fa-whatsapp" /> Drafted &amp; Sent ✓✓
                  </div>
                </div>
                <div className="ex-field field-email">
                  <i className="fa-solid fa-envelope" /> business@voltairtech.com
                  <div className="action-toast gm-toast">
                    <i className="fa-solid fa-paper-plane" /> Drafted &amp; Sent ✓✓
                  </div>
                </div>
              </div>

              <div className="sheet-overlay">
                <i className="fa-solid fa-table" />
                <span>Google Sheet Synced!</span>
              </div>
            </div>

            <div
              className="anim-screen screen-4"
              style={{
                padding: 0,
                background: "#000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                className="logo-center"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <img
                  src="/assets/logo-gold.webp"
                  alt="Kauntech Logo"
                  width={80}
                  height={80}
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: 80,
                    filter: "drop-shadow(0 0 20px rgba(249, 115, 22, 0.4))",
                  }}
                />
                <h2
                  style={{
                    fontSize: "1.8rem",
                    fontWeight: 900,
                    letterSpacing: 2,
                    color: "#fff",
                  }}
                >
                  KAUNTECH
                </h2>
              </div>
            </div>
          </div>

          <div className="float-badge b1">
            <i className="fa-solid fa-shield-halved" />
            <span>On-Device OCR &amp; AI</span>
          </div>
          <div className="float-badge b2">
            <i className="fa-solid fa-bolt" />
            <span>Instant WhatsApp Sync</span>
          </div>
          <div className="float-badge b3">
            <i className="fa-solid fa-lock" />
            <span>DPDP Act 2023 Ready</span>
          </div>
        </div>
      </div>
    </section>
  );
}
