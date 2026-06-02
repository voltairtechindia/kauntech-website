"use client";

import { useState } from "react";

export default function DeletionForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticket, setTicket] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: data.get("full_name"),
          email: data.get("email"),
          scope: data.get("scope"),
          details: data.get("details"),
          consent: data.get("consent") === "on",
          website: data.get("website"), // honeypot — bots fill this
          page_url: typeof location !== "undefined" ? location.href : undefined,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        ticket?: string;
        detail?: string;
      } | null;

      if (res.ok && json?.ticket) {
        setTicket(json.ticket);
        setSubmitted(true);
        form.reset();
      } else {
        setError(
          json?.detail ||
            "Sorry, we couldn't submit your request just now. Please email business@voltairtech.com.",
        );
      }
    } catch {
      setError(
        "Sorry, we couldn't reach the server. Please email business@voltairtech.com and we'll process it manually.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSubmitted(false);
    setError("");
  };

  return (
    <div className="form-box">
      {!submitted ? (
        <div>
          <h3>
            <i className="fa-solid fa-trash-can" /> Request Database Purge
          </h3>
          <p className="form-desc">
            Complete this formal erasure notice. Our compliance team will inspect your request,
            permanently erase all remote authentication logs, Supabase database profiles, and
            quota metrics, and dispatch a verification receipt within 48 hours.
          </p>

          <form className="deletion-form" onSubmit={handleSubmit}>
            {/* Honeypot — hidden from real users; bots fill it and get dropped. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "-9999px",
                width: 1,
                height: 1,
                opacity: 0,
              }}
            />

            <div className="form-group">
              <label htmlFor="delName">Full Name</label>
              <input
                type="text"
                id="delName"
                name="full_name"
                placeholder="Your account profile name"
                maxLength={200}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="delEmail">Registered Email ID</label>
              <input
                type="email"
                id="delEmail"
                name="email"
                placeholder="e.g. name@company.com"
                maxLength={320}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="delType">Erasure Scope</label>
              <select id="delType" name="scope" required defaultValue="">
                <option value="" disabled>
                  Select deletion type...
                </option>
                <option value="all">Full Profile Deletion (Purge everything)</option>
                <option value="oauth">
                  Disconnect Google integrations &amp; Purge OAuth metadata
                </option>
                <option value="local">Clear remote backup scan lists</option>
                <option value="support">Other data inquiry / compliance request</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="delDetails">Grievance / Additional Instructions</label>
              <textarea
                id="delDetails"
                name="details"
                rows={4}
                maxLength={5000}
                placeholder="Describe your erasure requirements or reasons..."
                required
              />
            </div>

            <div className="checkbox-group">
              <input type="checkbox" id="delConsent" name="consent" required />
              <label htmlFor="delConsent">
                I explicitly confirm that I wish to permanently delete the selected data. I
                understand that profile erasure is irreversible, will void active subscriptions,
                and completely wipe my accumulated K-Tokens balance.
              </label>
            </div>

            {error && (
              <p
                role="alert"
                style={{ color: "#f87171", fontSize: "0.88rem", marginBottom: 12 }}
              >
                {error}
              </p>
            )}

            <button type="submit" className="btn-submit" disabled={submitting}>
              <span>{submitting ? "Processing..." : "Submit Erasure Request"}</span>
              <i
                className={submitting ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-trash-can"}
              />
            </button>
          </form>
        </div>
      ) : (
        <div className="success-panel active">
          <div className="success-icon">
            <i className="fa-solid fa-circle-check" />
          </div>
          <h3 style={{ marginBottom: 8 }}>Erasure Request Registered!</h3>
          <p
            style={{
              color: "var(--text-dim)",
              fontSize: "0.9rem",
              lineHeight: 1.6,
              maxWidth: 320,
              margin: "0 auto",
            }}
          >
            Your data erasure request has been successfully recorded. Our database administrator
            will execute a secure, permanent purge and email a certificate of erasure to you
            within 48 hours.
          </p>
          <div className="ticket-badge">TICKET ID: {ticket}</div>
          <button
            type="button"
            className="btn-submit"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            }}
            onClick={reset}
          >
            <i className="fa-solid fa-arrow-rotate-left" />
            <span>Submit Another Request</span>
          </button>
        </div>
      )}
    </div>
  );
}
