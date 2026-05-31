# Kauntech RAG Chatbot — setup

The site chatbot is now a real RAG assistant (grounded in Kauntech facts), built
into this Next.js app — **no separate backend/widget to host**. The old keyword
bot in `components/ChatWidget.tsx` was replaced; it now calls `POST /api/chat`.

```
ChatWidget ──POST /api/chat──▶ embed query (Gemini)
                               ──▶ match_documents (Supabase pgvector)
                               ──▶ Gemini grounded reply
                               ──▶ log conversation + after() analytics
```

## One-time setup

### 1. Supabase
Create a Supabase project. In the **SQL editor**, run the two migrations **in order**:
1. `supabase/migrations/0001_init.sql`  (pgvector, `documents`, `match_documents`, logging tables)
2. `supabase/migrations/0002_rls.sql`   (locks all tables; only the service key has access)

Grab `Project Settings → API`: the **Project URL** and the **service_role / secret key**.

### 2. Environment variables
Copy `.env.local.example` → `.env.local` for local dev, and set the same on Vercel
(**Project → Settings → Environment Variables**). All are server-side only:

| Var | Where to get it |
| --- | --- |
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API → service_role / secret key |
| `GOOGLE_API_KEY` | https://aistudio.google.com/apikey |
| `ADMIN_API_KEY` | any long random string — `openssl rand -hex 32` |

### 3. Seed the knowledge base
With the app running (`npm run dev`, or after deploy), load the built-in Kauntech KB:

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "X-Admin-Key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"seed": true}'
# -> { "ingested": N, "doc_types": { "plan": 5, "faq": 3, ... } }
```

Check counts any time: `curl -H "X-Admin-Key: $ADMIN_API_KEY" http://localhost:3000/api/ingest`

That's it — open the site and chat. The bot answers only from the knowledge base and
says "I'm not sure" + points to support when something isn't covered.

## Editing what the bot knows
Edit `lib/rag/data/knowledge-base.ts`, then re-run the seed call above (it upserts on
`doc_type + external_id`, so editing an entry updates it in place).

To tune behaviour: persona in `lib/rag/prompts.ts`; retrieval depth/threshold via
`RAG_TOP_K` / `RAG_MIN_SIMILARITY` env.

## Pushing docs from automation (n8n / blog)
`POST /api/ingest` (with `X-Admin-Key`) also accepts arbitrary documents:

```json
{ "documents": [
  { "doc_type": "blog", "external_id": "my-post-slug",
    "title": "Post title", "content": "Full post text to embed…",
    "metadata": { "url": "/blog/my-post-slug", "published": "2026-06-01" } }
] }
```

This is how the blog pipeline will keep the chatbot current — see the blog plan
(next phase) in `CLAUDE.md`.
