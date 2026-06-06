/**
 * Kauntech knowledge base — the grounding for the RAG chatbot.
 *
 * Every entry is one row in the `documents` table, distinguished by `doc_type`.
 * `content` is the natural-language text that gets embedded and retrieved;
 * `metadata` keeps the structured fields. The assistant may only state facts
 * that appear here, so keep this accurate and grow it over time.
 *
 * Re-ingest after editing: POST /api/ingest  { "seed": true }  with X-Admin-Key.
 * (The blog/n8n pipeline will push `doc_type: "blog"` entries through the same
 *  /api/ingest endpoint so the bot learns new posts automatically.)
 *
 * Source of truth: the live kauntech.com sections (Pricing, Features, Workflow,
 * Compliance, FAQ) as of this writing.
 */
import type { IngestDocument } from "../types";

export const KNOWLEDGE_BASE: IngestDocument[] = [
  // --- Company ------------------------------------------------------------
  {
    doc_type: "company",
    external_id: "ABOUT-01",
    title: "What is Kauntech?",
    content:
      "Kauntech is an AI-powered business card scanner app for Android and iOS that works 100% offline. " +
      "It uses on-device OCR to read visiting cards, enriches contacts with AI, and routes leads to your CRM, " +
      "Google Sheets, Gmail, WhatsApp or Telegram — in under 30 seconds. It is built by Kauntech Technologies " +
      "Pvt. Ltd. (Mumbai, India). Kauntech is positioned as India's first 100% offline AI business card scanner " +
      "and is fully compliant with India's Digital Personal Data Protection (DPDP) Act 2023. " +
      "Support email: business@voltairtech.com.",
    metadata: {
      company: "Kauntech Technologies Pvt. Ltd.",
      platforms: ["Android", "iOS"],
      support_email: "business@voltairtech.com",
      location: "Mumbai, India",
    },
  },
  {
    doc_type: "company",
    external_id: "WORKFLOW-01",
    title: "How Kauntech works — 3 steps in 30 seconds",
    content:
      "Kauntech turns a physical card into a synced, enriched contact in about 30 seconds in three steps. " +
      "Step 1 CAPTURE: scan a physical card via OCR, scan a QR code, tap NFC, or type manually — works 100% offline " +
      "with zero lag. Step 2 ENRICH: Kauntech AI adds company intelligence, lead scoring and personalised icebreakers " +
      "on-device. Step 3 AUTOMATE: instantly route the enriched contact to WhatsApp, an email draft, Google Sheets or a " +
      "webhook automatically.",
    metadata: { steps: ["capture", "enrich", "automate"] },
  },

  // --- Offline / core architecture ---------------------------------------
  {
    doc_type: "feature",
    external_id: "FEAT-OFFLINE",
    title: "100% Offline Mode",
    content:
      "Kauntech is offline-first: scanning, OCR processing and saving contacts all work with zero internet connection — " +
      "ideal for remote sites, basement conference halls and flights. All sensitive contact data stays encrypted on your " +
      "device in local storage. Smart Sync automatically queues changes and backs them up to the cloud the moment the " +
      "network returns. A brief connection is only needed when you choose to sync to a CRM or run an AI feature. You can " +
      "also record offline audio notes (voice memos) right after a pitch.",
    metadata: {
      tags: ["offline", "ocr", "local storage", "smart sync", "audio notes"],
    },
  },
  {
    doc_type: "feature",
    external_id: "FEAT-CAPTURE",
    title: "Capture methods (OCR, QR, NFC, manual)",
    content:
      "Kauntech offers four ways to capture contact information: Business Card OCR (point-and-shoot AI recognition), " +
      "QR Code Scanner (instant digital card capture), NFC Tap (tap phone to exchange details), and Manual Entry " +
      "(full keyboard input with custom fields).",
    metadata: { methods: ["ocr", "qr", "nfc", "manual"] },
  },
  {
    doc_type: "feature",
    external_id: "FEAT-AI-ENRICH",
    title: "AI Enrichment (Company Intel, Lead Scoring, Icebreakers)",
    content:
      "Kauntech AI turns raw contact details into actionable intelligence: Company Intel (founders, industry and size), " +
      "Lead Scoring (prioritise hot leads), AI-generated Icebreakers (conversation starters), and Email Openers " +
      "(personalised cold-email templates). These AI features consume K-Tokens.",
    metadata: { tags: ["ai", "enrichment", "lead scoring", "icebreakers"] },
  },
  {
    doc_type: "feature",
    external_id: "FEAT-AUTOMATION",
    title: "Multi-channel automation & output channels",
    content:
      "Set post-scan automation rules once and Kauntech routes enriched contacts to your tools instantly: WhatsApp " +
      "(direct team/group chat routing), Email (auto-composed personalised drafts), Google Sheets (real-time sync), " +
      "Webhook (connect to any CRM or ERP), and Telegram (dedicated bot integration for instant notifications). " +
      "Exports include CSV and VCard.",
    metadata: {
      channels: ["whatsapp", "email", "google sheets", "webhook", "telegram"],
      exports: ["csv", "vcard"],
    },
  },
  {
    doc_type: "feature",
    external_id: "FEAT-CUSTOM",
    title: "Brand customisation",
    content:
      "Kauntech lets you tailor the experience to your brand: Custom QR Logo (brand your digital QR codes), Custom QR " +
      "Links (personalised short URLs), and reusable message Templates for frequently used messages.",
    metadata: { tags: ["branding", "qr", "templates"] },
  },
  {
    doc_type: "feature",
    external_id: "FEAT-LANG",
    title: "Multi-language translation (Coming Soon)",
    content:
      "Multi-language support is Coming Soon and currently under development, powered by emerging Indian LLMs. Planned " +
      "capabilities: scan cards in different languages, auto-translate to English instantly, and Smart Reply (send mail/" +
      "WhatsApp in English or reply in the original language). The Ultra plan lists 10+ Indian languages support. Treat " +
      "language/translation as upcoming, not available today.",
    metadata: { status: "coming_soon", tags: ["translation", "languages"] },
  },

  // --- Pricing / plans ----------------------------------------------------
  {
    doc_type: "plan",
    external_id: "PLAN-FREE",
    title: "Free plan (₹0 / forever)",
    content:
      "Free plan: ₹0 forever. For individual professionals exploring offline business card scanning. Includes 49 scans, " +
      "50 K-Tokens, 2 Products, 1 VCard export, CSV export, Webhook & WhatsApp Sync, and 100% Offline Mode.",
    metadata: {
      name: "Free",
      price_monthly: "₹0",
      scans: 49,
      k_tokens: 50,
    },
  },
  {
    doc_type: "plan",
    external_id: "PLAN-PRO",
    title: "Pro plan (₹499 / month, ₹399 / month annual)",
    content:
      "Pro plan: ₹499 per month, or ₹399 per month on annual billing (₹4,788 billed annually). For active sales " +
      "professionals who want AI enrichment and CRM automations. Includes 500 scans per month, 1,000 K-Tokens (1,250 on " +
      "annual), AI Intel (2 tokens per scan), AI Fix (1 token per fix), 4 Products and 4 Templates, Google Sheets & Gmail " +
      "sync, Telegram bot integration, and Webhook & WhatsApp automation.",
    metadata: {
      name: "Pro",
      price_monthly: "₹499",
      price_annual_monthly: "₹399",
      price_annual_total: "₹4,788",
      scans: 500,
      k_tokens: 1000,
    },
  },
  {
    doc_type: "plan",
    external_id: "PLAN-ULTRA",
    title: "Ultra plan (₹1,299 / month, ₹999 / month annual)",
    content:
      "Ultra plan: ₹1,299 per month, or ₹999 per month on annual billing (₹11,988 billed annually). The enterprise suite. " +
      "Includes 1,500 scans per month, 3,000 K-Tokens (1,250 per month on annual), AI Strategy (6 tokens per scan), 10+ " +
      "Indian languages support, Multi-User Team Collaboration, and Dedicated VIP Support. AR Business Card and NFC Card " +
      "Integration are listed as Coming Soon.",
    metadata: {
      name: "Ultra",
      price_monthly: "₹1,299",
      price_annual_monthly: "₹999",
      price_annual_total: "₹11,988",
      scans: 1500,
      k_tokens: 3000,
    },
  },
  {
    doc_type: "plan",
    external_id: "PLAN-CUSTOM",
    title: "Custom / Enterprise plan (Let's talk)",
    content:
      "Custom plan: contact sales (\"Let's Talk\" pricing). For large corporations needing white-labeling, custom LLMs or " +
      "massive event capacity. Includes Unlimited Scans & Tokens, On-Premise Storage options, Custom Hardware " +
      "Integrations, an Advanced Analytics Dashboard, a dedicated Account Manager, and complete White Labeling. " +
      "Contact business@voltairtech.com to discuss.",
    metadata: { name: "Custom", price: "custom" },
  },
  {
    doc_type: "plan",
    external_id: "PLAN-BILLING",
    title: "Billing & annual discount",
    content:
      "Kauntech offers monthly and annual billing. Annual billing saves about 20–23%: Pro is ₹399/month (₹4,788/year, vs " +
      "₹499/month monthly) and Ultra is ₹999/month (₹11,988/year, vs ₹1,299/month monthly) on annual plans. Token top-ups " +
      "are available anytime when you run low.",
    metadata: { tags: ["billing", "annual", "discount", "top-up"] },
  },

  // --- K-Tokens -----------------------------------------------------------
  {
    doc_type: "feature",
    external_id: "TOKEN-OVERVIEW",
    title: "K-Tokens — Kauntech's AI credit unit",
    content:
      "A K-Token is Kauntech's AI credit unit. Tokens power on-device AI features and are only consumed when you actively " +
      "use an AI feature. When a plan's scan limit is exhausted, additional scans can also consume tokens flexibly. " +
      "The three AI features and their costs are: AI Fix — 1 token per use (Pro tier; automated contact-formatting fixes); " +
      "AI Intel — 2 tokens per scan (Pro tier; deep company intelligence enrichment); AI Strategy — 6 tokens per scan " +
      "(Ultra tier; comprehensive sales strategies and icebreakers). Example balances: 1,000 K-Tokens can run up to 1,000 " +
      "AI Fixes or enrich up to 500 cards with AI Intel; 3,000 K-Tokens can generate up to 500 AI Strategy outputs.",
    metadata: {
      ai_fix: "1 token/use",
      ai_intel: "2 tokens/scan",
      ai_strategy: "6 tokens/scan",
    },
  },
  {
    doc_type: "plan",
    external_id: "TOKEN-TOPUP",
    title: "K-Token top-up packs (one-time recharge: ₹99–₹1,299)",
    content:
      "When you run low on K-Tokens you can buy one-time top-up packs anytime to recharge your balance — these are " +
      "consumable in-app purchases that do not auto-renew, and larger packs cost less per token. The four packs are: " +
      "200 K-Tokens for ₹99, 600 K-Tokens for ₹249, 1,500 K-Tokens for ₹549, and 4,000 K-Tokens for ₹1,299 (the best " +
      "value per token). Top-up packs are available on any paid plan and are separate from your monthly/annual plan " +
      "allocation. All prices are in Indian Rupees (INR).",
    metadata: {
      tags: ["top-up", "topup", "tokens", "recharge", "k-tokens", "in-app purchase"],
      packs: [
        { tokens: 200, price: "₹99" },
        { tokens: 600, price: "₹249" },
        { tokens: 1500, price: "₹549" },
        { tokens: 4000, price: "₹1,299" },
      ],
      currency: "INR",
    },
  },

  // --- Compliance ---------------------------------------------------------
  {
    doc_type: "compliance",
    external_id: "DPDP-01",
    title: "DPDP Act 2023 compliance",
    content:
      "Kauntech is engineered to fully adhere to India's Digital Personal Data Protection (DPDP) Act 2023. Card processing " +
      "happens on your device and your scanned contacts are never uploaded to Kauntech's servers, satisfying the DPDP " +
      "principle of data minimisation by design. Key guarantees: Informed Consent Architecture (data is never captured or " +
      "synced without explicit, recorded user consent), Local On-Device Processing (OCR and initial AI enrichment run on " +
      "your smartphone), Enterprise-Grade Encryption (data at rest and in transit secured with AES-256), and Complete User " +
      "Ownership (users and leads can request data deletion or export at any time).",
    metadata: { tags: ["dpdp", "privacy", "consent", "aes-256", "compliance"] },
  },
  {
    doc_type: "compliance",
    external_id: "DPDP-LEDGER",
    title: "What data Kauntech records (audit ledger)",
    content:
      "For regulatory compliance, trial-session management and informed consent, Kauntech records a minimal audit ledger: " +
      "Name (user/lead identification), Company name (B2B context & enrichment), Phone number (WhatsApp automation routing), " +
      "Email (email follow-up & account ID), Scans (usage tracking & quota), Device Details (anti-tamper tracking to detect " +
      "jailbreaks & unauthorised hacks), and Plan (Free, Pro, Ultra or Custom). Scanned card images and full contact details " +
      "are NOT stored on Kauntech's servers — they stay encrypted on your device.",
    metadata: { tags: ["audit ledger", "data schema", "dpdp"] },
  },
  {
    doc_type: "compliance",
    external_id: "DATA-STORAGE",
    title: "Where scanned data is stored",
    content:
      "Your scanned contact data is stored on your device only, in AES-256 encrypted local storage. Kauntech does not save " +
      "or store your scanned images or contact details on its servers. Your data belongs to you and stays on your device " +
      "until you choose to sync it to your own CRM, Google Sheets or other channel.",
    metadata: { tags: ["storage", "encryption", "privacy", "on-device"] },
  },

  // --- FAQs (mirror the on-site FAQ) --------------------------------------
  {
    doc_type: "faq",
    external_id: "FAQ-OFFLINE",
    title: "Does Kauntech work without internet?",
    content:
      "Yes. Kauntech is built offline-first — scanning, processing and saving contacts all work with zero internet " +
      "connection. A brief connection is only needed when you choose to sync to a CRM or run AI enrichment.",
    metadata: { category: "offline" },
  },
  {
    doc_type: "faq",
    external_id: "FAQ-COST",
    title: "How much does Kauntech cost?",
    content:
      "Kauntech offers a free plan with 49 scans and 50 K-Tokens. Paid plans are Pro at ₹499/month and Ultra at " +
      "₹1,299/month, plus a Custom plan for enterprises. Annual billing is discounted (Pro ₹399/month, Ultra ₹999/month).",
    metadata: { category: "pricing" },
  },
  {
    doc_type: "faq",
    external_id: "FAQ-GET-STARTED",
    title: "How do I get started with Kauntech?",
    content:
      "Download the Kauntech app on Android or iOS and start on the Free plan (49 scans, 50 K-Tokens, 100% offline). You " +
      "can upgrade to Pro or Ultra anytime for more scans, K-Tokens and AI features. For enterprise needs (white-labeling, " +
      "on-premise storage, custom LLMs), contact the team at business@voltairtech.com.",
    metadata: { category: "get_started" },
  },

  // --- Pre-launch rewards -------------------------------------------------
  {
    doc_type: "company",
    external_id: "REWARDS-01",
    title: "Pre-launch rewards",
    content:
      "Exclusive pre-launch rewards: the first 1,000 downloads within the first 15 days instantly unlock a 7-Day Pro Trial " +
      "fully equipped with AI Intel enrichment. The first 100 Reddit reviewers who share a genuine review on r/Kauntech earn " +
      "an elite 14-Day Pro/Ultra upgrade.",
    metadata: { tags: ["rewards", "launch", "trial", "reddit"] },
  },
];
