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
    }

    // Initialize tournament with players and rounds
    initialize(playersData, numberOfRounds) {
        this.players = playersData;
        this.rounds = numberOfRounds;
        this.currentRound = 0;
        this.pairings = [];
        this.completed = false;
        this.startDate = new Date();
        
        // Add BYE if odd number of players
        if (this.players.length % 2 !== 0) {
            this.players.push({ 
                name: 'BYE', 
                rating: 0, 
                score: 0, 
                opponents: [], 
                colors: [] 
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
        whitePlayer.score += whiteScore;
        blackPlayer.score += blackScore;
        whitePlayer.opponents.push(blackPlayer.name);
        blackPlayer.opponents.push(whitePlayer.name);
        whitePlayer.colors.push('W');
        blackPlayer.colors.push('B');
    }

    // Get tournament winner
    getWinner() {
        const sortedPlayers = Utils.sortPlayers(this.players);
        return sortedPlayers[0];
    }

    // Export tournament data
    exportData() {
        return {
            tournamentId: this.tournamentId,
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
    }
}

// Make Tournament available globally
window.Tournament = Tournament;