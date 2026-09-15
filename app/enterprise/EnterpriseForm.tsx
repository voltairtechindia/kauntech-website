"use client";

import { useState } from "react";

import { SEATS } from "@/lib/enterprise";

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
 * Submit stays disabled until name, work email, company, seats and scans are
 * filled — a quote request without a way to reply, or without a volume to quote
 * against, is just noise in the queue.
 */

type Status = "idle" | "sending" | "sent" | "error";

/** Digits only. Keeps the field numeric without `type=number`'s spinner, its
 *  scroll-wheel edits, or its habit of silently clearing on a stray letter. */
function digits(v: string): string {
  return v.replace(/[^0-9]/g, "").slice(0, 7);
}

export default function EnterpriseForm() {
  // Held as strings so the box can start empty — a pre-filled number is an
  // answer we invented on the team's behalf.
  const [seats, setSeats] = useState("");
  const [scans, setScans] = useState("");
  const [intel, setIntel] = useState("");
  const [strategy, setStrategy] = useState("");
  // Gated on the three fields a follow-up is impossible without. Controlled
  // rather than leaning on `required`, so the button visibly cannot be pressed
  // instead of failing validation after the tap.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");

  const seatCount = Number(seats);
  const scanCount = Number(scans);
  const seatsOk = seats.length > 0 && seatCount >= SEATS.min;
  const scansOk = scans.length > 0 && scanCount > 0;

  const canSubmit =
    name.trim().length > 0 &&
    company.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    seatsOk &&
    scansOk;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending" || !canSubmit) return;
    setStatus("sending");
    setError("");

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      work_email: fd.get("work_email"),
      company: fd.get("company"),
      phone: fd.get("phone"),
      message: fd.get("message"),
      website: fd.get("website"), // honeypot
      seats: seatCount,
      scans_per_user: scanCount,
      intel_per_user: intel.length ? Number(intel) : null,
      strategy_per_user: strategy.length ? Number(strategy) : null,
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

          <div className="ent-field">
            <label htmlFor="seats">
              Required team size <span className="ent-req">*</span>
            </label>
            <input
              id="seats" name="seats" className="ent-input"
              type="text" inputMode="numeric" autoComplete="off"
              placeholder={`${SEATS.min} or more`}
              value={seats} onChange={(e) => setSeats(digits(e.target.value))} required
            />
          </div>

          <div className="ent-field">
            <label htmlFor="scans">
              Total scans per user <span className="ent-req">*</span>
            </label>
            <input
              id="scans" name="scans" className="ent-input"
              type="text" inputMode="numeric" autoComplete="off"
              placeholder="per year"
              value={scans} onChange={(e) => setScans(digits(e.target.value))} required
            />
          </div>

          <div className="ent-field">
            <label htmlFor="intel">
              Total Intel per user <span className="ent-opt">optional</span>
            </label>
            <input
              id="intel" name="intel" className="ent-input"
              type="text" inputMode="numeric" autoComplete="off"
              placeholder="per month"
              value={intel} onChange={(e) => setIntel(digits(e.target.value))}
            />
          </div>

          <div className="ent-field">
            <label htmlFor="strategy">
              Total Strategy per user <span className="ent-opt">optional</span>
            </label>
            <input
              id="strategy" name="strategy" className="ent-input"
              type="text" inputMode="numeric" autoComplete="off"
              placeholder="per month"
              value={strategy} onChange={(e) => setStrategy(digits(e.target.value))}
            />
          </div>
        </div>

        {/* ── Details ─────────────────────────────────────────────── */}
        <div className="ent-field">
          <label htmlFor="name">Your name</label>
          <input id="name" name="name" className="ent-input" autoComplete="name"
            value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="ent-field">
          <label htmlFor="work_email">Work email</label>
          <input
            id="work_email" name="work_email" type="email" inputMode="email"
            className="ent-input" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="ent-field">
          <label htmlFor="company">Company</label>
          <input id="company" name="company" className="ent-input" autoComplete="organization"
            value={company} onChange={(e) => setCompany(e.target.value)} required />
        </div>
        <div className="ent-field">
          <label htmlFor="phone">Phone <span className="ent-opt">optional</span></label>
          <input id="phone" name="phone" type="tel" inputMode="tel" className="ent-input" autoComplete="tel" />
        </div>
        <div className="ent-field">
          <label htmlFor="message">Anything else? <span className="ent-opt">optional</span></label>
          <textarea id="message" name="message" className="ent-input ent-textarea" rows={3} />
        </div>

        {/* Honeypot — off-screen, never shown to a person. */}
        <input
          type="text" name="website" tabIndex={-1} autoComplete="off"
          aria-hidden="true" className="ent-hp"
        />

        {status === "error" && <p className="ent-error" role="alert">{error}</p>}

        <button
          type="submit"
          className="ent-submit"
          disabled={status === "sending" || !canSubmit}
        >
          {status === "sending" ? "Sending…" : "Request a quote"}
        </button>
        <p className="ent-fine">
          {canSubmit
            ? `We reply within one business day. Minimum ${SEATS.min} users.`
            : !seatsOk || !scansOk
              ? `Add your team size (${SEATS.min} users or more) and scans per user to continue.`
              : "Add your name, work email and company to continue."}
        </p>
      </form>
      <Styles />
    </main>
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
      .ent-textarea{resize:vertical;min-height:84px}

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
