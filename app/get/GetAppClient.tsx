"use client";

import { useEffect, useState } from "react";

// Self-contained inline styles + client-side platform detection so this page
// can be deleted in one shot when the referral feature is retired (no shared
// CSS coupling). Detection runs in the browser on the *real* device, which
// fixes the old bug where a server-side UA redirect would sometimes send an
// iPhone to Google Play (and Android to the App Store): the server 307 could
// be cached by the CDN and replayed to the wrong platform, and in-app browsers
// / link-preview bots send misleading User-Agents.
const GOLD = "#F59E0B";

type Platform = "ios" | "android" | "other";

function detectClientPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";

  const ua = navigator.userAgent || "";
  const touch = navigator.maxTouchPoints || 0;
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } })
    .userAgentData;
  const platform = uaData?.platform || "";

  // 1. Trust explicit OS signals (UA Client Hints + UA string).
  if (/android/i.test(platform) || /android/i.test(ua)) return "android";
  if (/ios|iphone|ipad/i.test(platform) || /iphone|ipad|ipod/i.test(ua)) return "ios";

  // 2. iPadOS 13+ (and other touch Macs) report a desktop "Macintosh" UA.
  if (/mac/i.test(platform + ua) && touch > 1) return "ios";

  // 3. Chrome's "Desktop site" mode rewrites a phone's UA to a desktop Linux
  //    string AND reports platform "Linux" — so neither signal above fires.
  //    But real Linux/Windows desktops aren't touch-capable, so a touch device
  //    reporting Linux is almost certainly an Android phone in desktop mode
  //    (iPads are handled above as Mac; ChromeOS is excluded).
  if (touch > 0 && /linux/i.test(platform + ua) && !/cros|chrome os/i.test(ua))
    return "android";

  return "other";
}

export default function GetAppClient({
  iosUrl,
  androidUrl,
}: {
  iosUrl: string;
  androidUrl: string;
}) {
  // Resolve synchronously on first client render so we never paint a wrong
  // store, then redirect after a beat so the loader is actually seen.
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const platform = detectClientPlatform();
    // Everything that isn't Android (iOS + desktop/other) goes to the App Store,
    // matching the previous server behavior.
    const url = platform === "android" ? androidUrl : iosUrl;
    setTarget(url);
    // Redirect as soon as the device is known. This effect runs right after the
    // first paint, so the loader is shown for exactly as long as the unavoidable
    // store-navigation latency — no artificial delay. (There's nothing to wait
    // for here: /get carries no referral code to copy, unlike /r/[code].)
    window.location.replace(url);
  }, [iosUrl, androidUrl]);

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
      <style>{`@keyframes kt-spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ position: "relative", width: 96, height: 96, marginBottom: 28 }}>
        {/* Spinning gold ring around the logo */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "3px solid #27272A",
            borderTopColor: GOLD,
            animation: "kt-spin 0.9s linear infinite",
          }}
        />
        <img
          src="/assets/logo-gold.png"
          alt="KaunTech"
          width={56}
          height={56}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            borderRadius: 12,
          }}
        />
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
        Getting KaunTech ready…
      </h1>
      <p style={{ color: "#A1A1AA", fontSize: 14, lineHeight: 1.5, margin: 0 }}>
        Taking you to the right app store.
      </p>

      {target && (
        <a
          href={target}
          style={{
            marginTop: 28,
            color: "#71717A",
            fontSize: 13,
            textDecoration: "underline",
          }}
        >
          Tap here if you&apos;re not redirected
        </a>
      )}
    </main>
  );
}
