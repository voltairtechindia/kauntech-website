"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/motion/gsapSetup";

/**
 * Site-wide Lenis smooth scrolling, kept in perfect sync with GSAP's
 * ScrollTrigger (Lenis drives scroll → ScrollTrigger.update; gsap.ticker
 * drives Lenis's raf). Mounted once in SiteChrome, so the /ar app shell is
 * never affected. No-ops for reduced-motion users.
 */
export default function SmoothScroll() {
  const pathname = usePathname();
  const isAr = pathname === "/ar" || pathname?.startsWith("/ar/");

  useEffect(() => {
    if (isAr || prefersReducedMotion()) return;

    const lenis = new Lenis({
      lerp: 0.115,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
      anchors: true,
    });

    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, [isAr]);

  return null;
}
