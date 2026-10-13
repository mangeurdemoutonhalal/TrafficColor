/* =========================================================================
   script.js — Moteur de jeu & interface de Traffic Color Sort
   -------------------------------------------------------------------------
   Dépend de levels.js (Levels), economy.js (Economy) et seasons.js (Seasons),
   chargés AVANT ce fichier (voir index.html).
   Sommaire :
     1. Véhicules (dessin SVG)         5. Écrans : classement, boutique, profil…
     2. Audio ASMR + musique           6. Moteur de jeu : règles, affichage, glisser
     3. Interface : toasts, fenêtres   7. Déroulé d'un niveau, victoire, défaite
     4. En-tête & navigation           8. Effets, boutons, démarrage
   ========================================================================= */
const $ = id => document.getElementById(id);
const app = $('app');

/* Vérification des liaisons : si un fichier manque, on l'affiche clairement. */
(function checkModules() {
  const miss = [];
  if (typeof Levels === 'undefined') miss.push('levels.js');
  if (typeof Economy === 'undefined') miss.push('economy.js');
  if (typeof Seasons === 'undefined') miss.push('seasons.js');
  if (miss.length) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99999;background:#c00;color:#fff;padding:10px;font:13px monospace';
    d.textContent = 'Fichier(s) manquant(s) ou mal chargé(s) : ' + miss.join(', ');
    document.body.appendChild(d);
    throw new Error('Modules manquants : ' + miss.join(', '));
  }
})();
window.addEventListener('error', e => {                             // toute erreur JS est affichée à l'écran
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#c00;color:#fff;padding:8px;font:12px monospace';
  d.textContent = 'Erreur JS : ' + e.message + ' (' + (e.filename || '').split('/').pop() + ':' + e.lineno + ')';
  document.body.appendChild(d);
});

const { TYPES, CN, RANKS, RCOL, MECHS, fmtT } = Levels;
const TOTAL = Levels.total;
const E = Economy;
const ST = () => Economy.state();

/* ---------- 2. COULEURS & DESSIN DES VÉHICULES ---------- */
const COL = { red: '#ff2a44', blue: '#18c8ff', yellow: '#ffe52e', green: '#2ee85a', purple: '#9a3dff', orange: '#ff8a14' };
const LEN = { car: 120, van: 180, truck: 180, bus: 240 };
const WHEELS = { car: [22, 84], van: [24, 138], truck: [16, 102, 130], bus: [28, 184] };
const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; };
const sh = (h, f) => 'rgb(' + rgb(h).map(v => Math.min(255, Math.round(v * f))).join(',') + ')';
const mx = (h, t) => 'rgb(' + rgb(h).map(v => Math.round(v + (255 - v) * t)).join(',') + ')';

$('defs').innerHTML = Object.entries(COL).map(([k, c]) =>
  `<linearGradient id="g-${k}" x1="0" y1="0" x2="0" y2="1">
     <stop offset="0" stop-color="${mx(c, .3)}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${sh(c, .78)}"/>
   </linearGradient>`).join('');

