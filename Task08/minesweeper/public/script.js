// public/game.js

let currentGameId = null;
let gameConfig = {};
let minesLocations = [];
let movesCount = 0;
let isReplayMode = false;
let gameOver = false;
let cellsOpened = 0;

// --- API Functions (без изменений) ---
async function apiGetGames() {
    const res = await fetch('/games');
    return await res.json();
}

async function apiGetGameDetails(id) {
    const res = await fetch(`/games/${id}`);
    return await res.json();
}

async function apiCreateGame(data) {
    const res = await fetch('/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await res.json();
}

async function apiSaveStep(gameId, stepData) {
    await fetch(`/step/${gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stepData)
    });
}

// --- UI Switching ---
function hideAllViews() {
    document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
}

function showNewGameView() {
    hideAllViews();
    document.getElementById('new-game-view').classList.remove('hidden');
}

// --- Game Logic ---

async function startGame() {
    const name = document.getElementById('player-name').value;
    const size = parseInt(document.getElementById('board-size').value);
    const minesCount = parseInt(document.getElementById('mines-count').value);

    if (minesCount >= size * size) {
        alert("Слишком много мин!");
        return;
    }

    const minesCoords = generateMines(size, minesCount);
    
    const gameData = {
        player_name: name,
        width: size,
        height: size,
        mines_count: minesCount,
        mines_coords: minesCoords
    };

    const response = await apiCreateGame(gameData);
    currentGameId = response.id;

    gameConfig = { width: size, height: size, totalMines: minesCount };
    minesLocations = minesCoords.map(m => `${m.r},${m.c}`);
    movesCount = 0;
    cellsOpened = 0;
    gameOver = false;
    isReplayMode = false;

    renderBoard(size);
    hideAllViews();
    document.getElementById('game-board-view').classList.remove('hidden');
    document.getElementById('game-status').innerText = "Игра идет";
    document.getElementById('game-status').style.color = "#333";
}

function generateMines(size, count) {
    let mines = [];
    while (mines.length < count) {
        let r = Math.floor(Math.random() * size);
        let c = Math.floor(Math.random() * size);
        if (!mines.some(m => m.r === r && m.c === c)) {
            mines.push({ r, c });
        }
    }
    return mines;
}

function renderBoard(size) {
    const board = document.getElementById('board');
    board.innerHTML = '';
    // Увеличиваем размер клетки для нового дизайна (35px + gap)
    board.style.gridTemplateColumns = `repeat(${size}, 35px)`;

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.r = r;
            cell.dataset.c = c;
            
            // Левый клик
            cell.onclick = () => handleCellClick(r, c);
            
            // Правый клик (флаг)
            cell.oncontextmenu = (e) => handleRightClick(e, r, c);
            
            board.appendChild(cell);
        }
    }
}

// Обработка правой кнопки мыши
function handleRightClick(e, r, c) {
    e.preventDefault(); // Блокируем стандартное меню браузера
    
    if (gameOver || isReplayMode) return;
    
    const cell = document.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);
    
    // Нельзя ставить флаг на открытую клетку
    if (cell.classList.contains('opened')) return;

    // Переключаем класс флага
    cell.classList.toggle('flagged');
    
    // Флаги - это клиентская фича, на сервер обычно не отправляем, 
    // так как в ТЗ просят сохранять "ходы" (открытия) и результат.
}

async function handleCellClick(r, c) {
    if (gameOver || isReplayMode) return;
    
    const cell = document.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);
    
    // Если стоит флаг или клетка уже открыта - ничего не делаем
    if (cell.classList.contains('flagged') || cell.classList.contains('opened')) return;

    movesCount++;
    let outcome = 'ok';
    let isMine = minesLocations.includes(`${r},${c}`);

    if (isMine) {
        outcome = 'lose';
        gameOver = true;
        revealMines();
        cell.classList.add('mine');
        cell.innerText = '💣'; // Показываем бомбу
        document.getElementById('game-status').innerText = "Вы взорвались!";
        document.getElementById('game-status').style.color = "#e74c3c";
    } else {
        let minesAround = countMinesAround(r, c);
        cell.classList.add('opened');
        cellsOpened++;
        
        if (minesAround > 0) {
            cell.innerText = minesAround;
            cell.setAttribute('data-num', minesAround); // Для CSS цветов
        } else {
            expandZeros(r, c);
        }

        // Проверка победы
        const totalCells = gameConfig.width * gameConfig.height;
        if (cellsOpened === totalCells - gameConfig.totalMines) {
            outcome = 'win';
            gameOver = true;
            document.getElementById('game-status').innerText = "Победа! Все мины найдены.";
            document.getElementById('game-status').style.color = "#27ae60";
        }
    }

    // Отправка хода на сервер
    await apiSaveStep(currentGameId, {
        move_number: movesCount,
        row: r,
        col: c,
        outcome: outcome
    });
}

function countMinesAround(r, c) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (minesLocations.includes(`${r+i},${c+j}`)) count++;
        }
    }
    return count;
}

function expandZeros(r, c) {
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            let nr = r + i, nc = c + j;
            if (nr >= 0 && nr < gameConfig.width && nc >= 0 && nc < gameConfig.height) {
                const cell = document.querySelector(`.cell[data-r='${nr}'][data-c='${nc}']`);
                // Открываем рекурсивно, только если нет флага и не открыта
                if (!cell.classList.contains('opened') && !cell.classList.contains('flagged')) {
                    let minesAround = countMinesAround(nr, nc);
                    cell.classList.add('opened');
                    cellsOpened++;
                    if (minesAround > 0) {
                        cell.innerText = minesAround;
                        cell.setAttribute('data-num', minesAround);
                    } else {
                        if (i !== 0 || j !== 0) expandZeros(nr, nc);
                    }
                }
            }
        }
    }
}

function revealMines() {
    minesLocations.forEach(loc => {
        let [r, c] = loc.split(',');
        let cell = document.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);
        if (cell) {
            // Если на мине стоял флаг - можно пометить как "верно угаданная", но обычно просто показывают мины
            if (!cell.classList.contains('flagged')) {
                cell.classList.add('mine');
                cell.innerText = '💣';
            }
        }
    });
}

// --- List & Replay ---

async function loadGamesList() {
    hideAllViews();
    document.getElementById('games-list-view').classList.remove('hidden');
    const tbody = document.querySelector('#games-table tbody');
    tbody.innerHTML = '<tr><td colspan="7">Загрузка...</td></tr>';

    const games = await apiGetGames();
    tbody.innerHTML = '';

    games.forEach(g => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${g.id}</td>
            <td>${formatDate(g.date)}</td>
            <td>${g.player_name}</td>
            <td>${g.width}x${g.height}</td>
            <td>${g.mines_count}</td>
            <td style="color: ${getResultColor(g.result)}">${translateResult(g.result)}</td>
            <td><button onclick="replayGame(${g.id})" style="padding: 5px 10px; font-size: 12px;">Повтор</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function formatDate(dateStr) {
    // Простое форматирование, если дата приходит в формате SQL
    try {
        return new Date(dateStr).toLocaleString('ru-RU');
    } catch (e) {
        return dateStr;
    }
}

function getResultColor(res) {
    if (res === 'win') return '#27ae60';
    if (res === 'lose') return '#e74c3c';
    return '#f39c12';
}

function translateResult(res) {
    if (res === 'win') return 'Победа';
    if (res === 'lose') return 'Поражение';
    return 'В процессе';
}

async function replayGame(id) {
    const data = await apiGetGameDetails(id);
    
    gameConfig = { width: data.width, height: data.height, totalMines: data.mines_count };
    minesLocations = data.mines_coords.map(m => `${m.r},${m.c}`);
    
    isReplayMode = true;
    gameOver = false;
    cellsOpened = 0;
    
    renderBoard(gameConfig.width);
    hideAllViews();
    document.getElementById('game-board-view').classList.remove('hidden');
    document.getElementById('game-status').innerText = "Повтор партии...";
    document.getElementById('game-status').style.color = "#3498db";

    for (let i = 0; i < data.moves.length; i++) {
        const move = data.moves[i];
        await new Promise(r => setTimeout(r, 600)); // Пауза
        
        const cell = document.querySelector(`.cell[data-r='${move.row_idx}'][data-c='${move.col_idx}']`);
        
        // Визуально подсвечиваем клик "курсором" (опционально)
        cell.style.transform = "scale(0.9)";
        setTimeout(() => cell.style.transform = "scale(1)", 100);

        if (move.outcome === 'lose') {
            cell.classList.add('mine');
            cell.innerText = '💣';
            document.getElementById('game-status').innerText = "Игрок взорвался";
            document.getElementById('game-status').style.color = "#e74c3c";
            revealMines();
        } else {
            let minesAround = countMinesAround(move.row_idx, move.col_idx);
            cell.classList.add('opened');
            if (minesAround > 0) {
                cell.innerText = minesAround;
                cell.setAttribute('data-num', minesAround);
            } else {
                expandZeros(move.row_idx, move.col_idx);
            }
            
            if (move.outcome === 'win') {
                document.getElementById('game-status').innerText = "Победа игрока";
                document.getElementById('game-status').style.color = "#27ae60";
            }
        }
    }
}