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

    // Format date for filenames
    formatDate: function() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}_${hours}-${minutes}`;
    },

    // Format date for display
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

    // Generate unique ID
    generateId: function() {
        return Math.random().toString(36).substr(2, 9);
    },

    // Download blob as file
    downloadBlob: function(blob, filename) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    // Show loading spinner
    showSpinner: function(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            spinner.id = 'spinner';
            container.appendChild(spinner);
        }
    },

    // Hide loading spinner
    hideSpinner: function() {
        const spinner = document.getElementById('spinner');
        if (spinner) {
            spinner.remove();
        }
    }
};

// Export for use in other files
window.Utils = Utils;