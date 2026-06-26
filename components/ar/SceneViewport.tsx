"use client";

import { Component, type ReactNode, type RefObject, Suspense, useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Image as DreiImage,
  Lightformer,
  OrbitControls,
  RoundedBox,
  Text,
  useGLTF,
  useAnimations,
  useTexture,
  useVideoTexture,
} from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { ArElement } from "@/lib/ar/scene";
import { socialPreset, flatPlaneSize, FLAT_BASE } from "@/lib/ar/scene";

// Shared wireframe-cube edges + scratch math for the selection highlight (only one
// element is selected at a time, so module-level temporaries are safe to reuse).
const UNIT_BOX_EDGES = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
const _selInv = new THREE.Matrix4();
const _selM = new THREE.Matrix4();
const _selV = new THREE.Vector3();

interface Props {
  elements: ArElement[];
  selectedId: string | null;
  referenceImageUrl?: string | null;
  cardColor?: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * The composer canvas — a Kivicube-style "land": the card lies FLAT on a floor
 * and you arrange 3D content standing on it, viewed from a 3/4 angle you can orbit
 * and pan around. The stored scene is still card-relative (card in its own XY
 * plane, content floating out along +Z — the SAME convention the WebAR viewer uses
 * on the image-target anchor); a single stage group rotated -90° about X lays that
 * plane down as ground, so card +Z (float-out) reads as world +Y (up). Stored
 * coordinates are untouched, so the published viewer is unaffected.
 */
export default function SceneViewport({
  elements,
  selectedId,
  referenceImageUrl,
  cardColor,
  onSelect,
}: Props) {
  return (
    <Canvas camera={{ position: [0, 1.25, 1.85], fov: 40 }} dpr={[1, 2]} shadows>
      <color attach="background" args={["#f1f0ee"]} />
      <ambientLight intensity={0.95} />
      <hemisphereLight intensity={0.6} color="#ffffff" groundColor="#bdb8b0" />
      <directionalLight position={[2, 3, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-3, 1, 2]} intensity={0.4} />

      {/* Premium image-based lighting — mirrors the AR viewer's in-memory studio
          environment so glossy / metallic models (car bodies, chrome, glass) show
          the same soft reflections here as on the card. Built once from a few light
          panels (frames={1}, no network fetch / no HDR download). */}
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={1.3} position={[0, 2.5, 1.5]} scale={[4, 4, 1]} color="#ffffff" />
        <Lightformer intensity={0.55} position={[-2.5, 0, 1]} scale={[3, 3, 1]} color="#dfe6f0" />
        <Lightformer intensity={0.3} position={[2.5, -1, 1]} scale={[3, 3, 1]} color="#9aa3b2" />
      </Environment>

      {/* The "land": a horizontal floor the card sits on. A faint ground plane
          (receives shadows) under a grid, so the card reads as resting on a real
          surface you look ACROSS — not a poster you orbit. World XZ plane, y≈0. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.014, 0]} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#eceae6" roughness={1} metalness={0} />
      </mesh>
      <gridHelper args={[3, 24, "#cfccc5", "#e4e1dc"]} position={[0, -0.012, 0]} />

      {/* Ground stage. The stored scene is card-relative — the card lives in its own
          XY plane with content floating out along +Z. Rotating the whole stage -90°
          about X LAYS THE CARD DOWN FLAT like ground: card +Z (float-out) becomes
          world +Y (up), so a model tilted to stand on the card now stands UPRIGHT on
          the land, exactly like the real scan of a card lying on a table. card +X
          stays world +X (left/right) and card +Y becomes world -Z (forward/back on
          the ground). Stored coordinates are untouched — only how we view them. */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {/* The card (tracking target) */}
        <CardBase referenceImageUrl={referenceImageUrl} cardColor={cardColor} onSelect={onSelect} />

        <Suspense fallback={null}>
          {elements.map((el) =>
            el.hidden ? null : (
              <ElementNode key={el.id} element={el} selected={el.id === selectedId} onSelect={onSelect} />
            ),
          )}
        </Suspense>
      </group>

      {/* Orbit/pan/zoom around the land, Kivicube-style. Left-drag circles the card
          on its floor (full 360° around), right-drag (or two-finger) pans across the
          ground, wheel zooms. enableDamping keeps it smooth. Polar range runs from
          near top-down to just under the card so you can inspect every face (incl.
          the underside) without flipping fully beneath the floor. */}
      <OrbitControls
        makeDefault
        enablePan
        enableDamping
        dampingFactor={0.12}
        rotateSpeed={0.85}
        zoomSpeed={0.8}
        panSpeed={0.7}
        target={[0, 0.15, 0]}
        minDistance={0.4}
        maxDistance={8}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI * 0.88}
      />
    </Canvas>
  );
}

function CardBase({
  referenceImageUrl,
  cardColor,
  onSelect,
}: {
  referenceImageUrl?: string | null;
  cardColor?: string | null;
  onSelect: (id: string | null) => void;
}) {
  const W = 1;
  // Exact business-card aspect (3.5×2in → 1/1.75), matching the cropper's frame
  // and the MindAR target's normalized width=1 — so element X/Y placed here lands
  // in the same spot when scanned.
  const H = 1 / 1.75;
  const usable = referenceImageUrl && /^https?:\/\//i.test(referenceImageUrl);
  return (
    <group onClick={(e) => { e.stopPropagation(); onSelect(null); }}>
      <RoundedBox args={[W, H, 0.02]} radius={0.02} smoothness={5}>
        <meshStandardMaterial color="#ffffff" metalness={0} roughness={0.85} />
      </RoundedBox>
      {usable ? (
        <Suspense fallback={null}>
          <DreiImage url={referenceImageUrl!} position={[0, 0, 0.012]} scale={[W, H] as unknown as number} />
        </Suspense>
      ) : (
        <mesh position={[0, H / 2 - 0.05, 0.012]}>
          <planeGeometry args={[W - 0.06, 0.05]} />
          <meshStandardMaterial color={cardColor || "#F59E0B"} />
        </mesh>
      )}
    </group>
  );
}

// Elements are positioned/rotated/scaled entirely from the right-panel sliders —
// there's no in-viewport gizmo. Clicking an element just selects it (and shows the
// selection box); a click on an already-selected element offers to open its link.
function ElementNode({
  element,
  selected,
  onSelect,
}: {
  element: ArElement;
  selected: boolean;
  onSelect: Props["onSelect"];
}) {
  const nodeRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  return (
    <group ref={nodeRef} position={element.position} rotation={[(element.baseRotationX ?? 0) + (element.rotationX ?? 0), element.rotationY, element.rotationZ ?? 0]} scale={(element.baseScale ?? 1) * element.scale}>
      <group ref={bodyRef}>
        <ElementBody element={element} onSelect={onSelect} selected={selected} />
      </group>
      {selected ? <SelectionBox nodeRef={nodeRef} bodyRef={bodyRef} /> : null}
    </group>
  );
}

// Selection highlight: a tight wireframe box around whatever is selected — model,
// text, image, video, social or audio. Re-measured each frame in the element's
// OWN local frame (so it tracks animation / rotation / scale), and drawn on top
// (depthTest off) so it stays legible against any content. No fill, no ground disc.
function SelectionBox({
  nodeRef,
  bodyRef,
}: {
  nodeRef: RefObject<THREE.Group | null>;
  bodyRef: RefObject<THREE.Group | null>;
}) {
  const ref = useRef<THREE.LineSegments>(null);
  const box = useMemo(() => new THREE.Box3(), []);
  const size = useMemo(() => new THREE.Vector3(), []);
  const center = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const node = nodeRef.current;
    const body = bodyRef.current;
    const ls = ref.current;
    if (!node || !body || !ls) return;
    node.updateWorldMatrix(true, true);
    _selInv.copy(node.matrixWorld).invert();
    box.makeEmpty();
    body.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const geom = mesh.geometry as THREE.BufferGeometry | undefined;
      if (!mesh.isMesh || !geom) return;
      if (!geom.boundingBox) geom.computeBoundingBox();
      const gb = geom.boundingBox;
      if (!gb) return;
      // Express each geometry corner in the node's local frame, then grow the box.
      _selM.copy(_selInv).multiply(mesh.matrixWorld);
      for (let i = 0; i < 8; i++) {
        _selV.set(i & 1 ? gb.max.x : gb.min.x, i & 2 ? gb.max.y : gb.min.y, i & 4 ? gb.max.z : gb.min.z).applyMatrix4(_selM);
        box.expandByPoint(_selV);
      }
    });
    if (box.isEmpty()) { ls.visible = false; return; }
    ls.visible = true;
    box.getSize(size);
    box.getCenter(center);
    const pad = Math.max(size.x, size.y, size.z) * 0.05 + 0.006;
    ls.position.copy(center);
    ls.scale.set(size.x + pad, size.y + pad, size.z + pad);
  });
  return (
    <lineSegments ref={ref} geometry={UNIT_BOX_EDGES} raycast={() => null} renderOrder={999}>
      <lineBasicMaterial color="#FF7A00" transparent opacity={0.95} depthTest={false} toneMapped={false} />
    </lineSegments>
  );
}

