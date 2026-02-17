import { Chess } from "https://unpkg.com/chess.js@1.4.0/dist/esm/chess.js";

let board = null;
let game = new Chess();
let selectedSquare = null;

function removeHighlights() {
    $('#board .square-55d63').removeClass('highlight-white highlight-black possible-move');
}

function addHighlights(square) {
    removeHighlights();
    const moves = game.moves({ square: square, verbose: true });

    if (moves.length === 0 && !game.get(square)) {
        return;
    }

    const $square = $('#board .square-' + square);
    $square.addClass($square.hasClass('white-1e1d7') ? 'highlight-white' : 'highlight-black');
    moves.forEach(m => $('#board .square-' + m.to).addClass('possible-move'));
}

function updateStatus() {
    let status = (game.turn() === 'b') ? 'Black' : 'White';

    if (game.isCheckmate()) {
        status = 'CHECKMATE! ' + status + ' lost.';
    } else if (game.isDraw()) {
        status = 'DRAW.';
    } else {
        status += "'s Turn" + (game.isCheck() ? ' (Check!)' : '');
    }

    $('#status').html(status);

    let pgn = game.pgn({ header: false })
                  .replace(/\[.*?\]\s?/g, '')
                  .replace(/\s?(\*|1-0|0-1|1\/2-1\/2)$/, '');

    $('#history').html(pgn || "None");
}

function onSquareClick(square) {
    const piece = game.get(square);

    if (selectedSquare) {
        try {
            const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
            if (move) {
                board.position(game.fen());
                selectedSquare = null;
                removeHighlights();
                updateStatus();
                return;
            }
        } catch (e) {}

        if (piece && piece.color === game.turn()) {
            selectedSquare = square;
            addHighlights(square);
        } else {
            selectedSquare = null;
            removeHighlights();
        }
    } else if (piece && piece.color === game.turn()) {
        selectedSquare = square;
        addHighlights(square);
    }
}

const config = {
    draggable: true,
    position: 'start',
    onDragStart: (source, piece) => {
        if (game.isGameOver()) {
            return false;
        }
        if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }
        selectedSquare = source;
        addHighlights(source);
    },
    onDrop: (source, target) => {
        if (source === target) {
            return;
        }
        try {
            const move = game.move({ from: source, to: target, promotion: 'q' });
            if (move === null) {
                return 'snapback';
            }
            selectedSquare = null;
            updateStatus();
        } catch (e) {
            return 'snapback';
        }
    },
    onSnapEnd: () => {
        board.position(game.fen());
        removeHighlights();
    }
};

board = Chessboard('board', config);

const boardEl = document.getElementById('board');
boardEl.addEventListener('touchstart', (e) => {
    if (e.cancelable) e.preventDefault();
}, { passive: false });

$('#board').on('mousedown touchstart', '.square-55d63', function() {
    const square = $(this).data('square');
    onSquareClick(square);
});

document.getElementById('btn-undo').onclick = () => {
    game.undo();
    board.position(game.fen());
    removeHighlights();
    selectedSquare = null;
    updateStatus();
};

document.getElementById('btn-flip').onclick = () => {
    board.flip();
    removeHighlights();
    selectedSquare = null;
};

document.getElementById('btn-reset').onclick = () => {
    if (confirm("リセットしますか？")) {
        game.reset();
        board.start();
        updateStatus();
        removeHighlights();
        selectedSquare = null;
    }
};

updateStatus();
