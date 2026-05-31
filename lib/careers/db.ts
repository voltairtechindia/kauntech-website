/**
 * Supabase data-access for careers (server-side, service-role).
 *
 * The site only needs to READ open jobs (for /career) and WRITE applications
 * (intake + async AI enrichment). All HR-side reads/writes live in the admin
 * panel. RLS is on with no policies, so the anon key gets zero access.
 */
import { getSupabase } from "@/lib/rag/supabase";
import type { JobApplicationInsert, JobOpening } from "./types";

/** Open postings, newest first — for the public /career listing. */
export async function listOpenJobs(): Promise<JobOpening[]> {
  const { data, error } = await getSupabase()
    .from("job_openings")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as JobOpening[];
}

/** One opening by slug (any status), or null. */
export async function getJob(slug: string): Promise<JobOpening | null> {
  const { data, error } = await getSupabase()
    .from("job_openings")
    .select("*")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as JobOpening) ?? null;
}

/** Insert a new application; returns its id. */
export async function insertApplication(
  row: JobApplicationInsert,
): Promise<string> {
  const { data, error } = await getSupabase()
    .from("job_applications")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Minimal fields needed to (re)parse a resume. */
export async function getApplicationForParse(
  id: string,
): Promise<{ id: string; resume_path: string; resume_mime: string | null } | null> {
  const { data, error } = await getSupabase()
    .from("job_applications")
    .select("id, resume_path, resume_mime")
    .eq("id", id)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as { id: string; resume_path: string; resume_mime: string | null }) ?? null;
}

/** Patch enrichment fields after parsing (resume_text, parsed, embedding, …). */
export async function updateApplicationParse(
  id: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const { error } = await getSupabase()
    .from("job_applications")
    .update(fields)
    .eq("id", id);
  if (error) throw error;
}
