"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, Check, CheckCircle2, ChevronDown, Copy, KeyRound, Loader2, MessageCircle,
  Snowflake, UserPlus, Users, X,
} from "lucide-react";
import { createArBrowserClient } from "@/lib/ar/appAuthBrowser";
import {
  RESOURCES,
  RESOURCE_LABEL,
  initials,
  inr,
  seatName,
  type OrgView,
  type OrgSeat,
  type Resource,
} from "@/lib/enterpriseTypes";

/**
 * Team: who is on the plan, what each person holds, and the controls for it.
 *
 * Allocation, freeze and absorb are Postgres RPCs called as the signed-in owner;
 * only the three things GoTrue owns — creating a user, setting a password,
 * banning a login — go through our own routes. After every change the page
 * re-reads from the server (router.refresh) instead of keeping a second copy.
 */

const APP_LINK = "https://www.kauntech.com/get";

// Column order for the per-resource cells: what people burn first, first.
const COLUMN_ORDER: Resource[] = ["scans", "intel", "strategy", "tokens"];

/** What the owner sends a new person. Plain text so it pastes into WhatsApp. */
function welcomeText(orgName: string, email: string, password: string | null, existing: boolean): string {
  return [
    `You're on the ${orgName} team on KaunTech.`,
    "",
    `1. Get the app: ${APP_LINK}`,
    existing
      ? `2. Sign in with ${email} and the password you already use.`
      : `2. Sign in with ${email}${password ? ` and this password: ${password}` : ""}`,
    "",
    "You'll see the team's leads, and anything you scan is shared with the team. You can change your password in the app.",
  ].join("\n");
}

function reasonText(res: any): string {
  switch (res?.reason) {
    case "pool_exceeded":
      return `That is more than your plan has left. Available: ${RESOURCES
        .map((r) => `${inr(res.free?.[r] ?? 0)} ${RESOURCE_LABEL[r]}`).join(", ")}.`;
    case "below_used":
      return `You cannot take back what this person has already used: ${RESOURCES
        .map((r) => `${inr(res.used?.[r] ?? 0)} ${RESOURCE_LABEL[r]}`).join(", ")}.`;
    case "seat_limit_reached":
      return `Your plan covers ${res.seat_limit} people. Free a seat first, or talk to us about more.`;
    case "cannot_freeze_owner":
      return "You cannot freeze your own account.";
    case "already_in_another_org":
      return "That account already belongs to another company's KaunTech plan.";
    case "not_org_owner":
      return "Only the person who manages the plan can change seats.";
    default:
      return res?.error ?? (res?.reason ? String(res.reason).replace(/_/g, " ") : "That did not work. Try again.");
  }
}

type Toast = { kind: "ok" | "error"; text: string } | null;
type AllocDraft = Record<Resource, string>;
type Handoff = { email: string; text: string; title: string };

function draftFrom(seat: OrgSeat): AllocDraft {
  return {
    tokens: String(seat.alloc?.tokens ?? 0),
    scans: String(seat.alloc?.scans ?? 0),
    intel: String(seat.alloc?.intel ?? 0),
    strategy: String(seat.alloc?.strategy ?? 0),
  };
}

