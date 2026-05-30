"use client";

import { useRef, useState } from "react";

type QA = { q: string; a: string };

// Grounded strictly in live product facts — no regional-language claims (Coming Soon).
const FAQS: QA[] = [
  {
    q: "What is Kauntech?",
    a: "Kauntech is an AI-powered business card scanner for Android and iOS that works 100% offline. It uses on-device OCR to read visiting cards, enriches contacts with AI, and routes leads to your CRM, Google Sheets, or WhatsApp — in under 30 seconds.",
  },
  {
    q: "Does Kauntech work without internet?",
    a: "Yes. Kauntech is built offline-first — scanning, processing, and saving contacts all work with zero internet connection. A brief connection is only needed when you choose to sync to a CRM or run AI enrichment.",
  },
  {
    q: "Is Kauntech DPDP Act 2023 compliant?",
    a: "Yes. All card processing happens on your device and your scanned contacts are never uploaded to Kauntech's servers, satisfying the DPDP Act 2023 principle of data minimisation by design.",
  },
  {
    q: "Where is my scanned contact data stored?",
    a: "On your device only, in AES-256 encrypted local storage. We do not save or store your scanned images or contact details on our servers.",
  },
  {
    q: "What is a K-Token?",
    a: "A K-Token is Kauntech's AI credit unit. Tokens power on-device AI features such as AI Intel enrichment, AI Fix, and AI Strategy, and are only consumed when you actively use an AI feature.",
  },
  {
    q: "How much does Kauntech cost?",
    a: "Kauntech offers a free plan with 49 scans and 50 K-Tokens per month. Paid plans are Pro at ₹499/month and Ultra at ₹999/month, plus a Custom plan for enterprises. Annual billing is discounted.",
  },
];

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

function FaqItem({ q, a }: QA) {
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
        <span>{q}</span>
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

export default function Faq() {
  return (
    <section id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="container">
        <div className="section-header reveal">
          <span className="section-label">Questions Answered</span>
          <h2>Frequently Asked Questions</h2>
          <p>Everything about offline scanning, K-Tokens, DPDP compliance, and pricing.</p>
        </div>

        <div className="faq-list reveal reveal-delay-1">
          {FAQS.map((item) => (
            <FaqItem key={item.q} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
