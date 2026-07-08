# Kauntech — App Store Optimization (ASO) Metadata

**Status:** Ready to copy-paste into App Store Connect / Google Play Console
**Last updated:** 2026-07-08
**Scope:** Apple App Store + Google Play Store listings for the Kauntech mobile app (Android + iOS)

All character counts below were computed programmatically (Python `len()`) against the
exact copy shown — not eyeballed. Re-count before final submission if you edit any string,
since em dashes (—), the ₹ symbol, and curly apostrophes (') each count as a single
character but can behave inconsistently if you retype them in a different editor/font.

All claims are limited to verified product facts (offline OCR, DPDP Act 2023 compliance,
AES-256 local encryption, AI Intel/Fix/Strategy via K-Tokens, CRM/Sheets/WhatsApp routing,
published plan pricing). **No App Store/Play ranking claims, awards, or user-count claims
are used anywhere in this document** — none exist to cite truthfully yet.

---

## 1. Apple App Store

### App Name (Primary) — 27/30 characters
```
Kauntech: Offline Card Scan
```

### App Name (A/B Variant B — trust/compliance angle) — 25/30 characters
```
Kauntech - DPDP Card Scan
```

### Subtitle (Primary) — 22/30 characters
```
DPDP-Safe Lead Capture
```
No words are repeated from the App Name ("Kauntech", "Offline", "Card", "Scan" are all
absent here), so the two fields cover distinct search terms instead of wasting characters.

### Subtitle (A/B Variant B) — 25/30 characters
```
Instant Leads, Zero Cloud
```

### Promotional Text — 167/170 characters
*(Can be updated anytime in App Store Connect without a new app submission — good for
seasonal pushes, e.g. conference season, without waiting on review.)*
```
Scan visiting cards fully offline in seconds. DPDP-compliant, AES-256 encrypted on-device. Route leads to CRM, Sheets or WhatsApp in under 30s. Try Free — 49 scans/mo!
```

### Keywords Field — 99/100 characters (comma-separated, NO spaces after commas)
```
scanner,ocr,visiting,business,crm,whatsapp,export,contacts,privacy,india,network,sync,enrich,tokens
```
Deliberately excludes `card`, `offline`, `scan`, `lead`, `capture`, `dpdp` because those
words (and their auto-matched plurals) are already covered by the App Name and Subtitle —
Apple's search algorithm combines words across Name + Subtitle + Keywords, so repeating
them here would waste scarce character budget.

### Description — 2,744/4,000 characters
```
Kauntech is India's offline business card scanner — a visiting card scanner and OCR card scanner that works with zero internet, from the first scan to the final saved contact.

Most business card apps quietly upload your data to the cloud. Kauntech doesn't. Every scan runs through 100% offline OCR, fully on-device, and every contact is stored in AES-256 encrypted local storage — never uploaded to Kauntech servers. That's what DPDP compliant means in practice: your leads stay yours, in line with India's Digital Personal Data Protection Act 2023.

KEY FEATURES
- 100% Offline OCR: scan, extract, and save contacts with zero internet, from a trade show floor to a basement parking lot
- DPDP Act 2023 Compliant: scanned cards are never uploaded to Kauntech servers; AES-256 encryption protects every contact on your device
- AI Intel, AI Fix & AI Strategy: K-Token-powered AI enrichment cleans up messy OCR text, fills in missing details, and suggests a follow-up strategy for each lead
- Fast Lead Capture: route a captured contact to your CRM, Google Sheets, or WhatsApp in under 30 seconds
- Google Sheets Auto-Sync: an Apps Script integration keeps a live spreadsheet of every card you scan
- CRM Export via Webhook: push every lead straight into your CRM or automation stack, no manual re-entry
- Optional Cloud Backup: fully opt-in — you choose exactly what syncs, nothing leaves your device unless you say so
- Built for India: designed around real conference, exhibition, and field-sales workflows

HOW IT WORKS
1. Point your camera at a business card — this is your visiting card scanner in action
2. Offline OCR extracts name, company, phone, email, and title in seconds
3. AI Intel enriches and corrects the raw text using K-Tokens
4. Route the finished contact to your CRM, Sheets, or WhatsApp — capture never needs an internet connection

PERFECT FOR
- Sales teams doing lead capture at trade shows and exhibitions with patchy or no Wi-Fi
- Founders and consultants who network across cities and don't want cards piling up in a drawer
- Privacy-conscious teams that need a DPDP-compliant business card reader offline for client data
- Anyone who wants a fast OCR card scanner that turns a stack of cards into clean, exportable contacts

PLANS
- Free: ₹0/mo — 49 scans + 100 K-Tokens every month
- Pro: ₹499/mo (₹399/mo billed annually)
- Ultra: ₹1,299/mo (₹999/mo billed annually)
- Custom: enterprise pricing — contact sales
- K-Token top-ups: 200 tokens/₹99 · 600/₹249 · 1,500/₹549 · 4,000/₹1,299

Download Kauntech and turn every business card into a clean, exportable contact — fully offline, fully DPDP-compliant.

Company: Kauntech Technologies Pvt. Ltd.
Website: https://www.kauntech.com
Support: business@voltairtech.com
```

### Apple implementation notes
1. App Store Connect → My Apps → Kauntech → App Information / Version Information.
2. Name and Subtitle changes ship with the **next app version** (review required).
3. Promotional Text and Keywords can be edited **without** a new build/version.
4. Paste the Keywords field exactly as shown — App Store Connect will reject it if it
   detects spaces after commas, and every character you save beyond the limit is silently
   truncated (so validate the 99/100 count again if you touch it).

---

## 2. Google Play Store

> Note: Google Play's actual title limit is 50 characters. Per this brief's spec the
> primary Title below is held to the same ≤30-char limit as Apple for brand consistency
> across stores. An **optional extended variant** using the full 50-char allowance is
> included at the end of this section if you want extra keyword coverage on Android only
> (Google has no separate keyword field, so title + description are the entire signal).

### Title (Primary) — 27/30 characters
```
Kauntech: Offline Card Scan
```

### Title (A/B Variant B — OCR/technical angle) — 28/30 characters
```
Kauntech - Business Card OCR
```

### Short Description — 79/80 characters
*(This is what shows in Play Store search results — it drives click-through as much as
the title does.)*
```
Scan visiting cards offline. DPDP-safe AI capture, instant CRM/WhatsApp export.
```

### Full Description — 2,910/4,000 characters
**First-3-lines check:** the opening paragraph below is 150 characters — short enough to
read as a complete, compelling hook on its own before the "…Read more" fold on a typical
phone (exact cutoff varies by device/font size, so 150 chars gives margin under even a
tight ~3-line/160-character cutoff).
```
Kauntech is India's offline business card scanner. 100% offline OCR, DPDP-compliant AES-256 storage, and instant lead routing to your CRM or WhatsApp.

No internet connection is required to scan, process, or save a contact — Kauntech is a true offline business card reader from the ground up, not an online scanner with a spotty offline mode bolted on.

KEY FEATURES
- 100% Offline OCR — scan, extract, and save contacts with zero internet, anywhere
- DPDP Act 2023 Compliant — scanned cards are never uploaded to Kauntech servers; AES-256 encryption protects every contact on your device
- AI Intel, AI Fix & AI Strategy — K-Token-powered AI enrichment cleans up messy OCR text, fills in missing details, and suggests a follow-up strategy for each lead
- Fast Lead Capture — route a captured contact to your CRM, Google Sheets, or WhatsApp in under 30 seconds
- Google Sheets Auto-Sync — an Apps Script integration keeps a live spreadsheet of every card you scan
- CRM Export via Webhook — push every lead straight into your CRM or automation stack, no manual re-entry
- Optional Cloud Backup — fully opt-in, you choose exactly what syncs, nothing leaves your device unless you say so
- Built for India — designed around real conference, exhibition, and field-sales workflows

WHY KAUNTECH
Most business card apps quietly upload your data to the cloud for OCR processing. Kauntech doesn't. Every scan runs entirely on-device, so it works in basements, flights, and remote job sites where a business card scanner offline isn't a nice-to-have, it's the only thing that works. Contacts are stored in AES-256 encrypted local storage, never on Kauntech servers — a real, working definition of DPDP compliant, not just a checkbox.

HOW IT WORKS
1. Point your camera at a business card — Kauntech is your visiting card scanner
2. Offline OCR extracts name, company, phone, email, and title in seconds
3. AI Intel enriches and corrects the raw text using K-Tokens
4. Route the finished contact to your CRM, Sheets, or WhatsApp

PERFECT FOR
- Sales teams doing lead capture at trade shows and exhibitions with patchy or no Wi-Fi
- Founders and consultants who network across cities and don't want cards piling up in a drawer
- Privacy-conscious teams that need a DPDP-compliant business card reader offline for client data
- Anyone who wants a fast OCR card scanner that turns a stack of cards into clean, exportable contacts

PLANS
- Free: ₹0/mo — 49 scans + 100 K-Tokens every month
- Pro: ₹499/mo (₹399/mo billed annually)
- Ultra: ₹1,299/mo (₹999/mo billed annually)
- Custom: enterprise pricing — contact sales
- K-Token top-ups: 200 tokens/₹99 · 600/₹249 · 1,500/₹549 · 4,000/₹1,299

Download Kauntech and turn every business card into a clean, exportable contact — fully offline, fully DPDP-compliant.

Company: Kauntech Technologies Pvt. Ltd.
Website: https://www.kauntech.com
Support: business@voltairtech.com
```

### Optional: extended Title using Play's real 50-char limit — 46/50 characters
```
Kauntech - Offline Business Card Scanner & OCR
```

### Google implementation notes
1. Play Console → your app → Store presence → Main store listing.
2. Title/Short description/Full description changes go live in **1–2 hours**, no app
   binary update or review needed.
3. Google has no dedicated keyword field — it parses Title + Full Description, which is
   why the primary keywords are front-loaded into the first 150 characters above.

---

## 3. Prioritized Keyword Table

| Keyword | Rationale | Est. relevance |
|---|---|---|
| offline business card scanner | Core USP and the exact phrase matching Kauntech's #1 differentiator (true offline OCR); used in both titles/descriptions | High |
| DPDP compliant | Unique, low-competition trust signal for the India market; directly maps to a named product fact (DPDP Act 2023) | High |
| visiting card scanner | The common India-English phrasing for "business card"; captures a large slice of local search volume the English-only term misses | High |
| business card reader offline | Long-tail variant of the primary keyword; captures "reader" intent searches distinct from "scanner" intent | High |
| WhatsApp lead | India-specific behavior — WhatsApp is the dominant lead follow-up channel locally; matches the real WhatsApp export feature | Medium-High |
| India | Localizes relevance for India App Store/Play Store searches and reinforces the "built for India" positioning | Medium-High |
| OCR card scanner | Technical/feature-based term that captures users searching by underlying technology rather than use case | Medium |
| lead capture | Broader B2B/sales-tool category term; adjacent search intent from sales/CRM-tool shoppers rather than "scanner app" shoppers | Medium |
| CRM export | Integration-focused term appealing to sales teams evaluating workflow/automation fit before installing | Medium |
| K-Tokens / AI enrichment | Bonus, brand-specific term — low search volume today but worth owning early since it's unique to Kauntech's AI Intel/Fix/Strategy features | Low-Medium (opportunistic) |
| AES-256 encryption | Bonus, trust/security long-tail term for privacy-conscious searchers; supports the DPDP-compliant positioning | Low (opportunistic) |

---

## 4. A/B Test Variants — App Name / Title

| Slot | Variant A (Primary — feature-forward) | Variant B (Alternate — trust/technical-forward) | Hypothesis being tested |
|---|---|---|---|
| Apple App Name | `Kauntech: Offline Card Scan` (27/30) | `Kauntech - DPDP Card Scan` (25/30) | Does leading with the offline capability ("Offline") out-convert leading with the compliance/trust angle ("DPDP") for install rate? |
| Google Title | `Kauntech: Offline Card Scan` (27/30) | `Kauntech - Business Card OCR` (28/30) | Does the offline benefit out-convert the technical "OCR" keyword for tap-through in Play search results? |

Run these through Apple's **Product Page Optimization** and Google Play's **Store
listing experiments**, 50/50 split, minimum ~7–14 days or 1,000+ impressions per variant
before calling a winner (align with your actual traffic volume).

---

## 5. What to Change First (Checklist)

- [ ] **Ship the Keywords field + Promotional Text now** — both update without an app
      review, so there's no reason to wait for the next release to capture
      "offline business card scanner" / "DPDP compliant" search traffic.
- [ ] **Validate every field live in App Store Connect / Play Console** before saving —
      re-run a character count in the actual console UI, since ₹, —, and ' can be
      auto-converted differently by different keyboards/editors.
- [ ] **Start the App Name/Title A/B test** (Section 4) before touching anything else
      visual — title/name changes have outsized leverage on conversion relative to effort.
- [ ] **Confirm the first 1–2 screenshots visually reinforce "100% offline" and
      "DPDP compliant"** — the text metadata alone can't carry that message if the
      screenshots don't back it up.
- [ ] **Re-seed/update this doc whenever pricing or plan names change** (Free/Pro/Ultra/
      Custom figures and K-Token pack pricing appear in both descriptions) — the plan
      facts here must stay in sync with the in-app paywall, same rule as the RAG
      knowledge base.
- [ ] **Track ranking movement for the 4–5 "High" relevance keywords** (Section 3) 2–4
      weeks post-submission to confirm the Keywords field / title choices are working
      before investing further copy iterations.
