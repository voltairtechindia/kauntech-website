"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ArModel, OwnerCard, EffectiveTier } from "@/lib/ar/db";
import { type ArElement, type ArElementType, type ArLighting, DEFAULT_TEXT_COLOR, isDirectVideoUrl, isStreamingPageUrl, normalizeLink, readLighting, socialPreset } from "@/lib/ar/scene";
import type { GalleryAsset } from "@/lib/ar/gallery";
import { compileEightwallTarget, scoreTargetTrackability } from "@/lib/ar/compileTarget";
import { formatBytes } from "@/lib/ar/format";
import { useStorageMeter } from "./StorageMeterContext";
import type { ArTemplate } from "@/lib/ar/db";
import {
  IconAudio, IconAxisX, IconAxisY, IconAxisZ, IconBox, IconCheck, IconChevron, IconCopy, IconExternal, IconEye, IconEyeOff,
  IconImage, IconLink, IconPlus, IconRoll, IconRotate, IconScale, IconSun, IconTarget, IconText,
  IconTilt, IconTrash, IconTurn, IconUpload, IconVideo, IconX, socialIcon,
} from "./icons";

const SceneViewport = dynamic(() => import("./SceneViewport"), { ssr: false });
const ImageCropper = dynamic(() => import("./ImageCropper"), { ssr: false });
const GalleryPicker = dynamic(() => import("./GalleryPicker"), { ssr: false });
type Side = "front" | "back";

interface SceneCard {
  frontUrl?: string;
  backUrl?: string;
  target?: Side;
  // Text OCR'd from each card photo at upload time. Stored alongside the photos
  // and combined into ar_models.ocr_text so the app's markerless AR scanner can
  // match a scanned card against what this card actually prints.
  frontOcr?: string;
  backOcr?: string;
  // 8th Wall PLANAR target: grayscale luminance image of the chosen side + its
  // source dimensions, generated on save (compileEightwallTarget).
  eightwall?: { lumUrl?: string; w?: number; h?: number };
}
function readCard(model: ArModel | null): SceneCard {
  const c = (model?.scene as { card?: SceneCard })?.card;
  return c && typeof c === "object" ? c : {};
}
const isHttp = (u?: string | null): u is string => !!u && /^https?:\/\//i.test(u);

// A public URL pointing at one of OUR uploaded scene assets — they live under
// `<ar-models bucket>/<uid>/<card>/assets/`. Card photos (no `/assets/`) and
// gallery models (different bucket) never match, so the orphan-cleanup below
// can't touch them.
const isOurUploadedAsset = (u?: string | null): u is string =>
  !!u && /\/ar-models\/[^?#]*\/assets\//.test(u);

// Bucket a 0..100 trackability score into a user-facing tier. A low-detail card
// can't track steadily no matter how the viewer is tuned, so this warns the owner
// before they publish.
function trackTier(score: number | null): { label: string; color: string } | null {
  if (score == null) return null;
  if (score >= 60) return { label: "Good", color: "#16a34a" };
  if (score >= 35) return { label: "Fair", color: "#d97706" };
  return { label: "Low", color: "#dc2626" };
}

let _n = 0;
const uid = () => `el_${Date.now().toString(36)}_${(_n++).toString(36)}`;

// 3D models are authored Y-up to stand on flat ground. The printed card, laid
// down to be scanned, IS that ground — so a model dropped in with no tilt has its
// up-axis lying in the card plane and ends up on its side ("sleeping"). Standing
// it up means turning the model's +Y to point out of the card face (+Z): a +90°
// pitch about X. This is a CODE-level baseline (stored in the element's
// baseRotationX, like baseScale), NOT a user value — so the Tilt slider starts at
// 0 (upright) and is a clean offset on top of it. Effective tilt = baseRotationX +
// rotationX, applied in both the editor preview and the viewer.
const MODEL_STAND_TILT_X = Math.PI / 2;

// Measure a glb and return the scale that makes its largest dimension ≈ TARGET
// card-width units, so an icon and a giant car both land at a usable size. This
// becomes the element's baseScale; the user's Scale slider is a multiplier on it.
// Best-effort — returns 1 on any failure (then the slider still works).
const AUTO_FIT_TARGET = 0.3;
async function fitScaleFor(url: string): Promise<number> {
  try {
    // three-stdlib is what drei's useGLTF uses; three's own examples/jsm path is
    // blocked by its package exports map, so import the loader from there.
    const [{ GLTFLoader }, THREE] = await Promise.all([
      import("three-stdlib"),
      import("three"),
    ]);
    const gltf = await new GLTFLoader().loadAsync(url);
    const size = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(maxDim) || maxDim <= 0) return 1;
    return AUTO_FIT_TARGET / maxDim;
  } catch {
    return 1;
  }
}

// On-device OCR of a card photo via Tesseract.js (dynamically imported so it
// never weighs down the initial editor bundle). Accepts a File (freshly cropped)
// or an image URL (an already-saved photo). Returns trimmed text, or "" on any
// failure — callers must treat it as best-effort.
async function ocrImageSrc(src: File | string): Promise<string> {
  try {
    const Tesseract = (await import("tesseract.js")).default;
    const { data } = await Tesseract.recognize(src, "eng");
    return (data.text ?? "").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

// Read a flat asset's true aspect ratio (width / height) so its AR plane keeps
// the media's real shape instead of being squashed into a square. Best-effort —
// returns a sensible default on any failure (the plane still works).
function imageAspect(src: string): Promise<number> {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve(im.naturalWidth && im.naturalHeight ? im.naturalWidth / im.naturalHeight : 1);
    im.onerror = () => resolve(1);
    im.src = src;
  });
}
// True for a file we host (uploaded to our own storage bucket) vs. a link the
// owner pasted. We hide the raw bucket URL for hosted files — it's long, ugly,
// and confusing to see; the Replace / Delete buttons cover any change they need.
function isHostedAsset(url?: string | null): boolean {
  return !!url && url.includes("/storage/v1/object/public/");
}
function videoAspect(src: string): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => resolve(v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 16 / 9);
    v.onerror = () => resolve(16 / 9);
    v.src = src;
  });
}

function readElements(model: ArModel | null): ArElement[] {
  const raw = (model?.scene as { elements?: unknown })?.elements;
  if (!Array.isArray(raw)) return [];
  // Migrate legacy models: the +90° stand tilt used to be baked into rotationX
  // itself, so the Tilt slider opened at 90. Move that baseline into
  // baseRotationX and make rotationX a clean offset (preserving the effective
  // tilt for ANY stored value), so the slider opens at 0 = upright. Only touches
  // models with no baseRotationX yet; new/already-migrated elements are untouched.
  return (raw as ArElement[]).map((el) =>
    el.type === "model" && el.baseRotationX === undefined
      ? { ...el, baseRotationX: MODEL_STAND_TILT_X, rotationX: (el.rotationX ?? 0) - MODEL_STAND_TILT_X }
      : el,
  );
}

function typeLabel(el: ArElement): string {
  if (el.type === "social") return socialPreset(el.platform)?.label ?? "Social";
  if (el.type === "text") return el.text?.trim() ? el.text.trim().slice(0, 22) : "Text";
  // Gallery / named models carry a label (e.g. "Instagram", "Robotic Arm") so the
  // Layers list isn't a wall of identical "Model" rows.
  if (el.label?.trim()) return el.label.trim().slice(0, 22);
  return el.type[0].toUpperCase() + el.type.slice(1);
}

const TYPE_ICON: Record<ArElementType, ReactNode> = {
  model: <IconBox />,
  image: <IconImage />,
  video: <IconVideo />,
  social: socialIcon(),
  text: <IconText />,
  audio: <IconAudio />,
};

/** Icon for a layer row — brand glyph for socials, type glyph otherwise. */
function elementIcon(el: ArElement): ReactNode {
  return el.type === "social" ? socialIcon(el.platform) : TYPE_ICON[el.type];
}

// Social is intentionally NOT an asset tab anymore — social icons are now picked
// as real 3D models from the KaunTech gallery (the flat social billboards are
// gone). The `social` element type is kept in scene.ts only so cards published
// before this change still render.
type AssetTab = "model" | "image" | "video" | "audio" | "text";
const ASSET_TABS: { key: AssetTab; label: string; hint: string; icon: ReactNode }[] = [
  { key: "model", label: "3D model", hint: "3D model — pick from the gallery or upload a .glb", icon: <IconBox /> },
  { key: "image", label: "Image", hint: "Image — a photo or logo shown flat on the card", icon: <IconImage /> },
  { key: "video", label: "Video", hint: "Video — play a clip on the card (upload or .mp4 link)", icon: <IconVideo /> },
  { key: "audio", label: "Audio", hint: "Audio — play a sound when the card is scanned", icon: <IconAudio /> },
  { key: "text", label: "Text", hint: "Text — a line of text in any colour", icon: <IconText /> },
];

