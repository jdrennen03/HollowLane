// ---------------------------------------------------------------- the grand music box in the Hollow Lane living room
// Look in (E) and you see a little dark stage. Wind it up (E) and it plays its piece, about forty seconds long:
//   1. a slow country banjo; two rearing horse statues turn round each other like a tornado, frozen mid-fight, while a
//      soft woman's voice says "Since the start of time, horses have always been nature. Then…"
//   2. a gunshot. The two horses break apart and fall into the dark, Napoleon on his horse rises into view, ringing, and
//      for ten seconds there is shouting, frantic hooves and screaming horses while the background whirls
//   3. it calms: a fancy waltz, and an Arabian pulling a stagecoach trots in down a city street (vendors calling, the
//      poor asking for change), then the view pulls back out of the box and you're in the living room again.
// It's only for whoever is looking; the house carries on (in solo the game waits for you). Watch it as often as you like.
const MBOX = { x: 6.5, z: 3.5, ry: Math.PI / 2 };   // front faces -x, into the room
const CINE = { on: false, stage: '', t: 0, scene: null, cam: null, ready: false, loading: false, parts: {}, audio: [], timers: [] };

// ---------- the box itself
function buildMusicBox(gb, root) {
  const f = fur(gb, MBOX.x, MBOX.z, MBOX.ry, FY);
  // a cabinet on turned legs, the box on top with brass corners, the lid propped open
  for (const [a, b] of [[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]]) { f.cyl('darkWood', a, 0.3, b, 0.035, 0.05, 0.6, 8); f.sphere('brass', a, 0.03, b, 0.045); }
  f.box('darkWood', 0, 0.66, 0, 1.18, 0.12, 0.76); f.box('brass', 0, 0.6, -0.385, 1.1, 0.02, 0.01);
  f.box('darkWood', 0, 0.98, 0, 1.06, 0.52, 0.68); f.box('darkWood', 0, 1.25, 0, 1.12, 0.04, 0.74);
  for (const y of [0.74, 1.22]) { f.box('brass', 0, y, -0.345, 1.08, 0.025, 0.012); f.box('brass', 0, y, 0.345, 1.08, 0.025, 0.012); }
  for (const a of [-0.53, 0.53]) for (const b of [-0.34, 0.34]) { f.box('brass', a, 0.98, b, 0.05, 0.54, 0.05); f.sphere('brass', a, 1.29, b, 0.035); }
  f.box('darkWood', 0, 1.56, 0.42, 1.08, 0.04, 0.66, 0, -1.15); f.box('brass', 0, 1.57, 0.4, 0.9, 0.012, 0.5, 0, -1.15);   // the lid, tipped back
  f.box('porcelain', 0, 1.275, 0.02, 0.9, 0.012, 0.56);   // the comb and cylinder under a glass top
  f.cyl('brass', 0, 1.3, 0.02, 0.06, 0.06, 0.7, 12, 0, Math.PI / 2);
  // the crank on the right side
  { const [x, z] = f.pt(0.6, 0.05); gb.cyl('brass', x, FY + 1.0, z, 0.02, 0.02, 0.12, 8, MBOX.ry, 0, Math.PI / 2); const [x2, z2] = f.pt(0.67, 0.05); gb.box('brass', x2, FY + 0.93, z2, 0.02, 0.16, 0.03, MBOX.ry); const [x3, z3] = f.pt(0.7, 0.05); gb.cyl('darkWood', x3, FY + 0.86, z3, 0.025, 0.025, 0.08, 8, MBOX.ry, 0, Math.PI / 2); }
  // the window you look through: a brass ring round warm, faintly lit glass
  { const [x, z] = f.pt(0, -0.345); const ringG = new THREE.TorusGeometry(0.13, 0.025, 10, 28), ring = new THREE.Mesh(ringG, MATS.brass); ring.position.set(x, FY + 1.0, z); ring.rotation.y = MBOX.ry; root.add(ring);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.13, 28), new THREE.MeshStandardMaterial({ color: 0x1a120a, emissive: 0xffb15c, emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.1 })); glass.position.set(x, FY + 1.0, z); glass.rotation.y = MBOX.ry + Math.PI; root.add(glass);
    WORLD_EXTRA.mboxGlass = glass; MBOX.eye = new V3(x - Math.sin(MBOX.ry) * 0.16, FY + 1.0, z - Math.cos(MBOX.ry) * 0.16); }
  const [hx, hz] = f.pt(0, 0); const hit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.3, 0.8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(hx, FY + 0.75, hz); hit.rotation.y = MBOX.ry; root.add(hit);
  INTERACT.push({ mesh: hit, kind: 'mbox', id: 0 });
  f.solid(-0.6, -0.4, 0.6, 0.4, 1.3);
}

