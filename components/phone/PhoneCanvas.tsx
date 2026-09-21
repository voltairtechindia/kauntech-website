"use client";

import { Suspense, useCallback, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Environment, Lightformer, PerformanceMonitor, useGLTF } from "@react-three/drei";
import { PHONE_SCREENS } from "./Screens";
import { FLIGHT_START, FLIGHT_END } from "./flight";

/**
 * The 3D phone - a real iPhone 16 model (public/models/iphone16.glb, prepared
 * by scripts/optimize-iphone.mjs) whose display is a LIVE DOM composition
 * (drei <Html transform>), so the app screens on it genuinely animate.
 *
 * Model facts (from the optimizer): body spans x ±3.592, y ±7.369, z ±0.39;
 * the display is the node named "Screen" - a flat rounded plane at z=0.39
 * spanning x ±3.263, y ±7.042. We keep that mesh as powered-off glass (it
 * shows through during edge-on flips) and float the DOM screen just above it.
 * drei Html `transform` scale ratio is distanceFactor/400, so in the model's
 * LOCAL units distanceFactor = SCREEN_W_LOCAL * 400 / 390 maps our 390px DOM
 * exactly onto the glass. The whole model is wrapped in a group scaled so the
 * phone is ~2.46 world units tall (what the old procedural phone measured).
 *
 * The phone's pose is driven by `sceneState.pos` (0 = hero … 5 = last story
 * chapter): it glides across the viewport between chapters and does an
 * edge-on flip mid-transition, which is exactly when the screen swaps.
 */

export type PhoneSceneState = {
  pos: number;
  /** 0→1 as the story unpins - the phone rides up and away with the stage */
  exit: number;
  pointer: { x: number; y: number };
};

const MODEL_URL = "/models/iphone16.glb";
const PHONE_H = 2.46; // target world height

/**
 * Modest hardware (4 cores or less / 4 GB or less of reported RAM - most
 * office laptops and older integrated GPUs) starts at device pixel ratio 1
 * with MSAA off. Everything else starts crisp; PerformanceMonitor below then
 * trims the ratio further on any machine that can't hold the frame rate.
 * Read once, lazily - this module only ever loads in the browser.
 */
let modestDevice: boolean | null = null;
const isModestDevice = () => {
  if (modestDevice === null) {
    const nav = navigator as Navigator & { deviceMemory?: number };
    modestDevice = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
  }
  return modestDevice;
};

/* Frame-loop scratch objects - the rig runs 60x a second, so it allocates nothing. */
const _fwd = new THREE.Vector3();
const _toCam = new THREE.Vector3();
const FORWARD = new THREE.Vector3(0, 0, 1);

/** Rest poses: x/y in viewport-width/height fractions from center, rotations in rad. */
const POSES = [
  { x: 0.21, y: -0.01, rotY: -0.3, rotZ: -0.05 }, // hero - right side, angled to copy
  { x: -0.23, y: 0.0, rotY: 0.28, rotZ: 0.04 }, // 1 scan - left
  { x: 0.23, y: 0.0, rotY: -0.28, rotZ: -0.04 }, // 2 sync - right
  { x: -0.23, y: 0.0, rotY: 0.28, rotZ: 0.05 }, // 3 intel - left
  { x: 0.23, y: 0.0, rotY: -0.28, rotZ: -0.05 }, // 4 strategy - right
  { x: -0.23, y: 0.0, rotY: 0.28, rotZ: 0.04 }, // 5 ar - left
];

const smooth = (t: number) => t * t * (3 - 2 * t);

export type PhoneModel = {
  object: THREE.Group;
  /** model-local scale that makes the body PHONE_H world units tall */
  scale: number;
  /** Screen-plane center in model-local space */
  screenCenter: THREE.Vector3;
  /** Screen-plane size in model-local units */
  screenSize: THREE.Vector3;
};

/**
 * The Sketchfab model ships in the teal colorway. `scripts/optimize-iphone.mjs`
 * now bakes the graphite-titanium recolor and the powered-off glass into the
 * GLB, so the pass below is a no-op safety net for any model that hasn't been
 * through the optimizer (graphite fails the teal test, so re-running is free).
 * We still MEASURE the display ("Screen" node) and body bounding boxes rather
 * than trusting authored transforms - the baked Sketchfab hierarchy is not
 * origin-centered.
 */
