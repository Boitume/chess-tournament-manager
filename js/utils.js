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
                colors: []
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

    sortPlayers: function(players) {
        return [...players].filter(p => p.name !== 'BYE').sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.rating - a.rating;
        });
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