// ---------------------------------------------------------------- map: Drennen Estate (two storeys, walkout deck)
// Modelled on a red-sided farmhouse: two-storey main block with front and back gables, a one-storey wing on the
// left, a stone bump-out on the front right, a covered front porch with white posts and dark railings, and a tall
// back deck over a walkout basement where the ground falls away.
const FA0 = 0.6, FA1 = 3.4;   // floor heights: main floor, upstairs
MAPS.farm = {
  id: 'farm', title: 'Drennen Estate', eyebrow: 'New River Gorge', lede: 'The Drennens left the estate in a single night in 2009 and the bank never found a buyer. Neighbours still see a light upstairs. Set up at the tent, find out what is in there, and get out before it hunts you.',
  levels: [FA0, FA1], extBase: [0.3, 3.3], extTop: [3.4, 6.15], siding: 'sidingRed', skirt: null, shutter: 'shutterBlack', crooked: false,
  trimColor: 0xe6e4de, noShutters: wd => !wd.o.shut,
  mirrorAt: 15,   // authored with the wing on +x; reflected so it matches the photo (wing on the left as you face the porch)
  tent: { x: 2.2, z: -9.6 }, lure: 8, moonTarget: [7.5, 0, 5], grassBox: [-13, -26, 29, 27],
  street: [21.5, 5.6, -7.0], porch: [11.75, FA0 + 1.85, -0.4],
  navBox: [-1.2, -2.4, 16.2, 10.2],
  terrain(x, z) { return -2.6 * smooth(4.5, 10.4, z); },
  yardName: p => p.z > 10 ? 'Back yard' : p.z > -0.2 && (p.x < -1.2 || p.x > 16.2) ? 'Side yard' : 'Front yard',
  outsideStep(p) { if (p.y > terrainY(p.x, p.z) + 0.1) return 'step_wood'; return (p.x > 7.5 && p.x < 13 && p.z < -3.4 && p.z > -30) ? 'step_concrete' : 'step_grass'; },
  menuCam(T, cam) { const a = -0.6 + Math.sin(T * 0.03) * 0.9; cam.position.set(7.5 + Math.sin(a) * 20, 3.4 + Math.sin(T * 0.1) * 0.3, 4 - Math.cos(a) * 20); cam.lookAt(7.5, 3.2, 4); },
  grassOK(x, z) {
    if (x > -1.6 && x < 16.6 && z > -3.7 && z < 10.4) return false;            // house + porch
    if (x > -1.4 && x < 16.5 && z > 10 && z < 13.9) return false;              // under the deck
    if (x > 16 && x < 21 && z > 11.9 && z < 13.7) return false;                // deck stairs
    if (x > 8.6 && x < 12.8 && z < -3.4) return false;                         // drive
    if (x > 7.2 && x < 15 && z > -8.8 && z < -3.6) return false;             // gravel turnaround
    return true;
  },
  rooms: [
    // ---- main floor
    { id: 'family', name: 'Family Room', r: [-1, 0, 6, 5.5], floor: 'woodF', wall: 'wpBeige', sw: [5.94, 1.3, -1, 0], lamp: [2.5, 2.8] },
    { id: 'master', name: 'Master Bedroom', r: [-1, 5.5, 3.8, 10], floor: 'carpetRose', wall: 'wpRose', sw: [3.45, 5.56, 0, 1], lamp: [1.4, 7.6] },
    { id: 'mbath', name: 'Master Bath', r: [3.8, 5.5, 6, 10], floor: 'bathF', wall: 'bathTileW', sw: [5.6, 5.56, 0, 1], lamp: [4.9, 7.8] },
    { id: 'kitchen', name: 'Kitchen', r: [6, 0, 9.4, 5], floor: 'checkerF', wall: 'plasterY', sw: [6.06, 4.5, 1, 0], lamp: [7.7, 2.4] },
    { id: 'foyer', name: 'Entry Hall', r: [9.4, 0, 12.4, 5], floor: 'marbleF', wall: 'wpBeige', sw: [9.75, 0.105, 0, 1], lamp: [10.3, 2.6], noGhost: true },
    { id: 'dining', name: 'Dining Room', r: [12.4, 0, 16, 5], floor: 'woodF', wall: 'wpRed', sw: [12.46, 1.75, 1, 0], lamp: [14.2, 2.6], chandelier: true },
    { id: 'nook', name: 'Stone Nook', r: [13.4, -2.2, 16, 0], floor: 'woodF', wall: 'wpRed', sw: [13.505, -1.6, 1, 0], lamp: [14.7, -1.1], noGhost: true },
    { id: 'great', name: 'Great Room', r: [6, 5, 16, 10], floor: 'woodF', wall: 'wpGreen', sw: [9.2, 5.06, 0, 1], lamp: [9.5, 7.6] },
    // ---- upstairs
    { id: 'hall2', name: 'Upstairs Landing', r: [9.4, 0, 12.4, 7], lv: 1, floor: 'woodF', wall: 'wpBeige', sw: [9.46, 4.6, 1, 0], lamp: [10.3, 3.2], noGhost: true },
    { id: 'kid', name: "Claire's Room", r: [6, 0, 9.4, 5], lv: 1, floor: 'woodF', wall: 'wpRose', sw: [9.34, 1.5, -1, 0], lamp: [7.7, 2.2] },
    { id: 'guest', name: "Jim's Room", r: [12.4, 0, 16, 5], lv: 1, floor: 'carpetBlue', wall: 'wpBlue', sw: [12.46, 1.6, 1, 0], lamp: [14.2, 2.5] },
    { id: 'bath2', name: 'Upstairs Bath', r: [6, 5, 9.4, 7], lv: 1, floor: 'bathF', wall: 'bathTileW', sw: [9.34, 6.8, -1, 0], lamp: [7.7, 6] },
    { id: 'sewing', name: 'Sewing Room', r: [12.4, 5, 16, 7], lv: 1, floor: 'woodF', wall: 'plasterG', sw: [12.46, 6.8, 1, 0], lamp: [14.2, 6] },
    { id: 'loft', name: 'Loft', r: [6, 7, 16, 10], lv: 1, floor: 'woodF', wall: 'wpBeige', sw: [12.2, 7.06, 0, 1], lamp: [11, 8.5] },
    // ---- closets (hiding spots)
    { id: 'mcloset', name: 'Master Closet', r: [-1, 8.6, 0.9, 10], floor: 'woodF', wall: 'plasterG', closet: true, parent: 1, door: 7 },
    { id: 'kcloset', name: "Claire's Closet", r: [6, 3.8, 7.4, 5], lv: 1, floor: 'woodF', wall: 'plasterG', closet: true, parent: 9, door: 8 },
  ],
  walls: [
    // ---- main floor, exterior
    { z: 0, a: -1.1, b: 13.4, t: 0.2, ext: true, open: [{ s: 1.0, e: 3.6, win: 1, sill: 0.6, shut: 1 }, { s: 4.3, e: 5.3, win: 1, shut: 1 }, { s: 7.0, e: 8.4, win: 1 }, { s: 10.2, e: 11.2, door: 0 }] },
    { x: 13.4, a: -2.3, b: -0.1, t: 0.2, ext: true },
    { z: -2.2, a: 13.3, b: 16.1, t: 0.2, ext: true, open: [{ s: 14.2, e: 15.4, win: 1 }] },
    { x: 16, a: -2.3, b: 9.9, t: 0.2, ext: true, open: [{ s: 1.6, e: 2.8, win: 1 }, { s: 7.0, e: 8.2, win: 1 }] },
    { x: -1, a: 0.1, b: 9.9, t: 0.2, ext: true, open: [{ s: 1.8, e: 3.0, win: 1 }, { s: 6.8, e: 8.0, win: 1 }] },
    { z: 10, a: -1.1, b: 16.1, t: 0.2, ext: true, open: [{ s: 1.2, e: 2.4, win: 1 }, { s: 4.6, e: 5.3, win: 1, sill: 1.4 }, { s: 7.9, e: 8.9, win: 1, sill: 0.3, top: 2.3 }, { s: 10.5, e: 11.5, door: 1 }, { s: 13.1, e: 14.1, win: 1, sill: 0.3, top: 2.3 }] },
    // ---- main floor, interior
    { x: 6, a: 0.1, b: 9.9, t: 0.12, open: [{ s: 2.0, e: 4.0, arch: 1 }] },
    { z: 5.5, a: -0.9, b: 6, t: 0.12, open: [{ s: 2.2, e: 3.1, door: 2 }, { s: 4.4, e: 5.2, door: 3 }] },
    { x: 3.8, a: 5.5, b: 9.9, t: 0.12 },
    { z: 5, a: 6, b: 15.9, t: 0.12, open: [{ s: 7.0, e: 8.6, arch: 1 }, { s: 9.6, e: 11.0, arch: 1 }, { s: 13.4, e: 14.8, arch: 1 }] },
    { x: 9.4, a: 0.1, b: 5, t: 0.12, open: [{ s: 3.4, e: 4.6, arch: 1 }] },
    { x: 12.4, a: 0.1, b: 5, t: 0.12, open: [{ s: 0.4, e: 1.3, door: 4 }] },
    { z: 0, a: 13.4, b: 16, t: 0.12, open: [{ s: 13.7, e: 15.7, arch: 1 }] },
    { x: 11.1, a: 1.4, b: 5, t: 0.1 },                                    // wall under the staircase
    { z: 8.6, a: -0.9, b: 0.95, t: 0.1, open: [{ s: -0.7, e: 0.2, door: 7 }] },
    { x: 0.9, a: 8.6, b: 9.9, t: 0.1 },
    // ---- upstairs, exterior
    { z: 0, lv: 1, a: 5.9, b: 16.1, t: 0.2, ext: true, open: [{ s: 10.5, e: 11.5, win: 1, shut: 1 }] },
    { x: 6, lv: 1, a: 0.1, b: 9.9, t: 0.2, ext: true, open: [{ s: 0.5, e: 1.3, win: 1, sill: 1.0, top: 2.0 }] },
    { x: 16, lv: 1, a: 0.1, b: 9.9, t: 0.2, ext: true, open: [{ s: 2.0, e: 3.0, win: 1 }, { s: 8.0, e: 9.0, win: 1 }] },
    { z: 10, lv: 1, a: 5.9, b: 16.1, t: 0.2, ext: true, open: [{ s: 10.4, e: 11.6, win: 1, sill: 0.3, top: 2.75 }] },
    // ---- upstairs, interior
    { x: 9.4, lv: 1, a: 0.1, b: 7, t: 0.12, open: [{ s: 2.0, e: 2.9, door: 5 }, { s: 5.6, e: 6.5, door: 9 }] },
    { x: 12.4, lv: 1, a: 0.1, b: 7, t: 0.12, open: [{ s: 0.3, e: 1.2, door: 6 }, { s: 5.6, e: 6.5, door: 10 }] },
    { z: 5, lv: 1, a: 6, b: 9.4, t: 0.12 },
    { z: 5, lv: 1, a: 12.4, b: 15.9, t: 0.12 },
    { z: 7, lv: 1, a: 6, b: 15.9, t: 0.12, open: [{ s: 10.0, e: 11.8, arch: 1 }] },
    { z: 3.8, lv: 1, a: 6.05, b: 7.45, t: 0.1, open: [{ s: 6.2, e: 7.1, door: 8 }] },
    { x: 7.4, lv: 1, a: 3.8, b: 5, t: 0.1 },
  ],
  doors: [
    { z: 0, s: 10.2, e: 11.2, hinge: 's', into: 1, front: true, mat: 'doorWhite', oval: true },
    { z: 10, s: 10.5, e: 11.5, hinge: 's', into: -1, ext: true, mat: 'doorWhite', glassDoor: true },
    { z: 5.5, s: 2.2, e: 3.1, hinge: 's', into: 1 },
    { z: 5.5, s: 4.4, e: 5.2, hinge: 'e', into: 1 },
    { x: 12.4, s: 0.4, e: 1.3, hinge: 's', into: 1 },
    { x: 9.4, s: 2.0, e: 2.9, hinge: 's', into: -1, lv: 1 },
    { x: 12.4, s: 0.3, e: 1.2, hinge: 's', into: 1, lv: 1 },
    { z: 8.6, s: -0.7, e: 0.2, hinge: 's', into: -1, closet: 14 },
    { z: 3.8, s: 6.2, e: 7.1, hinge: 's', into: -1, closet: 15, lv: 1 },
    { x: 9.4, s: 5.6, e: 6.5, hinge: 's', into: -1, lv: 1 },
    { x: 12.4, s: 5.6, e: 6.5, hinge: 's', into: 1, lv: 1 },
  ],
  stairs: [{ x0: 11.15, z0: 1.4, x1: 12.35, z1: 5, axis: 'z', lo: 0, hi: 1 }],
  slabs: [
    { x0: -1.1, z0: -2.85, x1: 13.45, z1: 0.0, y: FA0 },                       // front porch deck
    { x0: 9.4, z0: -3.25, x1: 12.0, z1: -2.85, y: 0.4 }, { x0: 9.4, z0: -3.65, x1: 12.0, z1: -3.25, y: 0.2 },
    { x0: -1.15, z0: 9.95, x1: 16.25, z1: 13.65, y: FA0 },                     // back deck
    { x0: 16.25, z0: 12.2, x1: 20.65, z1: 13.4, ramp: true, axis: 'x', ya: FA0, yb: -2.6 },
  ],
  build(gb, root) { buildFarm(gb, root); },
};

