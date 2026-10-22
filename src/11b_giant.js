// ---------------------------------------------------------------- Drennen Estate easter egg: play the tape, and a giant comes to look in the windows
// Cosmetic and local to each player (started for everyone by a host event); it never touches gameplay.
const GIANT = { gh: null, on: false, state: 'idle', path: [], wins: [], cur: null, b: 0, t: 0, yaw: 0, pos: new V3(), rnd: Math.random, stepPh: 0, minJ0: 0, c: [0, 0] };
const GIANT_H = 19.5;   // about twice the height of the house (ridge ~9.75 m)
function stopGiant() {
  if (GIANT.gh) { scene.remove(GIANT.gh.root); GIANT.gh = null; }
  GIANT.on = false; GIANT.state = 'idle';
}
function startGiant(seed) {
  if (MAP.id !== 'farm' || GIANT.on) return;
  G.eggOn = true; GIANT.on = true; GIANT.rnd = mulberry32(seed);
  setTimeout(() => { if (GIANT.on) { sub('Something enormous is walking toward the house.', 'sys'); sfx('huntStart', 0.7, 0.45); } }, 2500);
  const onGl = gl => {
    if (!GIANT.on || GIANT.gh) return;
    const gh = GIANT.gh = prepGhostModel(gl, { height: GIANT_H, name: 'giant' }, scene);
    for (const m of gh.meshes) { m.material.emissive.setHex(0x23252c); }   // a faint moonlit sheen so it reads at night (a flat colour: no extra texture unit)
    gh.root.visible = true;
    setupGiant();
  };
  // a model loaded on the developer screen: flattened to plain meshes, then auto-rigged with the same skeleton and driven by
  // the same walk, bend and peek as the built-in giant
  if (CUSTOM_GIANT.buf) new GLTFLoader().parse(CUSTOM_GIANT.buf.slice(0), '', gl => onGl({ scene: flattenForRig(gl.scene, CUSTOM_GIANT.turn), animations: [] }), e => { console.warn('custom giant failed', e); loadModelFile('ghost-zombie.json', onGl, () => { }); });
  else loadModelFile('ghost-zombie.json', onGl, e => console.warn('giant failed to load', e));
}
const CUSTOM_GIANT = { buf: null, name: '', turn: 0 };
// every mesh of a model as a plain mesh (skins, bones and clips dropped), turned about y if asked, so the auto-rig can fit its
// own skeleton. A skinned model can be taken in its bind pose (usually a T-pose) or in the pose it loads in; the auto-rig
// wants the arms out to the sides, so the bind pose is used when it stands upright and is about as wide or wider.
function flattenForRig(model, turn = 0) {
  model.updateMatrixWorld(true);
  const build = posed => { const g = new THREE.Group(), v = new V3();
    model.traverse(o => {
      if (!o.isMesh) return;
      const geo = o.geometry.clone(); geo.morphAttributes = {};
      if (o.isSkinnedMesh && posed) {   // as drawn: every vertex through its bones
        o.skeleton.update(); const P = geo.attributes.position, out = new Float32Array(P.count * 3);
        for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); (o.applyBoneTransform || o.boneTransform).call(o, i, v); v.applyMatrix4(o.matrixWorld); out.set([v.x, v.y, v.z], i * 3); }
        geo.setAttribute('position', new THREE.BufferAttribute(out, 3)); geo.computeVertexNormals();
      } else geo.applyMatrix4(o.matrixWorld);   // a static mesh, or a skinned one in its bind pose
      geo.deleteAttribute('skinIndex'); geo.deleteAttribute('skinWeight'); if (turn) geo.rotateY(turn);
      g.add(new THREE.Mesh(geo, o.material));
    });
    const b = new THREE.Box3().setFromObject(g), s = b.getSize(v); g.userData.h = s.y; g.userData.spread = Math.max(s.x, s.z) / Math.max(s.y, 1e-6); return g; };
  let skinned = false; model.traverse(o => { if (o.isSkinnedMesh) skinned = true; });
  const bind = build(false); if (!skinned) return bind;
  // the bind pose only counts if it stands upright like the loaded model (some files keep it in another up-axis)
  const posed = build(true), upright = bind.userData.spread < 1.6;   // a figure lying down is far wider than it is tall
  return upright && bind.userData.spread >= posed.userData.spread * 0.95 ? bind : posed;   // near a tie, the bind pose (the rig's own rest shape)
}
// joints the pose is measured with (positions in the giant's own frame)
function giantJoints(gh) { return gh.gait.filter(b => b.kind === 'calf' || b.kind === 'foot'); }
const _gj = new V3();
function giantPose(gh, b, t) {   // crouch, kneel and fold forward; the head tips back to keep looking ahead
  if (b <= 0.001) return;
  gh.root.updateMatrixWorld(true); gh.root.getWorldQuaternion(_gq); _gax.set(1, 0, 0).applyQuaternion(_gq);
  const sway = Math.sin(t * 0.7) * 0.05 * b;
  for (const g of gh.gait) {
    let lat = 0;
    switch (g.kind) {
      case 'thigh': lat = 1.35 * b; break;
      case 'calf': lat = -2.3 * b; break;
      case 'foot': lat = 0.7 * b; break;
      case 'spine': lat = -0.8 * b; break;
      case 'chest': lat = -0.75 * b; break;
      case 'head': lat = 1.15 * b + sway; break;
      case 'arm': lat = 1.0 * b; break;
      case 'fore': lat = 0.5 * b; break;
    }
    if (!lat) continue;
    g.bone.parent.getWorldQuaternion(_gq2).invert(); _gl.copy(_gax).applyQuaternion(_gq2); g.bone.quaternion.premultiply(_gr.setFromAxisAngle(_gl, lat));
  }
}
// measure the bent pose in the giant's own frame: head position, and how far the lowest joint rose
function giantMeasure(gh, b) {
  for (const g of gh.gait) g.bone.quaternion.copy(g.q0);
  gh.mixer.setTime(0);   // measure on top of the same frozen idle frame it is drawn with
  gh.inner.position.y = gh.baseY; const ry = gh.root.rotation.y, rp = gh.root.position.clone(); gh.root.rotation.y = 0; gh.root.position.set(0, 0, 0);
  giantPose(gh, b, 0); gh.root.updateMatrixWorld(true);
  const head = gh.gait.find(g => g.kind === 'head').bone.getWorldPosition(new V3());
  let mn = 1e9; for (const g of giantJoints(gh)) mn = Math.min(mn, g.bone.getWorldPosition(_gj).y);
  gh.root.rotation.y = ry; gh.root.position.copy(rp);
  return { head, minJ: mn };
}
function setupGiant() {
  const gh = GIANT.gh;
  const m0 = giantMeasure(gh, 0); GIANT.minJ0 = m0.minJ;
  // how far this rig has to fold to bring its head as low as the built-in giant's full bend (about a quarter of its standing
  // head height); auto-rigged models fold a little less per step, so they may bend past 1
  const eff = b => { const m = giantMeasure(gh, b); return m.head.y - (m.minJ - m0.minJ); };
  let lo = 0.6, hi = 2; for (let k = 0; k < 12; k++) { const b = (lo + hi) / 2; if (eff(b) > 0.265 * m0.head.y) lo = b; else hi = b; }
  const bMax = GIANT.bMax = Math.max(1, (lo + hi) / 2);
  // house centre from the downstairs rooms
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const R of ROOMS) if (!R.outdoor && !R.closet) { x0 = Math.min(x0, R.r[0]); x1 = Math.max(x1, R.r[2]); z0 = Math.min(z0, R.r[1]); z1 = Math.max(z1, R.r[3]); }
  const C = GIANT.c = [(x0 + x1) / 2, (z0 + z1) / 2];
  // every outside window it can reach: stand so the bent-over head ends up just outside the glass
  GIANT.wins = [];
  for (const W of WINDOWS) {
    if (!W.w || !W.w.ext) continue;
    const along = (W.s + W.e) / 2, cx = W.alongX ? along : W.c, cz = W.alongX ? W.c : along;
    const n = W.alongX ? [0, Math.sign(W.c - C[1])] : [Math.sign(W.c - C[0]), 0];
    if (W.fy < 1 && n[1] < 0) continue;   // the front porch roof is in the way downstairs
    const T = new V3(cx + n[0] * 3.2, (W.y0 + W.y1) / 2 - 0.9, cz + n[1] * 3.2), yaw = Math.atan2(n[0], n[1]);
    let g = terrainY(T.x + n[0] * 6, T.z + n[1] * 6), sol = null;
    for (let pass = 0; pass < 2; pass++) {
      let lo = 0, hi = bMax, m = null;
      for (let k = 0; k < 14; k++) { const b = (lo + hi) / 2; m = giantMeasure(gh, b); const hy = m.head.y - (m.minJ - GIANT.minJ0); if (hy + g > T.y) lo = b; else hi = b; }
      const b = (lo + hi) / 2; m = giantMeasure(gh, b);
      const hy = m.head.y - (m.minJ - GIANT.minJ0); if (Math.abs(hy + g - T.y) > 0.6) { sol = null; break; }
      const off = new V3(m.head.x, 0, m.head.z).applyAxisAngle(new V3(0, 1, 0), yaw);
      sol = { b, x: T.x - off.x, z: T.z - off.z, yaw, drop: m.minJ - GIANT.minJ0 };
      g = terrainY(sol.x, sol.z);
    }
    if (sol && (W.fy > 2 || sol.b < 0.9 * bMax)) { sol.g = g; sol.up = W.fy > 2; GIANT.wins.push(sol); }
  }
  for (const g of gh.gait) g.bone.quaternion.copy(g.q0);
  if (!GIANT.wins.length) { console.warn('giant: no reachable windows'); stopGiant(); return; }
  // arrive from the far side of the property
  const a = GIANT.rnd() * Math.PI * 2; GIANT.pos.set(C[0] + Math.cos(a) * 45, 0, C[1] + Math.sin(a) * 45); GIANT.yaw = Math.atan2(-(C[0] - GIANT.pos.x), -(C[1] - GIANT.pos.z));
  giantNext();
}
function giantNext() {
  // mostly the upstairs windows (a proper bend over the roofline), now and then a deep crouch to the ground floor
  const opts = GIANT.wins.filter(w => w !== GIANT.cur), up = opts.filter(w => w.up), pool = up.length && (GIANT.rnd() < 0.7 || up.length === opts.length) ? up : opts.filter(w => !w.up).length ? opts.filter(w => !w.up) : opts;
  GIANT.cur = pool[(GIANT.rnd() * pool.length) | 0];
  // walk around the house on a wide ring, then step in to the window
  const C = GIANT.c, R = 21, ang = (x, z) => Math.atan2(z - C[1], x - C[0]);
  let a0 = ang(GIANT.pos.x, GIANT.pos.z); const a1 = ang(GIANT.cur.x, GIANT.cur.z); let d = a1 - a0; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
  const path = [[C[0] + Math.cos(a0) * R, C[1] + Math.sin(a0) * R]];
  const n = Math.ceil(Math.abs(d) / 0.35); for (let k = 1; k <= n; k++) { const a = a0 + d * k / n; path.push([C[0] + Math.cos(a) * R, C[1] + Math.sin(a) * R]); }
  path.push([GIANT.cur.x, GIANT.cur.z]);
  GIANT.path = path; GIANT.state = 'walk'; GIANT.t = 0;
}
function updateGiant(T, dt) {
  const gh = GIANT.gh; if (!GIANT.on || !gh) return;
  let speed = 0;
  if (GIANT.state === 'walk') {
    const tgt = GIANT.path[0], dx = tgt[0] - GIANT.pos.x, dz = tgt[1] - GIANT.pos.z, d = Math.hypot(dx, dz), sp = 2.6;
    if (d < 0.4) { GIANT.path.shift(); if (!GIANT.path.length) { GIANT.state = 'turn'; GIANT.t = 0; } }
    else { const st = Math.min(d, sp * dt); GIANT.pos.x += dx / d * st; GIANT.pos.z += dz / d * st; GIANT.yaw += angDiff(GIANT.yaw, Math.atan2(-dx, -dz)) * clamp(dt * 1.5, 0, 1); speed = sp; }
  } else if (GIANT.state === 'turn') {
    GIANT.yaw += angDiff(GIANT.yaw, GIANT.cur.yaw) * clamp(dt * 1.6, 0, 1); GIANT.t += dt;
    if (GIANT.t > 1.8) { GIANT.yaw = GIANT.cur.yaw; GIANT.state = 'bend'; GIANT.t = 0; }
  } else if (GIANT.state === 'bend') {
    GIANT.t += dt; GIANT.b = GIANT.cur.b * smooth(0, 3.5, GIANT.t);
    if (GIANT.t >= 3.5) { GIANT.state = 'peek'; GIANT.t = 0; GIANT.hold = 5 + GIANT.rnd() * 4; sfxAt('huntStart', giantHeadPos(), 1, 0.4); }
  } else if (GIANT.state === 'peek') {
    GIANT.t += dt; if (GIANT.t > GIANT.hold) { GIANT.state = 'rise'; GIANT.t = 0; }
  } else if (GIANT.state === 'rise') {
    GIANT.t += dt; GIANT.b = GIANT.cur.b * (1 - smooth(0, 3, GIANT.t));
    if (GIANT.t >= 3) { GIANT.b = 0; giantNext(); }
  }
  // place, animate (walk cycle + idle), then fold into the bend
  const g = terrainY(GIANT.pos.x, GIANT.pos.z);
  gh.root.position.set(GIANT.pos.x, g, GIANT.pos.z); gh.root.rotation.y = GIANT.yaw;
  // the idle clip is held on one frame (its motion would throw the head off the window), the walk cycle rides on top
  for (const b of gh.gait) b.bone.quaternion.copy(b.q0);
  gh.mixer.setTime(0); gaitPose(gh, T, dt, { moving: speed, mode: 0 });
  if (GIANT.b > 0.001) {
    giantPose(gh, GIANT.b, T);
    gh.root.updateMatrixWorld(true); let mn = 1e9; for (const j of giantJoints(gh)) mn = Math.min(mn, gh.root.worldToLocal(j.bone.getWorldPosition(_gj)).y);
    gh.root.position.y = g - (mn - GIANT.minJ0);
  }
  // footfalls you feel more than hear
  if (speed > 0) { const ph = Math.floor(gh.gph / Math.PI); if (ph !== GIANT.stepPh) { GIANT.stepPh = ph; sfxAt('thud', new V3(GIANT.pos.x, g, GIANT.pos.z), 1, 0.35); POST.scare = Math.max(POST.scare, 0.15 * clamp(1 - me().pos.distanceTo(GIANT.pos) / 40, 0, 1)); } }
}
function giantHeadPos() { const h = GIANT.gh.gait.find(g => g.kind === 'head'); return h ? h.bone.getWorldPosition(new V3()) : GIANT.pos.clone(); }
