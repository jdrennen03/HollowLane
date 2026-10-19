// ---------------------------------------------------------------- teammate characters (female / male investigator)
// The two imported characters are loaded once and cloned per teammate. Neither ships a usable walk cycle (the male
// file's clips are single-frame poses), so both walk procedurally with the same gait the ghosts use.
const PLAYER_FILES = { f: { url: 'player-female.json', height: 1.68 }, m: { url: 'player-male.json', height: 1.8, pose: 'Standing_01' } };
const PLAYER_MODELS = {}, PLAYER_LOADING = {};
const AV_BONES = [
  ['thigh', /(Left|Right)UpLeg_|CC_Base_[LR]_Thigh_\d/], ['calf', /(Left|Right)Leg_|CC_Base_[LR]_Calf_\d/], ['foot', /(Left|Right)Foot_|CC_Base_[LR]_Foot_\d/],
  ['arm', /(Left|Right)Arm_|CC_Base_[LR]_Upperarm_\d/], ['fore', /(Left|Right)ForeArm_|CC_Base_[LR]_Forearm_\d/],
  ['spine', /^Spine_\d|CC_Base_Spine01_\d/], ['chest', /^Spine2_|CC_Base_Spine02_\d/], ['head', /^Head_\d|CC_Base_Head_\d/],
];
const avSide = n => /Left|CC_Base_L_/.test(n) ? 1 : /Right|CC_Base_R_/.test(n) ? -1 : 0;
function leanMat(src) {
  const cut = src.transparent || (src.alphaTest || 0) > 0;
  const m = new THREE.MeshStandardMaterial({ map: src.map || null, normalMap: src.normalMap || null, roughnessMap: src.roughnessMap || null, color: src.color ? src.color.clone() : 0xffffff, roughness: src.roughness ?? 0.8, metalness: Math.min(src.metalness ?? 0, 0.3), side: src.side, alphaTest: cut ? Math.max(0.4, src.alphaTest || 0) : 0, transparent: false });
  if (src.normalMap && src.normalScale) m.normalScale.copy(src.normalScale);
  return m;
}
function loadPlayerModel(ch) {
  if (PLAYER_MODELS[ch] || PLAYER_LOADING[ch] || !PLAYER_FILES[ch]) return;
  PLAYER_LOADING[ch] = true; const f = PLAYER_FILES[ch];
  loadModelFile(f.url, gl => {
    const model = gl.scene;
    model.traverse(o => { if (o.isMesh) { o.material = leanMat(Array.isArray(o.material) ? o.material[0] : o.material); o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    // the male's T-pose is replaced by his standing pose, minus its hip turn and sideways glance so he faces forward
    if (f.pose) { const clip = gl.animations.find(a => a.name === f.pose); if (clip) { clip.tracks = clip.tracks.filter(t => !/CC_Base_Hip_\d+\.(quaternion|position)|CC_Base_(Head|NeckTwist\d+)_\d+\.quaternion/.test(t.name)); const mx = new THREE.AnimationMixer(model); mx.clipAction(clip).play(); mx.setTime(0); model.updateMatrixWorld(true); } }
    else armPoseAv(model);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model, true), s = f.height / Math.max(0.1, box.max.y - box.min.y);
    PLAYER_MODELS[ch] = { model, s, y: -box.min.y * s };
    if (G.players && G.state === 'play') buildAvatars();
  }, e => { console.warn('player model', ch, e); PLAYER_LOADING[ch] = false; });
}
// A-posed arms hang down at the sides
function armPoseAv(model) {
  const bones = []; model.traverse(o => { if (o.isBone) bones.push(o); });
  const find = (kind, sd) => bones.find(o => AV_BONES.find(g => g[0] === kind)[1].test(o.name) && avSide(o.name) === sd);
  for (const sd of [1, -1]) {
    const arm = find('arm', sd), fore = find('fore', sd); if (!arm || !fore) continue;
    model.updateMatrixWorld(true);
    const a = model.worldToLocal(arm.getWorldPosition(new V3())), b = model.worldToLocal(fore.getWorldPosition(new V3()));
    const d = b.sub(a).normalize(), t = new V3(Math.sign(d.x) * 0.16, -1, 0.02).normalize();
    const qw = new THREE.Quaternion().setFromUnitVectors(d, t), pq = arm.parent.getWorldQuaternion(new THREE.Quaternion());
    arm.quaternion.premultiply(pq.clone().invert().multiply(qw).multiply(pq));
  }
}
// a teammate's body: the clone, a gait rig for gaitPose, and the inner group that faces the avatar's -z
function makeCharacter(ch, root) {
  const T = PLAYER_MODELS[ch]; if (!T) { loadPlayerModel(ch); return null; }
  const model = SkeletonUtils.clone(T.model), inner = new THREE.Group(); inner.add(model);
  inner.scale.setScalar(T.s); inner.position.y = T.y; inner.rotation.y = Math.PI;
  model.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; } });
  const gait = []; model.traverse(o => { if (!o.isBone) return; for (const [kind, re] of AV_BONES) if (re.test(o.name)) { gait.push({ bone: o, kind, side: avSide(o.name), q0: o.quaternion.clone() }); break; } });
  return { inner, gait, gw: 0, run: 0, gph: 0, stride: 0.62, baseY: T.y, root, cw: 0 };
}
function animateCharacter(c, P, t, dt) {
  for (const b of c.gait) b.bone.quaternion.copy(b.q0);
  gaitPose(c, t, dt, { moving: P.ride ? 0 : P.moving * (P.crouch ? 0.6 : 1), mode: 0 });
  // astride a horse or on the wagon seat: thighs forward, knees bent
  if (P.ride) {
    const ax = _gax.set(1, 0, 0).applyQuaternion(c.root.getWorldQuaternion(_gq));
    for (const b of c.gait) {
      const lat = { thigh: 1.35, calf: -1.25, foot: 0.3 }[b.kind]; if (!lat) continue;
      b.bone.parent.getWorldQuaternion(_gq2).invert(); _gl.copy(ax).applyQuaternion(_gq2); b.bone.quaternion.premultiply(_gr.setFromAxisAngle(_gl, lat));
    }
  }
  // crouch: knees and hips fold, the back leans in, the head stays level, the whole body sinks
  c.cw = lerp(c.cw, P.crouch ? 1 : 0, clamp(dt * 8, 0, 1));
  if (c.cw > 0.01) {
    const w = c.cw, ax = _gax.set(1, 0, 0).applyQuaternion(c.root.getWorldQuaternion(_gq));
    for (const b of c.gait) {
      const lat = { thigh: 1.15, calf: -2.0, foot: 0.85, spine: -0.32, chest: -0.12, head: 0.38, arm: 0.25, fore: 0.35 }[b.kind]; if (!lat) continue;
      b.bone.parent.getWorldQuaternion(_gq2).invert(); _gl.copy(ax).applyQuaternion(_gq2); b.bone.quaternion.premultiply(_gr.setFromAxisAngle(_gl, lat * w));
    }
    c.inner.position.y -= 0.46 * w;
  }
  // the arm holding a tool comes up in front, and the head follows the player's pitch
  if (P.held >= 0) for (const b of c.gait) if (b.kind === 'arm' && b.side === -1) { b.bone.parent.getWorldQuaternion(_gq2).invert(); _gl.set(1, 0, 0).applyQuaternion(c.root.getWorldQuaternion(_gq)).applyQuaternion(_gq2); b.bone.quaternion.premultiply(_gr.setFromAxisAngle(_gl, 0.9)); }
  for (const b of c.gait) if (b.kind === 'head') { b.bone.parent.getWorldQuaternion(_gq2).invert(); _gl.set(1, 0, 0).applyQuaternion(c.root.getWorldQuaternion(_gq)).applyQuaternion(_gq2); b.bone.quaternion.premultiply(_gr.setFromAxisAngle(_gl, -P.pitch * 0.6)); }
}
