// ---------------------------------------------------------------- atmosphere: ground mist, dusty light beams, cobwebs
// Ground mist: three soft noise layers hugging the terrain outdoors. They fade out close to the camera (so you never
// see a layer edge-on) and are masked out of every building footprint, so floors indoors stay clear.
const MIST_U = { uTime: { value: 0 }, uBoxes: { value: Array.from({ length: 16 }, () => new THREE.Vector4(0, 0, 0, 0)) }, uNB: { value: 0 }, uMoon: { value: new THREE.Color(0x8a9ab8) } };
let MIST = null;
function buildMist() {
  if (MIST) { scene.remove(MIST); MIST.traverse(o => o.geometry && o.geometry.dispose()); }
  const boxes = ROOMS.filter(R => !R.outdoor && !R.closet && (R.lv || 0) === 0).slice(0, 16);
  boxes.forEach((R, i) => MIST_U.uBoxes.value[i].set(R.r[0] - 0.4, R.r[1] - 0.4, R.r[2] + 0.4, R.r[3] + 0.4)); MIST_U.uNB.value = boxes.length;
  const [gx0, gz0, gx1, gz1] = MAP.grassBox, cx = (gx0 + gx1) / 2, cz = (gz0 + gz1) / 2, W = Math.max(gx1 - gx0, gz1 - gz0) + 30;
  const mat = new THREE.ShaderMaterial({
    uniforms: MIST_U, transparent: true, depthWrite: false, fog: false,
    vertexShader: 'attribute float aL; varying vec3 vW; varying float vL; void main(){ vL = aL; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uTime; uniform vec4 uBoxes[16]; uniform int uNB; uniform vec3 uMoon; varying vec3 vW; varying float vL;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        vec2 p = vW.xz * 0.06 + vec2(uTime * 0.012, uTime * 0.007) * (1.0 + vL);
        float n = n2(p) * 0.55 + n2(p * 2.3 + 7.1) * 0.3 + n2(p * 5.1 - 3.3) * 0.15;
        float a = smoothstep(0.32, 0.8, n) * (0.14 - vL * 0.035);
        float d = distance(cameraPosition, vW); a *= smoothstep(2.5, 8.0, d) * (1.0 - smoothstep(55.0, 90.0, d));
        for (int i = 0; i < 16; i++) { if (i >= uNB) break; vec4 b = uBoxes[i]; vec2 q = max(vec2(b.x, b.y) - vW.xz, vW.xz - vec2(b.z, b.w)); float out_ = max(q.x, q.y); a *= smoothstep(0.0, 1.5, out_); }
        gl_FragColor = vec4(uMoon * (0.55 + n * 0.3), a);
      }`,
  });
  const g = new THREE.Group();
  [0.18, 0.42, 0.75].forEach((hgt, li) => {
    const geo = new THREE.PlaneGeometry(W, W, 70, 70); geo.rotateX(-Math.PI / 2); const P = geo.attributes.position, L = new Float32Array(P.count).fill(li);
    for (let i = 0; i < P.count; i++) { const x = P.getX(i) + cx, z = P.getZ(i) + cz; P.setY(i, terrainY(x, z) + hgt); }
    geo.setAttribute('aL', new THREE.BufferAttribute(L, 1));
    const m = new THREE.Mesh(geo, mat); m.position.set(cx, 0, cz); m.frustumCulled = false; m.renderOrder = 3; g.add(m);
  });
  MIST = g; scene.add(g);
}
// dusty beams under the lit ceiling lights (one per light in the pool)
const BEAMS = [];
function buildBeams() {
  const cg = new THREE.ConeGeometry(1.1, 2.4, 24, 1, true); cg.translate(0, -1.2, 0);
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(cg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uI: { value: 0 }, uTime: MIST_U.uTime },
      vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vY = -position.y / 2.4; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vN = normalize(mat3(viewMatrix) * mat3(modelMatrix) * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float uI; uniform float uTime; varying float vY; varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ float e = abs(dot(normalize(vN), normalize(vV))); float mote = 0.75 + 0.25 * sin(vW.x * 9.0 + uTime * 0.7) * sin(vW.z * 7.0 - uTime * 0.5); float a = uI * (1.0 - vY) * smoothstep(0.0, 0.12, vY) * pow(e, 2.0) * mote; gl_FragColor = vec4(vec3(1.0, 0.86, 0.66) * a, a); }' }));
    m.visible = false; m.renderOrder = 4; m.frustumCulled = false; scene.add(m); BEAMS.push(m);
  }
}
function updateAtmos(t) {
  MIST_U.uTime.value = t;
  for (let k = 0; k < BEAMS.length; k++) {
    const s = LIGHTS.pool[k], B = BEAMS[k], on = s.intensity > 0.5, R = on ? ROOMS[roomIdxAt(s.position.x, s.position.z, s.position.y - 1.5)] : null;
    B.visible = on && !!R && !R.outdoor;
    if (B.visible) { B.position.copy(s.position); B.position.y += 0.05; B.material.uniforms.uI.value = 0.022 * Math.min(1.5, s.intensity / 32); }
  }
}
// cobwebs in a few ceiling corners of every room (the original house has its own, hand-placed)
function cornerWebs(root) {
  if (MAP.id === 'lane') return;
  for (const R of ROOMS) {
    if (R.outdoor || R.closet) continue;
    const [x0, z0, x1, z1] = R.r, top = R.y + (R.noCeil ? WALL_H - 0.06 : WALL_H) - 0.01;
    const corners = [[x0 + 0.1, z0 + 0.1, 0], [x1 - 0.1, z0 + 0.1, -Math.PI / 2], [x1 - 0.1, z1 - 0.1, Math.PI], [x0 + 0.1, z1 - 0.1, Math.PI / 2]];
    for (const [x, z, ry] of corners) {
      if (WR() > 0.45) continue;
      const s = 0.6 + WR() * 0.6, g = new THREE.PlaneGeometry(s, s); g.translate(s / 2, -s / 2, 0);
      const m = new THREE.Mesh(g, MATS.web); m.position.set(x, top, z); m.rotation.set(0, ry - Math.PI / 4, 0); m.rotateX(-0.5 - WR() * 0.3); root.add(m);
    }
  }
}
