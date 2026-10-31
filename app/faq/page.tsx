import type { Metadata } from "next";

import Breadcrumbs from "@/components/Breadcrumbs";
import Faq from "@/components/sections/Faq";

// DB-backed FAQ, read at build time. Admin edits go live on the next site build.

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about Kauntech - the offline-first AI business card scanner: offline OCR, DPDP Act 2023 compliance, where your data is stored, K-Tokens, and pricing.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Kauntech FAQ - Offline Scanning, Privacy & Pricing",
    description:
      "How Kauntech's offline card scanning works, DPDP Act 2023 compliance, data storage, K-Tokens, and plans - answered.",
    url: "/faq",
  },
};

export default function FaqPage() {
  return (
    <main style={{ paddingTop: 80 }}>
      <Breadcrumbs trail={[{ name: "FAQ", path: "/faq" }]} />
      <Faq
        showSchema
        headingLevel={1}
        eyebrow="Questions Answered"
        heading="Frequently Asked Questions"
        subtitle="Everything about Kauntech's offline scanning, on-device privacy, DPDP Act 2023 compliance, K-Tokens, and pricing - in one place."
      />
    </main>
  );
}
