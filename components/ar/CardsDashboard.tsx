"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EffectiveTier } from "@/lib/ar/db";
import { IconBox, IconExternal, IconLock, IconPencil, IconPlus, IconTrash } from "./icons";

export type CardStatus = "published" | "draft" | "none";

export interface DashItem {
  id: string;
  name: string;
  subtitle: string;
  status: CardStatus;
  previewUrl: string | null;
}

const TIER_LABEL: Record<EffectiveTier, string> = { free: "Free", pro: "Pro", ultra: "Ultra" };

export default function CardsDashboard({
  tier,
  arCap,
  items,
}: {
  tier: EffectiveTier;
  arCap: number;
  items: DashItem[];
}) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active AR cards count against the plan cap; cards without AR are just
  // candidates you can still set up while under the cap.
  const usedCount = items.filter((i) => i.status !== "none").length;
  const atCap = usedCount >= arCap;
  const pct = arCap > 0 ? Math.min(100, Math.round((usedCount / arCap) * 100)) : 0;

  // Active first, then cards waiting to have AR added.
  const ordered = [...items].sort((a, b) => Number(b.status !== "none") - Number(a.status !== "none"));

  async function createCard() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/ar/card", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not create the card.");
      router.push(`/ar/editor/${json.card_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the card.");
      setCreating(false);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/ar/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ card_id: id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not delete.");
      setConfirmId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="ar-dash">
      {/* Compact top bar: usage meter + Add card */}
      <div className="ar-dash-bar">
        <div className="ar-usage">
          <div className="ar-usage-head">
            <span className="ar-usage-count">
              <span className="ar-mono">{usedCount}</span>
              <span className="ar-usage-of"> / {arCap}</span> AR {arCap === 1 ? "card" : "cards"}
            </span>
            <span className="ar-usage-tier">{TIER_LABEL[tier]} plan</span>
          </div>
          <div className="ar-meter" role="progressbar" aria-valuenow={usedCount} aria-valuemin={0} aria-valuemax={arCap}>
            <div className="ar-meter-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <button
          className="ar-btn ar-btn-primary ar-dash-add"
          onClick={createCard}
          disabled={atCap || creating}
          title={atCap ? "Plan limit reached — delete one or upgrade" : "Create a new AR card"}
        >
          {atCap ? <IconLock /> : <IconPlus />}
          {creating ? "Creating…" : atCap ? "Limit reached" : "Add card"}
        </button>
      </div>

      {error ? <p className="ar-error">{error}</p> : null}

      {items.length === 0 ? (
        <div className="ar-empty">
          <span className="ar-empty-ico" aria-hidden><IconBox /></span>
          <p className="ar-empty-title">No cards yet</p>
          <p className="ar-muted" style={{ margin: 0 }}>Add your first AR card to get started.</p>
        </div>
      ) : (
        <div className="ar-grid">
          {ordered.map((item) => {
            const active = item.status !== "none";
            const confirming = confirmId === item.id;
            const busy = busyId === item.id;
            return (
              <div key={item.id} className={`ar-tile ${active ? "" : "ar-tile-idle"}`}>
                <div className="ar-tile-thumb">
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.previewUrl} alt={item.name} />
                  ) : (
                    <span className="ar-tile-thumb-empty" aria-hidden><IconBox /></span>
                  )}
                  {active ? (
                    <span className={`ar-badge ${item.status === "published" ? "ar-badge-published" : "ar-badge-draft"} ar-tile-badge`}>
                      {item.status === "published" ? "Live" : "Draft"}
                    </span>
                  ) : (
                    <span className="ar-badge ar-badge-locked ar-tile-badge">No AR</span>
                  )}
                </div>

                <div className="ar-tile-body">
                  <strong className="ar-tile-name">{item.name || "Untitled card"}</strong>
                  <span className="ar-muted">{item.subtitle || "—"}</span>
                </div>

                {confirming ? (
                  <div className="ar-tile-actions ar-tile-confirm">
                    <span className="ar-muted">Delete this AR card?</span>
                    <div className="ar-row">
                      <button className="ar-btn ar-btn-ghost ar-btn-sm" onClick={() => setConfirmId(null)} disabled={busy}>
                        Cancel
                      </button>
                      <button className="ar-btn ar-btn-sm ar-btn-danger" onClick={() => remove(item.id)} disabled={busy}>
                        {busy ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                ) : active ? (
                  <div className="ar-tile-actions">
                    <Link className="ar-btn ar-btn-primary ar-btn-sm ar-tile-edit" href={`/ar/editor/${item.id}`}>
                      <IconPencil /> Edit
                    </Link>
                    {item.status === "published" ? (
                      <a className="ar-icon-btn ar-icon-btn-bordered" title="Open AR viewer" href={`/ar/view/${item.id}`} target="_blank" rel="noreferrer">
                        <IconExternal />
                      </a>
                    ) : null}
                    <button className="ar-icon-btn ar-icon-btn-bordered ar-icon-danger" title="Delete AR card" onClick={() => setConfirmId(item.id)}>
                      <IconTrash />
                    </button>
                  </div>
                ) : (
                  <div className="ar-tile-actions">
                    {atCap ? (
                      <button className="ar-btn ar-btn-ghost ar-btn-sm ar-tile-edit" disabled title="Plan limit reached">
                        <IconLock /> Locked
                      </button>
                    ) : (
                      <Link className="ar-btn ar-btn-primary ar-btn-sm ar-tile-edit" href={`/ar/editor/${item.id}`}>
                        <IconPlus /> Set up AR
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
