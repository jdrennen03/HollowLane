// ---------------------------------------------------------------- developer screen (~): choose the next game's ghost
// With nothing chosen the game picks a ghost at random as usual. A choice is used once, by the next game this machine
// starts (solo, or as host), and then it goes back to random.
const DEV = { ghost: -1, open: false };
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
  DEV.open = open; $('dev').hidden = !open;
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
  box.onclick = e => { if (e.target === box) devToggle(false); };
  document.body.appendChild(box);
  const badge = document.createElement('div'); badge.id = 'devBadge'; badge.hidden = true; document.body.appendChild(badge);
  addEventListener('keydown', e => {
    if (e.code === 'Backquote' && !(e.target && e.target.tagName === 'INPUT')) { e.preventDefault(); devToggle(); }   // the ~ key (not while typing a name or code)
    else if (e.key === 'Escape' && DEV.open) { e.stopPropagation(); devToggle(false); }
  }, true);
  devRender();
}