// ---------- the little world inside: built the first time someone looks in
function cineBuild() {
  if (CINE.scene || CINE.loading) return; CINE.loading = true;
  const S = new THREE.Scene(); S.background = new THREE.Color(0x000000);
  const cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 400);
  S.add(new THREE.HemisphereLight(0xc8d4ff, 0x20140a, 1.1));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.4); key.position.set(3, 8, 6); S.add(key);
  const rim = new THREE.DirectionalLight(0x8fb4ff, 1.4); rim.position.set(-6, 4, -5); S.add(rim);
  const warm = new THREE.PointLight(0xffa850, 0, 30, 1.5); warm.position.set(0, 4, 4); S.add(warm);
  const fire = new THREE.PointLight(0xff9a5a, 0, 14, 1.2); fire.position.set(0.6, 2.4, 3.2); S.add(fire);   // firelight on Napoleon
  // the whirling backdrop: a big sphere seen from inside, a spiral that turns round the view
  const U = { uTime: { value: 0 }, uSpin: { value: 0.15 }, uA: { value: new THREE.Color(0x1d2a38) }, uB: { value: new THREE.Color(0x070a10) }, uFade: { value: 1 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 48, 24), new THREE.ShaderMaterial({ uniforms: U, side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime, uSpin, uFade; uniform vec3 uA, uB; varying vec3 vD;
      void main(){ float r = acos(clamp(-vD.z, -1.0, 1.0)); float a = atan(vD.y, vD.x);
        float s = sin(a * 4.0 + r * 9.0 - uTime * uSpin * 6.0) * 0.5 + 0.5; float s2 = sin(a * 7.0 - r * 14.0 + uTime * uSpin * 4.0) * 0.5 + 0.5;
        vec3 c = mix(uB, uA, smoothstep(0.25, 0.9, s * 0.7 + s2 * 0.3)) * (0.55 + 0.45 * smoothstep(1.6, 0.2, r));
        gl_FragColor = vec4(c * uFade, 1.0); }` }));
  sky.renderOrder = -1; S.add(sky);
  // suspended dust in a funnel round the fighting horses: it barely moves, as if time had stopped
  const N = 1400, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { const h = Math.random(), r = 0.4 + h * 2.6 + Math.random() * 0.5, a = Math.random() * 6.283; pos.set([Math.cos(a) * r, h * 4.2 - 0.6, Math.sin(a) * r], i * 3); seed[i] = Math.random(); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const PU = { uTime: { value: 0 }, uSpin: { value: 0.05 }, uAlpha: { value: 0 }, uCol: { value: new THREE.Color(0xc9d6e6) } };
  const dust = new THREE.Points(pg, new THREE.ShaderMaterial({ uniforms: PU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime, uSpin; attribute float seed; varying float vS;
      void main(){ vec3 p = position; float r = length(p.xz); float a = atan(p.z, p.x) + uTime * uSpin * (2.5 / max(r, 0.4)); p.xz = vec2(cos(a), sin(a)) * r;
        vS = seed; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = (1.5 + seed * 2.5) * 16.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'uniform float uAlpha; uniform vec3 uCol; varying float vS; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uCol, smoothstep(0.5, 0.0, d) * uAlpha * (0.4 + vS * 0.6)); }' }));
  dust.frustumCulled = false; S.add(dust);
  // the street for the last part: cobbles, gas lamps and a row of lit house fronts that slide past
  const city = new THREE.Group(); city.visible = false; S.add(city);
  const cob = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#2a241d'; x.fillRect(0, 0, 256, 256);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const o = (j % 2) * 8; x.fillStyle = `hsl(30,${10 + Math.random() * 10}%,${18 + Math.random() * 12}%)`; x.beginPath(); x.ellipse(i * 16 + o + 8, j * 16 + 8, 7, 6.5, 0, 0, 6.283); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 3); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 16), new THREE.MeshStandardMaterial({ map: cob, roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -1); city.add(ground);
  const fronts = new THREE.Group(); city.add(fronts);
  const winTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#3b2c22'; x.fillRect(0, 0, 128, 256);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) { const lit = Math.random() < 0.7; x.fillStyle = lit ? '#ffcf7a' : '#1a1410'; x.fillRect(20 + i * 52, 30 + j * 72, 36, 50); x.fillStyle = '#2a1e16'; x.fillRect(36 + i * 52, 30 + j * 72, 3, 50); x.fillRect(20 + i * 52, 52 + j * 72, 36, 3); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  for (let i = 0; i < 14; i++) {
    const w = 3.2 + Math.random() * 1.6, h = 7 + Math.random() * 4, col = new THREE.Color().setHSL(0.06 + Math.random() * 0.05, 0.25, 0.18 + Math.random() * 0.1);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2), [new THREE.MeshStandardMaterial({ color: col }), new THREE.MeshStandardMaterial({ color: col }), new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.6) }), new THREE.MeshStandardMaterial({ color: col }), new THREE.MeshStandardMaterial({ map: winTex, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.55 }), new THREE.MeshStandardMaterial({ color: col })]);
    b.position.set(-28 + i * 4.3, h / 2, -7.5); fronts.add(b);
  }
  for (let i = 0; i < 8; i++) { const lamp = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.4, 8), new THREE.MeshStandardMaterial({ color: 0x15130f, metalness: 0.6, roughness: 0.4 })); pole.position.y = 1.7; lamp.add(pole);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd28a })); glow.position.y = 3.45; lamp.add(glow); lamp.position.set(-28 + i * 8, 0, -5.2); fronts.add(lamp); }
  Object.assign(CINE, { scene: S, cam, U, sky, dust, PU, warm, fire, key, rim, city, fronts, cob });
  // the four figures
  const want = [['statue', 'prop-mbstatue.json', 'y', 2.3], ['napoleon', 'prop-napoleon.json', 'y', 2.6], ['arabian', 'prop-arabian.json', 'y', 2.15], ['coach', 'prop-stagecoach.json', 'y', 2.7]];
  let left = want.length;
  for (const [k, url, ax, size] of want) loadModelFile(url, gl => {
    const m = gl.scene; m.traverse(o => { if (o.isMesh && !o.material.isMeshBasicMaterial) o.material = leanMat(Array.isArray(o.material) ? o.material[0] : o.material); });   // the scanned horse is unlit: its light is in its texture m.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(m), sz = b.getSize(new V3()), s = size / sz[ax], inner = new THREE.Group(); inner.add(m); inner.scale.setScalar(s);
    inner.position.set(-(b.min.x + sz.x / 2) * s, -b.min.y * s, -(b.min.z + sz.z / 2) * s);
    const g = new THREE.Group(); g.add(inner); g.userData.len = sz.x * s; CINE.parts[k] = g;
    if (--left === 0) cineAssemble();
  }, e => { console.warn('music box model', url, e); if (--left === 0) cineAssemble(); });
}
// the statue twice (back to back on the turntable), Napoleon, and the Arabian in the stagecoach's shafts
function cineAssemble() {
  const P = CINE.parts, S = CINE.scene;
  const fight = new THREE.Group(); S.add(fight); CINE.fight = fight; CINE.duel = [];
  if (P.statue) for (const sd of [1, -1]) {   // the models face -x: each rears toward the middle, the two facing opposite ways
    const h = sd > 0 ? P.statue : P.statue.clone(true); h.position.set(sd * 0.75, 0, 0); h.rotation.y = sd > 0 ? 0 : Math.PI; fight.add(h); CINE.duel.push({ g: h, sd, vel: new V3(), spin: new V3() });
  }
  if (P.napoleon) { P.napoleon.rotation.y = -Math.PI / 2; P.napoleon.visible = false; S.add(P.napoleon); CINE.nap = P.napoleon; }
  const team = new THREE.Group(); team.visible = false; S.add(team); CINE.team = team;
  if (P.coach) { team.add(P.coach); }
  if (P.arabian) {   // the horse ahead of the coach, its hindquarters at the end of the shafts
    const front = P.coach ? -P.coach.userData.len / 2 : 0; P.arabian.position.x = front - P.arabian.userData.len / 2 + 0.9; team.add(P.arabian);
  }
  CINE.ready = true; CINE.loading = false;
  if (CINE.on && CINE.stage === 'look') cineHint();
}

// ---------- open, wind, close
function cineOpen() {
  if (CINE.on || MAP.id !== 'lane' || !MBOX.eye) return;
  initAudio(); cineBuild();
  Object.assign(CINE, { on: true, stage: 'in', t: 0, from: PL.cam.position.clone(), fromQ: PL.cam.quaternion.clone() });
  document.body.classList.add('cine'); PL.keys = {};
  sfx('creak', 0.5, 1.4);
  cineHint();
}
function cineHint() {
  const el = $('cineHint'); if (!el) return;
  el.textContent = CINE.stage === 'look' ? (CINE.ready ? 'E  wind it up      Esc  step back' : 'The music box creaks open…') : CINE.stage === 'play' ? 'Esc  step back' : '';
}
function cineWind() {
  if (!CINE.ready || CINE.stage !== 'look') return;
  CINE.stage = 'play'; CINE.t = 0; CINE.shotT = -1; CINE.calmT = -1; cineHint();
  sfx('click', 0.8); for (let i = 0; i < 6; i++) CINE.timers.push(setTimeout(() => sfx('click', 0.5, 0.7 + i * 0.05), 120 + i * 140));
  CINE.timers.push(setTimeout(() => { CINE.audio.push(cinePlay(cineMusic('banjo'), 0.75, true)); }, 900));
  CINE.timers.push(setTimeout(() => cineSay("Since the start of time, horses have always been nature. Then…", 'narrator', () => { if (CINE.shotT < 0) CINE.shotAt = Math.min(CINE.shotAt, CINE.t + 0.6); }), 3200));
  CINE.shotAt = 13.5;   // the gunshot comes just after the line ends (or here, if no voice is available)
}
// leave the box: from the show it's the slow pull back out; from just looking it's straight out
function cineBack() {
  if (!CINE.on) return;
  if (CINE.stage === 'play') { CINE.stage = 'outro'; CINE.oT = 0; cineHint(); return; }
  if (CINE.stage === 'look' || CINE.stage === 'in') cineLeave();
}
function cineLeave() { CINE.stage = 'exit'; CINE.t = 0; cineStopAudio(1.2); cineHint(); }
function cineStopAudio(fade = 0.5) {
  for (const t of CINE.timers) clearTimeout(t); CINE.timers = [];
  for (const a of CINE.audio) a.stop(fade); CINE.audio = [];
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { }
}
function cineEnd() {
  CINE.on = false; CINE.stage = ''; document.body.classList.remove('cine'); $('cineIris').style.opacity = 0; cineHint();
  if (G.state === 'play' && !PL.locked) requestLock($('gl'));
}

// ---------- every frame: the camera in and out, the show's timeline. Returns true while the little world is on screen.
function updateCine(dt) {
  if (!CINE.on) return false;
  const P = me(); if (!P || !P.alive || G.state !== 'play' || MAP.id !== 'lane') { cineStopAudio(0.2); cineEnd(); return false; }
  CINE.t += dt; const cam = PL.cam, eye = MBOX.eye, iris = $('cineIris');
  const lookAt = new V3(MBOX.x, FY + 1.0, MBOX.z), q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye, lookAt, new V3(0, 1, 0)));
  if (CINE.stage === 'in') {   // lean in to the glass, the view closing to a circle, then through
    const k = smooth01(CINE.t / 1.1); cam.position.lerpVectors(CINE.from, eye, k); cam.quaternion.slerpQuaternions(CINE.fromQ, q, k);
    iris.style.opacity = clamp((CINE.t - 0.7) / 0.4, 0, 1);
    if (CINE.t > 1.15) { CINE.stage = 'look'; CINE.t = 0; cineHint(); }
    return false;
  }
  if (CINE.stage === 'exit') {   // back out of the glass to where you were standing
    if (CINE.t <= dt) iris.style.setProperty('--iris', '100%');
    const k = smooth01(CINE.t / 1.3); cam.position.lerpVectors(eye, CINE.from, k); cam.quaternion.slerpQuaternions(q, CINE.fromQ, k);
    iris.style.opacity = 1 - clamp(CINE.t / 0.5, 0, 1);
    if (CINE.t > 1.3) cineEnd();
    return false;
  }
  iris.style.opacity = 1;   // inside the box: the round window frames the view
  cineAnimate(dt);
  CINE.cam.aspect = innerWidth / innerHeight; CINE.cam.updateProjectionMatrix();
  return true;
}
const smooth01 = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
function cineAnimate(dt) {
  const C = CINE, cam = C.cam, t = C.stage === 'look' ? 0 : C.t, U = C.U, PU = C.PU;
  U.uTime.value += dt; PU.uTime.value += dt;
  const fight = C.fight, nap = C.nap, team = C.team;
  if (C.stage === 'look' || !C.ready) {   // the stage at rest: the two horses frozen, lit from above
    cam.position.set(0, 1.45, 6.2); cam.lookAt(0, 1.15, 0);
    U.uSpin.value = 0.04; PU.uAlpha.value = 0.25; PU.uSpin.value = 0.01; C.warm.intensity = 0;
    if (fight) { fight.rotation.y += dt * 0.05; fight.visible = true; for (const d of C.duel) { d.g.position.set(d.sd * 0.75, 0, 0); d.g.rotation.set(0, d.sd > 0 ? 0 : Math.PI, 0); } }
    return;
  }
  // 1 · the duel: a slow tornado, banjo and the narrator
  if (C.shotT < 0) {
    cam.position.set(Math.sin(t * 0.13) * 0.6, 1.5 + Math.sin(t * 0.2) * 0.1, 6.0 - Math.min(t, 10) * 0.08); cam.lookAt(0, 1.2, 0);
    U.uSpin.value = 0.12; U.uA.value.set(0x24364a); U.uB.value.set(0x05070c); PU.uAlpha.value = Math.min(0.6, 0.25 + t * 0.06); PU.uSpin.value = 0.02;
    if (fight) { fight.rotation.y += dt * 0.55; fight.position.y = Math.sin(t * 0.8) * 0.06; for (const d of C.duel) d.g.rotation.z = Math.sin(t * 0.7 + d.sd) * 0.04; }
    if (t >= C.shotAt && C.stage === 'play') cineShot();
    return cineOutro(dt);
  }
  const s = t - C.shotT;
  // 2 · the gunshot and ten seconds of chaos
  if (C.calmT < 0) {
    const sh = Math.max(0, 1 - s * 1.5) * 0.25 + 0.04;
    cam.position.set((Math.random() - 0.5) * sh, 1.6 + (Math.random() - 0.5) * sh, 7.2); cam.lookAt(0, 1.3, 0);
    U.uSpin.value = lerp(U.uSpin.value, 1.4, dt * 2); U.uA.value.lerp(new THREE.Color(0x7a2412), dt * 2); U.uB.value.lerp(new THREE.Color(0x120402), dt * 2);
    PU.uSpin.value = lerp(PU.uSpin.value, 0.9, dt * 2); PU.uCol.value.set(0xffb27a); PU.uAlpha.value = lerp(PU.uAlpha.value, 0.5, dt * 2); C.warm.intensity = 30 * Math.max(0, 1 - s * 2); C.fire.intensity = 26 * (0.85 + 0.15 * Math.sin(s * 23) * Math.sin(s * 7));
    for (const d of C.duel) { d.vel.y -= 9.8 * dt * 0.45; d.g.position.addScaledVector(d.vel, dt); d.g.rotation.x += d.spin.x * dt; d.g.rotation.z += d.spin.z * dt; if (d.g.position.y < -30) d.g.visible = false; }
    if (nap) { const r = smooth01(s / 1.6); nap.visible = true; nap.position.y = lerp(-7, 0, r); nap.rotation.y = -Math.PI / 2 + (1 - r) * Math.PI * 4 + Math.sin(s * 0.9) * 0.4; nap.scale.setScalar(0.6 + r * 0.4); }
    if (s >= 10 && C.stage === 'play') cineCalm();
    return cineOutro(dt);
  }
  // 3 · the city: the waltz, the coach trots in, the street rolls past
  const c = t - C.calmT;
  U.uSpin.value = lerp(U.uSpin.value, 0.05, dt * 1.5); U.uFade.value = lerp(U.uFade.value, 0.15, dt * 0.8); U.uA.value.lerp(new THREE.Color(0x4a3420), dt); U.uB.value.lerp(new THREE.Color(0x0c0805), dt);
  PU.uAlpha.value = Math.max(0, PU.uAlpha.value - dt * 0.6); C.fire.intensity = Math.max(0, C.fire.intensity - dt * 20); C.warm.intensity = lerp(C.warm.intensity, 12, dt); C.warm.position.set(-2, 5, 5);
  if (nap) { nap.position.y -= dt * 3; nap.rotation.y += dt * 0.8; if (nap.position.y < -12) nap.visible = false; }
  C.city.visible = true; C.cob.offset.x = -c * 2.6 / (80 / 12);   // the street rolls toward the back of the coach
  for (const b of C.fronts.children) { const span = b.isGroup ? 64 : 60.2; b.position.x += dt * 2.6; if (b.position.x > span / 2) b.position.x -= span; }
  if (team) { team.visible = true; const k = smooth01(c / 3.8); team.position.x = lerp(16, 1.2, k); const bob = Math.abs(Math.sin(c * Math.PI * 2.1)); team.children.forEach((g, i) => { g.position.y = (g === C.parts.arabian ? 0.05 : 0.02) * bob; }); }
  cam.position.set(0, 2.1, 11); cam.lookAt(0, 1.4, 0);
  if (c > 19 && C.stage === 'play') { C.stage = 'outro'; C.oT = 0; cineHint(); }
  cineOutro(dt);
}
// the end (or Esc): the view pulls slowly back and the round window closes, then you're back in the room
function cineOutro(dt) {
  const C = CINE; if (C.stage !== 'outro') return;
  C.oT += dt; const z = smooth01(C.oT / 3.2);
  C.cam.position.z += z * 18; C.cam.position.y += z * 3;
  $('cineIris').style.setProperty('--iris', (1 - smooth01((C.oT - 1.8) / 1.5)) * 100 + '%');
  if (C.oT > 3.4) cineLeave();
}
function cineShot() {
  const C = CINE; C.shotT = C.t; cineStopAudio(0.05);
  cinePlay(cineMusic('gunshot'), 1.0); flashWhite();
  for (const d of C.duel) { d.vel.set(d.sd * 3.4, 2.2, (Math.random() - 0.5) * 1.5); d.spin.set((Math.random() - 0.5) * 3, 0, -d.sd * 2.4); }
  C.timers.push(setTimeout(() => sfx('bell', 0.55, 1.3), 300));
  // the chaos: shouting, galloping, screaming horses, more shots in the distance
  C.audio.push(cinePlay(cineMusic('stampede'), 0.8, true));
  C.audio.push(cinePlay(cineMusic('yells'), 0.65, true));
  for (let i = 0; i < 9; i++) C.timers.push(setTimeout(() => sfx('whinny', 0.4 + Math.random() * 0.3, 0.85 + Math.random() * 0.45), 400 + i * 1050 + Math.random() * 500));
  for (let i = 0; i < 5; i++) C.timers.push(setTimeout(() => cinePlay(cineMusic('gunshot'), 0.25 + Math.random() * 0.2, false, 0.8 + Math.random() * 0.4), 1800 + i * 1700 + Math.random() * 600));
  const shouts = ['Charge!', 'Hold the line!', 'Fire!', 'Get them out of here!', 'Retreat! Retreat!'];
  shouts.forEach((w, i) => C.timers.push(setTimeout(() => cineSay(w, 'shout'), 900 + i * 1800)));
}
function cineCalm() {
  const C = CINE; C.calmT = C.t; cineStopAudio(1.5);
  C.audio.push(cinePlay(cineMusic('waltz'), 0.7, true));
  C.audio.push(cinePlay(cineMusic('city'), 0.45, true));
  C.audio.push(cinePlay(cineMusic('trot'), 0.5, true));
  const calls = [['Fresh bread! Hot from the oven!', 'vendor'], ['Spare a coin, sir? Anything at all…', 'beggar'], ['Apples! Two for a penny!', 'vendor'], ['Newspaper! Read all about it!', 'vendor'], ['Please, miss… just a little change…', 'beggar'], ['Hot chestnuts! Get your chestnuts!', 'vendor'], ['God bless you, God bless…', 'beggar']];
  calls.forEach(([w, who], i) => C.timers.push(setTimeout(() => cineSay(w, who), 1500 + i * 2500)));
}
function flashWhite() { const el = $('cineFlash'); if (!el) return; el.style.transition = 'none'; el.style.opacity = 1; requestAnimationFrame(() => { el.style.transition = 'opacity 0.9s'; el.style.opacity = 0; }); }

// ---------- voices: the browser's speech, with a subtitle in case there's none
const CINE_VOICES = {};
function cineSay(text, who, onEnd) {
  if (who === 'narrator') sub('“' + text + '”', 'ghost');
  try {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { onEnd && onEnd(); return; }
    const vs = speechSynthesis.getVoices(), en = vs.filter(v => /^en/i.test(v.lang));
    const fem = en.find(v => /female|samantha|victoria|karen|zira|susan|serena|moira|tessa|fiona|google us english|libby|sonia|jenny|aria/i.test(v.name)), male = en.find(v => /male|daniel|alex|fred|david|mark|guy|ryan|george/i.test(v.name) && !/female/i.test(v.name));
    const u = new SpeechSynthesisUtterance(text), cfg = { narrator: [fem, 1.05, 0.78, 1], shout: [male, 0.6, 1.35, 0.9], vendor: [male || fem, 0.9 + Math.random() * 0.3, 1.15, 0.55], beggar: [fem || male, 0.75, 0.85, 0.4] }[who] || [null, 1, 1, 1];
    if (cfg[0] || en[0]) u.voice = cfg[0] || en[0]; u.pitch = cfg[1]; u.rate = cfg[2]; u.volume = cfg[3] * AU.vol;
    if (onEnd) u.onend = onEnd;
    speechSynthesis.speak(u);
  } catch (e) { onEnd && onEnd(); }
}

// ---------- the music and the soundscape, made on the spot (once) like the rest of the game's sounds
const CINE_BUF = {};
function cinePlay(buf, vol = 1, loop = false, rate = 1) {
  const none = { stop() { } }; if (!AU.ready || !buf) return none;
  const ctx = AU.ctx, s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; s.loop = loop; s.playbackRate.value = rate; g.gain.value = vol;
  s.connect(g); g.connect(AU.master); g.connect(AU.revIn); s.start();
  return { stop(fade = 0.5) { try { g.gain.setTargetAtTime(0, ctx.currentTime, Math.max(0.01, fade / 3)); s.stop(ctx.currentTime + fade + 0.1); } catch (e) { } } };
}
function cineMusic(name) {
  if (CINE_BUF[name] || !AU.ctx) return CINE_BUF[name] || null;
  const sr = AU.ctx.sampleRate, mk = (sec, fn) => { const b = AU.ctx.createBuffer(1, (sec * sr) | 0, sr); fn(b.getChannelData(0)); return b; };
  const N = () => Math.random() * 2 - 1, hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // a plucked string (Karplus-Strong): bright and quick for the banjo, rounder and longer for the harpsichord
  const pluck = (d, at, f, amp, decay, bright, len) => {
    const P = Math.max(2, Math.round(sr / f)), ring = new Float32Array(P); let lp = 0;
    for (let i = 0; i < P; i++) { lp = lp * (1 - bright) + N() * bright; ring[i] = lp; }
    const s0 = (at * sr) | 0, n = Math.min(d.length - s0, (len * sr) | 0); let k = 0;
    for (let i = 0; i < n; i++) { const a = ring[k], b = ring[(k + 1) % P], y = (a + b) * 0.5 * decay; d[s0 + i] += a * amp * (i < 40 ? i / 40 : 1); ring[k] = y; k = (k + 1) % P; }
  };
  const norm = (d, p) => { let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); if (m) for (let i = 0; i < d.length; i++) d[i] *= p / m; return d; };
  if (name === 'banjo') {   // a slow forward roll in G, eight bars, then round again
    const beat = 60 / 76 / 2, bars = [[55, 59, 62, 67, 71], [55, 59, 62, 67, 74], [48, 60, 64, 67, 72], [48, 60, 64, 67, 71], [50, 62, 66, 69, 69], [50, 62, 66, 69, 74], [55, 59, 62, 67, 67], [50, 62, 66, 69, 71]];
    const mel = [71, 74, 72, 71, 69, 74, 67, 66];
    return CINE_BUF[name] = mk(bars.length * 8 * beat + 1.5, d => {
      bars.forEach((ch, b) => { const roll = [ch[0], ch[3], 79, ch[1], ch[4], 79, ch[2], mel[b]];   // 79: the high G drone string
        roll.forEach((m, i) => pluck(d, (b * 8 + i) * beat, hz(m), i === 0 ? 0.9 : m === 79 ? 0.35 : 0.6, 0.994, 0.85, 1.4));
        pluck(d, b * 8 * beat, hz(mel[b]), 0.8, 0.996, 0.7, 2.2); });
      norm(d, 0.8);
    });
  }
  if (name === 'waltz') {   // a courtly waltz in D on a harpsichord: oom on the bass, pah-pah on the chord, a tune over the top
    const beat = 60 / 138, prog = [[50, 66, 69], [50, 66, 69], [57, 64, 67], [57, 64, 67], [55, 67, 71], [50, 66, 69], [57, 64, 67], [50, 66, 69]];
    const tune = [[74, 2], [73, 1], [74, 1], [76, 1], [78, 1], [79, 3], [76, 2], [73, 1], [71, 2], [74, 1], [78, 3], [76, 2], [74, 1], [73, 2], [76, 1], [74, 3]];
    const len = prog.length * 3 * beat * 2;
    return CINE_BUF[name] = mk(len + 2, d => {
      for (let rep = 0; rep < 2; rep++) { const o = rep * prog.length * 3 * beat;
        prog.forEach((ch, b) => { pluck(d, o + b * 3 * beat, hz(ch[0] - 12), 0.8, 0.998, 0.5, 2.5); for (const k of [1, 2]) for (const m of ch.slice(1)) pluck(d, o + (b * 3 + k) * beat, hz(m), 0.32, 0.996, 0.55, 1.2); });
        let at = o; for (const [m, n] of tune) { pluck(d, at, hz(m), 0.75, 0.998, 0.6, n * beat + 0.8); at += n * beat; } }
      norm(d, 0.8);
    });
  }
  if (name === 'gunshot') return CINE_BUF[name] = mk(2.2, d => { let lp = 0; for (let i = 0; i < d.length; i++) { const t = i / sr; lp += (N() - lp) * (t < 0.01 ? 0.9 : 0.25); d[i] = lp * (t < 0.002 ? t / 0.002 : Math.exp(-t * 9)) * 1.4 + Math.sin(t * 6.283 * (70 - t * 30)) * Math.exp(-t * 6) * 0.8 + N() * 0.12 * Math.exp(-t * 2.2); } norm(d, 0.95); });
  if (name === 'stampede') return CINE_BUF[name] = mk(6, d => {   // dozens of horses at a flat-out gallop, three-beat bursts overlapping
    for (let h = 0; h < 14; h++) { const cyc = 0.42 + Math.random() * 0.12, off = Math.random() * cyc, vol = 0.3 + Math.random() * 0.7;
      for (let t0 = off; t0 < 6 - 0.3; t0 += cyc) for (const f of [0, 0.09, 0.18]) { const s0 = ((t0 + f) * sr) | 0; for (let i = 0; i < 0.12 * sr && s0 + i < d.length; i++) { const t = i / sr; d[s0 + i] += (Math.sin(t * 6.283 * (90 - t * 200)) + N() * 0.5) * Math.exp(-t * 45) * vol; } } }
    let lp = 0; for (let i = 0; i < d.length; i++) { lp += (d[i] - lp) * 0.25; d[i] = lp; } norm(d, 0.85);
  });
  if (name === 'yells') return CINE_BUF[name] = mk(7, d => {   // men shouting: rough vowels with a falling pitch, through two formants
    for (let k = 0; k < 16; k++) { const t0 = Math.random() * 6.2, dur = 0.4 + Math.random() * 0.7, f0 = 140 + Math.random() * 120, s0 = (t0 * sr) | 0, n = (dur * sr) | 0, F1 = 600 + Math.random() * 300, F2 = 1100 + Math.random() * 500; let ph = 0, b1 = 0, l1 = 0, b2 = 0, l2 = 0; const vol = 0.3 + Math.random() * 0.7;
      for (let i = 0; i < n && s0 + i < d.length; i++) { const t = i / n, f = f0 * (1.15 - 0.3 * t) * (1 + 0.03 * Math.sin(i / sr * 40)); ph += f / sr; const x = ((ph % 1) * 2 - 1) + N() * 0.3;
        const q1 = 2 * Math.sin(Math.PI * F1 / sr); const h1 = x - l1 - 0.3 * b1; b1 += q1 * h1; l1 += q1 * b1; const q2 = 2 * Math.sin(Math.PI * F2 / sr); const h2 = x - l2 - 0.3 * b2; b2 += q2 * h2; l2 += q2 * b2;
        d[s0 + i] += (b1 + b2 * 0.6) * Math.sin(Math.PI * t) ** 0.5 * vol; } }
    norm(d, 0.8);
  });
  if (name === 'city') return CINE_BUF[name] = mk(8, d => {   // a busy street: murmuring crowd, cart wheels, now and then a laugh
    let lp = 0, bp = 0; for (let i = 0; i < d.length; i++) { const t = i / sr; const syl = 0.5 + 0.5 * Math.sin(t * 6.283 * (3.1 + Math.sin(t * 0.7))) * Math.sin(t * 6.283 * 4.7 + 1); lp += (N() - lp) * 0.08; bp += (lp - bp) * 0.3; d[i] = (lp - bp) * (0.4 + syl * 0.6) + N() * 0.02; }
    for (let k = 0; k < 18; k++) { const s0 = (Math.random() * 7.8 * sr) | 0; for (let i = 0; i < 0.05 * sr && s0 + i < d.length; i++) d[s0 + i] += N() * Math.exp(-i / sr * 80) * 0.4; }
    norm(d, 0.7);
  });
  if (name === 'trot') return CINE_BUF[name] = mk(60 / 76 * 4, d => {   // a two-beat trot on cobbles, in time with nothing in particular
    const beat = 60 / 76 / 2; for (let k = 0; k < 8; k++) for (const f of [0, 0.06]) { const s0 = ((k * beat + f) * sr) | 0; for (let i = 0; i < 0.1 * sr && s0 + i < d.length; i++) { const t = i / sr; d[s0 + i] += (Math.sin(t * 6.283 * (420 - t * 900)) * 0.6 + N() * 0.7) * Math.exp(-t * 60) * (f ? 0.6 : 1); } }
    norm(d, 0.8);
  });
  return null;
}
