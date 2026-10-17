// ---------------------------------------------------------------- materials registry
const MATS = {};
const NO_SHADOW = new Set(['glass', 'bulbGlass', 'web']);
function defMat(key, tex, size = 1, o = {}) {
  const { ns, ...params } = o;
  const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 1, metalness: 0 }, params));
  if (tex) {
    for (const k of ['map', 'normalMap', 'roughnessMap']) {
      if (!tex[k]) continue;
      const t = tex[k].clone(); t.repeat.set(1 / size, 1 / size); t.needsUpdate = true; m[k] = t;
    }
    if (ns !== undefined) m.normalScale = new THREE.Vector2(ns, ns);
  }
  addWear(m, o.wear ?? (tex ? 0.3 : 0.18));
  MATS[key] = m; return m;
}
// Surface wear shared by every world material: slow colour drift and roughness breakup in world space (so tiled
// textures stop repeating visibly), plus grime that collects along the foot of walls and furniture. No textures used,
// so the GPU's texture-unit budget is untouched.
const WEAR_U = { uHlFloor: { value: new THREE.Vector4(0, -99, -99, -99) } };
const WEAR_GLSL = `varying vec3 vHlW; varying vec3 vHlN; uniform vec4 uHlFloor; uniform float uHlAmt;
float hlH(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float hlN(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hlH(i), hlH(i + vec3(1,0,0)), f.x), mix(hlH(i + vec3(0,1,0)), hlH(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hlH(i + vec3(0,0,1)), hlH(i + vec3(1,0,1)), f.x), mix(hlH(i + vec3(0,1,1)), hlH(i + vec3(1,1,1)), f.x), f.y), f.z); }`;
function addWear(m, amt) {
  m.userData.wear = amt;
  m.onBeforeCompile = sh => {
    sh.uniforms.uHlFloor = WEAR_U.uHlFloor; sh.uniforms.uHlAmt = { value: m.userData.wear };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHlW; varying vec3 vHlN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHlW = (modelMatrix * vec4(transformed, 1.0)).xyz; vHlN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + WEAR_GLSL)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float hlv = hlN(vHlW * 0.8) * 0.55 + hlN(vHlW * 3.1) * 0.3 + hlN(vHlW * 11.0) * 0.15;
        // height above the nearest floor below this point
        float hlF = 99.0; for (int k = 0; k < 4; k++) { float d = vHlW.y - uHlFloor[k]; if (d > -0.02 && d < hlF) hlF = d; }
        float hlWall = 1.0 - abs(vHlN.y);
        float hlGrime = hlWall * (1.0 - smoothstep(0.0, 0.32, hlF)) * (0.55 + 0.45 * hlN(vHlW * 6.0));
        diffuseColor.rgb *= (1.0 + (hlv - 0.5) * uHlAmt) * (1.0 - hlGrime * 0.32 * step(0.01, uHlAmt));`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + (hlv - 0.5) * uHlAmt * 0.6 + hlGrime * 0.1, 0.03, 1.0);');
  };
}
// Rounded box (three's RoundedBoxGeometry approach): the box's outer segments are bent onto quarter-circles of
// radius r, so edges catch light the way real furniture does instead of ending in razor-sharp creases.
function roundedBox(w, h, d, r, seg) {
  const n = seg * 2 + 1, g = new THREE.BoxGeometry(1, 1, 1, n, n, n).toNonIndexed();
  const P = g.attributes.position, N = g.attributes.normal, p = new V3(), q = new V3(), half = 0.5 / n, bx = new V3(w / 2 - r, h / 2 - r, d / 2 - r);
  for (let i = 0; i < P.count; i++) {
    p.fromBufferAttribute(P, i); q.copy(p); q.x -= Math.sign(q.x) * half; q.y -= Math.sign(q.y) * half; q.z -= Math.sign(q.z) * half; q.normalize();
    P.setXYZ(i, bx.x * Math.sign(p.x) + q.x * r, bx.y * Math.sign(p.y) + q.y * r, bx.z * Math.sign(p.z) + q.z * r); N.setXYZ(i, q.x, q.y, q.z);
  }
  return g;
}
// how soft each material's edges are (metres); keys not listed (walls, floors, roofs, glass...) stay sharp
const BEVEL = {};
for (const k of ['darkWood', 'lightWood', 'paintedWood', 'doorWood', 'doorWhite', 'whitePaint', 'trim', 'trimWhite', 'cardboard', 'wax', 'switchPlate']) BEVEL[k] = [0.01, 1];
for (const k of ['metal', 'chrome', 'brass', 'blackPlastic', 'grayPlastic', 'porcelain', 'enamel', 'enamelMint', 'ceramicRed', 'ceramicBlue', 'toyRed', 'toyBlue', 'toyYellow', 'toyGreen', 'consolePurple',
  'horseBay', 'horseBlack', 'horseWhite', 'horsePalo', 'horseGray', 'railBlack', 'tentPole', 'carPaint', 'acrylic', 'bookA', 'bookB', 'bookC', 'bookD']) BEVEL[k] = [0.008, 1];
for (const k of ['fabricGreen', 'fabricBrown', 'fabricBlue', 'fabricRose', 'bedding', 'beddingKid', 'mattress', 'plush', 'leather', 'leatherDark', 'blanketRed', 'beddingHorse', 'beddingGame', 'hatTan', 'chairRed']) BEVEL[k] = [0.06, 2];
function buildMaterials() {
  defMat('woodF', TEX.woodFloor, 1.6, { ns: 0.8 });
  defMat('porchWood', TEX.woodFloor, 1.6, { color: 0x8a8278, ns: 1 });
  defMat('marbleF', TEX.marble, 1.2, { ns: 0.6 });
  defMat('checkerF', TEX.checker, 1.2, { ns: 0.6 });
  defMat('bathF', TEX.bathTile, 1.0, { color: 0xd8dcd4, ns: 0.3 });
  defMat('bathTileW', TEX.bathTile, 1.0, { ns: 0.22 });
  defMat('carpetRose', TEX.carpetRose, 1.0, { ns: 0.5 });
  defMat('carpetBlue', TEX.carpetBlue, 1.0, { ns: 0.5 });
  defMat('runner', TEX.carpetRunner, 1.0, { ns: 0.4 });
  defMat('concreteF', TEX.concrete, 3, { ns: 0.6 });
  defMat('wpGreen', TEX.wpGreen, 1.0, { ns: 0.5 });
  defMat('wpRed', TEX.wpRed, 1.0, { ns: 0.5 });
  defMat('wpRose', TEX.wpRose, 1.0, { ns: 0.5 });
  defMat('wpBlue', TEX.wpBlue, 1.0, { ns: 0.5 });
  defMat('wpBeige', TEX.wpBeige, 1.0, { ns: 0.5 });
  defMat('plasterY', TEX.plaster, 2, { color: 0xe8dcae, ns: 0.4 });
  defMat('plasterG', TEX.plaster, 2, { color: 0xb8bcb0, ns: 0.4 });
  defMat('ceiling', TEX.plaster, 2.5, { color: 0xd6d0c4, ns: 0.4 });
  defMat('trim', TEX.plaster, 1, { color: 0xcfc6b2, roughness: 0.7, ns: 0.2 });
  defMat('siding', TEX.siding, 2, { ns: 0.9 });
  defMat('shingles', TEX.shingles, 2, { ns: 1 });
  defMat('brick', TEX.brick, 2, { ns: 1 });
  defMat('darkWood', TEX.darkWood, 1, { ns: 0.5 });
  defMat('lightWood', TEX.lightWood, 1, { ns: 0.5 });
  defMat('paintedWood', TEX.plaster, 1, { color: 0xb9ad94, roughness: 0.65, ns: 0.3 });
  defMat('doorWood', TEX.darkWood, 1.2, { color: 0xb09078, ns: 0.4 });
  defMat('fabricGreen', TEX.fabric, 0.5, { color: 0x3b4a36, ns: 0.6 });
  defMat('fabricBrown', TEX.fabric, 0.5, { color: 0x5a3e2c, ns: 0.6 });
  defMat('fabricBlue', TEX.fabric, 0.5, { color: 0x2e3e56, ns: 0.6 });
  defMat('fabricRose', TEX.fabric, 0.5, { color: 0x7a5a5a, ns: 0.6 });
  defMat('bedding', TEX.fabric, 0.6, { color: 0xb8b0a0, ns: 0.6 });
  defMat('beddingKid', TEX.fabric, 0.6, { color: 0x7d93a8, ns: 0.6 });
  defMat('curtain', TEX.fabric, 0.4, { color: 0x5a2a28, side: THREE.DoubleSide, ns: 0.5 });
  defMat('curtainLace', TEX.fabric, 0.3, { color: 0xb8b2a0, side: THREE.DoubleSide, transparent: true, opacity: 0.55, ns: 0.3 });
  defMat('rugMat', null, 1, { map: TEX.rug, roughness: 1 });
  defMat('metal', null, 1, { color: 0x6c6a66, roughness: 0.45, metalness: 0.8 });
  defMat('chrome', null, 1, { color: 0xb8b8b8, roughness: 0.2, metalness: 1 });
  defMat('brass', null, 1, { color: 0xa88440, roughness: 0.35, metalness: 1 });
  defMat('blackPlastic', null, 1, { color: 0x111214, roughness: 0.5 });
  defMat('grayPlastic', null, 1, { color: 0x3a3c40, roughness: 0.55 });
  defMat('porcelain', null, 1, { color: 0xe4e2da, roughness: 0.15 });
  defMat('enamel', null, 1, { color: 0xd8d4c4, roughness: 0.3 });
  defMat('enamelMint', null, 1, { color: 0x9cc4b0, roughness: 0.3 });
  defMat('screen', null, 1, { color: 0x050607, roughness: 0.05, metalness: 0.2 });
  defMat('glass', null, 1, { color: 0x8796a8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false });
  defMat('mirror', null, 1, { color: 0x9aa4ac, roughness: 0.02, metalness: 1 });
  defMat('bulbGlass', null, 1, { color: 0xfff2d8, emissive: 0x000000, roughness: 0.3, transparent: true, opacity: 0.9 });
  defMat('bark', TEX.bark, 1, { ns: 1.2 });
  defMat('canvas', TEX.canvas, 1, { side: THREE.DoubleSide, ns: 0.5 });
  defMat('tentPole', null, 1, { color: 0x2a2c2e, roughness: 0.4, metalness: 0.7 });
  defMat('asphalt', TEX.asphalt, 4, { ns: 0.5 });
  defMat('sidewalk', TEX.concrete, 2, { color: 0x9a968e, ns: 0.6 });
  defMat('cardboard', TEX.fabric, 0.4, { color: 0x8a6a44, ns: 0.3 });
  defMat('mattress', TEX.fabric, 0.4, { color: 0xc8c0a8, ns: 0.4 });
  defMat('ceramicRed', null, 1, { color: 0x8a2a22, roughness: 0.25 });
  defMat('ceramicBlue', null, 1, { color: 0x2c4a7a, roughness: 0.2 });
  defMat('bottleGreen', null, 1, { color: 0x1e4a2a, roughness: 0.1, metalness: 0.1 });
  defMat('bookA', TEX.fabric, 0.3, { color: 0x5a1e1a });
  defMat('bookB', TEX.fabric, 0.3, { color: 0x1e3a2a });
  defMat('bookC', TEX.fabric, 0.3, { color: 0x2a2a44 });
  defMat('bookD', TEX.fabric, 0.3, { color: 0x6a5a3a });
  defMat('toyRed', null, 1, { color: 0x9a2a1e, roughness: 0.5 });
  defMat('toyBlue', null, 1, { color: 0x22508a, roughness: 0.5 });
  defMat('toyYellow', null, 1, { color: 0xb08a1e, roughness: 0.5 });
  defMat('plush', TEX.fabric, 0.15, { color: 0x6a4a30 });
  defMat('wax', null, 1, { color: 0xd8ccb0, roughness: 0.6 });
  defMat('web', null, 1, { map: TEX.web, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 1, color: 0x999999 });
  defMat('switchPlate', null, 1, { color: 0xd8d0bc, roughness: 0.4 });
  defMat('grassBase', TEX.grass, 6, { ns: 0.6 });
  defMat('dirt', TEX.concrete, 3, { color: 0x4a3c2c, ns: 1 });
  defMat('carPaint', null, 1, { color: 0x3a2622, roughness: 0.55, metalness: 0.5 });
  defMat('tire', null, 1, { color: 0x111111, roughness: 0.9 });
  defMat('darkHouse', TEX.siding, 2, { color: 0x6a6a70, ns: 0.6 });
  defMat('sidingRed', TEX.siding, 2, { color: 0xc04a3e, ns: 0.9 });
  defMat('stone', TEX.stone, 1.5, { ns: 1.4 });
  defMat('gravel', TEX.gravel, 1.2, { color: 0x77736c, ns: 1.4 });
  defMat('deckGray', TEX.woodFloor, 1.6, { color: 0x8e8e8a, ns: 1 });
  defMat('shinglesDark', TEX.shingles, 2, { color: 0x9a9aa2, ns: 1 });
  defMat('trimWhite', TEX.plaster, 1, { color: 0xeeece6, roughness: 0.6, ns: 0.15 });
  defMat('railBlack', null, 1, { color: 0x151617, roughness: 0.5, metalness: 0.3 });
  defMat('shutterBlack', null, 1, { color: 0x0e1012, roughness: 0.6 });
  defMat('pine', TEX.grass, 1, { color: 0x3a5a40, ns: 1 });
  defMat('concreteFound', TEX.concrete, 2, { color: 0xb0aca2, ns: 0.7 });
  defMat('mud', TEX.grass, 6, { color: 0x8a7a5c, ns: 0.8 });
  defMat('plankFloor', TEX.woodFloor, 1.6, { color: 0x7d6e5c, ns: 1 });
  defMat('plankWall', TEX.woodFloor, 1.8, { color: 0x6a5e50, ns: 1 });
  defMat('tin', TEX.tin, 2, { color: 0xb8b4ac, metalness: 0.45, ns: 1.2, side: THREE.DoubleSide });
  defMat('tinRust', TEX.tin, 2, { color: 0xc89070, metalness: 0.3, ns: 1.2, side: THREE.DoubleSide });
  defMat('shackSiding', TEX.woodFloor, 1.8, { color: 0x8a8478, ns: 1.1 });
  // Claire's and Jim's rooms
  defMat('horseBay', null, 1, { color: 0x6b3a1e, roughness: 0.45 });
  defMat('horseBlack', null, 1, { color: 0x1e1b19, roughness: 0.4 });
  defMat('horseWhite', null, 1, { color: 0xdcd6ca, roughness: 0.45 });
  defMat('horsePalo', null, 1, { color: 0xc9a25a, roughness: 0.45 });
  defMat('horseGray', null, 1, { color: 0x8c8a86, roughness: 0.45 });
  defMat('leather', TEX.fabric, 0.5, { color: 0x6a3b1c, roughness: 0.55, ns: 0.3 });
  defMat('leatherDark', TEX.fabric, 0.5, { color: 0x34200f, roughness: 0.5, ns: 0.3 });
  defMat('blanketRed', TEX.fabric, 0.3, { color: 0x8a2a24, ns: 0.6 });
  defMat('beddingHorse', TEX.fabric, 0.6, { color: 0x9a7ca8, ns: 0.6 });
  defMat('beddingGame', TEX.fabric, 0.6, { color: 0x2a3550, ns: 0.6 });
  defMat('hatTan', TEX.fabric, 0.3, { color: 0xa88458, ns: 0.4 });
  defMat('ribbonBlue', null, 1, { color: 0x2050c0, roughness: 0.4 });
  defMat('ribbonRed', null, 1, { color: 0xb02020, roughness: 0.4 });
  defMat('ribbonYellow', null, 1, { color: 0xd8b020, roughness: 0.4 });
  defMat('ribbonPurple', null, 1, { color: 0x6a3a9a, roughness: 0.4 });
  defMat('whitePaint', TEX.plaster, 1, { color: 0xe6e2da, roughness: 0.6, ns: 0.2 });
  defMat('acrylic', null, 1, { color: 0x9ad0e8, roughness: 0.15, transparent: true, opacity: 0.55 });
  defMat('paper', null, 1, { color: 0xece8dc, roughness: 0.9 });
  defMat('toyGreen', null, 1, { color: 0x2a7a3a, roughness: 0.5 });
  defMat('consolePurple', null, 1, { color: 0x4a3a7a, roughness: 0.45 });
  defMat('chairRed', TEX.fabric, 0.4, { color: 0x8a1a1a, ns: 0.4 });
  defMat('swampWater', null, 1, { color: 0x0a110d, roughness: 0.06, metalness: 0.25 });
  defMat('doorWhite', TEX.plaster, 1, { color: 0xe6e4de, roughness: 0.5, ns: 0.2 });
}

// ---------------------------------------------------------------- merged static geometry builder
const _v = new V3(), _n = new V3();
let MIRROR_X = null;   // when set, everything built is reflected across x = MIRROR_X / 2 (x -> MIRROR_X - x)
class GB {
  constructor() { this.buf = {}; }
  add(geo, m4, key, worldUV = false, uvScale = 1) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    const groups = g.groups.length ? g.groups : [{ start: 0, count: pos.count, materialIndex: 0 }];
    if (MIRROR_X !== null) m4 = new THREE.Matrix4().set(-1, 0, 0, MIRROR_X, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1).multiply(m4);
    const nm = new THREE.Matrix3().getNormalMatrix(m4), flip = MIRROR_X !== null;
    for (const gr of groups) {
      const k = Array.isArray(key) ? key[gr.materialIndex] : key; if (!k) continue;
      const B = this.buf[k] || (this.buf[k] = { p: [], n: [], u: [] });
      for (let ii = gr.start; ii < gr.start + gr.count; ii++) {
        const r3 = (ii - gr.start) % 3, i = flip && r3 ? ii + (r3 === 1 ? 1 : -1) : ii;
        _v.fromBufferAttribute(pos, i).applyMatrix4(m4); _n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
        B.p.push(_v.x, _v.y, _v.z); B.n.push(_n.x, _n.y, _n.z);
        if (worldUV) {
          const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);
          if (ay >= ax && ay >= az) B.u.push(_v.x, _v.z); else if (ax >= az) B.u.push(_v.z, _v.y); else B.u.push(_v.x, _v.y);
        } else if (uv) B.u.push(uv.getX(i) * uvScale, uv.getY(i) * uvScale); else B.u.push(0, 0);
      }
    }
    if (g !== geo) g.dispose();
    geo.dispose();
  }
  // axis-aligned or y-rotated box by center
  box(key, cx, cy, cz, w, h, d, ry = 0, rx = 0, rz = 0) {
    if (w <= 0 || h <= 0 || d <= 0) return;
    const bv = !Array.isArray(key) && BEVEL[key], mn = Math.min(w, h, d);
    if (bv && mn >= 0.012 && Math.max(w, h, d) < 2.7) {
      const r = Math.min(bv[0], mn * (bv[1] > 1 ? 0.45 : 0.3)), seg = r < 0.004 ? 0 : bv[1];
      if (seg) { this.add(roundedBox(w, h, d, r, seg), mat4(cx, cy, cz, ry, rx, rz), key, true); return; }
    }
    this.add(new THREE.BoxGeometry(w, h, d), mat4(cx, cy, cz, ry, rx, rz), key, true);
  }
  mm(key, x0, y0, z0, x1, y1, z1) { this.box(key, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0); }
  cyl(key, x, y, z, rt, rb, h, seg = 16, ry = 0, rx = 0, rz = 0, uvs = 1) {
    this.add(new THREE.CylinderGeometry(rt, rb, h, seg), mat4(x, y, z, ry, rx, rz), key, false, uvs);
  }
  sphere(key, x, y, z, r, sx = 1, sy = 1, sz = 1, seg = 14) {
    this.add(new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.6 | 0)), mat4(x, y, z, 0, 0, 0, sx, sy, sz), key, false);
  }
  build(parent, opts = {}) {
    const meshes = [];
    for (const k in this.buf) {
      const B = this.buf[k]; if (!B.p.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2));
      g.computeBoundingSphere(); g.computeBoundingBox();
      const m = new THREE.Mesh(g, opts.mat || MATS[k]);
      m.castShadow = opts.cast !== undefined ? opts.cast : !NO_SHADOW.has(k);
      m.receiveShadow = true;
      if (k === 'glass') m.renderOrder = 2;
      parent.add(m); meshes.push(m);
    }
    this.buf = {};
    return meshes;
  }
}
const _q4 = new THREE.Quaternion(), _e4 = new THREE.Euler();
function mat4(x, y, z, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e4.set(rx, ry, rz, 'YXZ'); _q4.setFromEuler(_e4);
  return new THREE.Matrix4().compose(new V3(x, y, z), _q4, new V3(sx, sy, sz));
}
// local-space furniture placement helper: rotates by ry around (ox,oz)
function fur(gb, ox, oz, ry = 0, oy = FY) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const tx = (lx, lz) => [ox + lx * c + lz * s, oz - lx * s + lz * c];
  return {
    box(key, lx, ly, lz, w, h, d, lry = 0, rx = 0, rz = 0) { const [x, z] = tx(lx, lz); gb.box(key, x, oy + ly, z, w, h, d, ry + lry, rx, rz); },
    cyl(key, lx, ly, lz, rt, rb, h, seg = 14, rx = 0, rz = 0) { const [x, z] = tx(lx, lz); gb.cyl(key, x, oy + ly, z, rt, rb, h, seg, ry, rx, rz); },
    sphere(key, lx, ly, lz, r, sx = 1, sy = 1, sz = 1) { const [x, z] = tx(lx, lz); gb.sphere(key, x, oy + ly, z, r, sx, sy, sz); },
    pt: tx, o: [ox, oz, ry, oy],
    solid(lx0, lz0, lx1, lz1, h = 1) { const a = tx(lx0, lz0), b = tx(lx1, lz1); addCollider(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), h, true, oy); },
  };
}

// ---------------------------------------------------------------- colliders & spatial queries
const COLL = [];        // {x0,z0,x1,z1,y0,y1,h,furn}
const SIGHT = [];       // full-height wall AABBs that block line of sight
function addCollider(x0, z0, x1, z1, h = 3, furn = false, y0 = 0) { if (MIRROR_X !== null) [x0, x1] = [MIRROR_X - x1, MIRROR_X - x0]; COLL.push({ x0, z0, x1, z1, y0, y1: y0 + h, h, furn }); }
function collAt(c, y) { return c.y1 > y + 0.3 && c.y0 < y + 1.6; }
function segAABB(ax, az, bx, bz, b) {
  let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
  const p = [-dx, dx, -dz, dz], q = [ax - b.x0, b.x1 - ax, az - b.z0, b.z1 - az];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false; }
    else { const t = q[i] / p[i]; if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } }
  }
  return true;
}
function segSeg(ax, az, bx, bz, cx, cz, dx, dz) {
  const d = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx); if (Math.abs(d) < 1e-9) return false;
  const t = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / d, u = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / d;
  return t > 0 && t < 1 && u > 0 && u < 1;
}
