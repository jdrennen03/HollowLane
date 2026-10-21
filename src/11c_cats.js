// ---------------------------------------------------------------- Drennen Estate cats
// Three house cats: one rigged cat model, re-coated and reshaped for each, its skeleton animated procedurally. The host runs their behaviour and shares
// positions with the team; everyone animates them locally.
//   Izzabelle (blue) - a fat Russian Blue with a pink collar and an always-upright tail; roams the whole downstairs, never outside
//   Mitty (tort)     - Claire's small, low tortoiseshell with a turquoise collar and a black "claires cat" tag; Claire's room and the
//                      landing only. She trusts only Claire (a player named Claire): strangers without her send her under the bed.
//   Toby (white)     - tall and slender, white with one black ear, a black spot on a hind leg and a black tail; lives outside, follows
//                      you in, runs up to Claire's room, and runs back out the next time someone leaves the house
// During a hunt each one runs to its hiding place until it is over: Mitty under Claire's bed, Izzabelle behind the couch, Toby under the porch.
const CATS = [];
// sc: model scale (x wide, y tall, z long); fat widens the belly; L (stride) and LL (how far the body drops to sit/lie) follow
const CAT_DEFS = [
  { id: 'blue', name: 'Izzabelle', sc: [1.08, 1.0, 1.04], fat: 1.32, tailUp: true, collar: 0xe87aa8, walk: 0.32 },
  { id: 'tort', name: 'Mitty', sc: [0.82, 0.8, 0.82], fat: 1, collar: 0x2ad0c0, tag: true, walk: 0.38 },
  { id: 'white', name: 'Toby', sc: [0.9, 1.1, 1.08], fat: 1, collar: null, walk: 0.42 },
];
for (const d of CAT_DEFS) { d.L = 0.3 * d.sc[2]; d.LL = 0.2 * d.sc[1]; }
// ---- the rigged model (a wolf-style skeleton: spine, two-joint legs, neck, four tail joints). It faces +z and stands on
// y = 0; each cat wraps it in a group turned to face -z like everything else in the game.
const CAT_MODEL = { tpl: null, wait: [] };
function loadCatModel(cb) {
  if (CAT_MODEL.tpl) return cb(CAT_MODEL.tpl);
  CAT_MODEL.wait.push(cb); if (CAT_MODEL.wait.length > 1) return;
  loadModelFile('cat-model.json', gl => { CAT_MODEL.tpl = gl.scene; for (const f of CAT_MODEL.wait) f(gl.scene); CAT_MODEL.wait = []; }, e => console.warn('cat model', e));
}
const CAT_TEX = {};
function catCoat(id) { if (!CAT_TEX[id]) { const t = new THREE.TextureLoader().load('cat-' + id + '.jpg'); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 4; CAT_TEX[id] = t; } return CAT_TEX[id]; }
const CAT_BONES = { root: 'ROOTSHJnt', neck: 'Neck_01SHJnt', head: 'Neck_TopSHJnt', s1: 'Spine_01SHJnt', s2: 'Spine_02SHJnt', s4: 'Spine_04SHJnt',
  legs: [['l_FrontLeg_HipSHJnt', 'l_FrontLeg_KneeSHJnt', null, true, 1], ['r_FrontLeg_HipSHJnt', 'r_FrontLeg_KneeSHJnt', null, true, -1],
         ['l_HindLeg_HipSHJnt', 'l_HindLeg_Knee1SHJnt', 'l_HindLeg_Knee2SHJnt', false, 1], ['r_HindLeg_HipSHJnt', 'r_HindLeg_Knee1SHJnt', 'r_HindLeg_Knee2SHJnt', false, -1]],
  tail: ['Tail_01_02SHJnt', 'Tail_01_03SHJnt', 'Tail_01_04SHJnt', 'Tail_01_05SHJnt'] };
