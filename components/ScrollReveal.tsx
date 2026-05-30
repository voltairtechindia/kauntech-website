"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    // Reset scroll on route change so new page starts at top.
    // Entrance animations are now pure CSS (see .reveal in globals.css), so no
    // JS is needed to make content visible — keeping content off the critical path.
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
