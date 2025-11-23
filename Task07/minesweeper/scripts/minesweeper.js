class Minesweeper {
    constructor(fieldSize, minesCount) {
        this.fieldSize = fieldSize;
        this.minesCount = minesCount;
        this.field = [];
        this.revealed = [];
        this.flagged = [];
        this.mines = [];
        this.gameOver = false;
        this.gameWon = false;
        this.firstMove = true;
        this.moves = [];
        this.startTime = null;
        
        this.initializeField();
    }

    initializeField() {
        this.field = Array(this.fieldSize).fill().map(() => 
            Array(this.fieldSize).fill(0)
        );
        
        this.revealed = Array(this.fieldSize).fill().map(() => 
            Array(this.fieldSize).fill(false)
        );
        
        this.flagged = Array(this.fieldSize).fill().map(() => 
            Array(this.fieldSize).fill(false)
        );
        
        this.mines = [];
    }

    placeMines(firstX, firstY) {
        const safeCells = this.getAdjacentCells(firstX, firstY);
        safeCells.push([firstX, firstY]);
        
        let minesPlaced = 0;
        while (minesPlaced < this.minesCount) {
            const x = Math.floor(Math.random() * this.fieldSize);
            const y = Math.floor(Math.random() * this.fieldSize);
            
            const isSafe = safeCells.some(([safeX, safeY]) => safeX === x && safeY === y);
            const hasMine = this.mines.some(([mineX, mineY]) => mineX === x && mineY === y);
            
            if (!isSafe && !hasMine) {
                this.mines.push([x, y]);
                minesPlaced++;
            }
        }
        
        this.updateFieldNumbers();
    }

    updateFieldNumbers() {
        this.field = Array(this.fieldSize).fill().map(() => 
            Array(this.fieldSize).fill(0)
        );
        
        this.mines.forEach(([x, y]) => {
            this.field[y][x] = -1;
        });
        
        for (let y = 0; y < this.fieldSize; y++) {
            for (let x = 0; x < this.fieldSize; x++) {
                if (this.field[y][x] !== -1) {
                    this.field[y][x] = this.countAdjacentMines(x, y);
                }
            }
        }
    }

    countAdjacentMines(x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const newX = x + dx;
                const newY = y + dy;
                
                if (this.isValidCell(newX, newY) && this.field[newY][newX] === -1) {
                    count++;
                }
            }
        }
        return count;
    }

    getAdjacentCells(x, y) {
        const cells = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const newX = x + dx;
                const newY = y + dy;
                
                if (this.isValidCell(newX, newY)) {
                    cells.push([newX, newY]);
                }
            }
        }
        return cells;
    }

    isValidCell(x, y) {
        return x >= 0 && x < this.fieldSize && y >= 0 && y < this.fieldSize;
    }

    revealCell(x, y) {
        if (!this.isValidCell(x, y) || this.revealed[y][x] || this.flagged[y][x] || this.gameOver) {
            return { revealed: [], result: 'invalid' };
        }

        if (this.firstMove) {
            this.startTime = Date.now();
            this.placeMines(x, y);
            this.firstMove = false;
        }

        const revealedCells = [];
        const result = this.revealCellRecursive(x, y, revealedCells);
        
        if (revealedCells.length > 0) {
            this.moves.push({
                x, y,
                result: result,
                timestamp: Date.now()
            });
        }

        if (!this.gameOver) {
            this.checkWin();
        }

        return { revealed: revealedCells, result };
    }

    revealCellRecursive(x, y, revealedCells) {
        if (!this.isValidCell(x, y) || this.revealed[y][x] || this.flagged[y][x]) {
            return 'safe';
        }

        this.revealed[y][x] = true;
        revealedCells.push({ x, y, value: this.field[y][x] });

        if (this.field[y][x] === -1) {
            this.gameOver = true;
            return 'exploded';
        }

        if (this.field[y][x] === 0) {
            const adjacentCells = this.getAdjacentCells(x, y);
            for (const [adjX, adjY] of adjacentCells) {
                this.revealCellRecursive(adjX, adjY, revealedCells);
            }
        }

        return 'safe';
    }

    toggleFlag(x, y) {
        if (!this.isValidCell(x, y) || this.revealed[y][x] || this.gameOver) {
            return false;
        }

        this.flagged[y][x] = !this.flagged[y][x];
        return true;
    }

    checkWin() {
        let unrevealedSafeCells = 0;
        
        for (let y = 0; y < this.fieldSize; y++) {
            for (let x = 0; x < this.fieldSize; x++) {
                if (!this.revealed[y][x] && this.field[y][x] !== -1) {
                    unrevealedSafeCells++;
                }
            }
        }
        
        if (unrevealedSafeCells === 0) {
            this.gameWon = true;
            this.gameOver = true;
            return true;
        }
        
        return false;
    }

    getRevealedCount() {
        let count = 0;
        for (let y = 0; y < this.fieldSize; y++) {
            for (let x = 0; x < this.fieldSize; x++) {
                if (this.revealed[y][x]) count++;
            }
        }
        return count;
    }

    getFlaggedCount() {
        let count = 0;
        for (let y = 0; y < this.fieldSize; y++) {
            for (let x = 0; x < this.fieldSize; x++) {
                if (this.flagged[y][x]) count++;
            }
        }
        return count;
    }

    getGameData(playerName) {
        return {
            playerName,
            fieldSize: this.fieldSize,
            minesCount: this.minesCount,
            mines: this.mines,
            result: this.gameWon ? 'win' : (this.gameOver ? 'lose' : 'in_progress'),
            moves: this.moves,
            duration: this.startTime ? Date.now() - this.startTime : 0
        };
    }
}