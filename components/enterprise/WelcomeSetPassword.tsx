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
    <div className="ar-root">
      <div className="ar-container ar-stack" style={{ maxWidth: 460, paddingTop: "var(--ar-sp-3xl)" }}>
        {stage.kind === "loading" ? (
          <p className="ar-muted">Checking your invite…</p>
        ) : null}

        {stage.kind === "invalid" ? (
          <>
            <h1 className="ar-h1">That link did not work</h1>
            <p className="ar-error" style={{ margin: 0 }}>{stage.reason}</p>
            <p className="ar-muted">
              Ask whoever manages your team to send the invite again, or open the KaunTech app and use
              “Forgot password” with your work email.
            </p>
          </>
        ) : null}

        {stage.kind === "ready" ? (
          <>
            <div>
              <h1 className="ar-h1">Welcome to your team</h1>
              <p className="ar-muted" style={{ marginTop: "var(--ar-sp-sm)" }}>
                Choose a password for <strong>{stage.email}</strong>. You will use it to sign in to the
                KaunTech app, where you will see your team&apos;s leads.
              </p>
            </div>

            <form className="ar-card ar-stack" onSubmit={save}>
              <div>
                <label className="ar-label" htmlFor="w-pw">New password</label>
                <input
                  id="w-pw" className="ar-field" type="password" autoComplete="new-password"
                  required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label className="ar-label" htmlFor="w-pw2">Type it again</label>
                <input
                  id="w-pw2" className="ar-field" type="password" autoComplete="new-password"
                  required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              {error ? <p className="ar-error" style={{ margin: 0 }}>{error}</p> : null}
              <button className="ar-btn ar-btn-primary" type="submit" disabled={busy}>
                {busy ? "Saving…" : "Set password"}
              </button>
            </form>
          </>
        ) : null}

        {stage.kind === "done" ? (
          <>
            <h1 className="ar-h1">You are all set</h1>
            <div className="ar-card ar-stack">
              <p style={{ margin: 0 }}>
                Open the KaunTech app and sign in with:
              </p>
              <p style={{ margin: 0 }}>
                <strong>{stage.email}</strong>
                <br />
                <span className="ar-muted">and the password you just chose.</span>
              </p>
              <a className="ar-btn ar-btn-primary" href="/get" style={{ textAlign: "center", textDecoration: "none" }}>
                Get the KaunTech app
              </a>
            </div>
            <p className="ar-muted" style={{ fontSize: 13 }}>
              Your plan and allowance come from your company, so there is nothing to buy.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
