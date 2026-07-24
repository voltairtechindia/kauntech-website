"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { EffectiveTier, TokenBreakdown } from "@/lib/ar/db";
import { IconCheck, IconCopy, IconDownload, IconExternal, IconGlobe, IconLock, IconMail, IconPencil, IconPhone, IconPlus, IconQr, IconShare, IconTrash, IconX } from "./icons";
import StorageMeter from "./StorageMeter";
import TokenMeter from "./TokenMeter";

export type CardStatus = "published" | "draft" | "none";

export interface DashItem {
  id: string;
  name: string;
  subtitle: string;
  status: CardStatus;
  /** QR image src (custom image URL or a generated vCard QR data URL). */
  qrSrc: string | null;
  /** True when we generated the QR (so the K logo is overlaid); false for a
   *  user's custom uploaded QR image, which is shown exactly as-is. */
  qrGenerated: boolean;
  phone: string | null;
  email: string | null;
  website: string | null;
  /** Card accent (#RRGGBB) - drives the gradient border, like the app card. */
  accent: string;
  avatarUrl: string | null;
  isDefault: boolean;
  /** The vCard payload the card's QR encodes (built server-side, same as the
   *  app) - powers the Share sheet's .vcf download and high-res QR. */
  vcard: string;
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
  storageUsedBytes,
  storageCapBytes,
  tokensUsed,
  tokensLimit,
  tokenBreakdown,
  tokensResetAt,
}: {
  tier: EffectiveTier;
  arCap: number;
  items: DashItem[];
  storageUsedBytes: number;
  storageCapBytes: number;
  tokensUsed: number;
  tokensLimit: number;
  tokenBreakdown: TokenBreakdown;
  tokensResetAt: string | null;
}) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Card whose Share sheet is open (QR download / .vcf / AR link).
  const [shareItem, setShareItem] = useState<DashItem | null>(null);
  // Cards whose AR we just removed - optimistically flip them to idle ("Set up
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

  // Re-pull the server state whenever the tab regains focus - so coming back
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
      {/* Usage / storage / tokens combined into one card. Cards are created in
          the app, so there's no "Add card". */}
      <div className="ar-dash-combined">
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
          <span className="ar-storage-foot">{atCap ? "Plan cap reached" : `${Math.max(0, arCap - usedCount)} left`}</span>
        </div>

        <StorageMeter
          usedBytes={storageUsedBytes}
          capBytes={storageCapBytes}
          label={`${TIER_LABEL[tier]} cloud storage`}
        />

        <TokenMeter used={tokensUsed} limit={tokensLimit} breakdown={tokenBreakdown} resetAt={tokensResetAt} hideHint />

        {/* The longer "what counts / what uses space" copy lives here, tucked
            into one collapsible note so the three meters stay scannable. */}
        <details className="ar-dash-notes">
          <summary>How these limits work</summary>
          <ul>
            <li>
              Each card with published 3D or media models counts toward your {TIER_LABEL[tier]} plan
              cap.
            </li>
            <li>
              Cloud storage is one budget shared by your card photos and AR content (3D models,
              images, video, audio). Bigger or more detailed assets use more.
            </li>
            <li>
              AR building spends from your monthly token pool, shared with the app&apos;s AI
              features: a build uses 60-80 tokens, a 3D model 40, a video 100.
            </li>
          </ul>
        </details>
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
                {/* App-style business card face - dark, accent gradient border,
                    QR hero, identity, contact rows and the KAUNTECH wordmark. */}
                <div className="ar-cardface">
                  {active ? (
                    <span
                      className={`ar-status-chip ar-cardface-badge ${item.status === "published" ? "ar-status-published" : "ar-status-draft"}`}
                      title={item.status === "published" ? "Published" : "Draft"}
                      aria-label={item.status === "published" ? "Published" : "Draft"}
                    >
                      {item.status === "published" ? <IconCheck viewBox="3 3 18 18" /> : <IconPencil />}
                    </span>
                  ) : (
                    <span className="ar-status-chip ar-status-none ar-cardface-badge" title="No AR yet" aria-label="No AR yet">
                      <IconPlus />
                    </span>
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
                      {item.qrSrc && item.qrGenerated ? (
                        // Center K badge - only on QRs we generate, matching the app.
                        // A user's custom QR image is shown untouched.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="ar-cardface-qrlogo" src="/assets/logo-mark.png" alt="" />
                      ) : null}
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
                    <button className="ar-icon-btn-bordered" title="Share - QR, contact file & AR link" aria-label="Share this card" onClick={() => setShareItem(item)}>
                      <IconShare />
                    </button>
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
                    <button className="ar-icon-btn-bordered" title="Share - QR & contact file" aria-label="Share this card" onClick={() => setShareItem(item)}>
                      <IconShare />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {shareItem ? <ShareSheet item={shareItem} onClose={() => setShareItem(null)} /> : null}
    </div>
  );
}

