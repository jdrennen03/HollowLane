// ---------------------------------------------------------------- renderer, lighting, post
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x070a10, 0.03);
scene.background = new THREE.Color(0x030508);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.04, 500);
const LIGHTS = { pool: [], fills: [] };
function buildLights() {
  const hemi = new THREE.HemisphereLight(0x3a4a6a, 0x0a0c08, 0.35); scene.add(hemi); LIGHTS.hemi = hemi;
  const moon = new THREE.DirectionalLight(0x9fb4e0, 2.4); moon.position.set(-38, 52, -30); moon.target.position.set(9, 0, 4);
  moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); const sc = moon.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 10; sc.far = 140; moon.shadow.bias = -0.0006; moon.shadow.normalBias = 0.03;
  scene.add(moon, moon.target); LIGHTS.moon = moon;
  for (let i = 0; i < 4; i++) {
    const s = new THREE.SpotLight(0xffd6a0, 0, 11, 1.32, 0.85, 2); s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.camera.near = 0.1; s.shadow.camera.far = 11; s.shadow.bias = -0.0006; s.shadow.normalBias = 0.02;
    scene.add(s, s.target); LIGHTS.pool.push(s);
    const p = new THREE.PointLight(0xffd6a0, 0, 6.5, 2); scene.add(p); LIGHTS.fills.push(p);
  }
  const lantern = new THREE.PointLight(0xffa860, 5, 9, 2); lantern.position.set(TENT.x + 0.85, 1.05, TENT.z - 0.05); lantern.castShadow = false; scene.add(lantern); LIGHTS.lantern = lantern;
  const street = new THREE.SpotLight(0xff9a48, 60, 22, 0.9, 0.7, 1.8); street.position.set(19.6, 5.0, -16.0); street.target.position.set(19.6, 0, -15.5); scene.add(street, street.target); LIGHTS.street = street;
  // the stables' lanterns: lit whenever the barn is loaded (home base is never dark)
  LIGHTS.stable = [0, 1, 2, 3, 4].map(() => { const l = new THREE.PointLight(0xffbf7a, 0, 9, 1.6); scene.add(l); return l; });
  const porch = new THREE.PointLight(0xffc070, 0, 6, 2); porch.position.set(10.35, FY + 1.82, -0.35); scene.add(porch); LIGHTS.porch = porch;
}
// sky dome with stars, moon and drifting cloud
const SKY_U = { uTime: { value: 0 }, uMoon: { value: new V3(-38, 52, -30).normalize() } };
function buildSky() {
  const m = new THREE.ShaderMaterial({
    uniforms: SKY_U, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }',
    fragmentShader: `uniform float uTime; uniform vec3 uMoon; varying vec3 vD;
      float h(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
      float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fb(vec3 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n3(p); p*=2.03; a*=.5; } return s; }
      void main(){ vec3 d = normalize(vD); float y = max(d.y, 0.0);
        vec3 col = mix(vec3(0.035,0.045,0.07), vec3(0.008,0.012,0.025), pow(y, 0.5));
        vec3 sp = floor(d*420.); float st = step(0.9975, h(sp)) * (0.5+0.5*sin(uTime*2.+h(sp+1.)*40.)); col += vec3(0.8,0.85,1.0)*st*smoothstep(0.05,0.3,y);
        float md = dot(d, uMoon); col += vec3(0.75,0.82,1.0)*smoothstep(0.9993,0.9996,md)*1.8; col += vec3(0.25,0.3,0.45)*pow(max(md,0.),300.)*0.8 + vec3(0.1,0.12,0.2)*pow(max(md,0.),12.)*0.25;
        float cl = fb(vec3(d.xz/(d.y+0.25)*1.6 + vec2(uTime*0.01,0.).xyy.xz, uTime*0.005)); cl = smoothstep(0.45, 0.8, cl) * smoothstep(0.0, 0.25, y);
        col = mix(col, vec3(0.05,0.06,0.08) + vec3(0.12,0.14,0.2)*pow(max(md,0.),6.), cl*0.85);
        col = mix(col, vec3(0.03,0.04,0.06), smoothstep(0.12, -0.02, d.y));
        gl_FragColor = vec4(col, 1.0); }`
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), m); sky.frustumCulled = false; scene.add(sky);
}
// instanced grass with wind
const GRASS_U = { uTime: { value: 0 } };
// grass: each instance is a tuft of curved, tapering blades. Normals lean to the sky so tufts light like the ground
// they grow from, and roots are darkened (self-shadowing) so tufts sit in the turf instead of floating on it.
// grass blades cut from the scanned blade atlas (u0, u1, v0, v1 per blade); a tuft is a few bent cards
const GRASS_BLADES = [[0.0518, 0.0713, 0.0586, 0.9639], [0.1113, 0.1387, 0.0137, 0.9854], [0.1768, 0.2021, 0.0098, 0.9951], [0.2412, 0.2695, 0.0117, 0.9854], [0.3516, 0.3809, 0.0166, 0.9492], [0.4629, 0.4941, 0.0508, 0.9668], [0.5225, 0.5449, 0.0537, 0.8076], [0.585, 0.6064, 0.0605, 0.8184], [0.6377, 0.6562, 0.0615, 0.9736], [0.6953, 0.7158, 0.1143, 0.9541], [0.7666, 0.7891, 0.0117, 0.9287], [0.8203, 0.8369, 0.0137, 0.9561], [0.8721, 0.8867, 0.0127, 0.9102]];
function grassTuft(rnd) {
  const geos = [], nb = 7;
  for (let k = 0; k < nb; k++) {
    const [u0, u1, v0, v1] = GRASS_BLADES[(rnd() * GRASS_BLADES.length) | 0], h = 0.3 + rnd() * 0.4, w = h * (u1 - u0) / (v1 - v0) * 2.2;
    const g = new THREE.PlaneGeometry(w, h, 1, 2); g.translate(0, h / 2, 0);
    const lean = (rnd() - 0.2) * 0.5, p = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { const t = p.getY(i) / h; p.setZ(i, lean * t * t * h); nrm.setXYZ(i, 0, 0.8, 0.6); uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0)); }
    const a = k / nb * Math.PI * 2 + rnd(), r = rnd() * 0.09;
    g.applyMatrix4(mat4(Math.cos(a) * r, 0, Math.sin(a) * r, a + rnd(), 0, 0)); geos.push(g);
  }
  const out = BufferGeometryUtils.mergeGeometries(geos); out.normalizeNormals(); return out;
}
function buildGrass() {
  const rnd = mulberry32(5), blade = grassTuft(rnd);
  const tex = new THREE.TextureLoader().load('grass-blades.png'); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, alphaTest: 0.45, roughness: 0.9, side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => { sh.uniforms.uTime = GRASS_U.uTime;
    sh.vertexShader = 'uniform float uTime; varying float vGy;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 ip = instanceMatrix * vec4(0.,0.,0.,1.); float k = position.y*position.y*1.6; vGy = position.y;
      transformed.x += (sin(uTime*1.6 + ip.x*0.6 + ip.z*0.3)*0.08 + sin(uTime*3.7 + ip.z)*0.02) * k;
      transformed.z += cos(uTime*1.3 + ip.x*0.4)*0.05*k;`);
    sh.fragmentShader = 'varying float vGy;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(0.3, 1.15, smoothstep(0.0, 0.7, vGy));');
  };
  const N = 15000, mesh = new THREE.InstancedMesh(blade, mat, N); mesh.receiveShadow = true; mesh.castShadow = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new V3(), c = new THREE.Color();
  let n = 0, tries = 0; const [gx0, gz0, gx1, gz1] = MAP.grassBox;
  while (n < N && tries++ < N * 12) {
    const x = gx0 + rnd() * (gx1 - gx0), z = gz0 + rnd() * (gz1 - gz0);
    if (!MAP.grassOK(x, z) || Math.hypot(x - TENT.x, z - TENT.z) < 2.2) continue;
    const clump = fbm(fract(x / 30), fract(z / 30), 6, 6, 3, 9); if (rnd() > clump * 1.6) continue;
    e.set((rnd() - 0.5) * 0.25, rnd() * 6.28, (rnd() - 0.5) * 0.25); q.setFromEuler(e); const h = 0.45 + rnd() * clump * 0.8, wd = 0.8 + rnd() * 0.7; s.set(wd, h, wd);
    m4.compose(new V3(x, terrainY(x, z), z), q, s); mesh.setMatrixAt(n, m4);
    // mostly green, some dry straw
    if (rnd() < 0.18) c.setHSL(0.1 + rnd() * 0.04, 0.35, 0.42 + rnd() * 0.12); else c.setHSL(0.2 + rnd() * 0.06, 0.12, 0.3 + rnd() * 0.12);   // tints over the blade texture
    mesh.setColorAt(n, c); n++;
  }
  mesh.count = n; mesh.userData.full = n;
  if (GRASS) { scene.remove(GRASS); GRASS.geometry.dispose(); }
  GRASS = mesh; grassForQuality();
  scene.add(mesh);
}
// dust motes visible inside the flashlight beam
const DUST_U = { uFlPos: { value: new V3() }, uFlDir: { value: new V3() }, uFlOn: { value: 0 }, uTime: { value: 0 }, uCam: { value: new V3() } };
function buildDust() {
  const N = 600, g = new THREE.BufferGeometry(), a = new Float32Array(N * 3); for (let i = 0; i < N * 3; i++) a[i] = Math.random();
  g.setAttribute('position', new THREE.BufferAttribute(a, 3));
  const m = new THREE.ShaderMaterial({ uniforms: DUST_U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform vec3 uCam; uniform float uTime; uniform vec3 uFlPos; uniform vec3 uFlDir; uniform float uFlOn; varying float vA;
      void main(){ vec3 p = position*8.0 - 4.0; p += vec3(sin(uTime*0.13+position.y*40.)*0.3, sin(uTime*0.07+position.x*30.)*0.2, cos(uTime*0.11+position.z*20.)*0.3);
        vec3 w = uCam + mod(p - uCam + 4.0, 8.0) - 4.0;
        vec3 d = w - uFlPos; float L = length(d); float c = dot(d/L, uFlDir); vA = uFlOn * smoothstep(0.88, 0.97, c) * smoothstep(7.0, 0.5, L) * smoothstep(0.4, 1.0, L) * 0.3;
        vec4 mv = viewMatrix*vec4(w,1.); gl_PointSize = clamp(1.4 * (300.0 / -mv.z), 0.0, 4.0); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: 'varying float vA; void main(){ vec2 c = gl_PointCoord-0.5; float a = smoothstep(0.5,0.0,length(c))*vA; gl_FragColor = vec4(vec3(1.0,0.95,0.85)*a, a); }' });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts);
}
// ---------------------------------------------------------------- camcorder: night vision and ghost orbs
const CAM = { on: false, recT: 0 }, ORBS = [];
function updateOrbs(t, dt) {
  if (!ORBS.length) {
    const halo = artTex(64, 64, (x, w, h) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
    for (let i = 0; i < 4; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); m.scale.setScalar(0.16); m.visible = false; scene.add(m); ORBS.push({ m, p: new V3(), seed: i * 7.3 + 1 }); }
  }
  const R = ROOMS[G.ghostRoom], show = CAM.on && G.ghost && G.ghost.ev.includes('orbs') && R && G.state === 'play';
  for (const o of ORBS) {
    o.m.visible = !!show; if (!show) continue;
    const s = o.seed, w = R.r[2] - R.r[0], d = R.r[3] - R.r[1];
    o.m.position.set(R.r[0] + w * (0.5 + 0.38 * Math.sin(t * 0.13 + s) * Math.cos(t * 0.07 + s * 2)), R.y + 1.1 + 0.6 * Math.sin(t * 0.21 + s * 3), R.r[1] + d * (0.5 + 0.38 * Math.cos(t * 0.11 + s * 1.7)));
    o.m.material.opacity = clamp(0.55 + 0.45 * Math.sin(t * 0.9 + s * 5), 0, 1) * (Math.sin(t * 0.05 + s) > -0.4 ? 1 : 0.1);
    o.m.scale.setScalar(0.16 * (0.8 + 0.3 * Math.sin(t * 1.7 + s)));
  }
}
function camHud(dt, off) {
  const el = $('camHud'); if (!el) return; const on = !off && CAM.on; if (el.hidden === on) el.hidden = !on;
  if (!on) { CAM.recT = 0; return; }
  CAM.recT += dt; const s = Math.floor(CAM.recT); $('camTime').textContent = String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
// incense smoke: one shared pool of soft billboards fed by every burning bundle
const SMOKE = { N: 260, k: 0, pos: null, vel: null, age: null, life: null, geo: null, U: { uScale: { value: 400 } } };
function buildSmoke() {
  const N = SMOKE.N, g = SMOKE.geo = new THREE.BufferGeometry();
  SMOKE.pos = new Float32Array(N * 3); SMOKE.vel = new Float32Array(N * 3); SMOKE.age = new Float32Array(N).fill(1); SMOKE.life = new Float32Array(N).fill(1);
  const seed = new Float32Array(N); for (let i = 0; i < N; i++) { seed[i] = Math.random() * 10; SMOKE.pos[i * 3 + 1] = -999; }
  g.setAttribute('position', new THREE.BufferAttribute(SMOKE.pos, 3)); g.setAttribute('aAge', new THREE.BufferAttribute(SMOKE.age, 1)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({ uniforms: SMOKE.U, transparent: true, depthWrite: false,
    vertexShader: `attribute float aAge; attribute float aSeed; uniform float uScale; varying float vA; varying float vS;
      void main(){ vec4 mv = viewMatrix*vec4(position,1.); float s = mix(0.03, 0.45, sqrt(aAge)); gl_PointSize = clamp(s*uScale/max(0.08,-mv.z), 0.0, 320.0);
        vA = aAge >= 1.0 ? 0.0 : smoothstep(0.0, 0.06, aAge)*(1.0-aAge)*0.13*smoothstep(0.25, 1.4, -mv.z); vS = aSeed; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; varying float vS; void main(){ vec2 c = gl_PointCoord-0.5; float r = length(c);
      float n = 0.7 + 0.3*sin((c.x+vS)*14.0)*sin((c.y-vS*0.7)*11.0); float a = smoothstep(0.5, 0.08, r)*vA*n; gl_FragColor = vec4(vec3(0.5,0.52,0.52), a); }` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 6; scene.add(pts);
}
const _sv = new V3();
function updateSmoke(dt) {
  const { N, pos, vel, age, life } = SMOKE;
  for (const it of ITEMS) {
    if (it.type !== 'incense' || !it.on || !it.where || !it.obj.visible) continue;
    it.smokeT = (it.smokeT || 0) - dt;
    while (it.smokeT <= 0) {
      it.smokeT += 0.07; it.parts.tip.getWorldPosition(_sv);
      const i = SMOKE.k; SMOKE.k = (SMOKE.k + 1) % N;
      pos[i * 3] = _sv.x + rr(-0.01, 0.01); pos[i * 3 + 1] = _sv.y + 0.02; pos[i * 3 + 2] = _sv.z + rr(-0.01, 0.01);
      vel[i * 3] = rr(-0.04, 0.04); vel[i * 3 + 1] = rr(0.22, 0.38); vel[i * 3 + 2] = rr(-0.04, 0.04); age[i] = 0; life[i] = rr(2.2, 3.4);
    }
  }
  const t = performance.now() / 1000;
  for (let i = 0; i < N; i++) {
    if (age[i] >= 1) continue;
    age[i] = Math.min(1, age[i] + dt / life[i]);
    const j = i * 3; vel[j] += Math.sin(t * 1.3 + i) * 0.06 * dt; vel[j + 2] += Math.cos(t * 1.1 + i * 1.7) * 0.06 * dt; vel[j + 1] *= 1 - dt * 0.35;
    pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
  }
  SMOKE.geo.attributes.position.needsUpdate = true; SMOKE.geo.attributes.aAge.needsUpdate = true;
  SMOKE.U.uScale.value = renderer.getDrawingBufferSize(_sv).y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
}
// post-processing
const POST = { death: 0, huntPulse: 0, scare: 0 };
let composer, bloom, finalPass, gtao;
function buildPost() {
  const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.addPass(new RenderPass(scene, camera));
  // ground-truth ambient occlusion: the soft contact darkening in corners, under furniture and where objects meet
  // (High quality only). Its depth/normal pre-pass must not redraw the eleven shadow maps a second time.
  gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  gtao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.6, thickness: 1.2, scale: 1.15, samples: 12, distanceFallOff: 1 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
  gtao.blendIntensity = 0.95;
  // The pre-pass draws everything as solid, so soft or cut-out things (breath puffs, orbs, smoke, glass, cobwebs,
  // moss and leaf cards) would come out as hard rectangles with dark AO halos. Leave them out of it.
  const aoSkip = []; const soft = m => m && (m.transparent || m.alphaTest > 0 || m.isSpriteMaterial);
  { const ro = gtao.renderOverride.bind(gtao); gtao.renderOverride = (r, ...a) => {
    const au = r.shadowMap.autoUpdate; r.shadowMap.autoUpdate = false;
    scene.traverseVisible(o => { if (o.isSprite || o.isPoints || (o.isMesh && (Array.isArray(o.material) ? o.material.some(soft) : soft(o.material)))) aoSkip.push(o); });
    for (const o of aoSkip) o.visible = false;
    ro(r, ...a);
    for (const o of aoSkip) o.visible = true; aoSkip.length = 0; r.shadowMap.autoUpdate = au; }; }
  composer.addPass(gtao);
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.4, 0.5, 0.92); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  finalPass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uSan: { value: 1 }, uHunt: { value: 0 }, uDeath: { value: 0 }, uScare: { value: 0 }, uNV: { value: 0 }, uRes: { value: new THREE.Vector2(innerWidth, innerHeight) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uSan, uHunt, uDeath, uScare, uNV; uniform vec2 uRes; varying vec2 vUv;
      float hs(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        vec2 uv = vUv; vec2 c = uv - 0.5; float r2 = dot(c,c);
        float band = step(0.985, hs(vec2(floor(uv.y*60.0), floor(uTime*24.0)))) * (uHunt*0.6 + uDeath);
        uv.x += band * (hs(vec2(uTime, uv.y)) - 0.5) * 0.05;
        uv = 0.5 + c * (1.0 + (uHunt*0.025 + uDeath*0.12) * r2 * 4.0 * (0.8 + 0.2*sin(uTime*3.0)));
        float ab = 0.0015 + r2*0.006 + (1.0-uSan)*0.003 + uHunt*0.004 + uScare*0.01 + uDeath*0.02;
        vec2 dir = c * ab;
        vec3 col = vec3(texture2D(tDiffuse, uv + dir).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - dir).b);
        float lum = dot(col, vec3(0.299,0.587,0.114));
        col = mix(col, vec3(lum), clamp((1.0-uSan)*0.55 + uDeath*0.7, 0.0, 1.0));
        col = mix(col, col*vec3(0.92,0.98,1.08), 0.6);
        col *= mix(vec3(0.98,1.0,1.03), vec3(1.05,1.0,0.92), smoothstep(0.25, 0.85, lum));
        { vec3 c2 = clamp(col, 0.0, 1.0); col = mix(col, c2*c2*(3.0-2.0*c2), 0.18); }
        col = mix(col, vec3(lum*1.4, lum*0.25, lum*0.2), uDeath*0.75);
        // camcorder night vision: lifted shadows, phosphor green, scanlines
        float nv = pow(clamp(dot(col, vec3(0.299,0.587,0.114)), 0.0, 1.0), 0.45) * 1.25 + (hs(uv*uRes*0.5 + floor(uTime*30.0)) - 0.5) * 0.12;
        col = mix(col, vec3(nv*0.32, nv, nv*0.42) * (0.9 + 0.1*sin(uv.y*uRes.y*1.6)), uNV);
        col *= 1.0 - smoothstep(0.08, 0.75, r2*1.7) * (0.55 + uHunt*0.25 + uDeath*0.3 + uNV*0.35);
        col += (hs(uv*uRes + fract(uTime)*91.7) - 0.5) * (0.035 + (1.0-uSan)*0.03 + uHunt*0.03);
        col *= 1.0 - uScare*0.25*step(0.5, hs(vec2(floor(uTime*30.0))));
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  composer.addPass(finalPass);
}
let QUALITY = 2;
function grassForQuality() { if (GRASS) GRASS.count = Math.round(GRASS.userData.full * [0.35, 0.65, 1][QUALITY]); }
function setQuality(q) {
  QUALITY = q; grassForQuality();
  renderer.setPixelRatio(q === 2 ? Math.min(devicePixelRatio, 1.5) : q === 1 ? 1 : 0.75);
  composer.setPixelRatio(renderer.getPixelRatio());
  bloom.enabled = q > 0; gtao.enabled = q === 2;
  const sz = q === 2 ? 1024 : q === 1 ? 512 : 256; for (const s of LIGHTS.pool) { s.shadow.mapSize.set(sz, sz); if (s.shadow.map) { s.shadow.map.dispose(); s.shadow.map = null; } }
  onResize();
}
function onResize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); finalPass.uniforms.uRes.value.set(innerWidth, innerHeight); }
addEventListener('resize', onResize);

// ---------------------------------------------------------------- per-frame world updates
function updateRoomLights(t, dt) {
  const on = []; for (let i = 0; i < NROOM; i++) if (G.lights[i]) on.push(i);
  const huntFlick = G.huntOn ? (Math.sin(t * 37) * Math.sin(t * 13.1) > 0.1 ? 1 : (Math.random() < 0.5 ? 0.05 : 0.4)) : 1;
  const gv = G.ghostView;
  for (let k = 0; k < 4; k++) {
    const s = LIGHTS.pool[k], p = LIGHTS.fills[k], ri = on[k];
    if (ri === undefined) { s.intensity = 0; p.intensity = 0; s.shadow.autoUpdate = false; continue; }
    const F = FIXTURES[ri];
    s.position.copy(F.pos); s.target.position.set(F.pos.x, ROOMS[ri].y, F.pos.z); p.position.copy(F.pos).setY(F.pos.y - 0.15); s.distance = ROOMS[ri].lampRange || 11;
    let flick = huntFlick;
    if (G.eventFx > 0 && logicalRoom(gv.x, gv.z, gv.y) === ri) flick *= Math.random() < 0.4 ? 0.1 : 1;
    const pw = ROOMS[ri].lampPow || 1; s.intensity = 32 * pw * flick; p.intensity = 3.2 * (ROOMS[ri].outdoor ? 0 : Math.min(pw, 2)) * flick; s.shadow.autoUpdate = true;
  }
  for (let i = 0; i < NROOM; i++) { const F = FIXTURES[i]; if (!F) continue; const lit = G.lights[i]; F.bulbMat.emissiveIntensity = lit ? 1.6 * huntFlick : 0; }
  const barn = MAP.id === 'barn', SL = [[1.8, 5.7], [9.0, 5.7], [16.2, 5.7], [23.4, 5.7], [17.1, 2.0]];
  LIGHTS.stable.forEach((l, i) => { l.intensity = barn ? 7.5 * (0.94 + Math.sin(t * 7 + i * 2) * 0.03 + Math.random() * 0.03) : 0; if (barn) l.position.set(SL[i][0], BA0 + 2.2, SL[i][1]); });
  // switches show their state
  for (const S of SWITCHES) S.tog.rotation.x = G.lights[S.room] ? -0.5 : 0.5;
  // porch light sputters; street lamp hums and flickers
  const sput = Math.sin(t * 0.7) > 0.6 && Math.random() < 0.5 ? rr(0.2, 1) : 0;
  LIGHTS.porch.intensity = sput * 2.5; WORLD_EXTRA.porchBulb.material.emissiveIntensity = sput * 3;
  const sf = (Math.sin(t * 0.37) > 0.92 && Math.random() < 0.6) ? 0.15 : 1; LIGHTS.street.intensity = 60 * sf; WORLD_EXTRA.streetBulb.material.emissiveIntensity = 3 * sf;
  LIGHTS.lantern.intensity = 5 * (0.92 + Math.sin(t * 9) * 0.03 + Math.random() * 0.05);
}
function updateDoors(dt) {
  for (const D of DOORS) {
    const prev = D.angle;
    if (G.isHost) { const d = D.target - D.angle, st = D.speed * dt; D.angle = Math.abs(d) <= st ? D.target : D.angle + Math.sign(d) * st; }
    else if (D.net !== undefined) D.angle = lerp(D.angle, D.net, clamp(dt * 14, 0, 1));
    const v = (D.angle - prev) / Math.max(dt, 1e-4);
    D.g.rotation.y = D.base + D.sign * D.angle;
    D.creakT -= dt;
    if (Math.abs(v) > 0.25 && Math.abs(v) < 3 && D.creakT <= 0) { D.creakT = 1.3; sfxAt('creak', doorCenter(D), 0.55, 0.85 + Math.random() * 0.3); }
    if (prev > 0.04 && D.angle <= 0.04 && Math.abs(v) > 3.5) sfxAt('slam', doorCenter(D), 1);
    else if (prev > 0.04 && D.angle <= 0.04) sfxAt('thud', doorCenter(D), 0.35);
  }
}
const _tv = new V3(), _td = new V3();
function updateItems(t, dt) {
  let camOn = false;
  const camPos = PL.cam.position; const uvi = [0, 0]; let uvK = 0;
  for (const it of ITEMS) {
    it.obj.getWorldPosition(_tv);
    const heldByMe = it.where === 'hand';
    const visibleOn = it.on && (it.holder < 0 || it.obj.visible || it.where === 'hand');
    if (it.type === 'emf') {
      const lvl = it.on ? emfAt(_tv) : 0; it.level = lvl;
      it.parts.leds.forEach((m, i) => m.emissiveIntensity = it.on && i < lvl ? 1.5 : 0);
      if (heldByMe && it.on && lvl >= 2) { it.beepT = (it.beepT || 0) - dt; if (it.beepT <= 0) { it.beepT = [0, 0, 0.6, 0.35, 0.18, 0.08][lvl]; sfx('beep', 0.25 + lvl * 0.06, 1 + (lvl - 2) * 0.08); } }
    } else if (it.type === 'thermo') {
      it.dispT -= dt;
      if (it.on !== it.wasOn) { it.wasOn = it.on; it.dispT = 0; it.fresh = true; if (!it.on) { it.minT = null; drawThermo(it); } }
      if (it.dispT <= 0 && it.on) {
        it.dispT = 0.7; const ri = roomIdxAt(_tv.x, _tv.z, _tv.y - 0.3);
        const real = roomTemp(ri) + rr(-0.4, 0.4); it.temp = it.fresh ? real : lerp(it.temp, real, 0.55); it.fresh = false;
        it.minT = it.minT === null ? it.temp : Math.min(it.minT, it.temp);
        drawThermo(it);
        if (heldByMe) sfx('tbeep', 0.3);
      }
      it.parts.dot.color.setHex(it.on ? 0xff2a20 : 0x330000);
      if (heldByMe) hudReadout(it.on ? it.temp : null, it.minT);
    } else if (it.type === 'spirit') {
      if (it.on) { it.dispT -= dt; if (it.dispT <= 0) { it.dispT = 0.12; const f = (87.5 + ((t * 9) % 20.5)).toFixed(1); const x = it.lcd.x; x.fillStyle = '#1a0806'; x.fillRect(0, 0, 128, 48); x.fillStyle = '#ff5a3c'; x.font = 'bold 30px monospace'; x.textAlign = 'center'; x.fillText(f, 64, 36); it.lcd.t.needsUpdate = true; } }
      it.parts.scr.emissiveIntensity = it.on ? 1.4 : 0;
    } else if (it.type === 'uv') {
      const on = it.on && (it.where === 'hand' || it.where === 'world' || (it.where && it.where.startsWith('av') && it.obj.visible));
      it.light.intensity = on ? 9 * PL.flashFlicker : 0; it.parts.lens.emissiveIntensity = on ? 3 : 0;
      if (on && uvK < 2) { it.light.getWorldPosition(PRINT_U.uvPos.value[uvK]); it.light.target.getWorldPosition(_td); PRINT_U.uvDir.value[uvK].copy(_td).sub(PRINT_U.uvPos.value[uvK]).normalize(); uvi[uvK] = 1; uvK++; }
    } else if (it.type === 'journal') {
      const want = it.spent ? it.parts.written : it.parts.blank; if (it.parts.page.map !== want) { it.parts.page.map = want; it.parts.page.needsUpdate = true; }
    } else if (it.type === 'meds') {
      const k = it.spent ? 1 : 0; it.parts.can.scale.set(1 + k * 0.08, 1 - k * 0.38, 1 - k * 0.1); it.parts.can.position.y = 0.062 - k * 0.019; it.parts.can.rotation.z = k * 0.12; it.parts.tab.rotation.x = k * -1.2;
    } else if (it.type === 'camera') {
      it.parts.lens.emissiveIntensity = it.on ? 0.25 : 0; it.parts.rec.emissiveIntensity = it.on && (t % 1) < 0.6 ? 3 : 0;
      it.dispT -= dt; if (it.dispT <= 0) { it.dispT = 0.12; const x = it.lcd.x; x.fillStyle = it.on ? '#08280c' : '#020402'; x.fillRect(0, 0, 128, 96); if (it.on) { for (let i = 0; i < 260; i++) { x.fillStyle = 'rgba(120,255,140,' + (Math.random() * 0.35) + ')'; x.fillRect(Math.random() * 128, Math.random() * 96, 2, 1); } x.fillStyle = '#ff3030'; x.beginPath(); x.arc(12, 12, 4, 0, 7); x.fill(); x.fillStyle = '#c8ffd0'; x.font = 'bold 12px monospace'; x.fillText('REC', 20, 16); } it.lcd.t.needsUpdate = true; }
      if (heldByMe && it.on) camOn = true;
    } else if (it.type === 'doll') {   // the long pin slides from the arm into the heart
      it.pinK = lerp(it.pinK || 0, it.spent ? 1 : 0, clamp(dt * 6, 0, 1)); const k = it.pinK, pp = it.parts.pin;
      pp.position.set(lerp(0.045, 0.002, k), lerp(0.1, 0.099, k), lerp(0, 0.012, k)); pp.rotation.set(lerp(0, 1.45, k), 0, lerp(-0.6, 0, k));
    } else if (it.type === 'incense') {
      it.parts.ember.emissiveIntensity = it.on ? 2.2 + Math.sin(t * 9 + it.id) * 0.6 + Math.random() * 0.5 : 0;
      it.parts.ember.color.setHex(it.spent ? 0x4a4642 : 0x1a1410);
    } else if (it.type === 'laser') {
      const on = it.on && it.holder < 0;
      it.light.intensity = on ? 22 : 0; it.parts.lens.emissiveIntensity = it.on ? 3 : 0;
      it.light.shadow.autoUpdate = on; if (on && !it.wasOn) it.light.shadow.needsUpdate = true; it.wasOn = on;
    }
  }
  CAM.on = camOn && me()?.alive; updateOrbs(t, dt);
  PRINT_U.uvOn.value[0] = uvi[0]; PRINT_U.uvOn.value[1] = uvi[1];
  if (!ITEMS.some(it => it.type === 'thermo' && it.where === 'hand')) hudReadout(null);
  // spirit box static for the local holder
  const h = heldItem(); loopGain('static', h && h.type === 'spirit' && h.on && me().alive ? 0.22 : 0, 0.08);
}
function updateGhostView(t, dt) {
  const v = G.ghostView, gh = G.gh;
  if (G.isHost) { const gs = G.gs; v.x = gs.x; v.z = gs.z; v.y = gs.y; v.yaw = gs.yaw; v.mode = gs.mode; v.vis = gs.vis; v.moving = gs.moving; v.huntT = gs.huntT; }
  else if (v.tx !== undefined) { const jump = Math.hypot(v.tx - v.x, v.tz - v.z) > 2.5; v.x = jump ? v.tx : lerp(v.x, v.tx, clamp(dt * 10, 0, 1)); v.z = jump ? v.tz : lerp(v.z, v.tz, clamp(dt * 10, 0, 1)); v.y = jump ? v.ty : lerp(v.y, v.ty, clamp(dt * 10, 0, 1)); v.yaw += angDiff(v.yaw, v.tyaw) * clamp(dt * 10, 0, 1); }
  gh.root.position.set(v.x, v.y, v.z); gh.root.rotation.y = v.yaw;
  animateGhost(gh, t, dt, v);
  // decide how it is seen
  let look = 'hidden';
  if (v.vis) {
    if (v.mode === 2) { const fl = G.ghost.flick || 1; const cyc = (t * 2.2) % 1; look = (v.huntT < 2.5 ? Math.random() < 0.5 : cyc < 0.62 * fl + 0.08) ? 'visible' : 'hidden'; }
    else look = v.mode === 1 && G.ghost.shadow ? 'shadow' : 'visible';
  }
  if (v.mode === 3) look = 'visible';
  GHOST_U.uAlpha.value = v.mode === 1 ? 0.7 + Math.sin(t * 20) * 0.08 : 0.86;
  // laser projectors catch a silhouette
  LASER_U.uOn.value = 0;
  if (look === 'hidden' && G.ghost.ev.includes('laser')) {
    for (const it of ITEMS) {
      if (it.type !== 'laser' || !it.on || it.holder >= 0) continue;
      it.light.getWorldPosition(_tv); it.light.target.getWorldPosition(_td); const f = _td.sub(_tv).normalize();
      const to = new V3(v.x - _tv.x, v.y + 1.0 - _tv.y, v.z - _tv.z), d = to.length();
      if (d > 9 || to.normalize().dot(f) < Math.cos(0.68) || !sightClear(_tv.x, _tv.z, v.x, v.z, _tv.y - 0.3, v.y)) continue;
      const blink = Math.sin(t * 1.7 + 1.3) * Math.sin(t * 0.9) > -0.25;
      if (!blink) continue;
      LASER_U.uPos.value.copy(_tv); LASER_U.uF.value.copy(f); LASER_U.uR.value.crossVectors(f, new V3(0, 1, 0)).normalize(); LASER_U.uUp.value.crossVectors(LASER_U.uR.value, f).normalize();
      LASER_U.uOn.value = 0.85 + Math.random() * 0.15; look = 'laser'; break;
    }
  }
  if (gh.look !== look) { setGhostLook(gh, look); gh.look = look; }
  // hunt soundscape
  const P = me(); const dist = P ? Math.hypot(P.pos.x - v.x, P.pos.z - v.z) : 99;
  if (v.mode === 2) {
    const stepGap = G.ghost.fastSteps ? 0.26 : 0.52;
    G.gstepT = (G.gstepT || 0) - dt; if (G.gstepT <= 0 && v.moving > 0.1) { G.gstepT = stepGap * (1.6 / Math.max(0.8, v.moving)); sfxAt('gstep', new V3(v.x, v.y + 0.1, v.z), 0.9); }
    G.humT = (G.humT || 0) - dt; if (G.humT <= 0) { G.humT = 8; sfxAt('hum', new V3(v.x, v.y + 1.6, v.z), 0.5); }
  }
  loopGain('huntLoop', v.mode === 2 ? 0.25 : 0, 0.5);
  const heartV = (v.mode === 2 || v.mode === 1) ? clamp(1.2 - dist / 14, 0.15, 1) : 0; loopGain('heart', heartV * 0.9, 0.3);
  if (AU.loops.heart) AU.loops.heart.src.playbackRate.value = 0.9 + heartV * 0.9;
  loopGain('buzz', G.huntOn && G.lights.some(Boolean) ? 0.08 : 0, 0.2);
  // electronics stutter near a manifested ghost
  PL.flashFlicker = (v.vis && dist < 11 && (v.mode === 2 || v.mode === 1)) || (G.ghost.drainsFlash && v.mode === 0 && dist < 2.8 && P && Math.abs(P.pos.y - v.y) < 1.4) ? (Math.random() < 0.35 ? 0.05 : 1) : 1;
  // ghost-event witness check (local sanity drain)
  if (G.evWatch && v.mode === 1) {
    G.evWatch.t += dt;
    if (!G.evWatch.seen && P && P.alive) {
      const toG = new V3(v.x, v.y + 1.3, v.z).sub(PL.cam.position); const d = toG.length(); const fwd = new V3(0, 0, -1).applyQuaternion(PL.cam.quaternion);
      if (d < 13 && toG.normalize().dot(fwd) > 0.6 && sightClear(P.pos.x, P.pos.z, v.x, v.z, P.pos.y, v.y)) { G.evWatch.seen = true; P.sanity = clamp(P.sanity - 10 * (G.ghost.eventDrain || 1), 0, 100); POST.scare = 1; sfx('scare', 0.9); }
    }
  } else if (v.mode !== 1) { G.evWatch = null; }
  G.eventFx = v.mode === 1 ? 1 : 0;
}
function syncNetProps(dt) {
  if (G.isHost) return;
  for (const p of PROPO) { if (!p.net || PL.carry === p.i || DOG.carry === p.i) continue; const q = p.net, m = p.mesh; m.position.lerp(_tv.set(q[1], q[2], q[3]), clamp(dt * 14, 0, 1)); m.quaternion.slerp(new THREE.Quaternion(q[4], q[5], q[6], q[7]).normalize(), clamp(dt * 14, 0, 1)); }
}

// ---------------------------------------------------------------- maps
let GRASS = null, CURMAP = null;
function loadMap(id) {
  if (CURMAP === id) return; CURMAP = id;
  if (WORLD && WORLD.root) { scene.remove(WORLD.root); WORLD.root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  for (const m of PRINTS) m.parent && m.parent.remove(m); PRINTS.length = 0; EMF_SRC.length = 0;
  for (const k in WORLD_EXTRA) delete WORLD_EXTRA[k];
  loadMapData(id);
  buildWorld(scene); setItemHomes(); buildProps(); buildNav(); buildGrass(); buildMist(); stbAfterMap(); dogAfterMap();
  LIGHTS.lantern.position.set(TENT.x + 0.85, 1.05 + terrainY(TENT.x, TENT.z), TENT.z - 0.05);
  const st = MAP.street; LIGHTS.street.position.set(st[0], st[1], st[2]); LIGHTS.street.target.position.set(st[0], st[1] - 5, st[2] + 0.5);
  LIGHTS.porch.position.set(...MAP.porch);
  LIGHTS.moon.target.position.set(...MAP.moonTarget);
  LIGHTS.moon.intensity = MAP.moonI ?? 2.4; LIGHTS.hemi.intensity = MAP.hemiI ?? 0.35;
  const fg = MAP.fog || [0x070a10, 0.03]; scene.fog.color.setHex(fg[0]); scene.fog.density = fg[1];
  LIGHTS.moon.shadow.camera.left = LIGHTS.moon.shadow.camera.bottom = -(MAP.moonSpan || 30); LIGHTS.moon.shadow.camera.right = LIGHTS.moon.shadow.camera.top = MAP.moonSpan || 30; LIGHTS.moon.shadow.camera.updateProjectionMatrix(); LIGHTS.moon.shadow.mapSize.set(MAP.moonRes || 2048, MAP.moonRes || 2048); if (LIGHTS.moon.shadow.map) { LIGHTS.moon.shadow.map.dispose(); LIGHTS.moon.shadow.map = null; }
  G.lights = new Array(NROOM).fill(false); G.lights[MAP.lure] = true;
  if (G.gs) { G.gs.y = -50; G.ghostView.y = -50; }
  menuForMap();
}

// ---------------------------------------------------------------- game lifecycle
function beginGame(o) {
  G.mp = o.mp; G.isHost = o.host; G.mySlot = o.mySlot;
  G.ghostModel = o.gm ?? 0; useGhostModel(G.ghostModel); o.mode = o.mode || 'pro';
  beginAtStables(o);   // every round opens at the stables; riding out takes the team to o.map
  G.state = 'play'; UI.results = false;
  PL.yaw = Math.PI; PL.pitch = -0.05; PL.crouch = false; PL.eyeH = 1.62; $('crouchTag').hidden = true; $('readout').hidden = true; PL.deathT = -1; PL.spectate = false; PL.stamina = 1; PL.slotIdx = 0; POST.death = 0;
  const P = me(); P.pos.set(16.6 - G.mySlot * 0.6, BA0, 5.3 + (G.mySlot % 2) * 0.8); P.flash = true; PL.yaw = Math.PI / 2;   // the barn aisle, facing the front doors
  dogPlace(15.4, 6.4, -Math.PI / 2);
  UI.show('menu', false); UI.show('lobby', false); UI.show('results', false); UI.show('pause', false); UI.show('dead', false);
  $('hud').classList.add('show'); $('fade').style.opacity = 1; setTimeout(() => $('fade').style.opacity = 0, 100);
  requestLock(canvas);
  hudTeam(); hudBuildInventory();
  const dest = MAPS[STB.dest];
  sub('Home base: Whitlock Stables. Tonight\'s job: ' + (STB.dest === 'barn' ? 'the Whitlock place itself' : dest.title) + '.', 'sys');
  setTimeout(() => sub('Tack up in the tack room: a bridle to ride (the saddle is up to you), or the harness to hitch an animal to the wagon outside.', 'sys'), 3000);
  setTimeout(() => sub('Then ride out down the drive. Animals you ride, lead or hitch come along.', 'sys'), 8000);
}
// multiplayer: after a round everyone goes back to the same lobby and stays connected until they press Leave
async function backToLobby() {
  resetToIdle();
  await Net.toLobby();
  UI.show('lobby', true); UI.renderLobby(Net.lobbyPeers());
}
function resetToIdle() {
  G.state = 'menu'; UI.results = false; UI.journalOpen = false; UI.paused = false; UI.pauseOpen = false;
  for (const id of ['results', 'pause', 'journal', 'dead', 'lobby', 'menu']) UI.show(id, false);
  $('hud').classList.remove('show');
  if (document.pointerLockElement) document.exitPointerLock();
  for (const k of ['huntLoop', 'heart', 'buzz', 'static']) loopGain(k, 0, 0.2);
  G.huntOn = false; POST.death = 0; G.gh && setGhostLook(G.gh, 'hidden'); if (G.gh) G.gh.look = 'hidden';
  for (const P of G.players) if (P.avatar) { P.avatar.parent && P.avatar.parent.remove(P.avatar); P.avatar = null; }
  G.players = [makePlayer(0, 'menu')]; G.mySlot = 0; G.lights.fill(false); G.lights[MAP.lure] = true;
  for (const it of ITEMS) { it.holder = -1; it.on = false; it.pos.copy(it.home); it.ry = Math.PI; placeItemInWorld(it); }
  stopEggs(); stbStop();
}
async function quitToMenu() {
  G.state = 'menu'; UI.results = false; UI.journalOpen = false; UI.paused = false;
  if (Net.lobby) await Net.leave();
  for (const id of ['results', 'pause', 'journal', 'dead', 'lobby']) UI.show(id, false);
  UI.show('menu', true); $('hud').classList.remove('show');
  if (document.pointerLockElement) document.exitPointerLock();
  for (const k of ['huntLoop', 'heart', 'buzz', 'static']) loopGain(k, 0, 0.2);
  G.huntOn = false; G.gh && setGhostLook(G.gh, 'hidden'); G.gh.look = 'hidden';
  for (const P of G.players) if (P.avatar) { P.avatar.parent && P.avatar.parent.remove(P.avatar); P.avatar = null; }
  G.players = [makePlayer(0, 'menu')]; G.mySlot = 0; G.lights.fill(false); G.lights[MAP.lure] = true;
  for (const it of ITEMS) { it.holder = -1; it.on = false; it.pos.copy(it.home); it.ry = Math.PI; placeItemInWorld(it); }
  stbStop();
}

// ---------------------------------------------------------------- boot
let last = performance.now(), T = 0;
let FRAMEN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  // the moonlit scene is mostly static: refresh its big shadow map every few frames
  LIGHTS.moon.shadow.autoUpdate = false; if ((FRAMEN++ % 4) === 0) LIGHTS.moon.shadow.needsUpdate = true;
  let dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
  GHOST_U.uTime.value = T; GRASS_U.uTime.value = T; SKY_U.uTime.value = T; DUST_U.uTime.value = T;
  if (G.state === 'play' || G.state === 'over') {
    const live = G.state === 'play';
    if (live && !(UI.paused && !G.mp) && !(CINE.on && !G.mp)) {   // solo: the house waits while you watch the music box
      G.elapsed += G.isHost ? dt : 0;
      updatePlayer(dt);
      if (G.isHost) { if (STB.phase !== 'base') ghostThink(dt); stepProps(dt, T); }
      syncNetProps(dt);
    }
    updateDoors(dt); updateAvatars(dt); syncItemParents(); updateItems(T, dt); updateCarry(); updateGiant(T, dt); updateGhostHorse(dt); updateGator(dt); updateStable(dt); updateDog(T, dt); updateAtmos(T); updateCats(T, dt); updateSmoke(dt); updateRoomLights(T, dt); updateGhostView(T, dt); updateBreath(dt);
    hudUpdate(dt);
    if (G.mp) Net.flush(false);
    // flashlight
    const P = me();
    const flOn = P && P.alive && P.flash && PL.deathT < 0;
    PL.flash.intensity = flOn ? 25 * PL.flashFlicker : 0; PL.flashCone.visible = flOn && PL.flashFlicker > 0.5;
    PL.flash.getWorldPosition(DUST_U.uFlPos.value); PL.flash.target.getWorldPosition(_td); DUST_U.uFlDir.value.copy(_td).sub(DUST_U.uFlPos.value).normalize(); DUST_U.uFlOn.value = flOn ? 1 : 0;
    // ambience
    const camRi = roomIdxAt(PL.cam.position.x, PL.cam.position.z, PL.cam.position.y - 1.4), inside = P && camRi >= 0 && !ROOMS[camRi].outdoor;
    loopGain('wind', inside ? 0.12 : 0.4, 1.2); loopGain('crickets', inside ? 0.02 : (G.huntOn ? 0 : 0.18), 1.2); loopGain('drone', inside && STB.phase !== 'base' ? 0.16 : 0.03, 1.5);   // home base isn't spooky
    if (AU.revIn) AU.revIn.gain.setTargetAtTime(inside ? 0.45 : 0.12, AU.ctx.currentTime, 0.5);
    G.creakT = (G.creakT || rr(10, 25)) - dt; if (G.creakT <= 0 && inside && STB.phase !== 'base') { G.creakT = rr(12, 30); const R = pick(ROOMS); sfxAt('creakHouse', new V3(rr(R.r[0], R.r[2]), R.y + WALL_H, rr(R.r[1], R.r[3])), 0.4); }
    POST.scare = Math.max(0, POST.scare - dt * 1.2);
    finalPass.uniforms.uSan.value = P ? clamp(P.sanity / 100, 0, 1) : 1;
    finalPass.uniforms.uHunt.value = lerp(finalPass.uniforms.uHunt.value, G.huntOn ? 1 : 0, dt * 3);
    finalPass.uniforms.uDeath.value = POST.death; finalPass.uniforms.uScare.value = POST.scare;
    finalPass.uniforms.uNV.value = lerp(finalPass.uniforms.uNV.value, CAM.on ? 1 : 0, clamp(dt * 12, 0, 1)); camHud(dt);
  } else {
    // menu flyover
    MAP.menuCam(T, camera);
    updateRoomLights(T, dt); updateStable(dt);
    PL.flash.intensity = 0; PL.flashCone.visible = false; DUST_U.uFlOn.value = 0;
    finalPass.uniforms.uNV.value = 0; camHud(0, true);
    finalPass.uniforms.uSan.value = 1; finalPass.uniforms.uHunt.value = 0; finalPass.uniforms.uDeath.value = 0; finalPass.uniforms.uScare.value = 0;
    if (AU.ready) { loopGain('wind', 0.3, 1); loopGain('crickets', 0.15, 1); loopGain('drone', 0.0, 1); }
  }
  finalPass.uniforms.uTime.value = T;
  DUST_U.uCam.value.copy(camera.position);
  const cineView = updateCine(dt);
  updateListener(camera);
  if (cineView) renderer.render(CINE.scene, CINE.cam); else composer.render();
}
async function boot() {
  buildTextures(); buildMaterials(); makePrintMat();
  buildLights(); buildSky(); buildItems(scene); buildDust(); buildSmoke(); buildBeams();
  const pref = jobMap(null);
  loadMap('barn');   // no title screen: the game opens in the stables
  G.gh = G.ghProc = buildGhostModel(scene); G.gh.look = 'hidden';
  loadGhostModels(scene);
  initPlayer(scene, camera); bindInput(canvas); bindUI(); buildPost();
  G.players = [makePlayer(0, 'menu')]; G.ghostView = { x: 10, z: 7, y: -50, yaw: 0, mode: 0, vis: 0 }; G.gs = { x: 10, z: 7, y: -50, l: 0, yaw: 0, mode: 0, vis: 0, path: [] };
  $('loading').remove();
  // pre-compile shaders so the first light switch doesn't hitch
  setGhostLook(G.gh, 'visible'); G.gh.root.position.set(10, -50, 7); renderer.compile(scene, camera); setGhostLook(G.gh, 'laser'); renderer.compile(scene, camera); setGhostLook(G.gh, 'hidden');
  requestAnimationFrame(t => { last = t; frame(t); });
  setTimeout(() => { $('fade').style.opacity = 0; }, 200);
  // straight into the stables, headed for the last place picked; sound starts with the first click or key
  setTimeout(() => startSolo(pref), 0);   // after the rest of the script (the easter eggs) has loaded
  addEventListener('pointerdown', () => initAudio(), { once: true }); addEventListener('keydown', () => initAudio(), { once: true });
  sub('Click to look around.', 'sys');
  const ok = await Net.init();
  $('mpNote').innerHTML = ok ? 'Team play is on. <b>Host</b> to get a 4-letter code, or type a teammate\'s code and <b>Join</b>.' : 'Team play needs this page open on claude.ai with a signed-in account. Solo works everywhere.';
  $('btnHost').disabled = !ok; $('btnJoin').disabled = !ok;
}
boot();
