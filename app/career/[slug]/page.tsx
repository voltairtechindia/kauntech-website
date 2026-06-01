import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ApplyModal from "@/components/ApplyModal";
import Markdown from "@/components/Markdown";
import { getJob, listOpenJobs } from "@/lib/careers/db";

const SITE_URL = "https://www.kauntech.com";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const jobs = await listOpenJobs();
    return jobs.map((j) => ({ slug: j.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job || job.status !== "open") return { title: "Role not found" };

  const description =
    job.description_md.replace(/[#*_>`-]/g, "").trim().slice(0, 155) ||
    `Apply for ${job.title} at Kauntech.`;

  return {
    title: `${job.title} — Careers at Kauntech`,
    description,
    alternates: { canonical: `/career/${job.slug}` },
    openGraph: {
      title: `${job.title} at Kauntech`,
      description,
      url: `/career/${job.slug}`,
      type: "website",
    },
  };
}

function chip(icon: string, text: string | null, gold = false) {
  if (!text) return null;
  return (
    <span className={`job-chip${gold ? " gold" : ""}`}>
      <i className={icon} />
      {text}
    </span>
  );
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job || job.status !== "open") notFound();

  const jobLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description_md || job.title,
    datePosted: job.created_at,
    employmentType: job.employment_type ?? undefined,
    hiringOrganization: {
      "@type": "Organization",
      name: "Kauntech Technologies Pvt. Ltd.",
      sameAs: SITE_URL,
    },
    jobLocation: job.location
      ? {
          "@type": "Place",
          address: { "@type": "PostalAddress", addressLocality: job.location },
        }
      : undefined,
    qualifications: job.requirements.length ? job.requirements.join("; ") : undefined,
    skills: job.skills.length ? job.skills.join(", ") : undefined,
  };

  return (
    <main className="career-main">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobLd) }}
      />

      <article className="container job-detail">
        <nav className="blog-breadcrumb">
          <Link href="/career">← All roles</Link>
        </nav>

        <header className="job-detail-header">
          {job.department ? (
            <span className="career-eyebrow">{job.department}</span>
          ) : null}
          <h1>{job.title}</h1>
          <div className="job-detail-meta">
            {chip("fa-solid fa-location-dot", job.location)}
            {chip("fa-solid fa-briefcase", job.employment_type)}
            {chip("fa-solid fa-layer-group", job.experience_level)}
            {chip("fa-solid fa-indian-rupee-sign", job.salary_range, true)}
          </div>
        </header>

        {job.description_md ? (
          <div className="job-section blog-body">
            <Markdown>{job.description_md}</Markdown>
          </div>
        ) : null}

        {job.responsibilities.length ? (
          <div className="job-section">
            <h3>What you&apos;ll do</h3>
            <ul>
              {job.responsibilities.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {job.requirements.length ? (
          <div className="job-section">
            <h3>What we&apos;re looking for</h3>
            <ul>
              {job.requirements.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {job.skills.length ? (
          <div className="job-section">
            <h3>Key skills</h3>
            <div className="job-card-tags">
              {job.skills.map((s, i) => (
                <span key={i} className="job-chip gold">
                  {s}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="job-apply-banner">
          <div>
            <h2>Ready to apply?</h2>
            <p>Takes a couple of minutes — just your details and a resume.</p>
          </div>
          <ApplyModal jobSlug={job.slug} jobTitle={job.title} />
        </div>
      </article>
    </main>
  );
}
