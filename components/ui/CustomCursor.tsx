"use client";

import { useEffect } from "react";
import gsap from "gsap";

// Elements that make the cursor swell.
const INTERACTIVE =
  'a, button, [role="button"], input, textarea, select, summary, label[for], .k-btn, .nav-cta, [data-cursor="grow"]';

/**
 * Minimal custom cursor: a single small dot in blend-mode difference that
 * trails the pointer with a short ease, swells gently over interactive
 * elements and squashes on click. No rings, no glows.
 * Renders nothing on touch devices or for reduced-motion users - the native
 * cursor stays untouched there.
 */
export default function CustomCursor() {
  useEffect(() => {
    if (
      !window.matchMedia("(pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const dot = document.createElement("div");
    dot.className = "kursor-dot";
    dot.setAttribute("aria-hidden", "true");
    document.body.appendChild(dot);
    document.documentElement.classList.add("k-cursor");

    gsap.set(dot, { xPercent: -50, yPercent: -50, opacity: 0 });

    const toX = gsap.quickTo(dot, "x", { duration: 0.16, ease: "power3.out" });
    const toY = gsap.quickTo(dot, "y", { duration: 0.16, ease: "power3.out" });

    let seen = false;
    let hovering = false;
    let pressed = false;

    const applyScale = () =>
      gsap.to(dot, {
        scale: pressed ? (hovering ? 2.1 : 0.75) : hovering ? 2.6 : 1,
        duration: 0.3,
        ease: "power3.out",
      });

    const onMove = (e: MouseEvent) => {
      if (!seen) {
        seen = true;
        gsap.set(dot, { x: e.clientX, y: e.clientY });
        gsap.to(dot, { opacity: 1, duration: 0.25 });
      }
      toX(e.clientX);
      toY(e.clientY);
    };

    const onOver = (e: MouseEvent) => {
      const t = e.target as Element | null;
      // native cursor takes over inside embeds - fade ours out
      if (t?.closest?.('iframe, [data-cursor="hide"]')) {
        gsap.to(dot, { opacity: 0, duration: 0.2 });
        return;
      }
      gsap.to(dot, { opacity: 1, duration: 0.2 });
      if (!t?.closest?.(INTERACTIVE)) return;
      hovering = true;
      applyScale();
    };
    const onOut = (e: MouseEvent) => {
      const from = (e.target as Element | null)?.closest?.(INTERACTIVE);
      if (!from) return;
      const to = (e.relatedTarget as Element | null)?.closest?.(INTERACTIVE);
      if (to === from) return;
      hovering = false;
      applyScale();
    };

    const onDown = () => {
      pressed = true;
      applyScale();
    };
    const onUp = () => {
      pressed = false;
      applyScale();
    };

    const onLeaveDoc = () => gsap.to(dot, { opacity: 0, duration: 0.2 });
    const onEnterDoc = () => gsap.to(dot, { opacity: 1, duration: 0.2 });

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseout", onOut, { passive: true });
    document.addEventListener("mousedown", onDown, { passive: true });
    document.addEventListener("mouseup", onUp, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeaveDoc);
    document.documentElement.addEventListener("mouseenter", onEnterDoc);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeaveDoc);
      document.documentElement.removeEventListener("mouseenter", onEnterDoc);
      document.documentElement.classList.remove("k-cursor");
      dot.remove();
    };
  }, []);

  return null;
}
