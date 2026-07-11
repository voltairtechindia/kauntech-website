"use client";

import { appInstall, appStoreInstall } from "@/lib/gtag";
import Brand from "@/components/ui/BrandIcons";

// Client island for the Hero store badges. Kept separate so Hero stays a server
// component — only this small interactive bit ships as client JS. The onClick
// handlers report install-intent conversions to GA4 + Google Ads (lib/gtag.ts).
export default function StoreBadges() {
  return (
    <div className="store-badges reveal reveal-delay-2" style={{ marginTop: "2rem" }}>
      <div
        style={{
          fontSize: "0.8rem",
          fontFamily: "var(--mono)",
          color: "var(--gold)",
          textTransform: "uppercase",
          letterSpacing: 2,
          marginBottom: 12,
        }}
      >
        Now Available On
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <a
          href="https://play.google.com/store/apps/details?id=com.kauntech.bizcard"
          onClick={appInstall}
          target="_blank"
          rel="noopener noreferrer"
          className="store-badge"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "8px 16px",
            borderRadius: 12,
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          <i className="ic" style={{ fontSize: "1.5rem", color: "#fff" }} aria-hidden="true">
            <Brand name="googleplay" />
          </i>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <span style={{ fontSize: "0.65rem", color: "var(--text-dim)", textTransform: "uppercase" }}>
              Get it on
            </span>
            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", lineHeight: 1 }}>
              Google Play
            </span>
          </div>
        </a>
        <a
          href="https://apps.apple.com/app/id6769254727"
          onClick={appStoreInstall}
          target="_blank"
          rel="noopener noreferrer"
          className="store-badge"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "8px 16px",
            borderRadius: 12,
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          <i className="ic" style={{ fontSize: "1.5rem", color: "#fff" }} aria-hidden="true">
            <Brand name="apple" />
          </i>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <span style={{ fontSize: "0.65rem", color: "var(--text-dim)", textTransform: "uppercase" }}>
              Download on the
            </span>
            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", lineHeight: 1 }}>
              App Store
            </span>
          </div>
        </a>
      </div>
    </div>
  );
}
