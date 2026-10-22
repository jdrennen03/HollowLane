// ---------------------------------------------------------------- developer screen (~): choose the next game's ghost
// With nothing chosen the game picks a ghost at random as usual. A choice is used once, by the next game this machine
// starts (solo, or as host), and then it goes back to random.
const DEV = { ghost: -1, open: false, custom: -1 };
// ---------------------------------------------------------------- a ghost model from a .glb file on this computer
// Parsed straight from the file (nothing is uploaded) and used as the ghost from then on, until "Use built-in models" or a
// reload. Only this computer sees it: other players keep the round's own model. Clips named idle / walk / run are used
// when the file has them; otherwise its first clip plays with the procedural walk on top (Mixamo-style bone names).
const CUSTOM_GHOST = { buf: null, name: '', height: 1.9, turn: 0 };
function devLoadCustomGhost(done) {
  const C = CUSTOM_GHOST; if (!C.buf) return;
  new GLTFLoader().parse(C.buf.slice(0), '', gl => {
    try {
      const names = gl.animations.map(a => a.name), find = re => names.find(n => re.test(n));
      const idle = find(/idle|stand|breath/i), walk = find(/walk|move/i), run = find(/run|sprint|chase/i);
      const f = { url: C.name, name: 'custom', height: C.height, turn: C.turn };
      if (walk) f.clips = Object.fromEntries([['idle', idle], ['walk', walk], ['run', run]].filter(e => e[1]));
      const idx = GHOST_FILES.length, old = GHOST_MODELS[idx];
      if (old) { if (G.gh === old) G.gh = G.ghProc; scene.remove(old.root); }
      const gm = GHOST_MODELS[idx] = prepGhostModel(gl, f, scene);
      gm.root.position.set(0, -60, 0); setGhostLook(gm, 'visible'); renderer.compile(scene, camera); setGhostLook(gm, 'laser'); renderer.compile(scene, camera); setGhostLook(gm, 'hidden'); gm.look = 'hidden';
      DEV.custom = idx;
      if (G.state === 'play') { G.ghostModel = idx; useGhostModel(idx); }
      done(true, (f.clips ? 'clips: ' + Object.entries(f.clips).map(([k, v]) => k + ' = ' + v).join(', ') : names.length ? 'first clip "' + names[0] + '" + procedural walk' : 'no animation: procedural walk only'));
    } catch (e) { console.warn('custom ghost', e); done(false, 'Could not set up this model: ' + e.message); }
  }, e => done(false, 'Could not read this file: ' + (e.message || e)));
}
function devClearCustomGhost() {
  const idx = DEV.custom; DEV.custom = -1; CUSTOM_GHOST.buf = null;
  if (idx >= 0 && GHOST_MODELS[idx]) { const m = GHOST_MODELS[idx]; if (G.gh === m) G.gh = G.ghProc; scene.remove(m.root); GHOST_MODELS[idx] = undefined; }
  if (G.state === 'play') { G.ghostModel = G.roundGm ?? 0; useGhostModel(G.ghostModel); }
}
function pickGhostIdx() {
  const g = DEV.ghost;
  if (g >= 0 && g < GHOSTS.length) { DEV.ghost = -1; devRender(); return g; }
  return (Math.random() * GHOSTS.length) | 0;
}
function devRender() {
  const box = $('dev'); if (!box) return;
  box.querySelectorAll('[data-dg]').forEach(b => b.classList.toggle('sel', +b.dataset.dg === DEV.ghost));
  const badge = $('devBadge'); badge.hidden = DEV.ghost < 0; if (DEV.ghost >= 0) badge.textContent = 'DEV · next ghost: ' + GHOSTS[DEV.ghost].name;
}
function devToggle(open = !DEV.open) {
  DEV.open = open; $('dev').hidden = !open; if (open && DEV.fillVoices) DEV.fillVoices();
  if (open && document.pointerLockElement) document.exitPointerLock();
  devRender();
}
function buildDev() {
  const box = document.createElement('div'); box.id = 'dev'; box.hidden = true;
  box.innerHTML = '<div class="devbox"><h2>Developer · next game\'s ghost</h2><p class="devnote">Used once by the next game you start or host, then back to random. ~ or Esc to close.</p><div class="maps devgrid"></div></div>';
  const grid = box.querySelector('.devgrid');
  const add = (i, label, sub) => { const b = document.createElement('button'); b.className = 'mapc'; b.dataset.dg = i; b.innerHTML = label + '<small>' + sub + '</small>'; b.onclick = () => { DEV.ghost = i; devRender(); }; grid.appendChild(b); };
  add(-1, 'Random', 'the usual');
  GHOSTS.forEach((g, i) => add(i, g.name, g.ev.map(e => EV_SHORT[e]).join(' · ')));
  // ghost model from a local .glb
  const mb = document.createElement('div');
  mb.innerHTML = '<h2 style="margin-top:18px">Ghost model</h2><p class="devnote">Load a .glb from this computer to use as the ghost (in this round and the next ones, until you switch back or reload). Only you see it in multiplayer.</p>' +
    '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;font:13px var(--f-ui);color:var(--paper)"><input type="file" accept=".glb,.gltf,model/gltf-binary" class="devglb">' +
    '<label>Height <input type="number" class="devgh" value="1.9" min="0.5" max="4" step="0.05" style="width:64px"> m</label>' +
    '<button class="mapc devturn" style="min-height:0;padding:6px 10px">Turn 90°</button><button class="mapc devbuiltin" style="min-height:0;padding:6px 10px">Use built-in models</button></div><p class="devnote devgst" style="margin-top:8px"></p>';
  box.querySelector('.devbox').appendChild(mb);
  const gst = mb.querySelector('.devgst'), say = (ok, t) => { gst.textContent = (ok ? '✓ ' + CUSTOM_GHOST.name + ' is the ghost. ' : '✗ ') + t; };
  mb.querySelector('.devglb').onchange = e => { const file = e.target.files[0]; if (!file) return; gst.textContent = 'Loading ' + file.name + '…';
    file.arrayBuffer().then(buf => { Object.assign(CUSTOM_GHOST, { buf, name: file.name, turn: 0 }); devLoadCustomGhost(say); }); };
  mb.querySelector('.devgh').onchange = e => { CUSTOM_GHOST.height = clamp(+e.target.value || 1.9, 0.5, 4); if (CUSTOM_GHOST.buf) devLoadCustomGhost(say); };
  mb.querySelector('.devturn').onclick = () => { if (!CUSTOM_GHOST.buf) return; CUSTOM_GHOST.turn = (CUSTOM_GHOST.turn + Math.PI / 2) % (Math.PI * 2); devLoadCustomGhost(say); };
  mb.querySelector('.devbuiltin').onclick = () => { devClearCustomGhost(); mb.querySelector('.devglb').value = ''; gst.textContent = 'Back to the built-in ghost models.'; };
  // ghost voice: every speech voice this computer has, each with a spirit box and a Siren sample; the one you pick is used
  const vb = document.createElement('div'); vb.innerHTML = '<h2 style="margin-top:18px">Ghost voice</h2><p class="devnote">Click a voice to hear a spirit box answer and use it for the spirit box and the Siren from now on (remembered on this computer). ▶ Siren plays the name whisper. Tags mark the voices the game used before.</p><div class="maps devgrid devvoices"></div>';
  box.querySelector('.devbox').appendChild(vb);
  const vgrid = vb.querySelector('.devvoices');
  const fillVoices = () => {
    if (!window.speechSynthesis) { vgrid.textContent = 'This browser has no speech voices.'; return; }
    const vs = speechSynthesis.getVoices(); if (!vs.length) { vgrid.textContent = 'Loading voices…'; return; }
    const old = oldVoicePick(vs), def = vs.find(v => v.default), cur = (pickVoice(), VOICE), nick = () => ($('nick') && $('nick').value.trim()) || 'Claire';
    const list = [...vs].sort((a, b) => (/^en/i.test(b.lang) - /^en/i.test(a.lang)) || ((b === old || b === def) - (a === old || a === def)));
    vgrid.innerHTML = '';
    const add = (v) => {
      const tags = [v === old && 'used before: spirit box', v === def && 'used before: first answer', v === cur && 'current'].filter(Boolean);
      const b = document.createElement('button'); b.className = 'mapc' + (v === cur ? ' sel' : ''); b.innerHTML = (v ? v.name : 'Automatic') + '<small>' + (v ? v.lang + (v.localService ? ' · on this computer' : ' · online') : 'Google español (EE. UU.) where it exists, else a deep local voice') + (tags.length ? '<br>' + tags.join(' · ') : '') + '</small>';
      b.onclick = () => { setGhostVoice(v); if (v || VOICE) sampleVoice(v || VOICE, false); fillVoices(); };
      const s = document.createElement('span'); s.textContent = '▶ Siren'; s.style.cssText = 'display:inline-block;margin-top:6px;padding:2px 8px;border:1px solid currentColor;font-size:11px;cursor:pointer';
      s.onclick = e => { e.stopPropagation(); sampleVoice(v || VOICE, true, nick()); }; b.appendChild(document.createElement('br')); b.appendChild(s);
      vgrid.appendChild(b);
    };
    add(null); list.forEach(add);
  };
  if (window.speechSynthesis) speechSynthesis.addEventListener('voiceschanged', fillVoices);
  DEV.fillVoices = fillVoices;
  box.onclick = e => { if (e.target === box) devToggle(false); };
  document.body.appendChild(box);
  const badge = document.createElement('div'); badge.id = 'devBadge'; badge.hidden = true; document.body.appendChild(badge);
  addEventListener('keydown', e => {
    if (e.code === 'Backquote' && !(e.target && e.target.tagName === 'INPUT')) { e.preventDefault(); devToggle(); }   // the ~ key (not while typing a name or code)
    else if (e.key === 'Escape' && DEV.open) { e.stopPropagation(); devToggle(false); }
  }, true);
  devRender();
}
