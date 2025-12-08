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
 * @param {string} fen - The starting FEN position
 * @param {string} movesString - Comma-separated moves (e.g., "e4,e5,Nf3" or "e2e4,e7e5,g1f3")
 * @returns {string} - Comma-separated moves in LAN format
 */
function convertMovesToLAN(fen, movesString) {
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
