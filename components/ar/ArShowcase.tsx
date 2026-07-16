"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Float,
  Lightformer,
  RoundedBox,
  Sparkles,
  useGLTF,
} from "@react-three/drei";

/**
 * Decorative 3D showcase for the AR studio: the site's iPhone 16 GLB "scanning"
 * an ivory KaunTech card while example AR content — a gold 3D model, tappable
 * link chips, a text label — floats above it. The phone's screen shows the same
 * card through a viewfinder, so the value prop reads at a glance.
 *
 * Implementation notes:
 *  • 100% WebGL — every label (card face, chips, phone screen) is a canvas
 *    texture on a plane, NOT a drei <Html> overlay. DOM-glued-to-mesh overlays
 *    misregistered on some real-world browsers (page zoom, ancestor transforms,
 *    resize timing), which is exactly the mess this replaced. Textures can't
 *    drift, and they occlude correctly behind the phone.
 *  • Canvas text uses the ACTUAL next/font families resolved from the CSS vars
 *    (--font-display / --font-serif / --font-fira-sans) — next/font registers
 *    mangled family names, so hardcoding "Space Grotesk" would miss them. CSP
 *    (font-src 'self') stays happy: no external font fetches.
 *  • The phone loader mirrors components/phone/PhoneCanvas.tsx (same GLB, same
 *    graphite recolor + screen-glass fix + measure) but is deliberately a copy
 *    so the home-page rig stays untouched.
 *  • Purely decorative: pointer-events none, aria-hidden, parallax from window
 *    pointermove, prefers-reduced-motion freezes the idle sway.
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

/* ── Canvas-texture painting ─────────────────────────────────────────────── */

/** Resolve a next/font CSS variable to its real (mangled) family list. */
function famVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

function makeTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Rounded pill with centered text. Returns the texture + its aspect ratio. */
function makePill(
  text: string,
  opts: { font: string; bg: string; color: string; border?: string },
): { tex: THREE.CanvasTexture; aspect: number } {
  const m = 24; // margin for the drop shadow
  const H = 112;
  const probe = document.createElement("canvas").getContext("2d")!;
  probe.font = opts.font;
  const textW = probe.measureText(text).width;
  const W = Math.ceil(textW + 96);
  const cw = W + m * 2;
  const ch = H + m * 2;
  const tex = makeTexture(cw, ch, (ctx) => {
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = opts.bg;
    rr(ctx, m, m, W, H, H / 2);
    ctx.fill();
    ctx.shadowColor = "transparent";
    if (opts.border) {
      ctx.strokeStyle = opts.border;
      ctx.lineWidth = 6;
      rr(ctx, m + 3, m + 3, W - 6, H - 6, (H - 6) / 2);
      ctx.stroke();
    }
    ctx.font = opts.font;
    ctx.fillStyle = opts.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, cw / 2, ch / 2 + 2);
  });
  return { tex, aspect: cw / ch };
}

type ShowcaseTextures = {
  face: THREE.CanvasTexture;
  screen: THREE.CanvasTexture;
  chipIn: { tex: THREE.CanvasTexture; aspect: number };
  chipPlay: { tex: THREE.CanvasTexture; aspect: number };
  label: { tex: THREE.CanvasTexture; aspect: number };
};

/** Paint every texture. Rebuilt once the QR resolves and once fonts finish
 *  loading, so the final pass uses the real brand type. */