// gable roof: ridge along `axis`, c = ridge position across, w = wall-to-wall width, [a0,a1] extent along the ridge
function gableRoof(gb, o) {
  const half = o.w / 2, ang = Math.atan2(o.rise, half), run = half + o.over, L = run / Math.cos(ang) + 0.04;
  const lowY = o.eave - o.over * Math.tan(ang), cy = (lowY + o.eave + o.rise) / 2 + 0.06, len = o.a1 - o.a0, mid = (o.a0 + o.a1) / 2;
  const mat = o.mat || 'shinglesDark';
  for (const side of [-1, 1]) {
    const ca = o.c + side * run / 2;
    if (o.axis === 'z') gb.box(mat, ca, cy, mid, L, 0.1, len, 0, 0, -side * ang); else gb.box(mat, mid, cy, ca, len, 0.1, L, 0, side * ang);
    // fascia on the eave + rake boards on the ends
    const fa = o.c + side * (run + 0.02);
    if (o.axis === 'z') gb.mm('trim', fa - 0.03, lowY - 0.2, o.a0, fa + 0.03, lowY + 0.04, o.a1); else gb.mm('trim', o.a0, lowY - 0.2, fa - 0.03, o.a1, lowY + 0.04, fa + 0.03);
    for (const [end, show] of [[o.a0 + 0.03, o.rakeA0 !== false], [o.a1 - 0.03, o.rakeA1 !== false]]) {
      if (!show) continue;
      if (o.axis === 'z') gb.box('trim', ca, cy - 0.06, end, L, 0.24, 0.05, 0, 0, -side * ang); else gb.box('trim', end, cy - 0.06, ca, 0.05, 0.24, L, 0, side * ang);
    }
    // soffit under the overhang
    if (o.axis === 'z') gb.mm('trim', Math.min(fa, o.c + side * half), lowY - 0.02, o.a0, Math.max(fa, o.c + side * half), lowY, o.a1);
    else gb.mm('trim', o.a0, lowY - 0.02, Math.min(fa, o.c + side * half), o.a1, lowY, Math.max(fa, o.c + side * half));
  }
  if (o.axis === 'z') gb.box(mat, o.c, o.eave + o.rise + 0.13, mid, 0.26, 0.06, len); else gb.box(mat, mid, o.eave + o.rise + 0.13, o.c, len, 0.06, 0.26);
  // gable triangles
  for (const e of o.gables || []) {
    const sh = new THREE.Shape(); sh.moveTo(o.c - half, o.eave); sh.lineTo(o.c + half, o.eave); sh.lineTo(o.c, o.eave + o.rise * 0.985); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false });
    if (o.axis === 'z') gb.add(g, mat4(0, 0, e - 0.1), o.wallMat || 'sidingRed', true); else gb.add(g, mat4(e + 0.1, 0, 0, -Math.PI / 2), o.wallMat || 'sidingRed', true);
  }
  return { ang, lowY };
}
function railRun(gb, x0, z0, x1, z1, y, h = 0.95, post = true) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 0.12)), along = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  for (let i = 1; i < n; i++) { const t = i / n, x = lerp(x0, x1, t), z = lerp(z0, z1, t); gb.mm('railBlack', x - 0.012, y + 0.1, z - 0.012, x + 0.012, y + h - 0.06, z + 0.012); }
  const w = 0.045;
  if (along) { gb.mm('trim', Math.min(x0, x1), y + h - 0.06, z0 - w, Math.max(x0, x1), y + h, z0 + w); gb.mm('trim', Math.min(x0, x1), y + 0.07, z0 - 0.025, Math.max(x0, x1), y + 0.11, z0 + 0.025); }
  else { gb.mm('trim', x0 - w, y + h - 0.06, Math.min(z0, z1), x0 + w, y + h, Math.max(z0, z1)); gb.mm('trim', x0 - 0.025, y + 0.07, Math.min(z0, z1), x0 + 0.025, y + 0.11, Math.max(z0, z1)); }
  if (post) for (const [x, z] of [[x0, z0], [x1, z1]]) gb.mm('trim', x - 0.055, y, z - 0.055, x + 0.055, y + h + 0.08, z + 0.055);
  addCollider(Math.min(x0, x1) - 0.06, Math.min(z0, z1) - 0.06, Math.max(x0, x1) + 0.06, Math.max(z0, z1) + 0.06, h + 0.1, false, y);
}
function tubAt(gb, x, z, ry, y) { const f = fur(gb, x, z, ry, y); furModel(f, 'prop-tub.json', null, { len: 1.7, axis: 'x', turn: -Math.PI / 2 }); f.solid(-0.4, -0.85, 0.4, 0.85, 0.65); }   // taps at local +z
function toiletAt(gb, x, z, ry, y) { const f = fur(gb, x, z, ry, y); toilet(f); f.solid(-0.25, -0.35, 0.25, 0.35, 0.8); }
function vanityAt(gb, root, x, z, ry, y) {
  const f = fur(gb, x, z, ry, y); vanity(f); f.solid(-0.38, -0.26, 0.38, 0.45, 0.9);
  const [mx, mz] = f.pt(0, -0.25); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), MATS.mirror); m.position.set(mx, y + 1.6, mz); m.rotation.y = ry; root.add(m);
}
function dressForm(gb, x, z, y) { // a sewing mannequin; easy to mistake for someone standing in the dark
  gb.cyl('darkWood', x, y + 0.02, z, 0.18, 0.2, 0.04, 12); gb.cyl('metal', x, y + 0.5, z, 0.015, 0.015, 1.0, 6);
  const p = [[0.0, 0], [0.13, 0.02], [0.16, 0.18], [0.12, 0.34], [0.15, 0.5], [0.17, 0.6], [0.08, 0.68], [0.03, 0.72]].map(([r, h]) => new THREE.Vector2(r, h));
  const g = new THREE.LatheGeometry(p, 16); g.scale(1, 1, 0.75); gb.add(g, mat4(x, y + 0.95, z), 'fabricRose', false);
  addCollider(x - 0.2, z - 0.2, x + 0.2, z + 0.2, 1.7, true, y);
}

