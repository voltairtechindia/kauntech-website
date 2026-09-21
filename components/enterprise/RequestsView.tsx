"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Inbox, Loader2, Send, Trash2 } from "lucide-react";
import { createArBrowserClient } from "@/lib/ar/appAuthBrowser";
import { writeError } from "@/lib/enterpriseLeadDraft";
import {
  COUNTED_KINDS,
  REQUEST_KINDS,
  REQUEST_KIND_LABEL,
  REQUEST_KIND_UNIT,
  REQUEST_STATUS_LABEL,
  inr,
  relTime,
  type OrgRequest,
  type RequestKind,
  type RequestStatus,
} from "@/lib/enterpriseTypes";
import { useRouter } from "next/navigation";

/**
 * Asking us for something, from inside the console.
 *
 * The owner files it here, we answer it in the admin panel, and the answer
 * comes back to this page — one thread per ask, rather than an email nobody
 * can find later. Writes go straight to Postgres as the owner; RLS pins the
 * row to their org and to them.
 */

const STATUS_CLASS: Record<RequestStatus, string> = {
  new: "ec-pill ec-pill--accent",
  seen: "ec-pill",
  planned: "ec-pill ec-pill--warm",
  done: "ec-pill ec-pill--good",
  declined: "ec-pill ec-pill--muted",
};

/** What the title box suggests, so an ask is never just "more". */
const TITLE_HINT: Record<RequestKind, string> = {
  seats: "Three more people joining in October",
  scans: "We run out of scans before the year does",
  intel: "More AI Intel for the sales team",
  strategy: "More AI Strategy runs",
  tokens: "Top up our K-Tokens",
  feature: "Sync our leads to HubSpot",
  other: "What you need, in a line",
};

type Toast = { kind: "ok" | "error"; text: string } | null;

