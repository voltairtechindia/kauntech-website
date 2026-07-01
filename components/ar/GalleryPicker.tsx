"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Center, OrbitControls, useGLTF } from "@react-three/drei";
import type { GalleryAsset } from "@/lib/ar/gallery";
import { IconSearch, IconX } from "./icons";

/**
 * Modal picker for the curated AR gallery — a flat, searchable grid (no
 * categories). Each cell renders the actual .glb in a tiny auto-fitted, slowly
 * orbiting canvas, so what you see is what lands on the card.
 *
 * Each live canvas is its OWN WebGL context, and a browser allows only ~16 at
 * once — so a full gallery (plus the editor's own canvas underneath) would blow
 * that cap and the browser silently kills the OLDEST context (the editor's),
 * taking the whole scene down with a "context lost". `LazyPreview` therefore
 * only mounts a cell's canvas while it's actually scrolled into view and unmounts
 * it (freeing the context) when it scrolls away, so the live count stays bounded
 * no matter how many models the gallery holds.
 */
function PreviewModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  // Clone so the same asset can preview here and live on the card at once.
  return <primitive object={scene.clone()} />;
}

// Hard cap on simultaneously-live preview contexts, kept well under the browser's
// ~16 WebGL limit — the editor's own canvas counts too, and scrolling can briefly
// overlap an outgoing and incoming row. In-view cells over the cap wait for a slot.
const MAX_LIVE_PREVIEWS = 8;
let livePreviews = 0;
const previewWaiters = new Set<() => void>();
function acquirePreviewSlot(): boolean {
  if (livePreviews < MAX_LIVE_PREVIEWS) {
    livePreviews++;
    return true;
  }
  return false;
}
function releasePreviewSlot() {
  livePreviews = Math.max(0, livePreviews - 1);
  const next = previewWaiters.values().next().value;
  if (next) {
    previewWaiters.delete(next);
    next();
  }
}

// Mount the (context-owning) <Preview> only while the cell is on screen AND a
// render slot is free — so the live-context count can never exceed the cap.
function LazyPreview({ asset }: { asset: GalleryAsset }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);
  const [hasSlot, setHasSlot] = useState(false);
  const holding = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // IntersectionObserver accounts for the grid's own scroll-clipping, so a cell
    // scrolled out of the modal reports not-intersecting and releases its slot.
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    let active = true;
    const grant = () => {
      if (!active) return;
      holding.current = true;
      setHasSlot(true);
    };
    if (acquirePreviewSlot()) grant();
    else previewWaiters.add(grant);
    return () => {
      active = false;
      previewWaiters.delete(grant);
      if (holding.current) {
        holding.current = false;
        releasePreviewSlot();
      }
      setHasSlot(false);
    };
  }, [inView]);

  return (
    <span className="ar-gallery-canvas" ref={ref}>
      {hasSlot ? <Preview asset={asset} /> : null}
    </span>
  );
}

function Preview({ asset }: { asset: GalleryAsset }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.4, 2.4], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.9} />
      <hemisphereLight intensity={0.5} color="#ffffff" groundColor="#cfcbc3" />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <Suspense fallback={null}>
        <Bounds fit clip margin={1.25}>
          <Center>
            <PreviewModel url={asset.glbUrl} />
          </Center>
        </Bounds>
      </Suspense>
      <OrbitControls
        makeDefault
        autoRotate
        autoRotateSpeed={2.4}
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
      />
    </Canvas>
  );
}

export default function GalleryPicker({
  assets,
  onClose,
  onPick,
}: {
  assets: GalleryAsset[];
  onClose: () => void;
  onPick: (asset: GalleryAsset) => void;
}) {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return assets;
    return assets.filter((a) =>
      `${a.name} ${a.category ?? ""} ${a.platform ?? ""}`.toLowerCase().includes(needle),
    );
  }, [assets, q]);

  return (
    <div className="ar-modal-overlay" onClick={onClose}>
      <div className="ar-gallery-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ar-gallery-head">
          <div>
            <span className="ar-label" style={{ margin: 0 }}>KaunTech gallery</span>
            <span className="ar-muted" style={{ display: "block" }}>
              Ready-made 3D models. Pick one to drop it on your card.
            </span>
          </div>
          <button className="ar-icon-btn" title="Close" onClick={onClose}><IconX /></button>
        </div>

        <div className="ar-gallery-search">
          <IconSearch />
          <input
            className="ar-gallery-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search models…"
            autoFocus
          />
          {q ? (
            <button className="ar-icon-btn" title="Clear" onClick={() => setQ("")}><IconX /></button>
          ) : null}
        </div>

        <div className="ar-gallery-grid">
          {results.length === 0 ? (
            <p className="ar-muted ar-gallery-empty">
              {assets.length === 0 ? "No models yet." : `No models match “${q}”.`}
            </p>
          ) : (
            results.map((a) => (
              <button
                key={a.id}
                className="ar-gallery-cell"
                onClick={() => { onPick(a); onClose(); }}
                title={a.name}
              >
                <LazyPreview asset={a} />
                <span className="ar-gallery-name">{a.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
