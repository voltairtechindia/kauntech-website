-- =====================================================================
-- Migration 0019: FAQ pricing answer follows the yearly plans
--
-- Why: 2026-09-14 pricing change. Plans bill yearly only (Pro ₹1,499/year,
-- Ultra ₹2,499/year) and the Custom plan is now Enterprise, priced per user
-- with a 5 user minimum. 0017 seeded the monthly answer with
-- `on conflict (slug) do nothing`, so the live row is updated in place.
--
-- Guarded on the old monthly price, so an answer already rewritten in the
-- admin FAQ manager is left alone. Mirrors DEFAULT_FAQS in lib/faq/db.ts.
-- =====================================================================

update site_faqs
   set answer = 'Kauntech offers a free plan with 49 scans and 100 K-Tokens per month. Paid plans are billed yearly: Pro at ₹1,499/year and Ultra at ₹2,499/year, plus an Enterprise plan priced per user (5 user minimum).'
 where slug = 'how-much-does-kauntech-cost'
   and answer like '%₹499/month%';
