/* global Chess */
(() => {
  /* ---------- configuration ---------- */
  const ENGINE_PATH = "js/stockfish-lite.js";      // local worker script
  const ENGINE_WASM = "js/stockfish-lite.wasm";    // matching WASM file

  // Elo → Stockfish “Skill Level” (1-20)
  const skillForElo = { 300: 1, 800: 5, 1200: 10 };

  /* Unicode chess symbols */
  const U = {
    p:"♟", r:"♜", n:"♞", b:"♝", q:"♛", k:"♚",
    P:"♙", R:"♖", N:"♘", B:"♗", Q:"♕", K:"♔"
  };

  /* ---------- DOM ---------- */
  const $ = id => document.getElementById(id);
  const $menu       = $("menu");
  const $difficulty = $("difficulty");
  const $startBtn   = $("startBtn");
  const $boardWrap  = $("boardWrapper");
  const $restartBtn = $("restartBtn");
  const $status     = $("status");
  const $board      = $("board");

  /* ---------- state ---------- */
  let game, engine, playerColor = "white", engineSkill = 1;
  const squareEls = {};
  let selected = null;
  let engineReady = false;     // becomes true after “readyok”

  /* ---------- menu ---------- */
  $startBtn.onclick = () => {
    playerColor = document.querySelector('input[name="color"]:checked').value;
    engineSkill = skillForElo[$difficulty.value];
    startGame();
  };
  $restartBtn.onclick = () => location.reload();

  /* ---------- Stockfish loader ---------- */
  function initEngine(skill) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(ENGINE_PATH);
      let settled = false;

      worker.onerror = e => {
        if (!settled) reject(e);
      };

      worker.onmessage = ({ data }) => {
        if (typeof data !== "string") return;

        if (data.startsWith("uciok")) {
          // now that UCI is initialized, set skill & ask for ready
          worker.postMessage(`setoption name Skill Level value ${skill}`);
          worker.postMessage("isready");
        } else if (data.startsWith("readyok")) {
          engineReady = true;
          settled = true;
          resolve(worker);
        }
      };

      /* ---------- initiate engine ---------- */
      // MUST set onmessage FIRST so we don't miss early output
      worker.postMessage(`setoption name WASMFile value ${ENGINE_WASM}`);
      worker.postMessage("uci");
    });
  }

  /* ---------- helper to call engine safely ---------- */
  function makeEngineMove() {
    if (!engineReady) {              // wait until “readyok”
      setTimeout(makeEngineMove, 50);
      return;
    }
    engine.postMessage(`position fen ${game.fen()}`);
    engine.postMessage("go depth 15");
  }

  /* ---------- board construction ---------- */
  function buildBoard() {
    $board.className = "board";
    $board.innerHTML = "";

    const files = playerColor === "white"
      ? ["a","b","c","d","e","f","g","h"]
      : ["h","g","f","e","d","c","b","a"];
    const ranks = playerColor === "white"
      ? [8,7,6,5,4,3,2,1]
      : [1,2,3,4,5,6,7,8];

    ranks.forEach(r => {
      files.forEach((f, fi) => {
        const sq = f + r;
        const div = document.createElement("div");
        div.id = sq;
        div.className = "square " + (((fi + r) & 1) ? "dark" : "light");
        div.addEventListener("click", () => handleClick(sq));
        $board.appendChild(div);
        squareEls[sq] = div;
      });
    });
  }

  /* ---------- click-to-move ---------- */
  function handleClick(sq) {
    const piece = game.get(sq);

    if (selected) {
      const move = game.move({ from: selected, to: sq, promotion: "q" });
      clearHighlights();

      if (move) {
        selected = null;
        updateBoardUI();
        updateStatus();
        setTimeout(makeEngineMove, 200);
        return;
      }

      // allow reselection of own piece
      if (piece && piece.color === playerColor[0]) {
        selected = sq;
        highlightSelectionAndMoves(sq);
      } else {
        selected = null;
      }
    } else if (piece && piece.color === playerColor[0]) {
      selected = sq;
      highlightSelectionAndMoves(sq);
    }
  }

  /* ---------- highlights ---------- */
  function highlightSelectionAndMoves(src) {
    clearHighlights();
    squareEls[src].classList.add("selected");
    game.moves({ square: src, verbose: true }).forEach(m =>
      squareEls[m.to].classList.add("highlight")
    );
  }
  function clearHighlights() {
    document
      .querySelectorAll(".selected")
      .forEach(el => el.classList.remove("selected"));
    document
      .querySelectorAll(".highlight")
      .forEach(el => el.classList.remove("highlight"));
  }

  /* ---------- board & status ---------- */
  function updateBoardUI() {
    Object.keys(squareEls).forEach(sq => {
      const p = game.get(sq);
      squareEls[sq].textContent = p
        ? U[p.color === "w" ? p.type.toUpperCase() : p.type]
        : "";
    });
  }
  function updateStatus() {
    if      (game.in_checkmate()) $status.textContent = "Checkmate!";
    else if (game.in_draw())      $status.textContent = "Draw";
    else if (game.in_check())     $status.textContent = "Check!";
    else                          $status.textContent = "";
  }

  /* ---------- entry ---------- */
  async function startGame() {
    $menu.style.display   = "none";
    $boardWrap.style.display = "block";

    game = new Chess();
    buildBoard();
    updateBoardUI();

    $status.textContent = "Loading engine…";
    try {
      engine = await initEngine(engineSkill);
      $status.textContent = "";
    } catch (err) {
      console.error("Engine failed to load", err);
      $status.textContent = "Engine failed.";
      return;
    }

    engine.onmessage = ({ data }) => {
      if (typeof data === "string" && data.startsWith("bestmove")) {
        const mv = data.split(" ")[1];
        game.move({ from: mv.slice(0,2), to: mv.slice(2,4), promotion: "q" });
        updateBoardUI();
        updateStatus();
      }
    };

    if (playerColor === "black") makeEngineMove();
  }
})();
