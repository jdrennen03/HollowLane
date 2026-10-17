// ---------------------------------------------------------------- map: Whitlock Stables (horse barn, hayloft, riding arena)
// A red board-and-batten bank barn with a gambrel roof: a brick-paved centre aisle between two rows of box stalls,
// tack room, office, feed room, wash bay and farrier shop on the ground floor, a hayloft above, and a sand arena
// across the yard where Sadie Whitlock used to run barrels on Bonnie Blue.
const BA0 = 0.08, BA1 = BA0 + 2.8;          // aisle floor, hayloft floor
const BW = 25.2, BD = 11.4, AZ0 = 3.9, AZ1 = 7.5;   // barn length (x) and depth (z); the aisle runs along x between AZ0 and AZ1
const STALL_X = [0, 3.6, 7.2, 10.8, 14.4];
const ARENA = { x0: 31, z0: -6, x1: 61, z1: 18 };
const BARRELS = [[44, 11.5], [44, 0.5], [55, 6]];   // cloverleaf: right barrel, left barrel, far barrel

// ---------- textures and materials (built the first time the barn is loaded, so the other maps don't pay for them)
function barnTextures() {
  // red board-and-batten siding, weathered to grey wood where the paint has gone (span 2 m)
  TEX.barnBoard = genMaps(512, (u, v, o) => {
    const nb = 8, fu = fract(u * nb), bi = Math.floor(u * nb), ph = hash2(bi, 3, 201);
    const grain = fbm(u, v, 64, 4, 3, 203 + bi), wear = fbm(u, v, 3, 3, 5, 207), streak = fbm(u, v, 24, 2, 3, 209);
    setRGB(o, 0.43 + ph * 0.07, 0.085 + ph * 0.02, 0.066);
    const bare = smooth(0.66, 0.71, wear + streak * 0.18 - 0.08) * 0.85;
    mixc(o, 0.36 + grain * 0.14, 0.33 + grain * 0.12, 0.29 + grain * 0.1, bare);
    mixc(o, 0.13, 0.05, 0.04, smooth(0.55, 0.8, streak) * (0.25 + 0.5 * (1 - v)) * 0.5);
    const ds = Math.min(fu, 1 - fu), batten = ds < 0.12, sh = batten ? (ds > 0.095 ? 0.62 : 1.08) : (ds < 0.16 ? 0.5 : 1);
    const k = sh * (0.9 + grain * 0.18); o.r *= k; o.g *= k; o.b *= k;
    o.h = batten ? (ds > 0.095 ? 0.75 : 0.95) : 0.35 + grain * 0.12; o.ro = 0.78 + bare * 0.12;
  }, 4);
  // interior stall boards: thick horizontal oak planks, darker and scuffed near the floor (span 2 m)
  TEX.stallBoard = genMaps(512, (u, v, o) => {
    const rows = 13, ri = Math.floor(v * rows), fv = fract(v * rows), ph = hash2(ri, 9, 211);
    const grain = fbm(u, v, 3, 52, 4, 213 + ri), knot = fbm(u, v, 6, 6, 3, 215 + ri);
    const b = 0.78 + ph * 0.38;
    setRGB(o, 0.43 * b + grain * 0.06, 0.29 * b + grain * 0.04, 0.17 * b);
    mixc(o, 0.2, 0.12, 0.06, smooth(0.7, 0.78, knot) * 0.6);
    const low = smooth(0.4, 0.02, v);
    mixc(o, 0.14, 0.1, 0.06, low * 0.55);
    mixc(o, 0.08, 0.06, 0.04, smooth(0.72, 0.8, fbm(u, v, 14, 8, 3, 217)) * low);   // hoof scuffs
    const seam = fv < 0.035 || fv > 0.985 ? 0.35 : 1; o.r *= seam; o.g *= seam; o.b *= seam;
    o.h = (seam < 1 ? 0.1 : 0.55) + grain * 0.2; o.ro = 0.7 + grain * 0.15 + low * 0.1;
  }, 3);
  // brick pavers in a basket-weave, straw and dust in the joints (span 1.2 m, 0.2 m bricks)
  TEX.pavers = genMaps(512, (u, v, o) => {
    const N = 6, cu = u * N, cv = v * N, ci = Math.floor(cu), cj = Math.floor(cv), fu = fract(cu), fv = fract(cv), horiz = (ci + cj) % 2 === 0;
    const half = horiz ? Math.floor(fv * 2) : Math.floor(fu * 2), lu = horiz ? fu : fract(fu * 2), lv = horiz ? fract(fv * 2) : fv;
    const ph = hash2(ci * 2 + (horiz ? 0 : half), cj * 2 + (horiz ? half : 0), 221), n = fbm(u, v, 24, 24, 3, 223);
    const edge = Math.min(lu, 1 - lu, lv, 1 - lv), gap = edge < 0.05;
    if (gap) { setRGB(o, 0.24, 0.21, 0.16); o.h = 0.15; o.ro = 1; }
    else {
      const b = 0.7 + ph * 0.45, char = ph > 0.86;
      setRGB(o, (char ? 0.2 : 0.38) * b + n * 0.05, (char ? 0.17 : 0.2) * b + n * 0.03, (char ? 0.16 : 0.15) * b);
      o.h = 0.6 + n * 0.25 - smooth(0.12, 0.05, edge) * 0.25; o.ro = 0.78 + n * 0.15;
    }
    mixc(o, 0.4, 0.33, 0.2, smooth(0.62, 0.8, fbm(u, v, 4, 4, 4, 225)) * 0.45);
  }, 3);
  // pine shavings bedding with straw strands and damp patches (span 1.5 m)
  TEX.shavings = genMaps(512, (u, v, o) => {
    const fi = Math.floor(u * 70), fj = Math.floor(v * 70), fl = hash2(fi, fj, 231), n = fbm(u, v, 12, 12, 4, 233);
    setRGB(o, 0.6 + fl * 0.12 + n * 0.08, 0.49 + fl * 0.1 + n * 0.06, 0.32 + fl * 0.06);
    const ci = Math.floor(u * 14), cj = Math.floor(v * 14), a = hash2(ci, cj, 235) * Math.PI, du = fract(u * 14) - 0.5, dv = fract(v * 14) - 0.5;
    const line = Math.abs(du * Math.sin(a) - dv * Math.cos(a)), strand = line < 0.025 && hash2(ci, cj, 237) < 0.55;
    if (strand) mixc(o, 0.78, 0.66, 0.34, 0.8);
    mixc(o, 0.36, 0.28, 0.18, smooth(0.62, 0.78, fbm(u, v, 3, 3, 4, 239)) * 0.6);
    o.h = fl * 0.5 + n * 0.4 + (strand ? 0.3 : 0); o.ro = 0.95;
  }, 2.5);
  // arena sand: fine grain, drag-harrow lines, scattered hoof divots (span 4 m)
  TEX.sand = genMaps(512, (u, v, o) => {
    const n = fbm(u, v, 48, 48, 3, 241), m = fbm(u, v, 4, 4, 4, 243), rake = 0.5 + 0.5 * Math.sin(v * Math.PI * 2 * 60 + m * 3);
    setRGB(o, 0.6 + n * 0.1 - m * 0.06, 0.5 + n * 0.08 - m * 0.05, 0.36 + n * 0.06 - m * 0.04);
    const ci = Math.floor(u * 16), cj = Math.floor(v * 16), hx = fract(u * 16) - 0.3 - hash2(ci, cj, 245) * 0.4, hy = fract(v * 16) - 0.3 - hash2(ci, cj, 247) * 0.4;
    const r = Math.hypot(hx, hy * 1.2), hoof = hash2(ci, cj, 249) < 0.14 ? smooth(0.16, 0.1, r) * smooth(0.06, 0.1, Math.hypot(hx + 0.05, hy * 1.2)) : 0;
    mixc(o, 0.4, 0.32, 0.22, hoof * 0.4);
    o.h = 0.5 + rake * 0.08 + n * 0.1 - hoof * 0.4; o.ro = 0.97;
  }, 2.5);
  // baled hay / loose straw: tight golden stalks with a little green left in them (span 1 m)
  TEX.hay = genMaps(512, (u, v, o) => {
    const s1 = fbm(u, v, 6, 96, 3, 251), s2 = fbm(u, v, 9, 140, 2, 253), g = fbm(u, v, 3, 3, 3, 255);
    const b = 0.65 + s1 * 0.45 - s2 * 0.25;
    setRGB(o, 0.74 * b, 0.62 * b, 0.33 * b); mixc(o, 0.5, 0.55, 0.28, smooth(0.6, 0.8, g) * 0.35);
    o.h = s1 * 0.7 + s2 * 0.3; o.ro = 0.9;
  }, 4);
  // hayloft floor seen from below: planks with the shadowed joists every 0.6 m (span 2 m)
  TEX.barnCeil = genMaps(512, (u, v, o) => {
    const rows = 12, ri = Math.floor(v * rows), fv = fract(v * rows), ph = hash2(ri, 2, 261), grain = fbm(u, v, 3, 44, 3, 263 + ri);
    const b = 0.6 + ph * 0.3; setRGB(o, 0.3 * b + grain * 0.05, 0.22 * b + grain * 0.04, 0.15 * b);
    const joist = fract(u * 10 / 3) < 0.09; if (joist) { o.r *= 0.35; o.g *= 0.33; o.b *= 0.32; }
    const seam = fv < 0.04 ? 0.4 : 1; o.r *= seam; o.g *= seam; o.b *= seam;
    mixc(o, 0.4, 0.38, 0.34, smooth(0.7, 0.85, fbm(u, v, 5, 5, 3, 265)) * 0.25);   // cobweb dust
    o.h = joist ? 0.9 : (seam < 1 ? 0.2 : 0.5 + grain * 0.1); o.ro = 0.9;
  }, 3);
  // knotty pine wall panelling for the tack room and office (span 2 m)
  TEX.pinePanel = genMaps(512, (u, v, o) => {
    const nb = 14, bi = Math.floor(u * nb), fu = fract(u * nb), ph = hash2(bi, 5, 271), grain = fbm(u, v, 70, 3, 4, 273 + bi);
    const b = 0.85 + ph * 0.3; setRGB(o, 0.62 * b + grain * 0.06, 0.42 * b + grain * 0.04, 0.21 * b);
    for (let k = 0; k < 2; k++) {
      const ky = hash2(bi, k, 275), kx = 0.3 + hash2(bi, k, 277) * 0.4, d = Math.hypot((fu - kx) * 1.5, (v - ky) * 9);
      if (d < 0.35) { const t = smooth(0.35, 0.05, d); mixc(o, 0.25, 0.13, 0.05, t * 0.85); }
    }
    const seam = fu < 0.04 || fu > 0.97 ? 0.45 : 1; o.r *= seam; o.g *= seam; o.b *= seam;
    o.h = seam < 1 ? 0.15 : 0.55 + grain * 0.1; o.ro = 0.55 + grain * 0.2;
  }, 2);
  defMat('barnRed', TEX.barnBoard, 2, { ns: 1 });
  defMat('stallBoard', TEX.stallBoard, 2, { ns: 0.9 });
  defMat('aislePave', TEX.pavers, 1.2, { ns: 1 });
  defMat('shavings', TEX.shavings, 1.5, { ns: 1.2 });
  defMat('strawBed', TEX.hay, 1.2, { ns: 1, color: 0xd8c8a0 });
  defMat('arenaSand', TEX.sand, 4, { ns: 0.9 });
  defMat('hayBale', TEX.hay, 0.8, { ns: 1.4 });
  defMat('barnCeil', TEX.barnCeil, 2, { ns: 0.7 });
  defMat('pinePanel', TEX.pinePanel, 2, { ns: 0.6 });
  defMat('roofGreen', TEX.tin, 2, { color: 0x71907a, metalness: 0.35, ns: 1.2, side: THREE.DoubleSide });
  defMat('barrelBlue', null, 1, { color: 0x1d4c96, roughness: 0.4, metalness: 0.35 });
  defMat('barrelRed', null, 1, { color: 0x9c1f1a, roughness: 0.45, metalness: 0.3 });
  defMat('galv', null, 1, { color: 0x8c908c, roughness: 0.42, metalness: 0.75 });
  defMat('fenceBoard', TEX.stallBoard, 1.4, { color: 0xd6d2c6, ns: 0.6 });
  defMat('rubberBlack', null, 1, { color: 0x141414, roughness: 0.85 });
  defMat('saltBlock', null, 1, { color: 0xc89a92, roughness: 0.75 });
  defMat('greenPaint', null, 1, { color: 0x2d5a3a, roughness: 0.5, metalness: 0.2 });
  defMat('sackCloth', TEX.canvas, 0.6, { color: 0xc9b48a, ns: 0.8 });
  defMat('heatLamp', null, 1, { color: 0x401010, emissive: 0x801808, emissiveIntensity: 0.6, roughness: 0.3 });
  Object.assign(BEVEL, { stallBoard: [0.008, 1], fenceBoard: [0.01, 1], hayBale: [0.035, 2], sackCloth: [0.05, 2], galv: [0.006, 1], rubberBlack: [0.01, 1], saltBlock: [0.012, 1], barrelBlue: [0.01, 1], barrelRed: [0.01, 1], pinePanel: [0.006, 1], greenPaint: [0.01, 1] });
}
function plateTex(txt) {
  return artTex(256, 76, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#c9a45a'); g.addColorStop(0.5, '#e8cf8c'); g.addColorStop(1, '#8f6d2c'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#5a4214'; x.lineWidth = 4; x.strokeRect(4, 4, w - 8, h - 8);
    x.fillStyle = '#3a2a0c'; x.font = '700 30px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, w / 2, h / 2 + 2);
    for (const px of [14, w - 14]) { x.beginPath(); x.arc(px, h / 2, 4, 0, 7); x.fill(); }
  });
}

