// ---------------------------------------------------------------- local player
const PL = {
  carry: -1, cam: null, hand: null, flash: null, flashCone: null, yaw: 0, pitch: 0, vel: new V3(), stamina: 1, bob: 0, stepT: 0, slot: 0,
  keys: {}, locked: false, look: { dragging: false }, sens: 1, slotIdx: 0, hot: null, deathT: -1, spectate: false, specIdx: 0, eyeH: 1.62, crouch: false,
  breathT: 3, lastAsk: 0, flashFlicker: 1,
};
function initPlayer(scene, camera) {
  PL.cam = camera; scene.add(camera);
  PL.hand = new THREE.Group(); camera.add(PL.hand);
  const fl = new THREE.SpotLight(0xfff0dc, 0, 32, 0.54, 0.5, 1.6);
  fl.map = TEX.flashCookie; fl.castShadow = true; fl.shadow.mapSize.set(1024, 1024); fl.shadow.camera.near = 0.15; fl.shadow.camera.far = 32; fl.shadow.bias = -0.0004; fl.shadow.normalBias = 0.02;
  fl.position.set(-0.2, -0.22, 0.05); fl.target.position.set(0.1, -0.35, -5); camera.add(fl, fl.target); PL.flash = fl;
  // faint volumetric beam
  const cg = new THREE.ConeGeometry(1.25, 4.2, 28, 1, true); cg.translate(0, -2.1, 0); cg.rotateX(-Math.PI / 2);
  const cm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uI: { value: 0.0058 } },
    vertexShader: 'varying float vZ; varying vec3 vN; varying vec3 vV; void main(){ vZ = position.z/4.2; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = -mv.xyz; gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform float uI; varying float vZ; varying vec3 vN; varying vec3 vV; void main(){ float e = abs(dot(normalize(vN), normalize(vV))); float a = uI * (1.0 - vZ) * smoothstep(0.0, 0.08, vZ) * pow(e, 1.5); gl_FragColor = vec4(vec3(1.0,0.95,0.85)*a, a); }' });
  PL.flashCone = new THREE.Mesh(cg, cm); PL.flashCone.position.copy(fl.position); PL.flashCone.lookAt(new V3(0.1, -0.35, -5)); camera.add(PL.flashCone);
  PL.flashCone.renderOrder = 5;
  // faint fill so held gear stays readable in the dark
  const hf = new THREE.PointLight(0xc8d4ff, 0.05, 0.9, 2); hf.position.set(0.05, 0.02, -0.1); camera.add(hf); PL.handFill = hf;
}
function myItems() { return ITEMS.filter(it => it.holder === G.mySlot).sort((a, b) => (a.pickT || 0) - (b.pickT || 0)); }
function heldItem() { const its = myItems(); if (!its.length) return null; PL.slotIdx = clamp(PL.slotIdx, 0, its.length - 1); return its[PL.slotIdx]; }

