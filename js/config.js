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
    branchComplete: "Branch complete!",
    branchProgress: "Variation {current} of {total}",
    nextBranch: "Next variation...",
  },
  ru: {
    loading: "Загрузка задачи...",
    yourTurn: "Ваш ход!",
    correct: "Отлично! Ждите ответ...",
    victory: "Победа! Задача решена.",
    wrongMove: "Неверный ход. Попробуйте еще раз.",
    checkmate: "Мат!",
    check: "Шах!",
    branchComplete: "Вариант завершён!",
    branchProgress: "Вариант {current} из {total}",
    nextBranch: "Следующий вариант...",
  },
};

// Default puzzles (Long Algebraic Notation - LAN)
// Branch syntax: [opponentMove1,playerReply1|opponentMove2,playerReply2]
// Branches represent different opponent responses - all must be solved
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
    // Puzzle with branches - opponent can respond differently
    fen: "r2q2rk/ppp4p/3p4/2b2Q2/3pPPR1/2P2n2/PP3P1P/RNB4K b - - 0 1",
    moves: "d8h4,[g4h4,g8g1|h2h3,h4h3]",
    message: "Найдите выигрывающий ход (2 варианта)",
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
    // Puzzle with branches using SAN
    fen: "r2q2rk/ppp4p/3p4/2b2Q2/3pPPR1/2P2n2/PP3P1P/RNB4K b - - 0 1",
    moves: "Qh4,[Rxh4,Rg1#|h3,Qxh3#]",
    message: "Найдите выигрывающий ход (2 варианта)",
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
    puzzles = DEFAULT_PUZZLES_2;
  }

  // Normalize all puzzles to LAN format (converts SAN to LAN if needed)
  if (window.NotationConverter && window.NotationConverter.normalizePuzzles) {
    return window.NotationConverter.normalizePuzzles(puzzles);
  }

  return puzzles;
}

/**
 * Parse moves string with branch syntax
 * Syntax: "move1,move2,[branchA_opp,branchA_reply|branchB_opp,branchB_reply],..."
 * Returns array of complete move sequences (branches)
 *
 * Example: "d8h4,[g4h4,g8g1|h2h3,g8g4]" returns:
 * [
 *   ["d8h4", "g4h4", "g8g1"],
 *   ["d8h4", "h2h3", "g8g4"]
 * ]
 */
function parseBranchMoves(movesString) {
  // Check if there are branches
  if (!movesString.includes("[")) {
    // No branches - return single sequence
    return [movesString.split(",").map((m) => m.trim())];
  }

  // Find bracket sections and split accordingly
  const result = [];
  let prefix = [];
  let i = 0;
  const chars = movesString;

  while (i < chars.length) {
    if (chars[i] === "[") {
      // Found branch start - extract everything before as prefix moves
      const beforeBracket = chars.substring(0, i);
      if (beforeBracket) {
        prefix = beforeBracket
          .split(",")
          .map((m) => m.trim())
          .filter((m) => m);
      }

      // Find matching closing bracket
      let bracketDepth = 1;
      let j = i + 1;
      while (j < chars.length && bracketDepth > 0) {
        if (chars[j] === "[") bracketDepth++;
        if (chars[j] === "]") bracketDepth--;
        j++;
      }

      // Extract branch content
      const branchContent = chars.substring(i + 1, j - 1);

      // Split branches by | (but not inside nested brackets)
      const branchStrings = splitByPipe(branchContent);

      // Get any suffix after the bracket
      const afterBracket = chars.substring(j);
      const suffix = afterBracket.startsWith(",")
        ? afterBracket
            .substring(1)
            .split(",")
            .map((m) => m.trim())
            .filter((m) => m)
        : [];

      // Create full sequences for each branch
      for (const branchStr of branchStrings) {
        const branchMoves = branchStr
          .split(",")
          .map((m) => m.trim())
          .filter((m) => m);
        result.push([...prefix, ...branchMoves, ...suffix]);
      }

      break; // For now, only support one branch point
    }
    i++;
  }

  return result.length > 0
    ? result
    : [movesString.split(",").map((m) => m.trim())];
}

/**
 * Split string by | but not inside brackets
 */
function splitByPipe(str) {
  const result = [];
  let current = "";
  let depth = 0;

  for (const char of str) {
    if (char === "[") depth++;
    else if (char === "]") depth--;
    else if (char === "|" && depth === 0) {
      result.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current);
  return result;
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
