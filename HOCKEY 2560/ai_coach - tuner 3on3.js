// =============================================================================
// AI COACH - PRECISION PARAMETER TUNER (BLACKLIST ENABLED)
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
    bestShotAvg: 0,      // Track aggressive shot generation
    baselinePts: 0,
    
    bestJSON: null,    // The "Gold Standard"
    currentJSON: null, // The "Active Mutant"
    
    currentEpisode: 0,
    mutationDetails: "",    

    // 1. INITIALIZE (Starts with your LOADED team from the builder)
    initTournamentTraining: function(json, opponents, rounds, episodes, manualBaseline = -1) {
        console.log(`🔧 PRECISION TUNER: Initialized for ${json.name}`);
        console.log(`> Strategy: Blacklist Guard (Zones Locked)`);
        
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

    stopTraining: function() {
        if (!this.active) return;
        this.stopRequested = true;
        console.log("🛑 STOP REQUESTED. Finishing current episode...");
    },

    // 2. START EPISODE
    startEpisode: function() {
        if (this.stopRequested) {
            this.finalizeTraining();
            return;
        }

        this.currentEpisode++;
        console.log(`\n⚙️ TUNING | Ep ${this.currentEpisode} | ${this.mutationDetails}`);

        const builder = (typeof StrategyInterpreter !== 'undefined') ? StrategyInterpreter : null;
        const mutantBrain = builder.buildTeamStrategy(this.currentJSON);
        
        Strategies["TRAINEE"] = {
            name: "Tuned_" + this.currentEpisode, 
            short: "TUNE",
            code: "TUNE",
            teamName: "Tuner",
            colors: this.bestJSON.colors, 
            think: mutantBrain
        };

        Tournament.startTrainingGauntlet("TRAINEE", this.opponents, this.roundsPerEpisode);
    },

    // 3. REPORTING (The "Improved" Gatekeeper)
    reportTournamentResult: function(standings) {
        const stats = standings["TRAINEE"];
        if (!stats) return;

        const GP = stats.GP || 1;
        const Pts = stats.Pts;
        const GD = stats.GF - stats.GA;
        const avgSF = (stats.totalSOGF || 0) / GP;

        if (this.currentEpisode === 1 && this.bestPoints === -1) {
            this.baselinePts = Pts;
            this.bestPoints = Pts;
            this.bestGoalDiff = GD;
            this.bestShotAvg = avgSF;
            this.prepareNextEpisode(true);
            return;
        }

        // Logic: Only keep if Points improve, OR Points tie but GD improves
        let improved = (Pts > this.bestPoints || (Pts === this.bestPoints && GD > this.bestGoalDiff));

        if (improved) {
            console.log(`🚀 IMPROVED! (${Pts} Pts | SF/G: ${avgSF.toFixed(1)}). Saving milestone.`);
            this.bestPoints = Pts;
            this.bestGoalDiff = GD;
            this.bestShotAvg = avgSF;
            this.bestJSON = JSON.parse(JSON.stringify(this.currentJSON));
            this.downloadJSON(this.bestJSON, `_Milestone_${Pts}pts`);
        } else {
            console.log(`❌ NO IMPROVEMENT. Reverting to previous best.`);
        }

        this.prepareNextEpisode(improved);
    },

    // 4. PREPARE NEXT
    prepareNextEpisode: function(lastWasGood) {
        if (!this.stopRequested && (this.maxEpisodes === -1 || this.currentEpisode < this.maxEpisodes)) {
            // Revert to best known genome
            this.currentJSON = JSON.parse(JSON.stringify(this.bestJSON));
            this.mutateParameters(this.currentJSON); 
            this.startEpisode();
        } else {
            this.finalizeTraining();
        }
    },

    // 5. THE PRECISION TUNER ENGINE
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

            Object.keys(node).forEach(key => {
                const val = node[key];
                if (!BLACKLIST.includes(key) && val !== "" && !isNaN(val)) {
                    
                    if (Math.random() < 0.20) {
                        let oldVal = Number(val);
                        let range = (oldVal > 50) ? 10 : 2;
                        let nudge = (Math.random() < 0.5) ? range : -range;
                        let newVal = oldVal + nudge;

                        if (["bias", "fear", "vision"].includes(key)) newVal = Math.max(0, Math.min(100, newVal));
                        
                        node[key] = newVal.toString();
                        this.mutationDetails = `${targetRole.toUpperCase()} | ${node.type} | ${key}: ${oldVal} -> ${newVal}`;
                        mutationFound = true;
                    }
                }
            });
        };

        crawl(tree);
        if (!mutationFound) this.mutationDetails = "Stable Episode (No changes)";
    },

    finalizeTraining: function() {
        this.active = false;
        this.downloadJSON(this.bestJSON, "_TUNED_FINAL");
        alert("Tuning session complete! Load the FINAL json back into the Builder.");
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