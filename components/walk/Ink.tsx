"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { bend } from "./curve";

/**
 * The anime "ink" look: the scene is drawn once in colour (with depth) and once as surface directions, then a
 * full-screen pass draws dark, slightly wobbly lines wherever depth or direction changes, like a hand-inked cel.
 * Objects marked userData.noInk (soft shadows, the beacon, the sky) are left out of the line pass.
 * `lines: false` (Low graphics) keeps the cel colours and draws lines from depth only, which is cheaper.
 */
const quadVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const quadFrag = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tNormal;
uniform vec2 uRes;
uniform float uNear;
uniform float uFar;
uniform float uScale;
uniform float uNormals;
uniform vec3 uInk;
uniform float uTime;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float lin(vec2 uv) {
  float z = texture2D(tDepth, uv).x * 2.0 - 1.0;
  return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
}
vec3 nrm(vec2 uv) { return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }

void main() {
  vec2 px = uScale / uRes;
  // A little hand-drawn wobble: the sample grid shifts in small cells.
  vec2 cell = floor(vUv * uRes / 5.0);
  vec2 wob = (vec2(hash(cell), hash(cell + 17.0)) - 0.5) * px * 0.9;
  vec2 uv = vUv + wob;
  float d = lin(uv);
  float dl = lin(uv - vec2(px.x, 0.0));
  float dr = lin(uv + vec2(px.x, 0.0));
  float du = lin(uv + vec2(0.0, px.y));
  float dd = lin(uv - vec2(0.0, px.y));
  // Depth lines: a jump relative to distance (silhouettes), ignoring smooth slopes.
  float lap = abs(dl + dr + du + dd - 4.0 * d) / max(d, 0.5);
  float edge = smoothstep(0.035, 0.09, lap);
  if (uNormals > 0.5) {
    vec3 n = nrm(uv);
    float nd = 0.0;
    nd = max(nd, 1.0 - dot(n, nrm(uv - vec2(px.x, 0.0))));
    nd = max(nd, 1.0 - dot(n, nrm(uv + vec2(px.x, 0.0))));
    nd = max(nd, 1.0 - dot(n, nrm(uv + vec2(0.0, px.y))));
    nd = max(nd, 1.0 - dot(n, nrm(uv - vec2(0.0, px.y))));
    edge = max(edge, smoothstep(0.18, 0.45, nd));
  }
  // Lines thin out and fade into the haze far away.
  edge *= 1.0 - smoothstep(110.0, 260.0, d);
  vec3 col = texture2D(tColor, vUv).rgb;
  // Paper grain, very light.
  col *= 0.985 + 0.03 * hash(floor(vUv * uRes) + floor(uTime * 8.0) * 0.0);
  col = mix(col, uInk, edge * 0.88);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export function Ink({ lines = true }: { lines?: boolean }) {
  const { gl, scene, camera, size } = useThree();
  const dpr = gl.getPixelRatio();
  const targets = useMemo(() => {
    const color = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    color.depthTexture = new THREE.DepthTexture(1, 1);
    color.depthTexture.type = THREE.UnsignedIntType;
    const normal = new THREE.WebGLRenderTarget(1, 1);
    return { color, normal };
  }, []);
  const normalMat = useMemo(() => bend(new THREE.MeshNormalMaterial()), []);
  const quad = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: quadVert,
      fragmentShader: quadFrag,
      uniforms: {
        tColor: { value: targets.color.texture },
        tDepth: { value: targets.color.depthTexture },
        tNormal: { value: targets.normal.texture },
        uRes: { value: new THREE.Vector2(1, 1) },
        uNear: { value: 0.5 },
        uFar: { value: 1400 },
        uScale: { value: 1 },
        uNormals: { value: 1 },
        uInk: { value: new THREE.Color("#1d2330") },
        uTime: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    const s = new THREE.Scene();
    s.add(mesh);
    return { scene: s, mat, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, [targets]);

  useEffect(() => {
    const w = Math.max(1, Math.floor(size.width * dpr));
    const h = Math.max(1, Math.floor(size.height * dpr));
    targets.color.setSize(w, h);
    targets.normal.setSize(w, h);
    quad.mat.uniforms.uRes!.value.set(w, h);
    quad.mat.uniforms.uScale!.value = Math.max(1, dpr * 0.9);
  }, [size, dpr, targets, quad]);
  useEffect(
    () => () => {
      targets.color.dispose();
      targets.normal.dispose();
      quad.mat.dispose();
      normalMat.dispose();
    },
    [targets, quad, normalMat],
  );

  const hidden: THREE.Object3D[] = [];
  useFrame((state) => {
    const cam = camera as THREE.PerspectiveCamera;
    quad.mat.uniforms.uNear!.value = cam.near;
    quad.mat.uniforms.uFar!.value = cam.far;
    quad.mat.uniforms.uTime!.value = state.clock.elapsedTime;
    quad.mat.uniforms.uNormals!.value = lines ? 1 : 0;
    // 1. Colour + depth.
    gl.setRenderTarget(targets.color);
    gl.render(scene, camera);
    // 2. Surface directions (without the soft, see-through things).
    if (lines) {
      hidden.length = 0;
      scene.traverseVisible((o) => {
        if (o.userData.noInk) hidden.push(o);
      });
      for (const o of hidden) o.visible = false;
      const bg = scene.background;
      const fog = scene.fog;
      scene.background = null;
      scene.fog = null;
      scene.overrideMaterial = normalMat;
      gl.setRenderTarget(targets.normal);
      gl.setClearColor(0x8080ff, 1);
      gl.clear();
      gl.render(scene, camera);
      scene.overrideMaterial = null;
      scene.background = bg;
      scene.fog = fog;
      for (const o of hidden) o.visible = true;
    }
    // 3. Ink.
    gl.setRenderTarget(null);
    gl.render(quad.scene, quad.cam);
  }, 1);
  return null;
}
