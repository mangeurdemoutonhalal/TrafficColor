/* =========================================================================
   levels.js — Registre des niveaux de Traffic Color Sort
   -------------------------------------------------------------------------
   • Définition des grilles, véhicules, objectifs et limites de coups/temps
   ========================================================================= */
const Levels = (() => {
  const DB = {
    1: {
      grid: { rows: 6, cols: 6 },
      moves: 15,
      time: 60,
      cars: [
        { id: 'c1', color: 'red', row: 2, col: 1, len: 2, dir: 'H' },
        { id: 'c2', color: 'blue', row: 0, col: 3, len: 3, dir: 'V' },
        { id: 'c3', color: 'green', row: 4, col: 2, len: 2, dir: 'H' }
      ],
      exits: [{ color: 'red', row: 2, col: 5 }]
    },
    2: {
      grid: { rows: 6, cols: 6 },
      moves: 12,
      time: 50,
      cars: [
        { id: 'c1', color: 'yellow', row: 1, col: 1, len: 2, dir: 'H' },
        { id: 'c2', color: 'purple', row: 3, col: 2, len: 2, dir: 'V' }
      ],
      exits: [{ color: 'yellow', row: 1, col: 5 }]
    }
    // Tes 1050 niveaux générés se placent simplement ici !
  };

  function get(levelNumber) {
    return DB[levelNumber] || DB[1]; // Repli sur le niveau 1 si non trouvé
  }

  return { get };
})();
