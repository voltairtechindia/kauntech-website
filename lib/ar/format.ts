/** Human-readable byte sizes for the AR storage meters. Keeps the unit compact
 *  (MB for anything ≥1 MB, KB below) so "12.4 MB / 50 MB" reads cleanly. */
export function formatBytes(bytes: number): string {
  const b = Math.max(0, bytes);
  if (b >= 1024 * 1024) {
    const mb = b / (1024 * 1024);
    // One decimal under 100 MB, whole numbers above — avoids "248.7 MB" noise.
    return `${mb >= 100 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
  }
  if (b >= 1024) return `${Math.round(b / 1024)} KB`;
  return `${b} B`;
}
