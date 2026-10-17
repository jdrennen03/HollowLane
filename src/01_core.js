import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// ---------------------------------------------------------------- utils
const V3 = THREE.Vector3;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let WR = mulberry32(90210);            // deterministic world rng (identical for every player)
const wr = (a = 0, b = 1) => a + WR() * (b - a);
const rr = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const r2 = v => Math.round(v * 100) / 100;
const FY = 0.4;            // house floor height
const WALL_H = 2.7;        // interior wall height
const CEIL = FY + WALL_H;  // ceiling height

// ---------------------------------------------------------------- tileable value noise
function hash2(x, y, s) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, px, py, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px, y0 = ((yi % py) + py) % py, y1 = (y0 + 1) % py;
  const a = hash2(x0, y0, s), b = hash2(x1, y0, s), c = hash2(x0, y1, s), d = hash2(x1, y1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// u,v in [0,1): px,py integer base frequency; tileable
function fbm(u, v, px, py, oct = 4, s = 1) {
  let t = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { t += amp * vnoise(u * px * f, v * py * f, px * f, py * f, s + i * 31); n += amp; amp *= 0.5; f *= 2; }
  return t / n;
}

// ---------------------------------------------------------------- canvas textures
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function canvasTex(c, srgb = true, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// Generic PBR map generator: fn(u,v,o) sets o.r,o.g,o.b (0..1), o.h (height 0..1), o.ro (roughness 0..1)
function genMaps(size, fn, normalStrength = 2) {
  const [cc, cx] = mkCanvas(size, size), [rc, rx] = mkCanvas(size, size), [nc, nx] = mkCanvas(size, size);
  const col = cx.createImageData(size, size), rou = rx.createImageData(size, size), nor = nx.createImageData(size, size);
  const H = new Float32Array(size * size);
  const o = { r: 0, g: 0, b: 0, h: 0, ro: 0.8 };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    o.h = 0.5; o.ro = 0.8;
    fn(x / size, 1 - y / size, o);
    const i = y * size + x, j = i * 4;
    col.data[j] = clamp(o.r, 0, 1) * 255; col.data[j + 1] = clamp(o.g, 0, 1) * 255; col.data[j + 2] = clamp(o.b, 0, 1) * 255; col.data[j + 3] = 255;
    const rv = clamp(o.ro, 0, 1) * 255; rou.data[j] = rv; rou.data[j + 1] = rv; rou.data[j + 2] = rv; rou.data[j + 3] = 255;
    H[i] = o.h;
  }
  const s = normalStrength * size / 256;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const xl = (x - 1 + size) % size, xr = (x + 1) % size, yu = (y - 1 + size) % size, yd = (y + 1) % size;
    const dx = (H[y * size + xr] - H[y * size + xl]) * s;
    const dy = (H[yu * size + x] - H[yd * size + x]) * s;
    let nxv = -dx, nyv = -dy, nz = 1; const l = Math.hypot(nxv, nyv, nz); nxv /= l; nyv /= l; nz /= l;
    const j = (y * size + x) * 4;
    nor.data[j] = (nxv * 0.5 + 0.5) * 255; nor.data[j + 1] = (nyv * 0.5 + 0.5) * 255; nor.data[j + 2] = (nz * 0.5 + 0.5) * 255; nor.data[j + 3] = 255;
  }
  cx.putImageData(col, 0, 0); rx.putImageData(rou, 0, 0); nx.putImageData(nor, 0, 0);
  return { map: canvasTex(cc), roughnessMap: canvasTex(rc, false), normalMap: canvasTex(nc, false) };
}
const fract = x => x - Math.floor(x);
function setRGB(o, r, g, b) { o.r = r; o.g = g; o.b = b; }
function mixc(o, r, g, b, t) { o.r = lerp(o.r, r, t); o.g = lerp(o.g, g, t); o.b = lerp(o.b, b, t); }

