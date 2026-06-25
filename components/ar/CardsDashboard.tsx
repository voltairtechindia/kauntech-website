"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { EffectiveTier } from "@/lib/ar/db";
import { IconExternal, IconGlobe, IconLock, IconMail, IconPencil, IconPhone, IconPlus, IconTrash } from "./icons";

export type CardStatus = "published" | "draft" | "none";

export interface DashItem {
  id: string;
  name: string;
  subtitle: string;
  status: CardStatus;
  /** QR image src (custom image URL or a generated vCard QR data URL). */
  qrSrc: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
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
  const [error, setError] = useState<string | null>(null);
  // Cards whose AR we just removed — optimistically flip them to idle ("Set up
  // AR") until the server refetch lands. We never hide the card itself: removing
  // AR on the web keeps the underlying business card (cards are app-only).
  const [unArmedIds, setUnArmedIds] = useState<Set<string>>(new Set());

  // Active AR cards count against the plan cap; cards without AR are just
  // candidates you can still set up while under the cap.
  const visible = items.map((i) => (unArmedIds.has(i.id) ? { ...i, status: "none" as CardStatus } : i));
  const usedCount = visible.filter((i) => i.status !== "none").length;
  const atCap = usedCount >= arCap;
  const pct = arCap > 0 ? Math.min(100, Math.round((usedCount / arCap) * 100)) : 0;

  // Active first, then cards waiting to have AR added.
  const ordered = [...visible].sort((a, b) => Number(b.status !== "none") - Number(a.status !== "none"));

  // Re-pull the server state whenever the tab regains focus — so coming back
  // from the editor (or the app) reflects new/edited AR cards without a manual
  // reload. The page is force-dynamic, so this just re-runs the server render.
  useEffect(() => {
    function refresh() {
      if (document.visibilityState === "visible") router.refresh();
    }
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

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
      {/* Usage meter — cards are created in the app, so there's no "Add card". */}
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
      </div>

      {error ? <p className="ar-error">{error}</p> : null}

      {visible.length === 0 ? (
        <div className="ar-empty">
          <span className="ar-empty-ico" aria-hidden>
            <IconPlus />
          </span>
          <p className="ar-empty-title">No cards yet</p>
          <p className="ar-muted" style={{ margin: "0 0 4px", maxWidth: "420px" }}>
            Your business cards are made in the KaunTech app. Create a v-card there and it&apos;ll
            show up here to add AR to.
          </p>
          <a className="ar-btn ar-btn-ghost" href="https://www.kauntech.com/get">
            Get the app
          </a>
        </div>
      ) : (
        <div className="ar-grid ar-cardgrid">
          {ordered.map((item) => {
            const active = item.status !== "none";
            const confirming = confirmId === item.id;
            const busy = busyId === item.id;
            const hasContacts = !!(item.phone || item.email || item.website);
            return (
              <div
                key={item.id}
                className={`ar-tile ar-cardtile ${active ? "" : "ar-tile-idle"}`}
                style={{ ["--tile-accent" as string]: item.accent }}
              >
                {/* App-style business card face — dark, accent gradient border,
                    QR hero, identity, contact rows and the KAUNTECH wordmark. */}
                <div className="ar-cardface">
                  {active ? (
                    <span className={`ar-badge ${item.status === "published" ? "ar-badge-published" : "ar-badge-draft"} ar-cardface-badge`}>
                      {item.status === "published" ? "Live" : "Draft"}
                    </span>
                  ) : (
                    <span className="ar-badge ar-badge-locked ar-cardface-badge">No AR</span>
                  )}

                  {/* QR hero */}
                  <div className="ar-cardface-qr">
                    <span className="ar-qr-bracket ar-qr-tl" />
                    <span className="ar-qr-bracket ar-qr-tr" />
                    <span className="ar-qr-bracket ar-qr-bl" />
                    <span className="ar-qr-bracket ar-qr-br" />
                    <div className="ar-cardface-qrtile">
                      {item.qrSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="ar-cardface-qrimg" src={item.qrSrc} alt={`${item.name} QR`} />
                      ) : (
                        <span className="ar-cardface-monogram">{initialOf(item.name)}</span>
                      )}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="ar-cardface-qrlogo" src="/assets/Kauntech_logo.png" alt="" />
                    </div>
                  </div>

                  {item.isDefault ? (
                    <span className="ar-cardface-primary">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
                      </svg>
                      PRIMARY CARD
                    </span>
                  ) : null}

                  <div className="ar-cardface-divider" />

                  {/* Identity */}
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
                      {item.subtitle ? <span className="ar-cardface-role">{item.subtitle}</span> : null}
                    </span>
                  </div>

                  {/* Contact rows */}
                  {hasContacts ? (
                    <div className="ar-cardface-contacts">
                      {item.phone ? (
                        <span className="ar-cardface-contact">
                          <IconPhone /> <span className="ar-cardface-contact-val">{item.phone}</span>
                        </span>
                      ) : null}
                      {item.email ? (
                        <span className="ar-cardface-contact">
                          <IconMail /> <span className="ar-cardface-contact-val">{item.email}</span>
                        </span>
                      ) : null}
                      {item.website ? (
                        <span className="ar-cardface-contact">
                          <IconGlobe /> <span className="ar-cardface-contact-val">{item.website}</span>
                        </span>
                      ) : null}
                    </div>
                  ) : null}

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
