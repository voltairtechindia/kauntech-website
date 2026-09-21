"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import { createArBrowserClient } from "@/lib/ar/appAuthBrowser";
import { initials, relTime, seatName, type LeadRow, type OrgSeat, type Temperature } from "@/lib/enterpriseTypes";

/**
 * One lead, in full. The table only carries what it shows; the drawer reads the
 * whole row as the owner (RLS: their own rows or their org's) when it opens, so
 * the list stays light and nothing here is stale.
 */

type Full = Record<string, any>;

const asList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()) : [];

function fmtDate(iso: string | null | undefined, withTime = false): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
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

export default function LeadDrawer({
  id,
  row,
  seats,
  onClose,
}: {
  id: string;
  /** The table row, when opened from the table: the header shows at once. */
  row?: LeadRow | null;
  seats: OrgSeat[];
  onClose: () => void;
}) {
  const [lead, setLead] = useState<Full | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let live = true;
    setLead(null);
    setError(null);
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

  // Focus lands on close so Escape and Tab start somewhere sensible; Escape closes.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  return (
    <>
      <div className="ec-scrim" onClick={onClose} aria-hidden />
      <aside className="ec-drawer" role="dialog" aria-modal="true" aria-labelledby="lead-title">
        <div className="ec-drawer-head">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" width={48} height={48}
              style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", flex: "none", border: "1px solid var(--ec-line)" }} />
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
            {temp ? <div style={{ marginTop: 8 }}><span className={`ec-pill ec-pill--${temp}`}>{temp[0].toUpperCase() + temp.slice(1)}</span></div> : null}
          </div>
          <button ref={closeRef} className="ec-btn ec-btn--ghost ec-btn--icon ec-btn--sm" onClick={onClose} aria-label="Close">
            <X aria-hidden />
          </button>
        </div>

        <div className="ec-drawer-body">
          {error ? (
            <div className="ec-alert ec-alert--error"><AlertCircle aria-hidden /> {error}</div>
          ) : !lead ? (
            <div className="ec-row ec-muted"><Loader2 aria-hidden style={{ width: 16, animation: "ec-spin 700ms linear infinite" }} /> Loading the lead…</div>
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
                  <Row label="Follow up">{fmtDate(lead.follow_up_at)}</Row>
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
      </aside>
    </>
  );
}
