import type { Metadata } from "next";
import Compliance from "@/components/sections/Compliance";

export const metadata: Metadata = {
  title: "DPDP Act 2023 Compliance — Enterprise Privacy & Audit Ledger",
  description:
    "Kauntech is engineered for India's DPDP Act 2023: informed consent, on-device processing, AES-256 encryption, and a transparent audit ledger of every recorded field and purpose.",
  alternates: { canonical: "/compliance" },
  openGraph: {
    title: "DPDP Act 2023 Compliance — Kauntech",
    description:
      "Privacy-first by design — informed consent, on-device processing, AES-256 encryption, full DPDP audit ledger.",
    url: "/compliance",
  },
};

export default function CompliancePage() {
  return (
    <main style={{ paddingTop: 80 }}>
      <Compliance />
    </main>
  );
}
