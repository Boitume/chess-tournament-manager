const Utils = {
    parsePlayers: function(input) {
        const lines = input.trim().split('\n');
        return lines.map(line => {
            const [name, rating] = line.split(',').map(s => s.trim());
            return {
                name: name,
                rating: parseInt(rating) || 0,
                score: 0,
                opponents: [],
                colors: [],
                blackWins: 0, // Track wins with black pieces
                sonnebornBerger: 0 // Tie-breaker
            };
        }).filter(p => p.name && !isNaN(p.rating));
    },

    havePlayed: function(player1, player2) {
        return player1.opponents.includes(player2.name) || 
               player2.opponents.includes(player1.name);
    },

    validateScores: function(whiteScore, blackScore) {
        const total = whiteScore + blackScore;
        const validScores = [0, 0.5, 1];
        
        return validScores.includes(whiteScore) && 
               validScores.includes(blackScore) && 
               total === 1;
    },

    // Sort players with tie-breakers
    sortPlayers: function(players) {
        return [...players].filter(p => p.name !== 'BYE').sort((a, b) => {
            // First by score
            if (b.score !== a.score) return b.score - a.score;
            
            // Then by Sonneborn-Berger (sum of opponents' scores they beat)
            if (b.sonnebornBerger !== a.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
            
            // Then by number of black wins
            if (b.blackWins !== a.blackWins) return b.blackWins - a.blackWins;
            
            // Finally by rating
            return b.rating - a.rating;
        });
    },

    // Calculate Sonneborn-Berger tie-breaker
    calculateSonnebornBerger: function(player, allPlayers) {
        let sb = 0;
        player.opponents.forEach(oppName => {
            const opponent = allPlayers.find(p => p.name === oppName);
            if (opponent) {
                // Add opponent's score if player beat them
                const gameIndex = player.opponents.lastIndexOf(oppName);
                const color = player.colors[gameIndex];
                const isWin = (color === 'W' && player.score > opponent.score) || 
                             (color === 'B' && player.score > opponent.score);
                
                if (isWin) {
                    sb += opponent.score;
                }
            }
        });
        return sb;
    },

    formatDate: function() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}_${hours}-${minutes}`;
    },

    formatDisplayDate: function() {
        const date = new Date();
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    generateId: function() {
        return Math.random().toString(36).substr(2, 9);
    },

    downloadBlob: function(blob, filename) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

window.Utils = Utils;