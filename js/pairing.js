// Pairing generation logic for Swiss system tournament

class PairingSystem {
    constructor(tournament) {
        this.tournament = tournament;
    }

    // Generate first round pairings (top vs bottom)
    generateFirstRound() {
        const activePlayers = this.tournament.getActivePlayers();
        const pairings = [];
        
        for (let i = 0; i < activePlayers.length / 2; i++) {
            const white = activePlayers[i];
            const black = activePlayers[activePlayers.length - 1 - i];
            
            pairings.push({
                white: white,
                black: black,
                whiteScore: 0,
                blackScore: 0,
                completed: false,
                boardNumber: i + 1,
                isBye: false
            });
        }
        
        return pairings;
    }

    // Generate pairings for subsequent rounds
    generateNextRound() {
        // Group players by score
        const scoreGroups = this.groupByScore();
        const pairings = [];
        const used = new Set();
        
        // Sort scores in descending order
        const scores = Object.keys(scoreGroups).sort((a, b) => parseFloat(b) - parseFloat(a));
        
        for (let score of scores) {
            const group = scoreGroups[score].filter(p => !used.has(p.name));
            
            // Sort by rating within group
            group.sort((a, b) => b.rating - a.rating);
            
            this.pairGroup(group, pairings, used, scores, scoreGroups, parseFloat(score));
        }
        
        return pairings;
    }

    // Group players by their current score
    groupByScore() {
        const groups = {};
        this.tournament.players.forEach(p => {
            if (p.name === 'BYE') return;
            if (!groups[p.score]) {
                groups[p.score] = [];
            }
            groups[p.score].push(p);
        });
        return groups;
    }

    // Pair players within a score group
    pairGroup(group, pairings, used, scores, scoreGroups, currentScore) {
        for (let i = 0; i < group.length - 1; i += 2) {
            if (i + 1 < group.length) {
                this.tryPairPlayers(group[i], group[i + 1], pairings, used, group, i);
            }
        }
        
        // Handle odd player out
        this.handleOddPlayer(group, pairings, used, scores, scoreGroups, currentScore);
    }

    // Try to pair two players
    tryPairPlayers(player1, player2, pairings, used, group, index) {
        if (!Utils.havePlayed(player1, player2)) {
            this.createPairing(player1, player2, pairings, used);
        } else {
            this.findAlternativeOpponent(player1, group, index, pairings, used);
        }
    }

    // Find alternative opponent for player
    findAlternativeOpponent(player, group, startIndex, pairings, used) {
        for (let j = startIndex + 2; j < group.length; j++) {
            if (!Utils.havePlayed(player, group[j]) && !used.has(group[j].name)) {
                this.createPairing(player, group[j], pairings, used);
                group.splice(j, 1);
                return;
            }
        }
        // If no alternative, will be handled as odd player
    }

    // Create a new pairing
    createPairing(white, black, pairings, used) {
        pairings.push({
            white: white,
            black: black,
            whiteScore: 0,
            blackScore: 0,
            completed: false,
            boardNumber: pairings.length + 1,
            isBye: false
        });
        used.add(white.name);
        used.add(black.name);
    }

    // Handle player without opponent (give BYE)
    handleOddPlayer(group, pairings, used, scores, scoreGroups, currentScore) {
        const unpaired = group.find(p => !used.has(p.name));
        if (unpaired) {
            let paired = false;
            
            // Try to pair with next score group
            for (let nextScore of scores) {
                if (parseFloat(nextScore) < currentScore) {
                    const nextGroup = scoreGroups[nextScore].filter(p => !used.has(p.name));
                    if (nextGroup.length > 0) {
                        this.createPairing(unpaired, nextGroup[0], pairings, used);
                        paired = true;
                        break;
                    }
                }
            }
            
            // Give BYE if no opponent found
            if (!paired) {
                pairings.push({
                    white: unpaired,
                    black: null,
                    whiteScore: 1,
                    blackScore: 0,
                    completed: true,
                    boardNumber: pairings.length + 1,
                    isBye: true
                });
                used.add(unpaired.name);
                
                // Award point for BYE
                unpaired.score += 1;
            }
        }
    }

    // Get pairing statistics
    getPairingStats() {
        return {
            totalPairings: this.tournament.pairings.reduce((sum, round) => sum + round.length, 0),
            completedPairings: this.tournament.pairings.reduce((sum, round) => 
                sum + round.filter(p => p.completed).length, 0),
            byeCount: this.tournament.pairings.reduce((sum, round) => 
                sum + round.filter(p => p.isBye).length, 0)
        };
    }
}

window.PairingSystem = PairingSystem;