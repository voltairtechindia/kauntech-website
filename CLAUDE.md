# Kauntech Website — CLAUDE.md

## Project Overview
Marketing website for **Kauntech** — an offline-first business card scanner app for Android/iOS. Built with Next.js 15 App Router + TypeScript. Deployed at `https://kauntech.com`.

Key product angle: 100% offline OCR, DPDP Act 2023 compliant, AI contact enrichment.

## Stack
- **Framework**: Next.js 15 (App Router), React 19, TypeScript 5
- **Styling**: Plain CSS (`globals.css`, `extra.css`) — no Tailwind, no CSS-in-JS
- **Icons**: Font Awesome 6 via CDN (loaded in `app/layout.tsx`)
- **No testing framework** currently set up

## Dev Commands
```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

## Project Structure
```
app/
  layout.tsx          # Root layout — metadata, OG tags, schema.org JSON-LD, Navbar+Footer
  page.tsx            # Home page (assembles section components)
  globals.css / extra.css
  compare/            # Compare page
  compliance/         # DPDP compliance page
  contact/            # Contact page
  features/           # Features page
  how-it-works/       # How it works page
  pricing/            # Pricing page
  privacy/            # Privacy policy
  terms/              # Terms of service
  delete-request/     # Data deletion request form
  robots.ts / sitemap.ts

components/
  Navbar.tsx
  Footer.tsx
  ScrollReveal.tsx    # Intersection Observer scroll animations
  FeatureModal.tsx    # Feature detail modal
  ChatWidget.tsx
  DeletionForm.tsx
  sections/
    Hero.tsx
    Features.tsx
    Pricing.tsx
    Workflow.tsx
    Compare.tsx
    Compliance.tsx
    Contact.tsx
```

## Key Conventions
- App Router pages: each route folder has a single `page.tsx`
- Section components live in `components/sections/`
- `SITE_URL = "https://kauntech.com"` is defined in `app/layout.tsx` — use this constant for any absolute URLs
- Schema.org JSON-LD is injected inline in the `<head>` via `layout.tsx`
- No environment variables currently in use on the frontend

## SEO / Metadata
- Metadata defined per-page using Next.js `export const metadata`
- Canonical URLs, OG tags, Twitter cards set in root layout
- `sitemap.ts` and `robots.ts` generate XML/txt dynamically

## Business Context
- Product: Kauntech Android/iOS app (business card scanner)
- Company: Kauntech Technologies Pvt. Ltd.
- Support email: voltairtechindia@gmail.com
- Plans: Free, Pro (₹499/mo), Enterprise (₹999/mo)
- Compliance: India DPDP Act 2023 is a key differentiator — handle carefully
