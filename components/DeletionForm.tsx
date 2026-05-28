"use client";

import { useState } from "react";

export default function DeletionForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticket, setTicket] = useState("KNT-DEL-72948");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      const num = "KNT-DEL-" + Math.floor(10000 + Math.random() * 90000);
      setTicket(num);
      setSubmitted(true);
      setSubmitting(false);
    }, 1200);
  };

  const reset = () => setSubmitted(false);

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
            <div className="form-group">
              <label htmlFor="delName">Full Name</label>
              <input
                type="text"
                id="delName"
                placeholder="Your account profile name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="delEmail">Registered Email ID</label>
              <input type="email" id="delEmail" placeholder="e.g. name@company.com" required />
            </div>

            <div className="form-group">
              <label htmlFor="delType">Erasure Scope</label>
              <select id="delType" required defaultValue="">
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
                rows={4}
                placeholder="Describe your erasure requirements or reasons..."
                required
              />
            </div>

            <div className="checkbox-group">
              <input type="checkbox" id="delConsent" required />
              <label htmlFor="delConsent">
                I explicitly confirm that I wish to permanently delete the selected data. I
                understand that profile erasure is irreversible, will void active subscriptions,
                and completely wipe my accumulated K-Tokens balance.
              </label>
            </div>

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
