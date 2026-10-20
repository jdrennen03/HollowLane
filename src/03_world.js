// ---------------------------------------------------------------- maps & house layout (filled by loadMap)
const MAPS = {};
let MAP = null, NROOM = 0;
const ROOMS = [], WALLS = [], DOOR_DEFS = [], SLABS = [], STAIRS = [];
const DOORS = [], SWITCHES = [], FIXTURES = [], PROPS = [], INTERACT = [], WINDOWS = [];
let WORLD = null;
function roomIdxAt(x, z, y) {
  for (let i = ROOMS.length - 1; i >= 0; i--) { const R = ROOMS[i], r = R.r; if (x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3] && (y === undefined || (y > R.y - 0.7 && y < R.y + WALL_H - 0.25))) return i; }
  return -1;
}
// the "logical" room (closets resolve to their parent)
function logicalRoom(x, z, y) { const i = roomIdxAt(x, z, y); if (i < 0) return -1; return ROOMS[i].closet ? ROOMS[i].parent : i; }
function insideHouse(x, z, y) { return roomIdxAt(x, z, y) >= 0; }
function levelOf(y) { let l = 0; MAP.levels.forEach((ly, i) => { if (y > ly - 0.9) l = i; }); return l; }
function terrainY(x, z) { return MAP && MAP.terrain ? MAP.terrain(x, z) : 0; }
// highest walkable surface under (x,z) that is not above head height of y
function groundY(x, z, y) {
  let best = terrainY(x, z); const lim = y === undefined ? 1e9 : y + 0.5;
  for (const s of SLABS) {
    if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue;
    let h = s.y;
    if (s.ramp) { const t = s.axis === 'z' ? (z - s.z0) / (s.z1 - s.z0) : (x - s.x0) / (s.x1 - s.x0); h = lerp(s.ya, s.yb, clamp(s.flip ? 1 - t : t, 0, 1)); }
    if (h <= lim && h > best) best = h;
  }
  return best;
}
function subRect(r, h) { // r minus h -> list of rects [x0,z0,x1,z1]
  if (h[0] >= r[2] || h[2] <= r[0] || h[1] >= r[3] || h[3] <= r[1]) return [r];
  const out = [], cx0 = Math.max(r[0], h[0]), cx1 = Math.min(r[2], h[2]);
  if (h[1] > r[1]) out.push([r[0], r[1], r[2], h[1]]);
  if (h[3] < r[3]) out.push([r[0], h[3], r[2], r[3]]);
  const z0 = Math.max(r[1], h[1]), z1 = Math.min(r[3], h[3]);
  if (cx0 > r[0]) out.push([r[0], z0, cx0, z1]);
  if (cx1 < r[2]) out.push([cx1, z0, r[2], z1]);
  return out;
}
function holesFor(lv, kind) { return STAIRS.filter(st => (kind === 'floor' ? st.hi : st.lo) === lv).map(st => [st.x0, st.z0, st.x1, st.z1]); }
function rectsMinus(r, holes) { let rs = [r]; for (const h of holes) rs = rs.flatMap(q => subRect(q, h)); return rs; }
function mirrorMap(src, M) {
  const mx = x => M - x, out = { ...src, mirror: M };
  out.rooms = src.rooms.map(R => ({ ...R, r: [mx(R.r[2]), R.r[1], mx(R.r[0]), R.r[3]], sw: R.sw && [mx(R.sw[0]), R.sw[1], -R.sw[2], R.sw[3]], lamp: [mx(R.lamp ? R.lamp[0] : 0), R.lamp ? R.lamp[1] : 0] }));
  const flipOpen = o => ({ ...o, s: mx(o.e), e: mx(o.s) });
  out.walls = src.walls.map(w => w.z !== undefined ? { ...w, a: mx(w.b), b: mx(w.a), open: (w.open || []).map(flipOpen) } : { ...w, x: mx(w.x) });
  out.doors = src.doors.map(d => d.z !== undefined ? { ...d, s: mx(d.e), e: mx(d.s), hinge: d.hinge === 's' ? 'e' : 's' } : { ...d, x: mx(d.x), into: -d.into });
  const box = b => ({ ...b, x0: mx(b.x1), x1: mx(b.x0), ...(b.ramp && b.axis === 'x' ? { flip: !b.flip } : {}) });
  out.stairs = src.stairs.map(box); out.slabs = src.slabs.map(box);
  out.tent = { x: mx(src.tent.x), z: src.tent.z }; out.street = [mx(src.street[0]), src.street[1], src.street[2]]; out.porch = [mx(src.porch[0]), src.porch[1], src.porch[2]];
  out.moonTarget = [mx(src.moonTarget[0]), src.moonTarget[1], src.moonTarget[2]];
  out.navBox = [mx(src.navBox[2]), src.navBox[1], mx(src.navBox[0]), src.navBox[3]]; out.grassBox = [mx(src.grassBox[2]), src.grassBox[1], mx(src.grassBox[0]), src.grassBox[3]];
  const P = p => ({ x: mx(p.x), y: p.y, z: p.z });
  out.grassOK = (x, z) => src.grassOK(mx(x), z); out.yardName = p => src.yardName(P(p)); out.outsideStep = p => src.outsideStep(P(p));
  return out;
}
function loadMapData(id) {
  if (MAPS[id].prepare && !MAPS[id]._prepared) { MAPS[id].prepare(); MAPS[id]._prepared = true; }
  MAP = MAPS[id].mirrorAt !== undefined ? (MAPS[id]._m || (MAPS[id]._m = mirrorMap(MAPS[id], MAPS[id].mirrorAt))) : MAPS[id];
  for (const A of [ROOMS, WALLS, DOOR_DEFS, SLABS, STAIRS, DOORS, SWITCHES, FIXTURES, PROPS, WINDOWS, COLL, SIGHT]) A.length = 0;
  for (let i = INTERACT.length - 1; i >= 0; i--) if (INTERACT[i].kind !== 'item') INTERACT.splice(i, 1);
  for (const R of MAP.rooms) ROOMS.push({ ...R, y: MAP.levels[R.lv || 0] });
  { const fl = [...new Set([0, ...MAP.levels])].slice(0, 4); while (fl.length < 4) fl.push(-99); WEAR_U.uHlFloor.value.fromArray(fl); }
  NROOM = ROOMS.filter(R => !R.closet).length;
  for (const w of MAP.walls) { const lv = w.lv || 0, fy = MAP.levels[lv]; WALLS.push({ ...w, fy, y0: w.y0 ?? (w.ext ? MAP.extBase[lv] : fy), y1: w.y1 ?? (w.ext ? MAP.extTop[lv] : fy + WALL_H) }); }
  for (const d of MAP.doors) DOOR_DEFS.push({ ...d, y: MAP.levels[d.lv || 0] });
  for (const st of MAP.stairs) STAIRS.push({ ...st });
  // walkable surfaces: room floors (minus stair holes), extra slabs, stair ramps
  for (const R of ROOMS) { if (R.closet) continue; for (const q of rectsMinus(R.r, holesFor(R.lv || 0, 'floor'))) SLABS.push({ x0: q[0], z0: q[1], x1: q[2], z1: q[3], y: R.y }); }
  for (const sl of MAP.slabs) SLABS.push({ ...sl });
  for (const st of STAIRS) SLABS.push({ x0: st.x0, z0: st.z0, x1: st.x1, z1: st.z1, ramp: true, axis: st.axis, ya: MAP.levels[st.lo], yb: MAP.levels[st.hi], flip: st.flip });
  TENT.x = MAP.tent.x; TENT.z = MAP.tent.z;
  MATS.trim.color.setHex(MAP.trimColor || 0xcfc6b2);
}

function buildWorld(scene) {
  WR = mulberry32(90210);
  const root = new THREE.Group(); scene.add(root);
  WORLD = { root };
  const gb = new GB();
  const SIDING = MAP.siding;
  // ---------- walls
  for (const w of WALLS) {
    const alongX = w.z !== undefined, c = alongX ? w.z : w.x, t = w.t, fy = w.fy, lv = w.lv || 0;
    const splits = new Set(); for (const R of ROOMS) if ((R.lv || 0) === lv) { if (alongX) { splits.add(R.r[0]); splits.add(R.r[2]); } else { splits.add(R.r[1]); splits.add(R.r[3]); } }
    const sideMat = (x, z) => { const i = roomIdxAt(x, z, fy + 1); return i < 0 ? SIDING : ROOMS[i].wall; };
    const base = w.y0, topY = w.y1;
    const opens = (w.open || []).slice().sort((p, q) => p.s - q.s);
    const segs = []; let cur = w.a;
    const pushSolid = (s0, e0) => {
      const cuts = [...splits].filter(v => v > s0 + 0.01 && v < e0 - 0.01).sort((p, q) => p - q);
      let p = s0; for (const cpt of cuts) { segs.push({ s: p, e: cpt, y0: base, y1: topY, full: true }); p = cpt; } segs.push({ s: p, e: e0, y0: base, y1: topY, full: true });
    };
    for (const o of opens) {
      if (o.s > cur) pushSolid(cur, o.s);
      if (o.win) {
        const sill = fy + (o.sill ?? 0.9), top = fy + (o.top ?? 2.1);
        segs.push({ s: o.s, e: o.e, y0: base, y1: sill, low: true });
        if (top < topY) segs.push({ s: o.s, e: o.e, y0: top, y1: topY });
        WINDOWS.push({ alongX, c, s: o.s, e: o.e, y0: sill, y1: top, t, w, fy, o });
      } else {
        const top = fy + (o.arch ? 2.3 : 2.1);
        segs.push({ s: o.s, e: o.e, y0: top, y1: topY });
        if (base < fy - 0.01) segs.push({ s: o.s, e: o.e, y0: base, y1: fy });
        for (const side of [-1, 1]) {
          const off = c + side * (t / 2 + 0.012);
          if (alongX) { gb.mm('trim', o.s - 0.07, fy, off - 0.012, o.s, top + 0.07, off + 0.012); gb.mm('trim', o.e, fy, off - 0.012, o.e + 0.07, top + 0.07, off + 0.012); gb.mm('trim', o.s - 0.07, top, off - 0.012, o.e + 0.07, top + 0.08, off + 0.012); }
          else { gb.mm('trim', off - 0.012, fy, o.s - 0.07, off + 0.012, top + 0.07, o.s); gb.mm('trim', off - 0.012, fy, o.e, off + 0.012, top + 0.07, o.e + 0.07); gb.mm('trim', off - 0.012, top, o.s - 0.07, off + 0.012, top + 0.08, o.e + 0.07); }
        }
        if (alongX) gb.mm('trim', o.s, fy - 0.01, c - t / 2, o.e, fy + 0.012, c + t / 2); else gb.mm('trim', c - t / 2, fy - 0.01, o.s, c + t / 2, fy + 0.012, o.e);
      }
      cur = o.e;
    }
    if (cur < w.b) pushSolid(cur, w.b);
    for (const sg of segs) {
      const mid = (sg.s + sg.e) / 2;
      let x0, x1, z0, z1, mPos, mNeg;
      if (alongX) { x0 = sg.s; x1 = sg.e; z0 = c - t / 2; z1 = c + t / 2; mPos = sideMat(mid, c + t / 2 + 0.1); mNeg = sideMat(mid, c - t / 2 - 0.1); }
      else { z0 = sg.s; z1 = sg.e; x0 = c - t / 2; x1 = c + t / 2; mPos = sideMat(c + t / 2 + 0.1, mid); mNeg = sideMat(c - t / 2 - 0.1, mid); }
      const keys = alongX ? ['trim', 'trim', 'trim', null, mPos, mNeg] : [mPos, mNeg, 'trim', null, 'trim', 'trim'];
      gb.add(new THREE.BoxGeometry(x1 - x0, sg.y1 - sg.y0, z1 - z0), mat4((x0 + x1) / 2, (sg.y0 + sg.y1) / 2, (z0 + z1) / 2), keys, true);
      if (sg.full || sg.low) addCollider(x0, z0, x1, z1, sg.y1 - sg.y0, false, sg.y0);
      if (sg.full) SIGHT.push({ x0, z0, x1, z1, y0: sg.y0, y1: sg.y1 });
      if (sg.full || sg.low) for (const side of [-1, 1]) {
        if ((side === 1 ? mPos : mNeg) === SIDING) continue;
        if (alongX) { const zz = side === 1 ? z1 : z0; gb.mm('trim', x0, fy, Math.min(zz, zz + side * 0.02), x1, fy + 0.13, Math.max(zz, zz + side * 0.02)); }
        else { const xx = side === 1 ? x1 : x0; gb.mm('trim', Math.min(xx, xx + side * 0.02), fy, z0, Math.max(xx, xx + side * 0.02), fy + 0.13, z1); }
      }
      if (MAP.skirt && w.ext && sg.y0 <= base + 0.01) {
        const outSide = (mPos === SIDING) ? 1 : -1;
        if (alongX) { const zz = outSide === 1 ? z1 : z0; gb.mm(MAP.skirt, x0, base, Math.min(zz, zz + outSide * 0.04), x1, fy + 0.05, Math.max(zz, zz + outSide * 0.04)); }
        else { const xx = outSide === 1 ? x1 : x0; gb.mm(MAP.skirt, Math.min(xx, xx + outSide * 0.04), base, z0, Math.max(xx, xx + outSide * 0.04), fy + 0.05, z1); }
      }
    }
  }
  for (const wd of WINDOWS) buildWindow(gb, wd);
  // ---------- floors & ceilings (stairwells cut out)
  for (const R of ROOMS) {
    if (R.closet || R.outdoor) continue; const lv = R.lv || 0;
    for (const q of rectsMinus(R.r, holesFor(lv, 'floor'))) gb.mm(R.floor, q[0], R.y - 0.06, q[1], q[2], R.y, q[3]);
    if (!R.noCeil) for (const q of rectsMinus(R.r, holesFor(lv, 'ceil'))) gb.mm(R.ceil || 'ceiling', q[0], R.y + WALL_H, q[1], q[2], R.y + WALL_H + 0.06, q[3]);
  }
  const nKids = root.children.length;
  MIRROR_X = MAP.mirror ?? null; TREE_LIST.length = 0;
  try { MAP.build(gb, root); } finally { MIRROR_X = null; }
  placeTrees(root);
  if (MAP.mirror !== undefined) for (const o of root.children.slice(nKids)) { o.position.x = MAP.mirror - o.position.x; o.rotation.y = -o.rotation.y; o.rotation.z = -o.rotation.z; }
  for (let i = 0; i < NROOM; i++) buildFixture(gb, root, i);
  for (let i = 0; i < NROOM; i++) buildSwitch(root, i);
  for (let i = 0; i < DOOR_DEFS.length; i++) buildDoor(root, i);
  buildTent(gb, root);
  cornerWebs(root);
  gb.build(root);
  return root;
}

