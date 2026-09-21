import { redirect } from "next/navigation";
import ConsoleShell from "@/components/enterprise/ConsoleShell";
import { getOrgOwner, getOrgView } from "@/lib/enterpriseConsole";
import { getLeadCount } from "@/lib/enterpriseLeads";

export const dynamic = "force-dynamic";

/**
 * One gate for every console section. Not signed in goes to sign-in; signed in
 * as someone who is on a plan but does not run it gets told so, rather than a
 * blank page.
 */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const owner = await getOrgOwner();
  if (!owner) {
    const view = await getOrgView();
    redirect(view ? "/enterprise/admin-auth?error=not_owner" : "/enterprise/admin-auth");
  }

  const me = owner.seats.find((s) => s.role === "owner");
  // A HEAD count: no rows travel, and it only runs on a full page load — the
  // shell is a shared layout, so switching sections reuses it. A failure shows
  // a zero in the rail rather than an error page.
  const leadCount = await getLeadCount(owner.org.id).catch(() => 0);

  return (
    <ConsoleShell
      orgName={owner.org.name}
      ownerEmail={me?.email ?? null}
      leadCount={leadCount}
      seatCount={owner.seats.length}
    >
      {children}
    </ConsoleShell>
  );
}
