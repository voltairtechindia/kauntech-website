/**
 * Enterprise quote endpoint consumed by app/enterprise/EnterpriseForm.tsx.
 *
 * POST /api/enterprise
 *   { name, work_email, company, phone?, seats, scans_per_user | unlimited_scans,
 *     intel_per_user?, strategy_per_user?, needs?: string[], message?, source?,
 *     page_url?, website? }
 *   -> 200 { ok: true }
 *
 * Same shape as /api/contact — per-IP burst + daily limits, and a `website`
 * honeypot that real users never see, so a filled value is a bot and we
 * accept-and-drop rather than tipping it off. Submissions land in the app
 * project's `enterprise_enquiries` table via the service-role client.
 *
 * Limits are deliberately tighter than the contact form (2 per 5 minutes, 5 a
 * day per IP): a real team submits one of these, so a higher ceiling only ever
 * buys a bot room to fill the sales queue.
 */
import { NextResponse } from "next/server";

import {
  INTEL,
  SEATS,
  SCANS,
  STRATEGY,
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

/**
 * Parse one of the typed-in numbers. Returns null when the field is blank or
 * not a number at all — the caller decides whether that is fatal (seats, scans)
 * or simply absent (Intel, Strategy). Values outside the range are clamped
 * rather than rejected, so a stray extra zero still produces a workable lead.
 */
function intIn(v: unknown, lo: number, hi: number): number | null {
  if (v == null) return null;
  const raw = typeof v === "number" ? v : Number.parseInt(str(v).replace(/[,\s]/g, ""), 10);
  if (!Number.isFinite(raw)) return null;
  return Math.min(hi, Math.max(lo, Math.round(raw)));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const ip = getClientIp(req);

  const burst = await rlHit(
    `enterprise:burst:${ip}`,
    LIMITS.enterpriseBurst.limit,
    LIMITS.enterpriseBurst.windowSeconds,
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

  const seats = intIn(body.seats, SEATS.min, SEATS.max);
  if (seats == null) {
    return NextResponse.json(
      { detail: `Please enter how many users you need (minimum ${SEATS.min}).` },
      { status: 400 },
    );
  }
  // A team that wants the cap gone has no number to give, so the tick box
  // stands in for it: one of the two must be present, never neither.
  const unlimitedScans = body.unlimited_scans === true;
  const scansPerUser = unlimitedScans ? 0 : intIn(body.scans_per_user, SCANS.min, SCANS.max);
  if (scansPerUser == null) {
    return NextResponse.json(
      { detail: "Please enter how many scans each user needs per year, or tick unlimited." },
      { status: 400 },
    );
  }
  // Both AI allowances are optional — a team that has not thought about them
  // yet should still be able to ask for a quote.
  const intelPerUser = intIn(body.intel_per_user, INTEL.min, INTEL.max);
  const strategyPerUser = intIn(body.strategy_per_user, STRATEGY.min, STRATEGY.max);

  const daily = await rlHit(
    `enterprise:day:${istDay()}:${ip}`,
    LIMITS.enterpriseDaily.limit,
    LIMITS.enterpriseDaily.windowSeconds,
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
      unlimited_scans: unlimitedScans,
      intel_per_user: intelPerUser,
      strategy_per_user: strategyPerUser,
      needs: sanitizeNeeds(body.needs),
      message: message || null,
      // No figure is shown to the user any more, so none is recorded.
      indicative_annual_inr: null,
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
