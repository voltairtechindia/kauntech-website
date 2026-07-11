import Link from "next/link";
import SplitHeading from "@/components/motion/SplitHeading";
import Ic from "@/components/ui/Icon";
import { ArrowRight, Cpu, Lock, ShieldCheck, ShieldUser } from "lucide-react";

/** DPDP trust band — the privacy story told as architecture, not policy. */
export default function ComplianceBand() {
  return (
    <section className="k-vault-section" id="compliance-band">
      <div className="container k-vault">
        <div className="k-vault-visual reveal" aria-hidden="true">
          <span className="k-vault-ring r1" />
          <span className="k-vault-ring r2" />
          <span className="k-vault-ring r3" />
          <span className="k-vault-core">
            <Ic icon={ShieldCheck} />
          </span>
          <span className="k-vault-sat s1">
            <Ic icon={Lock} />
          </span>
          <span className="k-vault-sat s2">
            <Ic icon={Cpu} />
          </span>
          <span className="k-vault-sat s3">
            <Ic icon={ShieldUser} />
          </span>
        </div>

        <div className="k-vault-copy">
          <span className="k-kicker">DPDP Act 2023</span>
          <SplitHeading as="h2" className="k-h2">
            Private by <em>architecture,</em> not by promise.
          </SplitHeading>
          <p>
            Card processing happens on your device, so scanned images and contact details are never uploaded
            to Kauntech&apos;s servers. AES-256 encrypted local storage, cloud backup that&apos;s strictly
            opt-in, and a real data-deletion portal — data minimisation by design.
          </p>
          <div className="k-vault-chips">
            <span className="k-mchip">AES-256 encrypted</span>
            <span className="k-mchip">On-device OCR</span>
            <span className="k-mchip">Opt-in cloud</span>
            <span className="k-mchip">Right to erasure</span>
          </div>
          <Link href="/compliance" className="k-arrowlink">
            Read the full compliance breakdown <Ic icon={ArrowRight} />
          </Link>
        </div>
      </div>
    </section>
  );
}
