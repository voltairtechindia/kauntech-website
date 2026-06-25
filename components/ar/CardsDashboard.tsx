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
  /** Card accent (#RRGGBB) — drives the gradient border, like the app card. */
  accent: string;
  avatarUrl: string | null;
  isDefault: boolean;
}

function initialOf(name: string): string {
  const c = (name || "").trim().charAt(0);
  return c ? c.toUpperCase() : "?";
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
  // Cards whose AR we just removed — optimistically flip them to idle ("Set up
  // AR") until the server refetch lands. We never hide the card itself: removing
  // AR on the web keeps the underlying business card.
  const [unArmedIds, setUnArmedIds] = useState<Set<string>>(new Set());

  // Active AR cards count against the plan cap; cards without AR are just
  // candidates you can still set up while under the cap.
  const visible = items.map((i) => (unArmedIds.has(i.id) ? { ...i, status: "none" as CardStatus } : i));
  const usedCount = visible.filter((i) => i.status !== "none").length;
  const atCap = usedCount >= arCap;
  const pct = arCap > 0 ? Math.min(100, Math.round((usedCount / arCap) * 100)) : 0;

  // Active first, then cards waiting to have AR added.
  const ordered = [...visible].sort((a, b) => Number(b.status !== "none") - Number(a.status !== "none"));

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
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not remove the AR card.");
      setConfirmId(null);
      // Optimistically flip the card to idle (keeps it on the grid as a
      // "Set up AR" candidate); the refresh re-reads the real state.
      setUnArmedIds((prev) => new Set(prev).add(id));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove the AR card.");
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
          <span className="ar-muted" style={{ fontSize: "12px", marginTop: "6px", display: "block" }}>
            Each card with published 3D or media models counts toward your {TIER_LABEL[tier]} plan cap.
          </span>
        </div>

        {visible.length > 0 && (
          <button
            className="ar-btn ar-btn-primary ar-dash-add"
            onClick={createCard}
            disabled={atCap || creating}
            title={atCap ? "Plan limit reached — delete one or upgrade" : "Create a new AR card"}
          >
            {atCap ? <IconLock /> : <IconPlus />}
            {creating ? "Creating…" : atCap ? "Limit reached" : "Add card"}
          </button>
        )}
      </div>

      {error ? <p className="ar-error">{error}</p> : null}

      {visible.length === 0 ? (
        <div className="ar-empty">
          <span className="ar-empty-ico" aria-hidden><IconBox /></span>
          <p className="ar-empty-title">No cards yet</p>
          <p className="ar-muted" style={{ margin: "0 0 12px" }}>
            Your business cards from the KaunTech app show up here to add AR to. Don&apos;t have one yet?
            Create a card below, or make one in the app and it&apos;ll appear here.
          </p>
          <button
            className="ar-btn ar-btn-primary"
            onClick={createCard}
            disabled={atCap || creating}
            title={atCap ? "Plan limit reached — delete one or upgrade" : "Create a new AR card"}
          >
            {atCap ? <IconLock /> : <IconPlus />}
            {creating ? "Creating…" : atCap ? "Limit reached" : "Create first card"}
          </button>
        </div>
      ) : (
        <div className="ar-grid ar-cardgrid">
          {ordered.map((item) => {
            const active = item.status !== "none";
            const confirming = confirmId === item.id;
            const busy = busyId === item.id;
            return (
              <div
                key={item.id}
                className={`ar-tile ar-cardtile ${active ? "" : "ar-tile-idle"}`}
                style={{ ["--tile-accent" as string]: item.accent }}
              >
                {/* App-style business card face — dark, accent gradient border. */}
                <div className="ar-cardface">
                  {active ? (
                    <span className={`ar-badge ${item.status === "published" ? "ar-badge-published" : "ar-badge-draft"} ar-cardface-badge`}>
                      {item.status === "published" ? "Live" : "Draft"}
                    </span>
                  ) : (
                    <span className="ar-badge ar-badge-locked ar-cardface-badge">No AR</span>
                  )}

                  <div className="ar-cardface-hero">
                    {item.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.previewUrl} alt={item.name} />
                    ) : (
                      <span className="ar-cardface-monogram">{initialOf(item.name)}</span>
                    )}
                  </div>

                  <div className="ar-cardface-id">
                    <span className="ar-cardface-avatar">
                      {item.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.avatarUrl} alt="" />
                      ) : (
                        initialOf(item.name)
                      )}
                    </span>
                    <span className="ar-cardface-idtext">
                      <strong className="ar-cardface-name">{item.name || "Untitled card"}</strong>
                      <span className="ar-cardface-role">{item.subtitle || "—"}</span>
                    </span>
                    {item.isDefault ? <span className="ar-cardface-primary">PRIMARY</span> : null}
                  </div>

                  <div className="ar-cardface-foot">
                    <span className="ar-cardface-footline" />
                    <span className="ar-cardface-wordmark">KAUNTECH</span>
                    <span className="ar-cardface-footline" />
                  </div>
                </div>

                {/* Actions sit on the tile, below the card face. */}
                {confirming ? (
                  <div className="ar-tile-actions ar-tile-confirm">
                    <span className="ar-muted">Remove the AR from this card? Your card stays in the app.</span>
                    <div className="ar-row">
                      <button className="ar-btn ar-btn-ghost ar-btn-sm" onClick={() => setConfirmId(null)} disabled={busy}>
                        Cancel
                      </button>
                      <button className="ar-btn ar-btn-sm ar-btn-danger" onClick={() => remove(item.id)} disabled={busy}>
                        {busy ? "Removing…" : "Remove AR"}
                      </button>
                    </div>
                  </div>
                ) : active ? (
                  <div className="ar-tile-actions">
                    <Link className="ar-btn ar-btn-primary ar-btn-sm ar-tile-edit" href={`/ar/editor/${item.id}`}>
                      <IconPencil /> Edit
                    </Link>
                    {item.status === "published" ? (
                      <a className="ar-icon-btn-bordered" title="Open AR viewer" href={`/ar/view/${item.id}`} target="_blank" rel="noreferrer">
                        <IconExternal /> View AR
                      </a>
                    ) : null}
                    <button className="ar-icon-btn-bordered ar-icon-danger" title="Remove the AR from this card (keeps the card)" onClick={() => setConfirmId(item.id)}>
                      <IconTrash /> Remove AR
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
