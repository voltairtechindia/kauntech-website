/**
 * Public DPDP data-deletion endpoint consumed by components/DeletionForm.tsx.
 *
 * POST /api/delete-request  { full_name, email, scope, details?, consent,
 *                             website (honeypot), page_url? }
 *   -> 200 { ok: true, ticket }
 *
 * This is the Right-to-Erasure mechanism for KAUNTECH APP users (and what
 * Google checks for OAuth verification). The request is durably stored in
 * `data_deletion_requests` so the team can action the actual erasure against
 * the app backend. Same protections as the other public forms: per-IP rate
 * limit + honeypot + strict validation.
 */
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { insertDeletionRequest } from "@/lib/deletion";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SCOPES = new Set(["all", "oauth", "local", "support"]);

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function makeTicket(): string {
  // KNT-DEL-XXXXXXXX (8 hex chars from a UUID) — unique + human-quotable.
  return `KNT-DEL-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // Anti-flood burst limit (reuses the contact form's limits).
  const burst = await rlHit(
    `delete:burst:${ip}`,
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

  // Honeypot: silently accept bots without storing (return a throwaway ticket).
  if (str(body.website)) {
    return NextResponse.json({ ok: true, ticket: makeTicket() });
  }

  const fullName = str(body.full_name);
  const email = str(body.email);
  const scope = str(body.scope);
  const details = str(body.details);
  const consent = body.consent === true || str(body.consent) === "true";
  const pageUrl = str(body.page_url) || null;

  if (!fullName || fullName.length > 200) {
    return NextResponse.json(
      { detail: "Full name is required (1–200 characters)." },
      { status: 400 },
    );
  }
  if (!email || email.length > 320 || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { detail: "A valid registered email is required." },
      { status: 400 },
    );
  }
  if (!SCOPES.has(scope)) {
    return NextResponse.json(
      { detail: "Please select a valid erasure scope." },
      { status: 400 },
    );
  }
  if (details.length > 5000) {
    return NextResponse.json(
      { detail: "Details are too long (max 5000 characters)." },
      { status: 400 },
    );
  }
  if (!consent) {
    return NextResponse.json(
      { detail: "Please confirm you wish to delete the selected data." },
      { status: 400 },
    );
  }

  // Per-IP daily cap (only valid requests count).
  const daily = await rlHit(
    `delete:day:${istDay()}:${ip}`,
    LIMITS.contactDaily.limit,
    LIMITS.contactDaily.windowSeconds,
  );
  if (!daily.allowed) {
    return NextResponse.json(
      {
        detail: `You've submitted several requests today. Please email ${SUPPORT_EMAIL} directly, or try again tomorrow.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds(daily.resetAt)) },
      },
    );
  }

  const ticket = makeTicket();
  try {
    await insertDeletionRequest({
      ticket,
      full_name: fullName,
      email,
      scope,
      details: details || null,
      consent: true,
      page_url: pageUrl,
      user_agent: req.headers.get("user-agent"),
      ip,
    });
    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    console.error("[delete-request] insert failed", err);
    return NextResponse.json(
      {
        detail: `Could not submit your request. Please email ${SUPPORT_EMAIL} and we'll process it manually.`,
      },
      { status: 500 },
    );
  }
}
