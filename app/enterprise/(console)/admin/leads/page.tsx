import type { Metadata } from "next";
import LeadsView from "@/components/enterprise/LeadsView";
import { getOrgOwner } from "@/lib/enterpriseConsole";
import { getEventNames, getLeadsPage } from "@/lib/enterpriseLeads";
import { parseLeadFilters } from "@/lib/enterpriseTypes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leads — KaunTech Enterprise", robots: { index: false, follow: false } };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseLeadFilters(sp);
  const owner = (await getOrgOwner())!;

  const [page, events] = await Promise.all([
    getLeadsPage(owner.org.id, filters),
    getEventNames(owner.org.id),
  ]);

  const lead = typeof sp.lead === "string" ? sp.lead : null;

  return (
    <LeadsView
      rows={page.rows}
      total={page.total}
      filters={filters}
      seats={owner.seats}
      events={events}
      initialLead={lead}
    />
  );
}
