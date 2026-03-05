// Utility functions for the chess tournament manager

const Utils = {
    // Parse player input from textarea
    parsePlayers: function(input) {
        const lines = input.trim().split('\n');
        return lines.map(line => {
            const [name, rating] = line.split(',').map(s => s.trim());
            return {
                name: name,
                rating: parseInt(rating) || 0,
                score: 0,
                opponents: [],
                colors: [] // 'W' or 'B'
            };
        }).filter(p => p.name && p.rating > 0);
    },

    // Check if two players have played before
    havePlayed: function(player1, player2) {
        return player1.opponents.includes(player2.name) || 
               player2.opponents.includes(player1.name);
    },

    // Validate score input
    validateScores: function(whiteScore, blackScore) {
        const total = whiteScore + blackScore;
        const validScores = [0, 0.5, 1];
        
        return validScores.includes(whiteScore) && 
               validScores.includes(blackScore) && 
               total === 1;
    },

    // Sort players by score and rating
    sortPlayers: function(players) {
        return [...players].filter(p => p.name !== 'BYE').sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.rating - a.rating;
        });
    },

    // Format date for tournament export
    formatDate: function() {
        const date = new Date();
        return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
    },

    // Generate unique ID
    generateId: function() {
        return Math.random().toString(36).substr(2, 9);
    }
};

// Export for use in other files
window.Utils = Utils;