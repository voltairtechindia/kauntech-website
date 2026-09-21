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
      <div className="ar-card">
        <p style={{ margin: 0 }}>
          Check <strong>{email}</strong> for a sign-in link. Open it on this device.
        </p>
      </div>
    );
  }

  return (
    <form className="ar-card ar-stack" onSubmit={signIn}>
      <p className="ar-muted" style={{ margin: 0, fontSize: 13 }}>
        Sign in the same way you do in the KaunTech app.
      </p>

      <button className="ar-btn" type="button" onClick={withGoogle} disabled={busy}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <GoogleG /> Continue with Google
      </button>

      <div className="ar-row" style={{ alignItems: "center", gap: 10 }}>
        <span style={{ flex: 1, height: 1, background: "var(--ar-border)" }} />
        <span className="ar-muted" style={{ fontSize: 12 }}>or with email</span>
        <span style={{ flex: 1, height: 1, background: "var(--ar-border)" }} />
      </div>

      <div>
        <label className="ar-label" htmlFor="ent-email">Work email</label>
        <input
          id="ent-email"
          className="ar-field"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </div>

      <div>
        <label className="ar-label" htmlFor="ent-password">Password</label>
        <input
          id="ent-password"
          className="ar-field"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your KaunTech app password"
        />
      </div>

      {error ? <p className="ar-error" style={{ margin: 0 }}>{error}</p> : null}

      <button className="ar-btn ar-btn-primary" type="submit" disabled={busy || !email || !password}>
        {busy ? "Signing in…" : "Sign in"}
      </button>

      <button
        className="ar-btn ar-btn-ghost ar-btn-sm"
        type="button"
        onClick={sendLink}
        disabled={busy || !email}
      >
        Signed up with Apple? Email me a sign-in link
      </button>
    </form>
  );
}
