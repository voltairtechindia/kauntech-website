"use client";

import { useState } from "react";

const STEPS = [
  {
    n: 1,
    title: "Upload Card Target",
    body: "Upload a glare-free photo of your printed card to serve as the AR tracking reference target.",
  },
  {
    n: 2,
    title: "Design your AR Scene",
    body: "Position 3D models, active link buttons, videos, or floating text labels directly floating on top of your card layout.",
  },
  {
    n: 3,
    title: "Scan & Experience",
    body: "When someone scans your physical card via the KaunTech scanner or QR code, your virtual layout comes alive in 3D space.",
  },
];

/**
 * Collapsible "How AR business cards work" explainer. Collapsed by default so
 * the usage meters and the card grid sit at the top of the dashboard; the
 * header stays a one-tap toggle for anyone who wants the walkthrough.
 */
export default function HowItWorks() {
  const [open, setOpen] = useState(false);

  return (
    <div className={`ar-context-card ar-context-collapsible${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="ar-context-card-header ar-context-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ar-context-title">
          <svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block" }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          How AR business cards work
          <svg className="ar-context-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
        <span className="ar-muted" style={{ fontSize: "13.5px" }}>
          {open ? "Attach 3D assets or media overlays to your physical card in three quick steps:" : "Three quick steps to attach 3D assets or media to your card. Tap to expand."}
        </span>
      </button>

      {open ? (
        <div className="ar-context-steps">
          {STEPS.map((s) => (
            <div className="ar-context-step" key={s.n}>
              <div className="ar-step-number">{s.n}</div>
              <div className="ar-step-content">
                <strong>{s.title}</strong>
                <p>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
