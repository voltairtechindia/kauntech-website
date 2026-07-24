import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Ic from "@/components/ui/Icon";

import { getFaqPairs } from "@/lib/faq/db";
import { buildFaqLd } from "@/lib/faq/ld";

import FaqAccordion from "./FaqAccordion";

/**
 * Marketing FAQ section (server component). Reads the Q&A from the DB-backed
 * `site_faqs` table (admin-editable, falls back to a built-in set), renders the
 * accordion, and - only when `showSchema` is set - emits the FAQPage JSON-LD.
 *
 * The canonical FAQPage schema lives on the dedicated /faq page (showSchema),
 * so the homepage renders a short teaser (limit + seeAllHref) WITHOUT schema to
 * avoid duplicate FAQPage structured data on two indexable URLs.
 */
export default async function Faq({
  limit,
  showSchema = false,
  headingLevel = 2,
  eyebrow = "Questions Answered",
  heading = "Frequently Asked Questions",
  subtitle = "Everything about offline scanning, K-Tokens, DPDP compliance, and pricing.",
  seeAllHref,
}: {
  limit?: number;
  showSchema?: boolean;
  headingLevel?: 1 | 2;
  eyebrow?: string;
  heading?: string;
  subtitle?: string;
  seeAllHref?: string;
} = {}) {
  const faqs = await getFaqPairs(limit);
  const faqLd = showSchema ? buildFaqLd(faqs) : null;
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <section id="faq">
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}
      <div className="container">
        <div className="section-header reveal">
          <span className="section-label">{eyebrow}</span>
          <Heading>{heading}</Heading>
          <p>{subtitle}</p>
        </div>

        <FaqAccordion faqs={faqs} />

        {seeAllHref && (
          <div className="faq-see-all reveal">
            <Link href={seeAllHref} className="faq-see-all-link">
              See all frequently asked questions
              <Ic icon={ArrowRight} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
