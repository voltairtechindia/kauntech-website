"use client";

import { useEffect, useState } from "react";

// Self-contained inline styles so this page can be deleted in one shot when the
// referral feature is retired (no shared CSS coupling).
const GOLD = "#F59E0B";

export default function RedirectClient({
  code,
  storeUrl,
}: {
  code: string;
  storeUrl: string | null;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Best-effort clipboard write so the app's signup screen can auto-fill the
    // code after install. Browsers may block this without a gesture — the code
    // is shown below as a fallback, and there's a manual Copy button.
    navigator.clipboard?.writeText(code).catch(() => {});

    if (storeUrl) {
      const t = setTimeout(() => window.location.replace(storeUrl), 2200);
      return () => clearTimeout(t);
    }
  }, [code, storeUrl]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0A0A0C",
        color: "#FAFAFA",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 380, width: "100%" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            margin: "0 auto 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${GOLD}1A`,
            border: `1px solid ${GOLD}40`,
            fontSize: 30,
          }}
        >
          📇
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>
          {storeUrl ? "Getting KaunTech ready…" : "KaunTech is launching soon"}
        </h1>
        <p style={{ color: "#A1A1AA", fontSize: 14, lineHeight: 1.5, margin: "0 0 24px" }}>
          {storeUrl
            ? "Taking you to the app store. Your invite code is saved — just sign up to claim your bonus."
            : "We're almost live. Save your invite code below and enter it when you sign up to claim your bonus scans."}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: "#141417",
            border: "1px solid #27272A",
            borderRadius: 14,
            padding: "14px 18px",
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3, color: GOLD }}>
            {code}
          </span>
          <button
            onClick={copy}
            style={{
              border: "1px solid #3F3F46",
              background: "transparent",
              color: copied ? GOLD : "#A1A1AA",
              borderRadius: 10,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>

        {storeUrl ? (
          <a
            href={storeUrl}
            style={{
              display: "block",
              background: GOLD,
              color: "#0A0A0C",
              borderRadius: 14,
              padding: "14px 0",
              fontWeight: 700,
              fontSize: 15,
              textDecoration: "none",
            }}
          >
            Continue to install →
          </a>
        ) : (
          <a
            href="/"
            style={{
              display: "block",
              background: GOLD,
              color: "#0A0A0C",
              borderRadius: 14,
              padding: "14px 0",
              fontWeight: 700,
              fontSize: 15,
              textDecoration: "none",
            }}
          >
            Learn more about KaunTech
          </a>
        )}
      </div>
    </main>
  );
}
