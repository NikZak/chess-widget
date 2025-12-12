/**
 * Main chess widget logic
 * Uses chessboard.js built-in marker system for square highlighting
 */

(function () {
  "use strict";

  if (window.ChessWidgetIsRunning) {
    return;
  }
  window.ChessWidgetIsRunning = true;

  window.ChessWidget = {
    Puzzles: [],
    currentLang: "ru",
    t: null,
  };

  // --- MARKER DEFINITIONS ---
  // Define markers for different highlight types using chessboard.js marker system
  const goodMarker = { class: "good-square", slice: "markerSquare" };
  const badMarker = { class: "bad-square", slice: "markerSquare" };
  const checkMarker = { class: "check-square", slice: "markerSquare" };

  // --- CSS INJECTION FOR MARKERS ---
  // Styles for chessboard.js markers (SVG elements)
  // The Markers extension adds class "marker" + the marker type class
  const style = document.createElement("style");
  style.innerHTML = `
    /* Marker styles - these target the chessboard.js SVG marker elements */
    .cm-chessboard .marker.good-square,
    .cm-chessboard .marker.good-square use {
      fill: rgba(155, 199, 0, 0.41) !important; /* Greenish for valid moves */
    }
    .cm-chessboard .marker.bad-square,
    .cm-chessboard .marker.bad-square use {
      fill: rgba(255, 255, 0, 0.4) !important; /* Yellowish for source square */
    }
    .cm-chessboard .marker.check-square,
    .cm-chessboard .marker.check-square use {
      fill: rgba(255, 0, 0, 0.5) !important; /* Red for check */
    }
    
    /* Branch info styling */
    .branch-info {
      font-size: 0.85rem;
      color: #7f8c8d;
      margin-bottom: 5px;
      padding: 4px 8px;
      background: #f0f0f0;
      border-radius: 4px;
      display: inline-block;
    }
    .branch-info.branch-complete {
      background: #d5f5e3;
      color: #27ae60;
    }
  `;
  document.head.appendChild(style);

  window.ChessWidget.currentLang = getLanguage();
  window.ChessWidget.t = createTranslator(window.ChessWidget.currentLang);
  const puzzlesData = parsePuzzlesFromURL();

  function initPuzzles() {
    console.log("[DEBUG] Starting initPuzzles...");

    const container = $("#puzzles-container");
    container.empty();

    window.ChessWidget.Puzzles = [];

    puzzlesData.forEach((puzzleData, index) => {
      const puzzleId = `puzzle-${index}`;

      // Parse branches from moves string
      const branches = parseBranchMoves(puzzleData.moves);
      const hasBranches = branches.length > 1;

      const puzzleHtml = `
        <div class="widget-container" id="${puzzleId}-container">
          <div class="puzzle-instruction" id="${puzzleId}-instruction">${
        puzzleData.message || ""
      }</div>
          ${
            hasBranches
              ? `<div id="${puzzleId}-branch-info" class="branch-info"></div>`
              : ""
          }
          <div id="${puzzleId}-status" class="status-message status-neutral">${window.ChessWidget.t(
        "loading"
      )}</div>
          <div id="${puzzleId}-board"></div>
        </div>
      `;
      container.append(puzzleHtml);

      const tempGame = new Chess(puzzleData.fen);
      // Determine orientation directly from FEN string: extract turn indicator (w/b) after board position
      // FEN format: "board position" "turn" "castling" "en passant" "halfmove" "fullmove"
      const fenParts = puzzleData.fen.split(/\s+/);
      const turnFromFen = fenParts[1] || tempGame.turn(); // Fallback to chess.js if FEN parsing fails
      const orientation = turnFromFen === "w" ? "white" : "black";

      const puzzleState = {
        id: puzzleId,
        game: new Chess(puzzleData.fen),
        board: null,
        // Branch support
        branches: branches,
        currentBranchIdx: 0,
        solution: branches[0], // Current branch moves
        currentMoveIdx: 0,
        isPlayerTurn: true,
        orientation: orientation,
        fen: puzzleData.fen,
        message: puzzleData.message || "",
        waitingForOpponent: false,
      };

      window.ChessWidget.Puzzles.push(puzzleState);

      const boardElement = document.getElementById(`${puzzleId}-board`);

      const config = {
        position: puzzleData.fen,
        orientation: orientation,
        assetsUrl: "https://cdn.jsdelivr.net/npm/cm-chessboard/assets/",
        style: {
          cssClass: "default",
          showCoordinates: false,
        },
        sprite: {
          url: "https://cdn.jsdelivr.net/npm/cm-chessboard/assets/images/chessboard-sprite-staunty.svg",
        },
        responsive: true,
        animationDuration: 300,
        extensions: [
          { class: window.Markers, props: { autoMarkers: null } }, // Disable auto markers, we'll handle them manually
        ],
      };

      puzzleState.board = new Chessboard(boardElement, config);

      puzzleState.board.initialized
        .then(() => {
          // Explicitly set orientation after initialization to ensure it's applied
          if (puzzleState.board.setOrientation) {
            // Use COLOR constants if available, otherwise use string values
            const orientationValue = window.COLOR
              ? orientation === "white"
                ? window.COLOR.white
                : window.COLOR.black
              : orientation;
            puzzleState.board.setOrientation(orientationValue);
            console.log(
              "Set orientation to",
              orientation,
              "for puzzle",
              puzzleId
            );
          }
          enablePlayerInput(index);
        })
        .catch((err) => {
          console.error(`Board initialization failed for ${puzzleId}:`, err);
        });

      setTimeout(() => {
        updateStatus(index, window.ChessWidget.t("yourTurn"));
        updateBranchInfo(index);
        if (index === puzzlesData.length - 1) {
          setTimeout(notifyHeight, 500);
        }
      }, 300 + index * 100);
    });

    setTimeout(notifyHeight, 1000);
  }

  // Update branch progress display
  function updateBranchInfo(puzzleIndex) {
    const state = window.ChessWidget.Puzzles[puzzleIndex];
    if (!state || state.branches.length <= 1) return;

    const branchInfoEl = document.getElementById(`${state.id}-branch-info`);
    if (!branchInfoEl) return;

    const msg = window.ChessWidget.t("branchProgress")
      .replace("{current}", state.currentBranchIdx + 1)
      .replace("{total}", state.branches.length);
    branchInfoEl.textContent = msg;
    branchInfoEl.classList.remove("branch-complete");
  }

  // Find common prefix length between two branches (nearest common ancestor)
  function findCommonPrefixLength(branch1, branch2) {
    const minLen = Math.min(branch1.length, branch2.length);
    let commonLen = 0;

    for (let i = 0; i < minLen; i++) {
      if (branch1[i] === branch2[i]) {
        commonLen = i + 1;
      } else {
        break;
      }
    }

    return commonLen;
  }

  // Get position (FEN) after playing N moves from start
  function getPositionAfterMoves(startFen, moves, count) {
    const game = new Chess(startFen);
    for (let i = 0; i < count && i < moves.length; i++) {
      const move = moves[i];
      const from = move.substring(0, 2);
      const to = move.substring(2, 4);
      game.move({ from, to, promotion: "q" });
    }
    return game.fen();
  }

  // Reset puzzle for next branch (resets to nearest common ancestor, not beginning)
  function startNextBranch(puzzleIndex) {
    const state = window.ChessWidget.Puzzles[puzzleIndex];
    if (!state) return;

    const prevBranchIdx = state.currentBranchIdx;
    state.currentBranchIdx++;

    // Check if all branches completed
    if (state.currentBranchIdx >= state.branches.length) {
      updateStatus(puzzleIndex, window.ChessWidget.t("victory"), "correct");
      notifyParentSuccess(puzzleIndex);
      return;
    }

    // Find nearest common ancestor between previous and next branch
    const prevBranch = state.branches[prevBranchIdx];
    const nextBranch = state.branches[state.currentBranchIdx];
    const commonPrefixLen = findCommonPrefixLength(prevBranch, nextBranch);

    // Calculate branch point position
    const branchPointFen = getPositionAfterMoves(
      state.fen,
      nextBranch,
      commonPrefixLen
    );
    const branchPointMoveIdx = commonPrefixLen;

    // Reset game to branch point (nearest common ancestor)
    state.game = new Chess(branchPointFen);
    state.solution = nextBranch;
    state.currentMoveIdx = branchPointMoveIdx;
    state.waitingForOpponent = false;

    // At branch point, opponent responds differently - so it's opponent's turn
    // The branch point is after player's move, before opponent's response
    state.isPlayerTurn = false;

    // Animate board reset to branch point
    state.board.setPosition(branchPointFen, true).then(() => {
      // Clear all markers
      try {
        state.board.removeMarkers(goodMarker);
        state.board.removeMarkers(badMarker);
        state.board.removeMarkers(checkMarker);
      } catch (e) {
        console.error("Failed to remove markers:", e);
      }
      updateBranchInfo(puzzleIndex);
      updateStatus(puzzleIndex, window.ChessWidget.t("nextBranch"));

      // After brief pause, opponent makes their (different) response
      setTimeout(() => {
        makeOpponentMove(puzzleIndex);
      }, 800);
    });
  }

  function enablePlayerInput(index) {
    if (!window.ChessWidget.Puzzles[index]) return;
    const state = window.ChessWidget.Puzzles[index];
    if (!state.board) return;

    try {
      state.board.disableMoveInput();
    } catch (e) {}

    setTimeout(() => {
      try {
        state.board.enableMoveInput((event) => {
          return onMoveInput(index, event);
        });
      } catch (e) {
        console.error(`[DEBUG] Failed to enable input for puzzle ${index}:`, e);
      }
    }, 10);
  }

  function onMoveInput(puzzleIndex, event) {
    const state = window.ChessWidget.Puzzles[puzzleIndex];

    switch (event.type) {
      case "moveInputStarted":
        if (state.game.game_over() || !state.isPlayerTurn) {
          return false;
        }
        const piece = state.game.get(event.squareFrom);
        if (!piece || piece.color !== state.game.turn()) {
          return false;
        }
        // Highlight the source square
        try {
          state.board.addMarker(badMarker, event.squareFrom);
        } catch (e) {
          console.error("Failed to add marker:", e);
        }
        return true;

      case "validateMoveInput":
        if (!event.squareTo) {
          try {
            state.board.removeMarkers(badMarker);
          } catch (e) {
            console.error("Failed to remove markers:", e);
          }
          return false;
        }
        return processMove(puzzleIndex, event.squareFrom, event.squareTo);

      case "moveInputFinished":
        if (state.waitingForOpponent) {
          state.waitingForOpponent = false;
          try {
            state.board.disableMoveInput();
          } catch (e) {}
          setTimeout(() => {
            makeOpponentMove(puzzleIndex);
          }, 500);
        }
        return true;

      case "moveInputCanceled":
        try {
          state.board.removeMarkers(badMarker);
        } catch (e) {
          console.error("Failed to remove markers:", e);
        }
        state.waitingForOpponent = false;
        return true;

      default:
        return true;
    }
  }

  function processMove(puzzleIndex, source, target) {
    const state = window.ChessWidget.Puzzles[puzzleIndex];

    // Clear all markers
    try {
      state.board.removeMarkers(goodMarker);
      state.board.removeMarkers(badMarker);
      state.board.removeMarkers(checkMarker);
    } catch (e) {
      console.error("Failed to remove markers:", e);
    }

    const moveObj = { from: source, to: target, promotion: "q" };
    const move = state.game.move(moveObj);

    if (move === null) return false;

    const userMoveString = source + target;
    const expectedMove = state.solution[state.currentMoveIdx];

    // Check if move is correct - handle both single moves and alternatives
    const isCorrectMove = isMoveCorrect(userMoveString, expectedMove);

    if (isCorrectMove) {
      state.currentMoveIdx++;

      // Highlight the valid move (From and To)
      try {
        state.board.addMarker(goodMarker, source);
        state.board.addMarker(goodMarker, target);
      } catch (e) {
        console.error("Failed to add markers:", e);
      }

      if (state.game.in_checkmate()) {
        const kingSquare = getKingSquare(puzzleIndex, state.game.turn());
        if (kingSquare) {
          try {
            state.board.addMarker(checkMarker, kingSquare);
          } catch (e) {
            console.error("Failed to add check marker:", e);
          }
        }

        if (state.currentMoveIdx >= state.solution.length) {
          // Branch/puzzle complete with checkmate
          if (
            state.branches.length > 1 &&
            state.currentBranchIdx < state.branches.length - 1
          ) {
            // More branches to solve
            updateStatus(
              puzzleIndex,
              window.ChessWidget.t("checkmate") +
                "! " +
                window.ChessWidget.t("branchComplete"),
              "checkmate"
            );
            state.waitingForOpponent = false;
            setTimeout(() => startNextBranch(puzzleIndex), 1500);
          } else {
            // All branches done
            updateStatus(
              puzzleIndex,
              window.ChessWidget.t("checkmate") +
                " " +
                window.ChessWidget.t("victory"),
              "checkmate"
            );
            notifyParentSuccess(puzzleIndex);
            state.waitingForOpponent = false;
          }
        } else {
          state.waitingForOpponent = true;
        }
        return true;
      }

      if (state.game.in_check()) {
        const kingSquare = getKingSquare(puzzleIndex, state.game.turn());
        if (kingSquare) {
          try {
            state.board.addMarker(checkMarker, kingSquare);
          } catch (e) {
            console.error("Failed to add check marker:", e);
          }
        }
      }

      if (state.currentMoveIdx >= state.solution.length) {
        // Branch complete (no checkmate)
        if (
          state.branches.length > 1 &&
          state.currentBranchIdx < state.branches.length - 1
        ) {
          // More branches to solve
          updateStatus(
            puzzleIndex,
            window.ChessWidget.t("branchComplete"),
            "correct"
          );
          state.waitingForOpponent = false;
          setTimeout(() => startNextBranch(puzzleIndex), 1500);
        } else {
          // All branches done
          updateStatus(puzzleIndex, window.ChessWidget.t("victory"), "correct");
          notifyParentSuccess(puzzleIndex);
          state.waitingForOpponent = false;
        }
        return true;
      }

      const statusMessage = state.game.in_check()
        ? window.ChessWidget.t("check") + "! " + window.ChessWidget.t("correct")
        : window.ChessWidget.t("correct");
      updateStatus(puzzleIndex, statusMessage, "correct");

      state.isPlayerTurn = false;
      state.waitingForOpponent = true;
      return true;
    } else {
      updateStatus(puzzleIndex, window.ChessWidget.t("wrongMove"), "error");
      state.game.undo();
      // Clear all markers
      try {
        state.board.removeMarkers(goodMarker);
        state.board.removeMarkers(badMarker);
        state.board.removeMarkers(checkMarker);
      } catch (e) {
        console.error("Failed to remove markers:", e);
      }
      setTimeout(() => {
        try {
          state.board.setPosition(state.game.fen(), false);
        } catch (e) {}
      }, 200);
      return false;
    }
  }

  function makeOpponentMove(puzzleIndex) {
    const state = window.ChessWidget.Puzzles[puzzleIndex];
    if (state.currentMoveIdx >= state.solution.length) return;

    const opponentMoveString = state.solution[state.currentMoveIdx];
    const fromSq = opponentMoveString.substring(0, 2);
    const toSq = opponentMoveString.substring(2, 4);

    state.game.move({ from: fromSq, to: toSq, promotion: "q" });

    state.board
      .setPosition(state.game.fen(), true)
      .then(() => {
        // Clear all markers
        try {
          state.board.removeMarkers(goodMarker);
          state.board.removeMarkers(badMarker);
          state.board.removeMarkers(checkMarker);
          // Highlight opponent's move
          state.board.addMarker(goodMarker, fromSq);
          state.board.addMarker(goodMarker, toSq);
        } catch (e) {
          console.error("Failed to update markers:", e);
        }

        if (state.game.in_checkmate()) {
          const kingSquare = getKingSquare(puzzleIndex, state.game.turn());
          if (kingSquare) {
            try {
              state.board.addMarker(checkMarker, kingSquare);
            } catch (e) {
              console.error("Failed to add check marker:", e);
            }
          }
          state.currentMoveIdx++;

          // Check if more branches to solve
          if (
            state.branches.length > 1 &&
            state.currentBranchIdx < state.branches.length - 1
          ) {
            updateStatus(
              puzzleIndex,
              window.ChessWidget.t("checkmate") +
                "! " +
                window.ChessWidget.t("branchComplete"),
              "checkmate"
            );
            setTimeout(() => startNextBranch(puzzleIndex), 1500);
          } else {
            updateStatus(
              puzzleIndex,
              window.ChessWidget.t("checkmate") +
                "! " +
                window.ChessWidget.t("victory"),
              "checkmate"
            );
            notifyParentSuccess(puzzleIndex);
          }
          return;
        }

        if (state.game.in_check()) {
          const kingSquare = getKingSquare(puzzleIndex, state.game.turn());
          if (kingSquare) {
            try {
              state.board.addMarker(checkMarker, kingSquare);
            } catch (e) {
              console.error("Failed to add check marker:", e);
            }
          }
        }

        state.currentMoveIdx++;
        state.isPlayerTurn = true;

        const statusMessage = state.game.in_check()
          ? window.ChessWidget.t("check") +
            "! " +
            window.ChessWidget.t("yourTurn")
          : window.ChessWidget.t("yourTurn");
        updateStatus(puzzleIndex, statusMessage);

        enablePlayerInput(puzzleIndex);
      })
      .catch((err) => {
        console.error("Error animating opponent move:", err);
        state.board.setPosition(state.game.fen(), false);
        state.isPlayerTurn = true;
        enablePlayerInput(puzzleIndex);
      });
  }

  // --- MOVE VALIDATION HELPERS ---

  /**
   * Check if a player move matches the expected move
   * Handles both single moves and alternatives (arrays)
   * @param {string} userMove - The move the user played (e.g., "e2e4")
   * @param {string|Array} expectedMove - Expected move or array of alternatives
   * @returns {boolean} - True if move is correct
   */
  function isMoveCorrect(userMove, expectedMove) {
    if (Array.isArray(expectedMove)) {
      // Multiple alternatives - any match is correct
      return expectedMove.some((alt) => userMove === alt);
    }
    // Single expected move
    return userMove === expectedMove;
  }

  // --- MARKER HELPER FUNCTIONS ---
  // Using chessboard.js built-in marker system

  function getKingSquare(puzzleIndex, color) {
    const state = window.ChessWidget.Puzzles[puzzleIndex];
    const board = state.game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === "k" && piece.color === color) {
          const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
          const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];
          return files[c] + ranks[r];
        }
      }
    }
    return null;
  }

  // --- Loader Logic ---
  let hasInitialized = false;

  window.initPuzzlesReady = function () {
    if (window.Chessboard && typeof $ !== "undefined") {
      $(document).ready(function () {
        if (!hasInitialized) {
          hasInitialized = true;
          initPuzzles();
        }
      });
    } else {
      setTimeout(window.initPuzzlesReady, 100);
    }
  };

  window.initPuzzlesReady();
})();
