"use client";

import { useState } from "react";
import { createArBrowserClient } from "@/lib/ar/appAuthBrowser";

/**
 * Owner login for /ar. Uses the APP's Supabase project, so the same account as
 * the mobile app. Magic link works for everyone (email + Google app users share
 * an email); a Google button is offered too. On success Supabase redirects to
 * /ar/callback which exchanges the code for a cookie session.
 */
export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/ar/callback` : undefined;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = await createArBrowserClient().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the link.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setError(null);
    setBusy(true);
    try {
      const { error } = await createArBrowserClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
      // Supabase redirects the browser to Google; nothing else to do here.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Google sign-in.");
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="ar-card ar-stack" style={{ textAlign: "center" }}>
        <h2 className="ar-h2">Check your inbox</h2>
        <p className="ar-sub" style={{ margin: 0 }}>
          We sent a sign-in link to <strong>{email}</strong>. Open it on this device
          to continue to your AR Card Studio.
        </p>
        <button className="ar-btn ar-btn-ghost" onClick={() => setSent(false)}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form className="ar-card ar-stack" onSubmit={sendMagicLink}>
      <div>
        <label className="ar-label" htmlFor="ar-email">
          Email (same as your KaunTech app account)
        </label>
        <input
          id="ar-email"
          className="ar-field"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error ? <p className="ar-error">{error}</p> : null}
      <button className="ar-btn ar-btn-primary" type="submit" disabled={busy || !email}>
        {busy ? "Sending…" : "Email me a sign-in link"}
      </button>
      <div className="ar-row" style={{ justifyContent: "center" }}>
        <span className="ar-muted">or</span>
      </div>
      <button
        type="button"
        className="ar-btn ar-btn-ghost"
        onClick={signInWithGoogle}
        disabled={busy}
      >
        Continue with Google
      </button>
    </form>
  );
}
