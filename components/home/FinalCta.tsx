import SplitHeading from "@/components/motion/SplitHeading";
import StoreBadges from "@/components/sections/StoreBadges";

/** Closing act - the app's own tagline, said loud. */
export default function FinalCta() {
  return (
    <section className="k-final" id="download">
      <div className="k-final-glow" aria-hidden="true" />
      <div className="container k-final-inner">
        <SplitHeading as="h2" className="k-h1 k-final-title">
          Scan. Sync. <em>Sell.</em> Repeat.
        </SplitHeading>
        <p>
          Your next expo badge scan could be a synced, enriched, routed lead in 30 seconds. Free plan, no
          card required.
        </p>
        <StoreBadges />
      </div>
    </section>
  );
}
