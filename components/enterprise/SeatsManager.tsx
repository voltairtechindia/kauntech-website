"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createArBrowserClient } from "@/lib/ar/appAuthBrowser";
import {
  RESOURCES,
  RESOURCE_LABEL,
  type OrgView,
  type OrgSeat,
  type Resource,
} from "@/lib/enterpriseTypes";

/**
 * The seat console. Modelled on components/ar/CardsDashboard: per-row busy and
 * confirm state, one error line, and router.refresh() to re-read from the
 * server rather than keeping a second copy of the truth on the client.
 *
 * Allocation, freeze and absorb go straight to Postgres RPCs as the signed-in
 * owner. Only the three things GoTrue owns — creating a user, setting a
 * password, banning a login — go through our own API routes.
 */

function inr(n: number): string {
  return n.toLocaleString("en-IN");
}

type AllocDraft = Record<Resource, string>;

const APP_LINK = "https://www.kauntech.com/get";

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

function draftFrom(seat: OrgSeat): AllocDraft {
  return {
    tokens: String(seat.alloc?.tokens ?? 0),
    scans: String(seat.alloc?.scans ?? 0),
    intel: String(seat.alloc?.intel ?? 0),
    strategy: String(seat.alloc?.strategy ?? 0),
  };
}

export default function SeatsManager({
  initial,
  initialFree,
}: {
  initial: OrgView;
  initialFree: Record<Resource, number>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<AllocDraft | null>(null);
  const [confirmFreeze, setConfirmFreeze] = useState<string | null>(null);
  const [pwFor, setPwFor] = useState<string | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [confirmAbsorb, setConfirmAbsorb] = useState<string | null>(null);
  // What to send the person just added. Shown once, right after, because the
  // owner is the only one who can hand over the details.
  const [handoff, setHandoff] = useState<{ email: string; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Add-seat form
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [inviteInstead, setInviteInstead] = useState(false);

  const { org, seats } = initial;
  const free = initialFree;
  const activeSeats = seats.filter((s) => s.status === "active").length;
  const seatsLeft = org.seat_limit - seats.length;

  function done(message?: string) {
    setBusyId(null);
    setEditing(null);
    setDraft(null);
    setConfirmFreeze(null);
    setPwFor(null);
    setPwValue("");
    setConfirmAbsorb(null);
    if (message) setNotice(message);
    router.refresh();
  }

  async function rpc(fn: string, args: Record<string, unknown>): Promise<boolean> {
    setError(null);
    setNotice(null);
    const { data, error: err } = await createArBrowserClient().rpc(fn, args);
    if (err) {
      setError(err.message);
      setBusyId(null);
      return false;
    }
    const res = data as any;
    if (res && res.ok === false) {
      setError(reasonText(res));
      setBusyId(null);
      return false;
    }
    return true;
  }

  function reasonText(res: any): string {
    switch (res.reason) {
      case "pool_exceeded":
        return `That is more than your plan has left. Available now: ${RESOURCES
          .map((r) => `${inr(res.free?.[r] ?? 0)} ${RESOURCE_LABEL[r]}`)
          .join(", ")}.`;
      case "below_used":
        return `You cannot take back what this person has already used: ${RESOURCES
          .map((r) => `${inr(res.used?.[r] ?? 0)} ${RESOURCE_LABEL[r]}`)
          .join(", ")}.`;
      case "seat_limit_reached":
        return `Your plan covers ${res.seat_limit} people. Free a seat first, or talk to us about more.`;
      case "cannot_freeze_owner":
        return "You cannot freeze your own account.";
      case "already_in_another_org":
        return "That account already belongs to another company's KaunTech plan.";
      case "not_org_owner":
        return "Only the person who bought the plan can change seats.";
      default:
        return res.reason ? String(res.reason).replace(/_/g, " ") : "That did not work.";
    }
  }

  async function saveAlloc(seat: OrgSeat) {
    if (!draft) return;
    setBusyId(seat.user_id);
    const nums = Object.fromEntries(
      RESOURCES.map((r) => [r, Math.max(0, Math.round(Number(draft[r]) || 0))]),
    ) as Record<Resource, number>;
    const ok = await rpc("enterprise_allocate", {
      p_user: seat.user_id,
      p_tokens: nums.tokens,
      p_scans: nums.scans,
      p_intel: nums.intel,
      p_strategy: nums.strategy,
    });
    if (ok) done("Allowance updated.");
  }

  async function setStatus(seat: OrgSeat, status: "active" | "frozen") {
    setBusyId(seat.user_id);
    setError(null);
    setNotice(null);
    // One action, two halves: the database frees the seat and returns its
    // allowance to the pool, the route bans or unbans the login itself.
    const res = await fetch(`/api/enterprise/admin/seats/${seat.user_id}/freeze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.ok === false) {
      setError(body?.error ?? reasonText(body ?? {}));
      setBusyId(null);
      return;
    }
    done(status === "frozen" ? "Seat frozen. Their leads are untouched." : "Seat is active again.");
  }

  async function resetPassword(seat: OrgSeat) {
    const next = pwValue;
    if (next.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setBusyId(seat.user_id);
    setError(null);
    setNotice(null);
    const res = await fetch(`/api/enterprise/admin/seats/${seat.user_id}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: next }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.ok === false) {
      setError(body?.error ?? "Could not change that password.");
      setBusyId(null);
      return;
    }
    setHandoff({
      email: seat.email ?? "",
      text: welcomeText(org.name, seat.email ?? "", next, false),
    });
    setCopied(false);
    done("Password changed. Send them the new one below, we do not email it.");
  }

  async function absorb(seat: OrgSeat) {
    setBusyId(seat.user_id);
    const ok = await rpc("enterprise_absorb_member_leads", { p_user: seat.user_id });
    if (ok) done("Their earlier leads are in the company pool now.");
  }

  async function addSeat(e: React.FormEvent) {
    e.preventDefault();
    setBusyId("new");
    setError(null);
    setNotice(null);
    const res = await fetch("/api/enterprise/admin/seats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newEmail.trim(),
        full_name: newName.trim() || null,
        password: inviteInstead ? null : newPassword,
        invite: inviteInstead,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.ok === false) {
      setError(body?.error ?? reasonText(body ?? {}));
      setBusyId(null);
      return;
    }
    const addedEmail = newEmail.trim();
    setHandoff(
      inviteInstead && !body.existing
        ? null
        : { email: addedEmail, text: welcomeText(org.name, addedEmail, body.existing ? null : newPassword, !!body.existing) },
    );
    setCopied(false);
    setNewEmail("");
    setNewName("");
    setNewPassword("");
    setAdding(false);
    done(
      body.existing
        ? "That person already had a KaunTech account, so we added it to your plan. Leads they collected before today stay private to them."
        : inviteInstead
          ? "Invite sent. They pick their own password from the email."
          : "Seat created. Send them the message below.",
    );
  }

  async function copyHandoff() {
    if (!handoff) return;
    try {
      await navigator.clipboard.writeText(handoff.text);
      setCopied(true);
    } catch {
      setError("Could not reach the clipboard. Select the text and copy it instead.");
    }
  }

  return (
    <div className="ar-root">
      <header className="ar-header">
        <div className="ar-container ar-between">
          <span className="ar-brand">KaunTech · {org.name}</span>
          <button
            className="ar-btn ar-btn-ghost ar-btn-sm"
            onClick={async () => {
              await createArBrowserClient().auth.signOut();
              router.replace("/enterprise/admin-auth");
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="ar-container ar-stack">
        <div>
          <h1 className="ar-h1">Your team</h1>
          <p className="ar-muted">
            {seats.length} of {org.seat_limit} seats used
            {activeSeats !== seats.length ? ` · ${seats.length - activeSeats} frozen` : ""}
            {org.expires_at
              ? ` · plan runs to ${new Date(org.expires_at).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                })}`
              : ""}
          </p>
        </div>

        {/* What is left to hand out. This is the number that actually governs
            everything below, so it sits above the seats, not under them. */}
        <div className="ar-card">
          <h2 className="ar-h2">Left to share out</h2>
          <div className="ar-grid" style={{ marginTop: "var(--ar-sp-md)" }}>
            {RESOURCES.map((r) => (
              <div key={r} className="ar-subcard">
                <div className="ar-muted" style={{ fontSize: 12 }}>{RESOURCE_LABEL[r]}</div>
                <div style={{ fontSize: 22, fontWeight: 600 }}>{inr(free[r])}</div>
                <div className="ar-muted" style={{ fontSize: 12 }}>of {inr(org.pools[r])} a year</div>
              </div>
            ))}
          </div>
        </div>

        {/* Until anyone else is on the team, say how people get in. */}
        {seats.length <= 1 ? (
          <div className="ar-card ar-stack">
            <h2 className="ar-h2">How your team gets in</h2>
            <ol className="ar-muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, fontSize: 14 }}>
              <li>Add someone below with their work email, and either set their password or email them an invite.</li>
              <li>Send them the message we give you. It has the app link and how to sign in.</li>
              <li>They sign in to the KaunTech app and see the team&apos;s leads. Everyone starts with an equal share of the plan, which you can change here any time.</li>
            </ol>
          </div>
        ) : null}

        {error ? <p className="ar-error">{error}</p> : null}
        {notice ? <p className="ar-muted">{notice}</p> : null}

        {handoff ? (
          <div className="ar-card ar-stack" style={{ borderColor: "var(--ar-orange-border)" }}>
            <div className="ar-between">
              <h2 className="ar-h2" style={{ margin: 0 }}>Send this to {handoff.email}</h2>
              <button className="ar-btn ar-btn-ghost ar-btn-sm" onClick={() => setHandoff(null)}>Done</button>
            </div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, lineHeight: 1.6 }}>
              {handoff.text}
            </pre>
            <div className="ar-row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button className="ar-btn ar-btn-primary ar-btn-sm" onClick={copyHandoff}>
                {copied ? "Copied" : "Copy message"}
              </button>
              <a
                className="ar-btn ar-btn-ghost ar-btn-sm"
                href={`https://wa.me/?text=${encodeURIComponent(handoff.text)}`}
                target="_blank"
                rel="noreferrer"
              >
                Send on WhatsApp
              </a>
            </div>
          </div>
        ) : null}

        {/* Add a seat */}
        {adding ? (
          <form className="ar-card ar-stack" onSubmit={addSeat}>
            <h2 className="ar-h2">Add someone</h2>
            <div>
              <label className="ar-label" htmlFor="seat-email">Their work email</label>
              <input
                id="seat-email" className="ar-field" type="email" required
                value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@company.com"
              />
            </div>
            <div>
              <label className="ar-label" htmlFor="seat-name">Their name (optional)</label>
              <input
                id="seat-name" className="ar-field" type="text"
                value={newName} onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            <label className="ar-row" style={{ gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={inviteInstead}
                onChange={(e) => setInviteInstead(e.target.checked)}
              />
              <span className="ar-muted" style={{ fontSize: 13 }}>
                Email them an invite so they choose their own password
              </span>
            </label>

            {!inviteInstead ? (
              <div>
                <label className="ar-label" htmlFor="seat-pw">Password you are giving them</label>
                <input
                  id="seat-pw" className="ar-field" type="text" required minLength={8}
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
                <p className="ar-muted" style={{ fontSize: 12, marginTop: 6 }}>
                  We do not email this. Hand it over yourself, and they can change it in the app.
                </p>
              </div>
            ) : null}

            <div className="ar-row" style={{ gap: 8 }}>
              <button className="ar-btn ar-btn-primary" type="submit" disabled={busyId === "new" || seatsLeft <= 0}>
                {busyId === "new" ? "Adding…" : "Add seat"}
              </button>
              <button className="ar-btn ar-btn-ghost" type="button" onClick={() => setAdding(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            className="ar-btn ar-btn-primary"
            onClick={() => setAdding(true)}
            disabled={seatsLeft <= 0}
          >
            {seatsLeft > 0 ? `Add someone (${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} free)` : "All seats are taken"}
          </button>
        )}

        {/* Seats */}
        {seats.map((seat) => {
          const isEditing = editing === seat.user_id;
          const busy = busyId === seat.user_id;
          return (
            <div key={seat.user_id} className="ar-card ar-stack">
              <div className="ar-between">
                <div>
                  <strong>{seat.full_name || seat.email || "Unnamed"}</strong>
                  <div className="ar-muted" style={{ fontSize: 13 }}>{seat.email}</div>
                </div>
                <span className={`ar-badge ${seat.status === "frozen" ? "ar-badge-locked" : "ar-badge-published"}`}>
                  {seat.role === "owner" ? "You" : seat.status === "frozen" ? "Frozen" : "Active"}
                </span>
              </div>

              <div className="ar-grid">
                {RESOURCES.map((r) => (
                  <div key={r} className="ar-subcard">
                    <div className="ar-muted" style={{ fontSize: 12 }}>{RESOURCE_LABEL[r]}</div>
                    {isEditing ? (
                      <input
                        className="ar-field"
                        type="number"
                        min={0}
                        value={draft?.[r] ?? "0"}
                        onChange={(e) => setDraft((d) => (d ? { ...d, [r]: e.target.value } : d))}
                      />
                    ) : (
                      <>
                        <div style={{ fontSize: 18, fontWeight: 600 }}>
                          {inr(seat.used?.[r] ?? 0)} / {inr(seat.alloc?.[r] ?? 0)}
                        </div>
                        <div className="ar-muted" style={{ fontSize: 12 }}>used this year</div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="ar-row" style={{ gap: 8, flexWrap: "wrap" }}>
                {isEditing ? (
                  <>
                    <button className="ar-btn ar-btn-primary ar-btn-sm" disabled={busy} onClick={() => saveAlloc(seat)}>
                      {busy ? "Saving…" : "Save allowance"}
                    </button>
                    <button className="ar-btn ar-btn-ghost ar-btn-sm" onClick={() => { setEditing(null); setDraft(null); }}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    className="ar-btn ar-btn-ghost ar-btn-sm"
                    disabled={busy || seat.status === "frozen"}
                    onClick={() => { setEditing(seat.user_id); setDraft(draftFrom(seat)); }}
                  >
                    Change allowance
                  </button>
                )}

                {seat.role !== "owner" ? (
                  <>
                    <button
                      className="ar-btn ar-btn-ghost ar-btn-sm"
                      disabled={busy}
                      onClick={() => { setPwFor(pwFor === seat.user_id ? null : seat.user_id); setPwValue(""); }}
                    >
                      Set password
                    </button>

                    {seat.status === "frozen" ? (
                      <button className="ar-btn ar-btn-ghost ar-btn-sm" disabled={busy} onClick={() => setStatus(seat, "active")}>
                        Let them back in
                      </button>
                    ) : confirmFreeze === seat.user_id ? (
                      <button className="ar-btn ar-btn-sm" disabled={busy} onClick={() => setStatus(seat, "frozen")}
                        style={{ color: "var(--ar-danger)", borderColor: "var(--ar-danger)" }}>
                        {busy ? "Freezing…" : "Yes, freeze them"}
                      </button>
                    ) : (
                      <button className="ar-btn ar-btn-ghost ar-btn-sm" disabled={busy} onClick={() => setConfirmFreeze(seat.user_id)}>
                        Freeze
                      </button>
                    )}

                    {confirmAbsorb === seat.user_id ? null : (
                      <button className="ar-btn ar-btn-ghost ar-btn-sm" disabled={busy} onClick={() => setConfirmAbsorb(seat.user_id)}>
                        Move their old leads in
                      </button>
                    )}
                  </>
                ) : null}
              </div>

              {pwFor === seat.user_id ? (
                <form
                  className="ar-row"
                  style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}
                  onSubmit={(e) => { e.preventDefault(); resetPassword(seat); }}
                >
                  <div style={{ flex: "1 1 220px" }}>
                    <label className="ar-label" htmlFor={`pw-${seat.user_id}`}>
                      New password for {seat.email ?? seat.full_name ?? "this person"}
                    </label>
                    <input
                      id={`pw-${seat.user_id}`} className="ar-field" type="text" autoFocus minLength={8}
                      value={pwValue} onChange={(e) => setPwValue(e.target.value)} placeholder="At least 8 characters"
                    />
                  </div>
                  <button className="ar-btn ar-btn-primary ar-btn-sm" type="submit" disabled={busy || pwValue.length < 8}>
                    {busy ? "Saving…" : "Save password"}
                  </button>
                  <button className="ar-btn ar-btn-ghost ar-btn-sm" type="button" onClick={() => setPwFor(null)}>
                    Cancel
                  </button>
                </form>
              ) : null}

              {confirmAbsorb === seat.user_id ? (
                <div className="ar-subcard ar-stack">
                  <p style={{ margin: 0, fontSize: 14 }}>
                    Move every lead {seat.full_name ?? seat.email ?? "they"} scanned <strong>before joining</strong> into
                    the company pool? The whole team will see them, and this cannot be undone here.
                  </p>
                  <div className="ar-row" style={{ gap: 8 }}>
                    <button className="ar-btn ar-btn-primary ar-btn-sm" disabled={busy} onClick={() => absorb(seat)}>
                      {busy ? "Moving…" : "Yes, move them in"}
                    </button>
                    <button className="ar-btn ar-btn-ghost ar-btn-sm" onClick={() => setConfirmAbsorb(null)}>Cancel</button>
                  </div>
                </div>
              ) : null}

              {seat.role !== "owner" && seat.status !== "frozen" ? (
                <p className="ar-muted" style={{ fontSize: 12, margin: 0 }}>
                  Freezing blocks their login and returns their allowance to the pool. Their leads stay
                  in the company pool either way.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
