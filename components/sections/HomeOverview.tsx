import Link from "next/link";

/**
 * Home overview + internal-link hub. Serves three jobs at once:
 *  - AEO: question-phrased H2s with 40-60 word direct-answer paragraphs that
 *    answer engines (AI Overviews, Perplexity, ChatGPT) can lift as a passage.
 *  - SEO: keyword-anchored internal links from the homepage to the key pages.
 *  - Content depth: adds unique body copy so the homepage isn't thin.
 * Copy is deliberately reworded vs. the FAQ accordion to avoid on-page dupes.
 */

const EXPLORE: { href: string; label: string }[] = [
  { href: "/features", label: "AI Business Card Scanner Features" },
  { href: "/how-it-works", label: "How Offline Card Scanning Works" },
  { href: "/compliance", label: "DPDP Act 2023 Compliance" },
  { href: "/compare", label: "Kauntech vs Other Scanners" },
  { href: "/pricing", label: "Kauntech Pricing" },
];

export default function HomeOverview() {
  return (
    <section className="home-overview" id="overview">
      <div className="container">
        <div className="overview-answers">
          <div className="reveal">
            <h2>What is Kauntech?</h2>
            <p>
              Kauntech is an offline-first AI business card scanner built for
              Indian sales and field teams. Point your phone at a visiting card
              and it captures every field on-device, enriches the contact with
              AI, and hands the lead to your CRM, Google Sheets, or WhatsApp - in
              about 30 seconds, with no data leaving your phone.
            </p>
          </div>

          <div className="reveal reveal-delay-1">
            <h2>How does offline card scanning work?</h2>
            <p>
              Scanning runs entirely on your device. The camera captures the
              card, an on-device OCR engine extracts the name, phone, email, and
              company, and AI enrichment fills the gaps and scores the lead. You
              only need a connection when you choose to sync to a CRM or back up
              to the cloud.
            </p>
          </div>

          <div className="reveal reveal-delay-2">
            <h2>Is Kauntech DPDP Act 2023 compliant?</h2>
            <p>
              Yes. Because card processing happens on your device, scanned images
              and contact details are never uploaded to Kauntech&apos;s servers -
              meeting the DPDP Act 2023 principle of data minimisation by design.
              Cloud backup is fully optional, and you decide exactly which
              contacts sync.
            </p>
          </div>
        </div>

        <nav className="overview-explore reveal" aria-label="Explore Kauntech">
          <h2>Explore Kauntech</h2>
          <ul>
            {EXPLORE.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
