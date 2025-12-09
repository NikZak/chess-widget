# Chess Puzzle Widget

An embeddable chess puzzle widget that allows users to solve chess puzzles interactively. Built with [cm-chessboard](https://github.com/shaack/cm-chessboard) and [chess.js](https://github.com/jhlywa/chess.js).

## Features

- 🎯 Interactive chess puzzles with drag-and-drop or click-to-move
- 📝 Support for both **SAN** (Short Algebraic Notation: `Nf3`, `Qxd5`) and **LAN** (Long Algebraic Notation: `g1f3`, `d1d5`)
- 🌿 **Branching puzzles** - opponent can respond differently, player must solve all variations
- 🌍 Multi-language support (English and Russian)
- 📱 Responsive design for mobile and desktop
- 🔗 Easy iframe embedding
- 📨 Parent window communication via postMessage API

## Quick Start

### Embed with iframe

```html
<iframe
  id="chess-widget"
  src="https://your-domain.com/index.html?fen=POSITION&moves=MOVES&lang=en"
  width="100%"
  height="500"
  style="border: none; max-width: 500px"
></iframe>
```

### URL Parameters

| Parameter | Description                      | Example                                                      |
| --------- | -------------------------------- | ------------------------------------------------------------ |
| `fen`     | Chess position in FEN notation   | `rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1` |
| `moves`   | Solution moves (comma-separated) | `e7e5,g1f3` or `e5,Nf3`                                      |
| `message` | Instruction text shown to user   | `Find the winning move`                                      |
| `lang`    | Language (`en` or `ru`)          | `en`                                                         |
| `puzzles` | Multiple puzzles (see below)     | See format below                                             |

## Move Notation

The widget accepts moves in two formats:

### Long Algebraic Notation (LAN)

```
e2e4,e7e5,g1f3,b8c6
```

Format: `[from][to]` - 4 characters per move (source square + target square)

### Short Algebraic Notation (SAN)

```
e4,e5,Nf3,Nc6
```

Standard chess notation with piece letters (K, Q, R, B, N) and capture notation (x)

The widget automatically detects and converts between formats.

### Branching Puzzles

Puzzles can have multiple variations where the opponent responds differently. The player must solve ALL branches to complete the puzzle.

**Syntax:** Use square brackets `[...]` to define branches, with `|` separating alternatives:

```
playerMove,[opponentResp1,playerReply1|opponentResp2,playerReply2,...]
```

**Example:**

```
d8h4,[g4h4,g8g1|h2h3,g8g4,f5g4,h4g4]
```

This means:

1. Player plays `d8h4` (Qh4)
2. **Branch 1:** Opponent plays `g4h4` (Rxh4), player responds `g8g1` (Rg1#)
3. **Branch 2:** Opponent plays `h2h3`, player plays `g8g4` (Rxg4+), opponent `f5g4` (Qxg4), player `h4g4` (Qxg4)

When Branch 1 is complete, the board resets and the player must solve Branch 2. The puzzle shows "Вариант 1 из 2" (Variation 1 of 2) progress indicator.

**Features:**

- Progress indicator shows current branch / total branches
- Board automatically resets between branches
- Victory only when ALL branches are solved
- Works with both SAN and LAN notation

## Examples

### Single Puzzle

```html
<!-- Using LAN notation -->
<iframe
  src="index.html?fen=r2q2rk/ppp4p/3p4/2b2Q2/3pPPR1/2P2n2/PP3P1P/RNB4K%20b%20-%20-%200%201&moves=d8h4,g4h4,g8g1&message=Find%20the%20checkmate&lang=en"
></iframe>

<!-- Using SAN notation -->
<iframe
  src="index.html?fen=r2q2rk/ppp4p/3p4/2b2Q2/3pPPR1/2P2n2/PP3P1P/RNB4K%20b%20-%20-%200%201&moves=Qh4,Rxh4,Rg1%23&message=Find%20the%20checkmate&lang=en"
></iframe>
```

### Branching Puzzle

```html
<!-- Puzzle with 2 variations - opponent can respond differently -->
<iframe
  src="index.html?fen=r2q2rk/ppp4p/3p4/2b2Q2/3pPPR1/2P2n2/PP3P1P/RNB4K%20b%20-%20-%200%201&moves=d8h4,[g4h4,g8g1|h2h3,g8g4,f5g4,h4g4]&message=Find%20the%20winning%20move%20(2%20variations)&lang=en"
></iframe>
```

### Multiple Puzzles

Use the `puzzles` parameter with format: `FEN|MOVES|MESSAGE;FEN|MOVES|MESSAGE`

```html
<iframe
  src="index.html?puzzles=FEN1|MOVES1|MESSAGE1;FEN2|MOVES2|MESSAGE2&lang=en"
></iframe>
```

Example with URL encoding:

```
?puzzles=r3k2r/1b1p1pp1/3qp3/p1bP4/Pp3B2/6P1/1PP1QPB1/R4RK1%20b%20kq%20-%200%201|Qxd5,Bxd5,Bxd5,Rad1,Rh1%2B|Find%20the%20winning%20combination;r2q2rk/ppp4p/3p4/2b2Q2/3pPPR1/2P2n2/PP3P1P/RNB4K%20b%20-%20-%200%201|Qh4,Rxh4,Rg1%23|Find%20checkmate
```

## Parent Window Communication

The widget communicates with the parent window via `postMessage`. Listen for events:

```javascript
window.addEventListener("message", function (event) {
  // Auto-resize iframe to fit content
  if (event.data.type === "CHESS_PUZZLE_HEIGHT") {
    document.getElementById("chess-widget").style.height =
      event.data.height + "px";
  }

  // Puzzle solved event
  if (event.data.type === "CHESS_PUZZLE_SOLVED") {
    console.log("Puzzle solved!", event.data);
    // event.data contains:
    // - puzzleIndex: which puzzle was solved (0-based)
    // - fen: final position
    // - solved: true
  }
});
```

### Event Types

| Event                 | Description           | Data                           |
| --------------------- | --------------------- | ------------------------------ |
| `CHESS_PUZZLE_HEIGHT` | Widget height changed | `{ height: number }`           |
| `CHESS_PUZZLE_SOLVED` | User solved a puzzle  | `{ puzzleIndex, fen, solved }` |

## Full Embedding Example

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Chess Puzzles</title>
  </head>
  <body>
    <h1>Solve the Puzzle</h1>

    <iframe
      id="chess-widget"
      src="index.html?fen=r2q2rk/ppp4p/3p4/2b2Q2/3pPPR1/2P2n2/PP3P1P/RNB4K%20b%20-%20-%200%201&moves=Qh4,Rxh4,Rg1%23&message=Find%20the%20checkmate&lang=en"
      width="100%"
      height="500"
      style="border: none; max-width: 500px"
    ></iframe>

    <script>
      const iframe = document.getElementById("chess-widget");

      window.addEventListener("message", function (event) {
        if (event.data.type === "CHESS_PUZZLE_HEIGHT") {
          iframe.style.height = event.data.height + "px";
        }

        if (event.data.type === "CHESS_PUZZLE_SOLVED") {
          alert("Congratulations! You solved the puzzle!");
          // Redirect, show hidden content, award points, etc.
        }
      });
    </script>
  </body>
</html>
```

## File Structure

```
chess_widget/
├── index.html           # Main widget HTML
├── example.html         # Embedding example
├── README.md            # This file
├── js/
│   ├── config.js            # Configuration and default puzzles
│   ├── chess-widget.js      # Main widget logic
│   ├── chess-ui.js          # UI helper functions
│   └── notation-converter.js # SAN ↔ LAN conversion utilities
└── docs/
    ├── Letter.md            # Project documentation
    └── Letter-email-plain.txt
```

## Dependencies (loaded via CDN)

- [cm-chessboard](https://cdn.jsdelivr.net/npm/cm-chessboard) - Chessboard UI
- [chess.js](https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js) - Chess logic
- [jQuery](https://code.jquery.com/jquery-3.6.0.min.js) - DOM manipulation

## Notation Converter API

The widget exposes a `NotationConverter` object for programmatic use:

```javascript
// Check notation type
NotationConverter.isLANMove("e2e4"); // true
NotationConverter.isSANMove("Nf3"); // true

// Convert moves (requires FEN for context)
const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
NotationConverter.convertMovesToLAN(fen, "e4,e5,Nf3"); // "e2e4,e7e5,g1f3"
NotationConverter.convertMovesToSAN(fen, "e2e4,e7e5,g1f3"); // "e4,e5,Nf3"

// Normalize puzzle to LAN format
NotationConverter.normalizePuzzleMoves({
  fen,
  moves: "e4,Nf3",
  message: "...",
});
```

## License

MIT