function buildWindow(gb, wd) {
  const { alongX, c, s, e, y0, y1, t } = wd;
  const box = (k, a0, b0, a1, b1, cy0, cy1) => alongX ? gb.mm(k, a0, cy0, b0, a1, cy1, b1) : gb.mm(k, b0, cy0, a0, b1, cy1, a1);
  if (wd.o.grille) {   // stall front / partition: a steel-capped board edge with vertical bars up to a top rail
    const k = wd.o.grille === true ? 'railBlack' : wd.o.grille;
    box(k, s, c - t / 2 - 0.01, e, c + t / 2 + 0.01, y0 - 0.04, y0 + 0.01);
    box(k, s, c - 0.03, e, c + 0.03, y1 - 0.05, y1);
    const n = Math.max(2, Math.round((e - s) / 0.085));
    for (let i = 1; i < n; i++) { const a = s + (e - s) * i / n; alongX ? gb.cyl(k, a, (y0 + y1) / 2, c, 0.011, 0.011, y1 - y0, 6) : gb.cyl(k, c, (y0 + y1) / 2, a, 0.011, 0.011, y1 - y0, 6); }
    box(k, s, c - 0.025, s + 0.04, c + 0.025, y0, y1); box(k, e - 0.04, c - 0.025, e, c + 0.025, y0, y1);
    if (!wd.o.glass) return;
  }
  if (wd.o.open) { box('trim', s, c - t / 2, s + 0.07, c + t / 2, y0, y1); box('trim', e - 0.07, c - t / 2, e, c + t / 2, y0, y1); box('trim', s, c - t / 2, e, c + t / 2, y1 - 0.07, y1); box('trim', s - 0.05, c - t / 2 - 0.03, e + 0.05, c + t / 2 + 0.03, y0 - 0.05, y0); return; }
  const fw = 0.05;
  box('trim', s, c - t / 2, s + fw, c + t / 2, y0, y1);
  box('trim', e - fw, c - t / 2, e, c + t / 2, y0, y1);
  box('trim', s, c - t / 2, e, c + t / 2, y1 - fw, y1);
  box('trim', s, c - t / 2, e, c + t / 2, y0, y0 + fw);
  const mid = (s + e) / 2, ym = (y0 + y1) / 2;
  box('trim', mid - 0.02, c - 0.025, mid + 0.02, c + 0.025, y0, y1);
  box('trim', s, c - 0.025, e, c + 0.025, ym - 0.02, ym + 0.02);
  box('glass', s, c - 0.005, e, c + 0.005, y0, y1);
  // inner sill & outer sill
  const mid0 = (s + e) / 2, probe = d => alongX ? roomIdxAt(mid0, c + d, wd.fy + 1) : roomIdxAt(c + d, mid0, wd.fy + 1);
  const inSide = probe(0.3) >= 0 ? 1 : -1;
  const sillZ = c + inSide * (t / 2), outZ = c - inSide * (t / 2);
  box('trim', s - 0.08, Math.min(sillZ, sillZ + inSide * 0.08), e + 0.08, Math.max(sillZ, sillZ + inSide * 0.08), y0 - 0.03, y0);
  box('trim', s - 0.06, Math.min(outZ, outZ - inSide * 0.06), e + 0.06, Math.max(outZ, outZ - inSide * 0.06), y0 - 0.05, y0);
  // shutters outside (some hang crooked)
  const shw = 0.42;
  for (const [a0, a1] of [[s - shw - 0.03, s - 0.03], [e + 0.03, e + shw + 0.03]]) {
    const crooked = MAP.crooked && WR() < 0.3 ? 0.12 : 0;
    const cx = (a0 + a1) / 2, cz = outZ - inSide * 0.03, cy = (y0 + y1) / 2;
    if (MAP.noShutters && MAP.noShutters(wd)) continue;
    if (alongX) gb.box(MAP.shutter, cx, cy, cz, shw, y1 - y0 + 0.1, 0.03, 0, 0, crooked); else gb.box(MAP.shutter, cz, cy, cx, 0.03, y1 - y0 + 0.1, shw, 0, crooked, 0);
  }
  // curtains on the inside
  if (!MAP.noCurtains && WR() < 0.8) {
    const lace = WR() < 0.4, k = lace ? 'curtainLace' : 'curtain';
    const cz = sillZ + inSide * 0.09;
    for (const side of [0, 1]) {
      const width = (e - s) * (lace ? 0.55 : 0.32) + 0.1, h = (y1 - y0) + 0.5;
      const g = new THREE.PlaneGeometry(width, h, 14, 4);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x * 28 + side * 2) * 0.03); }
      g.computeVertexNormals();
      const ax = side ? e + 0.06 - width / 2 : s - 0.06 + width / 2;
      const yy = (y0 + y1) / 2 + 0.15;
      if (alongX) gb.add(g, mat4(ax, yy, cz, 0), k, false, 1); else gb.add(g, mat4(cz, yy, ax, Math.PI / 2), k, false, 1);
    }
    if (alongX) gb.cyl('brass', (s + e) / 2, y1 + 0.18, cz, 0.012, 0.012, e - s + 0.5, 6, 0, 0, Math.PI / 2);
    else gb.cyl('brass', cz, y1 + 0.18, (s + e) / 2, 0.012, 0.012, e - s + 0.5, 6, 0, Math.PI / 2, 0);
  }
}

function buildRoof(gb) {
  const eaveY = CEIL + 0.05, rise = 2.4, run = 7.6;
  const ang = Math.atan2(rise, run), len = Math.hypot(rise, run);
  gb.box('shingles', 10, eaveY + rise / 2 + 0.07, (-0.6 + 7) / 2, 21.4, 0.1, len, 0, -ang);
  gb.box('shingles', 10, eaveY + rise / 2 + 0.07, (7 + 14.6) / 2, 21.4, 0.1, len, 0, ang);
  gb.box('darkWood', 10, eaveY + rise + 0.12, 7, 21.5, 0.08, 0.2);
  // fascia & gutters
  gb.mm('trim', -0.7, eaveY - 0.18, -0.68, 20.7, eaveY + 0.05, -0.6);
  gb.mm('trim', -0.7, eaveY - 0.18, 14.6, 20.7, eaveY + 0.05, 14.68);
  gb.cyl('metal', 10, eaveY - 0.1, -0.74, 0.06, 0.06, 21.4, 8, 0, 0, Math.PI / 2);
  // downspout: drops from the gutter, elbows back to the wall, runs down the corner
  const pipe = (a, b) => { const d = new V3().subVectors(b, a), L = d.length(); const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.normalize()); gb.add(new THREE.CylinderGeometry(0.04, 0.04, L + 0.06, 8), new THREE.Matrix4().compose(a.clone().lerp(b, 0.5), q, new V3(1, 1, 1)), 'metal'); };
  const p1 = new V3(0.25, eaveY - 0.08, -0.74), p2 = new V3(0.25, eaveY - 0.5, -0.74), p3 = new V3(0.25, eaveY - 0.78, -0.16), p4 = new V3(0.25, 0.1, -0.16);
  pipe(p1, p2); pipe(p2, p3); pipe(p3, p4);
  gb.mm('metal', 0.18, 0.05, -0.3, 0.32, 0.1, -0.1);
  // barge boards cap the roof edges over the gables
  for (const bx of [-0.72, 20.72]) for (const sgn of [-1, 1]) {
    const cz = sgn < 0 ? (-0.6 + 7) / 2 : (7 + 14.6) / 2;
    gb.box('trim', bx, eaveY + rise / 2 + 0.02, cz, 0.05, 0.24, len + 0.05, 0, sgn < 0 ? -ang : ang);
  }
  // soffits
  gb.mm('trim', -0.6, eaveY - 0.02, -0.6, 20.6, eaveY, -0.1);
  gb.mm('trim', -0.6, eaveY - 0.02, 14.1, 20.6, eaveY, 14.6);
  // gables
  const topY = eaveY + rise * (7.1 / run);
  const sh = new THREE.Shape(); sh.moveTo(-0.1, eaveY); sh.lineTo(14.1, eaveY); sh.lineTo(7, topY); sh.closePath();
  for (const gx of [0.1, 20.1]) {
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false });
    gb.add(g, mat4(gx, 0, 0, -Math.PI / 2), 'siding', true);
    // round attic vent
    gb.cyl('darkWood', gx === 0.1 ? -0.12 : 20.12, eaveY + 1.1, 7, 0.32, 0.32, 0.06, 18, 0, 0, Math.PI / 2);
  }
  gb.mm('ceiling', 0, CEIL + 0.06, 0, 20, CEIL + 0.1, 14);
  // chimney
  gb.mm('brick', 1.5, CEIL, 9.6, 2.3, eaveY + rise + 1.2, 10.4);
  gb.mm('concreteF', 1.42, eaveY + rise + 1.2, 9.52, 2.38, eaveY + rise + 1.3, 10.48);
}

