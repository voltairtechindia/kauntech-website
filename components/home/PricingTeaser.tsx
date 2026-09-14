import Link from "next/link";
import SplitHeading from "@/components/motion/SplitHeading";
import Ic from "@/components/ui/Icon";
import { ArrowRight, Check, Coins } from "lucide-react";

/**
 * Pricing teaser - numbers mirror the app paywall (source of truth:
 * kauntech-app constants/plans.ts + app/(tabs)/plan.tsx). Plans bill yearly
 * only. Deep-dive lives on /pricing.
 */
const PLANS = [
  {
    name: "Free",
    price: "₹0",
    per: "forever",
    tag: null,
    feats: ["100 K-Tokens + 49 scans /mo", "1 V-Card · QR & NFC scanning", "WhatsApp & Webhook · offline mode"],
  },
  {
    name: "Pro",
    price: "₹1,499",
    per: "/year · $12.99",
    tag: "Recommended",
    feats: ["1,000 K-Tokens /mo · 2,000 scans /yr", "AI Intel & AR template cards", "Google Sheets · Gmail · Telegram"],
  },
  {
    name: "Ultra",
    price: "₹2,499",
    per: "/year · $19.99",
    tag: "Everything",
    feats: ["3,000 K-Tokens /mo · 2,500 scans /yr", "AI Strategy + full AR studio", "Team access · 250 MB cloud"],
  },
];

export default function PricingTeaser() {
  return (
    <section className="k-plans-section" id="plans">
      <div className="container">
        <div className="k-section-head">
          <span className="k-kicker">Pricing</span>
          <SplitHeading as="h2" className="k-h2">
            Simple plans. <em>Honest tokens.</em>
          </SplitHeading>
          <p>Start free, upgrade when the pipeline demands it. Every AI action has a visible token price.</p>
        </div>

        <div className="k-plans">
          {PLANS.map((p, i) => (
            <article className={`k-plan reveal reveal-delay-${i + 1}${p.tag === "Recommended" ? " k-plan--hot" : ""}`} key={p.name}>
              {p.tag && <span className="k-plan-tag">{p.tag}</span>}
              <h3>{p.name}</h3>
              <div className="k-plan-price">
                <b>{p.price}</b>
                <span>{p.per}</span>
              </div>
              <ul>
                {p.feats.map((f) => (
                  <li key={f}>
                    <Ic icon={Check} /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/pricing" className={`k-btn ${p.tag === "Recommended" ? "k-btn--primary" : "k-btn--ghost"} k-btn--block`}>
                See full plan
              </Link>
            </article>
          ))}
        </div>

        <p className="k-packs reveal">
          <Ic icon={Coins} /> Top-up packs: <b>200 KT ₹99</b> ·{" "}
          <b>600 KT ₹249</b> · <b>1,500 KT ₹549</b> · <b>4,000 KT ₹1,299</b>
          <Link href="/pricing" className="k-arrowlink">
            Full pricing &amp; token math <Ic icon={ArrowRight} />
          </Link>
        </p>
      </div>
    </section>
  );
}
