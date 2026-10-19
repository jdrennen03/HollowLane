// ---------------------------------------------------------------- HUD & menus
const $ = id => document.getElementById(id);
const UI = {
  journalOpen: false, paused: false, results: false,
  show(id, on) { $(id).hidden = !on; },
  lobbyNote(t) { $('lobbyNote').textContent = t; },
  renderLobby(peers) {
    const el = $('lobbyList'); el.innerHTML = '';
    const sorted = peers.slice().sort((a, b) => (b.presence.h || 0) - (a.presence.h || 0));
    sorted.forEach((p, i) => { const d = document.createElement('div'); d.className = 'tm'; const b = document.createElement('b'); b.style.background = SLOT_COLORS[Math.min(i, 3)]; d.appendChild(b); const s = document.createElement('span'); s.textContent = String(p.presence.n).slice(0, 14) + (p.sameTab ? ' (you)' : '') + (p.presence.h ? ' · host' : ''); d.appendChild(s); el.appendChild(d); });
    if (sorted.length > 4) { const d = document.createElement('div'); d.className = 'note'; d.textContent = 'Only the first four investigators will go in.'; el.appendChild(d); }
    $('btnStart').hidden = !Net.isHost; renderLobbySet(sorted.find(p => p.presence.h));
    if (!Net.isHost) UI.lobbyNote(sorted.some(p => p.presence.h) ? 'Waiting for the host to start.' : 'Looking for the host… check the code.');
    else UI.lobbyNote('Difficulty: ' + MODES[CURMODE] + '. ' + (sorted.length < 2 ? 'Waiting for teammates. You can also start alone.' : ''));
  },
};
function sub(text, cls = '') {
  const el = document.createElement('div'); el.className = 'sub ' + cls; el.textContent = text; $('subs').appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .6s'; el.style.opacity = 0; setTimeout(() => el.remove(), 700); }, cls === 'ghost' ? 4200 : 3400);
  while ($('subs').children.length > 4) $('subs').firstChild.remove();
}
let _rdKey = '';
function hudReadout(t, minT) {
  const el = $('readout'); const key = t == null ? '' : t.toFixed(1) + '|' + (minT == null ? '' : minT.toFixed(1));
  if (key === _rdKey) return; _rdKey = key;
  if (t == null) { el.hidden = true; return; }
  el.hidden = false; const f = v => (v < 0 ? '−' : '') + Math.abs(v).toFixed(1);
  $('rdVal').textContent = f(t); $('rdMin').textContent = minT == null ? '' : 'min ' + f(minT) + (t <= 0 ? ' · freezing' : '');
  el.classList.toggle('freeze', t <= 0);
}
let _lastPrompt = null;
function hudPrompt(t) { if (t === _lastPrompt) return; _lastPrompt = t; $('prompt').innerHTML = t ? '<kbd>E</kbd>' + t.replace(/</g, '&lt;').replace(/\{(\w)\}/g, '<kbd>$1</kbd>') : ''; $('xhair').classList.toggle('hot', !!t); }
function hudBuildInventory() {
  const el = $('inv'); el.innerHTML = '';
  const its = myItems();
  for (let i = 0; i < 3; i++) {
    const it = its[i]; const d = document.createElement('div'); d.className = 'slot'; d.dataset.i = i;
    d.innerHTML = '<span class="num">' + (i + 1) + '</span>' + (it ? ITEM_ICON[it.type] + '<span class="lbl">' + ITEM_NAME[it.type] + '</span><span class="on"></span>' : '<span class="lbl">Empty</span>');
    el.appendChild(d);
  }
  hudInventory();
}
function hudInventory() {
  const its = myItems(); const h = heldItem();
  [...$('inv').children].forEach((d, i) => { d.classList.toggle('active', !!its[i] && its[i] === h); const on = d.querySelector('.on'); if (on) on.classList.toggle('lit', !!(its[i] && its[i].on)); });
}
function hudTeam() {
  const el = $('team'); el.innerHTML = '';
  if (!G.mp) return;
  for (const P of G.players) { const d = document.createElement('div'); d.className = 'tm' + (P.alive ? '' : ' dead'); const b = document.createElement('b'); b.style.background = SLOT_COLORS[P.slot]; d.appendChild(b); const s = document.createElement('span'); s.textContent = P.nick + (P.slot === G.mySlot ? ' (you)' : ''); d.appendChild(s); const sm = document.createElement('small'); sm.textContent = P.alive ? Math.round(P.sanity) + '%' : (P.gone ? 'left' : 'dead'); d.appendChild(sm); el.appendChild(d); }
}
let _hudT = 0;
function hudUpdate(dt) {
  _hudT -= dt; if (_hudT > 0) return; _hudT = 0.2;
  const P = me(); if (!P) return;
  $('sanVal').textContent = Math.round(P.sanity) + '%'; $('sanBar').style.width = P.sanity + '%'; $('sanBar').classList.toggle('low', P.sanity < 50);
  $('stamBar').style.width = (PL.stamina * 100) + '%';
  const m = Math.floor(G.elapsed / 60), s = Math.floor(G.elapsed % 60); $('clockVal').textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  const ri = roomIdxAt(P.pos.x, P.pos.z, P.pos.y);
  $('roomLbl').textContent = ri >= 0 ? ROOMS[ri].name : (Math.hypot(P.pos.x - TENT.x, P.pos.z - TENT.z) < 2.4 ? (MAP.rusticBase ? 'By the wagon' : 'Base tent') : MAP.yardName(P.pos));
  $('clockLbl').textContent = G.huntOn ? 'Hunt in progress' : STB.phase === 'base' ? 'Home base · ride out to begin' : 'Investigation';
  stbHud();
  $('huntVig').classList.toggle('on', !!G.huntOn || PL.deathT >= 0);
  hudInventory();
  if (G.mp) hudTeam();
}
// ---------------------------------------------------------------- journal
function buildJournal() {
  const ev = $('evList'); ev.innerHTML = '';
  for (const k of EV) {
    // two explicit marks per evidence: found (the ghost leaves it) and ruled out (confirmed it does not)
    const r = document.createElement('div'); r.className = 'evrow'; r.dataset.k = k;
    r.innerHTML = '<button class="mk yes" type="button" title="Found: this ghost leaves it" aria-label="Mark ' + EV_NAME[k] + ' as found">✓</button><button class="mk no" type="button" title="Ruled out: confirmed this ghost does not leave it" aria-label="Rule out ' + EV_NAME[k] + '">✕</button><span class="lbl">' + EV_NAME[k] + '<small>' + EV_HINT[k] + '</small></span>';
    const set = v => { G.journal.ev[k] = (G.journal.ev[k] || 0) === v ? 0 : v; renderJournal(); };
    r.querySelector('.yes').onclick = () => set(1); r.querySelector('.no').onclick = () => set(2);
    ev.appendChild(r);
  }
  const gl = $('ghostList'); gl.innerHTML = '';
  GHOSTS.forEach((g, i) => {
    const c = document.createElement('div'); c.className = 'gcard'; c.dataset.i = i; c.tabIndex = 0;
    c.innerHTML = '<h3>' + g.name + '</h3><div class="evs">' + g.ev.map(e => '<span>' + EV_SHORT[e] + '</span>').join('') + '</div><p>' + g.tell + '</p>';
    const sel = () => { G.journal.pick = G.journal.pick === i ? -1 : i; renderJournal(); };
    c.onclick = sel; c.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel(); } };
    gl.appendChild(c);
  });
}
function renderJournal() {
  const st = G.journal.ev;
  for (const r of $('evList').children) { const s = st[r.dataset.k] || 0; r.classList.toggle('found', s === 1); r.classList.toggle('out', s === 2); r.querySelector('.yes').setAttribute('aria-pressed', s === 1); r.querySelector('.no').setAttribute('aria-pressed', s === 2); }
  const found = EV.filter(k => st[k] === 1), out = EV.filter(k => st[k] === 2), nm = G.mode === 'nightmare'; let left = 0;
  $('modeTag').textContent = (MODES[G.mode] || 'Pro') + ' · ' + (MODE_NOTE[G.mode] || '');
  for (const c of $('ghostList').children) {
    // in Nightmare one of the ghost's evidences never shows, so one 'ruled out' mark may still belong to it
    const g = GHOSTS[+c.dataset.i]; const ok = found.every(k => g.ev.includes(k)) && out.filter(k => g.ev.includes(k)).length <= (nm ? 1 : 0) && !(nm && found.length > 2);
    c.classList.toggle('dim', !ok); c.classList.toggle('sel', G.journal.pick === +c.dataset.i); if (ok) left++;
    c.querySelectorAll('.evs span').forEach((sp, j) => { const e = g.ev[j]; sp.classList.toggle('hit', st[e] === 1); sp.classList.toggle('miss', st[e] === 2); });
  }
  $('ghostLeft').textContent = left === 1 ? '1 possible ghost' : left + ' possible ghosts';
  const atTent = UI.atTent;
  $('btnSubmit').disabled = !(atTent && G.journal.pick >= 0);
  $('btnSubmit').textContent = G.journal.pick >= 0 ? 'File verdict: ' + GHOSTS[G.journal.pick].name : 'Choose a ghost';
  $('submitNote').textContent = atTent ? 'Filing ends the investigation for the whole team.' : 'Use the clipboard on the tent table to file your verdict.';
}
function openJournal(atTent = false) {
  UI.atTent = atTent; UI.journalOpen = true; UI.show('journal', true); renderJournal();
  if (document.pointerLockElement) document.exitPointerLock();
}
function closeJournal() { UI.journalOpen = false; UI.show('journal', false); requestLock($('gl')); }
function toggleJournal() { if (UI.journalOpen) closeJournal(); else openJournal(false); }
function openPause() { if (UI.results) return; UI.paused = !G.mp ? true : false; UI.pauseOpen = true; UI.show('pause', true); $('pauseNote').hidden = !G.mp; }
function closePause() { UI.paused = false; UI.pauseOpen = false; UI.show('pause', false); requestLock($('gl')); }
function onRoundEnd(guess, bySlot) {
  if (G.state !== 'play') return;
  G.state = 'over'; UI.results = true;
  if (document.pointerLockElement) document.exitPointerLock();
  const correct = guess === G.ghostIdx;
  $('btnAgain').textContent = Net.lobby ? 'Back to the lobby' : 'Back to the street';
  $('resEyebrow').textContent = guess < 0 ? 'Investigation failed' : 'Case closed';
  $('resTitle').textContent = guess < 0 ? 'No one made it out' : correct ? 'Correct' : 'Wrong ghost';
  $('resGhost').textContent = 'It was a ' + G.ghost.name + '. ' + G.ghost.allEv.map(e => EV_NAME[e] + (e === G.hiddenEv ? ' (hidden)' : '')).join(', ') + '.';
  const by = bySlot >= 0 && G.players[bySlot] ? G.players[bySlot].nick : '—';
  const rows = [['Difficulty', MODES[G.mode] || 'Pro'], ['Your guess', guess >= 0 ? GHOSTS[guess].name : '—'], ['Filed by', guess >= 0 ? by : '—'], ['Ghost room', ROOMS[G.ghostRoom].name], ['Time in the house', $('clockVal').textContent], ['Investigators lost', G.stats.deaths + ' of ' + G.players.length], ['Your sanity', Math.round(me().sanity) + '%']];
  $('resStats').innerHTML = rows.map(([a, b]) => '<span>' + a + '</span><b>' + String(b).replace(/</g, '&lt;') + '</b>').join('');
  UI.show('journal', false); UI.journalOpen = false; UI.show('pause', false); UI.show('dead', false);
  setTimeout(() => UI.show('results', true), 600);
  if (correct) sfx('huntEnd', 0.6); else sfx('scare', 0.6);
}
function bindUI() {
  const nick = $('nick'); let stored = ''; try { stored = localStorage.getItem('hl-nick') || ''; } catch (e) { }
  nick.value = stored || ('Investigator ' + (100 + (Math.random() * 900 | 0)));
  const nm = () => { const v = nick.value.trim().slice(0, 14) || 'Investigator'; try { localStorage.setItem('hl-nick', v); } catch (e) { } return v; };
  $('btnSolo').onclick = () => { initAudio(); const n = nm(); beginGame({ map: CURMAP, mode: CURMODE, gm: (Math.random() * GHOST_FILES.length) | 0, seed: (Math.random() * 1e9) | 0, ghostIdx: (Math.random() * GHOSTS.length) | 0, ghostRoom: pickGhostRoom(), roster: [{ slot: 0, nick: n, peer: 'solo', ch: CURCHAR }], mySlot: 0, mp: false, host: true }); };
  $('btnHost').onclick = async () => { initAudio(); if (!Net.room) return; const code = randCode(); $('lobbyCode').textContent = code; UI.show('menu', false); UI.show('lobby', true); UI.lobbyNote('Opening lobby…'); try { await Net.open(code, true, nm()); } catch (e) { UI.lobbyNote('Could not open a lobby here (' + (e && e.code || 'error') + ').'); } };
  $('btnJoin').onclick = async () => { initAudio(); if (!Net.room) return; const code = $('joinCode').value.trim().toUpperCase().replace(/\s+/g, ''); if (!(window.hlDesktop ? /^[A-Z]{4}(@[A-Z0-9.:-]+)?$/ : /^[A-Z]{4}$/).test(code)) { $('mpNote').textContent = 'Lobby codes are four letters.'; return; } $('lobbyCode').textContent = code.slice(0, 4); UI.show('menu', false); UI.show('lobby', true); UI.lobbyNote('Joining…'); try { await Net.open(code, false, nm()); } catch (e) { UI.lobbyNote('Could not join (' + (e && e.code || 'error') + ').'); } };
  $('btnStart').onclick = () => { Net.hostStart(); };
  $('btnLeave').onclick = async () => { await Net.leave(); UI.show('lobby', false); UI.show('menu', true); };
  $('btnResume').onclick = closePause;
  $('btnQuit').onclick = () => Net.lobby ? backToLobby(true) : quitToMenu();
  $('btnCloseJ').onclick = closeJournal;
  $('btnSubmit').onclick = () => { if (G.journal.pick < 0) return; request('guess', G.journal.pick); };
  $('btnAgain').onclick = () => Net.lobby ? backToLobby() : quitToMenu();
  const sens = $('sens'); sens.oninput = () => { PL.sens = +sens.value; $('sensV').textContent = (+sens.value).toFixed(1); };
  const vol = $('vol'); vol.oninput = () => { AU.vol = +vol.value; if (AU.master) AU.master.gain.value = AU.vol; $('volV').textContent = Math.round(vol.value * 100); };
  const q = $('qual'); q.oninput = () => { setQuality(+q.value); $('qualV').textContent = ['Low', 'Medium', 'High'][+q.value]; };
  addEventListener('keydown', e => {
    if (e.code === 'Escape') { if (UI.journalOpen) { closeJournal(); } }
    if ((e.code === 'KeyJ' || e.code === 'Tab') && UI.journalOpen && G.state === 'play' && e.target.tagName !== 'INPUT') { /* handled in player */ }
  });
  for (const b of document.querySelectorAll('.mapc')) b.onclick = () => {
    const id = b.dataset.map; if (id === CURMAP) return;
    document.querySelectorAll('.mapc').forEach(x => x.disabled = true); $('fade').style.opacity = 0.9;
    setTimeout(() => { loadMap(id); try { localStorage.setItem('hl-map', id); } catch (e) { } document.querySelectorAll('.mapc').forEach(x => x.disabled = false); $('fade').style.opacity = 0; }, 60);
  };
  for (const b of document.querySelectorAll('[data-mode]')) b.onclick = () => { CURMODE = b.dataset.mode; try { localStorage.setItem('hl-mode', CURMODE); } catch (e) { } menuForMode(); };
  try { const m = localStorage.getItem('hl-mode'); if (MODES[m]) CURMODE = m; } catch (e) { }
  menuForMode();
  for (const b of document.querySelectorAll('[data-char]')) b.onclick = () => { CURCHAR = b.dataset.char; try { localStorage.setItem('hl-char', CURCHAR); } catch (e) { } menuForChar(); if (Net.lobby) Net.lobby.presence({ ch: CURCHAR }).catch(() => { }); };
  try { const c = localStorage.getItem('hl-char'); if (c === 'm' || c === 'f') CURCHAR = c; } catch (e) { }
  menuForChar();
  buildJournal();
}
let CURMODE = 'pro', CURCHAR = 'f';
function menuForChar() { document.querySelectorAll('[data-char]').forEach(b => b.classList.toggle('sel', b.dataset.char === CURCHAR)); }
// the lobby stays open between rounds, so the host picks the next location and difficulty here
function renderLobbySet(hostPeer) {
  const el = $('lobbySet');
  if (!Net.isHost) {
    const pr = hostPeer && hostPeer.presence, m = pr && MAPS[pr.m], md = pr && MODES[pr.md];
    el.innerHTML = m ? '<div class="next">Next investigation: ' + m.title + (md ? ' · ' + md : '') + '</div>' : ''; return;
  }
  if (el.dataset.built === '1') { el.querySelectorAll('[data-lmap]').forEach(b => b.classList.toggle('sel', b.dataset.lmap === CURMAP)); el.querySelectorAll('[data-lmode]').forEach(b => b.classList.toggle('sel', b.dataset.lmode === CURMODE)); return; }
  el.dataset.built = '1';
  el.innerHTML = '<div class="maps">' + Object.values(MAPS).map(m => '<button class="mapc" data-lmap="' + m.id + '">' + m.title + '</button>').join('') + '</div><div class="maps modes">' + Object.keys(MODES).map(k => '<button class="mapc" data-lmode="' + k + '">' + MODES[k] + '</button>').join('') + '</div>';
  el.querySelectorAll('[data-lmap]').forEach(b => b.onclick = () => { if (b.dataset.lmap === CURMAP) return; loadMap(b.dataset.lmap); try { localStorage.setItem('hl-map', CURMAP); } catch (e) { } Net.announce(); renderLobbySet(); });
  el.querySelectorAll('[data-lmode]').forEach(b => b.onclick = () => { CURMODE = b.dataset.lmode; try { localStorage.setItem('hl-mode', CURMODE); } catch (e) { } menuForMode(); Net.announce(); renderLobbySet(); UI.lobbyNote('Difficulty: ' + MODES[CURMODE] + '.'); });
  renderLobbySet();
}
function menuForMode() { document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('sel', b.dataset.mode === CURMODE)); }
function menuForMap() {
  $('mapH1').innerHTML = '<span>' + MAP.eyebrow + '</span>' + MAP.title; $('mapLede').textContent = MAP.lede;
  document.querySelectorAll('.mapc').forEach(b => b.classList.toggle('sel', b.dataset.map === CURMAP));
}
