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
  sky.renderOrder = -1; sky.visible = false; S.add(sky);
  // painted panoramas round the stage, soft as if out of focus: a desert, a battlefield in motion, a dusk sky over the city.
  // The cylinder's middle (v = 0.5) sits at eye height, so each painting's horizon is halfway down
  const PAINT = { desert: paintDesert(), field: paintField(), city: paintCitySky() };
  const back = new THREE.Mesh(new THREE.CylinderGeometry(45, 45, 60, 72, 1, true), new THREE.MeshBasicMaterial({ map: PAINT.desert, side: THREE.BackSide, depthWrite: false, fog: false }));
  back.position.y = 1.6; back.renderOrder = -1; S.add(back);
  const sand = new THREE.Mesh(new THREE.CircleGeometry(44, 48), new THREE.MeshStandardMaterial({ map: paintSand(), roughness: 1 })); sand.rotation.x = -Math.PI / 2; S.add(sand);
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
  // the street for the last part: New Orleans in the 1880s, cobbles, gas lamps, pastel row houses with iron balconies
  const city = new THREE.Group(); city.visible = false; S.add(city);
  const cob = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#2a241d'; x.fillRect(0, 0, 256, 256);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const o = (j % 2) * 8; x.fillStyle = `hsl(30,${10 + Math.random() * 10}%,${18 + Math.random() * 12}%)`; x.beginPath(); x.ellipse(i * 16 + o + 8, j * 16 + 8, 7, 6.5, 0, 0, 6.283); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 3); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 16), new THREE.MeshStandardMaterial({ map: cob, roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -1); city.add(ground);
  const fronts = new THREE.Group(); city.add(fronts);
  const facades = [0, 1, 2, 3, 4, 5].map(paintFacade), railTex = paintRailing(), iron = new THREE.MeshStandardMaterial({ color: 0x151515, metalness: 0.5, roughness: 0.5 });
  const railMat = new THREE.MeshStandardMaterial({ map: railTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, color: 0x1a1a1a });
  for (let i = 0; i < 14; i++) {   // row houses shoulder to shoulder, each with a balcony across its upper floor
    const w = 4.28, h = 6.6 + (i % 3) * 0.7, tex = facades[i % 6], col = new THREE.Color(tex.userData.wall).multiplyScalar(0.75);
    const side = new THREE.MeshStandardMaterial({ color: col }), b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2), [side, side, side, side, new THREE.MeshStandardMaterial({ map: tex, color: 0x9a948c, emissive: 0xffffff, emissiveMap: tex.userData.glow, emissiveIntensity: 1.1 }), side]);
    b.position.set(-28 + i * 4.3, h / 2, -7.5); fronts.add(b);
    const by = 3.05 - h / 2, slab = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.1, 0.8), iron); slab.position.set(0, by, 1.4); b.add(slab);
    const rail = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, 0.9), railMat); rail.position.set(0, by + 0.5, 1.79); b.add(rail);
    if (i % 2 === 0) for (const px of [-w / 2 + 0.15, w / 2 - 0.15]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.05, 6), iron); post.position.set(px, by - 1.52, 1.75); b.add(post); }   // a gallery on posts
  }
  { const walk = new THREE.Mesh(new THREE.BoxGeometry(80, 0.18, 1.6), new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.95 })); walk.position.set(0, 0.09, -5.8); city.add(walk); }   // the banquette
  for (let i = 0; i < 8; i++) { const lamp = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.4, 8), new THREE.MeshStandardMaterial({ color: 0x15130f, metalness: 0.6, roughness: 0.4 })); pole.position.y = 1.7; lamp.add(pole);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd28a })); glow.position.y = 3.45; lamp.add(glow); lamp.position.set(-28 + i * 8, 0, -5.2); fronts.add(lamp); }
  fronts.visible = false; city.children.forEach(o => { if (o.geometry && o.geometry.type === 'BoxGeometry') o.visible = false; });   // the sharp street gives way to the painted one
  // the street out of focus: a long painted row of townhouses and lamps, then two layers of passers-by, each scrolling at its own pace
  const layer = (tex, w, h, z, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false })); m.position.set(0, y + h / 2, z); city.add(m); return m; };
  const rowL = layer(paintCityRow(), 72, 18, -9), crowdFar = layer(paintCrowd(1), 44, 4.2, -6.2), crowdNear = layer(paintCrowd(2), 36, 4.6, -4.4);
  // blowing sand in the desert, drifting smoke on the battlefield: a closer ring of streaks turning faster than the painting
  const streak = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 30, 64, 1, true), new THREE.MeshBasicMaterial({ map: paintStreaks('sand'), transparent: true, side: THREE.BackSide, depthWrite: false, fog: false }));
  streak.position.y = 1.6; S.add(streak); PAINT.sandStreak = streak.material.map; PAINT.smokeStreak = paintStreaks('smoke');
  Object.assign(CINE, { scene: S, cam, U, sky, dust, PU, warm, fire, key, rim, city, fronts, cob, back, sand, PAINT, rowL, crowdFar, crowdNear, streak });
  // the four figures
  const want = [['statue', 'prop-mbstatue.json', 'y', 2.3], ['napoleon', 'prop-napoleon.json', 'y', 2.6], ['arabian', 'prop-arabian.json', 'y', 2.15], ['coach', 'prop-stagecoach.json', 'y', 2.7]];
  let left = want.length;
  for (const [k, url, ax, size] of want) loadModelFile(url, gl => {
    const m = gl.scene; m.traverse(o => { if (o.isMesh && !o.material.isMeshBasicMaterial) o.material = leanMat(Array.isArray(o.material) ? o.material[0] : o.material); }); m.updateMatrixWorld(true);   // the scanned horse is unlit: its light is in its texture
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
  if (P.arabian) {   // a pair in harness either side of the pole, their hindquarters at the front of the coach
    const front = P.coach ? -P.coach.userData.len / 2 : 0, L = P.arabian.userData.len, hx = front - L / 2 + 0.9, hz = 0.42;
    const H = harnessFor(P.arabian, front - hx);
    CINE.pair = [P.arabian, P.arabian.clone(true)];
    CINE.pair.forEach((h, i) => { const sd = i ? 1 : -1; h.position.set(hx, 0, sd * hz); h.add(i ? H.clone(true) : H); team.add(h);
      const bit = H.userData.bit, driver = new V3(front + 0.5 - hx, 2.35, -sd * hz * 0.6);   // reins from the bit back to the driver's box
      for (const bz of [bit.z0, bit.z1]) h.add(strapLine(new V3(bit.x, bit.y, bz), new V3(lerp(bit.x, driver.x, 0.5), bit.y + 0.15, bz * 0.5), driver, 0.012)); });
  }
  CINE.ready = true; CINE.loading = false;
  if (CINE.on && CINE.stage === 'look') cineHint();
}

// ---------- open, wind, close
function cineOpen() {
  if (CINE.on || MAP.id !== 'lane' || !MBOX.eye) return;
  initAudio(); cineLoadSounds(); cineBuild();
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
  CINE.shotAt = 13.5;
  ['gunshot', 'neigh0', 'neigh1', 'neigh2', 'stampede', 'yells', 'waltz', 'city', 'trot'].forEach((n, i) => setTimeout(() => cineMusic(n), 1500 + i * 700));   // made now, so nothing stalls at the gunshot   // the gunshot comes just after the line ends (or here, if no voice is available)
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
    U.uSpin.value = 0.04; PU.uAlpha.value = 0.25; PU.uSpin.value = 0.01; C.warm.intensity = 0; cineBack0('desert'); C.back.rotation.y += dt * 0.03; C.streak.rotation.y += dt * 0.25; PU.uCol.value.set(0xf0c890);
    if (fight) { fight.rotation.y += dt * 0.05; fight.visible = true; for (const d of C.duel) { d.g.visible = true; d.g.position.set(d.sd * 0.75, 0, 0); d.g.rotation.set(0, d.sd > 0 ? 0 : Math.PI, 0); } }
    // a fresh stage every time it's played
    C.sand.position.y = 0; C.city.visible = false; if (team) team.visible = false; if (nap) nap.visible = false; C.fire.intensity = 0; U.uFade.value = 1;
    return;
  }
  // 1 · the duel: a slow tornado, banjo and the narrator
  if (C.shotT < 0) {
    cam.position.set(Math.sin(t * 0.13) * 0.6, 1.5 + Math.sin(t * 0.2) * 0.1, 6.0 - Math.min(t, 10) * 0.08); cam.lookAt(0, 1.2, 0);
    U.uSpin.value = 0.12; PU.uAlpha.value = Math.min(0.6, 0.25 + t * 0.06); PU.uSpin.value = 0.02; cineBack0('desert'); C.back.rotation.y += dt * 0.15; C.streak.rotation.y += dt * 0.6; PU.uCol.value.set(0xf0c890);
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
    PU.uSpin.value = lerp(PU.uSpin.value, 0.9, dt * 2); PU.uCol.value.set(0xffb27a); cineBack0('field'); C.back.rotation.y += dt * Math.min(2.2, 0.4 + s * 0.6); C.streak.rotation.y -= dt * Math.min(3.2, 0.8 + s * 0.8); C.sand.position.y -= dt * 6; if (C.sand.position.y < -30) C.sand.visible = false; PU.uAlpha.value = lerp(PU.uAlpha.value, 0.5, dt * 2); C.warm.intensity = 30 * Math.max(0, 1 - s * 2); C.fire.intensity = 26 * (0.85 + 0.15 * Math.sin(s * 23) * Math.sin(s * 7));
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
  cineBack0('city'); C.back.rotation.y = lerp(C.back.rotation.y, Math.round(C.back.rotation.y / 6.283) * 6.283, dt); C.city.visible = true; C.cob.offset.x = -c * 2.6 / (80 / 12);   // the street rolls toward the back of the coach
  C.rowL.material.map.offset.x = -c * 0.9 / 72; C.crowdFar.material.map.offset.x = -c * 2.2 / 44; C.crowdNear.material.map.offset.x = c * 1.1 / 36;   // the houses slide past, people stroll both ways
  for (const b of C.fronts.children) { const span = b.isGroup ? 64 : 60.2; b.position.x += dt * 2.6; if (b.position.x > span / 2) b.position.x -= span; }
  if (team) { team.visible = true; const k = smooth01(c / 3.8); team.position.x = lerp(16, 1.2, k); const ph = c * Math.PI * 2.1;
    if (C.parts.coach) C.parts.coach.position.y = 0.02 * Math.abs(Math.sin(ph));
    (C.pair || []).forEach((h, i) => { const q = ph + i * Math.PI / 2; h.position.y = 0.055 * Math.abs(Math.sin(q)); h.rotation.z = 0.025 * Math.sin(q * 2); }); }   // a two-beat trot, the pair out of step
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
  cinePlay(CINE_SND.gunshot || cineMusic('gunshot'), 0.95); flashWhite();
  for (const d of C.duel) { d.vel.set(d.sd * 3.4, 2.2, (Math.random() - 0.5) * 1.5); d.spin.set((Math.random() - 0.5) * 3, 0, -d.sd * 2.4); }
  C.timers.push(setTimeout(() => sfx('bell', 0.55, 1.3), 300));
  // the chaos: shouting, galloping, screaming horses, more shots in the distance
  C.audio.push(cinePlay(cineMusic('stampede'), 0.8, true));
  C.audio.push(cinePlay(CINE_SND.mob || cineMusic('yells'), CINE_SND.mob ? 0.8 : 0.65, true));
  for (let i = 0; i < 9; i++) C.timers.push(setTimeout(() => { const w = CINE_SND[i % 3 ? 'whinny1' : 'whinny2']; cinePlay(w || cineMusic('neigh' + (i % 3)), 0.5 + Math.random() * 0.35, false, 0.88 + Math.random() * 0.24); }, 400 + i * 1050 + Math.random() * 500));
  for (let i = 0; i < 5; i++) C.timers.push(setTimeout(() => cinePlay(CINE_SND.gunshot || cineMusic('gunshot'), 0.2 + Math.random() * 0.15, false, 0.8 + Math.random() * 0.4), 1800 + i * 1700 + Math.random() * 600));
  const shouts = ['Charge!', 'Hold the line!', 'Fire!', 'Get them out of here!', 'Retreat! Retreat!'];
  shouts.forEach((w, i) => C.timers.push(setTimeout(() => cineSay(w, 'shout'), 900 + i * 1800)));
}
function cineCalm() {
  const C = CINE; C.calmT = C.t; cineStopAudio(1.5);
  C.audio.push(cinePlay(cineMusic('waltz'), 0.7, true));
  C.audio.push(cinePlay(cineMusic('city'), 0.45, true));
  C.audio.push(cinePlay(CINE_SND.carriage || cineMusic('trot'), CINE_SND.carriage ? 1.0 : 0.5, true));
  if (CINE_SND.trot) C.audio.push(cinePlay(CINE_SND.trot, 0.55, true));
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
const CINE_BUF = {}, CINE_SND = {};
// recorded sounds for the show (gunshot, mob, whinnies, trot, carriage); until they arrive, or if they can't, the made-up ones stand in
function cineLoadSounds() {
  if (!AU.ctx || CINE_SND.loading) return; CINE_SND.loading = true;
  for (const k of ['gunshot', 'mob', 'trot', 'carriage', 'whinny1', 'whinny2']) fetch('snd-' + k + '.mp3').then(r => r.arrayBuffer()).then(b => AU.ctx.decodeAudioData(b)).then(buf => { CINE_SND[k] = buf; }).catch(e => console.warn('music box sound', k, e));
}
function cinePlay(buf, vol = 1, loop = false, rate = 1) {
  const none = { stop() { } }; if (!AU.ready || !buf) return none;
  const ctx = AU.ctx, s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; s.loop = loop; s.playbackRate.value = rate; g.gain.value = vol;
  if (loop && buf.duration > 1) { s.loopStart = 0.04; s.loopEnd = buf.duration - 0.04; }   // past the silence an mp3 carries at each end
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
  if (name === 'banjo') {   // a slow western tune, clawhammer style: melody note, brush strum, the high drone string; a plucked bass under it
    const beat = 60 / 88, bar = beat * 4;
    // chords as [bass root, bass fifth, strum notes]; a cowboy's I–IV–V in G, sixteen bars
    const G = [43, 50, [55, 59, 62, 67]], C = [36, 43, [55, 60, 64, 67]], D = [38, 45, [54, 57, 62, 66]], Em = [40, 47, [55, 59, 64, 67]];
    const prog = [G, G, C, G, G, Em, D, D, G, G, C, C, G, D, G, G];
    // the tune, one [note, beats] list per bar (0 = rest); a slide up into some notes, marked with a negative beat
    const tune = [[[62, 1], [67, 1], [71, 2]], [[69, 1], [67, 1], [64, 2]], [[64, 1], [67, 1], [72, 2]], [[71, 2], [67, 2]],
                  [[62, 1], [67, 1], [71, 1.5], [72, 0.5]], [[71, 1], [69, 1], [67, 2]], [[66, 1], [67, 1], [69, 2]], [[69, 3], [0, 1]],
                  [[74, 1.5], [72, 0.5], [71, 2]], [[69, 1], [67, 1], [64, 2]], [[64, 1], [67, 1], [72, 1], [71, 1]], [[69, 2], [67, 2]],
                  [[67, 1], [71, 1], [74, 2]], [[72, 1], [69, 1], [66, 2]], [[67, 4]], [[0, 4]]];
    const len = prog.length * bar + 2.5;
    return CINE_BUF[name] = mk(len, d => {
      // banjo: a very bright pluck that dies fast, with a second string a hair sharp for the jangle
      const banjo = (at, m, amp) => { pluck(d, at, hz(m), amp, 0.9925, 0.95, 1.1); pluck(d, at + 0.004, hz(m) * 1.003, amp * 0.45, 0.992, 0.95, 0.9); };
      prog.forEach((ch, b) => {
        const t0 = b * bar;
        // the plucked bass: boom on the root, then the fifth
        pluck(d, t0, hz(ch[0]), 0.9, 0.9985, 0.25, beat * 1.9); pluck(d, t0 + 2 * beat, hz(ch[1]), 0.75, 0.9985, 0.25, beat * 1.9);
        // bum-ditty on every beat: a strum across the strings on the off-beat, the high G drone right after
        for (let k = 0; k < 4; k++) { const tb = t0 + k * beat; ch[2].forEach((m, q) => banjo(tb + beat * 0.5 + q * 0.012, m, 0.22)); banjo(tb + beat * 0.75, 79, 0.2); }
        let at = t0; for (const [m, n] of tune[b]) { if (m) { banjo(at, m, 0.75); if (n >= 2 && (b + m) % 3 === 0) banjo(at + beat * 0.25, m + 2, 0.45); } at += n * beat; }   // now and then a hammer-on a tone up
      });
      // the drum head: a resonance round 1.1 kHz adds the banjo's honk, a low cut keeps it light
      const out = new Float32Array(d.length), w = 2 * Math.sin(Math.PI * 1100 / sr); let lo = 0, bp = 0, hp = 0, prev = 0;
      for (let i = 0; i < d.length; i++) { const hi = d[i] - lo - 0.45 * bp; bp += w * hi; lo += w * bp; out[i] = d[i] * 0.75 + bp * 0.6; }
      for (let i = 0; i < d.length; i++) { hp = 0.995 * (hp + out[i] - prev); prev = out[i]; d[i] = hp; }
      norm(d, 0.85);
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
  if (/^neigh\d$/.test(name)) {   // a horse's whinny: a high squeal that breaks into pulsing calls over a lower second voice, then a snort
    const v = +name.slice(5), dur = [1.6, 1.85, 1.4][v], base = [1180, 1020, 1320][v], low = [430, 370, 520][v];
    return CINE_BUF[name] = mk(dur + 0.5, d => {
      let p1 = 0, p2 = 0;
      for (let i = 0; i < dur * sr; i++) {
        const t = i / sr, k = t / dur, rate = 8.5 - 3.5 * k;
        const f1 = base * (k < 0.1 ? 0.72 + 0.28 * (k / 0.1) : 1 - 0.5 * Math.pow((k - 0.1) / 0.9, 1.2)) * (1 + (0.015 + 0.05 * k) * Math.sin(t * 6.283 * (10 + 4 * k)));
        const f2 = low * (1 - 0.22 * k) * (1 + 0.035 * Math.sin(t * 6.283 * 7.5)); p1 += f1 / sr; p2 += f2 / sr;
        const s1 = Math.sin(6.283 * p1) + 0.55 * Math.sin(12.566 * p1) + 0.3 * Math.sin(18.85 * p1) + 0.12 * Math.sin(25.13 * p1);
        const s2 = Math.sin(6.283 * p2) + 0.7 * Math.sin(12.566 * p2) + 0.5 * Math.sin(18.85 * p2) + 0.3 * Math.sin(25.13 * p2);
        const pulse = k < 0.3 ? 1 : 0.25 + 0.75 * Math.pow(Math.abs(Math.sin(t * 6.283 * rate * 0.5)), 0.7);
        const env = Math.min(1, t / 0.04) * (k > 0.88 ? Math.max(0, (1 - k) / 0.12) : 1), rough = 1 + 0.25 * N();
        d[i] = (s1 * Math.max(0.15, 0.9 - k * 0.8) + s2 * (0.12 + 0.55 * k)) * pulse * env * rough + N() * 0.12 * env;
      }
      for (let i = (dur * sr) | 0, n = 0; i < d.length; i++, n++) { const t = n / sr; d[i] = N() * Math.exp(-t * 9) * 0.5 * Math.min(1, t / 0.02); }   // the snort
      // a nasal, open-mouthed colour: two resonances mixed with the dry voice
      const res = (f, q) => { const out = new Float32Array(d.length), w = 2 * Math.sin(Math.PI * f / sr); let lo = 0, bp = 0; for (let i = 0; i < d.length; i++) { const hi = d[i] - lo - q * bp; bp += w * hi; lo += w * bp; out[i] = bp; } return out; };
      const a = res(1700, 0.35), b2 = res(3100, 0.4); for (let i = 0; i < d.length; i++) d[i] = d[i] * 0.35 + a[i] * 0.8 + b2[i] * 0.45;
      norm(d, 0.85);
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

function cineBack0(k) { const C = CINE, m = C.back.material; if (m.map !== C.PAINT[k]) { m.map = C.PAINT[k]; m.needsUpdate = true; }
  const st = C.streak, sm = k === 'field' ? C.PAINT.smokeStreak : C.PAINT.sandStreak; st.visible = k !== 'city'; if (st.material.map !== sm) { st.material.map = sm; st.material.needsUpdate = true; } C.sand.visible = k === 'desert' && C.sand.position.y > -30; if (k === 'desert') C.sand.position.y = Math.min(0, C.sand.position.y); }

// ---------- the paintings (2048 × 1024 panoramas, horizon halfway down), softened by shrinking and enlarging
function paintCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function softTex(c, k = 6) {
  const [s, x] = paintCanvas(Math.max(8, c.width / k | 0), Math.max(8, c.height / k | 0)); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, s.width, s.height);
  const y = c.getContext('2d'); y.imageSmoothingQuality = 'high'; y.clearRect(0, 0, c.width, c.height); y.drawImage(s, 0, 0, c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}
function paintDesert() {
  const W = 2048, H = 1024, hz = H / 2, [c, x] = paintCanvas(W, H);
  let g = x.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#2a1f3d'); g.addColorStop(0.55, '#b9563a'); g.addColorStop(1, '#f4b56a'); x.fillStyle = g; x.fillRect(0, 0, W, hz);
  g = x.createRadialGradient(W * 0.5, hz - 70, 10, W * 0.5, hz - 70, 260); g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(0.15, 'rgba(255,200,120,0.9)'); g.addColorStop(1, 'rgba(255,160,80,0)'); x.fillStyle = g; x.fillRect(0, 0, W, hz);
  x.fillStyle = '#7a4a3c'; for (const [mx, mw, mh] of [[260, 220, 70], [700, 160, 50], [1350, 260, 80], [1750, 140, 45]]) { x.beginPath(); x.moveTo(mx - mw / 2 - 30, hz); x.lineTo(mx - mw / 2, hz - mh); x.lineTo(mx + mw / 2, hz - mh); x.lineTo(mx + mw / 2 + 30, hz); x.fill(); }   // mesas far off
  const layers = [['#d99a62', 0, 18, 0.004], ['#c98450', 40, 30, 0.006], ['#b06c3e', 110, 46, 0.005], ['#8f5432', 220, 70, 0.0035], ['#6e3f25', 380, 90, 0.0028]];
  for (const [col, y0, a, f] of layers) { x.fillStyle = col; x.beginPath(); x.moveTo(0, H); for (let i = 0; i <= W; i += 8) x.lineTo(i, hz + y0 - a * (0.6 + 0.4 * Math.sin(i * f * 6.283 + y0)) * Math.abs(Math.sin(i * f * 3.1 + y0 * 0.1))); x.lineTo(W, H); x.fill(); }
  return softTex(c, 11);
}
function paintSand() { const [c, x] = paintCanvas(512, 512); x.fillStyle = '#b8794a'; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${90 + Math.random() * 80},${50 + Math.random() * 40},${30},${Math.random() * 0.25})`; x.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 10, 1 + Math.random() * 2); }
  for (let j = 0; j < 30; j++) { x.strokeStyle = 'rgba(80,40,20,0.15)'; x.lineWidth = 2; x.beginPath(); for (let i = 0; i <= 512; i += 16) x.lineTo(i, j * 18 + Math.sin(i * 0.03 + j) * 5); x.stroke(); }   // wind ripples
  const t = softTex(c, 3); t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 8); return t; }
// a horse at full gallop and a soldier, as silhouettes (facing right; flip with sx = -1)
function drawGalloper(x, px, py, s, sx) {
  x.save(); x.translate(px, py); x.scale(s * sx, s);
  x.beginPath(); x.ellipse(0, -60, 55, 24, 0, 0, 6.283); x.fill();   // barrel
  x.beginPath(); x.moveTo(40, -75); x.lineTo(78, -118); x.lineTo(96, -112); x.lineTo(70, -66); x.fill();   // neck
  x.beginPath(); x.ellipse(92, -110, 20, 9, 0.45, 0, 6.283); x.fill();   // head
  x.lineWidth = 9; x.lineCap = 'round'; x.strokeStyle = x.fillStyle;
  for (const [ax, ay, bx, by] of [[35, -45, 80, -20], [25, -45, 60, 0], [-40, -45, -95, -15], [-30, -45, -70, 0]]) { x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke(); }   // legs flung out
  x.lineWidth = 6; x.beginPath(); x.moveTo(-52, -70); x.quadraticCurveTo(-90, -80, -105, -55); x.stroke();   // tail
  x.beginPath(); x.ellipse(-5, -95, 10, 22, 0.2, 0, 6.283); x.fill(); x.beginPath(); x.arc(-2, -122, 8, 0, 6.283); x.fill();   // rider
  x.restore();
}
function drawSoldier(x, px, py, s, sx) {
  x.save(); x.translate(px, py); x.scale(s * sx, s); x.lineCap = 'round'; x.strokeStyle = x.fillStyle;
  x.beginPath(); x.ellipse(0, -62, 11, 24, 0.25, 0, 6.283); x.fill(); x.beginPath(); x.arc(6, -94, 8, 0, 6.283); x.fill(); x.fillRect(-2, -108, 16, 8);   // body, head, shako
  x.lineWidth = 6; for (const [bx, by] of [[18, 0], [-14, -2]]) { x.beginPath(); x.moveTo(2, -42); x.lineTo(bx, by); x.stroke(); }
  x.lineWidth = 3; x.beginPath(); x.moveTo(-10, -70); x.lineTo(40, -98); x.stroke();   // rifle
  x.restore();
}
function paintField() {
  const W = 2048, H = 1024, hz = H / 2, [c, x] = paintCanvas(W, H);
  let g = x.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#2e2c2a'); g.addColorStop(0.7, '#6b5844'); g.addColorStop(1, '#c08452'); x.fillStyle = g; x.fillRect(0, 0, W, hz);
  for (let i = 0; i < 26; i++) { const sx = Math.random() * W, sy = hz - 40 - Math.random() * 260, r = 60 + Math.random() * 160; g = x.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, 'rgba(170,160,150,0.55)'); g.addColorStop(1, 'rgba(120,110,100,0)'); x.fillStyle = g; x.fillRect(sx - r, sy - r, r * 2, r * 2); }   // gun smoke
  g = x.createLinearGradient(0, hz, 0, H); g.addColorStop(0, '#5c6a3a'); g.addColorStop(1, '#2a3218'); x.fillStyle = g; x.fillRect(0, hz, W, H - hz);
  for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(${40 + Math.random() * 60},${60 + Math.random() * 50},${20},0.4)`; const yy = hz + Math.random() * (H - hz); x.fillRect(Math.random() * W, yy, 2, 3 + (yy - hz) * 0.03); }
  // the charge: ranks of riders and men on foot, nearer ones bigger and lower
  for (let i = 0; i < 140; i++) { const d = Math.random(), py = hz + 30 + d * 260, s = 0.7 + d * 1.3, dark = 10 + (1 - d) * 30; x.fillStyle = `rgb(${dark + 10},${dark},${dark - 4})`; if (Math.random() < 0.55) drawGalloper(x, Math.random() * W, py, s, Math.random() < 0.5 ? 1 : -1); else drawSoldier(x, Math.random() * W, py, s * 0.9, Math.random() < 0.5 ? 1 : -1); }
  for (let i = 0; i < 18; i++) { x.fillStyle = 'rgba(255,190,90,0.7)'; x.beginPath(); x.arc(Math.random() * W, hz + 10 + Math.random() * 120, 3 + Math.random() * 6, 0, 6.283); x.fill(); }   // muzzle flashes
  // motion: smear the whole picture sideways before softening it
  const [m, mx] = paintCanvas(W, H); mx.globalAlpha = 1 / 12; for (let k = 0; k < 12; k++) mx.drawImage(c, k * 9, 0); x.clearRect(0, 0, W, H); x.drawImage(m, 0, 0);
  return softTex(c, 4);
}
function paintCitySky() {
  const W = 2048, H = 1024, hz = H / 2, [c, x] = paintCanvas(W, H);
  let g = x.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#0e1430'); g.addColorStop(0.6, '#3a2f55'); g.addColorStop(1, '#c47a4c'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = '#1a1622'; x.beginPath(); x.moveTo(0, hz); for (let i = 0; i <= W; i += 40) x.lineTo(i, hz - 40 - ((i * 7919) % 90)); x.lineTo(W, hz); x.fill();   // rooftops
  for (const cx of [W * 0.5, W * 0.0 + 120]) { x.fillRect(cx - 40, hz - 210, 80, 180); for (const o of [-70, 0, 70]) { x.beginPath(); x.moveTo(cx + o - 18, hz - (o ? 170 : 210)); x.lineTo(cx + o, hz - (o ? 260 : 330)); x.lineTo(cx + o + 18, hz - (o ? 170 : 210)); x.fill(); } x.fillRect(cx - 110, hz - 160, 220, 130); }   // the cathedral's three spires
  for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(255,${190 + Math.random() * 40},120,${0.4 + Math.random() * 0.5})`; x.fillRect(Math.random() * W, hz - 10 - Math.random() * 90, 3, 4); }
  return softTex(c, 9);
}
// a two-storey Creole townhouse front (512 px square): pastel stucco, shuttered French doors, a lamp-lit doorway
function paintFacade(n) {
  const walls = ['#d98c8c', '#e3c27a', '#8fb8a8', '#c9a0c8', '#e8d9b0', '#9fb4d8'], wall = walls[n % walls.length], S = 512, [c, x] = paintCanvas(S, S), [gc, gx] = paintCanvas(S, S);
  x.fillStyle = wall; x.fillRect(0, 0, S, S); for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; x.fillRect(Math.random() * S, Math.random() * S, 6, 6); }
  x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(0, 0, S, 26); x.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < S; i += 16) x.fillRect(i, 26, 8, 8);   // cornice and dentils
  x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(0, S - 30, S, 30);   // the base course
  gx.fillStyle = '#000'; gx.fillRect(0, 0, S, S);
  for (const [y0, hh, arch] of [[70, 150, false], [270, 210, true]]) for (let k = 0; k < 3; k++) {
    const cx = 85 + k * 171, w = 70, lit = (n + k + y0) % 3 !== 0;
    x.fillStyle = lit ? '#f2c36b' : '#1d1a18'; x.fillRect(cx - w / 2, y0, w, hh); if (arch) { x.beginPath(); x.arc(cx, y0, w / 2, Math.PI, 0); x.fill(); }
    if (lit) { gx.fillStyle = '#c8903c'; gx.fillRect(cx - w / 2, y0, w, hh); if (arch) { gx.beginPath(); gx.arc(cx, y0, w / 2, Math.PI, 0); gx.fill(); } }
    x.fillStyle = '#2a1e16'; x.fillRect(cx - 2, y0, 4, hh); x.fillRect(cx - w / 2, y0 + hh * 0.45, w, 3);
    x.fillStyle = ['#3d6b4a', '#2f5d6b', '#5a3a2a'][n % 3]; for (const sd of [-1, 1]) { x.fillRect(cx + sd * (w / 2 + 20) - 18, y0 - (arch ? 30 : 0), 36, hh + (arch ? 30 : 0)); x.fillStyle = 'rgba(0,0,0,0.25)'; for (let j = 0; j < hh; j += 10) x.fillRect(cx + sd * (w / 2 + 20) - 15, y0 + j, 30, 2); x.fillStyle = ['#3d6b4a', '#2f5d6b', '#5a3a2a'][n % 3]; }   // louvred shutters
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace;
  t.userData.wall = wall; t.userData.glow = gt; return t;
}
// wrought-iron lace for the balcony fronts, on a clear background
function paintRailing() {
  const [c, x] = paintCanvas(512, 128); x.strokeStyle = '#000'; x.lineWidth = 5; x.strokeRect(4, 6, 504, 116); x.lineWidth = 3;
  for (let i = 12; i < 512; i += 16) { x.beginPath(); x.moveTo(i, 10); x.lineTo(i, 118); x.stroke(); }
  for (let i = 32; i < 512; i += 64) { x.beginPath(); x.arc(i, 40, 12, 0, 6.283); x.stroke(); x.beginPath(); x.moveTo(i - 20, 70); x.quadraticCurveTo(i, 50, i + 20, 70); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1); return t;
}

// ---------- harness for the coach horses, fitted to the scanned Arabian: read its body in slices and strap round them
function strapLine(a, b, c, r) { const curve = c ? new THREE.QuadraticBezierCurve3(a, b, c) : new THREE.LineCurve3(a, b); return new THREE.Mesh(new THREE.TubeGeometry(curve, 16, r, 5, false), CINE.leather || (CINE.leather = new THREE.MeshStandardMaterial({ color: 0x2b1a10, roughness: 0.55 }))); }
function harnessFor(g, toX) {
  g.updateMatrixWorld(true); const inv = g.matrixWorld.clone().invert(), pts = [], v = new V3();
  g.traverse(o => { if (!o.isMesh) return; const p = o.geometry.attributes.position, st = Math.max(1, p.count / 30000 | 0); for (let i = 0; i < p.count; i += st) pts.push(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv).clone()); });
  const b = new THREE.Box3().setFromPoints(pts), L = b.max.x - b.min.x, Ht = b.max.y - b.min.y;
  const slice = (x0, half, yMin, yMax = 1e9) => { let y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9, n = 0; for (const p of pts) if (Math.abs(p.x - x0) < half && p.y > yMin && p.y < yMax) { y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); n++; } return n > 8 ? { x: x0, y0, y1, z0, z1, cy: (y0 + y1) / 2, cz: (z0 + z1) / 2 } : null; };
  // the front legs: the low points in the front half of the body; the chest is just ahead of them, the girth a little behind
  const feet = pts.filter(p => p.y < b.min.y + Ht * 0.12 && p.x < (b.min.x + b.max.x) / 2), fx = feet.length ? feet.reduce((s, p) => s + p.x, 0) / feet.length : b.min.x + L * 0.3;
  const H = new THREE.Group(), lea = CINE.leather || (CINE.leather = new THREE.MeshStandardMaterial({ color: 0x2b1a10, roughness: 0.55 })), brass = MATS.brass;
  const ring = (S, pad, tilt, r = 0.022) => { if (!S) return; const pts2 = []; for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283, y = S.cy + Math.cos(a) * ((S.y1 - S.y0) / 2 + pad), z = S.cz + Math.sin(a) * ((S.z1 - S.z0) / 2 + pad); pts2.push(new V3(S.x + (y - S.cy) * Math.tan(tilt), y, z)); } H.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2, true), 60, r, 5, true), lea)); };
  const girth = slice(fx + L * 0.12, 0.05, b.min.y + Ht * 0.4);
  ring(girth, 0.025, 0, 0.035);    // the girth band
  if (girth) { const pad = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, (girth.z1 - girth.z0) * 0.7), lea); pad.position.set(girth.x, girth.y1 + 0.03, girth.cz); H.add(pad);
    for (const sd of [-1, 1]) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 6, 12), brass); t.position.set(girth.x, girth.y1 + 0.08, girth.cz + sd * 0.1); t.rotation.y = Math.PI / 2; H.add(t); } }   // terrets for the reins
  // the breast collar: a broad strap round the front of the chest at the point of the shoulder, following the body's outline,
  // held up by a neck strap over the withers; the traces run from its ends back to the coach
  const gx = girth ? girth.x : fx + L * 0.12, yc = b.min.y + Ht * 0.56, band = pts.filter(p => Math.abs(p.y - yc) < 0.035 && p.x < gx && p.x > gx - L * 0.4);
  if (band.length > 20) {
    let z0 = 1e9, z1 = -1e9; for (const p of band) { z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
    const N = 14, front = [];
    for (let i = 0; i <= N; i++) { const z = lerp(z0, z1, i / N), near = band.filter(p => Math.abs(p.z - z) < (z1 - z0) / N); if (near.length) front.push(new V3(Math.min(...near.map(p => p.x)) - 0.025, yc, z + (i === 0 ? -0.02 : i === N ? 0.02 : 0))); }
    const back = gx - L * 0.07, ends = [new V3(back, yc, z0 - 0.03), new V3(back, yc, z1 + 0.03)];
    const curve = new THREE.CatmullRomCurve3([ends[0], ...front, ends[1]]);
    H.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.03, 6, false), lea));
    const top = slice(back, 0.04, yc); if (top) for (const e of ends) H.add(strapLine(new V3(e.x, e.y, e.z), new V3(e.x + 0.02, top.y1 - 0.02, e.z * 0.6), new V3(e.x + 0.03, top.y1 + 0.02, top.cz), 0.02));
    for (const e of ends) H.add(strapLine(e, new V3((e.x + toX) / 2, yc - 0.1, e.z), new V3(toX, b.min.y + Ht * 0.42, e.z * 0.9), 0.02));   // traces
  }
  // the bridle: a noseband and a headpiece behind the ears, with the bit rings at the corners of the mouth
  const nose = slice(b.min.x + L * 0.05, 0.03, b.min.y + Ht * 0.55), poll = slice(b.min.x + L * 0.15, 0.03, b.min.y + Ht * 0.7);
  ring(nose, 0.015, 0, 0.015); ring(poll, 0.015, -0.3, 0.015);
  if (nose && poll) for (const sd of [0, 1]) { const z = sd ? nose.z1 : nose.z0, zp = sd ? poll.z1 : poll.z0; H.add(strapLine(new V3(nose.x + 0.04, nose.cy, z), new V3(poll.x, poll.cy, zp), null, 0.012)); const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 6, 12), brass); r2.position.set(nose.x + 0.05, nose.y0 + 0.05, z); H.add(r2); }
  H.userData.bit = nose ? { x: nose.x + 0.05, y: nose.y0 + 0.05, z0: nose.z0, z1: nose.z1 } : { x: b.min.x, y: b.min.y + Ht * 0.6, z0: -0.1, z1: 0.1 };
  return H;
}

// a long painted row of Creole townhouses: lit doors and windows, iron balconies and gas lamps, then smeared and softened
function paintCityRow() {
  const W = 4096, H = 1024, street = H - 30, [c, x] = paintCanvas(W, H);
  for (let i = 0, px = 0; px < W; i++) {
    const w = 470 + (i * 37) % 90, h = 700 + (i * 53) % 220, f = paintFacade(i).image;
    x.drawImage(f, px, street - h, w, h);
    x.fillStyle = '#121212'; x.fillRect(px, street - h * 0.48, w, 10);   // the balcony floor
    x.strokeStyle = 'rgba(15,15,15,0.95)'; x.lineWidth = 3; for (let k = px + 6; k < px + w; k += 14) { x.beginPath(); x.moveTo(k, street - h * 0.48); x.lineTo(k, street - h * 0.48 - 70); x.stroke(); }
    x.fillRect(px, street - h * 0.48 - 72, w, 6);
    px += w;
  }
  for (let px = 120; px < W; px += 340) {   // gas lamps: a dark post and a big warm glow
    x.fillStyle = '#0d0d0d'; x.fillRect(px - 5, street - 330, 10, 330);
    const g = x.createRadialGradient(px, street - 340, 4, px, street - 340, 150); g.addColorStop(0, 'rgba(255,236,190,1)'); g.addColorStop(0.2, 'rgba(255,190,110,0.75)'); g.addColorStop(1, 'rgba(255,150,60,0)'); x.fillStyle = g; x.fillRect(px - 150, street - 490, 300, 300);
  }
  const [m, mx] = paintCanvas(W, H); mx.globalAlpha = 1 / 8; for (let k = 0; k < 8; k++) mx.drawImage(c, k * 10, 0); x.clearRect(0, 0, W, H); x.drawImage(m, 0, 0);
  const t = softTex(c, 9); t.wrapS = THREE.RepeatWrapping; return t;
}
// people on the banquette: walkers in coats and bonnets, vendors' carts under umbrellas with lanterns; blurred, moving
function paintCrowd(seed) {
  const W = 4096, H = 512, base = H - 20, [c, x] = paintCanvas(W, H);
  let r = seed * 9301 + 49297; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const person = (px, s, skirt, hat, col) => {
    x.save(); x.translate(px, base); x.scale(s, s); x.fillStyle = col;
    if (skirt) { x.beginPath(); x.moveTo(-34, 0); x.lineTo(34, 0); x.lineTo(14, -120); x.lineTo(-14, -120); x.fill(); } else { x.fillRect(-14, -90, 10, 90); x.fillRect(4, -90, 10, 90); }
    x.beginPath(); x.ellipse(0, -150, 22, 50, 0, 0, 6.283); x.fill(); x.beginPath(); x.arc(0, -215, 17, 0, 6.283); x.fill();
    if (hat === 1) { x.fillRect(-14, -262, 28, 30); x.fillRect(-24, -236, 48, 6); } else if (hat === 2) { x.beginPath(); x.arc(0, -222, 24, Math.PI, 0); x.fill(); }   // top hat or bonnet
    x.restore();
  };
  for (let i = 0; i < 60; i++) { const px = rnd() * W, s = 0.85 + rnd() * 0.5, sk = rnd() < 0.45, tone = 20 + rnd() * 40; person(px, s, sk, sk ? 2 : (rnd() < 0.6 ? 1 : 0), `rgb(${tone + 20},${tone + 8},${tone})`); }
  for (let i = 0; i < 6; i++) {   // vendors' carts with a lantern, the vendor beside
    const px = 300 + i * 680 + rnd() * 200; x.fillStyle = '#2a1c12'; x.fillRect(px - 70, base - 110, 140, 60); x.beginPath(); x.arc(px - 40, base - 30, 30, 0, 6.283); x.fill(); x.beginPath(); x.arc(px + 40, base - 30, 30, 0, 6.283); x.fill();
    x.fillStyle = ['#7a2a24', '#2c4a6a', '#5a4a1a'][i % 3]; x.beginPath(); x.moveTo(px - 110, base - 190); x.quadraticCurveTo(px, base - 260, px + 110, base - 190); x.fill(); x.fillStyle = '#111'; x.fillRect(px - 3, base - 200, 6, 90);
    const g = x.createRadialGradient(px + 60, base - 140, 2, px + 60, base - 140, 70); g.addColorStop(0, 'rgba(255,220,150,0.95)'); g.addColorStop(1, 'rgba(255,170,80,0)'); x.fillStyle = g; x.fillRect(px - 10, base - 210, 140, 140);
    person(px - 130, 1.05, false, 0, '#2a2018');
  }
  const [m, mx] = paintCanvas(W, H); mx.globalAlpha = 1 / 6; for (let k = 0; k < 6; k++) mx.drawImage(c, k * 8, 0); x.clearRect(0, 0, W, H); x.drawImage(m, 0, 0);
  const t = softTex(c, seed === 1 ? 7 : 5); t.wrapS = THREE.RepeatWrapping; return t;
}
// soft horizontal streaks on a clear background: blown sand, or drifting gun smoke
function paintStreaks(kind) {
  const W = 2048, H = 512, [c, x] = paintCanvas(W, H);
  for (let i = 0; i < (kind === 'sand' ? 260 : 120); i++) {
    const y = H * 0.35 + Math.random() * H * 0.65, w = 80 + Math.random() * 400, px = Math.random() * W, a = kind === 'sand' ? 0.06 + Math.random() * 0.12 : 0.05 + Math.random() * 0.1;
    const g = x.createLinearGradient(px, 0, px + w, 0), col = kind === 'sand' ? '230,180,120' : '150,140,130'; g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.5, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = g; x.fillRect(px, y, w, kind === 'sand' ? 2 + Math.random() * 6 : 20 + Math.random() * 60);
  }
  return softTex(c, 3);
}
