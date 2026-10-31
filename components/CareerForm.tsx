"use client";

import { useRef, useState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle, Paperclip, Send } from "lucide-react";

import Ic from "@/components/ui/Icon";
import { sendLead } from "@/lib/leads";

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
    const resume = data.get("resume");
    const file = resume instanceof File && resume.size > 0 ? resume : null;
    if (file && file.size > 5 * 1024 * 1024) {
      setStatus({ kind: "error", text: "That résumé is over 5 MB. Please attach a smaller PDF or DOCX." });
      setSubmitting(false);
      return;
    }
    const slug = String(data.get("job_slug") ?? "");
    const role = jobs.find((j) => j.slug === slug)?.title ?? slug;

    try {
      await sendLead(
        "career",
        {
          name: String(data.get("full_name") ?? ""),
          email: String(data.get("email") ?? ""),
          role,
          note: String(data.get("cover_note") ?? ""),
          consent: data.get("consent") ? "yes" : "no",
        },
        { file, honeypot: String(data.get("website") ?? "") },
      );
      setStatus({
        kind: "success",
        text: "Thank you! Your application has been received. Our team reviews every submission and will reach out if there's a fit.",
      });
      form.reset();
      setFileName("");
      onSubmitted?.();
    } catch {
      setStatus({
        kind: "error",
        text: "Sorry, we couldn't submit your application. Please email it to business@voltairtech.com.",
      });
    }
    setSubmitting(false);
  };

  return (
    <form ref={formRef} className="career-form" onSubmit={handleSubmit}>
      {/* Honeypot - hidden from humans; bots that fill it are dropped server-side. */}
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
            placeholder="Anything not in your resume - why you're a great fit, availability, notice period…"
            className="contact-field"
            style={{ resize: "vertical" }}
          />
        </div>

        <div>
          <label htmlFor="ap_resume">Resume * (PDF or DOCX, max 5 MB)</label>
          <div className="file-field">
            <label className="btn-secondary" style={{ cursor: "pointer", padding: "12px 22px" }}>
              <Ic icon={Paperclip} />
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
          {submitting ? <Ic icon={LoaderCircle} className="ic-spin" /> : <Ic icon={Send} />}
        </button>
      </div>

      {status && (
        <div role="status" aria-live="polite" className={`career-status ${status.kind}`}>
          {status.kind === "success" ? <Ic icon={CircleCheck} /> : <Ic icon={CircleAlert} />}
          <span>{status.text}</span>
        </div>
      )}
    </form>
  );
}