export function useKauntechPhone(): PhoneModel {
  const { scene } = useGLTF(MODEL_URL, false);

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

        // teal-family detection: green & blue clearly above red
        const { r, g, b } = mat.color;
        if (g > r * 1.3 && b > r * 1.3) {
          const lum = 0.3 * r + 0.5 * g + 0.2 * b;
          const v = THREE.MathUtils.clamp(lum * 0.62, 0.02, 0.75);
          mat.color.setRGB(v, v, v * 1.06); // graphite with a cool cast
          mat.envMapIntensity = 1.35;
        }
        if (mat.emissive && (mat.emissive.r > 0.5 || mat.emissive.g > 0.5)) {
          mat.emissive.set("#000000");
        }
      }
    });

    // recenter the body on the origin (the baked Sketchfab hierarchy isn't),
    // so the rig's rotations pivot through the phone - then measure the display
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
    screenCenter.z = screenBox.max.z; // sit on the glass, not inside it

    // Nothing inside the phone ever moves on its own - only the rig group that
    // holds it does. Freeze the 41 child matrices so three stops recomputing
    // them every frame (they're already baked into world space above).
    cloned.traverse((obj) => {
      obj.matrixAutoUpdate = false;
      obj.updateMatrix();
    });

    return { object: cloned, scale, screenCenter, screenSize };
  }, [scene]);
}

function PhoneRig({
  sceneState,
  chapter,
}: {
  sceneState: MutableRefObject<PhoneSceneState>;
  chapter: number;
}) {
  const group = useRef<THREE.Group>(null);
  const screenDom = useRef<HTMLDivElement>(null);
  const screenFacing = useRef(true);
  const intro = useRef(0);
  const booted = useRef(false);
  const phone = useKauntechPhone();

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;

    // state.viewport is already the viewport at the origin for this camera -
    // reading it avoids recomputing (and allocating) one every frame.
    const viewport = state.viewport;
    const { pos, pointer, exit } = sceneState.current;
    // mid-story (re)mount - e.g. scrolling back up into the story after the
    // canvas was killed: skip the hero intro and snap straight to the pose
    const midMount = !booted.current && pos > 0.5;
    booted.current = true;
    if (midMount) intro.current = 1;

    const i = Math.min(Math.floor(pos), POSES.length - 2);
    // dwell on the pose while the chapter is read, then fly across during the
    // text-swap gap - windows shared with the GSAP timeline via flight.ts
    const frac = smooth(
      THREE.MathUtils.clamp(
        (THREE.MathUtils.clamp(pos - i, 0, 1) - FLIGHT_START) / (FLIGHT_END - FLIGHT_START),
        0,
        1,
      ),
    );
    const a = POSES[i];
    const b = POSES[Math.min(i + 1, POSES.length - 1)];

    // mid-transition flourish: arc toward the camera + edge-on flip
    const arc = Math.sin(frac * Math.PI);
    const flipDir = a.x > b.x ? 1 : -1;

    const t = state.clock.elapsedTime;
    intro.current = Math.min(1, intro.current + delta / 1.3);
    const inE = smooth(intro.current);

    // Cap the x-basis near a 16:9 frame (9 world units at this camera): on
    // ultrawide / short browser windows raw vw would drift the rest poses far
    // from the center-anchored chapter copy (v2.css .k-chapter).
    const xBasis = Math.min(viewport.width, 9);
    const targetX = THREE.MathUtils.lerp(a.x, b.x, frac) * xBasis;
    const targetY =
      THREE.MathUtils.lerp(a.y, b.y, frac) * viewport.height +
      Math.sin(t * 1.3) * 0.05 + // idle float
      (1 - inE) * -0.7 + // intro rise
      exit * viewport.height * 1.1; // story exit - ride up with the unpinning stage
    const targetZ = arc * 0.55;
    const targetRotY =
      THREE.MathUtils.lerp(a.rotY, b.rotY, frac) +
      arc * 1.35 * flipDir +
      pointer.x * 0.09;
    const targetRotZ =
      THREE.MathUtils.lerp(a.rotZ, b.rotZ, frac) + Math.sin(t * 0.8) * 0.013;
    const targetRotX = Math.sin(t * 1.05) * 0.012 - pointer.y * 0.06;

    if (midMount) {
      g.position.set(targetX, targetY, targetZ);
      g.rotation.set(targetRotX, targetRotY, targetRotZ);
    }

    const d = 4.2; // damping speed
    g.position.x = THREE.MathUtils.damp(g.position.x, targetX, d, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, targetY, d, delta);
    g.position.z = THREE.MathUtils.damp(g.position.z, targetZ, d, delta);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetRotY, d, delta);
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, targetRotZ, d, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetRotX, d, delta);
    const s = (0.84 + 0.16 * inE) * 1.28;
    g.scale.setScalar(s);

    // hide the DOM screen when the glass faces away from the camera (drei Html
    // would otherwise show it mirrored through the back of the phone). Toggling
    // a class instead of an inline style lets CSS also park the screen's own
    // keyframes while it's invisible - and we only touch the DOM on a change.
    if (screenDom.current) {
      _fwd.copy(FORWARD).applyQuaternion(g.quaternion);
      _toCam.copy(state.camera.position).sub(g.position).normalize();
      const facing = _fwd.dot(_toCam) > 0.14;
      if (facing !== screenFacing.current) {
        screenFacing.current = facing;
        screenDom.current.classList.toggle("is-away", !facing);
      }
    }
  });

  const { Screen } = PHONE_SCREENS[chapter] ?? PHONE_SCREENS[0];

  // rig-local (≈world) units - Html lives directly in the rig group, exactly
  // like the proven procedural-phone setup, so drei's transform math is 1:1
  const screenW = phone.screenSize.x * phone.scale;
  const sc = phone.screenCenter;

  return (
    <group ref={group}>
      <group scale={phone.scale}>
        <primitive object={phone.object} />
      </group>

      {/* the living display, mapped onto the measured glass bounds */}
      <Html
        transform
        distanceFactor={(screenW * 400) / 390}
        position={[sc.x * phone.scale, sc.y * phone.scale, sc.z * phone.scale + 0.006]}
        zIndexRange={[30, 10]}
        style={{ pointerEvents: "none" }}
      >
        <div ref={screenDom} className="k-3d-screen">
          <div className="k-screen-mount" key={chapter}>
            <Screen />
          </div>
          <span className="k-cssphone-glare" />
        </div>
      </Html>
    </group>
  );
}

