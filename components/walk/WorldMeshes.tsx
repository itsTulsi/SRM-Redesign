"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { World, XZ } from "@/lib/walk/world";
import { buildCampus, buildStreets, type Sign } from "./buildings";
import { toon } from "./curve";

/**
 * The world: ground, roads, ponds, buildings (buildings.ts), street furniture, signboards, trees and coconut palms.
 * Static things are merged into a handful of meshes, so the whole campus draws in a few calls.
 */

/**
 * The world is drawn bent (curve.ts), and a flat triangle can only bend at its corners, so long triangles (a big pond,
 * a long road, the ground) are split until no edge is longer than `max` metres.
 */
function tessellate(g: THREE.BufferGeometry, max: number) {
  const src = (g.index ? g.toNonIndexed() : g).getAttribute("position");
  const out: number[] = [];
  const v = (i: number) => [src.getX(i), src.getY(i), src.getZ(i)] as const;
  const split = (a: readonly number[], b: readonly number[], c: readonly number[], depth: number) => {
    const ab = Math.hypot(a[0]! - b[0]!, a[2]! - b[2]!);
    const bc = Math.hypot(b[0]! - c[0]!, b[2]! - c[2]!);
    const ca = Math.hypot(c[0]! - a[0]!, c[2]! - a[2]!);
    const m = Math.max(ab, bc, ca);
    if (m <= max || depth > 10) {
      out.push(...a, ...b, ...c);
      return;
    }
    const mid = (p: readonly number[], q: readonly number[]) => [(p[0]! + q[0]!) / 2, (p[1]! + q[1]!) / 2, (p[2]! + q[2]!) / 2];
    if (m === ab) {
      const d = mid(a, b);
      split(a, d, c, depth + 1);
      split(d, b, c, depth + 1);
    } else if (m === bc) {
      const d = mid(b, c);
      split(a, b, d, depth + 1);
      split(a, d, c, depth + 1);
    } else {
      const d = mid(c, a);
      split(a, b, d, depth + 1);
      split(d, b, c, depth + 1);
    }
  };
  for (let i = 0; i < src.count; i += 3) split(v(i), v(i + 1), v(i + 2), 0);
  const res = new THREE.BufferGeometry();
  res.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  res.computeVertexNormals();
  return res;
}
function ribbon(p: XZ[], w: number, y: number) {
  const pos: number[] = [];
  for (let i = 0; i < p.length - 1; i++) {
    const [ax, az] = p[i]!;
    const [bx, bz] = p[i + 1]!;
    const len = Math.hypot(bx - ax, bz - az) || 1;
    const nx = (-(bz - az) / len) * (w / 2);
    const nz = ((bx - ax) / len) * (w / 2);
    pos.push(ax + nx, y, az + nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz, ax + nx, y, az + nz, bx - nx, y, bz - nz, ax - nx, y, az - nz);
  }
  for (const [x, z] of p) {
    const segs = 8;
    for (let s = 0; s < segs; s++) {
      const a0 = (s / segs) * Math.PI * 2;
      const a1 = ((s + 1) / segs) * Math.PI * 2;
      pos.push(x, y, z, x + Math.cos(a1) * (w / 2), y, z + Math.sin(a1) * (w / 2), x + Math.cos(a0) * (w / 2), y, z + Math.sin(a0) * (w / 2));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
function flat(p: XZ[], y: number) {
  const g = new THREE.ShapeGeometry(new THREE.Shape(p.map(([x, z]) => new THREE.Vector2(x, -z))));
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

/** A signboard: the text drawn on a canvas, with a thin frame. */
function signTexture(s: Sign) {
  const W = 1024;
  const H = Math.round((W * s.h) / s.w);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  x.fillStyle = s.bg;
  x.fillRect(0, 0, W, H);
  x.strokeStyle = s.fg;
  x.lineWidth = Math.max(6, H * 0.05);
  x.strokeRect(H * 0.08, H * 0.08, W - H * 0.16, H - H * 0.16);
  let size = H * 0.56;
  x.font = `800 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  while (x.measureText(s.text).width > W * 0.86 && size > 10) {
    size *= 0.92;
    x.font = `800 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  }
  x.fillStyle = s.fg;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(s.text, W / 2, H / 2 + size * 0.04);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function Signs({ signs }: { signs: Sign[] }) {
  const items = useMemo(() => signs.map((s) => ({ s, mat: toon({ map: signTexture(s) }) })), [signs]);
  useEffect(() => () => items.forEach(({ mat }) => (mat as THREE.MeshToonMaterial).map?.dispose()), [items]);
  return (
    <>
      {items.map(({ s, mat }, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]} rotation-y={s.ry} material={mat}>
          <planeGeometry args={[s.w, s.h]} />
        </mesh>
      ))}
    </>
  );
}

// Tree crowns: a cluster of rounded blobs (anime trees), and coconut palms.
const CROWN = (() => {
  const parts = [
    [0, 0, 0, 2.3],
    [1.3, -0.5, 0.4, 1.6],
    [-1.2, -0.4, -0.3, 1.7],
    [0.2, 0.9, -0.6, 1.5],
  ].map(([x, y, z, r]) => {
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.translate(x!, y!, z!);
    return g;
  });
  return mergeGeometries(parts);
})();
const FRONDS = (() => {
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 9; k++) {
    const g = new THREE.BoxGeometry(0.55, 0.06, 3.4);
    g.translate(0, 0, 1.7);
    g.rotateX(0.55 + (k % 2) * 0.15);
    g.rotateY((k / 9) * Math.PI * 2);
    parts.push(g.toNonIndexed());
  }
  const nut = new THREE.SphereGeometry(0.35, 8, 6).toNonIndexed();
  nut.deleteAttribute("uv");
  parts.forEach((p) => p.deleteAttribute("uv"));
  return mergeGeometries([...parts, nut]);
})();

export function WorldMeshes({ world, highlight, names }: { world: World; highlight: string | null; names: Record<string, string> }) {
  const statics = useMemo(() => {
    const roads = world.roads.filter((r) => !r.f);
    const paths = world.roads.filter((r) => r.f);
    const campus = buildCampus(world, names);
    const b = world.bounds;
    const ground = new THREE.PlaneGeometry(b.maxX - b.minX + 900, b.maxZ - b.minZ + 900, 120, 100);
    ground.rotateX(-Math.PI / 2);
    ground.translate((b.minX + b.maxX) / 2, -0.02, (b.minZ + b.maxZ) / 2);
    return {
      ...campus,
      streets: buildStreets(world),
      ground,
      roads: roads.length ? tessellate(mergeGeometries(roads.map((r) => ribbon(r.p, r.w, 0.05))), 10) : null,
      edges: roads.length ? tessellate(mergeGeometries(roads.map((r) => ribbon(r.p, r.w + 1.4, 0.04))), 10) : null,
      paths: paths.length ? tessellate(mergeGeometries(paths.map((r) => ribbon(r.p, r.w, 0.07))), 10) : null,
      water: world.water.length ? tessellate(mergeGeometries(world.water.map((w) => flat(w.p, 0.12))), 12) : null,
      green: world.green.length ? tessellate(mergeGeometries(world.green.map((w) => flat(w.p, 0.02))), 12) : null,
    };
  }, [world, names]);
  useEffect(
    () => () => {
      for (const v of Object.values(statics)) if (v && typeof v === "object" && "dispose" in v) (v as THREE.BufferGeometry).dispose();
    },
    [statics],
  );

  // Trees: every fourth one a coconut palm.
  const palms = useMemo(() => world.trees.filter((_, i) => i % 4 === 0), [world]);
  const leafy = useMemo(() => world.trees.filter((_, i) => i % 4 !== 0), [world]);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  const palmTrunks = useRef<THREE.InstancedMesh>(null);
  const palmTops = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    const t = trunks.current;
    const cr = crowns.current;
    if (t && cr) {
      leafy.forEach(([x, z, s], i) => {
        o.position.set(x, 1.5 * s, z);
        o.scale.set(s, s, s);
        o.rotation.set(0, i, 0);
        o.updateMatrix();
        t.setMatrixAt(i, o.matrix);
        o.position.set(x, 4.4 * s, z);
        o.scale.set(s * (0.9 + ((i * 13) % 5) / 12), s * (0.85 + ((i * 7) % 5) / 12), s);
        o.updateMatrix();
        cr.setMatrixAt(i, o.matrix);
        cr.setColorAt(i, c.set(["#4f8f4a", "#5d9b50", "#46834a", "#6aa457", "#3f7a45"][i % 5]!));
      });
      t.instanceMatrix.needsUpdate = true;
      cr.instanceMatrix.needsUpdate = true;
      if (cr.instanceColor) cr.instanceColor.needsUpdate = true;
    }
    const pt = palmTrunks.current;
    const pp = palmTops.current;
    if (pt && pp) {
      palms.forEach(([x, z, s], i) => {
        const tall = 6 + s * 3;
        const lean = ((i * 37) % 10) / 60;
        o.position.set(x, tall / 2, z);
        o.scale.set(1, tall, 1);
        o.rotation.set(lean, i * 1.3, 0);
        o.updateMatrix();
        pt.setMatrixAt(i, o.matrix);
        o.position.set(x + Math.sin(i * 1.3) * lean * tall * 0.5, tall, z + Math.cos(i * 1.3) * lean * tall * 0.5);
        o.scale.set(1, 1, 1);
        o.rotation.set(0, i * 0.7, 0);
        o.updateMatrix();
        pp.setMatrixAt(i, o.matrix);
      });
      pt.instanceMatrix.needsUpdate = true;
      pp.instanceMatrix.needsUpdate = true;
    }
  }, [leafy, palms]);

  const hi = highlight !== null ? world.buildings.findIndex((b) => b.n === highlight) : -1;
  const hiGeo = useMemo(() => {
    if (hi < 0) return null;
    const b = world.buildings[hi]!;
    const shape = new THREE.Shape(b.p.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    g.translate(0, b.h + 1.1, 0);
    return g;
  }, [hi, world]);

  return (
    <group>
      <mesh geometry={statics.ground} material={toon({ color: "#7fb267", grass: true })} receiveShadow />
      {statics.green ? <mesh geometry={statics.green} material={toon({ color: "#6ea85a", grass: true })} receiveShadow /> : null}
      {statics.water ? <mesh geometry={statics.water} material={toon({ color: "#5fb6c2" })} /> : null}
      {statics.edges ? <mesh geometry={statics.edges} material={toon({ color: "#c9d3cd" })} receiveShadow /> : null}
      {statics.roads ? <mesh geometry={statics.roads} material={toon({ color: "#8c9894" })} receiveShadow /> : null}
      {statics.paths ? <mesh geometry={statics.paths} material={toon({ color: "#d9d2bf" })} receiveShadow /> : null}
      <mesh geometry={statics.walls} material={toon({ vertexColors: true, windows: true })} castShadow receiveShadow />
      <mesh geometry={statics.trim} material={toon({ vertexColors: true })} castShadow receiveShadow />
      {statics.glass ? <mesh geometry={statics.glass} material={toon({ vertexColors: true })} receiveShadow /> : null}
      <mesh geometry={statics.streets} material={toon({ vertexColors: true })} castShadow receiveShadow />
      <Signs signs={statics.signs} />
      {hiGeo ? <mesh geometry={hiGeo} material={toon({ color: "#ffd166", transparent: true, opacity: 0.45 })} userData={{ noInk: true }} /> : null}
      <instancedMesh ref={trunks} args={[undefined, undefined, leafy.length]} material={toon({ color: "#7a5b45" })} castShadow>
        <cylinderGeometry args={[0.22, 0.32, 3, 7]} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[CROWN, undefined, leafy.length]} material={toon({ color: "#ffffff", sway: true })} castShadow receiveShadow />
      <instancedMesh ref={palmTrunks} args={[undefined, undefined, palms.length]} material={toon({ color: "#8d7457" })} castShadow>
        <cylinderGeometry args={[0.16, 0.24, 1, 7]} />
      </instancedMesh>
      <instancedMesh ref={palmTops} args={[FRONDS, undefined, palms.length]} material={toon({ color: "#5c9a4a", sway: true })} castShadow />
    </group>
  );
}
