/* =========================================================================
   seasons.js — Gestion de la Route des Saisons (Style Candy Crush)
   -------------------------------------------------------------------------
   • Découpage dynamique par Saisons de 20 niveaux
   • Quota de 75 % d'étoiles requis sur les saisons passées
   • Fenêtre glissante de visibilité (+2 saisons d'avance max)
   • Rendu de la carte avec statut : terminé (⭐), débloqué ou verrouillé (🔒)
   ========================================================================= */
const Seasons = (() => {
  const LEVELS_PER_SEASON = 20;
  const REQUIRED_STAR_RATIO = 0.75; // 75% des étoiles requises

  /* Calcule si une saison donnée est accessible */
  function isSeasonUnlocked(seasonIndex) {
    if (seasonIndex <= 1) return true;
    
    // Étoiles maximum gagnables sur les saisons précédentes
    const previousSeasonsLevels = (seasonIndex - 1) * LEVELS_PER_SEASON;
    const maxPossibleStars = previousSeasonsLevels * 3;
    const requiredStars = Math.ceil(maxPossibleStars * REQUIRED_STAR_RATIO);
    
    return Economy.totalStars() >= requiredStars;
  }

  /* Rendu dynamique de la carte des saisons */
  function renderMap(containerId, onSelectLevel) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const currentLevel = Economy.state().level;
    const currentSeason = Math.floor((currentLevel - 1) / LEVELS_PER_SEASON) + 1;
    const maxVisibleSeason = currentSeason + 2; // Glissement sur +2 saisons

    for (let s = 1; s <= maxVisibleSeason; s++) {
      const seasonDiv = document.createElement('div');
      seasonDiv.className = 'season-block';

      const title = document.createElement('h3');
      title.className = 'season-title';
      title.innerText = `Saison ${s}`;
      seasonDiv.appendChild(title);

      const startLvl = (s - 1) * LEVELS_PER_SEASON + 1;
      const endLvl = s * LEVELS_PER_SEASON;
      const unlocked = isSeasonUnlocked(s);

      const grid = document.createElement('div');
      grid.className = 'levels-grid';

      for (let lvl = startLvl; lvl <= endLvl; lvl++) {
        const btn = document.createElement('button');
        btn.className = 'level-node';

        const starsEarned = Economy.starsOf(lvl);

        if (starsEarned > 0) {
          btn.classList.add('completed');
          btn.innerHTML = `<span>${lvl}</span><small class="stars">${'⭐'.repeat(starsEarned)}</small>`;
          btn.onclick = () => onSelectLevel(lvl);
        } else if (lvl <= currentLevel && unlocked) {
          btn.classList.add('unlocked');
          btn.innerHTML = `<span>${lvl}</span>`;
          btn.onclick = () => onSelectLevel(lvl);
        } else {
          btn.classList.add('locked');
          btn.innerHTML = `<span>🔒</span>`;
        }
        grid.appendChild(btn);
      }

      seasonDiv.appendChild(grid);

      // Affiche la porte de verrouillage si la saison nécessite plus d'étoiles
      if (!unlocked) {
        const previousSeasonsLevels = (s - 1) * LEVELS_PER_SEASON;
        const requiredStars = Math.ceil(previousSeasonsLevels * 3 * REQUIRED_STAR_RATIO);
        const gate = document.createElement('div');
        gate.className = 'season-gate';
        gate.innerHTML = `🔒 Porte Saison ${s}<br><small>Requis : ${Economy.totalStars()} / ${requiredStars} ⭐</small>`;
        seasonDiv.appendChild(gate);
      }

      container.appendChild(seasonDiv);
    }
  }

  return {
    LEVELS_PER_SEASON,
    isSeasonUnlocked,
    renderMap
  };
})();
