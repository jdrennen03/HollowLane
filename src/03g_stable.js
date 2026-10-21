// ---------------------------------------------------------------- home base: Whitlock Stables, Claire's animals, tack and the wagon
// Every round starts in the barn aisle. The investigation only begins once the team rides out of the barnyard, either
// on a horse wearing a bridle (the saddle is optional) or on the covered wagon, pulled by any animal in the harness.
// Animals ridden, led or hitched when the team leaves come along and wait by the base at the haunted location.
// The host owns the tack and animal state; every change goes out as one small snapshot event ('stb').
const STB_DEFS = [
  // stall: [x, z, heading] (heading 0 faces +z). seat/head/neck are fractions of the scaled model's height (y) and length (z)
  { name: 'Agrippa', url: 'prop-agrippa.json', kind: 'horse', len: 2.3, rot: 0, saddleLen: 0.8, stall: [9.0, 1.95, 0], seat: [0.79, 0.04], head: [0.86, 0.44], neck: [0.74, 0.27], hip: 0.8 },
  { name: 'Dakota', url: 'prop-horse2.json', kind: 'horse', len: 2.35, rot: 0, draft: true, saddleLen: 0.86, stall: [5.4, 1.95, 0], seat: [0.66, 0.02], head: [0.9, 0.42], neck: [0.7, 0.28], hip: 0.68 },
  // Juniper: for riding (saddle and bridle) or as a tag-along, never for the wagon; the animated donkey at home, the one
  // with the pack out on a job (unless she's saddled: the riding saddle replaces the pack)
  { name: 'Juniper', url: 'prop-donkey.json', home: { url: 'prop-donkey2.json', len: 1.8 }, kind: 'donkey', len: 1.75, saddleLen: 0.66, rot: Math.PI / 2, stall: [1.8, 9.45, Math.PI], seat: [0.66, 0.0], head: [0.86, 0.43], neck: [0.7, 0.3], hip: 0.66 },
];
const STB_TACK = [   // where each piece lives in the tack room: [x, y, z, ry]
  { kind: 'saddle', rack: [14.82, BA0 + 1.15, 0.9, Math.PI / 2] }, { kind: 'saddle', rack: [14.82, BA0 + 1.15, 2.0, Math.PI / 2] },
  { kind: 'bridle', rack: [15.4, BA0 + 1.62, 0.2, 0] }, { kind: 'bridle', rack: [15.82, BA0 + 1.62, 0.2, 0] },
  { kind: 'harness', rack: [19.7, BA0 + 1.55, 2.7, -Math.PI / 2] },
];
const TACK_NAME = { saddle: 'saddle', bridle: 'bridle', harness: 'harness' };
const WAGON_DEF = { url: 'prop-wagon.json', len: 6.4, rot: Math.PI / 2, home: [-12.2, 5.9, -Math.PI / 2], bedY: 1.05, seatZ: 0.95, seatY: 1.42, front: 1.35 };
const DEPART_X = -23;   // ride past here down the drive and the team sets off
const STB = { phase: 'off', animals: [], tack: [], wagon: null, tpl: {}, saddleTpl: null, along: null, msgT: 0 };
const leatherMat = () => MATS.leatherDark || MATS.leather;

// ---------- models
function stbLoad(url, rot, len, cb) {
  const T = STB.tpl[url]; if (T && T.m) return cb(T); if (T) return T.wait.push(cb);
  const W = STB.tpl[url] = { wait: [cb] };
  loadModelFile(url, gl => {
    const m = gl.scene; m.rotation.y = rot; m.updateMatrixWorld(true);
    m.traverse(o => { if (o.isMesh) { o.material = leanMat(Array.isArray(o.material) ? o.material[0] : o.material); o.castShadow = true; o.receiveShadow = true; if (o.isSkinnedMesh) o.frustumCulled = false; } });
    const b = new THREE.Box3().setFromObject(m, true), sz = b.getSize(new V3()), s = len / sz.z;
    const inner = new THREE.Group(); inner.add(m); inner.scale.setScalar(s); inner.position.set(-(b.min.x + sz.x / 2) * s, -b.min.y * s, -(b.min.z + sz.z / 2) * s);
    W.m = inner; W.H = sz.y * s; W.L = len; W.Wd = sz.x * s; W.anims = gl.animations; for (const f of W.wait) f(W); W.wait = [];
  }, e => { console.warn('stable model', url, e); delete STB.tpl[url]; });
}
// one template can only be used once without cloning; the animals and the wagon are unique, the saddles are cloned
function stbInit() {
  if (STB.animals.length) return;
  STB_DEFS.forEach((def, i) => {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body); root.visible = false; scene.add(root);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, def.len * 0.9), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.95; root.add(hit);
    const A = { i, def, root, body, hit, x: def.stall[0], z: def.stall[1], y: BA0, yaw: def.stall[2], speed: 0, saddle: -1, bridle: -1, harness: -1, rider: -1, leader: -1, buddy: -1, H: 1.6, L: def.len, bob: 0, beatT: 0, lastBeat: -1, coll: null };
    STB.animals.push(A);
  });
  STB_TACK.forEach((d, i) => {
    const obj = new THREE.Group(), hit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
    obj.add(hit); scene.add(obj);
    STB.tack.push({ i, kind: d.kind, rack: d.rack, at: 'rack', who: -1, obj, hit, shown: null });
  });
  { const root = new THREE.Group(); root.visible = false; scene.add(root);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.4, 4.6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(0, 1.2, -0.6); root.add(hit);
    const [x, z, yaw] = WAGON_DEF.home; STB.wagon = { root, hit, x, z, y: 0, yaw, speed: 0, animal: -1, driver: -1, pass: [-1, -1, -1], coll: [] }; }
}
// the models are big, so each is fetched the first time it has to be seen
function stbEnsure() {
  for (const A of STB.animals) if (!A.away && !A.req) { A.req = true; stbLoad(A.def.url, A.def.rot, A.def.len, T => {
    A.H = T.H; A.body.add(T.m); A.packM = T.m; A.packH = T.H;
    if (A.homeM) packSkin(A);
    if (A.def.draft) { const ex = draftDetails(A, T.m), rg = rigDraft(A, T.m, ex); if (rg) { A.packM = rg.G2; A.rig = rg.R; } }   // Dakota: markings, mane, tail and a fitted skeleton
    else if (A.def.kind === 'horse') A.rig = rigNamed(A, T.m);
    stbLook(A);
  }); }
  for (const A of STB.animals) if (A.def.home && !A.away && !A.reqHome) { A.reqHome = true; stbLoad(A.def.home.url, A.def.rot === Math.PI / 2 ? 0 : A.def.rot, A.def.home.len, T => {
    A.body.add(T.m); A.homeM = T.m; A.homeH = T.H;
    const mx = A.mixer = new THREE.AnimationMixer(T.m.children[0]); A.acts = {};
    for (const c of T.anims) { const n = c.name.split('|').pop(), a = mx.clipAction(c); a.play(); a.setEffectiveWeight(n === 'idle' ? 1 : 0); A.acts[n] = a; }
    if (A.packM) packSkin(A);
    stbLook(A);
  }); }
  const W = STB.wagon; if (!W.away && !W.req) { W.req = true; stbLoad(WAGON_DEF.url, WAGON_DEF.rot, WAGON_DEF.len, T => W.root.add(T.m)); }
  if (!STB.saddleReq && (MAP.id === 'barn' || STB.tack.some(t => t.kind === 'saddle' && t.at !== 'rack'))) { STB.saddleReq = true; stbLoad('prop-saddle.json', -Math.PI / 2, SADDLE_LEN, T => { STB.saddleTpl = T; for (const t of STB.tack) if (t.kind === 'saddle') { t.shown = null; stbAttach(t); } }); }
}

