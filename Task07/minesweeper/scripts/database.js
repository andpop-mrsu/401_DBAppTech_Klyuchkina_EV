class GameDatabase {
    constructor() {
        this.dbName = 'MinesweeperDB';
        this.dbVersion = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Создаем хранилище для игр
                if (!db.objectStoreNames.contains('games')) {
                    const gamesStore = db.createObjectStore('games', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    
                    gamesStore.createIndex('date', 'date', { unique: false });
                    gamesStore.createIndex('playerName', 'playerName', { unique: false });
                    gamesStore.createIndex('result', 'result', { unique: false });
                }

                // Создаем хранилище для ходов
                if (!db.objectStoreNames.contains('moves')) {
                    const movesStore = db.createObjectStore('moves', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    
                    movesStore.createIndex('gameId', 'gameId', { unique: false });
                    movesStore.createIndex('moveNumber', 'moveNumber', { unique: false });
                }
            };
        });
    }

    async saveGame(gameData) {
        const transaction = this.db.transaction(['games', 'moves'], 'readwrite');
        const gamesStore = transaction.objectStore('games');
        const movesStore = transaction.objectStore('moves');

        return new Promise((resolve, reject) => {
            // Сохраняем основную информацию об игре
            const gameRequest = gamesStore.add({
                date: new Date().toISOString(),
                playerName: gameData.playerName,
                fieldSize: gameData.fieldSize,
                minesCount: gameData.minesCount,
                mines: gameData.mines,
                result: gameData.result,
                totalMoves: gameData.moves.length
            });

            gameRequest.onsuccess = (event) => {
                const gameId = event.target.result;
                
                // Сохраняем все ходы
                gameData.moves.forEach((move, index) => {
                    movesStore.add({
                        gameId: gameId,
                        moveNumber: index + 1,
                        x: move.x,
                        y: move.y,
                        result: move.result
                    });
                });

                resolve(gameId);
            };

            gameRequest.onerror = () => reject(gameRequest.error);
        });
    }

    async getAllGames() {
        const transaction = this.db.transaction(['games'], 'readonly');
        const store = transaction.objectStore('games');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getGameMoves(gameId) {
        const transaction = this.db.transaction(['moves'], 'readonly');
        const store = transaction.objectStore('moves');
        const index = store.index('gameId');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(gameId);
            request.onsuccess = () => {
                const moves = request.result.sort((a, b) => a.moveNumber - b.moveNumber);
                resolve(moves);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getGameById(gameId) {
        const transaction = this.db.transaction(['games'], 'readonly');
        const store = transaction.objectStore('games');
        
        return new Promise((resolve, reject) => {
            const request = store.get(gameId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteGame(gameId) {
        const transaction = this.db.transaction(['games', 'moves'], 'readwrite');
        const gamesStore = transaction.objectStore('games');
        const movesStore = transaction.objectStore('moves');
        const movesIndex = movesStore.index('gameId');

        return new Promise((resolve, reject) => {
            // Удаляем ходы игры
            const movesRequest = movesIndex.openCursor(gameId);
            movesRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            // Удаляем саму игру
            const gameRequest = gamesStore.delete(gameId);
            gameRequest.onsuccess = () => resolve();
            gameRequest.onerror = () => reject(gameRequest.error);
        });
    }
}