/* ── Share sheet ──────────────────────────────────────────────────────────
   Everything the owner needs to hand their card around, generated fully
   client-side: a high-res contact QR (same vCard payload + center K badge as
   the app's generated QR), a downloadable .vcf, and - when the AR is
   published - the public viewer link a phone opens straight into. */
function ShareSheet({ item, onClose }: { item: DashItem; onClose: () => void }) {
  const [qrPng, setQrPng] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const published = item.status === "published";
  const viewUrl = `${typeof window !== "undefined" ? window.location.origin : "https://www.kauntech.com"}/ar/view/${item.id}`;
  const slug = (item.name || "card").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "card";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Build the QR lazily (dynamic import keeps `qrcode` out of the page chunk),
  // then overlay the K badge on a canvas - errorCorrectionLevel M leaves room
  // for a ~26% centre logo, exactly like the app's QRGenerator.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const base = await QRCode.toDataURL(item.vcard, {
          width: 1024,
          margin: 2,
          errorCorrectionLevel: "M",
          color: { dark: "#09090B", light: "#FFFFFF" },
        });
        const composed = await new Promise<string>((resolve) => {
          const qrImg = new Image();
          qrImg.onload = () => {
            const size = 1024;
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(base);
            ctx.drawImage(qrImg, 0, 0, size, size);
            const logo = new Image();
            const finish = () => resolve(canvas.toDataURL("image/png"));
            logo.onload = () => {
              const d = size * 0.26;
              const cx = size / 2;
              const cy = size / 2;
              // Same orange-red badge the app draws behind the K mark.
              ctx.fillStyle = "#BF4321";
              ctx.beginPath();
              ctx.arc(cx, cy, d / 2, 0, Math.PI * 2);
              ctx.fill();
              const pad = d * 0.18;
              ctx.drawImage(logo, cx - d / 2 + pad, cy - d / 2 + pad, d - pad * 2, d - pad * 2);
              finish();
            };
            logo.onerror = finish;
            logo.src = "/assets/logo-mark.png";
          };
          qrImg.onerror = () => resolve(base);
          qrImg.src = base;
        });
        if (alive) setQrPng(composed);
      } catch {
        if (alive) setQrPng(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [item]);

  function download(name: string, href: string) {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadVcf() {
    const url = URL.createObjectURL(new Blob([item.vcard], { type: "text/vcard;charset=utf-8" }));
    download(`${slug}.vcf`, url);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(viewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable - the visible link row still allows manual copy */
    }
  }

  return (
    <div className="ar-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Share ${item.name}`}>
      <div className="ar-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ar-share-head">
          <div>
            <h3 className="ar-share-title">Share “{item.name}”</h3>
            <p className="ar-share-sub">
              {published
                ? "Scanning the QR saves your contact; the AR link opens your live card in any phone browser."
                : "Scanning the QR saves your contact. Publish the card's AR to get a shareable viewer link too."}
            </p>
          </div>
          <button className="ar-icon-btn" onClick={onClose} aria-label="Close share sheet">
            <IconX />
          </button>
        </div>

        <div className="ar-qrbox">
          {qrPng ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrPng} alt={`${item.name} contact QR code`} />
          ) : (
            <span className="ar-muted">Generating QR…</span>
          )}
        </div>

        {published ? (
          <div className="ar-share-link" title={viewUrl}>
            <IconQr />
            <span>{viewUrl.replace(/^https?:\/\//, "")}</span>
          </div>
        ) : null}

        <div className="ar-share-actions">
          <button className="ar-btn ar-btn-ghost" onClick={() => qrPng && download(`kauntech-${slug}-qr.png`, qrPng)} disabled={!qrPng}>
            <IconDownload /> QR as PNG
          </button>
          <button className="ar-btn ar-btn-ghost" onClick={downloadVcf}>
            <IconDownload /> Contact (.vcf)
          </button>
          {published ? (
            <>
              <button className="ar-btn ar-btn-primary ar-share-wide" onClick={copyLink}>
                {copied ? <IconCheck /> : <IconCopy />} {copied ? "Link copied" : "Copy AR link"}
              </button>
              <a className="ar-btn ar-btn-ghost ar-share-wide" href={viewUrl} target="_blank" rel="noreferrer">
                <IconExternal /> Open AR viewer
              </a>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
