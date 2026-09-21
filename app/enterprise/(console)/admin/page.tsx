import type { Metadata } from "next";
import OverviewView from "@/components/enterprise/OverviewView";
import { getOrgOwner } from "@/lib/enterpriseConsole";
import { getOverview } from "@/lib/enterpriseLeads";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Overview — KaunTech Enterprise", robots: { index: false, follow: false } };

export default async function OverviewPage() {
  // The layout has already gated this; it can only be null if the session
  // ended between the two reads.
  const owner = (await getOrgOwner())!;
  const ov = await getOverview(owner.org.id);
  return <OverviewView owner={owner} ov={ov} />;
}
