"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ArModel, OwnerCard } from "@/lib/ar/db";
import { type ArElement, type ArElementType, type ArLighting, DEFAULT_TEXT_COLOR, normalizeLink, readLighting, socialPreset } from "@/lib/ar/scene";
import type { GalleryAsset } from "@/lib/ar/gallery";
import { compileMindTargets } from "@/lib/ar/compileTarget";
import {
  IconAxisX, IconAxisY, IconAxisZ, IconBox, IconCheck, IconChevron, IconCopy, IconEye, IconEyeOff,
  IconImage, IconLink, IconMove, IconPlus, IconRotate, IconScale, IconSun, IconTarget, IconText,
  IconTrash, IconVideo, IconX, socialIcon,
} from "./icons";

const SceneViewport = dynamic(() => import("./SceneViewport"), { ssr: false });
const ImageCropper = dynamic(() => import("./ImageCropper"), { ssr: false });
const GalleryPicker = dynamic(() => import("./GalleryPicker"), { ssr: false });
type TransformMode = "translate" | "rotate" | "scale";
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
  // Prebuilt MindAR target compiled from the card photo(s) at save time, so the
  // viewer skips the slow on-device compile. mindTargets = how many photos it was
  // built from (front[+back]), in that order, matching the viewer's anchors.
  mindUrl?: string;
  mindTargets?: number;
}
function readCard(model: ArModel | null): SceneCard {
  const c = (model?.scene as { card?: SceneCard })?.card;
  return c && typeof c === "object" ? c : {};
}
const isHttp = (u?: string | null): u is string => !!u && /^https?:\/\//i.test(u);

let _n = 0;
const uid = () => `el_${Date.now().toString(36)}_${(_n++).toString(36)}`;

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

function readElements(model: ArModel | null): ArElement[] {
  const raw = (model?.scene as { elements?: unknown })?.elements;
  return Array.isArray(raw) ? (raw as ArElement[]) : [];
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
};

/** Icon for a layer row — brand glyph for socials, type glyph otherwise. */
function elementIcon(el: ArElement): ReactNode {
  return el.type === "social" ? socialIcon(el.platform) : TYPE_ICON[el.type];
}

