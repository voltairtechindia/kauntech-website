import type { Metadata } from "next";
import Link from "next/link";

import CareerForm from "@/components/CareerForm";
import { listOpenJobs } from "@/lib/careers/db";
import type { JobOpening } from "@/lib/careers/types";

const SITE_URL = "https://www.kauntech.com";

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

function chip(icon: string, text: string | null, gold = false) {
  if (!text) return null;
  return (
    <span className={`job-chip${gold ? " gold" : ""}`}>
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

      {/* Hero */}
      <section className="career-hero container">
        <span className="career-eyebrow">Careers at Kauntech</span>
        <h1>Build privacy-first AI that ships offline.</h1>
        <p>
          We&apos;re a small, fast team making the first 100% offline, DPDP-compliant AI
          business card scanner. If you care about on-device intelligence, clean
          engineering, and real user privacy — we&apos;d love to meet you.
        </p>
        {jobs.length > 0 && (
          <div className="career-hero-meta">
            <span className="career-open-badge">
              <i className="fa-solid fa-circle-dot" />
              {jobs.length} open {jobs.length === 1 ? "role" : "roles"}
            </span>
            <span className="career-meta-sep">·</span>
            <span className="career-meta-item">Remote-friendly</span>
            <span className="career-meta-sep">·</span>
            <span className="career-meta-item">India-based</span>
          </div>
        )}
      </section>

      {/* Job grid */}
      <section className="container">
        {jobs.length === 0 ? (
          <div className="career-empty-state">
            <div className="career-empty-icon">
              <i className="fa-solid fa-mug-hot" />
            </div>
            <h3>No open roles right now</h3>
            <p>
              We&apos;re always glad to hear from exceptional people. Send us a general
              application below and we&apos;ll be in touch when something fits.
            </p>
            <a className="career-scroll-link" href="#apply">
              Send a general application →
            </a>
          </div>
        ) : (
          <>
            <div className="career-section-header">
              <h2 className="career-section-title">Open Positions</h2>
              <span className="career-count-badge">{jobs.length}</span>
            </div>
            <div className="job-grid">
              {jobs.map((j) => (
                <Link key={j.slug} href={`/career/${j.slug}`} className="job-card">
                  {j.department ? (
                    <span className="job-dept">{j.department}</span>
                  ) : null}
                  <h2>{j.title}</h2>
                  <div className="job-card-tags">
                    {chip("fa-solid fa-location-dot", j.location)}
                    {chip("fa-solid fa-briefcase", j.employment_type)}
                    {chip("fa-solid fa-layer-group", j.experience_level)}
                    {chip("fa-solid fa-indian-rupee-sign", j.salary_range, true)}
                  </div>
                  {j.positions && j.positions > 1 ? (
                    <span className="job-positions">{j.positions} positions</span>
                  ) : null}
                  <div className="job-card-cta">
                    View role &amp; apply
                    <i className="fa-solid fa-arrow-right job-arrow" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {/* General application */}
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