function buildPorch(gb) {
  gb.mm('porchWood', 7, 0, -2.2, 12, FY, 0);
  gb.mm('brick', 7, 0, -2.22, 12, FY - 0.08, -2.18);
  gb.mm('porchWood', 8.5, 0, -2.55, 10.5, 0.27, -2.2);
  gb.mm('porchWood', 8.5, 0, -2.9, 10.5, 0.13, -2.55);
  // roof over porch
  // shed roof: 2.80 high at the front edge, rising to 3.00 where it meets the wall
  const slope = Math.atan2(0.2, 2.45), under = z => 2.70 + (z + 2.55) * Math.tan(slope);
  gb.box('shingles', 9.5, 2.85, -1.325, 5.6, 0.1, 2.45 / Math.cos(slope), 0, -slope);
  gb.mm('trim', 6.7, 2.66, -2.6, 12.3, 2.8, -2.54);                          // fascia on the front edge
  gb.mm('trim', 6.9, 2.6, -2.18, 12.1, under(-2.1) + 0.005, -2.02);          // front beam resting on the posts
  gb.mm('trim', 6.9, under(-0.1) - 0.16, -0.14, 12.1, under(-0.1), -0.1);    // ledger board on the house wall
  gb.mm('trim', 6.95, 2.585, -2.04, 12.05, 2.6, -0.1);                         // flat porch ceiling
  for (const px of [7.15, 11.85]) {
    gb.mm('trim', px - 0.07, FY, -2.17, px + 0.07, 2.6, -2.03);              // posts up to the beam
    gb.box('trim', px, under(-1.1) - 0.07, -1.1, 0.12, 0.14, 2.05 / Math.cos(slope), 0, -slope); // side beams post -> wall
    addCollider(px - 0.1, -2.18, px + 0.1, -1.98, 3);
  }
  // railings
  const rail = (x0, z0, x1, z1) => {
    gb.mm('trim', x0, FY + 0.85, z0, x1, FY + 0.92, z1);
    gb.mm('trim', x0, FY + 0.08, z0, x1, FY + 0.13, z1);
    const L = Math.max(x1 - x0, z1 - z0), n = Math.floor(L / 0.14);
    for (let i = 0; i <= n; i++) {
      const t = i / n; const x = lerp(x0, x1, t), z = lerp(z0, z1, t);
      if (WR() < 0.08) continue; // a few missing balusters
      gb.mm('trim', x - 0.015, FY + 0.1, z - 0.015, x + 0.015, FY + 0.86, z + 0.015);
    }
    addCollider(Math.min(x0, x1) - 0.05, Math.min(z0, z1) - 0.05, Math.max(x0, x1) + 0.05, Math.max(z0, z1) + 0.05, 1);
  };
  rail(7.05, -2.12, 8.5, -2.08); rail(10.5, -2.12, 11.95, -2.08);
  rail(7.03, -2.1, 7.07, -0.1); rail(11.93, -2.1, 11.97, -0.1);
  // under-porch side blockers (can't walk under / climb the side)
  addCollider(6.9, -2.25, 7.0, 0, 1); addCollider(12.0, -2.25, 12.1, 0, 1);
  addCollider(7.0, -2.3, 8.45, -2.2, 1); addCollider(10.55, -2.3, 12.0, -2.2, 1);
}