function ElementBody({
  element,
  onSelect,
  selected,
}: {
  element: ArElement;
  onSelect: Props["onSelect"];
  selected?: boolean;
}) {
  const click = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (selected && element.link) {
      const confirmOpen = window.confirm(`Open link in a new tab to test?\n\n${element.link}`);
      if (confirmOpen) {
        window.open(element.link, "_blank");
      }
    } else {
      onSelect(element.id);
    }
  };

  if (element.type === "model" && element.url) {
    return (
      <group onClick={click}>
        <Suspense fallback={null}>
          <GlbModel
            url={element.url}
            brightness={element.brightness ?? 1.2}
            animated={element.animated ?? false}
            spin={element.spin ?? false}
            animationSpeed={element.animationSpeed ?? 1}
          />
        </Suspense>
      </group>
    );
  }

  if (element.type === "image" && element.url) {
    const [w, h] = flatPlaneSize(element.aspect, FLAT_BASE.image);
    const placeholder = <ImagePlaceholder w={w} h={h} />;
    return (
      <group onClick={click}>
        {/* A broken image (bad URL / load failure) falls back to a neutral plane
            instead of throwing and blanking the whole canvas — same safety net as
            video. */}
        <MediaErrorBoundary key={element.url} fallback={placeholder}>
          <Suspense fallback={placeholder}>
            <ImagePlane url={element.url} aspect={element.aspect} />
          </Suspense>
        </MediaErrorBoundary>
      </group>
    );
  }

  if (element.type === "text") {
    return (
      <group onClick={click}>
        <Text
          fontSize={0.12}
          anchorX="center"
          anchorY="middle"
          maxWidth={1.4}
          outlineWidth={0.004}
          outlineColor="#ffffff"
        >
          {element.text || "Text"}
          {/* Double-sided so the text is still readable when the card is viewed
              from behind in AR — matches the viewer's side:double a-text. */}
          <meshBasicMaterial side={THREE.DoubleSide} color={element.color || "#18181b"} toneMapped={false} />
        </Text>
      </group>
    );
  }

  if (element.type === "social") {
    const p = socialPreset(element.platform);
    return (
      <group onClick={click}>
        <RoundedBox args={[0.26, 0.26, 0.03]} radius={0.06} smoothness={5}>
          <meshStandardMaterial color={p?.color || "#0A66C2"} metalness={0.1} roughness={0.5} />
        </RoundedBox>
        <Text position={[0, 0, 0.02]} fontSize={0.07} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={0.22}>
          {p?.label || "Link"}
        </Text>
      </group>
    );
  }

  // Audio has no inherent geometry — show a small speaker chip so it can be
  // selected and placed. In AR this same chip is tappable to mute / unmute.
  if (element.type === "audio") {
    return (
      <group onClick={click}>
        <AudioChip ready={!!element.url} />
      </group>
    );
  }

  // Video: render the REAL clip (aspect-correct, double-sided) so the editor is
  // WYSIWYG with the published AR. Until a URL is pasted — or if a cross-origin
  // mp4 can't be used as a texture — fall back to the labelled placeholder.
  if (element.type === "video") {
    const [w, h] = flatPlaneSize(element.aspect, FLAT_BASE.video);
    const placeholder = <VideoPlaceholder w={w} h={h} />;
    return (
      <group onClick={click}>
        {element.url ? (
          <MediaErrorBoundary key={element.url} fallback={placeholder}>
            <Suspense fallback={placeholder}>
              <VideoPlane url={element.url} w={w} h={h} rate={element.playbackRate} />
            </Suspense>
          </MediaErrorBoundary>
        ) : (
          placeholder
        )}
      </group>
    );
  }

  return null;
}

