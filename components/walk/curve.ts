import * as THREE from "three";

/**
 * The "tiny planet" look (Messenger-style): every material is bent so the ground falls away with distance from the
 * player, like walking on a small round world. The world itself stays flat (collision, paths and the map use real
 * metres); only what you see curves. Shared uniforms, so one update per frame moves the whole world.
 */
export const curve = {
  uCurve: { value: 0.00042 },
  uCenter: { value: new THREE.Vector2() },
  uNight: { value: 0 },
  uTime: { value: 0 },
};

/** Visual drop at a world point: the same formula as the shader, so DOM labels sit on the bent world. */
export const dropAt = (x: number, z: number) => {
  const dx = x - curve.uCenter.value.x;
  const dz = z - curve.uCenter.value.y;
  return (dx * dx + dz * dz) * curve.uCurve.value;
};

// A three-step toon ramp: flat, friendly shading.
let ramp: THREE.DataTexture | null = null;
const toonRamp = () => {
  if (ramp) return ramp;
  const data = new Uint8Array([178, 178, 178, 255, 222, 222, 222, 255, 255, 255, 255, 255]);
  ramp = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  ramp.minFilter = THREE.NearestFilter;
  ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  return ramp;
};

type Opts = { color?: THREE.ColorRepresentation; vertexColors?: boolean; windows?: boolean; sway?: boolean; transparent?: boolean; opacity?: number; emissive?: THREE.ColorRepresentation };

const cache = new Map<string, THREE.Material>();

/** A bent toon material; identical requests share one material (and one shader program). */
export function toon(opts: Opts = {}): THREE.MeshToonMaterial {
  const key = JSON.stringify(opts);
  const hit = cache.get(key);
  if (hit) return hit as THREE.MeshToonMaterial;
  const m = new THREE.MeshToonMaterial({
    color: opts.color ?? "#ffffff",
    gradientMap: toonRamp(),
    vertexColors: !!opts.vertexColors,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    emissive: opts.emissive ?? "#000000",
  });
  if (opts.transparent) m.depthWrite = false;
  bend(m, opts);
  cache.set(key, m);
  return m;
}

export function bend<T extends THREE.Material>(m: T, opts: Pick<Opts, "windows" | "sway"> = {}): T {
  m.onBeforeCompile = (s) => {
    s.uniforms.uCurve = curve.uCurve;
    s.uniforms.uCenter = curve.uCenter;
    s.uniforms.uNight = curve.uNight;
    s.uniforms.uTime = curve.uTime;
    s.vertexShader = s.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uCurve;\nuniform vec2 uCenter;\nuniform float uTime;\nvarying vec3 vWorld;\nvarying vec3 vWNormal;",
      )
      .replace(
        "#include <project_vertex>",
        `vec4 wp = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  wp = instanceMatrix * wp;
#endif
  wp = modelMatrix * wp;
  ${opts.sway ? "wp.x += sin(uTime * 1.3 + wp.x * 0.15 + wp.z * 0.11) * max(0.0, transformed.y - 1.0) * 0.06;" : ""}
  vWorld = wp.xyz;
  vWNormal = normalize(mat3(modelMatrix) * objectNormal);
  vec2 dd = wp.xz - uCenter;
  wp.y -= dot(dd, dd) * uCurve;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;`,
      );
    s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uNight;\nvarying vec3 vWorld;\nvarying vec3 vWNormal;");
    if (opts.windows) {
      s.fragmentShader = s.fragmentShader
        .replace("void main() {", "void main() {\n  float winMask = 0.0;")
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
  if (abs(vWNormal.y) < 0.5 && vWorld.y > 2.2) {
    float along = abs(vWNormal.x) > abs(vWNormal.z) ? vWorld.z : vWorld.x;
    float row = fract(vWorld.y / 3.4);
    float col = fract(along / 2.8);
    winMask = step(0.42, row) * step(row, 0.76) * step(0.3, col) * step(col, 0.7);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.36, 0.46), winMask * 0.75);
  }`,
        )
        .replace("#include <dithering_fragment>", "#include <dithering_fragment>\n  gl_FragColor.rgb += winMask * uNight * vec3(1.0, 0.8, 0.5) * 0.4;");
    }
  };
  m.customProgramCacheKey = () => `bend${opts.windows ? "w" : ""}${opts.sway ? "s" : ""}`;
  return m;
}
