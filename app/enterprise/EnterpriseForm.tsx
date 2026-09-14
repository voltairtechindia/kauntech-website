"use client";

import { useMemo, useState } from "react";

import {
  ENTERPRISE_NEEDS,
  SCANS,
  SEATS,
  indicativeAnnualInr,
} from "@/lib/enterprise";

/**
 * Phone-first Enterprise quote form.
 *
 * Sized to the device rather than to a desktop column: `100svh` (not `vh`) so
 * mobile Safari's collapsing address bar can't push the submit button under
 * the fold, `max-width: 100%` everywhere so nothing forces a horizontal
 * scroll, and 16px inputs because anything smaller makes iOS zoom on focus and
 * leaves the user stranded at 1.4× with the rest of the form off-screen.
 *
 * The price shown is indicative and labelled as such — it exists to qualify the
 * lead and set an expectation, not to be a quote. The server recomputes it from
 * the submitted sliders, so editing it in the console changes nothing.
 */

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

type Status = "idle" | "sending" | "sent" | "error";

export default function EnterpriseForm() {
  const [seats, setSeats] = useState<number>(SEATS.default);
  const [scans, setScans] = useState<number>(SCANS.default);
  const [needs, setNeeds] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");

  const annual = useMemo(() => indicativeAnnualInr(seats, scans), [seats, scans]);
  const perSeat = useMemo(() => Math.round(annual / seats), [annual, seats]);

  function toggleNeed(key: string) {
    setNeeds((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
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
      seats,
      scans_per_user: scans,
      needs,
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
            to you within one business day with a price for {seats} seats.
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

        {/* ── Sliders ─────────────────────────────────────────────── */}
        <div className="ent-field">
          <div className="ent-slabel">
            <label htmlFor="seats">Team size</label>
            <output htmlFor="seats">{seats} {seats === 1 ? "user" : "users"}</output>
          </div>
          <input
            id="seats" name="seats" type="range" className="ent-range"
            min={SEATS.min} max={SEATS.max} step={SEATS.step}
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
          />
          <div className="ent-scale">
            <span>{SEATS.min}</span><span>{SEATS.max}+</span>
          </div>
        </div>

        <div className="ent-field">
          <div className="ent-slabel">
            <label htmlFor="scans">Scans per user, per year</label>
            <output htmlFor="scans">{scans.toLocaleString("en-IN")}</output>
          </div>
          <input
            id="scans" name="scans" type="range" className="ent-range"
            min={SCANS.min} max={SCANS.max} step={SCANS.step}
            value={scans}
            onChange={(e) => setScans(Number(e.target.value))}
          />
          <div className="ent-scale">
            <span>{SCANS.min.toLocaleString("en-IN")}</span>
            <span>{SCANS.max.toLocaleString("en-IN")}+</span>
          </div>
        </div>

        {/* ── Indicative price ────────────────────────────────────── */}
        <div className="ent-quote" aria-live="polite">
          <span className="ent-quote-k">Indicative</span>
          <strong>{inr(annual)}<span> / year</span></strong>
          <span className="ent-quote-sub">
            about {inr(perSeat)} per user · final price confirmed by our team
          </span>
        </div>

        {/* ── Needs ───────────────────────────────────────────────── */}
        <div className="ent-field">
          <span className="ent-legend">What do you need?</span>
          <div className="ent-chips">
            {ENTERPRISE_NEEDS.map((n) => {
              const on = needs.includes(n.key);
              return (
                <button
                  key={n.key} type="button"
                  className={on ? "ent-chip on" : "ent-chip"}
                  aria-pressed={on}
                  onClick={() => toggleNeed(n.key)}
                >
                  {n.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Details ─────────────────────────────────────────────── */}
        <div className="ent-field">
          <label htmlFor="name">Your name</label>
          <input id="name" name="name" className="ent-input" autoComplete="name" required />
        </div>
        <div className="ent-field">
          <label htmlFor="work_email">Work email</label>
          <input
            id="work_email" name="work_email" type="email" inputMode="email"
            className="ent-input" autoComplete="email" required
          />
        </div>
        <div className="ent-field">
          <label htmlFor="company">Company</label>
          <input id="company" name="company" className="ent-input" autoComplete="organization" required />
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

        <button type="submit" className="ent-submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Request a quote"}
        </button>
        <p className="ent-fine">
          We reply within one business day. Minimum {SEATS.min} users.
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
      .ent-field label,.ent-legend{font-size:13px;font-weight:600;color:#D4D4D8}
      .ent-opt{font-weight:400;color:#71717A}

      .ent-slabel{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
      .ent-slabel output{font-size:15px;font-weight:700;color:#F97316;font-variant-numeric:tabular-nums}
      .ent-scale{display:flex;justify-content:space-between;font-size:11px;color:#71717A;font-variant-numeric:tabular-nums}

      .ent-range{
        -webkit-appearance:none;appearance:none;
        width:100%;max-width:100%;height:28px;background:transparent;margin:0;
      }
      .ent-range::-webkit-slider-runnable-track{height:6px;border-radius:999px;background:#27272A}
      .ent-range::-moz-range-track{height:6px;border-radius:999px;background:#27272A}
      /* 28px thumb: comfortably over the ~44px touch-target guidance once the
         28px track height is counted, so it can be dragged with a thumb. */
      .ent-range::-webkit-slider-thumb{
        -webkit-appearance:none;appearance:none;
        width:28px;height:28px;margin-top:-11px;border-radius:50%;
        background:#F97316;border:3px solid #0B0B0F;
        box-shadow:0 2px 8px rgba(0,0,0,.5);cursor:grab;
      }
      .ent-range::-moz-range-thumb{
        width:28px;height:28px;border-radius:50%;
        background:#F97316;border:3px solid #0B0B0F;
        box-shadow:0 2px 8px rgba(0,0,0,.5);cursor:grab;
      }
      .ent-range:focus-visible{outline:2px solid #F97316;outline-offset:4px;border-radius:8px}

      .ent-quote{
        display:flex;flex-direction:column;gap:2px;
        padding:14px 16px;border-radius:12px;
        background:rgba(249,115,22,.10);border:1px solid rgba(249,115,22,.28);
      }
      .ent-quote-k{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#FDBA74}
      .ent-quote strong{font-size:28px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
      .ent-quote strong span{font-size:14px;font-weight:600;color:#A1A1AA}
      .ent-quote-sub{font-size:12px;color:#A1A1AA}

      .ent-chips{display:flex;flex-wrap:wrap;gap:8px}
      .ent-chip{
        font:inherit;font-size:13px;
        padding:9px 13px;border-radius:999px;cursor:pointer;
        background:#18181B;color:#D4D4D8;border:1px solid #27272A;
        transition:background .15s,border-color .15s,color .15s;
      }
      .ent-chip.on{background:rgba(249,115,22,.16);border-color:#F97316;color:#FDBA74}
      .ent-chip:focus-visible{outline:2px solid #F97316;outline-offset:2px}

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
        .ent-chip,.ent-submit{transition:none}
      }
    `}</style>
  );
}
