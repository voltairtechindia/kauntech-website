import Link from "next/link";
import { ArrowRight, Contact, UserPlus } from "lucide-react";
import type { Overview } from "@/lib/enterpriseLeads";
import {
  filtersToQuery,
  initials,
  inr,
  relTime,
  seatName,
  type OrgSeat,
  type OrgView,
} from "@/lib/enterpriseTypes";

/**
 * The console's first page: what the team did, who did it, and where. Pure
 * presentation — the page fetches, this renders — so it has no client code and
 * no data access of its own.
 */

function Meter({ used, of }: { used: number; of: number }) {
  const pct = of > 0 ? Math.min(100, Math.round((used / of) * 100)) : 0;
  return (
    <div className="ec-meter" style={{ minWidth: 96 }}>
      <div className="ec-meter-top"><b>{inr(used)} / {inr(of)}</b></div>
      <div className="ec-meter-bar" aria-hidden>
        <div className={`ec-meter-fill${pct >= 100 ? " ec-meter-fill--full" : ""}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function OverviewView({ owner, ov }: { owner: OrgView; ov: Overview }) {
  const seats = owner.seats;
  const byId = new Map<string, OrgSeat>(seats.map((s) => [s.user_id, s]));
  const expires = owner.org.expires_at
    ? new Date(owner.org.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  // People sorted by what they did this month, then all time.
  const people = [...seats].sort((a, b) => {
    const pa = ov.byPerson[a.user_id], pb = ov.byPerson[b.user_id];
    return (pb?.last30 ?? 0) - (pa?.last30 ?? 0) || (pb?.total ?? 0) - (pa?.total ?? 0);
  });

  const onlyOwner = seats.length <= 1;

  return (
    <div className="ec-page">
      <div className="ec-head">
        <div>
          <h1 className="ec-title">Overview</h1>
          <p className="ec-sub">
            {seats.length} of {owner.org.seat_limit} seats in use{expires ? ` · plan runs to ${expires}` : ""}
          </p>
        </div>
        <div className="ec-head-actions">
          <Link href="/enterprise/admin/leads" className="ec-btn"><Contact aria-hidden /> All leads</Link>
          <Link href="/enterprise/admin/team?add=1" className="ec-btn ec-btn--primary"><UserPlus aria-hidden /> Add person</Link>
        </div>
      </div>

      {ov.truncated ? (
        <div className="ec-alert ec-alert--info">
          Counts below cover the latest 5,000 leads. The Leads page searches the whole pool.
        </div>
      ) : null}

      <section className="ec-stats" aria-label="Team totals">
        <div className="ec-stat">
          <span className="ec-stat-label">Leads, all time</span>
          <span className="ec-stat-value">{inr(ov.total)}</span>
          <span className="ec-stat-hint">in the shared pool</span>
        </div>
        <div className="ec-stat">
          <span className="ec-stat-label">Last 7 days</span>
          <span className="ec-stat-value">{inr(ov.last7)}</span>
          <span className="ec-stat-hint">{inr(ov.last30)} in 30 days</span>
        </div>
        <div className="ec-stat">
          <span className="ec-stat-label">Hot leads</span>
          <span className="ec-stat-value">{inr(ov.hot)}</span>
          <span className="ec-stat-hint">
            <Link className="ec-link" href={`/enterprise/admin/leads${filtersToQuery({ temp: "hot" })}`}>See them</Link>
          </span>
        </div>
        <div className="ec-stat">
          <span className="ec-stat-label">AI Intel run</span>
          <span className="ec-stat-value">{inr(ov.intel)}</span>
          <span className="ec-stat-hint">leads researched</span>
        </div>
      </section>

      <div className="ec-grid-2">
        {/* ── People ── */}
        <section className="ec-panel" aria-labelledby="people-h">
          <div className="ec-panel-head">
            <h2 id="people-h" className="ec-panel-title">Your team</h2>
            <Link href="/enterprise/admin/team" className="ec-link">Manage team</Link>
          </div>
          <div className="ec-table-wrap">
            <table className="ec-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th className="num">Leads · 30d</th>
                  <th className="num ec-col-wide">All time</th>
                  <th className="ec-col-wide">Last scan</th>
                  <th className="ec-col-wide">Scans used</th>
                </tr>
              </thead>
              <tbody>
                {people.map((s) => {
                  const act = ov.byPerson[s.user_id];
                  return (
                    <tr key={s.user_id}>
                      <td>
                        <Link
                          href={`/enterprise/admin/leads${filtersToQuery({ by: s.user_id })}`}
                          className="ec-who"
                          style={{ textDecoration: "none" }}
                        >
                          <span className={`ec-avatar ec-avatar--sm${s.role === "owner" ? " ec-avatar--accent" : ""}`} aria-hidden>
                            {initials(seatName(s))}
                          </span>
                          <span style={{ color: "var(--ec-ink)" }}>
                            {seatName(s)}
                            {s.role === "owner" ? <span className="ec-muted"> · you</span> : null}
                            {s.status === "frozen" ? <span className="ec-muted"> · frozen</span> : null}
                          </span>
                        </Link>
                      </td>
                      <td className="num">{inr(act?.last30 ?? 0)}</td>
                      <td className="num ec-col-wide">{inr(act?.total ?? 0)}</td>
                      <td className="ec-col-wide">{relTime(act?.lastScan)}</td>
                      <td className="ec-col-wide"><Meter used={s.used?.scans ?? 0} of={s.alloc?.scans ?? 0} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {onlyOwner ? (
            <div className="ec-panel-body" style={{ borderTop: "1px solid var(--ec-line)" }}>
              <p className="ec-hint">
                It is just you so far. <Link className="ec-link" href="/enterprise/admin/team?add=1">Add your first teammate</Link> and
                their scans will show up here.
              </p>
            </div>
          ) : null}
        </section>

        {/* ── Where the team scanned ── */}
        <section className="ec-panel" aria-labelledby="events-h">
          <div className="ec-panel-head">
            <h2 id="events-h" className="ec-panel-title">Where the team scanned</h2>
          </div>
          {ov.events.length ? (
            <ul className="ec-list">
              {ov.events.map((e) => (
                <li key={e.name}>
                  <Link className="ec-list-row" href={`/enterprise/admin/leads${filtersToQuery({ event: e.name })}`}>
                    <div className="ec-list-main">
                      <div className="ec-list-primary">{e.name}</div>
                      <div className="ec-list-secondary">Last scan {relTime(e.lastScan)}</div>
                    </div>
                    <div className="ec-list-aside">{inr(e.count)} {e.count === 1 ? "lead" : "leads"}</div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="ec-empty">
              <p className="ec-empty-title">No events yet</p>
              <p className="ec-empty-text">When your team picks an event in the app before scanning, the leads group here by event.</p>
            </div>
          )}
        </section>
      </div>

      {/* ── Recent ── */}
      <section className="ec-panel" aria-labelledby="recent-h">
        <div className="ec-panel-head">
          <h2 id="recent-h" className="ec-panel-title">Latest scans</h2>
          {ov.recent.length ? (
            <Link href="/enterprise/admin/leads" className="ec-link">
              All leads <ArrowRight aria-hidden style={{ width: 14, height: 14, verticalAlign: "-2px" }} />
            </Link>
          ) : null}
        </div>
        {ov.recent.length ? (
          <ul className="ec-list">
            {ov.recent.map((l) => {
              const who = byId.get(l.user_id);
              return (
                <li key={l.id}>
                  <Link className="ec-list-row" href={`/enterprise/admin/leads?lead=${l.id}`}>
                    <span className="ec-avatar" aria-hidden>{initials(l.name)}</span>
                    <div className="ec-list-main">
                      <div className="ec-list-primary">{l.name || "Unnamed lead"}</div>
                      <div className="ec-list-secondary">
                        {[l.title, l.company].filter(Boolean).join(" · ") || "No company on the card"}
                      </div>
                    </div>
                    <div className="ec-list-aside">
                      <div>{seatName(who)}</div>
                      <div>{relTime(l.scanned_at)}</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="ec-empty">
            <Contact aria-hidden />
            <p className="ec-empty-title">No team leads yet</p>
            <p className="ec-empty-text">
              Anything your team scans in the KaunTech app lands here, with who scanned it. Leads people had before
              they joined stay private to them.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
