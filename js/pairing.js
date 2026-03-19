// Swiss System Pairing with strict no-repeat and color balance

class PairingSystem {
    constructor(tournament) {
        this.tournament = tournament;
    }

    // Generate first round pairings (top vs bottom)
    generateFirstRound() {
        const activePlayers = this.tournament.getActivePlayers();
        const pairings = [];
        
        // Sort by rating descending
        const sortedPlayers = [...activePlayers].sort((a, b) => b.rating - a.rating);
        
        // Standard Swiss: top half vs bottom half (1 vs n/2+1, 2 vs n/2+2, etc.)
        const half = Math.floor(sortedPlayers.length / 2);
        
        for (let i = 0; i < half; i++) {
            const white = sortedPlayers[i];
            const black = sortedPlayers[i + half];
            
            // Randomly decide who gets white (alternate for balance)
            if (Math.random() > 0.5) {
                pairings.push({
                    white: white,
                    black: black,
                    whiteScore: 0,
                    blackScore: 0,
                    completed: false,
                    boardNumber: i + 1,
                    isBye: false
                });
            } else {
                pairings.push({
                    white: black,
                    black: white,
                    whiteScore: 0,
                    blackScore: 0,
                    completed: false,
                    boardNumber: i + 1,
                    isBye: false
                });
            }
        }
        
        // Handle odd number of players (give bye to lowest rated)
        if (sortedPlayers.length % 2 !== 0) {
            const lowestRated = sortedPlayers[sortedPlayers.length - 1];
            pairings.push({
                white: lowestRated,
                black: null,
                whiteScore: 1,
                blackScore: 0,
                completed: true,
                boardNumber: half + 1,
                isBye: true
            });
            // Award point for bye
            lowestRated.score += 1;
        }
        
        return pairings;
    }

    // Generate pairings for subsequent rounds
    generateNextRound() {
        // Group players by score
        const scoreGroups = this.groupByScore();
        const pairings = [];
        const used = new Set(); // Track used players
        const pairedThisRound = new Set(); // Track pairings this round
        
        // Sort scores in descending order
        const scores = Object.keys(scoreGroups)
            .map(s => parseFloat(s))
            .sort((a, b) => b - a);
        
        // Process each score group from highest to lowest
        for (let score of scores) {
            // Get unpaired players in this score group
            let group = scoreGroups[score].filter(p => !used.has(p.name));
            
            // Sort group by rating (highest first) and color balance
            group = this.sortGroupByColorBalance(group);
            
            // Pair within the group as much as possible
            this.pairGroup(group, pairings, used, pairedThisRound, score);
        }
        
        // Handle any remaining unpaired players (should be very few)
        const unpaired = this.tournament.players.filter(p => 
            p.name !== 'BYE' && !used.has(p.name)
        );
        
        if (unpaired.length > 0) {
            console.log('Unpaired players left:', unpaired.map(p => p.name));
            this.pairRemainingPlayers(unpaired, pairings, used);
        }
        
        return pairings;
    }

    // Group players by their current score
    groupByScore() {
        const groups = {};
        this.tournament.players.forEach(p => {
            if (p.name === 'BYE') return;
            const score = p.score;
            if (!groups[score]) {
                groups[score] = [];
            }
            groups[score].push(p);
        });
        return groups;
    }

    // Sort group by rating and color balance
    sortGroupByColorBalance(group) {
        return [...group].sort((a, b) => {
            // First by rating
            if (b.rating !== a.rating) return b.rating - a.rating;
            
            // Then by color balance (players with more whites go later)
            const whiteCountA = a.colors.filter(c => c === 'W').length;
            const whiteCountB = b.colors.filter(c => c === 'W').length;
            const balanceA = whiteCountA - (a.colors.length - whiteCountA);
            const balanceB = whiteCountB - (b.colors.length - whiteCountB);
            
            return balanceA - balanceB;
        });
    }

