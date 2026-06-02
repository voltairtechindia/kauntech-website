/**
 * Public contact-form endpoint consumed by components/sections/Contact.tsx.
 *
 * POST /api/contact  { name, company?, phone?, email, message, page_url?, website? }
 *   -> 200 { ok: true }
 *
 * Submissions land in the `contact_submissions` table via the server-side
 * service-role client (RLS-protected; the browser never touches Supabase).
 * `website` is a honeypot — real users never see it, so a filled value is a bot
 * and we accept-and-drop (return 200 without storing) to avoid tipping it off.
 */
import { NextResponse } from "next/server";

import { insertContactSubmission } from "@/lib/contact";
import {
  LIMITS,
  SUPPORT_EMAIL,
  getClientIp,
  istDay,
  retryAfterSeconds,
  rlHit,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // Anti-flood burst limit (per IP).
  const burst = await rlHit(
    `contact:burst:${ip}`,
    LIMITS.contactBurst.limit,
    LIMITS.contactBurst.windowSeconds,
  );
  if (!burst.allowed) {
    return NextResponse.json(
      {
        detail:
          "You're submitting too quickly. Please wait a moment and try again.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds(burst.resetAt)) },
      },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  // Honeypot: silently accept bots without storing.
  if (str(body.website)) {
    return NextResponse.json({ ok: true });
  }

  const name = str(body.name);
  const company = str(body.company);
  const phone = str(body.phone);
  const email = str(body.email);
  const message = str(body.message);
  const pageUrl = str(body.page_url) || null;

  if (!name || name.length > 200) {
    return NextResponse.json(
      { detail: "name is required (1–200 characters)." },
      { status: 400 },
    );
  }
  if (!email || email.length > 320 || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { detail: "A valid email is required." },
      { status: 400 },
    );
  }
  if (!message || message.length > 5000) {
    return NextResponse.json(
      { detail: "message is required (1–5000 characters)." },
      { status: 400 },
    );
  }
  if (company.length > 200 || phone.length > 50) {
    return NextResponse.json(
      { detail: "company/phone too long." },
      { status: 400 },
    );
  }

  // Per-IP daily cap (only valid submissions count).
  const daily = await rlHit(
    `contact:day:${istDay()}:${ip}`,
    LIMITS.contactDaily.limit,
    LIMITS.contactDaily.windowSeconds,
  );
  if (!daily.allowed) {
    return NextResponse.json(
      {
        detail: `You've sent several messages today. Please email ${SUPPORT_EMAIL} directly, or try again tomorrow.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds(daily.resetAt)) },
      },
    );
  }

  try {
    await insertContactSubmission({
      name,
      company: company || null,
      phone: phone || null,
      email,
      message,
      page_url: pageUrl,
      user_agent: req.headers.get("user-agent"),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] insert failed", err);
    return NextResponse.json(
      { detail: "Could not submit. Please email business@voltairtech.com." },
      { status: 500 },
    );
  }
}