const GLASS = '#26376a';
const R = (x, y, w, h, r, f, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${f}" ${extra}/>`;
const glass = p => `<polygon points="${p}" fill="${GLASS}" stroke="${GLASS}" stroke-width="4" stroke-linejoin="round"/><polygon points="${p}" fill="#7fb2ff" opacity=".2"/>`;
const hl = (x, y, w) => R(x, y, w, 5, 2.5, '#fff', 'opacity=".3"');
const lamps = (L, y1, y2) => R(5, y1, 5, 9, 2.5, '#fff6c8') + R(5, y2, 5, 9, 2.5, '#fff6c8') + R(L - 10, y1, 5, 9, 2.5, '#ff3b3b') + R(L - 10, y2, 5, 9, 2.5, '#ff3b3b');
const ribs = (xs, dk) => xs.map(x => `<line x1="${x}" y1="14" x2="${x}" y2="46" stroke="${dk}" stroke-width="2.5" stroke-linecap="round"/>`).join('');

function vehicleSVG(t, colName) {
  const c = COL[colName], L = LEN[t], g = `url(#g-${colName})`, roof = mx(c, .16), dk = sh(c, .8);
  let s = R(5, 12, L - 8, 46, 20, '#000', 'opacity=".25"');
  WHEELS[t].forEach(x => s += R(x, 2, 18, 10, 4, '#151a30') + R(x, 48, 18, 10, 4, '#151a30'));
  if (t === 'car')
    s += R(4, 7, L - 8, 46, 20, g) + hl(16, 10, L - 32) + glass('40,14 54,17 54,43 40,46') + R(54, 13, 42, 34, 9, roof) +
         glass('97,17 107,15 107,45 97,43') + lamps(L, 13, 38);
  if (t === 'van')
    s += R(4, 7, L - 8, 46, 16, g) + hl(16, 10, L - 32) + glass('34,14 52,17 52,43 34,46') + R(52, 11, 118, 38, 8, roof) +
         ribs([82, 112, 142], dk) + lamps(L, 13, 38);
  if (t === 'truck')
    s += R(56, 18, 20, 24, 3, '#252c4a') + R(4, 8, 58, 44, 14, g) + hl(14, 11, 40) + glass('18,14 32,17 32,43 18,46') +
         R(32, 13, 26, 34, 7, roof) + R(5, 13, 5, 9, 2.5, '#fff6c8') + R(5, 38, 5, 9, 2.5, '#fff6c8') +
         R(66, 5, L - 70, 50, 8, g) + hl(72, 8, L - 82) + R(72, 12, L - 82, 36, 5, roof) + ribs([96, 118, 140], dk) +
         R(L - 10, 13, 5, 9, 2.5, '#ff3b3b') + R(L - 10, 38, 5, 9, 2.5, '#ff3b3b');
  if (t === 'bus')
    s += R(4, 6, L - 8, 48, 16, g) + hl(14, 8, L - 28) + glass('10,12 26,15 26,45 10,48') + R(26, 10, 198, 40, 10, roof) +
         R(34, 12, 182, 4, 2, GLASS, 'opacity=".85"') + R(34, 44, 182, 4, 2, GLASS, 'opacity=".85"') +
         [44, 76, 168, 200].map(x => R(x, 24, 20, 12, 4, dk)).join('') + glass('228,15 236,13 236,47 228,45') + lamps(L, 11, 40);
  return s;
}
const miniVeh = (t, col) => `<svg viewBox="0 0 ${LEN[t]} 60">${vehicleSVG(t, col)}</svg>`;

/* ---------- 2b. AUDIO ASMR (Web Audio API : synthétiseur natif, aucun fichier externe) ----------
   Le navigateur n'autorise le son qu'après un 1er toucher : unlock() est appelé au premier appui. */
const SFX = (() => {
  let ctx = null, master = null, noiseBuf = null, combo = 0, comboT = 0;
  const on = () => ST().settings.sound !== false;
  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = .55;
    const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  function unlock() { const c = init(); if (c && c.state === 'suspended') c.resume(); }
  function tone(type, f0, f1, t0, dur, vol) {                         // oscillateur + glissando + enveloppe douce
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t0); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .008); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + .05);
  }
  function noise(t0, dur, f0, f1, q, vol) {                           // souffle filtré = "swoosh" ASMR
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + dur * .3); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t0); s.stop(t0 + dur + .05);
  }
  const run = fn => { if (!on()) return; const c = init(); if (!c) return; if (c.state === 'suspended') c.resume(); try { fn(c.currentTime); } catch (e) {} };
  const N = semi => 523.25 * Math.pow(2, semi / 12);                  // do5 + demi-tons
  /* Musique d'ambiance : notes douces d'une gamme pentatonique + basse lente, générées en direct */
  let musicTimer = null, mStep = 0;
  const PENTA = [0, 2, 4, 7, 9, 12, 14], BASS = [0, -3, -5, -7];
  function musicTick() {
    if (!ctx || ctx.state !== 'running' || document.hidden || !ST().settings.music) return;
    const t = ctx.currentTime + .05, n = N(PENTA[(Math.random() * PENTA.length) | 0] - 12);
    tone('sine', n, n, t, 1.6, .05);
    if (mStep % 4 === 0) { const b = N(BASS[(mStep / 4 | 0) % 4] - 24); tone('triangle', b, b, t, 2.2, .07); }
    mStep++;
  }
  function music(on) { clearInterval(musicTimer); musicTimer = null; if (on && init()) { unlock(); musicTimer = setInterval(musicTick, 520); } }
  return {
    unlock, music,
    click: () => run(t => { tone('triangle', 900, 600, t, .05, .18); tone('sine', 1800, 1200, t, .03, .06); }),
    grab: () => run(t => tone('sine', 300, 380, t, .06, .08)),
    slide: (d = 1) => run(t => { const dur = .16 + Math.min(d, 4) * .04; noise(t, dur, 500, 1700, 2.2, .16); tone('sine', 190, 300 + d * 30, t, dur, .06); }),
    pop: () => run(t => {                                              // pop cristallin, de plus en plus aigu en enchaînant les sorties
      const now = performance.now(); combo = now - comboT < 1500 ? Math.min(combo + 1, 7) : 0; comboT = now;
      const base = N([0, 2, 4, 7, 9, 12, 14, 16][combo]);
      tone('sine', base * 2, base * 2.02, t, .45, .22); tone('sine', base * 3, base * 3, t + .015, .35, .12); tone('triangle', base * 4.01, base * 4, t + .03, .25, .06);
      noise(t, .06, 4000, 9000, 1, .08);
    }),
    ping: () => run(t => { tone('sine', N(19), N(19), t, .3, .12); tone('sine', N(24), N(24), t + .08, .3, .1); }),
    unlock: () => run(t => { tone('triangle', N(7), N(12), t, .12, .15); tone('triangle', N(12), N(16), t + .1, .2, .15); }),
    coin: () => run(t => { tone('square', N(19), N(19), t, .06, .08); tone('square', N(24), N(24), t + .07, .25, .08); }),
    tick: () => run(t => tone('square', 1200, 1200, t, .04, .07)),
    lose: () => run(t => {
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 700;
      o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(90, t + .8);
      g.gain.setValueAtTime(.2, t); g.gain.exponentialRampToValueAtTime(.0001, t + .85);
      o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + .9); tone('sine', 110, 55, t, .5, .25);
    }),
    win: (stars = 1) => run(t => {                                     // fanfare : plus il y a d'étoiles, plus elle est longue
      const seq = [0, 4, 7, 12, 16, 19, 24].slice(0, 4 + stars);
      seq.forEach((n, i) => { const tt = t + i * .11; tone('triangle', N(n), N(n), tt, .35, .2); tone('sine', N(n) * 2, N(n) * 2, tt, .3, .08); });
      const e = t + seq.length * .11 + .05; [0, 4, 7, 12].forEach(n => tone('triangle', N(n + 12), N(n + 12), e, .9, .12));
      for (let i = 0; i < 8; i++) tone('sine', 2000 + Math.random() * 3000, 3000 + Math.random() * 3000, e + i * .07, .2, .05);
    })
  };
})();

/* ---------- 3. INTERFACE : toasts, vibrations, fenêtres (modales) ---------- */
let toastT;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2000);
}
const vib = ms => { if (ST().settings.haptics && navigator.vibrate) navigator.vibrate(ms); };
const clock = ms => {                                               // 754000 -> "12:34"
  const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
};

/* Une seule fenêtre à la fois. Ouvrir une fenêtre pendant une partie met le chrono en pause. */
const Modal = (() => {
  const box = $('modal'); let resume = false;
  function open(html, cls = '') {
    box.className = ''; box.innerHTML = `<div class="mcard ${cls}">${html}</div>`;
    if (gstate === 'playing') { gstate = 'paused'; resume = true; }
    return box.firstChild;
  }
  function close() {
    box.className = 'hidden'; box.innerHTML = '';
    if (resume) { resume = false; if (gstate === 'paused') { gstate = 'playing'; tLast = performance.now(); } }
  }
  return { open, close };
})();
/* Relie les éléments data-id="x" d'une fenêtre à des fonctions. */
const bind = (root, map) => Object.keys(map).forEach(id => { const el = root.querySelector(`[data-id="${id}"]`); if (el) el.onclick = map[id]; });

/* ---------- 4. EN-TÊTE PERMANENT & NAVIGATION ---------- */
const AV = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];   // couleurs du véhicule-avatar
function refreshHud() {
  const s = ST(), unl = E.isUnlimited();
  $('bills').textContent = s.bills;
  $('lives').textContent = unl ? '♾️' : s.lives;
  $('lifeT').textContent = unl ? clock(E.unlimitedLeft()) : (s.lives >= E.MAX_LIVES ? '' : clock(E.timeToNextLife()));
  $('streak').textContent = s.streak; $('chipStreak').classList.toggle('hot', s.streak >= 3);
  $('avLvl').textContent = Math.min(s.level, TOTAL);
  const art = $('avatarArt'), col = AV[s.avatar % 6];
  if (art.dataset.c !== col) { art.dataset.c = col; art.innerHTML = miniVeh('car', col); }
  $('cntHint').textContent = s.hints; $('cntUndo').textContent = s.undos;
  const lc = $('lifeClock'); if (lc) lc.textContent = E.canPlay() ? 'Prête !' : clock(E.timeToNextLife());
  const ad = $('adBtnTxt'); if (ad) ad.textContent = E.adBonusReady() ? '📺 +50 💵' : '⏳ ' + clock(E.adBonusWait());
}
E.onChange(refreshHud);

