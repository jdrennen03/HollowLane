// ---------------------------------------------------------------- Drennen Estate cats
// Three house cats, built from simple shapes and animated procedurally. The host runs their behaviour and shares
// positions with the team; everyone animates them locally.
//   Izzabelle (blue) - a fat Russian Blue with a pink collar and an always-upright tail; roams the whole downstairs, never outside
//   Mitty (tort)     - Claire's small, low tortoiseshell with a turquoise collar and a black "claires cat" tag; Claire's room and the
//                      landing only. She trusts only Claire (the host): strangers without Claire send her under the bed.
//   Toby (white)     - tall and slender, white with one black ear, a black spot on a hind leg and a black tail; lives outside, follows
//                      you in, runs up to Claire's room, and runs back out the next time someone leaves the house
// During a hunt each one runs to its hiding place until it is over: Mitty under Claire's bed, Izzabelle behind the couch, Toby under the porch.
const CATS = [];
const CAT_DEFS = [
  { id: 'blue', name: 'Izzabelle', L: 0.44, W: 0.135, H: 0.12, LL: 0.12, hr: 0.078, tl: 0.28, tailUp: true, eye: 0xe8c818, collar: 0xe87aa8, walk: 0.32 },
  { id: 'tort', name: 'Mitty', L: 0.33, W: 0.085, H: 0.075, LL: 0.075, hr: 0.064, tl: 0.26, eye: 0xc8a020, collar: 0x2ad0c0, tag: true, walk: 0.38 },
  { id: 'white', name: 'Toby', L: 0.46, W: 0.078, H: 0.085, LL: 0.21, hr: 0.062, tl: 0.36, eye: 0x7ac87a, collar: null, walk: 0.42 },
];
function catTex(kind) {
  return artTex(256, 128, (x, w, h) => {
    if (kind === 'tort') {
      x.fillStyle = '#2a1c14'; x.fillRect(0, 0, w, h);
      const blot = (c, n, s) => { x.fillStyle = c; for (let i = 0; i < n; i++) { const cx = Math.random() * w, cy = Math.random() * h; x.beginPath(); for (let a = 0; a < 7; a++) { const r = s * (0.5 + Math.random() * 0.8), ang = a / 7 * Math.PI * 2; x.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.7); } x.fill(); } };
      blot('#b8621e', 26, 16); blot('#8a4a1a', 18, 10); blot('#d89a58', 12, 7); blot('#120c0a', 16, 12); blot('#c87a30', 14, 6);
    } else {
      const base = kind === 'blue' ? [92, 102, 118] : [236, 232, 224];
      for (let y = 0; y < h; y++) for (let i = 0; i < w; i += 2) { const n = (Math.random() - 0.5) * 22; x.fillStyle = `rgb(${base[0] + n | 0},${base[1] + n | 0},${base[2] + n | 0})`; x.fillRect(i, y, 2, 1); }
    }
  });
}
function buildCat(def) {
  const { L, W, H, LL, hr, tl } = def;
  const mat = new THREE.MeshStandardMaterial({ map: catTex(def.id), roughness: 0.95 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1e1e20, roughness: 0.55 });   // a little sheen so black fur still catches a flashlight
  const pink = new THREE.MeshStandardMaterial({ color: 0xd88a96, roughness: 0.7 });
  const M = (geo, m, parent, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  const root = new THREE.Group(), torso = new THREE.Group(); root.add(torso);
  // body: an egg from shoulders to hips; the torso pivots at the hips so sitting tips the front up
  const zc = -L * 0.32;
  M(new THREE.SphereGeometry(1, 18, 12), mat, torso, 0, 0, zc).scale.set(W, H, L * 0.5);
  M(new THREE.SphereGeometry(1, 14, 10), mat, torso, 0, -H * 0.15, zc + L * 0.24).scale.set(W * 1.05, H * 0.95, L * 0.26);   // haunches
  M(new THREE.SphereGeometry(1, 14, 10), mat, torso, 0, H * 0.05, zc - L * 0.28).scale.set(W * 0.95, H * 0.95, L * 0.24);   // chest
  // legs (pivot at the top so they can swing and fold)
  const legs = [];
  for (const [sx, front] of [[-1, true], [1, true], [-1, false], [1, false]]) {
    const g = new THREE.Group(); g.position.set(sx * W * 0.55, -H * 0.35, front ? zc - L * 0.3 : zc + L * 0.3); torso.add(g);
    const len = LL + H * 0.35, lm = def.id === 'white' && !front && sx > 0 ? 'spot' : mat;
    M(new THREE.CylinderGeometry(W * 0.2, W * 0.16, len, 8), lm === 'spot' ? mat : mat, g, 0, -len / 2, 0);
    if (!front) M(new THREE.SphereGeometry(W * 0.36, 10, 8), mat, g, 0, -len * 0.15, 0.01).scale.set(1, 1.3, 1.1);
    M(new THREE.SphereGeometry(W * 0.22, 8, 6), mat, g, 0, -len, -W * 0.06).scale.set(1, 0.6, 1.3);
    if (lm === 'spot') M(new THREE.SphereGeometry(W * 0.3, 10, 8), black, g, W * 0.12, -len * 0.25, 0.0).scale.set(0.8, 1.1, 1.15);   // the black spot on his hind leg
    g.userData = { front, sx, len }; legs.push(g);
  }
  // head
  const head = new THREE.Group(); head.position.set(0, H * 0.75, zc - L * 0.5 - hr * 0.25); torso.add(head);
  M(new THREE.SphereGeometry(hr, 16, 12), mat, head).scale.set(1.08, 0.95, 1);
  M(new THREE.SphereGeometry(hr * 0.45, 10, 8), mat, head, 0, -hr * 0.32, -hr * 0.78).scale.set(1.2, 0.8, 0.9);
  M(new THREE.SphereGeometry(hr * 0.1, 6, 5), pink, head, 0, -hr * 0.18, -hr * 1.14);
  for (const sx of [-1, 1]) {
    const earM = def.id === 'white' && sx < 0 ? black : mat;   // one black ear
    const ear = M(new THREE.ConeGeometry(hr * 0.36, hr * 0.62, 4), earM, head, sx * hr * 0.55, hr * 0.78, -hr * 0.05); ear.rotation.set(-0.15, Math.PI / 4, sx * -0.38);
    const eye = M(new THREE.SphereGeometry(hr * 0.17, 10, 8), new THREE.MeshStandardMaterial({ color: def.eye, emissive: def.eye, emissiveIntensity: 0.35, roughness: 0.15 }), head, sx * hr * 0.36, hr * 0.12, -hr * 0.84); eye.scale.set(1, 0.85, 0.6);
    M(new THREE.SphereGeometry(hr * 0.06, 6, 6), black, head, sx * hr * 0.37, hr * 0.12, -hr * 0.95).scale.set(0.6, 1.6, 0.5);   // slit pupil
    for (const k of [-1, 1]) { const wh = M(new THREE.CylinderGeometry(0.0012, 0.0012, hr * 1.4, 3), new THREE.MeshBasicMaterial({ color: 0xe8e4dc }), head, sx * hr * 0.6, -hr * 0.3 + k * 0.006, -hr * 0.8); wh.rotation.set(0, 0, sx * (1.5 + k * 0.12)); wh.castShadow = false; }
  }
  // collar and tag
  if (def.collar !== null) {
    const col = M(new THREE.TorusGeometry(hr * 0.72, 0.008, 6, 20), new THREE.MeshStandardMaterial({ color: def.collar, roughness: 0.5 }), torso, 0, H * 0.55, zc - L * 0.46); col.rotation.x = Math.PI / 2 - 0.55;
    if (def.tag) {
      const tagTex = artTex(64, 64, (x, w, h) => { x.fillStyle = '#0c0c0c'; x.beginPath(); x.arc(32, 32, 31, 0, Math.PI * 2); x.fill(); x.fillStyle = '#d8c070'; x.font = 'bold 13px Georgia, serif'; x.textAlign = 'center'; x.fillText('claires', 32, 30); x.fillText('cat', 32, 45); });
      const tag = M(new THREE.CylinderGeometry(0.016, 0.016, 0.003, 16), [new THREE.MeshStandardMaterial({ color: 0x0c0c0c }), new THREE.MeshStandardMaterial({ map: tagTex, roughness: 0.4, metalness: 0.3 }), new THREE.MeshStandardMaterial({ map: tagTex })], torso, 0, H * 0.55 - hr * 0.62, zc - L * 0.46 - hr * 0.42);
      tag.rotation.x = Math.PI / 2 - 0.2; tag.rotation.z = Math.PI;
    }
  }
  // tail: a chain of short segments
  const tail = []; let parent = torso; const n = 7, sl = tl / n;
  const tailM = def.id === 'white' ? black : mat;   // his black tail
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group(); if (i === 0) g.position.set(0, H * 0.35, zc + L * 0.47); else g.position.y = sl; parent.add(g);
    const r0 = W * (def.tailUp ? 0.2 : 0.16) * (1 - i / n * 0.45), r1 = W * (def.tailUp ? 0.2 : 0.16) * (1 - (i + 1) / n * 0.45);
    M(new THREE.CylinderGeometry(r1, r0, sl * 1.15, 7), tailM, g, 0, sl / 2, 0); tail.push(g); parent = g;
  }
  M(new THREE.SphereGeometry(W * 0.1, 6, 5), tailM, parent, 0, sl, 0);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.18, L * 0.55), 8, 6), PROP_HIT_MAT); hit.position.set(0, LL + H, -L * 0.1); root.add(hit);
  return { def, root, torso, legs, head, tail, hit, baseY: LL + H * 0.55 };
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
// Mitty trusts only Claire (the host, slot 0). Strangers in her room without Claire: she hides under the bed.
// With Claire there she is wary: low, slow, and keeps her distance from everyone else.
function mittyThink(c, dt) {
  const ri = logicalRoom(c.hide ? c.hide.spot[0] : c.x, c.hide ? c.hide.spot[1] : c.z, MAP.levels[1] + 0.1);
  const here = alivePlayers().filter(P => logicalRoom(P.pos.x, P.pos.z, P.pos.y) === ri), claire = here.find(P => P.slot === 0), strangers = here.filter(P => P.slot !== 0);
  c.shy = strangers.length > 0 && !claire;
  c.wary = !!claire && strangers.length > 0;   // hesitant when Claire has company
  if (c.shy && !c.hide) { hostEvent(['snd', 'hiss', r2(c.x), r2(c.y + 0.2), r2(c.z), 0.35]); catHide(c, 'shy'); return; }
  if (c.hide) return;
  // whenever Claire is upstairs, Mitty follows her (to the doorway, if Claire steps outside Mitty's two rooms)
  const C0 = G.players[0];
  c.following = !!(C0 && C0.alive && levelOf(C0.pos.y) === 1 && insideHouse(C0.pos.x, C0.pos.z, C0.pos.y));
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
  if (c.def.id === 'tort' && slot !== 0) {   // Mitty won't be touched by anyone but Claire
    hostEvent(['snd', 'hiss', r2(c.x), r2(c.y + 0.2), r2(c.z), 0.45]); hostEvent(['msg', slot, 'Mitty flinches away from you. She only trusts Claire.']);
    if (!alivePlayers().some(P => P.slot === 0 && logicalRoom(P.pos.x, P.pos.z, P.pos.y) === logicalRoom(c.x, c.z, c.y + 0.1))) catHide(c, 'shy');
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
  const { def, root, torso, legs, head, tail } = c, mv = c.state === 'walk' || (!G.isHost && c.speed > 0.05) ? c.speed : 0;
  root.position.set(c.x, c.y, c.z); root.rotation.y = c.yaw;
  const k = clamp(dt * 4, 0, 1);
  c.sit = lerp(c.sit, mv ? 0 : c.pose === 1 ? 1 : 0, k); c.lie = lerp(c.lie, mv ? 0 : c.pose === 2 ? 1 : 0, k);
  const run = clamp((mv - 0.9) / 0.9, 0, 1), w = clamp(mv / 0.25, 0, 1);
  c.ph += dt * mv / (def.L * (0.75 + run * 0.6)) * Math.PI;
  const ph = c.ph, sit = c.sit, lie = c.lie;
  c.low = lerp(c.low || 0, c.wary ? 1 : 0, k);
  torso.position.set(0, c.baseY + Math.abs(Math.sin(ph)) * 0.008 * w - sit * def.LL * 0.55 - lie * def.LL * 0.95 - c.low * def.LL * 0.4 * (1 - lie), 0);
  torso.rotation.x = sit * 0.7;
  for (const g of legs) {
    const u = g.userData, off = (u.front ? 0 : Math.PI) + (u.sx > 0 ? Math.PI : 0) + (run > 0.5 ? (u.sx > 0 ? 0.6 : 0) : 0);
    const swing = Math.sin(ph + off) * (0.5 + run * 0.4) * w;
    g.rotation.x = swing * (1 - c.low * 0.4) + (u.front ? -0.7 * sit + 1.45 * lie - c.low * 0.35 : 1.1 * sit + 1.5 * lie + c.low * 0.5);
  }
  head.rotation.x = -0.7 * sit + Math.sin(ph * 2) * 0.04 * w - lie * 0.1;
  head.rotation.y = (1 - w) * Math.sin(T * 0.31 + c.i * 2) * 0.45;
  // tail: the Russian Blue's stands straight up with a little hook; the others swing low and curve
  tail.forEach((g, i) => {
    const sway = Math.sin(T * (def.tailUp ? 1.2 : 1.8) + i * 0.6 + c.i) * (def.tailUp ? 0.04 : 0.12) * (0.4 + i / tail.length);
    if (def.tailUp) g.rotation.set(i === 0 ? -0.15 - sit * 0.7 : i >= tail.length - 2 ? -0.38 : -0.02, 0, sway);
    else g.rotation.set(i === 0 ? 1.35 + sit * 0.5 + lie * 0.5 : -0.13 + lie * 0.08, 0, sway);   // carried out behind in a soft upward curve
  });
}
