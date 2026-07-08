-- =====================================================================
-- Migration 0017: site-wide marketing FAQ (admin-editable)
--
-- Adds `site_faqs` — the question/answer pairs shown on the marketing FAQ
-- (homepage teaser + the dedicated /faq page) and emitted as FAQPage JSON-LD
-- for Google rich results / answer-engine (GEO) extraction.
--
-- Previously these lived as a hardcoded array in
-- components/sections/Faq.tsx (edit + redeploy). This table makes them
-- editable from kauntech-admin's FAQ manager, which writes through the
-- site's admin-gated POST /api/faq (same posture as the blog: the admin
-- proxies to the site so it can validate, keep the RAG store in sync, and
-- revalidate ISR).
--
-- Security posture matches the rest of the project: RLS is ON with NO
-- policies, so the anon/public key gets ZERO access. The Next.js server
-- reads + writes with the service-role key (which bypasses RLS).
--
-- Shape of one row (both question + answer required to survive normalise):
--   slug        stable URL-anchor + RAG external_id, derived from question
--   question    the question text
--   answer      the answer text (plain prose)
--   category    optional grouping label (e.g. "Privacy", "Pricing")
--   sort_order  manual display order (ascending); ties break on created_at
--   status      draft | published | archived  (only published is rendered)
-- =====================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

create table if not exists site_faqs (
    id           uuid        primary key default gen_random_uuid(),
    slug         text        not null unique,          -- anchor + RAG external_id
    question     text        not null,
    answer       text        not null,
    category     text,
    sort_order   int         not null default 0,
    status       text        not null default 'published'
                             check (status in ('draft', 'published', 'archived')),
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

-- Render query: published FAQs in manual order.
create index if not exists site_faqs_order_idx
    on site_faqs (status, sort_order, created_at);

-- keep updated_at fresh (reuses the helper from 0001_init.sql)
drop trigger if exists trg_site_faqs_updated_at on site_faqs;
create trigger trg_site_faqs_updated_at
    before update on site_faqs
    for each row execute function set_updated_at();

-- RLS ON, no policies -> anon/authenticated get zero access; service_role
-- bypasses RLS. The site renders FAQs server-side with the service-role key.
alter table site_faqs enable row level security;

-- ---------------------------------------------------------------------
-- Seed the 6 FAQs that were previously hardcoded in Faq.tsx, so the page
-- and its FAQPage JSON-LD keep working the moment this migration is applied.
-- Idempotent: re-running does nothing (slug is unique).
-- ---------------------------------------------------------------------
insert into site_faqs (slug, question, answer, category, sort_order, status) values
  (
    'what-is-kauntech',
    'What is Kauntech?',
    'Kauntech is an AI-powered business card scanner for Android and iOS with offline-first scanning. It uses on-device OCR to read visiting cards, enriches contacts with AI, and routes leads to your CRM, Google Sheets, or WhatsApp — in under 30 seconds. Cloud backup is optional and you choose what syncs.',
    'General',
    10,
    'published'
  ),
  (
    'does-kauntech-work-without-internet',
    'Does Kauntech work without internet?',
    'Yes. Kauntech is built offline-first — scanning, processing, and saving contacts all work with zero internet connection. A brief connection is only needed when you choose to sync to a CRM or run AI enrichment.',
    'Offline',
    20,
    'published'
  ),
  (
    'is-kauntech-dpdp-act-2023-compliant',
    'Is Kauntech DPDP Act 2023 compliant?',
    'Yes. All card processing happens on your device and your scanned contacts are never uploaded to Kauntech''s servers, satisfying the DPDP Act 2023 principle of data minimisation by design.',
    'Privacy',
    30,
    'published'
  ),
  (
    'where-is-my-scanned-contact-data-stored',
    'Where is my scanned contact data stored?',
    'On your device only, in AES-256 encrypted local storage. We do not save or store your scanned images or contact details on our servers.',
    'Privacy',
    40,
    'published'
  ),
  (
    'what-is-a-k-token',
    'What is a K-Token?',
    'A K-Token is Kauntech''s AI credit unit. Tokens power on-device AI features such as AI Intel enrichment, AI Fix, and AI Strategy, and are only consumed when you actively use an AI feature.',
    'K-Tokens',
    50,
    'published'
  ),
  (
    'how-much-does-kauntech-cost',
    'How much does Kauntech cost?',
    'Kauntech offers a free plan with 49 scans and 100 K-Tokens per month. Paid plans are Pro at ₹499/month and Ultra at ₹1,299/month, plus a Custom plan for enterprises. Annual billing is discounted (Pro ₹399/mo, Ultra ₹999/mo on annual).',
    'Pricing',
    60,
    'published'
  )
on conflict (slug) do nothing;
