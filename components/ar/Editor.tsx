"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ArModel, OwnerCard } from "@/lib/ar/db";
import { type ArElement, type ArElementType, DEFAULT_TEXT_COLOR, SOCIAL_PRESETS, normalizeLink, socialPreset } from "@/lib/ar/scene";

const SceneViewport = dynamic(() => import("./SceneViewport"), { ssr: false });
const ImageCropper = dynamic(() => import("./ImageCropper"), { ssr: false });
type TransformMode = "translate" | "rotate" | "scale";
type Side = "front" | "back";

interface SceneCard {
  frontUrl?: string;
  backUrl?: string;
  target?: Side;
}
function readCard(model: ArModel | null): SceneCard {
  const c = (model?.scene as { card?: SceneCard })?.card;
  return c && typeof c === "object" ? c : {};
}
const isHttp = (u?: string | null): u is string => !!u && /^https?:\/\//i.test(u);

let _n = 0;
const uid = () => `el_${Date.now().toString(36)}_${(_n++).toString(36)}`;

function readElements(model: ArModel | null): ArElement[] {
  const raw = (model?.scene as { elements?: unknown })?.elements;
  return Array.isArray(raw) ? (raw as ArElement[]) : [];
}

function typeLabel(el: ArElement): string {
  if (el.type === "social") return socialPreset(el.platform)?.label ?? "Social";
  if (el.type === "text") return el.text?.trim() ? el.text.trim().slice(0, 22) : "Text";
  return el.type[0].toUpperCase() + el.type.slice(1);
}

const TYPE_ICON: Record<ArElementType, string> = {
  model: "◆",
  image: "▣",
  video: "▶",
  social: "◉",
  text: "T",
};

