"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, Check, Copy, Download, Loader2, Mail, MessageCircle, Pencil, Trash2, X,
} from "lucide-react";
import { createArBrowserClient } from "@/lib/ar/appAuthBrowser";
import CardImage from "./CardImage";
import LeadEditor from "./LeadEditor";
import {
  asList,
  draftFromLead,
  patchFromDraft,
  sameDraft,
  writeError,
  type LeadDraft,
} from "@/lib/enterpriseLeadDraft";
import { exportFilename, textFor, vcardFor } from "@/lib/enterpriseLeadExport";
import { initials, relTime, seatName, type LeadRow, type OrgSeat, type Temperature } from "@/lib/enterpriseTypes";

/**
 * One lead, in full, and everything the console can do to it.
 *
 * The table only carries what it shows; the drawer reads the whole row as the
 * owner (RLS: their own rows or their org's) when it opens, so the list stays
 * light and nothing here is stale. Edits and the delete go straight to Postgres
 * as the owner too — the same policies the app obeys — and the app picks them
 * up on its next sync: an edit bumps updated_at, a delete writes a tombstone.
 *
 * What the console cannot do, and does not pretend to: send the WhatsApp, the
 * email or the Telegram message (those accounts are connected on the person's
 * phone, not here), run AI Intel or Strategy, or change who scanned a lead.
 */

type Full = Record<string, any>;

function fmtDate(iso: string | null | undefined, withTime = false): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

