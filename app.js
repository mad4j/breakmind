// Game state
let gameState = {
    tokens: [],
    nextNumber: 1,
    phase: 1,
    phase1Elapsed: 0,
    phase2Elapsed: 0,
    timerInterval: null,
    phase1ListenerTimeout: null,
    isGameActive: false
};

// DOM elements
const gameArea = document.getElementById('game-area');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const timeDisplay = document.getElementById('time');
const phaseLabelDisplay = document.getElementById('phase-label');
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
    // Clean up any lingering phase-1 listeners from previous session
    cleanupPhase1Listeners();

    gameState = {
        tokens: [],
        nextNumber: 1,
        phase: 1,
        phase1Elapsed: 0,
        phase2Elapsed: 0,
        timerInterval: null,
        phase1ListenerTimeout: null,
        isGameActive: true
    };

    gameArea.innerHTML = '';
    gameArea.classList.remove('hidden');
    startScreen.classList.add('hidden');

    updateDisplay();
    generateTokens();
    startPhase1Timer();
}

function cleanupPhase1Listeners() {
    clearTimeout(gameState.phase1ListenerTimeout);
    document.removeEventListener('click', onPhase1Touch);
    document.removeEventListener('touchstart', onPhase1Touch);
}

function onPhase1Touch() {
    if (gameState.phase === 1 && gameState.isGameActive) {
        cleanupPhase1Listeners();
        clearInterval(gameState.timerInterval);
        startPhase2();
    }
}

function startPhase1Timer() {
    const startTime = Date.now();
    const maxDuration = 10000;

    // Defer listener registration so the click that started the game
    // finishes bubbling before we begin listening for the phase-1 tap.
    // Store the timeout ID so it can be cancelled if the game restarts.
    gameState.phase1ListenerTimeout = setTimeout(() => {
        document.addEventListener('click', onPhase1Touch);
        document.addEventListener('touchstart', onPhase1Touch);
    }, 0);

    gameState.timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        if (elapsed >= maxDuration) {
            cleanupPhase1Listeners();
            gameState.phase1Elapsed = 10.0;
            clearInterval(gameState.timerInterval);
            updateDisplay();
            startPhase2();
        } else {
            gameState.phase1Elapsed = elapsed / 1000;
            updateDisplay();
        }
    }, 100);
}

function startPhase2() {
    gameState.phase = 2;
    gameState.nextNumber = 1;

    gameState.tokens.forEach(token => {
        token.classList.add('number-hidden');
    });

    updateDisplay();

    const startTime = Date.now();
    gameState.timerInterval = setInterval(() => {
        gameState.phase2Elapsed = (Date.now() - startTime) / 1000;
        updateDisplay();
    }, 100);
}

function generateTokens() {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const gameAreaRect = gameArea.getBoundingClientRect();
    const tokenSize = window.matchMedia('(max-width: 600px)').matches ? 46 : 56;
    const gridSize = 3;
    const cellWidth = gameAreaRect.width / gridSize;
    const cellHeight = gameAreaRect.height / gridSize;
    const cells = [];

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            cells.push({ row, col });
        }
    }

    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    numbers.forEach((num, index) => {
        const cell = cells[index];
        const x = cell.col * cellWidth + (cellWidth - tokenSize) / 2;
        const y = cell.row * cellHeight + (cellHeight - tokenSize) / 2;
        createToken(num, x, y);
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
    if (gameState.phase !== 2) return;

    if (number === gameState.nextNumber) {
        // Correct click
        token.classList.add('correct');
        gameState.nextNumber++;

        updateDisplay();

        // Check for victory
        if (gameState.nextNumber > 9) {
            endGame(true);
        }
    } else {
        // Wrong click in phase 2 → game over
        token.classList.add('wrong');
        gameState.isGameActive = false;
        setTimeout(() => endGame(false), 400);
    }
}

function updateDisplay() {
    if (gameState.phase === 1) {
        const remaining = Math.max(0, 10.0 - gameState.phase1Elapsed);
        timeDisplay.textContent = remaining.toFixed(1);
        phaseLabelDisplay.textContent = 'Memorizza:';
        scoreDisplay.textContent = '---';
    } else {
        timeDisplay.textContent = gameState.phase2Elapsed.toFixed(1);
        phaseLabelDisplay.textContent = 'Ricorda:';
        scoreDisplay.textContent = '---';
    }
}

function endGame(victory) {
    gameState.isGameActive = false;
    clearInterval(gameState.timerInterval);
    cleanupPhase1Listeners();

    // Clear tokens from DOM and hide game area
    gameArea.innerHTML = '';
    gameArea.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');

    const p1 = gameState.phase1Elapsed.toFixed(1);
    const p2 = gameState.phase2Elapsed.toFixed(1);
    const total = (gameState.phase1Elapsed + gameState.phase2Elapsed).toFixed(1);

    if (victory) {
        gameOverTitle.textContent = 'Vittoria!';
        gameOverTitle.className = 'victory';
        gameOverMessage.textContent = `Complimenti! Punteggio: ${total}s (Fase 1: ${p1}s + Fase 2: ${p2}s)`;
    } else {
        gameOverTitle.textContent = 'Sbagliato!';
        gameOverTitle.className = 'defeat';
        gameOverMessage.textContent = `Hai premuto il token sbagliato! Nessun punteggio.`;
    }
}
