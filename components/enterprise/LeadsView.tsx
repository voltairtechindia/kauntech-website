"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2, Search, SearchX, Contact, X } from "lucide-react";
import LeadDrawer from "./LeadDrawer";
import {
  LEADS_PAGE_SIZE,
  RANGES,
  TEMPERATURES,
  filtersToQuery,
  initials,
  inr,
  relTime,
  seatName,
  type LeadFilters,
  type LeadRow,
  type OrgSeat,
  type Temperature,
} from "@/lib/enterpriseTypes";

/**
 * The shared pool. Filtering happens on the server — the URL is the state — so
 * a filtered view survives refresh, back, and being pasted to a colleague, and
 * a large pool never has to travel to the browser.
 */

const TEMP_LABEL: Record<Temperature, string> = { hot: "Hot", warm: "Warm", cold: "Cold" };

export function TempPill({ t }: { t: Temperature | null }) {
  if (!t) return <span className="ec-pill ec-pill--muted">—</span>;
  return <span className={`ec-pill ec-pill--${t}`}>{TEMP_LABEL[t]}</span>;
}

export default function LeadsView({
  rows,
  total,
  filters,
  seats,
  events,
  initialLead,
}: {
  rows: LeadRow[];
  total: number;
  filters: LeadFilters;
  seats: OrgSeat[];
  events: string[];
  initialLead: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(filters.q);
  const [openId, setOpenId] = useState<string | null>(initialLead);
  const byId = new Map(seats.map((s) => [s.user_id, s]));
  const firstRender = useRef(true);

  function go(next: Partial<LeadFilters>) {
    const merged: LeadFilters = { ...filters, page: 1, ...next };
    start(() => router.replace(`${pathname}${filtersToQuery(merged)}`, { scroll: false }));
  }

  // Search as you type, settled for 300 ms so each keystroke is not a query.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const t = setTimeout(() => { if (q !== filters.q) go({ q }); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function openLead(id: string | null) {
    setOpenId(id);
    // Deep-linkable without a server round trip: the drawer reads the row itself.
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("lead", id);
    else url.searchParams.delete("lead");
    window.history.replaceState(null, "", url.toString());
  }

  const filtered = !!(filters.q || filters.by || filters.event || filters.temp || filters.range !== "all");
  const from = total ? (filters.page - 1) * LEADS_PAGE_SIZE + 1 : 0;
  const to = Math.min(filters.page * LEADS_PAGE_SIZE, total);
  const pages = Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE));
  const exportHref = `/api/enterprise/admin/leads/export${filtersToQuery({ ...filters, page: 1 })}`;

  return (
    <div className="ec-page">
      <div className="ec-head">
        <div>
          <h1 className="ec-title">Leads</h1>
          <p className="ec-sub">Everything your team has scanned, with who scanned it.</p>
        </div>
        <div className="ec-head-actions">
          <a className="ec-btn" href={exportHref} aria-disabled={total === 0 || undefined}
            onClick={(e) => { if (total === 0) e.preventDefault(); }}>
            <Download aria-hidden /> Export CSV{filtered && total ? ` (${inr(total)})` : ""}
          </a>
        </div>
      </div>

      <section className="ec-panel" aria-label="Team leads">
        <div className="ec-toolbar" role="search">
          <label className="ec-search">
            <span className="ec-sr">Search leads</span>
            {pending ? <Loader2 aria-hidden style={{ animation: "ec-spin 700ms linear infinite" }} /> : <Search aria-hidden />}
            <input
              className="ec-input"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, company, email"
            />
          </label>

          <label>
            <span className="ec-sr">Scanned by</span>
            <select className="ec-select" value={filters.by} onChange={(e) => go({ by: e.target.value })}>
              <option value="">Everyone</option>
              {seats.map((s) => (
                <option key={s.user_id} value={s.user_id}>{seatName(s)}{s.role === "owner" ? " (you)" : ""}</option>
              ))}
            </select>
          </label>

          {events.length ? (
            <label>
              <span className="ec-sr">Event</span>
              <select className="ec-select" value={filters.event} onChange={(e) => go({ event: e.target.value })}>
                <option value="">All events</option>
                {events.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
              </select>
            </label>
          ) : null}

          <label>
            <span className="ec-sr">Date range</span>
            <select className="ec-select" value={filters.range} onChange={(e) => go({ range: e.target.value as LeadFilters["range"] })}>
              {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </label>

          <div className="ec-seg" role="group" aria-label="Temperature">
            <button type="button" aria-pressed={!filters.temp} onClick={() => go({ temp: "" })}>All</button>
            {TEMPERATURES.map((t) => (
              <button key={t} type="button" aria-pressed={filters.temp === t} onClick={() => go({ temp: t })}>
                {TEMP_LABEL[t]}
              </button>
            ))}
          </div>

          {filtered ? (
            <button type="button" className="ec-btn ec-btn--ghost ec-btn--sm"
              onClick={() => { setQ(""); go({ q: "", by: "", event: "", temp: "", range: "all" }); }}>
              <X aria-hidden /> Clear
            </button>
          ) : null}
        </div>

        {rows.length ? (
          <div className="ec-table-wrap" style={{ opacity: pending ? 0.6 : 1, transition: "opacity 120ms" }}>
            <table className="ec-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th className="ec-col-wide ec-col-xl">Company</th>
                  <th className="ec-col-wide">Scanned by</th>
                  <th className="ec-col-wide ec-col-xl">Event</th>
                  <th className="ec-col-wide">Temperature</th>
                  <th className="ec-col-wide ec-col-xl">Intel</th>
                  <th className="num ec-col-wide">Scanned</th>
                  <th className="ec-col-narrow"><span className="ec-sr">Temperature</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => {
                  const who = byId.get(l.user_id);
                  return (
                    <tr
                      key={l.id}
                      className={`is-click${openId === l.id ? " is-selected" : ""}`}
                      tabIndex={0}
                      onClick={() => openLead(l.id)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLead(l.id); } }}
                      aria-label={`Open ${l.name || "lead"}`}
                    >
                      <td>
                        <div className="ec-cell-lead">
                          <span className="ec-avatar ec-avatar--sm" aria-hidden>{initials(l.name)}</span>
                          <div>
                            <div className="ec-cell-name">{l.name || "Unnamed lead"}</div>
                            <div className="ec-cell-sub ec-col-wide ec-only-xl">{l.title || l.email || l.phone || ""}</div>
                            <div className="ec-cell-sub ec-only-md">{[l.company, l.conference].filter(Boolean).join(" · ") || l.title || ""}</div>
                            <div className="ec-cell-sub ec-col-narrow">{l.company || l.title || ""}</div>
                            <div className="ec-cell-sub ec-col-narrow">{seatName(who)} · {relTime(l.scanned_at)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="ec-col-wide ec-col-xl">{l.company || <span className="ec-muted">—</span>}</td>
                      <td className="ec-col-wide">
                        <span className="ec-who">
                          <span className="ec-avatar ec-avatar--sm" aria-hidden>{initials(seatName(who))}</span>
                          <span>{seatName(who)}</span>
                        </span>
                      </td>
                      <td className="ec-col-wide ec-col-xl">{l.conference || <span className="ec-muted">—</span>}</td>
                      <td className="ec-col-wide"><TempPill t={l.lead_temperature} /></td>
                      <td className="ec-col-wide ec-col-xl">
                        {l.enrichment_status === "completed"
                          ? <span className="ec-pill ec-pill--good">Ready</span>
                          : <span className="ec-pill ec-pill--muted">—</span>}
                      </td>
                      <td className="num ec-col-wide">{relTime(l.scanned_at)}</td>
                      <td className="num ec-col-narrow"><TempPill t={l.lead_temperature} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : filtered ? (
          <div className="ec-empty">
            <SearchX aria-hidden />
            <p className="ec-empty-title">No leads match</p>
            <p className="ec-empty-text">Try a wider date range, or clear the filters to see the whole pool.</p>
            <button type="button" className="ec-btn ec-btn--sm"
              onClick={() => { setQ(""); go({ q: "", by: "", event: "", temp: "", range: "all" }); }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="ec-empty">
            <Contact aria-hidden />
            <p className="ec-empty-title">No team leads yet</p>
            <p className="ec-empty-text">
              Leads your team scans in the KaunTech app appear here within a minute of syncing. Leads people had
              before they joined stay private to them.
            </p>
          </div>
        )}

        {total > 0 ? (
          <nav className="ec-pager" aria-label="Pages">
            <span>{inr(from)}–{inr(to)} of {inr(total)}</span>
            <div className="ec-row">
              {filters.page > 1 ? (
                <Link className="ec-btn ec-btn--sm" href={`${pathname}${filtersToQuery({ ...filters, page: filters.page - 1 })}`} scroll={false}>
                  <ChevronLeft aria-hidden /> Previous
                </Link>
              ) : null}
              {filters.page < pages ? (
                <Link className="ec-btn ec-btn--sm" href={`${pathname}${filtersToQuery({ ...filters, page: filters.page + 1 })}`} scroll={false}>
                  Next <ChevronRight aria-hidden />
                </Link>
              ) : null}
            </div>
          </nav>
        ) : null}
      </section>

      {openId ? (
        <LeadDrawer id={openId} row={rows.find((r) => r.id === openId) ?? null} seats={seats} onClose={() => openLead(null)} />
      ) : null}
    </div>
  );
}
