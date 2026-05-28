import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./extra.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

const SITE_URL = "https://kauntech.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kauntech — The Offline-First Business Card Scanner | DPDP Compliant",
    template: "%s | Kauntech",
  },
  description:
    "Kauntech is the ONLY business card scanner that works completely offline while maintaining DPDP Act compliance. Capture, enrich, and sync contacts anywhere in 30 seconds.",
  keywords: [
    "offline business card scanner",
    "OCR contact scanner",
    "DPDP compliant lead capture",
    "AI business card reader",
    "secure contact sync",
    "offline lead automation",
    "Kauntech app",
    "on-device OCR",
    "enterprise contact management",
  ],
  authors: [{ name: "Kauntech Technologies Pvt. Ltd." }],
  creator: "Kauntech Technologies Pvt. Ltd.",
  publisher: "Kauntech Technologies Pvt. Ltd.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Kauntech",
    title: "Kauntech — The Offline-First Business Card Scanner",
    description:
      "Capture, enrich, and automate contact management in 30 seconds without internet. 100% DPDP Act 2023 compliant.",
    images: [{ url: "/assets/app-home.jpg", width: 1200, height: 630, alt: "Kauntech App" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kauntech — The Offline-First Business Card Scanner",
    description:
      "Capture, enrich, and automate contact management in 30 seconds without internet. 100% DPDP Act 2023 compliant.",
    images: ["/assets/app-home.jpg"],
  },
  icons: { icon: "/assets/logo-gold.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f97316",
};

const orgLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Kauntech",
  operatingSystem: "Android, iOS",
  applicationCategory: "BusinessApplication",
  description:
    "India's premier 100% offline business card scanner and OCR app with AI enrichment and multi-channel automation. Fully adheres to the DPDP Act 2023.",
  url: SITE_URL + "/",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "INR",
    lowPrice: "0",
    highPrice: "999",
    offerCount: "3",
  },
  publisher: {
    "@type": "Organization",
    name: "Kauntech Technologies Pvt. Ltd.",
    url: SITE_URL + "/",
    logo: SITE_URL + "/assets/logo-gold.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
        />
      </head>
      <body>
        <ScrollReveal />
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
