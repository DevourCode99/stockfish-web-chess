/* global Chess */
(() => {
  /* ---------- helpers ---------- */
  const skillForElo = { 300: 1, 800: 5, 1200: 10 };

  /* Unicode chess symbols */
  const U = {
    p:"♟", r:"♜", n:"♞", b:"♝", q:"♛", k:"♚",
    P:"♙", R:"♖", N:"♘", B:"♗", Q:"♕", K:"♔"
  };

  /* ---------- DOM ---------- */
  const $ = id => document.getElementById(id);
  const $menu        = $('menu');
  const $difficulty  = $('difficulty');
  const $startBtn    = $('startBtn');
  const $boardWrap   = $('boardWrapper');
  const $restartBtn  = $('restartBtn');
  const $status      = $('status');
  const $board       = $('board');

  /* ---------- state ---------- */
  let game, engine, playerColor = 'white', engineSkill = 1;
  const squareEls = {};  // map : square → div
  let selected = null;   // currently-selected square

  /* ---------- menu ---------- */
  $startBtn.onclick = () => {
    playerColor = document.querySelector('input[name="color"]:checked').value;
    engineSkill = skillForElo[$difficulty.value];
    startGame();
  };
  $restartBtn.onclick = () => location.reload();

  /* ---------- Stockfish worker ---------- */
  const initEngine = skill => {
    // ALWAYS use a Web Worker pointed at /js/stockfish.js
    let worker;
    try {
      worker = new Worker('js/stockfish.js');
    } catch (err) {
      alert(
        'Could not create Stockfish worker.\n' +
        'Make sure “js/stockfish.js” and “js/stockfish.wasm” are present\n' +
        'and that the site is served over HTTPS (GitHub Pages uses HTTPS).'
      );
      throw err;
    }

    worker.postMessage('uci');
    worker.postMessage(`setoption name Skill Level value ${skill}`);
    worker.onmessage = () => {};   // real handler added later
    return worker;
  };

  const makeEngineMove = () => {
    engine.postMessage(`position fen ${game.fen()}`);
    engine.postMessage('go depth 15');
  };

  /* ---------- board construction ---------- */
  function buildBoard() {
    $board.className = 'board';
    $board.innerHTML = '';

    const files  = playerColor === 'white'
      ? ['a','b','c','d','e','f','g','h']
      : ['h','g','f','e','d','c','b','a'];
    const ranks  = playerColor === 'white'
      ? [8,7,6,5,4,3,2,1]
      : [1,2,3,4,5,6,7,8];

    ranks.forEach(r => {
      files.forEach((f,fi) => {
        const sq  = f + r;
        const div = document.createElement('div');
        div.id = sq;
        div.className = 'square ' + (((fi + r) & 1) ? 'dark' : 'light');
        div.addEventListener('click', () => handleClick(sq));
        $board.appendChild(div);
        squareEls[sq] = div;
      });
    });
  }

  /* ---------- click-to-move ---------- */
  function handleClick(sq) {
    const piece = game.get(sq);

    if (selected) {
      const move = game.move({ from: selected, to: sq, promotion:'q' });
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
    squareEls[src].classList.add('selected');
    game.moves({ square: src, verbose:true })
        .forEach(m => squareEls[m.to].classList.add('highlight'));
  }
  function clearHighlights() {
    document.querySelectorAll('.selected')
            .forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.highlight')
            .forEach(el => el.classList.remove('highlight'));
  }

  /* ---------- board & status ---------- */
  function updateBoardUI() {
    Object.keys(squareEls).forEach(sq => {
      const p = game.get(sq);
      squareEls[sq].textContent = p
        ? U[p.color === 'w' ? p.type.toUpperCase() : p.type]
        : '';
    });
  }
  function updateStatus() {
    if      (game.in_checkmate()) $status.textContent = 'Checkmate!';
    else if (game.in_draw())      $status.textContent = 'Draw';
    else if (game.in_check())     $status.textContent = 'Check!';
    else                          $status.textContent = '';
  }

  /* ---------- entry ---------- */
  function startGame() {
    $menu.style.display   = 'none';
    $boardWrap.style.display = 'block';

    game   = new Chess();
    engine = initEngine(engineSkill);

    buildBoard();
    updateBoardUI();

    engine.onmessage = e => {
      if (e.data.startsWith('bestmove')) {
        const mv = e.data.split(' ')[1];
        game.move({ from: mv.slice(0,2), to: mv.slice(2,4), promotion:'q' });
        updateBoardUI();
        updateStatus();
      }
    };

    if (playerColor === 'black') makeEngineMove();
  }
})();
