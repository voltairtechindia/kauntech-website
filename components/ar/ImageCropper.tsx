"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lightweight, dependency-free image cropper for the AR card target. Drag to
 * pan, slider to zoom, fixed business-card aspect frame. Exports a tight JPEG
 * so the printed-card image MindAR tracks is consistent and free of background
 * clutter (which improves tracking). Returns a File via onConfirm.
 */
const FRAME_W = 360;

export default function ImageCropper({
  file,
  aspect = 1.75, // 3.5in × 2in business card
  title = "Crop card photo",
  onConfirm,
  onCancel,
}: {
  file: File;
  aspect?: number;
  title?: string;
  onConfirm: (cropped: File) => void;
  onCancel: () => void;
}) {
  const frameH = Math.round(FRAME_W / aspect);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const srcUrl = useRef<string>("");

  // base scale = "cover" the frame at zoom 1
  const base = img ? Math.max(FRAME_W / img.naturalWidth, frameH / img.naturalHeight) : 1;
  const dispW = img ? img.naturalWidth * base * zoom : 0;
  const dispH = img ? img.naturalHeight * base * zoom : 0;

  function clamp(o: { x: number; y: number }) {
    return {
      x: Math.min(0, Math.max(FRAME_W - dispW, o.x)),
      y: Math.min(0, Math.max(frameH - dispH, o.y)),
    };
  }

  useEffect(() => {
    const url = URL.createObjectURL(file);
    srcUrl.current = url;
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // center once when the image first loads
  useEffect(() => {
    if (!img) return;
    const w = img.naturalWidth * base;
    const h = img.naturalHeight * base;
    setZoom(1);
    setOffset({ x: (FRAME_W - w) / 2, y: (frameH - h) / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img]);

  // keep the image covering the frame as zoom changes
  useEffect(() => {
    setOffset((o) => clamp(o));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const next = { x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) };
    setOffset(clamp(next));
  }
  function onPointerUp(e: React.PointerEvent) {
    drag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  }

  function confirm() {
    if (!img) return;
    const scale = base * zoom;
    const sx = -offset.x / scale;
    const sy = -offset.y / scale;
    const sw = FRAME_W / scale;
    const sh = frameH / scale;

    // Higher-res, sharper target = more MindAR feature points = better tracking.
    // 1440px is a good balance (more detail than 1024 without ballooning the
    // on-device compile time). High-quality smoothing for crisp edges.
    const outW = 1440;
    const outH = Math.round(outW / aspect);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const baseName = (file.name || "card").replace(/\.[^.]+$/, "");
        onConfirm(new File([blob], `${baseName}-crop.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div className="ar-modal-overlay" onClick={onCancel}>
      <div className="ar-modal" onClick={(e) => e.stopPropagation()}>
        <span className="ar-label" style={{ margin: 0 }}>{title}</span>
        <span className="ar-muted">Drag to position, zoom to fit. Crop tight to the card. For the steadiest AR, shoot the card flat and square to the camera, in even light with no glare. A busier, higher-contrast design tracks best.</span>

        <div
          className="ar-crop-frame"
          style={{ width: FRAME_W, height: frameH }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={srcUrl.current}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                width: dispW,
                height: dispH,
                left: offset.x,
                top: offset.y,
                maxWidth: "none",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          ) : (
            <span className="ar-muted" style={{ margin: "auto" }}>Loading…</span>
          )}
          <div className="ar-crop-grid" aria-hidden />
        </div>

        <div>
          <label className="ar-label">Zoom</label>
          <input type="range" min={1} max={4} step={0.02} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))} className="ar-range" />
        </div>

        <div className="ar-row ar-between">
          <button className="ar-btn ar-btn-ghost ar-btn-sm" onClick={onCancel}>Cancel</button>
          <button className="ar-btn ar-btn-primary ar-btn-sm" onClick={confirm} disabled={!img}>Use photo</button>
        </div>
      </div>
    </div>
  );
}
