"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutGrid, LogOut, MessageSquarePlus, Users, Contact } from "lucide-react";
import { initials } from "@/lib/enterpriseTypes";
import { createArBrowserClient } from "@/lib/ar/appAuthBrowser";
import { inr } from "@/lib/enterpriseTypes";

/**
 * The console's frame: a side rail on desktop, a sticky bar of tabs on a phone.
 * Four destinations: the team's leads, the people on the plan, what they have
 * asked us for — and the overview that leads to all three.
 */

/**
 * Inside a <Link>, this knows whether the router is still fetching that route.
 * A console page is a live database read, so a click can take a moment: the
 * count is swapped for a spinner rather than leaving the rail looking dead.
 */
function NavPending({ children }: { children?: React.ReactNode }) {
  const { pending } = useLinkStatus();
  if (pending) return <span className="ec-nav-pending" role="status" aria-label="Loading" />;
  return <>{children}</>;
}

const NAV = [
  { href: "/enterprise/admin", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/enterprise/admin/leads", label: "Leads", icon: Contact, exact: false },
  { href: "/enterprise/admin/team", label: "Team", icon: Users, exact: false },
  { href: "/enterprise/admin/requests", label: "Requests", icon: MessageSquarePlus, exact: false },
] as const;

export default function ConsoleShell({
  orgName,
  ownerEmail,
  leadCount,
  seatCount,
  requestCount,
  children,
}: {
  orgName: string;
  ownerEmail: string | null;
  leadCount: number;
  seatCount: number;
  /** Asks we have not closed yet, so the rail says one is still open. */
  requestCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const counts: Record<string, number> = {
    "/enterprise/admin/leads": leadCount,
    "/enterprise/admin/team": seatCount,
    // Zero open asks is the resting state, so it shows nothing rather than a 0.
    ...(requestCount ? { "/enterprise/admin/requests": requestCount } : {}),
  };

  async function signOut() {
    setLeaving(true);
    await createArBrowserClient().auth.signOut();
    router.replace("/enterprise/admin-auth");
    router.refresh();
  }

  return (
    <div className="ar-root ec">
      <div className="ec-shell">
        <aside className="ec-side" aria-label="Console">
          <div className="ec-brand">
            <span className="ec-brand-kicker">KaunTech Enterprise</span>
            <span className="ec-brand-name" title={orgName}>{orgName}</span>
          </div>
          <nav className="ec-nav">
            {NAV.map(({ href, label, icon: Icon, exact }) => (
              <Link
                key={href}
                href={href}
                className="ec-nav-link"
                aria-current={isActive(href, exact) ? "page" : undefined}
              >
                <Icon aria-hidden />
                {label}
                <NavPending>
                  {counts[href] != null ? <span className="ec-nav-count">{inr(counts[href])}</span> : null}
                </NavPending>
              </Link>
            ))}
          </nav>
          <div className="ec-side-foot">
            <div className="ec-side-who">
              <span className="ec-avatar ec-avatar--sm ec-avatar--accent" aria-hidden>{initials(ownerEmail)}</span>
              <span className="ec-side-user" title={ownerEmail ?? undefined}>{ownerEmail}</span>
            </div>
            <button className="ec-btn ec-btn--ghost ec-btn--sm ec-btn--block" onClick={signOut} disabled={leaving}
              style={{ justifyContent: "flex-start" }}>
              <LogOut aria-hidden /> {leaving ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </aside>

        <div style={{ minWidth: 0 }}>
          <header className="ec-top">
            <div className="ec-top-row">
              <div className="ec-brand" style={{ padding: 0 }}>
                <span className="ec-brand-kicker">KaunTech Enterprise</span>
                <span className="ec-brand-name">{orgName}</span>
              </div>
              <button className="ec-btn ec-btn--ghost ec-btn--icon" onClick={signOut} disabled={leaving}
                aria-label="Sign out">
                <LogOut aria-hidden />
              </button>
            </div>
            <nav className="ec-tabs" aria-label="Console">
              {NAV.map(({ href, label, icon: Icon, exact }) => (
                <Link key={href} href={href} className="ec-tab"
                  aria-current={isActive(href, exact) ? "page" : undefined}>
                  <NavPending><Icon aria-hidden /></NavPending> {label}
                </Link>
              ))}
            </nav>
          </header>

          <main className="ec-main">{children}</main>
        </div>
      </div>
    </div>
  );
}
