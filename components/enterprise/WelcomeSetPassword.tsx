"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { APP_SUPABASE_ANON_KEY, APP_SUPABASE_URL } from "@/lib/ar/appAuthBrowser";

/**
 * Where an invited employee lands from their invite email.
 *
 * An admin-generated invite link carries its session in the URL fragment
 * (#access_token=…&refresh_token=…&type=invite) — the implicit flow; there is no
 * PKCE verifier because the invite was not started in this browser. So this
 * page uses its own throwaway client in implicit mode, reads the fragment
 * itself, sets the password, and never persists a session: the person is not
 * signing in to the website, they are choosing the password they will type into
 * the app.
 */

type Stage =
  | { kind: "loading" }
  | { kind: "invalid"; reason: string }
  | { kind: "ready"; email: string }
  | { kind: "done"; email: string };

function readFragment(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const out: Record<string, string> = {};
  new URLSearchParams(window.location.hash.replace(/^#/, "")).forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

export default function WelcomeSetPassword() {
  const client: SupabaseClient = useMemo(
    () =>
      createClient(APP_SUPABASE_URL, APP_SUPABASE_ANON_KEY, {
        auth: { flowType: "implicit", persistSession: false, detectSessionInUrl: false, autoRefreshToken: false },
      }),
    [],
  );

  const [stage, setStage] = useState<Stage>({ kind: "loading" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const f = readFragment();
    // Strip the tokens from the address bar straight away so they are not left
    // in history or copied along with the URL.
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);

    if (f.error_description) {
      setStage({ kind: "invalid", reason: f.error_description.replace(/\+/g, " ") });
      return;
    }
    if (!f.access_token || !f.refresh_token) {
      setStage({ kind: "invalid", reason: "This page only works from the link in your invite email." });
      return;
    }

    client.auth
      .setSession({ access_token: f.access_token, refresh_token: f.refresh_token })
      .then(({ data, error: err }) => {
        if (err || !data.user) {
          setStage({ kind: "invalid", reason: "This invite link has expired or was already used." });
          return;
        }
        setStage({ kind: "ready", email: data.user.email ?? "" });
      });
  }, [client]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (stage.kind !== "ready") return;
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords do not match.");

    setBusy(true);
    const { error: err } = await client.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);

    await client.auth.signOut().catch(() => {});
    setStage({ kind: "done", email: stage.email });
  }

  return (
    <div className="ar-root ec">
      <main className="ec-gate">
        <div className="ec-gate-card">
          <div className="ec-gate-brand">
            <span className="ec-brand-kicker">KaunTech Enterprise</span>
            <h1 className="ec-gate-title">
              {stage.kind === "done" ? "You're all set" : stage.kind === "invalid" ? "That link did not work" : "Welcome to your team"}
            </h1>
            {stage.kind === "ready" ? (
              <p className="ec-sub">
                Choose a password for <strong style={{ color: "var(--ec-ink)" }}>{stage.email}</strong>. You&apos;ll use it to
                sign in to the KaunTech app, where you&apos;ll see your team&apos;s leads.
              </p>
            ) : null}
          </div>

          {stage.kind === "loading" ? (
            <div className="ec-gate-panel"><p className="ec-hint">Checking your invite…</p></div>
          ) : null}

          {stage.kind === "invalid" ? (
            <div className="ec-gate-panel">
              <div className="ec-alert ec-alert--error" role="alert">{stage.reason}</div>
              <p className="ec-hint">
                Ask whoever manages your team to send the invite again, or open the KaunTech app and use “Forgot
                password” with your work email.
              </p>
            </div>
          ) : null}

          {stage.kind === "ready" ? (
            <form className="ec-gate-panel" onSubmit={save}>
              <label className="ec-field">
                <span className="ec-label">New password</span>
                <input className="ec-input" type="password" autoComplete="new-password" required minLength={8}
                  value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
              </label>
              <label className="ec-field">
                <span className="ec-label">Type it again</span>
                <input className="ec-input" type="password" autoComplete="new-password" required
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </label>
              {error ? <div className="ec-alert ec-alert--error" role="alert">{error}</div> : null}
              <button className="ec-btn ec-btn--primary ec-btn--block" type="submit" disabled={busy}
                data-state={busy ? "loading" : undefined}>
                {busy ? "Saving…" : "Set password"}
              </button>
            </form>
          ) : null}

          {stage.kind === "done" ? (
            <div className="ec-gate-panel">
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
                Open the KaunTech app and sign in with <strong>{stage.email}</strong> and the password you just chose.
              </p>
              <a className="ec-btn ec-btn--primary ec-btn--block" href="/get">Get the KaunTech app</a>
              <p className="ec-hint">Your plan comes from your company, so there is nothing to buy.</p>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
