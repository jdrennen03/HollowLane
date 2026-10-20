// ---------------------------------------------------------------- ghost model
const GHOST_U = { uTime: { value: 0 }, uAlpha: { value: 1 }, uRim: { value: new THREE.Color(0x9fc8ff) } };
function ghostMaterial(gown, color = 0x6e767c, rimK = 0.8) {
  return ghostInject(new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, transparent: true }), gown, rimK);
}
// adds the ghost look to any standard material: cold rim light and a flickering, broken-up translucency
function ghostInject(m, gown, rimK) {
  m.customProgramCacheKey = () => 'ghost' + (gown ? 1 : 0) + rimK;
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = GHOST_U.uTime; sh.uniforms.uAlpha = GHOST_U.uAlpha; sh.uniforms.uRim = GHOST_U.uRim;
    sh.vertexShader = 'uniform float uTime;\nvarying vec3 vGW;\nvarying float vLY;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vLY = position.y;
        ${gown ? 'float k = clamp(-position.y/0.95,0.,1.); transformed.x += sin(uTime*2.3+position.y*6.+position.z*4.)*0.06*k*k; transformed.z += cos(uTime*1.7+position.y*5.+position.x*5.)*0.06*k*k;' : ''}`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vGW = (modelMatrix*vec4(transformed,1.)).xyz;`);
    sh.fragmentShader = 'uniform float uTime;\nuniform float uAlpha;\nuniform vec3 uRim;\nvarying vec3 vGW;\nvarying float vLY;\n' + sh.fragmentShader
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rimF = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
        totalEmissiveRadiance += uRim * pow(rimF, 2.4) * ${rimK.toFixed(2)};`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float nn = fract(sin(dot(floor(vGW*22.0) + floor(uTime*9.0), vec3(12.9898,78.233,37.719)))*43758.5453);
        float aa = uAlpha * (0.78 + 0.22*nn);
        ${gown ? 'aa *= smoothstep(-0.98, -0.4, vLY);' : ''}
        gl_FragColor.a *= aa;`);
  };
  return m;
}
const LASER_U = { uPos: { value: new V3() }, uF: { value: new V3(0, 0, -1) }, uR: { value: new V3(1, 0, 0) }, uUp: { value: new V3(0, 1, 0) }, uOn: { value: 0 }, uTime: GHOST_U.uTime };
const laserGhostMat = new THREE.ShaderMaterial({
  uniforms: LASER_U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `#include <common>
    #include <skinning_pars_vertex>
    varying vec3 vW; varying vec3 vN; varying vec3 vV;
    void main(){
      #include <skinbase_vertex>
      #include <beginnormal_vertex>
      #include <skinnormal_vertex>
      #include <begin_vertex>
      #include <skinning_vertex>
      vec4 w = modelMatrix*vec4(transformed,1.); vW = w.xyz; vN = normalize(mat3(modelMatrix)*objectNormal); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform vec3 uPos; uniform vec3 uF; uniform vec3 uR; uniform vec3 uUp; uniform float uOn; uniform float uTime;
    varying vec3 vW; varying vec3 vN; varying vec3 vV;
    void main(){
      vec3 d = vW - uPos; float z = max(dot(d,uF), 0.05);
      vec2 p = vec2(dot(d,uR), dot(d,uUp)) / z * 17.1;
      vec2 f = fract(p) - 0.5;
      float dt = smoothstep(0.2, 0.04, length(f));
      // only the projected dots land on the body: no outline or glow between them
      if (dt < 0.02) discard;
      float a = dt * 1.1 * uOn;
      gl_FragColor = vec4(vec3(0.35, 1.0, 0.5) * a, a);
    }`
});
function buildGhostModel(scene) {
  const root = new THREE.Group(); root.visible = false; scene.add(root);
  const meshes = [];
  const skin = ghostMaterial(false, 0x40464b, 0.75), gown = ghostMaterial(true, 0x2c3136, 0.9), cloth = ghostMaterial(false, 0x2c3136, 0.9), dark = new THREE.MeshBasicMaterial({ color: 0x030303, transparent: true, opacity: 0.96 });
  const mk = (geo, m, parent, x = 0, y = 0, z = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; me.userData.gm = m; parent.add(me); meshes.push(me); return me; };
  const hips = new THREE.Group(); hips.position.y = 0.95; root.add(hips);
  // gown flowing to the floor
  const gp = []; for (let i = 0; i <= 12; i++) { const t = i / 12; gp.push(new THREE.Vector2(0.15 + t * t * 0.26 + Math.sin(t * 9) * 0.01, -t * 0.98)); }
  const gownM = mk(new THREE.LatheGeometry(gp.reverse(), 22), gown, hips); gownM.scale.z = 0.8;
  const spine = new THREE.Group(); hips.add(spine);
  const tp = [[0.14, 0], [0.13, 0.12], [0.17, 0.3], [0.19, 0.43], [0.12, 0.5], [0.05, 0.54]].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = mk(new THREE.LatheGeometry(tp, 18), cloth, spine); torso.scale.z = 0.62;
  const neck = new THREE.Group(); neck.position.y = 0.52; spine.add(neck);
  mk(new THREE.CylinderGeometry(0.04, 0.05, 0.1, 10), skin, neck, 0, 0.04, 0);
  const head = new THREE.Group(); head.position.y = 0.17; neck.add(head);
  const hd = mk(new THREE.SphereGeometry(0.105, 22, 16), skin, head); hd.scale.set(0.88, 1.18, 0.98);
  const hair = mk(new THREE.CylinderGeometry(0.112, 0.21, 0.66, 20, 6, true, Math.PI * 1.27, Math.PI * 1.46), dark, head, 0, -0.24, 0.015);
  { const hp = hair.geometry.attributes.position; for (let i = 0; i < hp.count; i++) { const y = hp.getY(i); hp.setX(i, hp.getX(i) * (1 + Math.sin(i * 7.3) * 0.06 * (0.33 - y))); } hair.geometry.computeVertexNormals(); }
  mk(new THREE.SphereGeometry(0.118, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), dark, head, 0, 0.012, 0.012).scale.set(0.93, 1.15, 1.02);
  for (const s of [-1, 1]) {
    mk(new THREE.SphereGeometry(0.024, 10, 8), dark, head, s * 0.035, 0.015, -0.085).scale.set(1.2, 0.8, 0.6);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), new THREE.MeshBasicMaterial({ color: 0xdff4ff })); eye.position.set(s * 0.035, 0.015, -0.098); head.add(eye); eye.userData.eye = true; meshes.push(eye);
  }
  mk(new THREE.SphereGeometry(0.03, 10, 8), dark, head, 0, -0.06, -0.08).scale.set(0.7, 1.4, 0.5);
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.2, 0.43, 0); spine.add(sh);
    mk(new THREE.CapsuleGeometry(0.042, 0.24, 4, 10), cloth, sh, 0, -0.15, 0);
    const el = new THREE.Group(); el.position.y = -0.31; sh.add(el);
    mk(new THREE.CapsuleGeometry(0.026, 0.26, 4, 10), skin, el, 0, -0.15, 0);
    const hand = new THREE.Group(); hand.position.y = -0.29; el.add(hand);
    mk(new THREE.BoxGeometry(0.05, 0.08, 0.02), skin, hand, 0, -0.03, 0);
    for (let f = 0; f < 4; f++) { const fi = mk(new THREE.CapsuleGeometry(0.0065, 0.085, 3, 6), skin, hand, (f - 1.5) * 0.013, -0.12, 0); fi.rotation.z = (f - 1.5) * 0.06; }
    arms.push({ sh, el, hand, s });
  }
  const gh = { root, hips, spine, neck, head, arms, meshes, phase: 0, laser: false };
  return gh;
}
// ---------------------------------------------------------------- model files
// Models ship as glTF JSON with the geometry embedded in base64. The artifact sandbox refuses to fetch data: URLs,
// so decode the buffer here and hand the loader an in-memory GLB; textures still load as normal same-origin files.
function loadModelFile(url, onLoad, onError) {
  fetch(url).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }).then(j => {
    const buf = j.buffers[0], b64 = buf.uri.slice(buf.uri.indexOf(',') + 1); delete buf.uri;
    const raw = atob(b64), bin = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) bin[i] = raw.charCodeAt(i);
    let js = new TextEncoder().encode(JSON.stringify(j)); const jsLen = (js.length + 3) & ~3, binLen = (bin.length + 3) & ~3;
    const glb = new ArrayBuffer(12 + 8 + jsLen + 8 + binLen), dv = new DataView(glb), u8 = new Uint8Array(glb);
    dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, glb.byteLength, true);
    dv.setUint32(12, jsLen, true); dv.setUint32(16, 0x4E4F534A, true); u8.fill(0x20, 20, 20 + jsLen); u8.set(js, 20);
    dv.setUint32(20 + jsLen, binLen, true); dv.setUint32(24 + jsLen, 0x004E4942, true); u8.set(bin, 28 + jsLen);
    new GLTFLoader().parse(glb, '', onLoad, onError);
  }).catch(e => onError && onError(e));
}
// ---------------------------------------------------------------- imported ghost models (one is picked at random each round)
const GHOST_FILES = [
  { url: 'ghost-endboss.json', height: 2.3, name: 'endboss' }, { url: 'ghost-zombie.json', height: 1.85, name: 'zombie' },
  { url: 'ghost-zombie-male.json', height: 1.85, name: 'zombie-male', arms: 'hang' }, { url: 'ghost-zombie-female.json', height: 1.74, name: 'zombie-female', arms: 'hang' },
  { url: 'ghost-vurdalak.json', height: 2.3, name: 'vurdalak' },
];
const GHOST_MODELS = [], GHOST_LOADING = {};
// models are fetched only when a round picks them (they are large); the stand-in ghost is used until it arrives
function loadGhostModel(idx) {
  const f = GHOST_FILES[idx]; if (!f || GHOST_MODELS[idx] || GHOST_LOADING[idx]) return; GHOST_LOADING[idx] = true;
  loadModelFile(f.url, gl => {
    try {
      const gm = GHOST_MODELS[idx] = prepGhostModel(gl, f, scene);
      // compile its shaders now so the first sighting doesn't stutter
      gm.root.position.set(0, -60, 0); setGhostLook(gm, 'visible'); renderer.compile(scene, camera); setGhostLook(gm, 'laser'); renderer.compile(scene, camera); setGhostLook(gm, 'hidden'); gm.look = 'hidden';
      if (G.ghostModel === idx) useGhostModel(idx);
    }
    catch (e) { console.warn('ghost model setup failed', f.url, e); }
  }, e => { GHOST_LOADING[idx] = false; console.warn('ghost model failed to load', f.url, e); });
}
function loadGhostModels(scene) { loadGhostModel(0); }   // warm one up at boot; the rest load on demand
// ---------------------------------------------------------------- auto-rig for models that come without a skeleton
// Static, T-posed figures get a simple humanoid skeleton fitted to their proportions, each vertex weighted to the nearest
// bones with soft blends at the joints. Bone names follow the Mixamo pattern so the procedural walk cycle drives them.
// The arms are folded forward into a zombie reach as the resting pose.
// split long triangles (midpoint of the longest edge, repeatedly) so low-poly garments can bend at a joint instead of
// stretching into flat sheets; every vertex attribute is interpolated
function subdivideLong(geo, maxLen, cap = 120000) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone(), names = Object.keys(g.attributes), A = names.map(n => g.attributes[n]);
  const tris = [], P = g.attributes.position, n = P.count;
  const vtx = i => names.map((_, k) => { const a = A[k], o = []; for (let c = 0; c < a.itemSize; c++) o.push(a.getComponent(i, c)); return o; });
  for (let i = 0; i < n; i += 3) tris.push([vtx(i), vtx(i + 1), vtx(i + 2)]);
  const pi = names.indexOf('position'), d2 = (a, b) => { const p = a[pi], q = b[pi]; return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; };
  const mid = (a, b) => a.map((arr, k) => arr.map((v, c) => (v + b[k][c]) / 2));
  const out = [], L2 = maxLen * maxLen;
  while (tris.length) {
    const t = tris.pop(); const e = [d2(t[0], t[1]), d2(t[1], t[2]), d2(t[2], t[0])], m = Math.max(...e);
    if (m <= L2 || out.length + tris.length > cap) { out.push(t); continue; }
    const k = e.indexOf(m), a = t[k], b = t[(k + 1) % 3], c = t[(k + 2) % 3], ab = mid(a, b);
    tris.push([a, ab, c], [ab, b, c]);
  }
  const ng = new THREE.BufferGeometry();
  names.forEach((nm, k) => { const sz = A[k].itemSize, arr = new Float32Array(out.length * 3 * sz); let o = 0; for (const t of out) for (const v of t) for (let c = 0; c < sz; c++) arr[o++] = v[k][c]; ng.setAttribute(nm, new THREE.BufferAttribute(arr, sz)); });
  if (ng.attributes.normal) { const N = ng.attributes.normal, v = new V3(); for (let i = 0; i < N.count; i++) { v.fromBufferAttribute(N, i).normalize(); N.setXYZ(i, v.x, v.y, v.z); } }
  return ng;
}
function autoRig(model) {
  model.updateMatrixWorld(true);
  const meshes = []; model.traverse(o => { if (o.isMesh && !o.isSkinnedMesh) meshes.push(o); });
  if (!meshes.length) return false;
  const box = new THREE.Box3(); for (const m of meshes) box.expandByObject(m, true);
  const H = box.max.y - box.min.y, y0 = box.min.y, cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2, span = Math.max(box.max.x - cx, cx - box.min.x);
  const Y = f => y0 + f * H;
  // find the armpit from the mesh itself: columns through the torso are tall, columns through a T-posed arm are thin
  const NB = 120, bmin = new Float32Array(NB).fill(1e9), bmax = new Float32Array(NB).fill(-1e9), ysum = new Float32Array(NB), ycnt = new Float32Array(NB), v0 = new V3();
  for (const m of meshes) { const P = m.geometry.attributes.position; for (let i = 0; i < P.count; i += 1) { v0.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); if (v0.y < Y(0.55)) continue; const k = Math.min(NB - 1, (Math.abs(v0.x - cx) / span * NB) | 0); bmin[k] = Math.min(bmin[k], v0.y); bmax[k] = Math.max(bmax[k], v0.y); ysum[k] += v0.y; ycnt[k]++; } }
  let pit = -1; for (let k = 4; k < NB - 6; k++) { let thin = true; for (let q = k; q < k + 5; q++) if (!(ycnt[q] > 0 && bmax[q] - bmin[q] < 0.12 * H)) thin = false; if (thin) { pit = k; break; } }
  const pitX = pit > 0 ? (pit + 0.5) / NB * span : 0.13 * H;
  let ay = 0, an = 0; for (let k = pit > 0 ? pit : 0; k < Math.min(NB, (pit > 0 ? pit : 0) + 20); k++) if (ycnt[k]) { ay += ysum[k]; an += ycnt[k]; }
  const shX = Math.max(0.06 * H, pitX - 0.025 * H);
  const elX = shX + 0.47 * (span - shX), armY = an ? ay / an : Y(0.805), legX = 0.055 * H;
  // joints (model space)
  const J = { hips: [0, Y(0.53)], spine: [0, Y(0.61)], chest: [0, Y(0.72)], neck: [0, Y(0.835)], head: [0, Y(0.875)] };
  const bone = (name, x, y, parent) => { const b = new THREE.Bone(); b.name = name; const pw = parent ? parent.userData.w : [cx, 0, cz]; b.position.set(cx + x - pw[0], y - pw[1], cz - pw[2]); b.userData.w = [cx + x, y, cz]; if (parent) parent.add(b); return b; };
  const B = {};
  B.hips = bone('mixamorigHips_0', 0, J.hips[1]); B.hips.position.set(cx, J.hips[1], cz);
  B.spine = bone('mixamorigSpine_1', 0, J.spine[1], B.hips); B.chest = bone('mixamorigSpine2_2', 0, J.chest[1], B.spine);
  B.neck = bone('mixamorigNeck_3', 0, J.neck[1], B.chest); B.head = bone('mixamorigHead_4', 0, J.head[1], B.neck);
  for (const [sd, sx] of [['Left', 1], ['Right', -1]]) {
    B['arm' + sx] = bone(`mixamorig${sd}Arm_${sx > 0 ? 5 : 6}`, sx * shX, armY, B.chest);
    B['fore' + sx] = bone(`mixamorig${sd}ForeArm_${sx > 0 ? 7 : 8}`, sx * elX, armY, B['arm' + sx]);
    B['thigh' + sx] = bone(`mixamorig${sd}UpLeg_${sx > 0 ? 9 : 10}`, sx * legX, Y(0.5), B.hips);
    B['calf' + sx] = bone(`mixamorig${sd}Leg_${sx > 0 ? 11 : 12}`, sx * legX, Y(0.27), B['thigh' + sx]);
    B['foot' + sx] = bone(`mixamorig${sd}Foot_${sx > 0 ? 13 : 14}`, sx * legX, Y(0.045), B['calf' + sx]);
  }
  const list = Object.values(B), idx = new Map(list.map((b, i) => [b, i]));
  // skin weights from the distance to each bone's segment (capsule falloff), with anatomy rules so arms never pull on
  // the torso and a leg never pulls on the other leg; each vertex keeps its 3 strongest influences
  const P3 = (x, y, z = cz) => new V3(x, y, z), handY = armY;
  const seg = [
    [B.hips, P3(cx, Y(0.46)), P3(cx, Y(0.61)), 0.10], [B.spine, P3(cx, Y(0.61)), P3(cx, Y(0.72)), 0.10], [B.chest, P3(cx, Y(0.72)), P3(cx, Y(0.835)), 0.10],
    [B.neck, P3(cx, Y(0.835)), P3(cx, Y(0.875)), 0.04], [B.head, P3(cx, Y(0.875)), P3(cx, Y(1.0)), 0.06],
  ];
  for (const sx of [1, -1]) seg.push(
    [B['arm' + sx], P3(cx + sx * shX, armY), P3(cx + sx * elX, armY), 0.03, sx, 'arm'], [B['fore' + sx], P3(cx + sx * elX, armY), P3(cx + sx * span, handY), 0.03, sx, 'arm'],
    [B['thigh' + sx], P3(cx + sx * legX, Y(0.5)), P3(cx + sx * legX, Y(0.27)), 0.05, sx, 'leg'], [B['calf' + sx], P3(cx + sx * legX, Y(0.27)), P3(cx + sx * legX, Y(0.045)), 0.04, sx, 'leg'],
    [B['foot' + sx], P3(cx + sx * legX, Y(0.045)), P3(cx + sx * legX, Y(0.0), cz + 0.09 * H), 0.03, sx, 'leg']);
  const tmp = new V3(), ab = new V3(), ap = new V3();
  const segDist = (p, a, b) => { ab.subVectors(b, a); ap.subVectors(p, a); const t = Math.min(1, Math.max(0, ap.dot(ab) / ab.lengthSq())); return tmp.copy(a).addScaledVector(ab, t).distanceTo(p); };
  const weigh = (x, y, z) => {
    const p = P3(x, y, z), ax = Math.abs(x - cx), side = x >= cx ? 1 : -1, out = [];
    const inArm = ax > pitX + 0.02 * H && y > Y(0.6), inLeg = y < Y(0.5);   // everything out past the armpit is arm, sleeves included
    for (const [b, a, e, r, sx, kind] of seg) {
      if (sx && sx !== side && ax > 0.015 * H) continue;            // never the other side's limb
      if (kind === 'arm' && (ax < pitX - 0.045 * H || y < Y(0.6))) continue;   // arms stay off the torso
      if (!kind && inArm && ax > pitX + 0.02 * H) continue;            // and the torso stays off the arm
      if (kind === 'leg' && y > Y(0.56)) continue;
      if (!kind && y < Y(0.4)) continue;
      const d = Math.max(1e-4, segDist(p, a, e) / H - r * 0.4);
      out.push([b, 1 / Math.pow(d, 4)]);
    }
    if (!out.length) out.push([inLeg ? B['thigh' + side] : B.hips, 1]);
    return out.sort((q, w) => w[1] - q[1]).slice(0, 3);
  };
  const root = new THREE.Group(); root.name = 'autoRig'; root.add(B.hips);
  const skeleton = new THREE.Skeleton(list);
  const parent = meshes[0].parent;
  model.add(root); root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
  for (const m of meshes) {
    const g = subdivideLong(m.geometry, 0.022 * H / Math.max(1e-6, m.matrixWorld.getMaxScaleOnAxis())); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));   // into the model's own frame, long triangles split
    const P = g.attributes.position, n = P.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), mw = model.matrixWorld, v = new V3();
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(mw);   // weights are decided in world-up space
      const ws = weigh(v.x, v.y, v.z); let tot = 0; for (const [, x] of ws) tot += x;
      ws.forEach(([b, x], k) => { si[i * 4 + k] = idx.get(b); sw[i * 4 + k] = x / (tot || 1); });
    }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    const sm = new THREE.SkinnedMesh(g, m.material); sm.name = m.name; model.add(sm);
    m.parent.remove(m);
  }
  // bind in world-up space: the bones were placed in world terms, so put the rig back under the model's inverse transform
  root.matrix.copy(inv); root.matrix.decompose(root.position, root.quaternion, root.scale); model.updateMatrixWorld(true);
  skeleton.calculateInverses(); model.traverse(o => { if (o.isSkinnedMesh) o.bind(skeleton, o.matrixWorld); });
  // resting slump: head hung, chest forward (the arms are posed by the generic zombie reach)
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  B.head.quaternion.setFromEuler(e.set(0.25, 0, 0.12, 'XYZ')); B.chest.quaternion.setFromEuler(e.set(0.12, 0, 0, 'XYZ'));
  return true;
}
function prepGhostModel(gl, f, scene) {
  const model = gl.scene;
  let rigged = false; model.traverse(o => { if (o.isSkinnedMesh) rigged = true; });
  if (!rigged) autoRig(model);
  // keep the creature in place: drop horizontal root motion from the hips, keep the bob
  for (const clip of gl.animations) for (const tr of clip.tracks) {
    if (!/\.position$/.test(tr.name) || !/hips/i.test(tr.name)) continue;
    const v = tr.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
  }
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model, true), size = box.getSize(new V3()), s = f.height / Math.max(size.y, 1e-6);
  const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
  const root = new THREE.Group(), inner = new THREE.Group(); inner.add(model); root.add(inner);
  inner.scale.setScalar(s); inner.rotation.y = Math.PI; inner.position.set(cx * s, -box.min.y * s, cz * s);   // models face +z; the ghost faces -z
  const meshes = [];
  model.traverse(o => {
    if (!o.isMesh) return;
    o.frustumCulled = false; o.castShadow = true; o.receiveShadow = false;
    // seen in person it is the solid, fully textured creature; only the laser grid shows a silhouette
    // Rebuilt as a lean standard material: colour + normal map only. The imported physical materials also carry
    // AO/roughness/metalness/specular maps, which with the house's shadow and cookie maps go past the 16 texture
    // units most GPUs allow; the shader then fails and only the shadow pass draws.
    const src = Array.isArray(o.material) ? o.material[0] : o.material;
    // Keeps colour, normal, roughness and ambient-occlusion maps (4 texture units: with the bone texture and the house's
    // 11 light/shadow maps that is exactly 16). Metalness and specular maps are left out; their factors carry over.
    const cut = src.transparent || (src.alphaTest || 0) > 0;   // hair cards and the like: alpha cutout, no sorting trouble
    const m = new THREE.MeshStandardMaterial({ map: src.map || null, normalMap: src.normalMap || null, roughnessMap: src.roughnessMap || null, aoMap: src.aoMap || null, aoMapIntensity: src.aoMapIntensity ?? 1,
      color: src.color ? src.color.clone() : 0xffffff, roughness: src.roughness ?? 0.8, metalness: src.metalness ?? 0, side: src.side, alphaTest: cut ? Math.max(0.45, src.alphaTest || 0) : 0 });
    for (const t of [m.map, m.normalMap, m.roughnessMap, m.aoMap]) if (t) { t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.needsUpdate = true; }
    if (src.normalMap && src.normalScale) m.normalScale.copy(src.normalScale);
    if (src.map) src.map.colorSpace = THREE.SRGBColorSpace;
    o.material = m; o.userData.gm = m; meshes.push(o);
  });
  const mixer = new THREE.AnimationMixer(model);
  const action = gl.animations[0] ? mixer.clipAction(gl.animations[0]) : null; if (action) action.play();
  // the models only ship an idle clip, so walking is layered on procedurally: find the limbs to swing
  if (f.arms) armPose(model, f.arms);
  const gait = [];
  model.traverse(o => {
    if (!o.isBone) return;
    for (const [kind, re] of GAIT_BONES) if (re.test(o.name)) { gait.push({ bone: o, kind, side: /_L_|Left|^\w+\d+L_/.test(o.name) ? 1 : /_R_|Right|^\w+\d+R_/.test(o.name) ? -1 : 0, q0: o.quaternion.clone() }); break; }
  });
  root.visible = false; scene.add(root);
  return { root, inner, baseY: inner.position.y, meshes, mixer, action, gait, stride: f.height * 0.36, gph: 0, gw: 0, run: 0, glb: true, look: 'hidden', phase: 0, name: f.name };
}
// pose each upper arm (from whatever bind pose the model has) toward a target direction in the model's frame:
// 'hang' lets T-posed arms fall to the sides (the hunt's reach lifts them), 'reach' points them forward
function armPose(model, how) {
  model.updateMatrixWorld(true);
  const bones = []; model.traverse(o => { if (o.isBone) bones.push(o); });
  const find = (kind, side) => bones.find(o => GAIT_BONES.find(g => g[0] === kind)[1].test(o.name) && (side > 0 ? /_L_|Left|^\w+\d+L_/ : /_R_|Right|^\w+\d+R_/).test(o.name));
  const mq = model.getWorldQuaternion(new THREE.Quaternion()), mqi = mq.clone().invert();
  for (const sd of [1, -1]) {
    const arm = find('arm', sd), fore = find('fore', sd); if (!arm || !fore) continue;
    const a = model.worldToLocal(arm.getWorldPosition(new V3())), b = model.worldToLocal(fore.getWorldPosition(new V3()));
    const d = b.sub(a).normalize(), sx = Math.sign(d.x) || sd, t = (how === 'reach' ? new V3(sx * 0.16, -0.32, 1) : new V3(sx * 0.42, -0.88, 0.14)).normalize();
    const qm = new THREE.Quaternion().setFromUnitVectors(d, t), qw = mq.clone().multiply(qm).multiply(mqi);
    const pq = arm.parent.getWorldQuaternion(new THREE.Quaternion()), pqi = pq.clone().invert();
    arm.quaternion.premultiply(pqi.multiply(qw).multiply(pq)); arm.updateMatrixWorld(true);
    // a slight bend at the elbow so the arm doesn't hang dead straight
    const fq = fore.parent.getWorldQuaternion(new THREE.Quaternion()).invert(), lat = new V3(1, 0, 0).applyQuaternion(mq).applyQuaternion(fq);
    fore.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(lat, 0.25)); fore.updateMatrixWorld(true);
  }
}
function useGhostModel(idx) {
  loadGhostModel(idx);
  const next = GHOST_MODELS[idx] || G.ghProc; if (!next || next === G.gh) return;
  if (G.gh) { setGhostLook(G.gh, 'hidden'); G.gh.look = 'hidden'; }
  G.gh = next; G.gh.look = null; WARM = true;
}
function animateGhost(gh, t, dt, v) {
  if (!gh.glb) { gh.phase += dt * (v.moving || 0) * 4.5; poseGhost(gh, t, Math.min(1.5, (v.moving || 0) / 1.2), v.mode); return; }
  const mv = v.moving || 0;
  for (const b of gh.gait) b.bone.quaternion.copy(b.q0);   // bones the clip doesn't drive would otherwise accumulate the gait
  gh.mixer.timeScale = v.mode === 2 ? 1.1 : v.mode === 3 ? 1.6 : 0.75 + mv * 0.2;
  gh.mixer.update(dt);
  gaitPose(gh, t, dt, v);
}
// ---------------------------------------------------------------- procedural walk / run cycle on top of the idle clip
const GAIT_BONES = [
  ['thigh', /b_Thigh_|(Left|Right)UpLeg|^leg1[LR]_/], ['calf', /b_Calf_|(Left|Right)Leg_|^leg2[LR]_/], ['foot', /b_Metatarsals_|(Left|Right)Foot_|^leg3[LR]_/],
  ['arm', /b_UpperArm_Big|(Left|Right)Arm_|^hand1[LR]_/], ['fore', /b_LowerArm_Big|(Left|Right)ForeArm|^hand2[LR]_/],
  ['spine', /b_Spine_Lower|Spine_\d|^spine2_/], ['chest', /b_Spine_Upper|Spine2|^spine4_/], ['head', /b_Head_|mixamorig:?Head_|^head_\d/],
];
const _gq = new THREE.Quaternion(), _gq2 = new THREE.Quaternion(), _gr = new THREE.Quaternion(), _gax = new V3(), _gup = new V3(), _gl = new V3();
function gaitPose(gh, t, dt, v) {
  const mv = v.moving || 0, hunt = v.mode === 2 || v.mode === 3, k = 1 - Math.exp(-dt * 6);
  gh.gw = lerp(gh.gw, clamp(mv / 0.55, 0, 1), k);
  gh.run = lerp(gh.run, clamp((mv - 1.1) / 1.0, 0, 1), k);
  gh.gph += dt * mv / gh.stride * Math.PI * (1 - gh.run * 0.18);
  const w = gh.gw, run = gh.run, ph = gh.gph;
  gh.inner.position.y = gh.baseY + Math.abs(Math.sin(ph)) * gh.stride * (0.05 + run * 0.07) * w - gh.stride * 0.04 * run * w;
  if (w < 0.01 && !hunt) return;
  gh.root.updateMatrixWorld(true);
  gh.root.getWorldQuaternion(_gq);
  _gax.set(1, 0, 0).applyQuaternion(_gq); _gup.set(0, 1, 0);   // the ghost's lateral axis (positive = swing toward its facing) and world up
  const reach = hunt ? 1 : 0;
  for (const b of gh.gait) {
    const s = Math.sin(ph + (b.side > 0 ? 0 : Math.PI)), c = Math.cos(ph + (b.side > 0 ? 0 : Math.PI));
    let lat = 0, yaw = 0;
    switch (b.kind) {
      case 'thigh': lat = s * (0.42 + run * 0.3) * w - run * 0.15 * w; break;
      case 'calf': lat = -(0.1 + Math.max(0, c) * (0.65 + run * 0.5)) * w; break;   // knee folds as the leg swings through
      case 'foot': lat = Math.max(0, -s) * 0.3 * w; break;
      case 'arm': lat = -s * (0.32 + run * 0.25) * w * (1 - reach * 0.6) + reach * 0.9; break;
      case 'fore': lat = (0.15 + run * 0.35) * w + reach * 0.35; break;
      case 'spine': lat = -(0.06 + run * 0.16) * w - reach * 0.08; yaw = Math.sin(ph) * 0.07 * w; break;
      case 'chest': yaw = -Math.sin(ph) * 0.09 * w; lat = -reach * 0.06; break;
      case 'head': lat = Math.cos(ph * 2) * 0.03 * w + (0.06 + run * 0.1) * w; yaw = Math.sin(ph) * 0.04 * w; break;
    }
    if (!lat && !yaw) continue;
    b.bone.parent.getWorldQuaternion(_gq2).invert();
    if (lat) { _gl.copy(_gax).applyQuaternion(_gq2); b.bone.quaternion.premultiply(_gr.setFromAxisAngle(_gl, lat)); }
    if (yaw) { _gl.copy(_gup).applyQuaternion(_gq2); b.bone.quaternion.premultiply(_gr.setFromAxisAngle(_gl, yaw)); }
  }
}
function poseGhost(gh, t, speed, mode) {
  const ph = gh.phase;
  const hunt = mode === 2, reach = hunt || mode === 3;
  gh.hips.position.y = 0.95 + Math.sin(ph * 2) * 0.015 * speed + Math.sin(t * 1.3) * 0.02;
  gh.spine.rotation.x = reach ? 0.28 : 0.12;
  gh.spine.rotation.z = Math.sin(ph) * 0.04 * speed;
  gh.neck.rotation.x = reach ? -0.2 : 0.35 + Math.sin(t * 0.7) * 0.05;
  const jitter = (Math.sin(t * 17.3) > 0.97) ? (Math.random() - 0.5) * 0.6 : 0;
  gh.head.rotation.z = 0.35 * Math.sin(t * 0.37) + jitter;
  gh.head.rotation.y = Math.sin(t * 0.5) * 0.15;
  for (const a of gh.arms) {
    const sw = Math.sin(ph + (a.s > 0 ? Math.PI : 0)) * 0.25 * speed;
    a.sh.rotation.x = reach ? -1.35 + Math.sin(t * 3 + a.s) * 0.08 : -0.15 + sw;
    a.sh.rotation.z = a.s * (reach ? 0.12 : 0.1);
    a.el.rotation.x = reach ? -0.25 : -0.25 - Math.max(0, -sw) * 0.3;
    a.hand.rotation.x = reach ? 0.2 : 0.1;
  }
}
const shadowGhostMat = new THREE.MeshBasicMaterial({ color: 0x000000, fog: true });   // the Shade: a hole in the shape of a body
function setGhostLook(gh, mode) { // 'hidden' | 'visible' | 'laser' | 'shadow'
  gh.root.visible = mode !== 'hidden';
  for (const m of gh.meshes) {
    if (m.userData.eye) { m.visible = mode === 'visible'; continue; }
    m.material = mode === 'laser' ? laserGhostMat : mode === 'shadow' ? shadowGhostMat : m.userData.gm;
    m.castShadow = mode === 'visible' || mode === 'shadow';
  }
}

