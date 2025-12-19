// =============================================================================
// AI COACH - FINE OPTIMIZER - EASY
// =============================================================================
const LIBRARY = {
    // --- OFFENSE: SHOOTING ---
    "SHOOT_SIGHT": {
        tags: ["action", "offense"],
        type: "Sequence", cat: "struct",
        children: [ { type: "condHasPuck", cat: "cond" }, { type: "condInShotRange", cat: "cond" }, { type: "actShoot", cat: "act" } ]
    },
    "SHOOT_LONG": {
        tags: ["action", "offense"],
        type: "Sequence", cat: "struct",
        children: [ { type: "condHasPuck", cat: "cond" }, { type: "condPuckInOffZone", cat: "cond" }, { type: "actShoot", cat: "act" } ]
    },

    // --- OFFENSE: PASSING ---
    "PASS_AGGRO": {
        tags: ["action", "offense", "pass"],
        type: "Sequence", cat: "struct",
        children: [
            { type: "condHasPuck", cat: "cond" }, { type: "condPuckInOffZone", cat: "cond" },
            { type: "condWeightedPassCheck", cat: "cond", bias: 20, fear: 30, vision: 90 },
            { type: "actSmartPass", cat: "act" }
        ]
    },
    "PASS_SAFE": {
        tags: ["action", "pass"],
        type: "Sequence", cat: "struct",
        children: [
            { type: "condHasPuck", cat: "cond" },
            { type: "condWeightedPassCheck", cat: "cond", bias: 80, fear: 80, vision: 40 },
            { type: "actSmartPass", cat: "act" }
        ]
    },
    "PASS_D_ZONE": {
        tags: ["action", "defense", "pass"],
        type: "Sequence", cat: "struct",
        children: [ { type: "condHasPuck", cat: "cond" }, { type: "condPuckInDefZone", cat: "cond" }, { type: "actSmartPass", cat: "act" } ]
    },

    // --- OFFENSE: CARRYING ---
    "CARRY_BASIC": {
        tags: ["action", "move"],
        type: "Sequence", cat: "struct",
        children: [ { type: "condHasPuck", cat: "cond" }, { type: "actExecuteCarry", cat: "act" } ]
    },
    "CARRY_DEEP": {
        tags: ["action", "move", "offense"],
        type: "Sequence", cat: "struct",
        children: [ { type: "condHasPuck", cat: "cond" }, { type: "actFormationTarget", cat: "act", offsetx: 250, offsety: 100 } ]
    },

    // --- DEFENSE: CHASING ---
    "CHASE_PUCK": {
        tags: ["move", "defense", "aggro"],
        type: "Sequence", cat: "struct",
        children: [ { type: "condOppHasPuck", cat: "cond" }, { type: "actAggressiveGap", cat: "act" } ]
    },
    "CHASE_LOOSE": {
        tags: ["move", "defense", "aggro"],
        type: "Sequence", cat: "struct",
        children: [ { type: "condLoosePuck", cat: "cond" }, { type: "actSmartIntercept", cat: "act" } ]
    },

    // --- DEFENSE: POSITIONING ---
    "DEF_NET_FRONT": {
        tags: ["move", "defense", "passive"],
        type: "Sequence", cat: "struct",
        children: [
            { type: "condOppHasPuck", cat: "cond" }, { type: "condPuckInDefZone", cat: "cond" },
            { type: "actFormationTarget", cat: "act", offsetx: -200, offsety: 0 }
        ]
    },
    "SAFETY_VALVE": {
        tags: ["move", "defense", "passive"],
        type: "Sequence", cat: "struct",
        children: [ { type: "condIsLastMan", cat: "cond" }, { type: "actFormationTarget", cat: "act", offsetx: -150, offsety: 0 } ]
    },
    
    // --- SUPPORT / OFF-PUCK ---
    "SUP_O_ZONE": {
        tags: ["move", "offense", "support"],
        type: "Sequence", cat: "struct",
        children: [
            { type: "condTeamHasPuck", cat: "cond" }, { type: "condPuckInOffZone", cat: "cond" },
            { type: "actFormationTarget", cat: "act", offsetx: 100, offsety: 0 }
        ]
    },
    "SUP_CENTER": {
        tags: ["move", "support"],
        type: "Sequence", cat: "struct",
        children: [ { type: "condTeamHasPuck", cat: "cond" }, { type: "actFormationTarget", cat: "act", offsetx: -50, offsety: 0 } ]
    }
};