export default function RequestsView({
  requests,
  ownerId,
  orgId,
  orgName,
}: {
  requests: OrgRequest[];
  ownerId: string;
  orgId: string;
  orgName: string;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<RequestKind>("seats");
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dropping, setDropping] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const counted = COUNTED_KINDS.includes(kind);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  async function send() {
    const clean = title.trim();
    if (!clean) { setError("Say what you need in the first line."); return; }
    const n = counted ? Math.floor(Number(amount)) : 0;
    if (counted && (!n || n < 1)) { setError(`How many ${REQUEST_KIND_UNIT[kind]} do you need?`); return; }

    setBusy(true);
    setError(null);
    const { error: err } = await createArBrowserClient().from("enterprise_requests").insert({
      org_id: orgId,
      user_id: ownerId,       // RLS checks this against the session; it cannot be spoofed.
      kind,
      amount: counted ? n : null,
      title: clean.slice(0, 160),
      message: message.trim() ? message.trim().slice(0, 4000) : null,
    });
    setBusy(false);
    if (err) { setError(writeError(err)); return; }

    setAmount("");
    setTitle("");
    setMessage("");
    setToast({ kind: "ok", text: "Sent. We'll come back to you on this." });
    router.refresh();
  }

  async function withdraw(id: number) {
    setDropping(id);
    const { data, error: err } = await createArBrowserClient()
      .from("enterprise_requests")
      .delete()
      .eq("id", id)
      .select("id");
    setDropping(null);
    if (err) { setToast({ kind: "error", text: writeError(err) }); return; }
    // The policy only allows a withdrawal while we have not looked at it yet.
    if (!data?.length) { setToast({ kind: "error", text: "We've already picked this one up, so it stays on the list." }); return; }
    setToast({ kind: "ok", text: "Request withdrawn." });
    router.refresh();
  }

  const open = requests.filter((r) => r.status !== "done" && r.status !== "declined").length;

  return (
    <div className="ec-page">
      <div className="ec-head">
        <div>
          <h1 className="ec-title">Requests</h1>
          <p className="ec-sub">
            Ask us for more of what {orgName} already has, or for something we don&apos;t ship yet.
            {open ? ` ${inr(open)} open right now.` : ""}
          </p>
        </div>
      </div>

      <section className="ec-panel" aria-labelledby="ask-h">
        <div className="ec-panel-head">
          <h2 id="ask-h" className="ec-panel-title">What do you need?</h2>
          <span className="ec-muted" style={{ fontSize: 13 }}>Goes straight to the KaunTech team</span>
        </div>
        <div className="ec-panel-body">
          {error ? <div className="ec-alert ec-alert--error" style={{ marginBottom: 16 }}><AlertCircle aria-hidden /> {error}</div> : null}

          <div className="ec-form-grid">
            <label className="ec-field">
              <span className="ec-label">Kind of request</span>
              <select className="ec-select" style={{ maxWidth: "none" }} value={kind} disabled={busy}
                onChange={(e) => { setKind(e.target.value as RequestKind); setError(null); }}>
                {REQUEST_KINDS.map((k) => <option key={k} value={k}>{REQUEST_KIND_LABEL[k]}</option>)}
              </select>
            </label>

            {counted ? (
              <label className="ec-field">
                <span className="ec-label">How many more</span>
                <input className="ec-input" type="number" min={1} step={1} inputMode="numeric" value={amount}
                  disabled={busy} onChange={(e) => setAmount(e.target.value)} placeholder={REQUEST_KIND_UNIT[kind]} />
                <span className="ec-hint">On top of what your plan already includes.</span>
              </label>
            ) : <div />}

            <label className="ec-field" style={{ gridColumn: "1 / -1" }}>
              <span className="ec-label">In one line</span>
              <input className="ec-input" value={title} maxLength={160} disabled={busy}
                onChange={(e) => setTitle(e.target.value)} placeholder={TITLE_HINT[kind]} />
            </label>

            <label className="ec-field" style={{ gridColumn: "1 / -1" }}>
              <span className="ec-label">Anything else we should know</span>
              <textarea className="ec-input ec-textarea" rows={4} value={message} maxLength={4000} disabled={busy}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How you'd use it, when you need it by, what you're doing today instead." />
            </label>
          </div>

          <div className="ec-row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
            <button type="button" className="ec-btn ec-btn--primary" onClick={send} disabled={busy}>
              {busy ? <Loader2 aria-hidden style={{ animation: "ec-spin 700ms linear infinite" }} /> : <Send aria-hidden />}
              Send request
            </button>
          </div>
        </div>
      </section>

      <section className="ec-panel" aria-labelledby="asked-h">
        <div className="ec-panel-head">
          <h2 id="asked-h" className="ec-panel-title">
            What you&apos;ve asked for
            {requests.length ? <span className="ec-count">{inr(requests.length)}</span> : null}
          </h2>
        </div>

        {requests.length ? (
          <ul className="ec-list">
            {requests.map((r) => (
              <li key={r.id} className="ec-req">
                <div className="ec-req-top">
                  <span className={STATUS_CLASS[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</span>
                  <span className="ec-pill">{REQUEST_KIND_LABEL[r.kind]}</span>
                  {r.amount ? <span className="ec-pill ec-pill--accent">+{inr(r.amount)} {REQUEST_KIND_UNIT[r.kind]}</span> : null}
                  <span className="ec-muted" style={{ marginLeft: "auto", fontSize: 12 }}>{relTime(r.created_at)}</span>
                </div>
                <p className="ec-req-title">{r.title}</p>
                {r.message ? <p className="ec-prose">{r.message}</p> : null}
                {r.admin_note ? (
                  <div className="ec-reply">
                    <span className="ec-reply-who">KaunTech</span>
                    <p className="ec-prose">{r.admin_note}</p>
                  </div>
                ) : null}
                {r.status === "new" ? (
                  <div className="ec-row" style={{ marginTop: 10 }}>
                    <button type="button" className="ec-btn ec-btn--ghost ec-btn--sm ec-btn--danger"
                      onClick={() => withdraw(r.id)} disabled={dropping === r.id}>
                      {dropping === r.id ? <Loader2 aria-hidden style={{ animation: "ec-spin 700ms linear infinite" }} /> : <Trash2 aria-hidden />}
                      Withdraw
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="ec-empty">
            <Inbox aria-hidden />
            <p className="ec-empty-title">Nothing asked for yet</p>
            <p className="ec-empty-text">
              Need more seats before an event, a bigger AI allowance, or an integration you can&apos;t do without?
              Ask above — it reaches us directly, and the answer shows up on this page.
            </p>
          </div>
        )}
      </section>

      {toast ? (
        <div className={`ec-toast${toast.kind === "error" ? " ec-toast--error" : ""}`} role="status">
          {toast.kind === "error" ? <AlertCircle aria-hidden /> : <CheckCircle2 aria-hidden />} {toast.text}
        </div>
      ) : null}
    </div>
  );
}