// ---------------------------------------------------------------- input
function bindInput(canvas) {
  addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return;
    const k = e.code; PL.keys[k] = true;
    if (G.state !== 'play') return;
    if (k === 'Escape') { /* pointer lock release handled below */ }
    if (k === 'KeyJ' || k === 'Tab') { e.preventDefault(); toggleJournal(); return; }
    if (UI.journalOpen || UI.paused) return;
    if (!me() || !me().alive) { if (k === 'Space' || k === 'KeyE') { PL.specIdx++; } return; }
    if (k === 'KeyE') interact();
    else if (k === 'KeyF') toggleFlash();
    else if (k === 'KeyR') toggleHeld();
    else if (k === 'KeyG') { if (stbG()) return; if (PL.carry >= 0) dropProp(false); else dropHeld(); }
    else if (k === 'KeyT') askSpirit();
    else if (k === 'KeyQ') cycleSlot(1);
    else if (k === 'KeyC') { PL.crouch = !PL.crouch; $('crouchTag').hidden = !PL.crouch; }
    else if (k === 'KeyV') dogMenuToggle();
    else if (UI.dogMenu && /^Digit[1-5]$/.test(k)) dogCommand(+k.slice(-1) - 1);
    else if (k === 'Digit1' || k === 'Digit2' || k === 'Digit3') selectSlot(+k.slice(-1) - 1);
  });
  addEventListener('keyup', e => { PL.keys[e.code] = false; });
  addEventListener('blur', () => { PL.keys = {}; });
  canvas.addEventListener('mousedown', e => {
    if (G.state !== 'play' || UI.journalOpen || UI.paused) return;
    if (!PL.locked) { requestLock(canvas); PL.look.dragging = true; PL.look.x = e.clientX; PL.look.y = e.clientY; }
    if (!me() || !me().alive) return;
    if (e.button === 0 && PL.locked) { if (PL.carry >= 0) { dropProp(true); return; } const h = heldItem(); if (h && h.type === 'spirit') askSpirit(); }
    if (e.button === 2) toggleHeld();
  });
  addEventListener('mouseup', () => { PL.look.dragging = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('mousemove', e => {
    if (G.state !== 'play' || UI.journalOpen) return;
    let dx = 0, dy = 0;
    if (PL.locked) { dx = e.movementX; dy = e.movementY; }
    else if (PL.look.dragging) { dx = e.clientX - PL.look.x; dy = e.clientY - PL.look.y; PL.look.x = e.clientX; PL.look.y = e.clientY; }
    if (PL.deathT >= 0) return;
    PL.yaw -= dx * 0.0022 * PL.sens; PL.pitch = clamp(PL.pitch - dy * 0.0022 * PL.sens, -1.45, 1.45);
  });
  addEventListener('wheel', e => { if (G.state === 'play' && !UI.journalOpen && me()?.alive) cycleSlot(e.deltaY > 0 ? 1 : -1); }, { passive: true });
  document.addEventListener('pointerlockchange', () => {
    PL.locked = document.pointerLockElement === canvas;
    if (!PL.locked && G.state === 'play' && !UI.journalOpen && !UI.results) openPause();
  });
  // touch fallback: drag to look, two-finger hold to walk
  canvas.addEventListener('touchstart', e => { if (G.state !== 'play') return; const t = e.touches[0]; PL.look.dragging = true; PL.look.x = t.clientX; PL.look.y = t.clientY; PL.keys.KeyW = e.touches.length > 1; }, { passive: true });
  canvas.addEventListener('touchmove', e => { const t = e.touches[0]; if (!PL.look.dragging) return; PL.yaw -= (t.clientX - PL.look.x) * 0.004; PL.pitch = clamp(PL.pitch - (t.clientY - PL.look.y) * 0.004, -1.4, 1.4); PL.look.x = t.clientX; PL.look.y = t.clientY; PL.keys.KeyW = e.touches.length > 1; }, { passive: true });
  canvas.addEventListener('touchend', e => { PL.look.dragging = e.touches.length > 0; PL.keys.KeyW = e.touches.length > 1; if (PL.hot && e.changedTouches.length === 1 && e.touches.length === 0) interact(); }, { passive: true });
}
function requestLock(canvas) {
  const safe = r => { if (r && r.catch) r.catch(() => { }); return r; };
  try { const p = safe(canvas.requestPointerLock({ unadjustedMovement: true })); if (p && p.catch) p.catch(() => { try { safe(canvas.requestPointerLock()); } catch (e) { } }); } catch (e) { try { safe(canvas.requestPointerLock()); } catch (e2) { } }
}

// ---------------------------------------------------------------- actions
function toggleFlash() { const P = me(); P.flash = !P.flash; sfx('click', 0.7); }
function selectSlot(i) { const its = myItems(); if (i < its.length) { PL.slotIdx = i; sfx('pickup', 0.25); hudInventory(); } }
function cycleSlot(d) { const its = myItems(); if (!its.length) return; PL.slotIdx = (PL.slotIdx + d + its.length) % its.length; sfx('pickup', 0.25); hudInventory(); }
function toggleHeld() {
  const h = heldItem(); if (!h) return;
  if (h.type === 'journal') { sub('Set the journal down where you think the ghost is (G), then come back and check its pages.', 'sys'); return; }
  if (h.type === 'meds') {
    if (h.spent) { sub('The can is empty.', 'sys'); return; }
    request('on', h.id, 1); h.spent = true;   // host first: it ignores a can already marked empty
    const P = me(); P.sanity = Math.min(100, P.sanity + MEDS_SANITY); sfx('gulp', 0.8); sub('You down the sanity medication. Your nerves steady. (+' + MEDS_SANITY + '% sanity)', 'sys'); hudInventory(); return;
  }
  if (h.type === 'doll') {
    if (h.spent) { sub('The pin is already buried in its heart.', 'sys'); return; }
    request('on', h.id, 1); h.spent = true; sfx('thud', 0.6, 1.6);   // tell the host first: it ignores a doll already marked used sub('You press the long pin into the doll\'s heart…', 'sys'); hudInventory(); return;
  }
  if (h.type === 'incense') {
    if (h.spent) { sub('This bundle has burned down to ash.', 'sys'); return; }
    if (h.on) return;
    h.on = true; request('on', h.id, 1); sfx('lighter', 0.8); sub('The sage catches. Its smoke drives a hunting ghost back, for a few seconds.', 'sys'); hudInventory(); return;
  }
  h.on = !h.on;
  if (h.type === 'camera') { sfx('beep', 0.4, h.on ? 1.3 : 0.9); if (h.on) sub('Camcorder recording. Night vision shows what your eyes can\'t: watch for orbs.', 'sys'); } request('on', h.id, h.on ? 1 : 0); sfx('click', 0.6); if (h.type === 'spirit' && h.on) sub('Spirit box on. Press T or click to ask a question.', 'sys'); hudInventory(); }
function dropHeld() {
  const h = heldItem(); if (!h) return;
  const P = me(); const fx = -Math.sin(PL.yaw), fz = -Math.cos(PL.yaw);
  let x = P.pos.x + fx * 0.55, z = P.pos.z + fz * 0.55;
  if (!sightClear(P.pos.x, P.pos.z, x, z, P.pos.y, P.pos.y)) { x = P.pos.x; z = P.pos.z; }
  const y = groundY(x, z, P.pos.y);
  const ry = PL.yaw;
  h.holder = -1; h.pos.set(x, y, z); h.ry = ry; placeItemInWorld(h);
  request('drop', h.id, r2(x), r2(y), r2(z), r2(ry));
  sfxAt('thud', h.pos, 0.3);
  if (h.type === 'laser') sub(h.on ? 'Projector placed. Watch the grid.' : 'Projector placed. Turn it on with E then R, or pick it back up.', 'sys');
  PL.slotIdx = Math.max(0, PL.slotIdx - 1);
  hudBuildInventory();
}
function askSpirit() {
  const h = heldItem(); if (!h || h.type !== 'spirit') return;
  if (!h.on) { sub('The spirit box is off. Press R to switch it on.', 'sys'); return; }
  const now = performance.now() / 1000; if (now - PL.lastAsk < 3.5) return; PL.lastAsk = now;
  const q = (Math.random() * SB_ANSWERS.length) | 0;
  sub('You: “' + SB_ANSWERS[q].q + '”');
  sfx('radio', 0.5);
  const P = me(); request('ask', q, r2(P.pos.x), r2(P.pos.y), r2(P.pos.z));
}
function interact() {
  const h = PL.hot; if (!h) { stbGetOff(); return; }
  if (h.kind === 'tack' || h.kind === 'anim' || h.kind === 'wagon') { stbInteract(h); return; }
  if (h.kind === 'dog') { request('dpet'); return; }
  if (h.kind === 'door') request('door', h.id);
  else if (h.kind === 'switch') { request('light', h.id); sfx('switch', 0.8); }
  else if (h.kind === 'item') {
    const it = ITEMS[h.id]; if (it.holder >= 0) return;
    if (myItems().length >= 3) { sub('Your hands are full. Drop something first (G).', 'sys'); return; }
    if (G.isHost) { hostPickup(it.id, G.mySlot); } else { it.holder = G.mySlot; request('pick', it.id); }
    it.pickT = performance.now(); PL.slotIdx = myItems().indexOf(it); hudBuildInventory(); sfx('pickup', 0.6);
  } else if (h.kind === 'clip') openJournal(true);
  else if (h.kind === 'prop') pickProp(h.id);
  else if (h.kind === 'cat') request('pet', h.id);
  else if (h.kind === 'horse' && HORSE.state === 'buck') { sub('You hold out a hand and talk low and slow…', 'sys'); request('calm'); }
  else if (h.kind === 'egg' && MAP.id === 'bayou' && h.id === 2) { if (!G.gatorBait) { sub('You tip the bucket off the end of the dock. The chicken necks sink in a slow swirl of bubbles… and the frogs go quiet.', 'sys'); request('egg', 2); } }
  else if (h.kind === 'egg' && MAP.id === 'bayou' && h.id === 3) { if (!G.eggOn) { if (!G.gatorBait) sub('The bell clangs out across the water. Nothing answers. Maybe it wants feeding first.', 'sys'); request('egg', 3); } }
  else if (h.kind === 'egg' && !G.eggOn && MAP.id === 'barn') { sfx('creak', 0.6); sub('You lift Bonnie Blue\'s halter off its hook. It is still warm. Inside her stall, something screams and kicks.', 'sys'); request('egg'); }
  else if (h.kind === 'egg' && !G.eggOn) { sfx('radio', 0.8, 0.5); sub('The tape clunks into place and the arcade screen fills with static…', 'sys'); request('egg'); }
}

// ---------------------------------------------------------------- items in the world / hands / on avatars
function placeItemInWorld(it) {
  WORLD.root.parent.add(it.obj);
  it.obj.position.copy(it.pos); it.obj.rotation.set(0, it.ry, 0); it.obj.scale.setScalar(1);
  if (it.restTilt && it.pos.distanceTo(it.home) < 0.01) { it.obj.rotation.x = -Math.PI / 2; it.obj.position.y += 0.02; }
  if (it.type === 'incense') { it.obj.rotation.x = Math.PI / 2; it.obj.position.y += 0.026; }
  it.hit.visible = true; it.where = 'world';
}
function syncItemParents() {
  const held = heldItem();
  for (const it of ITEMS) {
    if (it.holder === G.mySlot && me()?.alive) {
      if (it === held) {
        if (it.where !== 'hand') { PL.hand.add(it.obj); it.where = 'hand'; }
        const [x, y, z, rx, ry, rz] = HAND_POSE[it.type]; it.obj.position.set(x, y, z); it.obj.rotation.set(rx, ry, rz);
        it.obj.visible = true;
      } else { if (it.where !== 'pocket') { PL.hand.add(it.obj); it.where = 'pocket'; } it.obj.visible = false; }
    } else if (it.holder >= 0) {
      const P = G.players[it.holder];
      if (P && P.avatar) {
        if (it.where !== 'av' + it.holder) { P.avatar.userData.hand.add(it.obj); it.where = 'av' + it.holder; }
        const shown = P.held === it.id; it.obj.visible = shown; it.obj.position.set(0, -0.02, -0.06); it.obj.rotation.set(-0.3, 0, 0);
      }
    } else {
      if (it.where !== 'world') placeItemInWorld(it);
      it.obj.visible = true;
    }
  }
}
// ---------------------------------------------------------------- teammates
function buildAvatars() {
  for (const P of G.players) {
    if (P.avatar) { P.avatar.parent && P.avatar.parent.remove(P.avatar); P.avatar = null; }
    if (P.slot === G.mySlot) continue;
    const g = new THREE.Group(); const col = new THREE.Color(SLOT_COLORS[P.slot]);
    const jacket = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.45), roughness: 0.8 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.9 }), skin = new THREE.MeshStandardMaterial({ color: 0xb08a70, roughness: 0.7 });
    const mk = (geo, m, x, y, z, parent = g) => { const me2 = new THREE.Mesh(geo, m); me2.position.set(x, y, z); me2.castShadow = true; me2.receiveShadow = true; parent.add(me2); return me2; };
    const legs = [];
    for (const s of [-1, 1]) { const hip = new THREE.Group(); hip.position.set(s * 0.1, 0.88, 0); g.add(hip); mk(new THREE.CapsuleGeometry(0.07, 0.7, 4, 8), pants, 0, -0.42, 0, hip); mk(new THREE.BoxGeometry(0.11, 0.07, 0.24), MATS.blackPlastic, 0, -0.84, -0.04, hip); legs.push(hip); }
    mk(new THREE.CapsuleGeometry(0.19, 0.42, 4, 12), jacket, 0, 1.2, 0).scale.z = 0.7;
    const head = new THREE.Group(); head.position.y = 1.62; g.add(head);
    mk(new THREE.SphereGeometry(0.11, 16, 12), skin, 0, 0, 0, head).scale.set(0.9, 1.08, 1);
    mk(new THREE.SphereGeometry(0.118, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.9 }), 0, 0.02, 0, head);
    const lamp = mk(new THREE.CylinderGeometry(0.02, 0.025, 0.04, 10), MATS.metal, 0, 0.07, -0.11, head); lamp.rotation.x = Math.PI / 2;
    const arms = [];
    for (const s of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(s * 0.24, 1.42, 0); g.add(sh); mk(new THREE.CapsuleGeometry(0.06, 0.5, 4, 8), jacket, 0, -0.28, 0, sh); arms.push(sh); }
    const hand = new THREE.Group(); hand.position.set(0, -0.6, -0.05); arms[1].add(hand);
    // flashlight beam for this teammate (no shadow to stay within GPU limits)
    const sp = new THREE.SpotLight(0xfff0dc, 0, 18, 0.5, 0.6, 1.8); sp.position.set(0, 0.07, -0.13); sp.target.position.set(0, 0, -3); head.add(sp, sp.target);
    // floating name tag
    const [c, x] = mkCanvas(256, 64); x.font = '600 34px "Barlow Semi Condensed", sans-serif'; x.textAlign = 'center'; x.fillStyle = SLOT_COLORS[P.slot]; x.shadowColor = '#000'; x.shadowBlur = 6; x.fillText(P.nick, 128, 44);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(c, true, false), transparent: true, depthTest: true, opacity: 0.85 })); tag.scale.set(0.8, 0.2, 1); tag.position.y = 2.0; g.add(tag);
    // the chosen character replaces the stand-in body once its model has loaded (head group stays for the torch)
    const chr = makeCharacter(P.ch || 'f', g);
    if (chr) { for (const o of [...g.children]) if (o !== head && o !== tag && !legs.includes(o) && !arms.includes(o)) o.visible = false; for (const o of [...legs, ...arms]) o.visible = false; for (const o of head.children) if (o.isMesh) o.visible = false; g.add(chr.inner); }
    g.userData = { legs, arms, head, hand, spot: sp, phase: 0, chr, tag };
    WORLD.root.parent.add(g); P.avatar = g;
    P.tpos.copy(P.pos); g.position.copy(P.pos);
  }
}
function updateAvatars(dt) {
  for (const P of G.players) {
    const a = P.avatar; if (!a) continue; a.visible = P.alive;
    const off = a.userData.off || (a.userData.off = new V3()); a.position.sub(off);
    a.position.lerp(P.tpos, clamp(dt * 12, 0, 1)); P.pos.copy(a.position);
    a.position.add(stbAvatarOffset(P, off));
    let dy = angDiff(a.rotation.y, P.yaw); a.rotation.y += dy * clamp(dt * 12, 0, 1);
    const u = a.userData; u.head.rotation.x = P.pitch;
    a.scale.y = lerp(a.scale.y, P.crouch ? 0.64 : 1, clamp(dt * 9, 0, 1));
    const sp = P.ride ? 0 : P.moving; u.phase += dt * sp * 4.2;
    if (u.chr) { a.scale.y = 1; animateCharacter(u.chr, P, performance.now() / 1000, dt); u.head.position.y = 1.62 - 0.46 * u.chr.cw; u.tag.position.y = 2.0 - 0.46 * u.chr.cw; }
    u.legs[0].rotation.x = Math.sin(u.phase) * 0.5 * Math.min(1, sp); u.legs[1].rotation.x = -Math.sin(u.phase) * 0.5 * Math.min(1, sp);
    u.arms[0].rotation.x = -Math.sin(u.phase) * 0.35 * Math.min(1, sp); u.arms[1].rotation.x = P.held >= 0 ? -1.1 + P.pitch * 0.6 : Math.sin(u.phase) * 0.35 * Math.min(1, sp);
    u.spot.intensity = P.flash && P.alive ? 40 * PL.flashFlicker : 0;
    if (sp > 0.5 && !P.crouch) { P.stepT = (P.stepT || 0) - dt * sp / 1.9; if (P.stepT <= 0) { P.stepT = 0.55; sfxAt(stepSound(P.pos), a.position.clone().setY(a.position.y + 0.05), 0.55); } }
  }
}
function stepSound(p) { const ri = roomIdxAt(p.x, p.z, p.y); if (ri < 0 || ROOMS[ri].outdoor) return MAP.outsideStep(p); const f = ROOMS[ri].floor; return f.startsWith('carpet') || f === 'shavings' ? 'step_carpet' : f === 'arenaSand' ? 'step_grass' : f === 'aislePave' ? 'step_concrete' : (f === 'checkerF' || f === 'bathF' || f === 'marbleF') ? 'step_tile' : f === 'concreteF' ? 'step_concrete' : 'step_wood'; }