/** AI Strategy writes prose here ("In 5 days"), the console writes a date. */
function fmtFollowUp(v: string | null | undefined): string | null {
  if (!v) return null;
  return fmtDate(v) ?? v;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (children == null || children === "" || (Array.isArray(children) && !children.length)) return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function download(body: string, filename: string, type: string) {
  const href = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

export default function LeadDrawer({
  id,
  row,
  seats,
  events,
  onClose,
  onChanged,
}: {
  id: string;
  /** The table row, when opened from the table: the header shows at once. */
  row?: LeadRow | null;
  seats: OrgSeat[];
  events: string[];
  onClose: () => void;
  /** Saved or deleted: the page behind re-reads from the server. */
  onChanged: (what: "saved" | "deleted", message: string) => void;
}) {
  const [lead, setLead] = useState<Full | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<LeadDraft | null>(null);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [writeFail, setWriteFail] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let live = true;
    setLead(null);
    setError(null);
    setEditing(false);
    setWriteFail(null);
    setConfirmDelete(false);
    createArBrowserClient()
      .from("contacts")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (!live) return;
        // The raw database message means nothing to an owner; say what to do.
        if (err) setError("Could not load this lead. Check your connection and try again.");
        else if (!data) setError("This lead was deleted, or is no longer in your team's pool.");
        else setLead(data);
      });
    return () => { live = false; };
  }, [id]);

  // Focus lands on close so Escape and Tab start somewhere sensible; Escape
  // closes, unless a write is in flight or an unsaved edit would be lost.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (busy) return;
      if (confirmDelete) { setConfirmDelete(false); return; }
      if (editing) { setEditing(false); return; }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, editing, busy, confirmDelete]);

  const head: Full | null = lead ?? (row as Full | null | undefined) ?? null;
  const who = lead ? seats.find((s) => s.user_id === lead.user_id) : undefined;
  const phones = lead ? [lead.phone, ...asList(lead.extra_phones)].filter(Boolean) : [];
  const emails = lead ? [lead.email, ...asList(lead.extra_emails)].filter(Boolean) : [];
  const tags = lead ? asList(lead.tags) : [];
  const products = lead ? asList(lead.product_of_interest) : [];
  const assigned = lead ? asList(lead.assigned_to) : [];
  const custom: [string, string[]][] = lead && lead.custom_fields && typeof lead.custom_fields === "object"
    ? Object.entries(lead.custom_fields as Record<string, unknown>)
        .map(([k, v]) => [k, Array.isArray(v) ? asList(v) : typeof v === "string" && v ? [v] : []] as [string, string[]])
        .filter(([, v]) => v.length)
    : [];
  const photo = typeof lead?.avatar_url === "string" && lead.avatar_url.startsWith("http") ? lead.avatar_url : null;
  const temp = (head?.lead_temperature ?? null) as Temperature | null;
  const sent = lead
    ? ([
        ["WhatsApp", lead.sent_whatsapp_at],
        ["Email", lead.sent_email_at],
        ["Telegram", lead.sent_telegram_at],
        ["Sheets", lead.sent_sheets_at],
      ] as [string, string | null][]).filter(([, v]) => v)
    : [];
  const hasIntel = lead && (lead.industry || lead.company_size || lead.company_description || lead.lead_location || lead.lead_score != null);
  const original = useMemo(() => (lead ? draftFromLead(lead) : null), [lead]);
  const dirty = !!(draft && original && !sameDraft(draft, original));

  function startEdit() {
    if (!lead) return;
    setDraft(draftFromLead(lead));
    setWriteFail(null);
    setEditing(true);
  }

  async function save() {
    if (!draft || !lead) return;
    setBusy("save");
    setWriteFail(null);
    const { data, error: err } = await createArBrowserClient()
      .from("contacts")
      .update(patchFromDraft(draft, lead))
      .eq("id", id)
      .select("*")
      .maybeSingle();
    setBusy(null);
    if (err) { setWriteFail(writeError(err)); return; }
    // No row back means RLS refused the write rather than the database failing.
    if (!data) { setWriteFail("You can only change leads in your own team's pool."); return; }
    setLead(data);
    setEditing(false);
    onChanged("saved", "Lead saved.");
  }

  async function remove() {
    setBusy("delete");
    setWriteFail(null);
    const { data, error: err } = await createArBrowserClient()
      .from("contacts")
      .delete()
      .eq("id", id)
      .select("id");
    setBusy(null);
    if (err) { setWriteFail(writeError(err)); setConfirmDelete(false); return; }
    if (!data?.length) {
      setWriteFail("Only the person who manages the plan can delete a team lead.");
      setConfirmDelete(false);
      return;
    }
    onChanged("deleted", "Lead deleted.");
    onClose();
  }

  async function copyDetails() {
    if (!lead) return;
    try {
      await navigator.clipboard.writeText(textFor(lead, seatName(who)));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setWriteFail("Your browser would not let the page copy. Select the text instead.");
    }
  }

  return (
    <>
      <div className="ec-scrim" onClick={() => { if (!busy && !editing) onClose(); }} aria-hidden />
      <aside className="ec-drawer" role="dialog" aria-modal="true" aria-labelledby="lead-title">
        <div className="ec-drawer-head">
          {photo ? (
            <CardImage url={photo} name={String(head?.name ?? "")} size={48} />
          ) : (
            <span className="ec-avatar" style={{ width: 48, height: 48, fontSize: 15 }} aria-hidden>
              {initials(head?.name)}
            </span>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 id="lead-title" className="ec-drawer-title">
              {head ? head.name || "Unnamed lead" : error ? "Lead unavailable" : "Loading…"}
            </h2>
            {head ? (
              <p className="ec-sub" style={{ marginTop: 4 }}>
                {[head.title, head.company].filter(Boolean).join(" · ") || "No company on the card"}
              </p>
            ) : null}
            {temp && !editing ? <div style={{ marginTop: 8 }}><span className={`ec-pill ec-pill--${temp}`}>{temp[0].toUpperCase() + temp.slice(1)}</span></div> : null}
          </div>
          <button ref={closeRef} className="ec-btn ec-btn--ghost ec-btn--icon ec-btn--sm" onClick={onClose}
            disabled={!!busy} aria-label="Close">
            <X aria-hidden />
          </button>
        </div>

        {lead && !editing ? (
          <div className="ec-drawer-actions">
            <button type="button" className="ec-btn ec-btn--sm" onClick={startEdit}>
              <Pencil aria-hidden /> Edit
            </button>
            <button type="button" className="ec-btn ec-btn--ghost ec-btn--sm" onClick={copyDetails}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy"}
            </button>
            <button type="button" className="ec-btn ec-btn--ghost ec-btn--sm"
              onClick={() => download(vcardFor(lead, seatName(who)), exportFilename(lead.name || "lead", "vcf"), "text/vcard;charset=utf-8")}>
              <Download aria-hidden /> vCard
            </button>
            {/* The message itself is written in WhatsApp or the mail client: the
                templates, the signature and the send accounts live on the phone,
                so the console opens the conversation rather than pretending to
                send it — and never marks the lead as followed up. */}
            {phones.length ? (
              <a className="ec-btn ec-btn--ghost ec-btn--sm" target="_blank" rel="noreferrer"
                href={`https://wa.me/${String(phones[0]).replace(/[^\d+]/g, "")}`}>
                <MessageCircle aria-hidden /> WhatsApp
              </a>
            ) : null}
            {emails.length ? (
              <a className="ec-btn ec-btn--ghost ec-btn--sm" href={`mailto:${emails[0]}`}>
                <Mail aria-hidden /> Email
              </a>
            ) : null}
            <button type="button" className="ec-btn ec-btn--ghost ec-btn--sm ec-btn--danger" style={{ marginLeft: "auto" }}
              onClick={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden /> Delete
            </button>
          </div>
        ) : null}

        <div className="ec-drawer-body">
          {writeFail ? <div className="ec-alert ec-alert--error"><AlertCircle aria-hidden /> {writeFail}</div> : null}

          {error ? (
            <div className="ec-alert ec-alert--error"><AlertCircle aria-hidden /> {error}</div>
          ) : !lead ? (
            <div className="ec-row ec-muted"><Loader2 aria-hidden style={{ width: 16, animation: "ec-spin 700ms linear infinite" }} /> Loading the lead…</div>
          ) : editing && draft ? (
            <LeadEditor draft={draft} onChange={setDraft} events={events} disabled={busy === "save"} />
          ) : (
            <>
              <section>
                <h3 className="ec-section-title">Contact</h3>
                <dl className="ec-dl">
                  <Row label={phones.length > 1 ? "Phones" : "Phone"}>
                    {phones.length ? phones.map((p, i) => (
                      <div key={i}><a href={`tel:${String(p).replace(/[^\d+]/g, "")}`}>{p}</a></div>
                    )) : null}
                  </Row>
                  <Row label={emails.length > 1 ? "Emails" : "Email"}>
                    {emails.length ? emails.map((m, i) => <div key={i}><a href={`mailto:${m}`}>{m}</a></div>) : null}
                  </Row>
                  <Row label="Website">
                    {lead.website ? (
                      <a href={/^https?:\/\//i.test(lead.website) ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer">
                        {lead.website}
                      </a>
                    ) : null}
                  </Row>
                  <Row label="LinkedIn">
                    {lead.linkedin ? (
                      <a href={/^https?:\/\//i.test(lead.linkedin) ? lead.linkedin : `https://${lead.linkedin}`} target="_blank" rel="noreferrer">
                        {lead.linkedin.replace(/^https?:\/\/(www\.)?/i, "")}
                      </a>
                    ) : null}
                  </Row>
                  <Row label="Address">{lead.address || null}</Row>
                </dl>
                {!phones.length && !emails.length && !lead.website && !lead.linkedin && !lead.address ? (
                  <p className="ec-hint">No contact details on this card.</p>
                ) : null}
              </section>

              <section>
                <h3 className="ec-section-title">Scanned</h3>
                <dl className="ec-dl">
                  <Row label="By">{seatName(who)}</Row>
                  <Row label="When">{`${fmtDate(lead.scanned_at, true)} · ${relTime(lead.scanned_at)}`}</Row>
                  <Row label="Event">{lead.conference || null}</Row>
                  <Row label="Follow up">{fmtFollowUp(lead.follow_up_at)}</Row>
                </dl>
              </section>

              {lead.notes ? (
                <section>
                  <h3 className="ec-section-title">Notes</h3>
                  <p className="ec-prose">{lead.notes}</p>
                </section>
              ) : null}

              {tags.length || products.length || assigned.length || custom.length ? (
                <section>
                  <h3 className="ec-section-title">Tagged</h3>
                  <dl className="ec-dl">
                    <Row label="Tags">{tags.length ? <div className="ec-tags">{tags.map((t) => <span key={t} className="ec-pill">{t}</span>)}</div> : null}</Row>
                    <Row label="Products">{products.length ? <div className="ec-tags">{products.map((t) => <span key={t} className="ec-pill ec-pill--accent">{t}</span>)}</div> : null}</Row>
                    <Row label="Assigned to">{assigned.length ? assigned.join(", ") : null}</Row>
                    {custom.map(([k, v]) => <Row key={k} label={k}>{v.join(", ")}</Row>)}
                  </dl>
                </section>
              ) : null}

              {hasIntel ? (
                <section>
                  <h3 className="ec-section-title">AI Intel</h3>
                  <dl className="ec-dl">
                    <Row label="Industry">{lead.industry || null}</Row>
                    <Row label="Company size">{lead.company_size || null}</Row>
                    <Row label="Location">{lead.lead_location || null}</Row>
                    <Row label="Lead score">{lead.lead_score != null ? `${lead.lead_score} / 100` : null}</Row>
                  </dl>
                  {lead.company_description ? <p className="ec-prose" style={{ marginTop: 12 }}>{lead.company_description}</p> : null}
                </section>
              ) : null}

              {lead.strategy_status === "completed" ? (
                <div className="ec-alert ec-alert--info">
                  An AI Strategy exists for this lead. Open it in the KaunTech app for the full plan.
                </div>
              ) : null}

              {sent.length ? (
                <section>
                  <h3 className="ec-section-title">Followed up</h3>
                  <dl className="ec-dl">
                    {sent.map(([ch, at]) => <Row key={ch} label={ch}>{`${fmtDate(at, true)}`}</Row>)}
                  </dl>
                </section>
              ) : null}
            </>
          )}
        </div>

        {editing ? (
          <div className="ec-drawer-foot">
            <p className="ec-hint" style={{ marginRight: "auto" }}>
              {dirty ? "Saved changes reach the team's phones on their next sync." : "Nothing changed yet."}
            </p>
            <button type="button" className="ec-btn ec-btn--ghost ec-btn--sm" onClick={() => setEditing(false)} disabled={busy === "save"}>
              Cancel
            </button>
            <button type="button" className="ec-btn ec-btn--primary ec-btn--sm" onClick={save} disabled={busy === "save" || !dirty}
              data-state={busy === "save" ? "loading" : undefined}>
              {busy === "save" ? <Loader2 aria-hidden style={{ animation: "ec-spin 700ms linear infinite" }} /> : <Check aria-hidden />}
              Save changes
            </button>
          </div>
        ) : null}
      </aside>

      {confirmDelete ? (
        <>
          <div className="ec-scrim" onClick={() => !busy && setConfirmDelete(false)} aria-hidden />
          <div className="ec-dialog-wrap" onClick={(e) => { if (e.target === e.currentTarget && !busy) setConfirmDelete(false); }}>
            <div className="ec-dialog" role="dialog" aria-modal="true" aria-labelledby="del-title">
              <div className="ec-dialog-head">
                <h2 id="del-title" className="ec-drawer-title">Delete this lead?</h2>
              </div>
              <div className="ec-dialog-body">
                <p className="ec-sub" style={{ margin: 0 }}>
                  {lead?.name || "This lead"} leaves the team's pool for everyone, including the phone it was
                  scanned on. The card photo goes with it. This cannot be undone.
                </p>
              </div>
              <div className="ec-dialog-foot">
                <button type="button" className="ec-btn ec-btn--ghost ec-btn--sm" onClick={() => setConfirmDelete(false)} disabled={busy === "delete"}>
                  Keep it
                </button>
                <button type="button" className="ec-btn ec-btn--danger ec-btn--sm" onClick={remove} disabled={busy === "delete"}>
                  {busy === "delete" ? <Loader2 aria-hidden style={{ animation: "ec-spin 700ms linear infinite" }} /> : <Trash2 aria-hidden />}
                  Delete lead
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
