import type { Metadata } from "next";
import RequestsView from "@/components/enterprise/RequestsView";
import { getOrgOwner } from "@/lib/enterpriseConsole";
import { getRequests } from "@/lib/enterpriseRequests";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Requests — KaunTech Enterprise", robots: { index: false, follow: false } };

export default async function RequestsPage() {
  // The layout has already gated this; it can only be null if the session
  // ended between the two reads.
  const owner = (await getOrgOwner())!;
  const requests = await getRequests(owner.org.id);
  const me = owner.seats.find((s) => s.role === "owner");

  return (
    <RequestsView
      requests={requests}
      ownerId={me?.user_id ?? ""}
      orgId={owner.org.id}
      orgName={owner.org.name}
    />
  );
}
