import SplitHeading from "@/components/motion/SplitHeading";
import Ic from "@/components/ui/Icon";
import Brand, { type BrandName } from "@/components/ui/BrandIcons";
import { Check, Globe, Mail, Phone, Table, Workflow, type LucideIcon } from "lucide-react";

/**
 * "One scan, five destinations" — a scanned card node fanning out to the five
 * integrations over animated SVG beams (pure CSS stroke-dash flow, no JS).
 */
type Dest = {
  icon?: LucideIcon;
  brand?: BrandName;
  name: string;
  note: string;
  tint: string;
  y: number;
};

const DESTS: Dest[] = [
  { icon: Table, name: "Google Sheets", note: "row appended", tint: "#22C55E", y: 42 },
  { brand: "whatsapp", name: "WhatsApp", note: "intro drafted", tint: "#25D366", y: 126 },
  { icon: Mail, name: "Gmail", note: "follow-up queued", tint: "#EF4444", y: 210 },
  { brand: "telegram", name: "Telegram", note: "posted to chat", tint: "#38BDF8", y: 294 },
  { icon: Workflow, name: "Webhook", note: "POST · 200 OK", tint: "#818CF8", y: 378 },
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
              <div className="k-bizcard-flip">
                <div className="k-bizcard-face k-bizcard-front">
                  <div className="k-bizcard-head">
                    <span className="k-bizcard-avatar">
                      <img src="/assets/founder.jpg" alt="Harshal Vadgama" width={46} height={46} loading="lazy" />
                    </span>
                    <span className="k-bizcard-scan">
                      <i className="k-bizcard-dot" aria-hidden="true" /> scanned
                    </span>
                  </div>
                  <div className="k-bizcard-id">
                    <b>Harshal Vadgama</b>
                    <i>Founder &amp; CEO · Kauntech</i>
                  </div>
                  <span className="k-bizcard-rule" aria-hidden="true" />
                  <ul className="k-bizcard-lines">
                    <li>
                      <Ic icon={Phone} /> +91 98765 43210
                    </li>
                    <li>
                      <Ic icon={Globe} /> kauntech.com
                    </li>
                    <li className="k-bizcard-wide">
                      <Ic icon={Mail} /> harshal@kauntech.com
                    </li>
                  </ul>
                  <span className="k-bizcard-foot">enriched · saved · synced</span>
                </div>
                <div className="k-bizcard-face k-bizcard-back" aria-hidden="true">
                  <img
                    className="k-bizcard-logo"
                    src="/assets/logo-gold.webp"
                    alt=""
                    width={72}
                    height={72}
                    loading="lazy"
                  />
                  <span className="k-bizcard-back-word">KAUNTECH</span>
                  <span className="k-bizcard-back-tag">Scan · Save · Outsmart</span>
                </div>
              </div>
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
                  {d.brand ? <Brand name={d.brand} /> : d.icon ? <Ic icon={d.icon} /> : null}
                </span>
                <span className="k-dest-id">
                  <b>{d.name}</b>
                  <i>{d.note}</i>
                </span>
                <span className="k-dest-check">
                  <Ic icon={Check} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
