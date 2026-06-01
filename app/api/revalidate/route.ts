/**
 * On-demand ISR revalidation, admin-gated.
 *
 * The admin panel is a SEPARATE deployment, so its `revalidatePath` calls can't
 * refresh this site's cached pages. After it mutates shared data (e.g. a job
 * opening's status), it pings this endpoint so the affected `/career` pages
 * rebuild immediately instead of waiting out the `revalidate = 300` window.
 *
 * Auth: header  X-Admin-Key: <ADMIN_API_KEY>
 *
 * POST /api/revalidate
 *   Body: { "paths": ["/career", "/career/some-slug"] }
 *      or { "path": "/career" }
 *   -> 200 { ok, revalidated: [...] }
 */
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json(
      { detail: "Invalid or missing X-Admin-Key." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  const obj = (body ?? {}) as Record<string, unknown>;
  const raw = Array.isArray(obj.paths)
    ? obj.paths
    : typeof obj.path === "string"
      ? [obj.path]
      : [];

  // Only allow same-origin absolute paths.
  const paths = raw
    .filter((p): p is string => typeof p === "string")
    .map((p) => p.trim())
    .filter((p) => p.startsWith("/"));

  if (!paths.length) {
    return NextResponse.json(
      { detail: "Provide { path } or { paths: [...] } of absolute paths." },
      { status: 400 },
    );
  }

  for (const p of paths) revalidatePath(p);

  return NextResponse.json({ ok: true, revalidated: paths });
}
