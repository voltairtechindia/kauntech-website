"use client";

import { useEffect, useState } from "react";

// Inline styles, matching /r/[code] — these two landing pages are the only
// pages on the site that render outside the marketing layout.
const GOLD = "#F59E0B";

type Platform = "ios" | "android" | "other";

function detectClientPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";

  const ua = navigator.userAgent || "";
  const touch = navigator.maxTouchPoints || 0;
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } })
    .userAgentData;
  const platform = uaData?.platform || "";

  if (/android/i.test(platform) || /android/i.test(ua)) return "android";
  if (/ios|iphone|ipad/i.test(platform) || /iphone|ipad|ipod/i.test(ua)) return "ios";
  // iPadOS 13+ reports a desktop "Macintosh" UA.
  if (/mac/i.test(platform + ua) && touch > 1) return "ios";
  if (touch > 0 && /linux/i.test(platform + ua) && !/cros|chrome os/i.test(ua))
    return "android";

  return "other";
}

export default function CardOpenClient({
  cardId,
  iosUrl,
  androidUrl,
}: {
  cardId: string;
  iosUrl: string;
  androidUrl: string;
}) {
  const [storeUrl, setStoreUrl] = useState(iosUrl);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    const platform = detectClientPlatform();
    setStoreUrl(platform === "android" ? androidUrl : iosUrl);

    // First try the app itself. If KaunTech is installed but the OS handed the
    // link to the browser anyway — an in-app browser, or an Android install
    // whose App Links aren't verified — the custom scheme still opens it.
    // Nothing happens when it isn't installed, which is what the store button
    // below is for. No auto-redirect to the store: a bounce would fight the
    // scheme handoff on the phones where it does work.
    if (platform !== "other") {
      window.location.href = `kauntech://card/${cardId}`;
      const t = setTimeout(() => setTried(true), 1200);
      return () => clearTimeout(t);
    }
    setTried(true);
  }, [cardId, iosUrl, androidUrl]);

  const openStore = () => {
    const platform = detectClientPlatform();
    window.location.replace(platform === "android" ? androidUrl : iosUrl);
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo-gold.png"
            alt="KaunTech"
            width={40}
            height={40}
            style={{ borderRadius: 10 }}
          />
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>
          Opening this card
        </h1>
        <p style={{ color: "#A1A1AA", fontSize: 14, lineHeight: 1.5, margin: "0 0 24px" }}>
          {tried
            ? "Nothing opened? Get KaunTech and the card will be waiting when you tap the tag again."
            : "Handing you over to the KaunTech app…"}
        </p>

        <button
          onClick={openStore}
          style={{
            display: "block",
            width: "100%",
            background: GOLD,
            color: "#0A0A0C",
            border: "none",
            borderRadius: 14,
            padding: "14px 0",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          Get KaunTech →
        </button>

        <a
          href={`kauntech://card/${cardId}`}
          style={{
            display: "block",
            marginTop: 14,
            color: "#A1A1AA",
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          Already installed? Open the app
        </a>
      </div>
    </main>
  );
}