// a bone we pose: rotations are given about the model's own axes (x across the body, y up, z toward the head) relative to
// the bone's rest orientation, so a leg's x angle swings it fore and aft whatever way the rig's joint axes point
function poseBone(b) {
  const rw = b.getWorldQuaternion(new THREE.Quaternion());
  return { b, q0: b.quaternion.clone(), rw, rwi: rw.clone().invert(), p0: b.position.clone(), ax: 0, ay: 0, az: 0 };
}
const _pq = new THREE.Quaternion(), _pe = new THREE.Euler();
function applyPose(pb) { _pq.setFromEuler(_pe.set(pb.ax, pb.ay, pb.az, 'YXZ')); pb.b.quaternion.copy(pb.q0).multiply(pb.rwi.clone().multiply(_pq).multiply(pb.rw)); pb.ax = pb.ay = pb.az = 0; }
function buildCat(def) {
  const root = new THREE.Group(), body = new THREE.Group(); body.rotation.y = Math.PI; body.scale.set(...def.sc); root.add(body);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), PROP_HIT_MAT); hit.position.set(0, 0.2 * def.sc[1], -0.05); root.add(hit);
  const c = { def, root, body, hit, rig: null };
  loadCatModel(tpl => {
    const m = SkeletonUtils.clone(tpl); m.updateMatrixWorld(true);
    const find = n => { let r = null; m.traverse(o => { if (!r && o.isBone && o.name.includes(n)) r = o; }); return r; };
    const coat = new THREE.MeshStandardMaterial({ map: catCoat(def.id), roughness: 0.82, side: THREE.DoubleSide });
    const eyes = new THREE.MeshStandardMaterial({ map: catCoat(def.id), roughness: 0.15, side: THREE.DoubleSide });
    m.traverse(o => { if (o.isMesh) { o.material = o.name === 'Object_7' ? eyes : coat; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    const B = CAT_BONES, R = {
      root: poseBone(find(B.root)), neck: poseBone(find(B.neck)), head: poseBone(find(B.head)),
      legs: B.legs.map(([h, k1, k2, front, sx]) => ({ hip: poseBone(find(h)), k1: poseBone(find(k1)), k2: k2 ? poseBone(find(k2)) : null, front, sx })),
      tail: B.tail.map(n => poseBone(find(n))),
    };
    // a unit of world height in the root bone's parent space (the rig is built at another scale)
    R.up = new V3(0, 1, 0).applyQuaternion(R.root.b.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).divideScalar(R.root.b.parent.getWorldScale(new V3()).y);
    // a fat cat: the belly bones widen and deepen, the chest bone undoes it so shoulders and head stay cat-sized
    if (def.fat !== 1) { const k = Math.sqrt(def.fat), d = 1 + (k - 1) * 0.5; find(B.s1).scale.set(k, 1, d); find(B.s2).scale.set(k, 1, d); find(B.s4).scale.set(1 / (k * k), 1, 1 / (d * d)); }
    // collar round the neck (and Mitty's tag), parented to the neck bone but sized in the cat's own metres
    if (def.collar !== null) {
      const nb = R.neck.b, g = new THREE.Group(); nb.add(g); const ws = nb.getWorldScale(new V3()); g.scale.set(1 / ws.x, 1 / ws.y, 1 / ws.z);
      const col = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.005, 6, 22), new THREE.MeshStandardMaterial({ color: def.collar, roughness: 0.5 })); col.rotation.x = Math.PI / 2; col.position.y = 0.012; g.add(col);
      if (def.tag) {
        const tagTex = artTex(64, 64, (x, w, h) => { x.fillStyle = '#0c0c0c'; x.beginPath(); x.arc(32, 32, 31, 0, Math.PI * 2); x.fill(); x.fillStyle = '#d8c070'; x.font = 'bold 13px Georgia, serif'; x.textAlign = 'center'; x.fillText('claires', 32, 30); x.fillText('cat', 32, 45); });
        const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.003, 16), [new THREE.MeshStandardMaterial({ color: 0x0c0c0c }), new THREE.MeshStandardMaterial({ map: tagTex, roughness: 0.4, metalness: 0.3 }), new THREE.MeshStandardMaterial({ map: tagTex })]);
        tag.position.set(0, 0.0, 0.036); tag.rotation.set(Math.PI / 2 - 0.3, 0, 0); g.add(tag);   // hangs at the throat (+z is forward in the model)
      }
    }
    body.add(m); c.rig = R;
  });
  return c;
}
// ---------------------------------------------------------------- lifecycle
function removeCats() { for (const c of CATS) scene.remove(c.root); CATS.length = 0; for (let i = INTERACT.length - 1; i >= 0; i--) if (INTERACT[i].kind === 'cat') INTERACT.splice(i, 1); }
function resetCats() {
  removeCats();
  if (MAP.id !== 'farm') return;
  CAT_DEFS.forEach((def, i) => {
    const c = Object.assign(buildCat(def), { i, x: 0, z: 0, y: 0, yaw: rr(-3, 3), path: [], speed: 0, state: 'idle', t: rr(1, 4), pose: 0, sit: 0, lie: 0, ph: 0, fleeT: 0, meowT: def.id === 'blue' ? 30 : rr(20, 60), insideWas: {} });
    scene.add(c.root); CATS.push(c); INTERACT.push({ mesh: c.hit, kind: 'cat', id: i });
    if (def.id === 'blue') { const [x, z] = catPoint(c); c.x = x; c.z = z; c.y = FA0; }
    else if (def.id === 'tort') { const [x, z] = catPoint(c); c.x = x; c.z = z; c.y = FA1; }
    else { const d = catDoor(); c.x = d.x + rr(-2, 2); c.z = -5.5; c.y = terrainY(c.x, c.z); c.state = 'idle'; c.mode = 'yard'; }
  });
}
// ---------------------------------------------------------------- territory
function catRoomIds(c) { return c.def.id === 'blue' ? ROOMS.map((R, i) => i).filter(i => (ROOMS[i].lv || 0) === 0 && !ROOMS[i].closet && !ROOMS[i].outdoor) : ['kid', ...(c.def.id === 'tort' ? ['hall2'] : [])].map(id => ROOMS.findIndex(R => R.id === id)); }
function catPoint(c) {   // a random reachable spot inside the cat's territory
  const ids = catRoomIds(c);
  for (let k = 0; k < 40; k++) {
    const ri = ids[(Math.random() * ids.length) | 0], [x, z, l] = randomPointInRoom(ri);
    if (roomIdxAt(x, z, MAP.levels[l] + 0.1) === ri) return [x, z, l, ri];
  }
  const R = ROOMS[ids[0]]; return [R.lamp[0], R.lamp[1], R.lv || 0, ids[0]];
}
function catPathOK(c, path) {   // every step must stay in the cat's rooms (doorways in between are fine)
  const ids = new Set(catRoomIds(c));
  for (const [x, z, l] of path) {
    const y = MAP.levels[l ?? 0] + 0.1, ri = logicalRoom(x, z, y); if (ri >= 0 && !ids.has(ri)) return false;
    if (ri < 0 && ![[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]].some(([a, b]) => insideHouse(x + a, z + b, y))) return false;   // never out of the house
  }
  return true;
}
// hiding places (authored Drennen Estate coordinates; the map is mirrored when built)
const CAT_HIDE = {
  tort: { via: [[7.6, 1.35]], spot: [6.92, 1.35], lv: 1 },                              // under Claire's bed, face peeking out
  blue: { via: [[2.05, 4.75], [2.0, 5.3]], spot: [0.75, 5.31], lv: 0 },                  // in the gap behind the family-room couch
  white: { via: [[7.0, -3.75]], spot: [7.0, -2.42], lv: 0, porch: true },               // under the front porch, eyes at the edge
};
const catMx = x => MAP.mirror !== undefined ? MAP.mirror - x : x;
function catHide(c, why) {
  const H = CAT_HIDE[c.def.id], via = H.via.map(([x, z]) => [catMx(x), z, H.lv]), spot = [catMx(H.spot[0]), H.spot[1], H.lv];
  let route;
  if (H.porch) {   // Toby: out through the front door if he is inside, then along the front of the porch
    const inside = insideHouse(c.x, c.z, c.y + 0.2) || c.y > 1;
    if (inside) { const d = catDoor(); route = [...findPath(c.x, c.z, levelOf(c.y), d.x, 0.75, 0), ...catOutsideLeg(true).slice(1, 3)]; } else route = [];
  } else route = findPath(c.x, c.z, levelOf(c.y), via[0][0], via[0][1], H.lv);
  c.hide = { why, spot, y: H.porch ? terrainY(spot[0], spot[1]) : MAP.levels[H.lv], calm: 0 };
  catGo(c, [...route, ...via, spot], why === 'hunt' ? 2.3 : 1.8); if (c.def.id === 'white') c.mode = 'hide';
}
function catUnhide(c) {
  c.hide = null; c.state = 'idle'; c.t = rr(1, 3); c.pose = 0;
  if (c.def.id === 'white') { c.mode = 'yard'; const H = CAT_HIDE.white; catGo(c, [[catMx(H.via[0][0]), H.via[0][1], 0]], 0.6); }
  else { const H = CAT_HIDE[c.def.id], via = H.via.map(([x, z]) => [catMx(x), z, H.lv]).reverse(); catGo(c, via, c.def.walk); }
}
function catDoor() { const D = DOORS.find(D => D.def.front) || DOORS[0]; return doorCenter(D); }
// outside points for the white cat: porch, steps, yard (straight lines; the nav grid only covers the house)
function catOutsideLeg(toYard) { const d = catDoor(); const pts = [[d.x, 0.75, 0], [d.x, -1.3, 0], [d.x, -3.95, 0], [d.x + rr(-2.5, 2.5), rr(-6.5, -4.8), 0]]; return toYard ? pts : pts.reverse(); }
// ---------------------------------------------------------------- behaviour (host)
function catGo(c, path, speed) { c.path = path; c.speed = speed; c.state = 'walk'; c.pose = 0; }
function catWander(c) {
  for (let k = 0; k < 5; k++) {
    const [tx, tz, tl] = catPoint(c), path = findPath(c.x, c.z, levelOf(c.y), tx, tz, tl);
    if (path.length && catPathOK(c, path)) { catGo(c, path, c.def.walk * rr(0.85, 1.15)); return; }
  }
  c.state = 'idle'; c.t = rr(2, 5);
}
function hostCats(dt) {
  if (!CATS.length) return;
  const gs = G.gs;
  for (const c of CATS) {
    c.fleeT -= dt;
    const hunting = gs && (gs.mode === 2 || gs.mode === 3);
    if (hunting && (!c.hide || c.hide.why !== 'hunt')) { if (c.state !== 'hidden' || !c.hide) catHide(c, 'hunt'); else c.hide.why = 'hunt'; }
    if (c.def.id === 'tort') { if (hunting) c.wary = c.shy = false; else mittyThink(c, dt); }
    if (c.hide) {   // stay put until it is over
      const over = c.hide.why === 'hunt' ? !hunting : !c.shy;
      c.hide.calm = over ? c.hide.calm + dt : 0;
      if (c.state === 'walk' && !c.path.length) { c.state = 'hidden'; c.speed = 0; c.pose = 2; }
      if (c.state === 'hidden') { c.x = c.hide.spot[0]; c.z = c.hide.spot[1]; c.y = c.hide.y; const H = CAT_HIDE[c.def.id], out = [catMx(H.via[H.via.length - 1][0]), H.via[H.via.length - 1][1]]; c.yaw += angDiff(c.yaw, Math.atan2(-(out[0] - c.x), -(out[1] - c.z))) * clamp(dt * 4, 0, 1); }
      if (c.hide.calm > (c.hide.why === 'hunt' ? 3 : 2)) catUnhide(c);
    }
    // a manifesting ghost nearby: hiss and bolt
    if (!c.hide && gs && gs.vis && gs.mode === 1 && c.fleeT <= 0 && Math.abs(gs.y - c.y) < 1.5 && Math.hypot(gs.x - c.x, gs.z - c.z) < 5 && c.mode !== 'yard') {
      c.fleeT = 10; hostEvent(['snd', 'hiss', r2(c.x), r2(c.y + 0.3), r2(c.z), 0.9]);
      let best = null, bd = -1; for (let k = 0; k < 6; k++) { const p = catPoint(c), d = Math.hypot(p[0] - gs.x, p[1] - gs.z); if (d > bd) { bd = d; best = p; } }
      if (best) { const path = findPath(c.x, c.z, levelOf(c.y), best[0], best[1], best[2]); if (path.length && catPathOK(c, path)) catGo(c, path, 2.0); }
    }
    if (c.def.id === 'white' && !c.hide) whiteCatThink(c, dt);
    if (c.state === 'idle' && !c.hide) { c.t -= dt; if (c.t <= 0 && c.mode !== 'yard' && c.mode !== 'follow') catWander(c); }
    // walk the path
    if (c.state === 'walk') {
      if (!c.path.length && c.hide) { /* arrived at the hiding place: handled above next tick */ }
      else if (!c.path.length) { c.state = 'idle'; c.speed = 0; c.t = rr(4, 14); const r = Math.random(); c.pose = r < 0.4 ? 2 : r < 0.75 ? 1 : 0; if (c.mode === 'enter') c.mode = 'claire'; if (c.mode === 'exit') { c.mode = 'yard'; c.t = rr(2, 6); } }
      else {
        const [tx, tz] = c.path[0], dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz), st = c.speed * dt;
        const st2 = st * (c.wary ? 0.45 : 1);
        if (d <= st2) { c.x = tx; c.z = tz; c.path.shift(); } else { c.x += dx / d * st2; c.z += dz / d * st2; c.yaw += angDiff(c.yaw, Math.atan2(-dx, -dz)) * clamp(dt * 8, 0, 1); }
      }
    }
    if (c.hide && Math.hypot(c.x - c.hide.spot[0], c.z - c.hide.spot[1]) < 1.25) c.y = lerp(c.y, c.hide.y, clamp(dt * 10, 0, 1)); else if (c.state !== 'hidden') c.y = groundY(c.x, c.z, c.y + 0.45);
    c.meowT -= dt;
    if (c.meowT <= 0) {
      if (c.def.id === 'blue') { c.meowT = 30; hostEvent(['snd', 'meowLoud', r2(c.x), r2(c.y + 0.3), r2(c.z), 1.6]); }   // Izzabelle: a loud meow every 30 seconds, hiding or not
      else { c.meowT = rr(25, 70); if (!c.hide) hostEvent(['snd', 'meow', r2(c.x), r2(c.y + 0.3), r2(c.z), 0.5]); }
    }
  }
}
function whiteCatThink(c, dt) {
  const ps = alivePlayers();
  // remember who was inside, so "the next time you exit" can be spotted
  let someoneLeft = false;
  for (const P of ps) { const was = c.insideWas[P.slot]; if (was && !P.inside) someoneLeft = true; c.insideWas[P.slot] = P.inside; }
  if (c.mode === 'yard') {
    if (c.state === 'idle') {
      c.t -= dt;
      const near = ps.filter(P => !P.inside && Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < 6).sort((a, b) => Math.hypot(a.pos.x - c.x, a.pos.z - c.z) - Math.hypot(b.pos.x - c.x, b.pos.z - c.z))[0];
      if (near) { c.mode = 'follow'; c.follow = near.slot; c.pose = 0; return; }
      if (c.t <= 0) { const d = catDoor(); catGo(c, [[d.x + rr(-3.5, 3.5), rr(-7.5, -4.6), 0]], c.def.walk); }
    }
  } else if (c.mode === 'follow') {
    const P = G.players[c.follow];
    if (!P || !P.alive || Math.hypot(P.pos.x - c.x, P.pos.z - c.z) > 12) { c.mode = 'yard'; c.state = 'idle'; c.t = 3; return; }
    if (P.inside) {   // in he goes, straight up to Claire's room
      const [tx, tz, tl] = catPoint(c), d = catDoor(), inner = findPath(d.x, 0.75, 0, tx, tz, tl);
      c.mode = 'enter'; catGo(c, [...catOutsideLeg(false).slice(1), ...inner], 2.1); return;
    }
    const dx = P.pos.x - c.x, dz = P.pos.z - c.z, d = Math.hypot(dx, dz);
    if (d > 1.1) { c.path = [[P.pos.x - dx / d * 0.9, P.pos.z - dz / d * 0.9, 0]]; c.state = 'walk'; c.speed = d > 3 ? 1.6 : 0.8; } else if (c.state === 'walk') { c.path = []; }
  } else if (c.mode === 'claire' && someoneLeft) {   // somebody went out: he runs back outside
    const d = catDoor(), inner = findPath(c.x, c.z, levelOf(c.y), d.x, 0.75, 0);
    c.mode = 'exit'; catGo(c, [...inner, ...catOutsideLeg(true).slice(1)], 2.1);
  }
}
// Mitty trusts only Claire: any player who goes by that name. Strangers in her room without Claire: she hides under the bed.
function isClaire(P) { return !!P && (P.nick || '').trim().toLowerCase() === 'claire'; }
// With Claire there she is wary: low, slow, and keeps her distance from everyone else.
function mittyThink(c, dt) {
  const ri = logicalRoom(c.hide ? c.hide.spot[0] : c.x, c.hide ? c.hide.spot[1] : c.z, MAP.levels[1] + 0.1);
  const here = alivePlayers().filter(P => logicalRoom(P.pos.x, P.pos.z, P.pos.y) === ri), claire = here.find(isClaire), strangers = here.filter(P => !isClaire(P));
  c.shy = strangers.length > 0 && !claire;
  c.wary = !!claire && strangers.length > 0;   // hesitant when Claire has company
  if (c.shy && !c.hide) { hostEvent(['snd', 'hiss', r2(c.x), r2(c.y + 0.2), r2(c.z), 0.35]); catHide(c, 'shy'); return; }
  if (c.hide) return;
  // whenever Claire is upstairs, Mitty follows her (to the doorway, if Claire steps outside Mitty's two rooms)
  const C0 = alivePlayers().find(P => isClaire(P) && levelOf(P.pos.y) === 1 && insideHouse(P.pos.x, P.pos.z, P.pos.y));
  c.following = !!C0;
  if (c.following && !strangers.some(P => Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < 1.2)) { mittyFollow(c, C0, dt); return; }
  if (!c.wary) return;
  c.waryT = (c.waryT || 0) - dt;
  const near = strangers.find(P => Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < 1.8);
  if (near && c.waryT <= 0) {   // back away from the stranger
    c.waryT = 2; let best = null, bd = -1; for (let k = 0; k < 6; k++) { const p = catPoint(c), d = Math.hypot(p[0] - near.pos.x, p[1] - near.pos.z); if (d > bd) { bd = d; best = p; } }
    if (best) { const path = findPath(c.x, c.z, 1, best[0], best[1], best[2]); if (path.length && catPathOK(c, path)) catGo(c, path, c.def.walk * 1.6); }
  } else if (!strangers.length && c.state === 'idle' && c.waryT <= 0 && Math.random() < dt * 0.15) {   // creep over to Claire
    c.waryT = 6; const dx = claire.pos.x - c.x, dz = claire.pos.z - c.z, d = Math.hypot(dx, dz);
    if (d > 1.3) catGo(c, [[claire.pos.x - dx / d * 1.0, claire.pos.z - dz / d * 1.0, 1]], c.def.walk);
  }
}
function mittyFollow(c, C0, dt) {
  c.t = 5;   // no wandering off while she has Claire to follow
  c.followT = (c.followT || 0) - dt;
  const ids = catRoomIds(c), cr = logicalRoom(C0.pos.x, C0.pos.z, C0.pos.y), atDoor = !ids.includes(cr);
  let tx = C0.pos.x, tz = C0.pos.z;
  if (atDoor) {   // wait on the landing just outside the doorway Claire went through
    if (c.doorFor !== cr) {
      c.doorFor = cr; c.doorPt = null;
      const R = ROOMS[ids.find(i => ROOMS[i].id === 'hall2')], hc = [(R.r[0] + R.r[2]) / 2, (R.r[1] + R.r[3]) / 2];
      const ds = DOORS.filter(D => !D.closet && (D.def.lv || 0) === 1).map(D => doorCenter(D)).sort((a, b) => Math.hypot(a.x - C0.pos.x, a.z - C0.pos.z) - Math.hypot(b.x - C0.pos.x, b.z - C0.pos.z));
      for (const dc of ds.slice(0, 2)) { const vx = hc[0] - dc.x, vz = hc[1] - dc.z, vl = Math.hypot(vx, vz) || 1;
        for (const k of [0.45, 0.7, 1.0, 1.4, 1.9]) { const px = dc.x + vx / vl * k, pz = dc.z + vz / vl * k; if (logicalRoom(px, pz, MAP.levels[1] + 0.1) === ids.find(i => ROOMS[i].id === 'hall2') && findPath(c.x, c.z, 1, px, pz, 1).length) { c.doorPt = [px, pz]; break; } }
        if (c.doorPt) break; }
    }
    if (!c.doorPt) return;
    [tx, tz] = c.doorPt;
  } else c.doorFor = null;
  const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz), keep = atDoor ? 0.15 : 0.85;
  if (d > keep + 0.35) {
    if (c.followT <= 0 || c.state !== 'walk') {
      c.followT = 0.5; const gx = atDoor ? tx : tx - dx / d * keep, gz = atDoor ? tz : tz - dz / d * keep;
      let path = findPath(c.x, c.z, 1, gx, gz, 1);
      if (!path.length && d < 2) path = [[gx, gz, 1]];
      if (path.length && catPathOK(c, path)) catGo(c, path, d > 2.5 ? 1.3 : c.def.walk * 1.15);
    }
  } else if (c.state === 'idle') { c.pose = 1; c.yaw += angDiff(c.yaw, Math.atan2(-(C0.pos.x - c.x), -(C0.pos.z - c.z))) * clamp(dt * 4, 0, 1); }   // sit and watch her
  else if (c.state === 'walk' && d <= keep) c.path = [];
}
function hostPet(i, slot) {
  const c = CATS[i]; if (!c || c.hide) return; if (c.mode === 'enter' || c.mode === 'exit') return;
  if (c.def.id === 'tort' && !isClaire(G.players[slot])) {   // Mitty won't be touched by anyone but Claire
    hostEvent(['snd', 'hiss', r2(c.x), r2(c.y + 0.2), r2(c.z), 0.45]); hostEvent(['msg', slot, 'Mitty flinches away from you. She only trusts Claire.']);
    if (!alivePlayers().some(P => isClaire(P) && logicalRoom(P.pos.x, P.pos.z, P.pos.y) === logicalRoom(c.x, c.z, c.y + 0.1))) catHide(c, 'shy');
    else { c.waryT = 0; const p = catPoint(c), path = findPath(c.x, c.z, 1, p[0], p[1], p[2]); if (path.length && catPathOK(c, path)) catGo(c, path, c.def.walk * 1.6); }
    return;
  } c.path = []; c.state = 'idle'; c.speed = 0; c.pose = 1; c.t = 5; hostEvent(['snd', 'purr', r2(c.x), r2(c.y + 0.25), r2(c.z), 0.8]); }