// ---------- tack meshes: the saddle is the imported model; bridle and harness are built to fit the animal wearing them
function strap(g, mat, a, b, w = 0.03, t = 0.008) {
  const d = new V3().subVectors(b, a), L = d.length(); if (L < 1e-4) return;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, t, L), mat); m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new V3(0, 0, 1), d.normalize()); m.castShadow = true; g.add(m);
}
function ring(g, mat, p, r, tube, rx = 0, ry = 0, sy = 1) { const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 18), mat); m.position.copy(p); m.rotation.set(rx, ry, 0); m.scale.y = sy; m.castShadow = true; g.add(m); return m; }
function bridleMesh() {
  const g = new THREE.Group(), lm = leatherMat(), bit = MATS.chrome;
  {   // hanging on its hook: crown loop, cheeks, a coiled rein
    ring(g, lm, new V3(0, -0.12, 0), 0.11, 0.009, 0, 0, 1.6); ring(g, bit, new V3(0, -0.3, 0.02), 0.03, 0.006, Math.PI / 2);
    ring(g, lm, new V3(0, -0.45, 0.03), 0.09, 0.008, 0, 0, 1.9); return g;
  }
  const H = A.H, L = A.L, d = A.def, hy = H * d.head[0], hz = L * d.head[1], w = A.def.kind === 'donkey' ? 0.11 : 0.12;
  // head runs from the poll (top, back) down to the muzzle (front, low)
  const poll = new V3(0, hy + 0.08, hz - 0.22), muzzle = new V3(0, hy - 0.42, hz + 0.14);
  const ax = new V3().subVectors(muzzle, poll).normalize(), tilt = Math.atan2(ax.z, -ax.y);
  ring(g, lm, poll, w, 0.012, -tilt + Math.PI / 2, 0, 1);                                   // crownpiece over the poll
  const nose = muzzle.clone().addScaledVector(ax, -0.12); ring(g, lm, nose, w * 0.85, 0.012, -tilt + Math.PI / 2, 0, 1);   // noseband
  const brow = poll.clone().add(new V3(0, -0.04, 0.09)); strap(g, lm, brow.clone().setX(-w), brow.clone().setX(w), 0.03, 0.01);   // browband
  for (const s of [-1, 1]) {
    const top = poll.clone().setX(s * w), bt = muzzle.clone().addScaledVector(ax, -0.05).setX(s * (w * 0.8));
    strap(g, lm, top, bt, 0.028, 0.01);                                                      // cheek pieces
    ring(g, bit, bt, 0.035, 0.006, 0, Math.PI / 2);                                          // bit rings
    strap(g, lm, bt, new V3(s * 0.16, H * d.seat[0] + 0.12, L * d.seat[1] + 0.32), 0.02, 0.008);   // reins back to the withers
  }
  return g;
}
function harnessMesh() {
  const g = new THREE.Group(), lm = leatherMat(), brass = MATS.brass;
  {   // on its peg: the collar with the hames, traces coiled underneath
    ring(g, lm, new V3(0, 0, 0), 0.24, 0.055, 0, 0, 1.35); for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.62, 6), MATS.darkWood); h.position.set(s * 0.22, 0, 0.04); h.rotation.z = s * 0.12; g.add(h); }
    ring(g, lm, new V3(0, -0.5, 0.05), 0.16, 0.02, Math.PI / 2 - 0.3); return g;
  }
  const H = A.H, L = A.L, d = A.def, k = A.def.kind === 'donkey' ? 0.78 : 1, ny = H * d.neck[0], nz = L * d.neck[1];
  const collar = ring(g, lm, new V3(0, ny, nz), 0.25 * k, 0.06 * k, 0.45, 0, 1.3);
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.66 * k, 6), brass); h.position.set(s * 0.23 * k, ny + 0.02, nz + 0.05); h.rotation.set(0.45, 0, s * 0.12); g.add(h);
    const tr = new V3(s * 0.27 * k, ny - 0.18 * k, nz - 0.06), end = new V3(s * 0.3 * k, H * d.hip - 0.25, -L * 0.5 - 0.45);
    strap(g, lm, tr, end, 0.045, 0.012);                                                     // traces back toward the wagon
    strap(g, lm, new V3(s * 0.32 * k, H * d.hip - 0.12, -L * 0.36), new V3(s * 0.3 * k, H * d.hip - 0.26, L * 0.05), 0.05, 0.012);   // breeching
  }
  const by = H * d.seat[0] + 0.02, bz = L * d.seat[1] - 0.05;
  strap(g, lm, new V3(-0.32 * k, by - 0.42 * k, bz), new V3(-0.12, by, bz), 0.07, 0.015); strap(g, lm, new V3(-0.12, by, bz), new V3(0.12, by, bz), 0.12, 0.03); strap(g, lm, new V3(0.12, by, bz), new V3(0.32 * k, by - 0.42 * k, bz), 0.07, 0.015);
  strap(g, lm, new V3(0, H * d.hip + 0.03, -L * 0.3), new V3(0, by + 0.02, bz), 0.035, 0.01);   // crupper strap along the back
  return g;
}
// put a tack piece where its state says it is: on its rack, in my hands, on an animal (or out of sight)
function stbAttach(t) {
  const A = t.at === 'on' ? STB.animals[t.who] : null, mine = t.at === 'hand' && t.who === G.mySlot;
  if (A && !stbShown(A)) { t.obj.visible = false; t.shown = null; return; }   // wait for the animal's model
  const key = t.at + ':' + t.who + ':' + (A ? stbFitKey(A) : '');
  if (t.shown === key) return; t.shown = key;
  for (const c of [...t.obj.children]) if (c !== t.hit) t.obj.remove(c);
  let vis;
  if (t.kind === 'saddle') { if (!STB.saddleTpl) { t.shown = null; return; } if (A) vis = saddleOn(A, t); else { vis = new THREE.Group(); vis.add(STB.saddleTpl.m.clone()); } }   // wrapped: the clone keeps its centring offset
  else if (A) vis = t.kind === 'bridle' ? bridleFit(A) : harnessFit(A);
  else vis = t.kind === 'bridle' ? bridleMesh() : harnessMesh();
  if (t.vis) stbReinsOff(t.vis); t.vis = vis;
  t.obj.add(vis);
  const par = A ? A.body : mine ? PL.hand : t.at === 'rack' ? scene : null;
  if (!par) { t.obj.visible = false; return; }
  par.add(t.obj); t.obj.visible = true; t.obj.rotation.set(0, 0, 0); t.obj.scale.setScalar(1); t.hit.visible = t.at === 'rack';
  if (A) {
    t.obj.position.set(0, 0, 0);
    // the bridle rides on the head bone so it moves with the head, the saddle and harness on the spine (measured and attached standing)
    const F = A.fits && A.fits[stbFitKey(A)], bone = t.kind === 'bridle' ? vis.userData.bone : F && F.spine;
    if (bone) { if (A.mixer && (A.home || A.packSk)) { for (const n in A.acts) A.acts[n].setEffectiveWeight(n === 'idle' ? 1 : 0); A.mixer.setTime(0); } horseRest(A); A.root.updateMatrixWorld(true); bone.attach(t.obj); }
  } else if (mine) {
    t.obj.position.set(0.32, -0.42, -0.62); t.obj.rotation.set(0.15, 0.4, 0); if (t.kind === 'saddle') { t.obj.scale.setScalar(0.55); vis.position.y = -0.4; } else { t.obj.scale.setScalar(0.8); vis.position.y = 0.25; }
  } else {
    const [x, y, z, ry] = t.rack; t.obj.position.set(x, y, z); t.obj.rotation.y = ry; if (t.kind === 'saddle') vis.position.y = -SADDLE_SEAT;
    t.hit.position.set(0, t.kind === 'saddle' ? -0.1 : -0.25, 0);
  }
  if (t.at === 'rack') t.obj.visible = MAP.id === 'barn';
}

