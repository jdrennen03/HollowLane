// ---------------------------------------------------------------- Scout, the team's yellow Labrador
// Scout goes everywhere the team goes: the stables, the ride out, and every haunted location. V opens the command list:
//   Sit    sits where he is (gets up and comes along if you wander far off)
//   Stay   sits, then lies down, and doesn't move until the next command
//   Follow trails a few steps behind whoever gave the command, in their footsteps
//   Heel   walks at your left side and sits when you stop
//   Fetch  fetches the object you're looking at (or the last one you threw) and drops it at your feet
// During a hunt he growls and barks when the ghost is close. The host runs his behaviour and shares his position;
// everyone animates him locally. The model has no walk cycle, so his legs, body and tail are posed procedurally.
const DOG = {
  name: 'Scout', root: null, body: null, rig: null, mixer: null, hit: null, loading: false, on: false,
  x: 0, z: 0, y: 0, yaw: 0, speed: 0, pose: 0, mode: 'follow', prev: 'follow', owner: 0, carry: -1, target: -1, phase: '',
  trail: [], ti: 0, back: [], idleT: 0, barkT: 0, stuckT: 0, lastD: 0, ph: 0, sit: 0, lie: 0, wag: 0, net: null,
};
const DOG_L = 1.25, DOG_HOLD = 100;   // nose-to-tail length; the prop holder id that means "in Scout's mouth"
const DOG_CMDS = [['sit', 'Sit'], ['stay', 'Stay'], ['follow', 'Follow'], ['heel', 'Heel'], ['fetch', 'Fetch']];
const dogHitMat = new THREE.MeshBasicMaterial({ visible: false });