// A flat image plane: the texture's true aspect (no square crop) and double-sided
// so it's visible from behind the card — the published a-image now matches.
function ImagePlane({ url, aspect }: { url: string; aspect?: number }) {
  const tex = useTexture(url);
  const [w, h] = flatPlaneSize(aspect, FLAT_BASE.image);
  return (
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} side={THREE.DoubleSide} transparent toneMapped={false} />
    </mesh>
  );
}

// A flat video plane playing the mp4 as a live texture (muted/looped, same as the
// AR viewer). Suspends while the metadata loads; a bad/cross-origin URL throws,
// which MediaErrorBoundary turns back into the placeholder.
function VideoPlane({ url, w, h, rate }: { url: string; w: number; h: number; rate?: number }) {
  const tex = useVideoTexture(url, { muted: true, loop: true, start: true, playsInline: true, crossOrigin: "anonymous" });
  // Mirror the AR clip's playback speed so the editor preview matches what plays.
  // (Sound stays muted in the editor — preview only, no surprise audio.)
  useEffect(() => {
    const v = tex.image as HTMLVideoElement | undefined;
    if (v) v.playbackRate = Number(rate) > 0 ? Number(rate) : 1;
  }, [tex, rate]);
  return (
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}

// A speaker "chip" standing in for an audio element (no geometry of its own). A
// rounded dark tile with a simple speaker glyph drawn from meshes — mirrors the
// tappable mute control the AR viewer shows.
function AudioChip({ ready }: { ready: boolean }) {
  return (
    <group>
      <RoundedBox args={[0.24, 0.24, 0.03]} radius={0.05} smoothness={4}>
        <meshStandardMaterial color={ready ? "#F59E0B" : "#6B7280"} metalness={0.1} roughness={0.5} />
      </RoundedBox>
      {/* Speaker body + cone */}
      <mesh position={[-0.03, 0, 0.02]}>
        <boxGeometry args={[0.05, 0.06, 0.01]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.005, 0, 0.02]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.06, 0.08, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <Text position={[0, -0.085, 0.02]} fontSize={0.035} color="#ffffff" anchorX="center" anchorY="middle">
        {ready ? "AUDIO" : "no file"}
      </Text>
    </group>
  );
}

// Neutral stand-in for an image that hasn't loaded yet or failed to load, sized
// to the element's aspect so the layout doesn't jump.
function ImagePlaceholder({ w, h }: { w: number; h: number }) {
  return (
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial color="#d4d0c8" side={THREE.DoubleSide} />
    </mesh>
  );
}

function VideoPlaceholder({ w, h }: { w: number; h: number }) {
  return (
    <group>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#0D0F14" side={THREE.DoubleSide} />
      </mesh>
      <Text position={[0, 0, 0.01]} fontSize={Math.min(w, h) * 0.22} color="#9ca3af" anchorX="center" anchorY="middle">
        video
      </Text>
    </group>
  );
}

// Catches the texture-load error a cross-origin / unreachable video throws during
// render, so one bad clip shows the placeholder instead of blanking the canvas.
class MediaErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function GlbModel({
  url,
  brightness = 1.2,
  animated = false,
  spin = false,
  animationSpeed = 1,
}: {
  url: string;
  brightness?: number;
  animated?: boolean;
  spin?: boolean;
  animationSpeed?: number;
}) {
  const { scene, animations } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  // Use SkeletonUtils.clone() — it preserves bone/skeleton bindings that skinned
  // meshes (animated avatars, characters, creatures) depend on. The naive
  // scene.clone() severs these references, causing animated models to render as
  // distorted blobs or disappear entirely. Also cache original material colors
  // for the brightness multiplier.
  const { clone, originalColors } = useMemo(() => {
    const cloned = cloneSkeleton(scene) as THREE.Group;
    const origColors = new Map<THREE.Material, THREE.Color>();

    cloned.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

          const clonedMaterials = materials.map((mat) => {
            const mClone = mat.clone();
            if ("color" in mClone && (mClone as any).color instanceof THREE.Color) {
              origColors.set(mClone, (mClone as any).color.clone());
            }
            return mClone;
          });

          mesh.material = Array.isArray(mesh.material) ? clonedMaterials : clonedMaterials[0];
        }
      }
    });

    return { clone: cloned, originalColors: origColors };
  }, [scene]);

  // drei's useAnimations wires up an AnimationMixer on the clone and returns
  // named actions for every clip in the .glb. The ref ties the mixer's root to
  // our cloned scene so bones resolve correctly.
  const { actions } = useAnimations(animations, groupRef);

  // Play/stop all animation clips when the `animated` toggle changes.
  useEffect(() => {
    if (!actions) return;
    const clipActions = Object.values(actions).filter(Boolean) as THREE.AnimationAction[];
    if (animated) {
      clipActions.forEach((action) => {
        action.reset().setLoop(THREE.LoopRepeat, Infinity).play();
        action.timeScale = animationSpeed;
      });
    } else {
      clipActions.forEach((action) => action.stop());
    }
    return () => {
      clipActions.forEach((action) => action.stop());
    };
  }, [actions, animated, animationSpeed]);

  // Apply model-specific brightness factor (scaled relative to A-Frame default 1.2)
  useEffect(() => {
    originalColors.forEach((origColor, mat) => {
      const factor = brightness / 1.2;
      if ("color" in mat && (mat as any).color instanceof THREE.Color) {
        (mat as any).color.copy(origColor).multiplyScalar(factor);
      }
    });
  }, [originalColors, brightness]);

  // Continuous Y-axis spin when the `spin` toggle is on.
  useFrame((_, delta) => {
    if (spin && groupRef.current) {
      groupRef.current.rotation.y += delta * 1.5 * animationSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={clone} />
    </group>
  );
}
