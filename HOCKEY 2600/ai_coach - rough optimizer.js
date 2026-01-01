// =========================================================
// 📚 AI COACH - ROUGH OPTIMIZER
// =========================================================
const LIBRARY = {
    // --- OFFENSE: SCORING ---
    "SHOOT_SIGHT": { 
        type: "Sequence", cat: "struct", 
        children: [
            {type:"condHasPuck", cat:"cond"}, 
            {type:"condInShotRange", cat:"cond"}, 
            {type:"actShoot", cat:"act"}
        ] 
    },
    "PASS_AGGRO": { 
        type: "Sequence", cat: "struct", 
        children: [
            {type:"condHasPuck", cat:"cond"}, 
            {type:"condPuckInOffZone", cat:"cond"}, 
            {type:"condWeightedPassCheck", cat:"cond", bias:20, fear:30, vision:90}, 
            {type:"actSmartPass", cat:"act"}
        ] 
    },
    "PASS_SAFE": { 
        type: "Sequence", cat: "struct", 
        children: [
            {type:"condHasPuck", cat:"cond"}, 
            {type:"condPuckInOffZone", cat:"cond"}, 
            {type:"condWeightedPassCheck", cat:"cond", bias:80, fear:80, vision:30}, 
            {type:"actSmartPass", cat:"act"}
        ] 
    },
    "DUMP_CHASE": { 
        type: "Sequence", cat: "struct", 
        children: [
            {type:"condHasPuck", cat:"cond"}, 
            {type:"condPuckInNeuZone", cat:"cond"}, 
            {type:"actShoot", cat:"act"}
        ] 
    }, 

    // --- TRANSITION ---
    "CARRY_HERO": { 
        type: "Sequence", cat: "struct", 
        children: [
            {type:"condHasPuck", cat:"cond"}, 
            {type:"actExecuteCarry", cat:"act"}
        ] 
    },
    "BREAKOUT_PASS": { 
        type: "Sequence", cat: "struct", 
        children: [
            {type:"condHasPuck", cat:"cond"}, 
            {type:"condPuckInDefZone", cat:"cond"}, 
            {type:"condWeightedPassCheck", cat:"cond", bias:90, fear:60, vision:70}, 
            {type:"actSmartPass", cat:"act"}
        ] 
    },
    
    // --- DEFENSE: ON PUCK ---
    "DEF_CHASE": { 
        type: "Sequence", cat: "struct", 
        children: [
            {type:"condOppHasPuck", cat:"cond"}, 
            {type:"actAggressiveGap", cat:"act"}
        ] 
    },
    "DEF_TRAP_N": { 
        type: "Sequence", cat: "struct", 
        children: [
            {type:"condOppHasPuck", cat:"cond"}, 
            {type:"condPuckInNeuZone", cat:"cond"}, 
            {type:"actFormationTarget", cat:"act", offsetx: 0, offsety: 0}
        ] 
    },
    "DEF_CONTAIN": { 
        type: "Sequence", cat: "struct", 
        children: [
            {type:"condOppHasPuck", cat:"cond"}, 
            {type:"actFormationTarget", cat:"act", offsetx: 120, offsety: 0}
        ] 
    },
    
    // --- DEFENSE: OFF PUCK ---
    "INT_SMART": { 
        type: "Sequence", cat: "struct", 
        children: [
            {type:"condLoosePuck", cat:"cond"}, 
            {type:"actSmartIntercept", cat:"act"}
        ] 
    },
    "INT_CLOSEST": { 
        type: "Sequence", cat: "struct", 
        children: [
            {type:"condLoosePuck", cat:"cond"}, 
            {type:"condAmIClosest", cat:"cond"}, 
            {type:"actSmartIntercept", cat:"act"}
        ] 
    },
    
    // --- POSITIONING: OFF BALL ---
    "SUP_SNIPER": { 
        type: "Sequence", cat: "struct", 
        children: [
            {type:"condTeamHasPuck", cat:"cond"}, 
            {type:"condPuckInOffZone", cat:"cond"}, 
            {type:"actFormationTarget", cat:"act", offsetx: 150, offsety: -100}
        ] 
    },
    "SUP_POINT": { 
        type: "Sequence", cat: "struct", 
        children: [
            {type:"condTeamHasPuck", cat:"cond"}, 
            {type:"condPuckInOffZone", cat:"cond"}, 
            {type:"actFormationTarget", cat:"act", offsetx: -50, offsety: 0}
        ] 
    },   
    "SUP_NET": { 
        type: "Sequence", cat: "struct", 
        children: [
            {type:"condTeamHasPuck", cat:"cond"}, 
            {type:"condPuckInOffZone", cat:"cond"}, 
            {type:"actFormationTarget", cat:"act", offsetx: 250, offsety: 0}
        ] 
    }, 
    
    // --- SAFETY ---
    "SAFETY_VALVE": { 
        type: "Sequence", cat: "struct", 
        children: [
            {type:"condIsLastMan", cat:"cond"}, 
            {type:"actFormationTarget", cat:"act", offsetx: -150, offsety: 0}
        ] 
    }
};

