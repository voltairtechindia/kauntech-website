/**
 * Enterprise quote endpoint consumed by app/enterprise/EnterpriseForm.tsx.
 *
 * POST /api/enterprise
 *   { name, work_email, company, phone?, seats, scans_per_user, intel_per_user?,
 *     needs?: string[], message?, source?, page_url?, website? }
 *   -> 200 { ok: true }
 *
 * Same shape as /api/contact — per-IP burst + daily limits, and a `website`
 * honeypot that real users never see, so a filled value is a bot and we
 * accept-and-drop rather than tipping it off. Submissions land in the app
 * project's `enterprise_enquiries` table via the service-role client.
 *
 * The indicative price is recomputed server-side from the submitted sliders
 * rather than trusted from the body: the client's number is only ever a
 * display, and storing a client-supplied figure would let anyone write their
 * own quote into our sales queue.
 */
import { NextResponse } from "next/server";

import {
  SEATS,
  SCANS,
  indicativeAnnualInr,
  insertEnterpriseEnquiry,
  sanitizeNeeds,
} from "@/lib/enterprise";
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

function clampInt(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number.parseInt(str(v), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const ip = getClientIp(req);

  const burst = await rlHit(
    `enterprise:burst:${ip}`,
    LIMITS.contactBurst.limit,
    LIMITS.contactBurst.windowSeconds,
  );
  if (!burst.allowed) {
    return NextResponse.json(
      { detail: "You're submitting too quickly. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds(burst.resetAt)) } },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  if (str(body.website)) {
    return NextResponse.json({ ok: true });
  }

  const name = str(body.name);
  const email = str(body.work_email) || str(body.email);
  const company = str(body.company);
  const phone = str(body.phone);
  const message = str(body.message);
  const pageUrl = str(body.page_url) || null;
  const source = str(body.source) === "app" ? "app" : "site";

  if (!name || name.length > 200) {
    return NextResponse.json(
      { detail: "Please tell us your name." },
      { status: 400 },
    );
  }
  if (!email || email.length > 320 || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { detail: "Please enter a valid work email." },
      { status: 400 },
    );
  }
  if (!company || company.length > 200) {
    return NextResponse.json(
      { detail: "Please tell us your company name." },
      { status: 400 },
    );
  }
  if (phone.length > 50 || message.length > 5000) {
    return NextResponse.json({ detail: "Phone or message is too long." }, { status: 400 });
  }

  const seats = clampInt(body.seats, SEATS.min, SEATS.max, SEATS.default);
  const scansPerUser = clampInt(body.scans_per_user, SCANS.min, SCANS.max, SCANS.default);
  const intelPerUser =
    body.intel_per_user == null ? null : clampInt(body.intel_per_user, 0, 1000, 75);

  const daily = await rlHit(
    `enterprise:day:${istDay()}:${ip}`,
    LIMITS.contactDaily.limit,
    LIMITS.contactDaily.windowSeconds,
  );
  if (!daily.allowed) {
    return NextResponse.json(
      {
        detail: `You've sent several enquiries today. Please email ${SUPPORT_EMAIL} directly, or try again tomorrow.`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds(daily.resetAt)) } },
    );
  }

  try {
    await insertEnterpriseEnquiry({
      name,
      work_email: email,
      company,
      phone: phone || null,
      seats,
      scans_per_user: scansPerUser,
      intel_per_user: intelPerUser,
      needs: sanitizeNeeds(body.needs),
      message: message || null,
      indicative_annual_inr: indicativeAnnualInr(seats, scansPerUser),
      source,
      page_url: pageUrl,
      user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
    });
  } catch (err) {
    console.error("[api/enterprise] insert failed:", (err as Error)?.message);
    return NextResponse.json(
      { detail: `Could not send your enquiry. Please email ${SUPPORT_EMAIL}.` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
