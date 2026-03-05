// Main application controller with offline support and export features

class TournamentApp {
    constructor() {
        this.tournament = null;
        this.pairingSystem = null;
        this.currentView = 'setup';
        this.autoSaveInterval = null;
        this.deferredPrompt = null;
        this.pendingScores = {}; // Store scores before submission
        
        // Bind methods
        this.initialize = this.initialize.bind(this);
        this.reset = this.reset.bind(this);
        this.nextRound = this.nextRound.bind(this);
        this.showStandings = this.showStandings.bind(this);
        this.hideStandings = this.hideStandings.bind(this);
        this.submitScores = this.submitScores.bind(this);
        this.saveToFile = this.saveToFile.bind(this);
        this.loadFromFile = this.loadFromFile.bind(this);
        this.addPlayerField = this.addPlayerField.bind(this);
        this.removePlayerField = this.removePlayerField.bind(this);
        this.exportToExcel = this.exportToExcel.bind(this);
        this.exportToWord = this.exportToWord.bind(this);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check for auto-saved tournament
        this.checkForAutoSave();
        
        // Start auto-save interval
        this.startAutoSave();
        
        // Setup install prompt
        this.setupInstallPrompt();
        
        // Initialize with default players
        setTimeout(() => {
            this.addDefaultPlayers();
        }, 100);
    }

    addDefaultPlayers() {
        const defaultPlayers = [
            { name: 'John Doe', rating: 1850 },
            { name: 'Jane Smith', rating: 1720 },
            { name: 'Bob Johnson', rating: 1680 },
            { name: 'Alice Brown', rating: 1550 },
            { name: 'Mike Wilson', rating: 0 },
            { name: 'Sarah Lee', rating: 0 }
        ];
        
        defaultPlayers.forEach(player => {
            this.addPlayerField(player.name, player.rating);
        });
    }

    addPlayerField(name = '', rating = '') {
        const container = document.getElementById('player-fields');
        
        const playerRow = document.createElement('div');
        playerRow.className = 'player-row';
        playerRow.innerHTML = `
            <input type="text" class="modern-input" name="player-name" 
                   placeholder="Player Name" value="${name}" required>
            <input type="number" class="modern-input" name="player-rating" 
                   placeholder="Rating (0 allowed)" value="${rating}" min="0" step="1">
            <button type="button" class="remove-player" onclick="tournamentApp.removePlayerField(this)">×</button>
        `;
        
        container.appendChild(playerRow);
    }

    removePlayerField(button) {
        const container = document.getElementById('player-fields');
        if (container.children.length > 1) {
            button.closest('.player-row').remove();
        } else {
            alert('At least one player is required');
        }
    }

    getPlayersFromFields() {
        const playerRows = document.querySelectorAll('.player-row');
        const players = [];
        
        playerRows.forEach(row => {
            const nameInput = row.querySelector('input[name="player-name"]');
            const ratingInput = row.querySelector('input[name="player-rating"]');
            
            if (nameInput.value.trim()) {
                players.push({
                    name: nameInput.value.trim(),
                    rating: parseInt(ratingInput.value) || 0
                });
            }
        });
        
        return players;
    }

    setupEventListeners() {
        window.tournamentApp = this;
        
        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnlineStatus());
        window.addEventListener('offline', () => this.handleOnlineStatus());
        
