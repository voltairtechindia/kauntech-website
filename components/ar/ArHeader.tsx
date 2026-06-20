"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createArBrowserClient } from "@/lib/ar/appAuthBrowser";

/** Brand bar for the /ar section. Shows a sign-out button when authed. */
export default function ArHeader({ email }: { email?: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await createArBrowserClient().auth.signOut();
      router.replace("/ar/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="ar-header">
      <div className="ar-brand">
        <span className="ar-brand-dot" />
        KaunTech <span className="ar-mono" style={{ color: "var(--ar-orange-deep)" }}>AR</span>
      </div>
      {email ? (
        <div className="ar-row">
          <span className="ar-muted">{email}</span>
          <button className="ar-btn ar-btn-ghost" onClick={signOut} disabled={busy}>
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : null}
    </header>
  );
}
