"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Contact, Download, Loader2, Plus, Search,
  SearchX, Thermometer, Trash2, X,
} from "lucide-react";
import LeadDrawer from "./LeadDrawer";
import LeadEditor from "./LeadEditor";
import { createArBrowserClient } from "@/lib/ar/appAuthBrowser";
import { emptyDraft, patchFromDraft, writeError, type LeadDraft } from "@/lib/enterpriseLeadDraft";
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
 *
 * Writes (add, bulk temperature, bulk delete) go straight to Postgres as the
 * signed-in owner and then `router.refresh()`: the server component is the one
 * copy of the truth, so nothing here drifts from what the next reader sees.
 */

const TEMP_LABEL: Record<Temperature, string> = { hot: "Hot", warm: "Warm", cold: "Cold" };

/** A hand-picked export travels as ids in the URL; the route caps it the same. */
const EXPORT_PICK_CAP = 500;

export function TempPill({ t }: { t: Temperature | null }) {
  if (!t) return <span className="ec-pill ec-pill--muted">—</span>;
  return <span className={`ec-pill ec-pill--${t}`}>{TEMP_LABEL[t]}</span>;
}

type Toast = { kind: "ok" | "error"; text: string } | null;

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
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<"temp" | "delete" | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const byId = new Map(seats.map((s) => [s.user_id, s]));
  const firstRender = useRef(true);

  // Changing a filter returns to page 1; `next.page` overrides that, which is
  // how the pager moves. Either way the navigation runs inside a transition, so
  // the table dims in place instead of dropping to the route skeleton.
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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  function openLead(id: string | null) {
    setOpenId(id);
    // Deep-linkable without a server round trip: the drawer reads the row itself.
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("lead", id);
    else url.searchParams.delete("lead");
    window.history.replaceState(null, "", url.toString());
  }

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = !!(filters.q || filters.by || filters.event || filters.temp || filters.range !== "all");
  const from = total ? (filters.page - 1) * LEADS_PAGE_SIZE + 1 : 0;
  const to = Math.min(filters.page * LEADS_PAGE_SIZE, total);
  const pages = Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE));
  const pageIds = rows.map((r) => r.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => picked.has(id));
  const ids = [...picked];

  const exportHref = (format: "csv" | "vcf", only?: string[]) => {
    const p = new URLSearchParams(filtersToQuery({ ...filters, page: 1 }).replace(/^\?/, ""));
    p.set("format", format);
    if (only?.length) p.set("ids", only.join(","));
    return `/api/enterprise/admin/leads/export?${p.toString()}`;
  };

  /* ───────── writes ───────── */

  async function bulkTemperature(t: Temperature | null) {
    setBulkBusy("temp");
    const { data, error } = await createArBrowserClient()
      .from("contacts")
      .update({ lead_temperature: t })
      .in("id", ids)
      .select("id");
    setBulkBusy(null);
    if (error) { setToast({ kind: "error", text: writeError(error) }); return; }
    setPicked(new Set());
    setToast({ kind: "ok", text: `${inr(data?.length ?? 0)} ${data?.length === 1 ? "lead" : "leads"} marked ${t ? TEMP_LABEL[t].toLowerCase() : "unrated"}.` });
    router.refresh();
  }

  async function bulkDelete() {
    setBulkBusy("delete");
    const { data, error } = await createArBrowserClient()
      .from("contacts")
      .delete()
      .in("id", ids)
      .select("id");
    setBulkBusy(null);
    setConfirmBulk(false);
    if (error) { setToast({ kind: "error", text: writeError(error) }); return; }
    const gone = data?.length ?? 0;
    if (!gone) { setToast({ kind: "error", text: "Only the person who manages the plan can delete team leads." }); return; }
    if (openId && picked.has(openId)) openLead(null);
    setPicked(new Set());
    setToast({ kind: "ok", text: `${inr(gone)} ${gone === 1 ? "lead" : "leads"} deleted.` });
    router.refresh();
  }

  async function addLead(draft: LeadDraft) {
    const ownerId = seats.find((s) => s.role === "owner")?.user_id;
    if (!ownerId) return "Could not tell which account manages this plan. Sign in again.";
    const { error } = await createArBrowserClient().from("contacts").insert({
      id: crypto.randomUUID(),
      user_id: ownerId,          // Postgres pins this; a lead you type is yours.
      scanned_at: new Date().toISOString(),
      ...patchFromDraft(draft),
    });
    if (error) return writeError(error);
    setToast({ kind: "ok", text: "Lead added to the team's pool." });
    router.refresh();
    return null;
  }

  return (
    <div className="ec-page">
      <div className="ec-head">
        <div>
          <h1 className="ec-title">Leads</h1>
          <p className="ec-sub">Everything your team has scanned, with who scanned it.</p>
        </div>
        <div className="ec-head-actions">
          <button type="button" className="ec-btn ec-btn--primary" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> New lead
          </button>
          <a className="ec-btn" href={exportHref("csv")} aria-disabled={total === 0 || undefined}
            onClick={(e) => { if (total === 0) e.preventDefault(); }}>
            <Download aria-hidden /> Export CSV{filtered && total ? ` (${inr(total)})` : ""}
          </a>
          <a className="ec-btn ec-btn--ghost" href={exportHref("vcf")} aria-disabled={total === 0 || undefined}
            onClick={(e) => { if (total === 0) e.preventDefault(); }}>
            <Download aria-hidden /> vCards
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

        {picked.size ? (
          <div className="ec-bulkbar" role="region" aria-label="Selected leads">
            <strong>{inr(picked.size)} selected</strong>
            <div className="ec-seg" role="group" aria-label="Set temperature">
              <span className="ec-bulk-label" aria-hidden><Thermometer /></span>
              {TEMPERATURES.map((t) => (
                <button key={t} type="button" disabled={!!bulkBusy} onClick={() => bulkTemperature(t)}>{TEMP_LABEL[t]}</button>
              ))}
              <button type="button" disabled={!!bulkBusy} onClick={() => bulkTemperature(null)}>None</button>
            </div>
            {ids.length <= EXPORT_PICK_CAP ? (
              <>
                <a className="ec-btn ec-btn--ghost ec-btn--sm" href={exportHref("csv", ids)}><Download aria-hidden /> CSV</a>
                <a className="ec-btn ec-btn--ghost ec-btn--sm" href={exportHref("vcf", ids)}><Download aria-hidden /> vCards</a>
              </>
            ) : (
              <span className="ec-hint">Pick {inr(EXPORT_PICK_CAP)} or fewer to export a chosen set — or export the filtered view above.</span>
            )}
            <button type="button" className="ec-btn ec-btn--ghost ec-btn--sm ec-btn--danger" disabled={!!bulkBusy}
              onClick={() => setConfirmBulk(true)}>
              {bulkBusy === "delete" ? <Loader2 aria-hidden style={{ animation: "ec-spin 700ms linear infinite" }} /> : <Trash2 aria-hidden />} Delete
            </button>
            <button type="button" className="ec-btn ec-btn--ghost ec-btn--sm" style={{ marginLeft: "auto" }}
              onClick={() => setPicked(new Set())}>
              <X aria-hidden /> Clear selection
            </button>
          </div>
        ) : null}

        {rows.length ? (
          <div className={`ec-table-wrap${rows.length > 12 ? " ec-table-wrap--tall" : ""}`}
            style={{ opacity: pending ? 0.6 : 1, transition: "opacity 120ms" }}>
            <table className="ec-table">
              <thead>
                <tr>
                  <th className="ec-col-pick">
                    <input
                      type="checkbox"
                      className="ec-tick"
                      checked={allOnPage}
                      // Some of this page picked, not all: the box says so.
                      ref={(el) => { if (el) el.indeterminate = !allOnPage && pageIds.some((id) => picked.has(id)); }}
                      onChange={() => setPicked((prev) => {
                        const next = new Set(prev);
                        if (allOnPage) pageIds.forEach((id) => next.delete(id));
                        else pageIds.forEach((id) => next.add(id));
                        return next;
                      })}
                      aria-label={allOnPage ? "Clear this page" : "Select this page"}
                    />
                  </th>
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
                      className={`is-click${openId === l.id ? " is-selected" : ""}${picked.has(l.id) ? " is-picked" : ""}`}
                      tabIndex={0}
                      onClick={() => openLead(l.id)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLead(l.id); } }}
                      aria-label={`Open ${l.name || "lead"}`}
                    >
                      <td className="ec-col-pick" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="ec-tick"
                          checked={picked.has(l.id)}
                          onChange={() => toggle(l.id)}
                          aria-label={`Select ${l.name || "lead"}`}
                        />
                      </td>
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
            <button type="button" className="ec-btn ec-btn--sm" onClick={() => setAdding(true)}>
              <Plus aria-hidden /> Add one by hand
            </button>
          </div>
        )}

        {total > 0 ? (
          <nav className="ec-pager" aria-label="Pages">
            <span>{inr(from)}–{inr(to)} of {inr(total)}</span>
            <div className="ec-row">
              {filters.page > 1 ? (
                <button type="button" className="ec-btn ec-btn--sm" disabled={pending} onClick={() => go({ page: filters.page - 1 })}>
                  <ChevronLeft aria-hidden /> Previous
                </button>
              ) : null}
              {filters.page < pages ? (
                <button type="button" className="ec-btn ec-btn--sm" disabled={pending} onClick={() => go({ page: filters.page + 1 })}>
                  Next <ChevronRight aria-hidden />
                </button>
              ) : null}
            </div>
          </nav>
        ) : null}
      </section>

      {openId ? (
        <LeadDrawer
          id={openId}
          row={rows.find((r) => r.id === openId) ?? null}
          seats={seats}
          events={events}
          onClose={() => openLead(null)}
          onChanged={(what, message) => {
            setToast({ kind: "ok", text: message });
            if (what === "deleted") setPicked((prev) => { const n = new Set(prev); n.delete(openId); return n; });
            router.refresh();
          }}
        />
      ) : null}

      {adding ? (
        <NewLeadDialog events={events} onSubmit={addLead} onClose={() => setAdding(false)} />
      ) : null}

      {confirmBulk ? (
        <>
          <div className="ec-scrim" onClick={() => !bulkBusy && setConfirmBulk(false)} aria-hidden />
          <div className="ec-dialog-wrap" onClick={(e) => { if (e.target === e.currentTarget && !bulkBusy) setConfirmBulk(false); }}>
            <div className="ec-dialog" role="dialog" aria-modal="true" aria-labelledby="bulk-del-title">
              <div className="ec-dialog-head">
                <h2 id="bulk-del-title" className="ec-drawer-title">Delete {inr(picked.size)} leads?</h2>
              </div>
              <div className="ec-dialog-body">
                <p className="ec-sub" style={{ margin: 0 }}>
                  They leave the team's pool for everyone, including the phones they were scanned on, and their card
                  photos go with them. This cannot be undone.
                </p>
              </div>
              <div className="ec-dialog-foot">
                <button type="button" className="ec-btn ec-btn--ghost ec-btn--sm" onClick={() => setConfirmBulk(false)} disabled={!!bulkBusy}>
                  Keep them
                </button>
                <button type="button" className="ec-btn ec-btn--danger ec-btn--sm" onClick={bulkDelete} disabled={!!bulkBusy}>
                  {bulkBusy === "delete" ? <Loader2 aria-hidden style={{ animation: "ec-spin 700ms linear infinite" }} /> : <Trash2 aria-hidden />}
                  Delete {inr(picked.size)}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {toast ? (
        <div className={`ec-toast${toast.kind === "error" ? " ec-toast--error" : ""}`} role="status">
          {toast.kind === "error" ? <AlertCircle aria-hidden /> : <CheckCircle2 aria-hidden />} {toast.text}
        </div>
      ) : null}
    </div>
  );
}