// Collapsible sidebar section: a header button that toggles its body. Used to
// keep the left rail compact. `variant="card"` is a standalone panel; "sub" is
// a flush subsection (e.g. social links inside "Add to card").
function Collapsible({
  title, icon, defaultOpen = true, variant = "card", children,
}: {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  variant?: "card" | "sub";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`ar-collapse ar-collapse-${variant} ${open ? "is-open" : ""}`}>
      <button type="button" className="ar-collapse-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="ar-collapse-title">
          {icon ? <span className="ar-collapse-ico" aria-hidden>{icon}</span> : null}
          {title}
        </span>
        <span className="ar-collapse-chevron" aria-hidden><IconChevron /></span>
      </button>
      {/* Grid-rows 0fr→1fr animates to the body's natural height (no fixed
          max-height guesswork); the inner element clips during the transition. */}
      <div className="ar-collapse-outer">
        <div className="ar-collapse-inner">
          <div className="ar-collapse-body">{children}</div>
        </div>
      </div>
    </div>
  );
}

const DEG = 180 / Math.PI;
const toDeg = (rad: number) => Math.round(rad * DEG);
const toRad = (deg: number) => deg / DEG;

// One transform control: a drag slider paired with a precise numeric input,
// both editing the same value. Used for every position / rotation / scale axis
// so each element is fully adjustable by dragging or by typing exact numbers.
function TransformSlider({
  icon, label, value, min, max, step, unit, fixed = 2, onChange,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  fixed?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="ar-slider-row">
      <div className="ar-slider-head">
        <span className="ar-slider-label">
          <span className="ar-slider-ico" aria-hidden>{icon}</span>
          {label}
        </span>
        <span className="ar-slider-val">
          <input
            type="number"
            className="ar-field ar-num ar-slider-num"
            min={min}
            max={max}
            step={step}
            value={Number(value.toFixed(fixed))}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          {unit ? <span className="ar-slider-unit">{unit}</span> : null}
        </span>
      </div>
      <input
        type="range"
        className="ar-range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export default function Editor({ card, model, galleryAssets = [], tier, storageUsedBytes = 0, storageCapBytes = 0 }: { card: OwnerCard; model: ArModel | null; galleryAssets?: GalleryAsset[]; tier?: EffectiveTier; storageUsedBytes?: number; storageCapBytes?: number; templates?: unknown }) {
  const router = useRouter();
  // Live AR storage budget. Seeded from the server and kept fresh: it ticks up
  // optimistically the moment a model/image uploads, then reconciles against the
  // authoritative DB total (profiles.cloud_ar_bytes) via /api/ar/usage — so the
  // owner can see what's left before picking another, bigger model.
  const [usedBytes, setUsedBytes] = useState(storageUsedBytes);
  const [capBytes, setCapBytes] = useState(storageCapBytes);
  // Surface the live figure to the navbar (see StorageMeterContext) so the meter
  // can live up there instead of taking room in the sidebar.
  const publishStorage = useStorageMeter()?.publish;
  const storageLabel = `${tier ? tier[0].toUpperCase() + tier.slice(1) : ""} cloud storage`.trim();
  useEffect(() => {
    publishStorage?.(usedBytes, capBytes, storageLabel);
  }, [publishStorage, usedBytes, capBytes, storageLabel]);
  const refreshUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/ar/usage", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.ok) {
        setUsedBytes(Number(json.usedBytes) || 0);
        setCapBytes(Number(json.capBytes) || 0);
      }
    } catch {
      /* keep the optimistic value if the refresh fails */
    }
  }, []);
  const [elements, setElements] = useState<ArElement[]>(() => readElements(model));
  const [lighting, setLighting] = useState<ArLighting>(() => readLighting((model?.scene as { lighting?: unknown } | null)?.lighting));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assetTab, setAssetTab] = useState<AssetTab>("model");
  const [name, setName] = useState(model?.name ?? card.name ?? "");
  const [sidebarTab, setSidebarTab] = useState<"setup" | "assets" | "layers">("setup");
  const [propsTab, setPropsTab] = useState<"settings" | "layout">("layout");
  // Cards always publish on save — there's no draft state anymore. Adding or
  // changing the card photo auto-saves (below), so a card goes live the moment it
  // has a photo, with no manual publish step.
  const publish = true;
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOnce, setSavedOnce] = useState(!!model);

  // Auto-save when a card photo is added or changed: the cropper queues a save
  // (wantAutoSaveRef), and the photo's OCR effect bumps autoSaveTick once the
  // printed text has been read, so the save persists the photo + its OCR text and
  // publishes — no manual click. saveRef (set further down) holds the latest
  // save() so the queued run sees the freshly-read OCR text, not a stale closure.
  const wantAutoSaveRef = useRef(false);
  const [autoSaveTick, setAutoSaveTick] = useState(0);

  // ── Card photos: front + back. Either side can be the AR tracking target. ──
  const initCard = useMemo(() => readCard(model), [model]);
  const existingRef = isHttp(model?.reference_image_path) ? model!.reference_image_path! : isHttp(card.custom_qr_url) && !card.custom_qr_url!.startsWith("qrtext:") ? card.custom_qr_url! : null;
  const [target, setTarget] = useState<Side>(initCard.target ?? "front");
  // Remote (already-saved) urls per side, backfilled from the legacy single target.
  const [frontUrl, setFrontUrl] = useState<string | null>(initCard.frontUrl ?? ((initCard.target ?? "front") === "front" ? existingRef : null));
  const [backUrl, setBackUrl] = useState<string | null>(initCard.backUrl ?? (initCard.target === "back" ? existingRef : null));
  // Newly cropped files (sent on save), with object-url previews.
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [activeSide, setActiveSide] = useState<Side>(initCard.target ?? "front");
  const [cropFor, setCropFor] = useState<{ side: Side; file: File } | null>(null);
  // OCR'd text per side. Seeded from what was saved; re-read on the device only
  // when a side's photo actually changes (a newly cropped file).
  const [frontOcr, setFrontOcr] = useState<string>(initCard.frontOcr ?? "");
  const [backOcr, setBackOcr] = useState<string>(initCard.backOcr ?? "");
  const [ocrBusy, setOcrBusy] = useState(false);
  // 8th Wall AR target (the luminance image). Rebuilt only when the target photo
  // changes, so a routine element edit doesn't pay the cost. `prep` shows progress.
  const [eightwallUrl, setEightwallUrl] = useState<string | null>(initCard.eightwall?.lumUrl ?? null);
  const [prep, setPrep] = useState<string | null>(null);
  // Trackability of each side's photo (0..100), shown so the owner knows whether
  // their card has enough detail to track steadily before they rely on it.
  const [frontScore, setFrontScore] = useState<number | null>(null);
  const [backScore, setBackScore] = useState<number | null>(null);
  // Identity of the CHOSEN target side's photo (a file by size+mtime, an unchanged
  // side by its url) plus which side is the target. When this differs from what the
  // current .mind was built from — the target photo changed, or the user switched
  // which side is the target — the next save recompiles. The non-target side's
  // photo is irrelevant (we only track one side).
  const targetSig = useMemo(() => {
    const src =
      target === "back"
        ? backFile ? `f:${backFile.size}:${backFile.lastModified}` : backUrl ?? null
        : frontFile ? `f:${frontFile.size}:${frontFile.lastModified}` : frontUrl ?? null;
    return JSON.stringify([target, src]);
  }, [target, frontFile, backFile, frontUrl, backUrl]);
  const mindBaselineRef = useRef<string | null>(null);
  if (mindBaselineRef.current === null) mindBaselineRef.current = targetSig;

  const modelInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const pendingSide = useRef<Side>("front");
  // When set, a fresh video/audio file picked from the properties panel REPLACES
  // this element's url (vs. adding a new element from the asset library).
  const replaceMediaFor = useRef<string | null>(null);
  // Asset URLs that are already PERSISTED in the saved scene. An uploaded asset
  // removed before it was ever saved is an orphan we delete immediately (it would
  // otherwise leak cloud storage, since the save-time cleanup only reclaims
  // assets that were once persisted). Seeded from the loaded model, refreshed on
  // each successful save. Lazy-init like mindBaselineRef.
  const persistedAssetsRef = useRef<Set<string> | null>(null);
  if (persistedAssetsRef.current === null) {
    persistedAssetsRef.current = new Set(readElements(model).map((e) => e.url).filter(isOurUploadedAsset));
  }

  // Dirty tracking: the Save button only appears when the savable state differs
  // from what was last persisted. A freshly cropped photo (frontFile/backFile)
  // or an added/removed side url counts as a change. OCR text is intentionally
  // excluded — it's captured in the background, not a user edit.
  const savableSnapshot = useMemo(
    () => JSON.stringify({ elements, lighting, name, publish, target, frontUrl, backUrl }),
    [elements, lighting, name, publish, target, frontUrl, backUrl],
  );
  const baselineRef = useRef(savableSnapshot);
  const dirty = savableSnapshot !== baselineRef.current || !!frontFile || !!backFile;

  const selected = elements.find((e) => e.id === selectedId) ?? null;
  const sideUrl = (s: Side): string | null => (s === "front" ? frontPreview ?? frontUrl : backPreview ?? backUrl);
  const targetUrl = sideUrl(target);
  const trackableCardPhoto = targetUrl;
  const hasTarget = !!targetUrl;

  function setSideImage(side: Side, file: File) {
    const url = URL.createObjectURL(file);
    if (side === "front") {
      setFrontFile(file);
      setFrontPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
    } else {
      setBackFile(file);
      setBackPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
    }
  }
  function clearSide(side: Side) {
    if (side === "front") {
      setFrontFile(null);
      setFrontPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      setFrontUrl(null);
      setFrontOcr("");
    } else {
      setBackFile(null);
      setBackPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      setBackUrl(null);
      setBackOcr("");
    }
    if (target === side) setTarget(side === "front" ? "back" : "front");
  }

  // Read the printed text off a freshly cropped photo (on-device, no upload, no
  // API key) so we can store it for the app's markerless AR matcher. Best-effort
  // and non-blocking: failures just leave that side's OCR empty.
  // A freshly cropped file → OCR it once (re-OCR whenever the file changes).
  useEffect(() => {
    if (!frontFile) return;
    let alive = true;
    setOcrBusy(true);
    ocrImageSrc(frontFile)
      .then((t) => { if (alive && t) setFrontOcr(t); })
      .finally(() => { if (!alive) return; setOcrBusy(false); if (wantAutoSaveRef.current) { wantAutoSaveRef.current = false; setAutoSaveTick((n) => n + 1); } });
    return () => { alive = false; };
  }, [frontFile]);

  useEffect(() => {
    if (!backFile) return;
    let alive = true;
    setOcrBusy(true);
    ocrImageSrc(backFile)
      .then((t) => { if (alive && t) setBackOcr(t); })
      .finally(() => { if (!alive) return; setOcrBusy(false); if (wantAutoSaveRef.current) { wantAutoSaveRef.current = false; setAutoSaveTick((n) => n + 1); } });
    return () => { alive = false; };
  }, [backFile]);

  // Existing saved photo with no captured text yet → backfill OCR once on load
  // (older cards, or cards set up before OCR existed) so a re-save captures it.
  // frontOcr is intentionally not a dep — it's the guard, not a trigger.
  useEffect(() => {
    if (frontFile || !frontUrl || frontOcr) return;
    let alive = true;
    setOcrBusy(true);
    ocrImageSrc(frontUrl)
      .then((t) => { if (alive && t) setFrontOcr(t); })
      .finally(() => { if (alive) setOcrBusy(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frontUrl, frontFile]);

  useEffect(() => {
    if (backFile || !backUrl || backOcr) return;
    let alive = true;
    setOcrBusy(true);
    ocrImageSrc(backUrl)
      .then((t) => { if (alive && t) setBackOcr(t); })
      .finally(() => { if (alive) setOcrBusy(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backUrl, backFile]);

  // Score each side for AR trackability whenever its photo changes (a freshly
  // cropped file, else the saved url). Best-effort and off the critical path.
  useEffect(() => {
    const src = frontFile ?? frontUrl;
    if (!src) { setFrontScore(null); return; }
    let alive = true;
    scoreTargetTrackability(src).then((s) => { if (alive) setFrontScore(s); });
    return () => { alive = false; };
  }, [frontFile, frontUrl]);

  useEffect(() => {
    const src = backFile ?? backUrl;
    if (!src) { setBackScore(null); return; }
    let alive = true;
    scoreTargetTrackability(src).then((s) => { if (alive) setBackScore(s); });
    return () => { alive = false; };
  }, [backFile, backUrl]);

  function pickPhoto(side: Side) {
    pendingSide.current = side;
    photoInput.current?.click();
  }

  function nextPos(): [number, number, number] {
    const i = elements.length;
    return [-0.4 + (i % 3) * 0.4, 0.2 + Math.floor(i / 3) * 0.28, 0.18];
  }

  function add(el: Omit<ArElement, "id" | "position"> & { position?: [number, number, number] }) {
    const full: ArElement = { id: uid(), position: el.position ?? nextPos(), ...el } as ArElement;
    setElements((p) => [...p, full]);
    setSelectedId(full.id);
  }

  function update(id: string, patch: Partial<ArElement>) {
    setElements((p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }
  function setPos(id: string, axis: 0 | 1 | 2, value: number) {
    setElements((p) =>
      p.map((e) => {
        if (e.id !== id) return e;
        const next = [...e.position] as [number, number, number];
        next[axis] = value;
        return { ...e, position: next };
      }),
    );
  }
  // Best-effort delete of a session-uploaded asset the owner removed before it
  // was ever saved, so it doesn't linger in the bucket counting against cloud
  // storage. Never touches already-persisted assets (the save-time cleanup owns
  // those) — so a locally-removed-but-not-saved persisted asset is left intact
  // and the published card keeps working until the removal is actually saved.
  function deleteAsset(url: string) {
    void fetch("/api/ar/asset", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ card_id: card.id, url }),
    })
      .then(() => refreshUsage())
      .catch(() => {});
  }
  // Reclaim `url` only if it's one of our uploads, isn't persisted yet, and no
  // remaining element still references it (e.g. a duplicate sharing the file).
  function reclaimIfOrphan(url: string | undefined, remaining: ArElement[]) {
    if (!isOurUploadedAsset(url)) return;
    if (persistedAssetsRef.current?.has(url)) return;
    if (remaining.some((e) => e.url === url)) return;
    deleteAsset(url);
  }
  function remove(id: string) {
    const el = elements.find((e) => e.id === id);
    const remaining = elements.filter((e) => e.id !== id);
    if (el?.url) reclaimIfOrphan(el.url, remaining);
    setElements(remaining);
    if (selectedId === id) setSelectedId(null);
  }
  function duplicate(id: string) {
    setElements((p) => {
      const src = p.find((e) => e.id === id);
      if (!src) return p;
      const copy: ArElement = {
        ...src,
        id: uid(),
        position: [src.position[0] + 0.12, src.position[1] - 0.1, src.position[2]],
      };
      setSelectedId(copy.id);
      const i = p.findIndex((e) => e.id === id);
      return [...p.slice(0, i + 1), copy, ...p.slice(i + 1)];
    });
  }

  // ── Templates ──────────────────────────────────────────────────────────────
  // Reusable scene layouts: a "Default" set authored by admins (global) plus the
  // owner's own, which work across all their cards. Applying one replaces the
  // current AR content; saving snapshots the current layout for reuse.
  const [templates, setTemplates] = useState<{ global: ArTemplate[]; own: ArTemplate[] }>({ global: [], own: [] });
  const [tplLoading, setTplLoading] = useState(true);
  const [savingTpl, setSavingTpl] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/ar/templates", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (alive && j?.ok) setTemplates({ global: j.global ?? [], own: j.own ?? [] }); })
      .catch(() => {})
      .finally(() => { if (alive) setTplLoading(false); });
    return () => { alive = false; };
  }, []);

  function templateElementCount(t: ArTemplate): number {
    const els = (t.scene as { elements?: unknown })?.elements;
    return Array.isArray(els) ? els.length : 0;
  }

  function applyTemplate(t: ArTemplate) {
    const scene = t.scene as { elements?: ArElement[]; lighting?: ArLighting } | null;
    const els = Array.isArray(scene?.elements) ? scene!.elements : [];
    if (els.length === 0) { setError("That template is empty."); return; }
    // Chosen behaviour: replace. Confirm only if they'd lose existing work.
    if (elements.length > 0 && !window.confirm(`Replace the ${elements.length} element${elements.length === 1 ? "" : "s"} on this card with "${t.name}"?`)) return;
    // Fresh ids so a template can be applied repeatedly without id collisions.
    const placed = els.map((e) => ({ ...e, id: uid() }));
    setElements(placed);
    if (scene?.lighting) setLighting(scene.lighting);
    setSelectedId(null);
    setSidebarTab("layers");
    // Persist + publish right away when the card already has its photo. Without a
    // target photo, save() would just error — so leave it placed and let the
    // normal post-photo auto-save pick it up once they add one.
    if (hasTarget) {
      wantAutoSaveRef.current = true;
      setAutoSaveTick((n) => n + 1);
    }
  }

  async function saveAsTemplate() {
    if (elements.length === 0) { setError("Add something to the card before saving a template."); return; }
    const name = window.prompt("Name this template (you can reuse it on any of your cards):", name0ForTemplate())?.trim();
    if (!name) return;
    setSavingTpl(true);
    setError(null);
    try {
      const res = await fetch("/api/ar/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scene: { elements, lighting } }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) { setError(json.error || "Could not save the template."); return; }
      setTemplates((t) => ({ ...t, own: [json.template, ...t.own] }));
    } catch {
      setError("Could not save the template.");
    } finally {
      setSavingTpl(false);
    }
  }
  function name0ForTemplate(): string {
    return (card.name ? `${card.name}'s layout` : "My layout").slice(0, 60);
  }

  async function deleteTemplate(id: string) {
    if (!window.confirm("Delete this template? Cards already using it keep their layout.")) return;
    setTemplates((t) => ({ ...t, own: t.own.filter((x) => x.id !== id) }));
    try {
      await fetch(`/api/ar/templates/${id}`, { method: "DELETE" });
    } catch {
      /* optimistic; a failed delete just reappears on next load */
    }
  }

  async function uploadAsset(file: File, kind: "model" | "image" | "video" | "audio"): Promise<string | null> {
    setError(null);
    // Pre-check against the live budget so the owner gets an instant, specific
    // message ("needs X, only Y left") instead of a generic server rejection —
    // and we don't waste a multi-MB upload the trigger will refuse anyway.
    if (capBytes > 0 && usedBytes + file.size > capBytes) {
      setError(
        `That ${kind} is ${formatBytes(file.size)}, but only ${formatBytes(
          Math.max(0, capBytes - usedBytes),
        )} of your ${formatBytes(capBytes)} cloud storage is left. Remove an asset or pick a smaller file.`,
      );
      return null;
    }
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.set("card_id", card.id);
      fd.set("kind", kind);
      fd.set("file", file);
      const res = await fetch("/api/ar/asset", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Upload failed.");
      // Reflect the new bytes right away, then reconcile with the DB total.
      setUsedBytes((b) => b + file.size);
      void refreshUsage();
      return json.url as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      return null;
    } finally {
      setUploading(null);
    }
  }

  async function onPickModel(file?: File) {
    if (!file) return;
    const url = await uploadAsset(file, "model");
    if (!url) return;
    const baseScale = await fitScaleFor(url);
    add({ type: "model", url, animated: true, baseScale, scale: 1, baseRotationX: MODEL_STAND_TILT_X, rotationX: 0, rotationY: 0, position: [0, 0.22, 0.12] });
  }
  async function onPickImage(file?: File) {
    if (!file) return;
    // Measure the picture's real aspect from a local object-url (no CORS, no wait
    // on the upload) so it lands on the card un-squashed.
    const localUrl = URL.createObjectURL(file);
    const aspect = await imageAspect(localUrl).catch(() => 1);
    URL.revokeObjectURL(localUrl);
    const url = await uploadAsset(file, "image");
    if (url) add({ type: "image", url, aspect, scale: 0.35, rotationY: 0 });
  }
  function addVideo() {
    // Default to 16:9 until a clip URL is pasted (its real aspect is read on blur).
    add({ type: "video", url: "", aspect: 16 / 9, loop: true, scale: 0.7, rotationY: 0, position: [0, 0.55, 0.05] });
  }
  async function onPickVideoFile(file?: File) {
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    const aspect = await videoAspect(localUrl).catch(() => 16 / 9);
    URL.revokeObjectURL(localUrl);
    const url = await uploadAsset(file, "video");
    if (!url) return;
    const replaceId = replaceMediaFor.current;
    replaceMediaFor.current = null;
    if (replaceId) {
      const oldUrl = elements.find((e) => e.id === replaceId)?.url;
      update(replaceId, { url, aspect });
      if (oldUrl && oldUrl !== url) reclaimIfOrphan(oldUrl, elements.filter((e) => e.id !== replaceId));
    } else {
      add({ type: "video", url, aspect, loop: true, scale: 0.7, rotationY: 0, position: [0, 0.55, 0.05] });
    }
  }
  function addAudio() {
    // Audio is invisible sound + a small tappable speaker control in AR. Paste a
    // direct audio URL or upload a file in its properties.
    add({ type: "audio", url: "", loop: true, autoplay: true, scale: 1, rotationY: 0, position: [0, 0.3, 0.06] });
  }
  async function onPickAudioFile(file?: File) {
    if (!file) return;
    const url = await uploadAsset(file, "audio");
    if (!url) return;
    const replaceId = replaceMediaFor.current;
    replaceMediaFor.current = null;
    if (replaceId) {
      const oldUrl = elements.find((e) => e.id === replaceId)?.url;
      update(replaceId, { url });
      if (oldUrl && oldUrl !== url) reclaimIfOrphan(oldUrl, elements.filter((e) => e.id !== replaceId));
    } else {
      add({ type: "audio", url, loop: true, autoplay: true, scale: 1, rotationY: 0, position: [0, 0.3, 0.06] });
    }
  }
  function addText() {
    add({ type: "text", text: card.name || "Your name", color: DEFAULT_TEXT_COLOR, scale: 1, rotationY: 0, position: [0, 0.42, 0.06] });
  }
  async function addGalleryModel(a: GalleryAsset) {
    // Normalize the model's size on the way in so a car doesn't arrive 100× the
    // size of an icon. baseScale does the fitting; scale stays a 1× multiplier.
    const baseScale = await fitScaleFor(a.glbUrl);
    add({
      type: "model",
      url: a.glbUrl,
      // The model's name so the Layers list reads "Instagram" / "Robotic Arm"
      // instead of a stack of identical "Model" rows.
      label: a.name,
      animated: a.animated ?? false,
      baseScale,
      scale: 1,
      baseRotationX: MODEL_STAND_TILT_X,
      rotationX: 0,
      rotationY: 0,
      position: [0, 0.22, 0.12],
      // Social "coin" models carry their platform so the link field offers the
      // right handle prefix — same UX as a flat social icon, but actually 3D.
      ...(a.platform ? { platform: a.platform, link: "" } : {}),
    });
  }
  async function save() {
    setError(null);
    if (!hasTarget) {
      setError("Add your card photo first. It's the image people point their camera at when they scan.");
      return;
    }
    const emptyMedia = elements.find((e) => (e.type === "video" || e.type === "audio") && !e.url?.trim());
    if (emptyMedia) {
      setSelectedId(emptyMedia.id);
      setError(`One of your ${emptyMedia.type === "video" ? "videos" : "audio clips"} has no file yet. Upload a file, paste a direct link, or remove it.`);
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("card_id", card.id);
      fd.set("source", "upload");
      fd.set("name", name);
      fd.set("publish", String(publish));
      fd.set("scene", JSON.stringify({ elements, lighting }));
      fd.set("target_side", target);
      // Each side: send a freshly cropped file, or the existing remote url to keep.
      if (frontFile) fd.set("front_image", frontFile);
      else if (frontUrl) fd.set("front_url", frontUrl);
      if (backFile) fd.set("back_image", backFile);
      else if (backUrl) fd.set("back_url", backUrl);
      // Printed text per side, for the app's markerless AR matcher.
      if (frontOcr) fd.set("front_ocr", frontOcr);
      if (backOcr) fd.set("back_ocr", backOcr);

      // 8th Wall PLANAR target for the CHOSEN side: a grayscale luminance image
      // built from the card photo (the engine feature-extracts it at runtime).
      // Rebuilt only when the target photo/side changed or there's no target yet.
      // Best-effort: on failure the viewer tracks on the raw card photo instead.
      const targetSrc = target === "back" ? backFile ?? backUrl : frontFile ?? frontUrl;
      if (targetSrc && (targetSig !== mindBaselineRef.current || !eightwallUrl)) {
        setPrep("Preparing AR target…");
        const ew = await compileEightwallTarget(targetSrc);
        setPrep(null);
        if (ew) {
          fd.set("eightwall", ew.blob, "target.lum.jpg");
          fd.set("eightwall_w", String(ew.w));
          fd.set("eightwall_h", String(ew.h));
        }
      }

      const res = await fetch("/api/ar/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Save failed.");
      // Adopt the saved remote urls so a follow-up save doesn't re-upload.
      const savedCard = (json.model?.scene?.card ?? {}) as SceneCard;
      const newFront = savedCard.frontUrl ?? frontUrl;
      const newBack = savedCard.backUrl ?? backUrl;
      if (savedCard.frontUrl) { setFrontUrl(savedCard.frontUrl); setFrontFile(null); setFrontPreview((p) => { if (p) URL.revokeObjectURL(p); return null; }); }
      if (savedCard.backUrl) { setBackUrl(savedCard.backUrl); setBackFile(null); setBackPreview((p) => { if (p) URL.revokeObjectURL(p); return null; }); }
      // Re-baseline to exactly what's now persisted so the Save button hides
      // until the next real change.
      baselineRef.current = JSON.stringify({ elements, lighting, name, publish, target, frontUrl: newFront, backUrl: newBack });
      // Everything in the scene we just saved is now persisted — so a later
      // removal of any of these reverts to the save-time cleanup path, never the
      // immediate delete (which is only for never-saved session uploads).
      persistedAssetsRef.current = new Set(elements.map((e) => e.url).filter(isOurUploadedAsset));
      // Adopt the saved target (or its absence) so the next save only rebuilds the
      // target when the target side or its photo changes again. Baseline must match
      // the (target-aware) targetSig shape.
      setEightwallUrl(savedCard.eightwall?.lumUrl ?? null);
      const newTargetUrl = target === "back" ? newBack : newFront;
      mindBaselineRef.current = JSON.stringify([target, newTargetUrl ?? null]);
      setSavedOnce(true);
      // A save can free bytes (the upload route deletes a replaced card photo or
      // a stale target), so re-read the authoritative storage total.
      void refreshUsage();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
      setPrep(null);
    }
  }

  // Run the queued auto-save (after a photo was added/changed) once its OCR has
  // completed and bumped autoSaveTick. Goes through saveRef so it calls the latest
  // save() — capturing the just-read OCR text and the new photo, not stale state.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (autoSaveTick === 0) return;
    void saveRef.current();
  }, [autoSaveTick]);

  const viewportCardColor = useMemo(() => card.card_color, [card.card_color]);
  const degY = selected ? Math.round((selected.rotationY * 180) / Math.PI) : 0;

  return (
    <div className="ar-editor-main">
      <input ref={modelInput} type="file" accept=".glb,model/gltf-binary" style={{ display: "none" }}
        onChange={(e) => { onPickModel(e.target.files?.[0]); e.currentTarget.value = ""; }} />
      <input ref={imageInput} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => { onPickImage(e.target.files?.[0]); e.currentTarget.value = ""; }} />
      <input ref={videoInput} type="file" accept="video/mp4,video/webm,.mp4,.webm,.m4v,.mov" style={{ display: "none" }}
        onChange={(e) => { onPickVideoFile(e.target.files?.[0]); e.currentTarget.value = ""; }} />
      <input ref={audioInput} type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac" style={{ display: "none" }}
        onChange={(e) => { onPickAudioFile(e.target.files?.[0]); e.currentTarget.value = ""; }} />
      <input ref={photoInput} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropFor({ side: pendingSide.current, file: f }); e.currentTarget.value = ""; }} />

      {cropFor ? (
        <ImageCropper
          file={cropFor.file}
          title={`Crop ${cropFor.side} of card`}
          onCancel={() => setCropFor(null)}
          onConfirm={(cropped) => {
            const side = cropFor.side;
            setSideImage(side, cropped);
            setActiveSide(side);
            // The first photo you add becomes the AR target, so the card can publish.
            if (!sideUrl(target)) setTarget(side);
            wantAutoSaveRef.current = true; // auto-save once this photo's OCR finishes
            setCropFor(null);
          }}
        />
      ) : null}

      {galleryOpen ? (
        <GalleryPicker assets={galleryAssets} onClose={() => setGalleryOpen(false)} onPick={addGalleryModel} />
      ) : null}

      <div className="ar-editor-topbar">
        <div className="ar-topbar-title">
          <h1 className="ar-h1" style={{ marginBottom: 2, display: "flex", alignItems: "center", gap: "8px" }}>
            {card.name || "Your card"}
            {tier && (
              <span className={`ar-badge ar-badge-${tier}`} style={{ fontSize: "11px", padding: "2px 8px", textTransform: "uppercase" }}>
                {tier}
              </span>
            )}
          </h1>
          <span className="ar-muted">Compose what shows on your card in AR. Drag to place, attach links.</span>
        </div>
        <div className="ar-row">
          {prep ? <span className="ar-muted">{prep}</span> : ocrBusy ? <span className="ar-muted">Reading card text…</span> : null}
          <a className="ar-btn ar-btn-ghost ar-editor-back" href="/ar" title="All cards" aria-label="All cards">
            <span className="ar-editor-back-full">← All cards</span>
            <span className="ar-editor-back-mini" aria-hidden>←</span>
          </a>
          {dirty ? (
            <button className="ar-btn ar-btn-primary" onClick={save} disabled={busy}>
              {busy ? "Publishing…" : "Save & publish"}
            </button>
          ) : savedOnce ? (
            <span className="ar-saved-pill"><IconCheck /> Published</span>
          ) : null}
        </div>
      </div>

      {error ? <p className="ar-error ar-editor-error">{error}</p> : null}

      <div className="ar-workspace">
        {/* Left: controls */}
        <aside className="ar-side">
          <div className="ar-sidebar-tabs">
            <button
              type="button"
              className={`ar-sidebar-tab-btn ${sidebarTab === "setup" ? "is-active" : ""}`}
              onClick={() => setSidebarTab("setup")}
              title="Card Setup"
            >
              <IconTarget /> Setup
            </button>
            <button
              type="button"
              className={`ar-sidebar-tab-btn ${sidebarTab === "assets" ? "is-active" : ""}`}
              onClick={() => setSidebarTab("assets")}
              title="Add Assets"
            >
              <IconPlus /> Add
            </button>
            <button
              type="button"
              className={`ar-sidebar-tab-btn ${sidebarTab === "layers" ? "is-active" : ""}`}
              onClick={() => setSidebarTab("layers")}
              title="Manage Layers"
            >
              <IconBox /> Layers ({elements.length})
            </button>
          </div>

          <div className="ar-side-scroll-content">
            {sidebarTab === "setup" && (
              <div className="ar-sidebar-tab-content fade-in">
                <div className="ar-card ar-stack">
                  <span className="ar-label" style={{ margin: 0 }}>Card Setup</span>
                  <div>
                    <label className="ar-label" htmlFor="ar-name">Label (private)</label>
                    <input id="ar-name" className="ar-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="My AR card" />
                  </div>

                  <div>
                    <span className="ar-label" style={{ marginBottom: "10px" }}>Card photos</span>
                    <div className="ar-sidebar-setup-cards">
                      {(["front", "back"] as Side[]).map((side) => {
                        const url = sideUrl(side);
                        const isTarget = target === side;
                        const tier = url ? trackTier(side === "front" ? frontScore : backScore) : null;
                        
                        return (
                          <div key={side} className={`ar-side-photo-card ${isTarget ? "is-target" : ""}`}>
                            <div className="ar-side-photo-header">
                              <span className="ar-side-photo-title">
                                {side === "front" ? "Front Side" : "Back Side"}
                              </span>
                              {isTarget && (
                                <span className="ar-side-photo-badge ar-side-photo-badge-target">
                                  <IconCheck /> AR Target
                                </span>
                              )}
                            </div>

                            <div className="ar-side-photo-preview-container">
                              {url ? (
                                <>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={url} alt={`Card ${side}`} className="ar-side-photo-img" />
                                  <div className="ar-side-photo-overlay">
                                    <button
                                      type="button"
                                      className="ar-side-photo-overlay-btn"
                                      onClick={() => pickPhoto(side)}
                                    >
                                      <IconImage /> Replace
                                    </button>
                                    <button
                                      type="button"
                                      className="ar-side-photo-overlay-btn ar-btn-danger"
                                      onClick={() => clearSide(side)}
                                      title="Remove photo"
                                    >
                                      <IconX /> Remove
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="ar-side-photo-empty"
                                  onClick={() => pickPhoto(side)}
                                >
                                  <span className="ar-side-photo-empty-icon"><IconImage /></span>
                                  <span className="ar-side-photo-empty-text">Upload {side} photo</span>
                                </button>
                              )}
                            </div>

                            {url && (
                              <div className="ar-side-photo-footer">
                                {tier && (
                                  <span className="ar-side-photo-badge ar-side-photo-badge-quality">
                                    <span
                                      className="ar-side-photo-badge-dot"
                                      style={{ backgroundColor: tier.color }}
                                    />
                                    Tracking: {tier.label}
                                  </span>
                                )}
                                <div className="ar-side-photo-actions-row">
                                  {!isTarget && (
                                    <button
                                      type="button"
                                      className="ar-btn ar-btn-ghost ar-btn-sm"
                                      style={{ padding: "6px 12px", fontSize: "12px" }}
                                      onClick={() => setTarget(side)}
                                    >
                                      Use for AR
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <span className="ar-muted" style={{ marginTop: 8, display: "block" }}>
                      The AR target is the side people point their camera at. Front and back are both saved.
                    </span>
                    {(() => {
                      const tier = trackTier(target === "front" ? frontScore : backScore);
                      return hasTarget && tier && tier.label === "Low" ? (
                        <span className="ar-target-warn" style={{ marginTop: 6, display: "block" }}>
                          This side is low on detail, so AR may shake or drift at an angle. Use the busier side, or pick a card with more contrast and detail.
                        </span>
                      ) : null;
                    })()}
                  </div>

                  <p className="ar-muted" style={{ margin: 0 }}>
                    {hasTarget
                      ? "Your card publishes automatically and shows in AR when people scan it."
                      : "Add a card photo above and your card goes live automatically."}
                  </p>
                </div>
              </div>
            )}

          {sidebarTab === "assets" && (
            <div className="ar-sidebar-tab-content fade-in">
              {/* Templates — one-tap layouts (admin "Default" + the owner's own,
                  reusable across all their cards). Sits above the Asset Library. */}
              <div className="ar-card ar-stack" style={{ gap: "var(--ar-sp-sm)" }}>
                <div className="ar-row ar-between">
                  <span className="ar-label" style={{ margin: 0 }}>Templates</span>
                  <button
                    type="button"
                    className="ar-tab ar-asset-add"
                    style={{ padding: "5px 10px", fontSize: "12px" }}
                    onClick={saveAsTemplate}
                    disabled={savingTpl || elements.length === 0}
                    title={elements.length === 0 ? "Add something to the card first" : "Save the current layout as a reusable template"}
                  >
                    {savingTpl ? "Saving…" : "Save current"}
                  </button>
                </div>
                <span className="ar-muted" style={{ fontSize: "11px" }}>
                  One tap drops a ready-made layout on your card. Your saved templates work across all your cards.
                </span>
                {templates.global.map((t) => (
                  <button key={t.id} type="button" className="ar-template-row" onClick={() => applyTemplate(t)} title={`Apply "${t.name}"`}>
                    <span className="ar-template-badge">Default</span>
                    <span className="ar-template-name">{t.name}</span>
                    <span className="ar-template-count">{templateElementCount(t)} item{templateElementCount(t) === 1 ? "" : "s"}</span>
                  </button>
                ))}
                {templates.own.map((t) => (
                  <div key={t.id} className="ar-template-row-wrap">
                    <button type="button" className="ar-template-row" onClick={() => applyTemplate(t)} title={`Apply "${t.name}"`}>
                      <span className="ar-template-name">{t.name}</span>
                      <span className="ar-template-count">{templateElementCount(t)} item{templateElementCount(t) === 1 ? "" : "s"}</span>
                    </button>
                    <button type="button" className="ar-template-del" onClick={() => deleteTemplate(t.id)} title="Delete this template" aria-label="Delete template">
                      <IconTrash />
                    </button>
                  </div>
                ))}
                {!tplLoading && templates.global.length === 0 && templates.own.length === 0 && (
                  <span className="ar-muted" style={{ fontSize: "12px" }}>
                    No templates yet. Arrange your card, then tap “Save current” to reuse it later.
                  </span>
                )}
                {tplLoading && <span className="ar-muted" style={{ fontSize: "12px" }}>Loading templates…</span>}
              </div>

              {/* Assets — add models, images, video, text or social, by category */}
              <div className="ar-card ar-stack" style={{ gap: "var(--ar-sp-md)" }}>
                <span className="ar-label" style={{ margin: 0 }}>Asset Library</span>
                <div className="ar-asset-tabs" role="tablist">
                  {ASSET_TABS.map((t) => (
                    <button
                      key={t.key}
                      role="tab"
                      aria-selected={assetTab === t.key}
                      aria-label={t.label}
                      title={t.hint}
                      className={`ar-asset-tab ${assetTab === t.key ? "is-active" : ""}`}
                      onClick={() => setAssetTab(t.key)}
                    >
                      <span className="ar-asset-tab-ico" aria-hidden>{t.icon}</span>
                    </button>
                  ))}
                </div>

                <div className="ar-asset-panel">
                  {assetTab === "model" ? (
                    <>
                      <button className="ar-asset-cta" title="Browse KaunTech's ready-made 3D models and place one instantly" onClick={() => setGalleryOpen(true)}>
                        <span className="ar-asset-cta-ico" aria-hidden><IconBox /></span>
                        <span className="ar-asset-cta-text">
                          <span className="ar-asset-cta-title">Choose from KaunTech gallery</span>
                          <span className="ar-asset-cta-sub">Ready-made 3D models — pick &amp; place instantly</span>
                        </span>
                        <span className="ar-asset-cta-arrow" aria-hidden><IconChevron /></span>
                      </button>
                      <button className="ar-asset-upload" title="Upload a .glb model from your device (counts toward cloud storage)" onClick={() => modelInput.current?.click()} disabled={!!uploading}>
                        <span className="ar-asset-upload-ico" aria-hidden><IconUpload /></span>
                        <span className="ar-asset-cta-text">
                          <span className="ar-asset-upload-title">{uploading === "model" ? "Uploading…" : "Upload your own .glb"}</span>
                          <span className="ar-asset-upload-sub">Bring a custom model from your device</span>
                        </span>
                      </button>
                      <span className="ar-muted ar-asset-hint">Models float above the card and can play their animation.</span>
                    </>
                  ) : assetTab === "image" ? (
                    <>
                      <button className="ar-tab ar-asset-add" title="Add a photo or logo (PNG, JPG or WebP) — counts toward cloud storage" onClick={() => imageInput.current?.click()} disabled={!!uploading}>
                        <span className="ar-tab-ico" aria-hidden><IconPlus /></span>
                        {uploading === "image" ? "Uploading…" : "Add image"}
                      </button>
                      <span className="ar-muted ar-asset-hint">A PNG or JPG shown as a flat plane on the card.</span>
                    </>
                  ) : assetTab === "video" ? (
                    <>
                      <button className="ar-asset-upload" title="Upload an MP4 or WebM video (counts toward cloud storage)" onClick={() => { replaceMediaFor.current = null; videoInput.current?.click(); }} disabled={!!uploading}>
                        <span className="ar-asset-upload-ico" aria-hidden><IconUpload /></span>
                        <span className="ar-asset-cta-text">
                          <span className="ar-asset-upload-title">{uploading === "video" ? "Uploading…" : "Upload a video file"}</span>
                          <span className="ar-asset-upload-sub">MP4 / WebM — counts toward your cloud storage</span>
                        </span>
                      </button>
                      <button className="ar-tab ar-asset-add" title="Add a video plane, then paste a direct .mp4 link in its properties" onClick={addVideo}>
                        <span className="ar-tab-ico" aria-hidden><IconPlus /></span>
                        Add video by URL
                      </button>
                      <span className="ar-muted ar-asset-hint">A video plane on the card. Upload a file, or paste a direct .mp4 link in its properties (YouTube/Vimeo links don’t play in AR).</span>
                    </>
                  ) : assetTab === "audio" ? (
                    <>
                      <button className="ar-asset-upload" title="Upload an MP3, WAV or M4A clip (counts toward cloud storage)" onClick={() => { replaceMediaFor.current = null; audioInput.current?.click(); }} disabled={!!uploading}>
                        <span className="ar-asset-upload-ico" aria-hidden><IconUpload /></span>
                        <span className="ar-asset-cta-text">
                          <span className="ar-asset-upload-title">{uploading === "audio" ? "Uploading…" : "Upload an audio file"}</span>
                          <span className="ar-asset-upload-sub">MP3 / WAV / M4A — counts toward your cloud storage</span>
                        </span>
                      </button>
                      <button className="ar-tab ar-asset-add" title="Add an audio clip, then paste a direct audio link in its properties" onClick={addAudio}>
                        <span className="ar-tab-ico" aria-hidden><IconPlus /></span>
                        Add audio by URL
                      </button>
                      <span className="ar-muted ar-asset-hint">Plays when the card is scanned, with a tappable speaker so viewers can mute it. Upload a file or paste a direct audio link.</span>
                    </>
                  ) : (
                    <>
                      <button className="ar-tab ar-asset-add" title="Add a line of text — edit the words and colour in its properties" onClick={addText}>
                        <span className="ar-tab-ico" aria-hidden><IconPlus /></span>
                        Add text
                      </button>
                      <span className="ar-muted ar-asset-hint">A line of text — edit the words and colour in its properties.</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {sidebarTab === "layers" && (
            <div className="ar-sidebar-tab-content fade-in">
              <div className="ar-card ar-stack">
                <span className="ar-label" style={{ margin: 0 }}>Scene Layers ({elements.length})</span>
                {elements.length === 0 ? (
                  <span className="ar-muted">Nothing yet. Add a 3D model, image, text, or video from the Add asset tab.</span>
                ) : (
                  <div className="ar-stack" style={{ gap: 6 }}>
                    {elements.map((el) => (
                      <div key={el.id} className={`ar-el-row ${selectedId === el.id ? "is-selected" : ""} ${el.hidden ? "is-hidden" : ""}`}>
                        <button className="ar-el-select" onClick={() => setSelectedId(el.id)}>
                          <span className="ar-el-ico" aria-hidden>{elementIcon(el)}</span>
                          <span className="ar-el-name">{typeLabel(el)}</span>
                          {el.link || ((el.type === "video" || el.type === "audio") && el.url) ? <span className="ar-el-link" aria-hidden><IconLink /></span> : null}
                        </button>
                        <div className="ar-el-actions">
                          <button className="ar-icon-btn" title={el.hidden ? "Show" : "Hide"}
                            onClick={() => { update(el.id, { hidden: !el.hidden }); if (!el.hidden && selectedId === el.id) setSelectedId(null); }}>
                            {el.hidden ? <IconEyeOff /> : <IconEye />}
                          </button>
                          <button className="ar-icon-btn" title="Duplicate" onClick={() => duplicate(el.id)}><IconCopy /></button>
                          <button className="ar-icon-btn ar-icon-danger" title="Delete" onClick={() => remove(el.id)}><IconTrash /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        </aside>

        {/* Center: flat-ground composer */}
        <div className="ar-stage">
          <SceneViewport
            elements={elements}
            selectedId={selectedId}
            referenceImageUrl={trackableCardPhoto}
            cardColor={viewportCardColor}
            onSelect={setSelectedId}
          />
          {trackableCardPhoto ? (
            <div className="ar-stage-thumb" title="The printed card the AR tracks">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={trackableCardPhoto} alt="Card target" />
              <span>card target</span>
            </div>
          ) : (
            <div className="ar-stage-empty">
              <p className="ar-stage-empty-title">No card photo yet</p>
              <p>Upload the printed card under <strong>Card setup</strong> so AR knows what to track.</p>
            </div>
          )}
        </div>

        {/* Right: properties — appears when a layer is selected */}
        <aside className={`ar-props ${selected ? "is-open" : ""}`}>
          {selected ? (
            <div className="ar-card ar-stack">
              <div className="ar-row ar-between" style={{ borderBottom: "1px solid var(--ar-border)", paddingBottom: "12px" }}>
                <span className="ar-label" style={{ margin: 0 }}>{typeLabel(selected)} Properties</span>
                {/* Closes the bottom sheet on small screens (deselects the layer).
                    Hidden on desktop via CSS — the side panel needs no close there. */}
                <button
                  type="button"
                  className="ar-icon-btn ar-props-close"
                  title="Close properties"
                  aria-label="Close properties"
                  onClick={() => setSelectedId(null)}
                >
                  <IconX />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="ar-properties-tabs">
                <button
                  type="button"
                  className={`ar-properties-tab-btn ${propsTab === "layout" ? "is-active" : ""}`}
                  onClick={() => setPropsTab("layout")}
                >
                  Layout
                </button>
                <button
                  type="button"
                  className={`ar-properties-tab-btn ${propsTab === "settings" ? "is-active" : ""}`}
                  onClick={() => setPropsTab("settings")}
                >
                  Settings
                </button>
              </div>

              {propsTab === "settings" && (
                <div className="ar-properties-tab-content fade-in ar-stack">
                  {selected.type === "text" ? (
                    <>
                      <div>
                        <label className="ar-label">Text Content</label>
                        <input
                          className="ar-field"
                          value={selected.text ?? ""}
                          placeholder="Your name"
                          onChange={(e) => update(selected.id, { text: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="ar-label">Text Colour</label>
                        <div className="ar-row" style={{ gap: 8 }}>
                          <input type="color" className="ar-color" value={selected.color ?? DEFAULT_TEXT_COLOR}
                            onChange={(e) => update(selected.id, { color: e.target.value })} />
                          <span className="ar-mono ar-muted">{(selected.color ?? DEFAULT_TEXT_COLOR).toUpperCase()}</span>
                        </div>
                      </div>
                    </>
                  ) : selected.type === "video" ? (
                    <div>
                      <label className="ar-label">Video file</label>
                      <button
                        type="button"
                        className="ar-asset-upload"
                        style={{ width: "100%", marginBottom: 8 }}
                        disabled={!!uploading}
                        onClick={() => { replaceMediaFor.current = selected.id; videoInput.current?.click(); }}
                      >
                        <span className="ar-asset-upload-ico" aria-hidden><IconUpload /></span>
                        <span className="ar-asset-cta-text">
                          <span className="ar-asset-upload-title">{uploading === "video" ? "Uploading…" : selected.url ? "Replace with an upload" : "Upload a video file"}</span>
                          <span className="ar-asset-upload-sub">MP4 / WebM — counts toward your cloud storage</span>
                        </span>
                      </button>
                      {isHostedAsset(selected.url) ? (
                        <span className="ar-muted" style={{ fontSize: "11px", marginTop: 2, display: "block" }}>
                          Your uploaded clip plays its own sound and shows on both sides of the card.
                        </span>
                      ) : (
                        <>
                          <label className="ar-label">…or paste a direct video URL</label>
                          <input
                            className="ar-field"
                            value={selected.url ?? ""}
                            placeholder="https://…/clip.mp4"
                            onChange={(e) => update(selected.id, { url: e.target.value })}
                            onBlur={(e) => {
                              const url = e.target.value.trim();
                              update(selected.id, { url });
                              // Read the clip's real aspect so its plane isn't forced to a
                              // shape — keeps the preview and AR matching the actual video.
                              if (url) videoAspect(url).then((a) => update(selected.id, { aspect: a }));
                            }}
                          />
                          {selected.url && isStreamingPageUrl(selected.url) ? (
                            <span className="ar-target-warn" style={{ marginTop: 6, display: "block" }}>
                              YouTube / Vimeo links don’t play in AR — they’re web pages, not video files. Upload the clip above, or paste a direct .mp4/.webm file link.
                            </span>
                          ) : selected.url && !isDirectVideoUrl(selected.url) ? (
                            <span className="ar-muted" style={{ fontSize: "11px", marginTop: 6, display: "block", color: "var(--ar-orange-deep)" }}>
                              This doesn’t look like a direct video file (.mp4/.webm). If it doesn’t play, upload the file instead.
                            </span>
                          ) : (
                            <span className="ar-muted" style={{ fontSize: "11px", marginTop: 6, display: "block" }}>
                              The clip plays its own sound and shows on both sides of the card.
                            </span>
                          )}
                        </>
                      )}
                      <label className="ar-row" style={{ gap: 8, cursor: "pointer", marginTop: 10 }}>
                        <input type="checkbox" checked={selected.loop ?? true}
                          onChange={(e) => update(selected.id, { loop: e.target.checked })}
                          style={{ accentColor: "var(--ar-orange)" }} />
                        <span style={{ fontSize: "14px" }}>Loop the video</span>
                      </label>

                      {/* Sound controls — mute, volume, and playback speed. */}
                      <span className="ar-label" style={{ marginTop: 14, display: "block" }}>Sound</span>
                      <label className="ar-row" style={{ gap: 8, cursor: "pointer", marginBottom: 10 }}>
                        <input type="checkbox" checked={selected.muted ?? false}
                          onChange={(e) => update(selected.id, { muted: e.target.checked })}
                          style={{ accentColor: "var(--ar-orange)" }} />
                        <span style={{ fontSize: "14px" }}>Mute (play silent)</span>
                      </label>
                      <div className="ar-row ar-between" style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: "13px", opacity: selected.muted ? 0.5 : 1 }}>Volume</span>
                        <span className="ar-muted" style={{ fontSize: "12px" }}>{Math.round((selected.volume ?? 1) * 100)}%</span>
                      </div>
                      <input type="range" min={0} max={1} step={0.05}
                        value={selected.volume ?? 1}
                        disabled={selected.muted ?? false}
                        onChange={(e) => update(selected.id, { volume: Number(e.target.value) })}
                        style={{ width: "100%", accentColor: "var(--ar-orange)", marginBottom: 12 }} />
                      <div className="ar-row ar-between" style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: "13px" }}>Playback speed</span>
                        <span className="ar-muted" style={{ fontSize: "12px" }}>{(selected.playbackRate ?? 1)}×</span>
                      </div>
                      <div className="ar-speed-group" role="group" aria-label="Playback speed">
                        {[0.5, 0.75, 1, 1.5, 2].map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            className={`ar-speed-btn ${(selected.playbackRate ?? 1) === rate ? "is-active" : ""}`}
                            aria-pressed={(selected.playbackRate ?? 1) === rate}
                            onClick={() => update(selected.id, { playbackRate: rate })}
                          >
                            {rate}×
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : selected.type === "audio" ? (
                    <div>
                      <label className="ar-label">Audio file</label>
                      <button
                        type="button"
                        className="ar-asset-upload"
                        style={{ width: "100%", marginBottom: 8 }}
                        disabled={!!uploading}
                        onClick={() => { replaceMediaFor.current = selected.id; audioInput.current?.click(); }}
                      >
                        <span className="ar-asset-upload-ico" aria-hidden><IconUpload /></span>
                        <span className="ar-asset-cta-text">
                          <span className="ar-asset-upload-title">{uploading === "audio" ? "Uploading…" : selected.url ? "Replace with an upload" : "Upload an audio file"}</span>
                          <span className="ar-asset-upload-sub">MP3 / WAV / M4A — counts toward your cloud storage</span>
                        </span>
                      </button>
                      {isHostedAsset(selected.url) ? (
                        <span className="ar-muted" style={{ fontSize: "11px", marginTop: 2, display: "block" }}>
                          Your uploaded clip plays when the card is scanned. Viewers see a small speaker on the card they can tap to mute or unmute.
                        </span>
                      ) : (
                        <>
                          <label className="ar-label">…or paste a direct audio URL</label>
                          <input
                            className="ar-field"
                            value={selected.url ?? ""}
                            placeholder="https://…/track.mp3"
                            onChange={(e) => update(selected.id, { url: e.target.value })}
                            onBlur={(e) => update(selected.id, { url: e.target.value.trim() })}
                          />
                          {selected.url && isStreamingPageUrl(selected.url) ? (
                            <span className="ar-target-warn" style={{ marginTop: 6, display: "block" }}>
                              Streaming-page links (Spotify, YouTube…) don’t play in AR. Upload the audio file above, or paste a direct .mp3/.m4a link.
                            </span>
                          ) : (
                            <span className="ar-muted" style={{ fontSize: "11px", marginTop: 6, display: "block" }}>
                              Plays when the card is scanned. Viewers see a small speaker on the card they can tap to mute or unmute.
                            </span>
                          )}
                        </>
                      )}
                      <div className="ar-stack" style={{ gap: 8, marginTop: 10 }}>
                        <label className="ar-row" style={{ gap: 8, cursor: "pointer" }}>
                          <input type="checkbox" checked={selected.autoplay ?? true}
                            onChange={(e) => update(selected.id, { autoplay: e.target.checked })}
                            style={{ accentColor: "var(--ar-orange)" }} />
                          <span style={{ fontSize: "14px" }}>Play automatically on scan</span>
                        </label>
                        <label className="ar-row" style={{ gap: 8, cursor: "pointer" }}>
                          <input type="checkbox" checked={selected.loop ?? true}
                            onChange={(e) => update(selected.id, { loop: e.target.checked })}
                            style={{ accentColor: "var(--ar-orange)" }} />
                          <span style={{ fontSize: "14px" }}>Loop the audio</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="ar-row ar-between" style={{ marginBottom: 4 }}>
                        <label className="ar-label" style={{ margin: 0 }}>Tap Action (redirect link)</label>
                        {selected.link && (
                          <a
                            href={selected.link}
                            target="_blank"
                            rel="noreferrer"
                            className="ar-link-test"
                            style={{
                              fontSize: "12px",
                              color: "var(--ar-orange-deep)",
                              fontWeight: 700,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            Test link <IconExternal />
                          </a>
                        )}
                      </div>
                      <input
                        className="ar-field"
                        value={selected.link ?? ""}
                        placeholder={socialPreset(selected.platform)?.prefix || "https://…"}
                        onChange={(e) => update(selected.id, { link: e.target.value })}
                        onBlur={(e) => update(selected.id, { link: e.target.value ? normalizeLink(e.target.value) : "" })}
                      />
                    </div>
                  )}

                  {/* Behaviours — audio has no visible body to spin, so it's skipped. */}
                  {selected.type !== "audio" && (
                  <div className="ar-stack" style={{ gap: 8 }}>
                    <span className="ar-label" style={{ margin: 0 }}>Behaviour Settings</span>
                    <label className="ar-row" style={{ gap: 8, cursor: "pointer" }}>
                      <input type="checkbox" checked={selected.spin ?? false}
                        onChange={(e) => update(selected.id, { spin: e.target.checked })}
                        style={{ accentColor: "var(--ar-orange)" }} />
                      <span style={{ fontSize: "14px" }}>Self-rotate (spins when scanned)</span>
                    </label>
                    {selected.type === "model" ? (
                      <label className="ar-row" style={{ gap: 8, cursor: "pointer" }}>
                        <input type="checkbox" checked={selected.animated ?? true}
                          onChange={(e) => update(selected.id, { animated: e.target.checked })}
                          style={{ accentColor: "var(--ar-orange)" }} />
                        <span style={{ fontSize: "14px" }}>Play model animation</span>
                      </label>
                    ) : null}
                  </div>
                  )}

                  {/* Model Brightness (Model Specific Setting) */}
                  {selected.type === "model" && (
                    <div className="ar-card ar-stack" style={{ gap: 8, padding: "12px", border: "1px solid var(--ar-border)", background: "var(--ar-orange-soft)" }}>
                      <span className="ar-label" style={{ margin: 0 }}>Model Brightness</span>
                      <TransformSlider
                        icon={<IconSun />} label="Brightness" unit="×"
                        value={selected.brightness ?? 1.2} min={0.4} max={3} step={0.1} fixed={1}
                        onChange={(v) => update(selected.id, { brightness: Math.max(0.4, Math.min(3, v)) })}
                      />
                      <span className="ar-muted" style={{ fontSize: "11px" }}>
                        Turn this up if this specific model looks dark when scanning the card in AR.
                      </span>
                    </div>
                  )}

                  {/* Animation Speed (Model Specific Setting) */}
                  {selected.type === "model" && (
                    <div className="ar-card ar-stack" style={{ gap: 8, padding: "12px", border: "1px solid var(--ar-border)", background: "var(--ar-orange-soft)" }}>
                      <span className="ar-label" style={{ margin: 0 }}>Animation Speed</span>
                      <TransformSlider
                        icon={<IconRotate />} label="Speed" unit="×"
                        value={selected.animationSpeed ?? 1} min={0.1} max={4} step={0.1} fixed={1}
                        onChange={(v) => update(selected.id, { animationSpeed: Math.max(0.1, Math.min(8, v)) })}
                      />
                      <span className="ar-muted" style={{ fontSize: "11px" }}>
                        How fast the model’s animation and self-rotate play in AR. 1× is normal.
                      </span>
                    </div>
                  )}

                  <button className="ar-btn ar-btn-ghost ar-btn-sm ar-del-full" style={{ marginTop: "12px" }} onClick={() => remove(selected.id)}>
                    <IconTrash /> Delete Element
                  </button>
                </div>
              )}

              {propsTab === "layout" && (
                <div className="ar-properties-tab-content fade-in ar-stack">
                  {/* Position — left/right, up/down, depth. Drag the dots in the 3D
                      view or type exact values. */}
                  <div className="ar-transform-group">
                    <span className="ar-label">Position Alignment</span>
                    {/* Land orientation: X = across the card, Z (card-depth) = height
                        ABOVE the ground, Y (up the card face) = forward/back across
                        the ground. Labels match what you see in the flat preview. */}
                    <TransformSlider
                      icon={<IconAxisX />} label="Left / Right" unit="X"
                      value={selected.position[0]} min={-1.5} max={1.5} step={0.01} fixed={2}
                      onChange={(v) => setPos(selected.id, 0, v)}
                    />
                    <TransformSlider
                      icon={<IconAxisY />} label="Up / Down" unit="Y"
                      value={selected.position[2]} min={-1} max={1.5} step={0.01} fixed={2}
                      onChange={(v) => setPos(selected.id, 2, v)}
                    />
                    <TransformSlider
                      icon={<IconAxisZ />} label="Forward / Back" unit="Z"
                      value={selected.position[1]} min={-1} max={2} step={0.01} fixed={2}
                      onChange={(v) => setPos(selected.id, 1, v)}
                    />
                    <span className="ar-muted" style={{ fontSize: "11px", marginTop: "2px", display: "block" }}>
                      Left / Right slides across the card, Up / Down sets how high it floats above the surface, and Forward / Back moves it toward or away across the card.
                    </span>
                  </div>

                  {/* Rotation — tilt (X), turn (Y), roll (Z) in degrees. */}
                  <div className="ar-transform-group">
                    <span className="ar-label">Rotation Alignment</span>
                    <TransformSlider
                      icon={<IconTilt />} label="Tilt" unit="°X"
                      value={toDeg(selected.rotationX ?? 0)} min={-180} max={180} step={1} fixed={0}
                      onChange={(v) => update(selected.id, { rotationX: toRad(v) })}
                    />
                    <TransformSlider
                      icon={<IconTurn />} label="Turn" unit="°Y"
                      value={degY} min={-180} max={180} step={1} fixed={0}
                      onChange={(v) => update(selected.id, { rotationY: toRad(v) })}
                    />
                    <TransformSlider
                      icon={<IconRoll />} label="Roll" unit="°Z"
                      value={toDeg(selected.rotationZ ?? 0)} min={-180} max={180} step={1} fixed={0}
                      onChange={(v) => update(selected.id, { rotationZ: toRad(v) })}
                    />
                    <span className="ar-muted" style={{ fontSize: "11px", marginTop: "2px", display: "block" }}>
                      Tilt pitches the element forward/back, Turn spins it flat, and Roll tilts it side-to-side.
                    </span>
                  </div>

                  {/* Scale — a multiplier of the auto-fit size (1× = fitted). */}
                  <div className="ar-transform-group">
                    <span className="ar-label">Size Scale</span>
                    <TransformSlider
                      icon={<IconScale />} label="Scale" unit="×"
                      value={selected.scale} min={0.1} max={10} step={0.05} fixed={2}
                      onChange={(v) => update(selected.id, { scale: Math.max(0.1, Math.min(40, v)) })}
                    />
                    <span className="ar-muted" style={{ fontSize: "11px", marginTop: "2px", display: "block" }}>
                      Alters element scale dimensions relative to the card's bounding boundaries.
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
