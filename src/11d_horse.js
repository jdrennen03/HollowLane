// ---------------------------------------------------------------- easter egg (Whitlock Stables): Bonnie Blue comes back
// Taking her halter off its hook wakes her. A pale, see-through mare bursts out of her stall, gallops down the aisle,
// out through the back of the barn into the arena, and bucks there until someone walks up and calms her. After that
// she wanders the arena at a walk. Everything is driven by the round clock and seeded events, so all players see the
// same horse in the same place.
const HORSE = { model: null, loading: false, root: null, inner: null, mixer: null, acts: {}, cur: null, t0: null, on: false, run: null, calmT: null, calmSeed: 0, legs: null, state: 'off', hit: null, beatT: 0, lastBeat: -1, loopN: -1, buckPh: -1 };
const HORSE_U = { uTime: GHOST_U.uTime, uMap: { value: null }, uFade: { value: 0 } };
const HORSE_CENTER = [46, 6];
const horseMat = new THREE.ShaderMaterial({
  uniforms: HORSE_U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `#include <common>
    #include <skinning_pars_vertex>
    varying vec3 vW; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
    void main(){
      #include <skinbase_vertex>
      #include <beginnormal_vertex>
      #include <skinnormal_vertex>
      #include <begin_vertex>
      #include <skinning_vertex>
      vUv = uv; vec4 w = modelMatrix*vec4(transformed,1.); vW = w.xyz; vN = normalize(mat3(modelMatrix)*objectNormal); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform sampler2D uMap; uniform float uTime; uniform float uFade;
    varying vec3 vW; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
    void main(){
      float lum = dot(texture2D(uMap, vUv).rgb, vec3(0.3, 0.59, 0.11));
      float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
      float flick = 0.82 + 0.18 * sin(uTime * 11.0 + vW.y * 7.0 + vW.x * 2.0);
      vec3 col = vec3(0.5, 0.72, 1.0) * (0.3 + lum * 1.1) + vec3(0.78, 0.92, 1.0) * rim * 1.5;
      float a = (0.18 + lum * 0.25 + rim * 0.8) * flick * uFade;
      gl_FragColor = vec4(col * a, a);
    }`,
});
// clip ranges in frames (24 fps) on the asset's trimmed timeline: idle 0-4 s, then 31.3-45.4 s of the original retimed to start at 4.55 s
const HORSE_CLIPS = { idle: [0, 96], walk: [109.9, 157.9], gallop: [165.9, 181.9], trot: [189.9, 205.9], buck: [365.9, 445.9] };
const BUCK_LEN = 80 / 24;
// ---- the run: out of her stall, east down the aisle, through the back of the barn and into the middle of the arena
function horseRunRoute() {
  const pts = [[1.8, 1.9], [1.8, 4.6], [3.4, 5.7], [8, 5.7], [16, 5.7], [24, 5.7], [28, 5.7], [31.8, 5.8], [37, 6.2], [42, 6.2], [HORSE_CENTER[0], HORSE_CENTER[1]]];
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new V3(x, BA0, z)), false, 'centripetal', 0.5);
  const N = 500, L = curve.getLength(), tab = [0]; let t = 0;
  const speed = u => { const d = u * L; return d < 3.5 ? 2.6 + d * 1.2 : d > L - 7 ? Math.max(1.2, (L - d) * 1.2) : 8.5; };
  for (let i = 1; i <= N; i++) { const u = i / N; t += (L / N) / speed(u - 0.5 / N); tab.push(t); }
  return { curve, L, tab, N, speed, dur: t };
}
// ---- calm: wander between random points in the arena at a walk, pausing to stand now and then (seeded, so identical everywhere)
function horseCalmLegs(seed, t1) {
  const R = mulberry32(seed), legs = []; let x = HORSE_CENTER[0], z = HORSE_CENTER[1], t = t1 + 2.5, yaw = HORSE.root ? HORSE.root.rotation.y : 0;
  for (let k = 0; k < 400; k++) {
    let tx, tz; for (let n = 0; n < 20; n++) { tx = ARENA.x0 + 3 + R() * (ARENA.x1 - ARENA.x0 - 6); tz = ARENA.z0 + 3 + R() * (ARENA.z1 - ARENA.z0 - 6); if (Math.hypot(tx - x, tz - z) > 4 && !BARRELS.some(([bx, bz]) => Math.hypot(tx - bx, tz - bz) < 2)) break; }
    const d = Math.hypot(tx - x, tz - z), dur = d / 1.45, ny = Math.atan2(tx - x, tz - z);
    legs.push({ t0: t, t1: t + dur, x0: x, z0: z, x1: tx, z1: tz, y0: yaw, y1: ny }); t += dur;
    const rest = 2 + R() * 5; legs.push({ t0: t, t1: t + rest, x0: tx, z0: tz, x1: tx, z1: tz, y0: ny, y1: ny, rest: true }); t += rest;
    x = tx; z = tz; yaw = ny;
  }
  return legs;
}
function loadGhostHorse(cb) {
  if (HORSE.model) return cb();
  if (HORSE.loading) { HORSE.cbs.push(cb); return; }
  HORSE.loading = true; HORSE.cbs = [cb];
  loadModelFile('ghost-horse.json', gl => {
    const model = gl.scene, root = new THREE.Group(), inner = new THREE.Group(); inner.add(model); root.add(inner);
    model.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(model, true), s = 2.05 / Math.max(0.1, box.max.y - box.min.y);
    inner.scale.setScalar(s); inner.position.y = -box.min.y * s;
    model.traverse(o => { if (o.isMesh) { HORSE_U.uMap.value = o.material.map; o.material = horseMat; o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false; } });
    const clip = gl.animations[0], sub = (n, a, b) => {
      const c = THREE.AnimationUtils.subclip(clip, n, a, b, 24);
      for (const tr of c.tracks) if (/\.position$/.test(tr.name) && /Bip01_00/.test(tr.name)) { const v = tr.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; } }
      return c;
    };
    const mixer = new THREE.AnimationMixer(model), acts = {};
    for (const n in HORSE_CLIPS) { const [a, b] = HORSE_CLIPS[n]; acts[n] = mixer.clipAction(sub(n, a, b)); acts[n].play(); acts[n].setEffectiveWeight(0); }
    // walk up to her while she bucks to calm her
    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 2.8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1.1; root.add(hit);
    root.visible = false; scene.add(root);
    Object.assign(HORSE, { model, root, inner, mixer, acts, hit, run: horseRunRoute() });
    for (const f of HORSE.cbs) f(); HORSE.cbs = [];
  }, e => { console.warn('ghost horse', e); HORSE.loading = false; });
}
function startGhostHorse(t0) {
  HORSE.t0 = t0; HORSE.on = true; HORSE.calmT = null; HORSE.legs = null; HORSE.state = 'run'; HORSE.loopN = -1;
  if (WORLD_EXTRA.halter) WORLD_EXTRA.halter.visible = false;
  loadGhostHorse(() => { if (HORSE.on) { HORSE.root.visible = true; if (!INTERACT.some(o => o.kind === 'horse')) INTERACT.push({ mesh: HORSE.hit, kind: 'horse', id: 0 }); } });
  const P = me(); if (P && Math.hypot(P.pos.x - 1.8, P.pos.z - 4) < 14) setTimeout(() => sfxAt('whinny', new V3(1.8, 1.8, 2), 1), 300);
}
function calmGhostHorse(t1, seed) {
  if (!HORSE.on || HORSE.calmT !== null) return;
  HORSE.calmT = t1; HORSE.calmSeed = seed; HORSE.legs = null;
  const P = me(); if (P && HORSE.root && Math.hypot(P.pos.x - HORSE.root.position.x, P.pos.z - HORSE.root.position.z) < 15) { sub('Bonnie Blue blows out a long breath, lowers her head and settles.', 'sys'); sfxAt('gbreath', HORSE.root.position.clone().setY(1.6), 0.8); }
}
function stopGhostHorse() {
  HORSE.on = false; HORSE.t0 = null; HORSE.calmT = null; HORSE.legs = null; HORSE.state = 'off'; HORSE_U.uFade.value = 0; if (HORSE.root) HORSE.root.visible = false;
  if (WORLD_EXTRA.halter) WORLD_EXTRA.halter.visible = true;
}
function stopEggs() { stopGiant(); stopGhostHorse(); stopGator(); }
function setHorseGait(name, rate, dt) {
  for (const n in HORSE.acts) { const a = HORSE.acts[n], w = a.getEffectiveWeight(), tw = n === name ? 1 : 0; a.setEffectiveWeight(w + (tw - w) * clamp(dt * 6, 0, 1)); }
  HORSE.acts[name].timeScale = rate; HORSE.cur = name;
}
function horseBeat(p, dt, cyc, beats, vol) {   // hoofbeats at the given fractions of the gait cycle
  HORSE.beatT += dt; const ph = (HORSE.beatT % cyc) / cyc; let b = -1; beats.forEach((f, i) => { if (ph >= f && ph < f + 0.1) b = i; });
  if (b >= 0 && b !== HORSE.lastBeat) sfxAt('hoof', p.clone().setY(p.y + 0.2), vol);
  HORSE.lastBeat = b;
}
function updateGhostHorse(dt) {
  if (!HORSE.on || !HORSE.model || G.state !== 'play') return;
  const tt = G.elapsed - HORSE.t0, r = HORSE.root, S = HORSE.run;
  HORSE_U.uFade.value = Math.min(1, tt / 1.2);
  let gait = 'idle', rate = 1;
  if (tt < S.dur) {
    HORSE.state = 'run';
    let lo = 0, hi = S.N; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S.tab[m] <= tt) lo = m; else hi = m; }
    const u = clamp((lo + (tt - S.tab[lo]) / Math.max(1e-6, S.tab[hi] - S.tab[lo])) / S.N, 0, 1), p = S.curve.getPointAt(u), tg = S.curve.getTangentAt(u), v = S.speed(u);
    const tg2 = S.curve.getTangentAt(clamp(u + 0.01, 0, 1)), turn = Math.atan2(tg.x * tg2.z - tg.z * tg2.x, tg.x * tg2.x + tg.z * tg2.z);
    r.position.copy(p); r.rotation.set(0, Math.atan2(tg.x, tg.z), clamp(turn * v * 0.9, -0.3, 0.3), 'YXZ');
    gait = v > 5 ? 'gallop' : v > 2.2 ? 'trot' : 'walk'; rate = gait === 'gallop' ? clamp(v / 8.5, 0.75, 1.3) : gait === 'walk' ? -1 : 1;
    if (gait === 'gallop') horseBeat(p, dt, 0.667 / rate, [0, 0.12, 0.24], 0.8); else horseBeat(p, dt, 0.667, [0, 0.5], 0.6);
  } else if (HORSE.calmT === null || G.elapsed < HORSE.calmT) {
    // bucking in the middle of the arena: rear, kick, turn a little, again
    HORSE.state = 'buck'; gait = 'buck';
    const bt = tt - S.dur, n = Math.floor(bt / BUCK_LEN), ph = (bt - n * BUCK_LEN) / BUCK_LEN;
    r.position.set(HORSE_CENTER[0], BA0, HORSE_CENTER[1]); r.rotation.set(0, Math.PI / 2 + n * 0.7, 0, 'YXZ');
    if (n !== HORSE.loopN) { HORSE.loopN = n; if (n % 2 === 0) sfxAt('whinny', r.position.clone().setY(2.0), 0.9); }
    for (const f of [0.36, 0.62, 0.7]) if (HORSE.buckPh < f && ph >= f) sfxAt('hoof', r.position.clone().setY(0.3), 1);
    HORSE.buckPh = ph;
  } else {
    HORSE.state = 'calm';
    if (!HORSE.legs) HORSE.legs = horseCalmLegs(HORSE.calmSeed, HORSE.calmT);
    const t = G.elapsed, L = HORSE.legs.find(l => t < l.t1);
    if (t < HORSE.legs[0].t0) { r.position.set(HORSE_CENTER[0], BA0, HORSE_CENTER[1]); gait = 'idle'; }
    else if (L) {
      const k = clamp((t - L.t0) / Math.max(0.01, L.t1 - L.t0), 0, 1);
      r.position.set(lerp(L.x0, L.x1, k), BA0, lerp(L.z0, L.z1, k));
      r.rotation.set(0, L.y0 + angDiff(L.y0, L.y1) * smooth(0, 1, Math.min(1, (t - L.t0) / 0.9)), 0, 'YXZ');
      gait = L.rest ? 'idle' : 'walk'; rate = L.rest ? 1 : -1;   // the file's walk is a rein-back; reversed, it walks forward
      if (!L.rest) horseBeat(r.position, dt, 2.0, [0, 0.25, 0.5, 0.75], 0.35);
    }
  }
  setHorseGait(gait, rate, dt);
  HORSE.mixer.update(dt);
}
