"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, SplitText, useGSAP, prefersReducedMotion } from "@/lib/motion/gsapSetup";

/**
 * Heading with a masked line-rise reveal (SplitText) when scrolled into view.
 * SSR renders the plain heading (SEO-safe); the split only happens client-side.
 * Nested <em>/<span> accents survive the split.
 */
export default function SplitHeading({
  as: Tag = "h2",
  children,
  className,
  id,
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  // ElementType + dynamic tag defeats JSX's children inference - erase to any.
  const Comp = Tag as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      const split = SplitText.create(ref.current, {
        type: "lines,words",
        mask: "lines",
        linesClass: "k-split-line",
      });
      gsap.from(split.words, {
        yPercent: 115,
        rotate: 2,
        duration: 1.05,
        ease: "power4.out",
        stagger: 0.04,
        scrollTrigger: {
          trigger: ref.current,
          start: "top 88%",
          once: true,
        },
      });
    },
    { scope: ref },
  );

  return (
    <Comp ref={ref} className={className} id={id}>
      {children}
    </Comp>
  );
}