const TEX = {};
function buildTextures() {
  // ---- wood floor planks (texture spans 1.6m x 1.6m)
  TEX.woodFloor = genMaps(512, (u, v, o) => {
    const rows = 9, row = Math.floor(v * rows), fv = fract(v * rows);
    const off = hash2(row, 7, 3), seg = Math.floor(u * 2 + off), fu = fract(u * 2 + off);
    const ph = hash2(row, seg, 5);
    const grain = fbm(u, v, 3, 60, 4, 11 + row);
    const ring = Math.sin((u * 40 + grain * 6 + ph * 20)) * 0.5 + 0.5;
    const base = 0.32 + ph * 0.16;
    setRGB(o, base * (0.95 + ring * 0.12) + grain * 0.06, base * 0.62 * (0.95 + ring * 0.1) + grain * 0.04, base * 0.38);
    const dirt = fbm(u, v, 4, 4, 4, 77);
    const k = smooth(0.45, 0.8, dirt) * 0.45; mixc(o, 0.08, 0.06, 0.05, k);
    let gap = Math.min(fv, 1 - fv) * rows * 1.6 / 0.008; const gapE = Math.min(fu, 1 - fu) * 1.6 / 2 / 0.006;
    const g = Math.min(1, gap, gapE);
    o.r *= 0.35 + 0.65 * g; o.g *= 0.35 + 0.65 * g; o.b *= 0.35 + 0.65 * g;
    o.h = 0.6 * g + grain * 0.15 + ring * 0.03;
    o.ro = 0.48 + grain * 0.2 + k * 0.4 + (1 - g) * 0.3;
  }, 3);
  // ---- wallpapers (span 1.0m)
  const wallpaper = (c1, c2, kind, seed) => genMaps(512, (u, v, o) => {
    let m = 0;
    if (kind === 'damask') {
      const cu = fract(u * 4) - 0.5, cv = fract(v * 3 + (Math.floor(u * 4) % 2) * 0.5) - 0.5;
      const r = Math.hypot(cu * 1.3, cv);
      m = smooth(0.32, 0.3, r) * (0.5 + 0.5 * Math.cos(Math.atan2(cv, cu) * 4 + r * 20)) + smooth(0.06, 0.04, Math.abs(r - 0.38)) * 0.6;
    } else if (kind === 'stripe') {
      const s = fract(u * 8); m = (s < 0.12 ? 1 : 0) + (Math.abs(s - 0.5) < 0.03 ? 0.6 : 0);
    } else if (kind === 'floral') {
      const cu = fract(u * 5 + Math.floor(v * 5) * 0.5) - 0.5, cv = fract(v * 5) - 0.5, a = Math.atan2(cv, cu), r = Math.hypot(cu, cv);
      m = smooth(0.2, 0.17, r - 0.06 * Math.cos(a * 5)) * 0.9 + smooth(0.05, 0.03, r) * 0.4;
    } else if (kind === 'stars') {
      const cu = fract(u * 6 + Math.floor(v * 6) * 0.5) - 0.5, cv = fract(v * 6) - 0.5, a = Math.atan2(cv, cu), r = Math.hypot(cu, cv);
      m = smooth(0.13, 0.11, r * (1 + 0.45 * Math.cos(a * 5)));
    }
    setRGB(o, lerp(c1[0], c2[0], m), lerp(c1[1], c2[1], m), lerp(c1[2], c2[2], m));
    const n = fbm(u, v, 6, 6, 5, seed);
    const stain = smooth(0.55, 0.85, fbm(u, v, 2, 2, 4, seed + 9) + (v - 0.5) * 0.25);
    mixc(o, 0.18, 0.14, 0.08, stain * 0.55);
    o.r *= 0.86 + n * 0.22; o.g *= 0.86 + n * 0.22; o.b *= 0.86 + n * 0.2;
    // peeling seams every 0.5m
    const seam = Math.abs(fract(u * 2) - 0.5);
    if (seam > 0.495) { o.r *= 0.6; o.g *= 0.6; o.b *= 0.6; }
    o.h = 0.5 + m * 0.15 + n * 0.1 - (seam > 0.495 ? 0.2 : 0);
    o.ro = 0.85 - m * 0.15;
  }, 1.2);
  TEX.wpGreen = wallpaper([0.30, 0.36, 0.28], [0.42, 0.46, 0.34], 'damask', 3);
  TEX.wpRed = wallpaper([0.36, 0.13, 0.12], [0.47, 0.32, 0.22], 'stripe', 5);
  TEX.wpRose = wallpaper([0.52, 0.42, 0.40], [0.62, 0.50, 0.45], 'floral', 7);
  TEX.wpBlue = wallpaper([0.42, 0.52, 0.60], [0.70, 0.68, 0.52], 'stars', 9);
  TEX.wpBeige = wallpaper([0.52, 0.47, 0.36], [0.45, 0.40, 0.30], 'stripe', 11);
  // ---- plaster (span 2m)
  TEX.plaster = genMaps(512, (u, v, o) => {
    const n = fbm(u, v, 8, 8, 5, 21), s = fbm(u, v, 2, 2, 5, 23);
    const b = 0.70 + n * 0.08; setRGB(o, b, b * 0.97, b * 0.9);
    const stain = smooth(0.55, 0.85, s); mixc(o, 0.45, 0.36, 0.22, stain * 0.45);
    
    const crack = smooth(0.006, 0.0, Math.abs(fbm(u, v, 3, 3, 3, 29) - 0.5)) * smooth(0.5, 0.7, fbm(u, v, 2, 2, 2, 31));
    o.r *= 1 - crack * 0.12; o.g *= 1 - crack * 0.12; o.b *= 1 - crack * 0.12;
    o.h = n * 0.3 - crack * 0.25; o.ro = 0.92;
  }, 1.5);
  // ---- tiles (checker, span 1.2m)
  const tiles = (n, cA, cB, checker, seed) => genMaps(512, (u, v, o) => {
    const tu = fract(u * n), tv = fract(v * n), iu = Math.floor(u * n), iv = Math.floor(v * n);
    const c = checker ? ((iu + iv) % 2 === 0 ? cA : cB) : cA;
    const vari = hash2(iu, iv, seed) * 0.08;
    const veins = Math.pow(Math.abs(Math.sin((u + fbm(u, v, 4, 4, 4, seed) * 0.6) * 30)), 12) * 0.12;
    setRGB(o, c[0] - vari - veins, c[1] - vari - veins, c[2] - vari - veins);
    const edge = Math.min(tu, 1 - tu, tv, 1 - tv) * 1.2 / n;
    const grout = smooth(0.0035, 0.006, edge);
    const dirt = fbm(u, v, 3, 3, 4, seed + 3);
    mixc(o, 0.18, 0.16, 0.12, (1 - grout) * 0.9 + smooth(0.5, 0.85, dirt) * 0.35);
    o.h = 0.4 + grout * 0.5 - (1 - smooth(0.006, 0.02, edge)) * 0.1;
    o.ro = grout > 0.5 ? 0.2 + dirt * 0.35 : 0.9;
  }, 3);
  TEX.checker = tiles(8, [0.78, 0.76, 0.70], [0.12, 0.12, 0.13], true, 41);
  TEX.bathTile = tiles(10, [0.62, 0.72, 0.70], [0.62, 0.72, 0.70], false, 43);
  TEX.marble = tiles(4, [0.80, 0.78, 0.74], [0.32, 0.30, 0.30], true, 45);
  // ---- carpet (span 1m)
  const carpet = (c, seed) => genMaps(256, (u, v, o) => {
    const n = fbm(u, v, 32, 32, 3, seed), m = fbm(u, v, 3, 3, 4, seed + 1);
    setRGB(o, c[0] * (0.75 + n * 0.5), c[1] * (0.75 + n * 0.5), c[2] * (0.75 + n * 0.5));
    mixc(o, 0.12, 0.1, 0.08, smooth(0.55, 0.85, m) * 0.5);
    o.h = n; o.ro = 1;
  }, 1.5);
  TEX.carpetRose = carpet([0.40, 0.26, 0.26], 51);
  TEX.carpetBlue = carpet([0.22, 0.30, 0.40], 53);
  TEX.carpetRunner = genMaps(256, (u, v, o) => {
    const n = fbm(u, v, 32, 32, 3, 55); const b = Math.abs(u - 0.5);
    const border = b > 0.38 ? 1 : 0, mid = Math.sin(v * 40) * Math.sin(u * 30) > 0.3 ? 1 : 0;
    const c = border ? [0.45, 0.32, 0.12] : mid ? [0.35, 0.12, 0.1] : [0.22, 0.07, 0.07];
    setRGB(o, c[0] * (0.7 + n * 0.5), c[1] * (0.7 + n * 0.5), c[2] * (0.7 + n * 0.5)); o.h = n; o.ro = 1;
  }, 1);
  // ---- concrete (span 3m)
  TEX.concrete = genMaps(512, (u, v, o) => {
    const n = fbm(u, v, 8, 8, 5, 61), m = fbm(u, v, 2, 2, 4, 63);
    const b = 0.38 + n * 0.14 - smooth(0.5, 0.8, m) * 0.12; setRGB(o, b, b * 0.98, b * 0.95);
    const crack = smooth(0.01, 0, Math.abs(fbm(u, v, 2, 2, 4, 65) - 0.5)); o.r *= 1 - crack * 0.5; o.g *= 1 - crack * 0.5; o.b *= 1 - crack * 0.5;
    o.h = n * 0.5 - crack * 0.3; o.ro = 0.85 + n * 0.1 - smooth(0.6, 0.8, m) * 0.4;
  }, 2);
  // ---- exterior siding (boards 0.2m, span 2m)
  TEX.siding = genMaps(512, (u, v, o) => {
    const boards = 10, fv = fract(v * boards), n = fbm(u, v, 4, 40, 4, 71), d = fbm(u, v, 3, 3, 5, 73);
    const b = 0.48 + n * 0.08; setRGB(o, b * 0.86, b * 0.92, b);
    const streak = smooth(0.4, 0.9, fbm(u, v, 12, 1, 3, 75)) * smooth(0.3, 1, 1 - v);
    mixc(o, 0.12, 0.13, 0.1, streak * 0.5 + smooth(0.6, 0.85, d) * 0.4);
    const peel = smooth(0.7, 0.73, fbm(u, v, 5, 5, 4, 77)); mixc(o, 0.4, 0.38, 0.34, peel * 0.7);
    const lip = fv < 0.08 ? fv / 0.08 : 1;
    o.r *= 0.55 + 0.45 * lip; o.g *= 0.55 + 0.45 * lip; o.b *= 0.55 + 0.45 * lip;
    o.h = fv * 0.6 + n * 0.1 - peel * 0.05; o.ro = 0.75 + peel * 0.2;
  }, 4);
  // ---- shingles (span 2m)
  TEX.shingles = genMaps(512, (u, v, o) => {
    const rows = 12, row = Math.floor(v * rows), fv = fract(v * rows), off = (row % 2) * 0.5;
    const col = Math.floor(u * 8 + off), fu = fract(u * 8 + off), ph = hash2(col, row, 81);
    const n = fbm(u, v, 16, 16, 3, 83), moss = smooth(0.55, 0.8, fbm(u, v, 3, 3, 4, 85));
    const b = 0.13 + ph * 0.08 + n * 0.06; setRGB(o, b, b * 0.95, b * 0.95);
    mixc(o, 0.14, 0.18, 0.08, moss * 0.7);
    const edge = Math.min(fu, 1 - fu) < 0.03 ? 0.4 : 1; const sh = 0.5 + 0.5 * fv;
    o.r *= edge * sh; o.g *= edge * sh; o.b *= edge * sh;
    o.h = fv * 0.8 + n * 0.2; o.ro = 0.9;
  }, 4);
  // ---- brick foundation (span 2m)
  TEX.brick = genMaps(512, (u, v, o) => {
    const rows = 26, row = Math.floor(v * rows), fv = fract(v * rows), off = (row % 2) * 0.5, col = Math.floor(u * 9 + off), fu = fract(u * 9 + off);
    const ph = hash2(col, row, 91), n = fbm(u, v, 16, 16, 3, 93);
    const mort = Math.min(fu * 2 / 9 * 9, (1 - fu) * 2, fv * 2, (1 - fv) * 2) < 0.12;
    if (mort) { setRGB(o, 0.32, 0.3, 0.27); o.h = 0.2; o.ro = 1; }
    else { setRGB(o, 0.34 + ph * 0.1 + n * 0.05, 0.16 + ph * 0.04, 0.12); o.h = 0.7 + n * 0.2; o.ro = 0.9; }
  }, 3);
  // ---- grass ground (span 6m)
  TEX.grass = genMaps(512, (u, v, o) => {
    const n = fbm(u, v, 24, 24, 4, 101), m = fbm(u, v, 3, 3, 5, 103), d = smooth(0.55, 0.75, m);
    setRGB(o, 0.07 + n * 0.06, 0.10 + n * 0.08, 0.05 + n * 0.03);
    mixc(o, 0.13, 0.11, 0.08, d * 0.8);
    o.h = n; o.ro = 0.95;
  }, 2);
  // ---- asphalt (span 4m)
  TEX.asphalt = genMaps(256, (u, v, o) => {
    const n = fbm(u, v, 32, 32, 3, 111), m = fbm(u, v, 3, 3, 4, 113);
    const b = 0.07 + n * 0.06; setRGB(o, b, b, b * 1.05);
    const wet = smooth(0.5, 0.7, m); o.ro = 0.9 - wet * 0.65; o.h = n;
  }, 2);
  // ---- dark wood for furniture (span 1m)
  TEX.darkWood = genMaps(256, (u, v, o) => {
    const g = fbm(u, v, 2, 30, 4, 121), ring = Math.sin(u * 50 + g * 12) * 0.5 + 0.5;
    const b = 0.18 + ring * 0.05 + g * 0.06; setRGB(o, b, b * 0.6, b * 0.38);
    o.h = ring * 0.3 + g * 0.2; o.ro = 0.45 + g * 0.3;
  }, 1.5);
  TEX.lightWood = genMaps(256, (u, v, o) => {
    const g = fbm(u, v, 2, 30, 4, 125), ring = Math.sin(u * 40 + g * 12) * 0.5 + 0.5;
    const b = 0.42 + ring * 0.06 + g * 0.08; setRGB(o, b, b * 0.72, b * 0.48);
    o.h = ring * 0.3 + g * 0.2; o.ro = 0.55 + g * 0.3;
  }, 1.5);
  // ---- fabric weave (span 0.5m)
  TEX.fabric = genMaps(256, (u, v, o) => {
    const w = (Math.sin(u * 256 * Math.PI) * Math.sin(v * 256 * Math.PI)) * 0.5 + 0.5, n = fbm(u, v, 8, 8, 4, 131);
    const b = 0.75 + w * 0.15 + n * 0.1; setRGB(o, b, b, b); o.h = w * 0.5 + n * 0.3; o.ro = 1;
  }, 1.5);
  // ---- bark (span 1m)
  TEX.bark = genMaps(256, (u, v, o) => {
    const n = fbm(u, v, 8, 2, 5, 141), r = Math.pow(Math.abs(Math.sin(u * 30 + n * 8)), 0.4);
    const b = 0.1 + r * 0.1; setRGB(o, b, b * 0.88, b * 0.78); o.h = r; o.ro = 1;
  }, 4);
  // ---- tent canvas
  TEX.canvas = genMaps(256, (u, v, o) => {
    const w = (Math.sin(u * 160 * Math.PI) + Math.sin(v * 160 * Math.PI)) * 0.25 + 0.5, n = fbm(u, v, 4, 4, 5, 151);
    const b = 0.6 + w * 0.08 + n * 0.12; setRGB(o, b * 0.42, b * 0.44, b * 0.32);
    o.h = w; o.ro = 1;
  }, 1);

  // ---- cellular helper (tileable): returns [d1, d2, cellHash]
  const cell = (u, v, nx, ny, seed) => {
    const x = u * nx, y = v * ny, ix = Math.floor(x), iy = Math.floor(y); let d1 = 9, d2 = 9, h = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = ix + i, cy = iy + j, wx = ((cx % nx) + nx) % nx, wy = ((cy % ny) + ny) % ny;
      const px = cx + 0.15 + 0.7 * hash2(wx, wy, seed), py = cy + 0.15 + 0.7 * hash2(wx, wy, seed + 7);
      const d = Math.hypot((x - px) * 1.0, (y - py) * 1.3);
      if (d < d1) { d2 = d1; d1 = d; h = hash2(wx, wy, seed + 13); } else if (d < d2) d2 = d;
    }
    return [d1, d2, h];
  };
  // ---- stacked fieldstone veneer (span 1.5m)
  TEX.stone = genMaps(512, (u, v, o) => {
    const [d1, d2, h] = cell(u, v, 7, 9, 201), edge = d2 - d1, n = fbm(u, v, 16, 16, 4, 203);
    const tone = 0.42 + h * 0.22 + n * 0.12;
    setRGB(o, tone * (0.95 + h * 0.15), tone * (0.88 + h * 0.08), tone * 0.78);
    const mort = smooth(0.09, 0.03, edge); mixc(o, 0.36, 0.34, 0.31, mort);
    o.h = (1 - mort) * (0.55 + 0.3 * smooth(0, 0.5, edge)) + n * 0.15; o.ro = 0.9 - (1 - mort) * 0.15;
  }, 4);
  // ---- gravel drive (span 1.2m)
  TEX.gravel = genMaps(512, (u, v, o) => {
    const [d1, d2, h] = cell(u, v, 34, 26, 211), edge = d2 - d1, n = fbm(u, v, 24, 24, 3, 213);
    const t = 0.35 + h * 0.35 + n * 0.08; setRGB(o, t, t * 0.97, t * 0.92);
    const gap = smooth(0.12, 0.02, edge); mixc(o, 0.12, 0.11, 0.1, gap * 0.85);
    o.h = (1 - gap) * smooth(0.6, 0.0, d1); o.ro = 0.95;
  }, 3);
  // ---- corrugated roofing tin with rust blooms (span 2m)
  TEX.tin = genMaps(512, (u, v, o) => {
    const w = Math.sin(u * Math.PI * 2 * 26), n = fbm(u, v, 6, 6, 4, 91), r = smooth(0.48, 0.66, fbm(u, v, 4, 3, 5, 93) + (1 - v) * 0.12);
    const g = 0.5 + w * 0.06 + n * 0.08; setRGB(o, g * 0.92, g * 0.94, g);
    mixc(o, 0.42 + n * 0.1, 0.2 + n * 0.05, 0.08, r);
    const streak = smooth(0.55, 0.8, fbm(u, v, 30, 1.5, 3, 95)); mixc(o, 0.25, 0.13, 0.06, streak * 0.35);
    o.h = w * 0.5 + 0.5 - r * 0.08; o.ro = 0.45 + r * 0.5;
  }, 3);
  TEX.flashCookie = makeFlashCookie();
  TEX.laserCookie = makeLaserCookie();
  TEX.hand = makeHandTex();
  TEX.web = makeWebTex();
  TEX.rug = makeRugTex();
  TEX.portraits = [0, 1, 2, 3, 4].map(i => makePortrait(i));
}

