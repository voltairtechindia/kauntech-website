"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Float,
  Html,
  Lightformer,
  RoundedBox,
  Sparkles,
  useGLTF,
} from "@react-three/drei";

/**
 * Decorative 3D showcase for the AR studio: the site's iPhone 16 GLB "scanning"
 * an ivory KaunTech card while example AR content — a gold 3D model, tappable
 * link chips, a text label — floats above it. What the phone's screen shows is
 * the same composition through a viewfinder, so the value prop reads at a
 * glance: scan the printed card, see it come alive.
 *
 * Design constraints honoured here:
 *  • No drei <Text>/troika — CSP is font-src 'self', so every label is a real
 *    DOM node via <Html transform> (inherits the site fonts + ar.css tokens).
 *  • The phone loader mirrors components/phone/PhoneCanvas.tsx (same GLB, same
 *    graphite recolor + screen-glass fix + measure) but is deliberately a copy
 *    so the home-page rig stays untouched.
 *  • Purely decorative: pointer-events none end-to-end, aria-hidden, parallax
 *    reads window pointermove, and prefers-reduced-motion freezes the idle sway.
 */

const MODEL_URL = "/models/iphone16.glb";
const PHONE_H = 2.46; // world height the home rig standardised on

type PhoneModel = {
  object: THREE.Group;
  scale: number;
  screenCenter: THREE.Vector3;
  screenSize: THREE.Vector3;
};

/** Same prep as PhoneCanvas' useKauntechPhone: recolor the Sketchfab teal to
 *  graphite titanium, turn the emissive display into powered-off glass, then
 *  recenter + measure the body and the "Screen" node. */
function useShowcasePhone(): PhoneModel {
  const { scene } = useGLTF(MODEL_URL);

  return useMemo(() => {
    const cloned = scene.clone(true);
    const seen = new Set<THREE.Material>();

    cloned.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.castShadow = false;
      obj.receiveShadow = false;

      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (!(mat instanceof THREE.MeshStandardMaterial) || seen.has(mat)) continue;
        seen.add(mat);

        if (obj.name === "Screen") {
          mat.color.set("#060607");
          mat.emissive.set("#000000");
          mat.metalness = 0.4;
          mat.roughness = 0.12;
          mat.envMapIntensity = 1.2;
          continue;
        }

        const { r, g, b } = mat.color;
        if (g > r * 1.3 && b > r * 1.3) {
          const lum = 0.3 * r + 0.5 * g + 0.2 * b;
          const v = THREE.MathUtils.clamp(lum * 0.62, 0.02, 0.75);
          mat.color.setRGB(v, v, v * 1.06);
          mat.envMapIntensity = 1.35;
        }
        if (mat.emissive && (mat.emissive.r > 0.5 || mat.emissive.g > 0.5)) {
          mat.emissive.set("#000000");
        }
      }
    });

    cloned.updateMatrixWorld(true);
    const bodyBox = new THREE.Box3().setFromObject(cloned);
    const bodySize = bodyBox.getSize(new THREE.Vector3());
    const scale = PHONE_H / bodySize.y;
    cloned.position.sub(bodyBox.getCenter(new THREE.Vector3()));
    cloned.updateMatrixWorld(true);

    const screenObj = cloned.getObjectByName("Screen");
    const screenBox = screenObj ? new THREE.Box3().setFromObject(screenObj) : bodyBox;
    const screenCenter = screenBox.getCenter(new THREE.Vector3());
    const screenSize = screenBox.getSize(new THREE.Vector3());
    screenCenter.z = screenBox.max.z;

    return { object: cloned, scale, screenCenter, screenSize };
  }, [scene]);
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** A floating DOM chip anchored in 3D. Content is real DOM so it uses the site
 *  fonts; sized so `px * (distanceFactor/400)` lands at a chip ~0.5 world wide. */
function Chip({
  position,
  children,
  df = 1.5,
}: {
  position: [number, number, number];
  children: React.ReactNode;
  df?: number;
}) {
  return (
    <Html
      transform
      position={position}
      distanceFactor={df}
      zIndexRange={[40, 31]}
      style={{ pointerEvents: "none" }}
    >
      {children}
    </Html>
  );
}

/** The ivory business card + the AR content hovering above it (card-local
 *  space: the card face is XY, "above the card" is +Z). */
