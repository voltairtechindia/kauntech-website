/**
 * Shared admin authentication for write endpoints (/api/ingest, /api/blog).
 *
 * Auth: send header  X-Admin-Key: <ADMIN_API_KEY>
 * Uses a constant-time compare so the check can't be timing-attacked, and
 * refuses everything if ADMIN_API_KEY is not configured.
 */
import { timingSafeEqual } from "node:crypto";

import { config } from "@/lib/rag/config";

export function isAdmin(req: Request): boolean {
  const provided = req.headers.get("x-admin-key") ?? "";
  const expected = config.adminApiKey;
  if (!expected) return false; // refuse if no key configured
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