// ---------- state, snapshots and placement
function stbSnap() {
  const W = STB.wagon;
  return [STB.animals.map(A => [r2(A.x), r2(A.z), r2(A.yaw), A.saddle, A.bridle, A.harness, A.rider, A.leader, A.buddy, A.spk ? 1 : 0, r2(A.calm || 0)]), STB.tack.map(t => [t.at === 'rack' ? 0 : t.at === 'hand' ? 1 : 2, t.who]), [r2(W.x), r2(W.z), r2(W.yaw), W.animal, W.driver, ...W.pass]];
}
function stbApply(s) {
  s[0].forEach((q, i) => { const A = STB.animals[i]; if (!A) return; const moving = A.rider >= 0 || A.leader >= 0 || A.buddy >= 0;
    [A.saddle, A.bridle, A.harness, A.rider, A.leader, A.buddy] = q.slice(3); A.spk = q[9] || 0; A.calm = q[10] || 0; if (!(A.rider >= 0 || A.leader >= 0 || A.buddy >= 0) || !moving) { A.x = q[0]; A.z = q[1]; A.yaw = q[2]; } });
  s[1].forEach((q, i) => { const t = STB.tack[i]; if (!t) return; t.at = q[0] === 0 ? 'rack' : q[0] === 1 ? 'hand' : 'on'; t.who = q[1]; stbAttach(t); });
  const W = STB.wagon, w = s[2]; if (W.driver < 0 || w[4] < 0) { W.x = w[0]; W.z = w[1]; W.yaw = w[2]; } W.animal = w[3]; W.driver = w[4]; W.pass = w.slice(5);
  for (const t of STB.tack) stbAttach(t);
  if (typeof hudBuildInventory === 'function') stbHud();
}
function hostStb() { hostEvent(['stb', stbSnap()]); }
// everything back home: tack on the racks, animals in their stalls, the wagon where the tent used to stand
function stbReset() {
  stbInit();
  for (const A of STB.animals) { [A.x, A.z, A.yaw] = A.def.stall; A.saddle = A.bridle = A.harness = A.rider = A.leader = A.buddy = -1; A.speed = 0; A.trail = null; A.spk = 0; A.calm = 0; A.spookA = null; }
  for (const t of STB.tack) { t.at = 'rack'; t.who = -1; stbAttach(t); }
  const W = STB.wagon; [W.x, W.z, W.yaw] = WAGON_DEF.home; W.animal = W.driver = -1; W.pass = [-1, -1, -1]; W.speed = 0;
  STB.along = null; stbVis();
}
// called after every map load: the colliders and hotspots are rebuilt from scratch by then
function stbAfterMap() {
  stbInit();
  for (const A of STB.animals) {
    A.coll = { x0: 0, z0: 0, x1: 0, z1: 0, y0: -50, y1: -49, h: 1, dyn: true }; COLL.push(A.coll);
    INTERACT.push({ mesh: A.hit, kind: 'anim', id: A.i });
  }
  const W = STB.wagon;
  W.coll = [0, 1].map(() => { const c = { x0: 0, z0: 0, x1: 0, z1: 0, y0: -50, y1: -49, h: 1.6, dyn: true }; COLL.push(c); return c; });
  INTERACT.push({ mesh: W.hit, kind: 'wagon', id: 0 });
  for (const t of STB.tack) INTERACT.push({ mesh: t.hit, kind: 'tack', id: t.i });
  stbVis();
}
// which of the animals and the wagon are here: at the stables all of them, elsewhere only what came along
function stbVis() {
  const al = STB.along, here = MAP.id === 'barn';
  for (const A of STB.animals) { A.away = !here && !(al && al.animals.includes(A.i)); A.root.visible = !A.away; }
  const W = STB.wagon; W.away = !here && !(al && al.wagon); W.root.visible = !W.away;
  stbEnsure(); for (const t of STB.tack) { t.shown = null; stbAttach(t); }
  if (WORLD_EXTRA.departSign) drawDepartSign();
  drawJobBoard(); stbHud();
}
// at the haunted location the animals that came along wait in a row beside the base, the wagon parked behind them
function stbArrive() {
  const ok = (x, z, r) => {
    const y = terrainY(x, z); if (Math.abs(y - terrainY(TENT.x, TENT.z)) > 1.2) return false;
    for (const lv of MAP.levels) if (roomIdxAt(x, z, lv + 0.1) >= 0 && !ROOMS[roomIdxAt(x, z, lv + 0.1)].outdoor) return false;
    for (const c of COLL) { if (c.dyn || c.y1 < y + 0.3 || c.y0 > y + 1.6) continue; const dx = Math.max(c.x0 - x, 0, x - c.x1), dz = Math.max(c.z0 - z, 0, z - c.z1); if (dx * dx + dz * dz < r * r) return false; }
    return true;
  };
  const used = [], free = (x, z, r) => used.every(([a, b, q]) => Math.hypot(a - x, b - z) > r + q);
  const spot = (r, len) => {
    for (const R of [4.5, 6, 7.5, 9, 11, 13, 16, 20]) for (let k = 0; k < 24; k++) {
      const a = k / 24 * Math.PI * 2 + 0.4, x = TENT.x + Math.cos(a) * R, z = TENT.z + Math.sin(a) * R, yaw = a + Math.PI / 2;
      const pts = []; for (let t = -len / 2; t <= len / 2 + 0.01; t += 1) pts.push([x + Math.sin(yaw) * t, z + Math.cos(yaw) * t]);
      if (pts.every(([px, pz]) => ok(px, pz, r) && free(px, pz, r))) { for (const [px, pz] of pts) used.push([px, pz, r]); return [x, z, yaw]; }
    }
    return [TENT.x + 3, TENT.z + 3, 0];
  };
  const W = STB.wagon, al = STB.along || { animals: [], wagon: false };
  if (al.wagon && MAP.road && MAP.road.park) [W.x, W.z, W.yaw] = MAP.road.park;   // on the road out, facing the way home
  else if (al.wagon) {   // the wagon with its team runs from the wagon's tail (-3.2) to the animal's nose
    const z0 = -3.2, z1 = W.animal >= 0 ? WAGON_DEF.front + STB.animals[W.animal].L : 3.2, [x, z, yaw] = spot(1.3, z1 - z0), c = (z0 + z1) / 2;
    W.x = x - Math.sin(yaw) * c; W.z = z - Math.cos(yaw) * c; W.yaw = yaw;
  }
  for (const A of STB.animals) { A.rider = A.leader = -1; A.speed = 0; A.trail = null; if (A.buddy >= 0 && !G.players[A.buddy]) A.buddy = -1; if (!al.animals.includes(A.i) || W.animal === A.i) continue; const [x, z, yaw] = spot(0.75, A.L); A.x = x; A.z = z; A.yaw = yaw; }
  W.driver = -1; W.pass = [-1, -1, -1]; W.speed = 0; STB.spooked = false;
  for (const A of STB.animals) { A.spk = 0; A.calm = 0; A.spookA = null; }
  for (const t of STB.tack) if (t.at === 'hand') { t.at = 'rack'; t.who = -1; }
  stbVis();
}

// Juniper wears whichever body fits: the animated one at the stables, the pack donkey on a job
function stbLook(A) {
  if (!A.packM) return;
  const home = !!A.homeM && ((MAP.id === 'barn' && STB.phase !== 'hunt') || A.saddle >= 0);
  if (A.packSk) { A.homeM.visible = true; A.packM.visible = false; for (const m of A.homeBody) m.visible = home; for (const m of A.packSk) m.visible = !home; }
  else { if (A.homeM) A.homeM.visible = home; A.packM.visible = !home; }
  const H = home ? A.homeH : A.packH; if (A.home !== home || A.H !== H) { A.H = H; A.home = home; for (const t of STB.tack) if (t.at === 'on' && t.who === A.i) stbAttach(t); }
  A.home = home;
}
// the animated donkey's clips: idle and grazing at rest, walk / trot / run by speed
function stbAnimate(A, dt) {
  if (!A.mixer || (!A.home && !A.packSk)) return;
  const g = Math.abs(A.speed); A.restT = g > 0.1 ? 0 : (A.restT || 0) + dt;
  const want = g > 4.5 ? 'run' : g > 2.0 ? 'trot' : g > 0.1 ? 'walk' : (A.restT % 24) > 12 ? 'grazing' : 'idle';
  for (const n in A.acts) { const a = A.acts[n], w = a.getEffectiveWeight(); a.setEffectiveWeight(w + ((n === want ? 1 : 0) - w) * clamp(dt * 5, 0, 1)); }
  if (A.acts.walk) A.acts.walk.timeScale = clamp(g / 1.3, 0.6, 1.6);
  A.mixer.update(dt);
}

// ---------- who is on what
function riding(slot) { return STB.animals.find(A => A.rider === slot) || null; }
function onWagon(slot) { const W = STB.wagon; return !W ? null : W.driver === slot ? 'drive' : W.pass.includes(slot) ? 'pass' : null; }
function mounted(slot) { return !!(riding(slot) || onWagon(slot)); }
function carryingTack(slot = G.mySlot) { return STB.tack.find(t => t.at === 'hand' && t.who === slot) || null; }
function wagonLocal(lx, ly, lz) { const W = STB.wagon, c = Math.cos(W.yaw), s = Math.sin(W.yaw); return new V3(W.x + lz * s + lx * c, W.y + ly, W.z + lz * c - lx * s); }
function animalLocal(A, lx, ly, lz) { const c = Math.cos(A.yaw), s = Math.sin(A.yaw); return new V3(A.x + lz * s + lx * c, A.y + ly, A.z + lz * c - lx * s); }
const PASS_SEATS = [[-0.45, -0.6], [0.45, -0.6], [0, -1.6]];