// ---------- layout
function barnData() {
  const rooms = [], walls = [], doors = [];
  const di = (o) => { doors.push(o); return doors.length - 1; };
  const front = di({ x: 0, s: 4.7, e: 6.7, hinge: 's', into: 1, front: true, style: 'barn', mat: 'barnRed' });   // door 0 is the one hunts lock
  const back = di({ x: BW, s: 4.7, e: 6.7, hinge: 'e', into: -1, ext: true, style: 'barn', mat: 'barnRed' });
  const stallNames = [["Bonnie Blue's Stall", 'BONNIE BLUE'], ["Dakota's Stall", 'DAKOTA'], ["Whiskey's Stall", 'WHISKEY'], ['Foaling Stall', 'FOALING'],
    ["Juniper's Stall", 'JUNIPER'], ["Ranger's Stall", 'RANGER'], ['Wash Bay', null], ["Cisco's Stall", 'CISCO']];
  rooms.push({ id: 'aisle', name: 'Centre Aisle', r: [0, AZ0, BW, AZ1], floor: 'aislePave', wall: 'stallBoard', ceil: 'barnCeil', sw: [0.105, 7.12, 1, 0], lamp: [12.6, 5.7], noGhost: true, cage: true, lampPow: 2.4, lampRange: 16 });
  // south row (rooms 1-6), north row (7-12)
  for (const side of [0, 1]) {
    const z0 = side ? AZ1 : 0, z1 = side ? BD : AZ0, wz = side ? AZ1 : AZ0, nz = side ? 1 : -1;
    for (let k = 0; k < 4; k++) {
      const x0 = STALL_X[k], c = x0 + 1.8, [nm, plate] = stallNames[side * 4 + k], wash = nm === 'Wash Bay';
      rooms.push({ id: 'st' + side + k, name: nm, r: [x0, z0, x0 + 3.6, z1], floor: wash ? 'concreteF' : nm === 'Foaling Stall' ? 'strawBed' : 'shavings', wall: 'stallBoard', ceil: 'barnCeil', sw: [c + 0.95, wz + nz * 0.07, 0, nz], lamp: [c, (z0 + z1) / 2], cage: true });
      doors.push({ z: wz, s: c - 0.6, e: c + 0.6, hinge: 's', into: nz, style: 'stall', plateName: plate, plateSide: -nz, stallOf: rooms.length - 1 });
    }
    rooms.push({ id: side ? 'feed' : 'tack', name: side ? 'Feed Room' : 'Tack Room', r: [14.4, z0, 19.8, z1], floor: side ? 'concreteF' : 'woodF', wall: side ? 'stallBoard' : 'pinePanel', ceil: 'barnCeil', sw: side ? [19.74, 8.0, -1, 0] : [15.9 + 0.35, AZ0 - 0.07, 0, -1], lamp: [17.1, (z0 + z1) / 2], cage: true });
    rooms.push({ id: side ? 'shop' : 'office', name: side ? 'Farrier Shop' : 'Office', r: [19.8, z0, BW, z1], floor: side ? 'concreteF' : 'woodF', wall: side ? 'stallBoard' : 'pinePanel', ceil: 'barnCeil', sw: [21.3 + 0.35, wz + nz * 0.07, 0, nz], lamp: [22.5, (z0 + z1) / 2] });
  }
  // stall doors are 2..9 in row order; the room doors follow
  const dTack = di({ z: AZ0, s: 15.0, e: 15.9, hinge: 's', into: -1 }), dOffice = di({ z: AZ0, s: 20.4, e: 21.3, hinge: 's', into: -1 });
  const dFeed = di({ z: AZ1, s: 18.8, e: 19.7, hinge: 'e', into: 1 }), dShop = di({ z: AZ1, s: 20.4, e: 21.3, hinge: 's', into: 1 });
  rooms.push({ id: 'loft', name: 'Hayloft', r: [0, 0, BW, BD], lv: 1, floor: 'plankFloor', wall: 'stallBoard', ceil: 'barnCeil', sw: [14.6, BD - 0.1, 0, -1], lamp: [8.1, 5.7], bare: true, noCeil: true, lampPow: 2.6, lampRange: 16 });
  rooms.push({ id: 'arena', name: 'Riding Arena', r: [ARENA.x0, ARENA.z0, ARENA.x1, ARENA.z1], outdoor: true, floor: 'arenaSand', wall: 'fenceBoard', sw: [31.385, 4.42, 1, 0], lamp: [46, 17.2], flood: 9, lampRange: 30, lampPow: 9, noGhost: true });
  // hiding spots: a tack locker, the office closet, the loft's grain bin
  const nRoom = rooms.length;
  const dLock = di({ z: 1.3, s: 18.5, e: 19.3, hinge: 's', into: 1, closet: nRoom }), dCl = di({ z: 1.3, s: 23.95, e: 24.75, hinge: 'e', into: 1, closet: nRoom + 1 }), dBin = di({ z: 1.3, s: 0.25, e: 1.05, hinge: 's', into: 1, closet: nRoom + 2, lv: 1 });
  rooms.push({ id: 'locker', name: 'Tack Locker', r: [18.3, 0, 19.8, 1.3], floor: 'woodF', wall: 'pinePanel', closet: true, parent: 5, door: dLock });
  rooms.push({ id: 'ocloset', name: 'Office Closet', r: [23.8, 0, BW, 1.3], floor: 'woodF', wall: 'pinePanel', closet: true, parent: 6, door: dCl });
  rooms.push({ id: 'bin', name: 'Grain Bin', r: [0, 0, 1.5, 1.3], lv: 1, floor: 'plankFloor', wall: 'stallBoard', closet: true, parent: 13, door: dBin });
  // ---- walls
  const G = { win: 1, grille: true, sill: 1.38, top: 2.32 };
  for (const side of [0, 1]) {   // stall fronts along the aisle: board half-walls with bars above, a door per stall
    const wz = side ? AZ1 : AZ0, open = [];
    for (let k = 0; k < 4; k++) { const x0 = STALL_X[k], c = x0 + 1.8; open.push({ s: x0 + 0.18, e: c - 0.72, ...G }, { s: c - 0.6, e: c + 0.6, door: 2 + side * 4 + k }, { s: c + 0.72, e: x0 + 3.42, ...G }); }
    open.push(side ? { s: 18.8, e: 19.7, door: dFeed } : { s: 15.0, e: 15.9, door: dTack }, side ? { s: 20.4, e: 21.3, door: dShop } : { s: 20.4, e: 21.3, door: dOffice });
    walls.push({ z: wz, a: 0.1, b: BW - 0.1, t: 0.12, open });
    for (const x of [3.6, 7.2, 10.8]) walls.push({ x, a: side ? AZ1 + 0.06 : 0.1, b: side ? BD - 0.1 : AZ0 - 0.06, t: 0.1, open: [{ s: side ? AZ1 + 0.3 : 0.25, e: side ? BD - 0.25 : AZ0 - 0.3, win: 1, grille: true, sill: 1.5, top: 2.32 }] });
    for (const x of [14.4, 19.8]) walls.push({ x, a: side ? AZ1 + 0.06 : 0.1, b: side ? BD - 0.1 : AZ0 - 0.06, t: 0.12 });
  }
  const SW = { win: 1, grille: true, glass: true, sill: 1.45, top: 2.25 };
  walls.push({ z: 0, a: -0.1, b: BW + 0.1, t: 0.2, ext: true, open: [...[1.8, 5.4, 9.0, 12.6].map(c => ({ s: c - 0.45, e: c + 0.45, ...SW })), { s: 16.5, e: 17.7, win: 1 }, { s: 21.9, e: 23.1, win: 1 }] });
  walls.push({ z: BD, a: -0.1, b: BW + 0.1, t: 0.2, ext: true, open: [...[1.8, 5.4, 9.0, 12.6].map(c => ({ s: c - 0.45, e: c + 0.45, ...SW })), { s: 16.0, e: 17.0, win: 1, sill: 1.4 }, { s: 22.0, e: 23.2, win: 1 }] });
  walls.push({ x: 0, a: 0.1, b: BD - 0.1, t: 0.2, ext: true, open: [{ s: 1.45, e: 2.35, ...SW }, { s: 4.7, e: 6.7, door: front }, { s: 9.05, e: 9.95, ...SW }] });
  walls.push({ x: BW, a: 0.1, b: BD - 0.1, t: 0.2, ext: true, open: [{ s: 1.6, e: 2.7, win: 1 }, { s: 4.7, e: 6.7, door: back }, { s: 8.8, e: 9.9, win: 1 }] });
  // hayloft: low windows along the sides, the hay door in the west gable, the grain bin in a corner
  walls.push({ z: 0, lv: 1, a: -0.1, b: BW + 0.1, t: 0.2, ext: true, open: [5.4, 12.6, 19.8].map(c => ({ s: c - 0.5, e: c + 0.5, win: 1, sill: 0.9, top: 1.7 })) });
  walls.push({ z: BD, lv: 1, a: -0.1, b: BW + 0.1, t: 0.2, ext: true, open: [5.4, 12.6, 21.5].map(c => ({ s: c - 0.5, e: c + 0.5, win: 1, sill: 0.9, top: 1.7 })) });
  walls.push({ x: 0, lv: 1, a: 0.1, b: BD - 0.1, t: 0.2, ext: true, open: [{ s: 4.75, e: 6.65, win: 1, open: true, sill: 0.95, top: 2.45 }] });
  walls.push({ x: BW, lv: 1, a: 0.1, b: BD - 0.1, t: 0.2, ext: true, open: [{ s: 5.2, e: 6.2, win: 1, sill: 1.0, top: 2.0 }] });
  walls.push({ z: 1.3, a: 18.3, b: 19.74, t: 0.08, open: [{ s: 18.5, e: 19.3, door: dLock }] }, { x: 18.3, a: 0.1, b: 1.3, t: 0.08 });
  walls.push({ z: 1.3, a: 23.8, b: BW - 0.1, t: 0.08, open: [{ s: 23.95, e: 24.75, door: dCl }] }, { x: 23.8, a: 0.1, b: 1.3, t: 0.08 });
  walls.push({ z: 1.3, lv: 1, a: 0.1, b: 1.5, t: 0.08, open: [{ s: 0.25, e: 1.05, door: dBin }] }, { x: 1.5, lv: 1, a: 0.1, b: 1.3, t: 0.08 });
  const stairs = [{ x0: 15.0, z0: 10.2, x1: 18.6, z1: 11.28, axis: 'x', lo: 0, hi: 1, flip: true }];
  return { rooms, walls, doors, stairs, slabs: [] };
}
const BARN = barnData();
function barnTerrain(x, z) {   // flat barnyard and arena, a gentle roll out in the pastures
  const d = Math.max(0, Math.max(-14 - x, x - 66, -16 - z, z - 26));
  return d > 0 ? (fbm(fract(x / 60 + 0.5), fract(z / 60 + 0.5), 3, 3, 3, 281) - 0.4) * Math.min(1, d / 12) * 2.2 : 0;
}
MAPS.barn = {
  id: 'barn', title: 'Whitlock Stables', eyebrow: 'Bell Buckle, Tennessee',
  lede: 'On the eve of the 1994 state finals a storm cut the power, and seventeen-year-old Sadie Whitlock went down to the barn to settle her barrel mare, Bonnie Blue. By morning the mare\'s stall was latched from the outside and neither of them was ever seen again. The barn has been padlocked ever since, yet folks driving past at night still hear hoofbeats in the arena. Set up by the trailer, find what still keeps the barn, and get out before it hunts you.',
  levels: [BA0, BA1], extBase: [0, BA1 - 0.12], extTop: [BA1, BA1 + WALL_H], siding: 'barnRed', skirt: null, shutter: 'barnRed', crooked: true, noCurtains: true,
  noShutters: wd => !!wd.o.grille || wd.fy > 1 || wd.o.open,
  trimColor: 0xe8e4da, tempBase: 9.5, outsideTemp: 6, fog: [0x0b0e12, 0.028], moonI: 2.8, hemiI: 0.45, moonSpan: 46,
  tent: { x: -10.5, z: 1.2 }, lure: 0, moonTarget: [24, 0, 6], grassBox: [-34, -30, 76, 40],
  street: [-5.2, 6.4, -3.2], porch: [-0.45, 3.05, 5.7],
  navBox: [-0.5, -6.5, 61.5, 18.5], navCs: 0.3,
  rooms: BARN.rooms, walls: BARN.walls, doors: BARN.doors, stairs: BARN.stairs, slabs: BARN.slabs,
  terrain: barnTerrain,
  // the ghost can walk the path between the barn's back door and the arena gate
  navWalk(l, x, z) { return l === 0 && x > BW - 0.2 && x < ARENA.x0 + 0.6 && z > 4.6 && z < 6.8; },
  yardName: p => p.x > BW && p.x < ARENA.x0 && p.z > 2 && p.z < 10 ? 'Arena path' : p.x < 0 && p.x > -16 && p.z > -6 && p.z < 16 ? 'Barnyard' : p.z < -2 && p.x > 0 && p.x < BW ? 'Paddock' : 'Pasture',
  outsideStep(p) { return (p.x < 0 && p.x > -24 && p.z > 3 && p.z < 8.6) || (p.x > BW && p.x < ARENA.x0 && p.z > 4 && p.z < 7.4) || (p.x < -6 && p.x > -18 && p.z > -6 && p.z < 9) ? 'step_concrete' : 'step_grass'; },
  menuCam(T, cam) { const a = -2.2 + Math.sin(T * 0.03) * 0.8; cam.position.set(20 + Math.sin(a) * 34, 7 + Math.sin(T * 0.1) * 0.4, 6 - Math.cos(a) * 34); cam.lookAt(22, 3.2, 6); },
  grassOK(x, z) {
    if (x > -1.2 && x < BW + 1.2 && z > -1.2 && z < BD + 1.2) return false;               // barn
    if (x > ARENA.x0 - 0.8 && x < ARENA.x1 + 0.8 && z > ARENA.z0 - 0.8 && z < ARENA.z1 + 0.8) return false;   // arena
    if (x > BW && x < ARENA.x0 && z > 3.8 && z < 7.6) return false;                       // arena path
    if (x < 0 && x > -40 && z > 2.6 && z < 9) return false;                               // gravel drive
    if (x < -5 && x > -19 && z > -6.5 && z < 9.5) return false;                           // parking / trailer pad
    return true;
  },
  prepare() { barnTextures(); for (const d of BARN.doors) if (d.plateName) d.plate = plateTex(d.plateName); },
  build(gb, root) { buildBarn(gb, root); },
};

