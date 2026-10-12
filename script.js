/* =========================================================================
   script.js — Moteur de Traffic Color & Ponts UI
   -------------------------------------------------------------------------
   • Gestion de la navigation entre les écrans (Accueil, Voie, Classement, Boutique)
   • Gestion du profil et choix de l'avatar véhicule
   • Gestion des cadeaux quotidiens (Daily Streaks)
   • Lancement des niveaux et gestion des indices / annulations
   ========================================================================= */

const UI = (() => {
  function init() {
    updateHeader();
    showScreen('screen-home');
    Seasons.renderMap('seasons-map-container', startLevel);
    renderShop();
    checkDailyGift();
  }

  function updateHeader() {
    const s = Economy.state();
    document.getElementById('ui-bills').innerText = s.bills;
    document.getElementById('ui-streak').innerText = s.streak;
    document.getElementById('ui-lives').innerText = Economy.isUnlimited() ? '♾️' : s.lives;
    document.getElementById('ui-total-stars').innerText = `⭐ ${Economy.totalStars()} Étoiles`;
    document.getElementById('ui-hints').innerText = s.hints;
    document.getElementById('ui-undos').innerText = s.undos;
  }

  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    document.getElementById(screenId).classList.add('active');
    
    if (screenId === 'screen-home') {
      document.querySelector('.nav-item:nth-child(2)').classList.add('active');
      Seasons.renderMap('seasons-map-container', startLevel);
    } else if (screenId === 'screen-leaderboard') {
      document.querySelector('.nav-item:nth-child(1)').classList.add('active');
      renderLeaderboard('national');
    } else if (screenId === 'screen-shop') {
      document.querySelector('.nav-item:nth-child(3)').classList.add('active');
    }
    updateHeader();
  }

  function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
  function closeModals() { document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); updateHeader(); }

  /* Boutique Rendu */
  function renderShop() {
    const container = document.getElementById('shop-items-container');
    if (!container) return;
    container.innerHTML = '';
    
    Economy.SHOP.forEach(item => {
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.style.cssText = "background:#221c35; padding:15px; border-radius:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;";
      card.innerHTML = `<div><h4>${item.icon} ${item.name}</h4><small>${item.desc}</small></div>
        <button class="btn-main" style="margin:0;" onclick="UI.buyItem('${item.id}')">${item.price} 💵</button>`;
      container.appendChild(card);
    });
  }

  function buyItem(id) {
    const res = Economy.buy(id);
    if (res.ok) {
      alert("🎉 Achat réussi !");
      updateHeader();
    } else {
      alert("❌ Pas assez de billets 💵 !");
    }
  }

  /* Calendrier de Cadeaux Quotidiens */
  function checkDailyGift() {
    const lastClaim = localStorage.getItem('tcs_last_gift') || 0;
    const today = new Date().toDateString();
    if (new Date(parseInt(lastClaim)).toDateString() !== today) {
      setTimeout(() => {
        if (confirm("🎁 Cadeau quotidien disponible !\nVeux-tu récupérer ton bonus de connexion (Billets + 5 min illimitées) ?")) {
          Economy.addBills(100);
          Economy.addUnlimited(5 * 60 * 1000);
          localStorage.setItem('tcs_last_gift', Date.now().toString());
          updateHeader();
          alert("✅ Cadeau récupéré avec succès !");
        }
      }, 1000);
    }
  }

  /* Classement Fictif Réaliste */
  function switchLbTab(type) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderLeaderboard(type);
  }

  function renderLeaderboard(type) {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    const fakeNames = type === 'national' ? ['Lucas_92', 'Emma_Drift', 'Thomas_75', 'Alex_Racing', 'Sarah_M'] : ['ApexDriver', 'SpeedKing', 'NeoTraffic', 'TurboMaster', 'PixelCar'];
    
    fakeNames.forEach((name, idx) => {
      const row = document.createElement('div');
      row.style.cssText = "display:flex; justify-content:space-between; padding:10px 15px; background:#1e192c; margin-bottom:8px; border-radius:10px; align-items:center;";
      row.innerHTML = `<span>#${idx+1} <b>${name}</b></span><span>⭐ ${(5 - idx) * 45}</span>`;
      list.appendChild(row);
    });
  }

  return { init, updateHeader, showScreen, openModal, closeModals, renderShop, buyItem, switchLbTab };
})();

/* Moteur de Jeu Minimal */
function startLevel(lvlNumber) {
  if (!Economy.canPlay()) {
    alert("❤️ Plus de vies ! Regarde une pub ou attends la régénération.");
    return;
  }
  UI.showScreen('screen-game');
  document.getElementById('game-level-title').innerText = `Niveau ${lvlNumber}`;
  Economy.recordPlayed();
  UI.updateHeader();
}

const Game = {
  restart() { alert("🔄 Niveau recommencé !"); },
  useHint() {
    if (Economy.useHint()) {
      alert("💡 Indice utilisé : Une voiture prioritaire est mise en valeur !");
      UI.updateHeader();
    } else {
      alert("❌ Plus d'indices ! Achète-les dans la boutique.");
    }
  },
  useUndo() {
    if (Economy.useUndo()) {
      alert("↩️ Dernier mouvement annulé !");
      UI.updateHeader();
    } else {
      alert("❌ Plus d'annulations !");
    }
  }
};

window.onload = () => UI.init();
// À la fin du chargement dans script.js :
setTimeout(() => {
  const bar = document.getElementById('splash-progress');
  if (bar) bar.style.width = '100%';
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) { splash.style.opacity = '0'; setTimeout(() => splash.remove(), 500); }
  }, 400);
}, 500);