// Social is intentionally NOT an asset tab anymore — social icons are now picked
// as real 3D models from the KaunTech gallery (the flat social billboards are
// gone). The `social` element type is kept in scene.ts only so cards published
// before this change still render.
type AssetTab = "model" | "image" | "video" | "text";
const ASSET_TABS: { key: AssetTab; label: string; icon: ReactNode }[] = [
  { key: "model", label: "3D model", icon: <IconBox /> },
  { key: "image", label: "Image", icon: <IconImage /> },
  { key: "video", label: "Video", icon: <IconVideo /> },
  { key: "text", label: "Text", icon: <IconText /> },
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

export default function Editor({ card, model, galleryAssets = [] }: { card: OwnerCard; model: ArModel | null; galleryAssets?: GalleryAsset[]; templates?: unknown }) {
  const router = useRouter();
  const [elements, setElements] = useState<ArElement[]>(() => readElements(model));
  const [lighting, setLighting] = useState<ArLighting>(() => readLighting((model?.scene as { lighting?: unknown } | null)?.lighting));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assetTab, setAssetTab] = useState<AssetTab>("model");
  const [mode, setMode] = useState<TransformMode>("translate");
  const [name, setName] = useState(model?.name ?? card.name ?? "");
  // New cards default to publish ON, so setting one up makes it live without a
  // second step; an existing card keeps whatever it was last saved as.
  const [publish, setPublish] = useState(model?.is_published ?? true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOnce, setSavedOnce] = useState(!!model);

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
  // Prebuilt MindAR target (.mind). Recompiled only when the photos change, so a
  // routine element edit doesn't pay the compile cost. `prep` shows progress.
  const [mindUrl, setMindUrl] = useState<string | null>(initCard.mindUrl ?? null);
  const [prep, setPrep] = useState<string | null>(null);
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
  const photoInput = useRef<HTMLInputElement>(null);
  const pendingSide = useRef<Side>("front");

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
      .finally(() => { if (alive) setOcrBusy(false); });
    return () => { alive = false; };
  }, [frontFile]);

  useEffect(() => {
    if (!backFile) return;
    let alive = true;
    setOcrBusy(true);
    ocrImageSrc(backFile)
      .then((t) => { if (alive && t) setBackOcr(t); })
      .finally(() => { if (alive) setOcrBusy(false); });
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
  function remove(id: string) {
    setElements((p) => p.filter((e) => e.id !== id));
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

  async function uploadAsset(file: File, kind: "model" | "image"): Promise<string | null> {
    setError(null);
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.set("card_id", card.id);
      fd.set("kind", kind);
      fd.set("file", file);
      const res = await fetch("/api/ar/asset", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Upload failed.");
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
    add({ type: "model", url, animated: true, baseScale, scale: 1, rotationY: 0, position: [0, 0.22, 0.12] });
  }
  async function onPickImage(file?: File) {
    if (!file) return;
    const url = await uploadAsset(file, "image");
    if (url) add({ type: "image", url, scale: 0.35, rotationY: 0 });
  }
  function addVideo() {
    add({ type: "video", url: "", scale: 0.7, rotationY: 0, position: [0, 0.55, 0.05] });
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
      rotationY: 0,
      position: [0, 0.22, 0.12],
      // Social "coin" models carry their platform so the link field offers the
      // right handle prefix — same UX as a flat social icon, but actually 3D.
      ...(a.platform ? { platform: a.platform, link: "" } : {}),
    });
  }
  // Manual rescue for any model that's still the wrong size (e.g. one placed
  // before auto-fit existed): re-measure and reset to the 1× fitted size.
  async function fitToCard(el: ArElement) {
    if (el.type !== "model" || !el.url) return;
    const baseScale = await fitScaleFor(el.url);
    update(el.id, { baseScale, scale: 1 });
  }

  async function save() {
    setError(null);
    if (elements.length === 0 && !hasTarget) {
      setError("Add your card photo, or at least one element, first.");
      return;
    }
    if (publish && !hasTarget) {
      setError("Add your card photo (the AR target) before publishing. Without it, scanning shows nothing.");
      return;
    }
    const emptyVideo = elements.find((e) => e.type === "video" && !e.url?.trim());
    if (emptyVideo) {
      setSelectedId(emptyVideo.id);
      setError("One of your videos has no URL yet. Paste an mp4 link or remove it.");
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

      // Precompile the MindAR target from the CHOSEN side's photo so the published
      // viewer starts AR fast (no on-device compile) and tracks a single target.
      // Only when the target photo/side changed or there's no .mind yet.
      // Best-effort: on failure we save without it and the viewer compiles at view
      // time.
      const targetSrc = target === "back" ? backFile ?? backUrl : frontFile ?? frontUrl;
      const targetSources: (File | string)[] = targetSrc ? [targetSrc] : [];
      if (targetSources.length > 0 && (targetSig !== mindBaselineRef.current || !mindUrl)) {
        setPrep("Preparing AR target…");
        const compiled = await compileMindTargets(targetSources);
        setPrep(null);
        if (compiled) {
          fd.set("mind", compiled.blob, "targets.mind");
          fd.set("mind_target_count", String(compiled.count));
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
      // Adopt the saved .mind (or its absence) so the next save only recompiles
      // when the target side or its photo changes again. Baseline must match the
      // (target-aware) targetSig shape.
      setMindUrl(savedCard.mindUrl ?? null);
      const newTargetUrl = target === "back" ? newBack : newFront;
      mindBaselineRef.current = JSON.stringify([target, newTargetUrl ?? null]);
      setSavedOnce(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
      setPrep(null);
    }
  }

  const viewportCardColor = useMemo(() => card.card_color, [card.card_color]);
  const degY = selected ? Math.round((selected.rotationY * 180) / Math.PI) : 0;

  return (
    <div className="ar-editor-main">
      <input ref={modelInput} type="file" accept=".glb,model/gltf-binary" style={{ display: "none" }}
        onChange={(e) => { onPickModel(e.target.files?.[0]); e.currentTarget.value = ""; }} />
      <input ref={imageInput} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => { onPickImage(e.target.files?.[0]); e.currentTarget.value = ""; }} />
      <input ref={photoInput} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropFor({ side: pendingSide.current, file: f }); e.currentTarget.value = ""; }} />

      {cropFor ? (
        <ImageCropper
          file={cropFor.file}
          title={`Crop ${cropFor.side} of card`}
          onCancel={() => setCropFor(null)}
          onConfirm={(cropped) => { setSideImage(cropFor.side, cropped); setActiveSide(cropFor.side); setCropFor(null); }}
        />
      ) : null}

      {galleryOpen ? (
        <GalleryPicker assets={galleryAssets} onClose={() => setGalleryOpen(false)} onPick={addGalleryModel} />
      ) : null}

      <div className="ar-editor-topbar">
        <div className="ar-topbar-title">
          <h1 className="ar-h1" style={{ marginBottom: 2 }}>{card.name || "Your card"}</h1>
          <span className="ar-muted">Compose what shows on your card in AR. Drag to place, attach links.</span>
        </div>
        <div className="ar-row">
          {prep ? <span className="ar-muted">{prep}</span> : ocrBusy ? <span className="ar-muted">Reading card text…</span> : null}
          <a className="ar-btn ar-btn-ghost" href="/ar">← All cards</a>
          {dirty ? (
            <button className="ar-btn ar-btn-primary" onClick={save} disabled={busy}>
              {busy ? "Saving…" : publish ? "Save & publish" : "Save draft"}
            </button>
          ) : savedOnce ? (
            <span className="ar-saved-pill"><IconCheck /> Saved</span>
          ) : null}
        </div>
      </div>

      {error ? <p className="ar-error ar-editor-error">{error}</p> : null}

      <div className="ar-workspace">
        {/* Left: controls */}
        <aside className="ar-side">
          {/* Card setup — moved to top, collapsible */}
          <Collapsible title="Card setup" icon={<IconTarget />} defaultOpen>
            <div className="ar-stack">
              <div>
                <label className="ar-label" htmlFor="ar-name">Label (private)</label>
                <input id="ar-name" className="ar-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="My AR card" />
              </div>

              <div>
                <span className="ar-label">Card photos</span>
                <div className="ar-side-tabs">
                  {(["front", "back"] as Side[]).map((s) => (
                    <button key={s} className={`ar-side-tab ${activeSide === s ? "is-active" : ""}`} onClick={() => setActiveSide(s)}>
                      {s === "front" ? "Front" : "Back"}
                      {target === s ? <span className="ar-side-target-dot" title="AR target" /> : null}
                    </button>
                  ))}
                </div>

                {(() => {
                  const url = sideUrl(activeSide);
                  const isTarget = target === activeSide;
                  return (
                    <div className={`ar-target ${isTarget && !url ? "ar-target-missing" : ""}`}>
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={`Card ${activeSide}`} className="ar-target-img" />
                      ) : (
                        <div className="ar-target-img ar-target-img-empty" aria-hidden><IconImage /></div>
                      )}
                      <div className="ar-target-body" style={{ flex: 1 }}>
                        <span className={url ? "ar-target-ok" : "ar-target-warn"}>
                          {url ? (
                            isTarget ? <><IconCheck /> AR target</> : "Saved"
                          ) : isTarget ? "Required to publish" : "Not set"}
                        </span>
                        <div className="ar-row" style={{ gap: 6, flexWrap: "wrap" }}>
                          <button className="ar-btn ar-btn-ghost ar-btn-sm" onClick={() => pickPhoto(activeSide)}>
                            {url ? "Replace" : "Upload"}
                          </button>
                          {url && !isTarget ? (
                            <button className="ar-btn ar-btn-ghost ar-btn-sm" onClick={() => setTarget(activeSide)}>Use for AR</button>
                          ) : null}
                          {url ? (
                            <button className="ar-icon-btn ar-icon-danger" title="Remove" onClick={() => clearSide(activeSide)}><IconX /></button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <span className="ar-muted" style={{ marginTop: 6, display: "block" }}>
                  The AR target is the side people point their camera at. Front and back are both saved.
                </span>
              </div>

              <label className="ar-row" style={{ gap: 8, cursor: "pointer", alignItems: "flex-start" }}>
                <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} style={{ accentColor: "var(--ar-orange)", marginTop: 3 }} />
                <span>
                  <strong>Publish</strong> — show in AR when people scan this card
                  {publish && !hasTarget ? (
                    <span className="ar-target-warn" style={{ display: "block", marginTop: 4 }}>
                      Upload a card photo above, or this card won&apos;t show anything when scanned.
                    </span>
                  ) : null}
                </span>
              </label>
            </div>
          </Collapsible>

          {/* Assets — add models, images, video, text or social, by category */}
          <div className="ar-card ar-stack" style={{ gap: "var(--ar-sp-md)" }}>
            <span className="ar-label" style={{ margin: 0 }}>Assets</span>
            <div className="ar-asset-tabs" role="tablist">
              {ASSET_TABS.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={assetTab === t.key}
                  title={t.label}
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
                  <button className="ar-tab ar-asset-add ar-asset-gallery" onClick={() => setGalleryOpen(true)}>
                    <span className="ar-tab-ico" aria-hidden><IconBox /></span>
                    Choose from KaunTech gallery
                  </button>
                  <button className="ar-tab ar-asset-add ar-asset-add-ghost" onClick={() => modelInput.current?.click()} disabled={!!uploading}>
                    <span className="ar-tab-ico" aria-hidden><IconPlus /></span>
                    {uploading === "model" ? "Uploading…" : "Or upload your own .glb"}
                  </button>
                  <span className="ar-muted ar-asset-hint">Pick a ready-made 3D model, or upload a .glb. It floats above the card and can play its animation.</span>
                </>
              ) : assetTab === "image" ? (
                <>
                  <button className="ar-tab ar-asset-add" onClick={() => imageInput.current?.click()} disabled={!!uploading}>
                    <span className="ar-tab-ico" aria-hidden><IconPlus /></span>
                    {uploading === "image" ? "Uploading…" : "Add image"}
                  </button>
                  <span className="ar-muted ar-asset-hint">A PNG or JPG shown as a flat plane on the card.</span>
                </>
              ) : assetTab === "video" ? (
                <>
                  <button className="ar-tab ar-asset-add" onClick={addVideo}>
                    <span className="ar-tab-ico" aria-hidden><IconPlus /></span>
                    Add video
                  </button>
                  <span className="ar-muted ar-asset-hint">Adds a video plane — paste the mp4 link in its properties.</span>
                </>
              ) : (
                <>
                  <button className="ar-tab ar-asset-add" onClick={addText}>
                    <span className="ar-tab-ico" aria-hidden><IconPlus /></span>
                    Add text
                  </button>
                  <span className="ar-muted ar-asset-hint">A line of text — edit the words and colour in its properties.</span>
                </>
              )}
            </div>
          </div>

          {/* Lighting — scene-wide; the AR view looks darker than this editor, so
              this is the knob to brighten models when scanned. */}
          <div className="ar-card ar-stack">
            <span className="ar-label" style={{ margin: 0 }}>Lighting</span>
            <TransformSlider
              icon={<IconSun />} label="Brightness" unit="×"
              value={lighting.intensity} min={0.4} max={3} step={0.1} fixed={1}
              onChange={(v) => setLighting({ intensity: Math.max(0.4, Math.min(3, v)) })}
            />
            <span className="ar-muted">Turn this up if your models look dark when the card is scanned in AR.</span>
          </div>

          {/* Layers — always visible */}
          <div className="ar-card ar-stack">
            <span className="ar-label" style={{ margin: 0 }}>Layers ({elements.length})</span>
            {elements.length === 0 ? (
              <span className="ar-muted">Nothing yet. Add a 3D model, image, text, social icon or video from the left.</span>
            ) : (
              <div className="ar-stack" style={{ gap: 6 }}>
                {elements.map((el) => (
                  <div key={el.id} className={`ar-el-row ${selectedId === el.id ? "is-selected" : ""} ${el.hidden ? "is-hidden" : ""}`}>
                    <button className="ar-el-select" onClick={() => setSelectedId(el.id)}>
                      <span className="ar-el-ico" aria-hidden>{elementIcon(el)}</span>
                      <span className="ar-el-name">{typeLabel(el)}</span>
                      {el.link || (el.type === "video" && el.url) ? <span className="ar-el-link" aria-hidden><IconLink /></span> : null}
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
        </aside>

        {/* Center: flat-ground composer */}
        <div className="ar-stage">
          <SceneViewport
            elements={elements}
            selectedId={selectedId}
            mode={mode}
            referenceImageUrl={trackableCardPhoto}
            cardColor={viewportCardColor}
            brightness={lighting.intensity}
            onSelect={setSelectedId}
            onTransform={(id, t) => update(id, { position: t.position, rotationX: t.rotationX, rotationY: t.rotationY, rotationZ: t.rotationZ, scale: t.scale })}
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
        <aside className="ar-props">
          {selected ? (
            <div className="ar-card ar-stack">
              <div className="ar-row ar-between">
                <span className="ar-label" style={{ margin: 0 }}>{typeLabel(selected)} properties</span>
                <button className="ar-icon-btn" title="Duplicate" onClick={() => duplicate(selected.id)}><IconCopy /></button>
              </div>

              {selected.type === "text" ? (
                <>
                  <div>
                    <label className="ar-label">Text</label>
                    <input
                      className="ar-field"
                      value={selected.text ?? ""}
                      placeholder="Your name"
                      onChange={(e) => update(selected.id, { text: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="ar-label">Colour</label>
                    <div className="ar-row" style={{ gap: 8 }}>
                      <input type="color" className="ar-color" value={selected.color ?? DEFAULT_TEXT_COLOR}
                        onChange={(e) => update(selected.id, { color: e.target.value })} />
                      <span className="ar-mono ar-muted">{(selected.color ?? DEFAULT_TEXT_COLOR).toUpperCase()}</span>
                    </div>
                  </div>
                </>
              ) : selected.type === "video" ? (
                <div>
                  <label className="ar-label">Video URL (mp4)</label>
                  <input
                    className="ar-field"
                    value={selected.url ?? ""}
                    placeholder="https://…/clip.mp4"
                    onChange={(e) => update(selected.id, { url: e.target.value })}
                    onBlur={(e) => update(selected.id, { url: e.target.value.trim() })}
                  />
                </div>
              ) : (
                <div>
                  <label className="ar-label">Tap opens (link)</label>
                  <input
                    className="ar-field"
                    value={selected.link ?? ""}
                    placeholder={socialPreset(selected.platform)?.prefix || "https://…"}
                    onChange={(e) => update(selected.id, { link: e.target.value })}
                    onBlur={(e) => update(selected.id, { link: e.target.value ? normalizeLink(e.target.value) : "" })}
                  />
                </div>
              )}

              {/* Position — left/right, up/down, depth. Drag or type exact values. */}
              <div className="ar-transform-group">
                <span className="ar-label">Position</span>
                <TransformSlider
                  icon={<IconAxisX />} label="Left / Right" unit="X"
                  value={selected.position[0]} min={-1.5} max={1.5} step={0.01} fixed={2}
                  onChange={(v) => setPos(selected.id, 0, v)}
                />
                <TransformSlider
                  icon={<IconAxisY />} label="Up / Down" unit="Y"
                  value={selected.position[1]} min={-1} max={2} step={0.01} fixed={2}
                  onChange={(v) => setPos(selected.id, 1, v)}
                />
                <TransformSlider
                  icon={<IconAxisZ />} label="Depth" unit="Z"
                  value={selected.position[2]} min={-1} max={1} step={0.01} fixed={2}
                  onChange={(v) => setPos(selected.id, 2, v)}
                />
              </div>

              {/* Rotation — tilt (X), turn (Y), roll (Z) in degrees. */}
              <div className="ar-transform-group">
                <span className="ar-label">Rotation</span>
                <TransformSlider
                  icon={<IconRotate />} label="Tilt" unit="°X"
                  value={toDeg(selected.rotationX ?? 0)} min={-180} max={180} step={1} fixed={0}
                  onChange={(v) => update(selected.id, { rotationX: toRad(v) })}
                />
                <TransformSlider
                  icon={<IconRotate />} label="Turn" unit="°Y"
                  value={degY} min={-180} max={180} step={1} fixed={0}
                  onChange={(v) => update(selected.id, { rotationY: toRad(v) })}
                />
                <TransformSlider
                  icon={<IconRotate />} label="Roll" unit="°Z"
                  value={toDeg(selected.rotationZ ?? 0)} min={-180} max={180} step={1} fixed={0}
                  onChange={(v) => update(selected.id, { rotationZ: toRad(v) })}
                />
              </div>

              {/* Scale — a multiplier of the auto-fit size (1× = fitted). */}
              <div className="ar-transform-group">
                <span className="ar-label">Size</span>
                <TransformSlider
                  icon={<IconScale />} label="Scale" unit="×"
                  value={selected.scale} min={0.1} max={3} step={0.05} fixed={2}
                  onChange={(v) => update(selected.id, { scale: Math.max(0.1, v) })}
                />
                {selected.type === "model" && selected.url ? (
                  <button className="ar-btn ar-btn-ghost ar-btn-sm" style={{ marginTop: 8 }}
                    onClick={() => fitToCard(selected)}>
                    <IconScale /> Fit to card
                  </button>
                ) : null}
              </div>

              {/* Viewport gizmo mode — drag the handle in the 3D view instead. */}
              <div>
                <span className="ar-label">Drag handle in view</span>
                <div className="ar-row" style={{ gap: 6 }}>
                  {(["translate", "rotate", "scale"] as TransformMode[]).map((m) => (
                    <button key={m} className={`ar-btn ar-btn-sm ar-mode-btn ${mode === m ? "ar-btn-primary" : "ar-btn-ghost"}`}
                      onClick={() => setMode(m)}>
                      <span className="ar-mode-ico" aria-hidden>
                        {m === "translate" ? <IconMove /> : m === "rotate" ? <IconRotate /> : <IconScale />}
                      </span>
                      {m === "translate" ? "Move" : m === "rotate" ? "Rotate" : "Scale"}
                    </button>
                  ))}
                </div>
                <span className="ar-muted">Drag the gizmo in the viewport, the sliders, or type exact values above.</span>
              </div>

              {/* Behaviours */}
              <div className="ar-stack" style={{ gap: 8 }}>
                <span className="ar-label" style={{ margin: 0 }}>Behaviour</span>
                <label className="ar-row" style={{ gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={selected.spin ?? false}
                    onChange={(e) => update(selected.id, { spin: e.target.checked })}
                    style={{ accentColor: "var(--ar-orange)" }} />
                  <span>Self-rotate (spins when scanned)</span>
                </label>
                {selected.type === "model" ? (
                  <label className="ar-row" style={{ gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={selected.animated ?? true}
                      onChange={(e) => update(selected.id, { animated: e.target.checked })}
                      style={{ accentColor: "var(--ar-orange)" }} />
                    <span>Play model animation</span>
                  </label>
                ) : null}
              </div>

              <button className="ar-btn ar-btn-ghost ar-btn-sm ar-del-full" onClick={() => remove(selected.id)}>
                <IconTrash /> Delete element
              </button>
            </div>
          ) : (
            <div className="ar-props-empty">
              <span className="ar-props-empty-ico" aria-hidden><IconTarget /></span>
              <p className="ar-props-empty-title">Nothing selected</p>
              <span className="ar-muted">Select a layer to edit its link, size and X / Y / Z position.</span>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
