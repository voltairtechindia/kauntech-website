"use client";

import { TEMPERATURES, type Temperature } from "@/lib/enterpriseTypes";
import type { LeadDraft } from "@/lib/enterpriseLeadDraft";

/**
 * One lead as a form. The drawer edits an existing row with it and the New lead
 * dialog starts an empty one, so both write exactly the same set of fields.
 *
 * Not editable here, on purpose: who scanned the lead (Postgres pins that on an
 * org row), the AI Intel fields (the model owns them), and which custom fields
 * exist (the app owns the catalogue — their values are editable, their names
 * are not).
 */

const TEMP_LABEL: Record<Temperature, string> = { hot: "Hot", warm: "Warm", cold: "Cold" };

function Field({
  label,
  hint,
  children,
  wide,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className="ec-field" style={wide ? { gridColumn: "1 / -1" } : undefined}>
      <span className="ec-label">{label}</span>
      {children}
      {hint ? <span className="ec-hint">{hint}</span> : null}
    </label>
  );
}

export default function LeadEditor({
  draft,
  onChange,
  events,
  disabled,
}: {
  draft: LeadDraft;
  onChange: (next: LeadDraft) => void;
  /** Event names already in the pool, offered as suggestions. */
  events: string[];
  disabled?: boolean;
}) {
  const set = <K extends keyof LeadDraft>(k: K, v: LeadDraft[K]) => onChange({ ...draft, [k]: v });
  const customKeys = Object.keys(draft.custom);

  return (
    <div className="ec-form" aria-busy={disabled || undefined}>
      <section className="ec-form-grid">
        <Field label="Name">
          <input className="ec-input" value={draft.name} disabled={disabled}
            onChange={(e) => set("name", e.target.value)} placeholder="Full name" autoFocus />
        </Field>
        <Field label="Job title">
          <input className="ec-input" value={draft.title} disabled={disabled}
            onChange={(e) => set("title", e.target.value)} placeholder="Proprietor" />
        </Field>
        <Field label="Company" wide>
          <input className="ec-input" value={draft.company} disabled={disabled}
            onChange={(e) => set("company", e.target.value)} placeholder="Company name" />
        </Field>

        <Field label="Phone">
          <input className="ec-input" value={draft.phone} disabled={disabled} inputMode="tel"
            onChange={(e) => set("phone", e.target.value)} placeholder="+91…" />
        </Field>
        <Field label="Email">
          <input className="ec-input" value={draft.email} disabled={disabled} inputMode="email"
            onChange={(e) => set("email", e.target.value)} placeholder="name@company.com" />
        </Field>
        <Field label="Other phones" hint="One per line.">
          <textarea className="ec-input ec-textarea" rows={2} value={draft.extraPhones} disabled={disabled}
            onChange={(e) => set("extraPhones", e.target.value)} />
        </Field>
        <Field label="Other emails" hint="One per line.">
          <textarea className="ec-input ec-textarea" rows={2} value={draft.extraEmails} disabled={disabled}
            onChange={(e) => set("extraEmails", e.target.value)} />
        </Field>

        <Field label="Website">
          <input className="ec-input" value={draft.website} disabled={disabled}
            onChange={(e) => set("website", e.target.value)} placeholder="company.com" />
        </Field>
        <Field label="LinkedIn">
          <input className="ec-input" value={draft.linkedin} disabled={disabled}
            onChange={(e) => set("linkedin", e.target.value)} placeholder="linkedin.com/in/…" />
        </Field>
        <Field label="Address" wide>
          <input className="ec-input" value={draft.address} disabled={disabled}
            onChange={(e) => set("address", e.target.value)} placeholder="City, country" />
        </Field>
      </section>

      <section className="ec-form-grid">
        <Field label="Event">
          <input className="ec-input" value={draft.conference} disabled={disabled} list="ec-event-names"
            onChange={(e) => set("conference", e.target.value)} placeholder="Where you met" />
        </Field>
        <datalist id="ec-event-names">{events.map((e) => <option key={e} value={e} />)}</datalist>

        <Field label="Follow up" hint={draft.followUpNote ? `Now set to "${draft.followUpNote}". Pick a date to replace it.` : undefined}>
          <input className="ec-input" type="date" value={draft.followUpDate} disabled={disabled}
            onChange={(e) => set("followUpDate", e.target.value)} />
        </Field>

        <div className="ec-field" style={{ gridColumn: "1 / -1" }}>
          <span className="ec-label">Temperature</span>
          <div className="ec-seg" role="group" aria-label="Temperature">
            <button type="button" disabled={disabled} aria-pressed={!draft.temperature}
              onClick={() => set("temperature", "")}>None</button>
            {TEMPERATURES.map((t) => (
              <button key={t} type="button" disabled={disabled} aria-pressed={draft.temperature === t}
                onClick={() => set("temperature", t)}>{TEMP_LABEL[t]}</button>
            ))}
          </div>
        </div>

        <Field label="Tags" hint="Comma separated.">
          <input className="ec-input" value={draft.tags} disabled={disabled}
            onChange={(e) => set("tags", e.target.value)} placeholder="distributor, follow up" />
        </Field>
        <Field label="Products" hint="Comma separated.">
          <input className="ec-input" value={draft.products} disabled={disabled}
            onChange={(e) => set("products", e.target.value)} />
        </Field>
        <Field label="Assigned to" hint="Comma separated." wide>
          <input className="ec-input" value={draft.assigned} disabled={disabled}
            onChange={(e) => set("assigned", e.target.value)} />
        </Field>

        {customKeys.map((k) => (
          <Field key={k} label={k} wide>
            <input className="ec-input" value={draft.custom[k]} disabled={disabled}
              onChange={(e) => onChange({ ...draft, custom: { ...draft.custom, [k]: e.target.value } })} />
          </Field>
        ))}

        <Field label="Notes" wide>
          <textarea className="ec-input ec-textarea" rows={4} value={draft.notes} disabled={disabled}
            onChange={(e) => set("notes", e.target.value)} placeholder="What was said, what they need." />
        </Field>
      </section>
    </div>
  );
}