function CardScene({ frozen }: { frozen: boolean }) {
  const knot = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!knot.current || frozen) return;
    knot.current.rotation.x += delta * 0.45;
    knot.current.rotation.y += delta * 0.6;
  });

  return (
    <group position={[-1.28, -0.42, 0.35]} rotation={[-0.95, 0.16, 0.07]}>
      {/* gold rim peeking out under the ivory face — the app card's accent border */}
      <RoundedBox args={[2.78, 1.76, 0.03]} radius={0.09} smoothness={3} position={[0, 0, -0.028]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.75} roughness={0.32} />
      </RoundedBox>
      <RoundedBox args={[2.7, 1.68, 0.045]} radius={0.08} smoothness={3}>
        <meshStandardMaterial color="#fffdf9" metalness={0.05} roughness={0.55} />
      </RoundedBox>

      {/* printed face — mini identity + QR, real DOM lying on the card */}
      <Html
        transform
        position={[0, 0, 0.032]}
        distanceFactor={(2.44 * 400) / 240}
        zIndexRange={[20, 11]}
        style={{ pointerEvents: "none" }}
      >
        <div className="ar-shot-card">
          <span className="ar-shot-card-id">
            <span className="ar-shot-card-avatar">A</span>
            <span className="ar-shot-card-lines">
              <strong>Aarav Sharma</strong>
              <em>Founder · Voltair Tech</em>
            </span>
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ar-shot-card-qr" src="/assets/vcard-qr.svg" alt="" />
        </div>
      </Html>

      {/* the AR layer — a 3D model, link chips, a caption, and a little magic */}
      <Sparkles count={24} scale={[2.4, 1.5, 1.2]} position={[0, 0, 0.7]} size={2.4} speed={frozen ? 0 : 0.32} color="#fbbf24" opacity={0.55} />

      <Float speed={frozen ? 0 : 1.6} rotationIntensity={0.25} floatIntensity={0.5} floatingRange={[-0.06, 0.06]}>
        <mesh ref={knot} position={[-0.62, 0.28, 0.88]}>
          <torusKnotGeometry args={[0.19, 0.062, 96, 16]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.22} envMapIntensity={1.6} />
        </mesh>
      </Float>

      <Float speed={frozen ? 0 : 1.2} rotationIntensity={0.12} floatIntensity={0.4} floatingRange={[-0.05, 0.05]}>
        <Chip position={[0.78, 0.42, 0.72]}>
          <span className="ar-shot-chip ar-shot-chip-in">in&nbsp;· Connect</span>
        </Chip>
      </Float>
      <Float speed={frozen ? 0 : 1.4} rotationIntensity={0.12} floatIntensity={0.4} floatingRange={[-0.05, 0.05]}>
        <Chip position={[0.55, -0.52, 1.02]}>
          <span className="ar-shot-chip ar-shot-chip-play">▶ Intro video</span>
        </Chip>
      </Float>
      <Float speed={frozen ? 0 : 1.1} rotationIntensity={0.1} floatIntensity={0.35} floatingRange={[-0.04, 0.04]}>
        <Chip position={[-0.5, -0.88, 0.72]}>
          <span className="ar-shot-label">Hi, I&apos;m Aarav 👋</span>
        </Chip>
      </Float>
    </group>
  );
}

/** The phone, held up mid-scan, its screen a live viewfinder of the same card. */
function Phone({ frozen }: { frozen: boolean }) {
  const phone = useShowcasePhone();
  const screenW = phone.screenSize.x * phone.scale;
  const sc = phone.screenCenter;

  return (
    <Float speed={frozen ? 0 : 1.1} rotationIntensity={0.14} floatIntensity={0.35} floatingRange={[-0.05, 0.05]}>
      <group position={[1.62, 0.02, 0.2]} rotation={[0.02, -0.46, 0.04]} scale={0.86}>
        <group scale={phone.scale}>
          <primitive object={phone.object} />
        </group>
        <Html
          transform
          distanceFactor={(screenW * 400) / 390}
          position={[sc.x * phone.scale, sc.y * phone.scale, sc.z * phone.scale + 0.006]}
          zIndexRange={[30, 21]}
          style={{ pointerEvents: "none" }}
        >
          <div className="ar-shot-screen">
            <span className="ar-shot-screen-pill">● AR live</span>
            <span className="ar-shot-screen-stage">
              <span className="ar-shot-screen-brackets" />
              <span className="ar-shot-screen-card">
                <span className="ar-shot-card-avatar">A</span>
                <strong>Aarav Sharma</strong>
              </span>
              <span className="ar-shot-screen-chip ar-shot-chip-in">in</span>
              <span className="ar-shot-screen-chip ar-shot-chip-play">▶</span>
            </span>
            <span className="ar-shot-screen-hint">Point at the card</span>
          </div>
        </Html>
      </group>
    </Float>
  );
}

function Rig({ pointer, frozen, children }: { pointer: React.MutableRefObject<{ x: number; y: number }>; frozen: boolean; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const intro = useRef(0);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;

    // fit: the composition spans ~5.4 world units wide — shrink on narrow boxes
    const vp = state.viewport.getCurrentViewport(state.camera, new THREE.Vector3(0, 0, 0));
    const fit = Math.min(1, vp.width / 5.6);

    intro.current = Math.min(1, intro.current + delta / 1.1);
    const inE = smooth(intro.current);

    const t = state.clock.elapsedTime;
    const sway = frozen ? 0 : Math.sin(t * 0.35) * 0.02;
    const targetRotY = sway + pointer.current.x * 0.07;
    const targetRotX = (frozen ? 0 : Math.sin(t * 0.5) * 0.008) - pointer.current.y * 0.045;

    const d = 3.5;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetRotY, d, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetRotX, d, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, (1 - inE) * -0.5 + 0.08, d, delta);
    g.scale.setScalar(fit * (0.9 + 0.1 * inE));
  });

  return <group ref={group}>{children}</group>;
}

export default function ArShowcase() {
  const pointer = useRef({ x: 0, y: 0 });
  const frozen = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    function onMove(e: PointerEvent) {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0.12, 6.1], fov: 35 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 6, 6]} intensity={1.15} />
        <directionalLight position={[-5, -2, 4]} intensity={0.4} color="#ffd9b0" />

        <Environment resolution={64}>
          <Lightformer intensity={2.4} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[9, 5, 1]} color="#ffffff" />
          <Lightformer intensity={2.6} position={[5, 1, 2]} rotation-y={-Math.PI / 2} scale={[4, 9, 1]} color="#f97316" />
          <Lightformer intensity={1.6} position={[-5, -1, 2]} rotation-y={Math.PI / 2} scale={[4, 9, 1]} color="#b7c4d4" />
          <Lightformer intensity={1.2} position={[0, -5, 1]} rotation-x={-Math.PI / 2} scale={[8, 4, 1]} color="#fde8d2" />
        </Environment>

        <Rig pointer={pointer} frozen={frozen}>
          <CardScene frozen={frozen} />
          <Phone frozen={frozen} />
        </Rig>

        <ContactShadows position={[0, -1.62, 0]} scale={8} blur={2.6} far={3.2} opacity={0.5} />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(MODEL_URL);
