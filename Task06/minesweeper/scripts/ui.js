class GameUI {
    constructor(game, database) {
        this.game = game;
        this.database = database;
        this.gameBoard = document.getElementById('gameBoard');
        this.gameStatus = document.getElementById('gameStatus');
        this.openedCells = document.getElementById('openedCells');
        this.totalMines = document.getElementById('totalMines');
        this.flagsCount = document.getElementById('flagsCount');
        
        this.initializeEventListeners();
        this.renderBoard();
        this.updateInfo();
    }

    initializeEventListeners() {
        document.getElementById('newGameBtn').addEventListener('click', () => this.startNewGame());
        document.getElementById('showGamesBtn').addEventListener('click', () => this.showGamesList());
        document.getElementById('closeGamesBtn').addEventListener('click', () => this.hideGamesList());
        
        document.getElementById('minesCount').addEventListener('input', () => this.updateMinesInfo());
        document.getElementById('fieldSize').addEventListener('input', () => this.updateMinesInfo());
    }

    updateMinesInfo() {
        const fieldSize = parseInt(document.getElementById('fieldSize').value);
        const minesCount = parseInt(document.getElementById('minesCount').value);
        const maxMines = Math.floor(fieldSize * fieldSize * 0.3); // Максимум 30% поля
        
        if (minesCount > maxMines) {
            document.getElementById('minesCount').value = maxMines;
        }
        
        this.totalMines.textContent = document.getElementById('minesCount').value;
    }

    renderBoard() {
        this.gameBoard.innerHTML = '';
        this.gameBoard.style.gridTemplateColumns = `repeat(${this.game.fieldSize}, 30px)`;
        
        for (let y = 0; y < this.game.fieldSize; y++) {
            for (let x = 0; x < this.game.fieldSize; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                cell.addEventListener('click', (e) => this.handleCellClick(e, x, y));
                cell.addEventListener('contextmenu', (e) => this.handleRightClick(e, x, y));
                
                this.updateCellAppearance(cell, x, y);
                this.gameBoard.appendChild(cell);
            }
        }
    }

    updateCellAppearance(cell, x, y) {
        cell.className = 'cell';
        
        if (this.game.revealed[y][x]) {
            cell.classList.add('revealed');
            const value = this.game.field[y][x];
            
            if (value === -1) {
                cell.classList.add('mine');
                if (this.game.gameOver && !this.game.gameWon) {
                    cell.classList.add('exploded');
                }
            } else if (value > 0) {
                cell.textContent = value;
                cell.dataset.value = value;
            }
        } else if (this.game.flagged[y][x]) {
            cell.classList.add('flagged');
        }
    }

    handleCellClick(event, x, y) {
        if (this.game.gameOver) return;
        
        const result = this.game.revealCell(x, y);
        
        if (result.revealed.length > 0) {
            result.revealed.forEach(({ x, y }) => {
                const cell = this.getCellElement(x, y);
                this.updateCellAppearance(cell, x, y);
            });
            
            this.updateInfo();
            
            if (this.game.gameOver) {
                this.handleGameEnd();
            }
        }
    }

    handleRightClick(event, x, y) {
        event.preventDefault();
        
        if (this.game.gameOver || this.game.revealed[y][x]) return;
        
        const flagToggled = this.game.toggleFlag(x, y);
        if (flagToggled) {
            const cell = this.getCellElement(x, y);
            this.updateCellAppearance(cell, x, y);
            this.updateInfo();
        }
    }

    getCellElement(x, y) {
        return this.gameBoard.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    }

    updateInfo() {
        this.openedCells.textContent = this.game.getRevealedCount();
        this.flagsCount.textContent = this.game.getFlaggedCount();
        
        if (this.game.gameOver) {
            this.gameStatus.textContent = this.game.gameWon ? 'Победа! 🎉' : 'Поражение! 💥';
            this.gameStatus.style.color = this.game.gameWon ? 'green' : 'red';
        } else {
            this.gameStatus.textContent = 'Игра идет...';
            this.gameStatus.style.color = 'blue';
        }
    }

    async handleGameEnd() {
        this.revealAllCells();
        this.updateInfo();
        
        const playerName = document.getElementById('playerName').value || 'Аноним';
        const gameData = this.game.getGameData(playerName);
        
        try {
            await this.database.saveGame(gameData);
            console.log('Игра сохранена в базу данных');
        } catch (error) {
            console.error('Ошибка при сохранении игры:', error);
        }
    }

    revealAllCells() {
        for (let y = 0; y < this.game.fieldSize; y++) {
            for (let x = 0; x < this.game.fieldSize; x++) {
                const cell = this.getCellElement(x, y);
                this.updateCellAppearance(cell, x, y);
            }
        }
    }

    startNewGame() {
        const fieldSize = parseInt(document.getElementById('fieldSize').value);
        const minesCount = parseInt(document.getElementById('minesCount').value);
        const maxMines = Math.floor(fieldSize * fieldSize * 0.3);
        
        if (minesCount > maxMines) {
            alert(`Слишком много мин! Максимум для поля ${fieldSize}x${fieldSize}: ${maxMines}`);
            return;
        }
        
        this.game = new Minesweeper(fieldSize, minesCount);
        this.renderBoard();
        this.updateInfo();
    }

    async showGamesList() {
        try {
            const games = await this.database.getAllGames();
            this.renderGamesList(games);
            document.getElementById('gamesList').classList.remove('hidden');
        } catch (error) {
            console.error('Ошибка при загрузке списка игр:', error);
            alert('Ошибка при загрузке списка игр');
        }
    }

    hideGamesList() {
        document.getElementById('gamesList').classList.add('hidden');
    }

    renderGamesList(games) {
        const container = document.getElementById('gamesContainer');
        container.innerHTML = '';
        
        if (games.length === 0) {
            container.innerHTML = '<p>Нет сохраненных игр</p>';
            return;
        }
        
        games.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        games.forEach(game => {
            const gameElement = document.createElement('div');
            gameElement.className = `game-item ${game.result}`;
            
            const date = new Date(game.date).toLocaleString('ru-RU');
            const resultText = game.result === 'win' ? 'Победа' : 
                             game.result === 'lose' ? 'Поражение' : 'В процессе';
            
            gameElement.innerHTML = `
                <div class="game-meta">
                    <span>${game.playerName}</span>
                    <span>${date}</span>
                </div>
                <div class="game-details">
                    Поле: ${game.fieldSize}x${game.fieldSize}, Мины: ${game.minesCount}, 
                    Результат: ${resultText}, Ходов: ${game.totalMoves}
                </div>
            `;
            
            gameElement.addEventListener('click', () => this.replayGame(game.id));
            container.appendChild(gameElement);
        });
    }

    async replayGame(gameId) {
        try {
            const gameData = await this.database.getGameById(gameId);
            const moves = await this.database.getGameMoves(gameId);
            
            if (!gameData || !moves) {
                alert('Данные игры не найдены');
                return;
            }
            
            this.game = new Minesweeper(gameData.fieldSize, gameData.minesCount);
            this.renderBoard();
            this.updateInfo();
            
            for (const move of moves) {
                await this.simulateMove(move.x, move.y, move.result);
            }
            
            this.hideGamesList();
            
        } catch (error) {
            console.error('Ошибка при воспроизведении игры:', error);
            alert('Ошибка при воспроизведении игры');
        }
    }

    async simulateMove(x, y, result) {
        return new Promise(resolve => {
            setTimeout(() => {
                const cell = this.getCellElement(x, y);
                
                if (result === 'exploded') {
                    cell.classList.add('exploded');
                }
                
                this.game.revealCell(x, y);
                this.updateCellAppearance(cell, x, y);
                this.updateInfo();
                
                resolve();
            }, 500); 
        });
    }
}