function makeFlashCookie() {
  const S = 256, [c, x] = mkCanvas(S, S);
  const id = x.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const u = i / S - 0.5, v = j / S - 0.5, r = Math.hypot(u, v) * 2;
    let L = smooth(1.0, 0.0, r) * 0.55 + smooth(0.32, 0.0, r) * 0.6;
    L += Math.sin(r * 38) * 0.04 * smooth(1, 0.3, r);       // reflector rings
    L *= 0.88 + 0.12 * fbm(i / S, j / S, 6, 6, 3, 9);         // smudges on the lens
    L = clamp(L, 0, 1) * 255;
    const k = (j * S + i) * 4; id.data[k] = L; id.data[k + 1] = L * 0.97; id.data[k + 2] = L * 0.9; id.data[k + 3] = 255;
  }
  x.putImageData(id, 0, 0);
  const t = canvasTex(c, true, false); return t;
}
function makeLaserCookie() {
  const S = 512, [c, x] = mkCanvas(S, S);
  x.fillStyle = '#000'; x.fillRect(0, 0, S, S);
  const N = 30, step = S / N;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const cx = (i + 0.5) * step, cy = (j + 0.5) * step;
    const r = Math.hypot(cx - S / 2, cy - S / 2); if (r > S * 0.49) continue;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, 3.2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, 3.2, 0, Math.PI * 2); x.fill();
  }
  const t = canvasTex(c, true, false); return t;
}
function makeHandTex() {
  const S = 128, [c, x] = mkCanvas(S, S);
  x.clearRect(0, 0, S, S); x.fillStyle = '#fff';
  x.translate(S / 2, S * 0.64);
  x.beginPath(); x.ellipse(0, 6, 25, 29, 0, 0, Math.PI * 2); x.fill();
  const fingers = [[-19, -18, -0.28, 10, 30], [-7, -26, -0.09, 10, 38], [6, -27, 0.04, 10, 40], [18, -22, 0.2, 9.5, 33], [27, 8, 0.95, 10, 28]];
  for (const [fx, fy, a, w, l] of fingers) { x.save(); x.translate(fx, fy); x.rotate(a); x.beginPath(); x.roundRect(-w / 2, -l, w, l + 10, w / 2); x.fill(); x.restore(); }
  x.setTransform(1, 0, 0, 1, 0, 0);
  const id = x.getImageData(0, 0, S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const k = (j * S + i) * 4 + 3; const n = fbm(i / S, j / S, 8, 8, 3, 5), ridge = Math.abs(Math.sin((i * 0.8 + j * 0.35) + n * 9));
    id.data[k] = id.data[k] * clamp(n * 1.5 + 0.15, 0, 1) * (0.7 + 0.3 * ridge);
  }
  x.putImageData(id, 0, 0);
  const t = canvasTex(c, false, false); return t;
}
function makeWebTex() {
  const S = 256, [c, x] = mkCanvas(S, S);
  x.strokeStyle = 'rgba(220,220,220,0.55)'; x.lineWidth = 0.8;
  const spokes = 9;
  for (let i = 0; i < spokes; i++) { const a = i / spokes * Math.PI / 2; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * S, Math.sin(a) * S); x.stroke(); }
  for (let r = 14; r < S; r += 12 + Math.random() * 10) {
    x.beginPath();
    for (let i = 0; i <= spokes; i++) { const a = Math.min(i, spokes - 1) / (spokes - 1) * Math.PI / 2; const rr2 = r * (0.92 + Math.random() * 0.12); const px = Math.cos(a) * rr2, py = Math.sin(a) * rr2; i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.stroke();
  }
  const t = canvasTex(c, true, false); return t;
}
function makeRugTex() {
  const S = 512, [c, x] = mkCanvas(S, S); const id = x.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const u = i / S, v = j / S, bu = Math.min(u, 1 - u), bv = Math.min(v, 1 - v), b = Math.min(bu, bv);
    let r = 0.35, g = 0.08, bl = 0.08;
    if (b < 0.08) { r = 0.12; g = 0.1; bl = 0.18; if (Math.abs(b - 0.04) < 0.006) { r = 0.6; g = 0.45; bl = 0.2; } }
    else {
      const cu = u - 0.5, cv = v - 0.5, a = Math.atan2(cv, cu), rr2 = Math.hypot(cu * 1.4, cv);
      const m = Math.cos(a * 8) * 0.5 + 0.5, med = smooth(0.2, 0.18, rr2 - m * 0.04);
      const pat = (Math.sin(u * 60) * Math.sin(v * 60) > 0.6) ? 1 : 0;
      r = lerp(0.36, 0.55, pat * 0.5); g = lerp(0.07, 0.35, pat * 0.4); bl = lerp(0.08, 0.15, pat * 0.4);
      r = lerp(r, 0.12, med); g = lerp(g, 0.12, med); bl = lerp(bl, 0.22, med);
      if (Math.abs(rr2 - 0.22) < 0.01) { r = 0.65; g = 0.5; bl = 0.25; }
    }
    const n = 0.7 + fbm(u, v, 40, 40, 2, 3) * 0.5, wear = 1 - smooth(0.5, 0.8, fbm(u, v, 3, 3, 4, 8)) * 0.4;
    const k = (j * S + i) * 4; id.data[k] = r * n * wear * 255; id.data[k + 1] = g * n * wear * 255; id.data[k + 2] = bl * n * wear * 255; id.data[k + 3] = 255;
  }
  x.putImageData(id, 0, 0); return canvasTex(c, true, false);
}
function makePortrait(i) {
  const W = 128, H = 160, [c, x] = mkCanvas(W, H);
  const bgc = ['#2a2418', '#1c2226', '#2a1a1a', '#1e1e16', '#221c28'][i];
  const g = x.createRadialGradient(W / 2, H * 0.4, 10, W / 2, H / 2, H * 0.8); g.addColorStop(0, bgc); g.addColorStop(1, '#050505');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  if (i === 4) { // landscape: house on hill
    x.fillStyle = '#0d0f12'; x.beginPath(); x.moveTo(0, H); x.quadraticCurveTo(W / 2, H * 0.55, W, H); x.fill();
    x.fillStyle = '#16181a'; x.fillRect(W * 0.38, H * 0.48, 30, 22); x.beginPath(); x.moveTo(W * 0.35, H * 0.48); x.lineTo(W * 0.5, H * 0.38); x.lineTo(W * 0.65, H * 0.48); x.fill();
    x.fillStyle = '#b89a50'; x.fillRect(W * 0.45, H * 0.53, 4, 5);
  } else {
    x.fillStyle = ['#3a3226', '#2c3034', '#3a2a28', '#302c22'][i];
    x.beginPath(); x.ellipse(W / 2, H * 0.92, W * 0.42, H * 0.35, 0, Math.PI, 0); x.fill();
    x.fillStyle = '#b8a68a'; x.beginPath(); x.ellipse(W / 2, H * 0.42, 22, 29, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = ['#2a1d12', '#141414', '#4a3018', '#2a2a2a'][i]; x.beginPath(); x.ellipse(W / 2, H * 0.34, 25, 20, 0, Math.PI, 0); x.fill();
    x.fillStyle = 'rgba(0,0,0,0.85)';   // the eyes have been scratched out
    x.fillRect(W / 2 - 15, H * 0.4, 30, 7);
  }
  const id = x.getImageData(0, 0, W, H);
  for (let k = 0; k < id.data.length; k += 4) { const n = (Math.random() - 0.5) * 18; id.data[k] += n; id.data[k + 1] += n; id.data[k + 2] += n; }
  x.putImageData(id, 0, 0);
  // craquelure
  x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 0.5;
  for (let k = 0; k < 40; k++) { x.beginPath(); let px = Math.random() * W, py = Math.random() * H; x.moveTo(px, py); for (let s = 0; s < 4; s++) { px += (Math.random() - 0.5) * 20; py += (Math.random() - 0.5) * 20; x.lineTo(px, py); } x.stroke(); }
  return canvasTex(c, true, false);
}