let current = 'home';
function show(id) {
  if (id !== 'game') { gstate = 'idle'; clearInterval(tTimer); closeOverlays(); }
  current = id; app.dataset.s = id;
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  if (id === 'home') renderRoad();
  if (id === 'ranking') renderRanking();
  if (id === 'shop') renderShop();
  refreshHud();
}
document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) show(g.dataset.go); });

/* ---------- 5. ÉCRANS ---------- */
/* -- Accueil : route des saisons -- */
function doorMsg(n) {
  const lvl = ST().level;
  if (n > lvl) return `🔒 Termine d'abord le niveau ${lvl}`;
  const s = Seasons.seasonOf(n) - 1;
  return `🚪 Porte fermée : il te faut ${Seasons.need(s)} ⭐ (75 %) dans la saison ${s + 1}`;
}
function renderRoad() {
  Seasons.render($('road'), (n, ok) => ok ? openPreview(n) : toast(doorMsg(n)));
  const n = Math.min(ST().level, TOTAL);
  $('playFab').textContent = '▶ NIVEAU ' + n;
}
$('playFab').onclick = () => { const n = Math.min(ST().level, TOTAL); Seasons.playable(n) ? startLevel(n) : toast(doorMsg(n)); };

function openPreview(n) {
  const L = Levels.get(n), b = ST().best[n], st = b ? b.stars : 0;
  const c = Modal.open(`<div class="pv-rank" style="--rc:${RCOL[L.rank]}">${RANKS[L.rank]}</div><h3>Niveau ${n}</h3>
    <div class="stars">${[1, 2, 3].map(i => i <= st ? '⭐' : '☆').join('')}</div>
    <p>⏱ Temps cible : ${fmtT(L.est * .8)} – ${fmtT(L.est * 1.2)}<br>🎯 Coups minimum : ${L.par} (maximum ${L.quota})</p>
    <div style="font-size:26px;margin-bottom:4px">${L.mechs.map(id => MECHS.find(m => m.id === id).icon).join(' ')}</div>
    <button class="play small press" data-id="go">▶ JOUER</button><button class="play small alt press" data-id="close">FERMER</button>`);
  bind(c, { go: () => startLevel(n), close: Modal.close });
}

/* -- Classement fictif mais réaliste : le rang du joueur dépend de ses niveaux et de ses étoiles -- */
let rankScope = 'fr';
const rngSeed = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const FIRST = ['Lucas', 'Emma', 'Léa', 'Hugo', 'Chloé', 'Nathan', 'Manon', 'Louis', 'Camille', 'Jules', 'Inès', 'Adam', 'Zoé', 'Raphaël', 'Sarah', 'Tom', 'Lina', 'Noah', 'Jade', 'Mathis',
  'Eva', 'Théo', 'Alice', 'Enzo', 'Clara', 'Maxime', 'Anaïs', 'Yanis', 'Lola', 'Arthur', 'Kenji', 'Mia', 'Liam', 'Sofia', 'Mateo', 'Aiko', 'Olivia', 'Noor', 'Carlos', 'Elena'];
const TAGS = ['', '_77', 'Pro', 'FR', 'Drift', '_92', 'XL', '_TCS', '2k', 'Zen', '_75', 'Turbo'];
const FLAGS = ['🇫🇷', '🇺🇸', '🇧🇷', '🇯🇵', '🇩🇪', '🇪🇸', '🇮🇹', '🇬🇧', '🇨🇦', '🇰🇷', '🇲🇽', '🇮🇳', '🇹🇷', '🇵🇱'];
const POP = { fr: { N: 86400, K: 7000 }, world: { N: 1248000, K: 9000 } };
const myScore = () => E.levelsDone() * 100 + E.totalStars() * 25;
function myRank(scope) { const { N, K } = POP[scope]; return Math.max(1, Math.min(N, Math.round(1 + (N - 1) * Math.exp(-myScore() / K)))); }
function fakeAt(rank, scope) {
  const { N, K } = POP[scope], r = rngSeed(rank * 9973 + (scope === 'fr' ? 7 : 3));
  const score = Math.max(0, Math.round(-K * Math.log(rank / N))), levels = Math.min(TOTAL, Math.round(score / 160));
  return { rank, score, levels, stars: Math.min(levels * 3, Math.round(levels * 2.4)), name: FIRST[(r() * FIRST.length) | 0] + TAGS[(r() * TAGS.length) | 0],
    flag: scope === 'fr' ? '🇫🇷' : FLAGS[(r() * FLAGS.length) | 0] };
}
function renderRanking() {
  document.querySelectorAll('.lbtabs .tab').forEach(t => t.classList.toggle('on', t.dataset.scope === rankScope));
  const me = myRank(rankScope), rows = [];
  const row = p => `<div class="lrow ${p.me ? 'me' : ''}"><span class="rk2">${p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : '#' + p.rank.toLocaleString('fr-FR')}</span>
    <span class="av">${p.me ? '🚗' : p.flag}</span><span class="nm">${p.name}<small>Niv. ${p.levels} · ⭐ ${p.stars}</small></span><span class="sc">${p.score.toLocaleString('fr-FR')}</span></div>`;
  for (let r = 1; r <= 10; r++) if (r !== me) rows.push(row(fakeAt(r, rankScope)));
  const mine = { rank: me, score: myScore(), levels: E.levelsDone(), stars: E.totalStars(), name: 'Toi', me: true };
  if (me <= 10) rows.splice(me - 1, 0, row(mine));
  else { rows.push('<div class="lgap">• • •</div>'); [me - 1, me, me + 1].forEach(r => rows.push(r === me ? row(mine) : row(fakeAt(r, rankScope)))); }
  $('rankList').innerHTML = rows.join('');
}
document.querySelector('.lbtabs').onclick = e => { const t = e.target.closest('[data-scope]'); if (t) { rankScope = t.dataset.scope; renderRanking(); } };

/* -- Boutique : achats en billets 💵 -- */
function renderShop() {
  let h = `<div class="card wide free"><div class="pic">📺</div><h4>Billets gratuits</h4><p>Regarde une publicité (simulée)</p><button class="buy gold press" id="adBtn"><span id="adBtnTxt"></span></button></div>`;
  let grp = '';
  E.SHOP.forEach(it => {
    if (it.group !== grp) { grp = it.group; h += `<h3 class="gtitle">${it.group}</h3>`; }
    h += `<div class="card"><div class="pic">${it.icon}</div><h4>${it.name}</h4><p>${it.desc}</p><button class="buy press" data-buy="${it.id}">💵 ${it.price}</button></div>`;
  });
  $('shopBox').innerHTML = h; refreshHud();
}
$('shopBox').onclick = async e => {
  const b = e.target.closest('[data-buy]');
  if (b) {
    const r = E.buy(b.dataset.buy);
    if (r.ok) { SFX.coin(); vib(30); toast('✅ ' + r.item.name + ' acheté !'); confetti(16); }
    else toast('❌ Pas assez de billets 💵 — regarde une pub ou gagne des niveaux !');
    return;
  }
  if (e.target.closest('#adBtn')) {
    if (!E.adBonusReady()) return toast('⏳ Prochaine pub dans ' + clock(E.adBonusWait()));
    if (await E.watchAd('Gagne 50 billets !')) { E.claimAdBonus(); SFX.coin(); toast('💵 +50 !'); }
  }
};

