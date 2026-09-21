"use client";

import { useState } from "react";

import { INTEL, SCANS, SEATS, STRATEGY } from "@/lib/enterprise";

/**
 * Phone-first Enterprise quote form.
 *
 * Sized to the device rather than to a desktop column: `100svh` (not `vh`) so
 * mobile Safari's collapsing address bar can't push the submit button under
 * the fold, `max-width: 100%` everywhere so nothing forces a horizontal
 * scroll, and 16px inputs because anything smaller makes iOS zoom on focus and
 * leaves the user stranded at 1.4× with the rest of the form off-screen.
 *
 * No price is shown. Enterprise is quoted by a person against the seats and
 * volume captured here, and putting a number on the page would set an
 * expectation sales then has to argue with.
 *
 * The volumes are typed, not dragged. A slider can only offer the numbers it
 * was built to reach, and Enterprise teams routinely need more — so the four
 * figures sit in a box of their own above the contact details, where seats and
 * scans are required and the two AI allowances are not.
 *
 * Validation is per field and visible. The submit button is NEVER disabled for
 * a validation reason: a dead button tells the user nothing about which box is
 * wrong, and on a phone the offending field is usually scrolled off-screen.
 * Pressing it instead reveals every message at once and scrolls to the first
 * bad field. The rules here mirror `app/api/enterprise/route.ts` exactly, so a
 * form that passes locally cannot be rejected by the server for shape.
 */

type Status = "idle" | "sending" | "sent" | "error";

type Field =
  | "seats"
  | "scans"
  | "intel"
  | "strategy"
  | "name"
  | "work_email"
  | "company"
  | "phone"
  | "message";

/** Order matters: it is the order the page scrolls to the first bad field in. */
const FIELD_ORDER: Field[] = [
  "seats",
  "scans",
  "intel",
  "strategy",
  "name",
  "work_email",
  "company",
  "phone",
  "message",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Digits only. Keeps the field numeric without `type=number`'s spinner, its
 *  scroll-wheel edits, or its habit of silently clearing on a stray letter. */
function digits(v: string): string {
  return v.replace(/[^0-9]/g, "").slice(0, 7);
}

function inr(n: number): string {
  return n.toLocaleString("en-IN");
}

interface Values {
  seats: string;
  scans: string;
  /** Ticked means "no cap" — the scans box is then not an answer we need. */
  unlimitedScans: boolean;
  intel: string;
  strategy: string;
  name: string;
  work_email: string;
  company: string;
  phone: string;
  message: string;
}

/** One rule per field, same bounds the API enforces. */
function validate(v: Values): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};

  const seats = Number(v.seats);
  if (!v.seats) e.seats = "Enter how many users you need.";
  else if (seats < SEATS.min) e.seats = `Enterprise starts at ${SEATS.min} users.`;
  else if (seats > SEATS.max) e.seats = `Enter ${inr(SEATS.max)} or fewer.`;

  const scans = Number(v.scans);
  if (v.unlimitedScans) {
    // Nothing to validate: the tick box is the answer.
  } else if (!v.scans) e.scans = "Enter scans per user, per year.";
  else if (scans < SCANS.min) e.scans = "Must be at least 1.";
  else if (scans > SCANS.max) e.scans = `Enter ${inr(SCANS.max)} or fewer.`;

  // Both AI allowances are optional; only a value that is present is checked.
  if (v.intel && Number(v.intel) > INTEL.max) e.intel = `Enter ${inr(INTEL.max)} or fewer.`;
  if (v.strategy && Number(v.strategy) > STRATEGY.max)
    e.strategy = `Enter ${inr(STRATEGY.max)} or fewer.`;

  if (!v.name.trim()) e.name = "Tell us your name.";
  else if (v.name.trim().length > 200) e.name = "That name is too long.";

  const email = v.work_email.trim();
  if (!email) e.work_email = "We need an email to reply to.";
  else if (!EMAIL_RE.test(email) || email.length > 320)
    e.work_email = "That doesn't look like a valid email.";

  if (!v.company.trim()) e.company = "Tell us your company name.";
  else if (v.company.trim().length > 200) e.company = "That company name is too long.";

  const phone = v.phone.trim();
  if (phone) {
    if (phone.length > 50) e.phone = "That phone number is too long.";
    else if (phone.replace(/[^0-9]/g, "").length < 7)
      e.phone = "That doesn't look like a full phone number.";
  }

  if (v.message.length > 5000) e.message = "Please keep this under 5,000 characters.";

  return e;
}

