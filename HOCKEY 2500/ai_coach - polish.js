// =============================================================================
// AI COACH - PURE OPTIMIZER (STRICT HILL-CLIMBING)
// =============================================================================
const LIBRARY = {
    "SHOOT_SIGHT": { tags: ["action", "offense"], type: "Sequence", cat: "struct", children: [ { type: "condHasPuck", cat: "cond" }, { type: "condInShotRange", cat: "cond" }, { type: "actShoot", cat: "act" } ] },
    "SHOOT_LONG": { tags: ["action", "offense"], type: "Sequence", cat: "struct", children: [ { type: "condHasPuck", cat: "cond" }, { type: "condPuckInOffZone", cat: "cond" }, { type: "actShoot", cat: "act" } ] },
    "PASS_AGGRO": { tags: ["action", "offense", "pass"], type: "Sequence", cat: "struct", children: [ { type: "condHasPuck", cat: "cond" }, { type: "condPuckInOffZone", cat: "cond" }, { type: "condWeightedPassCheck", cat: "cond", bias: 20, fear: 30, vision: 90 }, { type: "actSmartPass", cat: "act" } ] },
    "PASS_SAFE": { tags: ["action", "pass"], type: "Sequence", cat: "struct", children: [ { type: "condHasPuck", cat: "cond" }, { type: "condWeightedPassCheck", cat: "cond", bias: 80, fear: 80, vision: 40 }, { type: "actSmartPass", cat: "act" } ] },
    "PASS_D_ZONE": { tags: ["action", "defense", "pass"], type: "Sequence", cat: "struct", children: [ { type: "condHasPuck", cat: "cond" }, { type: "condPuckInDefZone", cat: "cond" }, { type: "actSmartPass", cat: "act" } ] },
    "CARRY_BASIC": { tags: ["action", "move"], type: "Sequence", cat: "struct", children: [ { type: "condHasPuck", cat: "cond" }, { type: "actExecuteCarry", cat: "act" } ] },
    "CARRY_DEEP": { tags: ["action", "move", "offense"], type: "Sequence", cat: "struct", children: [ { type: "condHasPuck", cat: "cond" }, { type: "actFormationTarget", cat: "act", offsetx: 250, offsety: 100 } ] },
    "CHASE_PUCK": { tags: ["move", "defense", "aggro"], type: "Sequence", cat: "struct", children: [ { type: "condOppHasPuck", cat: "cond" }, { type: "actAggressiveGap", cat: "act" } ] },
    "CHASE_LOOSE": { tags: ["move", "defense", "aggro"], type: "Sequence", cat: "struct", children: [ { type: "condLoosePuck", cat: "cond" }, { type: "actSmartIntercept", cat: "act" } ] },
    "DEF_NET_FRONT": { tags: ["move", "defense", "passive"], type: "Sequence", cat: "struct", children: [ { type: "condOppHasPuck", cat: "cond" }, { type: "condPuckInDefZone", cat: "cond" }, { type: "actFormationTarget", cat: "act", offsetx: -200, offsety: 0 } ] },
    "SAFETY_VALVE": { tags: ["move", "defense", "passive"], type: "Sequence", cat: "struct", children: [ { type: "condIsLastMan", cat: "cond" }, { type: "actFormationTarget", cat: "act", offsetx: -150, offsety: 0 } ] },
    "SUP_O_ZONE": { tags: ["move", "offense", "support"], type: "Sequence", cat: "struct", children: [ { type: "condTeamHasPuck", cat: "cond" }, { type: "condPuckInOffZone", cat: "cond" }, { type: "actFormationTarget", cat: "act", offsetx: 100, offsety: 0 } ] },
    "SUP_CENTER": { tags: ["move", "support"], type: "Sequence", cat: "struct", children: [ { type: "condTeamHasPuck", cat: "cond" }, { type: "actFormationTarget", cat: "act", offsetx: -50, offsety: 0 } ] }
};

