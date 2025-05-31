/* global Chess, STOCKFISH */
(() => {
  // ---------- helpers ----------
  const skillForElo = { 300: 1, 800: 5, 1200: 10 };

  // UI elements
  const $menu       = document.getElementById('menu');
  const $difficulty = document.getElementById('difficulty');
  const $startBtn   = document.getElementById('startBtn');
  const $boardWrap  = document.getElementById('boardWrapper');
  const $restartBtn = document.getElementById('restartBtn');
  const $status     = document.getElementById('status');

  // game state
  let game, board, engine, playerColor = 'white', engineSkill = 1;

  // ---------- menu ----------
  $startBtn.onclick = () => {
    playerColor = document.querySelector('input[name="color"]:checked').value;
    engineSkill = skillForElo[$difficulty.value];
    startGame();
  };

  $restartBtn.onclick = () => location.reload();

  // ---------- Stockfish worker ----------
  const initEngine = skill => {
    const worker = STOCKFISH();
    worker.postMessage('uci');
    worker.postMessage(`setoption name Skill Level value ${skill}`);
    worker.onmessage = () => { /* handler set later */ };
    return worker;
  };

  const makeEngineMove = () => {
    engine.postMessage(`position fen ${game.fen()}`);
    engine.postMessage('go depth 15');
  };

  // ---------- board ----------
  const cfg = color => ({
    draggable: true,
    position: 'start',
    orientation: color,
    showNotation: true,
    onDragStart,
    onDrop,
    onSnapEnd: () => board.position(game.fen())
  });

  const onDragStart = (source, piece) => {
    if (game.game_over() || piece[0] !== playerColor[0]) return false;

    // highlight legal moves
    removeHighlights();
    game.moves({ square: source, verbose: true })
        .forEach(m => highlight(m.to));
  };

  const onDrop = (source, target) => {
    removeHighlights();

    const move = game.move({ from: source, to: target, promotion: 'q' });
    if (!move) return 'snapback';

    board.position(game.fen());
    updateStatus();

    // engine replies
    setTimeout(makeEngineMove, 200);
  };

  // ---------- highlight helpers ----------
  const greySquare       = sq => document
                                   .querySelector(`.square-${sq}`)
                                   .classList.add('highlight');
  const removeHighlights = () =>
          document.querySelectorAll('.highlight')
                  .forEach(el => el.classList.remove('highlight'));
  const highlight        = sq => greySquare(sq);

  // ---------- status ----------
  const updateStatus = () => {
    if      (game.in_checkmate()) $status.textContent = 'Checkmate!';
    else if (game.in_draw())      $status.textContent = 'Draw';
    else if (game.in_check())     $status.textContent = 'Check!';
    else                          $status.textContent = '';
  };

  // ---------- entry ----------
  function startGame() {
    $menu.style.display  = 'none';
    $boardWrap.style.display = 'block';

    game = new Chess();

    /* ---- FIX: pick whichever constructor is present ---- */
    const ChessboardCtor = window.Chessboard || window.ChessBoard;
    if (!ChessboardCtor) {
      console.error('Chessboard.js failed to load - cannot start game.');
      alert('Could not load the chessboard library.\nCheck your network or CDN URL.');
      return;
    }

    board  = ChessboardCtor('board', cfg(playerColor));
    engine = initEngine(engineSkill);

    // engine message handler
    engine.onmessage = e => {
      if (e.data.startsWith('bestmove')) {
        const move = e.data.split(' ')[1];
        game.move({
          from: move.slice(0, 2),
          to:   move.slice(2, 4),
          promotion: 'q'
        });
        board.position(game.fen());
        updateStatus();
      }
    };

    // if player chose Black, engine opens
    if (playerColor === 'black') makeEngineMove();
  }

})();