/* -- Profil & statistiques -- */
function openProfile() {
  const s = ST(), st = s.stats, maxStars = TOTAL * 3;
  const c = Modal.open(`<h3>Profil &amp; Statistiques</h3>
    <div class="avbig" data-id="avpick">${miniVeh('car', AV[s.avatar % 6])}</div><small>Touche le véhicule pour en changer</small>
    <div class="stats">
      <div class="stat"><b>${st.played}</b><small>Parties jouées</small></div><div class="stat"><b>${st.won}</b><small>Parties gagnées</small></div>
      <div class="stat"><b>${E.winRate()} %</b><small>Taux de victoire</small></div><div class="stat"><b>${E.threeStarRate()} %</b><small>Taux de 3 étoiles ⭐</small></div>
      <div class="stat"><b>${Math.min(s.level, TOTAL)}</b><small>Niveau max atteint</small></div><div class="stat"><b>${E.totalStars()}/${maxStars}</b><small>Étoiles ⭐</small></div>
      <div class="stat"><b>${s.bestStreak} 🔥</b><small>Meilleure série</small></div><div class="stat"><b>${E.levelsDone()}</b><small>Niveaux terminés</small></div>
    </div><button class="play small press" data-id="close">FERMER</button>`);
  bind(c, { close: Modal.close, avpick: () => { s.avatar = (s.avatar + 1) % 6; E.save(); openProfile(); } });
}

/* -- Paramètres : son, musique, haptique, notifications -- */
function openSettings() {
  const s = ST().settings;
  const row = (k, icon, label) => `<label class="trow"><span>${icon} ${label}</span><input type="checkbox" data-set="${k}" ${s[k] ? 'checked' : ''}><i class="sw"></i></label>`;
  const c = Modal.open(`<h3>Paramètres</h3>${row('sound', '🔊', 'Son')}${row('music', '🎵', 'Musique')}${row('haptics', '📳', 'Haptique / Vibrations')}${row('notif', '🔔', 'Notifications')}
    <button class="play small alt press" data-id="reset">Réinitialiser la progression</button><button class="play small press" data-id="close">VALIDER</button>`);
  c.querySelectorAll('[data-set]').forEach(inp => inp.onchange = () => {
    const k = inp.dataset.set; ST().settings[k] = inp.checked; E.save(); SFX.click();
    if (k === 'music') SFX.music(inp.checked);
    if (k === 'haptics' && inp.checked) vib(40);
    if (k === 'notif' && inp.checked) {
      if (!window.Notification) { toast('Notifications non disponibles sur cet appareil'); inp.checked = false; ST().settings.notif = false; E.save(); }
      else if (Notification.permission === 'default') Notification.requestPermission().then(p => { if (p !== 'granted') { inp.checked = false; ST().settings.notif = false; E.save(); toast('Notifications refusées'); } });
      else if (Notification.permission === 'denied') { inp.checked = false; ST().settings.notif = false; E.save(); toast('Notifications bloquées dans le navigateur'); }
    }
  });
  bind(c, { close: Modal.close, reset: () => { if (confirm('Tout effacer : niveaux, billets, étoiles ?')) { E.resetAll(); Modal.close(); show('home'); toast('Progression réinitialisée'); } } });
}
$('avatarBtn').onclick = openProfile; $('gearBtn').onclick = openSettings;

/* -- Plus de vies / plus d'indices / cadeau quotidien -- */
function openNoLives(then) {
  const c = Modal.open(`<div class="boom">💔</div><h3>Plus de vies !</h3><p>Prochaine vie dans <b id="lifeClock"></b></p>
    <button class="play small gold press" data-id="ad">📺 +1 ❤️ (pub)</button><button class="play small press" data-id="bills">💵 60 → +1 ❤️</button>
    <button class="play small alt press" data-id="shop">🛒 BOUTIQUE</button><button class="play small alt press" data-id="close">FERMER</button>`);
  refreshHud();
  const got = () => { SFX.coin(); toast('❤️ +1 vie !'); Modal.close(); if (then) then(); };
  bind(c, { ad: async () => { if (await E.watchAd('Gagne une vie !')) { E.addLife(1); got(); } },
    bills: () => { if (E.spend(60)) { E.addLife(1); got(); } else toast('❌ Pas assez de billets 💵'); },
    shop: () => { Modal.close(); show('shop'); }, close: Modal.close });
}
function openNoItem(kind) {
  const hint = kind === 'hint', ico = hint ? '💡' : '↩️';
  const c = Modal.open(`<h3>Plus d'${hint ? 'indices' : 'annulations'} ${ico} !</h3><p>Regarde une publicité pour en gagner 1, ou passe par la boutique.</p>
    <button class="play small gold press" data-id="ad">📺 +1 ${ico} (pub)</button><button class="play small press" data-id="shop">🛒 BOUTIQUE</button><button class="play small alt press" data-id="close">FERMER</button>`);
  bind(c, { ad: async () => { if (await E.watchAd('Gagne 1 ' + (hint ? 'indice' : 'annulation') + ' !')) { hint ? E.addHints(1) : E.addUndos(1); SFX.coin(); toast('+1 ' + ico + ' !'); } Modal.close(); },
    shop: () => { Modal.close(); show('shop'); }, close: Modal.close });
}
function maybeDailyGift() {
  const today = new Date().toDateString();
  if (ST().daily === today) return;
  const c = Modal.open(`<div class="boom">🎁</div><h3>Cadeau quotidien !</h3><p>Reviens chaque jour : <b>+100 💵</b> et <b>♾️ 5 minutes</b> de vies illimitées.</p>
    <button class="play small gold press" data-id="take">RÉCUPÉRER</button>`);
  bind(c, { take: () => { ST().daily = today; E.addBills(100); E.addUnlimited(5 * 60 * 1000); SFX.win(1); confetti(30); Modal.close(); toast('🎁 Cadeau récupéré !'); } });
}

/* ---------- 6. MOTEUR DE JEU : état ---------- */
const board = $('board'), stage = $('stage');
let lv = null, levelNo = 1, cars = [], portals = [], blocks = [], W = 0, H = 0, cell = 60, moves = 0, history = [], startCount = 0, colTotal = [];
let gstate = 'idle', tLeft = 0, tLast = 0, tTimer = null;           // idle | intro | playing | paused | over
let continuesUsed = 0, lossBooked = false;
const lenOf = car => LEN[car.t] / 60;
const snapshot = () => JSON.stringify(cars);
const exitedCount = () => startCount - cars.length;
const isAlive = id => cars.some(o => o.id === id);

