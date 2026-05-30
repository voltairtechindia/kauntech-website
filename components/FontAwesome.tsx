"use client";

import { useEffect } from "react";

const FA_HREF =
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";

/**
 * Loads Font Awesome without blocking first paint.
 *
 * The full FA stylesheet (plus its webfonts) was the single largest
 * render-blocking resource (~950ms on the critical path). Icons are
 * decorative/UI, never LCP, so we inject the stylesheet right after
 * hydration instead of in the server-rendered <head>. A <link rel="preconnect">
 * to cdnjs stays in layout.tsx so the connection is already warm.
 */
export default function FontAwesome() {
  useEffect(() => {
    const id = "fa-css";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = FA_HREF;
    document.head.appendChild(link);
  }, []);

  return null;
}
