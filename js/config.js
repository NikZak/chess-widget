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
// Player alternatives syntax: {move1|move2} - any of these player moves is correct
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
  {
    fen: "6k1/5pb1/1p1N3p/p5p1/5q2/Q6P/PPr5/3RR2K w - - 0 1",
    moves:
      "Re8, [Kh7, Qd3, f5, Qxc2|Bf8, Rxf8, [Kg7, Rxf7, Qxf7, Nxf7| Kxf8, Nf5, [Kg8, Qf8, [Kxf8, Rd8#|Kh7, Qg7#] | Ke8, {Ng7# | Qe7#}]]]",
    message: "Найдите выигрывающую комбинацию",
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
 * Parse moves string with branch syntax (supports nested branches and player alternatives)
 * Syntax: "move1,[branchA|branchB,[subBranch1|subBranch2]]"
 * Player alternatives syntax: "{move1|move2}" - any move in curly braces is correct
 * Returns array of complete move sequences (all leaves of the tree)
 * Alternative moves are stored as arrays: ["e2e4", ["g7g8", "e7e8"]]
 *
 * Example: "Re8,[Kh7,Qd3|Bf8,Rxf8,[Kg7,Rxf7|Kxf8,Nf5]]" returns 3 branches:
 * [
 *   ["Re8", "Kh7", "Qd3"],
 *   ["Re8", "Bf8", "Rxf8", "Kg7", "Rxf7"],
 *   ["Re8", "Bf8", "Rxf8", "Kxf8", "Nf5"]
 * ]
 *
 * Example with alternatives: "Re8,Kh7,{Ng7#|Qe7#}" returns:
 * [
 *   ["Re8", "Kh7", ["Ng7#", "Qe7#"]]
 * ]
 */
function parseBranchMoves(movesString) {
  // No brackets or curly braces - single sequence
  if (!movesString.includes("[") && !movesString.includes("{")) {
    return [
      movesString
        .split(",")
        .map((m) => m.trim())
        .filter((m) => m),
    ];
  }

  // Recursively expand all branches
  return expandBranches(movesString);
}

/**
 * Recursively expand a moves string with nested brackets into all possible paths
 * Also handles player alternatives {move1|move2} which are stored as arrays
 */
function expandBranches(str) {
  // Find first bracket or curly brace at depth 0
  let bracketStart = -1;
  let curlyStart = -1;
  let bracketDepth = 0;
  let curlyDepth = 0;

  for (let i = 0; i < str.length; i++) {
    if (str[i] === "[") {
      if (bracketDepth === 0 && curlyDepth === 0 && bracketStart === -1)
        bracketStart = i;
      bracketDepth++;
    } else if (str[i] === "]") {
      bracketDepth--;
    } else if (str[i] === "{") {
      if (curlyDepth === 0 && bracketDepth === 0 && curlyStart === -1)
        curlyStart = i;
      curlyDepth++;
    } else if (str[i] === "}") {
      curlyDepth--;
    }
  }

  // No brackets or curly braces - return single sequence
  if (bracketStart === -1 && curlyStart === -1) {
    const moves = str
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m);
    return [moves];
  }

  // Handle curly braces (player alternatives) first if they come before brackets
  if (curlyStart !== -1 && (bracketStart === -1 || curlyStart < bracketStart)) {
    return expandAlternatives(str, curlyStart);
  }

  // Find matching closing bracket
  let depth = 1;
  let bracketEnd = bracketStart + 1;
  while (bracketEnd < str.length && depth > 0) {
    if (str[bracketEnd] === "[") depth++;
    if (str[bracketEnd] === "]") depth--;
    bracketEnd++;
  }
  bracketEnd--; // Point to the ]

  // Extract parts
  const prefix = str.substring(0, bracketStart);
  const branchContent = str.substring(bracketStart + 1, bracketEnd);
  const suffix = str.substring(bracketEnd + 1);

  // Parse prefix moves (may contain alternatives)
  const prefixMoves = parseMovesWithAlternatives(prefix);

  // Split branches by | at depth 0
  const branches = splitByPipe(branchContent);

  const results = [];

  for (const branch of branches) {
    // Each branch + suffix might have nested brackets - recursively expand
    const branchWithSuffix = branch + suffix;
    const expandedPaths = expandBranches(branchWithSuffix);

    for (const path of expandedPaths) {
      results.push([...prefixMoves, ...path]);
    }
  }

  return results;
}

/**
 * Expand player alternatives {move1|move2} - stores alternatives as arrays
 * Does not create new branches, just marks the move as having alternatives
 */
function expandAlternatives(str, curlyStart) {
  // Find matching closing curly brace
  let depth = 1;
  let curlyEnd = curlyStart + 1;
  while (curlyEnd < str.length && depth > 0) {
    if (str[curlyEnd] === "{") depth++;
    if (str[curlyEnd] === "}") depth--;
    curlyEnd++;
  }
  curlyEnd--; // Point to the }

  // Extract parts
  const prefix = str.substring(0, curlyStart);
  const alternativesContent = str.substring(curlyStart + 1, curlyEnd);
  const suffix = str.substring(curlyEnd + 1);

  // Parse prefix moves
  const prefixMoves = parseMovesWithAlternatives(prefix);

  // Parse alternatives - split by | and store as array
  const alternatives = alternativesContent
    .split("|")
    .map((a) => a.trim())
    .filter((a) => a);

  // Store alternatives as an array (not a string)
  const alternativesMove =
    alternatives.length === 1 ? alternatives[0] : alternatives;

  // Continue parsing suffix (may have more brackets/alternatives)
  const suffixResults = suffix.trim()
    ? expandBranches(suffix.startsWith(",") ? suffix.substring(1) : suffix)
    : [[]];

  const results = [];
  for (const suffixPath of suffixResults) {
    results.push([...prefixMoves, alternativesMove, ...suffixPath]);
  }

  return results;
}

/**
 * Parse a simple comma-separated moves string, handling any {alternatives} within
 */
function parseMovesWithAlternatives(str) {
  if (!str.includes("{")) {
    return str
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m);
  }

  const result = [];
  let current = "";
  let curlyDepth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === "{") {
      curlyDepth++;
      current += char;
    } else if (char === "}") {
      curlyDepth--;
      current += char;
    } else if (char === "," && curlyDepth === 0) {
      if (current.trim()) {
        result.push(parseAlternativeMove(current.trim()));
      }
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    result.push(parseAlternativeMove(current.trim()));
  }

  return result;
}

/**
 * Parse a single move that may be {alt1|alt2} or just a plain move
 */
function parseAlternativeMove(moveStr) {
  if (moveStr.startsWith("{") && moveStr.endsWith("}")) {
    const content = moveStr.substring(1, moveStr.length - 1);
    const alts = content
      .split("|")
      .map((a) => a.trim())
      .filter((a) => a);
    return alts.length === 1 ? alts[0] : alts;
  }
  return moveStr;
}

/**
 * Split string by | but not inside brackets or curly braces
 */
function splitByPipe(str) {
  const result = [];
  let current = "";
  let bracketDepth = 0;
  let curlyDepth = 0;

  for (const char of str) {
    if (char === "[") bracketDepth++;
    else if (char === "]") bracketDepth--;
    else if (char === "{") curlyDepth++;
    else if (char === "}") curlyDepth--;
    else if (char === "|" && bracketDepth === 0 && curlyDepth === 0) {
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
