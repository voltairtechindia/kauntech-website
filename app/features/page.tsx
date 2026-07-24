import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import Features from "@/components/sections/Features";

export const metadata: Metadata = {
  title: "Features - Offline OCR, AI Enrichment & Automations",
  description:
    "Explore Kauntech's offline OCR, AI enrichment, multi-channel automations (WhatsApp, Gmail, Google Sheets, Telegram, Webhooks), and brand customization built for DPDP-compliant lead capture.",
  alternates: { canonical: "/features" },
  openGraph: {
    title: "Kauntech Features - Offline OCR, AI Enrichment & Automations",
    description:
      "Offline OCR, AI enrichment, multi-channel automations, and brand customization - engineered for speed and DPDP Act 2023 compliance.",
    url: "/features",
  },
};

export default function FeaturesPage() {
  return (
    <main style={{ paddingTop: 80 }}>
      <Breadcrumbs trail={[{ name: "Features", path: "/features" }]} />
      <Features />
    </main>
  );
}