function useShowcaseTextures(): ShowcaseTextures | null {
  const [tick, setTick] = useState(0);
  const qrRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const c = document.createElement("canvas");
        await QRCode.toCanvas(c, "https://www.kauntech.com", {
          width: 256,
          margin: 1,
          color: { dark: "#1c1917", light: "#ffffff" },
        });
        if (alive) {
          qrRef.current = c;
          setTick((t) => t + 1);
        }
      } catch {
        /* card face simply renders without a QR */
      }
    })();
    document.fonts?.ready.then(() => {
      if (alive) setTick((t) => t + 1);
    });
    setReady(true);
    return () => {
      alive = false;
    };
  }, []);

  const textures = useMemo<ShowcaseTextures | null>(() => {
    if (!ready || typeof document === "undefined") return null;

    const display = famVar("--font-display", '"Space Grotesk", system-ui, sans-serif');
    const serif = famVar("--font-serif", '"Instrument Serif", Georgia, serif');
    const body = famVar("--font-fira-sans", '"Fira Sans", system-ui, sans-serif');
    const qr = qrRef.current;

    // Printed card face — identity row + QR tile (772×480 ≈ the 2.7:1.68 card)
    const face = makeTexture(772, 480, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 772, 480);
      g.addColorStop(0, "#fffdf9");
      g.addColorStop(0.55, "#faf8f4");
      g.addColorStop(1, "#faf4eb");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 772, 480);

      // avatar
      ctx.beginPath();
      ctx.arc(110, 150, 52, 0, Math.PI * 2);
      ctx.fillStyle = "#fffdf9";
      ctx.fill();
      ctx.strokeStyle = "rgba(245,158,11,0.55)";
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.font = `800 46px ${display}`;
      ctx.fillStyle = "#b45309";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("A", 110, 154);

      // identity
      ctx.textAlign = "left";
      ctx.font = `700 46px ${display}`;
      ctx.fillStyle = "#2d2926";
      ctx.fillText("Aarav Sharma", 186, 132);
      ctx.font = `500 30px ${body}`;
      ctx.fillStyle = "#8b8680";
      ctx.fillText("Founder · Voltair Tech", 186, 182);

      // QR tile
      ctx.shadowColor = "rgba(0,0,0,0.14)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = "#ffffff";
      rr(ctx, 528, 96, 196, 196, 20);
      ctx.fill();
      ctx.shadowColor = "transparent";
      if (qr) ctx.drawImage(qr, 542, 110, 168, 168);

      // footer: accent lines + wordmark
      const y = 396;
      ctx.strokeStyle = "rgba(245,158,11,0.35)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(72, y);
      ctx.lineTo(292, y);
      ctx.moveTo(480, y);
      ctx.lineTo(700, y);
      ctx.stroke();
      ctx.font = `800 26px ${display}`;
      ctx.fillStyle = "rgba(45,41,38,0.85)";
      ctx.textAlign = "center";
      ctx.fillText("K A U N T E C H", 386, y + 2);
    });

    // Phone screen viewfinder (400×863 matches the measured glass aspect)
    const screen = makeTexture(400, 863, (ctx) => {
      rr(ctx, 0, 0, 400, 863, 58);
      ctx.clip();
      const g = ctx.createLinearGradient(0, 0, 0, 863);
      g.addColorStop(0, "#111114");
      g.addColorStop(1, "#060607");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 400, 863);
      const glow = ctx.createRadialGradient(200, 0, 40, 200, 0, 460);
      glow.addColorStop(0, "rgba(249,115,22,0.18)");
      glow.addColorStop(1, "rgba(249,115,22,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 400, 480);

      // "AR live" pill
      ctx.font = `700 27px ${display}`;
      const pw = ctx.measureText("● AR live").width + 56;
      ctx.fillStyle = "rgba(34,197,94,0.14)";
      rr(ctx, 200 - pw / 2, 96, pw, 54, 27);
      ctx.fill();
      ctx.strokeStyle = "rgba(74,222,128,0.4)";
      ctx.lineWidth = 3;
      rr(ctx, 200 - pw / 2 + 2, 98, pw - 4, 50, 25);
      ctx.stroke();
      ctx.fillStyle = "#4ade80";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("● AR live", 200, 125);

      // viewfinder brackets
      const bx = 62, by = 230, bw = 276, bh = 330, L = 46;
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(bx, by + L); ctx.lineTo(bx, by); ctx.lineTo(bx + L, by);
      ctx.moveTo(bx + bw - L, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + L);
      ctx.moveTo(bx + bw, by + bh - L); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw - L, by + bh);
      ctx.moveTo(bx + L, by + bh); ctx.lineTo(bx, by + bh); ctx.lineTo(bx, by + bh - L);
      ctx.stroke();

      // mini card inside the viewfinder
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 26;
      ctx.shadowOffsetY = 10;
      const cg = ctx.createLinearGradient(96, 430, 304, 520);
      cg.addColorStop(0, "#fffdf9");
      cg.addColorStop(1, "#faf4eb");
      ctx.fillStyle = cg;
      rr(ctx, 96, 430, 208, 88, 18);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = "rgba(245,158,11,0.7)";
      ctx.lineWidth = 3;
      rr(ctx, 97, 431, 206, 86, 17);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(134, 474, 22, 0, Math.PI * 2);
      ctx.fillStyle = "#fffdf9";
      ctx.fill();
      ctx.strokeStyle = "rgba(245,158,11,0.55)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.font = `800 20px ${display}`;
      ctx.fillStyle = "#b45309";
      ctx.fillText("A", 134, 476);
      ctx.font = `800 22px ${display}`;
      ctx.fillStyle = "#2d2926";
      ctx.textAlign = "left";
      ctx.fillText("Aarav Sharma", 166, 476);

      // floating mini chips
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = "#0a66c2";
      rr(ctx, 268, 268, 58, 44, 22);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.font = `800 24px ${display}`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText("in", 297, 291);
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = "rgba(12,12,14,0.92)";
      rr(ctx, 80, 330, 56, 44, 22);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = "rgba(249,115,22,0.65)";
      ctx.lineWidth = 3;
      rr(ctx, 81.5, 331.5, 53, 41, 20.5);
      ctx.stroke();
      ctx.font = `700 20px ${display}`;
      ctx.fillStyle = "#fdba74";
      ctx.fillText("▶", 108, 353);

      // hint
      ctx.font = `600 24px ${body}`;
      ctx.fillStyle = "rgba(245,245,244,0.75)";
      ctx.fillText("Point at the card", 200, 720);
    });

    const chipIn = makePill("in · Connect", {
      font: `700 46px ${display}`,
      bg: "#0a66c2",
      color: "#ffffff",
      border: "rgba(255,255,255,0.35)",
    });
    const chipPlay = makePill("▶ Intro video", {
      font: `700 44px ${display}`,
      bg: "rgba(12,12,14,0.92)",
      color: "#fdba74",
      border: "rgba(249,115,22,0.65)",
    });

    // serif caption — transparent background, soft shadow
    const label = (() => {
      const probe = document.createElement("canvas").getContext("2d")!;
      const font = `italic 64px ${serif}`;
      probe.font = font;
      const w = Math.ceil(probe.measureText("Hi, I’m Aarav 👋").width + 80);
      const h = 132;
      const tex = makeTexture(w, h, (ctx) => {
        ctx.font = font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 22;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = "#fffdf9";
        ctx.fillText("Hi, I’m Aarav 👋", w / 2, h / 2);
      });
      return { tex, aspect: w / h };
    })();

    return { face, screen, chipIn, chipPlay, label };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tick]);

  // dispose replaced/unmounted textures
  useEffect(() => {
    const t = textures;
    return () => {
      if (!t) return;
      t.face.dispose();
      t.screen.dispose();
      t.chipIn.tex.dispose();
      t.chipPlay.tex.dispose();
      t.label.tex.dispose();
    };
  }, [textures]);

  return textures;
}

