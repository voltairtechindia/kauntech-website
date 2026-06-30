import type { TokenBreakdown } from "@/lib/ar/db";

/**
 * AR token meter for the dashboard. AR building spends from the same monthly
 * token pool the app's AI features use (profiles.tokens_used_this_month /
 * tokens_limit), so we surface what's LEFT to spend on AR plus how much AR has
 * already used this cycle. Purely presentational — the page passes the numbers.
 */
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

function resetLabel(iso: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TokenMeter({
  used,
  limit,
  breakdown,
  resetAt,
  compact = false,
}: {
  used: number;
  limit: number;
  breakdown: TokenBreakdown;
  resetAt: string | null;
  compact?: boolean;
}) {
  const u = Math.max(0, used);
  const cap = Math.max(0, limit);
  const remaining = Math.max(0, cap - u);
  const arSpent = Math.max(0, Number(breakdown?.ar ?? 0));
  const pct = cap > 0 ? Math.min(100, (u / cap) * 100) : 0;
  const level = pct >= 95 ? "full" : pct >= 80 ? "high" : "ok";
  const reset = resetLabel(resetAt);

  return (
    <div className={`ar-storage ar-tokens ar-storage-${level}${compact ? " ar-storage-compact" : ""}`}>
      <div className="ar-storage-head">
        <span className="ar-storage-label">Tokens left for AR</span>
        <span className="ar-storage-count">
          <span className="ar-mono">{cap > 0 ? fmt(remaining) : "—"}</span>
          <span className="ar-storage-of"> / {cap > 0 ? fmt(cap) : "—"}</span>
        </span>
      </div>

      <div
        className="ar-storage-meter"
        role="progressbar"
        aria-valuenow={Math.round(remaining)}
        aria-valuemin={0}
        aria-valuemax={Math.round(cap)}
        aria-label={`${fmt(remaining)} of ${fmt(cap)} tokens left`}
      >
        <div className="ar-storage-fill" style={{ width: `${Math.max(pct, u > 0 ? 2 : 0)}%` }} />
      </div>

      {!compact && (
        <span className="ar-storage-foot">
          {cap > 0 && remaining === 0
            ? "Out of tokens. Top up in the app to keep building."
            : reset
              ? `Resets ${reset}`
              : "Shared with your AI features in the app."}
        </span>
      )}

      {!compact && (
        <span className="ar-storage-hint">
          {arSpent > 0
            ? `You've spent ${fmt(arSpent)} on AR cards this cycle. Building uses 60–80, a 3D model 40, a video 100.`
            : "Building an AR card uses 60–80 tokens, a 3D model 40, a video 100."}
        </span>
      )}
    </div>
  );
}