// ---------------------------------------------------------------- furniture
function prop(type, x, y, z, ry = 0) { if (MIRROR_X !== null) { x = MIRROR_X - x; ry = -ry; } PROPS.push({ type, x, y, z, ry }); }
function buildFurniture(gb, root) {
  // ===== LIVING ROOM
  { // TV stand + CRT
    const f = fur(gb, 2.2, 0.38, 0);
    f.box('darkWood', 0, 0.25, 0, 1.5, 0.5, 0.5); f.box('blackPlastic', 0, 0.7, 0.02, 0.72, 0.56, 0.5);
    f.box('screen', 0, 0.72, 0.275, 0.56, 0.42, 0.01);
    f.cyl('metal', -0.1, 1.05, 0, 0.004, 0.004, 0.45, 4, 0.5, 0.3); f.cyl('metal', 0.1, 1.05, 0, 0.004, 0.004, 0.45, 4, -0.5, 0.3);
    f.solid(-0.75, -0.25, 0.75, 0.25, 1);
  }
  { // sofa against hallway wall, facing the TV
    const f = fur(gb, 2.2, 5.45, 0); sofa(f, 2.2, 'fabricGreen', 'prop-couch.json', root); f.solid(-1.1, -0.45, 1.1, 0.45, 1);
  }
  { const f = fur(gb, 2.2, 2.9, 0); f.box('darkWood', 0, 0.42, 0, 1.1, 0.05, 0.6); for (const [a, b] of [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]]) f.box('darkWood', a, 0.2, b, 0.05, 0.4, 0.05); f.box('darkWood', 0, 0.12, 0, 1.0, 0.03, 0.5); f.solid(-0.55, -0.3, 0.55, 0.3, 0.45); }
  placeModel(root, { url: PACK.tl, part: 'TinyLiving_ContemporaryCarpet_40', x: 2.4, z: 2.9, y: FY + 0.004, len: 3.2, axis: 'x', cols: false });
  { const f = fur(gb, 4.7, 2.9, Math.PI / 2); armchair(f, 'fabricBrown'); f.solid(-0.45, -0.45, 0.45, 0.45, 1); }
  { const f = fur(gb, 0.3, 4.4, -Math.PI / 2); bookshelf(f); f.solid(-0.5, -0.18, 0.5, 0.18, 2); }
  { const f = fur(gb, 0.55, 5.55, 0); f.box('darkWood', 0, 0.3, 0, 0.45, 0.6, 0.45); f.solid(-0.23, -0.23, 0.23, 0.23, 0.6); tableLamp(f, 0, 0.6, 0); }
  { const f = fur(gb, 7.62, 5.55, -Math.PI / 2); // grandfather clock
    f.box('darkWood', 0, 1.0, 0, 0.5, 2.0, 0.32); f.box('darkWood', 0, 2.05, 0, 0.56, 0.12, 0.36);
    f.cyl('porcelain', 0, 1.65, 0.165, 0.17, 0.17, 0.01, 20, Math.PI / 2); f.box('glass', 0, 0.9, 0.165, 0.32, 0.9, 0.01); f.cyl('brass', 0, 0.75, 0.12, 0.08, 0.08, 0.01, 16, Math.PI / 2);
    f.solid(-0.25, -0.16, 0.25, 0.16, 2);
  }
  { const f = fur(gb, 6.2, 0.6, 0); floorLamp(f); f.solid(-0.15, -0.15, 0.15, 0.15, 1.7); }
  prop('mug', 2.0, FY + 0.445, 2.85); prop('book', 2.5, FY + 0.445, 3.0, 0.4); prop('remote', 1.75, FY + 0.445, 2.75, 1.2); prop('vase', 0.55, FY + 0.6, 5.55);
  prop('book', 0.3, FY + 0.03, 3.5, 1.3);
  picFrame(root, 'z', 5.3, 5.93, FY + 1.7, -1, 'p27', 0, 0.75);
  picFrame(root, 'z', 2.2, 5.93, FY + 1.75, -1, 'p9', 0, 0.62);
  // ===== FOYER
  placeModel(root, { url: 'prop-sidetable.json', x: 10.72, z: 4.2, y: FY, ry: -Math.PI / 2, len: 1.1, axis: 'x', cols: 'box' });   // black console under the mirror
  { const g = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.0), MATS.mirror); g.position.set(10.93, FY + 1.6, 4.2); g.rotation.y = -Math.PI / 2; root.add(g); gb.mm('darkWood', 10.92, FY + 1.06, 3.8, 10.94, FY + 2.14, 4.6); }
  { const f = fur(gb, 8.45, 0.5, 0); f.cyl('darkWood', 0, 0.9, 0, 0.025, 0.03, 1.8, 8); f.cyl('darkWood', 0, 0.02, 0, 0.22, 0.22, 0.04, 12); for (let i = 0; i < 4; i++) f.cyl('brass', Math.cos(i * 1.57) * 0.12, 1.72, Math.sin(i * 1.57) * 0.12, 0.012, 0.012, 0.2, 5, 0.7 * Math.sin(i * 1.57), -0.7 * Math.cos(i * 1.57)); f.box('fabricBrown', 0.08, 1.35, 0.05, 0.36, 0.7, 0.16, 0.3); f.solid(-0.2, -0.2, 0.2, 0.2, 1.8); }
  rug(gb, 9.5, 2.2, 1.6, 2.4, 0);
  prop('bowl', 10.75, FY + 0.69, 4.4);
  shoesAt(10.35, 0.32, FY, [['shoe1', 0, 0.1], ['shoe1', 0.13, -0.05], ['shoe3', 0.34, 0.2], ['shoe3', 0.46, 0.05], ['slipper2', 0.05, 0.9, 1.6]]);
  // ===== DINING
  placeModel(root, { url: 'prop-dining.json', x: 15.5, z: 3.0, y: FY, cols: 'parts' });   // the table and its six chairs
  { const f = fur(gb, 18.3, 5.68, Math.PI); f.box('darkWood', 0, 0.45, 0, 1.4, 0.9, 0.48); f.box('darkWood', 0, 1.45, 0.06, 1.36, 1.1, 0.36); f.box('glass', 0, 1.45, -0.125, 1.2, 0.96, 0.01); for (const y of [1.15, 1.5]) f.box('darkWood', 0, y, 0.06, 1.3, 0.02, 0.32); for (let i = 0; i < 5; i++) f.cyl('porcelain', -0.5 + i * 0.25, 1.32, 0.12, 0.1, 0.1, 0.012, 16, Math.PI / 2 - 0.25); f.box('darkWood', 0, 2.03, 0.06, 1.44, 0.06, 0.4); f.solid(-0.7, -0.25, 0.7, 0.25, 2); }
  { const f = fur(gb, 15.6, 0.36, 0); f.box('darkWood', 0, 0.45, 0, 2.0, 0.9, 0.5); for (const a of [-0.5, 0, 0.5]) f.box('brass', a, 0.72, 0.255, 0.08, 0.015, 0.01); f.solid(-1, -0.25, 1, 0.25, 0.9); }
  prop('plate', 14.95, FY + 0.785, 2.75); prop('plate', 15.5, FY + 0.785, 2.75); prop('plate', 16.0, FY + 0.785, 3.25); prop('candle', 15.5, FY + 0.785, 3.0); prop('cup', 15.0, FY + 0.785, 3.25); prop('cup', 16.0, FY + 0.785, 2.75);
  prop('vase', 15.0, FY + 0.9, 0.36);
  picFrame(root, 'z', 15.6, 0.11, FY + 1.75, 1, 'p32', 0, 0.5);
  // ===== HALLWAY
  gb.mm('runner', 0.6, FY + 0.001, 6.6, 13.4, FY + 0.01, 7.4);
  { const f = fur(gb, 0.38, 7.0, -Math.PI / 2); f.box('darkWood', 0, 0.7, 0, 0.6, 0.04, 0.4); for (const a of [-0.26, 0.26]) for (const b of [-0.16, 0.16]) f.cyl('darkWood', a, 0.35, b, 0.02, 0.015, 0.7, 6); f.solid(-0.3, -0.2, 0.3, 0.2, 0.75); }
  prop('phone', 0.38, FY + 0.72, 7.0, 1.57);
  picFrame(root, 'z', 2.5, 7.94, FY + 1.6, -1, 'p50', 0, 0.5); picFrame(root, 'z', 6.0, 6.06, FY + 1.6, 1, 'p53', 0, 0.42); picFrame(root, 'z', 9.0, 7.94, FY + 1.65, -1, 'p57', 0, 0.48);
  // ===== MASTER BEDROOM
  placeModel(root, { url: 'prop-bed1.json', x: 3.4, z: 12.86, y: FY, ry: Math.PI, scale: 0.9, cols: false }); addCollider(2.5, 11.85, 4.3, 13.9, 0.7, true, FY);   // unmade, left the night they went
  rug(gb, 3.4, 11.3, 2.6, 1.6, 0);
  // (the bed's backboard has its own side shelves)
  { const f = fur(gb, 0.33, 9.2, -Math.PI / 2); dresser(f); f.solid(-0.7, -0.25, 0.7, 0.25, 1); }
  { const f = fur(gb, 5.3, 9.3, -Math.PI * 0.75); armchair(f, 'fabricRose'); f.solid(-0.42, -0.42, 0.42, 0.42, 1); }
  prop('book', 2.4, FY + 0.475, 13.78, 0.3); prop('clock', 4.42, FY + 0.475, 13.78, Math.PI);   // on the backboard's side shelves prop('jbox', 0.33, FY + 0.93, 9.6); prop('bottle', 0.33, FY + 0.93, 8.8);
  picFrame(root, 'z', 3.4, 13.89, FY + 1.75, -1, 'p43', 0, 0.66);
  { const f = fur(gb, 0.6, 13.6, 0); f.box('cardboard', 0, 0.2, 0, 0.5, 0.4, 0.45); f.box('cardboard', 0.05, 0.55, 0, 0.42, 0.3, 0.4, 0.2); f.solid(-0.26, -0.24, 0.26, 0.24, 0.8); }
  gb.mm('darkWood', 0.06, FY + 1.75, 12.7, 1.95, FY + 1.77, 13.9); gb.cyl('chrome', 1.0, FY + 1.7, 13.35, 0.012, 0.012, 1.8, 6, 0, 0, Math.PI / 2);
  for (let i = 0; i < 5; i++) gb.box('fabricBlue', 0.4 + i * 0.32, FY + 1.25, 13.35, 0.05, 0.85, 0.42, 0.1 * (i - 2));
  // ===== BATHROOM
  { const f = fur(gb, 6.47, 13.05, 0); furModel(f, 'prop-bathtub.json', null, { len: 1.7, axis: 'x', turn: -Math.PI / 2 }); f.solid(-0.4, -0.85, 0.4, 0.85, 0.65); }   // the old stained tub, taps at the wall end
  { const f = fur(gb, 8.55, 13.45, -Math.PI / 2); toilet(f); f.solid(-0.25, -0.35, 0.25, 0.35, 0.8); }
  { const f = fur(gb, 8.68, 10.5, -Math.PI / 2); vanity(f); f.solid(-0.38, -0.26, 0.38, 0.45, 0.9); }
  { const g = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), MATS.mirror); g.position.set(8.93, FY + 1.6, 10.5); g.rotation.y = -Math.PI / 2; root.add(g); }
  gb.cyl('chrome', 6.08, FY + 1.1, 9.4, 0.01, 0.01, 0.6, 6, 0, Math.PI / 2, 0); gb.box('fabricBlue', 6.1, FY + 0.85, 9.4, 0.04, 0.5, 0.45);
  prop('soap', 8.45, FY + VANITY_SHELF, 10.29); prop('cup', 8.45, FY + VANITY_SHELF, 10.72);
  // ===== CHILD'S BEDROOM
  { const f = fur(gb, 9.55, 12.9, Math.PI); bed(f, 0.95, 1.95, 'beddingKid', 'lightWood'); f.solid(-0.5, -1.0, 0.5, 1.0, 0.6); }
  { const f = fur(gb, 11.3, 13.6, 0); f.box('toyBlue', 0, 0.22, 0, 0.8, 0.44, 0.45); f.box('toyYellow', 0, 0.46, -0.05, 0.82, 0.04, 0.46, 0, -0.5); f.solid(-0.42, -0.24, 0.42, 0.24, 0.5); }
  { const f = fur(gb, 12.8, 9.6, 0.7); rockingHorse(f, root); f.solid(-0.2, -0.5, 0.2, 0.5, 0.8); }
  { const f = fur(gb, 10.6, 9.8, 0); f.box('lightWood', 0, 0.45, 0, 0.7, 0.04, 0.7); for (const [a, b] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) f.box('lightWood', a, 0.22, b, 0.04, 0.44, 0.04); f.solid(-0.36, -0.36, 0.36, 0.36, 0.5); for (const [a, r] of [[-0.6, Math.PI / 2], [0.6, -Math.PI / 2]]) { const [cx, cz] = f.pt(a, 0); const c = fur(gb, cx, cz, r); chair(c, 'toyRed', 'toyRed', 0.7); } }
  { const f = fur(gb, 13.7, 10.8, -Math.PI / 2); f.box('lightWood', 0, 0.45, 0, 1.0, 0.9, 0.35); // dollhouse on a low shelf
    f.box('paintedWood', 0, 1.15, 0, 0.6, 0.5, 0.3); f.box('toyRed', 0, 1.5, 0, 0.66, 0.04, 0.36, 0, 0, 0.55); f.box('toyRed', 0, 1.5, 0, 0.66, 0.04, 0.36, 0, 0, -0.55); f.box('screen', -0.15, 1.15, 0.155, 0.12, 0.14, 0.01); f.box('screen', 0.15, 1.15, 0.155, 0.12, 0.14, 0.01); f.solid(-0.5, -0.18, 0.5, 0.18, 1.6); }
  prop('teddy', 9.55, FY + 0.56, 13.4); prop('ball', 11.0, FY + 0.1, 11.0); prop('block', 10.45, FY + 0.47, 9.65); prop('block', 10.7, FY + 0.47, 9.9); prop('block', 12.0, FY + 0.04, 12.2); prop('truck', 11.6, FY + 0.47 + 0.0, 13.6);
  picFrame(root, 'z', 11.2, 13.89, FY + 1.6, -1, 'p7', 0, 0.46);
  // ===== KITCHEN
  { const run = (z0, z1) => { gb.mm('paintedWood', 19.3, FY, z0, 19.94, FY + 0.88, z1); gb.mm('porcelain', 19.26, FY + 0.88, z0, 19.94, FY + 0.92, z1); addCollider(19.25, z0, 19.94, z1, 0.95, true); for (let z = z0 + 0.3; z < z1; z += 0.6) gb.mm('chrome', 19.28, FY + 0.75, z - 0.08, 19.3, FY + 0.77, z + 0.08); };
    run(6.06, 7.72); run(8.6, 10.94);
    // stove
    { const f = fur(gb, 19.94, 8.16, Math.PI / 2); furModel(f, PACK.kit, 'Horno', { len: 0.86, axis: 'x', back: true }); addCollider(19.25, 7.72, 19.94, 8.6, 0.95, true); }
    // sink under window
    gb.mm('chrome', 19.35, FY + 0.82, 8.65, 19.85, FY + 0.93, 9.35); gb.mm('screen', 19.4, FY + 0.93, 8.7, 19.8, FY + 0.931, 9.3); gb.cyl('chrome', 19.85, FY + 1.05, 9.0, 0.015, 0.015, 0.25, 6); gb.cyl('chrome', 19.75, FY + 1.17, 9.0, 0.012, 0.012, 0.22, 6, 0, 0, Math.PI / 2);
    // upper cabinets
    for (const [z0, z1] of [[6.06, 7.8], [9.6, 10.94]]) { gb.mm('paintedWood', 19.6, FY + 1.45, z0, 19.94, FY + 2.2, z1); for (let z = z0; z < z1 - 0.1; z += 0.55) gb.mm('paintedWood', 19.58, FY + 1.48, z + 0.03, 19.6, FY + 2.17, z + 0.52); }
  }
  { const f = fur(gb, 17.3, 10.94, 0); furModel(f, PACK.kit, 'Heladera', { height: 1.8, back: true, turn: Math.PI }); f.solid(-0.4, -0.74, 0.4, 0, 1.8); }   // fridge, facing the room
  { const f = fur(gb, 19.94, 7.3, Math.PI / 2); furModel(f, PACK.kit, 'Microondas', { len: 0.5, axis: 'x', back: true, dy: 0.92 }); }
  { const f = fur(gb, 16.6, 10.75, 0); furModel(f, PACK.kit, 'TachoBasura', { height: 0.5, turn: Math.PI }); f.solid(-0.2, -0.15, 0.2, 0.15, 0.5); }
  { const f = fur(gb, 16.4, 8.4, 0); f.box('lightWood', 0, 0.74, 0, 1.0, 0.04, 0.8); f.cyl('chrome', 0, 0.36, 0, 0.04, 0.04, 0.72, 8); f.cyl('chrome', 0, 0.01, 0, 0.3, 0.3, 0.02, 14); f.solid(-0.5, -0.4, 0.5, 0.4, 0.8); for (const [a, r] of [[-0.75, Math.PI / 2], [0.75, -Math.PI / 2]]) { const [cx, cz] = f.pt(a, 0.05); const c = fur(gb, cx, cz, r); chair(c, 'chrome', 'ceramicRed'); c.solid(-0.22, -0.22, 0.22, 0.22, 0.5); } }
  prop('pot', 19.6, FY + 0.93, 8.25); prop('kettle', 19.62, FY + 0.92, 6.6); prop('cup', 19.6, FY + 0.92, 6.25); prop('bottle', 19.6, FY + 0.92, 10.2); prop('bottle', 19.55, FY + 0.92, 10.45); prop('plate', 16.2, FY + 0.76, 8.3); prop('mug', 16.65, FY + 0.76, 8.55);
  // ===== LAUNDRY
  { const appliance = (x, front) => { const f = fur(gb, x, 13.5, Math.PI); f.box('enamel', 0, 0.45, 0, 0.68, 0.9, 0.68); f.cyl('chrome', 0, 0.45, -0.345, 0.2, 0.2, 0.02, 20, Math.PI / 2); f.cyl('screen', 0, 0.45, -0.35, 0.16, 0.16, 0.02, 20, Math.PI / 2); f.box('enamel', 0, 0.96, 0.28, 0.68, 0.14, 0.1); f.solid(-0.34, -0.34, 0.34, 0.34, 1); }; appliance(18.95);
    const f = fur(gb, 18.2, 14.0 - 0.06, 0); furModel(f, PACK.bath, 'bs0', { len: 0.74, axis: 'x', back: true, turn: Math.PI }); f.solid(-0.34, -0.62, 0.34, 0, 1); }
  { const f = fur(gb, 14.45, 13.45, 0); f.cyl('enamel', 0, 0.75, 0, 0.27, 0.27, 1.5, 20); f.cyl('metal', 0, 1.6, 0, 0.05, 0.05, 0.25, 8); f.cyl('metal', 0, 1.9, 0, 0.04, 0.04, 0.4, 8); f.solid(-0.3, -0.3, 0.3, 0.3, 1.8); }
  { const f = fur(gb, 14.28, 12.2, -Math.PI / 2); for (const y of [0.4, 0.9, 1.4, 1.9]) f.box('darkWood', 0, y, 0, 1.2, 0.03, 0.36); for (const a of [-0.58, 0.58]) f.box('darkWood', a, 1.0, 0, 0.03, 2.0, 0.36); f.box('cardboard', -0.3, 0.6, 0, 0.4, 0.35, 0.3); f.box('cardboard', 0.25, 1.1, 0, 0.5, 0.36, 0.3); f.box('toyYellow', 0.3, 0.5, 0, 0.12, 0.18, 0.1); f.solid(-0.6, -0.19, 0.6, 0.19, 2); }
  { const f = fur(gb, 19.6, 12.0, -Math.PI / 2); f.box('enamel', 0, 0.8, 0, 0.6, 0.3, 0.5); for (const a of [-0.25, 0.25]) for (const b of [-0.2, 0.2]) f.cyl('metal', a, 0.33, b, 0.02, 0.02, 0.66, 6); f.solid(-0.3, -0.25, 0.3, 0.25, 1); }
  { const f = fur(gb, 15.6, 13.45, 0.2); f.box('cardboard', 0, 0.25, 0, 0.6, 0.5, 0.5); f.box('cardboard', 0.05, 0.7, 0, 0.5, 0.4, 0.45, 0.3); f.solid(-0.32, -0.3, 0.32, 0.3, 1); }
  prop('bottle', 18.95, FY + 1.03, 13.5); prop('basket', 17.3, FY + 0.15, 12.4);
  // ===== cobwebs in upper corners
  const corners = [[0.1, 0.1, 0], [7.94, 5.94, Math.PI], [11.06, 0.1, -Math.PI / 2], [19.9, 5.94, Math.PI], [0.1, 13.9, Math.PI / 2], [8.94, 13.9, Math.PI], [9.06, 8.06, 0], [19.9, 13.9, Math.PI], [13.94, 8.06, -Math.PI / 2], [0.1, 6.06, 0], [5.94, 13.9, Math.PI]];
  for (const [x, z, ry] of corners) {
    const g = new THREE.PlaneGeometry(0.9, 0.9); g.translate(0.45, -0.45, 0);
    const m = new THREE.Mesh(g, MATS.web); m.position.set(x, CEIL - 0.01, z); m.rotation.set(0, ry - Math.PI / 4, 0); m.rotateX(-0.6);
    root.add(m);
  }
}
// ---------------------------------------------------------------- loaded models as furniture/props
// P: { url, x, z, y (default: ground), ry, len + axis ('x'|'z') to scale to a length, else scale (default 1),
//      cols: 'box' one collider for the whole model, 'parts' one per mesh (a table and its chairs), false none,
//      part: name of one node to use on its own (a picture out of a collection), height: scale to this height,
//      noFlip: on a mirrored map move it but don't reflect it (pictures with writing on them),
//      back: put the model's back (its -z side) on (x, z) instead of its middle, for things hung on a wall,
//      minH / maxW: with cols 'parts', skip parts lower or wider than this (in metres),
//      crop: leave out parts whose middle lies further than this from (x, z) }
// The model is centred on (x, z) with its base on y. Each file loads once and is cloned for later placements.
const MODEL_TPL = {};
function placeModel(root, P) {
  const MX = MIRROR_X;   // models arrive after the build, so the map's mirroring is applied here by hand
  const place = T0 => {
    if (!WORLD || WORLD.root !== root) return;
    const T = P.part ? modelPart(T0, P.part) : T0; if (!T) return console.warn('model part', P.url, P.part);
    const g = new THREE.Group(), inner = new THREE.Group(), m = T.m.clone(); inner.add(m); g.add(inner);
    const s = P.len ? P.len / (P.axis === 'z' ? T.sz.z : T.sz.x) : P.height ? P.height / T.sz.y : (P.scale || 1), c = T.b.getCenter(new V3());
    const y = P.y !== undefined ? P.y : terrainY(P.x, P.z), ry = P.ry || 0;
    inner.scale.setScalar(s); inner.position.set(-c.x * s, -T.b.min.y * s, -(P.back ? T.b.min.z : c.z) * s);
    g.position.set(P.x, y, P.z); g.rotation.y = ry;
    if (MX !== null && P.noFlip) { g.position.x = MX - P.x; g.rotation.y = -ry; root.add(g); }
    else { const w = new THREE.Group(); w.add(g); if (MX !== null) { w.scale.x = -1; w.position.x = MX; } root.add(w); }
    const cropped = new Set();
    if (P.crop) { let k = 0; m.traverse(o => { if (!o.isMesh) return; const b = T.parts[k++]; if (!b) return; const lx = ((b.min.x + b.max.x) / 2 - c.x) * s, lz = ((b.min.z + b.max.z) / 2 - c.z) * s; if (Math.hypot(lx, lz) > P.crop) { o.visible = false; cropped.add(b); } }); }
    const col = (b, k) => {   // a model-space box, turned and scaled into the world
      const hw = (b.max.x - b.min.x) * s / 2 * k, hd = (b.max.z - b.min.z) * s / 2 * k, cs = Math.cos(ry), sn = Math.sin(ry);
      const lx = ((b.min.x + b.max.x) / 2 - c.x) * s, lz = ((b.min.z + b.max.z) / 2 - c.z) * s, wx = P.x + lx * cs + lz * sn, wz = P.z - lx * sn + lz * cs;
      const ex = hw * Math.abs(cs) + hd * Math.abs(sn), ez = hw * Math.abs(sn) + hd * Math.abs(cs);
      const x0 = wx - ex, x1 = wx + ex;
      COLL.push({ x0: MX !== null ? MX - x1 : x0, x1: MX !== null ? MX - x0 : x1, z0: wz - ez, z1: wz + ez, y0: y, y1: y + (b.max.y - T.b.min.y) * s, h: (b.max.y - T.b.min.y) * s, furn: true });
    };
    if (P.cols === 'parts') { for (const b of T.parts) if (!cropped.has(b) && (b.max.y - b.min.y) * s >= (P.minH || 0) && Math.max(b.max.x - b.min.x, b.max.z - b.min.z) * s <= (P.maxW || 1e9)) col(b, 0.85); }
    else if (P.cols !== false) col(T.b, 0.85);
  };
  const T = MODEL_TPL[P.url];
  if (T && T.m) return queueMicrotask(() => place(T));   // after the build, which mirrors whatever it added to root
  if (T) return T.wait.push(place);
  const W = MODEL_TPL[P.url] = { wait: [place] };
  loadModelFile(P.url, gl => {
    const m = gl.scene; m.updateMatrixWorld(true); W.parts = [];
    m.traverse(o => { if (o.isMesh) { o.material = leanMat(Array.isArray(o.material) ? o.material[0] : o.material); o.castShadow = true; o.receiveShadow = true; W.parts.push(new THREE.Box3().setFromObject(o)); } });
    W.m = m; W.b = new THREE.Box3().setFromObject(m); W.sz = W.b.getSize(new V3()); for (const f of W.wait) f(W); W.wait = [];
  }, e => { console.warn('model', P.url, e); delete MODEL_TPL[P.url]; });
}
// one named node of a loaded model, as its own template with the parents' transforms baked in
function modelPart(T, name) {
  const pc = T.pc || (T.pc = {}); if (pc[name]) return pc[name];
  const src = T.m.getObjectByName(name); if (!src) return null;
  const m = src.clone(); src.matrixWorld.decompose(m.position, m.quaternion, m.scale); m.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(m); return (pc[name] = { m, b, sz: b.getSize(new V3()), parts: [b] });
}
const FURN_LOG = [];   // seating, for the layout audit (front = local -z, or +z for chairs)
function logFurn(f, kind, front) { const [ox, oz, ry, oy] = f.o, m = MIRROR_X !== null; FURN_LOG.push({ kind, x: m ? MIRROR_X - ox : ox, z: oz, y: oy, fx: (m ? -1 : 1) * front * Math.sin(ry), fz: front * Math.cos(ry) }); }
// an upholstered sofa; with a model url the scanned couch stands in for the boxes (the models face +z, the sofa faces -z)
function sofa(f, len, key, model, root) {
  logFurn(f, 'sofa', -1);
  if (model) { const [ox, oz, ry, oy] = f.o; placeModel(root, { url: model, x: ox, z: oz, y: oy, ry: ry + Math.PI, len, axis: 'x', cols: false }); return; }
  f.box(key, 0, 0.22, 0, len, 0.25, 0.85); f.box(key, 0, 0.62, 0.34, len, 0.6, 0.2, 0, -0.08);
  for (const s of [-1, 1]) f.box(key, s * (len / 2 - 0.1), 0.45, 0, 0.2, 0.36, 0.85);
  const n = 3; for (let i = 0; i < n; i++) { const w = (len - 0.4) / n; f.box(key, -len / 2 + 0.2 + w * (i + 0.5), 0.4, -0.05, w - 0.02, 0.12, 0.66); }
  for (const a of [-1, 1]) for (const b of [-1, 1]) f.box('darkWood', a * (len / 2 - 0.08), 0.05, b * 0.35, 0.05, 0.1, 0.05);
  f.box('fabricRose', -len / 2 + 0.45, 0.6, 0.15, 0.4, 0.35, 0.12, 0.2, -0.2);
}
// a piece from one of the model packs, in a fur() frame. The packs' models face +z and the box furniture faces -z, so by default
// the model is turned round (turn: 0 keeps it as it is). at: a local offset, dy: lift; the rest goes to placeModel (len/height/back...)
const PACK = { tl: 'prop-tinyliving.json', kit: 'prop-kitchen.json', bath: 'prop-bathset.json' };
function furModel(f, url, part, P = {}) {
  const [ox, oz, ry, oy] = f.o, [x, z] = P.at ? f.pt(P.at[0], P.at[1]) : [ox, oz];
  placeModel(WORLD.root, Object.assign({ cols: false }, P, { url, part, x, z, y: oy + (P.dy || 0), ry: ry + (P.turn !== undefined ? P.turn : Math.PI) }));
}
function armchair(f, key) { logFurn(f, 'armchair', -1); furModel(f, PACK.tl, 'TinyLiving_LovelyArmchair_33', { len: 0.8, axis: 'x' }); }
// a dining chair; the sitter faces local +z (the back is at -z), so a chair placed beside a table is turned toward it
function chair(f, wood, seat, s = 1) { logFurn(f, 'chair', 1); furModel(f, PACK.tl, 'TinyLiving_LovelyDiningChair_42', { height: 0.92 * s, turn: 0 }); }
// the plain wooden chair, for the swamp shacks
function woodChair(f, wood, seat, s = 1) {
  logFurn(f, 'chair', 1);
  f.box(seat, 0, 0.45 * s, 0, 0.44 * s, 0.05, 0.44 * s);
  for (const [a, b] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) f.box(wood, a * s, 0.225 * s, b * s, 0.035, 0.45 * s, 0.035);
  for (const a of [-0.19, 0.19]) f.box(wood, a * s, 0.75 * s, -0.19 * s, 0.035, 0.6 * s, 0.035);
  f.box(wood, 0, 0.98 * s, -0.19 * s, 0.42 * s, 0.08, 0.03); f.box(wood, 0, 0.75 * s, -0.19 * s, 0.38 * s, 0.05, 0.02);
}
function bookshelf(f) { furModel(f, PACK.tl, 'TinyLiving_PowerTowerBookcase_47', { height: 2.05, at: [0, 0.18], back: true }); }
function bed(f, w, l, sheet, wood) {
  // frame, mattress, a duvet that hangs over the sides and foot, a turned-down sheet and pillows
  f.box(wood, 0, 0.18, 0, w + 0.06, 0.16, l); f.box('mattress', 0, 0.36, 0.02, w, 0.22, l - 0.06);
  const dz = 0.1, dl = l * 0.8, dw = w + 0.08;
  f.box(sheet, 0, 0.48, dz, dw, 0.06, dl);
  for (const sd of [-1, 1]) f.box(sheet, sd * (dw / 2 - 0.012), 0.34, dz, 0.025, 0.28, dl - 0.02);
  f.box(sheet, 0, 0.34, dz + dl / 2 - 0.012, dw - 0.02, 0.28, 0.025);
  f.box('bedding', 0, 0.515, dz - dl / 2 + 0.09, dw - 0.01, 0.035, 0.2);
  const np = w > 1.2 ? 2 : 1; for (let k = 0; k < np; k++) f.box('bedding', np > 1 ? (k - 0.5) * w * 0.48 : 0, 0.53, -l / 2 + 0.24, np > 1 ? w * 0.42 : w * 0.7, 0.13, 0.36, (k - 0.5) * 0.06, -0.15);
  f.box(wood, 0, 0.55, -l / 2 - 0.02, w + 0.1, 1.1, 0.06); f.box(wood, 0, 0.35, l / 2 + 0.02, w + 0.1, 0.7, 0.06);
  f.box(wood, 0, 1.11, -l / 2 - 0.02, w + 0.14, 0.04, 0.09); f.box(wood, 0, 0.71, l / 2 + 0.02, w + 0.14, 0.04, 0.09);
  for (const a of [-1, 1]) for (const b of [-1, 1]) f.box(wood, a * (w / 2 + 0.03), 0.4, b * (l / 2 + 0.02), 0.07, 0.8 + (b < 0 ? 0.4 : 0), 0.07);
}
// close-coupled toilet: the bowl faces local +z, the cistern sits at -z
function toilet(f) { furModel(f, 'prop-toilet.json', null, { height: 0.8, at: [0, -0.33], back: true, turn: 0 }); }
const VANITY_SHELF = 0.665;   // the vanity model's open shelf (its basin covers the whole top), for things put on it
function vanity(f) { furModel(f, PACK.tl, 'TinyLiving_TheSinkzBathroomVanity_32', { len: 0.7, axis: 'x', at: [0, -0.26], back: true, turn: 0 }); }   // back on local -z, like the toilet
// a few shoes or slippers by a door: [type, dx, dz, ry?] from (x, z); each one can be picked up and thrown
function shoesAt(x, z, y, list) { for (const [t, dx, dz, r] of list) prop(t, x + dx, y, z + dz, r !== undefined ? r : (WR() - 0.5) * 0.6); }
function nightstand(f) { furModel(f, PACK.tl, 'TinyLiving_NotATableEnd_43', { height: 0.57 }); }
function dresser(f) { f.box('darkWood', 0, 0.45, 0, 1.4, 0.9, 0.48); f.box('darkWood', 0, 0.91, 0, 1.44, 0.03, 0.52); for (let i = 0; i < 3; i++) { f.box('darkWood', 0, 0.18 + i * 0.27, -0.245, 1.32, 0.24, 0.01); f.box('brass', -0.35, 0.18 + i * 0.27, -0.255, 0.08, 0.02, 0.015); f.box('brass', 0.35, 0.18 + i * 0.27, -0.255, 0.08, 0.02, 0.015); } }
function tableLamp(f, x, y, z) { furModel(f, PACK.tl, 'TinyLiving_TheModernDeskLamp_23', { height: 0.5, at: [x, z], dy: y }); }
function floorLamp(f) { furModel(f, PACK.tl, 'TinyLiving_LampWithoutStorage_20', { height: 1.75 }); }
// the wooden rocking horse model (its head is at +x; the furniture frame wants it at -z)
function rockingHorse(f, root) { const [ox, oz, ry, oy] = f.o; placeModel(root, { url: 'prop-rockhorse.json', x: ox, z: oz, y: oy, ry: ry + Math.PI / 2, len: 1.0, axis: 'x', cols: false }); }
function rug(gb, x, z, w, d, ry, y = FY) { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); gb.add(g, mat4(x, y + 0.006, z, ry), 'rugMat', false); }
// img: a portrait texture index, or 'p<n>' for a framed piece from the paintings collection, scaled to height h
function picFrame(root, axis, a, b, y, facing, img, w, h) {
  if (typeof img === 'string') return placeModel(root, { url: 'prop-paintings.json', part: img, x: a, z: b, y: y - h / 2, ry: axis === 'z' ? (facing > 0 ? 0 : Math.PI) : (facing > 0 ? Math.PI / 2 : -Math.PI / 2), height: h, cols: false, noFlip: true, back: true });
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: TEX.portraits[img], roughness: 0.6 });
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); pic.position.z = 0.012; g.add(pic);
  const fm = MATS.brass, t = 0.04;
  for (const [x, yy, ww, hh] of [[0, h / 2 + t / 2, w + 2 * t, t], [0, -h / 2 - t / 2, w + 2 * t, t], [-w / 2 - t / 2, 0, t, h], [w / 2 + t / 2, 0, t, h]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, 0.03), fm); m.position.set(x, yy, 0.01); m.castShadow = true; g.add(m); }
  if (axis === 'z') { g.position.set(a, y, b); g.rotation.y = facing > 0 ? 0 : Math.PI; }
  else { g.position.set(b === undefined ? a : a, y, b); g.position.set(a, y, b); g.rotation.y = facing > 0 ? Math.PI / 2 : -Math.PI / 2; }
  g.rotation.z = (WR() - 0.5) * 0.1;
  root.add(g);
}