// ---------- host side: requests from any player
function hostStable(slot, r) {
  const t = r[1], P = G.players[slot]; if (!P) return false;
  const A = STB.animals[r[2]], W = STB.wagon, tk = STB.tack[r[2]], hand = carryingTack(slot), say = m => hostEvent(['msg', slot, m]);
  if (A && A.spk && ['tput', 'toff', 'mount', 'lead', 'buddy'].includes(t)) { say(A.def.name + ' is too spooked to let you near. Calm ' + A.def.name + ' down first (E, slow and quiet).'); return true; }
  if (t === 'hitch' && STB.animals.some(B => B.spk && B.harness >= 0)) { say('The horse in the harness is too spooked. Calm it down first (E).'); return true; }
  if (t === 'tk') { if (!tk || tk.at !== 'rack' || hand) return true; tk.at = 'hand'; tk.who = slot; }
  else if (t === 'tback') { if (!hand) return true; hand.at = 'rack'; hand.who = -1; }
  else if (t === 'tput') {
    if (!A || !hand) return true;
    if (hand.kind === 'harness' && A.def.kind !== 'horse') { say(A.def.name + ' is for riding, not for pulling the wagon. The harness is for the horses.'); return true; }
    if (A[hand.kind] >= 0) { say(A.def.name + ' already has a ' + hand.kind + ' on.'); return true; }
    if (hand.kind === 'harness' && A.rider >= 0) { say('Get ' + A.def.name + '\'s rider down first.'); return true; }
    A[hand.kind] = hand.i; hand.at = 'on'; hand.who = A.i; hostEvent(['snd', 'pickup', A.x, 1.2, A.z, 0.6]);
  }
  else if (t === 'toff') {
    if (!A || hand || A.rider >= 0 || W.animal === A.i) return true;
    const k = ['bridle', 'saddle', 'harness'].find(q => A[q] >= 0); if (!k) return true;
    const p = STB.tack[A[k]]; A[k] = -1; p.at = 'hand'; p.who = slot;
  }
  else if (t === 'mount') {
    if (!A || A.rider >= 0 || mounted(slot) || W.animal === A.i) return true;
    if (A.bridle < 0) { say('You can\'t ride ' + A.def.name + ' without a bridle. They hang in the tack room.'); return true; }
    if (A.harness >= 0) { say(A.def.name + ' is in the wagon harness. Take it off first (G).'); return true; }
    A.rider = slot; A.leader = A.buddy = -1; A.x = r[3]; A.z = r[4]; if (Math.random() < 0.6) hostEvent(['snd', 'snort', r2(A.x), 1.6, r2(A.z), 0.7]);
  }
  else if (t === 'dis') { const B = riding(slot); if (B) { B.rider = -1; B.x = r[2]; B.z = r[3]; B.yaw = r[4]; B.speed = 0; } }
  else if (t === 'lead') {
    if (!A || A.rider >= 0 || W.animal === A.i) return true;
    if (A.leader === slot) { A.leader = -1; A.x = r[3]; A.z = r[4]; A.yaw = r[5]; } else { A.leader = slot; A.buddy = -1; }
  }
  else if (t === 'buddy') {   // tag along: follows on its own, no rope
    if (!A || A.rider >= 0 || W.animal === A.i) return true;
    if (A.buddy === slot) { A.buddy = -1; A.x = r[3]; A.z = r[4]; A.yaw = r[5]; } else { A.buddy = slot; A.leader = -1; }
  }
  else if (t === 'hitch') {
    const B = STB.animals.filter(B => B.def.kind === 'horse' && B.harness >= 0 && B.rider < 0 && W.animal !== B.i).sort((a, b) => (b.leader === slot) - (a.leader === slot) || Math.hypot(a.x - W.x, a.z - W.z) - Math.hypot(b.x - W.x, b.z - W.z))[0];
    if (W.animal >= 0) return true;
    if (!B) { say('Nothing here is wearing the harness. Put it on one of the animals first.'); return true; }
    if (B.leader !== slot && Math.hypot(B.x - W.x, B.z - W.z) > 9) { say('Lead ' + B.def.name + ' over to the wagon first (E on ' + B.def.name + ').'); return true; }
    W.animal = B.i; B.leader = -1;
  }
  else if (t === 'unhitch') { if (W.animal < 0 || W.driver >= 0) return true; const B = STB.animals[W.animal]; W.animal = -1; const p = wagonLocal(1.6, 0, WAGON_DEF.front + B.L / 2); B.x = p.x; B.z = p.z; B.yaw = W.yaw; }
  else if (t === 'drive') { if (W.animal < 0 || W.driver >= 0 || mounted(slot)) return true; W.driver = slot; }
  else if (t === 'board') { if (mounted(slot)) return true; const k = W.pass.indexOf(-1); if (k < 0) { say('The wagon is full.'); return true; } W.pass[k] = slot; }
  else if (t === 'wagoff') {
    if (W.driver === slot) { W.driver = -1; W.x = r[2]; W.z = r[3]; W.yaw = r[4]; W.speed = 0; }
    const k = W.pass.indexOf(slot); if (k >= 0) W.pass[k] = -1;
  }
  else if (t === 'depart') { if (mounted(slot)) hostDepart(slot); return true; }
  else if (t === 'calm') { hostCalm(slot, A); return true; }
  else if (t === 'home') { if (STB.phase === 'hunt' && G.state === 'play' && mounted(slot)) hostEvent(['end', -2, slot]); return true; }
  else return false;
  hostStb(); return true;
}
function hostDepart(slot) {
  if (STB.phase !== 'base' || G.departing) return;
  const W = STB.wagon, al = { animals: STB.animals.filter(A => A.rider >= 0 || A.leader >= 0 || A.buddy >= 0 || W.animal === A.i).map(A => A.i), wagon: W.driver >= 0 || W.animal >= 0 };
  G.departing = true; hostEvent(['stb', stbSnap()]); hostEvent(['depart', slot, al.animals, al.wagon ? 1 : 0]);
}
// host tick: riders who died or left fall off
function hostStableTick() {
  if (!STB.animals.length) return;
  let ch = false;
  for (const A of STB.animals) for (const k of ['rider', 'leader', 'buddy']) if (A[k] >= 0 && (!G.players[A[k]] || !G.players[A[k]].alive)) { const P = G.players[A[k]]; if (P) { A.x = P.pos.x; A.z = P.pos.z; } A[k] = -1; ch = true; }
  const W = STB.wagon; if (W.driver >= 0 && (!G.players[W.driver] || !G.players[W.driver].alive)) { W.driver = -1; W.speed = 0; ch = true; }
  W.pass = W.pass.map(s => s >= 0 && G.players[s] && G.players[s].alive ? s : -1);
  if (ch) hostStb();
}

// ---------- departure: fade out, go to the haunted location, start the investigation there
function onDepart(slot, animals, wagon) {
  STB.along = { animals, wagon: !!wagon };
  const who = G.players[slot], dest = MAPS[STB.dest] || MAP;
  sub((who && slot !== G.mySlot ? who.nick + ' leads' : 'You lead') + ' the team out down the lane, toward ' + dest.title + '…', 'sys');
  sfx('hoof', 0.7); $('fade').style.opacity = 1; if (UI.rideOpen) closeRideMenu();
  setTimeout(() => { arriveAtSite(); $('fade').style.opacity = 0; }, 1400);
}
function arriveAtSite() {
  const o = STB.trip; if (!o) return;
  if (STB.dest !== CURMAP) loadMap(STB.dest);
  G.departing = false; STB.phase = 'hunt';
  const keep = G.players.map(p => p.alive), R = mulberry32((o.seed ^ 0x5eed5) | 0), rooms = ROOMS.map((r, i) => i).filter(i => i < NROOM && !ROOMS[i].noGhost);
  startRound({ ...o, ghostRoom: rooms[Math.floor(R() * rooms.length)] }); G.players.forEach((p, i) => { if (!keep[i]) { p.alive = false; p.gone = true; } });
  stbArrive();
  const P = me(); P.pos.set(TENT.x - 0.6 + G.mySlot * 0.45, 0, TENT.z + 0.95); P.pos.y = terrainY(P.pos.x, P.pos.z); P.flash = true;
  PL.yaw = Math.PI; PL.pitch = -0.05; PL.slotIdx = 0; hudTeam(); hudBuildInventory();
  dogPlace(TENT.x + 1.4, TENT.z + 1.8, Math.PI);   // Scout comes too
  sub(MAP.id === 'barn' ? 'The investigation begins. Gear is on the table by the wagon (E).' : 'You\'ve arrived. Pick up gear from the table (E). The house is across the yard.', 'sys');
  setTimeout(() => sub('Up to four lights can be on at once. Darkness costs sanity.', 'sys'), 4000);
}
// the round opens at the stables, whatever location was picked
function beginAtStables(o) {
  STB.trip = { ...o }; STB.dest = o.map || CURMAP; STB.phase = 'base'; G.departing = false; UI.rideOpen = false; UI.show('ride', false); STB.rideLatch = false;
  if (CURMAP !== 'barn') loadMap('barn');
  stbReset();
  startRound({ ...o, ghostRoom: 0 });
  G.gs.y = -50; G.ghostView.y = -50; G.gs.vis = 0;
  for (let i = 0; i < NROOM; i++) G.lights[i] = ROOMS[i].id === 'aisle' || ROOMS[i].id === 'tack';
}
function stbStop() { STB.phase = 'off'; STB.along = null; if (STB.animals.length) stbReset(); dogStop(); }

