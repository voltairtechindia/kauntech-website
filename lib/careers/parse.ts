/**
 * Resume parsing + embedding.
 *
 * PDF  → Gemini multimodal (reads the document natively: columns, tables,
 *        layout) → structured JSON + clean plain text.
 * DOCX → mammoth extracts raw text → Gemini structures it (no multimodal needed).
 *
 * The resulting profile is embedded (document mode) into job_applications.embedding
 * so the admin AI shortlist + resume chatbot can do semantic recall. This is the
 * ONLY place resumes are turned into vectors — and those vectors live solely in
 * job_applications (never the public `documents` RAG store).
 */
import mammoth from "mammoth";

import { embed, generateJson, generateJsonFromFile } from "@/lib/rag/gemini";

import { getApplicationForParse, updateApplicationParse } from "./db";
import { downloadResume } from "./storage";
import type { ParsedResume } from "./types";

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const PARSE_SYSTEM =
  "You are a precise resume-parsing engine for an HR system. Extract only what " +
  "is actually present in the resume — never invent skills, employers, dates or " +
  "credentials. Return JSON only.";

const PARSE_INSTRUCTION = `Read the candidate's resume and return a single JSON object with EXACTLY these keys:
{
  "plain_text": string,                  // the full readable text of the resume, de-cluttered of layout artifacts
  "full_name": string|null,
  "email": string|null,
  "phone": string|null,
  "current_title": string|null,          // most recent role / job title
  "total_experience_years": number|null, // best estimate of total professional experience, in years
  "skills": string[],                    // concrete skills, technologies, tools, frameworks
  "education": string[],                 // one entry per degree/qualification, e.g. "B.Tech CSE, IIT Delhi (2020)"
  "summary": string|null                 // a 2-3 sentence neutral professional summary
}
Use null or empty arrays when something is not stated. Output ONLY the JSON object.`;

function asStr(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function asNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
function asStrArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((s) => s.trim())
    : [];
}

function normalize(raw: Record<string, unknown>): ParsedResume {
  return {
    plain_text: typeof raw.plain_text === "string" ? raw.plain_text : "",
    full_name: asStr(raw.full_name),
    email: asStr(raw.email),
    phone: asStr(raw.phone),
    current_title: asStr(raw.current_title),
    total_experience_years: asNum(raw.total_experience_years),
    skills: asStrArray(raw.skills),
    education: asStrArray(raw.education),
    summary: asStr(raw.summary),
  };
}

/** Parse raw resume bytes (PDF or DOCX) into a structured profile. */
export async function parseResumeBytes(
  bytes: Buffer,
  mime: string,
): Promise<ParsedResume> {
  let raw: Record<string, unknown>;

  if (mime === PDF_MIME) {
    raw = await generateJsonFromFile(PARSE_SYSTEM, PARSE_INSTRUCTION, {
      mimeType: PDF_MIME,
      data: bytes.toString("base64"),
    });
  } else if (mime === DOCX_MIME) {
    const { value: text } = await mammoth.extractRawText({ buffer: bytes });
    raw = await generateJson(
      PARSE_SYSTEM,
      `${PARSE_INSTRUCTION}\n\nRESUME TEXT:\n${text.slice(0, 30000)}`,
    );
    if (typeof raw.plain_text !== "string" || !raw.plain_text.trim()) {
      raw.plain_text = text;
    }
  } else {
    throw new Error(`Unsupported resume type: ${mime || "unknown"}`);
  }

  const parsed = normalize(raw);
  if (!parsed.plain_text.trim() && !parsed.skills.length) {
    throw new Error("Resume parsing returned no usable content.");
  }
  return parsed;
}

/** Compose the text we embed for semantic matching (front-loads the signal). */
function embedText(p: ParsedResume): string {
  return [
    p.current_title ? `Title: ${p.current_title}` : "",
    p.total_experience_years != null
      ? `Experience: ${p.total_experience_years} years`
      : "",
    p.skills.length ? `Skills: ${p.skills.join(", ")}` : "",
    p.education.length ? `Education: ${p.education.join("; ")}` : "",
    p.summary ?? "",
    p.plain_text,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 16000);
}

/**
 * Full enrichment for one application: download → parse → embed → persist.
 * Marks parse_status 'done' on success or 'error' (with the message) on failure.
 * Called from /api/careers/apply (after()) and /api/careers/parse (re-run).
 */
export async function runParse(applicationId: string): Promise<void> {
  const app = await getApplicationForParse(applicationId);
  if (!app) throw new Error(`Application ${applicationId} not found.`);

  try {
    const { bytes, contentType } = await downloadResume(app.resume_path);
    const parsed = await parseResumeBytes(bytes, app.resume_mime || contentType);
    const [embedding] = await embed([embedText(parsed)], "document");

    await updateApplicationParse(applicationId, {
      parse_status: "done",
      resume_text: parsed.plain_text.slice(0, 50000),
      parsed,
      embedding,
    });
  } catch (err) {
    console.error("[careers] parse failed", applicationId, err);
    await updateApplicationParse(applicationId, {
      parse_status: "error",
      metadata: {
        parse_error: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}
