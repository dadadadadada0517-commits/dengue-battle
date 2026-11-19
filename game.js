// ===== 登革熱防治大作戰：可以玩的遊戲版 =====
// 標題 → 巷弄探索（找出孳生源會削弱魔王的體力與速度）→ ATB 戰鬥（魔王也有進度條）→ 勝利 → 防治口訣
(() => {
const W = 640, H = 360, C = document.getElementById('c'), X = C.getContext('2d'), KS = C.width / W;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const rnd = (a, b) => a + Math.random() * (b - a), FONT = '"Microsoft JhengHei","微軟正黑體","Noto Sans TC",sans-serif';
function fit() { const s = Math.min(innerWidth / 16, innerHeight / 9); C.style.width = s * 16 + 'px'; C.style.height = s * 9 + 'px'; } addEventListener('resize', fit); fit();

// ---------- 素材 ----------
const loadImg = src => new Promise(r => { if (!src) return r(null); const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
function keyed(img) { const w = img.naturalWidth, h = img.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const id = x.getImageData(0, 0, w, h), d = id.data; let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let p = 0; p < w * h; p++) { const r = d[p * 4], g = d[p * 4 + 1], b = d[p * 4 + 2]; if (g < 90 && r > 160 && b > 160 && Math.abs(r - b) < 80) d[p * 4 + 3] = 0; else { const xx = p % w, yy = (p / w) | 0; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; } }
  x.putImageData(id, 0, 0); c.bb = [x0, y0, x1, y1]; return c; }
function trimK(img) { const k = keyed(img), [x0, y0, x1, y1] = k.bb, c = document.createElement('canvas'); c.width = x1 - x0 + 1; c.height = y1 - y0 + 1; c.getContext('2d').drawImage(k, -x0, -y0); return c; }
function sliceSheet(img) {
  const w = img.naturalWidth, h = img.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const id = x.getImageData(0, 0, w, h), d = id.data, m = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) { const r = d[p * 4], g = d[p * 4 + 1], b = d[p * 4 + 2]; if (g < 85 && r > 165 && b > 165 && Math.abs(r - b) < 70) d[p * 4 + 3] = 0; else m[p] = 1; }
  x.putImageData(id, 0, 0);
  const rowc = new Int32Array(h); for (let y = 0; y < h; y++) { let s = 0; for (let xx = 0; xx < w; xx++) s += m[y * w + xx]; rowc[y] = s; }
  const bands = []; let y0 = -1, gap = 0; const GAPY = Math.max(3, Math.round(h * 0.005)), RT = Math.max(3, w * 0.004);
  for (let y = 0; y < h; y++) { if (rowc[y] > RT) { if (y0 < 0) y0 = y; gap = 0; } else if (y0 >= 0) { gap++; if (gap > GAPY) { bands.push([y0, y - gap]); y0 = -1; gap = 0; } } } if (y0 >= 0) bands.push([y0, h - 1]);
  return bands.filter(([a, b]) => b - a > h * 0.06).map(([a, b]) => {
    const colc = new Int32Array(w); for (let xx = 0; xx < w; xx++) { let s = 0; for (let y = a; y <= b; y++) s += m[y * w + xx]; colc[xx] = s; }
    const segs = []; let x0 = -1, g = 0; const GAPX = Math.max(3, Math.round(w * 0.004)), CT = Math.max(1, (b - a) * 0.01);
    for (let xx = 0; xx < w; xx++) { if (colc[xx] > CT) { if (x0 < 0) x0 = xx; g = 0; } else if (x0 >= 0) { g++; if (g > GAPX) { segs.push([x0, xx - g]); x0 = -1; g = 0; } } } if (x0 >= 0) segs.push([x0, w - 1]);
    const minW = w * 0.015, mg = []; segs.forEach(s => { if (mg.length && (s[1] - s[0] < minW || mg[mg.length - 1][1] - mg[mg.length - 1][0] < minW)) mg[mg.length - 1][1] = s[1]; else mg.push(s.slice()); });
    const fr = mg.map(([sx, ex]) => { let top = b, bot = a; for (let y = a; y <= b; y++) for (let xx = sx; xx <= ex; xx++) if (m[y * w + xx]) { if (y < top) top = y; if (y > bot) bot = y; }
      let sum = 0, n = 0; for (let y = Math.round(top + (bot - top) * 0.25); y <= bot; y++) for (let xx = sx; xx <= ex; xx++) if (m[y * w + xx]) { sum += xx; n++; } return { sx, ex, top, bot, mx: n ? sum / n : (sx + ex) / 2 }; });
    const base = Math.max(...fr.map(f => f.bot)); fr.forEach(f => f.base = base); return { frames: fr, src: c }; }).filter(r => r.frames.length);
}
function cut(src, sx, sy, sw, sh, lh, cx) { const s = lh / sh, c = document.createElement('canvas'); c.width = Math.max(1, Math.round(sw * s * 3)); c.height = Math.round(lh * 3);
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height); c.lw = sw * s; c.lh = lh; c.cx = (cx ?? sw / 2) * s; return c; }
const CFG = { run: [70, [['stand', 'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'], ['j0', 'j1', 'j2', 'j3', 'j4', 'c0', 'c1', 'look0', 'look1']]],
  bunny: [66, [['stand', 'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'], ['j0', 'j1', 'j2', 'j3', 'j4', 'c0', 'c1', 'c2', 'c3'], ['act0', 'act1', 'act2', 'act3', 'act4', 'act5']]],
  teacher: [72, [['stand', 'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'], ['ride0', 'ride1', 'ride2', 'ride3', 'act0', 'act1', 'act2', 'act3', 'c0']]],
  mountain: [64, [['stand', 'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'], ['j0', 'j1', 'j2', 'j3', 'j4', 'c0', 'c1', 'c2', 'c3'], ['act0', 'act1', 'act2', 'act3']]],
  mosquito: [42, [['f0', 'f1', 'f2', 'f3']]] };
const A = { spr: {}, walk: {}, pfx: {}, hurt: {} };
function sliceCols(img, minW) { const k = keyed(img), w = k.width, h = k.height, d = k.getContext('2d').getImageData(0, 0, w, h).data, col = new Int32Array(w);
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (d[(y * w + x) * 4 + 3]) col[x]++;
  const segs = []; let x0 = -1, g = 0; for (let x = 0; x < w; x++) { if (col[x] > 1) { if (x0 < 0) x0 = x; g = 0; } else if (x0 >= 0 && ++g > 12) { segs.push([x0, x - g]); x0 = -1; g = 0; } } if (x0 >= 0) segs.push([x0, w - 1]);
  const fr = segs.filter(([a, b]) => b - a > minW).map(([sx, ex]) => { let top = h, bot = 0; for (let y = 0; y < h; y++) for (let x = sx; x <= ex; x++) if (d[(y * w + x) * 4 + 3]) { if (y < top) top = y; if (y > bot) bot = y; } return { sx, ex, top, bot }; });
  const base = Math.max(...fr.map(f => f.bot)); return fr.map(f => ({ k, ...f, base })); }
async function loadAll() {
  for (const [k, [hh, rows]] of Object.entries(CFG)) { if (A.spr[k] || !SHEETS[k]) continue; const img = await loadImg(SHEETS[k]); if (!img) continue; const rs = sliceSheet(img), got = {};
    const f0 = rs[0].frames[0], enemy = k === 'mosquito', s = hh / ((enemy ? f0.bot : f0.base) - f0.top + 1);
    rs.forEach((r, ri) => r.frames.forEach((f, ci) => { const name = (rows[ri] || [])[ci]; if (!name) return; const bot = enemy ? f.bot : f.base, fw = f.ex - f.sx + 1, fh = bot - f.top + 1;
      got[name] = cut(r.src, f.sx, f.top, fw, fh, fh * s, enemy ? fw / 2 : f.mx - f.sx); }));
    for (const p of ['r', 'act', 'c', 'j']) for (let i = 0; i < 9; i++) if (!got[p + i]) got[p + i] = got[p + (i % 4)] || got[p + 0] || got.stand || got.f0;
    A.spr[k] = got; }
  const bu = !A.boss && await loadImg(SHEETS.boss); if (bu) { const kb = keyed(bu), [x0, y0, x1, y1] = kb.bb; A.boss = cut(kb, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 280 * (y1 - y0 + 1) / (x1 - x0 + 1)); }
  const w = !A.walk.up1 && await loadImg(SHEETS.walk); if (w) { const rs = sliceSheet(w), names = ['down', 'up', 'left', 'right'];
    rs.slice(0, 4).forEach((r, ri) => r.frames.slice(0, 3).forEach((f, ci) => { A.walk[names[ri] + ci] = cut(r.src, f.sx, f.top, f.ex - f.sx + 1, f.base - f.top + 1, 44, f.mx - f.sx); })); }
  for (const k of ['map', 'title', 'card']) A[k] = A[k] || await loadImg(SHEETS[k]);
  for (const k of ['robot', 'robot_fire', 'gem', 'victory_logo']) { if (A[k]) continue; const i = await loadImg(SHEETS[k]); if (i) A[k] = trimK(i); }
  for (const [id, key, hh] of [['R', 'hurt', 80], ['B', 'hurt_bunny', 70], ['T', 'hurt_teacher', 74], ['M', 'hurt_mountain', 66]]) { if (A.hurt[id]) continue; const i = await loadImg(SHEETS[key]); if (!i) continue;
    const fr = sliceCols(i, 80), s = hh / (fr[0].base - fr[0].top + 1); A.hurt[id] = fr.map(f => cut(f.k, f.sx, f.top, f.ex - f.sx + 1, f.base - f.top + 1, (f.base - f.top + 1) * s)); }
  if (window.PFXMETA) for (const [k, m] of Object.entries(PFXMETA)) { if (A.pfx[k] || !SHEETS['pfx_' + k]) continue; const i = await loadImg(SHEETS['pfx_' + k]); if (i) A.pfx[k] = { i, m }; }
  if (SHEETS.floorB && !GL3D.S.ready) await GL3D.init(SHEETS, loadImg, keyed, sliceSheet);
}

// ---------- 音效（ElevenLabs＋合成）、音樂 ----------
const SND = {}, ABUF = {}; let AC = null;
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return AC; }
function abuf(name) { if (ABUF[name]) return ABUF[name]; const url = window.MEDIA && MEDIA[name]; if (!url || !ac()) return null; const p = ABUF[name] = { buf: null };
  fetch(url).then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => AC.decodeAudioData(b, ok, no))).then(d => { p.buf = d; }).catch(() => { delete ABUF[name]; }); return p; }
function preloadSfx() { if (window.MEDIA) for (const k of Object.keys(MEDIA)) if (k.startsWith('sfx_')) abuf(k); }
const BGEL = new Audio(); BGEL.loop = true; BGEL.preload = 'auto'; BGEL.setAttribute('playsinline', ''); let BGM = null, BG_UNLOCKED = false;
const SILENT = (() => { const n = 800, b = new ArrayBuffer(44 + n), v = new DataView(b), s = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, 'RIFF'); v.setUint32(4, 36 + n, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); s(36, 'data'); v.setUint32(40, n, true); for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' })); })();
function bgmApply() { if (!BGM) return; const url = (window.MEDIA && MEDIA[BGM.__src]) || (window.BATTLE_PACKS ? null : BGM.__src); if (!url) return;
  if (BGEL.__src !== BGM.__src) { BGEL.__src = BGM.__src; BGEL.src = url; const at = BGM.at; if (at) BGEL.addEventListener('loadedmetadata', () => { try { BGEL.currentTime = at; } catch (e) {} }, { once: true }); }
  BGEL.volume = BGM.vol; if (!document.hidden) BGEL.play().then(() => { BG_UNLOCKED = true; }).catch(() => {}); }
function unlockAudio() { const c = ac(); if (c) { if (c.state !== 'running') c.resume().catch(() => {}); try { const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0); } catch (e) {} }
  if (BGM && (window.MEDIA && MEDIA[BGM.__src] || !window.BATTLE_PACKS)) { if (BGEL.paused) bgmApply(); }
  else if (!BG_UNLOCKED) { BGEL.__src = null; BGEL.src = SILENT; BGEL.play().then(() => { BG_UNLOCKED = true; if (!(BGM && MEDIA[BGM.__src])) BGEL.pause(); bgmApply(); }).catch(() => {}); } }