// ---------- building
const BE = BA1 + WALL_H;                       // eave height (top of the loft walls)
const GAMBREL = [[0, BE], [2.0, BE + 2.4], [BD / 2, BE + 3.5], [BD - 2.0, BE + 2.4], [BD, BE]];   // roof profile across the barn (z, y)
function signTex(lines, w, h, bg, fg, font) {
  return artTex(w, h, (x) => {
    x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    lines.forEach((ln, i) => { x.font = ln[1] || font; x.fillText(ln[0], w / 2, h * (i + 0.5) / lines.length); });
    // weathering
    for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; x.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 10, 1 + Math.random() * 3); }
  });
}
function plane(root, tex, w, h, x, y, z, ry, opts = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: opts.rough ?? 0.8, transparent: !!opts.alpha, alphaTest: opts.alpha ? 0.3 : 0, side: opts.double ? THREE.DoubleSide : THREE.FrontSide }));
  m.position.set(x, y, z); m.rotation.set(opts.rx || 0, ry, opts.rz || 0, 'YXZ'); m.receiveShadow = true; root.add(m); return m;
}
// a segment between two points as a box of the given cross-section
function beam(gb, key, a, b, w, h) {
  const d = new V3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length(), q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 0, 1), d.clone().normalize());
  gb.add(new THREE.BoxGeometry(w, h, L), new THREE.Matrix4().compose(new V3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new V3(1, 1, 1)), key, true);
}
function rod(gb, key, a, b, r, seg = 8) {
  const d = new V3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length(), q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.clone().normalize());
  gb.add(new THREE.CylinderGeometry(r, r, L, seg), new THREE.Matrix4().compose(new V3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new V3(1, 1, 1)), key, false);
}
function barnRoof(gb) {
  const x0 = -0.5, x1 = BW + 0.5, ov = 0.5;
  // slope panels (lower slopes extended past the walls for the overhang)
  const segs = [[[-ov, BE - ov * 1.2], GAMBREL[1]], [GAMBREL[1], GAMBREL[2]], [GAMBREL[2], GAMBREL[3]], [GAMBREL[3], [BD + ov, BE - ov * 1.2]]];
  for (const [p, q] of segs) {
    const dz = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dz, dy), a = Math.atan2(dy, dz), n = [-Math.sin(a), Math.cos(a)];
    gb.box('roofGreen', (x0 + x1) / 2, (p[1] + q[1]) / 2 + n[1] * 0.05, (p[0] + q[0]) / 2 + n[0] * 0.05, x1 - x0, 0.06, L + 0.08, 0, -a);
    // standing seams every 0.45 m
    for (let x = x0 + 0.2; x < x1; x += 0.45) gb.box('roofGreen', x, (p[1] + q[1]) / 2 + n[1] * 0.1, (p[0] + q[0]) / 2 + n[0] * 0.1, 0.025, 0.04, L + 0.06, 0, -a);
  }
  gb.box('roofGreen', (x0 + x1) / 2, GAMBREL[2][1] + 0.12, BD / 2, x1 - x0, 0.08, 0.5);    // ridge cap
  // white fascia along the eaves and rake boards up both gables
  for (const zz of [-ov - 0.02, BD + ov + 0.02]) gb.mm('trimWhite', x0, BE - ov * 1.2 - 0.22, zz - 0.03, x1, BE - ov * 1.2 + 0.04, zz + 0.03);
  for (const xx of [x0 - 0.02, x1 + 0.02]) for (const [p, q] of segs) beam(gb, 'trimWhite', [xx, p[1] + 0.02, p[0]], [xx, q[1] + 0.02, q[0]], 0.05, 0.24);
  // gable ends: barn boards outside, stall boards inside
  const sh = new THREE.Shape(); sh.moveTo(GAMBREL[0][0], GAMBREL[0][1]); for (const [z, y] of GAMBREL.slice(1)) sh.lineTo(z, y); sh.closePath();
  for (const [x, d] of [[0, -1], [BW, 1]]) {
    const outer = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false }), inner = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false });
    gb.add(outer, mat4(x + (d > 0 ? 0.1 : 0), 0, 0, -Math.PI / 2), 'barnRed', true); gb.add(inner, mat4(x + (d > 0 ? 0 : 0.1), 0, 0, -Math.PI / 2), 'stallBoard', true);
  }
  // rafters, purlins and tie beams you see from the hayloft
  for (let x = 0.9; x < BW; x += 1.8) {
    for (let k = 0; k < 4; k++) { const p = GAMBREL[k], q = GAMBREL[k + 1]; beam(gb, 'darkWood', [x, p[1] - 0.09, p[0] + (k === 0 ? 0.12 : 0)], [x, q[1] - 0.09, q[0] - (k === 3 ? 0.12 : 0)], 0.07, 0.16); }
    gb.mm('darkWood', x - 0.05, BE - 0.1, 0.1, x + 0.05, BE + 0.08, BD - 0.1);
  }
  for (const [p, q] of [[GAMBREL[0], GAMBREL[1]], [GAMBREL[1], GAMBREL[2]], [GAMBREL[2], GAMBREL[3]], [GAMBREL[3], GAMBREL[4]]]) for (const t of [0.35, 0.75]) {
    const z = lerp(p[0], q[0], t), y = lerp(p[1], q[1], t) - 0.2; gb.mm('darkWood', 0.1, y - 0.06, z - 0.05, BW - 0.1, y + 0.06, z + 0.05);
  }
  // cupola with louvres and a running-horse weathervane
  const cx = BW / 2, cz = BD / 2, ry = GAMBREL[2][1];
  gb.box('barnRed', cx, ry + 0.55, cz, 1.3, 1.1, 1.3); gb.box('trimWhite', cx, ry + 0.06, cz, 1.4, 0.12, 1.4);
  for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { for (let k = 0; k < 5; k++) { const y = ry + 0.35 + k * 0.12; nx ? gb.box('trimWhite', cx + nx * 0.66, y, cz, 0.04, 0.03, 0.9, 0, 0, 0.5 * nx) : gb.box('trimWhite', cx, y, cz + nz * 0.66, 0.9, 0.03, 0.04, 0, -0.5 * nz); } }
  const cone = new THREE.ConeGeometry(1.1, 0.9, 4, 1); cone.rotateY(Math.PI / 4); gb.add(cone, mat4(cx, ry + 1.55, cz), 'roofGreen', false);
  gb.cyl('railBlack', cx, ry + 2.4, cz, 0.012, 0.012, 1.6, 6); gb.box('railBlack', cx, ry + 2.75, cz, 0.9, 0.025, 0.025);
  for (const [l, a, b] of [['N', 0, 0.3], ['S', 0, -0.3], ['E', 0.3, 0], ['W', -0.3, 0]]) gb.box('railBlack', cx + a, ry + 2.25, cz + b, 0.08, 0.08, 0.02);
  { const h = new THREE.Shape(), P = [[-0.42, 0.05], [-0.3, 0.12], [-0.25, 0.2], [0.05, 0.22], [0.18, 0.3], [0.3, 0.42], [0.36, 0.42], [0.34, 0.33], [0.42, 0.28], [0.38, 0.24], [0.26, 0.22], [0.2, 0.12], [0.34, 0.0], [0.28, -0.05], [0.12, 0.08], [-0.05, 0.06], [-0.22, -0.06], [-0.3, -0.04], [-0.24, 0.06], [-0.46, -0.02], [-0.6, 0.02], [-0.5, 0.1]];
    h.moveTo(...P[0]); for (const q of P.slice(1)) h.lineTo(...q); h.closePath();
    gb.add(new THREE.ExtrudeGeometry(h, { depth: 0.02, bevelEnabled: false }), mat4(cx, ry + 3.0, cz - 0.01), 'railBlack', false); }
}
function buildBarnExterior(gb, root) {
  // ground, gravel drive and parking pad, the sand arena and the path to it
  { const g = new THREE.PlaneGeometry(240, 240, 120, 120); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 20, z = p.getZ(i) + 6; p.setY(i, terrainY(x, z)); }
    g.computeVertexNormals(); gb.add(g, mat4(20, 0, 6), 'grassBase', true); }
  gb.mm('gravel', -60, -0.02, 3.0, -0.6, 0.025, 8.6); gb.mm('gravel', -18, -0.02, -6.5, -5, 0.03, 9.5);
  gb.mm('gravel', BW + 0.3, -0.02, 4.4, ARENA.x0 + 0.1, 0.03, 7.0);
  gb.mm('concreteFound', -2.2, -0.02, 4.2, 0, BA0 - 0.005, 7.2); gb.mm('concreteFound', BW, -0.02, 4.2, BW + 2.0, BA0 - 0.005, 7.2);
  for (const [a, b, c, d] of [[-0.24, -0.24, BW + 0.24, -0.1], [-0.24, BD + 0.1, BW + 0.24, BD + 0.24], [-0.24, -0.1, -0.1, 4.2], [-0.24, 7.2, -0.1, BD + 0.1], [BW + 0.1, -0.1, BW + 0.24, 4.2], [BW + 0.1, 7.2, BW + 0.24, BD + 0.1]]) gb.mm('concreteFound', a, -0.05, b, c, 0.28, d);   // foundation curb
  // gooseneck lights over both big doors, the barn sign, the hay door and hoist
  for (const [x, d] of [[0, -1], [BW, 1]]) {
    rod(gb, 'greenPaint', [x + d * 0.1, 3.4, 5.7], [x + d * 0.45, 3.45, 5.7], 0.02); rod(gb, 'greenPaint', [x + d * 0.45, 3.45, 5.7], [x + d * 0.5, 3.18, 5.7], 0.02);
    gb.add(new THREE.ConeGeometry(0.2, 0.14, 16, 1, true), mat4(x + d * 0.5, 3.12, 5.7), 'greenPaint', false);
  }
  { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffc070, emissiveIntensity: 0 })); b.position.set(-0.5, 3.06, 5.7); root.add(b); WORLD_EXTRA.porchBulb = b; }
  plane(root, signTex([['WHITLOCK STABLES', '700 50px Georgia, serif'], ['EST. 1962', '600 28px Georgia, serif']], 512, 128, '#e9e4d6', '#2a1a12'), 2.4, 0.6, -0.17, 2.55, 5.7, -Math.PI / 2);
  gb.mm('trimWhite', -0.14, 2.22, 4.45, -0.1, 2.88, 6.95);
  plane(root, signTex([['NO SMOKING', '700 54px Arial, sans-serif'], ['NO ADMITTANCE AFTER DARK', '600 26px Arial, sans-serif']], 512, 160, '#c42a1e', '#fff3e0'), 0.62, 0.2, BW + 0.13, 1.7, 7.35, Math.PI / 2);
  // hay door leaves swung open flat against the gable, hoist beam and pulley above
  for (const [z0, z1] of [[3.82, 4.75], [6.65, 7.58]]) { const zc = (z0 + z1) / 2, w = z1 - z0; gb.box('barnRed', -0.14, BA1 + 1.7, zc, 0.06, 1.5, w); gb.box('trimWhite', -0.18, BA1 + 1.7, zc, 0.03, 1.5, 0.08); for (const sg of [1, -1]) gb.box('trimWhite', -0.18, BA1 + 1.7, zc, 0.025, Math.hypot(1.4, w), 0.08, 0, sg * Math.atan2(w, 1.4)); }
  gb.box('darkWood', -0.7, GAMBREL[2][1] - 0.45, 5.7, 1.6, 0.2, 0.2); gb.add(new THREE.TorusGeometry(0.13, 0.03, 6, 16), mat4(-1.35, GAMBREL[2][1] - 0.7, 5.7), 'railBlack', false);
  rod(gb, 'sackCloth', [-1.48, GAMBREL[2][1] - 0.7, 5.7], [-1.48, BA1 + 0.9, 5.7], 0.015); gb.add(new THREE.TorusGeometry(0.06, 0.012, 5, 10, Math.PI * 1.4), mat4(-1.48, BA1 + 0.82, 5.7, 0, 0, 2.2), 'railBlack', false);
  // the yard light by the parking pad
  gb.cyl('darkWood', -5.2, 3.2, -3.4, 0.11, 0.14, 6.4, 10); rod(gb, 'greenPaint', [-5.2, 6.2, -3.4], [-5.2, 6.4, -3.0], 0.025);
  gb.add(new THREE.ConeGeometry(0.32, 0.2, 16, 1, true), mat4(-5.2, 6.42, -3.0), 'greenPaint', false);
  { const lh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffd0a0, emissiveIntensity: 3 })); lh.position.set(-5.2, 6.33, -3.0); root.add(lh); WORLD_EXTRA.streetBulb = lh; }
  addCollider(-5.35, -3.55, -5.05, -3.25, 6.5);
}
// a western saddle sitting on a rack arm; horn toward local +x
function westernSaddle(f, lx, ly, lz, pad = 'blanketRed') {
  f.box(pad, lx, ly - 0.02, lz, 0.62, 0.02, 0.26); for (const b of [-1, 1]) f.box(pad, lx, ly - 0.15, lz + b * 0.16, 0.62, 0.3, 0.015, 0, b * 0.35);
  f.sphere('leather', lx, ly + 0.03, lz, 0.2, 1.45, 0.34, 0.85);
  f.box('leather', lx + 0.17, ly + 0.09, lz, 0.1, 0.09, 0.24, 0, 0, -0.3); f.box('leather', lx - 0.23, ly + 0.1, lz, 0.06, 0.13, 0.3, 0, 0, 0.45);
  f.cyl('leatherDark', lx + 0.2, ly + 0.16, lz, 0.022, 0.026, 0.1, 10); f.cyl('leatherDark', lx + 0.2, ly + 0.215, lz, 0.045, 0.045, 0.018, 12);
  for (const b of [-1, 1]) { f.box('leather', lx, ly - 0.19, lz + b * 0.19, 0.24, 0.4, 0.02, 0, b * 0.22); f.box('leatherDark', lx, ly - 0.42, lz + b * 0.24, 0.1, 0.12, 0.05); }
}
function hayPile(gb, x, y, z, r, flat = 0.32) {
  const g = new THREE.SphereGeometry(r, 18, 7, 0, Math.PI * 2, 0, Math.PI / 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), n = 0.75 + 0.5 * hash2(Math.round(vx * 40), Math.round(vz * 40), 291) + (vy > 0.01 ? 0 : -0.1); p.setXYZ(i, vx * n, vy * (0.7 + 0.6 * hash2(Math.round(vz * 33), Math.round(vx * 33), 293)), vz * n); }
  g.computeVertexNormals(); gb.add(g, mat4(x, y - 0.02, z, WR() * 6, 0, 0, 1, flat, 1), 'hayBale', false);
}
function hayBale(gb, x, y, z, ry, tw = true) {
  gb.box('hayBale', x, y + 0.18, z, 0.92, 0.36, 0.46, ry);
  if (tw) for (const o of [-0.22, 0.22]) { const c = Math.cos(ry), s = Math.sin(ry); gb.box('sackCloth', x + o * c, y + 0.18, z - o * s, 0.012, 0.372, 0.472, ry); }
}
function buildBarnInterior(gb, root) {
  const F0 = (x, z, ry = 0) => fur(gb, x, z, ry, BA0), F1 = (x, z, ry = 0) => fur(gb, x, z, ry, BA1);
  const Y = BA0, art = roomArtBarn();
  // ---------- the aisle: dead jelly-jar lights, blanket bars, halters, tools, a fire extinguisher
  for (let x = 1.8; x < BW; x += 3.6) { if (Math.abs(x - 12.6) < 1) continue; gb.cyl('railBlack', x, Y + 2.64, 5.7, 0.05, 0.05, 0.12, 8); gb.cyl('glass', x, Y + 2.5, 5.7, 0.075, 0.075, 0.16, 12); gb.add(new THREE.TorusGeometry(0.088, 0.005, 4, 18), mat4(x, Y + 2.44, 5.7, 0, Math.PI / 2), 'railBlack', false); }
  const blankets = ['blanketRed', 'fabricGreen', 'fabricBlue', 'beddingHorse', 'fabricBrown', 'blanketRed', 'fabricBlue', 'beddingGame'];
  for (const side of [0, 1]) for (let k = 0; k < 4; k++) {
    const c = STALL_X[k] + 1.8, wz = side ? AZ1 : AZ0, out = side ? -1 : 1, face = wz + out * 0.07;
    // blanket bar and a folded blanket hanging over the bars, right of the door
    gb.cyl('chrome', c + 1.2, Y + 1.6, wz + out * 0.16, 0.015, 0.015, 0.9, 6, 0, 0, Math.PI / 2);
    gb.box(blankets[side * 4 + k], c + 1.2, Y + 1.32, wz + out * 0.19, 0.84, 0.56, 0.05);
    // halter and lead rope on a hook left of the door (Bonnie Blue's is the secret)
    if (!(side === 0 && k === 0)) { gb.cyl('brass', c - 0.95, Y + 1.62, face + out * 0.03, 0.008, 0.008, 0.07, 6, 0, Math.PI / 2, 0); gb.add(new THREE.TorusGeometry(0.11, 0.012, 5, 16), mat4(c - 0.95, Y + 1.48, face + out * 0.03, 0, 0, 0, 1, 1.4, 1), pick(['leather', 'ribbonRed', 'toyGreen', 'ribbonPurple']), false); gb.cyl('sackCloth', c - 0.95, Y + 1.0, face + out * 0.04, 0.012, 0.012, 0.85, 5); }
  }
  // fire extinguisher, chalkboard and a bench by the front door; wheelbarrow and muck fork by the feed room
  gb.cyl('ribbonRed', 24.75, Y + 1.05, 7.36, 0.08, 0.08, 0.45, 14); gb.cyl('blackPlastic', 24.75, Y + 1.33, 7.36, 0.03, 0.03, 0.08, 8); gb.box('railBlack', 24.75, Y + 1.25, 7.43, 0.06, 0.06, 0.04);
  wallArt(root, 0.12, Y + 1.6, 4.25, Math.PI / 2, art.chalk, 0.6, 0.8, 'darkWood');
  { const f = F0(7.2, 4.15, 0); f.box('darkWood', 0, 0.44, 0, 1.4, 0.05, 0.36); for (const a of [-0.6, 0.6]) f.box('darkWood', a, 0.21, 0, 0.06, 0.42, 0.3); f.solid(-0.7, -0.19, 0.7, 0.19, 0.5); }
  { const f = F0(17.2, 6.95, Math.PI / 2 + 0.12);   // wheelbarrow
    f.box('greenPaint', 0, 0.48, 0.1, 0.62, 0.28, 0.8, 0, 0.12); f.cyl('tire', 0, 0.2, -0.5, 0.2, 0.2, 0.1, 16, 0, Math.PI / 2);
    for (const a of [-0.25, 0.25]) { f.box('darkWood', a, 0.45, 0.45, 0.04, 0.04, 1.3, 0, 0.18); f.box('railBlack', a, 0.2, 0.45, 0.03, 0.4, 0.03); }
    f.box('shavings', 0, 0.62, 0.1, 0.52, 0.06, 0.66); f.solid(-0.34, -0.7, 0.34, 0.8, 0.8); }
  rod(gb, 'lightWood', [18.0, Y, 7.38], [18.25, Y + 1.5, 7.4], 0.016); for (let k = 0; k < 4; k++) rod(gb, 'railBlack', [17.92 + k * 0.05, Y + 0.02, 7.33], [17.95 + k * 0.05, Y + 0.32, 7.36], 0.007);
  rod(gb, 'lightWood', [13.9, Y, 7.38], [14.15, Y + 1.45, 7.4], 0.014); gb.box('toyRed', 13.88, Y + 0.08, 7.32, 0.3, 0.12, 0.05);   // broom
  { const f = F0(23.6, 4.25, 0); f.box('darkWood', 0, 0.26, 0, 0.9, 0.48, 0.42); f.box('darkWood', 0, 0.52, 0, 0.94, 0.06, 0.46); f.box('brass', 0, 0.42, 0.215, 0.12, 0.08, 0.01); f.solid(-0.47, -0.23, 0.47, 0.23, 0.6); }   // tack trunk
  // ---------- stalls
  const stall = (k, side, opts = {}) => {
    const x0 = STALL_X[k], z0 = side ? AZ1 : 0, z1 = side ? BD : AZ0, back = side ? BD - 0.1 : 0.1, bz = side ? -1 : 1;   // bz points away from the back wall
    // corner hay rack (galvanised) in the back-left corner, waterer in the back-right
    const hx = x0 + 0.35, hz = back + bz * 0.3;
    gb.box('galv', hx, Y + 1.25, hz, 0.5, 0.04, 0.5, Math.PI / 4); for (let i = 0; i < 6; i++) rod(gb, 'galv', [hx - 0.2 + i * 0.08, Y + 1.25, hz + bz * 0.2], [hx - 0.2 + i * 0.08, Y + 1.62, hz + bz * 0.25], 0.006);
    hayPile(gb, hx, Y + 1.29, hz, 0.24, 0.6);
    gb.box('galv', x0 + 3.3, Y + 0.85, back + bz * 0.18, 0.28, 0.16, 0.26); gb.cyl('galv', x0 + 3.42, Y + 0.45, back + bz * 0.06, 0.015, 0.015, 0.8, 6);
    gb.box('saltBlock', x0 + 0.08 + 0.06, Y + 1.1, (z0 + z1) / 2 + 0.6, 0.1, 0.1, 0.18); gb.box('galv', x0 + 0.08 + 0.06, Y + 1.04, (z0 + z1) / 2 + 0.6, 0.12, 0.03, 0.2);
    // bedding banked up the walls, a scatter of hay on the floor
    if (!opts.wash) {
      const bed = opts.straw ? 'strawBed' : 'shavings';
      gb.box(bed, x0 + 1.8, Y + 0.06, back + bz * 0.22, 3.4, 0.14, 0.45, 0, bz * 0.35); gb.box(bed, x0 + 0.24, Y + 0.06, (z0 + z1) / 2, 0.45, 0.14, 3.0, 0, 0, -0.35); gb.box(bed, x0 + 3.36, Y + 0.06, (z0 + z1) / 2, 0.45, 0.14, 3.0, 0, 0, 0.35);
      for (let i = 0; i < 2; i++) hayPile(gb, x0 + 0.8 + WR() * 2, Y, z0 + 0.8 + WR() * (z1 - z0 - 1.6), 0.3 + WR() * 0.2, 0.28);
    }
    addCollider(x0 + 3.1, back + Math.min(0, bz * 0.36), x0 + 3.5, back + Math.max(0, bz * 0.36), 1.0, true, Y);
    addCollider(hx - 0.36, hz - 0.36, hx + 0.36, hz + 0.36, 0.45, false, Y + 1.2);   // hay rack at head height
  };
  for (let k = 0; k < 4; k++) for (const side of [0, 1]) { if (side === 1 && k === 2) continue; stall(k, side, { straw: side === 0 && k === 3 }); }
  // ---------- Bonnie Blue's stall: the one that was latched from outside
  {
    // hoof gouges and scorched boards on the back wall, a memorial in the corner
    plane(root, art.gouges, 2.4, 1.3, 1.9, Y + 0.95, 0.111, 0, { alpha: true });
    plane(root, art.gouges, 2.0, 1.1, 3.54, Y + 0.85, 2.0, -Math.PI / 2, { alpha: true });
    plane(root, art.gouges, 1.6, 1.0, 0.111, Y + 1.0, 3.0, Math.PI / 2, { alpha: true });
    wallArt(root, 0.75, Y + 1.5, 0.115, 0, art.sadie, 0.32, 0.4, 'darkWood');   // on the back wall, beside the gouges
    rosette(gb, 0.5, Y + 1.15, AZ0 - 0.065, 'ribbonBlue'); rosette(gb, 0.82, Y + 0.95, AZ0 - 0.065, 'ribbonRed');   // pinned to the solid boards beside the door, not on it
    { const f = F0(3.15, 3.35, 0.7);   // dried bouquet leaning in the corner, tied with twine
      for (let i = 0; i < 9; i++) { const a = i * 0.7, r = 0.04 + (i % 3) * 0.02; f.cyl('toyGreen', Math.cos(a) * r * 0.5, 0.32, Math.sin(a) * r * 0.5, 0.005, 0.005, 0.6, 4); f.sphere(i % 2 ? 'ribbonRed' : 'leatherDark', Math.cos(a) * r, 0.64 + (i % 3) * 0.03, Math.sin(a) * r, 0.045, 1, 0.7, 1); }
      f.cyl('sackCloth', 0, 0.3, 0, 0.035, 0.035, 0.05, 8); }
    // the latch outside, chained and padlocked
    for (let i = 0; i < 9; i++) gb.add(new THREE.TorusGeometry(0.018, 0.005, 4, 8), mat4(2.6 + i * 0.03, Y + 1.0 - Math.sin(i / 8 * Math.PI) * 0.12, AZ0 + 0.075, i % 2 ? Math.PI / 2 : 0), 'metal', false);
    gb.box('brass', 2.9, Y + 0.93, AZ0 + 0.08, 0.06, 0.07, 0.025); gb.add(new THREE.TorusGeometry(0.022, 0.006, 4, 10, Math.PI), mat4(2.9, Y + 0.97, AZ0 + 0.08), 'chrome', false);
    // Bonnie Blue's halter on its hook: the easter egg
    gb.cyl('brass', 0.85, Y + 1.62, AZ0 + 0.1, 0.008, 0.008, 0.07, 6, 0, Math.PI / 2, 0);
    const h = new THREE.Group(); h.position.set(0.85, Y + 1.47, AZ0 + 0.1); root.add(h);
    const hm = new THREE.MeshStandardMaterial({ color: 0x2d6fd0, roughness: 0.55 });
    const nose = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.013, 6, 18), hm); nose.scale.set(1, 1.35, 1); h.add(nose);
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 18, Math.PI), hm); crown.position.y = -0.04; crown.rotation.z = Math.PI; h.add(crown);
    const tag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.006), MATS.brass); tag.position.set(0, -0.14, 0.012); h.add(tag);
    const lead = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.8, 5), MATS.ribbonBlue); lead.position.set(0.05, -0.55, 0.01); h.add(lead);
    for (const m of h.children) { m.castShadow = true; }
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.15), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = -0.1; h.add(hit);
    WORLD_EXTRA.halter = h; INTERACT.push({ mesh: hit, kind: 'egg', id: 1 });
  }
  // foaling stall: a red heat lamp and an old camera in the corner
  { gb.cyl('railBlack', 12.6, Y + 2.35, 1.95, 0.004, 0.004, 0.7, 4); gb.add(new THREE.ConeGeometry(0.16, 0.2, 14, 1, true), mat4(12.6, Y + 1.95, 1.95), 'metal', false); gb.sphere('heatLamp', 12.6, Y + 1.88, 1.95, 0.07);
    gb.box('grayPlastic', 14.15, Y + 2.45, 0.3, 0.12, 0.09, 0.2, 0.6, 0.3); gb.cyl('screen', 14.08, Y + 2.42, 0.4, 0.03, 0.03, 0.03, 10, 0.6, Math.PI / 2 + 0.3); }
  // ---------- wash bay: drain, mat, cross-ties, hose reel, shelf of shampoo
  { gb.cyl('screen', 9.0, Y + 0.004, 9.4, 0.12, 0.12, 0.01, 16); gb.box('rubberBlack', 9.0, Y + 0.01, 9.6, 2.0, 0.02, 2.6);
    for (const x of [7.26, 10.74]) { gb.box('galv', x, Y + 1.5, 9.4, 0.04, 0.08, 0.08); for (let i = 0; i < 6; i++) gb.add(new THREE.TorusGeometry(0.02, 0.005, 4, 8), mat4(x + (x < 9 ? 1 : -1) * (0.04 + i * 0.035), Y + 1.5 - Math.sin(i / 5 * 1.5) * 0.2, 9.4, 0, i % 2 ? Math.PI / 2 : 0), 'metal', false); }
    gb.add(new THREE.TorusGeometry(0.22, 0.05, 8, 20), mat4(9.0, Y + 1.4, BD - 0.18), 'greenPaint', false); gb.cyl('galv', 9.0, Y + 1.4, BD - 0.15, 0.05, 0.05, 0.08, 10, Math.PI / 2);
    gb.box('darkWood', 8.0, Y + 1.5, BD - 0.22, 1.0, 0.03, 0.22); }
  // ---------- tack room: saddles on wall racks, bridles, pads, ribbons, a trunk with her initials
  { for (const [z, y] of [[0.9, 1.15], [2.0, 1.15], [3.0, 1.15], [0.9, 1.75], [2.0, 1.75]]) { const f = F0(14.5, z, 0); f.box('darkWood', 0.25, y - 0.06, 0, 0.5, 0.06, 0.12); westernSaddle(f, 0.32, y, 0, pick(['blanketRed', 'fabricBlue', 'beddingHorse', 'fabricGreen'])); f.solid(0, -0.3, 0.7, 0.3, y + 0.3); }
    for (let i = 0; i < 6; i++) { const x = 15.4 + i * 0.42; gb.cyl('brass', x, Y + 1.85, 0.17, 0.01, 0.01, 0.1, 6, 0, Math.PI / 2, 0); gb.add(new THREE.TorusGeometry(0.13, 0.01, 4, 16), mat4(x, Y + 1.6, 0.2, 0, 0, 0, 1, 1.8, 1), 'leatherDark', false); gb.cyl('chrome', x, Y + 1.36, 0.22, 0.04, 0.04, 0.012, 10, Math.PI / 2); }
    { const f = F0(18.0, 2.4, -Math.PI / 2); for (let i = 0; i < 5; i++) f.box(pick(['blanketRed', 'fabricBlue', 'beddingHorse', 'fabricGreen', 'beddingGame']), 0, 0.5 + i * 0.07, 0, 0.8, 0.065, 0.6); f.box('darkWood', 0, 0.22, 0, 0.84, 0.44, 0.64); f.solid(-0.42, -0.32, 0.42, 0.32, 0.9); }
    for (const [x, m] of [[16.7, 'ribbonBlue'], [17.0, 'ribbonRed'], [17.3, 'ribbonBlue'], [17.6, 'ribbonYellow'], [16.85, 'ribbonPurple'], [17.15, 'ribbonBlue'], [17.45, 'ribbonRed']]) rosette(gb, x, Y + (x * 10 % 3 < 1.5 ? 1.75 : 1.45), AZ0 - 0.065, m);
    wallArt(root, 18.6, Y + 1.7, AZ0 - 0.07, Math.PI, art.poster, 0.45, 0.6, null);
    { const f = F0(16.1, 2.85, Math.PI / 2); f.box('darkWood', 0, 0.28, 0, 1.0, 0.5, 0.5); f.box('darkWood', 0, 0.56, 0, 1.04, 0.07, 0.54); for (const a of [-1, 1]) for (const b of [-1, 1]) f.box('brass', a * 0.49, 0.28, b * 0.24, 0.04, 0.52, 0.04); f.box('brass', 0, 0.45, 0.255, 0.16, 0.05, 0.01); f.solid(-0.52, -0.27, 0.52, 0.27, 0.62); }
  }
  // ---------- office: desk under the window, filing cabinet, trophies, the calendar still on October 1994
  { const f = F0(24.6, 2.55, Math.PI / 2);
    f.box('darkWood', 0, 0.74, 0, 1.4, 0.05, 0.7); for (const a of [-0.65, 0.65]) f.box('darkWood', a, 0.37, 0, 0.06, 0.72, 0.66); f.box('darkWood', 0.45, 0.45, 0, 0.42, 0.55, 0.62);
    f.box('grayPlastic', -0.35, 0.85, 0.1, 0.3, 0.16, 0.22); f.cyl('chrome', -0.25, 0.95, 0.1, 0.004, 0.004, 0.25, 4); f.box('paper', 0.2, 0.775, 0.05, 0.3, 0.01, 0.22, 0.2); f.box('paper', 0.24, 0.79, -0.05, 0.3, 0.01, 0.22, -0.15);
    f.box('blackPlastic', 0.5, 0.79, -0.15, 0.2, 0.06, 0.16); f.solid(-0.72, -0.36, 0.72, 0.36, 0.8);
    tableLamp(f, -0.55, 0.765, -0.15);
    const [cx, cz] = f.pt(0, -0.65); const c = F0(cx, cz, Math.PI / 2); chair(c, 'darkWood', 'leather'); c.solid(-0.22, -0.22, 0.22, 0.22, 0.5); }
  { const f = F0(20.25, 0.4, 0); f.box('grayPlastic', 0, 0.66, 0, 0.45, 1.32, 0.6); for (let i = 0; i < 4; i++) { f.box('grayPlastic', 0, 0.2 + i * 0.32, 0.305, 0.4, 0.28, 0.01); f.box('chrome', 0, 0.28 + i * 0.32, 0.315, 0.12, 0.02, 0.02); } f.solid(-0.23, -0.3, 0.23, 0.3, 1.35); }
  { gb.box('darkWood', 22.4, Y + 1.55, AZ0 - 0.18, 1.6, 0.04, 0.24); gb.box('darkWood', 22.4, Y + 1.95, AZ0 - 0.18, 1.6, 0.04, 0.24); }
  wallArt(root, 21.0, Y + 1.6, 0.115, 0, art.calendar, 0.42, 0.56, null);
  wallArt(root, 25.08, Y + 1.7, 3.1, -Math.PI / 2, art.sadie2, 0.36, 0.28, 'darkWood');
  { const f = F0(20.1, 2.5, 0); f.cyl('darkWood', 0, 0.9, 0, 0.025, 0.03, 1.8, 8); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; f.cyl('darkWood', Math.cos(a) * 0.12, 1.7, Math.sin(a) * 0.12, 0.012, 0.012, 0.18, 5, Math.sin(a) * 0.8, Math.cos(a) * 0.8); } f.cyl('hatTan', 0.12, 1.78, 0, 0.18, 0.18, 0.02, 16); f.cyl('hatTan', 0.12, 1.84, 0, 0.09, 0.1, 0.11, 14); f.solid(-0.15, -0.15, 0.15, 0.15, 1.8); }
  // ---------- feed room: steep stairs up to the loft, feed bins, sacks on a pallet, the feeding board
  { const n = 14, run = 3.6 / n, rise = (BA1 - BA0) / n;
    for (let i = 0; i < n; i++) { const xr = 18.6 - i * run; gb.mm('darkWood', xr - run - 0.02, Y + (i + 1) * rise - 0.05, 10.25, xr, Y + (i + 1) * rise, 11.26); }
    beam(gb, 'darkWood', [18.62, Y, 10.24], [15.0, BA1, 10.24], 0.06, 0.26);
    for (let i = 0; i <= 3; i++) { const x = 18.4 - i * 1.15, y = Y + (18.6 - x) / 3.6 * (BA1 - BA0); gb.cyl('darkWood', x, y + 0.5, 10.2, 0.025, 0.025, 1.0, 6); }
    beam(gb, 'darkWood', [18.4, Y + 1.0, 10.2], [15.0, BA1 + 0.95, 10.2], 0.05, 0.06);
    addCollider(15.0, 10.12, 18.62, 10.22, 1.2, false, Y + 0.6); }
  for (let i = 0; i < 3; i++) { const z = 8.0 + i * 0.68; gb.cyl('galv', 14.85, Y + 0.4, z, 0.3, 0.27, 0.8, 18); gb.cyl('galv', 14.85, Y + 0.82, z, 0.32, 0.32, 0.05, 18); gb.cyl('galv', 14.85, Y + 0.87, z, 0.05, 0.05, 0.05, 8); addCollider(14.5, z - 0.32, 15.17, z + 0.32, 0.9, true, Y); }
  { const f = F0(16.6, 8.45, 0.08); f.box('lightWood', 0, 0.07, 0, 1.2, 0.12, 1.0); for (let i = 0; i < 5; i++) f.box('sackCloth', (i % 2 - 0.5) * 0.55, 0.22 + Math.floor(i / 2) * 0.17, (i % 3 - 1) * 0.12, 0.55, 0.17, 0.85, (i % 2) * 0.1); f.solid(-0.62, -0.52, 0.62, 0.52, 0.8); }
  for (const [x, z, y] of [[16.0, 9.6, 0], [16.95, 9.6, 0], [16.5, 9.6, 0.36]]) hayBale(gb, x, Y + y, z, 0);
  addCollider(15.5, 9.35, 17.45, 9.85, 0.75, true, Y);
  wallArt(root, 19.735, Y + 1.6, 9.0, -Math.PI / 2, art.feedBoard, 0.9, 0.65, 'darkWood');
  gb.cyl('metal', 18.0, Y + 1.7, 8.1, 0.12, 0.12, 0.05, 16, Math.PI / 2); gb.cyl('railBlack', 18.0, Y + 2.2, 8.1, 0.005, 0.005, 0.8, 4);   // hanging scale
  // ---------- farrier shop: anvil on a stump, a gas forge, the workbench and a board of shoes
  { const f = F0(22.6, 9.5, 0.4); f.cyl('bark', 0, 0.32, 0, 0.3, 0.33, 0.64, 14); f.box('metal', 0, 0.72, 0, 0.5, 0.12, 0.16); f.box('metal', 0, 0.62, 0, 0.22, 0.12, 0.12); f.cyl('metal', 0.32, 0.74, 0, 0.02, 0.07, 0.22, 10, 0, Math.PI / 2); f.solid(-0.35, -0.35, 0.35, 0.35, 0.9); }
  { const f = F0(24.6, 10.6, -Math.PI / 2); f.box('railBlack', 0, 0.85, 0, 0.6, 0.4, 0.45); f.box('screen', 0, 0.85, 0.226, 0.25, 0.14, 0.01); for (const a of [-0.25, 0.25]) for (const b of [-0.18, 0.18]) f.box('railBlack', a, 0.33, b, 0.04, 0.66, 0.04); f.solid(-0.32, -0.25, 0.32, 0.25, 1.1); }
  rod(gb, 'metal', [24.6, Y + 1.05, 10.6], [24.6, Y + 2.7, 10.6], 0.07);
  { const f = F0(21.2, 10.95, Math.PI); f.box('lightWood', 0, 0.86, 0, 2.0, 0.07, 0.62); for (const a of [-0.95, 0.95]) for (const b of [-0.26, 0.26]) f.box('lightWood', a, 0.42, b, 0.07, 0.84, 0.07); f.box('lightWood', 0, 0.2, 0, 1.9, 0.03, 0.55); f.box('metal', 0.7, 0.98, 0.2, 0.18, 0.16, 0.12); f.solid(-1.0, -0.31, 1.0, 0.31, 0.95); }
  gb.box('lightWood', 21.2, Y + 1.7, BD - 0.115, 2.0, 0.9, 0.02);
  for (let i = 0; i < 12; i++) { const x = 20.5 + (i % 6) * 0.28, y = Y + 1.95 - Math.floor(i / 6) * 0.38; gb.cyl('chrome', x, y + 0.07, BD - 0.14, 0.005, 0.005, 0.05, 4, Math.PI / 2); gb.add(new THREE.TorusGeometry(0.055, 0.01, 5, 12, Math.PI * 1.35), mat4(x, y, BD - 0.13, 0, 0, Math.PI * 0.32), 'metal', false); }
  { const f = F0(24.6, 8.2, 0); f.cyl('barrelBlue', 0, 0.4, 0, 0.29, 0.29, 0.8, 18); f.cyl('screen', 0, 0.79, 0, 0.27, 0.27, 0.01, 18); f.solid(-0.3, -0.3, 0.3, 0.3, 0.85); }
  // ---------- hayloft: stacks of square bales, loose hay, the stairwell rail, a rope swing, Sadie's trunk
  const baleStack = (x0, z0, nx, nz, h, rot) => {
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const hh = Math.max(1, h - Math.floor(j * 0.8)); for (let k = 0; k < hh; k++) { const bx = x0 + (rot ? j * 0.47 : i * 0.94) + (WR() - 0.5) * 0.04, bz = z0 + (rot ? i * 0.94 : j * 0.47) + (WR() - 0.5) * 0.04; hayBale(gb, bx, BA1 + k * 0.36, bz, rot ? Math.PI / 2 + (WR() - 0.5) * 0.06 : (WR() - 0.5) * 0.06, k === hh - 1); } }
    const x1 = x0 + (rot ? nz * 0.47 : nx * 0.94), z1 = z0 + (rot ? nx * 0.94 : nz * 0.47); addCollider(x0 - 0.47, z0 - 0.24, x1 - 0.47, z1 - 0.24, h * 0.36 + 0.05, true, BA1);
  };
  baleStack(2.5, 0.45, 6, 3, 5, false); baleStack(9.0, 0.45, 5, 2, 4, false); baleStack(19.6, 0.45, 5, 3, 5, false);
  baleStack(3.0, BD - 1.2, 5, 2, 4, false); baleStack(9.5, BD - 1.2, 4, 2, 3, false); baleStack(21.2, BD - 1.2, 3, 2, 5, false);
  for (let i = 0; i < 9; i++) hayPile(gb, 3 + WR() * 19, BA1, 3.2 + WR() * 5, 0.5 + WR() * 0.45, 0.4);
  for (const [a, b] of [[[15.0, BA1, 10.15], [18.65, BA1, 10.15]], [[18.65, BA1, 10.15], [18.65, BA1, BD - 0.1]]]) { gb.mm('darkWood', Math.min(a[0], b[0]) - 0.03, BA1 + 0.95, Math.min(a[2], b[2]) - 0.03, Math.max(a[0], b[0]) + 0.03, BA1 + 1.0, Math.max(a[2], b[2]) + 0.03); for (let t = 0; t <= 1.001; t += 0.5) gb.cyl('darkWood', lerp(a[0], b[0], t), BA1 + 0.48, lerp(a[2], b[2], t), 0.03, 0.03, 0.96, 6); addCollider(Math.min(a[0], b[0]) - 0.05, Math.min(a[2], b[2]) - 0.05, Math.max(a[0], b[0]) + 0.05, Math.max(a[2], b[2]) + 0.05, 1.0, false, BA1); }
  { rod(gb, 'sackCloth', [11.7, BE, 5.4], [11.7, BA1 + 0.55, 5.4], 0.014); rod(gb, 'sackCloth', [11.7, BE, 6.0], [11.7, BA1 + 0.55, 6.0], 0.014); gb.box('lightWood', 11.7, BA1 + 0.53, 5.7, 0.2, 0.04, 0.7, 0.12); }
  { const f = F1(23.9, 5.7, -Math.PI / 2); f.box('leatherDark', 0, 0.25, 0, 0.9, 0.46, 0.5); f.box('leatherDark', 0, 0.5, 0, 0.92, 0.06, 0.52); for (const a of [-0.3, 0.3]) f.box('brass', a, 0.3, 0.255, 0.04, 0.46, 0.01); plane(root, art.initials, 0.24, 0.12, 23.64, BA1 + 0.32, 5.7, -Math.PI / 2, { rough: 0.6 }); f.solid(-0.46, -0.26, 0.46, 0.26, 0.55); }
  rod(gb, 'metal', [0.3, BA1 + 1.6, 3.7], [0.3, BA1 + 1.35, 3.7], 0.01); gb.add(new THREE.TorusGeometry(0.09, 0.012, 5, 12, Math.PI * 1.3), mat4(0.3, BA1 + 1.28, 3.7, Math.PI / 2, 0, 2.4), 'metal', false);   // hay hook
}
// ---------- painted and printed things that tell the story
let BARN_ART = null;
function roomArtBarn() {
  if (BARN_ART) return BARN_ART;
  const R = mulberry32(1994), chalkText = (x, lines, w, h, size) => { x.fillStyle = '#1d2621'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(236,236,226,0.85)'; x.textBaseline = 'top'; lines.forEach((ln, i) => { x.font = (i === 0 ? '700 ' : '500 ') + size + 'px "Comic Sans MS", "Segoe Print", cursive'; x.fillText(ln, 18, 14 + i * size * 1.35); }); for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(230,230,220,${R() * 0.05})`; x.fillRect(R() * w, R() * h, 30 + R() * 80, 2 + R() * 8); } };
  const photo = (x, w, h, sep, cap) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, sep ? '#cdb48a' : '#9fb4c8'); g.addColorStop(0.62, sep ? '#a98d62' : '#c8b48c'); g.addColorStop(1, sep ? '#7a6040' : '#8a7050'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = sep ? '#6a5236' : '#3a5a8a'; x.fillRect(w * 0.12, h * 0.62, w * 0.04, h * 0.14); x.fillRect(w * 0.84, h * 0.62, w * 0.04, h * 0.14);   // barrels
    drawHorseSil(x, w * 0.5, h * 0.55, w * 0.13, sep ? '#3a2a1a' : '#4a5a72', true);
    x.fillStyle = sep ? '#3a2a1a' : '#7a2222'; x.beginPath(); x.ellipse(w * 0.5, h * 0.36, w * 0.035, h * 0.07, 0.3, 0, 7); x.fill(); x.beginPath(); x.arc(w * 0.515, h * 0.27, w * 0.03, 0, 7); x.fill();
    x.fillStyle = sep ? '#5a4024' : '#d8c8a0'; x.fillRect(w * 0.48, h * 0.235, w * 0.07, h * 0.02);
    x.fillStyle = 'rgba(255,250,235,0.9)'; x.fillRect(0, h * 0.86, w, h * 0.14); x.fillStyle = '#2a2018'; x.font = `italic ${Math.round(h * 0.07)}px Georgia, serif`; x.textAlign = 'center'; x.fillText(cap, w / 2, h * 0.95);
    for (let i = 0; i < 2000; i++) { x.fillStyle = `rgba(${R() < 0.5 ? 0 : 255},${R() < 0.5 ? 0 : 255},${R() < 0.5 ? 0 : 255},0.04)`; x.fillRect(R() * w, R() * h, 2, 2); }
  };
  BARN_ART = {
    chalk: artTex(256, 340, (x, w, h) => chalkText(x, ['WHITLOCK STABLES', 'Farrier - Tue 10/11', 'Vet - Bonnie: cleared', 'NO turnout Bonnie', '   til after finals!!', 'Haul out Fri 5am', '- S.'], w, h, 22)),
    feedBoard: artTex(512, 360, (x, w, h) => chalkText(x, ['FEEDING  AM / PM', 'Bonnie Blue   3 qt sweet + 2 flk', 'Dakota          2 qt + 3 flk', 'Whiskey        2 qt + 3 flk', 'Juniper         1 qt + 3 flk', 'Ranger          2 qt + 2 flk', 'Cisco            senior 3 qt', 'Mare+foal     ad lib hay'], w, h, 30)),
    sadie: artTex(256, 320, (x, w, h) => photo(x, w, h, false, "Sadie & Bonnie Blue, '94")),
    sadie2: artTex(320, 256, (x, w, h) => photo(x, w, h, true, 'County Champions')),
    poster: artTex(300, 400, (x, w, h) => {
      x.fillStyle = '#e8dcc0'; x.fillRect(0, 0, w, h); x.fillStyle = '#8a1e1a'; x.fillRect(0, 0, w, 70); x.fillRect(0, h - 50, w, 50);
      x.fillStyle = '#f4ead2'; x.textAlign = 'center'; x.font = '700 30px Georgia, serif'; x.fillText('STATE FINALS', w / 2, 46);
      drawHorseSil(x, w / 2, 190, 52, '#2a2420', true);
      x.fillStyle = '#2a2420'; x.font = '700 26px Georgia, serif'; x.fillText('BARREL RACING', w / 2, 300); x.font = '500 20px Georgia, serif'; x.fillText('Oct. 15, 1994', w / 2, 330); x.fillText('Shelbyville, Tenn.', w / 2, 356);
      x.fillStyle = '#f4ead2'; x.font = '600 16px Georgia, serif'; x.fillText('$5,000 ADDED', w / 2, h - 18);
    }),
    calendar: artTex(320, 420, (x, w, h) => {
      x.fillStyle = '#f2eee2'; x.fillRect(0, 0, w, h); drawHorseSil(x, w / 2, 90, 40, '#6a4a2a', true);
      x.fillStyle = '#2a2420'; x.textAlign = 'center'; x.font = '700 30px Georgia, serif'; x.fillText('OCTOBER 1994', w / 2, 190);
      x.font = '500 16px Arial'; const cw = w / 7;
      for (let d = 1; d <= 31; d++) { const c = (d + 5) % 7, r = Math.floor((d + 5) / 7), cx = c * cw + cw / 2, cy = 225 + r * 36; x.fillStyle = '#2a2420'; x.fillText(String(d), cx, cy);
        if (d < 15) { x.strokeStyle = '#333'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 12, cy - 14); x.lineTo(cx + 12, cy + 6); x.stroke(); }
        if (d === 15) { x.strokeStyle = '#c0201a'; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy - 5, 15, 0, 7); x.stroke(); x.fillStyle = '#c0201a'; x.font = '700 10px Arial'; x.fillText('FINALS', cx, cy + 14); x.font = '500 16px Arial'; } }
    }),
    gouges: artTex(512, 280, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      const soot = x.createRadialGradient(w * 0.5, h * 0.7, 10, w * 0.5, h * 0.7, w * 0.5); soot.addColorStop(0, 'rgba(10,8,6,0.55)'); soot.addColorStop(1, 'rgba(10,8,6,0)'); x.fillStyle = soot; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) { const cx = 40 + R() * (w - 80), cy = 40 + R() * (h - 70), r = 14 + R() * 18; x.strokeStyle = `rgba(20,12,6,${0.5 + R() * 0.4})`; x.lineWidth = 3 + R() * 4; x.beginPath(); x.arc(cx, cy, r, Math.PI * (0.1 + R() * 0.3), Math.PI * (0.8 + R() * 0.3)); x.stroke();
        x.strokeStyle = 'rgba(190,150,100,0.35)'; x.lineWidth = 1.5; x.beginPath(); x.arc(cx, cy - 2, r, Math.PI * 0.3, Math.PI * 0.7); x.stroke(); }
      for (let i = 0; i < 40; i++) { const cx = R() * w, cy = R() * h; x.strokeStyle = `rgba(25,15,8,${0.3 + R() * 0.4})`; x.lineWidth = 1 + R() * 2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + (R() - 0.5) * 60, cy + R() * 30); x.stroke(); }
    }),
    initials: artTex(128, 64, (x, w, h) => { x.fillStyle = '#2a1a10'; x.fillRect(0, 0, w, h); x.fillStyle = '#d8b860'; x.font = '700 40px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('S.W.', w / 2, h / 2 + 2); }),
    notice: artTex(400, 520, (x, w, h) => {
      x.fillStyle = '#efe8d2'; x.fillRect(0, 0, w, h); x.fillStyle = '#1e1a14'; x.textAlign = 'center';
      x.font = '700 34px Georgia, serif'; x.fillText('MISSING', w / 2, 52); x.font = '600 20px Georgia, serif'; x.fillText('SADIE ANN WHITLOCK, 17', w / 2, 86);
      x.fillStyle = '#8a8070'; x.fillRect(w / 2 - 70, 104, 140, 160); x.fillStyle = '#4a4034'; x.beginPath(); x.arc(w / 2, 165, 38, 0, 7); x.fill(); x.fillRect(w / 2 - 55, 205, 110, 60);
      x.fillStyle = '#1e1a14'; x.font = '500 16px Georgia, serif'; x.textAlign = 'left';
      ['Last seen the night of Oct. 14, 1994,', 'going down to the Whitlock barn during', 'the storm to check on her mare,', 'BONNIE BLUE (blue roan, 15.1 hh).', 'Neither has been found. The stall was', 'latched from the outside.', '', 'Bedford County Sheriff: 555-0142'].forEach((t, i) => x.fillText(t, 30, 300 + i * 24));
      for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(90,70,40,${R() * 0.06})`; x.fillRect(R() * w, R() * h, 3 + R() * 20, 1 + R() * 4); }
    }),
  };
  return BARN_ART;
}
// board fence between two points (axis-aligned), posts every ~2.4 m, three rails on the outside face
function boardFence(gb, x0, z0, x1, z1, out, key = 'fenceBoard', collide = true, y = 0) {
  const alongX = Math.abs(z1 - z0) < 1e-6, L = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0), n = Math.max(1, Math.round(L / 2.4));
  for (let i = 0; i <= n; i++) { const t = i / n, x = lerp(x0, x1, t), z = lerp(z0, z1, t); gb.box('darkWood', x, y + 0.66, z, 0.13, 1.42, 0.13); gb.box('darkWood', x, y + 1.39, z, 0.15, 0.04, 0.15); }
  for (const h of [0.42, 0.82, 1.22]) {
    if (alongX) gb.box(key, (x0 + x1) / 2, y + h, z0 + out * 0.085, L, 0.15, 0.04); else gb.box(key, x0 + out * 0.085, y + h, (z0 + z1) / 2, 0.04, 0.15, L);
  }
  if (collide) addCollider(Math.min(x0, x1) - 0.1, Math.min(z0, z1) - 0.1, Math.max(x0, x1) + 0.1, Math.max(z0, z1) + 0.1, 1.4, false, y);
}
function barrel55(gb, x, z, y = 0, m = 'barrelBlue') {
  gb.cyl(m, x, y + 0.44, z, 0.29, 0.29, 0.88, 22); for (const h of [0.03, 0.3, 0.6, 0.86]) gb.cyl(h < 0.1 || h > 0.8 ? 'metal' : 'barrelRed', x, y + h, z, 0.296, 0.296, 0.05, 22);
  gb.cyl('metal', x, y + 0.885, z, 0.27, 0.27, 0.01, 20); gb.cyl('metal', x + 0.15, y + 0.89, z + 0.08, 0.03, 0.03, 0.015, 8);
}
function buildArena(gb, root) {
  const { x0, z0, x1, z1 } = ARENA, i = 0.3, Y = BA0;
  gb.mm('arenaSand', x0 + 0.05, -0.05, z0 + 0.05, x1 - 0.05, Y, z1 - 0.05);
  // perimeter fence, gate gap on the barn side
  boardFence(gb, x0 + i, z0 + i, x1 - i, z0 + i, -1); boardFence(gb, x0 + i, z1 - i, x1 - i, z1 - i, 1);
  boardFence(gb, x1 - i, z0 + i, x1 - i, z1 - i, 1);
  boardFence(gb, x0 + i, z0 + i, x0 + i, 4.45, -1); boardFence(gb, x0 + i, 6.95, x0 + i, z1 - i, -1);
  gb.box('darkWood', x0 + i, 1.0, 4.42, 0.18, 2.1, 0.22); gb.box('darkWood', x0 + i, 1.0, 6.98, 0.18, 2.1, 0.22);   // gate posts
  { const gx = x0 + i - 0.12; for (const h of [0.35, 0.7, 1.05, 1.35]) gb.cyl('galv', gx, h, 8.05, 0.025, 0.025, 2.4, 8, Math.PI / 2); for (const zz of [6.9, 9.2]) gb.cyl('galv', gx, 0.75, zz, 0.03, 0.03, 1.1, 8); rod(gb, 'galv', [gx, 0.35, 6.9], [gx, 1.35, 9.2], 0.02); }   // swung-open tube gate
  // the barrels
  for (const [bx, bz] of BARRELS) { barrel55(gb, bx, bz, Y); addCollider(bx - 0.32, bz - 0.32, bx + 0.32, bz + 0.32, 0.9, true, Y); }
  // timing eyes either side of the start line
  for (const zz of [3.4, 8.0]) { for (let k = 0; k < 3; k++) { const a = k * 2.1; rod(gb, 'railBlack', [34 + Math.cos(a) * 0.25, Y, zz + Math.sin(a) * 0.25], [34, Y + 1.0, zz], 0.012); } gb.box('toyYellow', 34, Y + 1.05, zz, 0.12, 0.14, 0.1); gb.box('screen', 34, Y + 1.05, zz + (zz < 6 ? 0.051 : -0.051), 0.06, 0.06, 0.01); }
  // bleachers outside the north fence, announcer's stand in the far corner
  for (let r = 0; r < 4; r++) { const z = z1 + 0.6 + r * 0.55, y = 0.4 + r * 0.42; gb.box('darkWood', 46, y, z, 10, 0.05, 0.32); gb.box('darkWood', 46, y - 0.22, z + 0.2, 10, 0.2, 0.03); for (let k = 0; k <= 4; k++) gb.box('galv', 41.1 + k * 2.45, y / 2, z, 0.06, y, 0.06); }
  addCollider(41, z1 + 0.4, 51, z1 + 2.8, 2.0);
  { const sx = 63.2, sz = 19.8; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) gb.box('darkWood', sx + a * 1.05, 1.2, sz + b * 1.05, 0.14, 2.4, 0.14);
    gb.box('plankFloor', sx, 2.45, sz, 2.4, 0.1, 2.4); gb.box('barnRed', sx, 3.0, sz + 1.15, 2.4, 1.1, 0.08); gb.box('barnRed', sx + 1.15, 3.0, sz, 0.08, 1.1, 2.4); gb.box('barnRed', sx - 1.15, 3.2, sz, 0.08, 1.5, 2.4); gb.box('barnRed', sx, 3.3, sz - 1.15, 2.4, 0.3, 0.08);
    gb.box('roofGreen', sx, 4.05, sz, 2.9, 0.06, 2.9, 0, 0.12); for (let k = 0; k < 6; k++) gb.box('darkWood', sx + 1.3 - k * 0.12, 0.2 + k * 0.4, sz - 1.6 - k * 0.0, 0.5, 0.05, 0.25);
    plane(root, signTex([['ANNOUNCER', '700 40px Arial, sans-serif']], 256, 64, '#e9e4d6', '#2a1a12'), 1.2, 0.3, sx, 3.3, sz - 1.2, Math.PI);
    addCollider(sx - 1.2, sz - 1.2, sx + 1.2, sz + 1.2, 4.2); }
  // light poles at the corners (bulbs long dead) and the one that still works
  for (const [px, pz] of [[x0 - 0.6, z0 - 0.6], [x1 + 0.6, z0 - 0.6], [x0 - 0.6, z1 + 0.6], [x1 + 0.6, z1 + 0.6]]) { gb.cyl('darkWood', px, 4.5, pz, 0.13, 0.17, 9, 10); gb.mm('railBlack', px - 0.5, 9.0, pz - 0.1, px + 0.5, 9.07, pz + 0.1); for (const dx of [-0.32, 0, 0.32]) gb.box('railBlack', px + dx, 8.9, pz, 0.26, 0.2, 0.2, 0, 0.35); addCollider(px - 0.2, pz - 0.2, px + 0.2, pz + 0.2, 9); }
  gb.cyl('darkWood', 46, (Y + 9) / 2, z1 - 0.62, 0.12, 0.16, 9, 10); addCollider(45.85, z1 - 0.78, 46.15, z1 - 0.46, 9, false, 0);
  // outside the gate: water trough, mounting block, the drag harrow parked by the fence
  { gb.box('galv', 29.4, 0.3, 2.6, 0.7, 0.6, 1.8); gb.box('screen', 29.4, 0.58, 2.6, 0.6, 0.01, 1.7); addCollider(29.0, 1.65, 29.8, 3.55, 0.65); }
  { for (let k = 0; k < 3; k++) gb.box('darkWood', 29.6, 0.12 + k * 0.2, 9.2 - k * 0.25, 0.8, 0.24 + k * 0.4 - k * 0.4, 0.3); gb.box('darkWood', 29.6, 0.3, 8.95, 0.8, 0.6, 0.8); addCollider(29.2, 8.5, 30.0, 9.4, 0.7); }
  { const hx = 62.5, hz = 4; gb.box('metal', hx, 0.12, hz, 1.2, 0.08, 2.6); for (let k = 0; k < 8; k++) gb.box('metal', hx, 0.06, hz - 1.2 + k * 0.34, 1.3, 0.12, 0.02); rod(gb, 'metal', [hx - 0.6, 0.15, hz], [hx - 1.6, 0.4, hz], 0.03); }
}
function goosenecktrailer(gb, x, z, ry) {
  const f = fur(gb, x, z, ry, 0);
  f.box('chrome', 0, 1.35, 0, 2.3, 2.0, 5.2); f.box('chrome', 0, 2.05, -3.3, 2.2, 0.95, 1.5);   // box and gooseneck
  f.box('railBlack', 0, 0.32, 0, 2.2, 0.12, 5.0); f.box('railBlack', 0, 1.62, -3.9, 0.12, 0.12, 0.5);
  for (let k = 0; k < 7; k++) f.box('screen', 1.16, 1.95, -2.0 + k * 0.6, 0.02, 0.18, 0.4);   // slat windows
  f.box('ribbonRed', 1.16, 1.2, 0, 0.01, 0.08, 5.1); f.box('ribbonRed', -1.16, 1.2, 0, 0.01, 0.08, 5.1);
  for (const b of [0.6, 1.5]) for (const a of [-1.1, 1.1]) f.cyl('tire', a, 0.36, b, 0.36, 0.36, 0.24, 16, 0, Math.PI / 2);
  f.cyl('railBlack', 0, 0.72, -3.95, 0.05, 0.05, 1.4, 8);
  f.solid(-1.2, -4.1, 1.2, 2.65, 2.4);
}
function pickupTruck(gb, x, z, ry) {
  const f = fur(gb, x, z, ry, 0);
  f.box('carPaint', 0, 0.75, -1.35, 1.9, 0.6, 1.9); f.box('carPaint', 0, 1.35, -0.25, 1.86, 0.65, 1.3); f.box('carPaint', 0, 0.8, 1.15, 1.9, 0.7, 2.5);
  f.box('screen', 0, 1.04, 1.15, 1.7, 0.02, 2.3);
  f.box('glass', 0, 1.42, -0.92, 1.66, 0.5, 0.05, 0, 0.35); f.box('glass', 0, 1.42, 0.42, 1.6, 0.45, 0.03); for (const a of [-0.94, 0.94]) f.box('glass', a, 1.4, -0.25, 0.02, 0.42, 1.1);
  f.box('chrome', 0, 0.62, -2.32, 1.9, 0.22, 0.08); f.box('chrome', 0, 0.62, 2.42, 1.9, 0.16, 0.08); f.box('screen', 0, 0.85, -2.31, 1.4, 0.3, 0.02);
  for (const [a, b] of [[-0.88, -1.5], [0.88, -1.5], [-0.88, 1.55], [0.88, 1.55]]) f.cyl('tire', a, 0.38, b, 0.38, 0.38, 0.26, 18, 0, Math.PI / 2);
  for (let i = 0; i < 3; i++) f.box('hayBale', -0.3 + i * 0.3, 1.33, 1.3, 0.3, 0.36, 0.92, 0.05);
  f.solid(-1.0, -2.4, 1.0, 2.45, 1.8);
}
function oakTree(gb, x, z, s) {
  const y0 = terrainY(x, z);
  const prof = []; for (let i = 0; i <= 8; i++) { const t = i / 8; prof.push(new THREE.Vector2((0.32 + 0.25 * Math.pow(1 - t, 3)) * s * (1 - t * 0.55), t * 4.2 * s)); }
  gb.add(new THREE.LatheGeometry(prof, 10), mat4(x, y0 - 0.1, z), 'bark', false, 2);
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * 6.28 + WR(), up = 0.5 + WR() * 0.5, L = (2.4 + WR() * 1.6) * s, by = y0 + (3.0 + WR() * 1.0) * s, ex = x + Math.cos(a) * L * 0.85, ez = z + Math.sin(a) * L * 0.85, ey = by + L * up * 0.6;
    rod(gb, 'bark', [x, by, z], [ex, ey, ez], 0.1 * s, 6);
    for (let j = 0; j < 10; j++) LEAF_CARDS.push([ex + (WR() - 0.5) * 2.4 * s, ey + (WR() - 0.3) * 1.2 * s, ez + (WR() - 0.5) * 2.4 * s, (1.3 + WR() * 0.9) * s]);
  }
  for (let j = 0; j < 16; j++) LEAF_CARDS.push([x + (WR() - 0.5) * 3 * s, y0 + (5.2 + WR() * 1.6) * s, z + (WR() - 0.5) * 3 * s, (1.5 + WR() * 0.9) * s]);
  addCollider(x - 0.45 * s, z - 0.45 * s, x + 0.45 * s, z + 0.45 * s, 6, false, y0 - 1);
}
// imported models dressing the yard: loaded once, cloned per build, with a collider sized from the model itself
const BARN_MODELS = [
  { url: 'prop-truck.json', x: -15.6, z: 6.1, ry: -1.42, len: 5.3, axis: 'z' },
  { url: 'prop-tractor.json', x: 63.0, z: 8.4, ry: 1.75, len: 2.9, axis: 'x' },
];
function placeBarnModels(root) {
  for (const P of BARN_MODELS) {
    const place = () => {
      if (MAP.id !== 'barn' || !WORLD || WORLD.root !== root) return;
      const m = P.tpl.clone(), g = new THREE.Group(), inner = new THREE.Group(), { b, sz } = P; inner.add(m); g.add(inner);
      const s = P.len / (P.axis === 'x' ? sz.x : sz.z), c = b.getCenter(new V3());
      inner.scale.setScalar(s); inner.position.set(-c.x * s, -b.min.y * s, -c.z * s);
      g.position.set(P.x, terrainY(P.x, P.z), P.z); g.rotation.y = P.ry; root.add(g);
      const hw = sz.x * s / 2 * 0.85, hd = sz.z * s / 2 * 0.85, cs = Math.abs(Math.cos(P.ry)), sn = Math.abs(Math.sin(P.ry)), ex = hw * cs + hd * sn, ez = hw * sn + hd * cs;
      addCollider(P.x - ex, P.z - ez, P.x + ex, P.z + ez, sz.y * s);
    };
    if (P.tpl) { place(); continue; }
    loadModelFile(P.url, gl => {
      const m = gl.scene; m.traverse(o => { if (o.isMesh) { o.material = leanMat(Array.isArray(o.material) ? o.material[0] : o.material); o.castShadow = true; o.receiveShadow = true; } });
      m.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(m); P.tpl = m; P.b = b; P.sz = b.getSize(new V3()); place();
    }, e => console.warn('barn model', P.url, e));
  }
}
function buildBarnYard(gb, root) {
  goosenecktrailer(gb, -14.2, -2.8, Math.PI / 2 + 0.06);
  placeBarnModels(root);   // the crashed truck on the parking pad, the Ferguson by the arena harrow
  // notice board by the tent: the missing poster and the county's closure order
  { gb.box('darkWood', -7.4, 1.0, -0.6, 0.1, 2.0, 0.1); gb.box('darkWood', -6.1, 1.0, -0.6, 0.1, 2.0, 0.1); gb.box('darkWood', -6.75, 1.55, -0.62, 1.5, 1.0, 0.04); gb.box('roofGreen', -6.75, 2.12, -0.6, 1.7, 0.04, 0.4, 0, 0.2);
    plane(root, roomArtBarn().notice, 0.62, 0.8, -7.03, 1.55, -0.595, 0, { rough: 0.9 });
    plane(root, signTex([['CLOSED', '700 46px Georgia, serif'], ['BY ORDER OF', '600 22px Georgia, serif'], ['BEDFORD COUNTY', '600 22px Georgia, serif'], ['Nov. 1994', 'italic 20px Georgia, serif']], 256, 256, '#f2eee2', '#1e1a14'), 0.5, 0.5, -6.4, 1.6, -0.595, 0, { rough: 0.9 });
    addCollider(-7.5, -0.7, -6.0, -0.5, 2.0); }
  // paddock behind the barn's south side, with its trough and a round-bale feeder
  boardFence(gb, 1, -2.6, 24, -2.6, -1); boardFence(gb, 1, -12, 24, -12, -1); boardFence(gb, 1, -12, 1, -2.6, -1); boardFence(gb, 24, -12, 24, -8.5, 1); boardFence(gb, 24, -6.5, 24, -2.6, 1);
  { gb.box('galv', 6, 0.3, -4.0, 1.8, 0.6, 0.7); gb.box('screen', 6, 0.58, -4.0, 1.7, 0.01, 0.6); addCollider(5.0, -4.4, 7.0, -3.6, 0.65); }
  { const bx = 15, bz = -7.5; for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; gb.cyl('galv', bx + Math.cos(a) * 1.0, 0.65, bz + Math.sin(a) * 1.0, 0.025, 0.025, 1.3, 6); } gb.add(new THREE.TorusGeometry(1.0, 0.03, 6, 24), mat4(bx, 1.3, bz, 0, Math.PI / 2), 'galv', false);
    gb.cyl('hayBale', bx, 0.62, bz, 0.78, 0.82, 1.2, 20); addCollider(bx - 1.05, bz - 1.05, bx + 1.05, bz + 1.05, 1.4); }
  // round bales out in the fields, a manure heap behind the barn, fence lines along the drive
  for (const [x, z, r] of [[-28, 18, 0.3], [-31, 21, 1.2], [-25, 24, 2.0], [44, 28, 0.4], [48, 30, 1.7], [52, 27, 0.9], [-24, -16, 0.6]]) { gb.cyl('hayBale', x, 0.72 + terrainY(x, z), z, 0.75, 0.75, 1.25, 22, r, Math.PI / 2, 0); addCollider(x - 0.8, z - 0.8, x + 0.8, z + 0.8, 1.5); }
  gb.add(new THREE.SphereGeometry(1.8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat4(10, 0, 15.5, 0, 0, 0, 1.4, 0.5, 1), 'dirt', false); addCollider(7.6, 14.0, 12.4, 17.0, 0.9);
  boardFence(gb, -40, 2.4, -19.5, 2.4, -1, 'fenceBoard', true); boardFence(gb, -40, 9.2, -19.5, 9.2, 1, 'fenceBoard', true);   // stops short of the parking pad and the tent
  // trees: big oaks shading the barnyard, pines on the far side, a couple of dead ones
  for (const [x, z, s] of [[-4, -9, 1.1], [-22, 13, 1.0], [-3, 16, 0.95], [28, -12, 1.05], [36, 26, 1.0]]) oakTree(gb, x, z, s);
  for (const [x, z, s] of [[-30, -8, 1.2], [-34, 4, 1.0], [68, -4, 1.3], [70, 10, 1.1], [66, 24, 1.2], [20, 30, 1.0], [10, 34, 1.3]]) pineTree(gb, x, z, s);
  for (const [x, z, s] of [[30, 30, 1.0], [-20, -22, 1.1]]) deadTree(gb, x, z, s);
  flushLeafCards(root);
}
function buildBarn(gb, root) {
  barnRoof(gb); buildBarnExterior(gb, root); buildBarnInterior(gb, root); buildArena(gb, root); buildBarnYard(gb, root); barnProps();
}
function barnProps() {
  const Y = BA0, L = BA1;
  const P = (t, x, z, y = Y, ry = WR() * 6) => prop(t, x, y, z, ry);
  // stalls: buckets, brushes and dropped shoes
  const stalls = [[1.8, 2], [5.4, 2], [9.0, 2], [12.6, 2], [1.8, 9.4], [5.4, 9.4], [12.6, 9.4]];
  stalls.forEach(([c, z], i) => { P('bucket', c + 1.1, z + (z < 5 ? -1.3 : 1.3)); P(i % 2 ? 'brush' : 'horseshoe', c - 0.6, z + 0.4); if (i % 3 === 0) P('curry', c + 0.3, z - 0.6); });
  P('candle', 3.1, 3.55); P('candle', 3.25, 3.6); P('candle', 2.95, 3.65);
  // aisle
  P('bucket', 10.4, 7.15); P('brush', 6.9, 4.15, Y + 0.465); P('horseshoe', 21.0, 5.0); P('scoop', 24.0, 4.25, Y + 0.55);
  // wash bay
  P('bottle', 7.7, BD - 0.22, Y + 1.52); P('bottle', 7.95, BD - 0.22, Y + 1.52); P('bottle', 8.25, BD - 0.22, Y + 1.52); P('bucket', 9.8, 8.4); P('brush', 8.6, 9.0);
  // tack room
  P('bottle', 18.0, 2.4, Y + 0.85); P('brush', 17.8, 2.2, Y + 0.85); P('horseshoe', 15.6, 1.0); P('book', 16.1, 2.85, Y + 0.595); P('curry', 16.3, 2.7, Y + 0.595);
  // office
  P('trophy', 21.9, AZ0 - 0.18, Y + 1.57, 0); P('trophy', 22.3, AZ0 - 0.18, Y + 1.97, 0); P('trophy', 22.8, AZ0 - 0.18, Y + 1.57, 0); P('book', 22.0, AZ0 - 0.18, Y + 1.97);
  P('mug', 24.4, 2.2, Y + 0.765); P('book', 24.5, 2.85, Y + 0.765); P('clock', 22.9, AZ0 - 0.18, Y + 1.97, Math.PI); P('cup', 24.55, 2.0, Y + 0.765);
  // feed room
  P('scoop', 14.85, 8.0, Y + 0.85); P('scoop', 16.6, 8.45, Y + 0.6); P('bucket', 18.2, 8.6); P('bucket', 15.8, 10.8);
  // farrier shop
  P('horseshoe', 20.6, 10.95, Y + 0.895); P('horseshoe', 21.0, 11.0, Y + 0.895); P('horseshoe', 22.6, 9.5, Y + 0.78); P('hoofpick', 21.6, 10.9, Y + 0.895); P('bottle', 22.0, 10.95, Y + 0.895);
  // hayloft
  P('basket', 13.5, 4.2, L); P('bucket', 6.5, 7.5, L); P('book', 23.9, 5.55, L + 0.535); P('horseshoe', 18.5, 6.5, L); P('bottle', 4.0, 6.2, L); P('candle', 23.9, 5.95, L + 0.535); P('scoop', 10.5, 7.0, L);
  // arena
  P('bucket', 32.2, 9.0); P('horseshoe', 40.0, 6.0);
}
