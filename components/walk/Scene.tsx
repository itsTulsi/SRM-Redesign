"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Outfit } from "@/lib/walk/script";
import type { Collider, Paths, World, XZ } from "@/lib/walk/world";
import { type Anim, Character } from "./Character";
import { curve, dropAt, toon } from "./curve";
import type { Game } from "./state";
import { WorldMeshes } from "./WorldMeshes";

export type Npc = { id: string; x: number; z: number; face: number; outfit: Outfit };
export type Overlay = {
  /** DOM elements positioned over the canvas each frame, keyed "place:<id>", "person:<id>", "emote", "pick". */
  els: Map<string, HTMLElement>;
  /** World anchors for those elements: x, height, z. */
  anchors: Map<string, [number, number, number]>;
  /** How far away an element may be and still show. */
  range: Map<string, number>;
};

const WALK = 6;
const RUN = 11;
const tmp = new THREE.Vector3();
const UP = 2.8;

export type Sky = { sky: string; fog: string; sun: string; sunI: number; hemiTop: string; hemiBottom: string; night: number };

export function Scene({
  world,
  collider,
  paths,
  game,
  outfit,
  npcs,
  overlay,
  onNear,
  highlight,
  pickAt,
  sky,
}: {
  world: World;
  collider: Collider;
  paths: Paths;
  game: React.RefObject<Game>;
  outfit: Outfit;
  npcs: Npc[];
  overlay: Overlay;
  onNear: (person: string | null, place: string | null) => void;
  highlight: string | null;
  pickAt: XZ | null;
  sky: Sky;
}) {
  const { camera, gl, size, scene } = useThree();
  const player = useRef<THREE.Group>(null);
  const npcRefs = useRef(new Map<string, THREE.Group>());
  const beacon = useRef<THREE.Group>(null);
  const arrow = useRef<THREE.Mesh>(null);
  const crate = useRef<THREE.Group>(null);
  const playerAnim = useMemo(() => ({ current: game.current.anim }), [game]);
  const npcAnims = useMemo(() => new Map(npcs.map((n) => [n.id, { current: game.current.npc[n.id]! }])), [npcs, game]);
  const places = useMemo(
    () =>
      Object.entries(world.places)
        .filter(([, p]) => p.b !== undefined)
        .map(([id, p]) => ({ id, x: p.door[0], z: p.door[1] })),
    [world],
  );
  const camPos = useRef(new THREE.Vector3());
  const lastNear = useRef<string>("");
  const frame = useRef(0);
  const occlusion = useRef(1);

  useEffect(() => {
    scene.background = new THREE.Color(sky.fog);
    scene.fog = new THREE.Fog(sky.fog, 90, 330);
    curve.uNight.value = sky.night;
  }, [scene, sky]);

  // Pointer: drag to look around, tap the ground to walk there, wheel or pinch to zoom.
  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number; sx: number; sy: number; t: number }>();
    let pinch = 0;
    const down = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      }
    };
    const move = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const g = game.current;
      if (pointers.size === 2) {
        p.x = e.clientX;
        p.y = e.clientY;
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        if (pinch) g.cam.minDist = g.cam.dist = Math.min(45, Math.max(7, g.cam.dist * (pinch / d)));
        pinch = d;
        return;
      }
      g.cam.yaw -= (e.clientX - p.x) * 0.006;
      g.cam.pitch = Math.min(1.25, Math.max(0.18, g.cam.pitch + (e.clientY - p.y) * 0.004));
      p.x = e.clientX;
      p.y = e.clientY;
    };
    const up = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = 0;
      if (!p || pointers.size) return;
      const g = game.current;
      if (g.frozen || g.paused) return;
      if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 8 || performance.now() - p.t > 450) return;
      const hit = groundAt(e.clientX, e.clientY);
      if (!hit) return;
      g.route = paths.route([g.pos.x, g.pos.z], collider.resolve(hit[0], hit[1], 0.6));
      g.onArrive = null;
      ripple(hit);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const g = game.current;
      g.cam.minDist = g.cam.dist = Math.min(45, Math.max(7, g.cam.dist * (1 + Math.sign(e.deltaY) * 0.1)));
    };
    const rect = () => el.getBoundingClientRect();
    // The ground is drawn bent, so find where the click ray meets the bent surface (bisection along the ray).
    const ray = new THREE.Raycaster();
    const groundAt = (cx: number, cy: number): XZ | null => {
      const r = rect();
      ray.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera);
      const o = ray.ray.origin;
      const d = ray.ray.direction;
      const below = (t: number) => o.y + d.y * t < -dropAt(o.x + d.x * t, o.z + d.z * t);
      let lo = 0;
      let hi = 600;
      if (!below(hi)) return null;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (below(mid)) hi = mid;
        else lo = mid;
      }
      return [o.x + d.x * hi, o.z + d.z * hi];
    };
    const rippleEl = overlay.els.get("ripple");
    const ripple = (at: XZ) => {
      overlay.anchors.set("ripple", [at[0], 0.1, at[1]]);
      if (rippleEl) {
        rippleEl.classList.remove("walk-ripple-on");
        void rippleEl.offsetWidth;
        rippleEl.classList.add("walk-ripple-on");
      }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl, camera, game, paths, collider, overlay]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const g = game.current;
    curve.uTime.value += dt;
    frame.current++;

    // ── Movement ──
    let mx = 0;
    let mz = 0;
    if (!g.frozen && !g.paused) {
      const k = g.keys;
      const fwd = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0) + -g.joy.y;
      const side = (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0) + g.joy.x;
      if (Math.abs(fwd) > 0.05 || Math.abs(side) > 0.05) {
        // Camera-relative: "up" walks away from the camera.
        const fx = -Math.sin(g.cam.yaw);
        const fz = -Math.cos(g.cam.yaw);
        mx = fx * fwd + -fz * side;
        mz = fz * fwd + fx * side;
        g.route = [];
        g.onArrive = null;
      } else if (g.route.length) {
        const [tx, tz] = g.route[0]!;
        const dx = tx - g.pos.x;
        const dz = tz - g.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 1.1) {
          g.route.shift();
          if (!g.route.length && g.onArrive) {
            const cb = g.onArrive;
            g.onArrive = null;
            cb();
          }
        } else {
          mx = dx / d;
          mz = dz / d;
        }
      }
    }
    const len = Math.hypot(mx, mz);
    const runOn = g.run || g.keys.has("shift") || Math.hypot(g.joy.x, g.joy.y) > 0.92 || (g.route.length > 0 && routeLength(g) > 60);
    const want = len > 0.05 ? (runOn ? RUN : WALK) * Math.min(1, len) : 0;
    g.speed += (want - g.speed) * Math.min(1, dt * (want > g.speed ? 6 : 10));
    if (len > 0.05) {
      const h = Math.atan2(mx, mz);
      let dh = h - g.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      g.heading += dh * Math.min(1, dt * 12);
    }
    if (g.speed > 0.02) {
      const nx = g.pos.x + Math.sin(g.heading) * g.speed * dt;
      const nz = g.pos.z + Math.cos(g.heading) * g.speed * dt;
      const [rx, rz] = collider.resolve(nx, nz, 0.6);
      // Stuck against a wall while following a route: skip to the next point.
      if (g.route.length && Math.hypot(rx - g.pos.x, rz - g.pos.z) < g.speed * dt * 0.15) g.route.shift();
      g.pos.x = rx;
      g.pos.z = rz;
    }
    g.anim.speed = g.speed;
    curve.uCenter.value.set(g.pos.x, g.pos.z);
    if (player.current) {
      player.current.position.set(g.pos.x, 0, g.pos.z);
      player.current.rotation.y = g.heading;
    }

    // ── Camera: follows with a little lag, pulls in when a building is in the way ──
    if (frame.current % 8 === 0) {
      const cx = g.pos.x + Math.sin(g.cam.yaw) * g.cam.dist * Math.cos(g.cam.pitch);
      const cz = g.pos.z + Math.cos(g.cam.yaw) * g.cam.dist * Math.cos(g.cam.pitch);
      let f = 1;
      for (let s = 0.25; s <= 1; s += 0.25) {
        const x = g.pos.x + (cx - g.pos.x) * s;
        const z = g.pos.z + (cz - g.pos.z) * s;
        if (collider.blocked(x, z, 0.5) && g.cam.pitch < 0.9) {
          f = Math.max(0.35, s - 0.2);
          break;
        }
      }
      occlusion.current = f;
    }
    const dist = g.cam.dist * occlusion.current;
    const ahead = g.reduced ? 0 : Math.min(1, g.speed / RUN) * 2.5;
    const tx = g.pos.x + Math.sin(g.heading) * ahead;
    const tz = g.pos.z + Math.cos(g.heading) * ahead;
    const want3 = tmp.set(
      tx + Math.sin(g.cam.yaw) * dist * Math.cos(g.cam.pitch),
      UP + dist * Math.sin(g.cam.pitch),
      tz + Math.cos(g.cam.yaw) * dist * Math.cos(g.cam.pitch),
    );
    if (camPos.current.lengthSq() === 0 || g.reduced) camPos.current.copy(want3);
    else camPos.current.lerp(want3, Math.min(1, dt * 5));
    camera.position.copy(camPos.current);
    camera.lookAt(tx, UP - 0.6, tz);

    // ── People: look at you when you're near, turn to you while talking; hidden when far away ──
    let nearPerson: string | null = null;
    let nearD = 4.5;
    for (const n of npcs) {
      const grp = npcRefs.current.get(n.id);
      const a = g.npc[n.id]!;
      const dx = g.pos.x - n.x;
      const dz = g.pos.z - n.z;
      const d = Math.hypot(dx, dz);
      if (grp) {
        grp.visible = d < 170;
        grp.position.y = 0;
        const toPlayer = Math.atan2(dx, dz);
        if (g.talkingTo === n.id) {
          let dh = toPlayer - grp.rotation.y;
          while (dh > Math.PI) dh -= Math.PI * 2;
          while (dh < -Math.PI) dh += Math.PI * 2;
          grp.rotation.y += dh * Math.min(1, dt * 6);
          a.look = 0;
        } else {
          let rel = d < 14 ? toPlayer - grp.rotation.y : 0;
          while (rel > Math.PI) rel -= Math.PI * 2;
          while (rel < -Math.PI) rel += Math.PI * 2;
          a.look = Math.max(-1, Math.min(1, rel));
          grp.rotation.y += (n.face - grp.rotation.y) * Math.min(1, dt * 1.5);
        }
      }
      if (d < nearD) {
        nearD = d;
        nearPerson = n.id;
      }
    }
    let nearPlace: string | null = null;
    let placeD = 16;
    for (const p of places) {
      const d = Math.hypot(g.pos.x - p.x, g.pos.z - p.z);
      if (d < placeD) {
        placeD = d;
        nearPlace = p.id;
      }
    }
    const key = `${nearPerson}|${nearPlace}`;
    if (key !== lastNear.current) {
      lastNear.current = key;
      g.near = { person: nearPerson, place: nearPlace };
      onNear(nearPerson, nearPlace);
    }

    // ── Way-finding: a light column over the next stop, and an arrow at your feet ──
    if (beacon.current) {
      beacon.current.visible = !!g.target && Math.hypot(g.target[0] - g.pos.x, g.target[1] - g.pos.z) > 14;
      if (g.target) {
        beacon.current.position.set(g.target[0], 0, g.target[1]);
        beacon.current.rotation.y += dt * 0.8;
      }
    }
    if (arrow.current) {
      const show = !!g.target && Math.hypot(g.target[0] - g.pos.x, g.target[1] - g.pos.z) > 8;
      arrow.current.visible = show;
      if (show) {
        const a = Math.atan2(g.target![0] - g.pos.x, g.target![1] - g.pos.z);
        arrow.current.position.set(g.pos.x + Math.sin(a) * 1.9, 0.12, g.pos.z + Math.cos(a) * 1.9);
        arrow.current.rotation.set(-Math.PI / 2, 0, a + Math.PI);
      }
    }
    if (crate.current) {
      crate.current.visible = !!pickAt;
      if (pickAt) {
        crate.current.position.set(pickAt[0], 0.45 + Math.sin(curve.uTime.value * 2) * 0.12, pickAt[1]);
        crate.current.rotation.y += dt;
      }
    }

    // ── Emote floats up above you ──
    if (g.emote) {
      g.emote.t -= dt;
      overlay.anchors.set("emote", [g.pos.x, 4.6 + (2 - g.emote.t) * 0.8, g.pos.z]);
      if (g.emote.t <= 0) {
        g.emote = null;
        overlay.anchors.delete("emote");
      }
    }
    overlay.anchors.set("me", [g.pos.x, 3.6, g.pos.z]);

    // ── DOM labels follow their anchors on the bent world ──
    for (const [k, el] of overlay.els) {
      const a = overlay.anchors.get(k);
      if (!a) {
        el.style.visibility = "hidden";
        continue;
      }
      const d = Math.hypot(a[0] - g.pos.x, a[2] - g.pos.z);
      const r = overlay.range.get(k) ?? Infinity;
      tmp.set(a[0], a[1] - dropAt(a[0], a[2]), a[2]).project(camera);
      const on = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1 && d < r;
      el.style.visibility = on ? "visible" : "hidden";
      if (on) {
        const x = ((tmp.x + 1) / 2) * size.width;
        const y = ((1 - tmp.y) / 2) * size.height;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
        el.style.opacity = d > r * 0.75 ? String(1 - (d - r * 0.75) / (r * 0.25)) : "1";
      }
    }
  });

  return (
    <>
      <hemisphereLight args={[sky.hemiTop, sky.hemiBottom, 1.6]} />
      <directionalLight position={[120, 200, 80]} intensity={sky.sunI} color={sky.sun} />
      <WorldMeshes world={world} highlight={highlight} />
      <group ref={player}>
        <Character outfit={outfit} anim={playerAnim as React.RefObject<Anim>} scale={1.3} />
      </group>
      {npcs.map((n) => (
        <group
          key={n.id}
          ref={(el) => {
            if (el) npcRefs.current.set(n.id, el);
            else npcRefs.current.delete(n.id);
          }}
          position={[n.x, 0, n.z]}
          rotation-y={n.face}
        >
          <Character outfit={n.outfit} anim={npcAnims.get(n.id) as React.RefObject<Anim>} scale={1.3} />
        </group>
      ))}
      <group ref={beacon} visible={false}>
        <mesh position-y={40} material={toon({ color: "#ffd166", transparent: true, opacity: 0.22 })}>
          <cylinderGeometry args={[1.6, 1.6, 80, 16, 1, true]} />
        </mesh>
        <mesh position-y={0.15} rotation-x={-Math.PI / 2} material={toon({ color: "#ffd166", transparent: true, opacity: 0.6 })}>
          <ringGeometry args={[2.2, 2.8, 32]} />
        </mesh>
      </group>
      <mesh ref={arrow} visible={false} material={toon({ color: "#ffd166" })}>
        <coneGeometry args={[0.45, 1.1, 3]} />
      </mesh>
      <group ref={crate} visible={false}>
        <mesh material={toon({ color: "#d4a373" })}>
          <boxGeometry args={[0.9, 0.9, 0.9]} />
        </mesh>
        <mesh position-y={0.46} material={toon({ color: "#ffd166" })}>
          <boxGeometry args={[0.95, 0.08, 0.3]} />
        </mesh>
      </group>
    </>
  );
}

function routeLength(g: Game) {
  let d = 0;
  let px = g.pos.x;
  let pz = g.pos.z;
  for (const [x, z] of g.route) {
    d += Math.hypot(x - px, z - pz);
    px = x;
    pz = z;
  }
  return d;
}
