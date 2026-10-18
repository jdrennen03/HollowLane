// ---------------------------------------------------------------- map: Bayou Maudit (Louisiana swamp, mostly outdoors)
// Five stilt shacks stand around a small ring of boardwalk with a courtyard in the middle that the ghost can haunt
// like any room. The shacks are built here (stilts, weathered planks, patched rusty tin, porches with steps), after
// the reference models the player supplied.
const BY0 = 0.15, BY1 = 1.4, BW_R = 12.5, BW_W = 1.1, YARD = 6.5;
const BAYOU_NAMES = ['Boudreaux Shack', 'Thibodeaux Place', 'Landry Bait Shop', 'Guidry House', 'Hebert Smokehouse'];
const BAYOU_SLOTS = [30, 90, 150, 210, 330];   // degrees around the ring; 270 (south) is the dock
// three shack styles: L = depth behind the porch, Wd = width, P = porch depth, rise = roof height, st = stair span (v)
const SHACK_STYLES = [
  { L: 5.0, Wd: 4.6, P: 1.8, rise: 1.5, st: [-0.6, 0.6], door: [-0.45, 0.45], closet: false },
  { L: 5.8, Wd: 5.0, P: 1.5, rise: 1.25, st: [-0.6, 0.6], door: [-0.45, 0.45], closet: true, leanTo: true },
  { L: 5.4, Wd: 5.4, P: 2.0, rise: 2.2, st: [0.9, 2.1], door: [-0.75, 0.15], closet: true, loft: true },
];
function bayouLayout() {
  return BAYOU_SLOTS.map((deg, i) => {
    const st = SHACK_STYLES[i % 3], th = deg * Math.PI / 180, toC = [-Math.cos(th), -Math.sin(th)];
    let best = 0, bd = -9; for (let k = 0; k < 4; k++) { const f = k * Math.PI / 2, d = Math.cos(f) * toC[0] - Math.sin(f) * toC[1]; if (d > bd + 1e-6) { bd = d; best = f; } }
    const R = BW_R + BW_W + st.P + 2.0 - 0.15;
    const px = Math.round(R * Math.cos(th) * 100) / 100, pz = Math.round(R * Math.sin(th) * 100) / 100, c = Math.cos(best), s = Math.sin(best);
    const W = (u, v) => [px + (u * c + v * s), pz + (-u * s + v * c)];
    const rect = (u0, v0, u1, v1) => { const a = W(u0, v0), b = W(u1, v1); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; };
    return { i, st, px, pz, phi: best, c, s, W, rect, name: BAYOU_NAMES[i], U0: -st.L, U1: 0, V0: -st.Wd / 2, V1: st.Wd / 2 };
  });
}
const BAYOU_HOUSES = bayouLayout();
function bayouData() {
  const rooms = [], walls = [], doors = [], stairs = [], slabs = [], closets = [], porches = [];
  const seg = (h, u0, v0, u1, v1, opens = [], ext = false) => {
    const T = ext ? 0.16 : 0.1, A = h.W(u0, v0), B = h.W(u1, v1), alongZ = Math.abs(A[0] - B[0]) < 1e-6;
    const lo = alongZ ? Math.min(A[1], B[1]) : Math.min(A[0], B[0]), hi = alongZ ? Math.max(A[1], B[1]) : Math.max(A[0], B[0]);
    const w = alongZ ? { x: A[0] } : { z: A[1] }; w.a = lo - (ext ? T / 2 : 0); w.b = hi + (ext ? T / 2 : 0); w.t = T; w.lv = 1; w.ext = ext;
    w.open = opens.map(o => { const p = h.W(...o.p0), q = h.W(...o.p1), a = alongZ ? p[1] : p[0], b = alongZ ? q[1] : q[0]; const r = { s: Math.min(a, b), e: Math.max(a, b) }; if (o.door !== undefined) r.door = o.door; else { r.win = 1; r.shut = 1; r.sill = o.sill ?? 0.95; r.top = o.top ?? 2.0; } return r; });
    walls.push(w);
  };
  const door = (h, hu, hv, eu, ev, nu, nv, extra = {}) => {
    const H = h.W(hu, hv), E = h.W(eu, ev), alongZ = Math.abs(H[0] - E[0]) < 1e-6, wn = [nu * h.c + nv * h.s, -nu * h.s + nv * h.c];
    const d = alongZ ? { x: H[0], s: Math.min(H[1], E[1]), e: Math.max(H[1], E[1]), into: Math.sign(wn[0]) } : { z: H[1], s: Math.min(H[0], E[0]), e: Math.max(H[0], E[0]), into: Math.sign(wn[1]) };
    d.hinge = Math.abs((alongZ ? H[1] : H[0]) - d.s) < 1e-6 ? 's' : 'e'; d.lv = 1; Object.assign(d, extra); doors.push(d); return doors.length - 1;
  };
  for (const h of BAYOU_HOUSES) {
    const { U0, U1, V0, V1, st } = h, [D0, D1] = st.door;
    const di = door(h, U1, D0, U1, D1, -1, 0, { mat: 'doorWood' });
    const wv = (V0 + V1) / 2;
    seg(h, U0, V0, U0, V1, [{ p0: [U0, wv - 0.5], p1: [U0, wv + 0.5] }], true);                                   // back wall + window
    seg(h, U0, V0, U1, V0, [{ p0: [U0 + 1.2, V0], p1: [U0 + 2.2, V0] }], true);                                     // side + window
    seg(h, U0, V1, U1, V1, [{ p0: [U1 - 2.2, V1], p1: [U1 - 1.2, V1] }], true);                                     // other side + window
    seg(h, U1, V0, U1, V1, [{ p0: [U1, D0], p1: [U1, D1], door: di }, ...(st.door[1] < 0.5 ? [{ p0: [U1, 0.9], p1: [U1, 1.8] }] : [])], true);
    const sw = h.W(U1 - 0.085, D1 + 0.35), nrm = [-h.c, h.s];
    rooms.push({ id: 'h' + h.i, name: h.name, r: h.rect(U0, V0, U1, V1), lv: 1, floor: 'plankFloor', wall: 'plankWall', ceil: 'plankWall', sw: [sw[0], sw[1], Math.round(nrm[0]), Math.round(nrm[1])], lamp: h.W((U0 + U1) / 2 - 0.3, wv) });
    if (st.closet) closets.push({ h, room: rooms.length - 1 });
    const pr = h.rect(U1 - 0.02, V0, U1 + st.P, V1); slabs.push({ x0: pr[0], z0: pr[1], x1: pr[2], z1: pr[3], y: BY1 }); porches.push(pr);
    const [s0, s1] = st.st, sr = h.rect(U1 + st.P, s0, U1 + st.P + 2.0, s1), axisX = Math.abs(h.c) > 0.5, top = h.W(U1 + st.P, (s0 + s1) / 2);
    const topAtMin = axisX ? Math.abs(top[0] - sr[0]) < 0.01 : Math.abs(top[1] - sr[1]) < 0.01;
    stairs.push({ x0: sr[0], z0: sr[1], x1: sr[2], z1: sr[3], axis: axisX ? 'x' : 'z', lo: 0, hi: 1, flip: topAtMin });
  }
  rooms.push({ id: 'yard', name: 'Courtyard', r: [-8, -9, 8, 8], lv: 0, outdoor: true, floor: 'mud', wall: 'plankWall', sw: [1.32, -8.6, -1, 0], lamp: [0.9, -8.6] });
  for (const c of closets) {
    const { h } = c, cu1 = h.U0 + 1.4, cv0 = h.V1 - 1.3;
    const di = door(h, h.U0 + 0.3, cv0, h.U0 + 1.15, cv0, 0, -1, { closet: rooms.length });
    seg(h, h.U0, cv0, cu1, cv0, [{ p0: [h.U0 + 0.3, cv0], p1: [h.U0 + 1.15, cv0], door: di }]); seg(h, cu1, cv0, cu1, h.V1);
    rooms.push({ id: 'cl' + h.i, name: h.name + ' closet', r: h.rect(h.U0, cv0, cu1, h.V1), lv: 1, floor: 'plankFloor', wall: 'plankWall', closet: true, parent: c.room, door: di });
  }
  return { rooms, walls, doors, stairs, slabs, porches };
}
const BAYOU = bayouData();
function bayouTerrain(x, z, walk) {
  const r = Math.hypot(x, z);
  if (walk && Math.abs(r - BW_R) < BW_W) return 0.36;                                   // boardwalk planks
  if (walk && Math.abs(x) < 1.1 && z < -BW_R && z > -26) return 0.33;                    // plank walk to the dock
  if (walk && Math.abs(x) < 3.5 && z <= -25.8 && z >= -27.5) return 0.34;               // the dock itself
  if (walk && Math.abs(x) < 2.25 && Math.abs(z + 21) < 2.25) return 0.33;              // the deck under the base tent
  if (r < YARD + 0.6) return BY0;
  const marsh = 0.05 + (fbm(fract(x / 40 + 0.5), fract(z / 40 + 0.5), 4, 4, 3, 77) - 0.5) * 0.32;
  if (r < YARD + 2) return lerp(BY0, marsh, (r - YARD - 0.6) / 1.4);
  return lerp(marsh, -0.9, smooth(25.5, 29, r));
}
MAPS.bayou = {
  id: 'bayou', title: 'Bayou Maudit', eyebrow: 'Atchafalaya Basin, Louisiana', lede: 'Five stilt shacks on a ring of boardwalk, empty since the storm of ’05. Nobody fishes the bayou after dark, and nobody crosses the courtyard at all. Set up at the dock, find which shack it calls home, and get out before it hunts you.',
  levels: [BY0, BY1], extBase: [0, BY1 - 0.12], extTop: [3, BY1 + WALL_H + 0.05], siding: 'shackSiding', skirt: null, shutter: 'darkHouse', crooked: true,
  trimColor: 0x7d7262, tempBase: 21, outsideTemp: 24, fog: [0x101a14, 0.04], moonI: 3.4, hemiI: 0.6, moonSpan: 32, moonRes: 2048,
  tent: { x: 0, z: -21 }, lure: 1, moonTarget: [0, 0, 0], grassBox: [-30, -30, 30, 30], navBox: [-27, -27, 27, 27], navCs: 0.3,
  street: [3.2, 4.0, -18.5], porch: [0, 2.6, 0],
  rooms: BAYOU.rooms, walls: BAYOU.walls, doors: BAYOU.doors, stairs: BAYOU.stairs, slabs: BAYOU.slabs,
  terrain: (x, z) => bayouTerrain(x, z, true),
  navWalk(l, x, z) {
    if (l === 0) return Math.hypot(x, z) < 26 && bayouTerrain(x, z, true) > -0.12;
    return BAYOU.porches.some(p => x > p[0] && x < p[2] && z > p[1] && z < p[3]);
  },
  yardName: p => { const r = Math.hypot(p.x, p.z); return Math.abs(r - BW_R) < BW_W + 0.3 ? 'Boardwalk' : p.z < -17 && Math.abs(p.x) < 6 ? 'The dock' : p.y > BY0 + 0.8 ? 'Porch' : 'The marsh'; },
  outsideStep(p) { return Math.abs(Math.hypot(p.x, p.z) - BW_R) < BW_W || p.y > BY0 + 0.15 ? 'step_wood' : 'step_grass'; },
  menuCam(T, cam) { const a = T * 0.04 - 1.2; cam.position.set(Math.sin(a) * 30, 6.5 + Math.sin(T * 0.1) * 0.4, -Math.cos(a) * 30); cam.lookAt(0, 2.2, 0); },
  grassOK(x, z) {
    const r = Math.hypot(x, z); if (r < YARD + 1 || r > 29 || Math.abs(r - BW_R) < BW_W + 0.2) return false;
    if (bayouTerrain(x, z, false) < -0.05) return false;
    for (const h of BAYOU_HOUSES) if (Math.hypot(x - h.px + h.c * 2.5, z - h.pz - h.s * 2.5) < 4.5) return false;
    return !(Math.abs(x) < 2.5 && z < -BW_R);
  },
  build(gb, root) { buildBayou(gb, root); },
};

