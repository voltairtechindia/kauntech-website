import { formatBytes } from "@/lib/ar/format";

/**
 * AR storage meter - shows how much of the tier's AR storage budget the owner
 * has used (profiles.cloud_ar_bytes vs AR_STORAGE_CAPS). Purely presentational
 * (no hooks) so it renders in both server and client trees. The editor passes
 * a live `usedBytes` that ticks up as models are uploaded.
 */
export default function StorageMeter({
  usedBytes,
  capBytes,
  label = "AR storage",
  hint,
  compact = false,
}: {
  usedBytes: number;
  capBytes: number;
  label?: string;
  hint?: string;
  compact?: boolean;
}) {
  const used = Math.max(0, usedBytes);
  const cap = Math.max(0, capBytes);
  const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  const remaining = Math.max(0, cap - used);
  // Brand orange while there's room, amber when filling up, red when near full.
  const level = pct >= 95 ? "full" : pct >= 80 ? "high" : "ok";

  return (
    <div className={`ar-storage ar-storage-${level}${compact ? " ar-storage-compact" : ""}`}>
      <div className="ar-storage-head">
        <span className="ar-storage-label">{label}</span>
        <span className="ar-storage-count">
          <span className="ar-mono">{formatBytes(used)}</span>
          <span className="ar-storage-of"> / {formatBytes(cap)}</span>
        </span>
      </div>
      <div
        className="ar-storage-meter"
        role="progressbar"
        aria-valuenow={Math.round(used)}
        aria-valuemin={0}
        aria-valuemax={Math.round(cap)}
        aria-label={`${label}: ${formatBytes(used)} of ${formatBytes(cap)} used`}
      >
        <div className="ar-storage-fill" style={{ width: `${Math.max(pct, used > 0 ? 2 : 0)}%` }} />
      </div>
      {!compact && (
        <span className="ar-storage-foot">
          {pct >= 100
            ? "Storage full. Remove a model to free space."
            : `${formatBytes(remaining)} left`}
        </span>
      )}
      {hint ? <span className="ar-storage-hint">{hint}</span> : null}
    </div>
  );
}
