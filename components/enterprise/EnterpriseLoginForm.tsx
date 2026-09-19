"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createArBrowserClient } from "@/lib/ar/appAuthBrowser";

/**
 * Sign-in for the enterprise seat console.
 *
 * Password, not a magic link: the person managing seats is the one who bought
 * the plan, they already have a KaunTech app password, and they will be in here
 * to reset an employee's password — waiting on an email round trip for that is
 * the wrong shape. A magic link is offered as the fallback for anyone who signed
 * up with Google and has no password.
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

  async function sendLink() {
    setError(null);
    setBusy(true);
    try {
      const { error } = await createArBrowserClient().auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/ar/callback?next=/enterprise/admin`
              : undefined,
        },
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
        Signed up with Google? Email me a link instead
      </button>
    </form>
  );
}
