/**
 * UI helper functions for chess widget
 */

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
