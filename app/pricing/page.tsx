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

const pricingLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Kauntech — Offline Business Card Scanner",
  description:
    "India's only 100% offline business card scanner with AI enrichment, K-Tokens, and DPDP Act 2023 compliance.",
  brand: {
    "@type": "Brand",
    name: "Kauntech",
  },
  offers: [
    {
      "@type": "Offer",
      name: "Free Plan",
      price: "0",
      priceCurrency: "INR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "0",
        priceCurrency: "INR",
        billingIncrement: 1,
        unitCode: "MON",
      },
      availability: "https://schema.org/InStock",
      url: "https://kauntech.com/pricing",
    },
    {
      "@type": "Offer",
      name: "Pro Plan",
      price: "499",
      priceCurrency: "INR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "499",
        priceCurrency: "INR",
        billingIncrement: 1,
        unitCode: "MON",
      },
      availability: "https://schema.org/InStock",
      url: "https://kauntech.com/pricing",
    },
    {
      "@type": "Offer",
      name: "Ultra Plan",
      price: "999",
      priceCurrency: "INR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "999",
        priceCurrency: "INR",
        billingIncrement: 1,
        unitCode: "MON",
      },
      availability: "https://schema.org/InStock",
      url: "https://kauntech.com/pricing",
    },
  ],
};

export default function PricingPage() {
  return (
    <main style={{ paddingTop: 80 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingLd) }}
      />
      <Pricing />
    </main>
  );
}
