import SplitHeading from "@/components/motion/SplitHeading";

/**
 * "Why Kauntech" as a bento grid. The four H3 cards keep the exact
 * keyword-anchored copy from the previous HomeHighlights section (SEO/GEO
 * structure unchanged: H2 → 4× H3); two extra visual cells are decorative.
 */
const HIGHLIGHTS = [
  {
    icon: "fa-solid fa-microchip",
    title: "100% Offline OCR",
    body: "Scan and read business cards with zero internet — the OCR engine runs entirely on your device, so it works on the exhibition floor or a basement conference hall.",
    big: true,
  },
  {
    icon: "fa-solid fa-shield-halved",
    title: "DPDP-Compliant by Design",
    body: "Scanned cards never leave your phone. AES-256 encrypted local storage meets India's DPDP Act 2023 by data minimisation — cloud backup is optional and you choose what syncs.",
    big: false,
  },
  {
    icon: "fa-solid fa-bolt",
    title: "30-Second Lead Routing",
    body: "Capture, enrich, and push a qualified lead to your CRM, Google Sheets, or WhatsApp in under 30 seconds — no manual typing, no data re-entry.",
    big: false,
  },
  {
    icon: "fa-solid fa-brain",
    title: "AI Contact Enrichment",
    body: "On-device AI — AI Intel, AI Fix, and AI Strategy — fills missing fields, cleans formatting, and scores every lead, powered by K-Tokens you only spend when you use them.",
    big: true,
  },
];

export default function BentoFeatures() {
  return (
    <section className="k-bento-section" id="why-kauntech">
      <div className="container">
        <div className="k-section-head">
          <span className="k-kicker">Why Kauntech</span>
          <SplitHeading as="h2" className="k-h2">
            Built offline-first for <em>Indian sales teams.</em>
          </SplitHeading>
          <p>
            An AI business card scanner engineered for privacy, speed, and total offline operation — from
            first scan to synced lead.
          </p>
        </div>

        <div className="k-bento">
          {HIGHLIGHTS.map((h, i) => (
            <article className={`k-cell reveal reveal-delay-${(i % 3) + 1}${h.big ? " k-cell--big" : ""}`} key={h.title}>
              <span className="k-cell-glow" aria-hidden="true" />
              <div className="k-cell-icon">
                <i className={h.icon} aria-hidden="true" />
              </div>
              <h3>{h.title}</h3>
              <p>{h.body}</p>
            </article>
          ))}

          <div className="k-cell k-cell--chips reveal reveal-delay-2" aria-label="Also supports NFC, QR codes and AR cards">
            <span className="k-cell-glow" aria-hidden="true" />
            <p className="k-cell-mini">Also speaks</p>
            <div className="k-chiprow">
              <span className="k-mchip">
                <i className="fa-solid fa-wave-square" aria-hidden="true" /> NFC
              </span>
              <span className="k-mchip">
                <i className="fa-solid fa-qrcode" aria-hidden="true" /> QR / vCard
              </span>
              <span className="k-mchip">
                <i className="fa-solid fa-mobile-screen-button" aria-hidden="true" /> AR cards
              </span>
            </div>
          </div>

          <div className="k-cell k-cell--tokens reveal reveal-delay-3" aria-label="Powered by the K-Token economy">
            <span className="k-cell-glow" aria-hidden="true" />
            <p className="k-cell-mini">
              <i className="fa-solid fa-coins" aria-hidden="true" /> K-Tokens
            </p>
            <p className="k-cell-tokens-line">
              Scan <b>1 KT</b> · Intel <b>50 KT</b> · Strategy <b>100 KT</b> — spend only when you use.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
