// Main application controller

class TournamentApp {
    constructor() {
        this.tournament = null;
        this.pairingSystem = null;
        this.currentView = 'setup';
        
        // Bind methods
        this.initialize = this.initialize.bind(this);
        this.reset = this.reset.bind(this);
        this.nextRound = this.nextRound.bind(this);
        this.showStandings = this.showStandings.bind(this);
        this.hideStandings = this.hideStandings.bind(this);
        this.submitScores = this.submitScores.bind(this);
        
        // Initialize event listeners
        this.setupEventListeners();
    }

    // Setup global event listeners
    setupEventListeners() {
        // Make methods available globally for onclick handlers
        window.tournamentApp = this;
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
                <h3>Round ${round}</h3>
                <p>${this.getRoundDescription(round)}</p>
            </div>

            <div class="tournament-controls">
                <button id="nextRoundBtn" class="secondary" onclick="tournamentApp.nextRound()" 
                    ${this.tournament.completed ? 'disabled' : ''}>
                    Next Round
                </button>
                <button onclick="tournamentApp.showStandings()">View Standings</button>
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
        
        this.displayRound(this.tournament.currentRound);
    }

    // End tournament
    endTournament() {
        this.tournament.completed = true;
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
            <button onclick="tournamentApp.hideStandings()">Back to Pairings</button>
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
                <tr ${index === 0 ? 'class="winner"' : ''}>
                    <td>${index + 1}</td>
                    <td>${player.name}</td>
                    <td>${player.rating}</td>
                    <td>${player.score}</td>
                    <td>${player.opponents.join(', ') || 'None'}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        
        // Add export button
        html += `
            <button onclick="tournamentApp.exportTournament()" class="secondary">
                Export Results
            </button>
        `;
        
        document.getElementById('standingsContent').innerHTML = html;
    }

    // Hide standings
    hideStandings() {
        document.getElementById('standingsContent').style.display = 'none';
        document.getElementById('tournamentContent').style.display = 'block';
    }

    // Export tournament results
    exportTournament() {
        const data = this.tournament.exportData();
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `tournament-${Utils.formatDate()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    // Reset tournament
    reset() {
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
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TournamentApp();
});