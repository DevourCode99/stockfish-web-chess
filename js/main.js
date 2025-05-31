/* global Chess, Chessboard, STOCKFISH */
(() => {
  // ---------- helpers ----------
  const skillForElo = {300:1, 800:5, 1200:10};

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
    worker.onmessage = e => { /* we’ll set dynamically later */ };
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
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: () => board.position(game.fen())
  });

  const onDragStart = (source, piece) => {
    if (game.game_over() || piece[0] !== playerColor[0]) return false;

    // highlight legal moves
    removeHighlights();
    const moves = game.moves({square: source, verbose: true});
    moves.forEach(m => highlight(m.to));
  };

  const onDrop = (source, target) => {
    removeHighlights();

    const move = game.move({from: source, to: target, promotion:'q'});
    if (!move) return 'snapback';

    board.position(game.fen());
    updateStatus();

    // engine replies
    setTimeout(makeEngineMove, 200);
  };

  // ---------- highlight helpers ----------
  const greySquare = square => document.querySelector(`.square-${square}`).classList.add('highlight');
  const removeHighlights = () => document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
  const highlight = square => greySquare(square);

  // ---------- status ----------
  const updateStatus = () => {
    if (game.in_checkmate())     $status.textContent = 'Checkmate!';
    else if (game.in_draw())     $status.textContent = 'Draw';
    else if (game.in_check())    $status.textContent = 'Check!';
    else                         $status.textContent = '';
  };

  // ---------- entry ----------
  function startGame() {
    $menu.style.display = 'none';
    $boardWrap.style.display = 'block';

    game   = new Chess();
    board  = Chessboard('board', cfg(playerColor));
    engine = initEngine(engineSkill);

    // engine message handler
    engine.onmessage = e => {
      const line = e.data;
      if (line.startsWith('bestmove')) {
        const move = line.split(' ')[1];
        game.move({ from: move.slice(0,2), to: move.slice(2,4), promotion: 'q' });
        board.position(game.fen());
        updateStatus();
      }
    };

    // if player chose Black, engine opens
    if (playerColor === 'black') makeEngineMove();
  }

})();