// ---------- local player: interacting, riding, driving
function stbInteract(h) {
  const hand = carryingTack(), W = STB.wagon;
  if (h.kind === 'tack') { if (hand) { sub('Your arms are full. Put the ' + hand.kind + ' on an animal, or hang it back up (G).', 'sys'); return; } request('stb', 'tk', h.id); sfx('pickup', 0.6); return; }
  if (h.kind === 'anim') {
    const A = STB.animals[h.id];
    if (A.spk) { request('stb', 'calm', A.i); return; }
    if (hand) { request('stb', 'tput', A.i); return; }
    if (A.bridle >= 0 && A.harness < 0 && W.animal !== A.i && A.rider < 0) { if (mounted(G.mySlot)) return; request('stb', 'mount', A.i, r2(A.x), r2(A.z)); sfx('hoof', 0.4); return; }
    if (W.animal === A.i) { sub(A.def.name + ' is hitched to the wagon.', 'sys'); return; }
    if (A.harness < 0 && A.bridle < 0 && A.leader < 0) { sub('Put a bridle on ' + A.def.name + ' to ride. The bridles hang in the tack room.', 'sys'); }
    request('stb', 'lead', A.i, r2(A.x), r2(A.z), r2(A.yaw));
    return;
  }
  if (h.kind === 'wagon') {
    if (onWagon(G.mySlot)) return;
    if (W.animal < 0) { request('stb', 'hitch', 0); return; }
    if (W.driver < 0 && !riding(G.mySlot)) request('stb', 'drive', 0); else if (!riding(G.mySlot)) request('stb', 'board', 0);
  }
}
function stbBuddy() {   // B on the donkey: tag along (or stop)
  const h = PL.hot; if (!h || h.kind !== 'anim') return false; const A = STB.animals[h.id]; if (A.def.kind !== 'donkey') return false;
  request('stb', 'buddy', A.i, r2(A.x), r2(A.z), r2(A.yaw)); sub(A.buddy === G.mySlot ? A.def.name + ' stays put.' : A.def.name + ' tags along after you.', 'sys'); return true;
}
function stbG() {   // the G key: hang tack back up, take tack off an animal, unhitch
  const hand = carryingTack(), h = PL.hot;
  if (hand) { request('stb', 'tback', hand.i); sub('You hang the ' + hand.kind + ' back up in the tack room.', 'sys'); return true; }
  if (h && h.kind === 'anim') { request('stb', 'toff', h.id); return true; }
  if (h && h.kind === 'wagon' && STB.wagon.animal >= 0 && STB.wagon.driver < 0) { request('stb', 'unhitch', 0); return true; }
  return false;
}
function stbPrompt(h) {
  const hand = carryingTack(), W = STB.wagon, G2 = ' · {G} ';
  if (h.kind === 'tack') { const t = STB.tack[h.id]; return 'Take the ' + (t.kind === 'harness' ? 'wagon harness' : t.kind); }
  if (h.kind === 'anim') {
    const A = STB.animals[h.id], on = ['bridle', 'saddle', 'harness'].filter(k => A[k] >= 0), off = on.length && A.rider < 0 && W.animal !== A.i && !hand ? G2 + 'Take off the ' + on[0] : '';
    if (A.spk) return 'Calm ' + A.def.name + ' down (spooked' + (A.calm > 0 ? ', settling' : '') + ')';
    if (hand) return 'Put the ' + hand.kind + ' on ' + A.def.name;
    if (W.animal === A.i) return A.def.name + ' (hitched to the wagon)';
    if (A.rider >= 0) return A.def.name;
    const bud = A.def.kind === 'donkey' ? ' · {B} ' + (A.buddy === G.mySlot ? 'Stop tagging along' : 'Tag along') : '';
    if (A.bridle >= 0 && A.harness < 0) return 'Ride ' + A.def.name + (A.saddle >= 0 ? '' : ' bareback') + off + bud;
    return (A.leader === G.mySlot ? 'Let go of ' : 'Lead ') + A.def.name + off + bud;
  }
  if (h.kind === 'wagon') {
    if (W.animal < 0) return 'Hitch an animal in harness to the wagon';
    const nm = STB.animals[W.animal].def.name;
    return (W.driver < 0 ? 'Drive the wagon (' + nm + ' pulling)' : 'Climb into the wagon') + (W.driver < 0 ? G2 + 'Unhitch ' + nm : '');
  }
  return '';
}
function stbGetOff() {
  const A = riding(G.mySlot), w = onWagon(G.mySlot), P = me();
  if (A) {   // step down on the left side
    const p = animalLocal(A, -0.9, 0, 0); if (!sightClear(A.x, A.z, p.x, p.z, P.pos.y, P.pos.y)) p.set(A.x, 0, A.z);
    request('stb', 'dis', r2(A.x), r2(A.z), r2(A.yaw)); A.rider = -1; P.pos.x = p.x; P.pos.z = p.z; return true;
  }
  if (w) { const W = STB.wagon, p = wagonLocal(-1.5, 0, w === 'drive' ? WAGON_DEF.seatZ : -0.8); request('stb', 'wagoff', r2(W.x), r2(W.z), r2(W.yaw)); if (w === 'drive') W.driver = -1; else W.pass = W.pass.map(s => s === G.mySlot ? -1 : s); P.pos.x = p.x; P.pos.z = p.z; return true; }
  return false;
}
const _sp = new V3();
// riding / driving / sitting in the wagon replaces walking; returns false when on foot
function stbMove(P, dt, blocked) {
  const A = riding(G.mySlot), w = onWagon(G.mySlot); if (!A && !w) return false;
  const k = PL.keys, cam = PL.cam, W = STB.wagon;
  if (w === 'pass') {
    const s = PASS_SEATS[Math.max(0, W.pass.indexOf(G.mySlot))], p = wagonLocal(s[0], 0, s[1]);
    P.pos.set(p.x, W.y, p.z); P.moving = 0; cam.position.set(p.x, W.y + WAGON_DEF.bedY + 0.95, p.z); cam.rotation.set(PL.pitch, PL.yaw, 0, 'YXZ'); return true;
  }
  const team = !A && W.animal >= 0 ? STB.animals[W.animal] : null, balk = team && (team.spk || team.spookA);
  if (balk && (k.KeyW || k.ArrowUp || k.KeyS || k.ArrowDown)) stbSay(team.def.name + ' won\'t pull, too spooked. Get down and calm ' + team.def.name + ' (E).');
  const E = A || W, fast = !blocked && !balk && (k.ShiftLeft || k.ShiftRight), fw = !blocked && !balk && (k.KeyW || k.ArrowUp), bk = !blocked && !balk && (k.KeyS || k.ArrowDown);
  const donkey = A && A.def.kind === 'donkey', top = A ? (fast ? (donkey ? 4.2 : 5.6) : (donkey ? 1.4 : 1.7)) : (fast ? 4.4 : 2.2), want = fw ? top : bk ? -1.1 : 0;
  E.speed = lerp(E.speed, want, clamp(dt * (want === 0 ? 2.2 : 0.9), 0, 1));   // horses gather and settle gradually
  if (Math.abs(E.speed) < 0.02 && !fw && !bk) E.speed = 0;
  // the animal turns toward where you look, and A/D rein it round
  const turn = A ? 2.0 : 1.2, mv = Math.abs(E.speed) > 0.1 || fw;
  let dy = mv ? angDiff(E.yaw, PL.yaw + Math.PI) : 0; dy = clamp(dy, -turn * dt, turn * dt);
  if (!blocked) { if (k.KeyA || k.ArrowLeft) dy = turn * dt; if (k.KeyD || k.ArrowRight) dy = -turn * dt; if ((k.KeyA || k.KeyD || k.ArrowLeft || k.ArrowRight) && !mv) dy *= 0.6; }
  const ox = E.x, oz = E.z, oyaw = E.yaw;
  E.yaw += dy; E.x += Math.sin(E.yaw) * E.speed * dt; E.z += Math.cos(E.yaw) * E.speed * dt;
  if (!stbFits(E, A)) {   // blocked: keep the turn if it fits on the spot, otherwise stop dead
    E.x = ox; E.z = oz; if (!stbFits(E, A)) E.yaw = oyaw;
    if (Math.abs(E.speed) > 0.5) stbSay(A ? 'Too tight to ride through there. Get down first (E).' : 'The wagon won\'t fit through there.'); E.speed = 0;
  }
  E.y = A ? groundY(E.x, E.z, E.y) : terrainY(E.x, E.z);
  P.pos.set(E.x, E.y, E.z); P.moving = Math.abs(E.speed);
  E.bob = (E.bob || 0) + dt * Math.abs(E.speed) * (Math.abs(E.speed) > 4 ? 2.2 : 3.4);
  const amp = A ? (Math.abs(E.speed) > 4 ? 0.07 : 0.04) * Math.min(1, Math.abs(E.speed)) : 0.015 * Math.min(1, Math.abs(E.speed));
  const st = A && stbSeat(A), seat = A ? animalLocal(A, 0, st.y + 0.8, st.z - 0.06) : wagonLocal(0, WAGON_DEF.seatY + 0.82, WAGON_DEF.seatZ);
  cam.position.set(seat.x, seat.y + Math.sin(E.bob * 2) * amp, seat.z); cam.rotation.set(PL.pitch, PL.yaw, Math.sin(E.bob) * amp * 0.12, 'YXZ');
  if (A || !AU.bufs.rec_carriage) stbHooves(A || STB.animals[W.animal], dt, 0.9);
  if (!A) { E.creakT = (E.creakT || 0) - dt * Math.abs(E.speed); if (E.creakT <= 0 && Math.abs(E.speed) > 0.3) { E.creakT = rr(2, 5); sfx('creak', 0.25, rr(0.6, 0.9)); } }
  return true;
}
function stbSay(m) { const t = performance.now(); if (t - STB.msgT > 2500) { STB.msgT = t; sub(m, 'sys'); } }
// can the horse (or the wagon and its team) stand here? ridden horses keep to the outdoors and the barn's ground floor
function stbFits(E, A) {
  const okRoom = (x, z, y) => { const ri = roomIdxAt(x, z, y + 0.1); return ri < 0 || ROOMS[ri].outdoor || (MAP.id === 'barn' && (ROOMS[ri].lv || 0) === 0 && !ROOMS[ri].closet); };
  const hits = (x, z, r, y, skip) => COLL.some(c => !skip.includes(c) && !(c.h < 0.25 && c.furn) && collAt(c, y) && Math.max(c.x0 - x, 0, x - c.x1) ** 2 + Math.max(c.z0 - z, 0, z - c.z1) ** 2 < r * r);
  if (A) {
    const skip = [A.coll], y = groundY(E.x, E.z, A.y);
    if (hits(E.x, E.z, 0.32, y, skip)) return false;   // the body; the hindquarters may brush past a door frame
    const nose = animalLocal(A, 0, 0, A.L * 0.42); if (!sightClear(E.x, E.z, nose.x, nose.z, y, y)) return false;
    return okRoom(E.x, E.z, y) && doorsClear(E.x, E.z, y, 0.32);
  }
  const W = E, B = W.animal >= 0 ? STB.animals[W.animal] : null, skip = [...W.coll, ...(B ? [B.coll] : [])], y = terrainY(W.x, W.z);
  const pts = []; for (let z = -2.4; z <= WAGON_DEF.front + (B ? B.L : 0) + 0.01; z += 0.8) for (const x of [-0.75, 0.75]) pts.push(wagonLocal(x, 0, z));
  return pts.every(p => !hits(p.x, p.z, 0.2, y, skip) && okRoom(p.x, p.z, y) && doorsClear(p.x, p.z, y, 0.2));
}
function doorsClear(x, z, y, r) {
  for (const D of DOORS) { if (Math.abs(D.y - y) > 1.2 || D.angle > 0.03 || D.target > 0.03) continue; const s = doorSeg(D), vx = s[2] - s[0], vz = s[3] - s[1], L2 = vx * vx + vz * vz, t = clamp(((x - s[0]) * vx + (z - s[1]) * vz) / L2, 0, 1); if (Math.hypot(x - s[0] - vx * t, z - s[1] - vz * t) < r) return false; }
  return true;
}
function stbHooves(A, dt, vol) {
  if (!A || Math.abs(A.speed) < 0.3) return; const fast = Math.abs(A.speed) > 4, cyc = fast ? 0.55 : 0.8, beats = fast ? [0, 0.12, 0.24] : [0, 0.25, 0.5, 0.75];
  A.beatT += dt; const ph = (A.beatT % cyc) / cyc; let b = -1; beats.forEach((f, i) => { if (ph >= f && ph < f + 0.08) b = i; });
  if (b >= 0 && b !== A.lastBeat) sfxAt('hoof', new V3(A.x, A.y + 0.2, A.z), vol * (fast ? 0.7 : 0.4)); A.lastBeat = b;
}

