import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kauntech — Offline AI Business Card Scanner",
    short_name: "Kauntech",
    description:
      "India's first 100% offline AI business card scanner. Scan, enrich, and sync contacts in 30 seconds. DPDP Act 2023 compliant.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f17",
    theme_color: "#f97316",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/assets/logo-gold.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
