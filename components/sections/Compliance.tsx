export default function Compliance() {
  const rows: [string, string, string?][] = [
    ["Name", "User / Lead Identification"],
    ["Company name", "B2B Context & Enrichment"],
    ["Phone number", "WhatsApp Automation Routing"],
    ["Email", "Email Follow-up & Account ID"],
    ["Scans", "Usage Tracking & Quota"],
  ];

  return (
    <section id="compliance">
      <div className="container">
        <div className="section-header reveal">
          <span className="section-label">India DPDP Act 2023 Compliant</span>
          <h2>Enterprise Privacy &amp; Data Transparency Portal</h2>
          <p>
            Kauntech is engineered from the ground up to respect user privacy and fully adhere to
            India&apos;s Digital Personal Data Protection (DPDP) Act 2023.
          </p>
        </div>

        <div className="compliance-grid">
          <div className="compliance-content reveal">
            <h2>Privacy-First By Design</h2>
            <p>
              Under the DPDP Act 2023, organizations must ensure clear notice, informed consent,
              and purpose limitation. Kauntech gives you and your leads complete control over
              personal data, processing sensitive details locally on-device before any cloud
              synchronization occurs.
            </p>

            <ul className="compliance-features">
              <li>
                <div className="cf-icon"><i className="fa-solid fa-user-shield" /></div>
                <div>
                  <strong>Informed Consent Architecture:</strong> Data is never captured or synced
                  without explicit, recorded user consent.
                </div>
              </li>
              <li>
                <div className="cf-icon"><i className="fa-solid fa-microchip" /></div>
                <div>
                  <strong>Local On-Device Processing:</strong> OCR and initial AI enrichment happen
                  directly on your smartphone.
                </div>
              </li>
              <li>
                <div className="cf-icon"><i className="fa-solid fa-lock" /></div>
                <div>
                  <strong>Enterprise-Grade Encryption:</strong> Data at rest and in transit is
                  secured with AES-256 encryption.
                </div>
              </li>
              <li>
                <div className="cf-icon"><i className="fa-solid fa-hand-holding-heart" /></div>
                <div>
                  <strong>Complete User Ownership:</strong> Leads and users can request data
                  deletion or export at any time.
                </div>
              </li>
            </ul>
          </div>

          <div className="compliance-visual reveal reveal-delay-2">
            <div
              className="compliance-badge"
              style={{
                gridColumn: "span 2",
                background:
                  "linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(129, 140, 248, 0.1))",
                borderColor: "var(--gold)",
              }}
            >
              <i className="fa-solid fa-file-contract badge-icon" />
              <h4 style={{ fontSize: "1.3rem", color: "var(--gold)" }}>DPDP Act 2023 Audit Ledger</h4>
              <p style={{ fontSize: "0.95rem", marginTop: 8 }}>
                Below is the exact data schema Kauntech records to maintain regulatory compliance,
                manage trial sessions, and guarantee informed user consent:
              </p>

              <div
                style={{
                  marginTop: 24,
                  width: "100%",
                  textAlign: "left",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 16,
                  fontFamily: "var(--mono)",
                  fontSize: "0.85rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: 6,
                  }}
                >
                  <span style={{ color: "var(--text-dim)" }}>Field Name</span>
                  <span style={{ color: "var(--gold)" }}>Recorded Purpose &amp; Scope</span>
                </div>
                {rows.map((r) => (
                  <div key={r[0]} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{r[0]}</span>
                    <span style={{ color: "var(--text-dim)" }}>{r[1]}</span>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    paddingTop: 6,
                  }}
                >
                  <span style={{ color: "var(--indigo)" }}>Device Details</span>
                  <span style={{ color: "#a5b4fc", textAlign: "right", fontSize: "0.75rem" }}>
                    Anti-tamper tracking to detect
                    <br />
                    jailbreaks &amp; unauthorized hacks
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Plans</span>
                  <span style={{ color: "#34d399" }}>Free, Pro, Ultra, or Custom</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