let MOSS_TEX = null;
function mossTex() {
  if (MOSS_TEX) return MOSS_TEX;
  const [c, x] = mkCanvas(128, 256); x.clearRect(0, 0, 128, 256);
  for (let i = 0; i < 70; i++) {
    const sx = Math.random() * 128, len = 80 + Math.random() * 170; x.strokeStyle = `rgba(${150 + Math.random() * 40 | 0},${165 + Math.random() * 30 | 0},${140 + Math.random() * 30 | 0},${0.35 + Math.random() * 0.4})`; x.lineWidth = 0.8 + Math.random() * 1.6;
    x.beginPath(); let px = sx, py = 0; x.moveTo(px, py); while (py < len) { py += 6; px += (Math.random() - 0.5) * 4; x.lineTo(px, py); } x.stroke();
  }
  MOSS_TEX = canvasTex(c, true, false); return MOSS_TEX;
}
// feathery bald-cypress sprigs on a transparent card; the canopy is built from many of these, instanced
let LEAF_TEX = null;
function leafTex() {
  if (LEAF_TEX) return LEAF_TEX;
  const [c, x] = mkCanvas(256, 256); x.clearRect(0, 0, 256, 256); const R = mulberry32(31);
  for (let i = 0; i < 46; i++) {
    const cx = 30 + R() * 196, cy = 30 + R() * 196, a = R() * 6.28, L = 26 + R() * 34, g = 70 + R() * 50 | 0;
    x.strokeStyle = `rgb(${g * 0.55 | 0},${g},${g * 0.45 | 0})`; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); x.stroke();
    x.lineWidth = 1.1;
    for (let t = 0.1; t < 1; t += 0.09) { const px = cx + Math.cos(a) * L * t, py = cy + Math.sin(a) * L * t, n = 7 * (1 - t * 0.6);
      for (const sd of [-1, 1]) { const b = a + sd * 1.15; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(b) * n, py + Math.sin(b) * n); x.stroke(); } }
  }
  LEAF_TEX = canvasTex(c, true, false); return LEAF_TEX;
}
const LEAF_CARDS = [];   // [x, y, z, size] filled by cypress(), turned into one instanced canopy at the end of the build
function flushLeafCards(root) {
  if (!LEAF_CARDS.length) return;
  const mat = new THREE.MeshStandardMaterial({ map: leafTex(), alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.85, color: 0x9aa888 });
  const geo = new THREE.PlaneGeometry(1, 1), nrm = geo.attributes.normal; for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);   // lit from above like a crown, not per card
  const mesh = new THREE.InstancedMesh(geo, mat, LEAF_CARDS.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  LEAF_CARDS.forEach(([x, y, z, sz], i) => { e.set(WR() * 6.28, WR() * 6.28, WR() * 6.28); q.setFromEuler(e); m4.compose(new V3(x, y, z), q, new V3(sz, sz, sz)); mesh.setMatrixAt(i, m4); c.setHSL(0.2 + WR() * 0.08, 0.3, 0.3 + WR() * 0.15); mesh.setColorAt(i, c); });
  mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh); LEAF_CARDS.length = 0;
}
function cypress(gb, root, x, z, s) {
  const y0 = bayouTerrain(x, z, false);
  // buttressed trunk flaring into the water
  const prof = []; for (let i = 0; i <= 10; i++) { const t = i / 10; prof.push(new THREE.Vector2(0.22 * s + 0.75 * s * Math.pow(1 - t, 3), t * 9 * s)); }
  gb.add(new THREE.LatheGeometry(prof, 12), mat4(x, y0 - 0.2, z), 'bark', false, 3);
  for (let k = 0; k < 5; k++) { const a = WR() * 6.28, d = (1.2 + WR() * 1.5) * s; gb.add(new THREE.ConeGeometry(0.12 * s, (0.5 + WR() * 0.5) * s, 6), mat4(x + Math.cos(a) * d, y0 + 0.15 * s, z + Math.sin(a) * d), 'bark', false); }
  // ragged crown: limbs reaching out, each ending in a few clumps of needles
  const crown = [];
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * 6.28 + WR(), d = (1.5 + WR() * 2.2) * s, by = y0 + (5.5 + WR() * 3) * s, cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d, cy = by + (0.8 + WR()) * s;
    const L = Math.hypot(d, cy - by + 1), q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), new V3(cx - x, cy - by + 1, cz - z).normalize());
    gb.add(new THREE.CylinderGeometry(0.05 * s, 0.11 * s, L, 5), new THREE.Matrix4().compose(new V3((x + cx) / 2, (by - 1 + cy) / 2, (z + cz) / 2), q, new V3(1, 1, 1)), 'bark', false);
    for (let j = 0; j < 4; j++) { const ox = (WR() - 0.5) * 1.8 * s, oz = (WR() - 0.5) * 1.8 * s, oy = (WR() - 0.3) * 0.7 * s; const r = (0.7 + WR() * 0.6) * s; gb.add(new THREE.IcosahedronGeometry(r * 0.55, 1), mat4(cx + ox, cy + oy, cz + oz, WR() * 6, WR(), 0, 1.25, 0.6 + WR() * 0.3, 1.15), 'pine', false);
      for (let k = 0; k < 9; k++) LEAF_CARDS.push([cx + ox + (WR() - 0.5) * 1.6 * r, cy + oy + (WR() - 0.4) * 0.8 * r, cz + oz + (WR() - 0.5) * 1.6 * r, (1.0 + WR() * 0.8) * r * 1.3]); }
    crown.push([cx, cy - 0.3 * s, cz]);
  }
  gb.add(new THREE.IcosahedronGeometry(0.7 * s, 1), mat4(x, y0 + 9.2 * s, z, 0, 0, 0, 1.3, 0.7, 1.3), 'pine', false);
  for (let k = 0; k < 12; k++) LEAF_CARDS.push([x + (WR() - 0.5) * 2.4 * s, y0 + (8.8 + WR() * 1.2) * s, z + (WR() - 0.5) * 2.4 * s, (1.4 + WR() * 0.8) * s]);
  addCollider(x - 0.45 * s, z - 0.45 * s, x + 0.45 * s, z + 0.45 * s, 10, false, y0 - 1);
  // Spanish moss curtains
  const mm = new THREE.MeshStandardMaterial({ map: mossTex(), transparent: true, alphaTest: 0.08, side: THREE.DoubleSide, roughness: 1, color: 0xa8b098, depthWrite: false });
  for (const [cx, cy, cz] of crown) for (let k = 0; k < 3; k++) {
    const w = 0.8 + WR() * 1.4, h = 1.6 + WR() * 2.4, m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mm);
    m.position.set(cx + (WR() - 0.5) * 2.4 * s, cy - 0.4 - h / 2, cz + (WR() - 0.5) * 2.4 * s); m.rotation.y = WR() * Math.PI; root.add(m);
  }
}
function buildShack(gb, root, h, n) {
  const { U0, U1, V0, V1, st } = h, Y = BY1, eave = BY1 + WALL_H + 0.05, P = st.P, tin = n % 2 ? 'tinRust' : 'tin';
  const B = (key, u, v, y, w, hh, d, rz = 0, rx = 0) => { const [x, z] = h.W(u, v); gb.box(key, x, y, z, w, hh, d, h.phi, rx, rz); };
  // platform, joists and stilts
  B('deckGray', (U1 + U1 + P) / 2, 0, Y - 0.04, P, 0.08, st.Wd);
  B('darkWood', (U0 + U1 + P) / 2, 0, Y - 0.2, st.L + P + 0.1, 0.22, st.Wd + 0.12);
  for (const u of [U0 + 0.05, (U0 + U1) / 2, U1, U1 + P - 0.08]) for (const v of [V0 + 0.05, 0, V1 - 0.05]) {
    const [x, z] = h.W(u, v), g = bayouTerrain(x, z, false) - 0.3; gb.cyl('bark', x + (WR() - 0.5) * 0.05, (g + Y - 0.3) / 2, z, 0.08, 0.1, Y - 0.3 - g, 6);
  }
  for (const v of [V0 + 0.05, V1 - 0.05]) B('darkWood', (U0 + U1) / 2, v, (Y - 0.3) / 2 + 0.1, st.L, 0.06, 0.06, 0.32);
  const fr = h.rect(U0 - 0.2, V0 - (st.leanTo ? 1.8 : 0.2), U1 + P, V1 + 0.2); addCollider(fr[0], fr[1], fr[2], fr[3], 1.5, false, -1);
  // gable roof of rusty corrugated tin (ridge runs front to back so the gable faces the porch)
  const axisX = Math.abs(h.c) > 0.5, A = h.W(U0, 0), Bp = h.W(U1, 0), a0 = h.W(U0 - 0.45, 0), a1 = h.W(U1 + 0.35, 0);
  gableRoof(gb, axisX
    ? { axis: 'x', c: A[1], w: st.Wd + 0.16, a0: Math.min(a0[0], a1[0]), a1: Math.max(a0[0], a1[0]), eave, rise: st.rise, over: 0.4, gables: [A[0], Bp[0]], mat: tin, wallMat: 'shackSiding' }
    : { axis: 'z', c: A[0], w: st.Wd + 0.16, a0: Math.min(a0[1], a1[1]), a1: Math.max(a0[1], a1[1]), eave, rise: st.rise, over: 0.4, gables: [A[1], Bp[1]], mat: tin, wallMat: 'shackSiding' });
  // patched sheets laid over the roof
  for (let k = 0; k < 4; k++) { const side = k % 2 ? 1 : -1, u = lerp(U0, U1, 0.15 + WR() * 0.7), vv = side * (st.Wd / 4 + (WR() - 0.5) * 0.6), ang = Math.atan2(st.rise, st.Wd / 2), y = eave + st.rise * (1 - Math.abs(vv) / (st.Wd / 2)) + 0.13;
    const [x, z] = h.W(u, vv); gb.box(k % 2 ? 'tinRust' : 'tin', x, y, z, 0.9 + WR() * 0.6, 0.03, 1.0 + WR() * 0.5, h.phi, side * ang, 0); }
  // porch: shed roof, posts, railings, steps
  const drop = 0.45, pw = P + 0.45, pang = Math.atan2(drop, pw), py = eave - 0.25 - drop / 2;
  B(tin, U1 + pw / 2 - 0.05, 0, py, pw, 0.05, st.Wd + 0.4, -pang);
  B('darkWood', U1 + 0.04, 0, eave - 0.32, 0.1, 0.1, st.Wd + 0.3);
  const postH = eave - 0.25 - drop * (P - 0.1) / pw - Y;
  for (const v of [V0 + 0.08, V1 - 0.08]) B('darkWood', U1 + P - 0.08, v, Y + postH / 2, 0.11, postH, 0.11);
  B('darkWood', U1 + P - 0.08, 0, Y + postH - 0.05, 0.12, 0.12, st.Wd);
  const [s0, s1] = st.st, rail = (u0, v0, u1, v1, post = true) => { if (Math.abs(u1 - u0) + Math.abs(v1 - v0) < 0.2) return; const p = h.W(u0, v0), q = h.W(u1, v1); railRunWood(gb, p[0], p[1], q[0], q[1], Y, post); };
  rail(U1 + P - 0.05, V0 + 0.05, U1 + P - 0.05, s0 - 0.02); rail(U1 + P - 0.05, s1 + 0.02, U1 + P - 0.05, V1 - 0.05);
  rail(U1 + 0.1, V0 + 0.05, U1 + P - 0.05, V0 + 0.05, false); rail(U1 + 0.1, V1 - 0.05, U1 + P - 0.05, V1 - 0.05, false);
  const run = 2.0, ns = 8;
  for (let k = 0; k < ns; k++) { const y = lerp(Y, BY0, (k + 1) / ns); B('deckGray', U1 + P + (k + 0.5) * run / ns, (s0 + s1) / 2, y - 0.03, run / ns + 0.02, 0.06, s1 - s0); }
  for (const sv of [s0 - 0.04, s1 + 0.04]) { const ang = Math.atan2(Y - BY0, run); B('darkWood', U1 + P + run / 2, sv, (Y + BY0) / 2 - 0.12, Math.hypot(run, Y - BY0) + 0.1, 0.2, 0.05, -ang); B('darkWood', U1 + P + run / 2, sv, (Y + BY0) / 2 + 0.85, Math.hypot(run, Y - BY0), 0.05, 0.05, -ang); }
  // doorway framing so the step from porch to room reads clearly
  { const [D0, D1] = st.door; B('deckGray', U1, (D0 + D1) / 2, Y - 0.01, 0.2, 0.03, D1 - D0); }
  // style details
  if (n % 3 === 0) { const [x, z] = h.W(U0 + 1.0, V0 + 0.9); gb.cyl('metal', x, eave + st.rise * 0.6, z, 0.08, 0.08, st.rise * 1.5 + 0.6, 10); gb.cyl('railBlack', x, eave + st.rise * 1.35 + 0.35, z, 0.13, 0.11, 0.12, 10); }
  if (st.leanTo) { // closed lean-to shed on the side, on its own stilts
    const lu0 = U0 + 0.4, lu1 = U0 + 3.0, lv0 = V0 - 1.6;
    B('shackSiding', (lu0 + lu1) / 2, lv0 + 0.05, Y + 0.8, lu1 - lu0, 1.8, 0.1); B('shackSiding', lu0 + 0.05, (lv0 + V0) / 2, Y + 0.8, 0.1, 1.8, 1.6); B('shackSiding', lu1 - 0.05, (lv0 + V0) / 2, Y + 0.8, 0.1, 1.8, 1.6);
    B('deckGray', (lu0 + lu1) / 2, (lv0 + V0) / 2, Y - 0.12, lu1 - lu0, 0.1, 1.6);
    const la = Math.atan2(0.7, 1.9); B(tin, (lu0 + lu1) / 2, (lv0 + V0) / 2 - 0.05, Y + 2.05, lu1 - lu0 + 0.4, 0.05, 1.95, 0, la * (h.c >= 0 ? 1 : 1));
    for (const u of [lu0 + 0.1, lu1 - 0.1]) { const [x, z] = h.W(u, lv0 + 0.1), g = bayouTerrain(x, z, false) - 0.3; gb.cyl('bark', x, (g + Y - 0.2) / 2, z, 0.07, 0.09, Y - 0.2 - g, 6); }
  }
  if (st.loft) { const [x, z] = h.W(U1 + 0.1, 0); const w = 0.8, hh = 0.6, y = eave + 0.7;
    if (axisX) { gb.box('glass', x, y, z, 0.02, hh, w); gb.box('trim', x, y + hh / 2 + 0.03, z, 0.05, 0.06, w + 0.1); gb.box('trim', x, y - hh / 2 - 0.03, z, 0.05, 0.06, w + 0.1); gb.box('trim', x, y, z, 0.04, hh, 0.04); }
    else { gb.box('glass', x, y, z, w, hh, 0.02); gb.box('trim', x, y + hh / 2 + 0.03, z, w + 0.1, 0.06, 0.05); gb.box('trim', x, y - hh / 2 - 0.03, z, w + 0.1, 0.06, 0.05); gb.box('trim', x, y, z, 0.04, hh, 0.04); } }
  // porch clutter: crab trap, bucket, rocking chair, hanging net
  { const [x, z] = h.W(U1 + P - 0.5, V0 + 0.45); const f = fur(gb, x, z, h.phi + 0.4, Y); f.box('railBlack', 0, 0.2, 0, 0.6, 0.4, 0.45); f.box('rugMat' in MATS ? 'darkWood' : 'darkWood', 0, 0.41, 0, 0.62, 0.02, 0.47); f.solid(-0.3, -0.24, 0.3, 0.24, 0.5); }
  { const [x, z] = h.W(U1 + 0.45, V1 - 0.5); gb.cyl('metal', x, Y + 0.17, z, 0.15, 0.12, 0.34, 10); }
}
// rough wooden railing (no white paint out here)
function railRunWood(gb, x0, z0, x1, z1, y, post = true, h = 0.95) {
  const along = Math.abs(x1 - x0) > Math.abs(z1 - z0), L = Math.hypot(x1 - x0, z1 - z0);
  for (const yy of [y + h - 0.05, y + 0.5]) { if (along) gb.mm('darkWood', Math.min(x0, x1), yy - 0.04, z0 - 0.035, Math.max(x0, x1), yy + 0.04, z0 + 0.035); else gb.mm('darkWood', x0 - 0.035, yy - 0.04, Math.min(z0, z1), x0 + 0.035, yy + 0.04, Math.max(z0, z1)); }
  const n = Math.max(1, Math.round(L / 0.9)); for (let i = 1; i < n; i++) { const t = i / n, x = lerp(x0, x1, t), z = lerp(z0, z1, t); gb.box('darkWood', x, y + h / 2 - 0.02, z, 0.05, h - 0.05, 0.05, 0, 0, (i % 2 ? 0.5 : -0.5) * (along ? 1 : 0)); }
  if (post) for (const [x, z] of [[x0, z0], [x1, z1]]) gb.mm('darkWood', x - 0.05, y, z - 0.05, x + 0.05, y + h + 0.05, z + 0.05);
  addCollider(Math.min(x0, x1) - 0.06, Math.min(z0, z1) - 0.06, Math.max(x0, x1) + 0.06, Math.max(z0, z1) + 0.06, h + 0.1, false, y);
}
function buildBayou(gb, root) {
  // ---------- ground, water, boardwalk
  { const g = new THREE.PlaneGeometry(160, 160, 160, 160); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, bayouTerrain(p.getX(i), p.getZ(i), false)); g.computeVertexNormals(); gb.add(g, mat4(0, 0, 0), 'mud', true); }
  { const w = new THREE.Mesh(new THREE.CircleGeometry(120, 64), MATS.swampWater); w.rotation.x = -Math.PI / 2; w.position.y = -0.05; w.receiveShadow = true; root.add(w); }
  const N = 64;
  for (let i = 0; i < N; i++) {
    const am = (i + 0.5) / N * Math.PI * 2, len = 2 * BW_R * Math.sin(Math.PI / N) + 0.02;
    gb.box('deckGray', Math.cos(am) * BW_R, 0.31, Math.sin(am) * BW_R, 2 * BW_W, 0.1, len, -am, 0, (WR() - 0.5) * 0.03);
    if (i % 3 === 0) for (const rr2 of [BW_R - BW_W + 0.1, BW_R + BW_W - 0.1]) gb.cyl('bark', Math.cos(am) * rr2, 0.0, Math.sin(am) * rr2, 0.07, 0.09, 0.6, 6);
  }
  gb.mm('deckGray', -1.1, 0.24, -26, 1.1, 0.34, -BW_R - BW_W + 0.1);
  for (const z of [-16, -19, -22, -25.7]) for (const x of [-1.05, 1.05]) gb.cyl('bark', x, 0.05, z, 0.07, 0.09, 0.65, 6);
  // the dock and an old pirogue tied up
  gb.mm('deckGray', -3.5, 0.24, -27.5, 3.5, 0.34, -25.8); for (const x of [-3.4, 0, 3.4]) gb.cyl('bark', x, 0.3, -27.6, 0.09, 0.1, 1.1, 6);
  { const p = []; for (let i = 0; i <= 8; i++) { const t = i / 8; p.push(new THREE.Vector2(Math.sin(t * Math.PI) * 0.42 + 0.02, (t - 0.5) * 4.4)); } const g = new THREE.LatheGeometry(p, 10, 0, Math.PI); g.rotateZ(Math.PI / 2); g.rotateX(Math.PI); gb.add(g, mat4(-2.0, 0.02, -29.0, 0.1), 'darkWood', false); }
  // the easter egg: a bait bucket of chicken necks at the end of the dock, and the old dinner bell on its post
  { const bx = 2.6, bz = -26.6, by = 0.34;
    gb.cyl('metal', bx, by + 0.15, bz, 0.15, 0.12, 0.3, 14); gb.add(new THREE.TorusGeometry(0.15, 0.006, 4, 16, Math.PI), mat4(bx, by + 0.3, bz, 0.4), 'metal', false);
    for (let k = 0; k < 6; k++) gb.sphere('fabricRose', bx + Math.cos(k * 2.1) * 0.06, by + 0.29, bz + Math.sin(k * 2.1) * 0.06, 0.035, 1.6, 0.6, 0.8);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.45), PROP_HIT_MAT); hit.position.set(bx, by + 0.25, bz); root.add(hit); INTERACT.push({ mesh: hit, kind: 'egg', id: 2 }); addCollider(bx - 0.17, bz - 0.17, bx + 0.17, bz + 0.17, 0.3, true, by); }
  { const px = -3.0, pz = -26.1, py = 0.34;
    gb.cyl('darkWood', px, py + 0.9, pz, 0.06, 0.07, 1.8, 8); gb.box('darkWood', px + 0.22, py + 1.75, pz, 0.5, 0.06, 0.06);
    const bell = new THREE.LatheGeometry([0.02, 0.05, 0.08, 0.1, 0.115, 0.12].map((r, i) => new THREE.Vector2(r, 0.16 - i * 0.032)), 16); gb.add(bell, mat4(px + 0.38, py + 1.52, pz), 'brass', false);
    gb.cyl('metal', px + 0.38, py + 1.69, pz, 0.008, 0.008, 0.06, 5);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), PROP_HIT_MAT); hit.position.set(px + 0.3, py + 1.55, pz); root.add(hit); INTERACT.push({ mesh: hit, kind: 'egg', id: 3 }); addCollider(px - 0.08, pz - 0.08, px + 0.08, pz + 0.08, 2, false, py); }
  // ---------- shacks
  BAYOU_HOUSES.forEach((h, n) => { buildShack(gb, root, h, n); furnishShack(gb, root, h, n); });
  // ---------- courtyard: the old family graveyard (mausoleums, rows of headstones, the dead oak), a lamp post at the gate.
  // Drawn large so the rows are easy to walk; graves that would fall out past the yard's edge are left out.
  const GK = 15 / 10.5, gp = (x, z) => [x * GK, 0.3 + (z - 0.3) * GK];   // positions measured at the old size -> the new
  placeModel(root, { url: 'prop-graveyard.json', x: 0, z: 0.3, y: BY0 - 0.02, len: 15, axis: 'x', cols: 'parts', minH: 0.3, maxW: 3.7, crop: 8.2 });
  // the dead oak and the headstones its roots have grown into come as one piece, so they get their own blockers
  { const [x, z] = gp(3.3, 3.75); addCollider(x - 0.6, z - 0.6, x + 0.6, z + 0.6, 4, false, BY0); }
  for (const [x0, z0] of [[0, 3.5], [-0.5, 3.5], [5, 4.5], [5, 2.25], [-2, 2.25], [0, 2.15]]) { const [x, z] = gp(x0, z0); if (Math.hypot(x, z - 0.3) < 8.2) addCollider(x - 0.33, z - 0.33, x + 0.33, z + 0.33, 1.5, true, BY0); }
  // offerings left in front of the graves: candles, flowers, a teddy; the ghost can knock them about
  for (const [t, x, z, r] of [['candle', -3.1, -7.5, 0], ['candle', -2.8, -7.55, 0], ['vase', -1.6, -7.5, 0.4], ['teddy', 0.3, -7.55, 2.8], ['candle', 2.3, -7.5, 0], ['vase', 3.2, -7.45, 1.1], ['bottle', 3.8, -7.3, 0.5], ['jbox', -4.0, -7.3, 0.2], ['basket', -0.6, -7.65, 0]]) prop(t, x, bayouTerrain(x, z, false), z, r);
  // lamp post by the gate (the courtyard's light; its switch is on the post)
  { const lx = 1.4, lz = -8.6, ly = bayouTerrain(lx, lz, false);
    gb.cyl('darkWood', lx, ly + 1.5, lz, 0.08, 0.1, 3.0, 8); gb.box('darkWood', lx - 0.25, ly + 2.95, lz, 0.55, 0.07, 0.07); gb.cyl('tentPole', lx - 0.5, ly + 2.92, lz, 0.006, 0.006, 0.08, 4); addCollider(lx - 0.15, lz - 0.15, lx + 0.15, lz + 0.15, 3, false, ly); }
  // ---------- cypress swamp around the ring
  const placed = [];
  for (let k = 0; k < 400 && placed.length < 24; k++) {
    const a = WR() * 6.28, r = YARD + 1.5 + WR() * 18, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(r - BW_R) < 2.6) continue;
    if (BAYOU_HOUSES.some(h => { const [cx, cz] = h.W((h.U0 + h.U1 + h.st.P + 2) / 2, 0); return Math.hypot(x - cx, z - cz) < 6.2; })) continue;
    if (Math.abs(x) < 5 && z < -BW_R + 1) continue;
    if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 4)) continue;
    placed.push([x, z]); cypress(gb, root, x, z, 0.6 + WR() * 0.45);
  }
  flushLeafCards(root);
  for (let k = 0; k < 4; k++) { const a = WR() * 6.28, r = 16 + WR() * 8, x = Math.cos(a) * r, z = Math.sin(a) * r; if (BAYOU_HOUSES.some(h => Math.hypot(x - h.px, z - h.pz) < 7)) continue; snag(x, z, 0.8 + WR() * 0.4, bayouTerrain(x, z, false)); }
  // dead snags standing out of the water among the cypress
  for (let k = 0, n = 0; k < 200 && n < 12; k++) { const a = WR() * 6.28, r = YARD + 3 + WR() * 20, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(r - BW_R) < 3 || placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 3.5) || BAYOU_HOUSES.some(h => Math.hypot(x - h.px, z - h.pz) < 8) || (Math.abs(x) < 5 && z < -BW_R + 1)) continue;
    placed.push([x, z]); snag(x, z, 0.6 + WR() * 0.6, bayouTerrain(x, z, false)); n++; }
  for (let k = 0; k < 90; k++) { const a = WR() * 6.28, r = 27 + WR() * 10; gb.cyl('pine', Math.cos(a) * r, -0.035, Math.sin(a) * r, 0.22 + WR() * 0.28, 0.22, 0.01, 10); }
  // fireflies
  { const n = 180, pos = new Float32Array(n * 3); for (let k = 0; k < n; k++) { const a = WR() * 6.28, r = YARD + 1 + WR() * 18; pos[k * 3] = Math.cos(a) * r; pos[k * 3 + 1] = 0.5 + WR() * 2.3; pos[k * 3 + 2] = Math.sin(a) * r; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.ShaderMaterial({ uniforms: { uTime: GHOST_U.uTime }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'uniform float uTime; varying float vA; void main(){ vec3 p = position; float ph = position.x*1.7 + position.z*2.3; p += vec3(sin(uTime*0.3+ph), sin(uTime*0.5+ph*1.3)*0.4, cos(uTime*0.27+ph))*0.8; vA = pow(max(0.0, sin(uTime*1.3 + ph*3.1)), 6.0); vec4 mv = modelViewMatrix*vec4(p,1.); gl_PointSize = clamp(60.0 / -mv.z, 1.0, 6.0); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.0,d)*vA; gl_FragColor = vec4(vec3(0.8,1.0,0.35)*a*1.6, a); }' });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; root.add(pts); }
  // ---------- dock lantern and a stand-in porch bulb
  gb.cyl('darkWood', 3.2, 2.0, -18.5, 0.08, 0.1, 4.0, 8); gb.box('darkWood', 3.2, 4.05, -18.5, 0.12, 0.12, 0.5);
  { const lh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffb050, emissiveIntensity: 3 })); lh.position.set(3.2, 3.9, -18.5); root.add(lh); WORLD_EXTRA.streetBulb = lh; }
  addCollider(3.05, -18.65, 3.35, -18.35, 4);
  { const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffc070, emissiveIntensity: 0 })); b.position.set(0, -20, 0); root.add(b); WORLD_EXTRA.porchBulb = b; }
  // ---------- edge of the walkable swamp
  for (let i = 0; i < 48; i++) { const a = i / 48 * 6.28, x = Math.cos(a) * 26.6, z = Math.sin(a) * 26.6; if (Math.abs(x) < 5.5 && z < -20) continue; addCollider(x - 1.8, z - 1.8, x + 1.8, z + 1.8, 10, false, -3); }
  // ...with a gap for the dock: the water stops you at its sides and end instead
  addCollider(-3.6, -29.6, 3.6, -27.65, 10, false, -3); addCollider(3.6, -28.6, 5.4, -24.6, 10, false, -3); addCollider(-5.4, -28.6, -3.6, -24.6, 10, false, -3);
}
// lots of small things in every shack for the ghost to throw, knock and roll
function furnishShack(gb, root, h, n) {
  const { U0, U1, V0, V1, st } = h, Y = BY1, kind = n % 5;
  const F = (u, v, r = 0) => { const [x, z] = h.W(u, v); return fur(gb, x, z, h.phi + r, Y); };
  const P = (type, u, v, dy, r = WR() * 6) => { const [x, z] = h.W(u, v); prop(type, x, Y + dy, z, h.phi + r); };
  const cl = st.closet ? 1.45 : 0;
  // bed along the left wall, headboard at the back
  { const f = F(U0 + 1.05, V0 + 0.55, Math.PI / 2); bed(f, 0.95, 1.95, kind === 3 ? 'beddingKid' : 'mattress', 'darkWood'); f.solid(-0.5, -1.0, 0.5, 1.0, 0.6); }
  P(kind === 3 ? 'teddy' : 'book', U0 + 0.5, V0 + 0.55, 0.56);
  // trunk at the foot of the bed
  { const f = F(U0 + 2.3, V0 + 0.45, Math.PI / 2); f.box('darkWood', 0, 0.25, 0, 0.8, 0.5, 0.45); f.box('brass', 0, 0.38, -0.23, 0.08, 0.06, 0.01); f.solid(-0.42, -0.25, 0.42, 0.25, 0.55); }
  P('jbox', U0 + 2.3, V0 + 0.35, 0.5); P('clock', U0 + 2.3, V0 + 0.65, 0.5);
  // table with two chairs, set for a meal nobody finished
  const tu = (U0 + cl + U1 - 1.0) / 2 + 0.2, tv = V1 - 0.95;
  { const f = F(tu, tv); f.box('darkWood', 0, 0.74, 0, 1.15, 0.05, 0.75); for (const [a, b] of [[-0.52, -0.32], [0.52, -0.32], [-0.52, 0.32], [0.52, 0.32]]) f.box('darkWood', a, 0.36, b, 0.05, 0.72, 0.05); f.solid(-0.58, -0.38, 0.58, 0.38, 0.8);
    for (const [a, r] of [[-0.8, Math.PI / 2], [0.8, -Math.PI / 2]]) { const [cx, cz] = h.W(tu + a, tv); const c = fur(gb, cx, cz, h.phi + r, Y); chair(c, 'darkWood', 'darkWood'); c.solid(-0.22, -0.22, 0.22, 0.22, 0.5); } }
  for (const [t, a, b] of [['plate', -0.3, -0.15], ['plate', 0.3, 0.15], ['mug', 0.4, -0.2], ['cup', -0.4, 0.2], ['candle', 0.0, 0.0], ['bottle', 0.15, -0.25], ['bowl', -0.15, 0.25]]) P(t, tu + a, tv + b, 0.765);
  // shelves by the door side wall, full of jars and odds and ends
  { const su = U1 - 0.75, sv = V0 + 0.2; const f = F(su, sv, Math.PI); f.box('darkWood', 0, 1.0, -0.17, 1.2, 2.0, 0.03); for (const y of [0.3, 0.8, 1.3, 1.8]) f.box('darkWood', 0, y, 0, 1.2, 0.03, 0.34); f.solid(-0.6, -0.18, 0.6, 0.18, 2);
    const items = [['bottle', -0.4, 0.315], ['vase', 0.0, 0.315], ['book', 0.35, 0.315], ['candle', -0.35, 0.815], ['jbox', 0.1, 0.815], ['cup', 0.42, 0.815], ['bottle', -0.2, 1.315], ['clock', 0.25, 1.315], ['bowl', 0.0, 1.815]];
    for (const [t, a, y] of items) { const [x, z] = f.pt(a, 0); prop(t, x, Y + y, z, WR() * 6); } }
  // a rocking chair and the room's own character
  { const f = F((U0 + U1) / 2, V0 + 1.7, -0.6); f.box('darkWood', 0, 0.45, 0, 0.5, 0.04, 0.5); f.box('darkWood', 0, 0.85, 0.24, 0.5, 0.8, 0.04, 0, -0.15); for (const a of [-0.24, 0.24]) f.box('darkWood', a, 0.04, 0, 0.04, 0.05, 0.9); f.solid(-0.3, -0.45, 0.3, 0.45, 1); }
  const cu = U1 - 0.6, cv = V1 - 0.55;
  if (kind === 0) { // trapper: wood stove, pots, traps
    const f = F(cu, cv); f.box('railBlack', 0, 0.4, 0, 0.6, 0.8, 0.55); f.cyl('railBlack', 0, 1.7, 0.1, 0.07, 0.07, 2.0, 8); f.solid(-0.35, -0.32, 0.35, 0.32, 1);
    P('pot', cu, cv - 0.1, 0.8); P('kettle', cu + 0.15, cv + 0.12, 0.8); P('basket', (U0 + U1) / 2 + 0.6, V0 + 0.6, 0); P('bottle', (U0 + U1) / 2, V0 + 0.4, 0);
  } else if (kind === 1) { // shrine: candles, a doll, a covered mirror
    const f = F(cu, cv, Math.PI * 0.75); f.box('darkWood', 0, 0.45, 0, 0.85, 0.9, 0.45); f.box('fabricRose', 0, 0.91, 0, 0.9, 0.02, 0.5); f.solid(-0.45, -0.25, 0.45, 0.25, 1);
    for (let j = 0; j < 6; j++) f.cyl('wax', -0.32 + j * 0.12, 0.98 + (j % 2) * 0.03, (j % 3 - 1) * 0.1, 0.02, 0.02, 0.12 + (j % 3) * 0.05, 6);
    P('teddy', cu, cv, 0.92); P('candle', cu - 0.5, cv + 0.2, 0); P('candle', cu - 0.8, cv - 0.1, 0); P('vase', U0 + 2.8, V1 - 0.4, 0);
  } else if (kind === 2) { // bait shop: crates, barrel, bottles everywhere
    for (const [du, dv] of [[0, 0], [-0.65, 0], [0, -0.65]]) { const f = F(cu + du, cv + dv, WR() * 0.4); f.box('cardboard', 0, 0.28, 0, 0.55, 0.56, 0.55); f.solid(-0.28, -0.28, 0.28, 0.28, 0.6); }
    P('bottle', cu, cv, 0.56); P('bottle', cu - 0.65, cv, 0.56); P('jbox', cu, cv - 0.65, 0.56); P('basket', U0 + 2.6, V1 - 0.5, 0); P('pot', (U0 + U1) / 2, V0 + 0.6, 0);
  } else if (kind === 3) { // family: toys all over the floor
    const f = F(cu, cv - 0.2, 0.3); rockingHorse(f, root); f.solid(-0.2, -0.5, 0.2, 0.5, 0.8);
    P('ball', (U0 + U1) / 2 + 0.4, V0 + 2.0, 0.1); P('block', (U0 + U1) / 2 - 0.3, V0 + 2.2, 0.035); P('block', (U0 + U1) / 2 - 0.1, V0 + 2.45, 0.035); P('truck', U0 + 2.6, V1 - 0.5, 0.04); P('teddy', (U0 + U1) / 2, V1 - 0.3, 0.13);
  } else { // smokehouse: hanging racks over a hearth, buckets, a cleaver block
    const f = F(cu, cv); f.box('brick', 0, 0.25, 0, 0.8, 0.5, 0.6); f.box('screen', 0, 0.51, 0, 0.6, 0.02, 0.45); f.solid(-0.42, -0.32, 0.42, 0.32, 0.6);
    for (const a of [-0.3, 0, 0.3]) f.cyl('darkWood', a, 2.2, 0, 0.015, 0.015, 0.6, 5);
    P('pot', cu, cv, 0.52); P('kettle', cu - 0.6, cv + 0.1, 0); P('basket', (U0 + U1) / 2 + 0.5, V0 + 0.55, 0); P('bottle', U0 + 2.6, V1 - 0.4, 0);
  }
  rug(gb, ...h.W((U0 + U1) / 2 + 0.2, (V0 + V1) / 2), 1.5, 2.2, h.phi, Y);
}
