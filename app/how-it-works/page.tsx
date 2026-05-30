import type { Metadata } from "next";
import Workflow from "@/components/sections/Workflow";

export const metadata: Metadata = {
  title: "How It Works — Capture, Enrich, Automate in 30 Seconds",
  description:
    "From physical card to CRM sync in under 30 seconds. See how Kauntech's three-step offline workflow captures, enriches, and automates contact handoff to your favorite tools.",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How Kauntech Works — Capture, Enrich, Automate",
    description:
      "Capture via OCR/QR/NFC, enrich on-device with AI, automate routing to WhatsApp, Gmail, Sheets, or Webhooks — all in 30 seconds.",
    url: "/how-it-works",
  },
};

const howToLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Capture, Enrich and Automate a Business Card with Kauntech",
  description:
    "From physical card to CRM sync in under 30 seconds using Kauntech's 100% offline OCR workflow.",
  totalTime: "PT30S",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Capture",
      text: "Point your camera at any business card. Kauntech's on-device OCR engine extracts all contact fields — name, phone, email, company, address — without sending data to any server.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Enrich",
      text: "AI enrichment runs locally on your device to fill missing fields, verify phone formats, and score the lead quality — all offline, all private.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Automate",
      text: "Route the enriched contact to WhatsApp, Gmail, Google Sheets, Telegram, or a custom Webhook in one tap. Sync happens the moment connectivity is available.",
    },
  ],
};

export default function HowItWorksPage() {
  return (
    <main style={{ paddingTop: 80 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
      />
      <Workflow />
    </main>
  );
}
