class Game {
    constructor() {
        this.database = new GameDatabase();
        this.ui = null;
        this.game = null;
        
        this.init();
    }

    async init() {
        try {
            await this.database.init();
            console.log('База данных инициализирована');
            
            const fieldSize = parseInt(document.getElementById('fieldSize').value);
            const minesCount = parseInt(document.getElementById('minesCount').value);
            
            this.game = new Minesweeper(fieldSize, minesCount);
            this.ui = new GameUI(this.game, this.database);
            
            console.log('Игра готова к запуску');
            
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            alert('Ошибка инициализации игры');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Game();
});