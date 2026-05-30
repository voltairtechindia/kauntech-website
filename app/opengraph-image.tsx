import { ImageResponse } from "next/og";

// Native Next.js file-based OG image — generates a correct 1200x630 social card.
// Auto-applied to og:image and twitter:image for every route.
export const alt =
  "Kauntech — India's first 100% offline AI business card scanner, DPDP Act 2023 compliant";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "radial-gradient(circle at 20% 20%, #1f2937 0%, #0b0f17 55%, #050608 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: 2,
            color: "#f97316",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #f97316, #fbbf24)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 900,
              color: "#0b0f17",
            }}
          >
            K
          </div>
          KAUNTECH
        </div>

        <div
          style={{
            marginTop: 40,
            fontSize: 70,
            fontWeight: 900,
            lineHeight: 1.05,
            maxWidth: 980,
          }}
        >
          The Offline-First AI Business Card Scanner
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 34,
            color: "#cbd5e1",
            maxWidth: 900,
          }}
        >
          Scan, enrich & sync contacts in 30 seconds — 100% on-device.
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 44 }}>
          {["100% Offline OCR", "DPDP Act 2023 Compliant", "AI Enrichment"].map(
            (t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  fontSize: 24,
                  fontWeight: 600,
                  padding: "12px 22px",
                  borderRadius: 999,
                  border: "1px solid rgba(249,115,22,0.5)",
                  color: "#fbbf24",
                  background: "rgba(249,115,22,0.08)",
                }}
              >
                {t}
              </div>
            )
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
