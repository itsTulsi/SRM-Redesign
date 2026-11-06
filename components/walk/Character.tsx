"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Outfit } from "@/lib/walk/script";
import { toon } from "./curve";

/**
 * A chunky toon student, built from simple shapes in code (no downloaded model, no licence to track): head, hair,
 * torso, arms and legs on pivots, so it can walk, run, wave, nod and cheer. Everything you can change in the outfit
 * screen is a colour or a visible part, so a change costs nothing to load.
 */

export type Anim = { speed: number; wave: number; cheer: number; talk: number; look: number };
export const newAnim = (): Anim => ({ speed: 0, wave: 0, cheer: 0, talk: 0, look: 0 });

export const PALETTE = {
  skin: ["#f3d2b6", "#e2b48e", "#c98c63", "#a96d49", "#8a5636", "#5f3b25"],
  hairColor: ["#1c1714", "#3d2a1f", "#7a3b1f", "#a8a6a2", "#6b4a2b"],
  // [main, accent] per top: SRM navy+gold, Camber Racing, lab coat, kurta, hoodie, NCC, jersey, plain tee
  top: [
    ["#1f3f8f", "#f2b632"],
    ["#d62839", "#1b1b1b"],
    ["#f5f5f2", "#9ec5e6"],
    ["#e07a5f", "#f2cc8f"],
    ["#7d5ba6", "#5b3f80"],
    ["#8a7f4e", "#5c5434"],
    ["#2a9d8f", "#ffffff"],
    ["#f4a261", "#e76f51"],
  ],
  bottom: ["#3d5a80", "#2b2d42", "#b56576", "#c9a227"],
  shoes: ["#f1f1f1", "#7f5539", "#3a2e2a", "#c1121f"],
  bag: ["#000000", "#264653", "#e9c46a", "#6d597a"],
};
export const OUTFIT_SIZES: Record<keyof Outfit, number> = { hair: 6, hairColor: 5, skin: 6, top: 8, bottom: 4, shoes: 4, bag: 4 };
export const DEFAULT_OUTFIT: Outfit = { skin: 2, hair: 0, hairColor: 0, top: 0, bottom: 0, shoes: 0, bag: 1 };

