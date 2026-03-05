// IndexedDB wrapper for offline storage
const TournamentDB = {
    dbName: 'TournamentDB',
    dbVersion: 1,
    db: null,

    // Initialize database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('Database error:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database initialized');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create stores if they don't exist
                if (!db.objectStoreNames.contains('tournaments')) {
                    db.createObjectStore('tournaments', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('players')) {
                    db.createObjectStore('players', { keyPath: 'id', autoIncrement: true });
                }
                
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
                
                if (!db.objectStoreNames.contains('autoSave')) {
                    db.createObjectStore('autoSave', { keyPath: 'timestamp' });
                }
            };
        });
    },

    // Ensure database is initialized
    async ensureDB() {
        if (!this.db) {
            await this.init();
        }
    },

    // Save tournament
    async saveTournament(tournament) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tournaments'], 'readwrite');
            const store = transaction.objectStore('tournaments');
            
            // Add timestamp
            tournament.lastModified = new Date().toISOString();
            
            const request = store.put(tournament);
            
            request.onsuccess = () => {
                console.log('Tournament saved to IndexedDB');
                resolve(request.result);
            };
            
            request.onerror = () => reject(request.error);
        });
    },

    // Load tournament
    async loadTournament(id) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tournaments'], 'readonly');
            const store = transaction.objectStore('tournaments');
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Get all tournaments
    async getAllTournaments() {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tournaments'], 'readonly');
            const store = transaction.objectStore('tournaments');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Delete tournament
    async deleteTournament(id) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tournaments'], 'readwrite');
            const store = transaction.objectStore('tournaments');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    // Auto-save current state
    async autoSave(state) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['autoSave'], 'readwrite');
            const store = transaction.objectStore('autoSave');
            
            const autoSaveData = {
                timestamp: Date.now(),
                state: state,
                id: 'current'
            };
            
            const request = store.put(autoSaveData);
            
            request.onsuccess = () => {
                this.showAutoSaveIndicator();
                resolve();
            };
            
            request.onerror = () => reject(request.error);
        });
    },

    // Load auto-saved state
    async loadAutoSave() {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['autoSave'], 'readonly');
            const store = transaction.objectStore('autoSave');
            const request = store.get('current');
            
            request.onsuccess = () => resolve(request.result?.state);
            request.onerror = () => reject(request.error);
        });
    },

    // Save setting
    async saveSetting(key, value) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key, value });
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    // Load setting
    async loadSetting(key) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result?.value);
            request.onerror = () => reject(request.error);
        });
    },

    // Show auto-save indicator
    showAutoSaveIndicator() {
        const indicator = document.getElementById('autoSaveIndicator');
        if (indicator) {
            indicator.style.display = 'block';
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 2000);
        }
    },

    // Export tournament to file
    async exportToFile(tournament) {
        const data = JSON.stringify(tournament, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        Utils.downloadBlob(blob, `tournament-${Utils.formatDate()}.json`);
    },

    // Import tournament from file
    importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const tournament = JSON.parse(e.target.result);
                    resolve(tournament);
                } catch (error) {
                    reject('Invalid JSON file');
                }
            };
            reader.onerror = () => reject('Error reading file');
            reader.readAsText(file);
        });
    },

    // Clear auto-save
    async clearAutoSave() {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['autoSave'], 'readwrite');
            const store = transaction.objectStore('autoSave');
            const request = store.delete('current');
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};

// Initialize database when page loads
document.addEventListener('DOMContentLoaded', () => {
    TournamentDB.init().catch(console.error);
});

window.TournamentDB = TournamentDB;