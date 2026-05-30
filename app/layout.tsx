import type { Metadata, Viewport } from "next";
import { Fira_Sans, Fira_Code } from "next/font/google";
import "./globals.css";
import "./extra.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

const SITE_URL = "https://kauntech.com";

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-fira-sans",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fira-code",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AI Business Card Scanner — Offline & DPDP Compliant | Kauntech",
    template: "%s | Kauntech",
  },
  description:
    "Kauntech is India's first 100% offline AI business card scanner. Scan, enrich, and sync contacts in 30 seconds. DPDP Act 2023 compliant — no scanned data leaves your device.",
  keywords: [
    "offline business card scanner India",
    "AI visiting card scanner",
    "scan business cards without internet",
    "DPDP compliant contact app",
    "OCR contact scanner",
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
  },
  twitter: {
    card: "summary_large_image",
    title: "Kauntech — The Offline-First Business Card Scanner",
    description:
      "Capture, enrich, and automate contact management in 30 seconds without internet. 100% DPDP Act 2023 compliant.",
  },
  icons: {
    icon: "/assets/logo-gold.png",
    apple: "/assets/logo-gold.png",
  },
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

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Kauntech Technologies Pvt. Ltd.",
  url: SITE_URL + "/",
  logo: SITE_URL + "/assets/logo-gold.png",
  email: "voltairtechindia@gmail.com",
  foundingLocation: {
    "@type": "Place",
    name: "Mumbai, India",
  },
  sameAs: [
    "https://www.linkedin.com/company/120934522/",
    "https://www.facebook.com/profile.php?id=61589123915607",
    "https://www.instagram.com/kauntech/",
    "https://kauntech.quora.com/",
    "https://discord.gg/AVYMsrhk",
  ],
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Kauntech",
  url: SITE_URL + "/",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: SITE_URL + "/?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${firaSans.variable} ${firaCode.variable}`}>
      <head>
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
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