/** A lead typed by hand: the same form the drawer edits with, on an empty row. */
function NewLeadDialog({
  events,
  onSubmit,
  onClose,
}: {
  events: string[];
  onSubmit: (draft: LeadDraft) => Promise<string | null>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<LeadDraft>(emptyDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  async function submit() {
    if (!draft.name.trim()) { setError("A lead needs a name."); return; }
    setBusy(true);
    const err = await onSubmit(draft);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  }

  return (
    <>
      <div className="ec-scrim" onClick={() => { if (!busy) onClose(); }} aria-hidden />
      <div className="ec-dialog-wrap" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
        <div className="ec-dialog ec-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="new-lead-title">
          <div className="ec-dialog-head">
            <h2 id="new-lead-title" className="ec-drawer-title">New lead</h2>
            <p className="ec-sub" style={{ marginTop: 4 }}>
              It joins the team's pool under your name, and reaches everyone's phone on the next sync.
            </p>
          </div>
          <div className="ec-dialog-body">
            {error ? <div className="ec-alert ec-alert--error"><AlertCircle aria-hidden /> {error}</div> : null}
            <LeadEditor draft={draft} onChange={setDraft} events={events} disabled={busy} />
          </div>
          <div className="ec-dialog-foot">
            <button type="button" className="ec-btn ec-btn--ghost ec-btn--sm" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="button" className="ec-btn ec-btn--primary ec-btn--sm" onClick={submit} disabled={busy}>
              {busy ? <Loader2 aria-hidden style={{ animation: "ec-spin 700ms linear infinite" }} /> : <Plus aria-hidden />}
              Add lead
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
