/**
 * Dynamic /llms.txt - the llmstxt.org manifest that helps LLMs / answer engines
 * (ChatGPT, Perplexity, Google AI Overviews, etc.) understand Kauntech and find
 * the right pages. Marketing pages are static; blog posts and open roles are
 * pulled from the DB so new content shows up automatically (good for GEO/AEO).
 * Falls back to the static skeleton if the DB is unreachable so it never 500s.
 */
import { listPublishedPosts } from "@/lib/blog/db";
import { listOpenJobs } from "@/lib/careers/db";

export const runtime = "nodejs";
// Regenerate at most every 5 min; matches the blog/sitemap ISR cadence.
export const revalidate = 300;

const SITE_URL = "https://www.kauntech.com";

const HEADER = `# Kauntech

> Kauntech is India's offline-first AI business card scanner. Scan, enrich, and sync contacts in 30 seconds - scanning and OCR run fully on-device, so it works without internet and is DPDP Act 2023 compliant (cloud backup is optional; you choose what syncs).

## About
- Product: Offline-first AI business card / visiting card scanner (Android & iOS)
- Company: Kauntech Technologies Pvt. Ltd.
- Key angle: 100% on-device OCR · DPDP Act 2023 compliant · AI contact enrichment
- Tagline: "Capture, enrich, and automate contact management in 30 seconds - without internet."

## Core pages
- [Home](${SITE_URL}/): What Kauntech is and who it's for.
- [Features](${SITE_URL}/features): On-device OCR, enrichment, sync, and automation.
- [How it works](${SITE_URL}/how-it-works): Scan → enrich → sync in three steps.
- [Pricing](${SITE_URL}/pricing): Plans and what's included.
- [Compare](${SITE_URL}/compare): How Kauntech stacks up against other scanners.
- [Compliance](${SITE_URL}/compliance): DPDP Act 2023 and on-device data handling.
- [FAQ](${SITE_URL}/faq): Answers on offline scanning, DPDP compliance, data storage, K-Tokens, and pricing.
- [Help](${SITE_URL}/help): Auto-sync setup guide (webhook & Google Sheets).
- [Contact](${SITE_URL}/contact): Get in touch with the team.`;

const FOOTER = `## Policies
- [Privacy Policy](${SITE_URL}/privacy)
- [Terms of Service](${SITE_URL}/terms)`;

/** One markdown link line, with an optional one-line summary. */
function line(title: string, path: string, summary?: string | null): string {
  const desc = summary?.trim() ? `: ${summary.trim()}` : "";
  return `- [${title}](${SITE_URL}${path})${desc}`;
}

async function buildBody(): Promise<string> {
  const sections: string[] = [HEADER];

  // Blog (resources)
  const resources = [
    `- [Blog](${SITE_URL}/blog): Guides on contact management, on-device OCR, and DPDP compliance.`,
  ];
  try {
    const posts = await listPublishedPosts();
    for (const p of posts) resources.push(line(p.title, `/blog/${p.slug}`, p.excerpt));
  } catch {
    /* skip individual posts if the DB is unreachable */
  }
  resources.push(`- [Sitemap](${SITE_URL}/sitemap.xml)`);
  sections.push(["## Resources", ...resources].join("\n"));

  // Open roles (careers)
  try {
    const jobs = await listOpenJobs();
    if (jobs.length) {
      sections.push(
        [
          "## Careers",
          ...jobs.map((j) =>
            line(j.title, `/career/${j.slug}`, [j.department, j.location].filter(Boolean).join(" · ") || null),
          ),
        ].join("\n"),
      );
    }
  } catch {
    /* skip the section if the DB is unreachable */
  }

  sections.push(FOOTER);
  return sections.join("\n\n") + "\n";
}

export async function GET() {
  const body = await buildBody();
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
