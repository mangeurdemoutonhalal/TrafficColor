/* =========================================================================
   economy.js — Économie & sauvegarde de Traffic Color Sort
   -------------------------------------------------------------------------
   • Billets 💵 (monnaie du jeu)
   • Vies ❤️ (max 5, régénération automatique) + Vies illimitées ♾️ (chronométrées)
   • Win Streak 🔥 (série de victoires) et bonus de billets
   • Inventaire : indices 💡 et annulations ↩️ (3 de chaque au départ)
   • Progression : niveau atteint, étoiles par niveau, statistiques du profil
   • Publicités SIMULÉES (watchAd) : à remplacer par un vrai SDK plus tard
   • Sauvegarde automatique dans localStorage (clé 'tcs3')
   Ce fichier ne dépend d'aucun autre : il peut être chargé en premier.
   ========================================================================= */
const Economy = (() => {
  const KEY = 'tcs3';
  const MAX_LIVES = 5;
  const REGEN_MS = 15 * 60 * 1000;            // 1 vie toutes les 15 minutes
  const AD_BONUS = 50, AD_BONUS_COOLDOWN = 90 * 1000;

  /* Catalogue de la boutique (prix en billets 💵). Le rendu est fait dans script.js. */
  const SHOP = [
    { id: 'lives_full', group: 'Vies',        icon: '❤️', name: 'Recharge de vies',        desc: 'Remplit tes 5 vies',        price: 150 },
    { id: 'unl_30',     group: 'Vies',        icon: '♾️', name: 'Vies illimitées 30 min',  desc: 'Joue sans compter',         price: 300 },
    { id: 'unl_120',    group: 'Vies',        icon: '♾️', name: 'Vies illimitées 2 h',     desc: 'Le grand marathon',         price: 800 },
    { id: 'hints_3',    group: 'Indices',     icon: '💡', name: 'Pack de 3 indices',       desc: '+3 💡',                     price: 100 },
    { id: 'hints_10',   group: 'Indices',     icon: '💡', name: 'Pack de 10 indices',      desc: '+10 💡 (meilleur prix)',    price: 280 },
    { id: 'undos_3',    group: 'Annulations', icon: '↩️', name: 'Pack de 3 annulations',   desc: '+3 ↩️',                     price: 100 },
    { id: 'undos_10',   group: 'Annulations', icon: '↩️', name: 'Pack de 10 annulations',  desc: '+10 ↩️ (meilleur prix)',    price: 280 }
  ];

  const defaults = () => ({
    v: 3, bills: 300, lives: MAX_LIVES, nextLife: 0, unlimitedUntil: 0,
    streak: 0, bestStreak: 0, hints: 3, undos: 3,                 // pack de bienvenue
    level: 1, best: {},                                           // best[n] = { stars, score }
    seen: [],                                                     // tutoriels déjà vus
    stats: { played: 0, won: 0, lost: 0, wins3: 0 },
    settings: { sound: true, music: true, haptics: true, notif: false },
    avatar: 0, adReadyAt: 0
  });

  const merge = (base, extra) => {
    for (const k in extra) base[k] = (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) ? merge(base[k], extra[k]) : extra[k];
    return base;
  };
  function load() { try { return merge(defaults(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { return defaults(); } }

  let S = load();
  const listeners = [];
  const emit = () => listeners.forEach(fn => { try { fn(S); } catch (e) { console.error(e); } });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} emit(); }

  /* ---------- Billets ---------- */
  function addBills(n) { S.bills += n; save(); }
  function spend(n) { if (S.bills < n) return false; S.bills -= n; save(); return true; }

  /* ---------- Vies ---------- */
  const isUnlimited = () => S.unlimitedUntil > Date.now();
  const unlimitedLeft = () => Math.max(0, S.unlimitedUntil - Date.now());
  const timeToNextLife = () => (S.lives >= MAX_LIVES || !S.nextLife) ? 0 : Math.max(0, S.nextLife - Date.now());
  const canPlay = () => isUnlimited() || S.lives > 0;
  function addUnlimited(ms) { S.unlimitedUntil = Math.max(Date.now(), S.unlimitedUntil) + ms; save(); }
  function addLife(n = 1) { S.lives = Math.min(MAX_LIVES, S.lives + n); if (S.lives >= MAX_LIVES) S.nextLife = 0; save(); }
  function refillLives() { S.lives = MAX_LIVES; S.nextLife = 0; save(); }
  function loseLife() {                                           // appelé à la défaite définitive
    if (isUnlimited() || S.lives <= 0) return;
    S.lives--; if (!S.nextLife) S.nextLife = Date.now() + REGEN_MS; save();
  }
  /* À appeler chaque seconde : régénère les vies et met l'interface à jour. */
  function tick() {
    const now = Date.now(); let changed = false;
    if (S.lives < MAX_LIVES) {
      if (!S.nextLife) { S.nextLife = now + REGEN_MS; changed = true; }
      while (S.lives < MAX_LIVES && now >= S.nextLife) {
        S.lives++; S.nextLife = S.lives < MAX_LIVES ? S.nextLife + REGEN_MS : 0; changed = true;
        if (S.lives >= MAX_LIVES && S.settings.notif && window.Notification && Notification.permission === 'granted') {
          try { new Notification('Traffic Color Sort', { body: 'Tes vies sont pleines ! 🚗❤️' }); } catch (e) {}
        }
      }
    }
    if (changed) save(); else emit();
  }

  /* ---------- Win Streak 🔥 ---------- */
  const streakBonusPct = () => Math.min(S.streak, 10) * 5;      // +5 % par victoire d'affilée (max +50 %)
  function onWin() { S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak); save(); }
  function onLose() { S.streak = 0; S.stats.lost++; loseLife(); save(); }

  /* ---------- Inventaire ---------- */
  function useHint() { if (S.hints < 1) return false; S.hints--; save(); return true; }
  function useUndo() { if (S.undos < 1) return false; S.undos--; save(); return true; }
  function addHints(n) { S.hints += n; save(); }
  function addUndos(n) { S.undos += n; save(); }

  /* ---------- Progression & statistiques ---------- */
  function recordPlayed() { S.stats.played++; save(); }
  /* Enregistre une victoire. Retourne { first, improved }. */
  function completeLevel(n, score, stars) {
    const old = S.best[n], first = !old;
    S.best[n] = { stars: Math.max(old ? old.stars : 0, stars), score: Math.max(old ? old.score : 0, score) };
    if (n >= S.level) S.level = n + 1;
    S.stats.won++; if (stars === 3) S.stats.wins3++;
    save(); return { first, improved: !old || stars > old.stars };
  }
  /* Récompense de victoire : base + étoiles + bonus de série. Ajoutée tout de suite. */
  function reward(stars) {
    const base = 20 + stars * 15, bonus = Math.floor(base * streakBonusPct() / 100);
    addBills(base + bonus); return { base, bonus, total: base + bonus, pct: streakBonusPct() };
  }
  const starsOf = n => (S.best[n] ? S.best[n].stars : 0);
  const totalStars = () => Object.values(S.best).reduce((a, b) => a + b.stars, 0);
  const levelsDone = () => Object.keys(S.best).length;
  const winRate = () => S.stats.played ? Math.round(100 * S.stats.won / S.stats.played) : 0;
  const threeStarRate = () => S.stats.won ? Math.round(100 * S.stats.wins3 / S.stats.won) : 0;

  /* ---------- Boutique ---------- */
  /* Retourne { ok, reason }. Applique l'achat et débite les billets. */
  function buy(id) {
    const it = SHOP.find(x => x.id === id); if (!it) return { ok: false, reason: 'unknown' };
    if (S.bills < it.price) return { ok: false, reason: 'funds' };
    S.bills -= it.price;
    if (id === 'lives_full') { S.lives = MAX_LIVES; S.nextLife = 0; }
    else if (id === 'unl_30') S.unlimitedUntil = Math.max(Date.now(), S.unlimitedUntil) + 30 * 60000;
    else if (id === 'unl_120') S.unlimitedUntil = Math.max(Date.now(), S.unlimitedUntil) + 120 * 60000;
    else if (id === 'hints_3') S.hints += 3; else if (id === 'hints_10') S.hints += 10;
    else if (id === 'undos_3') S.undos += 3; else if (id === 'undos_10') S.undos += 10;
    save(); return { ok: true, item: it };
  }
  const adBonusReady = () => Date.now() >= S.adReadyAt;
  const adBonusWait = () => Math.max(0, S.adReadyAt - Date.now());
  function claimAdBonus() { S.adReadyAt = Date.now() + AD_BONUS_COOLDOWN; addBills(AD_BONUS); return AD_BONUS; }

  /* ---------- Publicité simulée ----------
     Affiche un faux écran de pub de 3 secondes. Retourne une Promise<boolean>. */
  function watchAd(label = 'Récompense') {
    return new Promise(resolve => {
      const d = document.createElement('div'); d.className = 'adlayer';
      d.innerHTML = `<div class="adcard"><div class="adtag">📺 PUBLICITÉ (simulée)</div><div class="adbig">🚗💨</div>
        <p>${label}</p><div class="adbar"><i></i></div><button class="play small press" disabled>Patiente… <b>3</b></button></div>`;
      document.body.appendChild(d);
      const btn = d.querySelector('button'), bar = d.querySelector('.adbar i'); let n = 3;
      requestAnimationFrame(() => { bar.style.transition = 'width 3s linear'; bar.style.width = '100%'; });
      const iv = setInterval(() => {
        n--; if (n > 0) btn.querySelector('b').textContent = n;
        else { clearInterval(iv); btn.disabled = false; btn.textContent = 'Récupérer la récompense ▶'; }
      }, 1000);
      btn.onclick = () => { d.remove(); resolve(true); };
    });
  }

  function resetAll() { S = defaults(); save(); }

  return {
    MAX_LIVES, REGEN_MS, SHOP, state: () => S, save, onChange: fn => listeners.push(fn), tick,
    addBills, spend, isUnlimited, unlimitedLeft, timeToNextLife, canPlay, addUnlimited, addLife, refillLives, loseLife,
    streakBonusPct, onWin, onLose, useHint, useUndo, addHints, addUndos,
    recordPlayed, completeLevel, reward, starsOf, totalStars, levelsDone, winRate, threeStarRate,
    buy, adBonusReady, adBonusWait, claimAdBonus, watchAd, resetAll
  };
})();