function Used({ used, of }: { used: number; of: number }) {
  const pct = of > 0 ? Math.min(100, Math.round((used / of) * 100)) : 0;
  return (
    <div className="ec-meter" style={{ minWidth: 88 }}>
      <div className="ec-meter-top"><b>{inr(used)} / {inr(of)}</b></div>
      <div className="ec-meter-bar" aria-hidden>
        <div className={`ec-meter-fill${pct >= 100 ? " ec-meter-fill--full" : ""}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SeatsManager({
  initial,
  initialFree,
  openAdd,
}: {
  initial: OrgView;
  initialFree: Record<Resource, number>;
  openAdd: boolean;
}) {
  const router = useRouter();
  const { org, seats } = initial;
  const free = initialFree;
  const seatsLeft = org.seat_limit - seats.length;

  const [toast, setToast] = useState<Toast>(null);
  const [managing, setManaging] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<AllocDraft | null>(null);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState<"freeze" | "absorb" | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [adding, setAdding] = useState(openAdd && seatsLeft > 0);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  function openManage(seat: OrgSeat) {
    if (managing === seat.user_id) { setManaging(null); return; }
    setManaging(seat.user_id);
    setDraft(draftFrom(seat));
    setPw("");
    setConfirm(null);
    setRowError(null);
  }

  function finish(message: string) {
    setBusy(null);
    setConfirm(null);
    setPw("");
    setRowError(null);
    setToast({ kind: "ok", text: message });
    router.refresh();
  }

  async function rpc(fn: string, args: Record<string, unknown>): Promise<boolean> {
    const { data, error } = await createArBrowserClient().rpc(fn, args);
    if (error) { setRowError(error.message); setBusy(null); return false; }
    if ((data as any)?.ok === false) { setRowError(reasonText(data)); setBusy(null); return false; }
    return true;
  }

  async function post(url: string, body: unknown): Promise<any | null> {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) { setRowError(reasonText(json)); setBusy(null); return null; }
    return json;
  }

  async function saveAlloc(seat: OrgSeat) {
    if (!draft) return;
    setBusy("alloc");
    const n = Object.fromEntries(RESOURCES.map((r) => [r, Math.max(0, Math.round(Number(draft[r]) || 0))])) as Record<Resource, number>;
    if (await rpc("enterprise_allocate", {
      p_user: seat.user_id, p_tokens: n.tokens, p_scans: n.scans, p_intel: n.intel, p_strategy: n.strategy,
    })) finish(`Saved ${seatName(seat)}'s allowance.`);
  }

  async function setPassword(seat: OrgSeat) {
    if (pw.length < 8) { setRowError("Use at least 8 characters."); return; }
    setBusy("pw");
    const pwUsed = pw;
    if (await post(`/api/enterprise/admin/seats/${seat.user_id}/password`, { password: pwUsed })) {
      setHandoff({ email: seat.email ?? "", text: welcomeText(org.name, seat.email ?? "", pwUsed, false), title: "Send the new password" });
      finish(`Password changed for ${seatName(seat)}.`);
    }
  }

  async function setStatus(seat: OrgSeat, status: "active" | "frozen") {
    setBusy("status");
    if (await post(`/api/enterprise/admin/seats/${seat.user_id}/freeze`, { status })) {
      finish(status === "frozen" ? `${seatName(seat)} is frozen. Their leads stay in the pool.` : `${seatName(seat)} can sign in again.`);
    }
  }

  async function absorb(seat: OrgSeat) {
    setBusy("absorb");
    if (await rpc("enterprise_absorb_member_leads", { p_user: seat.user_id })) {
      finish(`${seatName(seat)}'s earlier leads are in the team pool.`);
    }
  }

  const handed = RESOURCES.reduce(
    (acc, r) => ({ ...acc, [r]: org.pools[r] - free[r] }),
    {} as Record<Resource, number>,
  );

  return (
    <div className="ec-page">
      <div className="ec-head">
        <div>
          <h1 className="ec-title">Team</h1>
          <p className="ec-sub">
            {seats.length} of {org.seat_limit} seats in use. New people start with an equal share of each allowance.
          </p>
        </div>
        <div className="ec-head-actions">
          <button className="ec-btn ec-btn--primary" onClick={() => setAdding(true)} disabled={seatsLeft <= 0}>
            <UserPlus aria-hidden /> {seatsLeft > 0 ? "Add person" : "All seats taken"}
          </button>
        </div>
      </div>

      {/* ── Allowance ── */}
      <section className="ec-panel" aria-labelledby="pool-h">
        <div className="ec-panel-head">
          <h2 id="pool-h" className="ec-panel-title">Yearly allowance</h2>
          <span className="ec-muted" style={{ fontSize: 13 }}>Handed out / bought</span>
        </div>
        <div className="ec-panel-body">
          <div className="ec-pools">
            {COLUMN_ORDER.map((r) => {
              const pct = org.pools[r] > 0 ? Math.min(100, Math.round((handed[r] / org.pools[r]) * 100)) : 0;
              return (
                <div key={r} className="ec-meter">
                  <div className="ec-meter-top">
                    <span>{RESOURCE_LABEL[r]}</span>
                    <b>{inr(handed[r])} / {inr(org.pools[r])}</b>
                  </div>
                  <div className="ec-meter-bar" aria-hidden><div className="ec-meter-fill" style={{ width: `${pct}%` }} /></div>
                  <span className="ec-hint">{inr(free[r])} left to share</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {handoff ? <HandoffCard handoff={handoff} onDone={() => setHandoff(null)} /> : null}

      {/* ── People ── */}
      <section className="ec-panel" aria-labelledby="people-h">
        <div className="ec-panel-head">
          <h2 id="people-h" className="ec-panel-title">People</h2>
        </div>
        <div className="ec-table-wrap">
          <table className="ec-table">
            <thead>
              <tr>
                <th>Person</th>
                <th className="ec-col-wide">Status</th>
                {COLUMN_ORDER.map((r) => <th key={r} className="ec-col-wide">{RESOURCE_LABEL[r]}</th>)}
                <th><span className="ec-sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {seats.map((s) => {
                const open = managing === s.user_id;
                const isOwner = s.role === "owner";
                return (
                  <Fragment key={s.user_id}>
                    <tr>
                      <td>
                        <div className="ec-cell-lead">
                          <span className={`ec-avatar${isOwner ? " ec-avatar--accent" : ""}`} aria-hidden>{initials(seatName(s))}</span>
                          <div>
                            <div className="ec-cell-name">{seatName(s)}{isOwner ? <span className="ec-muted"> · you</span> : null}</div>
                            <div className="ec-cell-sub">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="ec-col-wide">
                        {s.status === "frozen"
                          ? <span className="ec-pill"><Snowflake aria-hidden style={{ width: 12, height: 12 }} /> Frozen</span>
                          : isOwner ? <span className="ec-pill ec-pill--accent">Manager</span>
                          : <span className="ec-pill ec-pill--good">Active</span>}
                      </td>
                      {COLUMN_ORDER.map((r) => (
                        <td key={r} className="ec-col-wide"><Used used={s.used?.[r] ?? 0} of={s.alloc?.[r] ?? 0} /></td>
                      ))}
                      <td className="num">
                        <button className="ec-btn ec-btn--sm" onClick={() => openManage(s)} aria-expanded={open}>
                          Manage
                          <ChevronDown aria-hidden style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 160ms" }} />
                        </button>
                      </td>
                    </tr>

                    {open ? (
                      <tr className="ec-manage">
                        <td colSpan={2 + COLUMN_ORDER.length + 1}>
                          <div className="ec-manage-grid">
                            {/* Allowance */}
                            <div style={{ display: "grid", gap: 12 }}>
                              <div>
                                <div className="ec-label">Allowance for the year</div>
                                <p className="ec-hint">
                                  Left to share: {COLUMN_ORDER.map((r) => `${inr(free[r])} ${RESOURCE_LABEL[r]}`).join(" · ")}
                                </p>
                              </div>
                              <div className="ec-alloc-grid">
                                {COLUMN_ORDER.map((r) => (
                                  <label key={r} className="ec-field">
                                    <span className="ec-hint">{RESOURCE_LABEL[r]}</span>
                                    <input className="ec-input" type="number" min={s.used?.[r] ?? 0} inputMode="numeric"
                                      value={draft?.[r] ?? "0"}
                                      disabled={s.status === "frozen"}
                                      onChange={(e) => setDraft((d) => (d ? { ...d, [r]: e.target.value } : d))} />
                                    <span className="ec-hint">{inr(s.used?.[r] ?? 0)} used</span>
                                  </label>
                                ))}
                              </div>
                              <div className="ec-row">
                                <button className="ec-btn ec-btn--primary ec-btn--sm" onClick={() => saveAlloc(s)}
                                  disabled={busy !== null || s.status === "frozen"} data-state={busy === "alloc" ? "loading" : undefined}>
                                  {busy === "alloc" ? <Loader2 aria-hidden /> : <Check aria-hidden />} Save allowance
                                </button>
                                {s.status === "frozen" ? <span className="ec-hint">Let them back in to give them an allowance.</span> : null}
                              </div>
                            </div>

                            {/* Access */}
                            {!isOwner ? (
                              <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
                                <form style={{ display: "grid", gap: 8 }} onSubmit={(e) => { e.preventDefault(); setPassword(s); }}>
                                  <label className="ec-field">
                                    <span className="ec-label">Set a new password</span>
                                    <input className="ec-input" type="text" autoComplete="off" value={pw} minLength={8}
                                      onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" />
                                  </label>
                                  <div className="ec-row">
                                    <button className="ec-btn ec-btn--sm" type="submit" disabled={busy !== null || pw.length < 8}
                                      data-state={busy === "pw" ? "loading" : undefined}>
                                      {busy === "pw" ? <Loader2 aria-hidden /> : <KeyRound aria-hidden />} Set password
                                    </button>
                                  </div>
                                </form>

                                <div style={{ display: "grid", gap: 8 }}>
                                  <span className="ec-label">Access</span>
                                  {confirm === "freeze" ? (
                                    <div className="ec-alert ec-alert--warn" style={{ display: "grid", gap: 10 }}>
                                      <span>Block {seatName(s)}&apos;s login and return their allowance to the pool? Their leads stay.</span>
                                      <div className="ec-row">
                                        <button className="ec-btn ec-btn--danger ec-btn--sm" onClick={() => setStatus(s, "frozen")} disabled={busy !== null}
                                          data-state={busy === "status" ? "loading" : undefined}>
                                          {busy === "status" ? <Loader2 aria-hidden /> : <Snowflake aria-hidden />} Freeze
                                        </button>
                                        <button className="ec-btn ec-btn--ghost ec-btn--sm" onClick={() => setConfirm(null)}>Cancel</button>
                                      </div>
                                    </div>
                                  ) : confirm === "absorb" ? (
                                    <div className="ec-alert ec-alert--info" style={{ display: "grid", gap: 10 }}>
                                      <span>
                                        Move every lead {seatName(s)} scanned before joining into the team pool? Everyone will
                                        see them, and this cannot be undone here.
                                      </span>
                                      <div className="ec-row">
                                        <button className="ec-btn ec-btn--primary ec-btn--sm" onClick={() => absorb(s)} disabled={busy !== null}
                                          data-state={busy === "absorb" ? "loading" : undefined}>
                                          {busy === "absorb" ? <Loader2 aria-hidden /> : <Users aria-hidden />} Move them in
                                        </button>
                                        <button className="ec-btn ec-btn--ghost ec-btn--sm" onClick={() => setConfirm(null)}>Cancel</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="ec-row">
                                      {s.status === "frozen" ? (
                                        <button className="ec-btn ec-btn--sm" onClick={() => setStatus(s, "active")} disabled={busy !== null}
                                          data-state={busy === "status" ? "loading" : undefined}>
                                          {busy === "status" ? <Loader2 aria-hidden /> : <Check aria-hidden />} Let them back in
                                        </button>
                                      ) : (
                                        <button className="ec-btn ec-btn--danger ec-btn--sm" onClick={() => setConfirm("freeze")} disabled={busy !== null}>
                                          <Snowflake aria-hidden /> Freeze
                                        </button>
                                      )}
                                      <button className="ec-btn ec-btn--ghost ec-btn--sm" onClick={() => setConfirm("absorb")} disabled={busy !== null}>
                                        Move their old leads in
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="ec-hint" style={{ alignSelf: "start" }}>
                                This is you. Give yourself an allowance like anyone else on the team.
                              </p>
                            )}
                          </div>
                          {rowError ? (
                            <div className="ec-alert ec-alert--error" style={{ marginTop: 12 }} role="alert">
                              <AlertCircle aria-hidden /> {rowError}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {adding ? (
        <AddPersonDialog
          orgName={org.name}
          seatsLeft={seatsLeft}
          onClose={() => {
            setAdding(false);
            if (openAdd) window.history.replaceState(null, "", "/enterprise/admin/team");
          }}
          onAdded={(msg) => { setToast({ kind: "ok", text: msg }); router.refresh(); }}
        />
      ) : null}

      {toast ? (
        <div className={`ec-toast${toast.kind === "error" ? " ec-toast--error" : ""}`} role="status">
          {toast.kind === "ok" ? <CheckCircle2 aria-hidden /> : <AlertCircle aria-hidden />}
          <span>{toast.text}</span>
        </div>
      ) : null}
    </div>
  );
}

/* ─────────────────────────── handoff card ─────────────────────────── */

function HandoffCard({ handoff, onDone }: { handoff: Handoff; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="ec-panel" style={{ borderColor: "var(--ec-accent-line)" }} aria-labelledby="handoff-h">
      <div className="ec-panel-head">
        <h2 id="handoff-h" className="ec-panel-title">{handoff.title} to {handoff.email}</h2>
        <button className="ec-btn ec-btn--ghost ec-btn--icon ec-btn--sm" onClick={onDone} aria-label="Dismiss"><X aria-hidden /></button>
      </div>
      <div className="ec-panel-body" style={{ display: "grid", gap: 12 }}>
        <pre className="ec-message">{handoff.text}</pre>
        <div className="ec-row">
          <button className="ec-btn ec-btn--primary ec-btn--sm"
            onClick={async () => { try { await navigator.clipboard.writeText(handoff.text); setCopied(true); } catch { /* text is selectable above */ } }}>
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy message"}
          </button>
          <a className="ec-btn ec-btn--sm" href={`https://wa.me/?text=${encodeURIComponent(handoff.text)}`} target="_blank" rel="noreferrer">
            <MessageCircle aria-hidden /> Send on WhatsApp
          </a>
          <span className="ec-hint">We do not email passwords. You hand this over.</span>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── add person ─────────────────────────── */

function AddPersonDialog({
  orgName,
  seatsLeft,
  onClose,
  onAdded,
}: {
  orgName: string;
  seatsLeft: number;
  onClose: () => void;
  onAdded: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ text: string | null; note: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!invite && password.length < 8) { setError("Use at least 8 characters for the password."); return; }
    setBusy(true);
    const res = await fetch("/api/enterprise/admin/seats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), full_name: name.trim() || null, password: invite ? null : password, invite }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || json?.ok === false) { setError(reasonText(json)); return; }

    const who = email.trim();
    if (json.existing) {
      setDone({ text: welcomeText(orgName, who, null, true), note: "They already had a KaunTech account, so it joined your team. Leads they had before stay private to them." });
    } else if (invite) {
      setDone({ text: null, note: `Invite sent to ${who}. They choose their own password from the email, then sign in to the app.` });
    } else {
      setDone({ text: welcomeText(orgName, who, password, false), note: "Seat created with an equal share of your allowance." });
    }
    onAdded(`${who} is on the team.`);
  }

  return (
    <>
      <div className="ec-scrim" onClick={() => !busy && onClose()} aria-hidden />
      <div className="ec-dialog-wrap" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
        <div className="ec-dialog" role="dialog" aria-modal="true" aria-labelledby="add-h">
          {done ? (
            <>
              <div className="ec-dialog-head">
                <h2 id="add-h" className="ec-drawer-title">{done.text ? "Send them this" : "Invite sent"}</h2>
                <p className="ec-sub">{done.note}</p>
              </div>
              <div className="ec-dialog-body">
                {done.text ? <pre className="ec-message">{done.text}</pre> : null}
              </div>
              <div className="ec-dialog-foot">
                {done.text ? (
                  <>
                    <a className="ec-btn" href={`https://wa.me/?text=${encodeURIComponent(done.text)}`} target="_blank" rel="noreferrer">
                      <MessageCircle aria-hidden /> WhatsApp
                    </a>
                    <button className="ec-btn"
                      onClick={async () => { try { await navigator.clipboard.writeText(done.text!); setCopied(true); } catch { /* selectable */ } }}>
                      {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy"}
                    </button>
                  </>
                ) : null}
                <button className="ec-btn ec-btn--primary" onClick={onClose}>Done</button>
              </div>
            </>
          ) : (
            <form onSubmit={submit}>
              <div className="ec-dialog-head">
                <h2 id="add-h" className="ec-drawer-title">Add a person</h2>
                <p className="ec-sub">{seatsLeft} {seatsLeft === 1 ? "seat" : "seats"} left on your plan.</p>
              </div>
              <div className="ec-dialog-body">
                <label className="ec-field">
                  <span className="ec-label">Work email</span>
                  <input ref={firstRef} className="ec-input" type="email" required autoComplete="off"
                    value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
                </label>
                <label className="ec-field">
                  <span className="ec-label">Name <span className="ec-muted" style={{ fontWeight: 400 }}>(optional)</span></span>
                  <input className="ec-input" type="text" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="ec-check">
                  <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)} />
                  <span>Email them an invite so they pick their own password</span>
                </label>
                {!invite ? (
                  <label className="ec-field">
                    <span className="ec-label">Password you are giving them</span>
                    <input className="ec-input" type="text" autoComplete="off" minLength={8}
                      value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                    <span className="ec-hint">They can change it in the app. If they already have a KaunTech account, their own password keeps working.</span>
                  </label>
                ) : null}
                {error ? <div className="ec-alert ec-alert--error" role="alert"><AlertCircle aria-hidden /> {error}</div> : null}
              </div>
              <div className="ec-dialog-foot">
                <button type="button" className="ec-btn ec-btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
                <button type="submit" className="ec-btn ec-btn--primary" disabled={busy || !email.trim()}
                  data-state={busy ? "loading" : undefined}>
                  {busy ? <Loader2 aria-hidden /> : <UserPlus aria-hidden />} {busy ? "Adding…" : "Add to team"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