export default function Editor({ card, model }: { card: OwnerCard; model: ArModel | null; templates?: unknown }) {
  const router = useRouter();
  const [elements, setElements] = useState<ArElement[]>(() => readElements(model));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<TransformMode>("translate");
  const [name, setName] = useState(model?.name ?? card.name ?? "");
  const [publish, setPublish] = useState(model?.is_published ?? false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

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

  const modelInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const pendingSide = useRef<Side>("front");

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
    } else {
      setBackFile(null);
      setBackPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      setBackUrl(null);
    }
    if (target === side) setTarget(side === "front" ? "back" : "front");
  }
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
    if (url) add({ type: "model", url, animated: true, scale: 0.45, rotationY: 0, position: [0, 0.22, 0.12] });
  }
  async function onPickImage(file?: File) {
    if (!file) return;
    const url = await uploadAsset(file, "image");
    if (url) add({ type: "image", url, scale: 0.35, rotationY: 0 });
  }
  function addSocial(key: string) {
    const p = socialPreset(key);
    add({ type: "social", platform: key, link: "", label: p?.label, scale: 0.3, rotationY: 0 });
  }
  function addVideo() {
    add({ type: "video", url: "", scale: 0.7, rotationY: 0, position: [0, 0.55, 0.05] });
  }
  function addText() {
    add({ type: "text", text: card.name || "Your name", color: DEFAULT_TEXT_COLOR, scale: 1, rotationY: 0, position: [0, 0.42, 0.06] });
  }

  async function save() {
    setError(null);
    setSavedOk(false);
    if (elements.length === 0) {
      setError("Add at least one element (a model, image, text, social icon or video) first.");
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
      fd.set("scene", JSON.stringify({ elements }));
      fd.set("target_side", target);
      // Each side: send a freshly cropped file, or the existing remote url to keep.
      if (frontFile) fd.set("front_image", frontFile);
      else if (frontUrl) fd.set("front_url", frontUrl);
      if (backFile) fd.set("back_image", backFile);
      else if (backUrl) fd.set("back_url", backUrl);
      const res = await fetch("/api/ar/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Save failed.");
      // Adopt the saved remote urls so a follow-up save doesn't re-upload.
      const savedCard = (json.model?.scene?.card ?? {}) as SceneCard;
      if (savedCard.frontUrl) { setFrontUrl(savedCard.frontUrl); setFrontFile(null); setFrontPreview((p) => { if (p) URL.revokeObjectURL(p); return null; }); }
      if (savedCard.backUrl) { setBackUrl(savedCard.backUrl); setBackFile(null); setBackPreview((p) => { if (p) URL.revokeObjectURL(p); return null; }); }
      setSavedOk(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
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

      <div className="ar-editor-topbar">
        <div className="ar-topbar-title">
          <h1 className="ar-h1" style={{ marginBottom: 2 }}>{card.name || "Your card"}</h1>
          <span className="ar-muted">Compose what shows on your card in AR. Drag to place, attach links.</span>
        </div>
        <div className="ar-row">
          {savedOk ? <span className="ar-saved-pill">Saved</span> : null}
          <a className="ar-btn ar-btn-ghost" href="/ar">← All cards</a>
          <button className="ar-btn ar-btn-primary" onClick={save} disabled={busy}>
            {busy ? "Saving…" : publish ? "Save & publish" : "Save draft"}
          </button>
        </div>
      </div>

      {error ? <p className="ar-error ar-editor-error">{error}</p> : null}

      <div className="ar-workspace">
        {/* Left: controls */}
        <aside className="ar-side">
          <div className="ar-card ar-stack" style={{ gap: "var(--ar-sp-md)" }}>
            <span className="ar-label" style={{ margin: 0 }}>Add to card</span>
            <div className="ar-add-grid">
              <button className="ar-tab" onClick={() => modelInput.current?.click()} disabled={!!uploading}>
                <span className="ar-tab-ico" aria-hidden>◆</span>
                {uploading === "model" ? "…" : "3D model"}
              </button>
              <button className="ar-tab" onClick={() => imageInput.current?.click()} disabled={!!uploading}>
                <span className="ar-tab-ico" aria-hidden>▣</span>
                {uploading === "image" ? "…" : "Image"}
              </button>
              <button className="ar-tab" onClick={addVideo}>
                <span className="ar-tab-ico" aria-hidden>▶</span>
                Video
              </button>
              <button className="ar-tab" onClick={addText}>
                <span className="ar-tab-ico" aria-hidden>T</span>
                Text
              </button>
            </div>
            <span className="ar-rail-group" style={{ padding: 0 }}>Social links</span>
            <div className="ar-social-grid">
              {SOCIAL_PRESETS.map((s) => (
                <button key={s.key} className="ar-chip" onClick={() => addSocial(s.key)}>
                  <span className="ar-chip-dot" style={{ background: s.color }} aria-hidden />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Card setup — always visible */}
          <div className="ar-card ar-stack">
            <span className="ar-label" style={{ margin: 0 }}>Card setup</span>

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
                      <div className="ar-target-img ar-target-img-empty" aria-hidden>?</div>
                    )}
                    <div className="ar-target-body" style={{ flex: 1 }}>
                      <span className={url ? "ar-target-ok" : "ar-target-warn"}>
                        {url ? (isTarget ? "✓ AR target" : "Saved") : isTarget ? "Required to publish" : "Not set"}
                      </span>
                      <div className="ar-row" style={{ gap: 6, flexWrap: "wrap" }}>
                        <button className="ar-btn ar-btn-ghost ar-btn-sm" onClick={() => pickPhoto(activeSide)}>
                          {url ? "Replace" : "Upload"}
                        </button>
                        {url && !isTarget ? (
                          <button className="ar-btn ar-btn-ghost ar-btn-sm" onClick={() => setTarget(activeSide)}>Use for AR</button>
                        ) : null}
                        {url ? (
                          <button className="ar-icon-btn ar-icon-danger" title="Remove" onClick={() => clearSide(activeSide)}>✕</button>
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
                      <span className="ar-el-ico" aria-hidden>{TYPE_ICON[el.type]}</span>
                      <span className="ar-el-name">{typeLabel(el)}</span>
                      {el.link || (el.type === "video" && el.url) ? <span className="ar-el-link" aria-hidden>🔗</span> : null}
                    </button>
                    <div className="ar-el-actions">
                      <button className="ar-icon-btn" title={el.hidden ? "Show" : "Hide"}
                        onClick={() => { update(el.id, { hidden: !el.hidden }); if (!el.hidden && selectedId === el.id) setSelectedId(null); }}>
                        {el.hidden ? "🚫" : "👁"}
                      </button>
                      <button className="ar-icon-btn" title="Duplicate" onClick={() => duplicate(el.id)}>⧉</button>
                      <button className="ar-icon-btn ar-icon-danger" title="Delete" onClick={() => remove(el.id)}>✕</button>
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
            onSelect={setSelectedId}
            onTransform={(id, t) => update(id, { position: t.position, rotationY: t.rotationY, scale: t.scale })}
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
                <button className="ar-icon-btn" title="Duplicate" onClick={() => duplicate(selected.id)}>⧉</button>
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

              {/* Layout — precise transforms */}
              <div>
                <span className="ar-label">Layout</span>
                <div className="ar-layout-grid">
                  <span className="ar-layout-tag">Position</span>
                  {([0, 1, 2] as const).map((axis) => (
                    <input key={axis} type="number" step={0.05} className="ar-field ar-num"
                      value={Number(selected.position[axis].toFixed(3))}
                      onChange={(e) => setPos(selected.id, axis, Number(e.target.value))} />
                  ))}
                  <span className="ar-layout-tag">Rotation</span>
                  <input type="number" step={5} className="ar-field ar-num" value={degY}
                    onChange={(e) => update(selected.id, { rotationY: (Number(e.target.value) * Math.PI) / 180 })} />
                  <span className="ar-layout-unit">°Y</span>
                  <span />
                  <span className="ar-layout-tag">Scale</span>
                  <input type="number" step={0.05} min={0.05} className="ar-field ar-num"
                    value={Number(selected.scale.toFixed(2))}
                    onChange={(e) => update(selected.id, { scale: Math.max(0.05, Number(e.target.value)) })} />
                  <span className="ar-layout-unit">×</span>
                  <span />
                </div>
              </div>

              <div>
                <span className="ar-label">Move tool</span>
                <div className="ar-row" style={{ gap: 6 }}>
                  {(["translate", "rotate", "scale"] as TransformMode[]).map((m) => (
                    <button key={m} className={`ar-btn ar-btn-sm ${mode === m ? "ar-btn-primary" : "ar-btn-ghost"}`}
                      onClick={() => setMode(m)}>
                      {m === "translate" ? "Move" : m === "rotate" ? "Rotate" : "Scale"}
                    </button>
                  ))}
                </div>
                <span className="ar-muted">Drag the gizmo in the viewport, the sliders, or type exact values above.</span>
              </div>

              <div>
                <label className="ar-label">Size · {selected.scale.toFixed(2)}×</label>
                <input type="range" min={0.1} max={2} step={0.05} value={Math.min(2, selected.scale)}
                  onChange={(e) => update(selected.id, { scale: Number(e.target.value) })}
                  className="ar-range" />
              </div>

              <div>
                <label className="ar-label">Rotate · {degY}°</label>
                <input type="range" min={-180} max={180} step={5} value={degY}
                  onChange={(e) => update(selected.id, { rotationY: (Number(e.target.value) * Math.PI) / 180 })}
                  className="ar-range" />
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
                Delete element
              </button>
            </div>
          ) : (
            <div className="ar-props-empty">
              <span className="ar-props-empty-ico" aria-hidden>⌖</span>
              <p className="ar-props-empty-title">Nothing selected</p>
              <span className="ar-muted">Select a layer to edit its link, size and X / Y / Z position.</span>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
