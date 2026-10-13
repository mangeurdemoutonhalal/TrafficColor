/* =========================================================================
   seasons.js — Route des Saisons (style Candy Crush)
   -------------------------------------------------------------------------
   • Les 1050 niveaux sont découpés en saisons de 35 niveaux (30 saisons).
   • Une PORTE ferme chaque saison : elle s'ouvre quand le joueur a gagné au moins
     75 % des étoiles possibles de la saison précédente (3 étoiles x 35 niveaux).
   • VISIBILITÉ : 3 saisons maximum sont affichées (précédente, en cours, suivante).
   • Un niveau est jouable s'il est atteint ET si la porte de sa saison est ouverte.
   Dépend de : Levels (levels.js) et Economy (economy.js), appelés à l'exécution.
   ========================================================================= */
const Seasons = (() => {
  const SIZE = 35;                 // niveaux par saison
  const RATIO = 0.75;              // part d'étoiles requise pour ouvrir la porte suivante
  const NAMES = ['Aube Urbaine', 'Centre-Ville', 'Heure de Pointe', 'Périphérique', 'Zone Portuaire', 'Quartier Gare',
    'Campus', 'Marché Matinal', 'Vieux Port', 'Zone Industrielle', 'Autoroute du Soleil', 'Col de Montagne',
    'Station Balnéaire', 'Forêt Enchantée', 'Désert Rouge', 'Neige Éternelle', 'Vallée des Vignes', 'Cité Néon',
    'Île Tropicale', 'Tunnel Infini', 'Aéroport', 'Parc d\'Attractions', 'Canyon Express', 'Campagne Dorée',
    'Mégapole', 'Nuit Étoilée', 'Volcan', 'Cité Flottante', 'Orbite Basse', 'Sommet Légendaire'];
  const ICONS = ['🌅', '🏙️', '🚦', '🛣️', '⚓', '🚉', '🎓', '🥖', '⛵', '🏭', '☀️', '🏔️', '🏖️', '🌲', '🏜️', '❄️', '🍇', '🌃',
    '🌴', '🚇', '✈️', '🎡', '🏞️', '🌾', '🌆', '🌠', '🌋', '🛟', '🛰️', '👑'];

  const total = () => Levels.total;
  const count = () => Math.ceil(total() / SIZE);
  const seasonOf = n => Math.floor((n - 1) / SIZE);                 // index 0..29
  const first = s => s * SIZE + 1;
  const last = s => Math.min(total(), (s + 1) * SIZE);
  const maxStars = s => 3 * (last(s) - first(s) + 1);
  const need = s => Math.ceil(maxStars(s) * RATIO);
  const info = s => ({ name: NAMES[s % NAMES.length], icon: ICONS[s % ICONS.length], hue: (s * 47 + 200) % 360 });

  function stars(s) {                                               // étoiles gagnées dans la saison s
    let t = 0; for (let n = first(s); n <= last(s); n++) t += Economy.starsOf(n); return t;
  }
  /* La porte AVANT la saison s est ouverte si la saison s-1 a assez d'étoiles (la 1re saison est toujours ouverte). */
  const doorOpen = s => s <= 0 || stars(s - 1) >= need(s - 1);
  const playable = n => n >= 1 && n <= total() && n <= Economy.state().level && doorOpen(seasonOf(n));
  const currentIndex = () => Math.min(count() - 1, seasonOf(Math.min(Economy.state().level, total())));
  /* Les 3 saisons visibles au maximum : précédente, en cours, suivante. */
  function visible() {
    const c = currentIndex(), out = [];
    for (let s = Math.max(0, c - 1); s <= Math.min(count() - 1, c + 1); s++) out.push(s);
    return out;
  }

  /* Construit la carte dans `host`. onPick(n) est appelé quand on touche un niveau jouable. */
  function render(host, onPick) {
    host.innerHTML = '';
    const lvl = Economy.state().level, cur = currentIndex(), vis = visible();
    vis.forEach((s, idx) => {
      if (idx > 0) host.appendChild(door(s));                       // porte entre deux saisons visibles
      const meta = info(s), open = doorOpen(s), got = stars(s), max = maxStars(s);
      const box = document.createElement('section'); box.className = 'season' + (open ? '' : ' closed');
      box.style.setProperty('--sc', `hsl(${meta.hue} 80% 55%)`);
      box.innerHTML = `<div class="shead"><span class="sico">${meta.icon}</span>
        <div><b>Saison ${s + 1} · ${meta.name}</b><small>Niveaux ${first(s)} à ${last(s)}</small></div>
        <span class="sstars">⭐ ${got}/${max}</span></div>
        <div class="sbar"><i style="width:${Math.round(100 * got / max)}%"></i><u style="left:${RATIO * 100}%"></u></div>`;
      const nodes = document.createElement('div'); nodes.className = 'snodes';
      for (let n = first(s), row = 0; n <= last(s); row++) {        // rangées de 5, en serpentin
        const r = document.createElement('div'); r.className = 'srow' + (row % 2 ? ' rev' : '');
        for (let k = 0; k < 5 && n <= last(s); k++, n++) r.appendChild(node(n, lvl, open, onPick));
        nodes.appendChild(r);
      }
      box.appendChild(nodes); host.appendChild(box);
    });
    const here = host.querySelector('.snode.cur'); if (here) setTimeout(() => here.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
  }
  function node(n, lvl, open, onPick) {
    const b = document.createElement('button'), st = Economy.starsOf(n);
    const playableNow = n <= lvl && open;
    b.className = 'snode press ' + (!playableNow ? 'lock' : n === lvl ? 'cur' : 'done');
    b.dataset.n = n;
    b.innerHTML = playableNow ? `<b>${n}</b><span>${[1, 2, 3].map(i => i <= st ? '⭐' : '☆').join('')}</span>` : `<b>🔒</b>`;
    b.onclick = () => onPick(n, playableNow);
    return b;
  }
  function door(s) {
    const prev = s - 1, got = stars(prev), req = need(prev), ok = got >= req;
    const d = document.createElement('div'); d.className = 'door ' + (ok ? 'open' : 'shut');
    d.innerHTML = `<span class="dico">${ok ? '🚪✅' : '🚪🔒'}</span><div><b>Porte de la saison ${s + 1}</b>
      <small>${ok ? 'Ouverte !' : `Il faut ${req} ⭐ (75 %) dans la saison ${prev + 1}`}</small>
      <div class="sbar"><i style="width:${Math.min(100, Math.round(100 * got / req))}%"></i></div></div><span class="dnum">${got}/${req}</span>`;
    return d;
  }

  return { SIZE, RATIO, count, seasonOf, first, last, maxStars, need, stars, doorOpen, playable, currentIndex, visible, info, render };
})();
