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
        // Create deep copies of players to avoid reference issues
        this.players = playersData.map(p => ({
            name: p.name,
            rating: p.rating,
            score: 0,
            opponents: [],
            colors: [],
            id: Utils.generateId() // Add unique ID for database
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
        }
        
        if (blackIndex !== -1) {
            this.players[blackIndex].score += blackScore;
            this.players[blackIndex].opponents.push(whitePlayer.name);
            this.players[blackIndex].colors.push('B');
        }
    }

    // Get tournament winner
    getWinner() {
        const sortedPlayers = Utils.sortPlayers(this.players);
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