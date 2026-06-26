"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lightweight, dependency-free image cropper for the AR card target. Drag to
 * pan, slider to zoom, fixed business-card aspect frame. Exports a tight JPEG
 * so the printed-card image MindAR tracks is consistent and free of background
 * clutter (which improves tracking). Returns a File via onConfirm.
 */
const FRAME_MAX = 360;

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
  // Responsive crop frame: shrinks to fit narrow screens (so the modal never
  // overflows) and caps at the desktop size. All the crop math derives from
  // FRAME_W, so it stays consistent at any width; the exported canvas is a fixed
  // high resolution regardless of the on-screen frame size.
  const [FRAME_W, setFrameW] = useState(() =>
    typeof window !== "undefined" ? Math.min(FRAME_MAX, window.innerWidth - 64) : FRAME_MAX,
  );
  useEffect(() => {
    const onResize = () => setFrameW(Math.min(FRAME_MAX, window.innerWidth - 64));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const frameH = Math.round(FRAME_W / aspect);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // degrees, about the image center
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const srcUrl = useRef<string>("");

  // base scale = "cover" the frame at zoom 1
  const base = img ? Math.max(FRAME_W / img.naturalWidth, frameH / img.naturalHeight) : 1;
  const dispW = img ? img.naturalWidth * base * zoom : 0;
  const dispH = img ? img.naturalHeight * base * zoom : 0;

  // Clamp the image so it keeps covering the frame. Rotation-aware: we clamp the
  // image *center* using the rotated bounding box, which reduces exactly to the
  // old axis-aligned clamp at rotation 0. When a side of the rotated box can no
  // longer cover the frame (e.g. a 90° turn of a landscape card), that axis is
  // centered instead, and any exposed corners are filled white on export.
  function clamp(
    o: { x: number; y: number },
    rot: number = rotation,
    dW: number = dispW,
    dH: number = dispH,
  ) {
    const rad = (rot * Math.PI) / 180;
    const c = Math.abs(Math.cos(rad));
    const s = Math.abs(Math.sin(rad));
    const bbW = dW * c + dH * s;
    const bbH = dW * s + dH * c;
    let cx = o.x + dW / 2;
    let cy = o.y + dH / 2;
    cx = bbW >= FRAME_W ? Math.min(bbW / 2, Math.max(FRAME_W - bbW / 2, cx)) : FRAME_W / 2;
    cy = bbH >= frameH ? Math.min(bbH / 2, Math.max(frameH - bbH / 2, cy)) : frameH / 2;
    return { x: cx - dW / 2, y: cy - dH / 2 };
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
    setRotation(0);
    setOffset({ x: (FRAME_W - w) / 2, y: (frameH - h) / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img]);



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

  // Wrap an angle into (-180, 180].
  function wrap(deg: number) {
    return (((deg + 180) % 360) + 360) % 360 - 180;
  }
  function rotate90() {
    const next = wrap(rotation + 90);
    setOffset((o) => clamp(o, next));
    setRotation(next);
  }

  function confirm() {
    if (!img) return;

    // Higher-res, sharper target = more MindAR feature points = better tracking.
    // 1440px is a good balance (more detail than 1024 without ballooning the
    // on-device compile time). High-quality smoothing for crisp edges.
    const outW = 1440;
    const k = outW / FRAME_W; // scale frame space → output space (uniform)
    const outH = Math.round(frameH * k);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);
    // Replay the on-screen transform (pan + zoom + rotate about the image
    // center), scaled into the output canvas, so the export matches the preview
    // exactly. Corners exposed by rotation stay white.
    ctx.save();
    ctx.scale(k, k);
    ctx.translate(offset.x + dispW / 2, offset.y + dispH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -dispW / 2, -dispH / 2, dispW, dispH);
    ctx.restore();
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
        <span className="ar-muted">Drag to position, rotate to straighten, zoom to fit. If a corner gets clipped after rotating, zoom out to fit the whole card. Crop tight to the card. For the steadiest AR, shoot the card flat and square to the camera, in even light with no glare. A busier, higher-contrast design tracks best.</span>

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
                transform: `rotate(${rotation}deg)`,
                transformOrigin: "center",
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
           <input type="range" min={0.4} max={4} step={0.02} value={zoom}
            onChange={(e) => {
              const nextZoom = Number(e.target.value);
              const scale = base * nextZoom;
              const dW = img ? img.naturalWidth * scale : 0;
              const dH = img ? img.naturalHeight * scale : 0;
              setOffset((o) => {
                const cx = FRAME_W / 2;
                const cy = frameH / 2;
                const nextX = cx - (cx - o.x) * (nextZoom / zoom);
                const nextY = cy - (cy - o.y) * (nextZoom / zoom);
                return clamp({ x: nextX, y: nextY }, rotation, dW, dH);
              });
              setZoom(nextZoom);
            }} className="ar-range" />
        </div>

        <div>
          <div className="ar-row ar-between">
            <label className="ar-label" style={{ margin: 0 }}>Rotate</label>
            <button type="button" className="ar-btn ar-btn-ghost ar-btn-sm" onClick={rotate90}>
              Rotate 90°
            </button>
          </div>
          <input type="range" min={-180} max={180} step={1} value={rotation}
            onChange={(e) => {
              const nextRot = Number(e.target.value);
              setOffset((o) => clamp(o, nextRot));
              setRotation(nextRot);
            }} className="ar-range" />
        </div>

        <div className="ar-row ar-between">
          <button className="ar-btn ar-btn-ghost ar-btn-sm" onClick={onCancel}>Cancel</button>
          <button className="ar-btn ar-btn-primary ar-btn-sm" onClick={confirm} disabled={!img}>Use photo</button>
        </div>
      </div>
    </div>
  );
}
