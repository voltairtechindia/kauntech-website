import type { Metadata } from "next";
import Link from "next/link";

import CareerForm from "@/components/CareerForm";
import { listOpenJobs } from "@/lib/careers/db";
import type { JobOpening } from "@/lib/careers/types";

const SITE_URL = "https://www.kauntech.com";

// Revalidate so newly-posted roles appear without a redeploy.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Careers — Build the future of offline-first networking at Kauntech",
  description:
    "Join Kauntech and help build India's first 100% offline, DPDP-compliant AI business card scanner. See open roles and apply with your resume.",
  alternates: { canonical: "/career" },
  openGraph: {
    title: "Careers at Kauntech",
    description:
      "Open roles at Kauntech — building offline-first, privacy-first AI for sales and networking teams.",
    url: "/career",
    type: "website",
  },
};

function chip(icon: string, text: string | null) {
  if (!text) return null;
  return (
    <span className="job-chip">
      <i className={icon} />
      {text}
    </span>
  );
}

export default async function CareersPage() {
  let jobs: JobOpening[] = [];
  try {
    jobs = await listOpenJobs();
  } catch {
    jobs = [];
  }

  const jobOptions = jobs.map((j) => ({ slug: j.slug, title: j.title }));

  const ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Open roles at Kauntech",
    itemListElement: jobs.map((j, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/career/${j.slug}`,
      name: j.title,
    })),
  };

  return (
    <main className="career-main">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />

      <section className="career-hero container">
        <span className="career-eyebrow">Careers at Kauntech</span>
        <h1>Build privacy-first AI that ships offline.</h1>
        <p>
          We&apos;re a small, fast team making the first 100% offline, DPDP-compliant AI
          business card scanner. If you care about on-device intelligence, clean
          engineering, and real user privacy — we&apos;d love to meet you.
        </p>
      </section>

      <section className="container">
        {jobs.length === 0 ? (
          <p className="career-empty">
            No open roles right now — but we&apos;re always glad to hear from exceptional
            people. Send us a general application below and we&apos;ll be in touch when
            something fits.
          </p>
        ) : (
          <div className="job-grid">
            {jobs.map((j) => (
              <Link key={j.slug} href={`/career/${j.slug}`} className="job-card">
                <h2>{j.title}</h2>
                {j.department ? (
                  <span style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>
                    {j.department}
                  </span>
                ) : null}
                <div className="job-card-tags">
                  {chip("fa-solid fa-location-dot", j.location)}
                  {chip("fa-solid fa-briefcase", j.employment_type)}
                  {chip("fa-solid fa-layer-group", j.experience_level)}
                </div>
                <span style={{ color: "var(--gold)", fontWeight: 600, fontSize: "0.9rem", marginTop: 4 }}>
                  View role &amp; apply →
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="container" id="apply">
        <div className="career-apply-box">
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0 0 8px" }}>
              {jobs.length ? "General application" : "Introduce yourself"}
            </h2>
            <p style={{ color: "var(--text-dim)", maxWidth: 560, margin: "0 auto" }}>
              Don&apos;t see the perfect role? Tell us about yourself and attach your
              resume — our team reviews every application.
            </p>
          </div>
          <CareerForm jobs={jobOptions} />
        </div>
      </section>
    </main>
  );
}
