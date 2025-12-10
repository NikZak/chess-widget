/**
 * Chess notation converter
 * Converts between Short Algebraic Notation (SAN) like "e4", "Nf3", "Qxd5"
 * and Long Algebraic Notation (LAN) like "e2e4", "g1f3", "d1d5"
 */

/**
 * Checks if a move string is in Long Algebraic Notation (LAN)
 * LAN format: 4-5 characters - from square + to square + optional promotion
 * Examples: "e2e4", "g1f3", "e7e8q"
 * @param {string} move - The move string to check
 * @returns {boolean} - True if the move is in LAN format
 */
function isLANMove(move) {
  // LAN moves are 4-5 chars: 2 for source square, 2 for target square, optional promotion
  // e.g., "e2e4", "g1f3", "e7e8q"
  const lanPattern = /^[a-h][1-8][a-h][1-8][qrbnQRBN]?$/;
  return lanPattern.test(move);
}

/**
 * Checks if a move string is in Short Algebraic Notation (SAN)
 * SAN format: piece + disambiguation + capture + target + promotion + check
 * Examples: "e4", "Nf3", "Bxe5", "O-O", "Qd1+", "e8=Q"
 * @param {string} move - The move string to check
 * @returns {boolean} - True if the move is likely in SAN format
 */
function isSANMove(move) {
  // SAN patterns:
  // Pawn move: e4, d5, exd5, e8=Q
  // Piece move: Nf3, Bxe5, Qd1, Rad1, R1a3
  // Castling: O-O, O-O-O
  // With check/checkmate: Nf3+, Qxf7#
  const sanPattern =
    /^([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?|O-O(-O)?)[+#]?$/;
  return sanPattern.test(move);
}

/**
 * Converts a single SAN move to LAN format using a chess position
 * @param {Chess} game - A chess.js game instance with the current position
 * @param {string} sanMove - The move in SAN format (e.g., "Nf3")
 * @returns {string|null} - The move in LAN format (e.g., "g1f3") or null if invalid
 */
function sanToLAN(game, sanMove) {
  // Store the current position
  const originalFen = game.fen();

  try {
    // Try to make the move - chess.js accepts SAN notation
    const move = game.move(sanMove);

    if (move === null) {
      return null;
    }

    // Extract from and to squares
    let lan = move.from + move.to;

    // Add promotion piece if applicable
    if (move.promotion) {
      lan += move.promotion;
    }

    // Undo the move to restore original position
    game.undo();

    return lan;
  } catch (e) {
    // Restore position in case of error
    game.load(originalFen);
    return null;
  }
}

/**
 * Converts a single LAN move to SAN format using a chess position
 * @param {Chess} game - A chess.js game instance with the current position
 * @param {string} lanMove - The move in LAN format (e.g., "g1f3")
 * @returns {string|null} - The move in SAN format (e.g., "Nf3") or null if invalid
 */
function lanToSAN(game, lanMove) {
  const from = lanMove.substring(0, 2);
  const to = lanMove.substring(2, 4);
  const promotion =
    lanMove.length > 4 ? lanMove.charAt(4).toLowerCase() : undefined;

  try {
    const move = game.move({
      from: from,
      to: to,
      promotion: promotion || "q", // Default to queen for pawn promotion
    });

    if (move === null) {
      return null;
    }

    const san = move.san;
    game.undo();
    return san;
  } catch (e) {
    return null;
  }
}

/**
 * Converts a comma-separated string of moves to LAN format
 * Automatically detects if moves are in SAN or LAN format
 * Supports branch syntax: [move1,move2|move3,move4]
 * @param {string} fen - The starting FEN position
 * @param {string} movesString - Comma-separated moves (e.g., "e4,e5,Nf3" or "e2e4,e7e5,g1f3")
 * @returns {string} - Comma-separated moves in LAN format
 */
function convertMovesToLAN(fen, movesString) {
  // Handle branch syntax
  if (movesString.includes("[")) {
    return convertMovesWithBranchesToLAN(fen, movesString);
  }

  const moves = movesString.split(",").map((m) => m.trim());

  if (moves.length === 0) {
    return movesString;
  }

  // Check if first move is already in LAN format
  if (isLANMove(moves[0])) {
    // Already in LAN format, return as-is
    return movesString;
  }

  // Convert from SAN to LAN
  const game = new Chess(fen);
  const lanMoves = [];

  for (const move of moves) {
    const lan = sanToLAN(game, move);

    if (lan === null) {
      console.error(`Invalid move: ${move} in position ${game.fen()}`);
      return movesString; // Return original if conversion fails
    }

    lanMoves.push(lan);

    // Make the move to update the position for the next move
    game.move(move);
  }

  return lanMoves.join(",");
}

/**
 * Converts moves string with nested branch syntax to LAN format
 * Supports nested brackets: "move1,[branchA|branchB,[subB1|subB2]]"
 * @param {string} fen - The starting FEN position
 * @param {string} movesString - Moves string with branch syntax
 * @returns {string} - Converted string in LAN format (preserving bracket structure)
 */
function convertMovesWithBranchesToLAN(fen, movesString) {
  const game = new Chess(fen);
  return convertBranchesRecursive(game, movesString);
}

/**
 * Recursively convert a moves string with nested brackets and alternatives
 * @param {Chess} game - Chess game at current position
 * @param {string} str - Moves string (may contain brackets [] or alternatives {})
 * @returns {string} - Converted string in LAN format
 */
function convertBranchesRecursive(game, str) {
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

  // No brackets or curly braces - convert simple moves
  if (bracketStart === -1 && curlyStart === -1) {
    return convertSimpleMoves(game, str);
  }

  // Handle curly braces (player alternatives) first if they come before brackets
  if (curlyStart !== -1 && (bracketStart === -1 || curlyStart < bracketStart)) {
    return convertAlternativesRecursive(game, str, curlyStart);
  }

  // Find matching closing bracket
  depth = 1;
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

  // Convert prefix and play through moves
  const convertedPrefix = convertSimpleMoves(game, prefix);
  playThroughMoves(game, convertedPrefix);

  // Save position after prefix
  const positionAfterPrefix = game.fen();

  // Split branches by | at depth 0
  const branches = splitByPipeOutsideBrackets(branchContent);
  const convertedBranches = [];

  for (const branch of branches) {
    // Reset to position after prefix for each branch
    game.load(positionAfterPrefix);

    // Recursively convert this branch (may contain nested brackets)
    const convertedBranch = convertBranchesRecursive(game, branch);
    convertedBranches.push(convertedBranch);
  }

  // Reset to position after prefix for suffix conversion
  game.load(positionAfterPrefix);

  // Convert suffix if present (recursively, as it may have brackets)
  let convertedSuffix = "";
  if (suffix) {
    // Need to play through one branch to get correct position for suffix
    // (all branches should end at same move count for suffix to make sense)
    if (convertedBranches.length > 0) {
      playThroughMoves(game, convertedBranches[0]);
    }
    convertedSuffix = convertBranchesRecursive(game, suffix);
  }

  // Reconstruct the string
  const prefixStr = convertedPrefix ? convertedPrefix + "," : "";
  const branchStr = "[" + convertedBranches.join("|") + "]";

  return prefixStr + branchStr + convertedSuffix;
}

/**
 * Convert player alternatives {move1|move2} to LAN format
 * @param {Chess} game - Chess game at current position
 * @param {string} str - Moves string with alternatives
 * @param {number} curlyStart - Position of opening {
 * @returns {string} - Converted string in LAN format
 */
function convertAlternativesRecursive(game, str, curlyStart) {
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

  // Convert prefix and play through moves
  const convertedPrefix = convertSimpleMoves(game, prefix);
  playThroughMoves(game, convertedPrefix);

  // Save position before alternatives (all alternatives start from same position)
  const positionBeforeAlternatives = game.fen();

  // Split alternatives by | (no nesting expected inside alternatives)
  const alternatives = alternativesContent.split("|").map((a) => a.trim());
  const convertedAlternatives = [];

  for (const alt of alternatives) {
    // Reset to position before alternatives
    game.load(positionBeforeAlternatives);
    // Convert single move
    const convertedAlt = convertSimpleMoves(game, alt);
    convertedAlternatives.push(convertedAlt);
  }

  // Reset to position before alternatives for suffix
  game.load(positionBeforeAlternatives);

  // Play one alternative to get position for suffix
  if (convertedAlternatives.length > 0) {
    playThroughMoves(game, convertedAlternatives[0]);
  }

  // Convert suffix (recursively, may have more brackets/alternatives)
  const convertedSuffix = suffix ? convertBranchesRecursive(game, suffix) : "";

  // Reconstruct the string
  const prefixStr = convertedPrefix ? convertedPrefix + "," : "";
  const altStr = "{" + convertedAlternatives.join("|") + "}";

  return prefixStr + altStr + convertedSuffix;
}

/**
 * Convert simple comma-separated moves (no brackets) to LAN
 */
function convertSimpleMoves(game, str) {
  const moves = str
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m);

  if (moves.length === 0) return "";

  const convertedMoves = [];
  const tempGame = new Chess(game.fen());

  for (const move of moves) {
    if (isLANMove(move)) {
      convertedMoves.push(move);
      const from = move.substring(0, 2);
      const to = move.substring(2, 4);
      tempGame.move({ from, to, promotion: "q" });
    } else {
      const lan = sanToLAN(tempGame, move);
      if (lan === null) {
        console.error(`Invalid move: ${move} in position ${tempGame.fen()}`);
        return str; // Return original on error
      }
      convertedMoves.push(lan);
      tempGame.move(move);
    }
  }

  return convertedMoves.join(",");
}

/**
 * Play through comma-separated LAN moves on a game
 */
function playThroughMoves(game, movesStr) {
  const moves = movesStr
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m);

  for (const move of moves) {
    if (isLANMove(move)) {
      const from = move.substring(0, 2);
      const to = move.substring(2, 4);
      game.move({ from, to, promotion: "q" });
    } else {
      game.move(move);
    }
  }
}

