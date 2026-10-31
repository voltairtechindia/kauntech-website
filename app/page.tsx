import HomeExperience from "@/components/home/HomeExperience";
import BentoFeatures from "@/components/home/BentoFeatures";
import IntegrationsRouter from "@/components/home/IntegrationsRouter";
import ComplianceBand from "@/components/home/ComplianceBand";
import PricingTeaser from "@/components/home/PricingTeaser";
import FinalCta from "@/components/home/FinalCta";
import HomeOverview from "@/components/sections/HomeOverview";
import Faq from "@/components/sections/Faq";

// The FAQ teaser reads the DB-backed `site_faqs` table at build time; admin FAQ
// edits go live on the next site build.

export default function HomePage() {
  return (
    <>
      {/* Hero + marquee + pinned 3D-phone scroll story (client experience) */}
      <HomeExperience />
      <BentoFeatures />
      <IntegrationsRouter />
      <ComplianceBand />
      <PricingTeaser />
      <HomeOverview />
      {/* Short teaser only - the canonical FAQPage schema lives on /faq. */}
      <Faq limit={6} seeAllHref="/faq" />
      <FinalCta />
    </>
  );
}
