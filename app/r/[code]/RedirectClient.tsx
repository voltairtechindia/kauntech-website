"use client";

import { useEffect, useState } from "react";

// Self-contained inline styles so this page can be deleted in one shot when the
// referral feature is retired (no shared CSS coupling).
const GOLD = "#F59E0B";

type Platform = "ios" | "android" | "other";

function detectClientPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";

  // Prefer UA Client Hints: navigator.userAgentData.platform reports the true OS
  // even when Chrome's "Desktop site" mode rewrites the UA string to hide
  // "Android" (which was sending Android phones to the App Store). Safari/iOS
  // doesn't implement UA-CH, so iOS falls through to the UA-string check below,
  // which is reliable there.
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } })
    .userAgentData;
  const platform = uaData?.platform;
  if (platform) {
    if (/android/i.test(platform)) return "android";
    if (/ios|iphone|ipad/i.test(platform)) return "ios";
  }

  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  // iPadOS 13+ reports a desktop "Macintosh" UA; treat touch-capable Macs as iOS.
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  return "other";
}

export default function RedirectClient({
  code,
  iosUrl,
  androidUrl,
}: {
  code: string;
  iosUrl: string;
  androidUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  // Default to iOS for a deterministic SSR / first-paint render (no hydration
  // mismatch), then correct to the real platform on the client in the effect
  // below before the redirect fires.
  const [storeUrl, setStoreUrl] = useState(iosUrl);

  useEffect(() => {
    // Pick the store from the real device, not a possibly-cached server UA.
    const platform = detectClientPlatform();
    const url = platform === "android" ? androidUrl : iosUrl;
    setStoreUrl(url);

    // Best-effort clipboard write so the app's signup screen can auto-fill the
    // code after install. Browsers may block this without a gesture — the code
    // is shown below as a fallback, and there's a manual Copy button.
    navigator.clipboard?.writeText(code).catch(() => {});

    const t = setTimeout(() => window.location.replace(url), 2200);
    return () => clearTimeout(t);
  }, [code, iosUrl, androidUrl]);

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
          }}
        >
          <img
            src="/assets/logo-gold.png"
            alt="KaunTech"
            width={40}
            height={40}
            style={{ borderRadius: 10 }}
          />
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
            onClick={(e) => {
              // Compute the store at tap time so an early tap (before the effect
              // has corrected `storeUrl`) never lands the user on the wrong
              // store. The href is only a no-JS fallback.
              e.preventDefault();
              const platform = detectClientPlatform();
              window.location.replace(platform === "android" ? androidUrl : iosUrl);
            }}
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