/**
 * Split string by | but not inside nested brackets or curly braces
 */
function splitByPipeOutsideBrackets(str) {
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

/**
 * Converts a comma-separated string of moves to SAN format
 * Automatically detects if moves are in SAN or LAN format
 * @param {string} fen - The starting FEN position
 * @param {string} movesString - Comma-separated moves (e.g., "e2e4,e7e5,g1f3")
 * @returns {string} - Comma-separated moves in SAN format
 */
function convertMovesToSAN(fen, movesString) {
  const moves = movesString.split(",").map((m) => m.trim());

  if (moves.length === 0) {
    return movesString;
  }

  // Check if first move is already in SAN format
  if (isSANMove(moves[0]) && !isLANMove(moves[0])) {
    // Already in SAN format, return as-is
    return movesString;
  }

  // Convert from LAN to SAN
  const game = new Chess(fen);
  const sanMoves = [];

  for (const move of moves) {
    const san = lanToSAN(game, move);

    if (san === null) {
      console.error(`Invalid move: ${move} in position ${game.fen()}`);
      return movesString; // Return original if conversion fails
    }

    sanMoves.push(san);

    // Make the move to update the position for the next move
    const from = move.substring(0, 2);
    const to = move.substring(2, 4);
    const promotion = move.length > 4 ? move.charAt(4).toLowerCase() : "q";
    game.move({ from, to, promotion });
  }

  return sanMoves.join(",");
}

/**
 * Normalizes a puzzle's moves to LAN format
 * This allows puzzles to be defined in either SAN or LAN notation
 * @param {Object} puzzle - Puzzle object with fen and moves properties
 * @returns {Object} - Puzzle object with moves converted to LAN format
 */
function normalizePuzzleMoves(puzzle) {
  return {
    ...puzzle,
    moves: convertMovesToLAN(puzzle.fen, puzzle.moves),
  };
}

/**
 * Normalizes an array of puzzles to LAN format
 * @param {Array} puzzles - Array of puzzle objects
 * @returns {Array} - Array of puzzles with moves in LAN format
 */
function normalizePuzzles(puzzles) {
  return puzzles.map(normalizePuzzleMoves);
}

// Export for use in other files (if using modules) or make globally available
if (typeof window !== "undefined") {
  window.NotationConverter = {
    isLANMove,
    isSANMove,
    sanToLAN,
    lanToSAN,
    convertMovesToLAN,
    convertMovesToSAN,
    normalizePuzzleMoves,
    normalizePuzzles,
  };
}
