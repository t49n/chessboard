import { Chess } from "https://unpkg.com/chess.js@1.4.0/dist/esm/chess.js";

let board = null;
let game = new Chess();
let selectedSquare = null;
let playerColor = 'w'; 
let engineStartTime = 0;

const stockfish = new Worker("./stockfish-18-lite.js");

stockfish.onmessage = function(e) {
    const line = e.data;
    if (line.indexOf('bestmove') > -1) {
        const move = line.split(' ')[1];

        const now = Date.now();
        const timePassed = now - engineStartTime;
        const minWait = 680;
        const delay = Math.max(0, minWait - timePassed);

        setTimeout(() => {
            game.move({
                from: move.substring(0, 2),
                to: move.substring(2, 4),
                promotion: 'q'
            });
            board.position(game.fen());
            updateStatus();
            renderHistory();
        }, delay);
    }
};

function engineMove() {
    if (game.isGameOver()) return;

    engineStartTime = Date.now();

    stockfish.postMessage("position fen " + game.fen());
    stockfish.postMessage("go depth 12");
}

function removeHighlights() {
    $('#board .square-55d63').removeClass('highlight-white highlight-black possible-move');
}

function addHighlights(square) {
    removeHighlights();
    const moves = game.moves({ square: square, verbose: true });
    if (moves.length === 0 && !game.get(square)) return;

    const $square = $('#board .square-' + square);
    $square.addClass($square.hasClass('white-1e1d7') ? 'highlight-white' : 'highlight-black');
    moves.forEach(m => $('#board .square-' + m.to).addClass('possible-move'));
}

function updateStatus() {
    let status = (game.turn() === 'b') ? '黒' : '白';

    if (game.isCheckmate()) {
        status = '詰み！ ' + status + ' の負け';
    } else if (game.isDraw()) {
        status = '引き分け';
    } else {
        status += " の手番" + (game.isCheck() ? ' (チェック!)' : '');
    }
    $('#status').html(status);

    if (!game.isGameOver() && game.turn() !== playerColor) {
        stockfish.postMessage("position fen " + game.fen());
        stockfish.postMessage("go depth 12");
    }
}

function renderHistory() {
    const history = game.history({ verbose: true });
    const $container = $('#history');
    $container.empty();

    history.forEach((move, index) => {
        const $moveSpan = $('<span></span>')
            .addClass('history-move')
            .text((index + 1) + ". " + move.san)
            .on('click', () => jumpToMove(index + 1));
        $container.append($moveSpan);
    });

    const historyEl = document.getElementById('history');
    if (historyEl) {
        historyEl.scrollTop = historyEl.scrollHeight;
    }
}

function jumpToMove(moveCount) {
    const history = game.history();
    game.reset();
    for (let i = 0; i < moveCount; i++) {
        game.move(history[i]);
    }
    board.position(game.fen());
    updateStatus();
    renderHistory();
}

function onDrop(source, target) {
    if (game.turn() !== playerColor) return 'snapback';

    try {
        const move = game.move({ from: source, to: target, promotion: 'q' });
        if (move === null) return 'snapback';
        updateStatus();
        renderHistory();
    } catch (e) {
        return 'snapback';
    }
}

function onSnapEnd() {
    board.position(game.fen());
    removeHighlights();

    if (game.turn() !== playerColor) {
        engineMove();
    }
}

board = Chessboard('board', {
    draggable: true,
    position: 'start',
    onDragStart: (s, p) => !game.isGameOver() && p.startsWith(playerColor),
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
});

$('#player-color').on('change', function() {
    playerColor = $(this).val();
    if (playerColor === 'b') board.orientation('black');
    else board.orientation('white');
    resetGame();
});

function resetGame() {
    game.reset();
    board.start();
    if (playerColor === 'b') board.orientation('black');
    updateStatus();
    renderHistory();
}

document.getElementById('btn-reset').onclick = resetGame;
document.getElementById('btn-undo').onclick = () => {
    game.undo();
    game.undo();
    board.position(game.fen());
    updateStatus();
    renderHistory();
};

document.getElementById('btn-flip').onclick = () => board.flip();

updateStatus();
stockfish.postMessage("uci");
stockfish.postMessage("ucinewgame");
stockfish.postMessage("isready");