const AICoach = {
    active: false,
    stopRequested: false, 
    
    // Config
    opponents: [],
    roundsPerEpisode: 0,    
    maxEpisodes: 0,
    
    // Optimizer State
    bestPoints: -1,
    bestGoalDiff: -999,
    baselinePts: 0,
    
    bestJSON: null,    // The "Gold Standard" we revert to
    currentJSON: null, // The "Testing Mutant"
    
    currentEpisode: 0,
    mutationDetails: "",    
    mutationHistory: [], 

    // 1. INITIALIZE (Starts with a LOADED team)
    initTournamentTraining: function(json, opponents, rounds, episodes, manualBaseline = -1) {
        console.log(`🔧 OPTIMIZER: Polishing Mode Initialized for ${json.name}`);
        
        this.opponents = opponents;
        this.roundsPerEpisode = rounds;
        this.maxEpisodes = episodes;
        
        // Load the team into memory
        this.bestJSON = JSON.parse(JSON.stringify(json));
        this.currentJSON = JSON.parse(JSON.stringify(json));
        
        this.bestPoints = manualBaseline;
        this.bestGoalDiff = -999;
        this.baselinePts = manualBaseline > -1 ? manualBaseline : "Calculating...";

        this.currentEpisode = 0;
        this.active = true;
        this.stopRequested = false; 
        
        this.mutationDetails = "Establishing Baseline Performance";
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
        console.log(`\n⚙️ OPTIMIZING | Ep ${this.currentEpisode}`);
        console.log(`   > BASELINE: ${this.baselinePts} | CURRENT BEST: ${this.bestPoints}`);
        console.log(`   > ACTION: ${this.mutationDetails}`);

        const builder = (typeof StrategyInterpreter !== 'undefined') ? StrategyInterpreter : null;
        if (!builder) { console.error("StrategyInterpreter missing!"); return; }

        const mutantBrain = builder.buildTeamStrategy(this.currentJSON);
        
        Strategies["TRAINEE"] = {
            name: "Optimized_" + this.currentEpisode, 
            short: "OPT",
            code: "OPT",
            teamName: "Optimizer",
            colors: this.bestJSON.colors || { main: "#ffffff", secondary: "#000000" }, 
            think: mutantBrain
        };

        Tournament.startTrainingGauntlet("TRAINEE", this.opponents, this.roundsPerEpisode);
    },

    // 3. REPORTING (Ironclad Rules)
    reportTournamentResult: function(standings) {
        const stats = standings["TRAINEE"];
        if (!stats) return;

        const GP = stats.GP || 1;
        const Pts = stats.Pts;
        const GD = stats.GF - stats.GA;
        const SF = stats.totalSOGF || 0;
        const SA = stats.totalSOGA || 0;
        const avgSF = SF / GP;
        const avgSA = SA / GP;

        // Establish initial baseline if needed
        if (this.currentEpisode === 1 && this.bestPoints === -1) {
            this.baselinePts = Pts;
            this.bestPoints = Pts;
            this.bestGoalDiff = GD;
            this.prepareNextEpisode(true);
            return;
        }

        // --- IRONCLAD GATEKEEPERS ---
        const ruleHighEvent = (avgSF >= 8.0 && avgSA >= 8.0);
        const ruleShotDom   = (avgSF > avgSA);
        const ruleGoalDom   = (GD > 0);
        
        const isFunctional = (ruleHighEvent && ruleShotDom && ruleGoalDom);
        
        let improved = false;
        if (isFunctional) {
            if (Pts > this.bestPoints || (Pts === this.bestPoints && GD > this.bestGoalDiff)) {
                improved = true;
            }
        }

        if (improved) {
            console.log(`🚀 IMPROVEMENT FOUND! (${Pts} Pts)`);
            this.bestPoints = Pts;
            this.bestGoalDiff = GD;
            this.bestJSON = JSON.parse(JSON.stringify(this.currentJSON));
            this.bestJSON.name = `POLISHED_${Pts}PTS_Ep${this.currentEpisode}`;
            this.downloadJSON(this.bestJSON, `_Milestone_${Pts}pts`);
        } else {
            console.log(`❌ NO IMPROVEMENT. Reverting...`);
        }

        this.prepareNextEpisode(improved);
    },

    // 4. PREPARE NEXT (Single Mutant Step)
    prepareNextEpisode: function(lastWasGood) {
        if (!this.stopRequested && (this.maxEpisodes === -1 || this.currentEpisode < this.maxEpisodes)) {
            // ALWAYS start mutation from the best version found so far
            this.currentJSON = JSON.parse(JSON.stringify(this.bestJSON));
            this.mutateGenome(this.currentJSON); 
            this.startEpisode();
        } else {
            this.finalizeTraining();
        }
    },

    // 5. MUTATE (Gentle Tweaks)
    mutateGenome: function(genome) {
        const roles = ['c', 'rw', 'ld']; 
        const role = roles[Math.floor(Math.random() * roles.length)];
        const root = genome[role][0]; 
        if (!root || !root.children) return;
        
        const action = Math.random();
        const keys = Object.keys(LIBRARY);
        
        if (action < 0.25 && root.children.length > 1) {
            const i1 = Math.floor(Math.random() * root.children.length);
            let i2 = Math.floor(Math.random() * root.children.length);
            while(i1 === i2) i2 = Math.floor(Math.random() * root.children.length);
            [root.children[i1], root.children[i2]] = [root.children[i2], root.children[i1]];
            this.mutationDetails = `Swapping priorities for ${role.toUpperCase()}`;
        } 
        else if (action < 0.5) {
            const idx = Math.floor(Math.random() * root.children.length);
            const newKey = keys[Math.floor(Math.random() * keys.length)];
            root.children[idx] = JSON.parse(JSON.stringify(LIBRARY[newKey]));
            this.mutationDetails = `Replacing card in ${role.toUpperCase()} with ${newKey}`;
        }
        else if (action < 0.75 && root.children.length < 10) {
            const newKey = keys[Math.floor(Math.random() * keys.length)];
            root.children.push(JSON.parse(JSON.stringify(LIBRARY[newKey])));
            this.mutationDetails = `Adding ${newKey} to ${role.toUpperCase()} deck`;
        }
        else if (root.children.length > 2) {
            const idx = Math.floor(Math.random() * root.children.length);
            root.children.splice(idx, 1);
            this.mutationDetails = `Pruning logic from ${role.toUpperCase()}`;
        }
    },

    finalizeTraining: function() {
        console.log("🏁 OPTIMIZATION COMPLETE.");
        this.active = false;
        this.downloadJSON(this.bestJSON, "_FINAL_POLISHED");
        alert("Polishing session complete!");
        gameState = "menu"; 
    },

    downloadJSON: function(finalJSON, suffix) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(finalJSON, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `${finalJSON.name}${suffix}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }
};