/** Flat textured plane (chips, captions). Width in world units. */
function Decal({
  tex,
  w,
  position,
}: {
  tex: { tex: THREE.CanvasTexture; aspect: number };
  w: number;
  position: [number, number, number];
}) {
  return (
    <mesh position={position}>
      <planeGeometry args={[w, w / tex.aspect]} />
      <meshBasicMaterial map={tex.tex} transparent toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ── Scene ───────────────────────────────────────────────────────────────── */

/** The ivory business card + the AR content hovering above it (card-local
 *  space: the card face is XY, "above the card" is +Z). */
function CardScene({ frozen, tex }: { frozen: boolean; tex: ShowcaseTextures | null }) {
  const knot = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!knot.current || frozen) return;
    knot.current.rotation.x += delta * 0.45;
    knot.current.rotation.y += delta * 0.6;
  });

  return (
    <group position={[-1.28, -0.32, 0.35]} rotation={[-0.95, 0.16, 0.07]}>
      {/* gold rim peeking out under the ivory face — the app card's accent border */}
      <RoundedBox args={[2.78, 1.76, 0.03]} radius={0.09} smoothness={3} position={[0, 0, -0.028]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.75} roughness={0.32} />
      </RoundedBox>
      <RoundedBox args={[2.7, 1.68, 0.045]} radius={0.08} smoothness={3}>
        <meshStandardMaterial color="#fffdf9" metalness={0.05} roughness={0.55} />
      </RoundedBox>

      {/* printed face — painted texture, always glued to the card */}
      {tex ? (
        <mesh position={[0, 0, 0.031]}>
          <planeGeometry args={[2.56, 2.56 / (772 / 480)]} />
          <meshBasicMaterial map={tex.face} transparent toneMapped={false} />
        </mesh>
      ) : null}

      {/* the AR layer — a 3D model, link chips, a caption, and a little magic */}
      <Sparkles count={24} scale={[2.4, 1.5, 1.2]} position={[0, 0, 0.7]} size={2.4} speed={frozen ? 0 : 0.32} color="#fbbf24" opacity={0.55} />

      <Float speed={frozen ? 0 : 1.6} rotationIntensity={0.25} floatIntensity={0.5} floatingRange={[-0.06, 0.06]}>
        <mesh ref={knot} position={[-0.62, 0.28, 0.88]}>
          <torusKnotGeometry args={[0.19, 0.062, 96, 16]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.22} envMapIntensity={1.6} />
        </mesh>
      </Float>

      {tex ? (
        <>
          <Float speed={frozen ? 0 : 1.2} rotationIntensity={0.12} floatIntensity={0.4} floatingRange={[-0.05, 0.05]}>
            <Decal tex={tex.chipIn} w={0.72} position={[0.78, 0.42, 0.72]} />
          </Float>
          <Float speed={frozen ? 0 : 1.4} rotationIntensity={0.12} floatIntensity={0.4} floatingRange={[-0.05, 0.05]}>
            <Decal tex={tex.chipPlay} w={0.74} position={[0.55, -0.52, 1.02]} />
          </Float>
          <Float speed={frozen ? 0 : 1.1} rotationIntensity={0.1} floatIntensity={0.35} floatingRange={[-0.04, 0.04]}>
            <Decal tex={tex.label} w={1.05} position={[-0.5, -0.92, 0.72]} />
          </Float>
        </>
      ) : null}
    </group>
  );
}

