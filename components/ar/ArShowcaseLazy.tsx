"use client";

import dynamic from "next/dynamic";

/** Client-side mount for the decorative 3D showcase (three.js stays out of the
 *  page's initial chunk; a shimmer holds the space while it streams in). */
const ArShowcase = dynamic(() => import("./ArShowcase"), {
  ssr: false,
  loading: () => <div className="ar-skel ar-showcase-skel" aria-hidden />,
});

export default function ArShowcaseLazy({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`ar-showcase${compact ? " ar-showcase-compact" : ""}`} aria-hidden="true">
      <ArShowcase />
    </div>
  );
}
