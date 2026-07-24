import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import Contact from "@/components/sections/Contact";

export const metadata: Metadata = {
  title: "Contact Us - Book a Demo or Get a Price",
  description:
    "Message the Kauntech team to book a demo, get pricing for your team, or ask about integrations and DPDP compliance. We reply within one business day.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Talk to the Kauntech team",
    description:
      "Book a demo, get a price for your team, or ask a question. We reply within one business day.",
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
