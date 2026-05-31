/**
 * Data access for the /contact form. Writes to the `contact_submissions` table
 * via the shared server-side service-role Supabase client (RLS-protected).
 */
import { getSupabase } from "@/lib/rag/supabase";

export interface ContactSubmission {
  name: string;
  company: string | null;
  phone: string | null;
  email: string;
  message: string;
  page_url: string | null;
  user_agent: string | null;
}

export async function insertContactSubmission(
  submission: ContactSubmission,
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("contact_submissions").insert(submission);
  if (error) throw error;
}
