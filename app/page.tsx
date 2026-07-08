import Hero from "@/components/sections/Hero";
import HomeHighlights from "@/components/sections/HomeHighlights";
import HomeOverview from "@/components/sections/HomeOverview";
import Faq from "@/components/sections/Faq";

// The FAQ teaser reads the DB-backed `site_faqs` table, so revalidate on the
// same cadence as the blog/sitemap (admin FAQ edits go live within 5 min; the
// /api/faq write also revalidates "/" for an instant refresh).
export const revalidate = 300;

export default function HomePage() {
  return (
    <>
      <Hero />
      <HomeHighlights />
      <HomeOverview />
      {/* Short teaser only — the canonical FAQPage schema lives on /faq. */}
      <Faq limit={6} seeAllHref="/faq" />
    </>
  );
}
