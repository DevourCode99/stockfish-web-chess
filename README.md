▒
# Stockfish-Web-Chess

Play drag-and-drop chess against the Stockfish engine, right in your browser.

### Features
* Choose White or Black and three difficulty levels (≈ 300, 800, 1200 elo).
* Highlights every legal move when you pick up a piece.
* Fully legal chess: castling, en-passant, promotion, stalemate detection.
* Runs 100 % client-side via the Stockfish WebAssembly build—no server code.

### Quick start for visitors
1. Click **“Play”** below (GitHub Pages link).
2. Pick your colour and difficulty.  
   That’s it—move pieces by drag-and-drop.

### How this repo works
Everything is plain HTML + CSS + JavaScript. The browser downloads two small files \
(`stockfish.js` and `stockfish.wasm`) that contain the famous Stockfish engine \
compiled to WebAssembly.  
We glue that engine to *chess.js* (move legality) and *chessboard.js* (graphics & drag-drop).

### License
All original code MIT. Stockfish itself is GPL v3; see `js/stockfish.js` header.
▒
