/**
 * Data for the "Kauntech vs X" comparison pages (/compare/<slug>).
 *
 * Source of truth: docs/growth/COMPETITOR_RESEARCH.md (July 2026 research pass).
 * FACTUAL GUARDRAILS baked into this data — do not loosen without re-checking the
 * research doc:
 *   - No specific competitor PRICING numbers (all flagged "unverified"). Pricing is
 *     described qualitatively only ("paid tiers", "subscription").
 *   - ABBYY Business Card Reader genuinely does on-device / offline OCR — we never
 *     imply it uploads everything. We lead on Android support, active development,
 *     multi-device, WhatsApp/Sheets routing, and DPDP posture.
 *   - CamCard: honest angle is DATA RESIDENCY (INTSIG is China-HQ; cloud storage),
 *     not "insecure" (it encrypts).
 *   - Traditional: CardScan is EOL (support ended 2020); Neat exited hardware.
 *     Framed as the modern mobile replacement, not trashing tools people own.
 *   - Every competitor carries an honest "where they are strong" paragraph.
 */

export type CompareRow = {
  dimension: string;
  kauntech: string;
  competitor: string;
};

export type CompareFaq = {
  q: string;
  a: string;
};

export type Competitor = {
  /** URL slug — matches app/compare/[competitor]/page.tsx params. */
  slug: string;
  /** Display name used in headings / breadcrumbs ("Kauntech vs <name>"). */
  name: string;
  /** <title> for the page. */
  title: string;
  /** One-line subtitle under the H1. */
  oneLiner: string;
  /** Intro paragraph. */
  intro: string;
  /** Comparison table rows (Feature | Kauntech | <competitor>). */
  rows: CompareRow[];
  /** Defensible reasons teams pick Kauntech (rendered as a list). */
  kauntechWins: string[];
  /** Honest, non-disparaging "where the competitor is strong" paragraph. */
  competitorStrengths: string;
  /** FAQ pairs — rendered as an accordion + FAQPage JSON-LD. */
  faq: CompareFaq[];
};

