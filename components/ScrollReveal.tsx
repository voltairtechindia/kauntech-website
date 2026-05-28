"use client";

import { useEffect } from "react";

export default function ScrollReveal() {
  useEffect(() => {
    const reveal = () => {
      const els = document.querySelectorAll<HTMLElement>(".reveal");
      const windowHeight = window.innerHeight;
      els.forEach((el) => {
        const top = el.getBoundingClientRect().top;
        if (top < windowHeight - 100) el.classList.add("visible");
      });
    };
    reveal();
    window.addEventListener("scroll", reveal, { passive: true });
    return () => window.removeEventListener("scroll", reveal);
  }, []);
  return null;
}