// ---------------------------------------------------------------- movement
const _f = new V3(), _r = new V3();
function collidePlayer(p, r) {
  for (let pass = 0; pass < 2; pass++) {
    for (const c of COLL) {
      if ((c.h < 0.25 && c.furn) || !collAt(c, p.y)) continue;
      const cx = clamp(p.x, c.x0, c.x1), cz = clamp(p.z, c.z0, c.z1), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
        else { const l = p.x - c.x0, rr2 = c.x1 - p.x, n = p.z - c.z0, f = c.z1 - p.z, m = Math.min(l, rr2, n, f); if (m === l) p.x = c.x0 - r; else if (m === rr2) p.x = c.x1 + r; else if (m === n) p.z = c.z0 - r; else p.z = c.z1 + r; }
      }
    }
    for (const D of DOORS) {
      if (Math.abs(D.y - p.y) > 1.2 || D.angle > 0.03 || D.target > 0.03) continue;   // only a shut door blocks; an open or moving one never shoves you
      const s = doorSeg(D), ax = s[0], az = s[1], bx = s[2], bz = s[3];
      const vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz; let t = ((p.x - ax) * vx + (p.z - az) * vz) / L2; t = clamp(t, 0, 1);
      const qx = ax + vx * t, qz = az + vz * t, dx = p.x - qx, dz = p.z - qz, d = Math.hypot(dx, dz), rr2 = r * 0.85;
      if (d < rr2 && d > 1e-6) { p.x = qx + dx / d * rr2; p.z = qz + dz / d * rr2; }
    }
  }
}
function updatePlayer(dt) {
  const P = me(); if (!P) return;
  const cam = PL.cam;
  if (PL.deathT >= 0) { updateDeath(dt); return; }
  if (!P.alive) { updateSpectator(dt); return; }
  const k = PL.keys, blocked = UI.journalOpen || UI.paused;
  if (stbMove(P, dt, blocked)) { playerState(P, dt, P.moving); return; }
  let mx = 0, mz = 0;
  if (!blocked) { if (k.KeyW || k.ArrowUp) mz -= 1; if (k.KeyS || k.ArrowDown) mz += 1; if (k.KeyA || k.ArrowLeft) mx -= 1; if (k.KeyD || k.ArrowRight) mx += 1; }
  const len = Math.hypot(mx, mz); if (len > 0) { mx /= len; mz /= len; }
  const sprint = !blocked && !PL.crouch && (k.ShiftLeft || k.ShiftRight) && len > 0 && PL.stamina > 0.02 && !PL.exhausted;
  PL.eyeH = lerp(PL.eyeH, PL.crouch ? 0.98 : 1.62, clamp(dt * 9, 0, 1)); P.crouch = PL.crouch;
  PL.stamina = clamp(PL.stamina + (sprint ? -dt / 3.2 : dt / 5), 0, 1);
  if (PL.stamina <= 0.02) PL.exhausted = true; if (PL.exhausted && PL.stamina > 0.35) PL.exhausted = false;
  const speed = sprint ? 3.5 : PL.crouch ? 1.05 : 1.95;
  const c = Math.cos(PL.yaw), s = Math.sin(PL.yaw);
  const wx = mx * c + mz * s, wz = -mx * s + mz * c;
  PL.vel.x = lerp(PL.vel.x, wx * speed, clamp(dt * 10, 0, 1)); PL.vel.z = lerp(PL.vel.z, wz * speed, clamp(dt * 10, 0, 1));
  P.pos.x += PL.vel.x * dt; P.pos.z += PL.vel.z * dt;
  collidePlayer(P.pos, 0.27);
  const gy = groundY(P.pos.x, P.pos.z, P.pos.y); P.pos.y = gy > P.pos.y ? lerp(P.pos.y, gy, clamp(dt * 14, 0, 1)) : Math.max(gy, P.pos.y - dt * 7);
  const hs = Math.hypot(PL.vel.x, PL.vel.z); P.moving = hs;
  PL.bob += dt * hs * (PL.crouch ? 5.5 : 4.3);
  PL.stepT -= dt * hs / 1.9; if (hs > 0.4 && PL.stepT <= 0) { PL.stepT = 0.55; sfx(stepSound(P.pos), sprint ? 0.55 : PL.crouch ? 0.15 : 0.4, 0.9 + Math.random() * 0.2); }
  const bobY = Math.sin(PL.bob * 2) * 0.035 * Math.min(1, hs / 2), bobX = Math.cos(PL.bob) * 0.02 * Math.min(1, hs / 2);
  cam.position.set(P.pos.x + bobX * c, P.pos.y + PL.eyeH + bobY, P.pos.z - bobX * s);
  cam.rotation.set(PL.pitch, PL.yaw, Math.sin(PL.bob) * 0.006 * hs, 'YXZ');
  P.yaw = PL.yaw; P.pitch = PL.pitch;
  // hand sway
  PL.hand.position.set(Math.cos(PL.bob) * 0.008, Math.sin(PL.bob * 2) * 0.01, 0);
  playerState(P, dt, hs);
}
function playerState(P, dt, hs) {
  P.room = logicalRoom(P.pos.x, P.pos.z, P.pos.y); P.inside = insideHouse(P.pos.x, P.pos.z, P.pos.y);
  const ri = roomIdxAt(P.pos.x, P.pos.z, P.pos.y);
  P.hidden = ri >= 0 && !!ROOMS[ri].closet && DOORS[ROOMS[ri].door].angle < 0.15;
  const h = heldItem(); P.held = h ? h.id : -1;
  // sanity
  if (P.inside && G.elapsed > 2 && STB.phase !== 'base') {
    const lit = P.room >= 0 && G.lights[P.room];
    let drain = lit ? 0 : 0.11 * (G.mp ? 1 : 1.4) * (P.room === G.ghostRoom ? 1.6 : 1);
    P.sanity = clamp(P.sanity - drain * dt, 0, 100);
  }
  // breath fog in the cold
  const temp = roomTemp(P.inside ? ri : -1);
  PL.breathT -= dt; if (temp < 0.5 && hs < 0.3 && PL.breathT <= 0) { PL.breathT = rr(7, 11); emitBreath(); }
  hotspot();
}
const _ray = new THREE.Raycaster();
function hotspot() {
  const P = me(), up = mounted(G.mySlot), A0 = riding(G.mySlot); _ray.setFromCamera({ x: 0, y: 0 }, PL.cam); _ray.far = up ? 3.4 : 2.1;
  const meshes = INTERACT.filter(o => o.kind === 'item' ? ITEMS[o.id].holder < 0 : o.kind === 'prop' ? PROPO[o.id] && PROPO[o.id].holder < 0 : o.kind === 'horse' ? HORSE.state === 'buck' && HORSE.calmT === null
    : o.kind === 'tack' ? STB.tack[o.id].at === 'rack' && MAP.id === 'barn' : o.kind === 'anim' ? !STB.animals[o.id].away && STB.animals[o.id] !== A0 : o.kind === 'wagon' ? !STB.wagon.away && !onWagon(G.mySlot) : o.kind === 'dog' ? DOG.on : true).map(o => o.mesh);
  const hits = _ray.intersectObjects(meshes, false);
  let hot = null;
  for (const hit of hits) {
    const o = INTERACT.find(q => q.mesh === hit.object); if (!o) continue;
    // walls between you and the target block interaction
    const wp = hit.point; if (!sightClear(P.pos.x, P.pos.z, lerp(P.pos.x, wp.x, 0.85), lerp(P.pos.z, wp.z, 0.85), P.pos.y, P.pos.y) && o.kind !== 'door') continue;
    hot = o; break;
  }
  PL.hot = hot;
  let text = '';
  if (hot) {
    if (hot.kind === 'door') { const D = DOORS[hot.id]; text = D.locked ? 'Locked' : (D.angle > 0.5 ? 'Close door' : 'Open door'); }
    else if (hot.kind === 'switch') text = G.lights[hot.id] ? 'Turn light off' : 'Turn light on (' + G.lights.filter(Boolean).length + '/4 lit)';
    else if (hot.kind === 'item') text = 'Pick up ' + ITEM_NAME[ITEMS[hot.id].type];
    else if (hot.kind === 'clip') text = 'File your verdict';
    else if (hot.kind === 'prop') text = 'Pick up ' + propName(PROPO[hot.id]);
    else if (hot.kind === 'cat') text = 'Pet ' + CATS[hot.id].def.name;
    else if (hot.kind === 'horse') text = 'Calm the horse';
    else if (hot.kind === 'tack' || hot.kind === 'anim' || hot.kind === 'wagon') text = stbPrompt(hot);
    else if (hot.kind === 'dog') text = 'Pet ' + DOG.name + ' · {V} Commands';
    else if (hot.kind === 'egg' && MAP.id === 'bayou') text = hot.id === 2 ? (G.gatorBait ? 'An empty bait bucket' : 'Toss the chicken necks into the bayou') : (G.eggOn ? 'The bell is still humming' : 'Ring the old dinner bell');
    else if (hot.kind === 'egg') text = MAP.id === 'barn' ? (G.eggOn ? 'An empty hook' : 'Take down Bonnie Blue\'s halter') : G.eggOn ? 'The tape is jammed in the slot' : 'Play the strange tape';
  }
  hudPrompt(text);
}
// ---------------------------------------------------------------- death & spectating
function beginDeath() {
  PL.deathT = 0; G.stats.died = true; sfx('scream', 1); sfx('scare', 0.8);
  document.getElementById('huntVig').classList.add('on');
}
function updateDeath(dt) {
  PL.deathT += dt; const t = PL.deathT, cam = PL.cam, gv = G.ghostView;
  // turn to face the ghost, then collapse
  const P = me(); const tx = gv.x - P.pos.x, tz = gv.z - P.pos.z; const want = Math.atan2(-tx, -tz);
  PL.yaw += angDiff(PL.yaw, want) * clamp(dt * 8, 0, 1); PL.pitch = lerp(PL.pitch, 0.12, dt * 6);
  const fall = smooth(1.4, 2.6, t);
  cam.position.set(P.pos.x, P.pos.y + lerp(PL.eyeH, 0.25, fall), P.pos.z);
  cam.rotation.set(PL.pitch + fall * 0.6, PL.yaw, fall * 1.2 + Math.sin(t * 30) * 0.02 * (1 - fall), 'YXZ');
  POST.death = smooth(0.0, 1.2, t);
  if (t > 3.3) {
    PL.deathT = -1; document.getElementById('huntVig').classList.remove('on');
    if (!G.mp || alivePlayers().length === 0) { /* host ends the round */ }
    else { UI.show('dead', true); setTimeout(() => UI.show('dead', false), 4500); }
    PL.spectate = true; PL.specPos = cam.position.clone().setY(FY + 1.7);
  }
}
function updateSpectator(dt) {
  const cam = PL.cam; const others = alivePlayers();
  POST.death = lerp(POST.death, 0.35, dt);
  if (others.length) {
    const T = others[PL.specIdx % others.length];
    const want = new V3(T.pos.x + Math.sin(T.yaw) * 1.6, T.pos.y + 2.0, T.pos.z + Math.cos(T.yaw) * 1.6);
    cam.position.lerp(want, clamp(dt * 4, 0, 1)); cam.lookAt(T.pos.x, T.pos.y + 1.3, T.pos.z);
    hudPrompt('Watching ' + T.nick + ' · E to switch');
  }
}
// breath particles
const BREATH = [];
let breathMat = null;
function emitBreath() {
  if (!breathMat) { const [c, x] = mkCanvas(64, 64); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); breathMat = new THREE.SpriteMaterial({ map: canvasTex(c, true, false), transparent: true, depthWrite: false, opacity: 0.0 }); }
  sfx('breath', 0.5);
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Sprite(breathMat.clone()); const cam = PL.cam;
    const f = new V3(0, -0.06, -0.35).applyQuaternion(cam.quaternion);
    s.position.copy(cam.position).add(f); s.scale.setScalar(0.08);
    s.userData = { v: new V3(0, -0.04, -0.4).applyQuaternion(cam.quaternion).add(new V3(rr(-0.05, 0.05), rr(0, 0.05), rr(-0.05, 0.05))), t: -i * 0.06 };
    WORLD.root.parent.add(s); BREATH.push(s);
  }
}
function updateBreath(dt) {
  for (let i = BREATH.length - 1; i >= 0; i--) {
    const s = BREATH[i], u = s.userData; u.t += dt; if (u.t < 0) { s.visible = false; continue; } s.visible = true;
    s.position.addScaledVector(u.v, dt); u.v.multiplyScalar(1 - dt * 1.5); s.scale.setScalar(0.06 + u.t * 0.22);
    s.material.opacity = 0.12 * Math.sin(Math.PI * clamp(u.t / 1.4, 0, 1));
    if (u.t > 1.4) { s.parent.remove(s); s.material.dispose(); BREATH.splice(i, 1); }
  }
}
