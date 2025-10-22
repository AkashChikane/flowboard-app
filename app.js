// FlowBoard - Kanban Board Application

class FlowBoard {
    constructor() {
        this.boards = this.loadFromStorage('boards') || [];
        this.currentBoardId = this.loadFromStorage('currentBoardId') || null;
        this.currentColumnId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderBoards();
        
        if (this.boards.length > 0) {
            if (!this.currentBoardId || !this.boards.find(b => b.id === this.currentBoardId)) {
                this.currentBoardId = this.boards[0].id;
            }
            this.showBoard(this.currentBoardId);
        } else {
            this.showEmptyState();
        }

        // Register service worker for PWA
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        }
    }

    setupEventListeners() {
        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToCSV());
        
        // Board creation
        document.getElementById('newBoardBtn').addEventListener('click', () => this.openModal('newBoardModal'));
        document.getElementById('emptyStateBtn').addEventListener('click', () => this.openModal('newBoardModal'));
        document.getElementById('createBoardBtn').addEventListener('click', () => this.createBoard());
        
        // Column creation
        document.getElementById('addColumnBtn').addEventListener('click', () => this.openModal('newColumnModal'));
        document.getElementById('createColumnBtn').addEventListener('click', () => this.createColumn());
        
        // Card creation
        document.getElementById('createCardBtn').addEventListener('click', () => this.createCard());
        
        // Board deletion
        document.getElementById('deleteBoardBtn').addEventListener('click', () => this.deleteBoard());
        
        // Modal close buttons
        document.querySelectorAll('[data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.closeModal(e.target.dataset.modal);
            });
        });

        // Enter key handlers
        document.getElementById('boardNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createBoard();
        });
        
        document.getElementById('columnNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createColumn();
        });
        
        document.getElementById('cardTitleInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createCard();
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    // Board Management
    createBoard() {
        const nameInput = document.getElementById('boardNameInput');
        const name = nameInput.value.trim();
        
        if (!name) {
            alert('Please enter a board name');
            return;
        }

        const board = {
            id: this.generateId(),
            name: name,
            columns: [
                { id: this.generateId(), name: 'To Do', cards: [] },
                { id: this.generateId(), name: 'In Progress', cards: [] },
                { id: this.generateId(), name: 'Done', cards: [] }
            ],
            createdAt: new Date().toISOString()
        };

        this.boards.push(board);
        this.saveToStorage('boards', this.boards);
        this.currentBoardId = board.id;
        this.saveToStorage('currentBoardId', this.currentBoardId);
        
        nameInput.value = '';
        this.closeModal('newBoardModal');
        this.renderBoards();
        this.showBoard(board.id);
    }

    deleteBoard() {
        if (!confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
            return;
        }

        this.boards = this.boards.filter(b => b.id !== this.currentBoardId);
        this.saveToStorage('boards', this.boards);
        
        if (this.boards.length > 0) {
            this.currentBoardId = this.boards[0].id;
            this.saveToStorage('currentBoardId', this.currentBoardId);
            this.renderBoards();
            this.showBoard(this.currentBoardId);
        } else {
            this.currentBoardId = null;
            this.saveToStorage('currentBoardId', null);
            this.renderBoards();
            this.showEmptyState();
        }
    }

    showBoard(boardId) {
        this.currentBoardId = boardId;
        this.saveToStorage('currentBoardId', boardId);
        
        const board = this.boards.find(b => b.id === boardId);
        if (!board) return;

        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('boardView').style.display = 'block';
        document.getElementById('boardTitle').textContent = board.name;
        
        this.renderColumns(board);
        this.updateActiveBoardTab();
    }

    showEmptyState() {
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('boardView').style.display = 'none';
    }

    renderBoards() {
        const container = document.getElementById('boardsContainer');
        
        if (this.boards.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">No boards yet. Create one to get started!</p>';
            return;
        }

        container.innerHTML = this.boards.map(board => `
            <div class="board-tab ${board.id === this.currentBoardId ? 'active' : ''}" 
                 data-board-id="${board.id}">
                <i class="fas fa-clipboard"></i> ${this.escapeHtml(board.name)}
            </div>
        `).join('');

        // Add click listeners to board tabs
        container.querySelectorAll('.board-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.showBoard(tab.dataset.boardId);
            });
        });
    }

    updateActiveBoardTab() {
        document.querySelectorAll('.board-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.boardId === this.currentBoardId);
        });
    }

    // Column Management
    createColumn() {
        const nameInput = document.getElementById('columnNameInput');
        const name = nameInput.value.trim();
        
        if (!name) {
            alert('Please enter a column name');
            return;
        }

        const board = this.boards.find(b => b.id === this.currentBoardId);
        if (!board) return;

        const column = {
            id: this.generateId(),
            name: name,
            cards: []
        };

        board.columns.push(column);
        this.saveToStorage('boards', this.boards);
        
        nameInput.value = '';
        this.closeModal('newColumnModal');
        this.renderColumns(board);
    }

    deleteColumn(columnId) {
        if (!confirm('Are you sure you want to delete this column and all its tasks?')) {
            return;
        }

        const board = this.boards.find(b => b.id === this.currentBoardId);
        if (!board) return;

        board.columns = board.columns.filter(c => c.id !== columnId);
        this.saveToStorage('boards', this.boards);
        this.renderColumns(board);
    }

    renderColumns(board) {
        const container = document.getElementById('columnsContainer');
        
        container.innerHTML = board.columns.map(column => `
            <div class="column" data-column-id="${column.id}">
                <div class="column-header">
                    <div class="column-title">
                        ${this.escapeHtml(column.name)}
                        <span class="card-count">${column.cards.length}</span>
                    </div>
                    <div class="column-actions">
                        <button class="icon-btn danger" onclick="app.deleteColumn('${column.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="cards-container" data-column-id="${column.id}">
                    ${this.renderCards(column.cards)}
                </div>
                <button class="add-card-btn" onclick="app.openCardModal('${column.id}')">
                    <i class="fas fa-plus"></i> Add Task
                </button>
            </div>
        `).join('');

        // Initialize drag and drop for each column
        board.columns.forEach(column => {
            const cardsContainer = container.querySelector(`.cards-container[data-column-id="${column.id}"]`);
            new Sortable(cardsContainer, {
                group: 'shared',
                animation: 150,
                ghostClass: 'sortable-ghost',
                dragClass: 'sortable-drag',
                onEnd: (evt) => this.handleCardMove(evt)
            });
        });
    }

    // Card Management
    renderCards(cards) {
        return cards.map(card => `
            <div class="card" data-card-id="${card.id}">
                <div class="card-header">
                    <div class="card-title">${this.escapeHtml(card.title)}</div>
                    <button class="icon-btn danger" onclick="app.deleteCard('${card.id}', event)">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                ${card.description ? `<div class="card-description">${this.escapeHtml(card.description)}</div>` : ''}
            </div>
        `).join('');
    }

    openCardModal(columnId) {
        this.currentColumnId = columnId;
        this.openModal('newCardModal');
    }

    createCard() {
        const titleInput = document.getElementById('cardTitleInput');
        const descInput = document.getElementById('cardDescInput');
        const title = titleInput.value.trim();
        const description = descInput.value.trim();
        
        if (!title) {
            alert('Please enter a task title');
            return;
        }

        const board = this.boards.find(b => b.id === this.currentBoardId);
        if (!board) return;

        const column = board.columns.find(c => c.id === this.currentColumnId);
        if (!column) return;

        const card = {
            id: this.generateId(),
            title: title,
            description: description,
            createdAt: new Date().toISOString()
        };

        column.cards.push(card);
        this.saveToStorage('boards', this.boards);
        
        titleInput.value = '';
        descInput.value = '';
        this.closeModal('newCardModal');
        this.renderColumns(board);
    }

    deleteCard(cardId, event) {
        event.stopPropagation();
        
        const board = this.boards.find(b => b.id === this.currentBoardId);
        if (!board) return;

        board.columns.forEach(column => {
            column.cards = column.cards.filter(c => c.id !== cardId);
        });

        this.saveToStorage('boards', this.boards);
        this.renderColumns(board);
    }

    handleCardMove(evt) {
        const cardId = evt.item.dataset.cardId;
        const fromColumnId = evt.from.dataset.columnId;
        const toColumnId = evt.to.dataset.columnId;
        const newIndex = evt.newIndex;

        const board = this.boards.find(b => b.id === this.currentBoardId);
        if (!board) return;

        const fromColumn = board.columns.find(c => c.id === fromColumnId);
        const toColumn = board.columns.find(c => c.id === toColumnId);

        if (!fromColumn || !toColumn) return;

        // Find and remove card from source column
        const cardIndex = fromColumn.cards.findIndex(c => c.id === cardId);
        const [card] = fromColumn.cards.splice(cardIndex, 1);

        // Add card to destination column at new index
        toColumn.cards.splice(newIndex, 0, card);

        this.saveToStorage('boards', this.boards);
    }

    // Modal Management
    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
        // Focus on first input
        setTimeout(() => {
            const input = document.querySelector(`#${modalId} input`);
            if (input) input.focus();
        }, 100);
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    // Utility Functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    saveToStorage(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    loadFromStorage(key) {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    exportToCSV() {
        if (this.boards.length === 0) {
            alert('No data to export. Create a board first!');
            return;
        }

        // CSV header
        let csvContent = 'Board Name,Column Name,Task Title,Task Description,Created At\n';

        // Iterate through all boards, columns, and cards
        this.boards.forEach(board => {
            board.columns.forEach(column => {
                if (column.cards.length === 0) {
                    // Include empty columns
                    csvContent += `"${this.escapeCSV(board.name)}","${this.escapeCSV(column.name)}","","",""\n`;
                } else {
                    column.cards.forEach(card => {
                        const boardName = this.escapeCSV(board.name);
                        const columnName = this.escapeCSV(column.name);
                        const taskTitle = this.escapeCSV(card.title);
                        const taskDesc = this.escapeCSV(card.description || '');
                        const createdAt = card.createdAt || '';
                        
                        csvContent += `"${boardName}","${columnName}","${taskTitle}","${taskDesc}","${createdAt}"\n`;
                    });
                }
            });
        });

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `flowboard_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    escapeCSV(text) {
        if (typeof text !== 'string') return '';
        // Escape double quotes by doubling them
        return text.replace(/"/g, '""');
    }
}

// Initialize app
const app = new FlowBoard();
