"use client";

import { useState } from "react";
import { createArBrowserClient } from "@/lib/ar/appAuthBrowser";
import { IconMail } from "./icons";

/** Google's four-colour G, inline so the button needs no asset fetch. */
export function GoogleG() {
  return (
    <svg width="1.05em" height="1.05em" viewBox="0 0 24 24" aria-hidden focusable={false}>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.28 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28V6.61H1.27a12 12 0 0 0 0 10.78l4.01-3.11z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77z" />
    </svg>
  );
}

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
        <h2 className="ar-h2" style={{ margin: 0 }}>Check your inbox</h2>
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
        <h2 className="ar-h2" style={{ marginBottom: 4 }}>Sign in to the studio</h2>
        <p className="ar-muted" style={{ margin: 0, fontSize: "13.5px" }}>
          Use the same email as your KaunTech app account.
        </p>
      </div>
      <div>
        <label className="ar-label" htmlFor="ar-email">
          Email
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
        <IconMail /> {busy ? "Sending…" : "Email me a sign-in link"}
      </button>
      <div className="ar-divider">or</div>
      <button
        type="button"
        className="ar-btn ar-btn-ghost"
        onClick={signInWithGoogle}
        disabled={busy}
      >
        <GoogleG /> Continue with Google
      </button>
    </form>
  );
}
