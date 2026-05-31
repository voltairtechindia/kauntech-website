/** Small pure helpers for the blog: slugs, reading time, markdown -> text. */

/** Turn an arbitrary string into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Rough Markdown -> plain text, good enough for embeddings + reading time. */
export function markdownToPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ") // fenced code
    .replace(/`[^`]*`/g, " ") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> text
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/[*_~>#-]/g, " ") // residual md punctuation
    .replace(/\s+/g, " ")
    .trim();
}

/** Estimate reading time in minutes from Markdown (≈220 wpm, min 1). */
export function estimateReadingMinutes(md: string): number {
  const words = markdownToPlainText(md).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/** Human date like "30 May 2026" (server-stable, en-GB). */
export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
