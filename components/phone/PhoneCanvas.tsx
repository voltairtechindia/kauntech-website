"use client";

import { Suspense, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Environment, Lightformer, useGLTF } from "@react-three/drei";
import { PHONE_SCREENS } from "./Screens";
import { FLIGHT_START, FLIGHT_END } from "./flight";

/**
 * The 3D phone — a real iPhone 16 model (public/models/iphone16.glb, prepared
 * by scripts/optimize-iphone.mjs) whose display is a LIVE DOM composition
 * (drei <Html transform>), so the app screens on it genuinely animate.
 *
 * Model facts (from the optimizer): body spans x ±3.592, y ±7.369, z ±0.39;
 * the display is the node named "Screen" — a flat rounded plane at z=0.39
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
  /** 0→1 as the story unpins — the phone rides up and away with the stage */
  exit: number;
  pointer: { x: number; y: number };
};

const MODEL_URL = "/models/iphone16.glb";
const PHONE_H = 2.46; // target world height

/** Rest poses: x/y in viewport-width/height fractions from center, rotations in rad. */
const POSES = [
  { x: 0.21, y: -0.01, rotY: -0.3, rotZ: -0.05 }, // hero — right side, angled to copy
  { x: -0.23, y: 0.0, rotY: 0.28, rotZ: 0.04 }, // 1 scan — left
  { x: 0.23, y: 0.0, rotY: -0.28, rotZ: -0.04 }, // 2 intel — right
  { x: -0.23, y: 0.0, rotY: 0.28, rotZ: 0.05 }, // 3 leads — left
  { x: 0.23, y: 0.0, rotY: -0.28, rotZ: -0.05 }, // 4 route — right
  { x: -0.23, y: 0.0, rotY: 0.28, rotZ: 0.04 }, // 5 plan — left
];

const smooth = (t: number) => t * t * (3 - 2 * t);

type PhoneModel = {
  object: THREE.Group;
  /** model-local scale that makes the body PHONE_H world units tall */
  scale: number;
  /** Screen-plane center in model-local space */
  screenCenter: THREE.Vector3;
  /** Screen-plane size in model-local units */
  screenSize: THREE.Vector3;
};

/**
 * The Sketchfab model ships in the teal colorway. Recolor every teal-family
 * material to graphite titanium (hue-free, keep luminance) and fix the screen:
 * its material has emissive 1/1/1, which would glow white — turn it into
 * powered-off glass instead. We also MEASURE the display ("Screen" node) and
 * body bounding boxes rather than trusting authored transforms — the baked
 * Sketchfab hierarchy is not origin-centered.
 */
function useKauntechPhone(): PhoneModel {
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
    // so the rig's rotations pivot through the phone — then measure the display
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
  const intro = useRef(0);
  const booted = useRef(false);
  const phone = useKauntechPhone();

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;

    const viewport = state.viewport.getCurrentViewport(state.camera, new THREE.Vector3(0, 0, 0));
    const { pos, pointer, exit } = sceneState.current;
    // mid-story (re)mount — e.g. scrolling back up into the story after the
    // canvas was killed: skip the hero intro and snap straight to the pose
    const midMount = !booted.current && pos > 0.5;
    booted.current = true;
    if (midMount) intro.current = 1;

    const i = Math.min(Math.floor(pos), POSES.length - 2);
    // dwell on the pose while the chapter is read, then fly across during the
    // text-swap gap — windows shared with the GSAP timeline via flight.ts
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

    const targetX = THREE.MathUtils.lerp(a.x, b.x, frac) * viewport.width;
    const targetY =
      THREE.MathUtils.lerp(a.y, b.y, frac) * viewport.height +
      Math.sin(t * 1.3) * 0.05 + // idle float
      (1 - inE) * -0.7 + // intro rise
      exit * viewport.height * 1.1; // story exit — ride up with the unpinning stage
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
    // would otherwise show it mirrored through the back of the phone)
    if (screenDom.current) {
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(g.quaternion);
      const toCam = state.camera.position.clone().sub(g.position).normalize();
      screenDom.current.style.visibility = fwd.dot(toCam) > 0.14 ? "visible" : "hidden";
    }
  });

  const { Screen } = PHONE_SCREENS[chapter] ?? PHONE_SCREENS[0];

  // rig-local (≈world) units — Html lives directly in the rig group, exactly
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

export default function PhoneCanvas({
  sceneState,
  chapter,
}: {
  sceneState: MutableRefObject<PhoneSceneState>;
  chapter: number;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 35 }}
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
          {/* studio: white top, warm ember key, cool steel fill — titanium loves contrast */}
          <Lightformer intensity={2.4} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[9, 5, 1]} color="#ffffff" />
          <Lightformer intensity={2.6} position={[5, 1, 2]} rotation-y={-Math.PI / 2} scale={[4, 9, 1]} color="#f97316" />
          <Lightformer intensity={1.6} position={[-5, -1, 2]} rotation-y={Math.PI / 2} scale={[4, 9, 1]} color="#b7c4d4" />
          <Lightformer intensity={1.2} position={[0, -5, 1]} rotation-x={-Math.PI / 2} scale={[8, 4, 1]} color="#fde8d2" />
        </Environment>

        <PhoneRig sceneState={sceneState} chapter={chapter} />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(MODEL_URL);
