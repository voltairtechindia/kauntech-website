import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import Contact from "@/components/sections/Contact";

export const metadata: Metadata = {
  title: "Contact Us — Get in Touch or Request a Demo",
  description:
    "Get in touch with Kauntech for enterprise plans, AI token allotments, custom integrations, or demo requests. Mumbai, India based — we reply quickly.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Kauntech — Get in Touch / Request Demo",
    description:
      "Questions about plans, tokens, or enterprise integrations? Send us a message and we'll revert as soon as possible.",
    url: "/contact",
  },
};

export default function ContactPage() {
  return (
    <main style={{ paddingTop: 80 }}>
      <Breadcrumbs trail={[{ name: "Contact", path: "/contact" }]} />
      <Contact />
    </main>
  );
}
