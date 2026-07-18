"use client";

import dynamic from "next/dynamic";

/** Client-side mount for the 3D phone vignette (three.js stays out of the
 *  page's initial chunk; a shimmer holds the space while it streams in). */
const ArPhone = dynamic(() => import("./ArPhone"), {
  ssr: false,
  loading: () => <div className="ar-skel ar-phone-skel" aria-hidden />,
});

export default function ArPhoneLazy({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`ar-phone-vignette${compact ? " ar-phone-vignette-compact" : ""}`} aria-hidden="true">
      <ArPhone />
    </div>
  );
}
