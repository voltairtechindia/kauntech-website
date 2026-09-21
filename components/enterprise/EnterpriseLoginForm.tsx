"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createArBrowserClient } from "@/lib/ar/appAuthBrowser";
import { GoogleG } from "@/components/ar/LoginForm";

/**
 * Where Google and the emailed link send people back to.
 *
 * GoTrue only honours a redirect whose host is the project's site_url
 * (kauntech.com) or one listed exactly in its allow-list. www…/ar/callback is
 * listed, but only without a query string, so `?next=` made it fall back to the
 * bare site root. The apex host is always allowed and 308s to www with the
 * query intact, where the PKCE verifier cookie lives.
 */
function consoleCallback(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const base = window.location.hostname.endsWith("kauntech.com")
    ? "https://kauntech.com"
    : window.location.origin;
  return `${base}/ar/callback?next=/enterprise/admin`;
}

/**
 * Sign-in for the enterprise seat console.
 *
 * The same ways in as the app, so the owner never needs a second credential:
 * Google, or email and password. Apple is native-only in this project (the web
 * OAuth flow has no client secret configured), so an Apple user gets an emailed
 * link instead, which Apple relays even to a hidden address.
 */
export default function EnterpriseLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = await createArBrowserClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      // The server gate decides whether this account owns an org.
      router.replace("/enterprise/admin");
      router.refresh();
    } catch (err: any) {
      setError(
        err?.message === "Invalid login credentials"
          ? "That email and password did not match an account."
          : err?.message ?? "Sign-in failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  // Same account, same door as the app. Most owners sign in with Google there,
  // and have no password to type here.
  async function withGoogle() {
    setError(null);
    setBusy(true);
    const { error } = await createArBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: consoleCallback() },
    });
    // On success the browser is already leaving for Google.
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  async function sendLink() {
    setError(null);
    setBusy(true);
    try {
      const { error } = await createArBrowserClient().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: consoleCallback() },
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err?.message ?? "Could not send the link.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="ec-gate-panel">
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
          Check <strong>{email}</strong> for a sign-in link, and open it on this device.
        </p>
        <button className="ec-btn ec-btn--ghost ec-btn--sm" type="button" onClick={() => setSent(false)}>
          Use a different way to sign in
        </button>
      </div>
    );
  }

  return (
    <form className="ec-gate-panel" onSubmit={signIn}>
      <button className="ec-btn ec-btn--google ec-btn--block" type="button" onClick={withGoogle} disabled={busy}>
        <GoogleG /> Continue with Google
      </button>

      <div className="ec-divider">or with email</div>

      <label className="ec-field">
        <span className="ec-label">Work email</span>
        <input
          className="ec-input"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </label>

      <label className="ec-field">
        <span className="ec-label">Password</span>
        <input
          className="ec-input"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your KaunTech app password"
        />
      </label>

      {error ? <div className="ec-alert ec-alert--error" role="alert">{error}</div> : null}

      <button className="ec-btn ec-btn--primary ec-btn--block" type="submit" disabled={busy || !email || !password}
        data-state={busy ? "loading" : undefined}>
        {busy ? "Signing in…" : "Sign in"}
      </button>

      <button className="ec-btn ec-btn--ghost ec-btn--sm" type="button" onClick={sendLink} disabled={busy || !email}>
        Signed up with Apple? Email me a sign-in link
      </button>
      <p className="ec-hint" style={{ textAlign: "center" }}>Use the same way you sign in to the KaunTech app.</p>
    </form>
  );
}