/**
 * Fires once the phone has actually been drawn, so the hero's CSS stand-in can
 * hold its place until then instead of leaving a hole while the model loads.
 */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    onReady();
  });
  return null;
}

export default function PhoneCanvas({
  sceneState,
  chapter,
  onReady,
}: {
  sceneState: MutableRefObject<PhoneSceneState>;
  chapter: number;
  onReady?: () => void;
}) {
  // Start modest hardware at 1x with no MSAA; PerformanceMonitor then trims the
  // ratio on anything that drops frames, whatever it reported about itself.
  // The trim is deliberately sticky (drei stops monitoring after `flipflops`
  // direction changes) - a machine that couldn't hold the frame rate stays at
  // 1x for the page view rather than oscillating between sharp and smooth.
  const modest = isModestDevice();
  const [dpr, setDpr] = useState(modest ? 1 : 1.75);
  const onDecline = useCallback(() => setDpr((d) => Math.max(1, +(d - 0.25).toFixed(2))), []);
  const onIncline = useCallback(
    () => setDpr((d) => (modest ? d : Math.min(1.75, +(d + 0.25).toFixed(2)))),
    [modest],
  );

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 35 }}
      dpr={dpr}
      gl={{ antialias: !modest, alpha: true, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      <PerformanceMonitor
        ms={250}
        iterations={5}
        flipflops={3}
        onDecline={onDecline}
        onIncline={onIncline}
        onFallback={() => setDpr(1)}
      />
      <Suspense fallback={null}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 6, 6]} intensity={1.15} />
        <directionalLight position={[-5, -2, 4]} intensity={0.4} color="#ffd9b0" />

        <Environment resolution={64} frames={1}>
          {/* studio: white top, warm ember key, cool steel fill - titanium loves contrast */}
          <Lightformer intensity={2.4} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[9, 5, 1]} color="#ffffff" />
          <Lightformer intensity={2.6} position={[5, 1, 2]} rotation-y={-Math.PI / 2} scale={[4, 9, 1]} color="#f97316" />
          <Lightformer intensity={1.6} position={[-5, -1, 2]} rotation-y={Math.PI / 2} scale={[4, 9, 1]} color="#b7c4d4" />
          <Lightformer intensity={1.2} position={[0, -5, 1]} rotation-x={-Math.PI / 2} scale={[8, 4, 1]} color="#fde8d2" />
        </Environment>

        <PhoneRig sceneState={sceneState} chapter={chapter} />
        {onReady && <ReadySignal onReady={onReady} />}
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(MODEL_URL, false);
