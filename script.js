/* =========================================================================
   script.js — Moteur de jeu complet & Interface Traffic Color
   -------------------------------------------------------------------------
   • Navigation entre les écrans
   • Rendu graphique du plateau de jeu (grille, véhicules, portails)
   • Logique de déplacement tactile/souris des voitures
   • Utilisation des indices 💡 et annulations ↩️
   • Détection des victoires/défaites avec mise à jour de l'économie
   ========================================================================= */

const UI = (() => {
  function init() {
    updateHeader();
    showScreen('screen-home');
    Seasons.renderMap('seasons-map-container', startLevel);
    renderShop();
    checkDailyGift();
    
    // Masquage progressif de l'écran de chargement
    setTimeout(() => {
      const bar = document.getElementById('splash-progress');
      if (bar) bar.style.width = '100%';
      setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) { 
          splash.style.opacity = '0'; 
          setTimeout(() => splash.remove(), 500); 
        }
      }, 400);
    }, 500);
  }

  function updateHeader() {
    const s = Economy.state();
    const billsEl = document.getElementById('ui-bills');
    const streakEl = document.getElementById('ui-streak');
    const livesEl = document.getElementById('ui-lives');
    const totalStarsEl = document.getElementById('ui-total-stars');
    const hintsEl = document.getElementById('ui-hints');
    const undosEl = document.getElementById('ui-undos');

    if (billsEl) billsEl.innerText = s.bills;
    if (streakEl) streakEl.innerText = s.streak;
    if (livesEl) livesEl.innerText = Economy.isUnlimited() ? '♾️' : s.lives;
    if (totalStarsEl) totalStarsEl.innerText = `⭐ ${Economy.totalStars()} Étoiles`;
    if (hintsEl) hintsEl.innerText = s.hints;
    if (undosEl) undosEl.innerText = s.undos;
  }

  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
    
    if (screenId === 'screen-home') {
      const homeNav = document.querySelector('.nav-item:nth-child(2)');
      if (homeNav) homeNav.classList.add('active');
      Seasons.renderMap('seasons-map-container', startLevel);
    } else if (screenId === 'screen-leaderboard') {
      const lbNav = document.querySelector('.nav-item:nth-child(1)');
      if (lbNav) lbNav.classList.add('active');
      renderLeaderboard('national');
    } else if (screenId === 'screen-shop') {
      const shopNav = document.querySelector('.nav-item:nth-child(3)');
      if (shopNav) shopNav.classList.add('active');
    }
    updateHeader();
  }

  function openModal(id) { 
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden'); 
  }
  
  function closeModals() { 
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); 
    updateHeader(); 
  }

  function renderShop() {
    const container = document.getElementById('shop-items-container');
    if (!container) return;
    container.innerHTML = '';
    
    Economy.SHOP.forEach(item => {
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.style.cssText = "background:#221c35; padding:15px; border-radius:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;";
      card.innerHTML = `<div><h4>${item.icon} ${item.name}</h4><small style="color:#aaa;">${item.desc}</small></div>
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

  function checkDailyGift() {
    const lastClaim = localStorage.getItem('tcs_last_gift') || 0;
    const today = new Date().toDateString();
    if (new Date(parseInt(lastClaim)).toDateString() !== today) {
      setTimeout(() => {
        if (confirm("🎁 Cadeau quotidien disponible !\nRécupérer ton bonus (100 💵 + 5 min illimitées) ?")) {
          Economy.addBills(100);
          Economy.addUnlimited(5 * 60 * 1000);
          localStorage.setItem('tcs_last_gift', Date.now().toString());
          updateHeader();
          alert("✅ Cadeau récupéré avec succès !");
        }
      }, 1000);
    }
  }

  function switchLbTab(type) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    renderLeaderboard(type);
  }

  function renderLeaderboard(type) {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    list.innerHTML = '';
    const fakeNames = type === 'national' 
      ? ['Lucas_92', 'Emma_Drift', 'Thomas_75', 'Alex_Racing', 'Sarah_M'] 
      : ['ApexDriver', 'SpeedKing', 'NeoTraffic', 'TurboMaster', 'PixelCar'];
    
    fakeNames.forEach((name, idx) => {
      const row = document.createElement('div');
      row.style.cssText = "display:flex; justify-content:space-between; padding:10px 15px; background:#1e192c; margin-bottom:8px; border-radius:10px; align-items:center;";
      row.innerHTML = `<span>#${idx+1} <b>${name}</b></span><span>⭐ ${(5 - idx) * 45}</span>`;
      list.appendChild(row);
    });
  }

  return { init, updateHeader, showScreen, openModal, closeModals, renderShop, buyItem, switchLbTab };
})();

/* =========================================================================
   Moteur de Jeu (Game Engine)
   ========================================================================= */

let currentLevelData = null;
let currentLevelNum = 1;
let currentCars = [];
let moveHistory = [];
let movesCount = 0;

function startLevel(lvlNumber) {
  if (!Economy.canPlay()) {
    alert("❤️ Plus de vies ! Regarde une pub ou attends la régénération.");
    return;
  }
  
  currentLevelNum = lvlNumber;
  currentLevelData = Levels.get(lvlNumber);
  
  // Copie profonde des véhicules du niveau
  currentCars = JSON.parse(JSON.stringify(currentLevelData.cars));
  moveHistory = [];
  movesCount = 0;
  
  UI.showScreen('screen-game');
  document.getElementById('game-level-title').innerText =
