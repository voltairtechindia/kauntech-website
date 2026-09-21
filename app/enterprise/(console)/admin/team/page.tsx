import type { Metadata } from "next";
import SeatsManager from "@/components/enterprise/SeatsManager";
import { getOrgOwner, unallocated } from "@/lib/enterpriseConsole";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Team — KaunTech Enterprise", robots: { index: false, follow: false } };

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const owner = (await getOrgOwner())!;
  return <SeatsManager initial={owner} initialFree={unallocated(owner)} openAdd={sp.add === "1"} />;
}
