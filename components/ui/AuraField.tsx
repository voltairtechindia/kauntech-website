"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Ambient "aura field" — a single fixed layer that sits BEHIND all content
 * (z-index:-1; body background is transparent so it shows through wherever a
 * section isn't opaque). It carries a few slow-breathing orange orbs and one
 * soft orb that eases toward the cursor, so the brand glow is felt on every
 * marketing page — not just the home hero.
 *
 * Rendered once by SiteChrome (so it inherits the /ar exclusion). Purely
 * decorative + pointer-events:none. On touch or reduced-motion the cursor orb
 * stays hidden and the ambient orbs hold still (see the media query in ui.css).
 */
export default function AuraField() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cursorRef.current;
    if (!el) return;
    if (
      !window.matchMedia("(pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    gsap.set(el, { xPercent: -50, yPercent: -50 });
    // Long ease = the glow floats after the pointer instead of snapping to it.
    const toX = gsap.quickTo(el, "x", { duration: 0.85, ease: "power3.out" });
    const toY = gsap.quickTo(el, "y", { duration: 0.85, ease: "power3.out" });

    let seen = false;
    const onMove = (e: MouseEvent) => {
      if (!seen) {
        seen = true;
        gsap.set(el, { x: e.clientX, y: e.clientY });
        gsap.to(el, { opacity: 1, duration: 1.1, ease: "power2.out" });
      }
      toX(e.clientX);
      toY(e.clientY);
    };
    const onLeave = () => gsap.to(el, { opacity: 0, duration: 0.5 });
    const onEnter = () => {
      if (seen) gsap.to(el, { opacity: 1, duration: 0.6 });
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
    };
  }, []);

  return (
    <div className="k-aura" aria-hidden="true">
      <span className="k-aura-orb k-aura-orb--a" />
      <span className="k-aura-orb k-aura-orb--b" />
      <span className="k-aura-orb k-aura-orb--c" />
      <div className="k-aura-cursor" ref={cursorRef}>
        <span className="k-aura-cursor-core" />
      </div>
    </div>
  );
}
