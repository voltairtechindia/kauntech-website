"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createArBrowserClient } from "@/lib/ar/appAuthBrowser";
import StorageMeter from "./StorageMeter";
import { useStorageMeter } from "./StorageMeterContext";

/** Brand bar for the /ar section. Shows a sign-out button when authed, or — in
 *  the editor — the live storage meter in place of the account area. */
export default function ArHeader({ email }: { email?: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const meter = useStorageMeter()?.meter;

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
      {meter && meter.cap > 0 ? (
        <div className="ar-header-storage">
          <StorageMeter usedBytes={meter.used} capBytes={meter.cap} label={meter.label} compact />
        </div>
      ) : email ? (
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
