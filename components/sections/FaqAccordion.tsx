"use client";

import { useRef, useState } from "react";

import type { FaqQA } from "@/lib/faq/types";

/** One expandable Q&A row. The question is an <h3> (inside the toggle button)
 *  so the FAQ contributes real heading structure, styled to match the button. */
function FaqItem({ q, a }: FaqQA) {
  const [open, setOpen] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);

  return (
    <div className={`faq-item${open ? " active" : ""}`}>
      <button
        type="button"
        className="faq-question"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <h3 className="faq-q">{q}</h3>
        <span className="faq-toggle" aria-hidden="true">
          +
        </span>
      </button>
      <div
        className="faq-answer"
        style={{ maxHeight: open ? innerRef.current?.scrollHeight ?? 400 : 0 }}
      >
        <div className="faq-answer-inner" ref={innerRef}>
          {a}
        </div>
      </div>
    </div>
  );
}

/** Client accordion - the interactive shell. Data + JSON-LD are supplied by the
 *  server <Faq> parent so the questions can come from the DB. */
export default function FaqAccordion({ faqs }: { faqs: FaqQA[] }) {
  return (
    <div className="faq-list reveal reveal-delay-1">
      {faqs.map((item) => (
        <FaqItem key={item.q} {...item} />
      ))}
    </div>
  );
}