// Shared geometry for every character.
const G = {
  head: new THREE.SphereGeometry(0.42, 18, 14),
  eye: new THREE.SphereGeometry(0.055, 8, 6),
  cheek: new THREE.SphereGeometry(0.06, 8, 6),
  cap: new THREE.SphereGeometry(0.45, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
  buzz: new THREE.SphereGeometry(0.43, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.45),
  bun: new THREE.SphereGeometry(0.17, 10, 8),
  curl: new THREE.SphereGeometry(0.16, 8, 6),
  longBack: new THREE.CapsuleGeometry(0.34, 0.45, 4, 10),
  tail: new THREE.CapsuleGeometry(0.1, 0.36, 4, 8),
  torso: new THREE.CapsuleGeometry(0.33, 0.4, 4, 12),
  coat: new THREE.CylinderGeometry(0.35, 0.41, 0.5, 14),
  skirt: new THREE.CylinderGeometry(0.3, 0.46, 0.62, 14),
  stripe: new THREE.CylinderGeometry(0.335, 0.335, 0.09, 14),
  hood: new THREE.TorusGeometry(0.22, 0.09, 6, 12, Math.PI),
  upper: new THREE.CapsuleGeometry(0.105, 0.2, 4, 8),
  fore: new THREE.CapsuleGeometry(0.095, 0.18, 4, 8),
  hand: new THREE.SphereGeometry(0.1, 8, 6),
  thigh: new THREE.CapsuleGeometry(0.13, 0.2, 4, 8),
  shin: new THREE.CapsuleGeometry(0.115, 0.2, 4, 8),
  shoe: new THREE.BoxGeometry(0.24, 0.14, 0.38),
  pack: new THREE.BoxGeometry(0.5, 0.56, 0.24),
  tote: new THREE.BoxGeometry(0.1, 0.36, 0.34),
  sling: new THREE.BoxGeometry(0.34, 0.24, 0.12),
  shadow: new THREE.CircleGeometry(0.62, 20),
};

export function Character({ outfit, anim, scale = 1 }: { outfit: Outfit; anim: React.RefObject<Anim>; scale?: number }) {
  const body = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const phase = useRef(Math.random() * 6);
  const time = useRef(Math.random() * 10);
  const amt = useRef(0);

  const m = useMemo(() => {
    const [top, accent] = PALETTE.top[outfit.top] ?? PALETTE.top[0]!;
    return {
      skin: toon({ color: PALETTE.skin[outfit.skin] }),
      hair: toon({ color: PALETTE.hairColor[outfit.hairColor] }),
      top: toon({ color: top }),
      accent: toon({ color: accent }),
      bottom: toon({ color: PALETTE.bottom[outfit.bottom] }),
      shoes: toon({ color: PALETTE.shoes[outfit.shoes] }),
      bag: toon({ color: PALETTE.bag[outfit.bag] }),
      eye: toon({ color: "#1b1b1b" }),
      cheek: toon({ color: "#f28b82", transparent: true, opacity: 0.55 }),
      shadow: toon({ color: "#000000", transparent: true, opacity: 0.2 }),
    };
  }, [outfit]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const a = anim.current;
    time.current += dt;
    const t = time.current;
    const target = Math.min(1, a.speed / 5);
    amt.current += (target - amt.current) * Math.min(1, dt * 8);
    const k = amt.current;
    const run = a.speed > 7 ? 1.35 : 1;
    phase.current += dt * (2.2 + a.speed * 1.35);
    const s = Math.sin(phase.current);
    if (legL.current && legR.current) {
      legL.current.rotation.x = s * 0.8 * k * run;
      legR.current.rotation.x = -s * 0.8 * k * run;
    }
    let jump = 0;
    if (armL.current && armR.current) {
      armL.current.rotation.x = -s * 0.65 * k * run;
      armR.current.rotation.x = s * 0.65 * k * run;
      armL.current.rotation.z = 0.1 + Math.sin(t * 1.8) * 0.02;
      armR.current.rotation.z = -0.1 - Math.sin(t * 1.8) * 0.02;
      if (a.wave > 0) {
        a.wave -= dt;
        armR.current.rotation.z = -2.5 + Math.sin(t * 13) * 0.35;
        armR.current.rotation.x = 0;
      }
      if (a.cheer > 0) {
        a.cheer -= dt;
        armL.current.rotation.z = 2.6;
        armR.current.rotation.z = -2.6;
        armL.current.rotation.x = armR.current.rotation.x = 0;
        jump = Math.abs(Math.sin(t * 9)) * 0.35;
      }
    }
    if (body.current) body.current.position.y = Math.abs(s) * 0.09 * k + Math.sin(t * 2.1) * 0.012 + jump;
    if (torso.current) torso.current.rotation.x = 0.1 * k * run;
    if (head.current) {
      head.current.rotation.y += (Math.max(-1, Math.min(1, a.look)) - head.current.rotation.y) * Math.min(1, dt * 6);
      head.current.rotation.x = a.talk > 0 ? Math.sin(t * 7) * 0.09 : Math.sin(t * 1.3) * 0.02;
      if (a.talk > 0) a.talk -= dt;
    }
  });

  const longTop = outfit.top === 2 || outfit.top === 3;
  const skirt = outfit.bottom === 2;
  const shorts = outfit.bottom === 3;
  const shortSleeves = outfit.top === 1 || outfit.top === 6 || outfit.top === 7;
  const hair = outfit.hair;

  return (
    <group scale={scale}>
      <mesh geometry={G.shadow} material={m.shadow} rotation-x={-Math.PI / 2} position-y={0.03} />
      <group ref={body}>
        {/* Legs */}
        {([-1, 1] as const).map((side) => (
          <group key={side} ref={side < 0 ? legL : legR} position={[side * 0.17, 0.92, 0]}>
            <mesh geometry={G.thigh} material={skirt ? m.skin : m.bottom} position-y={-0.2} />
            <mesh geometry={G.shin} material={shorts || skirt ? m.skin : m.bottom} position-y={-0.55} />
            <mesh geometry={G.shoe} material={m.shoes} position={[0, -0.8, 0.06]} />
          </group>
        ))}
        <group ref={torso} position-y={0.92}>
          <mesh geometry={G.torso} material={m.top} position-y={0.36} />
          {outfit.top === 0 || outfit.top === 6 ? <mesh geometry={G.stripe} material={m.accent} position-y={0.4} /> : null}
          {longTop ? <mesh geometry={G.coat} material={m.top} position-y={-0.02} /> : null}
          {outfit.top === 4 ? <mesh geometry={G.hood} material={m.accent} position={[0, 0.78, -0.2]} rotation-x={-0.5} /> : null}
          {skirt ? <mesh geometry={G.skirt} material={m.bottom} position-y={-0.12} /> : null}
          {/* Bag */}
          {outfit.bag === 1 ? <mesh geometry={G.pack} material={m.bag} position={[0, 0.4, -0.38]} /> : null}
          {outfit.bag === 2 ? <mesh geometry={G.tote} material={m.bag} position={[0.46, 0.1, 0]} /> : null}
          {outfit.bag === 3 ? <mesh geometry={G.sling} material={m.bag} position={[-0.22, 0.12, 0.32]} rotation-z={0.3} /> : null}
          {/* Arms */}
          {([-1, 1] as const).map((side) => (
            <group key={side} ref={side < 0 ? armL : armR} position={[side * 0.43, 0.66, 0]}>
              <mesh geometry={G.upper} material={m.top} position-y={-0.16} />
              <mesh geometry={G.fore} material={shortSleeves ? m.skin : m.top} position-y={-0.42} />
              <mesh geometry={G.hand} material={m.skin} position-y={-0.6} />
            </group>
          ))}
          {/* Head */}
          <group ref={head} position-y={1.12}>
            <mesh geometry={G.head} material={m.skin} />
            <mesh geometry={G.eye} material={m.eye} position={[-0.15, 0.02, 0.38]} />
            <mesh geometry={G.eye} material={m.eye} position={[0.15, 0.02, 0.38]} />
            <mesh geometry={G.cheek} material={m.cheek} position={[-0.25, -0.1, 0.32]} />
            <mesh geometry={G.cheek} material={m.cheek} position={[0.25, -0.1, 0.32]} />
            {hair === 5 ? (
              <mesh geometry={G.buzz} material={m.hair} position-y={0.03} rotation-x={-0.25} />
            ) : (
              <mesh geometry={G.cap} material={m.hair} position-y={0.04} rotation-x={-0.35} />
            )}
            {hair === 1 ? <mesh geometry={G.bun} material={m.hair} position={[0, 0.42, -0.18]} /> : null}
            {hair === 2 ? <mesh geometry={G.longBack} material={m.hair} position={[0, -0.25, -0.16]} scale={[1, 1, 0.55]} /> : null}
            {hair === 3 ? <mesh geometry={G.tail} material={m.hair} position={[0, 0.05, -0.48]} rotation-x={0.5} /> : null}
            {hair === 4
              ? [
                  [-0.28, 0.28, 0.05],
                  [0.28, 0.28, 0.05],
                  [0, 0.4, 0.05],
                  [-0.2, 0.3, -0.25],
                  [0.2, 0.3, -0.25],
                  [0, 0.25, -0.38],
                ].map((p, i) => <mesh key={i} geometry={G.curl} material={m.hair} position={p as [number, number, number]} />)
              : null}
          </group>
        </group>
      </group>
    </group>
  );
}