/** The phone, held up mid-scan, its screen a painted live viewfinder. */
function Phone({ frozen, tex }: { frozen: boolean; tex: ShowcaseTextures | null }) {
  const phone = useShowcasePhone();
  const s = phone.scale;
  const sc = phone.screenCenter;
  const sw = phone.screenSize.x * s * 0.985;
  const sh = phone.screenSize.y * s * 0.985;

  return (
    <Float speed={frozen ? 0 : 1.1} rotationIntensity={0.14} floatIntensity={0.35} floatingRange={[-0.05, 0.05]}>
      <group position={[1.62, 0.06, 0.2]} rotation={[0.02, -0.46, 0.04]} scale={0.86}>
        <group scale={s}>
          <primitive object={phone.object} />
        </group>
        {tex ? (
          <mesh position={[sc.x * s, sc.y * s, sc.z * s + 0.004]}>
            <planeGeometry args={[sw, sh]} />
            <meshBasicMaterial map={tex.screen} transparent toneMapped={false} />
          </mesh>
        ) : null}
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

    // fit both axes: the composition spans ~5.6 wide × ~3.9 tall world units
    const vp = state.viewport.getCurrentViewport(state.camera, new THREE.Vector3(0, 0, 0));
    const fit = Math.min(1, vp.width / 5.6, vp.height / 3.9);

    intro.current = Math.min(1, intro.current + delta / 1.1);
    const inE = smooth(intro.current);

    const t = state.clock.elapsedTime;
    const sway = frozen ? 0 : Math.sin(t * 0.35) * 0.02;
    const targetRotY = sway + pointer.current.x * 0.07;
    const targetRotX = (frozen ? 0 : Math.sin(t * 0.5) * 0.008) - pointer.current.y * 0.045;

    const d = 3.5;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetRotY, d, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetRotX, d, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, (1 - inE) * -0.5 + 0.1, d, delta);
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
  const tex = useShowcaseTextures();

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
          <CardScene frozen={frozen} tex={tex} />
          <Phone frozen={frozen} tex={tex} />
        </Rig>
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(MODEL_URL);