/* ---------- 6d. RÈGLES (utilisées par le jeu ET vérifiées par le solveur) ---------- */
function isLocked(car) {
  if (car.lock >= 0 && isAlive(car.lock)) return true;                                       // cadenas : attend un véhicule précis
  if (car.lc >= 0 && cars.filter(o => CN.indexOf(o.col) === car.lc).length === colTotal[car.lc]) return true;   // cadenas couleur : aucun véhicule de cette couleur n'est sorti
  if (car.ln > 0 && exitedCount() < car.ln) return true;                                     // cadenas à compteur
  return false;
}
function portalFor(car, high) {
  const fixed = car.v ? car.c : car.r, side = car.v ? (high ? 'yb' : 'y') : (high ? 'xr' : 'x');
  return portals.find(p => p.s === side && p.i === fixed);
}
function portalOpen(p, car) {
  if (!p) return false;
  const ex = exitedCount(), ci = CN.indexOf(car.col), need = p.kind === 7 ? (CN.indexOf(p.col) + ex) % 6 : CN.indexOf(p.col);
  if (p.kind !== 1 && ci !== need) return false;
  switch (p.kind) {
    case 2: return ex >= p.p1;                         // givré
    case 3: return ex < p.p1;                          // éphémère
    case 4: return ex % 2 === p.p1;                    // pair / impair
    case 5: return ex >= p.p1 && ex <= p.p2;           // fenêtre
    case 6: return TYPES.indexOf(car.t) === p.p1;      // type
  }
  return true;
}
function limits(car) {
  const n = lenOf(car), size = car.v ? H : W, pos = car.v ? car.r : car.c, fixed = car.v ? car.c : car.r;
  if (isLocked(car)) return { lo: pos, hi: pos, min: pos, max: pos, exitLow: false, exitHigh: false, exitOK: false, locked: true };
  const taken = new Set(blocks.map(b => b[0] + ',' + b[1]));
  cars.forEach(o => { if (o.id !== car.id) for (let k = 0; k < lenOf(o); k++) taken.add((o.v ? o.c : o.c + k) + ',' + (o.v ? o.r + k : o.r)); });
  const free = p => p >= 0 && p < size && !taken.has((car.v ? fixed : p) + ',' + (car.v ? p : fixed));
  let lo = pos; while (free(lo - 1)) lo--;
  let hi = pos; while (free(hi + n)) hi++;
  const eaOK = !(car.ea >= 0 && isAlive(car.ea));                                              // priorité
  const exitLow = eaOK && lo === 0 && car.ow !== 1 && (!car.sl || pos <= car.sl) && portalOpen(portalFor(car, false), car);
  const exitHigh = eaOK && hi === size - n && car.ow !== -1 && (!car.sl || size - n - pos <= car.sl) && portalOpen(portalFor(car, true), car);
  let lo2 = lo, hi2 = hi;
  if (car.ow === -1) hi2 = pos; if (car.ow === 1) lo2 = pos;                                   // sens unique
  if (car.sl) { lo2 = Math.max(lo2, pos - car.sl); hi2 = Math.min(hi2, pos + car.sl); }        // véhicule lent
  return { lo: lo2, hi: hi2, min: exitLow ? -n : lo2, max: exitHigh ? size : hi2, exitLow, exitHigh, exitOK: exitLow || exitHigh };
}

/* ---------- 6g. AFFICHAGE ---------- */
function paintPortal(d, p) {
  const ex = exitedCount(), c = COL[CN[p.kind === 7 ? (CN.indexOf(p.col) + ex) % 6 : CN.indexOf(p.col)]], horiz = p.s === 'x' || p.s === 'xr';
  let open = true, text = '';
  switch (p.kind) {
    case 1: text = '⭐'; break;
    case 2: open = ex >= p.p1; text = open ? '' : '❄' + (p.p1 - ex); break;
    case 3: open = ex < p.p1; text = open ? '⏳' + (p.p1 - ex) : '✖'; break;
    case 4: open = ex % 2 === p.p1; text = p.p1 ? 'IMP' : 'PAIR'; break;
    case 5: open = ex >= p.p1 && ex <= p.p2; text = p.p1 + '-' + p.p2; break;
    case 6: text = ['🚗', '🚐', '🚚', '🚌'][p.p1]; break;
    case 7: text = '🌈'; break;
  }
  d.className = 'portal' + (p.kind === 1 ? ' star' : '') + (open ? '' : ' shut');
  d.style.background = p.kind === 1 ? `conic-gradient(${Object.values(COL).join(',')},${COL.red})`
    : `linear-gradient(${{ x: '90deg', xr: '270deg', y: '180deg', yb: '0deg' }[p.s]}, ${mx(c, .3)}, ${c})`;
  d.style.boxShadow = `0 0 ${cell * .35}px ${p.kind === 1 ? '#fff' : c}`; d.textContent = text;
}
function updatePortals() { board.querySelectorAll('.portal').forEach(d => { const was = d.classList.contains('shut'); paintPortal(d, d._p); if (was && !d.classList.contains('shut')) { toast('🚪 Un portail s\'ouvre !'); vib(25); SFX.ping(); } }); }

function draw(fresh = true) {
  cell = Math.floor(Math.min((stage.clientWidth - 60) / W, (stage.clientHeight - 60) / H, 80));
  board.style.width = W * cell + 'px'; board.style.height = H * cell + 'px'; board.style.setProperty('--cell', cell + 'px');
  board.innerHTML = '';
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    const t = document.createElement('div'); t.className = 'tile';
    t.style.cssText = `left:${x * cell + 2}px;top:${y * cell + 2}px;width:${cell - 4}px;height:${cell - 4}px;background:${(x + y) % 2 ? '#1b3680' : '#203d92'}`;
    board.appendChild(t);
  }
  blocks.forEach(([bx, by]) => {
    const d = document.createElement('div'); d.className = 'block';
    d.style.cssText = `left:${bx * cell + 3}px;top:${by * cell + 3}px;width:${cell - 6}px;height:${cell - 6}px`; board.appendChild(d);
  });
  portals.forEach(p => {
    const d = document.createElement('div'), a = cell * .76, b = cell * .4, horiz = p.s === 'x' || p.s === 'xr';
    const off = { x: `left:${-b - cell * .08}px;top:${p.i * cell + cell * .12}px`, xr: `left:${W * cell + cell * .08}px;top:${p.i * cell + cell * .12}px`,
                  y: `top:${-b - cell * .08}px;left:${p.i * cell + cell * .12}px`, yb: `top:${H * cell + cell * .08}px;left:${p.i * cell + cell * .12}px` }[p.s];
    d.style.cssText = `${off};width:${horiz ? b : a}px;height:${horiz ? a : b}px;font-size:${cell * .22}px;border-radius:${cell * .2}px`;
    d._p = p; paintPortal(d, p); board.appendChild(d);
  });
  cars.forEach((car, i) => makeVehicle(car, fresh ? i * .08 : 0, fresh));
  updateHud();
}
function place(el, car, pos) { const x = car.v ? car.c : pos, y = car.v ? pos : car.r; el.style.transform = `translate(${x * cell}px, ${y * cell}px)`; }

