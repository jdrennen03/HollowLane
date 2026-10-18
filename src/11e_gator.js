// ---------------------------------------------------------------- Bayou Maudit easter egg: feed the bayou, then ring the dinner bell
// Tip the bucket of chicken necks off the end of the dock, then ring the old bell on its post: a monstrous alligator rises out
// of the water beyond the dock, snaps its jaws, roars, and sinks away. Cosmetic and local to each player (started for
// everyone by a host event); it never touches gameplay.
const GATOR = { on: false, root: null, mixer: null, jaw: null, t: 0, fog0: null, snaps: 0, roared: false };
const GATOR_S = 14, GATOR_POS = [0, -66];   // ~60 m long; its snout ends about 10 m out past the dock
function stopGator() {
  if (GATOR.root) scene.remove(GATOR.root);
  if (GATOR.fog0 !== null) scene.fog.density = GATOR.fog0;
  Object.assign(GATOR, { on: false, root: null, mixer: null, jaw: null, fog0: null });
}
function startGator() {
  if (MAP.id !== 'bayou' || GATOR.on) return;
  G.eggOn = true; Object.assign(GATOR, { on: true, t: 0, snaps: 0, roared: false, fog0: scene.fog.density });
  sub('The bell\'s last note rolls out over the water. Past the dock, the bayou begins to boil…', 'sys');
  loadModelFile('prop-gator.json', gl => {
    if (!GATOR.on || GATOR.root) return;
    const root = new THREE.Group(), m = gl.scene; m.scale.setScalar(GATOR_S); root.add(m);
    // its own texture as a faint glow: a moonlit sheen so it reads at night
    m.traverse(o => {
      if (o.isMesh) { o.material = leanMat(Array.isArray(o.material) ? o.material[0] : o.material); o.material.emissiveMap = o.material.map; o.material.emissive.setHex(0x5a6458); o.frustumCulled = false; o.castShadow = false; }
      if (o.isBone && /^fJaw_016/.test(o.name)) GATOR.jaw = o;
    });
    m.updateMatrixWorld(true);
    if (GATOR.jaw) { const rw = GATOR.jaw.getWorldQuaternion(new THREE.Quaternion()); GATOR.jawRw = rw; GATOR.jawRwi = rw.clone().invert(); GATOR.jawQ0 = GATOR.jaw.quaternion.clone(); }
    root.position.set(GATOR_POS[0], -8, GATOR_POS[1]); scene.add(root);
    GATOR.mixer = new THREE.AnimationMixer(m);
    const idle = gl.animations.find(a => /Idle/.test(a.name)) || gl.animations[0]; if (idle) GATOR.mixer.clipAction(idle).play();
    GATOR.jawAnimated = !!(idle && GATOR.jaw && idle.tracks.some(k => k.name.startsWith(GATOR.jaw.name + '.')));
    GATOR.root = root;
  }, e => console.warn('gator', e));
}
const _gjq = new THREE.Quaternion(), _gjx = new V3(1, 0, 0);
function updateGator(dt) {
  if (!GATOR.on) return;
  const t = (GATOR.t += dt);
  // the mist thins while it is up, so it can be seen from the dock
  scene.fog.density = lerp(GATOR.fog0, Math.min(GATOR.fog0, 0.017), smooth(0, 3, t) * (1 - smooth(21, 25, t)));
  if (t > 25.5) { stopGator(); return; }
  const R = GATOR.root; if (!R) return;
  // rise, rear the head up out of the water, and later sink back
  R.position.y = lerp(-9, -2.4, smooth(1, 5.5, t)) - 8 * smooth(18.5, 24, t);
  R.rotation.x = -0.1 * smooth(3.5, 6.5, t) * (1 - smooth(17, 20, t));
  if (t > 1 && t - dt <= 1) sfxAt('splash', new V3(0, 0, -36), 1, 0.6);
  if (t > 4.5 && t - dt <= 4.5) sfxAt('splash', new V3(0, 0, -38), 1, 0.45);
  GATOR.mixer.update(dt);
  // jaws: four snaps, then wide open for the roar
  let open = 0;
  if (t > 6.5 && t < 11) { const u = (t - 6.5) * 1.8; open = Math.max(0, Math.sin(u * Math.PI)) ** 0.6 * 0.6; const n = Math.floor(u); if (n > GATOR.snaps - 1 && u - n > 0.95 && GATOR.snaps <= n) { GATOR.snaps = n + 1; sfxAt('chomp', new V3(0, 8, -40), 1, 0.5); } }
  else if (t >= 11.5 && t < 16) { open = 0.95 * smooth(11.5, 12.2, t) * (1 - smooth(15.2, 16, t)); if (!GATOR.roared) { GATOR.roared = true; sfx('gatorRoar', 1, 0.9); sfxAt('gatorRoar', new V3(0, 8, -40), 1, 0.75); } }
  if (GATOR.jaw && !GATOR.jawAnimated) GATOR.jaw.quaternion.copy(GATOR.jawQ0);   // nothing else resets it each frame
  if (GATOR.jaw && open > 0) { _gjq.setFromAxisAngle(_gjx, open); GATOR.jaw.quaternion.multiply(GATOR.jawRwi.clone().multiply(_gjq).multiply(GATOR.jawRw)); }
}