export const competitors: Competitor[] = [
  {
    slug: "camcard",
    name: "CamCard",
    title:
      "Kauntech vs CamCard — Offline Business Card Scanner Comparison",
    oneLiner:
      "On-device, DPDP-aligned scanning versus a cloud-centric contact manager.",
    intro:
      "CamCard, from INTSIG (the company behind CamScanner), is a mature, cloud-centric business card scanner and contact manager. Kauntech takes the opposite approach: every card is read 100% on your device and is never uploaded. If data residency, offline capability and DPDP Act 2023 alignment matter to your team, here is how the two compare.",
    rows: [
      {
        dimension: "OCR & processing",
        kauntech: "100% offline, on-device",
        competitor:
          "Cloud-centric — cards are saved to CamCard's cloud servers and run through a cloud proofreading step",
      },
      {
        dimension: "Works fully offline",
        kauntech: "Yes — no internet needed",
        competitor: "No — built around cloud storage and sync",
      },
      {
        dimension: "Account / cloud upload",
        kauntech: "Not required — no sign-in, contacts never leave your device",
        competitor:
          "Account recommended and required for full features; cards are uploaded to the cloud",
      },
      {
        dimension: "Data residency & DPDP",
        kauntech:
          "On-device, DPDP Act 2023 aligned; data stays on your device in India",
        competitor:
          "China-headquartered vendor (INTSIG); cloud server locations include China; no DPDP-specific claim",
      },
      {
        dimension: "Encryption",
        kauntech: "AES-256, on your device",
        competitor: "256-bit encryption, in the cloud",
      },
      {
        dimension: "Lead routing",
        kauntech: "CRM, Google Sheets and WhatsApp in under 30 seconds",
        competitor:
          "Excel/CSV export and CRM sync (e.g. Salesforce); no documented native WhatsApp routing",
      },
      {
        dimension: "Platforms",
        kauntech: "Android + iOS",
        competitor: "Android + iOS (plus web/enterprise console)",
      },
      {
        dimension: "Pricing model",
        kauntech: "Free plan plus paid tiers, in INR",
        competitor: "Free tier with limits, plus a paid subscription",
      },
    ],
    kauntechWins: [
      "100% offline, on-device OCR — cards are never uploaded, versus CamCard's cloud storage and cloud proofreading.",
      "No forced account or cloud upload — start scanning without signing in.",
      "DPDP Act 2023 aligned with on-device, India-resident data. CamCard is a China-headquartered vendor (INTSIG) whose cloud server locations include China.",
      "Native routing to your CRM, Google Sheets and WhatsApp in under 30 seconds.",
      "INR-native pricing built for the Indian market.",
    ],
    competitorStrengths:
      "CamCard is a mature, feature-rich product. Its cloud model is a genuine convenience for teams that want a shared, centrally synced card library across many devices, and it offers strong Salesforce/CRM export and solid large-scale batch capture at events. CamCard also encrypts the data it stores — so the honest difference is not security, it is where your data lives. CamCard keeps cards in its cloud (with server locations including China), while Kauntech keeps them on your device.",
    faq: [
      {
        q: "Does CamCard work offline?",
        a: "CamCard is built around cloud storage and sync, so its full value depends on connectivity — cards are saved to CamCard's cloud servers and run through a cloud proofreading step. Kauntech reads every card 100% on-device, so it works with no internet at all and nothing is uploaded.",
      },
      {
        q: "Where does CamCard store my business cards?",
        a: "CamCard stores cards on its cloud servers, with stated locations that include America, Europe, Japan and China, and its vendor INTSIG is headquartered in China. Kauntech keeps cards in AES-256 encrypted storage on your own device, aligned with India's DPDP Act 2023.",
      },
      {
        q: "Is CamCard secure?",
        a: "CamCard does encrypt data with 256-bit encryption — we don't suggest otherwise. The meaningful difference is data residency and control: with CamCard your cards leave your device for the cloud, whereas with Kauntech they never leave your phone.",
      },
      {
        q: "Can Kauntech send leads to WhatsApp and Google Sheets?",
        a: "Yes — Kauntech routes captured leads to your CRM, Google Sheets and WhatsApp in under 30 seconds. CamCard offers Excel/CSV export and CRM sync such as Salesforce, but has no documented native WhatsApp routing.",
      },
      {
        q: "Is Kauntech available on Android and iOS?",
        a: "Yes, Kauntech is available on both Android and iOS, the same as CamCard.",
      },
    ],
  },
  {
    slug: "abbyy-business-card-reader",
    name: "ABBYY Business Card Reader",
    title:
      "Kauntech vs ABBYY Business Card Reader — Offline Scanner Comparison",
    oneLiner:
      "Android + iOS and actively developed, versus a capable iOS-only app in maintenance mode.",
    intro:
      "ABBYY Business Card Reader is built on ABBYY's respected OCR engine and, importantly, genuinely does on-device, offline recognition. So this comparison is not about privacy alone — ABBYY is one of the closest apps to Kauntech on that point. The real differences are platform support, active development, working cross-device sync, lead routing and an India-first DPDP posture.",
    rows: [
      {
        dimension: "OCR & processing",
        kauntech: "100% offline, on-device",
        competitor:
          "On-device OCR; offline recognition available (a genuine privacy plus)",
      },
      {
        dimension: "Platforms",
        kauntech: "Android + iOS",
        competitor: "iOS only — the Android app was discontinued (end-of-life 2023)",
      },
      {
        dimension: "Active development",
        kauntech: "Actively developed",
        competitor: "Effectively in maintenance mode",
      },
      {
        dimension: "Cross-device sync",
        kauntech: "Intact",
        competitor: "Cloud sync (ABBYY Account / BCR Web) shut down around 2023",
      },
      {
        dimension: "Account / cloud upload",
        kauntech: "Not required — contacts never leave your device",
        competitor:
          "Account optional; can be disabled so cards aren't sent over the internet",
      },
      {
        dimension: "Data residency & DPDP",
        kauntech: "On-device, AES-256 local, DPDP Act 2023 aligned",
        competitor:
          "On-device processing (a real privacy plus); no DPDP-specific compliance; closed-source",
      },
      {
        dimension: "Lead routing",
        kauntech: "CRM, Google Sheets and WhatsApp in under 30 seconds",
        competitor:
          "Salesforce, Outlook, Google Contacts and Excel/CSV; no WhatsApp routing",
      },
      {
        dimension: "Pricing model",
        kauntech: "Free plan plus paid tiers, in INR",
        competitor: "Free to download with a small free-card cap, then paid",
      },
    ],
    kauntechWins: [
      "Available on both Android and iOS — ABBYY dropped its Android app entirely (end-of-life 2023).",
      "Actively developed and supported, while ABBYY Business Card Reader is effectively in maintenance mode.",
      "Cross-device sync is intact — ABBYY shut down its cloud sync (ABBYY Account / BCR Web) around 2023.",
      "Native routing to your CRM, Google Sheets and WhatsApp in under 30 seconds — ABBYY has no WhatsApp routing.",
      "Built for India with an explicit DPDP Act 2023 posture and INR-native pricing.",
    ],
    competitorStrengths:
      "Credit where it is due: ABBYY Business Card Reader is built on ABBYY's best-in-class OCR heritage and genuinely does on-device, offline recognition — you can even disable the ABBYY Account so cards are not sent over the internet. It has strong language coverage and established CRM/CSV exports, and on the core privacy claim it is one of the closest apps to Kauntech. Where Kauntech pulls ahead is breadth: Android and iOS, active development, working multi-device, WhatsApp/Sheets routing and an India-first DPDP posture.",
    faq: [
      {
        q: "Is ABBYY Business Card Reader available on Android?",
        a: "No. ABBYY discontinued the Android version of Business Card Reader (end-of-life around 2023); it is now iOS-only. Kauntech is available on both Android and iOS.",
      },
      {
        q: "Is ABBYY Business Card Reader still being developed?",
        a: "The surviving iOS app still receives occasional maintenance updates, but the product is effectively in maintenance mode rather than active multi-platform development, and ABBYY shut down its cloud sync around 2023. Kauntech is actively developed with cross-device sync intact.",
      },
      {
        q: "Does ABBYY Business Card Reader do offline OCR like Kauntech?",
        a: "Yes — this is one area where ABBYY is genuinely similar to Kauntech. ABBYY processes images on the device and offers offline recognition, and you can disable the account so cards aren't transferred over the internet. Kauntech is 100% offline on-device by default and adds AES-256 local storage plus a DPDP Act 2023 posture.",
      },
      {
        q: "Can ABBYY Business Card Reader send leads to WhatsApp?",
        a: "ABBYY exports to Salesforce, Outlook, Google Contacts and Excel/CSV, but has no documented WhatsApp routing. Kauntech routes leads to your CRM, Google Sheets and WhatsApp in under 30 seconds.",
      },
      {
        q: "Why choose Kauntech over ABBYY Business Card Reader?",
        a: "If you are on Android, want active development and working multi-device sync, need WhatsApp/Sheets routing, or want an India-first DPDP Act 2023 posture, Kauntech is the better fit. ABBYY remains a solid on-device, iOS-only option.",
      },
    ],
  },
  {
    slug: "traditional-scanners",
    name: "Traditional Scanners",
    title:
      "Kauntech vs Traditional Business Card Scanners — Modern Mobile Comparison",
    oneLiner:
      "A modern, mobile, private replacement for desk-bound hardware and slow manual entry.",
    intro:
      "\"Traditional\" business-card capture means two things: dedicated hardware scanners (such as CardScan and Neat) and manual data entry into a CRM or spreadsheet — the legacy status quo. Kauntech replaces both with a mobile, on-device app that captures, enriches and routes leads in seconds. Here is how the modern approach compares.",
    rows: [
      {
        dimension: "Capture method",
        kauntech: "Mobile app — scan on the go at any event or meeting",
        competitor: "Desk-tethered hardware scanner, or slow manual typing",
      },
      {
        dimension: "OCR & processing",
        kauntech: "100% offline, on-device AI OCR",
        competitor:
          "Legacy engine on a tethered PC, or human typing (manual entry)",
      },
      {
        dimension: "Speed",
        kauntech: "Capture to routed lead in under 30 seconds",
        competitor:
          "One card at a time; manual entry is slow and doesn't scale to events",
      },
      {
        dimension: "Accuracy & enrichment",
        kauntech: "AI OCR with AI enrichment (Intel / Fix / Strategy)",
        competitor:
          "No enrichment; manual entry is error-prone (typos, transposed digits)",
      },
      {
        dimension: "Current support",
        kauntech: "Actively developed",
        competitor:
          "CardScan is discontinued (support ended 2020); Neat has exited hardware",
      },
      {
        dimension: "Data privacy & DPDP",
        kauntech: "On-device, AES-256 local, DPDP Act 2023 aligned",
        competitor:
          "Varies — Neat pushes a cloud subscription (data off-device); manual depends where you type it; no DPDP focus",
      },
      {
        dimension: "Cost model",
        kauntech: "Free plan plus paid tiers in INR — no hardware to buy",
        competitor:
          "Upfront hardware cost (plus Neat's ongoing subscription); manual entry is \"free\" but costs staff time",
      },
      {
        dimension: "Lead routing",
        kauntech: "CRM, Google Sheets and WhatsApp in under 30 seconds",
        competitor: "Limited / legacy exports, or manual copy-paste",
      },
      {
        dimension: "Platforms",
        kauntech: "Android + iOS (mobile)",
        competitor: "Windows/macOS desktop (tethered), or any (manual)",
      },
    ],
    kauntechWins: [
      "Mobile and on-the-go — capture cards at the event, not back at a tethered desktop scanner.",
      "No bulky hardware or per-device cost, and no slow, error-prone manual typing.",
      "The leading legacy hardware is gone: CardScan is discontinued (support ended 2020) and Neat has exited the hardware business.",
      "Automated capture with AI OCR and AI enrichment, versus manual data entry.",
      "Direct CRM, Google Sheets and WhatsApp routing, plus on-device AES-256 storage aligned with the DPDP Act 2023.",
    ],
    competitorStrengths:
      "To be fair, some organisations still run legacy hardware scanners they already own, and a dedicated desktop scanner can be reliable for high-volume back-office batch scanning at a fixed desk. Manual entry, for its part, needs no software and gives a person full control over every field. Rather than replacing tools that still work for you, Kauntech is the modern, mobile, private option for capturing cards anywhere — especially now that CardScan is discontinued and Neat has left the hardware market.",
    faq: [
      {
        q: "Are CardScan and Neat still supported?",
        a: "CardScan is discontinued — DYMO ended technical support on 1 January 2020. Neat has exited the hardware business; its scanners are out of warranty and it has pivoted to a cloud subscription. Kauntech is an actively developed mobile app.",
      },
      {
        q: "Why use a phone app instead of a dedicated card scanner?",
        a: "Dedicated scanners are desk-tethered, so you can't capture cards on the go at an event or meeting, and they carry upfront hardware cost. Kauntech runs on the Android or iOS phone in your pocket, scanning and routing leads in under 30 seconds.",
      },
      {
        q: "Is Kauntech faster than typing cards into a CRM?",
        a: "Yes. Manual entry is one card at a time, error-prone and doesn't scale to events. Kauntech uses on-device AI OCR to capture the card and route it to your CRM, Google Sheets or WhatsApp in under 30 seconds.",
      },
      {
        q: "Is manual entry more private than an app?",
        a: "Manual entry keeps data wherever you type it, but that is ad-hoc and depends on the destination (often a cloud CRM or spreadsheet). Kauntech captures and stores cards on-device with AES-256 encryption, aligned with the DPDP Act 2023 — private by default, without the labour.",
      },
      {
        q: "Do I need to buy any hardware for Kauntech?",
        a: "No. Kauntech is a free-to-start app on Android and iOS — there is no scanner to buy or maintain.",
      },
    ],
  },
];

export function getCompetitor(slug: string): Competitor | undefined {
  return competitors.find((c) => c.slug === slug);
}
