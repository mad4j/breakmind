// Game state
let gameState = {
    tokens: [],
    nextNumber: 1,
    score: 0,
    timeRemaining: 10.0,
    timerInterval: null,
    isGameActive: false
};

// DOM elements
const gameArea = document.getElementById('game-area');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const timeDisplay = document.getElementById('time');
const nextDisplay = document.getElementById('next');
const scoreDisplay = document.getElementById('score');
const gameOverTitle = document.getElementById('game-over-title');
const gameOverMessage = document.getElementById('game-over-message');

// Initialize service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(registration => console.log('Service Worker registered'))
        .catch(error => console.log('Service Worker registration failed:', error));
}

// Event listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    startGame();
});

function startGame() {
    // Reset game state
    gameState = {
        tokens: [],
        nextNumber: 1,
        score: 0,
        timeRemaining: 10.0,
        timerInterval: null,
        isGameActive: true
    };

    // Update UI
    updateDisplay();
    startScreen.classList.add('hidden');
    gameArea.innerHTML = '';

    // Generate tokens
    generateTokens();

    // Start timer
    startTimer();
}

function generateTokens() {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const positions = [];
    
    const gameAreaRect = gameArea.getBoundingClientRect();
    const tokenSize = 60;
    const padding = 10;
    const maxAttempts = 100;

    numbers.forEach(num => {
        let position = null;
        let attempts = 0;

        while (!position && attempts < maxAttempts) {
            const x = Math.random() * (gameAreaRect.width - tokenSize - 2 * padding) + padding;
            const y = Math.random() * (gameAreaRect.height - tokenSize - 2 * padding) + padding;

            const overlaps = positions.some(pos => {
                const dx = pos.x - x;
                const dy = pos.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance < tokenSize + padding;
            });

            if (!overlaps) {
                position = { x, y };
            }
            attempts++;
        }

        if (!position) {
            // Fallback: grid position
            const gridSize = 3;
            const cellWidth = gameAreaRect.width / gridSize;
            const cellHeight = gameAreaRect.height / gridSize;
            const index = num - 1;
            const row = Math.floor(index / gridSize);
            const col = index % gridSize;
            position = {
                x: col * cellWidth + (cellWidth - tokenSize) / 2,
                y: row * cellHeight + (cellHeight - tokenSize) / 2
            };
        }

        positions.push(position);
        createToken(num, position.x, position.y);
    });
}

function createToken(number, x, y) {
    const token = document.createElement('div');
    token.className = 'token';
    token.textContent = number;
    token.style.left = `${x}px`;
    token.style.top = `${y}px`;
    token.dataset.number = number;

    token.addEventListener('click', () => handleTokenClick(number, token));

    gameArea.appendChild(token);
    gameState.tokens.push(token);
}

function handleTokenClick(number, token) {
    if (!gameState.isGameActive) return;

    if (number === gameState.nextNumber) {
        // Correct click
        token.classList.add('correct');
        gameState.score += 10;
        gameState.nextNumber++;

        updateDisplay();

        // Check for victory
        if (gameState.nextNumber > 9) {
            endGame(true);
        }
    } else {
        // Wrong click
        token.classList.add('wrong');
        setTimeout(() => {
            if (token.classList.contains('wrong')) {
                token.classList.remove('wrong');
            }
        }, 500);
    }
}

function startTimer() {
    const startTime = Date.now();
    const duration = 10000; // 10 seconds in milliseconds

    gameState.timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = duration - elapsed;

        if (remaining <= 0) {
            gameState.timeRemaining = 0;
            updateDisplay();
            endGame(false);
        } else {
            gameState.timeRemaining = remaining / 1000;
            updateDisplay();
        }
    }, 50); // Update every 50ms for smooth display
}

function updateDisplay() {
    timeDisplay.textContent = gameState.timeRemaining.toFixed(1);
    nextDisplay.textContent = gameState.nextNumber;
    scoreDisplay.textContent = gameState.score;
}

function endGame(victory) {
    gameState.isGameActive = false;
    clearInterval(gameState.timerInterval);

    gameArea.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');

    if (victory) {
        gameOverTitle.textContent = 'Vittoria!';
        gameOverTitle.className = 'victory';
        gameOverMessage.textContent = `Complimenti! Hai completato il gioco con un punteggio di ${gameState.score} punti!`;
    } else {
        gameOverTitle.textContent = 'Tempo Scaduto!';
        gameOverTitle.className = 'defeat';
        gameOverMessage.textContent = `Hai raggiunto il numero ${gameState.nextNumber - 1}. Punteggio: ${gameState.score} punti. Riprova!`;
    }

    // Show game area again for next game
    setTimeout(() => {
        gameArea.classList.remove('hidden');
    }, 100);
}
