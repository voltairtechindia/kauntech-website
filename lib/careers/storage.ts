/**
 * Resume storage on the PRIVATE `resumes` Supabase Storage bucket.
 *
 * Unlike `blog-media`, this bucket is NOT public: resumes are sensitive personal
 * data (DPDP). Uploads use the server-side service-role client; the admin panel
 * downloads them only via short-lived signed URLs. Never expose these paths to
 * the browser directly.
 */
import { getSupabase } from "@/lib/rag/supabase";

export const RESUMES_BUCKET = "resumes";

/** Upload resume bytes to the private bucket. Throws on failure. */
export async function uploadResume(
  path: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const { error } = await getSupabase()
    .storage.from(RESUMES_BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (error) throw error;
}

/** Download resume bytes (service-role) for server-side parsing. */
export async function downloadResume(
  path: string,
): Promise<{ bytes: Buffer; contentType: string }> {
  const { data, error } = await getSupabase()
    .storage.from(RESUMES_BUCKET)
    .download(path);
  if (error || !data) throw error ?? new Error("Resume not found.");
  const bytes = Buffer.from(await data.arrayBuffer());
  return { bytes, contentType: data.type || "application/octet-stream" };
}

/** Create a short-lived signed URL so HR can view/download a resume. */
export async function signedResumeUrl(
  path: string,
  ttlSeconds = 300,
): Promise<string> {
  const { data, error } = await getSupabase()
    .storage.from(RESUMES_BUCKET)
    .createSignedUrl(path, ttlSeconds);
  if (error || !data) throw error ?? new Error("Could not sign the resume URL.");
  return data.signedUrl;
}

/** Best-effort delete of a resume object (used when an application is removed). */
export async function deleteResume(path: string): Promise<void> {
  const { error } = await getSupabase()
    .storage.from(RESUMES_BUCKET)
    .remove([path]);
  if (error) throw error;
}
