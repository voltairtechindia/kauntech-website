"use client";

import { useEffect, useState } from "react";

// TEMPORARY diagnostic page. Prints exactly what this device reports and what
// the referral redirect logic decides, with NO navigation. Delete once the
// Android-store issue is confirmed fixed.
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
  if (/mac/i.test(platform + ua) && touch > 1) return "ios";
  if (touch > 0 && /linux/i.test(platform + ua) && !/cros|chrome os/i.test(ua))
    return "android";
  return "other";
}

export default function UaCheck() {
  const [info, setInfo] = useState<Record<string, string>>({});

  useEffect(() => {
    const uaData = (
      navigator as Navigator & { userAgentData?: { platform?: string } }
    ).userAgentData;
    const platform = detectClientPlatform();
    setInfo({
      userAgent: navigator.userAgent,
      "userAgentData.platform": String(uaData?.platform ?? "(none)"),
      maxTouchPoints: String(navigator.maxTouchPoints),
      DETECTED: platform,
      "would open": platform === "android" ? "PLAY STORE ✅" : "APP STORE",
    });
  }, []);

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#0A0A0C",
        color: "#FAFAFA",
        fontFamily: "ui-monospace, monospace",
        padding: 20,
        fontSize: 14,
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: 18, color: "#F59E0B" }}>UA Check</h1>
      {Object.entries(info).map(([k, v]) => (
        <div key={k} style={{ marginBottom: 12, wordBreak: "break-all" }}>
          <div style={{ color: "#71717A", fontSize: 12 }}>{k}</div>
          <div style={{ fontWeight: 700 }}>{v}</div>
        </div>
      ))}
    </main>
  );
}
