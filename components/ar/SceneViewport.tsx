"use client";

import { Suspense, useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Image as DreiImage,
  Lightformer,
  OrbitControls,
  RoundedBox,
  Text,
  TransformControls,
  useGLTF,
  useAnimations,
} from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { ArElement } from "@/lib/ar/scene";
import { socialPreset } from "@/lib/ar/scene";

export type TransformMode = "translate" | "rotate" | "scale";

interface Props {
  elements: ArElement[];
  selectedId: string | null;
  mode: TransformMode;
  referenceImageUrl?: string | null;
  cardColor?: string | null;
  onSelect: (id: string | null) => void;
  onTransform: (
    id: string,
    t: { position: [number, number, number]; rotationX: number; rotationY: number; rotationZ: number; scale: number },
  ) => void;
}

/**
 * The composer canvas. The card sits in the XY plane (z=0) and elements float
 * out toward the viewer (+z) — the SAME convention the WebAR viewer uses on the
 * image-target anchor, so what you arrange here is what shows on the card.
 */
export default function SceneViewport({
  elements,
  selectedId,
  mode,
  referenceImageUrl,
  cardColor,
  onSelect,
  onTransform,
}: Props) {
  return (
    <Canvas camera={{ position: [0, 0.12, 2.05], fov: 40 }} dpr={[1, 2]} shadows>
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

      {/* WYSIWYG: the card FACES the camera — exactly what you see when you point
          your phone at the printed card — and content pops toward you out of the
          card face (+z). This replaces the old top-down "diorama" view, which made
          the editor look nothing like the AR result. The stored element coords are
          card-relative and unchanged, so the published viewer is unaffected; only
          this preview's framing changed. The grid is CO-PLANAR with the card (same
          z plane, just behind its back face) so it reads as the card's own surface.
          Kept SMALL (~1.5 card-widths) and faint so its EDGES are visible — you see
          a card-sized pad turn, not a world-filling floor tilting as one giant slab
          (that "the whole thing moves" vertigo came from the old 6-unit grid that
          covered the whole viewport). */}
      <gridHelper
        args={[1.5, 6, "#cfccc5", "#e4e1dc"]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, -0.011]}
      />

      {/* The card (tracking target) */}
      <CardBase referenceImageUrl={referenceImageUrl} cardColor={cardColor} onSelect={onSelect} />

      <Suspense fallback={null}>
        {elements.map((el) =>
          el.hidden ? null : el.id === selectedId ? (
            <SelectedElement key={el.id} element={el} mode={mode} onTransform={onTransform} onSelect={onSelect} />
          ) : (
            <ElementNode key={el.id} element={el} onSelect={onSelect} />
          ),
        )}
      </Suspense>

      {/* Calm, anchored orbit. enableDamping = smooth inertial motion (kills the
          jerky "trippy" feel of raw 1:1 dragging). rotate/zoom slowed a touch so a
          small drag doesn't whip the view around. Polar angle clamped well away from
          the poles so you can't orbit under/over the card and flip it edge-on
          (the most disorienting motion). maxDistance pulled in so you can't zoom out
          until the card is a tiny speck. */}
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.12}
        rotateSpeed={0.65}
        zoomSpeed={0.7}
        target={[0, 0.1, 0]}
        minDistance={0.9}
        maxDistance={4}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.8}
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

function SelectedElement({
  element,
  mode,
  onTransform,
  onSelect,
}: {
  element: ArElement;
  mode: TransformMode;
  onTransform: Props["onTransform"];
  onSelect: Props["onSelect"];
}) {
  const ref = useRef<THREE.Group>(null);
  return (
    <TransformControls
      mode={mode}
      onObjectChange={() => {
        const o = ref.current;
        if (!o) return;
        onTransform(element.id, {
          position: [o.position.x, o.position.y, o.position.z],
          rotationX: o.rotation.x,
          rotationY: o.rotation.y,
          rotationZ: o.rotation.z,
          // The group is scaled by baseScale*scale; store back only the multiplier.
          scale: o.scale.x / (element.baseScale ?? 1),
        });
      }}
    >
      <group
        ref={ref}
        position={element.position}
        rotation={[element.rotationX ?? 0, element.rotationY, element.rotationZ ?? 0]}
        scale={(element.baseScale ?? 1) * element.scale}
      >
        <ElementBody element={element} onSelect={onSelect} selected />
      </group>
    </TransformControls>
  );
}

function ElementNode({ element, onSelect }: { element: ArElement; onSelect: Props["onSelect"] }) {
  return (
    <group position={element.position} rotation={[element.rotationX ?? 0, element.rotationY, element.rotationZ ?? 0]} scale={(element.baseScale ?? 1) * element.scale}>
      <ElementBody element={element} onSelect={onSelect} />
    </group>
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
    onSelect(element.id);
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
          />
        </Suspense>
        {selected ? <SelectRing /> : null}
      </group>
    );
  }

  if (element.type === "image" && element.url) {
    return (
      <group onClick={click}>
        <Suspense fallback={null}>
          <DreiImage url={element.url} transparent scale={0.3 as unknown as number} />
        </Suspense>
        {selected ? <SelectRing /> : null}
      </group>
    );
  }

  if (element.type === "text") {
    return (
      <group onClick={click}>
        <Text
          fontSize={0.12}
          color={element.color || "#18181b"}
          anchorX="center"
          anchorY="middle"
          maxWidth={1.4}
          outlineWidth={0.004}
          outlineColor="#ffffff"
        >
          {element.text || "Text"}
        </Text>
        {selected ? <SelectRing /> : null}
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
        {selected ? <SelectRing /> : null}
      </group>
    );
  }

  // video placeholder
  return (
    <group onClick={click}>
      <mesh>
        <planeGeometry args={[0.5, 0.3]} />
        <meshStandardMaterial color="#0D0F14" />
      </mesh>
      <Text position={[0, 0, 0.01]} fontSize={0.05} color="#9ca3af" anchorX="center" anchorY="middle">
        video
      </Text>
      {selected ? <SelectRing /> : null}
    </group>
  );
}

function SelectRing() {
  return (
    <mesh position={[0, 0, -0.02]}>
      <ringGeometry args={[0.3, 0.33, 32]} />
      <meshBasicMaterial color="#F59E0B" />
    </mesh>
  );
}

function GlbModel({
  url,
  brightness = 1.2,
  animated = false,
  spin = false,
}: {
  url: string;
  brightness?: number;
  animated?: boolean;
  spin?: boolean;
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
      });
    } else {
      clipActions.forEach((action) => action.stop());
    }
    return () => {
      clipActions.forEach((action) => action.stop());
    };
  }, [actions, animated]);

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
      groupRef.current.rotation.y += delta * 1.5;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={clone} />
    </group>
  );
}
