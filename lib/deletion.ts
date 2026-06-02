/**
 * Data access for the /delete-request portal. Writes to the
 * `data_deletion_requests` table via the shared server-side service-role
 * Supabase client (RLS-protected).
 */
import { getSupabase } from "@/lib/rag/supabase";

export interface DeletionRequest {
  ticket: string;
  full_name: string;
  email: string;
  scope: string;
  details: string | null;
  consent: boolean;
  page_url: string | null;
  user_agent: string | null;
  ip: string | null;
}

export async function insertDeletionRequest(
  request: DeletionRequest,
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("data_deletion_requests").insert(request);
  if (error) throw error;
}
