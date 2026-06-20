"use client";

import { Suspense, useRef } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import {
  Image as DreiImage,
  OrbitControls,
  RoundedBox,
  Text,
  TransformControls,
  useGLTF,
} from "@react-three/drei";
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
    <Canvas camera={{ position: [0, 1.25, 1.8], fov: 42 }} dpr={[1, 2]} shadows>
      <color attach="background" args={["#f1f0ee"]} />
      <ambientLight intensity={0.95} />
      <hemisphereLight intensity={0.6} color="#ffffff" groundColor="#bdb8b0" />
      <directionalLight position={[3, 5, 4]} intensity={1.2} castShadow />
      <directionalLight position={[-4, 2, -3]} intensity={0.4} />

      {/* Ground: the card lies flat here like a marker on a table, content
          rises above it — matching how MindAR anchors content on the printed
          card in real AR. */}
      <gridHelper args={[6, 30, "#cfcbc3", "#e3e1dd"]} position={[0, -0.012, 0]} />

      <group rotation={[-Math.PI / 2, 0, 0]}>
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
      </group>

      <OrbitControls
        makeDefault
        enablePan={false}
        target={[0, 0.12, 0]}
        minDistance={0.7}
        maxDistance={6}
        maxPolarAngle={Math.PI / 2.05}
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
  const H = 0.58;
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
          <GlbModel url={element.url} />
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

function GlbModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  // Raw model (no auto-fit/center) so its size/origin match the A-Frame viewer.
  return <primitive object={scene.clone()} />;
}
