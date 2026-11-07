// node scripts/build-walk-characters.mjs <Universal Base Characters dir> <UAL1_Standard.glb>
//
// Turns Quaternius's free Universal Base Characters and Universal Animation Library (both CC0, quaternius.com) into small
// files for Walk SRM (public/walk/chars/):
//   body-a.glb, body-b.glb   bodies with their skeleton; only position, normal, joints, weights, plus a _REGION per
//                            vertex (skin, top, forearm, bottom, lower leg, shoes, eyes, brows) so each student is
//                            dressed in flat anime colours by the shader. No textures: the outfits are ours.
//   hair-*.glb               hairstyles, skinned to the same skeleton
//   anims.glb                only the clips we use; rotations for every bone, position for the pelvis only, so the
//                            clips fit both bodies
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const [charsDir, animGlb] = process.argv.slice(2);
if (!charsDir || !animGlb) throw new Error("usage: node scripts/build-walk-characters.mjs <Universal Base Characters dir> <UAL1_Standard.glb>");
const OUT = new URL("../public/walk/chars/", import.meta.url);
mkdirSync(OUT, { recursive: true });

const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function readGltf(path) {
  if (path.endsWith(".glb")) {
    const b = readFileSync(path);
    const jsonLen = b.readUInt32LE(12);
    const json = JSON.parse(b.subarray(20, 20 + jsonLen).toString());
    const binStart = 20 + jsonLen + 8;
    const binLen = b.readUInt32LE(20 + jsonLen);
    return { json, bin: b.subarray(binStart, binStart + binLen) };
  }
  const json = JSON.parse(readFileSync(path, "utf8"));
  const bin = readFileSync(join(path, "..", json.buffers[0].uri));
  return { json, bin };
}

/** Typed-array view of an accessor (tightly packed copy). */
function accessorData({ json, bin }, i) {
  const a = json.accessors[i];
  const bv = json.bufferViews[a.bufferView];
  const T = COMP[a.componentType];
  const n = SIZE[a.type];
  const stride = bv.byteStride ?? 0;
  const off = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const out = new T(a.count * n);
  if (!stride || stride === n * T.BYTES_PER_ELEMENT) {
    const src = new T(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + out.byteLength));
    out.set(src);
  } else {
    for (let k = 0; k < a.count; k++) {
      const src = new T(bin.buffer.slice(bin.byteOffset + off + k * stride, bin.byteOffset + off + k * stride + n * T.BYTES_PER_ELEMENT));
      out.set(src, k * n);
    }
  }
  return { a, data: out };
}

/** A tiny GLB writer: add accessors from typed arrays, then write JSON + BIN chunks. */
class Writer {
  constructor() {
    this.json = { asset: { version: "2.0", generator: "srm-walk build-walk-characters" }, buffers: [{ byteLength: 0 }], bufferViews: [], accessors: [] };
    this.chunks = [];
    this.length = 0;
  }
  add(data, template, target) {
    const pad = (4 - (this.length % 4)) % 4;
    if (pad) {
      this.chunks.push(Buffer.alloc(pad));
      this.length += pad;
    }
    const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    this.json.bufferViews.push({ buffer: 0, byteOffset: this.length, byteLength: buf.length, ...(target ? { target } : {}) });
    this.chunks.push(buf);
    this.length += buf.length;
    const acc = { bufferView: this.json.bufferViews.length - 1, componentType: template.componentType, count: template.count, type: template.type };
    if (template.normalized) acc.normalized = true;
    if (template.min) acc.min = template.min;
    if (template.max) acc.max = template.max;
    this.json.accessors.push(acc);
    return this.json.accessors.length - 1;
  }
  write(file) {
    this.json.buffers[0].byteLength = this.length;
    let js = Buffer.from(JSON.stringify(this.json));
    js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
    let bin = Buffer.concat(this.chunks);
    bin = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
    const head = Buffer.alloc(12);
    head.writeUInt32LE(0x46546c67, 0);
    head.writeUInt32LE(2, 4);
    head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
    const c1 = Buffer.alloc(8);
    c1.writeUInt32LE(js.length, 0);
    c1.writeUInt32LE(0x4e4f534a, 4);
    const c2 = Buffer.alloc(8);
    c2.writeUInt32LE(bin.length, 0);
    c2.writeUInt32LE(0x004e4942, 4);
    const out = Buffer.concat([head, c1, js, c2, bin]);
    writeFileSync(new URL(file, OUT), out);
    return out.length;
  }
}

// Body regions (the shader colours each one): 0 skin · 1 top · 2 forearm · 3 bottom · 4 lower leg · 5 shoes · 6 eyes · 7 brows · 8 hair
const regionOfBone = (name) => {
  if (/^(Head|neck_01|hand_|index_|middle_|pinky_|ring_|thumb_)/.test(name)) return 0;
  if (/^(spine_0[123]|clavicle_|upperarm_)/.test(name)) return 1;
  if (/^lowerarm_/.test(name)) return 2;
  if (/^(pelvis|thigh_|root)/.test(name)) return 3;
  if (/^calf_/.test(name)) return 4;
  if (/^(foot_|ball_)/.test(name)) return 5;
  return 1;
};

