"use client";

import { useRef, useState } from "react";

type JobOption = { slug: string; title: string };
type Status = { kind: "success" | "error"; text: string } | null;

export default function CareerForm({
  jobs,
  defaultJobSlug,
  lockJob = false,
  onSubmitted,
}: {
  jobs: JobOption[];
  defaultJobSlug?: string;
  lockJob?: boolean;
  onSubmitted?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [fileName, setFileName] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitting(true);
    setStatus(null);

    const data = new FormData(form);
    if (typeof location !== "undefined") data.set("page_url", location.href);

    try {
      const res = await fetch("/api/careers/apply", {
        method: "POST",
        body: data, // multipart — let the browser set the boundary
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus({
          kind: "success",
          text: "Thank you! Your application has been received. Our team reviews every submission and will reach out if there's a fit.",
        });
        form.reset();
        setFileName("");
        onSubmitted?.();
      } else {
        setStatus({
          kind: "error",
          text:
            (json as { detail?: string }).detail ||
            "Sorry, we couldn't submit your application. Please try again.",
        });
      }
    } catch {
      setStatus({
        kind: "error",
        text: "Network error — please check your connection and try again.",
      });
    }
    setSubmitting(false);
  };

  return (
    <form ref={formRef} className="career-form" onSubmit={handleSubmit}>
      {/* Honeypot — hidden from humans; bots that fill it are dropped server-side. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        data-1p-ignore
        data-lpignore="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      <div className="grid-2">
        <div>
          <label htmlFor="ap_name">Full Name *</label>
          <input
            id="ap_name"
            name="full_name"
            type="text"
            required
            placeholder="e.g. Priya Sharma"
            className="contact-field"
          />
        </div>
        <div>
          <label htmlFor="ap_email">Email *</label>
          <input
            id="ap_email"
            name="email"
            type="email"
            required
            placeholder="e.g. priya@gmail.com"
            className="contact-field"
          />
        </div>
      </div>

      <div>
        <label htmlFor="ap_role">Role applying for</label>
        {lockJob && defaultJobSlug ? (
          <>
            <input type="hidden" name="job_slug" value={defaultJobSlug} />
            <input
              type="text"
              className="contact-field"
              value={jobs.find((j) => j.slug === defaultJobSlug)?.title ?? "This role"}
              disabled
            />
          </>
        ) : (
          <select
            id="ap_role"
            name="job_slug"
            defaultValue={defaultJobSlug ?? ""}
            className="contact-field"
          >
            <option value="">General / open application</option>
            {jobs.map((j) => (
              <option key={j.slug} value={j.slug}>
                {j.title}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="apply-row-pair">
        <div>
          <label htmlFor="ap_cover">Cover note (optional)</label>
          <textarea
            id="ap_cover"
            name="cover_note"
            rows={4}
            placeholder="Anything not in your resume — why you're a great fit, availability, notice period…"
            className="contact-field"
            style={{ resize: "vertical" }}
          />
        </div>

        <div>
          <label htmlFor="ap_resume">Resume * (PDF or DOCX, max 10 MB)</label>
          <div className="file-field">
            <label className="btn-secondary" style={{ cursor: "pointer", padding: "12px 22px" }}>
              <i className="fa-solid fa-paperclip" />
              <span>Choose file</span>
              <input
                id="ap_resume"
                name="resume"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                required
                hidden
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
              />
            </label>
            <span className="file-name">{fileName || "No file selected"}</span>
          </div>
        </div>
      </div>

      <label className="career-consent">
        <input type="checkbox" name="consent" value="yes" required />
        <span>
          I consent to Kauntech Technologies storing and processing my resume and the
          details above for recruitment purposes, in line with the{" "}
          <a
            href="/recruitment-privacy"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--gold)" }}
          >
            Recruitment Privacy Notice
          </a>
          . *
        </span>
      </label>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="btn-primary" disabled={submitting}>
          <span>{submitting ? "Submitting…" : "Submit Application"}</span>
          <i className={submitting ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-paper-plane"} />
        </button>
      </div>

      {status && (
        <div role="status" aria-live="polite" className={`career-status ${status.kind}`}>
          <i
            className={
              status.kind === "success"
                ? "fa-solid fa-circle-check"
                : "fa-solid fa-circle-exclamation"
            }
          />
          <span>{status.text}</span>
        </div>
      )}
    </form>
  );
}