    // Pair players within a score group
    pairGroup(group, pairings, used, pairedThisRound, score) {
        let i = 0;
        
        while (i < group.length - 1) {
            const player1 = group[i];
            
            // Find best opponent for player1
            let bestOpponentIndex = -1;
            let bestColorBalance = Infinity;
            
            for (let j = i + 1; j < group.length; j++) {
                const player2 = group[j];
                
                // Skip if already used
                if (used.has(player2.name)) continue;
                
                // Check if they've played before
                if (Utils.havePlayed(player1, player2)) continue;
                
                // Check color balance
                const colorBalance = this.getColorBalanceScore(player1, player2);
                
                // Better balance is better
                if (colorBalance < bestColorBalance) {
                    bestColorBalance = colorBalance;
                    bestOpponentIndex = j;
                }
            }
            
            // If we found a suitable opponent
            if (bestOpponentIndex !== -1) {
                const player2 = group[bestOpponentIndex];
                
                // Determine colors
                const { white, black } = this.determineColors(player1, player2);
                
                pairings.push({
                    white: white,
                    black: black,
                    whiteScore: 0,
                    blackScore: 0,
                    completed: false,
                    boardNumber: pairings.length + 1,
                    isBye: false
                });
                
                used.add(player1.name);
                used.add(player2.name);
                
                // Remove both players from group
                group.splice(bestOpponentIndex, 1);
                group.splice(i, 1);
                // Don't increment i because we removed the current element
            } else {
                // No suitable opponent in this group, move to next player
                i++;
            }
        }
        
        // Handle remaining unpaired players in this group
        const remaining = group.filter(p => !used.has(p.name));
        if (remaining.length > 0) {
            this.handleRemainingPlayers(remaining, pairings, used, score);
        }
    }

    // Determine colors with balance
    determineColors(player1, player2) {
        const whiteCount1 = player1.colors.filter(c => c === 'W').length;
        const whiteCount2 = player2.colors.filter(c => c === 'W').length;
        const blackCount1 = player1.colors.length - whiteCount1;
        const blackCount2 = player2.colors.length - whiteCount2;
        
        const balance1 = whiteCount1 - blackCount1;
        const balance2 = whiteCount2 - blackCount2;
        
        // Player with fewer whites should get white
        if (balance1 < balance2) {
            return { white: player1, black: player2 };
        } else if (balance2 < balance1) {
            return { white: player2, black: player1 };
        } else {
            // Equal balance, check last color
            const lastColor1 = player1.colors[player1.colors.length - 1];
            const lastColor2 = player2.colors[player2.colors.length - 1];
            
            // Alternate based on last color
            if (lastColor1 === 'W' && lastColor2 !== 'W') {
                return { white: player2, black: player1 };
            } else if (lastColor2 === 'W' && lastColor1 !== 'W') {
                return { white: player1, black: player2 };
            } else {
                // Random if both same last color
                return Math.random() > 0.5 ? 
                    { white: player1, black: player2 } : 
                    { white: player2, black: player1 };
            }
        }
    }

    // Calculate color balance score (lower is better)
    getColorBalanceScore(player1, player2) {
        const whiteCount1 = player1.colors.filter(c => c === 'W').length;
        const whiteCount2 = player2.colors.filter(c => c === 'W').length;
        const total1 = player1.colors.length;
        const total2 = player2.colors.length;
        
        const balance1 = Math.abs(whiteCount1 - (total1 - whiteCount1));
        const balance2 = Math.abs(whiteCount2 - (total2 - whiteCount2));
        
        // If they play, what would their new balances be?
        const newBalance1 = Math.abs((whiteCount1 + 1) - (total1 + 1 - (whiteCount1 + 1)));
        const newBalance2 = Math.abs((whiteCount2 + 1) - (total2 + 1 - (whiteCount2 + 1)));
        
        return (balance1 + balance2 + newBalance1 + newBalance2) / 4;
    }

