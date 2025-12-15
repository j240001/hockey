// =========================================================
// AI COACH: PARAMETER TUNING EDITION
// =========================================================

const AICoach = {
    active: false,
    stopRequested: false, 
    
    // Configuration
    traineeJSON: null,      // The current "Best" version
    mutantJSON: null,       // The version currently playing
    opponents: [],          // Array of Strategy IDs
    roundsPerEpisode: 4,    
    maxEpisodes: 100,       // If -1, runs infinitely
    
    // State
    currentEpisode: 0,
    bestPoints: -1,         
    bestGoalDiff: -999,
    bestStats: null,
    
    mutationDetails: "",    
    mutationHistory: [], 

    // 1. INITIALIZE 
    initTournamentTraining: function(json, opponents, rounds, episodes, manualBaseline = -1) {
        const mode = (episodes === -1) ? "♾️ INFINITE MODE" : `${episodes} Episodes`;
        console.log(`👨‍🏫 COACH: Initializing. Target: ${manualBaseline > -1 ? manualBaseline : "Auto"} | Duration: ${mode}`);
        
        this.traineeJSON = JSON.parse(JSON.stringify(json));
        this.mutantJSON = JSON.parse(JSON.stringify(json)); 
        this.opponents = opponents;
        this.roundsPerEpisode = rounds;
        this.maxEpisodes = episodes;
        
        // Manual Baseline Logic
        this.bestPoints = manualBaseline; 
        this.useManualBaseline = (manualBaseline > -1);
        
        this.bestGoalDiff = -999;
        this.currentEpisode = 0;
        this.active = true;
        this.stopRequested = false; 
        this.mutationDetails = "Baseline Assessment";
        
        this.mutationHistory = [];
    },

    // 2. STOP COMMAND
    stopTraining: function() {
        if (!this.active) return;
        if (this.stopRequested) return;
        console.log("🛑 STOP REQUESTED: Finishing current episode then saving...");
        this.stopRequested = true;
    },

    // 3. START EPISODE
    startEpisode: function() {
        // Stop Check
        if (this.stopRequested) {
            this.finalizeTraining();
            return;
        }

        this.currentEpisode++;
        const episodeLabel = this.maxEpisodes === -1 ? "(Infinite)" : `/ ${this.maxEpisodes}`;
        console.log(`\n🎬 STARTING EPISODE ${this.currentEpisode} ${episodeLabel}`);

        // A. Inject the Mutant
        const builder = (typeof StrategyInterpreter !== 'undefined') ? StrategyInterpreter : null;
        if (!builder) { console.error("StrategyInterpreter missing!"); return; }

        const mutantBrain = builder.buildTeamStrategy(this.mutantJSON);
        
        const jsonName = this.mutantJSON.name || "Trainee";
        const jsonCode = this.mutantJSON.code || "TRN";
        const jsonColors = this.mutantJSON.colors || { main: "#00ff00", secondary: "#004400" };

        Strategies["TRAINEE"] = {
            name: jsonName + " (V" + this.currentEpisode + ")", 
            short: jsonCode,
            code: jsonCode,
            teamName: jsonName,
            colors: jsonColors, 
            think: mutantBrain
        };

        // B. Start Gauntlet
        Tournament.startTrainingGauntlet("TRAINEE", this.opponents, this.roundsPerEpisode);
    },

    // 4. EPISODE COMPLETE
    reportTournamentResult: function(standings) {
        const stats = standings["TRAINEE"];
        if (!stats) { console.error("Trainee missing!"); return; }

        const points = stats.Pts;
        const goalDiff = stats.GF - stats.GA;
        
        console.log(`📊 REPORT: Pts: ${points}, GD: ${goalDiff}`);
        
        let improved = false;
        let outcomeString = "REJECTED";

        // Logic Branch: Auto vs Manual Baseline
        if (this.currentEpisode === 1 && !this.useManualBaseline) {
            this.bestPoints = points;
            this.bestGoalDiff = goalDiff;
            this.bestStats = JSON.parse(JSON.stringify(stats));
            this.mutationDetails = "Baseline Established (Auto).";
            outcomeString = "BASELINE";
        } 
        else {
            // Check improvement
            if (points > this.bestPoints || (points === this.bestPoints && goalDiff > this.bestGoalDiff)) {
                console.log("🚀 IMPROVEMENT CONFIRMED!");
                this.bestPoints = points;
                this.bestGoalDiff = goalDiff;
                this.bestStats = JSON.parse(JSON.stringify(stats));
                this.traineeJSON = JSON.parse(JSON.stringify(this.mutantJSON)); 
                improved = true;
                outcomeString = "IMPROVED";
            } else {
                console.log(`❌ FAILED TARGET (${this.bestPoints}). Discarding.`);
            }
        }

        this.logHistory(stats, outcomeString);

        // --- CONTINUATION LOGIC ---
        if (!this.stopRequested && (this.maxEpisodes === -1 || this.currentEpisode < this.maxEpisodes)) {
            this.prepareNextMutation(improved);
        } else {
            this.finalizeTraining();
        }
    },

    // 5. FINALIZE & SAVE
    finalizeTraining: function() {
        console.log("🎓 TRAINING COMPLETE.");
        this.active = false;
        
        this.downloadJSON();
        this.downloadHistory(); 
        
        alert("Training Complete! Check your downloads folder.");
        gameState = "menu"; 
    },

  
// 6. MUTATION PHASE (MULTI-STEP EDITION)
    prepareNextMutation: function(lastWasImprovement) {
        // Reset to best known version
        this.mutantJSON = JSON.parse(JSON.stringify(this.traineeJSON));
        
        const activeRoles = ['c', 'rw', 'ld', 'lw', 'rd']; 
        let mutationStrength = 25; 
        
        // --- MULTI-MUTATION SETTINGS ---
        const TARGET_MUTATIONS = 4; // <--- CHANGE THIS TO 3 OR 4 IF YOU WANT MORE CHAOS
        let successfulMutations = 0;
        let logBuffer = [];

        // Loop X times to force multiple changes
        for (let i = 0; i < TARGET_MUTATIONS; i++) {
            let singleMutationDone = false;
            let attempts = 0;

            // Inner retry loop: Keep trying until we find a valid node to change for this step
            while (!singleMutationDone && attempts < 100) {
                attempts++;
                const randomRole = activeRoles[Math.floor(Math.random() * activeRoles.length)];
                
                if (this.mutantJSON[randomRole]) {
                    const root = this.mutantJSON[randomRole][0]; 
                    if (root && root.children) {
                       // IMPORTANT: We create a fresh 'result' object for every step
                       const result = { changed: false, log: "" };
                       this.traverseAndMutate(root, mutationStrength, result);
                       
                       if (result.changed) {
                           singleMutationDone = true;
                           successfulMutations++;
                           logBuffer.push(result.log);
                       }
                    }
                }
            }
        }
        
        const changeDesc = (successfulMutations > 0) ? logBuffer.join(" + ") : "No Valid Nodes Found";
        const status = lastWasImprovement ? "✅ KEEPING. " : "❌ REVERTING. ";
        this.mutationDetails = `${status} ${changeDesc}`;
            
        if (typeof startTrainingIntermission === 'function') {
            startTrainingIntermission();
        } else {
            this.startEpisode();
        }
    },




    // --- RECURSIVE MUTATOR ---
    traverseAndMutate: function(node, strength, result) {
        if (result.changed) return; // Stop if we already mutated one thing this turn

        // 1. MUTATE WEIGHTED PASS NODES (Bias, Fear, Vision)
        if (node.type === "condWeightedPassCheck") {
            // 20% Chance to mutate this specific node if encountered
            if (Math.random() < 0.10) {
                const params = ['bias', 'fear', 'vision'];
                const targetParam = params[Math.floor(Math.random() * params.length)];
                
                let currentVal = parseInt(node[targetParam]) || 50;
                // Mutation: +/- 0 to Strength (e.g., -15 to +15)
                let change = Math.floor((Math.random() - 0.5) * 2 * strength);
                // Ensure at least some change happens
                if (change === 0) change = (Math.random() > 0.5 ? 5 : -5);

                let newVal = Math.max(0, Math.min(100, currentVal + change));
                
                node[targetParam] = newVal; // Update JSON
                
                result.changed = true;
                result.log = `Tweaked ${targetParam.toUpperCase()} (${currentVal} -> ${newVal})`;
                return;
            }
        }

        // 2. MUTATE FORMATION NODES (Legacy Support)
        if (node.type === "actFormationTarget") {
             if (Math.random() < 0.40) {
                let currentX = parseInt(node.offsetx) || 0;
                let currentY = parseInt(node.offsety) || 0;
                let nudgeX = (Math.random() - 0.5) * 2 * 40; 
                let nudgeY = (Math.random() - 0.5) * 2 * 40;
                node.offsetx = Math.round(Math.max(-350, Math.min(350, currentX + nudgeX)));
                node.offsety = Math.round(Math.max(-130, Math.min(130, currentY + nudgeY)));
                result.changed = true;
                result.log = "Tweaked Formation Coords";
                return;
            }
        }

        // Traverse Children
        if (node.children) {
            // Randomize order of children traversal to avoid bias
            const shuffled = [...node.children].sort(() => 0.5 - Math.random());
            for (const child of shuffled) {
                this.traverseAndMutate(child, strength, result);
                if (result.changed) return;
            }
        }
    },

    // 7. RENDERER
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
        
        let label = `TRAINING PROGRESS: ${this.currentEpisode}`;
        if (isInfinite) label += " (∞ RUNNING)";
        else label += ` / ${this.maxEpisodes} (${Math.floor(pct * 100)}%)`;
        
        if (this.stopRequested) {
            label += " [STOPPING...]";
            ctx.fillStyle = "#ff5555";
        } else {
            label += " [Press 'Q' to Stop]";
        }

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

    // 8. LOGGING & EXPORT
    logHistory: function(stats, outcome) {
        this.mutationHistory.push({
            episode: this.currentEpisode,
            description: this.mutationDetails,
            outcome: outcome,
            stats: { GP: stats.GP, Wins: stats.W, Points: stats.Pts, GF: stats.GF, GA: stats.GA }
        });
    },

    downloadJSON: function() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.traineeJSON, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        const name = (this.traineeJSON.name || "Team").replace(/\s+/g, '_');
        downloadAnchorNode.setAttribute("download", `${name}_V${this.currentEpisode}_BEST.json`);
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
        const teamName = (this.traineeJSON.name || "Team");

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