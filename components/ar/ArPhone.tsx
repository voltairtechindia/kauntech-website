"use client";

import { Suspense, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Environment, Lightformer } from "@react-three/drei";
import { useKauntechPhone } from "@/components/phone/PhoneCanvas";
import { ArScreen } from "@/components/phone/Screens";

/**
 * The site's real iPhone 16 GLB — the same model, materials and live-DOM
 * screen mapping as the home page's PhoneCanvas — idling in place with the
 * AR chapter screen on its glass. Decorates the /ar login hero and the
 * Pro/Ultra gate. The sway never turns the glass away from the camera, so
 * no back-face visibility handling is needed here.
 */
function Rig() {
  const group = useRef<THREE.Group>(null);
  const phone = useKauntechPhone();

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.position.y = Math.sin(t * 1.3) * 0.06;
    g.rotation.x = Math.sin(t * 1.05) * 0.015;
    g.rotation.y = -0.3 + Math.sin(t * 0.5) * 0.1;
    g.rotation.z = -0.04 + Math.sin(t * 0.8) * 0.015;
  });

  const sc = phone.screenCenter;
  const screenW = phone.screenSize.x * phone.scale;

  return (
    <group ref={group} scale={1.38}>
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
        <div className="k-3d-screen">
          <ArScreen />
          <span className="k-cssphone-glare" />
        </div>
      </Html>
    </group>
  );
}

export default function ArPhone() {
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

        <Rig />
      </Suspense>
    </Canvas>
  );
}
