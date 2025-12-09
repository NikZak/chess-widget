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
 * Converts moves string with branch syntax to LAN format
 * Branch syntax: "move1,[branchA1,branchA2|branchB1,branchB2]"
 * @param {string} fen - The starting FEN position
 * @param {string} movesString - Moves string with branch syntax
 * @returns {string} - Converted string in LAN format
 */
function convertMovesWithBranchesToLAN(fen, movesString) {
  // Find the bracket section
  const bracketStart = movesString.indexOf("[");
  const bracketEnd = movesString.lastIndexOf("]");

  if (bracketStart === -1 || bracketEnd === -1) {
    return convertMovesToLAN(fen, movesString);
  }

  // Split into prefix, branch content, and suffix
  const prefix = movesString.substring(0, bracketStart);
  const branchContent = movesString.substring(bracketStart + 1, bracketEnd);
  const suffix = movesString.substring(bracketEnd + 1);

  // Convert prefix moves (before the branch)
  const prefixMoves = prefix
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m);

  const game = new Chess(fen);
  const convertedPrefix = [];

  // Check if already LAN
  const isAlreadyLAN = prefixMoves.length > 0 && isLANMove(prefixMoves[0]);

  if (!isAlreadyLAN) {
    for (const move of prefixMoves) {
      const lan = sanToLAN(game, move);
      if (lan === null) {
        console.error(`Invalid prefix move: ${move} in position ${game.fen()}`);
        return movesString;
      }
      convertedPrefix.push(lan);
      game.move(move);
    }
  } else {
    // Already LAN - just play through the moves
    for (const move of prefixMoves) {
      convertedPrefix.push(move);
      const from = move.substring(0, 2);
      const to = move.substring(2, 4);
      game.move({ from, to, promotion: "q" });
    }
  }

  // Save position after prefix for each branch
  const positionAfterPrefix = game.fen();

  // Split branches by | (not inside nested brackets)
  const branches = splitByPipeOutsideBrackets(branchContent);
  const convertedBranches = [];

  for (const branch of branches) {
    // Reset to position after prefix for each branch
    game.load(positionAfterPrefix);

    const branchMoves = branch
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m);
    const convertedBranchMoves = [];

    for (const move of branchMoves) {
      if (isAlreadyLAN || isLANMove(move)) {
        convertedBranchMoves.push(move);
        const from = move.substring(0, 2);
        const to = move.substring(2, 4);
        game.move({ from, to, promotion: "q" });
      } else {
        const lan = sanToLAN(game, move);
        if (lan === null) {
          console.error(
            `Invalid branch move: ${move} in position ${game.fen()}`
          );
          return movesString;
        }
        convertedBranchMoves.push(lan);
        game.move(move);
      }
    }

    convertedBranches.push(convertedBranchMoves.join(","));
  }

  // Convert suffix if present
  let convertedSuffix = "";
  if (suffix && suffix.startsWith(",")) {
    const suffixMoves = suffix
      .substring(1)
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m);
    // Note: suffix conversion would need position context from end of branches
    // For now, just pass through (suffix is rare in branch syntax)
    convertedSuffix = suffix;
  }

  // Reconstruct the string
  const prefixStr =
    convertedPrefix.length > 0 ? convertedPrefix.join(",") + "," : "";
  const branchStr = "[" + convertedBranches.join("|") + "]";

  return prefixStr + branchStr + convertedSuffix;
}

/**
 * Split string by | but not inside nested brackets
 */
function splitByPipeOutsideBrackets(str) {
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