/* Pastilles : cadenas, compteurs, sens unique, lent, priorité */
function badgesHTML(car) {
  const dot = c => `<u style="background:${COL[CN[c]] || c}"></u>`; let h = '';
  if (car.lock >= 0 && isAlive(car.lock)) h += `<div class="lock"><b>🔒</b>${dot(CN.indexOf(cars.find(o => o.id === car.lock).col))}</div>`;
  else if (car.lc >= 0 && isLocked(car)) h += `<div class="lock"><b>🔒</b>${dot(car.lc)}</div>`;
  else if (car.ln > 0 && isLocked(car)) h += `<div class="lock"><b>🔒</b><i class="num">${car.ln - exitedCount()}</i></div>`;
  let tags = '';
  if (car.ow) tags += car.v ? (car.ow < 0 ? '⬆' : '⬇') : (car.ow < 0 ? '⬅' : '➡');
  if (car.sl) tags += '🐢';
  if (car.ea >= 0 && isAlive(car.ea)) tags += '🎯' + dot(CN.indexOf(cars.find(o => o.id === car.ea).col));
  return h + (tags ? `<div class="tag">${tags}</div>` : '');
}
function makeVehicle(car, delay, pop) {
  const n = lenOf(car), el = document.createElement('div');
  el.className = 'veh'; el.dataset.id = car.id;
  el.style.width = (car.v ? 1 : n) * cell + 'px'; el.style.height = (car.v ? n : 1) * cell + 'px';
  el.innerHTML = `<div class="in ${pop ? 'pop' : ''}" style="--dl:${delay}s"><svg viewBox="0 0 ${LEN[car.t]} 60" width="${n * cell}" height="${cell}"
    style="${car.v ? `transform:translateX(${cell}px) rotate(90deg);transform-origin:0 0` : ''}">${vehicleSVG(car.t, car.col)}</svg><div class="bdg">${badgesHTML(car)}</div></div>`;
  place(el, car, car.v ? car.r : car.c);
  if (isLocked(car)) el.classList.add('islocked');
  const inn = el.firstChild;
  inn.addEventListener('animationend', ev => { if (ev.animationName === 'popin') { inn.classList.remove('pop'); updateFree(); } });
  el.addEventListener('pointerdown', e => startDrag(e, car, el));
  board.appendChild(el);
  if (!pop) updateFree();
}
function refreshBadges() {                                          // après chaque sortie : cadenas, compteurs, priorités, portails
  board.querySelectorAll('.veh').forEach(el => {
    const car = cars.find(c => c.id === +el.dataset.id); if (!car) return;
    const was = el.classList.contains('islocked'), now = isLocked(car);
    el.querySelector('.bdg').innerHTML = badgesHTML(car);
    if (was && !now) { el.classList.remove('islocked'); toast('🔓 Véhicule débloqué !'); vib(30); SFX.unlock(); el.firstChild.classList.add('unlocked'); setTimeout(() => el.firstChild.classList.remove('unlocked'), 600); }
  });
  updatePortals();
}
function updateFree() {
  cars.forEach(car => {
    const el = board.querySelector(`[data-id="${car.id}"]`); if (!el) return;
    const inn = el.firstChild; if (inn.classList.contains('pop') || inn.classList.contains('bounce')) return;
    inn.classList.toggle('free', limits(car).exitOK);
  });
}

/* ---------- 6h. GLISSER-DÉPOSER ---------- */
function shakeLocked(el, car) {
  const inn = el.firstChild; inn.classList.remove('shake'); void inn.offsetWidth; inn.classList.add('shake');
  setTimeout(() => inn.classList.remove('shake'), 400); vib(40);
  toast(car.lock >= 0 ? '🔒 Fais d\'abord sortir le véhicule de la pastille' : car.lc >= 0 ? '🔒 Fais sortir un véhicule de la couleur de la pastille' : `🔒 Il faut encore ${car.ln - exitedCount()} sortie(s)`);
}
function startDrag(e, car, el) {
  e.preventDefault();
  if (gstate !== 'playing') return;
  if (isLocked(car)) { shakeLocked(el, car); return; }
  SFX.grab();
  el.setPointerCapture(e.pointerId); el.classList.add('drag'); el.firstChild.classList.remove('free');
  const lim = limits(car), n = lenOf(car), size = car.v ? H : W, start = car.v ? car.r : car.c, x0 = car.v ? e.clientY : e.clientX;
  let pos = start;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const move = ev => { pos = clamp(start + ((car.v ? ev.clientY : ev.clientX) - x0) / cell, lim.min, lim.max); place(el, car, pos); };
  const up = () => {
    el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
    el.classList.remove('drag');
    if (lim.exitLow && pos <= -n * 0.55) return leave(car, el, n, false);
    if (lim.exitHigh && pos >= size - n * 0.45) return leave(car, el, n, true);
    const snap = clamp(Math.round(pos), lim.lo, lim.hi);
    place(el, car, snap); bounce(el);
    if (snap !== start) {
      history.push(snapshot()); if (car.v) car.r = snap; else car.c = snap;
      moves++; vib(12); SFX.slide(Math.abs(snap - start)); updateHud(); checkQuota();
    }
    setTimeout(updateFree, 400);
  };
  el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}
function checkQuota() { if (gstate === 'playing' && moves > lv.quota) lose('moves'); }

function leave(car, el, n, high) {
  history.push(snapshot()); moves++;
  const px = car.v ? (car.c + .5) * cell : (high ? W * cell : 0), py = car.v ? (high ? H * cell : 0) : (car.r + .5) * cell;
  place(el, car, high ? (car.v ? H : W) + 1 : -n - 1); el.classList.add('out');
  cars = cars.filter(c => c.id !== car.id);
  refreshBadges();
  setTimeout(() => el.remove(), 320);
  burst(px, py, COL[car.col]); floatText(px, py, '✨'); SFX.pop();
  vib([20, 30, 20]); updateHud();
  setTimeout(updateFree, 350);
  if (!cars.length) { if (moves <= lv.quota) setTimeout(win, 600); else lose('moves'); } else checkQuota();
}