// ---------- every frame, every player: place the animals, the wagon and the tack
function updateStable(dt) {
  if (!STB.animals.length) return;
  const W = STB.wagon;
  for (const A of STB.animals) {
    if (A.away) continue;
    const R = A.rider >= 0 ? G.players[A.rider] : null, L = A.leader >= 0 ? G.players[A.leader] : A.buddy >= 0 ? G.players[A.buddy] : null, loose = A.leader < 0;
    if (R && A.rider !== G.mySlot) { A.x = R.pos.x; A.z = R.pos.z; A.y = R.pos.y; A.yaw += angDiff(A.yaw, R.mountYaw ?? A.yaw) * clamp(dt * 8, 0, 1); A.speed = R.moving || 0; stbHooves(A, dt, 0.8); }
    else if (L && W.animal !== A.i && !A.spk) {   // follow the leader's footsteps, a body length behind
      const lp = new V3(L.pos.x, 0, L.pos.z), tr = A.trail || (A.trail = [lp.clone()]);
      if (lp.distanceTo(tr[tr.length - 1]) > 0.25) { tr.push(lp.clone()); if (tr.length > 80) tr.shift(); }
      const who = A.leader >= 0 ? A.leader : A.buddy, lagD = (loose ? 2.6 : 1.2) + A.L * 0.5 + (riding(who) ? 1.2 : 0);
      if (loose && Math.hypot(L.pos.x - A.x, L.pos.z - A.z) > 30 && tr.length > 8) { const q = tr[tr.length - 8]; A.x = q.x; A.z = q.z; }   // a tag-along that fell far behind catches up
      let d = 0, tgt = tr[0]; for (let i = tr.length - 1; i > 0; i--) { d += tr[i].distanceTo(tr[i - 1]); if (d >= lagD) { tgt = tr[i - 1]; break; } }
      const dx = tgt.x - A.x, dz = tgt.z - A.z, dist = Math.hypot(dx, dz);
      if (dist > 0.15 && d >= lagD) { const sp = Math.min(dist * 2.2, 7.5); A.x += dx / dist * sp * dt; A.z += dz / dist * sp * dt; A.yaw += angDiff(A.yaw, Math.atan2(dx, dz)) * clamp(dt * 5, 0, 1); A.speed = sp; } else A.speed = lerp(A.speed, 0, clamp(dt * 4, 0, 1));
      A.y = groundY(A.x, A.z, A.y); stbHooves(A, dt, 0.6);
    } else if (W.animal === A.i) { const p = wagonLocal(0, 0, WAGON_DEF.front + A.L / 2); A.x = p.x; A.z = p.z; A.yaw = W.yaw; A.speed = W.speed; A.y = terrainY(A.x, A.z); }
    else if (A.rider < 0) { A.speed = 0; A.y = groundY(A.x, A.z, A.y === undefined ? 0 : A.y + 0.3); A.trail = null; }
    stbSpookStep(A, dt);
    if (A.rider === G.mySlot) A.trail = null;
    // a walking bob and a slow breath at rest (except Juniper at home, whose model walks for itself)
    stbLook(A); stbAnimate(A, dt); if (A.rig) horseAnimate(A, performance.now() / 1000, dt);
    stbRope(A, A.leader >= 0 && W.animal !== A.i && A.rider < 0);
    const br = A.bridle >= 0 && STB.tack[A.bridle].vis; if (br && br.userData.bits) stbReins(A, br);
    A.bob = (A.bob || 0) + dt * (0.6 + Math.abs(A.speed) * 2.6);
    const g = Math.abs(A.speed), amp = A.home || A.rig || A.packSk ? 0 : g > 4 ? 0.06 : g > 0.3 ? 0.025 : 0.004;
    A.root.position.set(A.x, A.y + Math.abs(Math.sin(A.bob)) * amp, A.z); A.root.rotation.set(g > 0.3 ? Math.sin(A.bob * 2) * amp * 0.6 : 0, A.yaw, 0, 'YXZ');
    const c = A.coll, free = A.rider < 0 && W.animal !== A.i && A.leader < 0;
    if (c) { if (free) { const p = animalLocal(A, 0, 0, 0); c.x0 = p.x - 0.4; c.x1 = p.x + 0.4; c.z0 = p.z - 0.4; c.z1 = p.z + 0.4; c.y0 = A.y; c.y1 = A.y + 1.5; c.h = 1.5; } else { c.y0 = -50; c.y1 = -49; } }
  }
  if (!W.away) {
    const D = W.driver >= 0 ? G.players[W.driver] : null;
    if (D && W.driver !== G.mySlot) { W.x = D.pos.x; W.z = D.pos.z; W.yaw += angDiff(W.yaw, D.mountYaw ?? W.yaw) * clamp(dt * 8, 0, 1); W.speed = D.moving || 0; if (!AU.bufs.rec_carriage) stbHooves(STB.animals[W.animal], dt, 0.8); }
    W.y = terrainY(W.x, W.z);
    const pf = wagonLocal(0, 0, 1.6), pb = wagonLocal(0, 0, -1.6), fy = terrainY(pf.x, pf.z), by = terrainY(pb.x, pb.z);
    W.root.position.set(W.x, W.y, W.z); W.root.rotation.set(-Math.atan2(fy - by, 3.2), W.yaw, 0, 'YXZ');
    W.coll.forEach((c, i) => { const p = wagonLocal(0, 0, i ? -1.4 : 0.6); if (W.driver >= 0 || W.pass.includes(G.mySlot)) { c.y0 = -50; c.y1 = -49; return; } c.x0 = p.x - 0.95; c.x1 = p.x + 0.95; c.z0 = p.z - 0.95; c.z1 = p.z + 0.95; c.y0 = W.y; c.y1 = W.y + 1.6; });
  }
  for (const t of STB.tack) stbAttach(t);
  if (G.isHost && G.state === 'play') hostStableTick();
  stbRideCheck(); stbCarriage(); stbCalls(dt);
}
// raise teammates who are riding or driving onto the horse / the wagon seat
function stbAvatarOffset(P, out) {
  out.set(0, 0, 0); P.ride = false;
  const A = riding(P.slot), w = onWagon(P.slot);
  if (A) { P.ride = true; const st = stbSeat(A); out.set(0, st.y - 0.86, 0); const c = Math.cos(A.yaw), s = Math.sin(A.yaw), lz = st.z - 0.08; out.x = lz * s; out.z = lz * c; }
  else if (w === 'drive') { P.ride = true; out.y = WAGON_DEF.seatY - 0.45; const s = Math.sin(STB.wagon.yaw), c = Math.cos(STB.wagon.yaw); out.x = WAGON_DEF.seatZ * s; out.z = WAGON_DEF.seatZ * c; }
  else if (w === 'pass') { P.ride = true; out.y = WAGON_DEF.bedY - 0.45; }
  return out;
}
function stbHud() {
  const t = carryingTack(), el = $('tackTag'); if (!el) return;
  const A = riding(G.mySlot), w = onWagon(G.mySlot);
  const txt = t ? 'Carrying the ' + (t.kind === 'harness' ? 'wagon harness' : t.kind) + ' · G to hang it back up' : A ? 'Riding ' + A.def.name + ' · W to walk on, Shift to canter, E to get down' : w === 'drive' ? 'Driving the wagon · W/S, steer with the mouse or A/D, E to get down' : w === 'pass' ? 'Riding in the wagon · E to climb down' : '';
  el.hidden = !txt; el.textContent = txt;
}
// ---------- the job board: pick tonight's place (E) and difficulty (G) before riding out; the host decides in team play
const JOB_MAPS = ['lane', 'farm', 'bayou'];   // the stables are home, never a haunted place
function jobMap(m) { if (JOB_MAPS.includes(m)) return m; let p = null; try { p = localStorage.getItem('hl-map'); } catch (e) { } return JOB_MAPS.includes(p) ? p : 'lane'; }
function drawJobBoard() {
  const S = WORLD_EXTRA.jobBoard; if (!S) return; const x = S.ctx, w = 512, h = 384, dest = MAPS[STB.dest] || MAP, mode = (STB.trip && STB.trip.mode) || CURMODE;
  x.fillStyle = '#1f2a24'; x.fillRect(0, 0, w, h); x.strokeStyle = '#6b4a2e'; x.lineWidth = 18; x.strokeRect(9, 9, w - 18, h - 18);
  x.fillStyle = 'rgba(236,236,226,0.9)'; x.textAlign = 'center'; x.font = '700 34px "Comic Sans MS", "Segoe Print", cursive'; x.fillText("TONIGHT'S JOB", w / 2, 66);
  x.font = '700 40px Georgia, serif'; x.fillStyle = '#f4e3a8'; x.fillText(dest ? dest.title : '', w / 2, 140);
  x.font = '500 24px Georgia, serif'; x.fillStyle = 'rgba(236,236,226,0.8)'; x.fillText(dest ? dest.eyebrow : '', w / 2, 176);
  x.font = '700 30px "Comic Sans MS", "Segoe Print", cursive'; x.fillStyle = mode === 'nightmare' ? '#f08a7a' : mode === 'rookie' ? '#9fd89a' : '#e8d8a0'; x.fillText('Difficulty: ' + (MODES[mode] || 'Pro'), w / 2, 238);
  x.font = '500 22px "Comic Sans MS", "Segoe Print", cursive'; x.fillStyle = 'rgba(236,236,226,0.7)'; x.fillText('E  change the place    G  change difficulty', w / 2, 300); x.fillText('then tack up and ride out!', w / 2, 334);
  S.tex.needsUpdate = true;
}
function hostJob(slot, what, m2, md2) {
  if (STB.phase !== 'base' || !STB.trip) return;
  if (G.mp && slot !== 0) { hostEvent(['msg', slot, 'The host picks tonight\'s job.']); return; }
  const ms = Object.keys(MODES);
  let map = what === 'map' ? JOB_MAPS[(JOB_MAPS.indexOf(STB.dest) + 1) % JOB_MAPS.length] : STB.dest, mode = what === 'mode' ? ms[(ms.indexOf(STB.trip.mode) + 1) % ms.length] : STB.trip.mode;
  if (what === 'set') { if (JOB_MAPS.includes(m2)) map = m2; if (ms.includes(md2)) mode = md2; }
  hostEvent(['job', map, mode]);
}
function onJob(map, mode) {
  if (!STB.trip || !MAPS[map]) return; STB.dest = map; STB.trip.map = map; STB.trip.mode = mode;
  if (!G.mp || G.isHost) { CURMODE = mode; try { localStorage.setItem('hl-map', map); localStorage.setItem('hl-mode', mode); } catch (e) { } }
  drawJobBoard(); drawDepartSign(); sfx('scribble', 0.4); if (UI.rideOpen === 'out') renderRideMenu();
  sub('Tonight\'s job: ' + MAPS[map].title + ' · ' + MODES[mode] + '.', 'sys');
}
// the board at the end of the drive names the place the team is headed
function drawDepartSign() {
  const S = WORLD_EXTRA.departSign; if (!S) return; const x = S.ctx, w = 512, h = 192, dest = MAPS[STB.dest] || MAPS[CURMAP];
  x.fillStyle = '#5a3e26'; x.fillRect(0, 0, w, h); for (let i = 0; i < 6; i++) { x.fillStyle = `rgba(0,0,0,${0.12 + (i % 2) * 0.08})`; x.fillRect(0, i * h / 6, w, 2); }
  x.fillStyle = '#efe2c4'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 40px Georgia, serif'; x.fillText('RIDE OUT  →', w / 2, 60);
  x.font = 'italic 600 30px Georgia, serif'; x.fillText(dest && dest.id !== 'barn' ? 'to ' + dest.title : 'the Whitlock place', w / 2, 128);
  S.tex.needsUpdate = true;
}

