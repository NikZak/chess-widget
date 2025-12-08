/**
 * UI helper functions for chess widget
 */

// Highlight selected square
function highlightSelectedSquare(puzzleIndex, square) {
  try {
    const state = window.ChessWidget.Puzzles[puzzleIndex];
    if (!state || !state.id) return;

    clearSelectedHighlight(puzzleIndex);

    // Use jQuery like the other highlight functions for consistency
    const $square = $(`#${state.id}-board [data-square="${square}"]`);
    if ($square.length > 0) {
      $square.addClass("square-selected");
      console.log(
        `[DEBUG] Highlighted square: ${square}`,
        $square[0],
        $square[0].className,
        $square[0].tagName
      );
    } else {
      console.warn(
        `[DEBUG] Square element not found: ${square} in board ${state.id}-board`
      );
      // Try again after a short delay in case squares aren't rendered yet
      setTimeout(() => {
        const $squareRetry = $(`#${state.id}-board [data-square="${square}"]`);
        if ($squareRetry.length > 0) {
          $squareRetry.addClass("square-selected");
          console.log(`[DEBUG] Highlighted square (retry): ${square}`);
        }
      }, 50);
    }
  } catch (e) {
    console.error("Error highlighting square:", e);
  }
}

// Clear selected square highlight
function clearSelectedHighlight(puzzleIndex) {
  try {
    const state = window.ChessWidget.Puzzles[puzzleIndex];
    if (!state || !state.id) return;

    // Use jQuery like the other highlight functions for consistency
    $(`#${state.id}-board [data-square]`).removeClass("square-selected");
  } catch (e) {
    console.error("Error clearing highlight:", e);
  }
}

// Highlight square for checkmate
function highlightSquare(puzzleIndex, square) {
  const state = window.ChessWidget.Puzzles[puzzleIndex];
  clearHighlights(puzzleIndex);
  $(`#${state.id}-board [data-square="${square}"]`).addClass(
    "square-highlight-checkmate"
  );
}

// Highlight square for check
function highlightCheck(puzzleIndex, square) {
  const state = window.ChessWidget.Puzzles[puzzleIndex];
  clearHighlights(puzzleIndex);
  $(`#${state.id}-board [data-square="${square}"]`).addClass(
    "square-highlight-check"
  );
}

// Clear all highlights
function clearHighlights(puzzleIndex) {
  const state = window.ChessWidget.Puzzles[puzzleIndex];
  $(`#${state.id}-board [data-square]`).removeClass(
    "square-highlight-checkmate square-highlight-check"
  );
}

// Update status message
function updateStatus(puzzleIndex, text, type = "neutral") {
  const state = window.ChessWidget.Puzzles[puzzleIndex];
  const $status = $(`#${state.id}-status`);
  $status
    .text(text)
    .removeClass("status-correct status-error status-neutral status-checkmate");

  if (type === "correct") $status.addClass("status-correct");
  else if (type === "error") $status.addClass("status-error");
  else if (type === "checkmate") $status.addClass("status-checkmate");
  else $status.addClass("status-neutral");
}

// Find king's square
function getKingSquare(puzzleIndex, color) {
  const state = window.ChessWidget.Puzzles[puzzleIndex];
  const board = state.game.board();

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (
        board[i][j] &&
        board[i][j].type === "k" &&
        board[i][j].color === color
      ) {
        const file = String.fromCharCode(97 + j); // a-h
        const rank = 8 - i; // 1-8
        return file + rank;
      }
    }
  }
  return null;
}

// Notify parent window of height
function notifyHeight() {
  const height = document.body.scrollHeight;
  window.parent.postMessage(
    {
      type: "CHESS_PUZZLE_HEIGHT",
      height: height,
    },
    "*"
  );
}

// Notify parent window of puzzle solved
function notifyParentSuccess(puzzleIndex) {
  const state = window.ChessWidget.Puzzles[puzzleIndex];
  window.parent.postMessage(
    {
      type: "CHESS_PUZZLE_SOLVED",
      puzzleIndex: puzzleIndex,
      fen: state.game.fen(),
      solved: true,
    },
    "*"
  );
}
