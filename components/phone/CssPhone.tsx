import type { ReactNode } from "react";

/**
 * Lightweight CSS phone frame — the mobile / reduced-motion / no-WebGL stand-in
 * for the 3D device. `scale` shrinks the native 390×844 screen composition.
 */
export default function CssPhone({
  children,
  scale = 0.78,
  className,
}: {
  children: ReactNode;
  scale?: number;
  className?: string;
}) {
  return (
    <div
      className={`k-cssphone${className ? ` ${className}` : ""}`}
      style={{ "--kps-scale": scale } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className="k-cssphone-clip">
        {children}
        <span className="k-cssphone-glare" />
      </div>
    </div>
  );
}