['touchend', 'pointerup', 'pointerdown', 'keydown', 'click'].forEach(ev => window.addEventListener(ev, unlockAudio, { capture: true, passive: true }));
document.addEventListener('visibilitychange', () => { if (document.hidden) { BGEL.pause(); if (AC) AC.suspend().catch(() => {}); } else { if (AC) AC.resume().catch(() => {}); if (BGM) bgmApply(); } });
function snd(k, v = .8) { try { const n = 'sfx_' + k + '.mp3'; if (window.MEDIA && MEDIA[n]) { const p = abuf(n); if (p && p.buf && AC.state === 'running') { const s = AC.createBufferSource(), g = AC.createGain(); s.buffer = p.buf; g.gain.value = v; s.connect(g).connect(AC.destination); s.start(); } return; } if (window.BATTLE_PACKS) return; const base = SND[k] || (SND[k] = new Audio(window.SFX_EXT ? 'sfx_' + k + window.SFX_EXT : 'sfx/' + k + '.wav')); const a = base.cloneNode(); a.volume = v; a.play().catch(() => {}); } catch (e) {} }
function beep(f, d = .06, type = 'square', v = .08) { try { if (!ac()) return; const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v; g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + d); o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + d); } catch (e) {} }
const cursorS = () => beep(1100, .04), selectS = () => { beep(1320, .05); setTimeout(() => beep(1760, .08), 50); }, menuS = () => { beep(1400, .06, 'square', .1); setTimeout(() => beep(2100, .1, 'square', .1), 60); };
window.__aud = () => ({ ac: AC && AC.state, bgm: BGM && BGM.__src, playing: !BGEL.paused, el: BGEL.__src, t: +BGEL.currentTime.toFixed(1), sfx: Object.values(ABUF).filter(p => p.buf).length });
function music(src, vol = .45, at = 0) { BGM = { __src: src, vol, at }; BGEL.pause(); BGEL.__src = null; bgmApply(); }

// ---------- 繪圖小工具 ----------
function T(s, x, y, o = {}) { const sz = o.size || 12; X.save(); X.globalAlpha = o.alpha ?? 1; X.font = `bold ${sz * KS}px ${FONT}`; X.textAlign = o.align || 'left'; X.textBaseline = 'top';
  X.lineJoin = 'round'; X.lineWidth = (o.stroke ?? 3) * KS; X.strokeStyle = o.sc || 'rgba(0,0,20,.9)'; String(s).split('\n').forEach((l, i) => { const yy = (y + i * sz * 1.35) * KS; X.strokeText(l, x * KS, yy); X.fillStyle = o.color || '#fff'; X.fillText(l, x * KS, yy); }); X.restore(); }
function panel(x, y, w, h, a = .86, edge = 'rgba(170,190,255,.55)') { X.save(); X.globalAlpha = a; X.fillStyle = 'rgba(8,10,26,.92)'; X.beginPath(); X.roundRect(x * KS, y * KS, w * KS, h * KS, 6 * KS); X.fill(); X.globalAlpha = 1; X.strokeStyle = edge; X.lineWidth = KS; X.stroke(); X.restore(); }
function spr(cv, x, y, s = 1, { flip = false, alpha = 1, tint = null } = {}) { if (!cv) return; X.save(); X.globalAlpha = alpha; X.translate(x * KS, y * KS); if (flip) X.scale(-1, 1);
  let src = cv; if (tint) { TMP.width = cv.width; TMP.height = cv.height; TG.clearRect(0, 0, cv.width, cv.height); TG.globalCompositeOperation = 'source-over'; TG.drawImage(cv, 0, 0); TG.globalCompositeOperation = 'source-atop'; TG.fillStyle = tint; TG.fillRect(0, 0, cv.width, cv.height); src = TMP; }
  X.drawImage(src, -cv.cx * s * KS, -cv.lh * s * KS, cv.lw * s * KS, cv.lh * s * KS); X.restore(); }
const TMP = document.createElement('canvas'), TG = TMP.getContext('2d');
function pfx(n, e, x, y, s = 1, o = {}) { const P = A.pfx[n]; if (!P || e < 0) return; const m = P.m, dur = m.n / m.fps; if (e > (o.dur || dur)) return; const i = Math.floor(e * m.fps) % m.n;
  X.save(); X.globalAlpha = (o.alpha ?? 1) * Math.min(1, ((o.dur || dur) - e) / .2); if (o.add) X.globalCompositeOperation = 'lighter'; X.imageSmoothingEnabled = false; X.translate(x * KS, y * KS); if (o.flip) X.scale(-1, 1);
  X.drawImage(P.i, i * m.w, 0, m.w, m.h, -m.ox * s * KS, -m.oy * s * KS, m.w * s * KS, m.h * s * KS); X.restore(); }
function glow(x, y, r, col, a = 1) { X.save(); X.globalCompositeOperation = 'lighter'; const g = X.createRadialGradient(x * KS, y * KS, 0, x * KS, y * KS, r * KS); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(.3, col); g.addColorStop(1, 'rgba(0,0,0,0)'); X.globalAlpha = a; X.fillStyle = g; X.fillRect((x - r) * KS, (y - r) * KS, 2 * r * KS, 2 * r * KS); X.restore(); }
function hand(x, y, t) { const bx = x + Math.sin(t * 9) * 2; X.save(); X.fillStyle = '#fff'; X.strokeStyle = '#283048'; X.lineWidth = 1.5 * KS; X.beginPath(); X.roundRect(bx * KS, (y - 4) * KS, 16 * KS, 9 * KS, 3 * KS); X.fill(); X.stroke(); X.fillRect((bx + 14) * KS, (y - 1.5) * KS, 8 * KS, 3.5 * KS); X.strokeRect((bx + 14) * KS, (y - 1.5) * KS, 8 * KS, 3.5 * KS); X.restore(); }