// ---------------------------------------------------------------- navigation grid (one layer per floor, linked at the stairs)
const NAV = { x0: 0, z0: 0, cs: 0.25, w: 1, h: 1, L: 1, N: 1, block: null, closet: {}, links: new Map() };
function buildNav() {
  const [bx0, bz0, bx1, bz1] = MAP.navBox; NAV.x0 = bx0; NAV.z0 = bz0; NAV.cs = MAP.navCs || 0.25;
  NAV.w = Math.ceil((bx1 - bx0) / NAV.cs); NAV.h = Math.ceil((bz1 - bz0) / NAV.cs); NAV.N = NAV.w * NAV.h; NAV.L = MAP.levels.length;
  const { x0, z0, cs, w, h, N } = NAV; NAV.block = new Uint8Array(N * NAV.L); NAV.closet = {}; NAV.links = new Map();
  for (const D of DOORS) if (D.closet) NAV.closet[D.i] = [];
  for (let l = 0; l < NAV.L; l++) {
    const ly = MAP.levels[l], holes = holesFor(l, 'floor');
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const x = x0 + (i + 0.5) * cs, z = z0 + (j + 0.5) * cs; let b = 0;
      const ri = roomIdxAt(x, z, ly + 0.1);
      const open = (ri >= 0 && (ROOMS[ri].lv || 0) === l) || (MAP.navWalk && MAP.navWalk(l, x, z));
      if (!open || holes.some(q => x > q[0] - 0.1 && x < q[2] + 0.1 && z > q[1] - 0.1 && z < q[3] + 0.1)) b = 1;
      else for (const c of COLL) { if (!collAt(c, ly) ) continue; if (x > c.x0 - 0.24 && x < c.x1 + 0.24 && z > c.z0 - 0.24 && z < c.z1 + 0.24) { b = 1; break; } }
      const k = l * N + j * w + i; NAV.block[k] = b;
      for (const D of DOORS) { if (!D.closet || Math.abs(D.y - ly) > 0.5) continue; const d = D.def, along = d.z !== undefined; const u = along ? x : z, v = along ? z - d.z : x - d.x; if (u > d.s - 0.05 && u < d.e + 0.05 && Math.abs(v) < 0.3) NAV.closet[D.i].push(k); }
    }
  }
  // stairs: join the highest open cell on the ramp to the landing above
  const link = (a, b) => { if (!NAV.links.has(a)) NAV.links.set(a, []); NAV.links.get(a).push(b); };
  for (const st of STAIRS) {
    const along = st.axis === 'z', lo0 = along ? st.x0 : st.z0, lo1 = along ? st.x1 : st.z1, a0 = along ? st.z0 : st.x0, a1 = along ? st.z1 : st.x1;
    const dirUp = st.flip ? -1 : 1, top = st.flip ? a0 : a1;
    for (let u = lo0 + cs / 2; u < lo1; u += cs) {
      let lower = -1;
      for (let v = top - dirUp * 0.12; (dirUp > 0 ? v > a0 : v < a1); v -= dirUp * cs) { const [i, j] = along ? navCell(u, v) : navCell(v, u); if (!navBlocked(i, j, st.lo)) { lower = st.lo * N + j * w + i; break; } }
      const vu = top + dirUp * 0.3, [ui, uj] = along ? navCell(u, vu) : navCell(vu, u);
      if (lower < 0 || navBlocked(ui, uj, st.hi)) continue;
      const upper = st.hi * N + uj * w + ui; link(lower, upper); link(upper, lower);
    }
  }
}
function navCell(x, z) { return [clamp(Math.floor((x - NAV.x0) / NAV.cs), 0, NAV.w - 1), clamp(Math.floor((z - NAV.z0) / NAV.cs), 0, NAV.h - 1)]; }
function navBlocked(i, j, l = 0, dyn) { if (i < 0 || j < 0 || i >= NAV.w || j >= NAV.h || l < 0 || l >= NAV.L) return true; const k = l * NAV.N + j * NAV.w + i; if (NAV.block[k]) return true; if (dyn && dyn.has(k)) return true; return false; }
function nearestFree(i, j, l, dyn) { if (!navBlocked(i, j, l, dyn)) return [i, j]; for (let r = 1; r < 10; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (!navBlocked(i + di, j + dj, l, dyn)) return [i + di, j + dj]; return [i, j]; }
const _heap = [];
function findPath(sx, sz, sl, tx, tz, tl, dyn) {
  const W = NAV.w, N = NAV.N, T = N * NAV.L;
  sl = clamp(sl | 0, 0, NAV.L - 1); tl = clamp(tl | 0, 0, NAV.L - 1);
  const [si, sj] = nearestFree(...navCell(sx, sz), sl, dyn), [ti, tj] = nearestFree(...navCell(tx, tz), tl, dyn);
  const g = new Float32Array(T).fill(1e9), from = new Int32Array(T).fill(-1), closed = new Uint8Array(T);
  const heap = _heap; heap.length = 0;
  const push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (; ;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const h = (l, i, j) => Math.hypot(ti - i, tj - j) + Math.abs(tl - l) * 4;
  const s = sl * N + sj * W + si, t = tl * N + tj * W + ti; g[s] = 0; push(s, 0); let found = false, it = 0;
  while (heap.length && it++ < 40000) {
    const [, k] = pop(); if (closed[k]) continue; closed[k] = 1; if (k === t) { found = true; break; }
    const l = (k / N) | 0, kk = k - l * N, ci = kk % W, cj = (kk / W) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const ni = ci + di, nj = cj + dj; if (navBlocked(ni, nj, l, dyn)) continue;
      if (di && dj && (navBlocked(ci + di, cj, l, dyn) || navBlocked(ci, cj + dj, l, dyn))) continue;
      const nk = l * N + nj * W + ni, ng = g[k] + (di && dj ? 1.414 : 1); if (ng < g[nk]) { g[nk] = ng; from[nk] = k; push(nk, ng + h(l, ni, nj)); }
    }
    const lk = NAV.links.get(k);
    if (lk) for (const nk of lk) { const ng = g[k] + 3; if (ng < g[nk]) { g[nk] = ng; from[nk] = k; const nl = (nk / N) | 0, r = nk - nl * N; push(nk, ng + h(nl, r % W, (r / W) | 0)); } }
  }
  if (!found) return [];
  const cells = []; for (let k = t; k !== -1; k = from[k]) cells.push(k); cells.reverse();
  const pts = cells.map(k => { const l = (k / N) | 0, r = k - l * N; return [NAV.x0 + (r % W + 0.5) * NAV.cs, NAV.z0 + (((r / W) | 0) + 0.5) * NAV.cs, l]; });
  // string-pull within each floor
  const out = []; let a = 0;
  while (a < pts.length - 1) {
    let b = pts.length - 1;
    while (b > a + 1 && (pts.slice(a, b + 1).some(p => p[2] !== pts[a][2]) || !gridLOS(pts[a], pts[b], pts[a][2], dyn))) b--;
    out.push(pts[b]); a = b;
  }
  return out;
}
function gridLOS(a, b, l, dyn) { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / 0.1); for (let i = 1; i < n; i++) { const t = i / n; const [ci, cj] = navCell(lerp(a[0], b[0], t), lerp(a[1], b[1], t)); if (navBlocked(ci, cj, l, dyn)) return false; } return true; }
function randomPointInRoom(ri) {
  const R = ROOMS[ri], r = R.r, l = R.lv || 0;
  for (let k = 0; k < 60; k++) { const x = rr(r[0] + 0.3, r[2] - 0.3), z = rr(r[1] + 0.3, r[3] - 0.3); const [i, j] = navCell(x, z); if (!navBlocked(i, j, l)) return [x, z, l]; }
  const [x, z] = R.lamp; return [x, z, l];
}
// line of sight on the floor plan: walls and closed doors on that floor block it
function sightClear(ax, az, bx, bz, ay, by) {
  if (ay !== undefined && by !== undefined && Math.abs(ay - by) > 1.6) return false;
  const hy = (ay ?? MAP.levels[0]) + 1.2;
  for (const b of SIGHT) if (b.y0 < hy && b.y1 > hy && segAABB(ax, az, bx, bz, b)) return false;
  for (const D of DOORS) { if (D.angle > 0.35 || Math.abs(D.y + 1.2 - hy) > 1.4) continue; const s = doorSeg(D); if (segSeg(ax, az, bx, bz, s[0], s[1], s[2], s[3])) return false; }
  return true;
}
function rayWall(x, z, dx, dz, maxD, y = MAP.levels[0]) {
  let best = null; const hy = y + 1.2;
  for (const c of COLL) {
    if (c.furn || c.y1 - c.y0 < 1.6 || c.y0 > hy || c.y1 < hy) continue;
    let tmin = 0, tmax = maxD, nx = 0, nz = 0;
    for (const [o, d, lo, hi, ax] of [[x, dx, c.x0, c.x1, 0], [z, dz, c.z0, c.z1, 1]]) {
      if (Math.abs(d) < 1e-8) { if (o < lo || o > hi) { tmin = 1e9; break; } continue; }
      let t1 = (lo - o) / d, t2 = (hi - o) / d, n1 = -1; if (t1 > t2) { [t1, t2] = [t2, t1]; n1 = 1; }
      if (t1 > tmin) { tmin = t1; if (ax === 0) { nx = n1; nz = 0; } else { nz = n1; nx = 0; } }
      tmax = Math.min(tmax, t2); if (tmin > tmax) { tmin = 1e9; break; }
    }
    if (tmin < maxD && tmin > 0 && (!best || tmin < best.d)) best = { d: tmin, x: x + dx * tmin, z: z + dz * tmin, nx, nz };
  }
  return best;
}