// ---------- the ride-out menu: it opens whenever you reach the end of the drive mounted (or the road out of a job)
// At the stables: pick the place and the difficulty, then ride out (the host picks in team play). At a job: head home.
function stbRideZone() {
  const p = me().pos;
  if (STB.phase === 'base' && MAP.id === 'barn') return p.x < DEPART_X && p.z > 1.5 && p.z < 10.5 ? 'out' : null;
  if (STB.phase === 'hunt' && MAP.road) return MAP.road.exit.some(b => p.x > b[0] && p.x < b[2] && p.z > b[1] && p.z < b[3]) ? 'home' : null;
  return null;
}
function stbRideCheck() {
  const P = me(); if (!P || !P.alive || G.state !== 'play' || G.departing || UI.rideOpen) return;
  const zone = stbRideZone();
  if (!zone || !mounted(G.mySlot)) { if (!zone) STB.rideLatch = false; return; }
  if (STB.rideLatch) return; STB.rideLatch = true;   // once per visit to the end of the road: back off a little to bring it up again
  const E = riding(G.mySlot) || (onWagon(G.mySlot) === 'drive' ? STB.wagon : null); if (E) E.speed = 0;
  openRideMenu(zone);
}
function openRideMenu(kind) {
  UI.rideOpen = kind; if (document.pointerLockElement) document.exitPointerLock();
  PL.keys = {}; renderRideMenu(); UI.show('ride', true);
}
function closeRideMenu() { UI.rideOpen = false; UI.show('ride', false); if (G.state === 'play') requestLock($('gl')); }
function renderRideMenu() {
  const el = $('rideBody'); if (!el) return;
  const lead = !G.mp || G.isHost, mode = (STB.trip && STB.trip.mode) || CURMODE, esc = t => String(t).replace(/</g, '&lt;');
  if (UI.rideOpen === 'out') {
    const dest = MAPS[STB.dest] || MAPS.lane;
    el.innerHTML = '<div class="eyebrow">Riding out</div><h1 class="title">Where to tonight?</h1>'
      + '<div class="field"><label>The place</label><div class="maps">' + JOB_MAPS.map(id => '<button type="button" class="mapc' + (STB.dest === id ? ' sel' : '') + '" data-map="' + id + '"' + (lead ? '' : ' disabled') + '>' + esc(MAPS[id].title) + '<small>' + esc(MAPS[id].eyebrow) + '</small></button>').join('') + '</div></div>'
      + '<div class="field"><label>Difficulty</label><div class="maps modes">' + Object.keys(MODES).map(k => '<button type="button" class="mapc' + (mode === k ? ' sel' : '') + '" data-mode="' + k + '"' + (lead ? '' : ' disabled') + '>' + esc(MODES[k]) + '</button>').join('') + '</div></div>'
      + (lead ? '' : '<p class="note">The host picks tonight\'s job.</p>')
      + '<div class="btns"><button type="button" class="b primary" data-go="1">Ride out <small>to ' + esc(dest.title) + '</small></button><button type="button" class="b" data-go="0">Not yet <small>Esc</small></button></div>';
  } else {
    el.innerHTML = '<div class="eyebrow">Leaving ' + esc(MAP.title) + '</div><h1 class="title">Head home?</h1>'
      + '<p class="note">Riding back to Whitlock Stables ends tonight\'s investigation <b>without a verdict</b>. If you have a guess, file it on the clipboard at the gear table first.</p>'
      + '<div class="btns"><button type="button" class="b primary" data-go="1">Head home <small>to the stables</small></button><button type="button" class="b" data-go="0">Stay and keep looking <small>Esc</small></button></div>';
  }
}
function bindRideMenu() {
  const el = $('ride'); if (!el || el.bound) return; el.bound = true;
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const mode = (STB.trip && STB.trip.mode) || CURMODE;
    if (b.dataset.map) request('job', 'set', b.dataset.map, mode);
    else if (b.dataset.mode) request('job', 'set', STB.dest, b.dataset.mode);
    else if (b.dataset.go === '1') { const k = UI.rideOpen; closeRideMenu(); request('stb', k === 'out' ? 'depart' : 'home'); }
    else if (b.dataset.go === '0') closeRideMenu();
  });
}

