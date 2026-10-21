// ---------------------------------------------------------------- procedural audio
const AU = { ctx: null, master: null, rev: null, revIn: null, bufs: {}, loops: {}, vol: 0.8, ready: false };
function initAudio() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const ctx = AU.ctx = new AC();
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
  AU.master = ctx.createGain(); AU.master.gain.value = AU.vol; AU.master.connect(comp);
  AU.rev = ctx.createConvolver(); AU.rev.buffer = makeIR(2.6, 2.4); AU.revIn = ctx.createGain(); AU.revIn.gain.value = 0.5; AU.revIn.connect(AU.rev); AU.rev.connect(AU.master);
  const sr = ctx.sampleRate, B = AU.bufs;
  const mk = (sec, fn, ch = 1) => { const b = ctx.createBuffer(ch, Math.max(1, (sec * sr) | 0), sr); for (let c = 0; c < ch; c++) fn(b.getChannelData(c), sr, c); return b; };
  const N = () => Math.random() * 2 - 1;
  // filters
  const svf = (d, f, q, type) => { let lo = 0, bp = 0; for (let i = 0; i < d.length; i++) { const fc = typeof f === 'function' ? f(i / sr) : f; const F = 2 * Math.sin(Math.PI * Math.min(fc, sr / 6) / sr); const hi = d[i] - lo - q * bp; bp += F * hi; lo += F * bp; d[i] = type === 'lp' ? lo : type === 'bp' ? bp : hi; } return d; };
  const norm = (d, p = 0.9) => { let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < d.length; i++) d[i] *= p / m; return d; };
  const env = (t, a, dcy) => t < a ? t / a : Math.exp(-(t - a) / dcy);
  // footsteps
  const step = (lpF, bpF, thump, len, gain) => mk(len, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = N() * env(t, 0.002, len / 5); } svf(d, bpF, 0.9, 'bp'); for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] += Math.sin(t * Math.PI * 2 * thump) * env(t, 0.003, 0.03) * 0.8; } svf(d, lpF, 0.7, 'lp'); norm(d, gain); });
  B.step_wood = step(2200, 420, 95, 0.16, 0.9); B.step_carpet = step(700, 300, 80, 0.14, 0.6); B.step_tile = step(5000, 1500, 120, 0.12, 0.85); B.step_grass = mk(0.22, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = N() * env(t, 0.02, 0.05) * (1 + 0.5 * Math.sin(t * 90)); } svf(d, 3200, 1.2, 'bp'); norm(d, 0.5); });
  B.step_concrete = step(3500, 900, 100, 0.12, 0.8);
  B.gstep = mk(0.5, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = Math.sin(t * Math.PI * 2 * (60 - t * 30)) * env(t, 0.004, 0.09) + N() * env(t, 0.002, 0.03) * 0.5; } svf(d, 900, 0.8, 'lp'); norm(d, 1); });
  B.creak = mk(1.4, d => { let ph = 0; for (let i = 0; i < d.length; i++) { const t = i / sr; const rate = 28 + 30 * Math.sin(t * 2.4) + 15 * Math.sin(t * 7.1); ph += rate / sr; if (ph >= 1) { ph -= 1; d[i] = 1; } else d[i] = 0; d[i] = d[i] * (0.6 + 0.4 * Math.random()) * Math.sin(Math.PI * t / 1.4); } const a = Float32Array.from(d), b = Float32Array.from(d); svf(a, 720, 0.08, 'bp'); svf(b, 1550, 0.1, 'bp'); for (let i = 0; i < d.length; i++) d[i] = a[i] + b[i] * 0.6; norm(d, 0.7); });
  B.slam = mk(1.0, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = N() * env(t, 0.001, 0.05) + Math.sin(t * Math.PI * 2 * 58) * env(t, 0.002, 0.18) * 1.4 + (t > 0.05 && t < 0.4 ? N() * 0.15 * env(t - 0.05, 0.001, 0.08) * (Math.sin(t * 300) > 0.7 ? 1 : 0) : 0); } svf(d, 1400, 0.6, 'lp'); norm(d, 1); });
  B.switch = mk(0.06, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = (t < 0.002 || (t > 0.012 && t < 0.014) ? N() : 0) + N() * env(t, 0.0005, 0.004) * 0.3; } svf(d, 2500, 0.5, 'hp'); norm(d, 0.6); });
  B.clatter = mk(0.7, d => { for (let k = 0; k < 7; k++) { const t0 = Math.random() * 0.35 * (k ? 1 : 0), f = 1500 + Math.random() * 3000, s = (t0 * sr) | 0; for (let i = 0; i < 0.12 * sr && s + i < d.length; i++) { const t = i / sr; d[s + i] += Math.sin(t * f * 6.283) * env(t, 0.0005, 0.02) * (k ? 0.5 : 1) + N() * env(t, 0.0005, 0.004); } } norm(d, 0.9); });
  B.knock = mk(0.9, d => { for (const t0 of [0, 0.24, 0.45]) { const s = (t0 * sr) | 0; for (let i = 0; i < 0.1 * sr; i++) { const t = i / sr; d[s + i] += Math.sin(t * 6.283 * 140) * env(t, 0.001, 0.025) + N() * env(t, 0.0005, 0.006) * 0.6; } } svf(d, 900, 0.7, 'lp'); norm(d, 0.9); });
  B.whisper = mk(1.8, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; const syl = Math.max(0, Math.sin(t * 9.5 + Math.sin(t * 3) * 2)); d[i] = N() * syl * Math.sin(Math.PI * t / 1.8); } svf(d, t => 900 + 1400 * (0.5 + 0.5 * Math.sin(t * 13)), 0.25, 'bp'); norm(d, 0.6); });
  B.creakHouse = mk(1.6, d => { let ph = 0; for (let i = 0; i < d.length; i++) { const t = i / sr; ph += (12 + 10 * Math.sin(t * 1.3)) / sr; d[i] = (ph % 1 < 0.02 ? 1 : 0) * Math.sin(Math.PI * t / 1.6); } svf(d, 380, 0.06, 'bp'); norm(d, 0.6); });
  B.scare = mk(2.2, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; let v = 0; for (const f of [220, 233, 311, 466, 622]) v += ((t * f * (1 + t * 0.05)) % 1 - 0.5); d[i] = (v * 0.3 + N() * 0.4) * env(t, 0.02, 0.6); } svf(d, 4000, 0.5, 'lp'); norm(d, 1); });
  B.vanish = mk(0.9, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = N() * (t / 0.9) * (t < 0.85 ? 1 : (0.9 - t) / 0.05); } svf(d, t => 200 + 4000 * t, 0.6, 'lp'); norm(d, 0.6); });
  B.manifest = mk(2.0, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = (Math.sin(t * 6.283 * (38 + t * 15)) * 0.8 + N() * 0.3) * Math.sin(Math.PI * t / 2.0); } svf(d, 600, 0.5, 'lp'); norm(d, 0.9); });
  B.huntStart = mk(3.0, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; const roar = Math.tanh(((t * 90 * (1 - t * 0.1)) % 1 - 0.5) * 6 + N() * 0.8) * env(t, 0.3, 1.2); d[i] = Math.sin(t * 6.283 * 36) * env(t, 0.01, 1.4) * 1.2 + roar * 0.6; } svf(d, 1800, 0.6, 'lp'); norm(d, 1); });
  B.huntEnd = mk(1.8, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = Math.sin(t * 6.283 * (180 - t * 80)) * env(t, 0.05, 0.6) * 0.6 + N() * env(t, 0.01, 0.3) * 0.2; } svf(d, 1200, 0.6, 'lp'); norm(d, 0.5); });
  B.scream = mk(1.8, d => { let ph = 0; for (let i = 0; i < d.length; i++) { const t = i / sr; const f = 520 + 260 * Math.sin(t * 2.2) + 40 * Math.sin(t * 38); ph += f / sr; d[i] = Math.tanh(((ph % 1) - 0.5) * 4 + N() * 0.6) * env(t, 0.03, 0.7); } const a = Float32Array.from(d); svf(d, 900, 0.15, 'bp'); svf(a, 2600, 0.2, 'bp'); for (let i = 0; i < d.length; i++) d[i] += a[i] * 0.7; norm(d, 1); });
  B.breaker = mk(1.4, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = N() * env(t, 0.001, 0.04) + ((t * 120) % 1 - 0.5) * 0.4 * (t > 0.05 && t < 0.6 ? Math.random() : 0); } svf(d, 3000, 0.6, 'lp'); norm(d, 0.9); });
  B.locked = mk(0.5, d => { for (let k = 0; k < 4; k++) { const s = ((k * 0.09 + Math.random() * 0.02) * sr) | 0; for (let i = 0; i < 0.04 * sr; i++) { const t = i / sr; d[s + i] += N() * env(t, 0.0005, 0.008) + Math.sin(t * 6.283 * 900) * env(t, 0.001, 0.015); } } svf(d, 600, 0.6, 'hp'); norm(d, 0.7); });
  B.pickup = mk(0.12, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = N() * env(t, 0.004, 0.02) + Math.sin(t * 6.283 * 700) * env(t, 0.001, 0.01) * 0.4; } svf(d, 3000, 0.7, 'lp'); norm(d, 0.5); });
  B.beep = mk(0.07, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = Math.sin(t * 6.283 * 1250) * Math.min(1, (0.07 - t) * 200, t * 400); } norm(d, 0.35); });
  B.tbeep = mk(0.05, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = Math.sin(t * 6.283 * 2400) * Math.min(1, (0.05 - t) * 300, t * 400); } norm(d, 0.2); });
  B.click = mk(0.03, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = N() * env(t, 0.0003, 0.003); } svf(d, 1500, 0.6, 'hp'); norm(d, 0.5); });
  B.radio = mk(0.25, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = N() * env(t, 0.005, 0.08) + Math.sin(t * 6.283 * 1800) * env(t, 0.001, 0.03) * 0.3; } svf(d, 2200, 0.4, 'bp'); norm(d, 0.5); });
  // a ghost's breath: slow, low and rasping, an inhale then a long exhale
  B.gbreath = mk(2.6, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; const e = t < 0.9 ? Math.sin(Math.PI * t / 0.9) ** 2 * 0.7 : t > 1.1 ? Math.sin(Math.PI * Math.min(1, (t - 1.1) / 1.5)) ** 1.5 : 0; d[i] = (N() * 0.8 + Math.sin(t * 6.283 * 62) * 0.25 * N()) * e; } svf(d, 520, 0.7, 'bp'); norm(d, 0.7); });
  // the Banshee's wail: a long falling keen with a tremor in it
  B.wail = mk(3.2, d => { let ph = 0; for (let i = 0; i < d.length; i++) { const t = i / sr; const f = (880 - 260 * Math.min(1, t / 2.6)) * (1 + 0.025 * Math.sin(t * 34)); ph += f / sr; d[i] = (Math.sin(ph * 6.283) * 0.7 + Math.sin(ph * 12.566) * 0.2 + N() * 0.12) * env(t, 0.35, 1.6); } svf(d, 1500, 0.3, 'bp'); norm(d, 0.9); });
  // a hoof striking arena sand: a soft low thump with a little grit
  B.hoof = mk(0.2, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = (Math.sin(t * 6.283 * (95 - t * 120)) * 0.9 + N() * 0.35) * env(t, 0.002, 0.045); } svf(d, 900, 0.7, 'lp'); norm(d, 0.9); });
  // a horse's whinny: a rising squeal that breaks into a falling, shuddering neigh
  B.whinny = mk(1.6, d => { let ph = 0; for (let i = 0; i < d.length; i++) { const t = i / sr; const f = (t < 0.25 ? 700 + t * 1800 : 1150 - (t - 0.25) * 520) * (1 + (0.04 + t * 0.05) * Math.sin(t * 6.283 * (16 + t * 6))); ph += f / sr; d[i] = (Math.sin(ph * 6.283) * 0.6 + Math.sin(ph * 12.566) * 0.3 + Math.sin(ph * 18.85) * 0.15 + N() * 0.08) * env(t, 0.06, 0.55) * (t < 1.45 ? 1 : (1.6 - t) / 0.15); } svf(d, 1300, 0.35, 'bp'); norm(d, 0.85); });
  // the giant alligator: a bellow so low you feel it, rattling with a growl, and a hiss of breath on top
  B.gatorRoar = mk(3.4, d => { let ph = 0; for (let i = 0; i < d.length; i++) { const t = i / sr, f = 46 - t * 6 + 3 * Math.sin(t * 9); ph += f / sr; const growl = 0.55 + 0.45 * Math.sin(t * 6.283 * 23) * Math.sin(t * 6.283 * 3.1); d[i] = (Math.tanh(Math.sin(ph * 6.283) * 2.5) * growl + Math.sin(ph * 12.566) * 0.3 + N() * 0.25 * (0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, t / 3.4)))) * env(t, 0.25, 1.4); } svf(d, 700, 0.8, 'lp'); norm(d, 1); });
  // its jaws slamming shut: a deep wet clack
  B.chomp = mk(0.45, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = (Math.sin(t * 6.283 * (120 - t * 160)) * 0.9 + N() * 0.6 * Math.exp(-t * 40)) * env(t, 0.002, 0.18); } svf(d, 1400, 0.7, 'lp'); norm(d, 0.95); });
  // something heavy going into still water
  B.splash = mk(1.3, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; const b = Math.sin(t * 6.283 * (300 + 900 * Math.random()) ) * 0.15 * (Math.random() < 0.004 ? 1 : 0); d[i] = (N() * Math.exp(-t * 5) + b) * env(t, 0.005, 0.6); } svf(d, 1600, 0.6, 'lp'); norm(d, 0.8); });
  // an old cast-iron dinner bell: inharmonic partials ringing down
  B.bell = mk(3.0, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; let v = 0; for (const [f, a, dk] of [[520, 1, 1.4], [1250, 0.55, 2.2], [2010, 0.35, 3], [2900, 0.2, 4.5], [261, 0.3, 1]]) v += Math.sin(t * 6.283 * f) * a * Math.exp(-t * dk); d[i] = v * Math.min(1, t / 0.003); } norm(d, 0.85); });
  B.breath = mk(1.2, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = N() * Math.sin(Math.PI * Math.min(1, t / 1.2)) ** 2; } svf(d, 1100, 0.9, 'bp'); norm(d, 0.25); });
  B.thud = mk(0.3, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = Math.sin(t * 6.283 * 70) * env(t, 0.002, 0.06) + N() * env(t, 0.001, 0.02) * 0.6; } svf(d, 700, 0.7, 'lp'); norm(d, 1); });
  B.lighter = mk(0.9, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = (t < 0.03 ? N() * env(t, 0.001, 0.008) * 1.5 : 0) + N() * (t > 0.06 ? Math.min(1, (t - 0.06) * 12) * Math.exp(-(t - 0.06) * 2.5) * 0.35 : 0); } svf(d, 1800, 0.5, 'bp'); norm(d, 0.5); });
  B.recoil = mk(2.4, d => { let ph = 0, ph2 = 0; for (let i = 0; i < d.length; i++) { const t = i / sr; const f = 900 - 620 * Math.min(1, t / 1.6) + 60 * Math.sin(t * 47); ph += f / sr; ph2 += f * 1.49 / sr; d[i] = (Math.tanh(((ph % 1) - 0.5) * 5 + N() * 0.5) * 0.7 + Math.sin(ph2 * 6.283) * 0.3 + N() * 0.35 * env(t, 0.3, 0.6)) * env(t, 0.02, 0.8); } svf(d, 3200, 0.4, 'lp'); norm(d, 0.95); });
  B.bulbPop = mk(0.8, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = N() * env(t, 0.0005, 0.012) * 1.4 + Math.sin(t * 6.283 * 2900) * env(t, 0.001, 0.03) * 0.3 + (t > 0.03 ? N() * env(t - 0.03, 0.01, 0.12) * 0.25 * (Math.random() < 0.3 ? 1 : 0.2) : 0); } svf(d, 3500, 0.5, 'hp'); norm(d, 0.9); });
  B.meow = mk(0.75, d => { let ph = 0; for (let i = 0; i < d.length; i++) { const t = i / sr, f = 520 + 260 * Math.sin(Math.PI * Math.min(1, t / 0.6)) - 120 * t; ph += f / sr; const env2 = Math.sin(Math.PI * Math.min(1, t / 0.7)) ** 0.6; d[i] = (Math.sin(ph * 6.283) + 0.5 * Math.sin(ph * 12.566) + 0.25 * Math.sin(ph * 18.85)) * env2 * (0.7 + 0.3 * Math.sin(t * 40)); } svf(d, t => 900 + 1400 * Math.sin(Math.PI * Math.min(1, t / 0.7)), 0.6, 'bp'); norm(d, 0.55); });
  B.meowLoud = mk(1.4, d => { let ph = 0; for (let i = 0; i < d.length; i++) { const t = i / sr, u = Math.min(1, t / 1.25), f = 430 + 380 * Math.sin(Math.PI * Math.pow(u, 0.8)) - 90 * u + 12 * Math.sin(t * 34); ph += f / sr; const e2 = Math.min(1, t / 0.08) * Math.pow(Math.sin(Math.PI * Math.min(1, t / 1.3)), 0.4); d[i] = Math.tanh((Math.sin(ph * 6.283) + 0.6 * Math.sin(ph * 12.566) + 0.35 * Math.sin(ph * 18.85) + 0.2 * Math.sin(ph * 25.13)) * 1.6) * e2; } svf(d, t => 1100 + 1300 * Math.sin(Math.PI * Math.min(1, t / 1.3)), 0.7, 'bp'); norm(d, 0.95); });
  B.purr = mk(2.4, d => { for (let i = 0; i < d.length; i++) { const t = i / sr, cyc = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.9); d[i] = N() * (0.4 + 0.6 * Math.max(0, Math.sin(t * Math.PI * 2 * 26))) * (0.35 + 0.65 * cyc) * Math.sin(Math.PI * Math.min(1, t / 2.4)); } svf(d, 320, 0.5, 'lp'); norm(d, 0.6); });
  B.hiss = mk(1.1, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = N() * env(t, 0.03, 0.45); } svf(d, 4200, 0.4, 'bp'); norm(d, 0.7); });
  B.gulp = mk(1.1, d => { for (const t0 of [0.05, 0.42, 0.78]) { const s0 = (t0 * sr) | 0; for (let i = 0; i < 0.2 * sr && s0 + i < d.length; i++) { const t = i / sr; d[s0 + i] += Math.sin(t * 6.283 * (180 - t * 300)) * env(t, 0.01, 0.06) + N() * env(t, 0.005, 0.02) * 0.3; } } svf(d, 900, 0.6, 'lp'); norm(d, 0.7); });
  B.scribble = mk(1.6, d => { for (let i = 0; i < d.length; i++) { const t = i / sr, strokes = Math.max(0, Math.sin(t * 23 + Math.sin(t * 7) * 3)); d[i] = N() * strokes * Math.sin(Math.PI * t / 1.6); } svf(d, 3200, 0.5, 'bp'); norm(d, 0.5); });
  // loops
  B.wind = mk(8, (d, _, c) => { let b = 0; for (let i = 0; i < d.length; i++) { b = (b + 0.02 * N()) / 1.02; d[i] = b; } svf(d, t => 260 + 220 * Math.sin(t * 0.785 + c), 0.5, 'lp'); for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] *= 0.55 + 0.45 * Math.sin(t * Math.PI * 2 / 8 * 2 + c) ; } norm(d, 0.8); fadeLoop(d, sr); }, 2);
  B.crickets = mk(4, (d, _, c) => { for (let k = 0; k < 18; k++) { const t0 = Math.random() * 3.7, f = 4200 + Math.random() * 900; for (let j = 0; j < 3; j++) { const s = ((t0 + j * 0.06) * sr) | 0; for (let i = 0; i < 0.035 * sr && s + i < d.length; i++) { const t = i / sr; d[s + i] += Math.sin(t * 6.283 * f) * Math.sin(Math.PI * t / 0.035) * (0.3 + Math.random() * 0.1); } } } norm(d, 0.3); }, 2);
  B.drone = mk(6, (d, _, c) => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = Math.sin(t * 6.283 * 55) * 0.4 + Math.sin(t * 6.283 * (55.5 + c * 0.3)) * 0.4 + Math.sin(t * 6.283 * 110) * 0.08 + N() * 0.05; } svf(d, 300, 0.5, 'lp'); norm(d, 0.5); }, 2);
  B.static = mk(3, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; const sweep = (t * 7) % 1; d[i] = N() * (0.6 + 0.4 * Math.sin(t * 40)) + (sweep < 0.08 ? Math.sin(t * 6.283 * (900 + sweep * 9000)) * 0.6 : 0) + ((t * 3.3) % 1 < 0.02 ? N() * 2 : 0); } svf(d, t => 1400 + 900 * Math.sin(t * 11), 0.3, 'bp'); norm(d, 0.5); });
  B.huntLoop = mk(4, (d, _, c) => { for (let i = 0; i < d.length; i++) { const t = i / sr; const pulse = 0.6 + 0.4 * Math.sin(t * Math.PI * 2 * 0.5); d[i] = Math.tanh((Math.sin(t * 6.283 * 41) + Math.sin(t * 6.283 * (43.5 + c)) + N() * 0.3) * 1.5) * pulse; } svf(d, 500, 0.5, 'lp'); norm(d, 0.7); }, 2);
  B.heart = mk(1.0, d => { for (const [t0, a] of [[0, 1], [0.24, 0.7]]) { const s = (t0 * sr) | 0; for (let i = 0; i < 0.18 * sr; i++) { const t = i / sr; d[s + i] += Math.sin(t * 6.283 * (55 - t * 80)) * env(t, 0.005, 0.05) * a; } } norm(d, 0.9); });
  B.buzz = mk(1, d => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = ((t * 120) % 1 - 0.5) * 0.5 + ((t * 240) % 1 - 0.5) * 0.3; } svf(d, 1500, 0.4, 'lp'); norm(d, 0.3); });
  B.hum = mk(8, d => { // the ghost's tuneless lullaby during hunts
    const notes = [0, 3, 7, 5, 3, 2, 0, -2]; let ph = 0;
    for (let i = 0; i < d.length; i++) { const t = i / sr, n = notes[Math.floor(t) % 8]; const f = 220 * Math.pow(2, n / 12) * (1 + 0.012 * Math.sin(t * 31)); ph += f / sr; const fr = t % 1; d[i] = (Math.sin(ph * 6.283) + 0.3 * Math.sin(ph * 12.566)) * Math.min(1, fr * 8, (1 - fr) * 4); }
    svf(d, 1200, 0.4, 'lp'); norm(d, 0.5);
  });
  for (const [k, g] of [['wind', 0.0], ['crickets', 0.0], ['drone', 0.0], ['static', 0], ['huntLoop', 0], ['heart', 0], ['buzz', 0]]) {
    const src = ctx.createBufferSource(); src.buffer = B[k]; src.loop = true; const gn = ctx.createGain(); gn.gain.value = g; src.connect(gn); gn.connect(AU.master); if (k === 'static') gn.connect(AU.revIn); src.start(); AU.loops[k] = { src, g: gn };
  }
  AU.ready = true;
  loadSfxFiles();
}
function fadeLoop(d, sr) { const n = (0.3 * sr) | 0; for (let i = 0; i < n; i++) { const a = i / n; d[i] = d[i] * a + d[d.length - n + i] * (1 - a); } }
function makeIR(sec, decay) { const ctx = AU.ctx, sr = ctx.sampleRate, b = ctx.createBuffer(2, sec * sr, sr); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, decay) * (i < sr * 0.01 ? i / (sr * 0.01) : 1); } return b; }
function loopGain(k, v, tc = 0.3) { const L = AU.loops[k]; if (!L) return; L.g.gain.setTargetAtTime(v, AU.ctx.currentTime, tc); }
function sfx(name, vol = 1, rate = 1) {
  const pool = name; name = AU.ready && sfxKey(name); if (!name || !AU.bufs[name]) return;
  const ctx = AU.ctx, s = ctx.createBufferSource(); s.buffer = AU.bufs[name]; s.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(AU.master);
  const wet = SFX_WET[pool]; if (wet === undefined) g.connect(AU.revIn); else { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(AU.revIn); }
  s.start();
}
// recorded scares (the Jump Scare & Horror Hits pack), decoded once audio starts. A pool name plays one of its sounds at random,
// never the same one twice running; until they have loaded (or if they can't) the pool falls back to a synthesized sound.
const SFX_FILES = ['js-horror', 'js-freak', 'js-feral', 'js-scream', 'js-destroy', 'hit-attack', 'hit-dungeon', 'hit-frighten', 'hit-slice', 'hit-trapped', 'cat-meow', 'wraith-breath-1', 'wraith-breath-2', 'wraith-breath-3', 'cold-breath-1', 'cold-breath-2'];
const SFX_POOL = {
  seen: { files: ['js-horror', 'js-freak', 'js-feral'], fb: 'scare' },               // you look straight at it while it manifests
  manifest: { files: ['hit-dungeon', 'hit-frighten', 'hit-trapped'], fb: 'manifest' },   // a ghost event begins, where the ghost stands
  huntHit: { files: ['hit-attack', 'hit-slice'], fb: null },                      // laid over the hunt alarm
  lunge: { files: ['js-scream', 'js-feral', 'js-horror'], fb: 'scare' },          // it rushes you and vanishes in your face
  caught: { files: ['js-destroy', 'js-feral'], fb: 'scare' },                     // Rookie: grabbed and let go
  death: { files: ['js-scream', 'js-destroy'], fb: 'scare' },
  doll: { files: ['js-freak', 'js-destroy'], fb: 'scare' },                       // the pin goes into the voodoo doll
  wrong: { files: ['hit-trapped'], fb: 'scare' },                                 // the wrong ghost named on the clipboard
  meow: { files: ['cat-meow'], fb: 'meow', vary: 0.14 },                          // the cats (a little higher or lower each time)
  meowLoud: { files: ['cat-meow'], fb: 'meowLoud', vary: 0.1 },                   // Izzabelle's call through the house
  gbreath: { files: ['wraith-breath-1', 'wraith-breath-2', 'wraith-breath-3'], fb: 'gbreath', vary: 0.04 },   // the Wraith, low and close
  breath: { files: ['cold-breath-1', 'cold-breath-2'], fb: 'breath', vary: 0.05 },   // your own breath fogging in the cold
};
function loadSfxFiles() {
  loadStepFiles();
  for (const n of SFX_FILES) fetch('sfx-' + n + '.mp3').then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(a => AU.ctx.decodeAudioData(a)).then(b => { AU.bufs['f:' + n] = b; }).catch(e => console.warn('sfx', n, e));
}
// Footsteps: one recording of concrete steps, cut into single steps when it loads; every surface gets its own version
// of each step (filtered, re-pitched, grass mixed with a rustle), so floors still sound different underfoot.
const STEP_SURF = {
  step_concrete: { hp: 70, rate: 1, peak: 0.8 },
  step_tile: { hp: 260, hi: [3800, 6], rate: 1.1, peak: 0.85 },                  // a harder, brighter click
  step_wood: { lo: [230, 7], lp: 3000, rate: 0.88, peak: 0.9 },                  // a hollow knock on boards
  step_carpet: { lp: 650, rate: 0.84, peak: 0.6 },                               // muffled
  step_grass: { lp: 1300, rate: 0.9, peak: 0.5, mix: 'step_grass', mixGain: 0.3, dry: 1 },  // soft thud under a rustle of blades
};
function loadStepFiles() {
  fetch('sfx-steps.mp3').then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(a => AU.ctx.decodeAudioData(a)).then(async src => {
    // find each footfall: the loudness envelope rising out of a stretch of quiet
    const d = src.getChannelData(0), sr = src.sampleRate, win = Math.round(sr * 0.005), env = [];
    for (let i = 0; i + win <= d.length; i += win) { let e = 0; for (let k = i; k < i + win; k++) e = Math.max(e, Math.abs(d[k])); env.push(e); }
    const top = Math.max(...env), on = []; let quiet = 99;
    env.forEach((e, i) => { if (e > top * 0.14) { if (quiet >= 40) on.push(i * win); quiet = 0; } else quiet++; });
    const len = Math.round(sr * 0.3), mono = on.filter(o => o + len <= d.length).map(o => {
      const b = new AudioBuffer({ length: len, sampleRate: sr }), c = b.getChannelData(0), o0 = Math.max(0, o - Math.round(sr * 0.008));
      for (let i = 0; i < len; i++) c[i] = d[o0 + i] * Math.min(1, (len - i) / (sr * 0.08));
      return b;
    });
    for (const name in STEP_SURF) {
      const S = STEP_SURF[name], files = [];
      for (let k = 0; k < mono.length; k++) {
        const out = Math.ceil(len / S.rate), oc = new OfflineAudioContext(1, out, sr), bs = oc.createBufferSource(); bs.buffer = mono[k]; bs.playbackRate.value = S.rate;
        let n = bs; const f = (type, freq, gain) => { const q = oc.createBiquadFilter(); q.type = type; q.frequency.value = freq; if (gain !== undefined) q.gain.value = gain; n.connect(q); n = q; };
        if (S.hp) f('highpass', S.hp); if (S.lp) f('lowpass', S.lp); if (S.lo) f('peaking', S.lo[0], S.lo[1]); if (S.hi) f('peaking', S.hi[0], S.hi[1]);
        const g = oc.createGain(); g.gain.value = S.dry ?? 1; n.connect(g); g.connect(oc.destination);
        if (S.mix && AU.bufs[S.mix]) { const m = oc.createBufferSource(), ml = oc.createBiquadFilter(), mg = oc.createGain(); m.buffer = AU.bufs[S.mix]; ml.type = 'lowpass'; ml.frequency.value = 4500; mg.gain.value = S.mixGain; m.connect(ml); ml.connect(mg); mg.connect(oc.destination); m.start(); }
        bs.start(); const r = await oc.startRendering(), c = r.getChannelData(0);
        let pk = 0; for (const v of c) pk = Math.max(pk, Math.abs(v)); if (pk > 0) for (let i = 0; i < c.length; i++) c[i] *= S.peak / pk;
        AU.bufs['f:' + name + k] = r; files.push(name + k);
      }
      SFX_POOL[name] = { files, fb: name, vary: 0.05 };
    }
  }).catch(e => console.warn('footsteps', e));
}
const _sfxLast = {}, _sfxVary = {};
function sfxKey(name) {   // a pool name -> the buffer to play this time
  const P = SFX_POOL[name]; if (!P) return name;
  const ready = P.files.filter(n => AU.bufs['f:' + n]); if (!ready.length) return P.fb;
  const choice = ready.length > 1 ? pick(ready.filter(n => n !== _sfxLast[name])) : ready[0];
  _sfxLast[name] = choice; _sfxVary['f:' + choice] = P.vary || 0; return 'f:' + choice;
}
const SFX_ROLLOFF = { meowLoud: 0.45, manifest: 0.9, wail: 0.4, knock: 0.85, whisper: 0.9, creak: 0.85, gstep: 0.8, vanish: 0.9, switch: 1.0, bulbPop: 0.8, scribble: 1.0, slam: 0.6, clatter: 1.0, breaker: 0.6 };   // sounds meant to carry through the house
const SFX_WET = { meow: 0.12, meowLoud: 0.15, gbreath: 0.3, breath: 0.2 };   // how much of a sound goes to the room reverb (1 = all of it)
const SFX_ROLLOFF_CLOSE = { gbreath: 2.6 };   // heard only up close
// the ghost's own sounds: louder, full volume out to a few metres before they start to fade, and only partly
// muffled by walls, so you hear it coming instead of having to strain for it
const GHOST_SFX = { manifest: [3, 1.8], gstep: [2.6, 1.9], wail: [4, 1.6], knock: [2.6, 1.8], whisper: [2.6, 1.8], creak: [2.6, 1.6], vanish: [3, 1.8], hum: [3, 1.8], lunge: [3, 1.5], slam: [3, 1.4], scribble: [2, 1.6], bulbPop: [3, 1.4], switch: [2, 1.4], breaker: [3, 1.4], gbreath: [1.2, 1.3], doll: [3, 1.4], clatter: [2, 1.5] };
function sfxAt(name, pos, vol = 1, rate) {
  const pool = name; name = AU.ready && sfxKey(name); if (!name || !AU.bufs[name]) return;
  const ctx = AU.ctx, s = ctx.createBufferSource(); s.buffer = AU.bufs[name]; s.playbackRate.value = rate || (name.startsWith('f:') ? 1 + ((_sfxVary[name] || 0) * (Math.random() * 2 - 1)) : 0.92 + Math.random() * 0.16);
  const GS = GHOST_SFX[pool], p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = GS ? GS[0] : 1.2; p.rolloffFactor = SFX_ROLLOFF_CLOSE[pool] ?? SFX_ROLLOFF[pool] ?? SFX_ROLLOFF[name] ?? 1.4; p.maxDistance = 60;
  p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z;
  // walls muffle sounds that come from another room
  const P = typeof me === 'function' && me();
  const occl = P && !sightClear(P.pos.x, P.pos.z, pos.x, pos.z, P.pos.y, pos.y - 1.2);
  const g = ctx.createGain(); g.gain.value = vol * (GS ? GS[1] : 1) * (occl ? (GS ? 0.75 : 0.55) : 1);
  let node = s;
  if (occl) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = GS ? 1800 : 900; s.connect(f); node = f; }
  node.connect(g); g.connect(p); p.connect(AU.master);
  const wet = SFX_WET[pool]; if (wet === undefined) g.connect(AU.revIn); else { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(AU.revIn); }
  s.start();
}
function updateListener(cam) {
  if (!AU.ready) return; const L = AU.ctx.listener, t = AU.ctx.currentTime;
  const f = new V3(0, 0, -1).applyQuaternion(cam.quaternion), u = new V3(0, 1, 0).applyQuaternion(cam.quaternion);
  if (L.positionX) { L.positionX.setValueAtTime(cam.position.x, t); L.positionY.setValueAtTime(cam.position.y, t); L.positionZ.setValueAtTime(cam.position.z, t); L.forwardX.setValueAtTime(f.x, t); L.forwardY.setValueAtTime(f.y, t); L.forwardZ.setValueAtTime(f.z, t); L.upX.setValueAtTime(u.x, t); L.upY.setValueAtTime(u.y, t); L.upZ.setValueAtTime(u.z, t); }
  else { L.setPosition(cam.position.x, cam.position.y, cam.position.z); L.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z); }
}
let VOICE = null;
function ghostVoice(text, noRadio, whisper) {
  if (!noRadio) sfx('radio', 0.8);
  try {
    if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
      const u = new SpeechSynthesisUtterance(text);
      if (!VOICE) { const vs = speechSynthesis.getVoices(); VOICE = vs.find(v => /en/i.test(v.lang) && /male|daniel|fred|alex|google uk english male/i.test(v.name)) || vs.find(v => /en/i.test(v.lang)) || null; }
      if (VOICE) u.voice = VOICE; u.pitch = whisper ? 0.3 : 0.05; u.rate = whisper ? 0.6 : 0.55; u.volume = whisper ? 0.55 : 1;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
      return;
    }
  } catch (e) { }
  sfx('whisper', 1, 0.7);
}

