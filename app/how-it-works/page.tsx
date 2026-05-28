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

export default function HowItWorksPage() {
  return (
    <main style={{ paddingTop: 80 }}>
      <Workflow />
    </main>
  );
}
