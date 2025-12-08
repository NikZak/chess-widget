/**
 * Configuration and translations for chess widget
 */

// Translations
const translations = {
  en: {
    loading: "Loading puzzle...",
    yourTurn: "Your turn!",
    correct: "Excellent! Wait for response...",
    victory: "Victory! Puzzle solved.",
    wrongMove: "Wrong move. Try again.",
    checkmate: "Checkmate!",
    check: "Check!",
  },
  ru: {
    loading: "Загрузка задачи...",
    yourTurn: "Ваш ход!",
    correct: "Отлично! Ждите ответ...",
    victory: "Победа! Задача решена.",
    wrongMove: "Неверный ход. Попробуйте еще раз.",
    checkmate: "Мат!",
    check: "Шах!",
  },
};

// Default puzzles (Long Algebraic Notation - LAN)
const DEFAULT_PUZZLES = [
  {
    fen: "r3k2r/1b1p1pp1/3qp3/p1bP4/Pp3B2/6P1/1PP1QPB1/R4RK1 b kq - 0 1",
    moves: "d6d5,g2d5,b7d5,a1d1,h8h1",
    message: "Найдите выигрывающую комбинацию",
  },
  {
    fen: "3n3r/2p3k1/1pbbpRpp/6r1/3P4/2PBQ2P/q5P1/5RK1 w - - 0 1",
    moves:
      "e3g5,h6g5,f6g6,g7h7,g6e6,h7g7,e6g6,g7h7,g6d6,h7g7,d6g6,g7h7,g6c6,h7g7,c6g6,g7h7,g6b6,h7g7,b6g6,g7h7,g6a6,h7g7,a6a2",
    message: "Найдите выигрывающую комбинацию",
  },
  {
    fen: "r2q2rk/ppp4p/3p4/2b2Q2/3pPPR1/2P2n2/PP3P1P/RNB4K b - - 0 1",
    moves: "d8h4,g4h4,g8g1",
    message: "Найдите выигрывающий ход",
  },
];

// Default puzzles with Short Algebraic Notation (SAN) - for testing notation converter
// Same puzzles as above but using SAN notation like "Qxd5", "Nf3", etc.
const DEFAULT_PUZZLES_2 = [
  {
    fen: "r3k2r/1b1p1pp1/3qp3/p1bP4/Pp3B2/6P1/1PP1QPB1/R4RK1 b kq - 0 1",
    moves: "Qxd5,Bxd5,Bxd5,Rad1,Rh1+",
    message: "Найдите выигрывающую комбинацию",
  },
  {
    fen: "3n3r/2p3k1/1pbbpRpp/6r1/3P4/2PBQ2P/q5P1/5RK1 w - - 0 1",
    moves:
      "Qxg5+,hxg5,Rxg6+,Kh7,Rxe6,Kg7,Rg6+,Kh7,Rxd6,Kg7,Rg6+,Kh7,Rxc6,Kg7,Rg6+,Kh7,Rxb6,Kg7,Rg6+,Kh7,Ra6,Kg7,Rxa2",
    message: "Найдите выигрывающую комбинацию",
  },
  {
    fen: "r2q2rk/ppp4p/3p4/2b2Q2/3pPPR1/2P2n2/PP3P1P/RNB4K b - - 0 1",
    moves: "Qh4,Rxh4,Rg1#", // Qh4 not Qxh4 - h4 is empty, no capture
    message: "Найдите выигрывающий ход",
  },
];

// Parse puzzles from URL
function parsePuzzlesFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const puzzlesParam = urlParams.get("puzzles");
  const fenParam = urlParams.get("fen");
  const movesParam = urlParams.get("moves");

  let puzzles;

  if (puzzlesParam) {
    // New format: multiple puzzles separated by ;
    const puzzleStrings = puzzlesParam.split(";");
    puzzles = puzzleStrings.map((puzzleStr) => {
      const parts = puzzleStr.split("|");
      return {
        fen: decodeURIComponent(parts[0] || DEFAULT_PUZZLES[0].fen),
        moves: decodeURIComponent(parts[1] || DEFAULT_PUZZLES[0].moves),
        message: decodeURIComponent(parts[2] || ""),
      };
    });
  } else if (fenParam || movesParam) {
    // Legacy format: single puzzle
    const messageParam = urlParams.get("message") || DEFAULT_PUZZLES[0].message;
    puzzles = [
      {
        fen: fenParam || DEFAULT_PUZZLES[0].fen,
        moves: movesParam || DEFAULT_PUZZLES[0].moves,
        message: messageParam,
      },
    ];
  } else {
    // Use DEFAULT_PUZZLES_2 (SAN notation test set)
    puzzles = DEFAULT_PUZZLES;
  }

  // Normalize all puzzles to LAN format (converts SAN to LAN if needed)
  if (window.NotationConverter && window.NotationConverter.normalizePuzzles) {
    return window.NotationConverter.normalizePuzzles(puzzles);
  }

  return puzzles;
}

// Get language from URL
function getLanguage() {
  const urlParams = new URLSearchParams(window.location.search);
  const lang = urlParams.get("lang") || "ru";
  return translations[lang] ? lang : "ru";
}

// Translation helper
function createTranslator(lang) {
  return function (key) {
    return translations[lang][key] || key;
  };
}
