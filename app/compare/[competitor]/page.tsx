import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Breadcrumbs from "@/components/Breadcrumbs";
import ComparisonTable from "@/components/sections/ComparisonTable";
import { competitors, getCompetitor } from "@/lib/compare/competitors";

// Fully static — the comparison data is a checked-in module, no DB / revalidation.
export const revalidate = false;
export const dynamicParams = false;

export function generateStaticParams() {
  return competitors.map((c) => ({ competitor: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>;
}): Promise<Metadata> {
  const { competitor } = await params;
  const data = getCompetitor(competitor);
  if (!data) return { title: "Comparison not found" };

  const description = `${data.oneLiner} See how Kauntech's offline-first, DPDP Act 2023-aligned business card scanner compares to ${data.name} on privacy, offline OCR and lead routing.`;

  return {
    title: data.title,
    description,
    alternates: { canonical: `/compare/${data.slug}` },
    openGraph: {
      title: data.title,
      description,
      url: `/compare/${data.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: data.title,
      description,
    },
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ competitor: string }>;
}) {
  const { competitor } = await params;
  const data = getCompetitor(competitor);
  if (!data) notFound();

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main className="vs-page" style={{ paddingTop: 80 }}>
      <Breadcrumbs
        trail={[
          { name: "Compare", path: "/compare" },
          { name: `Kauntech vs ${data.name}`, path: `/compare/${data.slug}` },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <div className="container vs-container">
        <header className="vs-hero">
          <span className="section-label">Comparison</span>
          <h1>Kauntech vs {data.name}</h1>
          <p className="vs-oneliner">{data.oneLiner}</p>
          <p className="vs-intro">{data.intro}</p>
        </header>

        <section className="vs-block" aria-labelledby="vs-table-heading">
          <h2 id="vs-table-heading" className="vs-h2">
            Kauntech vs {data.name} at a glance
          </h2>
          <ComparisonTable competitorName={data.name} rows={data.rows} />
        </section>

        <section className="vs-block" aria-labelledby="vs-wins-heading">
          <h2 id="vs-wins-heading" className="vs-h2">
            Why teams choose Kauntech over {data.name}
          </h2>
          <ul className="vs-wins">
            {data.kauntechWins.map((win, i) => (
              <li key={i}>
                <span className="vs-check" aria-hidden="true">
                  <i className="fa-solid fa-check" />
                </span>
                <span>{win}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="vs-block" aria-labelledby="vs-strong-heading">
          <h2 id="vs-strong-heading" className="vs-h2">
            Where {data.name} is strong
          </h2>
          <div className="vs-strong">
            <p>{data.competitorStrengths}</p>
          </div>
        </section>

        <section className="vs-cta" aria-labelledby="vs-cta-heading">
          <h2 id="vs-cta-heading" className="vs-cta-title">
            Try the offline-first alternative
          </h2>
          <p>
            Scan a card, enrich it, and route the lead to your CRM, Google Sheets
            or WhatsApp in under 30 seconds — 100% on-device.
          </p>
          <Link href="/get" className="btn-primary">
            Get Kauntech free
            <i className="fa-solid fa-arrow-right" />
          </Link>
        </section>

        <section className="vs-block" aria-labelledby="vs-faq-heading">
          <h2 id="vs-faq-heading" className="vs-h2">
            Frequently asked questions
          </h2>
          <div className="vs-faq">
            {data.faq.map((f, i) => (
              <details key={i} className="vs-faq-item" open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <nav className="vs-more" aria-label="Other comparisons">
          <span className="vs-more-label">Compare Kauntech with:</span>
          {competitors
            .filter((c) => c.slug !== data.slug)
            .map((c) => (
              <Link key={c.slug} href={`/compare/${c.slug}`}>
                {c.name}
              </Link>
            ))}
        </nav>
      </div>
    </main>
  );
}