export default function EnterpriseForm() {
  // Held as strings so each box can start empty — a pre-filled number is an
  // answer we invented on the team's behalf.
  const [values, setValues] = useState<Values>({
    seats: "",
    scans: "",
    unlimitedScans: false,
    intel: "",
    strategy: "",
    name: "",
    work_email: "",
    company: "",
    phone: "",
    message: "",
  });
  // A field's message appears once the user has left it, or once they have
  // pressed submit — never while they are still typing the first character.
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");

  const errors = validate(values);
  const seatCount = Number(values.seats);

  function set(field: Field, next: string) {
    setValues((cur) => ({ ...cur, [field]: next }));
  }
  /** Ticking "unlimited" clears the number, so the two can never both be sent. */
  function setUnlimited(on: boolean) {
    setValues((cur) => ({ ...cur, unlimitedScans: on, scans: on ? "" : cur.scans }));
  }
  function blur(field: Field) {
    setTouched((cur) => ({ ...cur, [field]: true }));
  }
  /** Shown only when the field has been visited or submit has been pressed. */
  function shown(field: Field): string | undefined {
    return touched[field] || submitted ? errors[field] : undefined;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    setSubmitted(true);
    setError("");

    const first = FIELD_ORDER.find((f) => errors[f]);
    if (first) {
      const el = document.getElementById(first);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.focus({ preventScroll: true });
      return;
    }

    setStatus("sending");
    const form = e.currentTarget;
    const payload = {
      name: values.name.trim(),
      work_email: values.work_email.trim(),
      company: values.company.trim(),
      phone: values.phone.trim() || null,
      message: values.message.trim() || null,
      website: new FormData(form).get("website"), // honeypot
      seats: seatCount,
      scans_per_user: values.unlimitedScans ? 0 : Number(values.scans),
      unlimited_scans: values.unlimitedScans,
      intel_per_user: values.intel ? Number(values.intel) : null,
      strategy_per_user: values.strategy ? Number(values.strategy) : null,
      source: new URLSearchParams(window.location.search).get("src") === "app" ? "app" : "site",
      page_url: window.location.href,
    };

    try {
      const res = await fetch("/api/enterprise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.detail || "Could not send your enquiry. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setError("You appear to be offline. Please try again when you reconnect.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <main className="ent-wrap">
        <div className="ent-card ent-done">
          <div className="ent-tick" aria-hidden="true">✓</div>
          <h1>Enquiry sent</h1>
          <p>
            Thanks — we have your details. Someone from the team will come back
            to you within one business day with a price for {seatCount} seats.
          </p>
        </div>
        <Styles />
      </main>
    );
  }

  return (
    <main className="ent-wrap">
      <form className="ent-card" onSubmit={onSubmit} noValidate>
        <header className="ent-head">
          <h1>Enterprise quote</h1>
          <p>Tell us about your team and we&apos;ll come back with a price.</p>
        </header>

        {/* ── Volumes ─────────────────────────────────────────────
            One box, above the contact details: these four numbers are what a
            quote is actually built from. */}
        <div className="ent-box">
          <p className="ent-box-title">Team and volume</p>

          <Num
            id="seats" label="Required team size" required
            placeholder={`${SEATS.min} or more`}
            value={values.seats} error={shown("seats")}
            onChange={(v) => set("seats", v)} onBlur={() => blur("seats")}
          />
          <Num
            id="scans" label="Total scans per user"
            required={!values.unlimitedScans}
            placeholder={values.unlimitedScans ? "No cap" : "per year"}
            disabled={values.unlimitedScans}
            value={values.scans} error={shown("scans")}
            onChange={(v) => set("scans", v)} onBlur={() => blur("scans")}
          />
          <label className="ent-check">
            <input
              type="checkbox" name="unlimited_scans"
              checked={values.unlimitedScans}
              onChange={(e) => setUnlimited(e.target.checked)}
            />
            <span className="ent-check-box" aria-hidden="true" />
            <span className="ent-check-text">
              We need unlimited scans
              <em>No yearly cap per user — we&apos;ll price it with you.</em>
            </span>
          </label>
          <Num
            id="intel" label="Total Intel per user" placeholder="per month"
            value={values.intel} error={shown("intel")}
            onChange={(v) => set("intel", v)} onBlur={() => blur("intel")}
          />
          <Num
            id="strategy" label="Total Strategy per user" placeholder="per month"
            value={values.strategy} error={shown("strategy")}
            onChange={(v) => set("strategy", v)} onBlur={() => blur("strategy")}
          />
        </div>

        {/* ── Details ─────────────────────────────────────────────── */}
        <Text
          id="name" label="Your name" required autoComplete="name"
          value={values.name} error={shown("name")}
          onChange={(v) => set("name", v)} onBlur={() => blur("name")}
        />
        <Text
          id="work_email" label="Work email" required type="email"
          inputMode="email" autoComplete="email"
          value={values.work_email} error={shown("work_email")}
          onChange={(v) => set("work_email", v)} onBlur={() => blur("work_email")}
        />
        <Text
          id="company" label="Company" required autoComplete="organization"
          value={values.company} error={shown("company")}
          onChange={(v) => set("company", v)} onBlur={() => blur("company")}
        />
        <Text
          id="phone" label="Phone" type="tel" inputMode="tel" autoComplete="tel"
          value={values.phone} error={shown("phone")}
          onChange={(v) => set("phone", v)} onBlur={() => blur("phone")}
        />

        <div className="ent-field">
          <label htmlFor="message">
            Anything else? <span className="ent-opt">optional</span>
          </label>
          <textarea
            id="message" name="message" rows={3}
            className={shown("message") ? "ent-input ent-textarea bad" : "ent-input ent-textarea"}
            aria-invalid={shown("message") ? true : undefined}
            aria-describedby={shown("message") ? "message-err" : undefined}
            value={values.message}
            onChange={(e) => set("message", e.target.value)}
            onBlur={() => blur("message")}
          />
          {shown("message") && (
            <p className="ent-err" id="message-err">{shown("message")}</p>
          )}
        </div>

        {/* Honeypot — off-screen, never shown to a person. */}
        <input
          type="text" name="website" tabIndex={-1} autoComplete="off"
          aria-hidden="true" className="ent-hp"
        />

        {status === "error" && <p className="ent-error" role="alert">{error}</p>}

        <button type="submit" className="ent-submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Request a quote"}
        </button>
        <p className="ent-fine">
          We reply within one business day. Minimum {SEATS.min} users.
        </p>
        <p className="ent-fine">
          Already on Enterprise? <a href="/enterprise/admin-auth">Manage your team</a>
        </p>
      </form>
      <Styles />
    </main>
  );
}

interface BaseProps {
  id: Field;
  label: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}

/** Digits-only field. Filtering on change is what keeps the value and the
 *  server's integer check from ever disagreeing. */
function Num(p: BaseProps & { disabled?: boolean }) {
  return (
    <Shell {...p}>
      <input
        id={p.id} name={p.id}
        className={p.error ? "ent-input bad" : "ent-input"}
        type="text" inputMode="numeric" autoComplete="off"
        disabled={p.disabled}
        placeholder={p.placeholder}
        aria-invalid={p.error ? true : undefined}
        aria-describedby={p.error ? `${p.id}-err` : undefined}
        value={p.value}
        onChange={(e) => p.onChange(digits(e.target.value))}
        onBlur={p.onBlur}
      />
    </Shell>
  );
}

function Text(p: BaseProps & { type?: string; inputMode?: "email" | "tel"; autoComplete?: string }) {
  return (
    <Shell {...p}>
      <input
        id={p.id} name={p.id}
        className={p.error ? "ent-input bad" : "ent-input"}
        type={p.type ?? "text"} inputMode={p.inputMode} autoComplete={p.autoComplete}
        placeholder={p.placeholder}
        aria-invalid={p.error ? true : undefined}
        aria-describedby={p.error ? `${p.id}-err` : undefined}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        onBlur={p.onBlur}
      />
    </Shell>
  );
}

function Shell({
  id, label, required, error, children,
}: Pick<BaseProps, "id" | "label" | "required" | "error"> & { children: React.ReactNode }) {
  return (
    <div className="ent-field">
      <label htmlFor={id}>
        {label}{" "}
        {required ? (
          <span className="ent-req">*</span>
        ) : (
          <span className="ent-opt">optional</span>
        )}
      </label>
      {children}
      {error && <p className="ent-err" id={`${id}-err`}>{error}</p>}
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      .ent-wrap{
        /* svh, not vh: mobile Safari's shrinking address bar makes vh taller
           than the visible area and pushes the submit button off-screen. */
        min-height:100svh;
        width:100%;
        max-width:100%;
        overflow-x:hidden;
        display:flex;
        justify-content:center;
        align-items:flex-start;
        padding:20px 16px calc(24px + env(safe-area-inset-bottom));
        background:var(--bg,#0B0B0F);
        color:var(--text,#F4F4F5);
        -webkit-font-smoothing:antialiased;
        box-sizing:border-box;
      }
      .ent-wrap *,.ent-wrap *::before,.ent-wrap *::after{box-sizing:border-box}
      .ent-card{
        width:100%;
        max-width:440px;
        display:flex;
        flex-direction:column;
        gap:18px;
      }
      .ent-head h1{margin:0 0 6px;font-size:26px;line-height:1.15;font-weight:800;letter-spacing:-.02em}
      .ent-head p{margin:0;font-size:15px;line-height:1.5;color:#A1A1AA}

      .ent-field{display:flex;flex-direction:column;gap:8px;min-width:0}
      .ent-field label{font-size:13px;font-weight:600;color:#D4D4D8}
      .ent-opt{font-weight:400;color:#71717A}

      .ent-box{
        display:flex;flex-direction:column;gap:14px;
        padding:16px;border-radius:14px;
        background:#121215;border:1px solid #27272A;
      }
      .ent-box-title{
        margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;
        text-transform:uppercase;color:#71717A;
      }
      .ent-req{color:#F97316;font-weight:700}

      .ent-input{
        width:100%;max-width:100%;
        /* 16px exactly — iOS Safari zooms the whole page on focus below this. */
        font:inherit;font-size:16px;
        padding:12px 14px;border-radius:10px;
        background:#18181B;color:#F4F4F5;border:1px solid #27272A;
      }
      .ent-input::placeholder{color:#52525B}
      .ent-input:focus{outline:none;border-color:#F97316;box-shadow:0 0 0 3px rgba(249,115,22,.18)}
      .ent-input.bad{border-color:#EF4444}
      .ent-input.bad:focus{border-color:#EF4444;box-shadow:0 0 0 3px rgba(239,68,68,.18)}
      .ent-textarea{resize:vertical;min-height:84px}

      .ent-err{margin:0;font-size:12.5px;line-height:1.4;color:#FCA5A5}

      /* The tick box is drawn, not the OS control: this form is one dark card
         and a stock checkbox arrives in the browser's own colours. The real
         input stays in the DOM (keyboard, labels, form data) and is hidden
         behind the square we paint. */
      .ent-check{
        display:flex;align-items:flex-start;gap:10px;
        margin:-4px 0 0;padding:10px 12px;border-radius:10px;
        background:#141417;border:1px solid #27272A;
        cursor:pointer;user-select:none;
      }
      .ent-check:hover{border-color:#3F3F46}
      .ent-check input{
        position:absolute;opacity:0;width:0;height:0;
      }
      .ent-check-box{
        flex:none;width:18px;height:18px;margin-top:1px;
        border-radius:5px;border:1.5px solid #3F3F46;background:#18181B;
        display:grid;place-items:center;
        transition:background-color .14s ease,border-color .14s ease,box-shadow .14s ease;
      }
      .ent-check-box::after{
        content:"";width:10px;height:10px;
        background:#0B0B0F;
        clip-path:polygon(14% 46%,0 60%,40% 100%,100% 22%,86% 8%,38% 70%);
        transform:scale(0);transition:transform .14s ease;
      }
      .ent-check input:checked + .ent-check-box{
        background:linear-gradient(92deg,#F59E0B,#F97316);
        border-color:transparent;
        box-shadow:0 0 10px rgba(249,115,22,.35);
      }
      .ent-check input:checked + .ent-check-box::after{transform:scale(1)}
      .ent-check input:focus-visible + .ent-check-box{
        outline:2px solid #F97316;outline-offset:2px;
      }
      .ent-check-text{font-size:14px;line-height:1.35;color:#E4E4E7}
      .ent-check-text em{
        display:block;margin-top:2px;
        font-style:normal;font-size:12.5px;color:#71717A;
      }
      .ent-input:disabled{opacity:.45;cursor:not-allowed}

      .ent-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}

      .ent-error{
        margin:0;font-size:14px;color:#FCA5A5;
        background:rgba(239,68,68,.10);border:1px solid rgba(239,68,68,.3);
        padding:10px 12px;border-radius:10px;
      }

      .ent-submit{
        font:inherit;font-size:16px;font-weight:700;
        width:100%;padding:15px 20px;border:0;border-radius:12px;cursor:pointer;
        background:#F97316;color:#0B0B0F;
        transition:opacity .15s,transform .06s;
      }
      .ent-submit:active{transform:translateY(1px)}
      .ent-submit:disabled{opacity:.6;cursor:default}
      .ent-submit:focus-visible{outline:2px solid #FDBA74;outline-offset:3px}

      .ent-fine{margin:0;font-size:12px;color:#71717A;text-align:center}
      .ent-fine a{color:#F97316;text-decoration:underline;text-underline-offset:2px}

      .ent-done{align-items:center;text-align:center;gap:12px;padding-top:56px}
      .ent-done h1{margin:0;font-size:24px;font-weight:800}
      .ent-done p{margin:0;font-size:15px;line-height:1.55;color:#A1A1AA;max-width:34ch}
      .ent-tick{
        width:56px;height:56px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:28px;color:#0B0B0F;background:#4ADE80;font-weight:800;
      }

      @media (prefers-reduced-motion:reduce){
        .ent-submit{transition:none}
      }
    `}</style>
  );
}
