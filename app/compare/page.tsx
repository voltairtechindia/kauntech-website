import type { Metadata } from "next";
import Compare from "@/components/sections/Compare";

export const metadata: Metadata = {
  title: "Compare — Kauntech vs. Other Business Card Scanners",
  description:
    "Side-by-side comparison of Kauntech vs. leading Indian business card scanners across offline capability, DPDP compliance, server-side retention, Indian-language support and AI enrichment.",
  alternates: { canonical: "/compare" },
  openGraph: {
    title: "Kauntech vs. Competitors — Offline & DPDP Edge",
    description:
      "How Kauntech's offline-first architecture compares to top Indian business card scanner alternatives.",
    url: "/compare",
  },
};

export default function ComparePage() {
  return (
    <main style={{ paddingTop: 80 }}>
      <Compare />
    </main>
  );
}