function buildFarm(gb, root) {
  const Y0 = FA0, Y1 = FA1, F0 = (x, z, ry = 0) => fur(gb, x, z, ry, Y0), F1 = (x, z, ry = 0) => fur(gb, x, z, ry, Y1);
  // ---------- ground: lawn that falls away behind the house
  { const g = new THREE.PlaneGeometry(220, 220, 150, 150); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 7, z = p.getZ(i) + 2; p.setY(i, terrainY(x, z)); }
    g.computeVertexNormals(); gb.add(g, mat4(7, 0, 2), 'grassBase', true); }
  // ---------- foundation (exposed concrete where the ground drops)
  const found = (x0, z0, x1, z1) => { gb.mm('concreteFound', x0, -2.75, z0, x1, 0.32, z1); addCollider(x0, z0, x1, z1, 3.1, false, -2.8); };
  found(-1.15, -0.15, 13.4, -0.05); found(-1.15, -0.1, -1.05, 10.15); found(15.95, -0.1, 16.15, 10.15); found(-1.15, 10.05, 16.15, 10.17);
  // walkout basement face under the deck
  gb.mm('screen', 3.0, -2.6, 10.17, 3.9, -0.6, 10.19); gb.mm('trimWhite', 2.92, -0.62, 10.17, 3.98, -0.55, 10.2);
  for (const wx of [7.6, 12.4]) { gb.mm('screen', wx, -1.7, 10.17, wx + 1.4, -0.8, 10.19); gb.mm('trimWhite', wx - 0.05, -1.75, 10.17, wx + 1.45, -1.7, 10.21); }
  gb.mm('screen', 9.4, -2.6, 10.17, 11.6, -0.7, 10.19); // dark open storage bay
  // stone bump-out cladding (over the siding)
  const stoneFace = (alongX, c, a, b, holes, y0 = 0.0, y1 = 3.4, out = 1) => {
    let pieces = [[a, b, y0, y1]];
    for (const [hs, he, hy0, hy1] of holes) pieces = pieces.flatMap(([s0, e0, p0, p1]) => { if (he <= s0 || hs >= e0) return [[s0, e0, p0, p1]]; const r = []; if (hs > s0) r.push([s0, hs, p0, p1]); if (he < e0) r.push([he, e0, p0, p1]); r.push([Math.max(hs, s0), Math.min(he, e0), p0, hy0], [Math.max(hs, s0), Math.min(he, e0), hy1, p1]); return r; });
    for (const [s0, e0, p0, p1] of pieces) { if (p1 - p0 < 0.01) continue; if (alongX) gb.mm('stone', s0, p0, Math.min(c, c + out * 0.04), e0, p1, Math.max(c, c + out * 0.04)); else gb.mm('stone', Math.min(c, c + out * 0.04), p0, s0, Math.max(c, c + out * 0.04), p1, e0); }
  };
  stoneFace(true, -2.3, 13.26, 16.14, [[14.2, 15.4, Y0 + 0.9, Y0 + 2.1]], -0.2, 3.4, -1);
  stoneFace(false, 13.3, -2.34, -0.1, [], -0.2, 3.4, -1);
  stoneFace(false, 16.1, -2.34, 0, [], -0.2, 3.4, 1);
  // ---------- roofs
  gableRoof(gb, { axis: 'z', c: 11, w: 10.2, a0: -0.55, a1: 10.55, eave: 6.15, rise: 3.6, over: 0.45, gables: [0, 10] });
  gableRoof(gb, { axis: 'x', c: 5, w: 10.2, a0: -1.6, a1: 5.9, eave: 3.4, rise: 2.5, over: 0.45, gables: [-1], rakeA1: false });
  gableRoof(gb, { axis: 'z', c: 14.7, w: 2.85, a0: -2.75, a1: -0.1, eave: 3.4, rise: 1.3, over: 0.3, gables: [-2.2], rakeA1: false, wallMat: 'stone' });
  gb.cyl('metal', 7.4, 8.6, 8.6, 0.11, 0.11, 3.0, 12); gb.cyl('railBlack', 7.4, 10.15, 8.6, 0.16, 0.13, 0.18, 12); gb.cyl('metal', 7.4, 7.35, 8.6, 0.2, 0.2, 0.12, 12);   // wood stove flue
  // back gable: arched window head + two triangle windows
  { const g = new THREE.CircleGeometry(0.6, 20, 0, Math.PI); gb.add(g, mat4(11, 6.15, 10.106), 'glass', false); gb.add(new THREE.TorusGeometry(0.62, 0.05, 6, 20, Math.PI), mat4(11, 6.15, 10.12), 'trim', false);
    gb.mm('trim', 10.97, 6.15, 10.1, 11.03, 6.75, 10.13);
    for (const [cx, sgn] of [[8.6, -1], [13.4, 1]]) {
      const sh = new THREE.Shape(); sh.moveTo(cx - 0.7, 6.35); sh.lineTo(cx + 0.7, 6.35); sh.lineTo(sgn < 0 ? cx + 0.7 : cx - 0.7, 6.35 + 1.4 * 3.6 / 5.1); sh.closePath();
      gb.add(new THREE.ShapeGeometry(sh), mat4(0, 0, 10.106), 'glass', false);
      gb.mm('trim', cx - 0.75, 6.29, 10.1, cx + 0.75, 6.35, 10.14);
    }
    // the same windows seen from inside the loft (glow from the moon)
  }
  // ---------- front porch: deck, steps, posts, shed roof, railings
  gb.mm('deckGray', -1.1, 0.0, -2.85, 13.45, Y0, 0.0);
  gb.mm('deckGray', 9.4, 0.0, -3.25, 12.0, 0.4, -2.85); gb.mm('deckGray', 9.4, 0.0, -3.65, 12.0, 0.2, -3.25);
  gb.mm('trim', -1.12, 0.0, -2.88, 13.47, 0.12, -2.84);
  { const slope = Math.atan2(0.55, 2.85), under = z => 3.05 + (z + 2.95) * Math.tan(slope);
    gb.box('shinglesDark', 9.7, under(-1.5) + 0.06, -1.5, 7.6, 0.1, 2.95 / Math.cos(slope), 0, -slope);
    gb.mm('trim', 5.88, under(-2.95) - 0.18, -2.99, 13.4, under(-2.95) + 0.02, -2.93);
    gb.mm('trim', 5.95, 2.88, -2.74, 13.35, under(-2.66), -2.58);
    gb.mm('trim', 5.95, under(-0.1) - 0.16, -0.14, 13.35, under(-0.1), -0.1);
    for (const px of [6.2, 9.3, 13.2]) { gb.mm('trim', px - 0.07, Y0, -2.73, px + 0.07, 2.9, -2.59); addCollider(px - 0.1, -2.75, px + 0.1, -2.57, 3, false, Y0); }
  }
  railRun(gb, -1.0, -2.75, 6.1, -2.75, Y0); railRun(gb, 6.3, -2.75, 9.2, -2.75, Y0, 0.95, false); railRun(gb, 12.0, -2.75, 13.1, -2.75, Y0);
  railRun(gb, -1.03, -2.7, -1.03, -0.15, Y0);
  railRun(gb, 13.33, -2.7, 13.33, -2.36, Y0, 0.95, false);
  addCollider(-1.2, -3.0, 9.35, -2.85, 1, false, 0); addCollider(12.05, -3.0, 13.5, -2.85, 1, false, 0); addCollider(-1.25, -2.9, -1.1, 0, 1, false, 0);
  // porch props: bench, milk can, potted planters, half barrel by the steps
  { const f = F0(5.2, -0.45, Math.PI); f.box('trimWhite', 0, 0.45, 0, 1.1, 0.04, 0.4); for (let i = 0; i < 6; i++) f.box('trimWhite', -0.45 + i * 0.18, 0.75, 0.18, 0.06, 0.6, 0.03); for (const a of [-0.5, 0.5]) f.box('trimWhite', a, 0.22, 0, 0.05, 0.44, 0.38); f.solid(-0.56, -0.22, 0.56, 0.22, 1); }
  gb.cyl('chrome', 13.0, Y0 + 0.3, -0.35, 0.16, 0.18, 0.6, 14); gb.cyl('chrome', 13.0, Y0 + 0.66, -0.35, 0.08, 0.14, 0.12, 14);
  for (const [px, pz] of [[8.9, -2.45], [12.5, -2.45], [-0.6, -0.4]]) { gb.cyl('blackPlastic', px, Y0 + 0.17, pz, 0.17, 0.12, 0.34, 12); gb.sphere('pine', px, Y0 + 0.42, pz, 0.2, 1, 0.7, 1); }
  { gb.cyl('darkWood', 12.7, 0.25, -3.5, 0.34, 0.3, 0.5, 14); gb.sphere('pine', 12.7, 0.55, -3.5, 0.32, 1, 0.6, 1); addCollider(12.35, -3.85, 13.05, -3.15, 0.6); }
  // bushes along the front
  for (const [bx, bz, s] of [[14.6, -3.3, 1.2], [16.6, -2.8, 0.9], [-1.8, -3.3, 0.8], [3.4, -3.3, 0.7]]) { gb.sphere('pine', bx, 0.45 * s, bz, 0.8 * s, 1.1, 0.75, 1); addCollider(bx - 0.7 * s, bz - 0.7 * s, bx + 0.7 * s, bz + 0.7 * s, 1.2); }
  // AC unit on the left side
  gb.mm('acUnit' in MATS ? 'acUnit' : 'grayPlastic', -2.0, terrainY(-1.6, 1.4), 0.9, -1.25, terrainY(-1.6, 1.4) + 0.75, 1.75); addCollider(-2.05, 0.85, -1.2, 1.8, 1);
  // porch light by the front door
  gb.box('brass', 11.75, Y0 + 1.95, -0.14, 0.12, 0.2, 0.1);
  { const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffc070, emissiveIntensity: 0 })); b.position.set(11.75, Y0 + 1.85, -0.2); root.add(b); WORLD_EXTRA.porchBulb = b; }
  // ---------- back deck over the walkout
  gb.mm('deckGray', -1.15, Y0 - 0.12, 10.15, 16.25, Y0, 13.65);
  gb.mm('trim', -1.17, Y0 - 0.32, 13.6, 16.27, Y0 - 0.1, 13.68);
  for (const px of [-1.05, 2.4, 5.9, 9.4, 12.8, 16.15]) {
    const gy = terrainY(px, 13.5);
    gb.mm('trimWhite', px - 0.08, gy, 13.42, px + 0.08, Y0 - 0.12, 13.58); addCollider(px - 0.1, 13.4, px + 0.1, 13.6, 4, false, gy - 0.2);
    // knee braces like the photo: a Y on each post
    for (const sgn of [-1, 1]) if ((sgn < 0 && px > -1) || (sgn > 0 && px < 16)) gb.box('trimWhite', px + sgn * 0.45, Y0 - 0.62, 13.5, 0.07, 1.1, 0.07, 0, 0, -sgn * 0.75);
  }
  railRun(gb, -1.1, 13.58, 16.2, 13.58, Y0); railRun(gb, -1.1, 10.2, -1.1, 13.55, Y0); railRun(gb, 16.2, 10.2, 16.2, 12.15, Y0);
  // deck stairs down to the lawn
  { const n = 16; for (let i = 0; i < n; i++) { const x0 = 16.25 + i * (4.4 / n), y = lerp(Y0, -2.6, (i + 1) / n); gb.mm('deckGray', x0, y - 0.05, 12.22, x0 + 4.4 / n + 0.02, y + 0.02, 13.38); }
    for (const zz of [12.17, 13.43]) { gb.box('trimWhite', 18.45, (Y0 - 2.6) / 2 - 0.15, zz, 4.75, 0.25, 0.05, 0, 0, -Math.atan2(3.2, 4.4)); gb.box('trim', 18.45, (Y0 - 2.6) / 2 + 0.85, zz, 4.75, 0.06, 0.07, 0, 0, -Math.atan2(3.2, 4.4)); addCollider(16.2, zz - 0.04, 20.7, zz + 0.04, 5, false, -2.8); }
    gb.mm('trimWhite', 20.55, -2.6, 12.12, 20.65, -1.6, 12.22); gb.mm('trimWhite', 20.55, -2.6, 13.38, 20.65, -1.6, 13.48);
  }
  // under the deck: bench, bins, hose reel
  gb.mm('trimWhite', 9.6, -1.9, 11.6, 11.6, -1.85, 12.0); for (const bx of [9.75, 11.45]) gb.mm('trimWhite', bx - 0.04, -2.6, 11.62, bx + 0.04, -1.9, 11.98); addCollider(9.55, 11.55, 11.65, 12.05, 0.8, false, -2.6);
  for (const bx of [4.2, 5.0]) { gb.cyl('blackPlastic', bx, -2.15, 10.8, 0.3, 0.28, 0.9, 12); addCollider(bx - 0.32, 10.48, bx + 0.32, 11.12, 1, false, -2.6); }
  gb.cyl('toyBlue', 13.8, -2.2, 11.2, 0.25, 0.25, 0.25, 16, 0, Math.PI / 2);
  // ---------- staircase (entry hall up to the landing)
  { const n = 15, run = 3.6 / n, rise = (Y1 - Y0) / n;
    for (let i = 0; i < n; i++) { const z = 1.4 + i * run, y = Y0 + (i + 1) * rise; gb.mm('darkWood', 11.15, y - 0.04, z, 12.35, y, z + run + 0.03); gb.mm('trimWhite', 11.15, y - rise, z + run - 0.02, 12.35, y - 0.04, z + run); }
    gb.box('trimWhite', 11.12, (Y0 + Y1) / 2 - 0.25, 3.2, 0.05, 0.4, 4.4, 0, -Math.atan2(Y1 - Y0, 3.6));
    // handrail on the wall side
    gb.box('darkWood', 12.3, (Y0 + Y1) / 2 + 0.9, 3.2, 0.05, 0.06, 4.4, 0, -Math.atan2(Y1 - Y0, 3.6));
  }
  // upstairs railing around the stairwell
  railRun(gb, 11.12, 1.37, 11.12, 5.0, Y1); railRun(gb, 11.12, 1.37, 12.34, 1.37, Y1, 0.95, false);
  // ---------- MAIN FLOOR FURNITURE
  // family room
  { const f = F0(-0.1, 0.14, Math.PI); tvStand(f); f.solid(-0.56, -0.38, 0.56, 0, 1.1); }
  { const f = F0(0.6, 4.72, 0); sofa(f, 2.0, 'fabricBrown', 'prop-couch2.json', root); f.solid(-1.1, -0.45, 1.1, 0.45, 1); }   // faces the TV, with a cat-sized gap behind it
  { const f = F0(0.6, 3.6); coffeeTable(f); f.solid(-0.4, -0.4, 0.4, 0.4, 0.45); }
  rug(gb, 0.8, 3.4, 3.0, 2.2, 0, Y0);
  { const f = F0(3.6, 2.4, Math.PI / 2); armchair(f, 'fabricGreen'); f.solid(-0.45, -0.45, 0.45, 0.45, 1); }
  { const f = F0(5.62, 0.9, Math.PI / 2); bookshelf(f); f.solid(-0.5, -0.18, 0.5, 0.18, 2); }
  { const f = F0(5.5, 4.9); floorLamp(f); f.solid(-0.15, -0.15, 0.15, 0.15, 1.7); }
  prop('mug', 0.4, Y0 + 0.445, 3.55); prop('remote', 0.8, Y0 + 0.445, 3.7, 0.6); prop('book', 0.55, Y0 + 0.445, 3.85, 1.1);
  picFrame(root, 'x', -0.89, 4.2, Y0 + 1.7, 1, 'p61', 0, 0.55);
  // master bedroom
  { const f = F0(2.69, 7.9, -Math.PI / 2); placeModel(root, { url: 'prop-bed3.json', x: 2.69, z: 7.9, y: Y0, ry: Math.PI / 2, len: 1.65, axis: 'x', cols: false }); f.solid(-0.82, -1.08, 0.82, 1.08, 0.7); }   // headboard to the wall
  { const f = F0(3.45, 6.4, -Math.PI / 2); nightstand(f); f.solid(-0.25, -0.22, 0.25, 0.22, 0.6); tableLamp(f, 0.05, 0.58, 0.05); }
  { const f = F0(2.9, 9.62, 0); dresser(f); f.solid(-0.7, -0.25, 0.7, 0.25, 1); }
  prop('clock', 3.45, Y0 + 0.585, 6.25); prop('jbox', 2.75, Y0 + 1.1, 9.65); prop('book', 3.05, Y0 + 1.1, 9.6, 0.4);
  picFrame(root, 'z', 1.3, 5.56, Y0 + 1.6, 1, 'p33', 0, 0.5);
  // master bath
  tubAt(gb, 4.9, 9.48, Math.PI / 2, Y0); toiletAt(gb, 5.6, 7.3, -Math.PI / 2, Y0); vanityAt(gb, root, 4.1, 7.4, Math.PI / 2, Y0);
  prop('soap', 4.29, Y0 + VANITY_SHELF, 7.19);
  // kitchen
  { gb.mm('paintedWood', 8.9, Y0, 0.1, 9.34, Y0 + 0.88, 0.74); gb.mm('porcelain', 8.9, Y0 + 0.88, 0.1, 9.34, Y0 + 0.92, 0.78); addCollider(6.06, 0.1, 9.34, 0.78, 0.95, true, Y0);
    furModel(F0(6.48, 0.1, Math.PI), PACK.kit, 'Horno', { len: 0.84, axis: 'x', back: true });
    counter(F0(7.4, 0.1, Math.PI), 1); counter(F0(8.4, 0.1, Math.PI), 0);   // the sink unit, then a unit of drawers
    for (const [x0, x1] of [[8.5, 9.34], [6.06, 6.9]]) gb.mm('paintedWood', x0, Y0 + 1.45, 0.1, x1, Y0 + 2.2, 0.45); }
  { const f = F0(6.06, 4.55, -Math.PI / 2); furModel(f, PACK.kit, 'Heladera', { height: 1.8, back: true }); f.solid(-0.38, -0.74, 0.38, 0, 1.8); }
  { const f = F0(8.45, 0.1, Math.PI); furModel(f, PACK.kit, 'Microondas', { len: 0.5, axis: 'x', back: true, dy: 0.92 }); }
  { const f = F0(9.1, 4.7, 0); furModel(f, PACK.kit, 'TachoBasura', { height: 0.5 }); f.solid(-0.2, -0.15, 0.2, 0.15, 0.5); }
  { const f = F0(7.9, 2.6); kitchenTable(f); f.solid(-0.74, -0.4, 0.74, 0.4, 0.8);
    for (const [a, r] of [[-1.0, Math.PI / 2], [1.0, -Math.PI / 2]]) { const [cx, cz] = f.pt(a, 0); const c = F0(cx, cz, r); chair(c, 'lightWood', 'fabricBlue'); c.solid(-0.22, -0.22, 0.22, 0.22, 0.5); } }
  prop('pot', 6.3, Y0 + 0.88, 0.45); prop('kettle', 6.65, Y0 + 0.88, 0.62); prop('cup', 9.1, Y0 + 0.92, 0.4); prop('bottle', 8.0, Y0 + 0.92, 0.75); prop('plate', 7.75, Y0 + 0.76, 2.5); prop('mug', 8.1, Y0 + 0.76, 2.75);
  // entry hall
  placeModel(root, { url: 'prop-sidetable2.json', x: 9.62, z: 2.2, y: Y0, ry: Math.PI / 2, len: 1.05, axis: 'x', cols: 'box' });   // the lamp, books and keepsake box come with it
  rug(gb, 10.3, 1.4, 1.4, 2.2, 0, Y0);
  shoesAt(11.45, 0.3, Y0, [['shoe2', 0, 0.05], ['shoe2', 0.13, -0.03], ['shoe4', 0.38, 0.1], ['shoe4', 0.5, 0.0], ['shoe5', 0.72, 0.4, 1.4]]);
  shoesAt(11.8, 9.7, Y0, [['slipper1', 0, 0, 3.1], ['slipper1', 0.14, -0.04, 3.3], ['shoe5', 0.4, -0.05, 2.9]]);
  // dining room + nook
  placeModel(root, { url: 'prop-dining.json', x: 14.15, z: 2.3, y: Y0, cols: 'parts' });   // clear of the hutch, with room to walk all the way round
  { const f = F0(15.68, 4.2, -Math.PI / 2); f.box('darkWood', 0, 0.45, 0, 1.4, 0.9, 0.48); f.box('darkWood', 0, 1.45, 0.06, 1.36, 1.1, 0.36); f.box('glass', 0, 1.45, -0.125, 1.2, 0.96, 0.01); for (let i = 0; i < 5; i++) f.cyl('porcelain', -0.5 + i * 0.25, 1.32, 0.12, 0.1, 0.1, 0.012, 16, Math.PI / 2 - 0.25); f.solid(-0.7, -0.25, 0.7, 0.25, 2); }
  prop('plate', 13.65, Y0 + 0.785, 2.05); prop('plate', 14.6, Y0 + 0.785, 2.55); prop('candle', 14.15, Y0 + 0.785, 2.3); prop('cup', 13.85, Y0 + 0.785, 2.55); prop('vase', 15.6, Y0 + 0.9, 4.6);
  { const f = F0(14.3, -1.3, Math.PI * 0.85); armchair(f, 'fabricRose'); f.solid(-0.42, -0.42, 0.42, 0.42, 1); }
  { const f = F0(15.55, -0.55); nightstand(f); f.solid(-0.3, -0.3, 0.3, 0.3, 0.6); }
  prop('book', 15.55, Y0 + 0.58, -0.55, 0.3);
  // great room
  { gb.mm('railBlack', 6.7, Y0, 9.0, 7.5, Y0 + 0.7, 9.7); gb.mm('railBlack', 6.65, Y0 + 0.7, 8.95, 7.55, Y0 + 0.74, 9.75); gb.mm('screen', 6.9, Y0 + 0.2, 8.99, 7.3, Y0 + 0.55, 9.0); gb.cyl('railBlack', 7.4, (Y0 + 0.74 + CEIL_FARM0) / 2, 9.35, 0.08, 0.08, CEIL_FARM0 - Y0 - 0.74, 10); gb.mm('brick', 6.4, Y0 - 0.02, 8.7, 7.8, Y0 + 0.02, 9.98); addCollider(6.6, 8.9, 7.6, 9.8, 1, true, Y0); }
  { const f = F0(10.9, 6.3, Math.PI); sofa(f, 2.1, 'fabricGreen', 'prop-couch3.json', root); f.solid(-1.2, -0.45, 1.2, 0.45, 1); }
  { const f = F0(10.9, 7.55); coffeeTable(f); f.solid(-0.4, -0.4, 0.4, 0.4, 0.45); }
  rug(gb, 10.9, 7.5, 3.4, 2.4, 0, Y0);
  { const f = F0(8.3, 8.6, -Math.PI * 0.7); armchair(f); f.solid(-0.42, -0.42, 0.42, 0.42, 1); }
  { const f = F0(15.6, 8.9, -Math.PI / 2); f.box('darkWood', 0, 0.65, 0, 1.4, 1.3, 0.55); f.box('enamel', 0, 0.78, -0.28, 1.2, 0.05, 0.02); f.box('darkWood', 0, 0.75, -0.35, 1.3, 0.04, 0.2); f.solid(-0.7, -0.3, 0.7, 0.3, 1.3); }
  { const f = F0(15.68, 5.9, -Math.PI / 2); bookshelf(f); f.solid(-0.5, -0.18, 0.5, 0.18, 2); }
  prop('book', 10.7, Y0 + 0.445, 7.5, 0.5); prop('candle', 11.2, Y0 + 0.445, 7.6); prop('vase', 15.6, Y0 + 1.33, 8.7);
  picFrame(root, 'z', 12.8, 5.06, Y0 + 1.7, 1, 'p17', 0, 0.85);
  // ---------- UPSTAIRS FURNITURE
  { const f = F1(10.0, 0.45); nightstand(f); f.solid(-0.3, -0.3, 0.3, 0.3, 0.6); }
  gb.mm('runner', 9.6, Y1 + 0.004, 1.6, 10.9, Y1 + 0.012, 6.8);
  prop('phone', 10.0, Y1 + 0.58, 0.45, 1.57);
  picFrame(root, 'x', 9.46, 4.0, Y1 + 1.6, 1, 'p18', 0, 0.55);
  // Claire's and Jim's bedrooms (see 03d_farmrooms.js)
  buildClaireRoom(gb, root); buildJimRoom(gb, root);
  // upstairs bath
  tubAt(gb, 6.95, 6.55, Math.PI / 2, Y1); toiletAt(gb, 7.75, 5.36, 0, Y1); vanityAt(gb, root, 6.6, 5.32, 0, Y1);   // backs to the wall
  prop('cup', 6.39, Y1 + VANITY_SHELF, 5.51);
  // sewing room
  { const f = F1(14.4, 6.62, Math.PI); f.box('lightWood', 0, 0.74, 0, 1.3, 0.04, 0.6); for (const [a, b] of [[-0.6, -0.26], [0.6, -0.26], [-0.6, 0.26], [0.6, 0.26]]) f.box('lightWood', a, 0.36, b, 0.04, 0.72, 0.04); f.box('enamel', 0.1, 0.9, 0, 0.45, 0.28, 0.2); f.solid(-0.65, -0.3, 0.65, 0.3, 0.8);
    const [cx, cz] = f.pt(0, 0.55); const c = F1(cx, cz, 0); chair(c, 'lightWood', 'fabricRose'); }   // on the room side, pulled up to the table
  dressForm(gb, 12.9, 6.4, Y1);
  { const f = F1(15.6, 5.4, 0.2); f.box('cardboard', 0, 0.22, 0, 0.5, 0.44, 0.45); f.box('cardboard', 0.04, 0.6, 0, 0.42, 0.32, 0.4, 0.3); f.solid(-0.28, -0.26, 0.28, 0.26, 0.8); }
  prop('basket', 13.1, Y1 + 0.15, 5.4);
  // loft under the arched window
  { const f = F1(11.0, 9.0, Math.PI); armchair(f); f.solid(-0.42, -0.42, 0.42, 0.42, 1); }
  { const f = F1(14.6, 8.6, -Math.PI / 2); singleBed(f); f.solid(-0.5, -1.0, 0.5, 1.0, 0.6); }
  { const f = F1(6.3, 8.5, Math.PI / 2); bookshelf(f); f.solid(-0.5, -0.18, 0.5, 0.18, 2); }
  { const f = F1(8.6, 9.6, 0.1); f.box('darkWood', 0, 0.28, 0, 1.0, 0.56, 0.55); f.box('brass', 0, 0.5, -0.28, 0.12, 0.08, 0.02); f.solid(-0.52, -0.3, 0.52, 0.3, 0.6); }
  prop('teddy', 14.3, Y1 + 0.5, 8.75); prop('book', 6.35, Y1 + 0.5, 8.2, 1.3); prop('candle', 8.7, Y1 + 0.57, 9.6);
  // ---------- yard: gravel drive & turnaround, trees, yard light, bounds
  gb.mm('gravel', 7.4, 0.0, -8.6, 14.8, 0.025, -3.75); gb.mm('gravel', 8.7, 0.0, -40, 12.7, 0.024, -9.3);
  for (let i = 0; i < 14; i++) { const z = -3.7 - i * 0.55; gb.cyl('chrome', 4.45 + (i % 2) * 0.02, 0.15, z * 1.0 - 0.0, 0.035, 0.035, 0.3, 6); }
  for (const [x, z, s] of [[-7, -6, 1.2], [-9, 4, 1.4], [-8, 14, 1.3], [24, -8, 1.3], [25, 3, 1.1], [26, 16, 1.4], [3, 22, 1.3], [12, 24, 1.2], [-4, 24, 1.1], [20, 23, 1.5], [-10, -16, 1.4], [26, -18, 1.2]]) fir(x, z, s);
  for (const [x, z, s] of [[-2, -14, 0.6], [17, 26, 0.55], [-11, 8, 0.7], [27, 10, 0.6]]) fir(x, z, s);   // young firs
  firBelt([-13, -26, 29, 27], 60, [[5, -80, 16, -8]], 4, 18);
  for (const [x, z, s] of [[-5, -12, 1.1], [19, -14, 1.2], [-6, 9, 1.0], [22, 9, 1.1], [8, 20, 1.2]]) { const g0 = terrainY(x, z); deadTreeAt(gb, x, z, s, g0); }
  // dusk-to-dawn yard light on a pole by the drive
  gb.cyl('darkWood', 21.5, 3.0, -7.0, 0.11, 0.14, 6.0, 10); gb.cyl('metal', 21.0, 5.8, -7.0, 0.03, 0.03, 1.0, 6, 0, 0, Math.PI / 2); gb.box('metal', 20.5, 5.72, -7.0, 0.36, 0.14, 0.3);
  { const lh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.24), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xb8d0ff, emissiveIntensity: 3 })); lh.position.set(20.5, 5.64, -7.0); root.add(lh); WORLD_EXTRA.streetBulb = lh; }
  addCollider(21.3, -7.2, 21.7, -6.8, 6);
  // invisible property bounds (tree line)
  addCollider(-13, -27, -12.5, 27, 12, false, -6); addCollider(28.5, -27, 29, 27, 12, false, -6); addCollider(-13, -27, 29, -26.5, 12, false, -6); addCollider(-13, 26.5, 29, 27, 12, false, -6);
}
const CEIL_FARM0 = FA0 + WALL_H;
function deadTreeAt(gb, x, z, s, y0) { const before = gb.buf.bark ? gb.buf.bark.p.length : 0; deadTree(gb, x, z, s); if (y0) { const B = gb.buf.bark.p; for (let i = before + 1; i < B.length; i += 3) B[i] += y0; COLL[COLL.length - 1].y0 = y0 - 1; COLL[COLL.length - 1].y1 = y0 + 4; } }