const LIBRARY_KEYS = Object.keys(LIBRARY);

const AICoach = {
    active: false,
    stopRequested: false, 
    
    baseJSON: null,
    bestGenome: null,
    mutantGenome: null,
    opponents: [],
    roundsPerEpisode: 0,    
    maxEpisodes: 0,
    
    currentEpisode: 0,
    bestPoints: -1,         
    bestGoalDiff: -999,
    bestStats: null,
    mutationDetails: "",    
    mutationHistory: [], 

    initTournamentTraining: function(json, opponents, rounds, episodes, manualBaseline = -1) {
        const mode = (episodes === -1) ? "♾️ INFINITE MODE" : `${episodes} Episodes`;
        console.log(`👨‍🏫 COACH: Settings Received from Menu.`);
        console.log(`- Opponents: ${opponents.length}`);
        console.log(`- Rounds: ${rounds}`);
        console.log(`- Target: ${mode}`);
        
        this.baseJSON = JSON.parse(JSON.stringify(json)); 
        this.opponents = opponents;
        this.roundsPerEpisode = rounds;
        this.maxEpisodes = episodes;
        
        this.bestPoints = manualBaseline; 
        this.useManualBaseline = (manualBaseline > -1);
        this.bestGoalDiff = -999;
        
        this.bestGenome = {
            c:  ["SHOOT_SIGHT", "CARRY_HERO", "DEF_CHASE"],
            lw: ["SHOOT_SIGHT", "PASS_SAFE", "INT_SMART"],
            rw: ["SHOOT_SIGHT", "PASS_AGGRO", "INT_SMART"],
            ld: ["SAFETY_VALVE", "DEF_CONTAIN", "BREAKOUT_PASS"],
            rd: ["SAFETY_VALVE", "DEF_CHASE", "BREAKOUT_PASS"]
        };
        
        this.mutantGenome = JSON.parse(JSON.stringify(this.bestGenome));
        this.currentEpisode = 0;
        this.active = true;
        this.stopRequested = false; 
        this.mutationDetails = "Deckbuilder Initialized";
        this.mutationHistory = [];
        
        this.startEpisode();
    },

    stopTraining: function() {
        if (!this.active) return;
        if (this.stopRequested) return;
        console.log("🛑 STOP REQUESTED.");
        this.stopRequested = true;
    },

    startEpisode: function() {
        if (this.stopRequested) {
            this.finalizeTraining();
            return;
        }

        this.currentEpisode++;
        const episodeLabel = this.maxEpisodes === -1 ? "(Infinite)" : `/ ${this.maxEpisodes}`;
        console.log(`\n🎬 STARTING EPISODE ${this.currentEpisode} ${episodeLabel}`);

        const mutantJSON = this.compileGenome(this.mutantGenome);
        
        // --- 🕵️ SPY FEATURE ---
        if (this.currentEpisode === 1) {
            console.log("🕵️ DEBUG: Downloading Episode 1 JSON for inspection...");
            this.downloadJSON(mutantJSON, "_DEBUG_START");
        }

        const builder = (typeof StrategyInterpreter !== 'undefined') ? StrategyInterpreter : null;
        if (!builder) { console.error("StrategyInterpreter missing!"); return; }

        const mutantBrain = builder.buildTeamStrategy(mutantJSON);
        
        const jsonName = this.baseJSON.name || "Trainee";
        const jsonCode = this.baseJSON.code || "TRN";
        const jsonColors = this.baseJSON.colors || { main: "#00ff00", secondary: "#004400" };

        Strategies["TRAINEE"] = {
            name: jsonName + " (V" + this.currentEpisode + ")", 
            short: jsonCode,
            code: jsonCode,
            teamName: jsonName,
            colors: jsonColors, 
            think: mutantBrain
        };

        Tournament.startTrainingGauntlet("TRAINEE", this.opponents, this.roundsPerEpisode);
    },

  reportTournamentResult: function(standings) {
        const stats = standings["TRAINEE"];
        if (!stats) { console.error("Trainee missing!"); return; }

        // 1. GET EPISODE TOTALS (Directly from Tournament.js variables)
        const gamesPlayed = stats.GP || 1;
        const points = stats.Pts;
        const goalDiff = stats.GF - stats.GA;
        
        // "totalSOGF" = Shots Generated by Trainee
        // "totalSOGA" = Shots Generated by Opponents against Trainee
        const shotsFor = stats.totalSOGF || 0;
        const shotsAgainst = stats.totalSOGA || 0;

        // 2. CALCULATE AVERAGES
        const avgShotsFor = shotsFor / gamesPlayed;
        const avgShotsAgainst = shotsAgainst / gamesPlayed;

        console.log(`📊 EPISODE TOTALS: Pts:${points} | GD:${goalDiff} | SF/G:${avgShotsFor.toFixed(1)} | SA/G:${avgShotsAgainst.toFixed(1)}`);
        
        let improved = false;
        let outcomeString = "REJECTED";
        
        // 3. THE FUNCTIONALITY FILTER (The 8.0 Rule)
        // Both teams must be engaging in the game.
        const isFunctional = (avgShotsFor >= 8.0 && avgShotsAgainst >= 8.0);

        if (!isFunctional) {
            console.log(`⚠️ DYSFUNCTIONAL: Low Event Game (SF:${avgShotsFor.toFixed(1)}, SA:${avgShotsAgainst.toFixed(1)}). Discarding.`);
            outcomeString = "DYSFUNCTIONAL";
            this.mutationDetails = `⚠️ Low Event (SF:${avgShotsFor.toFixed(1)} SA:${avgShotsAgainst.toFixed(1)})`;
        }
        else if (this.currentEpisode === 1 && !this.useManualBaseline) {
            this.bestPoints = points;
            this.bestGoalDiff = goalDiff;
            this.bestStats = JSON.parse(JSON.stringify(stats));
            this.mutationDetails = "Baseline Established.";
            outcomeString = "BASELINE";
        } 
        else {
            // 4. THE RECORD CHECK
            // We only care about points/wins if the game was functional.
            if (points > this.bestPoints || (points === this.bestPoints && goalDiff > this.bestGoalDiff)) {
                console.log("🚀 IMPROVEMENT CONFIRMED!");
                this.bestPoints = points;
                this.bestGoalDiff = goalDiff;
                this.bestStats = JSON.parse(JSON.stringify(stats));
                this.bestGenome = JSON.parse(JSON.stringify(this.mutantGenome)); 
                improved = true;
                outcomeString = "IMPROVED";
            } else {
                console.log(`❌ FAILED TARGET (${this.bestPoints} Pts). Discarding.`);
            }
        }

        this.logHistory(stats, outcomeString);

        if (!this.stopRequested && (this.maxEpisodes === -1 || this.currentEpisode < this.maxEpisodes)) {
            // If dysfunctional or failed, we 'improved' is false, so it reverts the mutation
            this.prepareNextMutation(improved);
        } else {
            this.finalizeTraining();
        }
    },
    // ----------------------------------------------------

    finalizeTraining: function() {
        console.log("🎓 TRAINING COMPLETE.");
        this.active = false;
        
        const finalJSON = this.compileGenome(this.bestGenome);
        finalJSON.name = (this.baseJSON.name || "Team") + "_EVOLVED";
        finalJSON.teamName = this.baseJSON.teamName;
        finalJSON.code = this.baseJSON.code;
        finalJSON.colors = this.baseJSON.colors;

        this.downloadJSON(finalJSON, "_EVOLVED");
        this.downloadHistory(); 
        
        alert("Training Complete! Check downloads.");
        gameState = "menu"; 
    },

    prepareNextMutation: function(lastWasImprovement) {
        this.mutantGenome = JSON.parse(JSON.stringify(this.bestGenome));
        
        const roles = ['c', 'lw', 'rw', 'ld', 'rd'];
        const TARGET_MUTATIONS = 4; 
        let logBuffer = [];

        for (let i = 0; i < TARGET_MUTATIONS; i++) {
            const role = roles[Math.floor(Math.random() * roles.length)];
            const deck = this.mutantGenome[role];
            const mutationType = Math.random();
            let log = "";

            if (mutationType < 0.40) {
                if (deck.length > 1) {
                    const idx1 = Math.floor(Math.random() * deck.length);
                    const idx2 = Math.floor(Math.random() * deck.length);
                    [deck[idx1], deck[idx2]] = [deck[idx2], deck[idx1]]; 
                    log = `Reordered ${role.toUpperCase()}`;
                }
            } 
            else if (mutationType < 0.80) {
                if (deck.length > 0) {
                    const idx = Math.floor(Math.random() * deck.length);
                    const newCard = LIBRARY_KEYS[Math.floor(Math.random() * LIBRARY_KEYS.length)];
                    deck[idx] = newCard;
                    log = `Replaced Card in ${role.toUpperCase()}: ${newCard}`;
                }
            } 
            else {
                if (Math.random() > 0.5 && deck.length < 8) { 
                    const newCard = LIBRARY_KEYS[Math.floor(Math.random() * LIBRARY_KEYS.length)];
                    deck.push(newCard);
                    log = `Added ${newCard} to ${role.toUpperCase()}`;
                } else if (deck.length > 2) { 
                    deck.pop();
                    log = `Pruned Logic from ${role.toUpperCase()}`;
                }
            }
            if (log) logBuffer.push(log);
        }
        
        const changeDesc = logBuffer.length > 0 ? logBuffer.join(" + ") : "Minor Shuffle";
        const status = lastWasImprovement ? "✅ KEEPING. " : "❌ REVERTING. ";
        this.mutationDetails = `${status} ${changeDesc}`;
            
        this.startEpisode();
    },

    compileGenome: function(genome) {
        let newStrategy = JSON.parse(JSON.stringify(this.baseJSON)); 
        
        ['c', 'lw', 'rw', 'ld', 'rd'].forEach(role => {
            const geneList = genome[role];
            newStrategy[role] = [{
                type: "Selector",
                cat: "struct",
                children: [] 
            }];
            
            geneList.forEach(cardID => {
                if (LIBRARY[cardID]) {
                    newStrategy[role][0].children.push(JSON.parse(JSON.stringify(LIBRARY[cardID])));
                }
            });

            // 🛡️ THE SAFETY NET (Prevents Vanishing)
            newStrategy[role][0].children.push({
                type: "Sequence", cat: "struct", 
                children: [
                    {type:"condHasPuck", cat:"cond"}, 
                    {type:"actExecuteCarry", cat:"act"}
                ]
            });
            newStrategy[role][0].children.push({
                type: "Sequence", cat: "struct", 
                children: [
                    {type:"condOppHasPuck", cat:"cond"}, 
                    {type:"actAggressiveGap", cat:"act"}
                ]
            });
            newStrategy[role][0].children.push({
                type: "Sequence", cat: "struct", 
                children: [
                    {type:"condTeamHasPuck", cat:"cond"}, 
                    {type:"actFormationTarget", cat:"act", offsetx: -100, offsety: 0} 
                ]
            });
            newStrategy[role][0].children.push({
                type: "Sequence", cat: "struct", 
                children: [
                    {type:"condLoosePuck", cat:"cond"}, 
                    {type:"actSmartIntercept", cat:"act"}
                ]
            });
        });
        return newStrategy;
    },

    drawProgressBar: function(ctx, w, h) {
        if (!this.active) return;
        const barHeight = 30;
        const margin = 50;
        const y = h - 60;
        const fullWidth = w - (margin * 2);
        const isInfinite = (this.maxEpisodes === -1);
        const pct = isInfinite ? 1 : Math.min(1, this.currentEpisode / this.maxEpisodes);

        ctx.save();
        ctx.fillStyle = "#000";
        ctx.fillRect(0, y - 40, w, 100);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 18px Monospace";
        ctx.textAlign = "center";
        
        let label = `DECKBUILDER: ${this.currentEpisode}`;
        if (isInfinite) label += " (∞ RUNNING)";
        else label += ` / ${this.maxEpisodes} (${Math.floor(pct * 100)}%)`;
        
        if (this.stopRequested) label += " [STOPPING...]";
        else label += " [Press 'Q' to Stop]";

        ctx.fillText(label, w / 2, y - 10);
        ctx.lineWidth = 3;
        ctx.strokeStyle = this.stopRequested ? "#ff5555" : "#ffffff";
        ctx.strokeRect(margin, y, fullWidth, barHeight);

        if (pct > 0) {
            ctx.fillStyle = this.stopRequested ? "#ff5555" : "#00ff00";
            const fillW = (fullWidth - 6) * pct;
            ctx.fillRect(margin + 3, y + 3, fillW, barHeight - 6);
        }
        ctx.restore();
    },

    logHistory: function(stats, outcome) {
        this.mutationHistory.push({
            episode: this.currentEpisode,
            description: this.mutationDetails,
            outcome: outcome,
            stats: { GP: stats.GP, Wins: stats.W, Points: stats.Pts, GF: stats.GF, GA: stats.GA }
        });
    },

    downloadJSON: function(finalJSON, suffix) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(finalJSON, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        const name = (finalJSON.name || "Team").replace(/\s+/g, '_');
        downloadAnchorNode.setAttribute("download", `${name}_V${this.currentEpisode}${suffix}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },

    downloadHistory: function() {
        const sortedHistory = [...this.mutationHistory].sort((a, b) => {
            if (b.stats.Points !== a.stats.Points) return b.stats.Points - a.stats.Points;
            return (b.stats.GF - b.stats.GA) - (a.stats.GF - a.stats.GA);
        });
        const top5 = sortedHistory.slice(0, 5);
        const teamName = (this.baseJSON.name || "Team");
        let html = `<!DOCTYPE html><html><head><title>Training: ${teamName}</title><style>body{background:#1e1e2e;color:#c0caf5;font-family:sans-serif;padding:20px}h1{color:#7aa2f7;border-bottom:2px solid #444}table{width:100%;border-collapse:collapse;margin-top:20px;background:#252535}th,td{padding:12px;border-bottom:1px solid #444}th{background:#16161e;color:#7dcfff}.positive{color:#9ece6a;font-weight:bold}.negative{color:#f7768e}</style></head><body><h1>🏆 Top 5: ${teamName}</h1><table><thead><tr><th>Rank</th><th>Ep</th><th>Result</th><th>GP</th><th>Pts</th><th>Diff</th></tr></thead><tbody>`;
        top5.forEach((e, i) => {
            const diff = e.stats.GF - e.stats.GA;
            const cls = diff > 0 ? "positive" : (diff < 0 ? "negative" : "");
            html += `<tr><td>#${i+1}</td><td>${e.episode}</td><td>${e.outcome}</td><td>${e.stats.GP}</td><td>${e.stats.Points}</td><td class="${cls}">${diff>0?"+":""}${diff}</td></tr>`;
        });
        html += `</tbody></table></body></html>`;
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute("download", `${teamName.replace(/\s+/g, '_')}_REPORT.html`);
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }
};