        // Listen for beforeunload to auto-save
        window.addEventListener('beforeunload', () => {
            if (this.tournament) {
                TournamentDB.autoSave(this.tournament.exportData());
            }
        });
    }

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            
            // Show install prompt after 1 minute
            setTimeout(() => {
                this.showInstallPrompt();
            }, 60000);
        });
    }

    showInstallPrompt() {
        if (!this.deferredPrompt) return;
        
        const installDiv = document.createElement('div');
        installDiv.className = 'install-prompt';
        installDiv.innerHTML = `
            <span>📱 INSTALL APP FOR OFFLINE USE</span>
            <div>
                <button class="primary-btn" onclick="tournamentApp.installApp()">INSTALL</button>
                <button class="danger-btn" onclick="this.parentElement.parentElement.remove()">LATER</button>
            </div>
        `;
        document.querySelector('.container').prepend(installDiv);
    }

    installApp() {
        if (!this.deferredPrompt) return;
        
        this.deferredPrompt.prompt();
        
        this.deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted install');
            }
            this.deferredPrompt = null;
            document.querySelector('.install-prompt')?.remove();
        });
    }

    async checkForAutoSave() {
        try {
            const saved = await TournamentDB.loadAutoSave();
            if (saved) {
                const shouldRestore = confirm('FOUND UNSAVED TOURNAMENT. RESTORE?');
                if (shouldRestore) {
                    this.restoreTournament(saved);
                } else {
                    await TournamentDB.clearAutoSave();
                }
            }
        } catch (error) {
            console.log('No auto-save found');
        }
    }

    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            if (this.tournament) {
                TournamentDB.autoSave(this.tournament.exportData());
            }
        }, 30000);
    }

    restoreTournament(data) {
        this.tournament = new Tournament();
        Object.assign(this.tournament, data);
        this.pairingSystem = new PairingSystem(this.tournament);
        
        this.showTournamentContent();
        this.displayRound(this.tournament.currentRound);
    }

    handleOnlineStatus() {
        if (navigator.onLine) {
            console.log('Back online!');
        } else {
            console.log('Working offline');
        }
    }

    initialize() {
        const players = this.getPlayersFromFields();
        const roundsInput = parseInt(document.getElementById('rounds').value);
        
        if (players.length < 2) {
            alert('ENTER AT LEAST 2 PLAYERS');
            return;
        }
        
        this.tournament = new Tournament().initialize(players, roundsInput);
        this.pairingSystem = new PairingSystem(this.tournament);
        
        const firstRound = this.pairingSystem.generateFirstRound();
        this.tournament.pairings = [firstRound];
        this.tournament.currentRound = 1;
        
        TournamentDB.saveTournament(this.tournament.exportData());
        
        this.showTournamentContent();
        this.displayRound(1);
    }

    showTournamentContent() {
        document.getElementById('tournamentContent').style.display = 'block';
        document.getElementById('standingsContent').style.display = 'none';
        
        // Remove any existing winner announcement
        const existingWinner = document.getElementById('winnerAnnouncement');
        if (existingWinner) {
            existingWinner.remove();
        }
    }

    displayRound(round) {
        const content = document.getElementById('tournamentContent');
        
        let html = `
            <div class="round-info">
                <h3>ROUND ${round} OF ${this.tournament.rounds}</h3>
                <p>${this.getRoundDescription(round)}</p>
            </div>

            <div class="tournament-controls">
                <button id="nextRoundBtn" class="primary-btn" onclick="tournamentApp.nextRound()">
                    NEXT ROUND →
                </button>
                <button class="secondary-btn" onclick="tournamentApp.showStandings()">📊 STANDINGS</button>
                <button class="secondary-btn" onclick="tournamentApp.saveToFile()">💾 SAVE</button>
            </div>

            <div id="pairings"></div>
        `;
        
        content.innerHTML = html;
        this.renderPairings(round);
        
        // Check if all games are completed
        const roundPairings = this.tournament.pairings[round - 1];
        const allCompleted = roundPairings.every(p => p.completed);
        
        // Show/hide next round button based on completion
        const nextRoundBtn = document.getElementById('nextRoundBtn');
        if (nextRoundBtn) {
            if (allCompleted && round < this.tournament.rounds) {
                nextRoundBtn.style.display = 'inline-block';
            } else if (round === this.tournament.rounds) {
                if (allCompleted) {
                    nextRoundBtn.style.display = 'none';
                    this.endTournament();
                } else {
                    nextRoundBtn.style.display = 'none';
                }
            } else {
                nextRoundBtn.style.display = 'none';
            }
        }
        
        // Show winner if tournament completed
        if (this.tournament.completed) {
            this.showWinner();
        }
    }

    getRoundDescription(round) {
        if (round === 1) {
            return 'HIGHEST RATING VS LOWEST RATING';
        } else {
            return `GROUPED BY SCORE: ${round-0.5} POINT VS ${round-0.5} POINT`;
        }
    }

    renderPairings(round) {
        const pairingsDiv = document.getElementById('pairings');
        const roundPairings = this.tournament.pairings[round - 1];
        
        let html = '<h3>CURRENT PAIRINGS</h3>';
        
        roundPairings.forEach((pairing, index) => {
            if (pairing.completed && pairing.isBye) {
                html += this.renderByePairing(pairing);
            } else if (pairing.completed) {
                html += this.renderCompletedPairing(pairing);
            } else {
                html += this.renderActivePairing(pairing, index);
            }
        });
        
        html += `<p class="help-text">WIN = 1 | DRAW = 0.5 | LOSS = 0</p>`;
        pairingsDiv.innerHTML = html;
        
        // Restore any pending scores
        this.restorePendingScores(round);
    }

    restorePendingScores(round) {
        if (this.pendingScores[round]) {
            Object.entries(this.pendingScores[round]).forEach(([index, scores]) => {
                const whiteInput = document.getElementById(`whiteScore_${index}`);
                const blackInput = document.getElementById(`blackScore_${index}`);
                if (whiteInput && blackInput) {
                    whiteInput.value = scores.white;
                    blackInput.value = scores.black;
                }
            });
        }
    }

    renderByePairing(pairing) {
        return `
            <div class="pairing-card">
                <div class="completed-pairing">
                    <div>
                        <span class="pairing-players">${pairing.white.name} vs BYE</span>
                        <div class="bye-badge">BYE - 1 POINT</div>
                    </div>
                    <div class="result-badge">1 - 0</div>
                </div>
            </div>
        `;
    }

    renderCompletedPairing(pairing) {
        return `
            <div class="pairing-card">
                <div class="completed-pairing">
                    <div>
                        <span class="pairing-players">${pairing.white.name} vs ${pairing.black.name}</span>
                        <div class="rating-info">${pairing.white.rating} vs ${pairing.black.rating}</div>
                    </div>
                    <div class="result-badge">${pairing.whiteScore} - ${pairing.blackScore}</div>
                </div>
            </div>
        `;
    }

    renderActivePairing(pairing, index) {
        return `
            <div class="pairing-card">
                <div>
                    <span class="pairing-players">${pairing.white.name} (${pairing.white.rating}) vs ${pairing.black.name} (${pairing.black.rating})</span>
                    <div class="rating-info">RATING DIFF: ${Math.abs(pairing.white.rating - pairing.black.rating)}</div>
                </div>
                <div class="score-inputs">
                    <div class="score-input-group">
                        <label>${pairing.white.name}:</label>
                        <input type="number" class="score-input" id="whiteScore_${index}" 
                            min="0" max="1" step="0.5" value="0" placeholder="WHITE"
                            onchange="tournamentApp.savePendingScore(${this.tournament.currentRound}, ${index}, 'white', this.value)">
                    </div>
                    <div class="score-input-group">
                        <label>${pairing.black.name}:</label>
                        <input type="number" class="score-input" id="blackScore_${index}" 
                            min="0" max="1" step="0.5" value="0" placeholder="BLACK"
                            onchange="tournamentApp.savePendingScore(${this.tournament.currentRound}, ${index}, 'black', this.value)">
                    </div>
                    <button class="submit-scores" onclick="tournamentApp.submitScores(${index})">
                        SUBMIT
                    </button>
                </div>
            </div>
        `;
    }

    savePendingScore(round, pairingIndex, color, value) {
        if (!this.pendingScores[round]) {
            this.pendingScores[round] = {};
        }
        if (!this.pendingScores[round][pairingIndex]) {
            this.pendingScores[round][pairingIndex] = { white: 0, black: 0 };
        }
        this.pendingScores[round][pairingIndex][color] = parseFloat(value) || 0;
    }

    submitScores(pairingIndex) {
        const roundPairings = this.tournament.pairings[this.tournament.currentRound - 1];
        const pairing = roundPairings[pairingIndex];
        
        if (pairing.completed) {
            alert('GAME ALREADY COMPLETED!');
            return;
        }
        
        const whiteScore = parseFloat(document.getElementById(`whiteScore_${pairingIndex}`).value) || 0;
        const blackScore = parseFloat(document.getElementById(`blackScore_${pairingIndex}`).value) || 0;
        
        if (!Utils.validateScores(whiteScore, blackScore)) {
            alert('INVALID SCORES! TOTAL MUST BE 1 (1-0, 0.5-0.5, OR 0-1)');
            return;
        }
        
        // Update pairing
        pairing.whiteScore = whiteScore;
        pairing.blackScore = blackScore;
        pairing.completed = true;
        
        // Update player scores
        this.tournament.updateScores(pairing.white, pairing.black, whiteScore, blackScore);
        
        // Clear pending scores for this pairing
        if (this.pendingScores[this.tournament.currentRound]) {
            delete this.pendingScores[this.tournament.currentRound][pairingIndex];
        }
        
        // Save to database
        TournamentDB.saveTournament(this.tournament.exportData());
        
        // Show confirmation
        this.showSubmissionConfirmation(pairing);
        
        // Refresh display
        this.displayRound(this.tournament.currentRound);
    }

    showSubmissionConfirmation(pairing) {
        // Create temporary confirmation message
        const confirmation = document.createElement('div');
        confirmation.className = 'auto-save-indicator';
        confirmation.style.background = '#00ff88';
        confirmation.style.color = '#000';
        confirmation.textContent = `✓ RESULTS RECORDED: ${pairing.white.name} ${pairing.whiteScore}-${pairing.blackScore} ${pairing.black.name}`;
        document.body.appendChild(confirmation);
        
        setTimeout(() => {
            confirmation.remove();
        }, 3000);
    }

    nextRound() {
        if (this.tournament.completed) {
            alert('TOURNAMENT ALREADY COMPLETED!');
            return;
        }
        
        if (this.tournament.currentRound >= this.tournament.rounds) {
            this.endTournament();
            return;
        }
        
        // Generate next round pairings
        const nextRoundPairings = this.pairingSystem.generateNextRound();
        this.tournament.pairings.push(nextRoundPairings);
        this.tournament.currentRound++;
        
        // Save to database
        TournamentDB.saveTournament(this.tournament.exportData());
        
        // Show confirmation
        const confirmation = document.createElement('div');
        confirmation.className = 'auto-save-indicator';
        confirmation.style.background = '#ffaa00';
        confirmation.textContent = `✓ MOVING TO ROUND ${this.tournament.currentRound}`;
        document.body.appendChild(confirmation);
        
        setTimeout(() => {
            confirmation.remove();
        }, 2000);
        
        // Display new round
        this.displayRound(this.tournament.currentRound);
    }

    endTournament() {
        this.tournament.completed = true;
        TournamentDB.saveTournament(this.tournament.exportData());
        this.showWinner();
        this.showStandings();
    }

    showWinner() {
        const winner = this.tournament.getWinner();
        
        // Remove any existing winner announcement
        const existingWinner = document.getElementById('winnerAnnouncement');
        if (existingWinner) {
            existingWinner.remove();
        }
        
        const winnerDiv = document.createElement('div');
        winnerDiv.id = 'winnerAnnouncement';
        winnerDiv.className = 'winner-announcement';
        winnerDiv.innerHTML = `
            <h2>🏆 TOURNAMENT WINNER 🏆</h2>
            <p>${winner.name} - ${winner.score} POINTS</p>
        `;
        
        document.getElementById('tournamentContent').appendChild(winnerDiv);
    }

    showStandings() {
        if (!this.tournament) {
            alert('NO ACTIVE TOURNAMENT');
            return;
        }
        
        document.getElementById('tournamentContent').style.display = 'none';
        document.getElementById('standingsContent').style.display = 'block';
        
        const sortedPlayers = Utils.sortPlayers(this.tournament.players);
        
        let html = `
            <h2>TOURNAMENT STANDINGS</h2>
            <div class="action-buttons">
                <button class="secondary-btn" onclick="tournamentApp.hideStandings()">← BACK TO GAMES</button>
                <button class="secondary-btn" onclick="tournamentApp.exportToExcel()">📊 EXCEL</button>
                <button class="secondary-btn" onclick="tournamentApp.exportToWord()">📝 WORD</button>
            </div>
            <div class="standings-table-container">
                <table>
                    <thead>
                        <tr>
                            <th>RANK</th>
                            <th>PLAYER</th>
                            <th>RATING</th>
                            <th>POINTS</th>
                            <th>OPPONENTS</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        sortedPlayers.forEach((player, index) => {
            html += `
                <tr ${index === 0 && this.tournament.completed ? 'class="winner-row"' : ''}>
                    <td>#${index + 1}</td>
                    <td>${player.name}</td>
                    <td>${player.rating}</td>
                    <td>${player.score}</td>
                    <td>${player.opponents.join(', ') || '—'}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        html += this.getPairingSummary();
        
        document.getElementById('standingsContent').innerHTML = html;
    }

    getPairingSummary() {
        let html = '<h3>ROUND SUMMARY</h3><div class="standings-table-container"><table><thead><tr><th>ROUND</th><th>PAIRINGS</th></tr></thead><tbody>';
        
        this.tournament.pairings.forEach((round, roundIndex) => {
            let pairingsText = round.map(p => {
                if (p.isBye) return `${p.white.name} (BYE)`;
                if (p.completed) {
                    return `${p.white.name} ${p.whiteScore}-${p.blackScore} ${p.black.name}`;
                }
                return `${p.white.name} vs ${p.black.name}`;
            }).join('<br>');
            
            html += `<tr><td>ROUND ${roundIndex + 1}</td><td>${pairingsText}</td></tr>`;
        });
        
        html += '</tbody></table></div>';
        return html;
    }

    hideStandings() {
        document.getElementById('standingsContent').style.display = 'none';
        document.getElementById('tournamentContent').style.display = 'block';
    }

    async saveToFile() {
        if (!this.tournament) {
            alert('NO ACTIVE TOURNAMENT');
            return;
        }
        await TournamentDB.exportToFile(this.tournament.exportData());
    }

    loadFromFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            TournamentDB.importFromFile(file)
                .then(data => {
                    this.restoreTournament(data);
                    alert('TOURNAMENT LOADED SUCCESSFULLY!');
                })
                .catch(error => {
                    alert('ERROR LOADING FILE: ' + error);
                });
        };
        
        input.click();
    }

    exportToExcel() {
        if (!this.tournament) {
            alert('NO TOURNAMENT DATA');
            return;
        }
        
        const sortedPlayers = Utils.sortPlayers(this.tournament.players);
        
        let csvContent = "RANK,PLAYER,RATING,POINTS,OPPONENTS\n";
        
        sortedPlayers.forEach((player, index) => {
            const opponents = player.opponents.join('; ') || 'None';
            csvContent += `${index + 1},"${player.name}",${player.rating},${player.score},"${opponents}"\n`;
        });
        
        csvContent += "\n\nROUND RESULTS\n";
        csvContent += "ROUND,BOARD,WHITE,BLACK,RESULT\n";
        
        this.tournament.pairings.forEach((round, roundIndex) => {
            round.forEach((pairing, boardIndex) => {
                if (pairing.isBye) {
                    csvContent += `${roundIndex + 1},${boardIndex + 1},"${pairing.white.name}",BYE,1-0\n`;
                } else {
                    const result = pairing.completed ? 
                        `${pairing.whiteScore}-${pairing.blackScore}` : 
                        'Pending';
                    csvContent += `${roundIndex + 1},${boardIndex + 1},"${pairing.white.name}","${pairing.black.name}",${result}\n`;
                }
            });
        });
        
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        Utils.downloadBlob(blob, `tournament_${Utils.formatDate()}.csv`);
        
        this.showSubmissionConfirmation({ white: { name: 'EXPORT' }, black: { name: 'COMPLETE' }, whiteScore: 'CSV', blackScore: '' });
    }

    exportToWord() {
        if (!this.tournament) {
            alert('NO TOURNAMENT DATA');
            return;
        }
        
        const sortedPlayers = Utils.sortPlayers(this.tournament.players);
        const winner = this.tournament.getWinner();
        const date = Utils.formatDisplayDate();
        
        let wordContent = `
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Chess Tournament Results</title>
                <style>
                    body { font-family: 'Arial', sans-serif; background: #000; color: #fff; padding: 20px; }
                    h1 { color: #00ff88; text-align: center; }
                    h2 { color: #ffaa00; border-bottom: 2px solid #333; }
                    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                    th { background: #00ff88; color: #000; padding: 12px; }
                    td { padding: 10px; border-bottom: 1px solid #333; color: #ccc; }
                    .winner { background: rgba(0, 255, 136, 0.2); }
                </style>
            </head>
            <body>
                <h1>♞ CHESS TOURNAMENT RESULTS ♞</h1>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Players:</strong> ${this.tournament.getActivePlayers().length}</p>
                <p><strong>Rounds:</strong> ${this.tournament.rounds}</p>
                
                ${this.tournament.completed ? 
                    `<h2>🏆 WINNER: ${winner.name} (${winner.score} POINTS)</h2>` : ''}
                
                <h2>FINAL STANDINGS</h2>
                <table>
                    <tr><th>RANK</th><th>PLAYER</th><th>RATING</th><th>POINTS</th></tr>
                    ${sortedPlayers.map((p, i) => `
                        <tr${i === 0 && this.tournament.completed ? ' class="winner"' : ''}>
                            <td>${i+1}</td>
                            <td>${p.name}</td>
                            <td>${p.rating}</td>
                            <td>${p.score}</td>
                        </tr>
                    `).join('')}
                </table>
            </body>
            </html>
        `;
        
        const blob = new Blob([wordContent], { type: 'application/msword' });
        Utils.downloadBlob(blob, `tournament_${Utils.formatDate()}.doc`);
        
        this.showSubmissionConfirmation({ white: { name: 'EXPORT' }, black: { name: 'COMPLETE' }, whiteScore: 'WORD', blackScore: '' });
    }

    reset() {
        if (confirm('RESET TOURNAMENT? ALL DATA WILL BE LOST.')) {
            if (this.tournament) {
                this.tournament.reset();
            }
            
            document.getElementById('tournamentContent').style.display = 'none';
            document.getElementById('standingsContent').style.display = 'none';
            
            // Clear player fields and add defaults
            document.getElementById('player-fields').innerHTML = '';
            this.addDefaultPlayers();
            
            document.getElementById('rounds').value = '5';
            
            TournamentDB.clearAutoSave();
            
            this.showSubmissionConfirmation({ white: { name: 'RESET' }, black: { name: 'COMPLETE' }, whiteScore: '✓', blackScore: '' });
        }
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.tournamentApp = new TournamentApp();
});