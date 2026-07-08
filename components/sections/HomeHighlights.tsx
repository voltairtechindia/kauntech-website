/**
 * Homepage highlights — a compact "why Kauntech" section that gives the home
 * page real H2 → H3 heading structure (the on-page/GEO gap) with unique,
 * keyword-anchored copy. Deliberately concise and distinct from the deeper
 * /features page and the HomeOverview answers to avoid on-page duplication.
 */
const HIGHLIGHTS: { icon: string; title: string; body: string }[] = [
  {
    icon: "fa-solid fa-microchip",
    title: "100% Offline OCR",
    body: "Scan and read business cards with zero internet — the OCR engine runs entirely on your device, so it works on the exhibition floor or a basement conference hall.",
  },
  {
    icon: "fa-solid fa-shield-halved",
    title: "DPDP-Compliant by Design",
    body: "Scanned cards never leave your phone. AES-256 encrypted local storage meets India's DPDP Act 2023 by data minimisation — cloud backup is optional and you choose what syncs.",
  },
  {
    icon: "fa-solid fa-bolt",
    title: "30-Second Lead Routing",
    body: "Capture, enrich, and push a qualified lead to your CRM, Google Sheets, or WhatsApp in under 30 seconds — no manual typing, no data re-entry.",
  },
  {
    icon: "fa-solid fa-brain",
    title: "AI Contact Enrichment",
    body: "On-device AI — AI Intel, AI Fix, and AI Strategy — fills missing fields, cleans formatting, and scores every lead, powered by K-Tokens you only spend when you use them.",
  },
];

export default function HomeHighlights() {
  return (
    <section className="home-highlights" id="why-kauntech">
      <div className="container">
        <div className="section-header reveal">
          <span className="section-label">Why Kauntech</span>
          <h2>Built offline-first for Indian sales teams</h2>
          <p>
            An AI business card scanner engineered for privacy, speed, and total
            offline operation — from first scan to synced lead.
          </p>
        </div>

        <div className="highlights-grid">
          {HIGHLIGHTS.map((h, i) => (
            <div className={`highlight-card reveal reveal-delay-${(i % 3) + 1}`} key={h.title}>
              <div className="highlight-icon">
                <i className={h.icon} aria-hidden="true" />
              </div>
              <h3>{h.title}</h3>
              <p>{h.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
