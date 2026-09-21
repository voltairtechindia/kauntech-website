"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutGrid, LogOut, Users, Contact } from "lucide-react";
import { createArBrowserClient } from "@/lib/ar/appAuthBrowser";
import { inr } from "@/lib/enterpriseTypes";

/**
 * The console's frame: a side rail on desktop, a sticky bar with three tabs on
 * a phone. Three destinations only — the owner comes here to look at the team's
 * leads and to manage people, and every extra item would dilute that.
 */

const NAV = [
  { href: "/enterprise/admin", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/enterprise/admin/leads", label: "Leads", icon: Contact, exact: false },
  { href: "/enterprise/admin/team", label: "Team", icon: Users, exact: false },
] as const;

export default function ConsoleShell({
  orgName,
  ownerEmail,
  leadCount,
  seatCount,
  children,
}: {
  orgName: string;
  ownerEmail: string | null;
  leadCount: number;
  seatCount: number;
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
                {counts[href] != null ? <span className="ec-nav-count">{inr(counts[href])}</span> : null}
              </Link>
            ))}
          </nav>
          <div className="ec-side-foot">
            <span className="ec-side-user" title={ownerEmail ?? undefined}>{ownerEmail}</span>
            <button className="ec-btn ec-btn--ghost ec-btn--sm" onClick={signOut} disabled={leaving}
              style={{ justifyContent: "flex-start", paddingLeft: 0 }}>
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
                  <Icon aria-hidden /> {label}
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