// ---------------------------------------------------------------- fixtures & switches
function buildFixture(gb, root, i) {
  const R = ROOMS[i], [x, z] = R.lamp, CEIL = R.y + WALL_H;
  const bulbMat = MATS.bulbGlass.clone(); bulbMat.emissive = new THREE.Color(0xffd9a0); bulbMat.emissiveIntensity = 0;
  const g = new THREE.Group(); g.position.set(x, CEIL, z); root.add(g);
  if (R.flood) {   // floodlights on top of a tall pole (the pole is part of the map)
    g.position.y = R.y + R.flood;
    gb.mm('railBlack', x - 0.5, R.y + R.flood + 0.05, z - 0.12, x + 0.5, R.y + R.flood + 0.12, z + 0.12);
    for (const dx of [-0.32, 0, 0.32]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.2), MATS.railBlack); h.position.set(dx, -0.08, 0); h.rotation.x = 0.35; g.add(h); const b = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.16), bulbMat); b.rotation.x = -Math.PI / 2 + 0.35; b.position.set(dx, -0.19, -0.03); g.add(b); }
    FIXTURES[i] = { pos: new V3(x, R.y + R.flood - 0.3, z), bulbMat, on: false, lvl: 0 }; return;
  }
  if ((R.cage || R.bare) && MAP.rusticBase) {   // the stables: oil lanterns hanging from the joists
    const drop = R.bare ? 0.6 : 0.25; gb.cyl('railBlack', x, CEIL - drop / 2, z, 0.006, 0.006, drop, 4); hangLantern(gb, x, CEIL - drop, z, 1.3);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.12, 10), bulbMat); b.position.y = -drop - 0.26; g.add(b);
    FIXTURES[i] = { pos: new V3(x, CEIL - drop - 0.4, z), bulbMat, on: false, lvl: 0 }; return;
  }
  if (R.cage || R.bare) {   // barn lights: a jelly-jar globe in a wire cage, or a bare bulb on a cord
    const drop = R.bare ? 0.7 : 0.12;
    gb.cyl('railBlack', x, CEIL - drop / 2, z, R.bare ? 0.004 : 0.05, R.bare ? 0.004 : 0.05, drop, 6);
    const b = new THREE.Mesh(R.bare ? new THREE.SphereGeometry(0.04, 12, 10) : new THREE.CylinderGeometry(0.075, 0.075, 0.16, 16), bulbMat); b.position.y = -drop - (R.bare ? 0.03 : 0.08); g.add(b);
    if (R.cage) { for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; gb.cyl('railBlack', x + Math.cos(a) * 0.088, CEIL - drop - 0.08, z + Math.sin(a) * 0.088, 0.004, 0.004, 0.17, 4); } gb.add(new THREE.TorusGeometry(0.088, 0.005, 4, 18), mat4(x, CEIL - drop - 0.12, z, 0, Math.PI / 2), 'railBlack', false); gb.add(new THREE.TorusGeometry(0.088, 0.005, 4, 18), mat4(x, CEIL - drop - 0.02, z, 0, Math.PI / 2), 'railBlack', false); }
    FIXTURES[i] = { pos: new V3(x, CEIL - drop - 0.25, z), bulbMat, on: false, lvl: 0 }; return;
  }
  if (R.outdoor) {   // lantern hanging from a post (the post itself is part of the map)
    g.position.y = R.y + 2.75;
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.26, 8, 1, true), MATS.tentPole); cage.castShadow = false; g.add(cage);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), bulbMat); g.add(b);
    FIXTURES[i] = { pos: new V3(x, R.y + 2.7, z), bulbMat, on: false, lvl: 0 }; return;
  }
  if (R.chandelier) {
    gb.cyl('brass', x, CEIL - 0.3, z, 0.008, 0.008, 0.6, 6); gb.sphere('brass', x, CEIL - 0.62, z, 0.07);
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2, ax = x + Math.cos(a) * 0.3, az = z + Math.sin(a) * 0.3;
      gb.cyl('brass', x + Math.cos(a) * 0.15, CEIL - 0.64, z + Math.sin(a) * 0.15, 0.008, 0.008, 0.3, 5, -a, 0, Math.PI / 2);
      gb.cyl('brass', ax, CEIL - 0.66, az, 0.03, 0.02, 0.05, 8);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), bulbMat); b.scale.y = 1.6; b.position.set(ax - x, -0.6, az - z); g.add(b);
    }
  } else {
    gb.cyl('brass', x, CEIL - 0.02, z, 0.12, 0.12, 0.03, 16);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bulbMat); dome.position.y = -0.03; g.add(dome);
    gb.sphere('brass', x, CEIL - 0.24, z, 0.015);
  }
  FIXTURES[i] = { pos: new V3(x, CEIL - 0.3, z), bulbMat, on: false, lvl: 0 };
}
function buildSwitch(root, i) {
  const [x, z, nx, nz] = ROOMS[i].sw, y = ROOMS[i].y + 1.25;
  const g = new THREE.Group(); g.position.set(x + nx * 0.005, y, z + nz * 0.005); g.rotation.y = Math.atan2(nx, nz); root.add(g);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.01), MATS.switchPlate); g.add(plate);
  const tog = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.035, 0.018), MATS.switchPlate); tog.position.z = 0.012; g.add(tog);
  plate.castShadow = true;
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.08), new THREE.MeshBasicMaterial({ visible: false })); g.add(hit);
  SWITCHES[i] = { group: g, tog, room: i, prints: 0 };
  INTERACT.push({ mesh: hit, kind: 'switch', id: i });
}

