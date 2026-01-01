// =============================================================================
// AI COACH - PREMIUM PARAMETER TUNER (UI + BLACKLIST + QUIT)
// =============================================================================

const AICoach = {
    active: false,
    stopRequested: false, 
    
    opponents: [],
    roundsPerEpisode: 0,    
    maxEpisodes: 0,
    
    // Records
    bestPoints: -1,
    bestGoalDiff: -999,
    bestShotAvg: 0,
    baselinePts: 0,
    
    // Stats for Dashboard
    recentPts: 0,
    recentSF: 0,
    
    bestJSON: null,
    currentJSON: null,
    
    currentEpisode: 0,
    mutationDetails: "Initializing...",    

    // 1. INITIALIZE
    initTournamentTraining: function(json, opponents, rounds, episodes, manualBaseline = -1) {
        console.log(`🔧 TUNER PRO: Tuning ${json.name} | 5 vs 5 Mode`);
        
        this.opponents = opponents;
        this.roundsPerEpisode = rounds;
        this.maxEpisodes = episodes;
        
        this.bestJSON = JSON.parse(JSON.stringify(json));
        this.currentJSON = JSON.parse(JSON.stringify(json));
        
        this.bestPoints = manualBaseline;
        this.bestGoalDiff = -999;
        this.baselinePts = manualBaseline > -1 ? manualBaseline : "Calculating...";

        this.currentEpisode = 0;
        this.active = true;
        this.stopRequested = false; 
        
        this.mutationDetails = "Establishing Baseline";
        this.startEpisode();
    },

    // 2. THE QUIT BUTTON (Hooked to 'Q' in main loop)
    stopTraining: function() {
        if (!this.active) return;
        this.stopRequested = true;
        this.mutationDetails = "🛑 STOPPING AFTER MATCH...";
        console.log("🛑 Stop Requested. Finalizing current episode...");
    },

    // 3. START EPISODE
    startEpisode: function() {
        if (this.stopRequested) {
            this.finalizeTraining();
            return;
        }

        this.currentEpisode++;
        const builder = (typeof StrategyInterpreter !== 'undefined') ? StrategyInterpreter : null;
        const mutantBrain = builder.buildTeamStrategy(this.currentJSON);
        
        Strategies["TRAINEE"] = {
            name: "Tuned_V" + this.currentEpisode, 
            short: "TUNE", code: "TUNE", teamName: "Tuner",
            colors: this.bestJSON.colors, 
            think: mutantBrain
        };

        Tournament.startTrainingGauntlet("TRAINEE", this.opponents, this.roundsPerEpisode);
    },

    // 4. REPORTING
    reportTournamentResult: function(standings) {
        const stats = standings["TRAINEE"];
        if (!stats) return;

        const GP = stats.GP || 1;
        this.recentPts = stats.Pts;
        const GD = stats.GF - stats.GA;
        this.recentSF = (stats.totalSOGF || 0) / GP;

        if (this.currentEpisode === 1 && this.bestPoints === -1) {
            this.baselinePts = this.recentPts;
            this.bestPoints = this.recentPts;
            this.bestGoalDiff = GD;
            this.bestShotAvg = this.recentSF;
            this.prepareNextEpisode(true);
            return;
        }

        let improved = (this.recentPts > this.bestPoints || (this.recentPts === this.bestPoints && GD > this.bestGoalDiff));

        if (improved) {
            this.bestPoints = this.recentPts;
            this.bestGoalDiff = GD;
            this.bestShotAvg = this.recentSF;
            this.bestJSON = JSON.parse(JSON.stringify(this.currentJSON));
            this.downloadJSON(this.bestJSON, `_BEST_${this.bestPoints}pts`);
        }

        this.prepareNextEpisode(improved);
    },

    prepareNextEpisode: function(lastWasGood) {
        if (!this.stopRequested && (this.maxEpisodes === -1 || this.currentEpisode < this.maxEpisodes)) {
            this.currentJSON = JSON.parse(JSON.stringify(this.bestJSON));
            this.mutateParameters(this.currentJSON); 
            this.startEpisode();
        } else {
            this.finalizeTraining();
        }
    },

    // 5. THE TUNER ENGINE (Blacklist Aware)
    mutateParameters: function(root) {
        const BLACKLIST = ["zoneindex", "type", "cat"]; 
        const roles = ['c', 'lw', 'rw', 'ld', 'rd'];
        const targetRole = roles[Math.floor(Math.random() * roles.length)];
        const tree = root[targetRole];
        let mutationFound = false;
        
        const crawl = (node) => {
            if (!node) return;
            if (node.children) node.children.forEach(child => crawl(child));
            if (Array.isArray(node)) node.forEach(item => crawl(item));

            // --- UPDATED AGGRESSIVE MUTATION ENGINE ---
            Object.keys(node).forEach(key => {
                const val = node[key];
                if (!BLACKLIST.includes(key) && val !== "" && !isNaN(val)) {
                    
                    // Increased frequency from 0.20 to 0.40
                    if (Math.random() < 0.40) { 
                        let oldVal = Number(val);
                        
                        // DYNAMIC STEP SIZE: 
                        // Picks a random nudge between 5% and 30% of the original value
                        const variance = 0.05 + (Math.random() * 0.25);
                        let nudge = Math.ceil(oldVal * variance);
                        
                        // Ensure even tiny values get at least a nudge of 2
                        if (nudge < 2) nudge = 2;

                        let newVal = (Math.random() < 0.5) ? oldVal + nudge : oldVal - nudge;

                        // FLOOR GUARD: Prevents the -2 glitches you saw earlier
                        if (key.toLowerCase().includes("dist") || key.toLowerCase().includes("range")) {
                            newVal = Math.max(0, newVal);
                        }
                        
                        node[key] = newVal.toString();
                        this.mutationDetails = `Tuning ${targetRole.toUpperCase()}: ${key} (Nudge: ±${nudge})`;
                        mutationFound = true;
                    }
                }
            });
        };
        crawl(tree);
        if (!mutationFound) this.mutationDetails = "Stability Check (No nudge)";
    },

    // 6. THE VISUAL DASHBOARD (Premium Feature)
    drawProgressBar: function(ctx, w, h) {
        if (!this.active) return;
        const margin = 40;
        const panelW = 350;
        const panelH = 140;
        const x = w - panelW - margin;
        const y = h - panelH - margin;

        // Background Panel
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.strokeStyle = this.stopRequested ? "#ff4444" : "#00ffcc";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, panelW, panelH, 10);
        ctx.fill();
        ctx.stroke();

        // Header
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px Monospace";
        ctx.textAlign = "left";
        ctx.fillText(`⚙️ PARAM TUNER | EPISODE ${this.currentEpisode}`, x + 15, y + 25);
        
        // Stats
        ctx.font = "12px Monospace";
        ctx.fillStyle = "#aaa";
        ctx.fillText(`RECENT:  ${this.recentPts} Pts | ${this.recentSF.toFixed(1)} SF/G`, x + 15, y + 50);
        
        ctx.fillStyle = "#00ffcc";
        ctx.fillText(`BEST:    ${this.bestPoints} Pts | ${this.bestShotAvg.toFixed(1)} SF/G`, x + 15, y + 70);

        // Action details (The Nudge)
        ctx.fillStyle = "#ffcc00";
        ctx.fillText(`ACTION:  ${this.mutationDetails.substring(0, 40)}`, x + 15, y + 100);

        // Controls
        ctx.fillStyle = this.stopRequested ? "#ff4444" : "#777";
        ctx.textAlign = "center";
        ctx.fillText(this.stopRequested ? "FINISHING EPISODE..." : "PRESS 'Q' TO QUIT TRAINING", x + (panelW/2), y + 125);
        
        ctx.restore();
    },

    finalizeTraining: function() {
        this.active = false;
        this.downloadJSON(this.bestJSON, "_TUNED_FINAL");
        alert("Training Complete. Final Genome Saved.");
        gameState = "menu"; 
    },

    downloadJSON: function(finalJSON, suffix) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(finalJSON, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `${finalJSON.code}${suffix}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }
};