import type { LucideIcon } from "lucide-react";

/**
 * Lucide icon inside an `<i class="ic">` shell. The shell keeps every legacy
 * CSS selector that targets `i` elements working (sizing via font-size,
 * color via currentColor) while the glyphs themselves are modern stroke SVGs.
 * Safe in server components — no hooks, no handlers.
 */
export default function Ic({
  icon: Icon,
  className,
  strokeWidth,
}: {
  icon: LucideIcon;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <i className={`ic${className ? ` ${className}` : ""}`} aria-hidden="true">
      <Icon strokeWidth={strokeWidth} />
    </i>
  );
}
