"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    // Reset scroll on route change so new page starts at top.
    window.scrollTo(0, 0);

    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));

    // Immediately mark anything already in (or above) the viewport as visible.
    const winH = window.innerHeight;
    els.forEach((el) => {
      const top = el.getBoundingClientRect().top;
      if (top < winH - 100) el.classList.add("visible");
    });

    // Reveal the rest as they enter the viewport.
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -100px 0px" }
    );

    els.forEach((el) => {
      if (!el.classList.contains("visible")) io.observe(el);
    });

    return () => io.disconnect();
  }, [pathname]);

  return null;
}
