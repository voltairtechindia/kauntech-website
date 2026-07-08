/**
 * BreadcrumbList JSON-LD for sub-pages (SEO/AEO). Schema-only — no visible UI —
 * so it slots into any page without touching layout. "Home" is prepended
 * automatically; pass the trail from Home down to (and including) the current page.
 *
 *   <Breadcrumbs trail={[{ name: "Compliance", path: "/compliance" }]} />
 */
const SITE_URL = "https://www.kauntech.com";

export type Crumb = { name: string; path: string };

export default function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const items: Crumb[] = [{ name: "Home", path: "/" }, ...trail];

  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SITE_URL}${c.path}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  );
}
