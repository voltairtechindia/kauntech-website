/**
 * Public job-application endpoint consumed by components/CareerForm.tsx.
 *
 * POST /api/careers/apply  (multipart/form-data)
 *   fields: full_name, email, phone?, location?, linkedin_url?, portfolio_url?,
 *           years_experience?, job_slug?, job_title?, cover_note?, consent,
 *           website (honeypot), resume (File: PDF or DOCX, <= 10 MB)
 *   -> 200 { ok: true, id }
 *
 * The resume is stored in the PRIVATE `resumes` bucket and the row is inserted
 * immediately (fast ack). AI parsing + embedding then run in an after() callback
 * so a slow/failed Gemini call never blocks or breaks the candidate's submit
 * (mirrors the analytics pattern in app/api/chat/route.ts).
 */
import { randomUUID } from "node:crypto";

import { after, NextResponse } from "next/server";

import { getJob, insertApplication } from "@/lib/careers/db";
import { runParse } from "@/lib/careers/parse";
import { uploadResume } from "@/lib/careers/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Resolve { mime, ext } for an upload. Browsers usually set file.type, but some
 * send an empty/generic type for .docx — fall back to the filename extension so
 * legitimate Word resumes aren't rejected. Returns null for anything else.
 */
function resolveType(file: File): { mime: string; ext: string } | null {
  if (file.type === PDF_MIME) return { mime: PDF_MIME, ext: "pdf" };
  if (file.type === DOCX_MIME) return { mime: DOCX_MIME, ext: "docx" };
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return { mime: PDF_MIME, ext: "pdf" };
  if (name.endsWith(".docx")) return { mime: DOCX_MIME, ext: "docx" };
  return null;
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { detail: "Expected a multipart form." },
      { status: 400 },
    );
  }

  // Honeypot: silently accept bots without storing.
  if (str(form.get("website"))) {
    return NextResponse.json({ ok: true });
  }

  const fullName = str(form.get("full_name"));
  const email = str(form.get("email"));
  const phone = str(form.get("phone"));
  const location = str(form.get("location"));
  const linkedin = str(form.get("linkedin_url"));
  const portfolio = str(form.get("portfolio_url"));
  const coverNote = str(form.get("cover_note"));
  const jobSlug = str(form.get("job_slug"));
  const consent = str(form.get("consent"));
  const yearsRaw = str(form.get("years_experience"));

  if (!fullName || fullName.length > 200) {
    return NextResponse.json(
      { detail: "Full name is required (1–200 characters)." },
      { status: 400 },
    );
  }
  if (!email || email.length > 320 || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { detail: "A valid email is required." },
      { status: 400 },
    );
  }
  if (!consent) {
    return NextResponse.json(
      { detail: "Please consent to your resume being processed for recruitment." },
      { status: 400 },
    );
  }

  const years = yearsRaw ? Number(yearsRaw) : null;
  const yearsExperience =
    years != null && Number.isFinite(years) && years >= 0 && years < 80
      ? years
      : null;

  // Resume file.
  const file = form.get("resume");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { detail: "Please attach your resume (PDF or DOCX)." },
      { status: 400 },
    );
  }
  const resolved = resolveType(file);
  if (!resolved) {
    return NextResponse.json(
      { detail: "Resume must be a PDF or DOCX file." },
      { status: 400 },
    );
  }
  const { mime, ext } = resolved;
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { detail: "Resume exceeds the 10 MB limit." },
      { status: 400 },
    );
  }

  // Resolve the role (if applying to a specific opening).
  let jobId: string | null = null;
  let jobTitle = str(form.get("job_title")) || null;
  if (jobSlug) {
    try {
      const job = await getJob(jobSlug);
      if (job) {
        jobId = job.id;
        jobTitle = job.title;
      }
    } catch (err) {
      console.error("[careers] job lookup failed", err);
    }
  }

  const path = `applications/${new Date().getFullYear()}/${randomUUID()}.${ext}`;

  let applicationId: string;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    await uploadResume(path, buf, mime);
    applicationId = await insertApplication({
      job_id: jobId,
      job_title: jobTitle,
      full_name: fullName,
      email,
      phone: phone || null,
      location: location || null,
      linkedin_url: linkedin || null,
      portfolio_url: portfolio || null,
      years_experience: yearsExperience,
      cover_note: coverNote || null,
      resume_path: path,
      resume_filename: file.name || null,
      resume_mime: mime,
      consent_given: true,
      consent_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[careers] application insert failed", err);
    return NextResponse.json(
      {
        detail:
          "We couldn't submit your application just now. Please try again, or email business@voltairtech.com.",
      },
      { status: 500 },
    );
  }

  // Parse + embed the resume in the background (best-effort).
  after(async () => {
    try {
      await runParse(applicationId);
    } catch {
      /* runParse already logged + marked parse_status='error' */
    }
  });

  return NextResponse.json({ ok: true, id: applicationId });
}
