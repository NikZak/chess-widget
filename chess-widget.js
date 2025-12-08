/**
 * Main chess widget logic
 * FIXED: Removed strict Event Type check that was blocking clicks.
 */

(function () {
  "use strict";

  // --- 1. Prevent Double Execution ---
  if (window.ChessWidgetIsRunning) {
    return;
  }
  window.ChessWidgetIsRunning = true;

  // Initialize widget namespace
  window.ChessWidget = {
    Puzzles: [],
    currentLang: "ru",
    t: null,
  };

  // Initialize configuration
  window.ChessWidget.currentLang = getLanguage();
  window.ChessWidget.t = createTranslator(window.ChessWidget.currentLang);
  const puzzlesData = parsePuzzlesFromURL();

  // Initialize puzzles
  function initPuzzles() {
    console.log("[DEBUG] Starting initPuzzles...");

    const container = $("#puzzles-container");
    container.empty();

    // Clear the State Array to prevent "ghost" puzzles
    window.ChessWidget.Puzzles = [];

    puzzlesData.forEach((puzzleData, index) => {
      const puzzleId = `puzzle-${index}`;

      // Create HTML
      const puzzleHtml = `
        <div class="widget-container" id="${puzzleId}-container">
          <div class="puzzle-instruction" id="${puzzleId}-instruction">${
        puzzleData.message || ""
      }</div>
          <div id="${puzzleId}-status" class="status-message status-neutral">${window.ChessWidget.t(
        "loading"
      )}</div>
          <div id="${puzzleId}-board"></div>
        </div>
      `;
      container.append(puzzleHtml);

      // Prepare Logic
      const solution = puzzleData.moves.split(",").map((m) => m.trim());
      const tempGame = new Chess(puzzleData.fen);
      const orientation = tempGame.turn() === "w" ? "white" : "black";

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

      // Push to State Array
      window.ChessWidget.Puzzles.push(puzzleState);

      const boardElement = document.getElementById(`${puzzleId}-board`);

      // Configuration for cm-chessboard
      const config = {
        position: puzzleData.fen,
        orientation: orientation,
        assetsUrl: "https://cdn.jsdelivr.net/npm/cm-chessboard/assets/",
        style: {
          cssClass: "default",
          showCoordinates: false,
          pieces: {
            type: "svgSprite",
            file: "pieces/standard.svg",
          },
        },
        sprite: {
          url: "https://cdn.jsdelivr.net/npm/cm-chessboard/assets/images/chessboard-sprite-staunty.svg",
        },
        responsive: true,
        animationDuration: 300,
      };

      // Initialize Board
      puzzleState.board = new Chessboard(boardElement, config);

      puzzleState.board.initialized
        .then(() => {
          console.log(`[DEBUG] Board initialized for ${puzzleId}`);
          enablePlayerInput(index);
        })
        .catch((err) => {
          console.error(`Board initialization failed for ${puzzleId}:`, err);
        });

      // UI Updates
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

    // Reset input first to be safe
    try {
      state.board.disableMoveInput();
    } catch (e) {}

    setTimeout(() => {
      try {
        state.board.enableMoveInput((event) => {
          return onMoveInput(index, event);
        });
        console.log(`[DEBUG] Input enabled for puzzle ${index}`);
      } catch (e) {
        console.error(`[DEBUG] Failed to enable input for puzzle ${index}:`, e);
      }
    }, 10);
  }

  function onMoveInput(puzzleIndex, event) {
    const state = window.ChessWidget.Puzzles[puzzleIndex];

    // --- FIX: Use string literals instead of checking window.Chessboard.INPUT_EVENT_TYPE ---
    // This ensures it works even if the Enum isn't exposed globally.

    switch (event.type) {
      case "moveInputStarted":
        if (state.game.game_over() || !state.isPlayerTurn) {
          return false;
        }
        // Validate piece color
        const piece = state.game.get(event.squareFrom);
        if (!piece || piece.color !== state.game.turn()) {
          return false;
        }
        return true;

      case "validateMoveInput":
        if (!event.squareTo) return false;
        return processMove(puzzleIndex, event.squareFrom, event.squareTo);

      case "moveInputFinished":
        // If it was a valid move (handled in validateMoveInput), we might need to trigger opponent
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
        state.waitingForOpponent = false;
        return true;

      default:
        return true;
    }
  }

  function processMove(puzzleIndex, source, target) {
    const state = window.ChessWidget.Puzzles[puzzleIndex];
    clearHighlights(puzzleIndex);

    // Attempt move in chess.js logic
    const moveObj = { from: source, to: target, promotion: "q" };
    const move = state.game.move(moveObj);

    // If illegal move in chess rules, return false (snap back)
    if (move === null) return false;

    const userMoveString = source + target;
    const correctMoveString = state.solution[state.currentMoveIdx];

    // Check against puzzle solution
    if (userMoveString === correctMoveString) {
      state.currentMoveIdx++;

      // Check for immediate checkmate by player
      if (state.game.in_checkmate()) {
        const kingSquare = getKingSquare(puzzleIndex, state.game.turn());
        if (kingSquare) highlightSquare(puzzleIndex, kingSquare);

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

      // Check for Check
      if (state.game.in_check()) {
        const kingSquare = getKingSquare(puzzleIndex, state.game.turn());
        if (kingSquare) highlightCheck(puzzleIndex, kingSquare);
      }

      // Check if puzzle is finished
      if (state.currentMoveIdx >= state.solution.length) {
        updateStatus(puzzleIndex, window.ChessWidget.t("victory"), "correct");
        notifyParentSuccess(puzzleIndex);
        state.waitingForOpponent = false;
        return true;
      }

      // Puzzle continues
      const statusMessage = state.game.in_check()
        ? window.ChessWidget.t("check") + "! " + window.ChessWidget.t("correct")
        : window.ChessWidget.t("correct");
      updateStatus(puzzleIndex, statusMessage, "correct");

      state.isPlayerTurn = false;
      state.waitingForOpponent = true;
      return true;
    } else {
      // WRONG MOVE: Undo logic
      updateStatus(puzzleIndex, window.ChessWidget.t("wrongMove"), "error");
      state.game.undo();
      // Force board reset to remove the dragged piece visual if needed
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
        if (state.game.in_checkmate()) {
          const kingSquare = getKingSquare(puzzleIndex, state.game.turn());
          if (kingSquare) highlightSquare(puzzleIndex, kingSquare);
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
          if (kingSquare) highlightCheck(puzzleIndex, kingSquare);
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
        // Fallback if animation fails
        state.board.setPosition(state.game.fen(), false);
        state.isPlayerTurn = true;
        enablePlayerInput(puzzleIndex);
      });
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
