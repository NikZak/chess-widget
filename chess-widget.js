/**
 * Main chess widget logic
 * FIXED:
 * 1. Replaced library 'addMarker' with custom DOM-based highlighting.
 * 2. This fixes the "state.board.addMarker is not a function" error.
 * 3. Works by calculating percentage positions (12.5% per square).
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

  // --- CSS INJECTION FOR HIGHLIGHTS ---
  // We inject styles for our custom highlights so we don't depend on external CSS
  const style = document.createElement("style");
  style.innerHTML = `
    .custom-highlight-layer {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; /* Let clicks pass through to the board */
      z-index: 1; /* Below pieces (usually z-index 10+), above board bg */
    }
    .custom-highlight-square {
      position: absolute;
      width: 12.5%; 
      height: 12.5%;
      display: block;
    }
    .highlight-source { background-color: rgba(255, 255, 0, 0.4); } /* Yellowish */
    .highlight-move { background-color: rgba(155, 199, 0, 0.41); } /* Greenish */
    .highlight-check { background-color: rgba(255, 0, 0, 0.5); }   /* Red */
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

      const puzzleHtml = `
        <div class="widget-container" id="${puzzleId}-container">
          <div class="puzzle-instruction" id="${puzzleId}-instruction">${
        puzzleData.message || ""
      }</div>
          <div id="${puzzleId}-status" class="status-message status-neutral">${window.ChessWidget.t(
        "loading"
      )}</div>
          <div id="${puzzleId}-board" style="position: relative;"></div> <!-- Relative for absolute overlay -->
        </div>
      `;
      container.append(puzzleHtml);

      const solution = puzzleData.moves.split(",").map((m) => m.trim());
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
        solution: solution,
        currentMoveIdx: 0,
        isPlayerTurn: true,
        orientation: orientation,
        fen: puzzleData.fen,
        message: puzzleData.message || "",
        waitingForOpponent: false,
      };

      window.ChessWidget.Puzzles.push(puzzleState);

      const boardElement = document.getElementById(`${puzzleId}-board`);

      // Initialize the custom highlight layer
      createHighlightLayer(boardElement, index);

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
        if (index === puzzlesData.length - 1) {
          setTimeout(notifyHeight, 500);
        }
      }, 300 + index * 100);
    });

    setTimeout(notifyHeight, 1000);
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
        highlightSquare(puzzleIndex, event.squareFrom, "highlight-source");
        return true;

      case "validateMoveInput":
        if (!event.squareTo) {
          clearHighlights(puzzleIndex);
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
        clearHighlights(puzzleIndex);
        state.waitingForOpponent = false;
        return true;

      default:
        return true;
    }
  }

  function processMove(puzzleIndex, source, target) {
    const state = window.ChessWidget.Puzzles[puzzleIndex];

    clearHighlights(puzzleIndex);

    const moveObj = { from: source, to: target, promotion: "q" };
    const move = state.game.move(moveObj);

    if (move === null) return false;

    const userMoveString = source + target;
    const correctMoveString = state.solution[state.currentMoveIdx];

    if (userMoveString === correctMoveString) {
      state.currentMoveIdx++;

      // Highlight the valid move (From and To)
      highlightMove(puzzleIndex, source, target);

      if (state.game.in_checkmate()) {
        const kingSquare = getKingSquare(puzzleIndex, state.game.turn());
        if (kingSquare)
          highlightSquare(puzzleIndex, kingSquare, "highlight-check");

        if (state.currentMoveIdx >= state.solution.length) {
          updateStatus(
            puzzleIndex,
            window.ChessWidget.t("checkmate") +
              " " +
              window.ChessWidget.t("victory"),
            "checkmate"
          );
          notifyParentSuccess(puzzleIndex);
          state.waitingForOpponent = false;
        } else {
          state.waitingForOpponent = true;
        }
        return true;
      }

      if (state.game.in_check()) {
        const kingSquare = getKingSquare(puzzleIndex, state.game.turn());
        if (kingSquare)
          highlightSquare(puzzleIndex, kingSquare, "highlight-check");
      }

      if (state.currentMoveIdx >= state.solution.length) {
        updateStatus(puzzleIndex, window.ChessWidget.t("victory"), "correct");
        notifyParentSuccess(puzzleIndex);
        state.waitingForOpponent = false;
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
      clearHighlights(puzzleIndex);
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
        clearHighlights(puzzleIndex);
        highlightMove(puzzleIndex, fromSq, toSq);

        if (state.game.in_checkmate()) {
          const kingSquare = getKingSquare(puzzleIndex, state.game.turn());
          if (kingSquare)
            highlightSquare(puzzleIndex, kingSquare, "highlight-check");
          state.currentMoveIdx++;
          updateStatus(
            puzzleIndex,
            window.ChessWidget.t("checkmate") +
              "! " +
              window.ChessWidget.t("victory"),
            "checkmate"
          );
          notifyParentSuccess(puzzleIndex);
          return;
        }

        if (state.game.in_check()) {
          const kingSquare = getKingSquare(puzzleIndex, state.game.turn());
          if (kingSquare)
            highlightSquare(puzzleIndex, kingSquare, "highlight-check");
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

  // --- CUSTOM HIGHLIGHTING SYSTEM ---

  function createHighlightLayer(boardElement, index) {
    // Create a dedicated div for highlights that sits on top of the board
    const layerId = `highlight-layer-${index}`;
    if (document.getElementById(layerId)) return;

    const layer = document.createElement("div");
    layer.id = layerId;
    layer.className = "custom-highlight-layer";
    boardElement.appendChild(layer);
  }

  function highlightSquare(puzzleIndex, square, cssClass) {
    const state = window.ChessWidget.Puzzles[puzzleIndex];
    const layer = document.getElementById(`highlight-layer-${puzzleIndex}`);
    if (!layer || !square) return;

    // Calculate position
    const fileMap = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 };
    const file = fileMap[square.charAt(0)];
    const rank = parseInt(square.charAt(1)) - 1; // 0-7

    let top, left;

    if (state.orientation === "white") {
      left = file * 12.5;
      top = (7 - rank) * 12.5;
    } else {
      left = (7 - file) * 12.5;
      top = rank * 12.5;
    }

    const div = document.createElement("div");
    div.className = `custom-highlight-square ${cssClass}`;
    div.style.left = `${left}%`;
    div.style.top = `${top}%`;

    layer.appendChild(div);
  }

  function highlightMove(puzzleIndex, from, to) {
    highlightSquare(puzzleIndex, from, "highlight-move");
    highlightSquare(puzzleIndex, to, "highlight-move");
  }

  function clearHighlights(puzzleIndex) {
    const layer = document.getElementById(`highlight-layer-${puzzleIndex}`);
    if (layer) {
      layer.innerHTML = "";
    }
  }

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