// ---------- 輸入 ----------
const keys = {}, pressed = []; addEventListener('keydown', e => { if (!keys[e.key]) pressed.push(e.key); keys[e.key] = true; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault(); });
addEventListener('keyup', e => keys[e.key] = false);
let click = null; C.addEventListener('mousedown', e => { const r = C.getBoundingClientRect(); click = [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; });
const hit = (pk, ...k) => pk.some(x => k.includes(x));
// ---------- 手機操作：十字鍵＋A/B 按鈕（觸控裝置才顯示）----------
const TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (TOUCH) {
  const css = document.createElement('style'); css.textContent = `
  #pad{position:fixed;left:3vmin;bottom:4vmin;width:34vmin;height:34vmin;z-index:9;touch-action:none}
  #pad b,#ab b{position:absolute;display:flex;align-items:center;justify-content:center;color:#fff;font:bold 5vmin "Microsoft JhengHei",sans-serif;background:rgba(20,24,60,.55);border:.5vmin solid rgba(255,230,140,.7);border-radius:2.5vmin;user-select:none;-webkit-user-select:none}
  #pad b{width:11.5vmin;height:11.5vmin} #pad b.on,#ab b.on{background:rgba(255,210,90,.6)}
  #ab{position:fixed;right:3vmin;bottom:30vmin;width:30vmin;height:26vmin;z-index:9;touch-action:none}
  #ab b{width:13vmin;height:13vmin;border-radius:50%}
  #rot:not(.ov){position:fixed;inset:0;z-index:20;display:none;align-items:center;justify-content:center;background:#000;color:#ffe060;font:bold 6vw "Microsoft JhengHei",sans-serif;text-align:center}
  @media (orientation:portrait){#rot:not(.ov){display:flex}}`; document.head.appendChild(css);
  const mk = (par, txt, k, l, t) => { const b = document.createElement('b'); b.textContent = txt; b.style.left = l; b.style.top = t; par.appendChild(b);
    const on = e => { e.preventDefault(); if (!keys[k]) pressed.push(k); keys[k] = true; b.classList.add('on'); try { if (!document.fullscreenElement) document.documentElement.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape')).catch(() => {}); } catch (x) {} };
    const off = e => { e.preventDefault(); keys[k] = false; b.classList.remove('on'); };
    b.addEventListener('touchstart', on, { passive: false }); b.addEventListener('touchend', off, { passive: false }); b.addEventListener('touchcancel', off, { passive: false }); };
  const pad = document.createElement('div'); pad.id = 'pad'; document.body.appendChild(pad);
  mk(pad, '▲', 'ArrowUp', '11.25vmin', '0'); mk(pad, '▼', 'ArrowDown', '11.25vmin', '22.5vmin'); mk(pad, '◀', 'ArrowLeft', '0', '11.25vmin'); mk(pad, '▶', 'ArrowRight', '22.5vmin', '11.25vmin');
  const ab = document.createElement('div'); ab.id = 'ab'; document.body.appendChild(ab); mk(ab, 'A', ' ', '16vmin', '0'); mk(ab, 'B', 'Escape', '0', '12vmin');
  if (!document.getElementById('rot')) { const rot = document.createElement('div'); rot.id = 'rot'; rot.innerHTML = '請把手機轉成橫向<br>⟳'; document.body.appendChild(rot); }
  C.addEventListener('touchstart', e => { const r = C.getBoundingClientRect(), p = e.touches[0]; click = [(p.clientX - r.left) / r.width * W, (p.clientY - r.top) / r.height * H]; }, { passive: true });
}
const HINT = TOUCH ? { title: '十字鍵選擇　A 決定', map: '十字鍵移動（連點兩下跑步）　A 調查　往上走 → 魔王', act: 'A：調查', back: 'B：返回', next: 'A：繼續' }
  : { title: '↑↓ 選擇　Enter / 空白鍵 決定', map: '方向鍵移動（連按兩下跑步）　空白鍵調查　往上走 → 魔王', act: '空白鍵：調查', back: 'Esc：返回', next: 'Enter：繼續' };

// ---------- 遊戲資料 ----------
const SPOTS = [
  [537, 687, '水缸', '水缸沒有加蓋，水面上都是孑孓！', '加蓋密封，或放養食蚊魚。'],
  [394, 718, '排水溝', '排水溝被落葉堵住，積了一攤死水。', '清除落葉垃圾，讓水流通。'],
  [522, 781, '水桶', '水桶裡的積水滿是蚊子幼蟲。', '倒掉積水、刷洗內壁、倒放。'],
  [103, 640, '花盆底盤', '花盆底盤積水，斑蚊最愛在這產卵。', '倒掉積水並每週刷洗，或改放細沙。'],
  [159, 562, '水桶', '沒加蓋的水桶接了雨水。', '倒掉積水，不用時倒放或加蓋。'],
  [169, 500, '廢輪胎', '廢輪胎裡積滿雨水，是超級孳生源！', '回收廢輪胎，或打洞讓水流掉。'],
  [262, 437, '積水窪', '地面凹洞積水，幾天就會長出孑孓。', '填平凹洞，下雨後掃除積水。'],
  [500, 431, '破甕', '破掉的甕仔裡也積了水。', '不用的容器回收清除。']];
const HEROES = [
  { id: 'R', name: '山頂同學', sheet: 'run', hp: 1010, spd: 1.05, wp: [75, -45], col: '#ff7080',
    skills: [{ n: '巡．巡視積水', scan: 1, good: 1, d: '找出孳生源，魔王防禦下降', fx: 'scanner', snd: 'cast' }, { n: '刷．刷洗容器', anim: 'jump', good: 1, d: '刷掉容器內壁的蟲卵', fx: 'flurry', snd: 'flurry' }, { n: '踢．衝刺踢', anim: 'run', good: 0, d: '跑步健將的飛踢', fx: 'claw', snd: 'whoosh' }] },
  { id: 'B', name: '長耳族老師', sheet: 'bunny', hp: 920, spd: 1.15, wp: [160, 0], col: '#ffb0e0',
    skills: [{ n: '倒．倒掉積水', anim: 'act', good: 1, d: '把容器裡的積水倒光', fx: 'geyser', snd: 'splash' }, { n: '跳．長耳跳躍', anim: 'jump', good: 0, d: '兔耳朵的大跳躍', fx: 'spark', snd: 'whoosh' }] },
  { id: 'T', name: '豪鬼主任', sheet: 'teacher', hp: 1100, spd: .95, wp: [85, 55], col: '#ffe080',
    skills: [{ n: '清．清除容器', anim: 'act', good: 1, d: '不用的瓶罐、輪胎通通清走', fx: 'tornado', snd: 'wind' }, { n: '飛．掃帚飛行', anim: 'ride', good: 0, d: '騎掃帚衝撞', fx: 'spin', snd: 'whoosh' }] },
  { id: 'M', name: '中央山脈超人', sheet: 'mountain', hp: 1200, spd: .9, wp: [170, 110], col: '#80ff90',
    skills: [{ n: '防．防蚊護盾', good: 1, shield: 1, d: '淺色長袖＋防蚊液，全體減傷', fx: 'shield', snd: 'block' }, { n: '衝．山岳衝撞', anim: 'run', good: 0, d: '用山頂撞過去', fx: 'hammer', snd: 'smash' }] }];
const ITEMS = [{ n: '就醫檢查', ok: 1, d: '全體回復，治好發燒' }, { n: '多喝水休息', ok: 1, d: '一人回復' }, { n: '阿斯匹靈', ok: 0, d: '止痛藥……？' }];
const BOSSW = [-185, 30], BOSS_HP0 = 36000, BOSS_SPD0 = 2.0;

// ---------- 狀態 ----------
let scene = 'title', st = 0, now = 0, last = performance.now(), titleCur = 0;
const G = {};
function newGame() { Object.assign(G, { px: 318, py: 905, dir: 'up', found: new Set(), info: null, enc: -1,
  heroes: HEROES.map(h => ({ ...h, cur: h.hp, atb: Math.random() * .5, fever: 0, ko: false, x: 0, y: 0, sc: 1, off: 0, hop: 0, hurt: -9 })),
  boss: { hp: BOSS_HP0, max: BOSS_HP0, atb: 0, spd: BOSS_SPD0, x: 0, y: 0, sc: 1, hurt: -9, lunge: 0 },
  queue: [], menu: null, busy: null, msgs: [], nums: [], fxs: [], shield: 0, gem: 0, shake: 0, end: -1, result: null }); }
function go(s) { scene = s; st = now; }
const msg = (s, c = '#fff', d = 1.8) => G.msgs.push({ s, c, t: now, d });
const num = (s, x, y, c = '#fff', big = 1) => G.nums.push({ s, x, y, c, t: now, big });
const epos = e => e === G.boss ? [e.x + (e.lunge || 0), e.y, e.sc] : e.mx != null ? [e.mx, e.my, e.sc] : [e.x - (e.off || 0), e.y - (e.hop || 0), e.sc];
const fx = (n, x, y, s = 1, o = {}) => { const f = { n, x, y, s, o, t: now + (o.delay || 0) }; if (o.on) { const [px, py, ps] = epos(o.on); f.rx = (x - px) / ps; f.ry = (y - py) / ps; f.rs = s / ps; } G.fxs.push(f); };

// ---------- 標題 ----------
function title(dt) {
  if (A.title) { const z = 1.06 + .02 * Math.sin(now * .3); X.drawImage(A.title, (W / 2 - W * z / 2) * KS, (H / 2 - H * z / 2) * KS, W * z * KS, H * z * KS); }
  T('登革熱防治大作戰', 320, 22, { size: 42, align: 'center', color: '#ffd84a', stroke: 6, sc: '#3a0a40' });
  T('～ 最終決戰：超級大蚊子王 ～', 320, 78, { size: 15, align: 'center', color: '#ffe8ff' });
  panel(250, 122, 140, 64, .95); ['新的開始', '遊戲說明'].forEach((s, i) => T(s, 300, 132 + i * 26, { size: 15, color: titleCur === i ? '#ffe060' : '#fff' })); hand(262, 141 + titleCur * 26, now);
  T(HINT.title, 320, 336, { size: 11, align: 'center', color: '#ddd' });
  if (G.help) { panel(80, 60, 480, 250, .97, '#ffe9a8'); T('遊戲說明', 320, 72, { size: 18, align: 'center', color: '#ffe060' });
    T('１．在巷弄裡用方向鍵走動，靠近有「！」的地方按空白鍵調查。\n　　每找到一個孳生源，魔王的體力和速度都會下降！\n２．走到巷子最上面就會遇到魔王，進入戰鬥。\n３．角色的進度條集滿就能下指令。魔王也有進度條，\n　　集滿就會攻擊，記得注意！\n４．每人有兩個特技：針對登革熱的防治招式「效果絕佳」，\n　　角色本身特質的招式「效果不佳」。偶爾會擊中要害！\n５．絕佳招式會累積「信號魔石」，集滿就能召喚紅綠燈王。\n６．道具要選對：疑似登革熱不能吃阿斯匹靈！', 96, 100, { size: 12.5 }); }
  for (const k of pressed) { if (G.help) { if (hit([k], 'Enter', ' ', 'Escape')) { G.help = false; selectS(); } continue; }
    if (hit([k], 'ArrowUp', 'ArrowDown')) { titleCur = 1 - titleCur; cursorS(); }
    if (hit([k], 'Enter', ' ')) { selectS(); if (titleCur === 1) G.help = true; else { newGame(); go('map'); music('music_victory.m4a', .35, 22); } } }
  if (click) { const [cx, cy] = click; if (cx > 250 && cx < 390 && cy > 126 && cy < 182) { titleCur = cy < 154 ? 0 : 1; pressed.push('Enter'); } }
}

// ---------- 巷弄探索 ----------
const MAPH = 960;
// 不能走的地方：左側房子／雜物、右側水溝以外的房子與雜物（地圖座標 640x960）
function leftX(y) { return y < 440 ? 236 : y < 592 ? 226 : y < 668 ? 182 : y < 862 ? 212 : 44; }
function rightX(y) { return y < 240 ? 368 : y < 480 ? 392 + (y - 240) * .15 : 442; }
const blocked = (x, y) => x - 8 < leftX(y) || x + 8 > rightX(y);
let lastTap = {}, running = false;
function map(dt) {
  for (const k of pressed) if (k.startsWith('Arrow')) { running = now - (lastTap[k] || -9) < .32; lastTap[k] = now; }
  if (G.enc < 0 && !G.info) { let vx = 0, vy = 0; if (keys.ArrowLeft || keys.a) vx--; if (keys.ArrowRight || keys.d) vx++; if (keys.ArrowUp || keys.w) vy--; if (keys.ArrowDown || keys.s) vy++;
    if (!vx && !vy) running = false;
    if (vx || vy) { const l = Math.hypot(vx, vy), sp = (running ? 180 : 95) * dt, nx = clamp(G.px + vx / l * sp, 40, 600), ny = clamp(G.py + vy / l * sp, 420, 930);
      if (!blocked(nx, G.py)) G.px = nx; if (!blocked(G.px, ny)) G.py = ny; G.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down'); G.walk = (G.walk || 0) + dt * (running ? 1.9 : 1); } else G.walk = 0;
    if (G.py <= 425) { G.enc = now; music('music_battle.m4a', 0); snd('roar', .7); setTimeout(() => snd('encounter', .9), 900); } }
  const cy = clamp(G.py - 220, 0, MAPH - H); X.save(); X.translate(0, -cy * KS);
  if (A.map) X.drawImage(A.map, 0, 0, W * KS, MAPH * KS);
  let near = -1; SPOTS.forEach(([x, y], i) => { if (G.found.has(i)) { glow(x, y, 16, 'rgba(120,255,160,.5)', .5); return; } const d = Math.hypot(G.px - x, G.py - y);
    if (d < 105 && (near < 0 || d < Math.hypot(G.px - SPOTS[near][0], G.py - SPOTS[near][1]))) near = i;
    const M = A.spr.mosquito; if (M) for (let j = 0; j < 2; j++) { const a = now * (1.6 + j * .4) + i * 2 + j * 3; spr(M['f' + (Math.floor(now * 16 + i + j) % 4)], x + Math.cos(a) * (18 + j * 8), y - 10 + Math.sin(a * 1.3) * 10, .55, { flip: Math.sin(a) > 0 }); }
    T('！', x, y - 46 - Math.abs(Math.sin(now * 4 + i)) * 4, { size: 16, align: 'center', color: '#ffe040' }); });
  const step = G.walk ? Math.floor(G.walk * 7) % 4 : 1, fr = A.walk[G.dir + [0, 1, 2, 1][step]] || A.walk.up1;
  X.save(); X.globalAlpha = .4; X.fillStyle = '#000'; X.beginPath(); X.ellipse(G.px * KS, G.py * KS, 11 * KS, 4 * KS, 0, 0, 7); X.fill(); X.restore(); spr(fr, G.px, G.py);
  if (running && G.walk) for (let j = 0; j < 3; j++) { X.save(); X.globalAlpha = .35 - j * .1; X.fillStyle = '#c8b8a0'; X.beginPath(); X.arc((G.px + (hash(j + Math.floor(now * 10)) - .5) * 10) * KS, (G.py + 2 + j * 3) * KS, (3 - j * .6) * KS, 0, 7); X.fill(); X.restore(); }
  if (near >= 0 && !G.info && G.enc < 0) T(HINT.act, G.px, G.py - 64, { size: 11, align: 'center', color: '#a8ffd8' });
  if (G.enc >= 0) { const q = clamp((now - G.enc - .2) / .8); if (A.boss) { X.save(); X.globalAlpha = .55 * Math.sin(q * Math.PI); X.filter = 'brightness(0)'; X.drawImage(A.boss, (lerp(-300, 700, q) - 250) * KS, (G.py - 260) * KS, 500 * KS, 500 * A.boss.lh / A.boss.lw * KS); X.restore(); } }
  X.restore();
  // 上方：進度；下方：說明
  const n = G.found.size; panel(8, 6, 624, 40, .9); T(`找出孳生源 ${n} / ${SPOTS.length}`, 20, 12, { size: 14, color: '#ffe8a0' });
  T(`魔王體力 −${n * 7}%　　魔王速度 −${n * 6}%`, 20, 29, { size: 11, color: '#a8ffd8' }); T(HINT.map, 620, 20, { size: 10.5, align: 'right', color: '#cfd6ff' });
  if (G.info) { const [x, y, nm, a, b] = SPOTS[G.info.i], e = now - G.info.t; panel(10, 262, 620, 90, .97, '#ffe9a8');
    T(`【發現孳生源】${nm}`, 24, 270, { size: 16, color: '#ffe060' }); T(a, 24, 294, { size: 14 }); T('→ ' + b, 24, 316, { size: 14, color: '#a8ffd8' });
    T(`魔王體力 −7%　速度 −6%！　（${TOUCH ? 'A' : '空白鍵'}繼續）`, 616, 336, { size: 10.5, align: 'right', color: '#ffb0b0' });
    pfx('confetti', e, x, y - cy, 1.3); }
  for (const k of pressed) if (hit([k], ' ', 'Enter')) { if (G.info) { G.info = null; selectS(); } else if (near >= 0 && G.enc < 0) { G.found.add(near); G.info = { i: near, t: now }; snd('cast', .6); menuS(); } }
  if (G.enc >= 0) { const e = now - G.enc; if (e > .9) T('嗡嗡嗡嗡嗡──！！ 超級大蚊子王出現了！', 320, 150, { size: 18, align: 'center', color: '#ff9090' });
    if (e > 1.6) { const q = clamp((e - 1.6) / .7); X.save(); X.translate(W / 2 * KS, H / 2 * KS); X.rotate(e * 6); X.fillStyle = '#000'; for (let i = 0; i < 8; i++) { X.beginPath(); X.moveTo(0, 0); X.arc(0, 0, 420 * KS, i / 8 * 6.283, i / 8 * 6.283 + q * 6.283 / 8); X.closePath(); X.fill(); } X.restore(); }
    if (e > 2.4) { if (A.battleReady) startBattle(); else T('戰鬥準備中……', 320, 300, { size: 14, align: 'center', color: '#ffe060' }); } }
}

// ---------- 戰鬥 ----------
function startBattle() { const n = G.found.size; G.boss.max = G.boss.hp = Math.round(BOSS_HP0 * (1 - .07 * n)); G.boss.spd = BOSS_SPD0 * (1 - .06 * n);
  go('battle'); music('music_battle.m4a', .4); snd('appear', .7); G.intro = now; G.rage = 0; G.weak = 0; G.says = []; G.minis = []; G.bossTurn = 0; G.nextSummon = 2; G.summonGap = 3;
  setTimeout(() => say(G.heroes[0], n >= 5 ? '孳生源清乾淨了，牠變弱了！' : '這次的蚊子好強……！', 2.2), 2600); msg(n ? `孳生源清除 ${n} 個！魔王變弱了！` : '一個孳生源都沒清……魔王火力全開！', n ? '#a8ffd8' : '#ff9090', 2.6); }
function camOf(t) { let yaw = Math.sin(t * .2) * .3 + .05, pitch = .4, dist = 720, tg = [0, 62, 35];
  const b = G.busy; if (b && !G.summon) { const k = ease(Math.min(clamp((now - b.t) / .4), clamp((b.end - now) / .4))); const fx2 = b.who === 'boss' ? [BOSSW[0] + 80, 60, BOSSW[1]] : [(b.h.wp[0] + BOSSW[0]) / 2, 55, (b.h.wp[1] + BOSSW[1]) / 2];
    yaw += (b.who === 'boss' ? -.3 : b.side || .35) * k; dist = lerp(dist, 540, k); tg = tg.map((v, i) => lerp(v, fx2[i], k)); }
  const ei = now - G.intro; if (ei < 1.6) { const q = ease(clamp(ei / 1.6)); yaw += (1 - q) * 1.1; dist = lerp(430, dist, q); pitch = lerp(.22, pitch, q); }
  return [yaw, pitch, dist, tg]; }
function alive() { return G.heroes.filter(h => !h.ko); }
function battle(dt) {
  const [yaw, pitch, dist, tg] = camOf(now); GL3D.setCamera(yaw, pitch, dist, tg);
  G.heroes.forEach((h, i) => { const k = h.lunge || 0, wx = lerp(h.wp[0], BOSSW[0] + 120, k), wz = lerp(h.wp[1], BOSSW[1] + 25 + i * 8, k), p = GL3D.project(wx, 0, wz); h.x = p.x; h.y = p.y; h.sc = p.s * 760 * 1.15; });
  const bp = GL3D.project(BOSSW[0], 0, BOSSW[1]); G.boss.x = bp.x; G.boss.y = bp.y; G.boss.sc = bp.s * 760 * .78;
  const cv = GL3D.render(now); let sk = G.shake > 0 ? G.shake : 0; G.shake = Math.max(0, G.shake - dt * 20);
  X.save(); X.translate(Math.sin(now * 90) * sk * KS, Math.cos(now * 77) * sk * .6 * KS); if (cv) X.drawImage(cv, 0, 0, W * KS, H * KS);
  // ATB（下指令時暫停＝等待模式）
  const wait = G.menu || G.busy || G.result || now - G.intro < 2.2;
  if (!wait) { G.heroes.forEach(h => { if (h.ko || h.atb >= 1) return; h.atb = Math.min(1, h.atb + dt * .16 * h.spd * (h.fever > 0 ? .55 : 1)); if (h.atb >= 1 && !G.queue.includes(h)) { G.queue.push(h); beep(1568, .12, 'sine', .07); } });
    G.boss.atb = Math.min(1, G.boss.atb + dt * .13 * G.boss.spd);
    for (const m of G.minis) { if (m.dead || m.born > now - 1.2) continue; m.atb += dt * .2 * m.spd; if (m.atb >= 1 && !G.busy) { m.atb = 0; miniAct(m); break; } }
    if (G.busy) {} else if (G.boss.atb >= 1) bossAct(); else if (G.queue.length && !G.menu) openMenu(G.queue.shift()); }
  // 魔王
  const B = G.boss; if (A.boss && !(G.result === 'win' && now - G.end > 1.6)) { let bx = B.x + (B.lunge || 0), by = B.y + Math.sin(now * 2.1) * 4; const ht = now - B.hurt; if (ht < .3) bx += Math.sin(now * 90) * 5;
    const dead = G.result === 'win' ? clamp((now - G.end) / 1.5) : 0;
    X.save(); X.globalAlpha = .35 * (1 - dead); X.fillStyle = '#000'; X.beginPath(); X.ellipse((B.x + 10 * B.sc) * KS, B.y * KS, 110 * B.sc * KS, 9 * B.sc * KS, 0, 0, 7); X.fill(); X.restore();
    spr(A.boss, bx, by, B.sc, { alpha: 1 - dead, tint: ht < .12 ? 'rgba(255,255,255,.7)' : B.hp < B.max * .3 ? `rgba(255,0,40,${.15 + .1 * Math.sin(now * 6)})` : null }); }
  minisDraw();
  // 隊員
  G.heroes.forEach((h, i) => { const S = A.spr[h.sheet]; if (!S) return; let fr = S.stand, x = h.x - (h.off || 0), y = h.y - (h.hop || 0), flip = true;
    if (G.summon && now - G.summon.t < SUM.END) { const e = now - G.summon.t, E = SUM.END, a = e < .7 ? 1 - e / .7 : e > E - .6 ? (e - (E - .6)) / .6 : 0, pil = e < 1.1 ? Math.sin(clamp(e / 1.1) * Math.PI) : e > E - .8 ? Math.sin(clamp((e - (E - .8)) / .8) * Math.PI) : 0;
      if (a > 0) spr(S.stand, x, y, h.sc, { flip, alpha: a, tint: `rgba(255,255,255,${.7 * (1 - a) + .2})` });
      if (pil > 0) { X.save(); X.globalCompositeOperation = 'lighter'; const pw = 22 * h.sc, gg = X.createLinearGradient((x - pw) * KS, 0, (x + pw) * KS, 0); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(.5, h.col); gg.addColorStop(1, 'rgba(255,255,255,0)'); X.globalAlpha = pil; X.fillStyle = gg; X.fillRect((x - pw) * KS, 0, pw * 2 * KS, y * KS);
        const g2 = X.createLinearGradient((x - pw * .3) * KS, 0, (x + pw * .3) * KS, 0); g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(.5, 'rgba(255,255,255,.9)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); X.fillStyle = g2; X.fillRect((x - pw * .3) * KS, 0, pw * .6 * KS, y * KS); X.restore();
        for (let j = 0; j < 10; j++) { const q = (e * 1.3 + hash(j + i * 7)) % 1; glow(x + (hash(j * 3 + i) - .5) * pw * 1.4, y - q * y, 3, h.col, pil * (1 - q)); } }
      return; }
    if (h.ko) { const HF = A.hurt[h.id]; spr(HF ? HF[HF.length - 1] : S.stand, x, y, h.sc, { flip: h.id === 'M', alpha: .6, tint: 'rgba(80,80,120,.5)' }); return; }
    const ht = now - h.hurt; if (ht < 1.1 && A.hurt[h.id]) { const HF = A.hurt[h.id]; fr = HF[ht < .35 ? 0 : 1]; flip = h.id === 'M'; x += Math.sin(Math.min(1, ht / .5) * Math.PI) * 14; }
    else if (G.result === 'win') { const cyc = h.sheet === 'teacher' ? ['c0', 'stand'] : ['c0', 'c1']; fr = S[cyc[Math.floor(now * 5 + i) % 2]] || S.stand; y -= Math.abs(Math.sin(now * 6 + i)) * 10; }
    else if (h.anim) fr = S[h.anim] || S.stand;
    else if (G.menu && G.menu.h === h) fr = S.stand;
    else if (h.cur < h.hp * .5) { const HF = A.hurt[h.id]; if (HF) { fr = HF[Math.floor(now * 1.6 + i) % 2 ? 1 : HF.length - 1]; flip = h.id === 'M'; } h.tired = true; }
    X.save(); X.globalAlpha = .35; X.fillStyle = '#000'; X.beginPath(); X.ellipse(h.x * KS, h.y * KS, 16 * h.sc * KS, 4 * h.sc * KS, 0, 0, 7); X.fill(); X.restore();
    const tired = !h.ko && h.cur < h.hp * .5 && !h.anim && !(G.result === 'win'), br = tired ? 1 + Math.sin(now * 7 + i) * .035 : 1;
    X.save(); if (tired) { X.translate(x * KS, y * KS); X.scale(1 / br, br); X.translate(-x * KS, -y * KS); }
    spr(fr, x, y, h.sc, { flip, tint: ht < .15 ? 'rgba(255,40,40,.5)' : tired && Math.floor(now * 4 + i) % 2 ? 'rgba(255,20,20,.42)' : null }); X.restore();
    if (tired) { for (let j = 0; j < 2; j++) { const q = (now * 1.4 + j * .5 + i * .3) % 1; X.save(); X.globalAlpha = .6 * Math.sin(q * Math.PI); X.fillStyle = '#e8f4ff'; X.beginPath(); X.ellipse((x - 14 * h.sc - q * 10) * KS, (y - fr.lh * h.sc * .72 + q * 4) * KS, (3 + q * 4) * KS, (2 + q * 2) * KS, 0, 0, 7); X.fill(); X.restore(); }
      const sq = (now * .9 + i * .4) % 1; X.save(); X.globalAlpha = .8 * (1 - sq); X.fillStyle = '#8fd0ff'; X.beginPath(); X.ellipse((x + 6 * h.sc) * KS, (y - fr.lh * h.sc * .9 + sq * 14) * KS, 1.6 * KS, 2.6 * KS, 0, 0, 7); X.fill(); X.restore(); }
    if (h.fever > 0) for (let j = 0; j < 5; j++) { const q = (now * .9 + j / 5) % 1; X.save(); X.globalAlpha = .5 * Math.sin(q * Math.PI); X.fillStyle = '#fff'; X.beginPath(); X.arc((x - 4 + Math.sin(q * 8 + j) * 6) * KS, (y - fr.lh * h.sc - 4 - q * 22) * KS, (2 + q * 4) * KS, 0, 7); X.fill(); X.restore(); }
    if (G.shield > 0) { const P = A.pfx.shield; if (P) { const d = P.m.n / P.m.fps; pfx('shield', d * .35 + (now * .5 + i * .2) % (d * .4), x, y - 8 * h.sc, h.sc * 1.05, { add: true, alpha: .75, dur: d }); } glow(x, y - 30 * h.sc, 30 * h.sc, 'rgba(120,255,220,.2)', .35); }
    if (G.menu && G.menu.h === h) T('▼', x, y - fr.lh * h.sc - 18 - Math.abs(Math.sin(now * 6)) * 4, { size: 14, align: 'center', color: '#ffe060' }); });
  // 召喚動畫
  if (G.summon) summonDraw();
  // 特效
  G.fxs = G.fxs.filter(f => { const e = now - f.t; if (e < 0) return true; const P = A.pfx[f.n]; if (!P) return false; if (e > P.m.n / P.m.fps) return false; let x = f.x, y = f.y, s = f.s; if (f.o.on) { if (f.o.on.dead) return false; const [px, py, ps] = epos(f.o.on); x = px + f.rx * ps; y = py + f.ry * ps; s = f.rs * ps; } pfx(f.n, e, x, y, s, f.o); return true; });
  X.restore();
  // 進行中的動作
  if (G.busy && now >= G.busy.end) { const b = G.busy; G.busy = null; if (b.done) b.done(); }
  if (G.busy && G.busy.step) G.busy.step(now - G.busy.t);
  // 數字
  G.nums = G.nums.filter(n => { const e = now - n.t; if (e > 1.4) return false; const bo = e < .3 ? -Math.sin(e / .3 * Math.PI) * 12 : 0;
    T(n.s, n.x, n.y + bo - e * 6, { size: 15 * n.big, align: 'center', color: n.c, stroke: 3.5, alpha: clamp((1.4 - e) / .3) }); return true; });
  ui();
  if (!G.result && B.hp <= 0) { G.minis.forEach(m => killMini(m)); G.menu = null; G.queue = []; G.result = 'win'; G.end = now; snd('death', .8); fx('darkboom', B.x, B.y, 1.3 * B.sc, { on: B }); setTimeout(() => { music('music_victory2.m4a', .55); }, 1500); }
  if (!G.result && alive().length === 0) { G.menu = null; G.result = 'lose'; G.end = now; }
  if (G.result) resultDraw();
}
function ui() {
  const B = G.boss;
  // 魔王：名字、血條、進度條
  T('超級大蚊子王', 320, 4, { size: 12, align: 'center', color: B.hp < B.max * .3 ? '#ffb0b0' : '#fff' }); { const mc = (G.minis || []).filter(m => !m.dead).length; if (mc) T('斑蚊小兵 ×' + mc, 436, 4, { size: 9.5, color: '#ffb0c0' }); else if (G.nextSummon != null && !G.result) T('召喚倒數 ' + Math.max(0, G.nextSummon - G.bossTurn) + ' 回合', 436, 6, { size: 8, color: '#c0a0b0' }); }
  X.save(); X.fillStyle = 'rgba(0,0,10,.75)'; X.beginPath(); X.roundRect(208 * KS, 21 * KS, 224 * KS, 8 * KS, 4 * KS); X.fill();
  const g = X.createLinearGradient(0, 21 * KS, 0, 29 * KS); g.addColorStop(0, '#ff9a9a'); g.addColorStop(1, '#c01830'); X.fillStyle = g; X.beginPath(); X.roundRect(209 * KS, 22 * KS, 222 * clamp(B.hp / B.max) * KS, 6 * KS, 3 * KS); X.fill(); X.restore();
  T(`${Math.max(0, Math.round(B.hp))} / ${B.max}`, 436, 19, { size: 8.5, color: '#ffd0d0' });
  if (G.weak > 0) T('防禦↓ ×' + G.weak, 206, 19, { size: 8.5, align: 'right', color: '#80ffb0' });
  bar(240, 32, 160, 6, B.atb, '#ff5a7a', '#ffd040'); T('攻擊進度', 236, 30, { size: 8, align: 'right', color: B.atb > .8 ? '#ffd040' : '#ffb0c0' });
  if (B.atb > .85 && !G.busy && !G.result) T('！魔王即將攻擊', 404, 29, { size: 9, color: Math.floor(now * 8) % 2 ? '#ff6060' : '#ffd040' });
  // 信號魔石
  T('信號魔石', 12, 8, { size: 9, color: '#ffe8a0' }); for (let i = 0; i < 4; i++) { const on = G.gem > i; glow(22 + i * 16, 27, on ? 9 : 4, on ? ['#ff4030', '#ffd020', '#40ff60', '#80c0ff'][i] : 'rgba(120,120,160,.5)', on ? .9 : .5); }
  // 隊伍卡
  G.heroes.forEach((h, i) => { const act = G.menu && G.menu.h === h, x = 302 + i * 84, y = 306 - (act ? 5 : 0);
    panel(x, y, 82, 48, .86, act ? '#ffd86e' : 'rgba(170,190,255,.35)'); T(h.name, x + 5, y + 3, { size: 8.5, color: act ? '#ffe680' : h.ko ? '#888' : '#fff', stroke: 2 });
    if (h.fever > 0) T('發燒', x + 77, y + 3, { size: 7.5, align: 'right', color: '#ff7070', stroke: 2 }); else if (G.shield > 0) T('防蚊', x + 77, y + 3, { size: 7.5, align: 'right', color: '#90ffe0', stroke: 2 });
    T(String(Math.max(0, Math.round(h.cur))), x + 5, y + 14, { size: 12, color: h.cur < h.hp * .3 ? '#ffe060' : '#fff', stroke: 2 }); T('/' + h.hp, x + 5 + String(Math.round(h.cur)).length * 7.2, y + 18, { size: 7.5, color: '#a8b4e0', stroke: 1.5 });
    bar(x + 5, y + 31, 72, 4, h.cur / h.hp, '#40c060', '#60f080'); bar(x + 5, y + 38, 72, 6, h.atb, '#4a58b8', '#ffd030', true); });
  // 訊息
  saysDraw();
  if (G.rage) G.heroes.forEach((h, i) => { if (!h.ko) T('攻↑' + (G.rage > 1 ? '×' + G.rage : ''), 302 + i * 84 + 77, 314 - (G.menu && G.menu.h === h ? 5 : 0), { size: 7.5, align: 'right', color: '#ffa040', stroke: 2 }); });
  G.msgs = G.msgs.filter(m => now - m.t < m.d); const m = G.msgs[G.msgs.length - 1];
  if (m) { const k = ease(clamp((now - m.t) / .15)); X.save(); X.globalAlpha = .9 * k; const gg = X.createLinearGradient(0, 0, W * KS, 0); gg.addColorStop(0, 'rgba(6,8,22,0)'); gg.addColorStop(.1, 'rgba(6,8,22,.9)'); gg.addColorStop(.9, 'rgba(6,8,22,.9)'); gg.addColorStop(1, 'rgba(6,8,22,0)'); X.fillStyle = gg; X.fillRect(0, 44 * KS, W * KS, 34 * KS); X.restore();
    T(m.s, 320, 51, { size: 16, align: 'center', color: m.c }); }
  if (G.menu && !G.result) menuDraw();
}
function bar(x, y, w, h, v, c0, c1, ready) { X.save(); X.fillStyle = '#02040e'; X.beginPath(); X.roundRect((x - 1) * KS, (y - 1) * KS, (w + 2) * KS, (h + 2) * KS, (h / 2 + 1) * KS); X.fill();
  if (v > 0) { const g = X.createLinearGradient(0, y * KS, 0, (y + h) * KS); const full = v >= 1; g.addColorStop(0, '#fff'); g.addColorStop(.45, full ? c1 : c0); g.addColorStop(1, full ? '#a85a00' : '#202860'); X.fillStyle = g; X.beginPath(); X.roundRect(x * KS, y * KS, Math.max(h, w * clamp(v)) * KS, h * KS, h / 2 * KS); X.fill(); }
  X.restore(); if (ready && v >= 1) T('READY', x + w / 2, y - 1.5, { size: 6.5, align: 'center', color: '#5a2a00', stroke: 0 }); }

// ---------- 指令選單 ----------
function openMenu(h) { if (h.ko) return; G.menu = { h, lv: 0, cur: 0, t: now }; menuS(); }
function menuItems() { const m = G.menu, h = m.h; if (m.lv === 0) return ['攻擊', '特技', '道具', ...(G.gem >= 4 ? ['召喚'] : [])];
  if (m.lv === 1) return h.skills.map(s => s.n); return ITEMS.map(i => i.n); }
function menuDraw() { const m = G.menu, h = m.h, items = menuItems(), k = ease(clamp((now - m.t) / .18)), px = 14, py = 220 - items.length * 20;
  panel(px, py, 120, items.length * 20 + 14, .9 * k, '#ffd86e'); if (k < 1) return;
  T(h.name, px + 6, py - 14, { size: 10, color: '#ffe680' });
  items.forEach((s, i) => { const sel = i === m.cur; if (sel) { X.save(); X.fillStyle = 'rgba(255,210,90,.22)'; X.beginPath(); X.roundRect((px + 5) * KS, (py + 6 + i * 20) * KS, 110 * KS, 18 * KS, 4 * KS); X.fill(); X.restore(); }
    T(s, px + 32, py + 8 + i * 20, { size: 12.5, color: s === '召喚' ? (Math.floor(now * 6) % 2 ? '#ffe060' : '#ffb040') : sel ? '#ffe9a0' : '#fff' }); });
  hand(px + 8, py + 16 + m.cur * 20, now);
  if (m.lv > 0) { const d = m.lv === 1 ? h.skills[m.cur].d : ITEMS[m.cur].d; panel(140, 286, 156, 40, .9); T(d, 148, 292, { size: 10.5, color: '#cfe0ff' }); T(HINT.back, 148, 310, { size: 8.5, color: '#99a' }); }
  for (const key of pressed) { if (hit([key], 'ArrowUp')) { m.cur = (m.cur + items.length - 1) % items.length; cursorS(); } if (hit([key], 'ArrowDown')) { m.cur = (m.cur + 1) % items.length; cursorS(); }
    if (hit([key], 'Escape', 'Backspace') && m.lv > 0) { m.lv = 0; m.cur = 0; cursorS(); }
    if (hit([key], 'Enter', ' ')) { selectS(); const it = items[m.cur];
      if (m.lv === 0) { if (it === '攻擊') { G.menu = null; heroAct(h, { n: '攻擊', anim: 'jump', good: -1, fx: 'crit', snd: 'smash' }); } else if (it === '特技') { m.lv = 1; m.cur = 0; menuS(); } else if (it === '道具') { m.lv = 2; m.cur = 0; menuS(); } else { G.menu = null; summon(h); } }
      else if (m.lv === 1) { G.menu = null; heroAct(h, h.skills[m.cur]); } else { G.menu = null; itemAct(h, ITEMS[m.cur]); } return; } }
  if (click) { const [cx, cy] = click; items.forEach((s, i) => { if (cx > px && cx < px + 120 && cy > py + 6 + i * 20 && cy < py + 24 + i * 20) { m.cur = i; pressed.push('Enter'); } }); }
}
// ---------- 我方行動 ----------
function finish(h) { h.atb = 0; h.off = 0; h.lunge = 0; h.hop = 0; h.anim = null; }
function heroAct(h, sk) { const B = G.boss, i = HEROES.findIndex(x => x.id === h.id); snd('cast', .45); fx('spellcharge', h.x, h.y, h.sc, { add: true, on: h });
  if (sk.scan) { G.busy = { who: h.id, h, t: now, end: now + 1.8, side: -.3, step: e => { h.anim = e < 1.2 ? 'look' + (Math.floor(e * 2) % 2) : 'c0'; },
      done: () => { G.weak = 3; msg('效果絕佳！找出花盆底盤、水桶、積水！魔王防禦下降（接下來 3 次攻擊傷害提高）', '#80ffb0', 2.6); say(h, '孳生源，全部被我找到了！', 1.8, '#c8ffd8'); G.gem = Math.min(4, G.gem + 1); finish(h); } };
    fx('scanner', h.x - 30, h.y, 1.5 * h.sc, { flip: true, add: true }); const B = G.boss; [0, 1, 2].forEach(j => setTimeout(() => { fx('sunburst', B.x + (j - 1) * 60 * B.sc, B.y - 10, .8, { add: true, on: B }); num(['！花盆底盤', '！水桶', '！積水'][j], B.x + (j - 1) * 70 * B.sc, B.y - 30 - j * 14, '#ffe060', .9); snd('cast', .4); }, 500 + j * 350));
    msg(sk.n, '#ffe680', 1.4); return; }
  if (sk.shield) { G.busy = { who: h.id, h, t: now, end: now + 1.6, side: .35, step: e => { h.anim = 'act' + (Math.floor(e * 6) % 4); },
      done: () => { G.shield = 2; msg('效果絕佳！全體防蚊力上升（魔王下兩次攻擊減傷）', '#80ffb0'); snd('block', .8); G.heroes.forEach(x => !x.ko && fx('shield', x.x, x.y - 10 * x.sc, x.sc * 1.1, { add: true, on: x })); G.gem = Math.min(4, G.gem + 1); finish(h); } };
    msg(sk.n, '#ffe680', 1.4); return; }
  msg(sk.n === '攻擊' ? h.name + ' 的攻擊' : sk.n, '#ffe680', 1.2);
  const dist = (h.x - B.x) * .6, hitT = .55;
  G.busy = { who: h.id, h, t: now, end: now + 1.7, side: i % 2 ? .42 : -.38, hitDone: false,
    step: e => { const go = clamp((e - .15) / .35), back = clamp((e - 1.2) / .4); const an = sk.anim || 'jump', ground = an === 'run'; h.lunge = ease(go) * (1 - ease(back)); h.off = 0; h.hop = ground ? 0 : an === 'ride' ? 22 * (1 - back) * Math.min(1, go * 3) : Math.sin(go * Math.PI) * 40 * (1 - back) + Math.sin(back * Math.PI) * 30;
      const R8 = 'r' + (Math.floor(e * 16) % 8);
      h.anim = e < .15 ? 'c0' : back > 0 ? R8 : an === 'run' ? (go < 1 ? R8 : 'j' + (1 + Math.floor(e * 10) % 3)) : an === 'ride' ? 'ride' + (Math.floor(e * 10) % 4) : go < 1 ? 'j2' : an === 'act' ? (h.sheet === 'bunny' ? 'act' + Math.min(5, Math.floor((e - .5) * 10)) : 'act' + (Math.floor(e * 8) % 4)) : 'j' + (1 + Math.floor(e * 10) % 4);
      if (!G.busy.hitDone && e >= hitT) { G.busy.hitDone = true; strike(h, sk); } },
    done: () => finish(h) };
}
// ---------- 角色台詞泡泡、倒下後的憤怒加成 ----------
function say(h, s, d = 2, c = '#ffffff') { if (!h || G.result) return; G.says = (G.says || []).filter(x => x.h !== h); G.says.push({ h, s, t: now, d, c }); }
function saysDraw() { G.says = (G.says || []).filter(x => now - x.t < x.d); for (const b of G.says) { const h = b.h, k = ease(clamp((now - b.t) / .15)), a = Math.min(1, (b.d - (now - b.t)) / .25);
    const S = A.spr[h.sheet], top = h.y - (h.hop || 0) - ((S && S.stand ? S.stand.lh : 70) * h.sc) - 16, x = clamp(h.x - (h.off || 0), 60, 580), w = Math.max(70, b.s.length * 11 + 20);
    X.save(); X.globalAlpha = a * k; X.fillStyle = 'rgba(255,255,255,.95)'; X.strokeStyle = '#1a1a3a'; X.lineWidth = 1.5 * KS; X.beginPath(); X.roundRect((x - w / 2) * KS, (top - 22) * KS, w * KS, 20 * KS, 8 * KS); X.fill(); X.stroke();
    X.beginPath(); X.moveTo((x - 4) * KS, (top - 2.5) * KS); X.lineTo(x * KS, (top + 5) * KS); X.lineTo((x + 4) * KS, (top - 2.5) * KS); X.fill(); X.restore();
    T(b.s, x, top - 19, { size: 10.5, align: 'center', color: '#1a1a3a', stroke: 0, alpha: a * k }); } }
function koRage(dead) { G.rage = (G.rage || 0) + 1; const al = alive(); if (!al.length) return; msg(`${dead.name} 倒下了！　其他英雄的攻擊力提升！`, '#ff9a5a', 2.4); snd('awaken', .5);
  const sp = al[Math.floor(Math.random() * al.length)]; setTimeout(() => say(sp, ['可惡！我跟你拚了！', `${dead.name}，我會替你報仇！`, '不可原諒……看我的厲害！'][Math.floor(Math.random() * 3)], 2.4, '#ffb0a0'), 700);
  al.forEach((x, i) => { setTimeout(() => { fx('spellcharge', x.x, x.y, x.sc * 1.2, { add: true, on: x }); num('攻擊力 UP！', x.x, x.y - 92 * x.sc, '#ffa040', 1); }, 300 + i * 150); }); }
// ---------- 斑蚊小兵 ----------
const MINIW = [[-60, 70, -40], [-20, 95, 40], [-80, 55, 110]];
function summonMinis() { const B = G.boss; snd('roar', .7); msg('超級大蚊子王：出來吧，我的子孫們！（召喚斑蚊小兵）', '#ff9090', 2);
  G.busy = { who: 'boss', t: now, end: now + 1.8, step: e => { B.lunge = -Math.sin(clamp(e / 1.2) * Math.PI) * 12; }, done: () => { B.lunge = 0; } };
  G.minis = MINIW.map((w, i) => ({ w, hp: 900, max: 900, atb: Math.random() * .4, spd: .8 + Math.random() * .5, born: now + .3 + i * .25, hurt: -9, dead: false, mx: B.x, my: B.y, sc: B.sc }));
  G.minis.forEach((m, i) => setTimeout(() => { fx('poof', m.mx, m.my, m.sc * 1.2, { on: m }); snd('cast', .5); }, 300 + i * 250));
  setTimeout(() => say(G.heroes.find(h => !h.ko), '又冒出小蚊子了！快清掉積水！', 2), 1500); }
function killMini(m) { if (m.dead) return; m.dead = true; m.deadT = now; fx('poof', m.mx, m.my, m.sc * 1.3); snd('miss', .6); num('KO', m.mx, m.my - 30 * m.sc, '#80ffb0'); }
function miniAct(m) { const al = alive(); if (!al.length) return; const h = al[Math.floor(Math.random() * al.length)], red = G.shield > 0 ? .3 : 1;
  G.busy = { who: 'boss', t: now, end: now + 1.1, hitDone: false, step: e => { m.lunge = Math.sin(clamp(e / .9) * Math.PI);
      if (!G.busy.hitDone && e > .45) { G.busy.hitDone = true; const d = Math.round(rnd(90, 150) * red); h.cur -= d; h.hurt = now; num(String(d), h.x, h.y - 80 * h.sc, '#ffb0b0'); fx(red < 1 ? 'block' : 'claw', h.x, h.y - 30 * h.sc, h.sc * .8, { flip: true, on: h }); snd(red < 1 ? 'block' : 'hurt', .6);
        if (red < 1) { G.shield = Math.max(0, G.shield - .5); } if (h.cur <= 0) { h.cur = 0; h.ko = true; h.atb = 0; G.queue = G.queue.filter(x => x !== h); koRage(h); } } },
    done: () => { m.lunge = 0; } }; m.target = h; msg('斑蚊小兵的叮咬！', '#ffb0b0', 1); }
function minisDraw() { const M = A.spr.mosquito; if (!M) return; G.minis.forEach((m, i) => {
    if (m.dead) { if (now - m.deadT > .6) return; }
    const k = clamp((now - m.born) / .6); if (k <= 0) { const p = GL3D.project(BOSSW[0], 60, BOSSW[1]); m.mx = p.x; m.my = p.y; m.sc = p.s * 760; return; }
    let [wx, wy, wz] = m.w; wx = lerp(BOSSW[0], wx, ease(k)); wz = lerp(BOSSW[1], wz, ease(k)); wy += Math.sin(now * 4 + i * 2) * 6;
    if (m.lunge && m.target) { const t = m.target; wx = lerp(wx, t.wp[0] - 30, m.lunge); wz = lerp(wz, t.wp[1], m.lunge); wy = lerp(wy, 40, m.lunge); }
    const p = GL3D.project(wx, wy, wz); m.mx = p.x; m.my = p.y; m.sc = p.s * 760;
    const ht = now - m.hurt, a = m.dead ? 1 - (now - m.deadT) / .6 : k;
    X.save(); X.globalAlpha = .25 * a; X.fillStyle = '#000'; const gp = GL3D.project(wx, 0, wz); X.beginPath(); X.ellipse(gp.x * KS, gp.y * KS, 14 * m.sc * KS, 3 * m.sc * KS, 0, 0, 7); X.fill(); X.restore();
    spr(M['f' + (Math.floor(now * 16 + i) % 4)], m.mx, m.my + 20 * m.sc, m.sc * 1.3, { flip: true, alpha: a, tint: ht < .15 ? 'rgba(255,255,255,.7)' : null });
    if (!m.dead) { const bw = 30 * m.sc; X.save(); X.fillStyle = 'rgba(0,0,0,.6)'; X.fillRect((m.mx - bw / 2) * KS, (m.my - 30 * m.sc) * KS, bw * KS, 3 * KS); X.fillStyle = '#ff6070'; X.fillRect((m.mx - bw / 2) * KS, (m.my - 30 * m.sc) * KS, bw * clamp(m.hp / m.max) * KS, 3 * KS); X.restore(); } }); }
function strike(h, sk) { const B = G.boss, crit = Math.random() < .18; let dmg, word, col;
  if (sk.good === 1) { dmg = rnd(1700, 2300); word = '效果絕佳！'; col = '#80ffb0'; G.gem = Math.min(4, G.gem + 1); }
  else if (sk.good === 0) { dmg = rnd(120, 260); word = '效果不佳……'; col = '#a0a8c0'; }
  else { dmg = rnd(320, 460); word = ''; col = '#fff'; }
  if (crit) dmg *= 1.9; dmg *= 1 + .35 * (G.rage || 0); if (G.weak > 0) { dmg *= 1.5; G.weak--; } dmg = Math.round(dmg);
  const ml = G.minis.filter(m => !m.dead);
  if (ml.length && sk.good !== 1) { const m = ml[0]; m.hp -= dmg * 1.6; m.hurt = now; fx('crit', m.mx, m.my, m.sc, { on: m }); num(String(Math.round(dmg * 1.6)), m.mx, m.my - 30 * m.sc, '#fff'); snd('hit', .8); if (m.hp <= 0) killMini(m); G.shake = 2; msg('打到了斑蚊小兵！', '#ffd0a0', 1.2); return; }
  if (ml.length && sk.good === 1) { ml.forEach((m, j) => setTimeout(() => killMini(m), 200 + j * 150)); setTimeout(() => msg('清除孳生源！斑蚊小兵全滅！', '#80ffb0', 1.8), 900); }
  B.hp -= dmg;
  if (sk.good === 1 && Math.random() < .5) say(h, ['看我的厲害！', '把積水通通清掉！', '蚊子王，受死吧！'][Math.floor(Math.random() * 3)], 1.6, '#c8ffd8');
  else if (sk.good === 0) setTimeout(() => say(h, ['咦？怎麼攻擊都沒有用……', '可惡，打不痛牠！', '要用防治的方法才行……'][Math.floor(Math.random() * 3)], 1.8), 400); B.hurt = now; G.shake = crit ? 7 : sk.good === 1 ? 4 : 2;
  const hx = B.x + 40 * B.sc, hy = B.y - 90 * B.sc; fx(sk.fx || 'crit', hx, hy + 40 * B.sc, 1.5 * B.sc, { add: sk.fx === 'geyser' ? false : true, on: B }); fx('hitflash', hx, hy, 1.6 * B.sc, { add: true, on: B });
  if (crit) { fx('crit', hx, hy + 20, 2 * B.sc, { on: B }); fx('sunburst', hx, hy, 2.2 * B.sc, { add: true, on: B }); }
  snd(sk.snd || 'smash', .85); setTimeout(() => snd(crit ? 'smash' : 'hit', .8), 80);
  num(String(dmg), hx, hy - 10, crit ? '#ffe040' : '#fff', crit ? 1.8 : 1.2);
  if (crit) { num('擊中要害！', hx, hy - 40, '#ff6060', 1.2); msg('擊中要害！' + (word ? '　' + word : ''), '#ff8080', 1.6); } else if (word) { num(word, hx, hy - 34, col, 1); msg(word, col, 1.4); }
  if (sk.good === 0 && !crit) setTimeout(() => msg('要用「防治登革熱」的招式才有效！', '#ffd0a0', 1.6), 700);
}
function itemAct(h, it) { G.busy = { who: h.id, h, t: now, end: now + 1.6, side: .3, step: e => { h.anim = 'c0'; }, done: () => finish(h) };
  if (!it.ok) { msg('✖ 不可以！疑似登革熱不能自行吃阿斯匹靈或消炎止痛藥，可能會加重出血！', '#ff9090', 3.2); snd('hurt', .6); h.cur = Math.max(1, h.cur - 200); h.hurt = now; num('-200', h.x, h.y - 80 * h.sc, '#ff6060'); return; }
  snd('heal', .8); if (it.n === '就醫檢查') { G.heroes.forEach(x => { if (x.ko) return; x.cur = Math.min(x.hp, x.cur + 600); x.fever = 0; fx('heal', x.x, x.y, x.sc, { on: x }); num('+600', x.x, x.y - 80 * x.sc, '#80ff90'); }); msg('效果絕佳！盡速就醫、多休息多喝水！全體回復、退燒', '#80ff90', 2.4); G.gem = Math.min(4, G.gem + 1); }
  else { const tg = G.heroes.filter(x => !x.ko).sort((a, b) => a.cur / a.hp - b.cur / b.hp)[0]; tg.cur = Math.min(tg.hp, tg.cur + 500); fx('bloom', tg.x, tg.y, tg.sc, { on: tg }); num('+500', tg.x, tg.y - 80 * tg.sc, '#80ff90'); msg(tg.name + ' 回復了！', '#80ff90'); }
}
// ---------- 魔王行動 ----------
function bossAct() { const B = G.boss, al = alive(); if (!al.length) return; B.atb = 0; G.bossTurn++;
  if (G.bossTurn >= G.nextSummon && !G.minis.some(m => !m.dead)) { G.nextSummon = G.bossTurn + G.summonGap; G.summonGap = Math.min(5, G.summonGap + 1); return summonMinis(); } const sonic = Math.random() < .4; let tgt = al[Math.floor(Math.random() * al.length)];
  // 中央山脈超人掩護：被攻擊的人血量低於 30%，就衝過去擋下
  const M = G.heroes.find(x => x.id === 'M'); let cover = null;
  if (!sonic && M && !M.ko && tgt !== M && tgt.cur < tgt.hp * .3 && M.cur > M.hp * .15) { cover = tgt; tgt = M; say(M, '我來幫你擋下攻擊！', 2.2, '#a8ffd8'); setTimeout(() => say(cover, '超人……謝謝你！', 1.6), 900); }
  snd('roar', .6); msg(sonic ? '超級大蚊子王：超音波嗡嗡波！' : '超級大蚊子王：吸血叮咬！', '#ff9090', 1.6);
  G.busy = { who: 'boss', t: now, end: now + 1.8, hitDone: false,
    step: e => { if (cover) { const k = Math.min(clamp(e / .35), clamp((1.8 - e) / .3)); M.off = (M.x - cover.x + 26 * cover.sc) * ease(k); M.hop = (M.y - cover.y) * ease(k); M.anim = k < 1 && e < .4 ? 'r' + (Math.floor(e * 16) % 8) : 'stand'; if (e > 1.75) { M.off = 0; M.hop = 0; M.anim = null; } }
      B.lunge = sonic ? 0 : Math.sin(clamp((e - .2) / 1.0) * Math.PI) * ((cover || tgt).x - B.x) * .45; if (sonic && e > .3 && e < 1.1) fx('emp', B.x + 60 * B.sc, B.y - 80 * B.sc, 1.6 * B.sc, { add: true, on: B });
      if (!G.busy.hitDone && e >= .7) { G.busy.hitDone = true; const list = sonic ? al : [tgt]; const red = (G.shield > 0 ? .3 : 1) * (cover ? .6 : 1); if (G.shield > 0) G.shield--;
        list.forEach(h => { const d = Math.round((sonic ? rnd(320, 520) : rnd(640, 920)) * red * (B.hp < B.max * .3 ? 1.3 : 1)); const was = h.cur; h.cur -= d; h.hurt = now; const hx = h.x - (h.off || 0), hy = h.y - (h.hop || 0); num(String(d), hx, hy - 80 * h.sc, '#ffb0b0');
          fx(sonic ? 'thunder' : cover ? 'block' : 'claw', hx, hy - 30 * h.sc, h.sc, { flip: true, on: h }); if (!sonic && !cover && Math.random() < .6) { h.fever = 1; setTimeout(() => msg(h.name + ' 被叮了！發燒、頭痛……快用「就醫檢查」！', '#ffb0b0', 2.4), 500); }
          if (h.cur > 0 && h.cur < h.hp * .3 && was >= h.hp * .3) setTimeout(() => say(h, ['我、我不行了……', '好痛……快撐不住了……', '頭好暈……'][Math.floor(Math.random() * 3)], 2), 600);
          else if (h.cur > 0 && h.cur < h.hp * .5 && was >= h.hp * .5) setTimeout(() => say(h, ['可惡……這次的蚊子好強！', '好癢……可惡！', '怎麼辦……'][Math.floor(Math.random() * 3)], 2), 600);
          if (h.cur <= 0) { h.cur = 0; h.ko = true; h.atb = 0; G.queue = G.queue.filter(x => x !== h); koRage(h); } });
        snd(red < 1 ? 'block' : 'hurt', .85); if (sonic) snd('wind', .5); G.shake = 4; if (cover) msg('中央山脈超人挺身擋下了攻擊！', '#a8ffd8', 1.6); else if (red < 1) msg('防蚊護盾擋下了大部分傷害！', '#90ffe0', 1.4); } },
    done: () => { B.lunge = 0; if (cover) { M.off = 0; M.hop = 0; M.anim = null; } } };
}
// ---------- 召喚紅綠燈王：光柱 → Grok 覺醒特寫 → 地底升起 → Grok 三色光線 → 9999 ----------
const VID = {}; function vid(k, src) { if (!VID[k]) { const v = document.createElement('video'); v.src = (window.MEDIA && MEDIA[src]) || src; v.__src = src; v.muted = true; v.preload = 'auto'; v.playsInline = true; VID[k] = v; } return VID[k]; }
vid('close', 'grok_close.mp4'); vid('atk', 'grok_attack.mp4');
const SUM = { CLOSE: [1.1, 3.7], RISE: 3.7, ATK: [5.0, 7.3], BOOM: 7.3, END: 8.9 };
function playVid(k, from, rate) { const v = VID[k]; try { v.currentTime = from; v.playbackRate = rate; v.play().catch(() => {}); } catch (e) {} }
function summon(h) { G.gem = 0; G.summon = { t: now }; finish(h); msg('召喚．紅綠燈王！　大家化為光芒──', '#ffe680', 1.2); snd('awaken', .8);
  G.busy = { who: h.id, h, t: now, end: now + SUM.END, side: .3, step: () => {}, done: () => { G.summon = null; } };
  setTimeout(() => { playVid('close', .3, 1.8); msg('紅綠燈王，覺醒！', '#ffffff', 2.6); }, SUM.CLOSE[0] * 1000);
  setTimeout(() => { snd('appear2', .9); msg('召喚獸「紅綠燈王」從地底現身！', '#ffffff', 1.3); }, SUM.RISE * 1000);
  setTimeout(() => { playVid('atk', .3, 2.05); snd('beam', .95); msg('紅、黃、綠──三色光線，發射！', '#ffe680', 2.3); }, SUM.ATK[0] * 1000);
  setTimeout(() => { const B = G.boss; B.hp -= 9999; B.hurt = now; G.shake = 9; snd('boom', .9); fx('bigboom', B.x, B.y, 1.4 * B.sc, { on: B }); num('9999', B.x + 30 * B.sc, B.y - 120 * B.sc, '#ffe040', 2.4); }, SUM.BOOM * 1000); }
function summonDraw() { const e = now - G.summon.t, p = GL3D.project(140, 0, 30), sc = p.s * 760, RH = 215 * sc, rx = p.x, ry = p.y;
  if (e < SUM.END - .4) { const k = Math.min(clamp(e / .5), clamp((SUM.END - .4 - e) / .5)); X.save(); X.translate(rx * KS, ry * KS); X.scale(1, .3); X.globalCompositeOperation = 'lighter';
    [['#ff4030', 1], ['#ffd020', .8], ['#40ff60', .6]].forEach(([c, s]) => { X.strokeStyle = c; X.globalAlpha = k; X.lineWidth = 3 * KS; X.beginPath(); X.arc(0, 0, 120 * sc * s * KS, 0, 7); X.stroke(); }); X.restore(); }
  if (e > .3 && e < 1.2) G.heroes.forEach((h, i) => { for (let j = 0; j < 8; j++) { const q = clamp((e - .3 - i * .06) * 1.6 - hash(j + i * 9) * .2); if (q <= 0 || q >= 1) continue; glow(lerp(h.x, rx, ease(q)), lerp(h.y - 40 * h.sc, ry, ease(q)) - Math.sin(q * Math.PI) * 30, 5, h.col, 1 - q * .5); } });
  if (e > .6 && e < SUM.RISE) { const k = clamp((e - .6) / .5); X.save(); X.globalCompositeOperation = 'lighter'; const gg = X.createLinearGradient((rx - 40) * KS, 0, (rx + 40) * KS, 0); gg.addColorStop(0, 'rgba(255,200,240,0)'); gg.addColorStop(.5, `rgba(255,235,250,${.7 * k})`); gg.addColorStop(1, 'rgba(255,200,240,0)'); X.fillStyle = gg; X.fillRect((rx - 40) * KS, 0, 80 * KS, ry * KS); X.restore(); }
  // 地底升起，之後站在魔法陣上
  if (e > SUM.RISE && e < SUM.END - .3 && A.robot) { const k = ease(clamp((e - SUM.RISE) / .9)), img = k < 1 ? A.robot : A.robot_fire, w = RH * img.width / img.height, out = clamp((e - (SUM.END - .7)) / .4);
    X.save(); X.beginPath(); X.rect(0, 0, W * KS, (ry + 2) * KS); X.clip(); X.globalAlpha = 1 - out; X.drawImage(img, (rx - w / 2 + (k < 1 ? Math.sin(now * 60) * 2 : 0)) * KS, (ry - RH + (1 - k) * RH) * KS, w * KS, RH * KS); X.restore();
    if (k < 1) { pfx('slam', e - SUM.RISE, rx, ry, 1.4 * sc / .9); for (let j = 0; j < 18; j++) { const q = ((e - SUM.RISE) * 1.6 + hash(j)) % 1; X.fillStyle = j % 2 ? '#8a6a50' : '#c0a080'; X.fillRect((rx + (hash(j + 2) - .5) * RH * .9 * q) * KS, (ry - q * 60 + q * q * 70) * KS, 3 * KS, 3 * KS); } }
    if (k >= 1) { const L = [[.276, .264, '#ff3a2a'], [.276, .411, '#ffd21e'], [.27, .558, '#3aff5a']]; L.forEach(([fx2, fy, c]) => glow(rx - w / 2 + fx2 * w, ry - RH + fy * RH, 15 + Math.sin(now * 20) * 3, c, 1 - out)); } }
  // Grok 動畫：全畫面
  const drawV = (k, [a, b]) => { if (e < a || e > b) return; const v = VID[k]; if (!v || v.readyState < 2) return; const f = Math.min(clamp((e - a) / .2), clamp((b - e) / .2)); X.save(); X.globalAlpha = f; X.drawImage(v, 0, 0, W * KS, H * KS); X.restore(); };
  const vOK = k => VID[k] && VID[k].readyState >= 2;
  if (!vOK('atk') && e > SUM.ATK[0] && e < SUM.ATK[1] && A.robot_fire) { const w = RH * A.robot_fire.width / A.robot_fire.height, B = G.boss, L = [[.276, .264, '#ff3a2a'], [.276, .411, '#ffd21e'], [.27, .558, '#3aff5a']];
    L.forEach(([fx2, fy, c], i) => { const lx = rx - w / 2 + fx2 * w, ly = ry - RH + fy * RH, tx = B.x + 30 * B.sc, ty = B.y - (130 - i * 30) * B.sc, kk = clamp((e - SUM.ATK[0] - i * .12) / .3); glow(lx, ly, 26, c, 1);
      X.save(); X.globalCompositeOperation = 'lighter'; X.lineCap = 'round'; for (const [lw, cc] of [[26, c], [13, c], [6, '#fff']]) { X.strokeStyle = cc; X.globalAlpha = lw > 13 ? .35 : 1; X.lineWidth = (lw + Math.sin(now * 60) * 2) * KS; X.beginPath(); X.moveTo(lx * KS, ly * KS); X.lineTo(lerp(lx, tx, kk) * KS, lerp(ly, ty, kk) * KS); X.stroke(); } X.restore();
      if (kk >= 1) glow(tx, ty, 40 + Math.sin(now * 30) * 8, c, .9); }); }
  if (!vOK('close') && e > SUM.CLOSE[0] && e < SUM.CLOSE[1] && A.robot_fire) { const k = clamp((e - SUM.CLOSE[0]) / (SUM.CLOSE[1] - SUM.CLOSE[0])), img = A.robot_fire, h = H * (1.5 + .3 * k), w = h * img.width / img.height;
    X.save(); X.fillStyle = 'rgba(40,0,40,.85)'; X.fillRect(0, 0, W * KS, H * KS); X.globalCompositeOperation = 'lighter'; const gg = X.createRadialGradient(W / 2 * KS, H / 2 * KS, 0, W / 2 * KS, H / 2 * KS, 300 * KS); gg.addColorStop(0, 'rgba(255,180,240,.8)'); gg.addColorStop(1, 'rgba(255,80,200,0)'); X.fillStyle = gg; X.fillRect(0, 0, W * KS, H * KS); X.globalCompositeOperation = 'source-over';
    X.drawImage(img, (W / 2 - w / 2) * KS, (H * .15 - k * H * .5) * KS, w * KS, h * KS); X.restore(); for (let j = 0; j < 30; j++) { const q = (e * .8 + hash(j)) % 1; glow(hash(j + 3) * W, H - q * H, 3, '#ffc8f0', 1 - q); } }
  drawV('close', SUM.CLOSE); drawV('atk', SUM.ATK);
}// ---------- 結果 ----------
function resultDraw() { const e = now - G.end;
  if (G.result === 'win') { if (e < 1.6) return; const k = ease(clamp((e - 1.6) / .4)), img = A.victory_logo;
    if (e < 9) { if (img) { const w = 300 * (k < 1 ? lerp(1.8, 1, k) : 1), h = w * img.height / img.width; X.save(); X.globalAlpha = k; X.drawImage(img, (320 - w / 2) * KS, (70 - h / 2) * KS, w * KS, h * KS); X.restore(); }
      for (let i = 0; i < 4; i++) pfx('firework', (e - 1.8 - i * .4) % 3, 120 + i * 130, 160 - (i % 2) * 40, 1, { add: true });
      panel(16, 262, 300, 88, .9, '#ffd86e'); const n = G.found.size, alive2 = alive().length;
      T(HINT.next, 310, 336, { size: 9, align: 'right', color: '#ffe680', alpha: .5 + .5 * Math.sin(now * 4) });
      [`獲得經驗值　${2000 + n * 250}`, `清除孳生源 ${n} / ${SPOTS.length}　存活 ${alive2} 人`, '獲得道具：乾淨健康的社區'].forEach((s, i) => { if (e > 2 + i * .4) T(s, 30, 272 + i * 24, { size: 13.5, color: i === 2 ? '#ffe060' : '#fff' }); }); }
    else card(e - 9);
  } else { X.save(); X.fillStyle = `rgba(20,0,10,${clamp(e / 1.2) * .7})`; X.fillRect(0, 0, W * KS, H * KS); X.restore();
    if (e > 1) { T('GAME OVER', 320, 120, { size: 40, align: 'center', color: '#ff6070', stroke: 5 }); T('蚊子王太強了……先回巷子把孳生源清乾淨再來挑戰吧！', 320, 180, { size: 14, align: 'center' }); T('Enter：重新開始', 320, 220, { size: 12, align: 'center', color: '#ffe060' }); } }
  if (G.result === 'win' && e > 2.2 && e < 9 && pressed.some(k => hit([k], 'Enter', ' ', 'Escape'))) { G.end = now - 9; selectS(); pressed.length = 0; }
  for (const k of pressed) if (hit([k], 'Enter', ' ') && (G.result === 'lose' ? e > 1 : e > 10)) { selectS(); go('title'); music('music_victory.m4a', .35, 22); }
}
function card(e) { if (A.card) X.drawImage(A.card, 0, 0, W * KS, H * KS);
  for (let i = 0; i < 6; i++) pfx('confetti', (e + i * .55) % 3.2, [70, 570, 40, 600, 110, 530][i], [290, 290, 120, 120, 200, 200][i], 1.2, { dur: 3.2 });
  [['run', 40, 'c'], ['bunny', 92, 'c'], ['teacher', 548, 'c'], ['mountain', 600, 'c']].forEach(([k, x], i) => { const S = A.spr[k]; if (!S) return; const cyc = k === 'teacher' ? ['c0', 'stand'] : ['c0', 'c1']; spr(S[cyc[Math.floor(now * 4 + i) % 2]] || S.stand, x, 352 - Math.abs(Math.sin(now * 5 + i * .9)) * 12, 1.05, { flip: x > 320 }); }); const px = 132, pw = 376; X.save(); X.globalAlpha = .9; X.fillStyle = 'rgba(20,40,150,.88)'; X.beginPath(); X.roundRect(px * KS, 18 * KS, pw * KS, 324 * KS, 10 * KS); X.fill(); X.strokeStyle = '#ffe9a8'; X.lineWidth = 2 * KS; X.stroke(); X.restore();
  T('登革熱防治口訣', 320, 28, { size: 26, align: 'center', color: '#ffe060', stroke: 4, sc: '#3a1a00' });
  [['巡', '巡視居家內外，找出積水容器'], ['倒', '倒掉積水，不讓蚊子產卵'], ['清', '清除不用的瓶罐、廢輪胎'], ['刷', '刷洗容器內壁，去除蟲卵']].forEach(([c, s], i) => { const y = 72 + i * 38; X.save(); X.fillStyle = '#c8203a'; X.beginPath(); X.roundRect((px + 22) * KS, y * KS, 34 * KS, 32 * KS, 6 * KS); X.fill(); X.restore(); T(c, px + 39, y + 4, { size: 21, align: 'center' }); T(s, px + 66, y + 7, { size: 17.5 }); });
  T('出現發燒、頭痛、後眼窩痛、肌肉關節痛、出疹\n→ 請盡速就醫，並主動告知旅遊史！', 320, 234, { size: 13.5, align: 'center', color: '#ffc0c0' });
  T('外出穿淺色長袖衣褲、噴防蚊液\n清除積水，人人有責！', 320, 290, { size: 14, align: 'center', color: '#a8ffd8' });
  if (e > 1) T('Enter：回到標題', 620, 344, { size: 10, align: 'right', color: '#fff', alpha: .5 + .5 * Math.sin(now * 4) }); }

// ---------- 主迴圈 ----------
function frame(t) { const dt = Math.min(.05, (t - last) / 1000); last = t; now += dt;
  X.setTransform(1, 0, 0, 1, 0, 0); X.fillStyle = '#05061a'; X.fillRect(0, 0, C.width, C.height); X.imageSmoothingEnabled = true;
  if (scene === 'title') title(dt); else if (scene === 'map') map(dt); else battle(dt);
  if (now - st < .4) { X.fillStyle = `rgba(0,0,0,${1 - (now - st) / .4})`; X.fillRect(0, 0, C.width, C.height); }
  pressed.length = 0; click = null; requestAnimationFrame(frame); }
window.__game = { G, go, startBattle, newGame, get scene() { return scene; } };
A.battleReady = !window.BATTLE_PACKS;
loadAll().then(() => { document.getElementById('load').remove(); newGame(); requestAnimationFrame(frame);
  if (window.BATTLE_PACKS) (async () => { for (const s of BATTLE_PACKS) await new Promise(r => { const e = document.createElement('script'); e.src = s; e.onload = r; e.onerror = r; document.head.appendChild(e); }); await loadAll(); A.battleReady = true; for (const v of Object.values(VID)) if (window.MEDIA && MEDIA[v.__src] && v.src !== MEDIA[v.__src]) v.src = MEDIA[v.__src]; preloadSfx(); if (BGM) bgmApply(); })(); });
})();