// =============================================================================
// 2. THE TEAM OPTIMIZER
// =============================================================================
const AICoach = {
    active: false,
    stopRequested: false, 
    
    // Configuration
    opponents: [],
    roundsPerEpisode: 0,    
    maxEpisodes: 0,
    
    // State
    bestPoints: -1,
    bestGoalDiff: -999,
    
    // The "Patient" (The team being optimized)
    bestJSON: null,
    currentJSON: null,
    
    currentEpisode: 0,
    mutationDetails: "",    
    
    // Dashboard Tracking
    baselinePts: 0,

    // 1. INITIALIZE (Takes the LOADED JSON, not random)
    initTournamentTraining: function(json, opponents, rounds, episodes, manualBaseline = -1) {
        console.log(`🔧 TEAM OPTIMIZER: Initialized.`);
        console.log(`- Optimization Target: ${json.name}`);
        console.log(`- Strategy: Infinite Hill Climbing`);
        
        this.opponents = opponents;
        this.roundsPerEpisode = rounds;
        this.maxEpisodes = episodes;
        
        // Initialize Baseline from Input
        this.baselinePts = "N/A (First Run)";
        this.bestPoints = manualBaseline; 
        this.bestGoalDiff = -999;
        
        // DEEP COPY THE LOADED TEAM
        this.bestJSON = JSON.parse(JSON.stringify(json)); 
        this.currentJSON = JSON.parse(JSON.stringify(json)); 

        this.currentEpisode = 0;
        this.active = true;
        this.stopRequested = false; 
        
        // No mutation on Episode 1 (Establish Baseline)
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
        
        // --- DASHBOARD ---
        console.log(`\n⚙️ OPTIMIZING | Ep ${this.currentEpisode}`);
        if (this.currentEpisode > 1) {
            console.log(`   > BASELINE: ${this.baselinePts} Pts`);
            console.log(`   > CURRENT BEST: ${this.bestPoints} Pts`);
            console.log(`   > CHANGE: ${this.mutationDetails}`);
        } else {
             console.log(`   > Establishing Baseline Performance...`);
        }

        const builder = (typeof StrategyInterpreter !== 'undefined') ? StrategyInterpreter : null;
        if (!builder) { console.error("StrategyInterpreter missing!"); return; }

        const mutantBrain = builder.buildTeamStrategy(this.currentJSON);
        
        Strategies["TRAINEE"] = {
            name: "Optimizing_" + this.currentEpisode, 
            short: "OPT",
            code: "OPT",
            teamName: "Optimizer",
            colors: { main: "#00ffcc", secondary: "#000000" }, 
            think: mutantBrain
        };

        // Run the Gauntlet
        Tournament.startTrainingGauntlet("TRAINEE", this.opponents, this.roundsPerEpisode);
    },

    // 3. REPORTING
    reportTournamentResult: function(standings) {
        const stats = standings["TRAINEE"];
        if (!stats) { console.error("Trainee stats missing!"); return; }

        const GP = stats.GP || 1;
        const Pts = stats.Pts;
        const GD = stats.GF - stats.GA;
        const SF = stats.totalSOGF || 0;
        const avgSF = SF / GP;

        console.log(`   > RESULT: ${Pts} Pts | GD: ${GD} | SF: ${avgSF.toFixed(1)}`);
        
        // Special Case: Episode 1 (Baseline)
        if (this.currentEpisode === 1) {
            this.baselinePts = Pts;
            this.bestPoints = Pts;
            this.bestGoalDiff = GD;
            console.log(`   > BASELINE SET: ${Pts} Pts`);
            this.prepareNextEpisode(true); // Always proceed from baseline
            return;
        }

        // --- OPTIMIZATION LOGIC ---
        
        // 1. SAFETY CHECK (Did the mutation break the team?)
        // If shots drop below 4.0, it's too passive/broken.
        const isFunctional = (avgSF >= 4.0); 

        // 2. DID WE IMPROVE?
        let improved = false;
        
        if (isFunctional) {
            if (Pts > this.bestPoints) {
                improved = true;
            } else if (Pts === this.bestPoints && GD > this.bestGoalDiff) {
                improved = true;
            }
        }

        if (improved) {
            console.log(`🚀 IMPROVEMENT! New Best: ${Pts} Pts`);
            this.bestPoints = Pts;
            this.bestGoalDiff = GD;
            this.bestJSON = JSON.parse(JSON.stringify(this.currentJSON)); // Save the mutant
            this.bestJSON.name = `OPTIMIZED_${Pts}PTS_Ep${this.currentEpisode}`;
            
            // Auto-Save Milestone
            this.downloadJSON(this.bestJSON, `_IMPROVED_${Pts}pts`);
        } else {
            const reason = isFunctional ? "Worse Score" : "Dysfunctional (Low Shots)";
            console.log(`❌ REVERTING: ${reason}`);
        }

        if (!this.stopRequested && (this.maxEpisodes === -1 || this.currentEpisode < this.maxEpisodes)) {
            // Pass 'improved' status to decide whether to mutate the NEW or OLD json
            this.prepareNextEpisode(improved);
        } else {
            this.finalizeTraining();
        }
    },

    // 4. PREPARE NEXT (MUTATION)
    prepareNextEpisode: function(lastWasImprovement) {
        // If last was good, we mutate the NEW best.
        // If last was bad, we revert to the OLD best (saved in bestJSON) and try a different mutation.
        
        // ALWAYS Reset to best known version before mutating
        this.currentJSON = JSON.parse(JSON.stringify(this.bestJSON));
        
        this.mutateGenome(this.currentJSON);
        this.startEpisode();
    },

    // 5. UTILS (Mutation)
    mutateGenome: function(genome) {
        const roles = ['c', 'rw', 'ld']; // Only mutate active players
        const role = roles[Math.floor(Math.random() * roles.length)];
        const root = genome[role][0]; 
        
        if (!root || !root.children) return;
        
        const action = Math.random();
        const keys = Object.keys(LIBRARY);
        
        if (action < 0.25 && root.children.length > 1) {
            // SWAP
            const i1 = Math.floor(Math.random() * root.children.length);
            let i2 = Math.floor(Math.random() * root.children.length);
            while(i1 === i2) i2 = Math.floor(Math.random() * root.children.length);
            [root.children[i1], root.children[i2]] = [root.children[i2], root.children[i1]];
            this.mutationDetails = `Swap ${role.toUpperCase()} Cards`;
        } 
        else if (action < 0.5) {
            // REPLACE
            const idx = Math.floor(Math.random() * root.children.length);
            const newKey = keys[Math.floor(Math.random() * keys.length)];
            root.children[idx] = JSON.parse(JSON.stringify(LIBRARY[newKey]));
            this.mutationDetails = `Replace ${role.toUpperCase()} Card`;
        }
        else if (action < 0.75 && root.children.length < 8) {
            // ADD
            const newKey = keys[Math.floor(Math.random() * keys.length)];
            root.children.push(JSON.parse(JSON.stringify(LIBRARY[newKey])));
            this.mutationDetails = `Add ${role.toUpperCase()} Card`;
        }
        else if (root.children.length > 2) { 
            // DELETE (Keep min 2)
            const idx = Math.floor(Math.random() * root.children.length);
            root.children.splice(idx, 1);
            this.mutationDetails = `Delete ${role.toUpperCase()} Card`;
        } else {
            this.mutationDetails = "No Change (Deck size limit)";
        }
    },

    finalizeTraining: function() {
        console.log("🎓 OPTIMIZATION COMPLETE.");
        this.active = false;
        if (this.bestJSON) {
            this.downloadJSON(this.bestJSON, "_FINAL");
        }
        alert("Optimization Complete!");
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