// ---------------------------------------------------------------- title music
// A plain looping audio element (not routed through the sound graph, so it plays the same in the browser and the desktop app).
// It fades in on the title screen and in the lobby and out once a round starts; its loudness is the Music slider times the
// main Volume. Browsers only allow it to start after the first click or key press.
const MUSIC = { el: null, vol: 0.35, fade: 0, started: false };
try { const v = parseFloat(localStorage.getItem('hl-music')); if (!isNaN(v)) MUSIC.vol = clamp(v, 0, 1); } catch (e) { }
function musicWanted() { return !$('menu').hidden || !$('lobby').hidden; }
function musicStart() {
  if (!MUSIC.el) { MUSIC.el = new Audio('music-title.mp3'); MUSIC.el.loop = true; MUSIC.el.volume = 0; }
  if (MUSIC.el.paused && musicWanted()) MUSIC.el.play().then(() => { MUSIC.started = true; }).catch(() => { });
}
function setMusicVol(v) { MUSIC.vol = clamp(v, 0, 1); try { localStorage.setItem('hl-music', MUSIC.vol); } catch (e) { } }
setInterval(() => {
  const want = musicWanted();
  if (want && (!MUSIC.el || MUSIC.el.paused)) musicStart();
  if (!MUSIC.el) return;
  MUSIC.fade = clamp(MUSIC.fade + (want ? 0.1 / 1.5 : -0.1 / 1.2), 0, 1);   // ~1.5 s in, ~1.2 s out
  MUSIC.el.volume = clamp(MUSIC.vol * AU.vol * MUSIC.fade * MUSIC.fade, 0, 1);
  if (!want && MUSIC.fade === 0 && !MUSIC.el.paused) MUSIC.el.pause();
}, 100);
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => musicStart(), { capture: true });
