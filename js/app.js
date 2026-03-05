// Main application controller with offline support and export features

class TournamentApp {
    constructor() {
        this.tournament = null;
        this.pairingSystem = null;
        this.currentView = 'setup';
        this.autoSaveInterval = null;
        this.deferredPrompt = null;
        
        // Bind methods
        this.initialize = this.initialize.bind(this);
        this.reset = this.reset.bind(this);
        this.nextRound = this.nextRound.bind(this);
        this.showStandings = this.showStandings.bind(this);
        this.hideStandings = this.hideStandings.bind(this);
        this.submitScores = this.submitScores.bind(this);
        this.saveToFile = this.saveToFile.bind(this);
        this.loadFromFile = this.loadFromFile.bind(this);
        this.exportToExcel = this.exportToExcel.bind(this);
        this.exportToWord = this.exportToWord.bind(this);
        this.exportToHtml = this.exportToHtml.bind(this);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check for auto-saved tournament
        this.checkForAutoSave();
        
        // Start auto-save interval
        this.startAutoSave();
        
        // Setup install prompt
        this.setupInstallPrompt();
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
            <span>📱 Install Chess Tournament Manager for offline use</span>
            <div>
                <button onclick="tournamentApp.installApp()">Install</button>
                <button class="danger" onclick="this.parentElement.parentElement.remove()">Later</button>
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
                const shouldRestore = confirm('Found an unsaved tournament. Would you like to restore it?');
                if (shouldRestore) {
                    this.restoreTournament(saved);
                } else {
                    // Clear auto-save if user doesn't want to restore
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
        }, 30000); // Auto-save every 30 seconds
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
            console.log('Working offline - changes saved locally');
        }
    }

    // Initialize tournament
    initialize() {
        const playersInput = document.getElementById('players').value;
        const roundsInput = parseInt(document.getElementById('rounds').value);
        
        const players = Utils.parsePlayers(playersInput);
        
        if (players.length < 2) {
            alert('Please enter at least 2 valid players');
            return;
        }
        
        // Create new tournament
        this.tournament = new Tournament().initialize(players, roundsInput);
        this.pairingSystem = new PairingSystem(this.tournament);
        
        // Generate first round
        const firstRound = this.pairingSystem.generateFirstRound();
        this.tournament.pairings = [firstRound];
        this.tournament.currentRound = 1;
        
        // Save to IndexedDB
        TournamentDB.saveTournament(this.tournament.exportData());
        
        // Update UI
        this.showTournamentContent();
        this.displayRound(1);
    }

    // Show tournament content
    showTournamentContent() {
        document.getElementById('tournamentContent').style.display = 'block';
        document.getElementById('standingsContent').style.display = 'none';
        document.getElementById('winnerAnnouncement')?.remove();
    }

    // Display current round
    displayRound(round) {
        const content = document.getElementById('tournamentContent');
        
        let html = `
            <div class="round-info">
                <h3>Round ${round} of ${this.tournament.rounds}</h3>
                <p>${this.getRoundDescription(round)}</p>
            </div>

            <div class="tournament-controls">
                <button id="nextRoundBtn" class="secondary" onclick="tournamentApp.nextRound()" 
                    ${this.tournament.completed ? 'disabled' : ''}>
                    Next Round
                </button>
                <button onclick="tournamentApp.showStandings()">View Standings</button>
                <button onclick="tournamentApp.saveToFile()">💾 Save</button>
            </div>

            <div id="pairings"></div>
        `;
        
        content.innerHTML = html;
        this.renderPairings(round);
        
        // Hide next round button if round not complete
        const roundPairings = this.tournament.pairings[round - 1];
        const allCompleted = roundPairings.every(p => p.completed);
        
        if (!allCompleted || round === this.tournament.rounds) {
            document.getElementById('nextRoundBtn').style.display = 'none';
        }
        
        // Show winner if tournament completed
        if (this.tournament.completed) {
            this.showWinner();
        }
    }

    // Get round description
    getRoundDescription(round) {
        if (round === 1) {
            return 'Top rating vs Lowest rating';
        } else {
            return `Players grouped by score: ${round-0.5} point vs ${round-0.5} point`;
        }
    }

    // Render pairings for current round
    renderPairings(round) {
        const pairingsDiv = document.getElementById('pairings');
        const roundPairings = this.tournament.pairings[round - 1];
        
        let html = '<h3>Current Pairings</h3>';
        
        roundPairings.forEach((pairing, index) => {
            if (pairing.completed && pairing.isBye) {
                html += this.renderByePairing(pairing);
            } else if (pairing.completed) {
                html += this.renderCompletedPairing(pairing);
            } else {
                html += this.renderActivePairing(pairing, index);
            }
        });
        
        html += `<p><em>Note: 1 = Win, 0.5 = Draw, 0 = Loss</em></p>`;
        pairingsDiv.innerHTML = html;
    }

    // Render BYE pairing
    renderByePairing(pairing) {
        return `
            <div class="pairing-card">
                <div>
                    <span class="pairing-players">${pairing.white.name} vs BYE</span>
                    <div class="bye-note">BYE - Automatic win (1 point)</div>
                </div>
                <div class="flex">
                    <span>Score: 1 - 0</span>
                </div>
            </div>
        `;
    }

    // Render completed pairing
    renderCompletedPairing(pairing) {
        return `
            <div class="pairing-card">
                <div>
                    <span class="pairing-players">${pairing.white.name} vs ${pairing.black.name}</span>
                </div>
                <div class="flex">
                    <span>Score: ${pairing.whiteScore} - ${pairing.blackScore}</span>
                </div>
            </div>
        `;
    }

    // Render active pairing with score inputs
    renderActivePairing(pairing, index) {
        return `
            <div class="pairing-card">
                <div>
                    <span class="pairing-players">${pairing.white.name} (${pairing.white.rating}) vs ${pairing.black.name} (${pairing.black.rating})</span>
                    <div class="rating-info">Rating diff: ${Math.abs(pairing.white.rating - pairing.black.rating)}</div>
                </div>
                <div class="flex">
                    <input type="number" class="score-input" id="whiteScore_${index}" 
                        min="0" max="1" step="0.5" value="0" placeholder="White">
                    <span>-</span>
                    <input type="number" class="score-input" id="blackScore_${index}" 
                        min="0" max="1" step="0.5" value="0" placeholder="Black">
                    <button class="submit-scores" onclick="tournamentApp.submitScores(${index})">
                        Submit
                    </button>
                </div>
            </div>
        `;
    }

    // Submit scores for a pairing
    submitScores(pairingIndex) {
        const roundPairings = this.tournament.pairings[this.tournament.currentRound - 1];
        const pairing = roundPairings[pairingIndex];
        
        if (pairing.completed) {
            alert('This game has already been completed!');
            return;
        }
        
        const whiteScore = parseFloat(document.getElementById(`whiteScore_${pairingIndex}`).value) || 0;
        const blackScore = parseFloat(document.getElementById(`blackScore_${pairingIndex}`).value) || 0;
        
        if (!Utils.validateScores(whiteScore, blackScore)) {
            alert('Invalid scores! Total must equal 1 point (1-0, 0.5-0.5, or 0-1)');
            return;
        }
        
        // Update pairing
        pairing.whiteScore = whiteScore;
        pairing.blackScore = blackScore;
        pairing.completed = true;
        
        // Update player scores
        this.tournament.updateScores(pairing.white, pairing.black, whiteScore, blackScore);
        
        // Save to IndexedDB
        TournamentDB.saveTournament(this.tournament.exportData());
        
        // Refresh display
        this.displayRound(this.tournament.currentRound);
        
        // Check if round complete and tournament not finished
        const allCompleted = roundPairings.every(p => p.completed);
        if (allCompleted && this.tournament.currentRound < this.tournament.rounds) {
            document.getElementById('nextRoundBtn').style.display = 'inline-block';
        } else if (allCompleted && this.tournament.currentRound === this.tournament.rounds) {
            this.endTournament();
        }
    }

    // Move to next round
    nextRound() {
        if (this.tournament.currentRound >= this.tournament.rounds) {
            this.endTournament();
            return;
        }
        
        // Generate next round pairings
        const nextRoundPairings = this.pairingSystem.generateNextRound();
        this.tournament.pairings.push(nextRoundPairings);
        this.tournament.currentRound++;
        
        // Save to IndexedDB
        TournamentDB.saveTournament(this.tournament.exportData());
        
        this.displayRound(this.tournament.currentRound);
    }

    // End tournament
    endTournament() {
        this.tournament.completed = true;
        
        // Save to IndexedDB
        TournamentDB.saveTournament(this.tournament.exportData());
        
        this.showWinner();
        this.showStandings();
    }

    // Show tournament winner
    showWinner() {
        const winner = this.tournament.getWinner();
        
        const winnerDiv = document.createElement('div');
        winnerDiv.id = 'winnerAnnouncement';
        winnerDiv.className = 'winner';
        winnerDiv.innerHTML = `
            <h2>🏆 Tournament Winner 🏆</h2>
            <p id="winnerName">${winner.name} with ${winner.score} points!</p>
        `;
        
        document.getElementById('tournamentContent').appendChild(winnerDiv);
    }

    // Show standings
    showStandings() {
        document.getElementById('tournamentContent').style.display = 'none';
        document.getElementById('standingsContent').style.display = 'block';
        
        const sortedPlayers = Utils.sortPlayers(this.tournament.players);
        
        let html = `
            <h2>Tournament Standings</h2>
            <div class="button-group">
                <button onclick="tournamentApp.hideStandings()">← Back to Pairings</button>
                <button onclick="tournamentApp.exportToExcel()" class="secondary">📊 Export to Excel</button>
                <button onclick="tournamentApp.exportToWord()" class="secondary">📝 Export to Word</button>
                <button onclick="tournamentApp.exportToHtml()" class="secondary">🌐 Export to HTML</button>
                <button onclick="tournamentApp.saveToFile()" class="secondary">💾 Save JSON</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Rating</th>
                        <th>Points</th>
                        <th>Opponents</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        sortedPlayers.forEach((player, index) => {
            html += `
                <tr ${index === 0 && this.tournament.completed ? 'class="winner"' : ''}>
                    <td>${index + 1}</td>
                    <td>${player.name}</td>
                    <td>${player.rating}</td>
                    <td>${player.score}</td>
                    <td>${player.opponents.join(', ') || 'None'}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        
        // Add pairing summary
        html += this.getPairingSummary();
        
        document.getElementById('standingsContent').innerHTML = html;
    }

    // Get pairing summary HTML
    getPairingSummary() {
        let html = '<h3>Round Summary</h3><table><thead><tr><th>Round</th><th>Pairings</th></tr></thead><tbody>';
        
        this.tournament.pairings.forEach((round, roundIndex) => {
            let pairingsText = round.map(p => {
                if (p.isBye) return `${p.white.name} (BYE)`;
                if (p.completed) {
                    return `${p.white.name} ${p.whiteScore}-${p.blackScore} ${p.black.name}`;
                }
                return `${p.white.name} vs ${p.black.name} (Pending)`;
            }).join('<br>');
            
            html += `<tr><td>Round ${roundIndex + 1}</td><td>${pairingsText}</td></tr>`;
        });
        
        html += '</tbody></table>';
        return html;
    }

    // Hide standings
    hideStandings() {
        document.getElementById('standingsContent').style.display = 'none';
        document.getElementById('tournamentContent').style.display = 'block';
    }

    // Save to file
    async saveToFile() {
        if (!this.tournament) {
            alert('No active tournament to save');
            return;
        }
        await TournamentDB.exportToFile(this.tournament.exportData());
    }

    // Load from file
    loadFromFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            TournamentDB.importFromFile(file)
                .then(data => {
                    this.restoreTournament(data);
                })
                .catch(error => {
                    alert('Error loading file: ' + error);
                });
        };
        
        input.click();
    }

    // Export to Excel (CSV format)
    exportToExcel() {
        if (!this.tournament) {
            alert('No tournament data to export');
            return;
        }
        
        const sortedPlayers = Utils.sortPlayers(this.tournament.players);
        
        // Create CSV content
        let csvContent = "Rank,Player,Rating,Points,Opponents\n";
        
        sortedPlayers.forEach((player, index) => {
            const opponents = player.opponents.join('; ') || 'None';
            csvContent += `${index + 1},"${player.name}",${player.rating},${player.score},"${opponents}"\n`;
        });
        
        // Add round results
        csvContent += "\n\nRound Results\n";
        csvContent += "Round,Board,White Player,Black Player,Result\n";
        
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
        
        // Add tournament info
        csvContent += "\n\nTournament Information\n";
        csvContent += `Date,${Utils.formatDisplayDate()}\n`;
        csvContent += `Total Players,${this.tournament.getActivePlayers().length}\n`;
        csvContent += `Total Rounds,${this.tournament.rounds}\n`;
        csvContent += `Completed,${this.tournament.completed ? 'Yes' : 'No'}\n`;
        
        if (this.tournament.completed) {
            const winner = this.tournament.getWinner();
            csvContent += `Winner,${winner.name},${winner.score} points\n`;
        }
        
        // Create blob and download
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        Utils.downloadBlob(blob, `tournament_results_${Utils.formatDate()}.csv`);
    }

    // Export to Word
    exportToWord() {
        if (!this.tournament) {
            alert('No tournament data to export');
            return;
        }
        
        const sortedPlayers = Utils.sortPlayers(this.tournament.players);
        const winner = this.tournament.getWinner();
        const date = Utils.formatDisplayDate();
        
        // Create HTML content for Word
        let wordContent = `
            <html xmlns:v="urn:schemas-microsoft-com:vml"
                  xmlns:o="urn:schemas-microsoft-com:office:office"
                  xmlns:w="urn:schemas-microsoft-com:office:word"
                  xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
                  xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <title>Chess Tournament Results</title>
                <style>
                    body { font-family: 'Arial', sans-serif; margin: 40px; }
                    h1 { color: #667eea; text-align: center; font-size: 28px; }
                    h2 { color: #555; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-top: 30px; }
                    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                    th { background: #667eea; color: white; padding: 12px; text-align: left; }
                    td { padding: 10px; border-bottom: 1px solid #ddd; }
                    .winner { background: #c6f6d5; font-weight: bold; }
                    .header-info { text-align: center; margin: 20px 0; color: #666; font-size: 14px; }
                    .champion { text-align: center; font-size: 24px; margin: 30px 0; }
                    .champion span { background: #ffd700; padding: 10px 30px; border-radius: 50px; }
                    .round-results { margin-top: 30px; }
                    .bye { color: #999; font-style: italic; }
                    .footer { margin-top: 50px; text-align: center; color: #999; font-size: 12px; }
                </style>
            </head>
            <body>
                <h1>♞ Chess Tournament Results ♞</h1>
                <div class="header-info">
                    <p><strong>Date:</strong> ${date}</p>
                    <p><strong>Tournament ID:</strong> ${this.tournament.tournamentId}</p>
                    <p><strong>Total Players:</strong> ${this.tournament.getActivePlayers().length}</p>
                    <p><strong>Number of Rounds:</strong> ${this.tournament.rounds}</p>
                </div>
        `;
        
        // Champion section
        if (this.tournament.completed) {
            wordContent += `
                <div class="champion">
                    <span>🏆 Champion: ${winner.name} (${winner.score} points) 🏆</span>
                </div>
            `;
        }
        
        // Final Standings
        wordContent += `
            <h2>Final Standings</h2>
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Rating</th>
                        <th>Points</th>
                        <th>Opponents</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        sortedPlayers.forEach((player, index) => {
            wordContent += `
                <tr${index === 0 && this.tournament.completed ? ' class="winner"' : ''}>
                    <td>${index + 1}</td>
                    <td>${player.name}</td>
                    <td>${player.rating}</td>
                    <td>${player.score}</td>
                    <td>${player.opponents.join(', ') || 'None'}</td>
                </tr>
            `;
        });
        
        wordContent += `
                </tbody>
            </table>
            
            <h2>Round by Round Results</h2>
        `;
        
        // Round by round results
        this.tournament.pairings.forEach((round, roundIndex) => {
            wordContent += `
                <div class="round-results">
                    <h3>Round ${roundIndex + 1}</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Board</th>
                                <th>White Player</th>
                                <th>Black Player</th>
                                <th>Result</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            round.forEach((pairing, boardIndex) => {
                if (pairing.isBye) {
                    wordContent += `
                        <tr>
                            <td>${boardIndex + 1}</td>
                            <td>${pairing.white.name}</td>
                            <td class="bye">BYE</td>
                            <td>1 - 0</td>
                        </tr>
                    `;
                } else {
                    const result = pairing.completed ? 
                        `${pairing.whiteScore} - ${pairing.blackScore}` : 
                        'Pending';
                    wordContent += `
                        <tr>
                            <td>${boardIndex + 1}</td>
                            <td>${pairing.white.name} (${pairing.white.rating})</td>
                            <td>${pairing.black.name} (${pairing.black.rating})</td>
                            <td>${result}</td>
                        </tr>
                    `;
                }
            });
            
            wordContent += `
                        </tbody>
                    </table>
                </div>
            `;
        });
        
        // Tournament Statistics
        wordContent += `
            <h2>Tournament Statistics</h2>
            <table>
                <tr><td><strong>Total Players:</strong></td><td>${this.tournament.getActivePlayers().length}</td></tr>
                <tr><td><strong>Total Rounds:</strong></td><td>${this.tournament.rounds}</td></tr>
                <tr><td><strong>Completed Rounds:</strong></td><td>${this.tournament.currentRound}</td></tr>
                <tr><td><strong>Tournament Completed:</strong></td><td>${this.tournament.completed ? 'Yes' : 'No'}</td></tr>
                <tr><td><strong>Highest Rating:</strong></td><td>${Math.max(...this.tournament.players.map(p => p.rating))}</td></tr>
                <tr><td><strong>Lowest Rating:</strong></td><td>${Math.min(...this.tournament.players.filter(p => p.name !== 'BYE').map(p => p.rating))}</td></tr>
                <tr><td><strong>Average Rating:</strong></td><td>${Math.round(this.tournament.players.reduce((sum, p) => sum + p.rating, 0) / this.tournament.getActivePlayers().length)}</td></tr>
            </table>
            
            <div class="footer">
                <p>Generated by Chess Tournament Manager on ${date}</p>
            </div>
            
            </body>
            </html>
        `;
        
        // Create blob and download as .doc
        const blob = new Blob([wordContent], { type: 'application/msword' });
        Utils.downloadBlob(blob, `tournament_results_${Utils.formatDate()}.doc`);
    }

    // Export to HTML
    exportToHtml() {
        if (!this.tournament) return;
        
        const sortedPlayers = Utils.sortPlayers(this.tournament.players);
        const winner = this.tournament.getWinner();
        
        const htmlWindow = window.open('', '_blank');
        htmlWindow.document.write(`
            <html>
            <head>
                <title>Tournament Results</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; max-width: 1200px; margin: 0 auto; }
                    h1 { color: #667eea; text-align: center; }
                    h2 { color: #555; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
                    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                    th { background: #667eea; color: white; padding: 10px; text-align: left; }
                    td { padding: 8px; border-bottom: 1px solid #ddd; }
                    .winner { background: #c6f6d5; font-weight: bold; }
                    .info { text-align: center; margin: 20px 0; color: #666; }
                    .champion { text-align: center; font-size: 24px; margin: 30px 0; }
                    .footer { margin-top: 50px; text-align: center; color: #999; }
                </style>
            </head>
            <body>
                <h1>♞ Chess Tournament Results</h1>
                <div class="info">
                    <p>Date: ${Utils.formatDisplayDate()}</p>
                    <p>Total Players: ${this.tournament.getActivePlayers().length}</p>
                    <p>Rounds: ${this.tournament.rounds}</p>
                </div>
                
                ${this.tournament.completed ? 
                    `<div class="champion">🏆 Winner: ${winner.name} (${winner.score} points) 🏆</div>` : ''}
                
                <h2>Final Standings</h2>
                <table>
                    <tr><th>Rank</th><th>Player</th><th>Rating</th><th>Points</th></tr>
                    ${sortedPlayers.map((p, i) => `
                        <tr${i === 0 && this.tournament.completed ? ' class="winner"' : ''}>
                            <td>${i+1}</td>
                            <td>${p.name}</td>
                            <td>${p.rating}</td>
                            <td>${p.score}</td>
                        </tr>
                    `).join('')}
                </table>
                
                <p><i>Click File → Save As to save this page, or copy-paste into Word/Excel</i></p>
            </body>
            </html>
        `);
    }

    // Reset tournament
    reset() {
        if (confirm('Are you sure you want to reset? Any unsaved changes will be lost.')) {
            if (this.tournament) {
                this.tournament.reset();
            }
            
            document.getElementById('tournamentContent').style.display = 'none';
            document.getElementById('standingsContent').style.display = 'none';
            document.getElementById('players').value = `John Doe, 1850
Jane Smith, 1720
Bob Johnson, 1680
Alice Brown, 1550
Mike Wilson, 1420
Sarah Lee, 1380`;
            document.getElementById('rounds').value = '5';
            
            // Clear auto-save
            TournamentDB.clearAutoSave();
        }
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.tournamentApp = new TournamentApp();
});