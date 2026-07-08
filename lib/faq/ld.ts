/** FAQPage JSON-LD builder — shared by the /faq page and the blog per-post FAQ. */
import type { FaqQA } from "./types";

/**
 * Build a schema.org FAQPage object from `{q,a}` pairs. Emit the result as
 * `<script type="application/ld+json">` so Google/answer-engines can extract
 * the Q&A. Returns null for an empty list so callers can skip the tag.
 */
export function buildFaqLd(faqs: FaqQA[]): Record<string, unknown> | null {
  if (!faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}