/* ---------- 8a. EFFETS VISUELS ---------- */
function bounce(el) {
  const inn = el.firstChild; inn.classList.remove('bounce'); void inn.offsetWidth; inn.classList.add('bounce');
  inn.addEventListener('animationend', () => inn.classList.remove('bounce'), { once: true });
}
function burst(x, y, color) {                                       // étincelles à la sortie
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('i'); s.className = 'spark';
    s.style.cssText = `left:${x}px;top:${y}px;background:${i % 3 ? color : '#fff'};--x:${(Math.random() - .5) * 150}px;--y:${(Math.random() - .5) * 150}px`;
    board.appendChild(s); setTimeout(() => s.remove(), 750);
  }
}
function floatText(x, y, txt) {
  const t = document.createElement('div'); t.className = 'pop-txt'; t.textContent = txt;
  t.style.left = Math.max(0, x - 20) + 'px'; t.style.top = Math.max(0, y - 10) + 'px';
  board.appendChild(t); setTimeout(() => t.remove(), 950);
}
function confetti(n) {
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i'); c.className = 'confetti';
    c.style.cssText = `left:${Math.random() * 100}%;background:${Object.values(COL)[i % 6]};animation-delay:${Math.random() * .6}s;animation-duration:${1.6 + Math.random()}s`;
    app.appendChild(c); setTimeout(() => c.remove(), 3000);
  }
}

/* ---------- 7. DÉROULÉ D'UN NIVEAU : intro → tutoriels → partie → victoire / défaite ---------- */
function startLevel(n, opts = {}) {
  if (!Seasons.playable(n)) { toast(doorMsg(n)); return; }
  Modal.close();
  if (!E.canPlay()) return openNoLives(() => startLevel(n, opts));       // plus de vie : pub, billets ou boutique
  if (!opts.retry) E.recordPlayed();                                      // un « recommencer » ne compte pas comme nouvelle partie
  levelNo = n; lv = Levels.get(n);
  W = lv.w; H = lv.h; portals = lv.portals; blocks = lv.blocks;
  cars = lv.cars.map((c, k) => ({ ...c, id: k })); startCount = cars.length;
  colTotal = CN.map(c => cars.filter(o => o.col === c).length);
  moves = 0; history = []; tLeft = lv.limit; continuesUsed = 0; lossBooked = false; gstate = 'intro';
  clearInterval(tTimer); closeOverlays(); show('game');
  requestAnimationFrame(() => { draw(true); updateHud(); beginFlow(); });
}
function closeOverlays() { ['intro', 'tuto', 'final'].forEach(id => { const e = $(id); if (e) e.remove(); }); Modal.close(); }

function beginFlow() {
  const steps = [];
  if (lv.rank >= 2) steps.push(showIntro);                                // animation d'intro : DIFFICILE, IMPOSSIBLE, MANIAQUE
  lv.mechs.filter(id => !ST().seen.includes(id)).forEach(id => steps.push(next => showTuto(id, next)));
  const run = () => { const f = steps.shift(); f ? f(run) : startTimer(); };
  setTimeout(run, 450);
}
function showIntro(next) {
  const r = lv.rank, d = document.createElement('div'); d.id = 'intro'; d.style.setProperty('--rc', RCOL[r]);
  d.innerHTML = `<div class="icard"><div class="ilvl">NIVEAU ${lv.n}</div><div class="irank">${RANKS[r]}</div>
    <div class="idur">⏱ Durée cible ${fmtT(lv.est * .8)} – ${fmtT(lv.est * 1.2)}</div>
    <div class="idur">🎯 Maximum ${lv.quota} coups · ${fmtT(lv.limit)} au chrono</div>
    <div class="imech">${lv.mechs.map(id => MECHS.find(m => m.id === id).icon).join(' ')}</div><small>Touche pour commencer</small></div>`;
  app.appendChild(d); vib([30, 40, 60]);
  let done = false; const go = () => { if (done) return; done = true; d.classList.add('out'); setTimeout(() => { d.remove(); next(); }, 300); };
  d.onclick = go; setTimeout(go, 2600);
}
function showTuto(id, next) {                                             // tutoriel contextuel : une seule fois par mécanique
  const m = MECHS.find(x => x.id === id), d = document.createElement('div'); d.id = 'tuto';
  d.innerHTML = `<div class="tcard"><div class="tnew">NOUVEAU !</div><div class="tart">${m.art}</div><h3>${m.icon} ${m.name}</h3><p>${m.text}</p>
    <button class="play small press">COMPRIS !</button></div>`;
  app.appendChild(d); vib(20);
  d.querySelector('button').onclick = () => { ST().seen.push(id); E.save(); d.remove(); next(); };
}

/* Chrono */
function startTimer() { gstate = 'playing'; tLast = performance.now(); clearInterval(tTimer); tTimer = setInterval(tick, 200); updateHud(); }
function tick() {
  if (gstate !== 'playing') return;
  const now = performance.now(); tLeft -= (now - tLast) / 1000; tLast = now;
  const sec = Math.ceil(tLeft); if (sec <= 10 && sec !== tick.last) { tick.last = sec; if (sec > 0) SFX.tick(); }   // tic-tac des 10 dernières secondes
  if (tLeft <= 0) { tLeft = 0; updateHud(); lose('time'); } else updateHud();
}
document.addEventListener('visibilitychange', () => {                    // pause automatique si on quitte l'onglet
  if (document.hidden && gstate === 'playing') gstate = 'paused';
  else if (!document.hidden && gstate === 'paused') { gstate = 'playing'; tLast = performance.now(); }
});
function updateHud() {
  if (!lv) return;
  let gi = $('ginfo'); if (!gi) { gi = document.createElement('div'); gi.id = 'ginfo'; document.querySelector('#game .gtop').after(gi); }
  gi.textContent = `🎯 Cible ${fmtT(lv.est * .8)} – ${fmtT(lv.est * 1.2)} · optimum ${lv.par} coups`;
  $('lvl').innerHTML = `NIVEAU ${lv.n} <b class="rk" style="background:${RCOL[lv.rank]}">${RANKS[lv.rank]}</b>`;
  $('moves').textContent = `${moves}/${lv.quota} coups`; $('moves').classList.toggle('low', lv.quota - moves <= 2);
  const g = $('gcoins'); g.textContent = '⏱ ' + fmtT(Math.ceil(tLeft)); g.classList.toggle('low', tLeft <= 15);
}

