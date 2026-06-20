"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Center, OrbitControls, useGLTF } from "@react-three/drei";
import {
  GALLERY_CATEGORIES,
  galleryByCategory,
  type GalleryAsset,
  type GalleryCategory,
} from "@/lib/ar/gallery";
import { IconX } from "./icons";

/**
 * Modal picker for the curated AR gallery. Each cell renders the actual .glb in a
 * tiny auto-fitted, slowly orbiting canvas so what you see is what lands on the
 * card. One WebGL context per visible cell — keep per-category counts modest.
 */
function PreviewModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  // Clone so the same asset can preview here and live on the card at once.
  return <primitive object={scene.clone()} />;
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
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (asset: GalleryAsset) => void;
}) {
  const [cat, setCat] = useState<GalleryCategory>("social");
  const items = galleryByCategory(cat);

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

        <div className="ar-gallery-tabs" role="tablist">
          {GALLERY_CATEGORIES.map((c) => (
            <button
              key={c.key}
              role="tab"
              aria-selected={cat === c.key}
              className={`ar-gallery-tab ${cat === c.key ? "is-active" : ""}`}
              onClick={() => setCat(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="ar-gallery-grid">
          {items.length === 0 ? (
            <p className="ar-muted ar-gallery-empty">
              Nothing in this category yet — more models are on the way.
            </p>
          ) : (
            items.map((a) => (
              <button
                key={a.id}
                className="ar-gallery-cell"
                onClick={() => { onPick(a); onClose(); }}
                title={a.name}
              >
                <span className="ar-gallery-canvas">
                  <Preview asset={a} />
                </span>
                <span className="ar-gallery-name">{a.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
