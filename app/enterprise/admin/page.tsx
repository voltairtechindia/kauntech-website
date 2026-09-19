import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SeatsManager from "@/components/enterprise/SeatsManager";
import { getOrgView, getOrgOwner, unallocated } from "@/lib/enterpriseConsole";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your team — KaunTech Enterprise",
  robots: { index: false, follow: false },
};

export default async function EnterpriseAdminPage() {
  // Two different failures, two different messages: not signed in at all, or
  // signed in as somebody who is on the plan but does not manage it.
  const owner = await getOrgOwner();
  if (!owner) {
    const view = await getOrgView();
    if (!view) redirect("/enterprise/admin-auth");
    redirect("/enterprise/admin-auth?error=not_owner");
  }

  return <SeatsManager initial={owner} initialFree={unallocated(owner)} />;
}