/** Copy a skinned model: meshes (position, normal, joints, weights, _REGION), nodes, skin. Materials are placeholders. */
function packModel(src, file, regionFor) {
  const w = new Writer();
  const { json } = src;
  const jointNames = json.skins[0].joints.map((j) => json.nodes[j].name);
  w.json.nodes = json.nodes.map((n) => {
    const o = { name: n.name };
    for (const k of ["translation", "rotation", "scale", "children", "mesh", "skin"]) if (n[k] !== undefined) o[k] = n[k];
    return o;
  });
  w.json.scenes = json.scenes;
  w.json.scene = json.scene ?? 0;
  w.json.materials = [{ name: "srm-walk" }];
  w.json.meshes = json.meshes.map((m) => ({
    name: m.name,
    primitives: m.primitives.map((p) => {
      const pos = accessorData(src, p.attributes.POSITION);
      const nrm = accessorData(src, p.attributes.NORMAL);
      const jnt = accessorData(src, p.attributes.JOINTS_0);
      const wgt = accessorData(src, p.attributes.WEIGHTS_0);
      const count = pos.a.count;
      const region = new Float32Array(count);
      const wv = wgt.a.componentType === 5126 ? wgt.data : Float32Array.from(wgt.data, (x) => x / (wgt.a.componentType === 5121 ? 255 : 65535));
      for (let v = 0; v < count; v++) {
        let best = 0;
        for (let k = 1; k < 4; k++) if (wv[v * 4 + k] > wv[v * 4 + best]) best = k;
        region[v] = regionFor(m.name, jointNames[jnt.data[v * 4 + best]]);
      }
      const attributes = {
        POSITION: w.add(pos.data, pos.a, 34962),
        NORMAL: w.add(nrm.data, nrm.a, 34962),
        JOINTS_0: w.add(jnt.data, jnt.a, 34962),
        WEIGHTS_0: w.add(wgt.data, wgt.a, 34962),
        _REGION: w.add(region, { componentType: 5126, count, type: "SCALAR" }, 34962),
      };
      const out = { attributes, material: 0 };
      if (p.indices !== undefined) {
        const idx = accessorData(src, p.indices);
        out.indices = w.add(idx.data, idx.a, 34963);
      }
      return out;
    }),
  }));
  const ibm = accessorData(src, json.skins[0].inverseBindMatrices);
  w.json.skins = [{ joints: json.skins[0].joints, inverseBindMatrices: w.add(ibm.data, ibm.a), ...(json.skins[0].skeleton !== undefined ? { skeleton: json.skins[0].skeleton } : {}) }];
  return w.write(file);
}

const base = join(charsDir, "Base Characters", "Godot - UE");
const hairDir = join(charsDir, "Hairstyles", "Rigged to Head Bone", "glTF (Godot -Unreal)");
const bodyRegion = (mesh, bone) => (/eye/i.test(mesh) && !/brow/i.test(mesh) ? 6 : /brow|^Face$/i.test(mesh) ? 7 : /^Face\.001$/.test(mesh) ? 6 : regionOfBone(bone));
const sizes = {};
sizes["body-a.glb"] = packModel(readGltf(join(base, "Superhero_Male_FullBody.gltf")), "body-a.glb", bodyRegion);
sizes["body-b.glb"] = packModel(readGltf(join(base, "Superhero_Female_FullBody.gltf")), "body-b.glb", bodyRegion);
for (const [name, file] of [
  ["hair-short", "Hair_SimpleParted"],
  ["hair-buns", "Hair_Buns"],
  ["hair-long", "Hair_Long"],
  ["hair-buzz", "Hair_Buzzed"],
  ["hair-beard", "Hair_Beard"],
]) {
  sizes[`${name}.glb`] = packModel(readGltf(join(hairDir, `${file}.gltf`)), `${name}.glb`, () => 8);
}

// ── Animations ──
const KEEP = ["Idle_Loop", "Walk_Loop", "Jog_Fwd_Loop", "Sprint_Loop", "Idle_Talking_Loop", "Dance_Loop", "Interact"];
{
  const src = readGltf(animGlb);
  const { json } = src;
  const w = new Writer();
  // Nodes by name only: three.js binds clips to bones by name.
  const used = new Set();
  const anims = [];
  for (const a of json.animations.filter((x) => KEEP.includes(x.name))) {
    const samplers = [];
    const channels = [];
    for (const ch of a.channels) {
      const node = json.nodes[ch.target.node].name;
      const keep = ch.target.path === "rotation" || (ch.target.path === "translation" && node === "pelvis");
      if (!keep) continue;
      const s = a.samplers[ch.sampler];
      const input = accessorData(src, s.input);
      const output = accessorData(src, s.output);
      samplers.push({ input: w.add(input.data, input.a), output: w.add(output.data, output.a), interpolation: s.interpolation ?? "LINEAR" });
      channels.push({ sampler: samplers.length - 1, target: { node: ch.target.node, path: ch.target.path } });
      used.add(ch.target.node);
    }
    anims.push({ name: a.name, samplers, channels });
  }
  w.json.nodes = json.nodes.map((n) => ({ name: n.name, ...(n.children ? { children: n.children } : {}) }));
  w.json.scenes = [{ nodes: json.scenes[json.scene ?? 0].nodes }];
  w.json.scene = 0;
  w.json.animations = anims;
  sizes["anims.glb"] = w.write("anims.glb");
  console.log("clips:", anims.map((a) => a.name).join(", "));
}
for (const [f, n] of Object.entries(sizes)) console.log(`${f.padEnd(16)} ${(n / 1024).toFixed(0)} KB`);