/* Victoire : score %, étoiles, billets, bouton « doubler » */
function win() {
  if (gstate === 'over') return; gstate = 'over'; clearInterval(tTimer);
  const mEff = Math.min(1, lv.par / Math.max(1, moves));                                          // écart avec le nombre de coups optimal
  const tEff = Math.max(0, Math.min(1, tLeft / Math.max(1, lv.limit - lv.est * .5)));              // temps restant
  const score = Math.round(100 * (.6 * mEff + .4 * tEff)), stars = score >= 90 ? 3 : score >= 65 ? 2 : 1;
  E.completeLevel(levelNo, score, stars); E.onWin();
  const rw = E.reward(stars), streak = ST().streak;
  SFX.win(stars); confetti(40 + stars * 20); vib([40, 40, 80]);
  if (levelNo >= TOTAL) return setTimeout(showFinal, 700);
  const c = Modal.open(`<h2>${score >= 90 ? 'PARFAIT !' : 'NIVEAU TERMINÉ !'}</h2>
    <div class="stars">${[0, 1, 2].map(i => `<span class="st ${i < stars ? 'on' : ''}" style="--i:${i}">${i < stars ? '⭐' : '☆'}</span>`).join('')}</div>
    <div class="score">${score} %</div><p>${moves}/${lv.quota} coups (optimal ${lv.par}) · ⏱ ${fmtT(lv.limit - tLeft)}</p>
    <div class="reward">💵 +${rw.total}${rw.bonus ? `<small>🔥 série ×${streak} : +${rw.pct} % de bonus</small>` : ''}</div>
    <button class="play small gold press" data-id="double">📺 DOUBLER (+${rw.total} 💵)</button>
    <button class="play small press" data-id="next">SUIVANT ▶</button><button class="play small alt press" data-id="home">ACCUEIL</button>`);
  let used = false;
  bind(c, {
    double: async () => {
      if (used) return; used = true; const b = c.querySelector('[data-id="double"]'); b.disabled = true;
      if (await E.watchAd('Double tes billets !')) { E.addBills(rw.total); SFX.coin(); toast('💵 +' + rw.total + ' !'); b.textContent = '✅ Doublé !'; } else { used = false; b.disabled = false; }
    },
    next: nextLevel, home: () => { Modal.close(); show('home'); }
  });
}
function nextLevel() {
  const n = levelNo + 1;
  if (n > TOTAL) return showFinal();
  if (!Seasons.playable(n)) { Modal.close(); show('home'); toast(doorMsg(n)); } else startLevel(n);
}

/* Défaite : continuer (pub ou billets) ou perdre une vie */
function bookLoss() { if (lossBooked) return; lossBooked = true; E.onLose(); }          // une seule fois : série remise à 0, −1 vie
function lose(reason) {
  if (gstate === 'over') return; gstate = 'over'; clearInterval(tTimer); vib([80, 40, 120]); SFX.lose();
  const cost = 40 * (continuesUsed + 1), time = reason === 'time';
  const c = Modal.open(`<div class="boom">${time ? '⏰' : '💥'}</div><h2>${time ? 'TEMPS ÉCOULÉ !' : 'TROP DE COUPS !'}</h2>
    <p>${time ? 'Le chrono est arrivé à zéro.' : `Tu as dépassé le quota de ${lv.quota} coups.`} Tu peux continuer ou perdre une vie.</p>
    ${continuesUsed === 0 ? '<button class="play small gold press" data-id="adc">📺 CONTINUER (pub) +20 s +4 coups</button>' : ''}
    <button class="play small press" data-id="billc">💵 CONTINUER (${cost}) +20 s +4 coups</button>
    <button class="play small alt press" data-id="retry">🔁 RECOMMENCER (−1 ❤️)</button><button class="play small alt press" data-id="quit">ACCUEIL (−1 ❤️)</button>`, 'lose');
  const goOn = () => { continuesUsed++; Modal.close(); tLeft = Math.max(tLeft, 0) + 20; lv.quota += 4; startTimer(); SFX.unlock(); toast('▶ C\'est reparti !'); };
  bind(c, {
    adc: async () => { if (await E.watchAd('Continue ta partie !')) goOn(); },
    billc: () => { if (E.spend(cost)) goOn(); else toast('❌ Pas assez de billets 💵'); },
    retry: () => { bookLoss(); startLevel(levelNo, { retry: true }); },
    quit: () => { bookLoss(); Modal.close(); show('home'); }
  });
}

/* Écran final : tous les niveaux terminés */
function showFinal() {
  closeOverlays();
  const f = document.createElement('div'); f.id = 'final';
  f.innerHTML = `<div class="fcard"><div class="trophy">🏆</div><h2>FÉLICITATIONS !</h2>
    <p>Tu as terminé les <b>${TOTAL} niveaux</b> de Traffic Color Sort !</p><div class="fcoins">💵 ${ST().bills} · ⭐ ${E.totalStars()}</div>
    <button class="play small press" id="fReplay">REJOUER</button><button class="play small alt press" id="fHome">ACCUEIL</button></div>`;
  app.appendChild(f); confetti(120); setTimeout(() => confetti(80), 900);
  $('fReplay').onclick = () => { f.remove(); startLevel(1, { retry: true }); };
  $('fHome').onclick = () => { f.remove(); show('home'); };
}

/* ---------- 8. BOUTONS DU JEU & DÉMARRAGE ---------- */
$('btnUndo').onclick = () => {
  if (gstate !== 'playing') return;
  if (!history.length) return toast('Rien à annuler');
  if (ST().undos < 1) return openNoItem('undo');
  E.useUndo(); cars = JSON.parse(history.pop()); moves = Math.max(0, moves - 1); draw(false); SFX.click();
};
$('btnHint').onclick = () => {
  if (gstate !== 'playing') return;
  if (ST().hints < 1) return openNoItem('hint');
  const car = cars.find(c => limits(c).exitOK), el = car && board.querySelector(`[data-id="${car.id}"]`);
  if (!el) return toast('Aucun véhicule ne peut sortir : déplace-en un !');
  E.useHint(); el.classList.remove('hint'); void el.offsetWidth; el.classList.add('hint');
};
$('btnRestart').onclick = () => { if (gstate !== 'intro' && lv) startLevel(levelNo, { retry: true }); };
$('btnHome').onclick = () => show('home');
addEventListener('resize', () => { if (current === 'game' && lv) draw(false); });

/* Hauteur de l'écran : fonctionne même sur les navigateurs sans l'unité dvh */
function fitApp() { app.style.height = window.innerHeight + 'px'; }
fitApp(); addEventListener('resize', fitApp); addEventListener('orientationchange', fitApp);

/* Le navigateur n'autorise le son qu'après un 1er toucher : on le débloque ici et on lance la musique. */
let musicStarted = false;
document.addEventListener('pointerdown', e => {
  SFX.unlock();
  if (!musicStarted && ST().settings.music) { musicStarted = true; SFX.music(true); }
  if (e.target.closest('.press, .tab, .nb, .btn, .gbtn, .trow')) SFX.click();
}, true);

setInterval(E.tick, 1000);                                                // régénération des vies + compte à rebours
refreshHud(); show('home');
setTimeout(maybeDailyGift, 900);

/* Écran de chargement : barre puis fondu */
(function hideSplash() {
  const s = $('splash'), bar = $('splashBar'); if (bar) bar.style.width = '100%';
  setTimeout(() => { if (s) { s.classList.add('out'); setTimeout(() => s.remove(), 600); } }, 700);
})();
window.__tcsBooted = true;
