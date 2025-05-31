/* global Chess */
(() => {
  // ---------- helpers ----------
  const skillForElo = { 300: 1, 800: 5, 1200: 10 };

  // Unicode symbols for pieces
  const U = {
    p:"♟", r:"♜", n:"♞", b:"♝", q:"♛", k:"♚",
    P:"♙", R:"♖", N:"♘", B:"♗", Q:"♕", K:"♔"
  };

  // UI elements
  const $menu       = document.getElementById('menu');
  const $difficulty = document.getElementById('difficulty');
  const $startBtn   = document.getElementById('startBtn');
  const $boardWrap  = document.getElementById('boardWrapper');
  const $restartBtn = document.getElementById('restartBtn');
  const $status     = document.getElementById('status');
  const $board      = document.getElementById('board');

  // game state
  let game, engine, playerColor = 'white', engineSkill = 1;
  const squareEls = {};
  let selected = null;

  /* ---------- menu ---------- */
  $startBtn.onclick = () => {
    playerColor = document.querySelector('input[name="color"]:checked').value;
    engineSkill = skillForElo[$difficulty.value];
    startGame();
  };
  $restartBtn.onclick = () => location.reload();

  /* ---------- Stockfish worker ---------- */
  const initEngine = skill => {
    const SF = window.STOCKFISH || window.stockfish || window.Stockfish;
    if (!SF) {
      alert('Could not load Stockfish engine.\nCheck that stockfish.js is loading.');
      throw new Error('Stockfish not found');
    }
    const worker = SF();
    worker.postMessage('uci');
    worker.postMessage(`setoption name Skill Level value ${skill}`);
    worker.onmessage = () => {};
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
    const files = playerColor === 'white'
      ? ['a','b','c','d','e','f','g','h']
      : ['h','g','f','e','d','c','b','a'];
    const ranks = playerColor === 'white'
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
      squareEls[sq].textContent = p ? U[p.color === 'w'
                                       ? p.type.toUpperCase()
                                       : p.type] : '';
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
    $menu.style.display = 'none';
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