// ---------------------------------------------------------------- UV handprints
const PRINT_U = { uvPos: { value: [new V3(), new V3()] }, uvDir: { value: [new V3(0, 0, -1), new V3(0, 0, -1)] }, uvOn: { value: [0, 0] }, map: { value: null } };
let printMat = null;
function makePrintMat() {
  PRINT_U.map.value = TEX.hand;
  printMat = new THREE.ShaderMaterial({
    uniforms: PRINT_U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4,
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 uvPos[2]; uniform vec3 uvDir[2]; uniform float uvOn[2]; varying vec2 vUv; varying vec3 vW;
      void main(){ float a = texture2D(map, vUv).a; float L = 0.0;
        for(int i=0;i<2;i++){ vec3 d = vW - uvPos[i]; float dist = length(d); float c = dot(d/dist, uvDir[i]); L += uvOn[i] * smoothstep(0.87, 0.95, c) * clamp(1.0 - dist/5.5, 0.0, 1.0); }
        L = min(L, 1.0);
        gl_FragColor = vec4(vec3(0.45, 1.0, 0.75) * a * L * 1.6, a * L); }`
  });
}
const PRINTS = [];
function addPrint(x, y, z, nx, nz, rot, doorIdx = -1, side = 1, small = false) {
  const k = small === true ? 0.3 : (typeof small === 'number' && small > 0 ? small : 1);   // fingertip on a switch, or a child-sized hand
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.19 * k, 0.23 * k), printMat);
  if (doorIdx >= 0) { const D = DOORS[doorIdx]; m.position.set(x, y, side * 0.03); m.rotation.set(0, side > 0 ? 0 : Math.PI, rot); D.panel.add(m); }
  else { m.position.set(x + nx * 0.004, y, z + nz * 0.004); m.rotation.set(0, Math.atan2(nx, nz), rot); WORLD.root.add(m); }
  m.renderOrder = 3;
  PRINTS.push(m);
}

// ---------------------------------------------------------------- props (throwable)
const PROP_DEF = {
  mug: () => ({ geo: new THREE.CylinderGeometry(0.042, 0.038, 0.1, 14), mat: 'ceramicRed', hh: 0.05, r: 0.05 }),
  cup: () => ({ geo: new THREE.CylinderGeometry(0.04, 0.03, 0.08, 14), mat: 'porcelain', hh: 0.04, r: 0.045 }),
  book: () => ({ geo: new THREE.BoxGeometry(0.17, 0.04, 0.24), mat: pick(['bookA', 'bookB', 'bookC', 'bookD']), hh: 0.02, r: 0.12 }),
  remote: () => ({ geo: new THREE.BoxGeometry(0.05, 0.02, 0.17), mat: 'blackPlastic', hh: 0.01, r: 0.08 }),
  plate: () => ({ geo: new THREE.CylinderGeometry(0.12, 0.1, 0.018, 20), mat: 'porcelain', hh: 0.009, r: 0.12 }),
  vase: () => { const p = []; for (let i = 0; i <= 10; i++) { const t = i / 10; p.push(new THREE.Vector2(0.05 + Math.sin(t * 3.0) * 0.05 + (t > 0.85 ? (t - 0.85) * 0.3 : 0), t * 0.28)); } const g = new THREE.LatheGeometry(p, 16); g.translate(0, -0.14, 0); return { geo: g, mat: 'ceramicBlue', hh: 0.14, r: 0.1 }; },
  bowl: () => { const g = new THREE.SphereGeometry(0.11, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); g.translate(0, 0.06, 0); return { geo: g, mat: 'ceramicBlue', hh: 0.0, r: 0.11 }; },
  candle: () => ({ geo: new THREE.CylinderGeometry(0.022, 0.022, 0.2, 10), mat: 'wax', hh: 0.1, r: 0.05 }),
  bottle: () => ({ geo: new THREE.CylinderGeometry(0.03, 0.036, 0.24, 12), mat: 'bottleGreen', hh: 0.12, r: 0.06 }),
  pot: () => ({ geo: new THREE.CylinderGeometry(0.12, 0.11, 0.13, 18), mat: 'metal', hh: 0.065, r: 0.12 }),
  kettle: () => ({ geo: new THREE.SphereGeometry(0.09, 14, 10), mat: 'chrome', hh: 0.08, r: 0.09, sy: 0.85 }),
  ball: () => ({ geo: new THREE.SphereGeometry(0.1, 16, 12), mat: 'toyRed', hh: 0.1, r: 0.1, roll: true }),
  block: () => ({ geo: new THREE.BoxGeometry(0.07, 0.07, 0.07), mat: pick(['toyBlue', 'toyYellow', 'toyRed']), hh: 0.035, r: 0.045 }),
  teddy: () => { const g = new THREE.SphereGeometry(0.11, 14, 10); g.scale(1, 1.2, 0.85); const h = new THREE.SphereGeometry(0.08, 14, 10); h.translate(0, 0.17, 0); const e1 = new THREE.SphereGeometry(0.03, 8, 6); e1.translate(-0.06, 0.24, 0); const e2 = e1.clone(); e2.translate(0.12, 0, 0); return { geo: mergeGeos([g, h, e1, e2]), mat: 'plush', hh: 0.13, r: 0.13 }; },
  truck: () => ({ geo: new THREE.BoxGeometry(0.12, 0.08, 0.22), mat: 'toyRed', hh: 0.04, r: 0.12 }),
  phone: () => ({ geo: new THREE.BoxGeometry(0.2, 0.08, 0.16), mat: 'blackPlastic', hh: 0.04, r: 0.11 }),
  clock: () => ({ geo: new THREE.BoxGeometry(0.14, 0.1, 0.07), mat: 'brass', hh: 0.05, r: 0.08 }),
  jbox: () => ({ geo: new THREE.BoxGeometry(0.18, 0.08, 0.12), mat: 'darkWood', hh: 0.04, r: 0.1 }),
  soap: () => ({ geo: new THREE.CylinderGeometry(0.03, 0.03, 0.15, 10), mat: 'enamelMint', hh: 0.075, r: 0.05 }),
  basket: () => ({ geo: new THREE.CylinderGeometry(0.25, 0.2, 0.3, 14, 1, true), mat: 'lightWood', hh: 0.15, r: 0.25 }),
  shoe: () => ({ geo: new THREE.BoxGeometry(0.1, 0.11, 0.27), mat: 'fabricBlue', hh: 0.055, r: 0.14 }),
  slipper: () => ({ geo: new THREE.BoxGeometry(0.1, 0.08, 0.26), mat: 'fabricRose', hh: 0.04, r: 0.13 }),
};
// the sneakers come in five pairs (shoe1..shoe5) and the slippers in two, all drawn from the same files
for (let i = 1; i <= 5; i++) PROP_DEF['shoe' + i] = PROP_DEF.shoe;
for (let i = 1; i <= 2; i++) PROP_DEF['slipper' + i] = PROP_DEF.slipper;
function mergeGeos(gs) { const gb = new GB(); for (const g of gs) gb.add(g, new THREE.Matrix4(), 'x'); const B = gb.buf.x; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2)); return g; }
// props drawn with a loaded model instead of their simple shape (which stays as the invisible physics body)
// h scales to a height, len to a length along z; part picks one named node out of a collection
const PROP_MODELS = { teddy: { url: 'prop-teddy.json', h: 0.3 }, slipper1: { url: 'prop-bathset.json', part: 'bs1', len: 0.26 }, slipper2: { url: 'prop-bathset.json', part: 'bs2', len: 0.25 } };
['base015_9', 'base016_23', 'base017_30', 'base018_40', 'base019_50'].forEach((part, i) => { PROP_MODELS['shoe' + (i + 1)] = { url: 'prop-shoes.json', part, len: 0.27 }; });
const PROP_TPL = {};
function propModel(type, mesh, hh) {
  const M = PROP_MODELS[type], put = T0 => { const T = M.part ? modelPart(T0, M.part) : T0; if (!T) return console.warn('prop part', type); const g = new THREE.Group(), s = M.len ? M.len / T.sz.z : M.h / T.sz.y, c = T.b.getCenter(new V3()); g.add(T.m.clone()); g.scale.setScalar(s); g.position.set(-c.x * s, -T.b.min.y * s - hh, -c.z * s); mesh.add(g); };
  mesh.material = PROP_HIT_MAT;
  const T = PROP_TPL[M.url]; if (T && T.m) return put(T); if (T) return T.wait.push(put);
  const W = PROP_TPL[M.url] = { wait: [put] };
  loadModelFile(M.url, gl => { const m = gl.scene; m.traverse(o => { if (o.isMesh) { o.material = leanMat(Array.isArray(o.material) ? o.material[0] : o.material); o.castShadow = true; o.receiveShadow = true; } });
    m.updateMatrixWorld(true); W.m = m; W.b = new THREE.Box3().setFromObject(m); W.sz = W.b.getSize(new V3()); for (const f of W.wait) f(W); W.wait = []; }, e => { console.warn('prop model', type, e); delete PROP_TPL[M.url]; });
}
const PROPO = [];
const PROP_HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });
function buildProps() {
  PROPO.length = 0;
  const keep = Math.random; Math.random = WR; // deterministic material picks
  for (let i = 0; i < PROPS.length; i++) {
    const P = PROPS[i], d = PROP_DEF[P.type]();
    const m = new THREE.Mesh(d.geo, MATS[d.mat]); m.castShadow = true; m.receiveShadow = true;
    if (d.sy) m.scale.y = d.sy;
    if (PROP_MODELS[P.type]) propModel(P.type, m, d.hh);
    const y = P.y + d.hh;
    m.position.set(P.x, y, P.z); m.rotation.y = P.ry; WORLD.root.add(m);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.09, d.r * 0.9), 8, 6), PROP_HIT_MAT); m.add(hit); INTERACT.push({ mesh: hit, kind: 'prop', id: i });
    PROPO.push({ i, mesh: m, hh: d.hh, r: d.r, vel: new V3(), ang: new V3(), sleep: true, yaw: P.ry, settle: 0, moved: -10, roll: !!d.roll, hitT: 0, holder: -1 });
  }
  Math.random = keep;
}
// Props are placed by hand, often a few cm off the furniture models that load in under them later. Once every model of the
// map has arrived, each prop is dropped (or lifted a little) onto whatever surface is right below it, so nothing floats or sinks.
function settlePropsWhenLoaded() {
  const root = WORLD.root; let calm = 0;
  const tick = () => {
    if (!WORLD || WORLD.root !== root) return;
    const busy = Object.values(MODEL_TPL).some(T => !T.m) || Object.values(PROP_TPL).some(T => !T.m);
    calm = busy ? 0 : calm + 1; if (calm < 2) return setTimeout(tick, 400);
    settleProps();
  };
  setTimeout(tick, 400);
}
function settleProps() {
  const skip = new Set(); for (const q of PROPO) q.mesh.traverse(o => skip.add(o));
  const meshes = []; WORLD.root.updateMatrixWorld(true);
  WORLD.root.traverse(o => { if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.visible && !skip.has(o) && o.material !== PROP_HIT_MAT) meshes.push(o); });
  const rc = new THREE.Raycaster(), down = new V3(0, -1, 0), from = new V3(); rc.far = 0.7;
  for (const q of PROPO) {
    const P = PROPS[q.i]; from.set(P.x, P.y + 0.08, P.z); rc.set(from, down);
    const h = rc.intersectObjects(meshes, false)[0]; if (!h || Math.abs(h.point.y - P.y) < 0.003) continue;
    const m = q.mesh, home = q.sleep && q.holder < 0 && Math.abs(m.position.x - P.x) < 0.01 && Math.abs(m.position.z - P.z) < 0.01;
    P.y = h.point.y; if (home) m.position.y = P.y + q.hh;
  }
}
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _eu = new THREE.Euler();
function stepProps(dt, now) {
  for (const p of PROPO) {
    if (p.sleep) continue;
    const m = p.mesh;
    p.vel.y -= 9.8 * dt;
    m.position.addScaledVector(p.vel, dt);
    const floor = groundY(m.position.x, m.position.z, m.position.y);
    // walls & furniture
    for (const c of COLL) {
      if (m.position.y > c.y1 || m.position.y < c.y0 - 0.3) continue;
      const x = m.position.x, z = m.position.z, r = p.r;
      if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) {
        const dl = x - (c.x0 - r), dr = (c.x1 + r) - x, dn = z - (c.z0 - r), df = (c.z1 + r) - z, mn = Math.min(dl, dr, dn, df);
        if (c.furn && m.position.y > c.y1 - 0.08 && p.vel.y <= 0) { m.position.y = c.y1 + p.hh; p.vel.y *= -0.25; p.vel.x *= 0.7; p.vel.z *= 0.7; continue; }
        if (mn === dl) { m.position.x = c.x0 - r; p.vel.x = -Math.abs(p.vel.x) * 0.4; } else if (mn === dr) { m.position.x = c.x1 + r; p.vel.x = Math.abs(p.vel.x) * 0.4; }
        else if (mn === dn) { m.position.z = c.z0 - r; p.vel.z = -Math.abs(p.vel.z) * 0.4; } else { m.position.z = c.z1 + r; p.vel.z = Math.abs(p.vel.z) * 0.4; }
        if (now - p.hitT > 0.15) { p.hitT = now; sfxAt('clatter', m.position, 0.5); }
      }
    }
    const restY = floor + p.hh;
    if (m.position.y <= restY + (p.vel.y < 0 ? 0 : -1)) {
      if (m.position.y < restY) m.position.y = restY;
      if (Math.abs(p.vel.y) > 1.0) { if (now - p.hitT > 0.1) { p.hitT = now; sfxAt('clatter', m.position, clamp(Math.abs(p.vel.y) / 4, 0.3, 1)); } p.vel.y = -p.vel.y * 0.3; p.vel.x *= 0.6; p.vel.z *= 0.6; p.ang.multiplyScalar(0.5); }
      else { p.vel.y = 0; p.vel.x *= Math.pow(p.roll ? 0.5 : 0.02, dt); p.vel.z *= Math.pow(p.roll ? 0.5 : 0.02, dt); p.settle += dt; }
    }
    if (p.settle > 0) {
      // ease back to resting orientation
      _eu.set(0, p.yaw, 0); _qb.setFromEuler(_eu); m.quaternion.slerp(_qb, clamp(dt * 6, 0, 1));
      if (p.settle > 0.8 && Math.hypot(p.vel.x, p.vel.z) < 0.05) { p.sleep = true; m.quaternion.copy(_qb); m.position.y = restY; }
    } else {
      _eu.set(p.ang.x * dt, p.ang.y * dt, p.ang.z * dt); _qa.setFromEuler(_eu); m.quaternion.multiply(_qa);
    }
    p.moved = now;
  }
}
function throwProp(p, dirx, dirz, power) {
  p.sleep = false; p.settle = 0; p.vel.set(dirx * power, 1.2 + Math.random() * 1.6, dirz * power);
  p.ang.set(rr(-9, 9), rr(-9, 9), rr(-9, 9)); p.yaw = Math.random() * Math.PI * 2;
}

// ---------------------------------------------------------------- temperatures
let ROOM_TEMP = [];
function initTemps(seed) {
  const r = mulberry32(seed * 7 + 3); ROOM_TEMP = ROOMS.map(() => (MAP.tempBase ?? 12.5) + r() * 5);
}
function roomTemp(ri) {
  if (ri < 0) return MAP.outsideTemp ?? 8.5;
  const R = ROOMS[ri]; if (R.closet) ri = R.parent;
  const base = ROOM_TEMP[ri];
  if (ri !== G.ghostRoom) return base;
  // always the coldest room, and it keeps dropping as the night goes on
  const start = Math.min(...ROOM_TEMP.slice(0, NROOM).filter((v, i) => i !== ri)) - 2.2;
  const target = G.ghost.ev.includes('freeze') ? -2.6 : 6.4;
  return lerp(start, target, smooth(5, 90, G.elapsed));
}