// ---------------------------------------------------------------- everyone: follow the host's cats and animate
function updateCats(T, dt) {
  if (!CATS.length) return;
  if (G.isHost && G.state === 'play') hostCats(dt);
  for (const c of CATS) {
    if (!G.isHost && c.net) { const q = c.net, jump = Math.hypot(q[0] - c.x, q[2] - c.z) > 3; c.x = jump ? q[0] : lerp(c.x, q[0], clamp(dt * 10, 0, 1)); c.y = jump ? q[1] : lerp(c.y, q[1], clamp(dt * 10, 0, 1)); c.z = jump ? q[2] : lerp(c.z, q[2], clamp(dt * 10, 0, 1)); c.yaw += angDiff(c.yaw, q[3]) * clamp(dt * 10, 0, 1); c.pose = q[4]; c.speed = q[5]; c.wary = !!q[6]; }
    animateCat(c, T, dt);
  }
}
function animateCat(c, T, dt) {
  const { def, root } = c, mv = c.state === 'walk' || (!G.isHost && c.speed > 0.05) ? c.speed : 0;
  root.position.set(c.x, c.y, c.z); root.rotation.y = c.yaw;
  const k = clamp(dt * 4, 0, 1);
  c.sit = lerp(c.sit, mv ? 0 : c.pose === 1 ? 1 : 0, k); c.lie = lerp(c.lie, mv ? 0 : c.pose === 2 ? 1 : 0, k);
  const run = clamp((mv - 0.9) / 0.9, 0, 1), w = clamp(mv / 0.25, 0, 1);
  c.ph += dt * mv / (def.L * (0.75 + run * 0.6)) * Math.PI;
  c.low = lerp(c.low || 0, c.wary ? 1 : 0, k);
  const sit = c.sit, lie = c.lie;
  // flattened in a hiding place (Mitty has to fit under Claire's bed frame)
  const H = CAT_HIDE[def.id], hid = lie > 0.5 && Math.hypot(c.x - catMx(H.spot[0]), c.z - H.spot[1]) < 0.5 ? 1 : 0;
  c.sq = lerp(c.sq || 0, hid, k); c.body.scale.set(def.sc[0] * (1 + 0.15 * c.sq), def.sc[1] * (1 - 0.4 * c.sq), def.sc[2]);
  const R = c.rig; if (!R) return;
  const ph = c.ph, low = c.low * (1 - lie);
  // model axes: +z toward the head, so a negative x angle swings a paw forward and tips the head down... front up is -x on the root
  const pitch = 0.68 * sit;
  R.root.ax = -pitch; R.root.b.position.copy(R.root.p0).addScaledVector(R.up, Math.abs(Math.sin(ph)) * 0.006 * w - 0.15 * sit - 0.1 * lie - 0.045 * low);
  for (const L of R.legs) {
    const off = (L.front ? 0 : Math.PI) + (L.sx > 0 ? Math.PI : 0) + (run > 0.5 ? (L.sx > 0 ? 0.6 : 0) : 0), cyc = ph + off;
    const swing = Math.sin(cyc) * (0.42 + run * 0.35) * w, lift = Math.max(0, Math.cos(cyc)) * w;   // lift: the paw coming forward
    if (L.front) {
      L.hip.ax = -swing + pitch + 0.1 * lie + 0.25 * low;
      L.k1.ax = 0.75 * lift - 1.45 * lie + 0.2 * low;   // lying: forearms laid forward along the floor, sphinx-style
    } else {
      L.hip.ax = -swing - 0.6 * sit + 0.4 * lie - 0.35 * low;
      L.k1.ax = -0.4 * lift - 1.4 * sit - 0.5 * lie - 0.5 * low;   // negative folds the shin up under the thigh
      L.k2.ax = 0.45 * lift + 1.2 * sit + 0.3 * lie + 0.35 * low;
      applyPose(L.k2);
    }
    applyPose(L.hip); applyPose(L.k1);
  }
  R.neck.ax = pitch * 0.5 - lie * 0.05; R.head.ax = pitch * 0.5 + Math.sin(ph * 2) * 0.04 * w;
  R.head.ay = (1 - w) * Math.sin(T * 0.31 + c.i * 2) * 0.45;
  // tail: the Russian Blue's stands straight up with a hook at the tip; the others carry theirs low and swinging
  R.tail.forEach((t, i) => {
    const n = R.tail.length, sway = Math.sin(T * (def.tailUp ? 1.2 : 1.8) + i * 0.6 + c.i) * (def.tailUp ? 0.05 : 0.16) * (0.4 + i / n);
    if (def.tailUp) t.ax = i === 0 ? 2.0 - lie * 1.2 : i === n - 1 ? -0.7 : -0.05;
    else t.ax = i === 0 ? -0.25 * w + 0.35 * sit + 0.25 * lie : -0.06;
    t.ay = sway;
  });
  applyPose(R.root); applyPose(R.neck); applyPose(R.head); R.tail.forEach(applyPose);
}