// ---------- model and rig
function dogInit() {
  if (DOG.root) return;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); root.visible = false; scene.add(root);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 1.0), dogHitMat); hit.position.y = 0.36; root.add(hit);
  Object.assign(DOG, { root, body, hit });
}
function dogLoad() {
  if (DOG.rig || DOG.loading) return; DOG.loading = true;
  loadModelFile('prop-dog.json', gl => {
    const m = gl.scene;
    m.traverse(o => { if (o.isMesh) { o.material = leanMat(Array.isArray(o.material) ? o.material[0] : o.material); o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    const mixer = new THREE.AnimationMixer(m), idle = mixer.clipAction(gl.animations[0]); idle.play(); mixer.setTime(0);
    m.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(m, true), s = DOG_L / (b.max.z - b.min.z), inner = new THREE.Group(); inner.add(m);
    inner.scale.setScalar(s); inner.position.set(-(b.min.x + b.max.x) / 2 * s, -b.min.y * s, -(b.min.z + b.max.z) / 2 * s); inner.updateMatrixWorld(true);
    const find = re => { let r = null; m.traverse(o => { if (!r && o.isBone && re.test(o.name)) r = o; }); return r; };
    const R = {
      root: poseBone(find(/^Body_/)), back: poseBone(find(/^Back_/)), neck: poseBone(find(/^Neck1_/)), head: poseBone(find(/^Head_/)), headB: find(/^Head_/),
      legs: [[/^FrontUpperLegL/, /^FrontLowerLegL/, null, true, 1], [/^FrontUpperLegR/, /^FrontLowerLegR/, null, true, -1],
             [/^BackLegL/, /^BackUpperLegL/, /^BackLowerLegL/, false, 1], [/^BackLegR/, /^BackUpperLegR/, /^BackLowerLegR/, false, -1]]
        .map(([h, k1, k2, front, sx]) => ({ hip: poseBone(find(h)), k1: poseBone(find(k1)), k2: k2 ? poseBone(find(k2)) : null, front, sx })),
      tail: [1, 2, 3, 4, 5, 6].map(i => find(new RegExp('^Tail' + i + '_'))).filter(Boolean).map(poseBone),
    };
    R.up = new V3(0, 1, 0).applyQuaternion(R.root.b.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).divideScalar(R.root.b.parent.getWorldScale(new V3()).y);
    DOG.body.add(inner); Object.assign(DOG, { rig: R, mixer, idle, H: (b.max.y - b.min.y) * s });
  }, e => { console.warn('dog model', e); DOG.loading = false; });
}
// after every map load (the hotspot list is rebuilt from scratch)
function dogAfterMap() { dogInit(); INTERACT.push({ mesh: DOG.hit, kind: 'dog', id: 0 }); }
// put Scout beside a spot and forget the old footsteps (start of a round, arriving somewhere new)
function dogPlace(x, z, yaw, mode = 'follow') {
  dogInit(); dogLoad();
  Object.assign(DOG, { on: true, x, z, y: groundY(x, z, 2), yaw, speed: 0, pose: 0, mode, prev: 'follow', owner: 0, carry: -1, target: -1, phase: '', trail: [], ti: 0, back: [], idleT: 0, stuckT: 0, net: null });
  DOG.root.visible = true;
}
function dogStop() { if (DOG.carry >= 0) dogDrop(); DOG.on = false; if (DOG.root) DOG.root.visible = false; UI.dogMenu = false; const el = $('dogMenu'); if (el) el.hidden = true; }

// ---------- commands (any player)
function dogMenuToggle(open = !UI.dogMenu) {
  UI.dogMenu = open && DOG.on; const el = $('dogMenu'); if (!el) return; el.hidden = !UI.dogMenu;
  if (UI.dogMenu) el.innerHTML = '<b>' + DOG.name + '</b>' + DOG_CMDS.map(([k, t], i) => '<div><kbd>' + (i + 1) + '</kbd>' + t + (DOG.mode === k ? ' ·' : '') + '</div>').join('') + '<div class="dim"><kbd>V</kbd>Close</div>';
}
function dogCommand(i) {
  const c = DOG_CMDS[i]; dogMenuToggle(false); if (!c) return;
  let target = -1;
  if (c[0] === 'fetch') {
    const P = me(), fx = -Math.sin(PL.yaw), fz = -Math.cos(PL.yaw), ok = p => p && p.holder < 0 && Math.abs(p.mesh.position.y - P.pos.y) < 3;
    if (PL.hot && PL.hot.kind === 'prop' && ok(PROPO[PL.hot.id])) target = PL.hot.id;
    else if (PL.lastThrow >= 0 && ok(PROPO[PL.lastThrow]) && PROPO[PL.lastThrow].mesh.position.distanceTo(P.pos) < 25) target = PL.lastThrow;
    else {   // the nearest loose object in front of you
      let bd = 9; for (const p of PROPO) { if (!ok(p)) continue; const dx = p.mesh.position.x - P.pos.x, dz = p.mesh.position.z - P.pos.z, d = Math.hypot(dx, dz); if (d < bd && (dx * fx + dz * fz) / (d || 1) > 0.5 && sightClear(P.pos.x, P.pos.z, p.mesh.position.x, p.mesh.position.z, P.pos.y, P.pos.y)) { bd = d; target = p.i; } }
    }
    if (target < 0) { sub('Nothing for ' + DOG.name + ' to fetch. Look at something loose, or throw it first (pick it up with E, left click to throw).', 'sys'); return; }
  }
  sub('You: "' + DOG.name + ', ' + c[1].toLowerCase() + (c[0] === 'fetch' ? '!' : '.') + '"');
  request('dog', c[0], target);
}
function hostDogCmd(slot, cmd, target) {
  if (!DOG.on) return; const D = DOG;
  if (D.carry >= 0 && cmd !== 'fetch') dogDrop();
  if (cmd === 'fetch') { const p = PROPO[target]; if (!p || p.holder >= 0) return; if (D.mode !== 'fetch') D.prev = D.mode === 'heel' ? 'heel' : 'follow'; D.target = target; D.phase = 'go'; D.back = [[D.x, D.z, D.y]]; D.stuckT = 0; }
  else if (cmd === 'follow' || cmd === 'heel') { D.ti = 0; D.trail = []; }
  D.mode = cmd; D.owner = slot; D.idleT = 0;
  if (cmd !== 'sit' && cmd !== 'stay') hostEvent(['snd', 'bark', r2(D.x), r2(D.y + 0.5), r2(D.z), 0.45]);
}
function dogPet(slot) { DOG.wagT = 3; if (slot === G.mySlot) sub(DOG.name + ' leans into your hand, tail going.', 'sys'); }

// ---------- behaviour (host)
function dogMouth(out) {   // where the carried object sits: just ahead of and below the head bone
  const R = DOG.rig, f = new V3(Math.sin(DOG.yaw), 0, Math.cos(DOG.yaw));
  if (!R) return out.set(DOG.x, DOG.y + 0.45, DOG.z).addScaledVector(f, 0.6);
  return R.headB.getWorldPosition(out).addScaledVector(f, 0.14).add(new V3(0, -0.07, 0));
}
function dogDrop() {
  const p = PROPO[DOG.carry]; DOG.carry = -1; if (!p) return;
  p.holder = -1; p.sleep = false; p.settle = 0; p.vel.set(Math.sin(DOG.yaw) * 0.6, 0.3, Math.cos(DOG.yaw) * 0.6); p.ang.set(0, 0, 0); p.mesh.castShadow = true;
}
// head for (gx, gz): straight there when the way is clear, otherwise along a nav path, otherwise along a breadcrumb trail
function dogSteer(gx, gz, gy, sp, dt, trail) {
  const D = DOG, dx = gx - D.x, dz = gz - D.z, d = Math.hypot(dx, dz);
  let tx = gx, tz = gz;
  const clear = Math.abs(gy - D.y) < 0.7 && sightClear(D.x, D.z, gx, gz, D.y, gy);
  if (!clear) {
    if (trail && trail.length) {   // the owner's footsteps (or the dog's own, on the way back from a fetch)
      while (D.ti < trail.length - 1 && Math.hypot(trail[D.ti][0] - D.x, trail[D.ti][1] - D.z) < 0.35) D.ti++;
      tx = trail[D.ti][0]; tz = trail[D.ti][1];
    } else {
      D.pathT -= dt;
      if (!D.path || D.pathT <= 0) { D.pathT = 1; D.path = findPath(D.x, D.z, levelOf(D.y), gx, gz, levelOf(gy)); }
      while (D.path.length && Math.hypot(D.path[0][0] - D.x, D.path[0][1] - D.z) < 0.3) D.path.shift();
      if (D.path.length) { tx = D.path[0][0]; tz = D.path[0][1]; }
    }
  } else { D.path = null; if (trail) D.ti = Math.max(D.ti, trail.length - 1); }
  const ex = tx - D.x, ez = tz - D.z, e = Math.hypot(ex, ez);
  if (e > 0.02) {
    const st = Math.min(e, sp * dt), ox = D.x, oz = D.z;
    D.x += ex / e * st; D.z += ez / e * st; D.yaw += angDiff(D.yaw, Math.atan2(ex, ez)) * clamp(dt * 7, 0, 1);
    const p = new V3(D.x, D.y, D.z); collidePlayer(p, 0.2); D.x = p.x; D.z = p.z;
    D.speed = Math.hypot(D.x - ox, D.z - oz) / Math.max(dt, 1e-4);
  } else D.speed = 0;
  D.y = groundY(D.x, D.z, D.y + 0.4);
  return d;
}
function hostDog(dt) {
  const D = DOG; if (!D.on) return;
  let O = G.players[D.owner]; if (!O || !O.alive) { O = alivePlayers()[0]; if (!O) return; D.owner = O.slot; }
  // the owner's footsteps, so Scout can follow through doors and round corners
  const op = O.pos, tr = D.trail, last = tr[tr.length - 1];
  if (!last || Math.hypot(op.x - last[0], op.z - last[1]) > 0.3 || Math.abs(op.y - last[2]) > 0.3) {
    if (last && Math.hypot(op.x - last[0], op.z - last[1]) > 5) { tr.length = 0; D.ti = 0; }
    tr.push([op.x, op.z, op.y]); if (tr.length > 400) { tr.shift(); D.ti = Math.max(0, D.ti - 1); }
  }
  const dO = Math.hypot(op.x - D.x, op.z - D.z), ride = mounted(O.slot), oSp = O.moving || 0;
  // left far behind (a galloping horse, a long drive) and out of sight: catch up along the trail
  if ((dO > 28 || Math.abs(op.y - D.y) > 3) && D.mode !== 'stay' && D.mode !== 'sit' && D.carry < 0 && !sightClear(D.x, D.z, op.x, op.z, D.y, op.y)) {
    const k = Math.max(0, tr.length - 12), q = tr[k]; if (q) { D.x = q[0]; D.z = q[1]; D.y = groundY(q[0], q[1], q[2]); D.ti = k; }
  }
  let still = true;
  const guard = dogGuardSpot(O);
  if (guard && D.carry < 0) {   // a hunt, and the ghost is coming: stand between it and the owner, facing it
    still = false; const gd = Math.hypot(guard[0] - D.x, guard[1] - D.z);
    if (gd > 0.25) dogSteer(guard[0], guard[1], op.y, clamp(gd * 3, 1.5, 6.5), dt, tr); else D.speed = 0;
    if (gd < 0.6) D.yaw += angDiff(D.yaw, Math.atan2(G.gs.x - D.x, G.gs.z - D.z)) * clamp(dt * 8, 0, 1);
  } else if (D.mode === 'follow' || D.mode === 'heel') {
    const yaw = ride ? (riding(O.slot) ? riding(O.slot).yaw + Math.PI : STB.wagon.yaw + Math.PI) : O.yaw, left = ride ? 1.3 : 0.7;
    const heelX = op.x - Math.cos(yaw) * left, heelZ = op.z + Math.sin(yaw) * left;
    const heel = D.mode === 'heel' && dO < 4, gx = heel ? heelX : op.x, gz = heel ? heelZ : op.z, stop = heel ? 0.25 : (ride ? 3.2 : 1.9);
    const gd = Math.hypot(gx - D.x, gz - D.z);
    if (gd > stop + (D.speed > 0.1 ? 0 : 0.5)) {
      still = false;
      const sp = heel ? clamp(Math.max(oSp, gd * 2.2), 1.0, 6.5) : gd > 7 ? 6.5 : clamp(Math.max(oSp + 0.4, 1.4), 1.2, 6.5);
      dogSteer(gx, gz, op.y, sp, dt, tr);
    } else if (heel) { D.yaw += angDiff(D.yaw, yaw + Math.PI) * clamp(dt * 5, 0, 1); }
    else D.yaw += angDiff(D.yaw, Math.atan2(op.x - D.x, op.z - D.z)) * clamp(dt * 3, 0, 1);
  } else if (D.mode === 'sit' || D.mode === 'stay') {
    if (D.mode === 'sit' && D.idleT > 20 && dO > 8) { D.mode = 'follow'; D.ti = 0; hostEvent(['snd', 'bark', r2(D.x), r2(D.y + 0.5), r2(D.z), 0.35]); }
  } else if (D.mode === 'fetch') {
    const p = PROPO[D.target];
    if (!p || (p.holder >= 0 && p.holder !== DOG_HOLD)) { D.mode = D.prev; D.carry = -1; }
    else if (D.phase === 'go') {
      still = false; const m = p.mesh.position, bl = D.back[D.back.length - 1];
      if (Math.hypot(D.x - bl[0], D.z - bl[1]) > 0.4) D.back.push([D.x, D.z, D.y]);
      const d = dogSteer(m.x, m.z, m.y, 6.0, dt, null);
      if (d < 0.55 && Math.abs(m.y - D.y) < 1.2) { p.holder = DOG_HOLD; p.sleep = true; p.vel.set(0, 0, 0); p.ang.set(0, 0, 0); D.carry = p.i; D.phase = 'back'; D.ti = 0; D.back.reverse(); hostEvent(['snd', 'pickup', r2(D.x), r2(D.y + 0.4), r2(D.z), 0.4]); }
    } else {   // bring it back: retrace his own steps until he can see whoever sent him, then straight to their feet
      still = false; const fx = -Math.sin(O.yaw), fz = -Math.cos(O.yaw), gx = op.x + fx * 0.8, gz = op.z + fz * 0.8, d = dogSteer(gx, gz, op.y, 4.5, dt, D.back);
      if (d < 0.6 || (d < 1.4 && D.speed < 0.05)) { dogDrop(); D.mode = D.prev; D.idleT = 0; hostEvent(['snd', 'bark', r2(D.x), r2(D.y + 0.5), r2(D.z), 0.5]); D.wagT = 3; }
    }
    // stuck (a fence, a locked door): give up
    D.stuckT = D.speed < 0.15 && D.mode === 'fetch' ? D.stuckT + dt : 0;
    if (D.stuckT > 3.5) { if (D.carry >= 0) dogDrop(); D.mode = D.prev; D.stuckT = 0; hostEvent(['msg', D.owner, DOG.name + ' can\'t get to it.']); }
  }
  if (still) D.speed = 0;
  // resting: sit after a few seconds, lie down after a while (Stay lies down sooner)
  D.idleT = D.speed > 0.1 ? 0 : D.idleT + dt;
  D.pose = D.speed > 0.1 ? 0 : D.mode === 'sit' ? 1 : D.mode === 'stay' ? (D.idleT > 10 ? 2 : 1) : D.mode === 'heel' ? (D.idleT > 1.2 ? 1 : 0) : D.idleT > 22 ? 2 : D.idleT > 6 ? 1 : 0;
  if (guard) D.pose = 0;   // on guard he stays up on his feet
  // the ghost: a growl when it shows itself nearby, barking all through a hunt when it's close
  const gs = G.gs; D.barkT -= dt;
  if (gs && gs.y > -10 && D.barkT <= 0) {
    const gd = Math.hypot(gs.x - D.x, gs.z - D.z), hunting = gs.mode === 2 || gs.mode === 3;
    if (hunting && gd < 12) { D.barkT = rr(0.9, 1.6); hostEvent(['snd', 'bark', r2(D.x), r2(D.y + 0.5), r2(D.z), 0.9]); }
    else if (gs.vis && gd < 7) { D.barkT = 6; hostEvent(['snd', 'growl', r2(D.x), r2(D.y + 0.4), r2(D.z), 0.8]); }
  }
}

// ---------- everyone: follow the host's dog and animate him
const _dm = new V3();
function updateDog(T, dt) {
  const D = DOG; if (!D.on || !D.root) return;
  if (G.isHost && G.state === 'play') hostDog(dt);
  else if (D.net) { const q = D.net, jump = Math.hypot(q[0] - D.x, q[2] - D.z) > 3, k = jump ? 1 : clamp(dt * 10, 0, 1); D.x = lerp(D.x, q[0], k); D.y = lerp(D.y, q[1], k); D.z = lerp(D.z, q[2], k); D.yaw += angDiff(D.yaw, q[3]) * k; D.pose = q[4]; D.speed = q[5]; D.carry = q[6]; D.mode = DOG_CMDS[q[7]] ? DOG_CMDS[q[7]][0] : 'follow'; }
  animateDog(T, dt);
  if (D.carry >= 0 && PROPO[D.carry]) { const p = PROPO[D.carry]; dogMouth(_dm); p.mesh.position.copy(_dm); p.mesh.rotation.set(0, D.yaw + Math.PI / 2, 0); p.mesh.castShadow = false; p.moved = performance.now() / 1000; }
}
function animateDog(T, dt) {
  const D = DOG; D.root.position.set(D.x, D.y, D.z); D.root.rotation.y = D.yaw;
  const R = D.rig; if (!R) return;
  const mv = D.speed, k = clamp(dt * 5, 0, 1);
  D.sit = lerp(D.sit, mv > 0.1 ? 0 : D.pose === 1 ? 1 : 0, k); D.lie = lerp(D.lie, mv > 0.1 ? 0 : D.pose === 2 ? 1 : 0, k);
  const sit = D.sit, lie = D.lie, run = clamp((mv - 2.2) / 2, 0, 1), w = clamp(mv / 0.4, 0, 1);
  D.ph += dt * mv / (0.42 * (1 + run * 0.8)) * Math.PI;
  // standing still: let the model's own idle (an ear flick and a sniff at the ground) play; otherwise hold its first frame
  const idle = mv < 0.1 && sit < 0.05 && lie < 0.05;
  if (idle) D.mixer.update(dt); else D.mixer.setTime(0);
  const ph = D.ph, pitch = 0.55 * sit;
  if (!idle) {
    R.root.ax = -pitch; R.root.b.position.copy(R.root.p0).addScaledVector(R.up, Math.abs(Math.sin(ph)) * 0.02 * w - 0.12 * sit - 0.24 * lie);
    R.neck.ax = pitch * 0.6 - lie * 0.25 + (D.carry >= 0 ? -0.15 : 0); R.head.ax = pitch * 0.4 + lie * 0.3 + Math.sin(ph * 2) * 0.05 * w;
    applyPose(R.root); applyPose(R.neck); applyPose(R.head);
  }
  for (const L of R.legs) {
    const off = (L.front ? 0 : Math.PI) + (L.sx > 0 ? Math.PI : 0) + (run > 0.5 ? (L.sx > 0 ? 0.5 : 0) : 0), cyc = ph + off;
    const swing = Math.sin(cyc) * (0.45 + run * 0.35) * w, lift = Math.max(0, Math.cos(cyc)) * w;
    if (L.front) { L.hip.ax = -swing + pitch + 0.15 * lie; L.k1.ax = 0.8 * lift - 1.4 * lie; }
    else { L.hip.ax = -swing - 0.75 * sit + 0.45 * lie; L.k1.ax = -0.5 * lift - 1.5 * sit - 0.7 * lie; if (L.k2) { L.k2.ax = 0.5 * lift + 1.3 * sit + 0.4 * lie; applyPose(L.k2); } }
    applyPose(L.hip); applyPose(L.k1);
  }
  // tail: a lazy sway, a proper wag when he's moving, happy or just back with the ball
  D.wagT = Math.max(0, (D.wagT || 0) - dt); const happy = D.wagT > 0 || mv > 0.3;
  R.tail.forEach((t, i) => { t.ax = i === 0 ? -0.35 + lie * 0.3 : -0.04; t.ay = Math.sin(T * (happy ? 13 : 2.2) + i * 0.5) * (happy ? 0.35 : 0.12) * (0.5 + i / R.tail.length); applyPose(t); });
}

// ---------- protecting the team
// Indoors, with Scout by your side (following or at heel, within a couple of steps), a hunting ghost has to get past him:
// he plants himself between you and it, hackles up, and the first time it closes in he lunges and drives it back, once per hunt.
const DOG_SIDE = 2.6;
function dogWith(P) { const D = DOG; return D.on && D.carry < 0 && P && P.alive && P.inside && (D.mode === 'follow' || D.mode === 'heel') && Math.hypot(P.pos.x - D.x, P.pos.z - D.z) < DOG_SIDE + 1 && Math.abs(P.pos.y - D.y) < 1; }
function dogGuardSpot(O) {
  const gs = G.gs; if (!gs || gs.mode !== 2 || gs.huntT < 2.5 || gs.repelT > 0 || !dogWith(O)) return null;
  const dx = gs.x - O.pos.x, dz = gs.z - O.pos.z, d = Math.hypot(dx, dz);
  if (d > 9 || Math.abs(gs.y - O.pos.y) > 1.2) return null;
  const k = Math.min(0.9, d * 0.5); return [O.pos.x + dx / d * k, O.pos.z + dz / d * k];
}
function dogGuard() {
  const gs = G.gs; if (!DOG.on || gs.dogUsed || gs.repelT > 0) return false;
  for (const P of alivePlayers()) {
    if (P.hidden || !dogWith(P) || Math.abs(P.pos.y - gs.y) > 1) continue;
    const dP = Math.hypot(P.pos.x - gs.x, P.pos.z - gs.z), dD = Math.hypot(DOG.x - gs.x, DOG.z - gs.z);
    if (dP > 2.2 && dD > 1.3) continue;
    gs.dogUsed = true;
    DOG.yaw = Math.atan2(gs.x - DOG.x, gs.z - DOG.z); const step = Math.min(0.6, Math.max(0, dD - 0.5)); DOG.x += Math.sin(DOG.yaw) * step; DOG.z += Math.cos(DOG.yaw) * step;
    repelGhost(new V3(DOG.x, DOG.y, DOG.z), true);
    hostEvent(['dogsave', P.slot]); return true;
  }
  return false;
}
function onDogSave(slot) {
  const P = G.players[slot], mine = slot === G.mySlot;
  sfxAt('bark', new V3(DOG.x, DOG.y + 0.5, DOG.z), 1); setTimeout(() => sfxAt('growl', new V3(DOG.x, DOG.y + 0.4, DOG.z), 1), 350); setTimeout(() => sfxAt('bark', new V3(DOG.x, DOG.y + 0.5, DOG.z), 1), 700);
  const me0 = me(); if (mine || (me0 && Math.hypot(me0.pos.x - DOG.x, me0.pos.z - DOG.z) < 12)) sub(mine ? DOG.name + ' throws himself between you and the ghost, snarling. It recoils!' : DOG.name + ' lunges at the ghost to protect ' + (P ? P.nick : 'them') + '. It recoils!', 'sys');
}