// ---------- spooked: a hunt that starts out in the bayou's graveyard frightens the animals that came along
// The first time in a night they blow (a fart you can hear across the yard), buck, throw anyone riding and bolt away from
// the graves; after that they rear. Either way they stay spooked: they back off from anyone coming close and won't be
// ridden, led or hitched until someone calms them, E a few times, standing close and moving slowly.
const GRAVEYARD = { x: 0, z: 0.3, r: 9.5 };
function hostSpookCheck() {
  const gs = G.gs; if (MAP.id !== 'bayou' || !STB.animals.length || levelOf(gs.y) !== 0 || Math.hypot(gs.x - GRAVEYARD.x, gs.z - GRAVEYARD.z) > GRAVEYARD.r) return;
  const here = STB.animals.filter(A => !A.away); if (!here.length) return;
  const first = !STB.spooked; STB.spooked = true;
  hostEvent(['spook', first ? 1 : 0, r2(gs.x), r2(gs.z)]);   // before the riders come off, so each rider's game sees itself thrown
  for (const A of here) { A.spk = 1; A.calm = 0; A.leader = -1; A.rider = -1; }
  hostStb();
}
function onSpook(first, gx, gz) {
  const P = me(), mine = riding(G.mySlot), names = [];
  for (const A of STB.animals) {
    if (A.away) continue; names.push(A.def.name);
    const hitched = STB.wagon.animal === A.i;
    A.spookA = { t: 0, kind: first && !hitched ? 'buck' : 'rear', dir: Math.atan2(A.x - gx, A.z - gz), hitched, snd: 0 };
    sfxAt(first ? 'fart' : 'snort', new V3(A.x, A.y + 1, A.z), 1);
  }
  if (mine && P) {   // thrown clear, on the side away from the graves
    const p = animalLocal(mine, -1.1, 0, -0.3); if (!sightClear(mine.x, mine.z, p.x, p.z, P.pos.y, P.pos.y)) p.set(mine.x, 0, mine.z);
    P.pos.x = p.x; P.pos.z = p.z; mine.rider = -1;
    sub(first ? mine.def.name + ' lets rip, bucks hard and throws you!' : mine.def.name + ' rears straight up and you slide off!', 'sys');
  }
  const loose = STB.animals.filter(A => !A.away && STB.wagon.animal !== A.i).map(A => A.def.name), team = STB.wagon.animal >= 0 && !STB.animals[STB.wagon.animal].away ? STB.animals[STB.wagon.animal].def.name : '', and = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a[0];
  if (P && names.length) sub(first ? 'Out by the graves the animals spook!' + (loose.length ? ' ' + and(loose) + ' let rip, buck and bolt.' : '') + (team ? ' ' + team + ' rears in the harness.' : '') : and(names) + (names.length > 1 ? ' rear' : ' rears') + ' and shy away from the graveyard.', 'sys');
}
function hostCalm(slot, A) {
  const P = G.players[slot]; if (!A || !A.spk || !P) return;
  if (Math.hypot(P.pos.x - A.x, P.pos.z - A.z) > 3.6) { hostEvent(['msg', slot, 'Get closer to ' + A.def.name + ', slowly.']); return; }
  if ((P.moving || 0) > 2.2) { hostEvent(['msg', slot, A.def.name + ' shies away. Come in slower.']); return; }
  if (G.elapsed - (A.calmT || -9) < 0.9) return; A.calmT = G.elapsed;
  A.calm = Math.min(1, (A.calm || 0) + 0.34);
  if (A.calm >= 1) { A.spk = 0; A.calm = 0; hostEvent(['msg', slot, A.def.name + ' blows out a long breath, lowers that head and lets you rub the neck. Calm again.']); hostEvent(['snd', 'breath', r2(A.x), r2(A.y + 1.4), r2(A.z), 0.7]); }
  else hostEvent(['msg', slot, A.calm < 0.5 ? 'You talk low and hold out a hand. ' + A.def.name + ' snorts, eyes rolling, but stays put.' : A.def.name + ' takes a step toward you and sniffs your hand.']);
  hostStb();
}
// the motion: buck / rear on the spot, a bolt away from the graves, and backing off while still spooked
function stbSpookStep(A, dt) {
  const S = A.spookA, free = A.rider < 0 && STB.wagon.animal !== A.i;
  let rear = 0, buck = 0;
  if (S) {
    S.t += dt; const t = S.t;
    if (!S.snd && t > 0.45) { S.snd = 1; sfxAt('whinny', new V3(A.x, A.y + 1.5, A.z), 0.9); }
    if (S.kind === 'buck') {
      if (t < 1.6) buck = Math.max(0, Math.sin(t * Math.PI * 2 * 1.25)) * 0.42 * Math.min(1, t * 3);
      else if (t < 4.3 && free) stbBolt(A, S, 6.5, dt);
      else return stbSpookDone(A);
    } else {
      const D = S.kind === 'toss' ? 0.8 : 1.9;
      if (t < D) rear = Math.pow(Math.sin(Math.PI * t / D), 0.7) * (S.kind === 'toss' ? 0.28 : 0.72);
      else if (t < D + 0.8 && free && S.kind === 'rear') { A.x -= Math.sin(A.yaw) * 1.2 * dt; A.z -= Math.cos(A.yaw) * 1.2 * dt; A.speed = 1.2; A.y = groundY(A.x, A.z, A.y); }
      else return stbSpookDone(A);
    }
  } else if (A.spk && free && (A.calm || 0) < 1) {   // wary: keep a body length from whoever comes near, facing them
    let N = null, nd = 2.6; for (const P of G.players) { if (!P.alive) continue; const d = Math.hypot(P.pos.x - A.x, P.pos.z - A.z); if (d < nd) { nd = d; N = P; } }
    if (N) {
      const ax = A.x - N.pos.x, az = A.z - N.pos.z, sp = (1.2 - (A.calm || 0)) * (nd < 1.6 ? 1.3 : 0.8);
      A.yaw += angDiff(A.yaw, Math.atan2(-ax, -az)) * clamp(dt * 3, 0, 1);
      const ox = A.x, oz = A.z; A.x += ax / nd * sp * dt; A.z += az / nd * sp * dt;
      if (!stbFreeAt(A, A.x, A.z)) { A.x = ox; A.z = oz; } else A.speed = -sp;
      A.y = groundY(A.x, A.z, A.y);
      if (nd < 1.5 && (N.moving || 0) > 2 && (A.calm || 0) < 0.5) { A.spookA = { t: 0, kind: 'toss', snd: 1 }; sfxAt('snort', new V3(A.x, A.y + 1.3, A.z), 0.8); }   // rushed: a toss of the head
    }
  }
  // pivot the body: rearing about the hind feet, bucking about the front feet
  const L = A.L * 0.36;
  if (rear > 0) { A.body.rotation.x = -rear; A.body.position.set(0, L * Math.sin(rear), -L + L * Math.cos(rear)); }
  else if (buck > 0) { A.body.rotation.x = buck; A.body.position.set(0, L * Math.sin(buck), L - L * Math.cos(buck)); }
  else if (A.body.rotation.x) { A.body.rotation.x = 0; A.body.position.set(0, 0, 0); }
}
function stbSpookDone(A) { A.spookA = null; A.speed = 0; A.body.rotation.x = 0; A.body.position.set(0, 0, 0); if (G.isHost) hostStb(); }
function stbFreeAt(A, x, z) { const y = groundY(x, z, A.y); return y > -0.1 && !COLL.some(c => c !== A.coll && !c.dyn && collAt(c, y) && Math.max(c.x0 - x, 0, x - c.x1) ** 2 + Math.max(c.z0 - z, 0, z - c.z1) ** 2 < 0.45 * 0.45) && !(roomIdxAt(x, z, y + 0.1) >= 0 && !ROOMS[roomIdxAt(x, z, y + 0.1)].outdoor); }
// gallop away from where the ghost came out, swerving round whatever is in the way
function stbBolt(A, S, sp, dt) {
  for (const off of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.4, -2.4]) {
    const yaw = S.dir + off, x = A.x + Math.sin(yaw) * sp * dt, z = A.z + Math.cos(yaw) * sp * dt;
    if (stbFreeAt(A, x, z) && stbFreeAt(A, A.x + Math.sin(yaw) * 1.2, A.z + Math.cos(yaw) * 1.2)) { if (off) S.dir += off * 0.5; A.x = x; A.z = z; A.yaw += angDiff(A.yaw, yaw) * clamp(dt * 6, 0, 1); A.speed = sp; A.y = groundY(x, z, A.y); stbHooves(A, dt, 0.9); return; }
  }
  A.speed = 0; S.t = Math.max(S.t, 4.3);   // boxed in: stop where it is
}

// ---------- sounds of the animals: the carriage under the moving wagon, and now and then a horse calling out
function stbCarriage() {
  const W = STB.wagon, buf = AU.bufs.rec_carriage; if (!AU.ready || !buf || !W) return;
  if (!STB.carSnd) { const ctx = AU.ctx, s = ctx.createBufferSource(), g = ctx.createGain(), p = ctx.createPanner(); s.buffer = buf; s.loop = true; s.loopStart = 0.04; s.loopEnd = buf.duration - 0.04;
    p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 2; p.rolloffFactor = 1.2; g.gain.value = 0; s.connect(g); g.connect(p); p.connect(AU.master); s.start(); STB.carSnd = { s, g, p }; }
  const C = STB.carSnd, on = !W.away && W.animal >= 0 && G.state === 'play' && Math.abs(W.speed) > 0.25, want = on ? Math.min(1, Math.abs(W.speed) / 2.2) * 0.9 : 0;
  C.g.gain.setTargetAtTime(want, AU.ctx.currentTime, 0.25); C.s.playbackRate.value = clamp(0.8 + Math.abs(W.speed) * 0.1, 0.8, 1.25);
  C.p.positionX.value = W.x; C.p.positionY.value = W.y + 1; C.p.positionZ.value = W.z;
}
function stbCalls(dt) {
  if (G.state !== 'play') return;
  for (const A of STB.animals) {
    if (A.away || A.def.kind !== 'horse' || A.spookA) continue;
    A.callT = (A.callT ?? 30 + Math.random() * 60) - dt;
    if (A.callT <= 0) { A.callT = 45 + Math.random() * 75; const h = animalLocal(A, 0, A.H * 0.85, A.L * 0.42); sfxAt(Math.random() < 0.65 ? 'whinny' : 'snort', h, 0.55); }
  }
}