// ---------------------------------------------------------------- doors
function buildDoor(root, i) {
  const d = DOOR_DEFS[i], alongX = d.z !== undefined, c = alongX ? d.z : d.x, w = d.e - d.s;
  const hs = d.hinge === 's' ? d.s : d.e;
  const hinge = alongX ? new THREE.Vector2(hs, c) : new THREE.Vector2(c, hs);
  const dir = alongX ? new THREE.Vector2(d.hinge === 's' ? 1 : -1, 0) : new THREE.Vector2(0, d.hinge === 's' ? 1 : -1);
  const n = alongX ? new THREE.Vector2(0, d.into) : new THREE.Vector2(d.into, 0);
  const sign = Math.sign(n.x * dir.y - n.y * dir.x) || 1;
  const base = Math.atan2(-dir.y, dir.x);
  const g = new THREE.Group(); g.position.set(hinge.x, d.y, hinge.y); g.rotation.y = base; root.add(g);
  const panel = new THREE.Group(); g.add(panel);
  const pw = w - 0.02, ph = d.front ? 2.08 : 2.06;
  const gbd = new GB();
  const dm = d.mat || 'doorWood';
  if (d.style === 'stall') {   // horse stall door: planked lower half, steel bars above, latch and a name plate
    gbd.box('stallBoard', pw / 2 + 0.01, 0.64, 0, pw, 1.22, 0.045);
    for (const [y, h] of [[0.03, 0.06], [1.25, 0.06], [ph - 0.02, 0.05]]) gbd.box('railBlack', pw / 2 + 0.01, y, 0, pw, h, 0.06);
    for (const xx of [0.02, pw]) gbd.box('railBlack', xx, ph / 2, 0, 0.04, ph, 0.06);
    const n = Math.round(pw / 0.085); for (let k = 1; k < n; k++) gbd.cyl('railBlack', 0.01 + pw * k / n, 1.65, 0, 0.011, 0.011, ph - 1.25, 6);
    gbd.box('railBlack', pw / 2 + 0.01, 0.64, 0.03, pw * 0.92, 0.05, 0.012, 0, 0, Math.atan2(1.1, pw)); gbd.box('railBlack', pw / 2 + 0.01, 0.64, -0.03, pw * 0.92, 0.05, 0.012, 0, 0, Math.atan2(1.1, pw));
    gbd.box('chrome', pw - 0.08, 1.05, 0.045, 0.14, 0.035, 0.03); gbd.box('chrome', pw - 0.08, 1.05, -0.045, 0.14, 0.035, 0.03);
    for (const hy of [0.25, 1.85]) gbd.cyl('railBlack', 0.004, hy, 0, 0.013, 0.013, 0.12, 8);
    const meshes = gbd.build(panel);
    if (d.plate) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.1), new THREE.MeshStandardMaterial({ map: d.plate, roughness: 0.5, metalness: 0.4 })); pl.position.set(pw / 2, 1.12, d.plateSide * 0.025); pl.rotation.y = d.plateSide > 0 ? 0 : Math.PI; panel.add(pl); }
  } else if (d.style === 'barn') {   // a big hinged barn door: vertical boards, white frame and X brace, strap hinges
    gbd.box(dm, pw / 2 + 0.01, ph / 2 + 0.01, 0, pw, ph, 0.06);
    for (const zz of [-0.04, 0.04]) {
      for (const [a, b, w2, h2] of [[pw / 2, 0.06, pw, 0.12], [pw / 2, ph - 0.05, pw, 0.12], [0.06, ph / 2, 0.12, ph], [pw - 0.05, ph / 2, 0.12, ph], [pw / 2, ph / 2, pw, 0.1]]) gbd.box('trimWhite', a + 0.01, b, zz, w2, h2, 0.025);
      for (const sg of [1, -1]) for (const [cy, hh] of [[ph * 0.28, ph / 2 - 0.12], [ph * 0.72, ph / 2 - 0.12]]) gbd.box('trimWhite', pw / 2 + 0.01, cy, zz, Math.hypot(pw - 0.24, hh), 0.1, 0.022, 0, 0, sg * Math.atan2(hh, pw - 0.24));
      for (const hy of [0.35, ph - 0.35]) gbd.box('railBlack', 0.32, hy, zz * 1.4, 0.6, 0.07, 0.012);
    }
    gbd.cyl('railBlack', pw - 0.2, 1.05, 0, 0.012, 0.012, 0.16, 6, 0, Math.PI / 2, 0);
    gbd.build(panel);
  } else {
  gbd.box(dm, pw / 2 + 0.01, ph / 2 + 0.01, 0, pw, ph, 0.045);
  for (const zz of [-0.026, 0.026]) for (const [py, hh] of [[0.55, 0.7], [1.5, 0.8]]) { if (d.oval && py > 1) continue; gbd.box(dm, pw * 0.3 + 0.01, py, zz * 0.92, pw * 0.36, hh, 0.014); gbd.box(dm, pw * 0.72 + 0.01, py, zz * 0.92, pw * 0.36, hh, 0.014); }
  for (const hy of [0.28, 1.78]) gbd.cyl('brass', 0.004, hy, 0, 0.011, 0.011, 0.1, 8);   // hinge knuckles
  if (d.oval) { gbd.add(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 20), mat4(pw / 2, 1.45, 0, 0, Math.PI / 2, 0, 1, 1, 4.2), 'glass'); gbd.add(new THREE.TorusGeometry(0.1, 0.012, 6, 24), mat4(pw / 2, 1.45, 0.026, 0, 0, 0, 1, 4.2, 1), 'brass'); }
  if (d.glassDoor) gbd.box('glass', pw / 2 + 0.01, 1.25, 0, pw - 0.16, 1.5, 0.05);
  for (const zz of [-0.04, 0.04]) gbd.sphere('brass', pw - 0.06, 1.0, zz, 0.028);
  gbd.cyl('brass', pw - 0.06, 1.0, 0, 0.01, 0.01, 0.1, 6, 0, Math.PI / 2, 0);
  if (d.front && !d.oval) gbd.box('glass', pw / 2, 1.65, 0, pw * 0.5, 0.35, 0.05);
  gbd.build(panel);
  }
  const hit = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, 0.12), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(pw / 2, ph / 2, 0); panel.add(hit);
  const D = { i, def: d, y: d.y, ext: !!(d.front || d.ext), g, panel, hinge, dir, sign, base, w, angle: 0, target: 0, speed: 2.5, locked: false, closet: d.closet, vel: 0, creakT: 0 };
  // a few doors start ajar, the same for everyone
  if (!D.ext && !d.closet) { D.angle = D.target = WR() < 0.5 ? 1.45 : WR() * 0.6; }
  else if (d.closet) D.angle = D.target = 0.25;
  g.rotation.y = base + sign * D.angle;
  DOORS[i] = D;
  INTERACT.push({ mesh: hit, kind: 'door', id: i });
}
function doorSeg(D) { const a = D.sign * D.angle; const c = Math.cos(a), s = Math.sin(a); const dx = D.dir.x * c + D.dir.y * s, dz = -D.dir.x * s + D.dir.y * c; return [D.hinge.x, D.hinge.y, D.hinge.x + dx * D.w, D.hinge.y + dz * D.w]; }
function doorCenter(D) { const s = doorSeg(D); return new V3((s[0] + s[2]) / 2, D.y + 1.1, (s[1] + s[3]) / 2); }

