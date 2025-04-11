document.addEventListener('DOMContentLoaded', () => {
    // Navigation and section toggling
    const playButton = document.getElementById('play-button');
    const playNav = document.getElementById('play-nav');
    const gameSection = document.getElementById('game');
    
    // Function to show game section
    function showGame() {
        gameSection.classList.add('game-active');
        window.location.href = '#game';
        createBoard(); // Make sure board is created
    }
    
    // Event listeners for navigation
    playButton.addEventListener('click', showGame);
    playNav.addEventListener('click', showGame);
    
    // Game elements
    const board = document.getElementById('chessboard');
    const statusElement = document.getElementById('status');
    const turnStatusElement = document.getElementById('turn-status');
    const resetButton = document.getElementById('reset-btn');
    const undoButton = document.getElementById('undo-btn');
    const hintButton = document.getElementById('hint-btn');
    const capturedBlackElement = document.getElementById('captured-black');
    const capturedWhiteElement = document.getElementById('captured-white');

    // Game state
    let selectedPiece = null;
    let currentPlayer = 'white';
    let gameOver = false;
    let capturedPieces = {
        white: [],
        black: []
    };
    let moveHistory = [];
    let hintMode = false;
    let hintSquare = null;
    let animationInProgress = false;

    // Piece unicode mapping
    const pieces = {
        'white-pawn': '♙',
        'white-rook': '♖',
        'white-knight': '♘',
        'white-bishop': '♗',
        'white-queen': '♕',
        'white-king': '♔',
        'black-pawn': '♟',
        'black-rook': '♜',
        'black-knight': '♞',
        'black-bishop': '♝',
        'black-queen': '♛',
        'black-king': '♚'
    };

    // Initial board setup
    const initialSetup = [
        ['black-rook', 'black-knight', 'black-bishop', 'black-queen', 'black-king', 'black-bishop', 'black-knight', 'black-rook'],
        ['black-pawn', 'black-pawn', 'black-pawn', 'black-pawn', 'black-pawn', 'black-pawn', 'black-pawn', 'black-pawn'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['white-pawn', 'white-pawn', 'white-pawn', 'white-pawn', 'white-pawn', 'white-pawn', 'white-pawn', 'white-pawn'],
        ['white-rook', 'white-knight', 'white-bishop', 'white-queen', 'white-king', 'white-bishop', 'white-knight', 'white-rook']
    ];

    let boardState = JSON.parse(JSON.stringify(initialSetup));

    // Create the chess board
    function createBoard() {
        board.innerHTML = '';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.classList.add('square');
                square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
                square.dataset.row = row;
                square.dataset.col = col;
                
                const piece = boardState[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.classList.add('piece');
                    pieceElement.textContent = pieces[piece];
                    pieceElement.dataset.piece = piece;
                    square.appendChild(pieceElement);
                }
                
                square.addEventListener('click', handleSquareClick);
                board.appendChild(square);
            }
        }

        // Re-apply hint if needed
        if (hintMode && hintSquare) {
            const square = getSquareElement(hintSquare.row, hintSquare.col);
            if (square) square.classList.add('hint-highlight');
        }
    }

    async function handleSquareClick(event) {
        if (gameOver || animationInProgress) return;
        
        // Clear hint if active
        if (hintMode) {
            hintMode = false;
            document.querySelectorAll('.hint-highlight').forEach(el => {
                el.classList.remove('hint-highlight');
            });
            hintSquare = null;
        }
        
        const square = event.target.classList.contains('square') ? event.target : event.target.parentElement;
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        
        // If a piece is already selected
        if (selectedPiece) {
            const fromRow = parseInt(selectedPiece.parentElement.dataset.row);
            const fromCol = parseInt(selectedPiece.parentElement.dataset.col);
            
            // Check if the clicked square is a valid move
            const validMoves = getValidMoves(fromRow, fromCol);
            const isValidMove = validMoves.some(move => move.row === row && move.col === col);
            
            if (isValidMove) {
                animationInProgress = true;
                
                // Animate the piece movement
                const pieceToMove = selectedPiece.cloneNode(true);
                const fromRect = selectedPiece.getBoundingClientRect();
                const toRect = square.getBoundingClientRect();
                
                // Check if capturing
                const capturedPiece = boardState[row][col];
                const capturedElement = square.querySelector('.piece');
                
                if (capturedElement) {
                    capturedElement.classList.add('captured-piece');
                    // Wait for capture animation
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                
                // Setup moving piece animation
                document.body.appendChild(pieceToMove);
                pieceToMove.style.position = 'fixed';
                pieceToMove.style.left = `${fromRect.left}px`;
                pieceToMove.style.top = `${fromRect.top}px`;
                pieceToMove.style.width = `${fromRect.width}px`;
                pieceToMove.style.height = `${fromRect.height}px`;
                pieceToMove.classList.add('moving-piece');
                
                // Hide original piece during animation
                selectedPiece.style.opacity = '0';
                
                // Animate
                const animationDuration = 500; // milliseconds
                const startTime = Date.now();
                
                function animate() {
                    const elapsedTime = Date.now() - startTime;
                    const progress = Math.min(elapsedTime / animationDuration, 1);
                    
                    const currentLeft = fromRect.left + (toRect.left - fromRect.left) * progress;
                    const currentTop = fromRect.top + (toRect.top - fromRect.top) * progress;
                    
                    pieceToMove.style.left = `${currentLeft}px`;
                    pieceToMove.style.top = `${currentTop}px`;
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        // Animation finished, cleanup
                        document.body.removeChild(pieceToMove);
                        
                        // Process capture if needed
                        if (capturedPiece) {
                            const captureColor = capturedPiece.split('-')[0] === 'white' ? 'white' : 'black';
                            capturedPieces[captureColor].push(capturedPiece);
                            updateCapturedPieces();
                        }
                        
                        // Save move for undo
                        moveHistory.push({
                            from: { row: fromRow, col: fromCol, piece: boardState[fromRow][fromCol] },
                            to: { row, col, piece: boardState[row][col] },
                            capturedPiece
                        });
                        
                        // Move the piece
                        const pieceType = boardState[fromRow][fromCol];
                        boardState[row][col] = pieceType;
                        boardState[fromRow][fromCol] = null;
                        
                        // Check for pawn promotion
                        if (pieceType === 'white-pawn' && row === 0) {
                            boardState[row][col] = 'white-queen';
                        } else if (pieceType === 'black-pawn' && row === 7) {
                            boardState[row][col] = 'black-queen';
                        }
                        
                        // Switch players
                        currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
                        
                        // Update turn indicator
                        turnStatusElement.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s turn`;
                        turnStatusElement.previousElementSibling.textContent = currentPlayer === 'white' ? '♟' : '♙';
                        
                        // Check for check or checkmate
                        checkGameStatus();
                        
                        // Rebuild the board to reflect new state
                        createBoard();
                        animationInProgress = false;
                    }
                }
                
                requestAnimationFrame(animate);
                
                // Clear selection
                clearSelection();
            } else {
                // If no piece is selected, check if user clicked on their own piece
                const piece = square.querySelector('.piece');
                if (piece && piece.dataset.piece.startsWith(currentPlayer)) {
                    selectedPiece = piece;
                    square.classList.add('highlight');
                    
                    // Show valid moves
                    const validMoves = getValidMoves(row, col);
                    validMoves.forEach(move => {
                        const targetSquare = getSquareElement(move.row, move.col);
                        const moveIndicator = document.createElement('div');
                        moveIndicator.classList.add('possible-move');
                        targetSquare.appendChild(moveIndicator);
                    });
                } else {
                    // Invalid selection, clear any previous selections
                    clearSelection();
                }
            }
        } else {
            // If no piece is selected, check if user clicked on their own piece
            const piece = square.querySelector('.piece');
            if (piece && piece.dataset.piece.startsWith(currentPlayer)) {
                selectedPiece = piece;
                square.classList.add('highlight');
                
                // Show valid moves
                const validMoves = getValidMoves(row, col);
                validMoves.forEach(move => {
                    const targetSquare = getSquareElement(move.row, move.col);
                    const moveIndicator = document.createElement('div');
                    moveIndicator.classList.add('possible-move');
                    targetSquare.appendChild(moveIndicator);
                });
            } else {
                // Invalid selection, clear any previous selections
                clearSelection();
            }
        }
    }

    function clearSelection() {
        if (selectedPiece) {
            selectedPiece.parentElement.classList.remove('highlight');
            selectedPiece = null;
        }
        
        // Remove move indicators
        document.querySelectorAll('.possible-move').forEach(el => el.remove());
    }

    function getSquareElement(row, col) {
        return document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
    }

    function getValidMoves(row, col) {
        const piece = boardState[row][col];
        if (!piece) return [];
        
        const [color, type] = piece.split('-');
        const validMoves = [];
        
        // Helper to check if a move would put own king in check
        function wouldBeInCheck(fromRow, fromCol, toRow, toCol) {
            // Make a temporary move
            const originalPiece = boardState[toRow][toCol];
            const movingPiece = boardState[fromRow][fromCol];
            boardState[toRow][toCol] = movingPiece;
            boardState[fromRow][fromCol] = null;
            
            // Check if king is in check
            const inCheck = isInCheck(color);
            
            // Undo the move
            boardState[fromRow][fromCol] = movingPiece;
            boardState[toRow][toCol] = originalPiece;
            
            return inCheck;
        }
        
        // Helper to check if square is empty or has enemy piece
        function canMoveTo(r, c) {
            if (r < 0 || r > 7 || c < 0 || c > 7) return false;
            const targetPiece = boardState[r][c];
            return !targetPiece || !targetPiece.startsWith(color);
        }
        
        // Helper to check if square is empty
        function isEmpty(r, c) {
            if (r < 0 || r > 7 || c < 0 || c > 7) return false;
            return !boardState[r][c];
        }
        
        // Helper to check if square has opponent's piece
        function hasEnemy(r, c) {
            if (r < 0 || r > 7 || c < 0 || c > 7) return false;
            const targetPiece = boardState[r][c];
            return targetPiece && !targetPiece.startsWith(color);
        }

        // Pawn logic
        if (type === 'pawn') {
            const direction = color === 'white' ? -1 : 1;
            const startRow = color === 'white' ? 6 : 1;
            
            // Forward one square
            if (isEmpty(row + direction, col) && !wouldBeInCheck(row, col, row + direction, col)) {
                validMoves.push({ row: row + direction, col });
            }
            
            // Forward two squares from starting position
            if (row === startRow && isEmpty(row + direction, col) && isEmpty(row + 2 * direction, col) && !wouldBeInCheck(row, col, row + 2 * direction, col)) {
                validMoves.push({ row: row + 2 * direction, col });
            }
            
            // Diagonal captures
            if (hasEnemy(row + direction, col - 1) && !wouldBeInCheck(row, col, row + direction, col - 1)) {
                validMoves.push({ row: row + direction, col: col - 1 });
            }
            if (hasEnemy(row + direction, col + 1) && !wouldBeInCheck(row, col, row + direction, col + 1)) {
                validMoves.push({ row: row + direction, col: col + 1 });
            }
        }
        
        // Rook logic
        if (type === 'rook' || type === 'queen') {
            // Check horizontally and vertically
            const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            
            directions.forEach(([dr, dc]) => {
                let r = row + dr;
                let c = col + dc;
                
                while (canMoveTo(r, c)) {
                    if (!wouldBeInCheck(row, col, r, c)) {
                        validMoves.push({ row: r, col: c });
                    }
                    
                    // Stop if we hit a piece
                    if (boardState[r][c]) break;
                    
                    r += dr;
                    c += dc;
                }
            });
        }
        
        // Bishop logic
        if (type === 'bishop' || type === 'queen') {
            // Check diagonally
            const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
            
            directions.forEach(([dr, dc]) => {
                let r = row + dr;
                let c = col + dc;
                
                while (canMoveTo(r, c)) {
                    if (!wouldBeInCheck(row, col, r, c)) {
                        validMoves.push({ row: r, col: c });
                    }
                    
                    // Stop if we hit a piece
                    if (boardState[r][c]) break;
                    
                    r += dr;
                    c += dc;
                }
            });
        }
        
        // Knight logic
        if (type === 'knight') {
            const moves = [
                [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                [1, -2], [1, 2], [2, -1], [2, 1]
            ];
            
            moves.forEach(([dr, dc]) => {
                const r = row + dr;
                const c = col + dc;
                
                if (canMoveTo(r, c) && !wouldBeInCheck(row, col, r, c)) {
                    validMoves.push({ row: r, col: c });
                }
            });
        }
        
        // King logic
        if (type === 'king') {
            const moves = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1], [0, 1],
                [1, -1], [1, 0], [1, 1]
            ];
            
            moves.forEach(([dr, dc]) => {
                const r = row + dr;
                const c = col + dc;
                
                if (canMoveTo(r, c)) {
                    // For king moves, we need to check differently since the king itself is moving
                    const originalPiece = boardState[r][c];
                    const movingPiece = boardState[row][col];
                    
                    // Make the move temporarily
                    boardState[r][c] = movingPiece;
                    boardState[row][col] = null;
                    
                    // Check if the king would be in check after moving
                    const kingPos = findKing(color);
                    const wouldBeCheck = isSquareAttacked(kingPos.row, kingPos.col, color === 'white' ? 'black' : 'white');
                    
                    // Undo the move
                    boardState[row][col] = movingPiece;
                    boardState[r][c] = originalPiece;
                    
                    if (!wouldBeCheck) {
                        validMoves.push({ row: r, col: c });
                    }
                }
            });
        }
        
        return validMoves;
    }

    function findKing(color) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (boardState[r][c] === `${color}-king`) {
                    return { row: r, col: c };
                }
            }
        }
        return null; // This should never happen in a valid game
    }

    function isSquareAttacked(row, col, byColor) {
        // Check if the square is attacked by any piece of the given color
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = boardState[r][c];
                if (piece && piece.startsWith(byColor)) {
                    const [, type] = piece.split('-');
                    
                    // Simple logic for pawn attacks
                    if (type === 'pawn') {
                        const direction = byColor === 'white' ? -1 : 1;
                        if ((r + direction === row) && (c - 1 === col || c + 1 === col)) {
                            return true;
                        }
                    }
                    
                    // For other pieces, we can reuse getValidMoves but need to ignore check constraints
                    else if (type === 'knight') {
                        const moves = [
                            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                            [1, -2], [1, 2], [2, -1], [2, 1]
                        ];
                        
                        for (const [dr, dc] of moves) {
                            if (r + dr === row && c + dc === col) {
                                return true;
                            }
                        }
                    }
                    
                    else if (type === 'king') {
                        const moves = [
                            [-1, -1], [-1, 0], [-1, 1],
                            [0, -1], [0, 1],
                            [1, -1], [1, 0], [1, 1]
                        ];
                        
                        for (const [dr, dc] of moves) {
                            if (r + dr === row && c + dc === col) {
                                return true;
                            }
                        }
                    }
                    
                    else if (type === 'rook' || type === 'queen') {
                        // Check if on same row or column
                        if (r === row || c === col) {
                            let blocked = false;
                            
                            if (r === row) {
                                const step = c < col ? 1 : -1;
                                for (let i = c + step; i !== col; i += step) {
                                    if (boardState[r][i]) {
                                        blocked = true;
                                        break;
                                    }
                                }
                            } else {
                                const step = r < row ? 1 : -1;
                                for (let i = r + step; i !== row; i += step) {
                                    if (boardState[i][c]) {
                                        blocked = true;
                                        break;
                                    }
                                }
                            }
                            
                            if (!blocked) return true;
                        }
                    }
                    
                    if (type === 'bishop' || type === 'queen') {
                        // Check if on same diagonal
                        if (Math.abs(r - row) === Math.abs(c - col)) {
                            let blocked = false;
                            
                            const rowStep = r < row ? 1 : -1;
                            const colStep = c < col ? 1 : -1;
                            
                            let checkR = r + rowStep;
                            let checkC = c + colStep;
                            
                            while (checkR !== row && checkC !== col) {
                                if (boardState[checkR][checkC]) {
                                    blocked = true;
                                    break;
                                }
                                checkR += rowStep;
                                checkC += colStep;
                            }
                            
                            if (!blocked) return true;
                        }
                    }
                }
            }
        }
        
        return false;
    }

    function isInCheck(color) {
        const king = findKing(color);
        return isSquareAttacked(king.row, king.col, color === 'white' ? 'black' : 'white');
    }

    function hasLegalMoves(color) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = boardState[r][c];
                if (piece && piece.startsWith(color)) {
                    const moves = getValidMoves(r, c);
                    if (moves.length > 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function checkGameStatus() {
        const inCheck = isInCheck(currentPlayer);
        const hasMovesAvailable = hasLegalMoves(currentPlayer);
        
        if (inCheck && !hasMovesAvailable) {
            // Checkmate
            gameOver = true;
            const winner = currentPlayer === 'white' ? 'Black' : 'White';
            statusElement.textContent = `Checkmate! ${winner} wins!`;
        } else if (inCheck) {
            // Check
            statusElement.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} is in check!`;
        } else if (!hasMovesAvailable) {
            // Stalemate
            gameOver = true;
            statusElement.textContent = 'Stalemate! The game is a draw.';
        } else {
            statusElement.textContent = '';
        }
    }

    function updateCapturedPieces() {
        capturedWhiteElement.innerHTML = '';
        capturedBlackElement.innerHTML = '';
        
        capturedPieces.white.forEach(piece => {
            const pieceChar = document.createElement('span');
            pieceChar.textContent = pieces[piece];
            capturedWhiteElement.appendChild(pieceChar);
        });
        
        capturedPieces.black.forEach(piece => {
            const pieceChar = document.createElement('span');
            pieceChar.textContent = pieces[piece];
            capturedBlackElement.appendChild(pieceChar);
        });
    }

    // Reset game function
    function resetGame() {
        boardState = JSON.parse(JSON.stringify(initialSetup));
        selectedPiece = null;
        currentPlayer = 'white';
        gameOver = false;
        capturedPieces = { white: [], black: [] };
        moveHistory = [];
        clearSelection();
        statusElement.textContent = '';
        turnStatusElement.textContent = "White's turn";
        turnStatusElement.previousElementSibling.textContent = '♟';
        updateCapturedPieces();
        createBoard();
    }

    // Hint function - suggests a move
    function showHint() {
        if (gameOver) return;
        
        // Clear any previous hints
        document.querySelectorAll('.hint-highlight').forEach(el => {
            el.classList.remove('hint-highlight');
        });
        
        // Find a valid move
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = boardState[r][c];
                if (piece && piece.startsWith(currentPlayer)) {
                    const moves = getValidMoves(r, c);
                    if (moves.length > 0) {
                        // Highlight the piece to move
                        const square = getSquareElement(r, c);
                        square.classList.add('hint-highlight');
                        
                        // Store hint location
                        hintMode = true;
                        hintSquare = { row: r, col: c };
                        
                        return;
                    }
                }
            }
        }
    }

    // Undo move function
    function undoMove() {
        if (moveHistory.length === 0) return;
        
        const lastMove = moveHistory.pop();
        const { from, to, capturedPiece } = lastMove;
        
        // Restore the moved piece to its original position
        boardState[from.row][from.col] = from.piece;
        boardState[to.row][to.col] = capturedPiece;
        
        // If there was a captured piece, remove it from captured list
        if (capturedPiece) {
            const captureColor = capturedPiece.split('-')[0] === 'white' ? 'white' : 'black';
            capturedPieces[captureColor].pop();
            updateCapturedPieces();
        }
        
        // Switch back to previous player
        currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
        turnStatusElement.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s turn`;
        turnStatusElement.previousElementSibling.textContent = currentPlayer === 'white' ? '♟' : '♙';
        
        // Clear any game over state
        gameOver = false;
        statusElement.textContent = '';
        
        // Update the board
        createBoard();
    }

    // Event listeners for controls
    resetButton.addEventListener('click', resetGame);
    hintButton.addEventListener('click', showHint);
    undoButton.addEventListener('click', undoMove);
    
    // Initial board creation
    createBoard();
});