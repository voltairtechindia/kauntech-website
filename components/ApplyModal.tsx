"use client";

import { useEffect, useState } from "react";

import CareerForm from "@/components/CareerForm";

export default function ApplyModal({
  jobSlug,
  jobTitle,
}: {
  jobSlug: string;
  jobTitle: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button type="button" className="btn-primary apply-cta" onClick={() => setOpen(true)}>
        <span>Apply Now</span>
        <i className="fa-solid fa-arrow-right" />
      </button>

      <div
        className={`modal-overlay${open ? " active" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div className="modal-container apply-modal">
          <button className="modal-close" onClick={() => setOpen(false)} type="button">
            <i className="fa-solid fa-xmark" />
          </button>

          <h3 className="apply-modal-title">Apply for {jobTitle}</h3>
          <p className="apply-modal-desc">
            Attach your resume (PDF or DOCX). We review every application.
          </p>

          {open && (
            <CareerForm
              jobs={[{ slug: jobSlug, title: jobTitle }]}
              defaultJobSlug={jobSlug}
              lockJob
              onSubmitted={() => {
                // Keep the "Thank you!" confirmation visible briefly, then close.
                window.setTimeout(() => setOpen(false), 2200);
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
