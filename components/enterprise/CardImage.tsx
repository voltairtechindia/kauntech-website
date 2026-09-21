"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, ImageOff, Loader2, Maximize2, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { createArBrowserClient } from "@/lib/ar/appAuthBrowser";
import { cardImagePath } from "@/lib/enterpriseLeadDraft";

/**
 * The photo of the card, and a viewer for reading what the OCR could not.
 *
 * Card images live in a private bucket. The app stores a URL signed for a year,
 * so an old lead's link is expired rather than missing — on the first error we
 * re-sign from the path as the signed-in owner (storage policy: anyone in the
 * org may read a teammate's card images) instead of showing a broken frame.
 */

const MIN = 1;
const MAX = 6;

async function resign(stored: string): Promise<string | null> {
  const path = cardImagePath(stored);
  if (!path) return null;
  const { data } = await createArBrowserClient().storage.from("card-images").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export default function CardImage({
  url,
  name,
  size = 48,
}: {
  url: string;
  name: string;
  /** Thumbnail edge, in px. The viewer is always full-screen. */
  size?: number;
}) {
  const [src, setSrc] = useState(url);
  const [dead, setDead] = useState(false);
  const [open, setOpen] = useState(false);
  const tried = useRef(false);

  useEffect(() => { setSrc(url); setDead(false); tried.current = false; }, [url]);

  // One re-sign attempt per URL: a second failure is a missing object, not an
  // expired token, and retrying would loop.
  const onError = useCallback(async () => {
    if (tried.current) { setDead(true); return; }
    tried.current = true;
    const fresh = await resign(url).catch(() => null);
    if (fresh) setSrc(fresh);
    else setDead(true);
  }, [url]);

  if (dead) {
    return (
      <span className="ec-card-thumb ec-card-thumb--dead" style={{ width: size, height: size }} title="The card photo is no longer stored">
        <ImageOff aria-hidden />
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        className="ec-card-thumb"
        style={{ width: size, height: size }}
        onClick={() => setOpen(true)}
        aria-label={`View the card photo for ${name || "this lead"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" onError={onError} />
        <span className="ec-card-thumb-zoom" aria-hidden><Maximize2 /></span>
      </button>
      {open ? <Lightbox src={src} name={name} onError={onError} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function Lightbox({
  src,
  name,
  onError,
  onClose,
}: {
  src: string;
  name: string;
  onError: () => void;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [turn, setTurn] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const to = (z: number) => {
    const next = Math.min(MAX, Math.max(MIN, Math.round(z * 10) / 10));
    setZoom(next);
    if (next === 1) setPan({ x: 0, y: 0 });
  };

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      // Escape closes the viewer, not the drawer underneath it.
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      else if (e.key === "+" || e.key === "=") to(zoom + 0.5);
      else if (e.key === "-") to(zoom - 0.5);
      else if (e.key === "0") reset();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, zoom]);

  // The photo is on another origin, so `download` on a link is ignored: fetch
  // the bytes and hand the browser a blob it will save.
  async function save() {
    setSaving(true);
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `${(name || "card").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "card"}-card.jpg`;
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      window.open(src, "_blank", "noopener");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="ec-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Card photo for ${name || "this lead"}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ec-lightbox-bar">
        <span className="ec-lightbox-name">{name || "Card photo"}</span>
        <div className="ec-row" style={{ gap: 6 }}>
          <button type="button" className="ec-btn ec-btn--ghost ec-btn--icon ec-btn--sm" onClick={() => to(zoom - 0.5)}
            disabled={zoom <= MIN} aria-label="Zoom out"><ZoomOut aria-hidden /></button>
          <button type="button" className="ec-btn ec-btn--ghost ec-btn--sm" onClick={reset} aria-label="Reset zoom">
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" className="ec-btn ec-btn--ghost ec-btn--icon ec-btn--sm" onClick={() => to(zoom + 0.5)}
            disabled={zoom >= MAX} aria-label="Zoom in"><ZoomIn aria-hidden /></button>
          <button type="button" className="ec-btn ec-btn--ghost ec-btn--icon ec-btn--sm" onClick={() => setTurn((t) => (t + 90) % 360)}
            aria-label="Rotate"><RotateCw aria-hidden /></button>
          <button type="button" className="ec-btn ec-btn--ghost ec-btn--icon ec-btn--sm" onClick={save}
            disabled={saving} aria-label="Download the photo">
            {saving ? <Loader2 aria-hidden style={{ animation: "ec-spin 700ms linear infinite" }} /> : <Download aria-hidden />}
          </button>
          <button ref={closeRef} type="button" className="ec-btn ec-btn--ghost ec-btn--icon ec-btn--sm" onClick={onClose}
            aria-label="Close"><X aria-hidden /></button>
        </div>
      </div>

      <div
        className="ec-lightbox-stage"
        onWheel={(e) => to(zoom - Math.sign(e.deltaY) * 0.3)}
        onDoubleClick={() => (zoom > 1 ? reset() : to(2.5))}
        onPointerDown={(e) => {
          if (zoom <= 1) return;
          drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
          setDragging(true);
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          setPan({ x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y) });
        }}
        onPointerUp={() => { drag.current = null; setDragging(false); }}
        onPointerCancel={() => { drag.current = null; setDragging(false); }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`The scanned card for ${name || "this lead"}`}
          onError={onError}
          draggable={false}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${turn}deg)`,
            // Panning must track the pointer; only the zoom steps are eased.
            transition: dragging ? "none" : undefined,
            cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in",
          }}
        />
      </div>

      <p className="ec-lightbox-hint">Double-click to zoom · scroll to zoom · drag to move · Esc to close</p>
    </div>
  );
}
