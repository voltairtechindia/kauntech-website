-- =====================================================================
-- Migration 0015: per-post FAQ
--
-- Adds a `faq` JSONB array to `blog_posts`. Each entry is a question/answer
-- pair authored alongside the article. Rendered as an accordion + FAQPage
-- JSON-LD on /blog/<slug> (answer-engine / GEO friendly), edited in the admin
-- PostEditor, and folded into the post's RAG embedding (doc_type "blog") so the
-- chatbot can answer the same questions directly.
--
-- Shape of each element (both fields required to survive normalisation):
--   { "q": "Does Kauntech work without internet?",
--     "a": "Yes — scanning and OCR run fully on-device; cloud sync is optional." }
-- =====================================================================

alter table blog_posts
    add column if not exists faq jsonb not null default '[]'::jsonb;