// ---------------------------------------------------------------- exterior
const TENT = { x: 3.5, z: -8.6 };  // moved per map by loadMapData
function buildExterior(gb, root) {
  // ground
  const gg = new THREE.PlaneGeometry(260, 260, 1, 1); gg.rotateX(-Math.PI / 2);
  gb.add(gg, mat4(10, 0, 0), 'grassBase', true);
  // street, sidewalk, driveway, path
  gb.mm('asphalt', -120, -0.02, -26, 140, 0.01, -17);
  gb.mm('sidewalk', -120, 0, -16.6, 140, 0.04, -15);
  gb.mm('sidewalk', -120, 0, -17.0, 140, 0.12, -16.6);
  gb.mm('sidewalk', 8.9, 0, -15, 10.1, 0.03, -2.9);
  gb.mm('sidewalk', 14.0, 0, -15, 17.0, 0.025, -0.2);
  // street markings
  for (let x = -100; x < 120; x += 6) gb.mm('enamel', x, 0.012, -21.6, x + 3, 0.016, -21.45);
  // picket fence
  const fence = (x0, z0, x1, z1) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / 0.16), ry = Math.atan2(-(z1 - z0), x1 - x0);
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = lerp(x0, x1, t), z = lerp(z0, z1, t);
      if (WR() < 0.06) continue;
      const tilt = WR() < 0.1 ? (WR() - 0.5) * 0.5 : 0;
      gb.box('paintedWood', x, 0.48, z, 0.08, 0.96, 0.02, ry, 0, tilt);
    }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    gb.box('paintedWood', cx, 0.3, cz, L, 0.07, 0.03, ry); gb.box('paintedWood', cx, 0.75, cz, L, 0.07, 0.03, ry);
    addCollider(Math.min(x0, x1) - 0.06, Math.min(z0, z1) - 0.06, Math.max(x0, x1) + 0.06, Math.max(z0, z1) + 0.06, 1);
  };
  fence(-6, -14.6, 8.8, -14.6); fence(10.2, -14.6, 13.8, -14.6); fence(17.2, -14.6, 26, -14.6);
  fence(-6, -14.6, -6, 20); fence(26, -14.6, 26, 20); fence(-6, 20, 26, 20);
  addCollider(8.7, -15.6, 17.4, -15.4, 3); // the street side is off-limits (soft blocker behind gate)
  addCollider(-6, -15.6, 26, -15.4, 3);
  // dead trees
  for (const [x, z, s] of [[-2.8, -5.5, 1.1], [22.5, -9, 1.3], [-3.5, 12, 1.0], [23.5, 9.5, 1.2], [6.5, -12.4, 0.8], [12.5, 18, 1.0], [-14, -30, 1.4], [32, -32, 1.3]]) deadTree(gb, x, z, s);
  // fir woods behind the lots on three sides; the street side stays open
  firBelt([-5.8, -14.4, 26, 19.8], 46, [[-200, -40, 200, -12]], 3, 16);
  for (const [x, z, s] of [[-9, 4, 1.2], [-10.5, 14, 1.35], [30, 2, 1.25], [31, 15, 1.1], [8, 25, 1.3]]) fir(x, z, s);
  // abandoned car in the driveway
  car(root, 15.5, -6.5, 0.05);
  // mailbox
  gb.cyl('darkWood', 11.0, 0.55, -15.2, 0.04, 0.04, 1.1, 6); gb.box('metal', 11.0, 1.15, -15.2, 0.22, 0.24, 0.48);
  // street lamp across the road
  gb.cyl('metal', 21, 2.6, -16.0, 0.06, 0.09, 5.2, 10); gb.cyl('metal', 20.3, 5.15, -16.0, 0.035, 0.035, 1.4, 6, 0, 0, Math.PI / 2); gb.box('metal', 19.6, 5.1, -16.0, 0.36, 0.12, 0.24);
  const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.2), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff9a40, emissiveIntensity: 3 }));
  lampHead.position.set(19.6, 5.03, -16.0); root.add(lampHead); WORLD_EXTRA.streetBulb = lampHead;
  // porch light (dead bulb that sputters)
  gb.box('brass', 10.35, FY + 1.95, -0.14, 0.12, 0.2, 0.1);
  const porchBulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffc070, emissiveIntensity: 0 }));
  porchBulb.position.set(10.35, FY + 1.85, -0.2); root.add(porchBulb); WORLD_EXTRA.porchBulb = porchBulb;
  // neighbouring houses lost in the fog
  for (const [x, z, w, d, ry] of [[-30, -2, 14, 11, 0.05], [52, 3, 16, 12, -0.04], [-12, -44, 15, 11, 0.02], [18, -46, 18, 12, -0.03], [48, -42, 14, 10, 0.06], [-40, -40, 12, 10, 0]]) {
    gb.box('darkHouse', x, 2.6, z, w, 5.2, d, ry);
    gb.box('shingles', x, 6.0, z, w + 1, 0.2, d * 0.62, ry, 0.55); gb.box('shingles', x, 6.0, z + 0.01, w + 1, 0.2, d * 0.62, ry, -0.55);
  }
  // distant lit window — someone is still up
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.4), new THREE.MeshBasicMaterial({ color: 0xffb060 })); win.position.set(14, 2.6, -39.95); win.material.color.multiplyScalar(0.7); root.add(win);
}
const WORLD_EXTRA = {};
function deadTree(gb, x, z, s) {
  const branch = (px, py, pz, len, r, yaw, pitch, depth) => {
    const dx = Math.sin(pitch) * Math.cos(yaw), dy = Math.cos(pitch), dz = Math.sin(pitch) * Math.sin(yaw);
    const cx = px + dx * len / 2, cy = py + dy * len / 2, cz = pz + dz * len / 2;
    const g = new THREE.CylinderGeometry(r * 0.7, r, len, depth > 2 ? 7 : 5);
    const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), new V3(dx, dy, dz));
    gb.add(g, new THREE.Matrix4().compose(new V3(cx, cy, cz), q, new V3(1, 1, 1)), 'bark', false, 1);
    if (depth <= 0 || r < 0.015) return;
    const ex = px + dx * len, ey = py + dy * len, ez = pz + dz * len;
    const n = depth > 2 ? 3 : 2;
    for (let i = 0; i < n; i++) branch(ex, ey, ez, len * (0.6 + WR() * 0.2), r * 0.62, yaw + (i - (n - 1) / 2) * 1.6 + (WR() - 0.5) * 1.2, clamp(pitch + 0.35 + WR() * 0.4, 0.2, 1.4), depth - 1);
  };
  branch(x, 0, z, 2.6 * s, 0.22 * s, WR() * 6.28, 0.06, 4);
  addCollider(x - 0.3 * s, z - 0.3 * s, x + 0.3 * s, z + 0.3 * s, 3);
}
// the abandoned sedan (the model's nose is at +z)
function car(root, x, z, ry) { placeModel(root, { url: 'prop-car.json', x, z, ry: ry + Math.PI, len: 4.5, axis: 'z', cols: 'box' }); }
function buildTent(gb, root) {
  const { x, z } = TENT, s = 1.6, h = 2.15, ty = terrainY(x, z);   // ty: the ground under the tent (the bayou's plank deck)
  const rustic = !!MAP.rusticBase;   // the stables: no tent, just a plank trestle table beside the wagon
  if (!rustic) {
  for (const [a, b] of [[-s, -s], [s, -s], [-s, s], [s, s]]) { gb.cyl('tentPole', x + a, ty + h / 2, z + b, 0.025, 0.025, h, 8); addCollider(x + a - 0.06, z + b - 0.06, x + a + 0.06, z + b + 0.06, 2, false, ty); }
  // pyramid roof
  const rg = new THREE.ConeGeometry(s * Math.SQRT2 + 0.05, 0.75, 4, 1, true); rg.rotateY(Math.PI / 4);
  gb.add(rg, mat4(x, ty + h + 0.37, z), 'canvas', false, 3);
  // valance skirt
  for (const [a, b, ry] of [[0, -s, 0], [0, s, 0], [-s, 0, Math.PI / 2], [s, 0, Math.PI / 2]]) gb.box('canvas', x + a, ty + h - 0.12, z + b, s * 2, 0.24, 0.01, ry);
  // back wall (toward the street) and one side wall
  const back = new THREE.PlaneGeometry(s * 2, h - 0.2, 12, 4); const p = back.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 5) * 0.03); back.computeVertexNormals();
  gb.add(back, mat4(x, ty + (h - 0.2) / 2, z - s), 'canvas', false, 2);
  gb.add(back.clone(), mat4(x - s, ty + (h - 0.2) / 2, z, Math.PI / 2), 'canvas', false, 2);
  addCollider(x - s, z - s - 0.05, x + s, z - s + 0.05, 2, false, ty); addCollider(x - s - 0.05, z - s, x - s + 0.05, z + s, 2, false, ty);
  // stakes & guy lines
  for (const [a, b] of [[-s - 0.8, -s - 0.8], [s + 0.8, -s - 0.8], [-s - 0.8, s + 0.8], [s + 0.8, s + 0.8]]) {
    const L = Math.hypot(0.8, 0.8, h); const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), new V3(-Math.sign(a) * 0.8, h, -Math.sign(b) * 0.8).normalize());
    gb.add(new THREE.CylinderGeometry(0.004, 0.004, L, 3), new THREE.Matrix4().compose(new V3(x + a - Math.sign(a) * 0.4, ty + h / 2, z + b - Math.sign(b) * 0.4), q, new V3(1, 1, 1)), 'tentPole', false);
  }
  }
  // folding table (or planks on two trestles)
  const tx = x, tz = z + 0.15;
  if (rustic) {
    for (let k = 0; k < 4; k++) gb.mm('darkWood', tx - 1.1, ty + 0.72, tz - 0.4 + k * 0.2 + 0.005, tx + 1.1, ty + 0.76, tz - 0.2 + k * 0.2 - 0.005);
    for (const a of [-1, 1]) { gb.box('darkWood', tx + a * 0.85, ty + 0.68, tz, 0.08, 0.06, 0.82); for (const b of [-1, 1]) gb.box('darkWood', tx + a * 0.85, ty + 0.34, tz + b * 0.22, 0.06, 0.72, 0.06, 0, b * 0.3); }
  } else {
  gb.mm('grayPlastic', tx - 1.1, ty + 0.72, tz - 0.4, tx + 1.1, ty + 0.76, tz + 0.4);
  for (const a of [-1, 1]) { gb.box('tentPole', tx + a * 0.95, ty + 0.36, tz, 0.03, 0.03, 0.85, 0, 0.6); gb.box('tentPole', tx + a * 0.95, ty + 0.36, tz, 0.03, 0.03, 0.85, 0, -0.6); }
  }
  addCollider(tx - 1.12, tz - 0.42, tx + 1.12, tz + 0.42, 0.8, false, ty);
  // clipboard (submit verdict)
  const clip = new THREE.Group(); clip.position.set(tx - 0.85, ty + 0.765, tz + 0.15); clip.rotation.y = 0.25; root.add(clip);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.012, 0.32), MATS.cardboard); clip.add(board); board.castShadow = true;
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.28), new THREE.MeshStandardMaterial({ color: 0xd8d2c0, roughness: 0.9 })); paper.rotation.x = -Math.PI / 2; paper.position.y = 0.007; clip.add(paper);
  const cl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.03), MATS.chrome); cl.position.set(0, 0.012, -0.145); clip.add(cl);
  INTERACT.push({ mesh: board, kind: 'clip', id: 0 });
  WORLD_EXTRA.clip = clip;
  // lantern
  gb.cyl(rustic ? 'railBlack' : 'tentPole', tx + 0.85, ty + 0.79, tz - 0.2, 0.06, 0.07, 0.04, 12); gb.cyl(rustic ? 'railBlack' : 'tentPole', tx + 0.85, ty + 0.99, tz - 0.2, 0.05, 0.06, 0.03, 12);
  const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 12), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffb36a, emissiveIntensity: 2.5, transparent: true, opacity: 0.95 }));
  lg.position.set(tx + 0.85, ty + 0.89, tz - 0.2); root.add(lg); WORLD_EXTRA.lantern = lg;
  // chairs and crates (a hay bale and a barrel at the stables)
  if (rustic) { hayBale(gb, x + 1.1, ty, z + 1.2, 2.6); barrel55(gb, x - 1.5, z + 0.9, ty); addCollider(x + 0.65, z + 0.75, x + 1.55, z + 1.65, 0.4, true, ty); addCollider(x - 1.8, z + 0.6, x - 1.2, z + 1.2, 0.9, false, ty); }
  else {
  { const f = fur(gb, x + 1.0, z + 1.0, 2.6, ty); f.box('fabricBlue', 0, 0.45, 0, 0.5, 0.03, 0.45); f.box('fabricBlue', 0, 0.75, 0.22, 0.5, 0.55, 0.03, 0, -0.15); for (const a of [-1, 1]) { f.box('tentPole', a * 0.24, 0.23, 0, 0.02, 0.02, 0.6, 0, 0.7); f.box('tentPole', a * 0.24, 0.23, 0, 0.02, 0.02, 0.6, 0, -0.7); } f.solid(-0.28, -0.28, 0.28, 0.28, 0.8); }
  { const f = fur(gb, x - 1.05, z - 1.05, 0.15, ty); f.box('grayPlastic', 0, 0.25, 0, 0.7, 0.5, 0.45); f.box('toyYellow', 0, 0.5, 0, 0.72, 0.02, 0.47); f.box('grayPlastic', 0.1, 0.65, 0, 0.5, 0.28, 0.35, 0.3); f.solid(-0.4, -0.28, 0.4, 0.28, 1); }
  }
  if (ty > 0.05) {   // raised ground: a plank deck on posts the tent stands on
    const d = s + 0.6; for (let k = -d; k < d - 0.01; k += 0.2) gb.mm('darkWood', x - d, ty - 0.05, z + k + 0.005, x + d, ty, z + k + 0.195);
    for (const a of [-d, 0, d]) for (const b of [-d, 0, d]) gb.cyl('darkWood', x + a * 0.95, ty / 2 - 0.4, z + b * 0.95, 0.07, 0.07, ty + 0.8, 8);
  } else gb.mm('dirt', x - s - 0.5, ty + 0.002, z - s - 0.5, x + s + 0.5, ty + 0.006, z + s + 0.5);
}
