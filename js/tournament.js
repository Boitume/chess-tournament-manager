// Tournament class to manage tournament state

class Tournament {
    constructor() {
        this.players = [];
        this.rounds = 5;
        this.currentRound = 0;
        this.pairings = [];
        this.completed = false;
        this.tournamentId = Utils.generateId();
        this.startDate = null;
        this.tournamentName = '';
    }

    // Initialize tournament with players and rounds
    initialize(playersData, numberOfRounds, name = '') {
        // Create deep copies of players with tie-breaker tracking
        this.players = playersData.map(p => ({
            name: p.name,
            rating: p.rating,
            score: 0,
            opponents: [],
            colors: [],
            blackWins: 0,
            sonnebornBerger: 0,
            id: Utils.generateId()
        }));
        
        this.rounds = numberOfRounds;
        this.currentRound = 0;
        this.pairings = [];
        this.completed = false;
        this.startDate = new Date().toISOString();
        this.tournamentName = name || `Tournament ${Utils.formatDate()}`;
        
        // Add BYE if odd number of players
        if (this.players.length % 2 !== 0) {
            this.players.push({ 
                name: 'BYE', 
                rating: 0, 
                score: 0, 
                opponents: [], 
                colors: [],
                blackWins: 0,
                sonnebornBerger: 0,
                id: 'BYE'
            });
        }
        
        // Sort players by rating for first round
        this.players.sort((a, b) => b.rating - a.rating);
        
        return this;
    }

    // Get active players (excluding BYE)
    getActivePlayers() {
        return this.players.filter(p => p.name !== 'BYE');
    }

    // Update player scores after a game
    updateScores(whitePlayer, blackPlayer, whiteScore, blackScore) {
        // Find the actual player objects in the array
        const whiteIndex = this.players.findIndex(p => p.name === whitePlayer.name);
        const blackIndex = this.players.findIndex(p => p.name === blackPlayer.name);
        
        if (whiteIndex !== -1) {
            this.players[whiteIndex].score += whiteScore;
            this.players[whiteIndex].opponents.push(blackPlayer.name);
            this.players[whiteIndex].colors.push('W');
            
            // Track black wins for tie-breaker
            if (whiteScore === 1) {
                // White win (not black)
            }
        }
        
        if (blackIndex !== -1) {
            this.players[blackIndex].score += blackScore;
            this.players[blackIndex].opponents.push(whitePlayer.name);
            this.players[blackIndex].colors.push('B');
            
            // Track black wins for tie-breaker
            if (blackScore === 1) {
                this.players[blackIndex].blackWins++;
            }
        }
        
        // Recalculate Sonneborn-Berger for all players
        this.calculateSonnebornBerger();
    }

    // Calculate Sonneborn-Berger tie-breaker for all players
    calculateSonnebornBerger() {
        this.players.forEach(player => {
            if (player.name === 'BYE') return;
            
            let sb = 0;
            player.opponents.forEach((oppName, index) => {
                const opponent = this.players.find(p => p.name === oppName);
                if (opponent) {
                    const color = player.colors[index];
                    const gameScore = color === 'W' ? 
                        this.getGameScore(player.name, oppName) : 
                        this.getGameScore(oppName, player.name);
                    
                    // Sonneborn-Berger: sum of opponents' scores that player beat
                    if (gameScore === 1) {
                        sb += opponent.score;
                    }
                    // Add half for draws
                    if (gameScore === 0.5) {
                        sb += opponent.score * 0.5;
                    }
                }
            });
            player.sonnebornBerger = sb;
        });
    }

    // Helper to get game score between two players
    getGameScore(player1Name, player2Name) {
        for (const round of this.pairings) {
            for (const pairing of round) {
                if (pairing.white.name === player1Name && pairing.black.name === player2Name) {
                    return pairing.whiteScore;
                }
                if (pairing.white.name === player2Name && pairing.black.name === player1Name) {
                    return pairing.blackScore;
                }
            }
        }
        return 0;
    }

    // Get tournament winner with tie-breakers
    getWinner() {
        const sortedPlayers = Utils.sortPlayers(this.players);
        
        // Log tie-breaker info for debugging
        if (sortedPlayers.length > 1 && sortedPlayers[0].score === sortedPlayers[1].score) {
            console.log('Tie-breaker used:', {
                player1: {
                    name: sortedPlayers[0].name,
                    score: sortedPlayers[0].score,
                    sb: sortedPlayers[0].sonnebornBerger,
                    blackWins: sortedPlayers[0].blackWins
                },
                player2: {
                    name: sortedPlayers[1].name,
                    score: sortedPlayers[1].score,
                    sb: sortedPlayers[1].sonnebornBerger,
                    blackWins: sortedPlayers[1].blackWins
                }
            });
        }
        
        return sortedPlayers[0] || { name: 'No winner', score: 0 };
    }

    // Get tournament summary
    getSummary() {
        return {
            tournamentId: this.tournamentId,
            tournamentName: this.tournamentName,
            startDate: this.startDate,
            rounds: this.rounds,
            currentRound: this.currentRound,
            totalPlayers: this.getActivePlayers().length,
            completed: this.completed,
            winner: this.completed ? this.getWinner() : null
        };
    }

    // Export tournament data
    exportData() {
        // Recalculate tie-breakers before export
        this.calculateSonnebornBerger();
        
        return {
            tournamentId: this.tournamentId,
            tournamentName: this.tournamentName,
            startDate: this.startDate,
            rounds: this.rounds,
            currentRound: this.currentRound,
            players: this.players,
            pairings: this.pairings,
            completed: this.completed
        };
    }

    // Reset tournament
    reset() {
        this.players = [];
        this.rounds = 5;
        this.currentRound = 0;
        this.pairings = [];
        this.completed = false;
        this.tournamentId = Utils.generateId();
        this.startDate = null;
        this.tournamentName = '';
    }
}

// Make Tournament available globally
window.Tournament = Tournament;