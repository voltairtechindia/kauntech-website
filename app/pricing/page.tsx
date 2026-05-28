import type { Metadata } from "next";
import Pricing from "@/components/sections/Pricing";

export const metadata: Metadata = {
  title: "Pricing & Top-Ups — Free, Pro, Ultra & Custom Plans",
  description:
    "Kauntech pricing: Free (49 scans), Pro (₹499/mo), Ultra (₹999/mo), and Custom enterprise tiers. Understand the K-Tokens economy and AI Intel / Fix / Strategy token costs.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Kauntech Pricing — Free, Pro, Ultra & Custom",
    description:
      "Flexible offline-first scanning plans with K-Tokens for AI Fix, AI Intel, and AI Strategy.",
    url: "/pricing",
  },
};

export default function PricingPage() {
  return (
    <main style={{ paddingTop: 80 }}>
      <Pricing />
    </main>
  );
}
