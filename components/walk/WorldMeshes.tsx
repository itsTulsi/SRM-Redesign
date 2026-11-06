"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { World, XZ } from "@/lib/walk/world";
import { toon } from "./curve";

/** Wall colours by building kind (k): soft, sunlit Chennai pastels; roofs a touch lighter. */
const KIND_COLORS = ["#e9e2d6", "#f1e4c8", "#f6d6d0", "#ffd99a", "#cfe3f2", "#e8f0ee", "#ffe1b8", "#d8d3e8", "#f3dcf0", "#ece6dc"];

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

function extrude(p: XZ[], h: number) {
  const shape = new THREE.Shape(p.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return g;
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
  // Round joints, so bends don't show gaps.
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
/** Paint every vertex of a geometry one colour (roofs lighter), so all buildings draw in a single call. */
function paint(g: THREE.BufferGeometry, wall: THREE.Color, roof: THREE.Color) {
  const n = g.getAttribute("normal");
  const cols = new Float32Array(n.count * 3);
  for (let i = 0; i < n.count; i++) {
    const c = n.getY(i) > 0.5 ? roof : wall;
    cols.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  return g;
}

export function WorldMeshes({ world, highlight }: { world: World; highlight: string | null }) {
  const statics = useMemo(() => {
    const wall = new THREE.Color();
    const roof = new THREE.Color();
    const buildings = mergeGeometries(
      world.buildings.map((b) => {
        wall.set(KIND_COLORS[b.k] ?? KIND_COLORS[0]!);
        roof.copy(wall).offsetHSL(0, -0.05, 0.07);
        return paint(extrude(b.p, b.h), wall, roof);
      }),
    );
    const roads = world.roads.filter((r) => !r.f);
    const paths = world.roads.filter((r) => r.f);
    return {
      buildings,
      roads: roads.length ? tessellate(mergeGeometries(roads.map((r) => ribbon(r.p, r.w, 0.05))), 10) : null,
      edges: roads.length ? tessellate(mergeGeometries(roads.map((r) => ribbon(r.p, r.w + 1.6, 0.03))), 10) : null,
      paths: paths.length ? tessellate(mergeGeometries(paths.map((r) => ribbon(r.p, r.w, 0.07))), 10) : null,
      water: world.water.length ? tessellate(mergeGeometries(world.water.map((w) => flat(w.p, 0.12))), 12) : null,
      green: world.green.length ? tessellate(mergeGeometries(world.green.map((w) => flat(w.p, 0.02))), 12) : null,
      ground: (() => {
        const b = world.bounds;
        const g = new THREE.PlaneGeometry(b.maxX - b.minX + 900, b.maxZ - b.minZ + 900, 120, 100);
        g.rotateX(-Math.PI / 2);
        g.translate((b.minX + b.maxX) / 2, -0.02, (b.minZ + b.maxZ) / 2);
        return g;
      })(),
    };
  }, [world]);
  useEffect(() => () => Object.values(statics).forEach((g) => g?.dispose()), [statics]);

  // Trees: two instanced meshes (trunks and round canopies), swaying a little in the wind.
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const t = trunks.current;
    const c = crowns.current;
    if (!t || !c) return;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    world.trees.forEach(([x, z, s], i) => {
      o.position.set(x, 1.6 * s, z);
      o.scale.set(s, s, s);
      o.rotation.set(0, i, 0);
      o.updateMatrix();
      t.setMatrixAt(i, o.matrix);
      o.position.set(x, 4.6 * s, z);
      o.scale.set(s * (1 + ((i * 13) % 5) / 10), s * (0.9 + ((i * 7) % 5) / 10), s);
      o.updateMatrix();
      c.setMatrixAt(i, o.matrix);
      c.setColorAt(i, col.set(["#5aa469", "#6fb26b", "#4c9a5f", "#7cbf6a", "#3f8d58"][i % 5]!));
    });
    t.instanceMatrix.needsUpdate = true;
    c.instanceMatrix.needsUpdate = true;
    if (c.instanceColor) c.instanceColor.needsUpdate = true;
  }, [world]);

  const hi = highlight !== null ? world.buildings.findIndex((b) => b.n === highlight) : -1;
  const hiGeo = useMemo(() => (hi >= 0 ? extrude(world.buildings[hi]!.p, world.buildings[hi]!.h + 0.3) : null), [hi, world]);

  return (
    <group>
      {/* Ground: grass in small squares, so it bends with the world and takes fog per square metre, not per corner. */}
      <mesh geometry={statics.ground} material={toon({ color: "#9fd47c" })} />
      {statics.green ? <mesh geometry={statics.green} material={toon({ color: "#8cc47a" })} /> : null}
      {statics.water ? <mesh geometry={statics.water} material={toon({ color: "#6cc3e0" })} /> : null}
      {statics.edges ? <mesh geometry={statics.edges} material={toon({ color: "#f4ecdc" })} /> : null}
      {statics.roads ? <mesh geometry={statics.roads} material={toon({ color: "#9d9aa6" })} /> : null}
      {statics.paths ? <mesh geometry={statics.paths} material={toon({ color: "#e9d9b8" })} /> : null}
      <mesh geometry={statics.buildings} material={toon({ vertexColors: true, windows: true })} />
      {hiGeo ? <mesh geometry={hiGeo} material={toon({ color: "#ffd166", transparent: true, opacity: 0.35 })} /> : null}
      <instancedMesh ref={trunks} args={[undefined, undefined, world.trees.length]} material={toon({ color: "#8a6a4f" })}>
        <cylinderGeometry args={[0.25, 0.35, 3.2, 6]} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, world.trees.length]} material={toon({ color: "#ffffff", sway: true })}>
        <icosahedronGeometry args={[2.4, 0]} />
      </instancedMesh>
    </group>
  );
}
