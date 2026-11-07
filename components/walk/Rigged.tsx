"use client";

import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Outfit } from "@/lib/walk/script";
import { bend, toonRamp } from "./curve";

/**
 * A rigged, animated student: Quaternius's Universal Base Characters with clips from the Universal Animation Library
 * (both CC0, packed by scripts/build-walk-characters.mjs). No textures: every vertex knows its body region (skin, top,
 * forearm, bottom, lower leg, shoes, eyes, brows, hair), and the shader paints it in the outfit's flat anime colours,
 * so every student is dressed in our own SRM outfits. Animation blends idle, walk and jog by speed; talking and
 * celebrating have their own clips; the head turns to look at you.
 */

export type RigAnim = { speed: number; wave: number; cheer: number; talk: number; look: number };

const BASE = "/walk/chars/";
export const HAIR_FILES = ["hair-short", "hair-buns", "hair-long", "hair-buzz", "hair-beard"];

/** Toon material that colours by region; one per character, so outfits change without new shaders. */
function regionMaterial(colors: THREE.Color[]) {
  const m = new THREE.MeshToonMaterial({ color: "#ffffff", gradientMap: toonRamp() });
  m.userData.live = colors;
  bend(m);
  const curved = m.onBeforeCompile;
  m.onBeforeCompile = (s, r) => {
    curved(s, r);
    s.uniforms.uRegion = { value: colors };
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float _region;\nuniform vec3 uRegion[9];\nvarying vec3 vRegionColor;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n  vRegionColor = uRegion[int(_region + 0.5)];");
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vRegionColor;")
      .replace("#include <color_fragment>", "#include <color_fragment>\n  diffuseColor.rgb *= vRegionColor;");
  };
  m.customProgramCacheKey = () => "bend-region";
  return m;
}

export function regionColors(o: Outfit, palette: { skin: string[]; hairColor: string[]; top: string[][]; bottom: string[]; shoes: string[] }) {
  const [top] = palette.top[o.top] ?? palette.top[0]!;
  const skin = palette.skin[o.skin]!;
  const hair = palette.hairColor[o.hairColor]!;
  const shortSleeves = o.top === 1 || o.top === 6 || o.top === 7 || o.top === 0;
  const shorts = o.bottom === 3;
  return [
    skin, // 0 skin
    top!, // 1 top
    shortSleeves ? skin : top!, // 2 forearm
    palette.bottom[o.bottom]!, // 3 bottom
    shorts ? skin : palette.bottom[o.bottom]!, // 4 lower leg
    palette.shoes[o.shoes]!, // 5 shoes
    "#241c22", // 6 eyes
    hair, // 7 brows
    hair, // 8 hair
  ].map((c) => new THREE.Color(c));
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tmpQ = new THREE.Quaternion();
const tmpQ2 = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

export function RiggedCharacter({ outfit, colors, anim }: { outfit: Outfit; colors: THREE.Color[]; anim: React.RefObject<RigAnim> }) {
  const body = useLoader(GLTFLoader, `${BASE}${outfit.body ? "body-b" : "body-a"}.glb`);
  const hair = useLoader(GLTFLoader, `${BASE}${HAIR_FILES[outfit.hair] ?? HAIR_FILES[0]}.glb`);
  const clips = useLoader(GLTFLoader, `${BASE}anims.glb`);

  // One material per student; its colour array is updated in place when the outfit changes.
  const material = useMemo(() => regionMaterial(Array.from({ length: 9 }, () => new THREE.Color())), []);
  useEffect(() => () => material.dispose(), [material]);

  const rig = useMemo(() => {
    const root = cloneSkinned(body.scene) as THREE.Group;
    const meshes: THREE.SkinnedMesh[] = [];
    root.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(o as THREE.SkinnedMesh);
    });
    const main = meshes.find((m) => /Superhero|Retopology/.test(m.name)) ?? meshes[0]!;
    // The hairstyle shares this body's skeleton.
    let hairGeo: THREE.BufferGeometry | null = null;
    hair.scene.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh && !hairGeo) hairGeo = (o as THREE.SkinnedMesh).geometry;
    });
    if (hairGeo) {
      const hm = new THREE.SkinnedMesh(hairGeo, material);
      hm.bind(main.skeleton, main.bindMatrix);
      main.parent!.add(hm);
      meshes.push(hm);
    }
    for (const m of meshes) {
      m.material = material;
      m.castShadow = true;
      m.frustumCulled = false;
    }
    const head = main.skeleton.getBoneByName("Head") ?? null;
    // A slightly larger head: an anime cue.
    head?.scale.setScalar(1.09);
    return { root, head };
  }, [body, hair, material]);

  const mixer = useMemo(() => new THREE.AnimationMixer(rig.root), [rig]);
  const actions = useMemo(() => Object.fromEntries(clips.animations.map((c) => [c.name, mixer.clipAction(c)])), [clips, mixer]);
  useEffect(() => {
    for (const a of Object.values(actions)) {
      a.play();
      a.setEffectiveWeight(0);
    }
    // Different students start their loops at different moments.
    mixer.update(Math.random() * 2);
    return () => {
      mixer.stopAllAction();
    };
  }, [actions, mixer]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const a = anim.current;
    // Outfit colours, updated in place (no shader rebuild).
    const live = material.userData.live as THREE.Color[];
    for (let i = 0; i < live.length; i++) live[i]!.copy(colors[i]!);
    const v = a.speed;
    const walkW = v < 3.2 ? clamp01(v / 0.9) : clamp01(1 - (v - 3.2) / 1.4);
    const jogW = v > 3.2 ? clamp01((v - 3.2) / 1.4) : 0;
    const cheer = a.cheer > 0 ? 1 : 0;
    const wave = a.wave > 0 ? 1 : 0;
    const talking = a.talk > 0 || wave ? 1 : 0;
    const still = clamp01(1 - walkW - jogW);
    const set = (name: string, w: number, scale = 1) => {
      const act = actions[name];
      if (!act) return;
      act.setEffectiveWeight(w);
      act.setEffectiveTimeScale(scale);
    };
    set("Walk_Loop", walkW * (1 - cheer), Math.max(0.7, Math.min(2.2, v / 1.45)));
    set("Jog_Fwd_Loop", jogW * (1 - cheer), Math.max(0.8, Math.min(1.8, v / 3.7)));
    set("Idle_Talking_Loop", still * talking * (1 - cheer));
    set("Idle_Loop", still * (1 - talking) * (1 - cheer));
    set("Dance_Loop", cheer);
    if (a.cheer > 0) a.cheer -= dt;
    if (a.wave > 0) a.wave -= dt;
    if (a.talk > 0) a.talk -= dt;
    mixer.update(dt);
    // Look at whoever is near: a yaw around world up, applied to the head after the clip.
    if (rig.head && Math.abs(a.look) > 0.01) {
      const parent = rig.head.parent!;
      parent.getWorldQuaternion(tmpQ);
      tmpQ2.setFromAxisAngle(UP, Math.max(-0.9, Math.min(0.9, a.look)));
      const local = tmpQ.clone().invert().multiply(tmpQ2).multiply(tmpQ);
      rig.head.quaternion.premultiply(local);
    }
  });

  return <primitive object={rig.root} />;
}