    // Handle remaining players after main pairing
    handleRemainingPlayers(remaining, pairings, used, score) {
        if (remaining.length === 0) return;
        
        // Try to pair with next lower score group
        const lowerScoreGroups = Object.keys(this.groupByScore())
            .map(s => parseFloat(s))
            .filter(s => s < score)
            .sort((a, b) => b - a);
        
        for (const lowerScore of lowerScoreGroups) {
            const lowerGroup = this.groupByScore()[lowerScore]
                .filter(p => !used.has(p.name) && p.name !== 'BYE');
            
            if (lowerGroup.length === 0) continue;
            
            // Sort lower group by rating
            lowerGroup.sort((a, b) => b.rating - a.rating);
            
            // Pair remaining players with lower group
            while (remaining.length > 0 && lowerGroup.length > 0) {
                const player1 = remaining[0];
                const player2 = lowerGroup[0];
                
                // Check if they've played before
                if (!Utils.havePlayed(player1, player2)) {
                    const { white, black } = this.determineColors(player1, player2);
                    
                    pairings.push({
                        white: white,
                        black: black,
                        whiteScore: 0,
                        blackScore: 0,
                        completed: false,
                        boardNumber: pairings.length + 1,
                        isBye: false
                    });
                    
                    used.add(player1.name);
                    used.add(player2.name);
                    
                    remaining.shift();
                    lowerGroup.shift();
                } else {
                    // Try next player in lower group
                    lowerGroup.shift();
                }
            }
            
            if (remaining.length === 0) break;
        }
        
        // If still remaining, give bye
        remaining.forEach(player => {
            if (!used.has(player.name)) {
                pairings.push({
                    white: player,
                    black: null,
                    whiteScore: 1,
                    blackScore: 0,
                    completed: true,
                    boardNumber: pairings.length + 1,
                    isBye: true
                });
                used.add(player.name);
                player.score += 1; // Award point for bye
            }
        });
    }

    // Pair remaining players (emergency fallback)
    pairRemainingPlayers(unpaired, pairings, used) {
        // Sort by score (highest first)
        unpaired.sort((a, b) => b.score - a.score);
        
        for (let i = 0; i < unpaired.length; i += 2) {
            if (i + 1 < unpaired.length) {
                const player1 = unpaired[i];
                const player2 = unpaired[i + 1];
                
                // Check if they've played before
                if (!Utils.havePlayed(player1, player2)) {
                    const { white, black } = this.determineColors(player1, player2);
                    
                    pairings.push({
                        white: white,
                        black: black,
                        whiteScore: 0,
                        blackScore: 0,
                        completed: false,
                        boardNumber: pairings.length + 1,
                        isBye: false
                    });
                    
                    used.add(player1.name);
                    used.add(player2.name);
                } else {
                    // If they've played, give one a bye
                    pairings.push({
                        white: player1,
                        black: null,
                        whiteScore: 1,
                        blackScore: 0,
                        completed: true,
                        boardNumber: pairings.length + 1,
                        isBye: true
                    });
                    used.add(player1.name);
                    player1.score += 1;
                    
                    // Try to pair player2 with someone else
                    if (i + 2 < unpaired.length) {
                        const player3 = unpaired[i + 2];
                        if (!Utils.havePlayed(player2, player3)) {
                            const { white, black } = this.determineColors(player2, player3);
                            
                            pairings.push({
                                white: white,
                                black: black,
                                whiteScore: 0,
                                blackScore: 0,
                                completed: false,
                                boardNumber: pairings.length + 1,
                                isBye: false
                            });
                            
                            used.add(player2.name);
                            used.add(player3.name);
                            i++; // Skip next player since we used them
                        } else {
                            // Give player2 bye
                            pairings.push({
                                white: player2,
                                black: null,
                                whiteScore: 1,
                                blackScore: 0,
                                completed: true,
                                boardNumber: pairings.length + 1,
                                isBye: true
                            });
                            used.add(player2.name);
                            player2.score += 1;
                        }
                    } else {
                        // Give player2 bye
                        pairings.push({
                            white: player2,
                            black: null,
                            whiteScore: 1,
                            blackScore: 0,
                            completed: true,
                            boardNumber: pairings.length + 1,
                            isBye: true
                        });
                        used.add(player2.name);
                        player2.score += 1;
                    }
                }
            } else {
                // Last player gets bye
                const player = unpaired[i];
                pairings.push({
                    white: player,
                    black: null,
                    whiteScore: 1,
                    blackScore: 0,
                    completed: true,
                    boardNumber: pairings.length + 1,
                    isBye: true
                });
                used.add(player.name);
                player.score += 1;
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