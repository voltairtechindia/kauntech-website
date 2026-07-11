import SplitHeading from "@/components/motion/SplitHeading";

/**
 * "One scan, five destinations" — a scanned card node fanning out to the five
 * integrations over animated SVG beams (pure CSS stroke-dash flow, no JS).
 */
const DESTS = [
  { icon: "fa-solid fa-table", name: "Google Sheets", note: "row appended", tint: "#22C55E", y: 42 },
  { icon: "fa-brands fa-whatsapp", name: "WhatsApp", note: "intro drafted", tint: "#25D366", y: 126 },
  { icon: "fa-solid fa-envelope", name: "Gmail", note: "follow-up queued", tint: "#EF4444", y: 210 },
  { icon: "fa-brands fa-telegram", name: "Telegram", note: "posted to chat", tint: "#38BDF8", y: 294 },
  { icon: "fa-solid fa-circle-nodes", name: "Webhook", note: "POST · 200 OK", tint: "#818CF8", y: 378 },
];

export default function IntegrationsRouter() {
  return (
    <section className="k-router-section" id="integrations">
      <div className="container">
        <div className="k-section-head">
          <span className="k-kicker">Automations</span>
          <SplitHeading as="h2" className="k-h2">
            One scan. <em>Everywhere</em> your team works.
          </SplitHeading>
          <p>
            Saving a lead fires your whole workflow — no exports, no copy-paste, no &ldquo;I&apos;ll add it
            to the sheet later.&rdquo;
          </p>
        </div>

        <div className="k-router reveal">
          <div className="k-router-node">
            <span className="k-router-ping" aria-hidden="true" />
            <div className="k-router-card">
              <i className="fa-solid fa-address-card" aria-hidden="true" />
              <b>Harshal Vadgama</b>
              <span>scanned · enriched · saved</span>
            </div>
          </div>

          <svg className="k-router-beams" viewBox="0 0 220 420" preserveAspectRatio="none" aria-hidden="true">
            {DESTS.map((d) => (
              <g key={d.name}>
                <path className="k-beam-base" d={`M0 210 C 110 210, 110 ${d.y}, 220 ${d.y}`} />
                <path
                  className="k-beam-flow"
                  d={`M0 210 C 110 210, 110 ${d.y}, 220 ${d.y}`}
                  style={{ stroke: d.tint }}
                />
              </g>
            ))}
          </svg>

          <ul className="k-router-dests">
            {DESTS.map((d, i) => (
              <li className="k-dest" key={d.name} style={{ ["--tint" as string]: d.tint, ["--i" as string]: i }}>
                <span className="k-dest-icon">
                  <i className={d.icon} aria-hidden="true" />
                </span>
                <span className="k-dest-id">
                  <b>{d.name}</b>
                  <i>{d.note}</i>
                </span>
                <span className="k-dest-check">
                  <i className="fa-solid fa-check" aria-hidden="true" />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
