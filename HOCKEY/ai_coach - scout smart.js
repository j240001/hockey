// =============================================================================
// 1. STRATEGY LIBRARY (Tagged for Smart Drafting)
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
// 2. THE SMART SCOUT (3-Man Roster Edition)
// =============================================================================
const AICoach = {
    active: false,
    stopRequested: false, 
    
    // Configuration
    opponents: [],
    roundsPerEpisode: 0,    
    maxEpisodes: 0,
    
    // "The Scout" Variables
    mode: "HUNTING", // "HUNTING" or "POLISHING"
    polishingCounter: 0,
    POLISHING_LIMIT: 50, // How many episodes to refine a prospect
    
    // Global Records (The King)
    globalBestPoints: -1,
    globalBestGoalDiff: -999,
    globalBestJSON: null,

    // Local Records (The Prospect)
    localBestPoints: -1,
    localBestGoalDiff: -999,
    localBestJSON: null,
    
    // Current State
    currentJSON: null,
    currentEpisode: 0,
    mutationDetails: "",    
    mutationHistory: [], 

    // 1. INITIALIZE 
    initTournamentTraining: function(json, opponents, rounds, episodes, manualBaseline = 55) {
        console.log(`🕵️ SMART SCOUT: Initialized.`);
        console.log(`- Strategy: Smart Draft (Move/Act Guaranteed) -> Refine 50 eps -> Repeat`);
        
        this.opponents = opponents;
        this.roundsPerEpisode = rounds;
        this.maxEpisodes = episodes;
        
        // Initialize Global Records
        this.globalBestPoints = manualBaseline; 
        this.globalBestGoalDiff = -999;
        this.globalBestJSON = null;

        // Reset Local
        this.resetToHuntingMode();
        
        this.currentEpisode = 0;
        this.active = true;
        this.stopRequested = false; 
        this.mutationHistory = [];
        
        this.startEpisode();
    },

    stopTraining: function() {
        if (!this.active) return;
        this.stopRequested = true;
        console.log("🛑 STOP REQUESTED.");
    },

    resetToHuntingMode: function() {
        console.log("♻️ RETURNING TO THE HUNT (Drafting new prospect)...");
        this.mode = "HUNTING";
        this.polishingCounter = 0;
        this.localBestPoints = -1;
        this.localBestGoalDiff = -999;
        this.localBestJSON = null;
        this.currentJSON = this.createRandomGenome(); // Start fresh
        this.mutationDetails = "New Smart Draft Prospect";
    },

    // 2. START EPISODE
    startEpisode: function() {
        if (this.stopRequested) {
            this.finalizeTraining();
            return;
        }

        this.currentEpisode++;
        
        // UI Logging
        let modeIcon = this.mode === "HUNTING" ? "🔎" : "🛠️";
        let subStatus = this.mode === "HUNTING" ? "Drafting..." : `Camp Day ${this.POLISHING_LIMIT - this.polishingCounter}`;
        console.log(`\n🎬 EPISODE ${this.currentEpisode} | ${modeIcon} ${this.mode}: ${subStatus}`);

        // Build Strategy
        const builder = (typeof StrategyInterpreter !== 'undefined') ? StrategyInterpreter : null;
        if (!builder) { console.error("StrategyInterpreter missing!"); return; }

        const mutantBrain = builder.buildTeamStrategy(this.currentJSON);
        
        Strategies["TRAINEE"] = {
            name: "Prospect_" + this.currentEpisode, 
            short: "PRO",
            code: "PRO",
            teamName: "Prospect",
            colors: { main: "#"+Math.floor(Math.random()*16777215).toString(16), secondary: "#ffffff" }, 
            think: mutantBrain
        };

        Tournament.startTrainingGauntlet("TRAINEE", this.opponents, this.roundsPerEpisode);
    },

    // 3. REPORTING
    reportTournamentResult: function(standings) {
        const stats = standings["TRAINEE"];
        if (!stats) { console.error("Trainee missing!"); return; }

        const gamesPlayed = stats.GP || 1;
        const points = stats.Pts;
        const goalDiff = stats.GF - stats.GA;
        const shotsFor = stats.totalSOGF || 0;
        const shotsAgainst = stats.totalSOGA || 0;
        const avgShotsFor = shotsFor / gamesPlayed;
        const avgShotsAgainst = shotsAgainst / gamesPlayed;

        console.log(`📊 REPORT: Pts:${points} (Best:${this.globalBestPoints}) | GD:${goalDiff} | SF:${avgShotsFor.toFixed(1)} SA:${avgShotsAgainst.toFixed(1)}`);
        
        // 1. FUNCTIONALITY CHECK
        const isFunctional = (avgShotsFor >= 8.0 && avgShotsAgainst >= 8.0);
        
        if (!isFunctional) {
            // DYSFUNCTIONAL
            console.log(`⚠️ DYSFUNCTIONAL (SF:${avgShotsFor.toFixed(1)}). Discarding.`);
            this.logHistory(stats, "DYSFUNCTIONAL");
            
            if (this.mode === "HUNTING") {
                this.currentJSON = this.createRandomGenome();
                this.mutationDetails = "Shuffle (Previous Dysfunctional)";
            } else {
                this.currentJSON = JSON.parse(JSON.stringify(this.localBestJSON));
                this.mutationDetails = "Reverted (Polishing Break)";
            }
        } 
        else {
            // FUNCTIONAL TEAM
            if (this.mode === "HUNTING") {
                console.log(`✨ PROSPECT FOUND! Switching to Polishing Mode.`);
                this.mode = "POLISHING";
                this.polishingCounter = this.POLISHING_LIMIT;
                
                this.localBestPoints = points;
                this.localBestGoalDiff = goalDiff;
                this.localBestJSON = JSON.parse(JSON.stringify(this.currentJSON));
                
                this.checkGlobalRecord(points, goalDiff, this.currentJSON);
            } 
            else {
                this.polishingCounter--;
                
                if (points > this.localBestPoints || (points === this.localBestPoints && goalDiff > this.localBestGoalDiff)) {
                    console.log(`🚀 LOCAL IMPROVEMENT! (Camp Record)`);
                    this.localBestPoints = points;
                    this.localBestGoalDiff = goalDiff;
                    this.localBestJSON = JSON.parse(JSON.stringify(this.currentJSON));
                    this.checkGlobalRecord(points, goalDiff, this.currentJSON);
                } else {
                    console.log(`❌ Failed to improve prospect.`);
                }

                if (this.polishingCounter <= 0) {
                    console.log(`🏁 TRAINING CAMP FINISHED. Releasing prospect.`);
                    this.resetToHuntingMode();
                }
            }
        }

        if (!this.stopRequested && (this.maxEpisodes === -1 || this.currentEpisode < this.maxEpisodes)) {
            this.prepareNextEpisode();
        } else {
            this.finalizeTraining();
        }
    },

    checkGlobalRecord: function(pts, gd, json) {
        if (pts > this.globalBestPoints || (pts === this.globalBestPoints && gd > this.globalBestGoalDiff)) {
            console.log(`🏆 🚨 NEW WORLD RECORD! 🚨 (${pts} Pts)`);
            this.globalBestPoints = pts;
            this.globalBestGoalDiff = gd;
            this.globalBestJSON = JSON.parse(JSON.stringify(json));
            this.globalBestJSON.name = `CHAMPION_${pts}PTS_Ep${this.currentEpisode}`;
            this.downloadJSON(this.globalBestJSON, "_NEW_KING");
        }
    },

    // 4. PREPARE NEXT
    prepareNextEpisode: function() {
        if (this.mode === "HUNTING") {
            if (!this.currentJSON) this.currentJSON = this.createRandomGenome();
        } 
        else {
            // POLISHING: Mutate the Local Best
            this.currentJSON = JSON.parse(JSON.stringify(this.localBestJSON));
            this.mutateGenome(this.currentJSON); 
            this.mutationDetails = "Refining Prospect";
        }
        this.startEpisode();
    },

    // 5. UTILS (Smart Draft & Mutators)
    createRandomGenome: function() {
        // !!! CUSTOMIZED FOR 3-MAN ROSTER !!!
        const roles = ['c', 'rw', 'ld']; 
        let genome = {
            name: "Random_Prospect",
            teamName: "PROSPECT",
            code: "PRO",
            colors: { main: "#"+Math.floor(Math.random()*16777215).toString(16), secondary: "#ffffff" },
            c:[], rw:[], ld:[] // Only initializing these 3
        };
        
        roles.forEach(role => {
            const deckSize = 3 + Math.floor(Math.random() * 5); // 3-7 cards
            genome[role] = this.generateRandomDeck(deckSize);
        });
        return genome;
    },

    generateRandomDeck: function(size) {
        let deck = [];
        const keys = Object.keys(LIBRARY);
        
        // --- PRIORITY 1: OFFENSIVE ACTIONS (Shoot/Pass) ---
        // Must check this FIRST. If we can shoot, we should shoot.
        // If we put Movement first, we will carry forever and never shoot.
        const actKeys = keys.filter(k => LIBRARY[k].tags && LIBRARY[k].tags.includes("action"));
        if (actKeys.length > 0) {
            const k = actKeys[Math.floor(Math.random() * actKeys.length)];
            deck.push(JSON.parse(JSON.stringify(LIBRARY[k])));
        }

        // --- PRIORITY 2: MOVEMENT (Chase/Carry/Position) ---
        // This is the fallback. If we can't shoot, we move.
        const moveKeys = keys.filter(k => LIBRARY[k].tags && LIBRARY[k].tags.includes("move"));
        if (moveKeys.length > 0) {
            const k = moveKeys[Math.floor(Math.random() * moveKeys.length)];
            deck.push(JSON.parse(JSON.stringify(LIBRARY[k])));
        }

        // --- PRIORITY 3: WILDCARDS (Random Flavor) ---
        // Fill the rest of the deck with random cards
        for(let i=2; i<size; i++) {
            const key = keys[Math.floor(Math.random() * keys.length)];
            deck.push(JSON.parse(JSON.stringify(LIBRARY[key])));
        }

        // Wrap in Selector structure
        return [{ type: "Selector", cat: "struct", children: deck }]; 
    },

    mutateGenome: function(genome) {
        const roles = ['c', 'rw', 'ld']; // Only mutate active players
        const role = roles[Math.floor(Math.random() * roles.length)];
        if (!genome[role]) return; // Safety check
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
            this.mutationDetails = `Swap ${role.toUpperCase()} cards`;
        } 
        else if (action < 0.5) {
            // REPLACE
            const idx = Math.floor(Math.random() * root.children.length);
            const newKey = keys[Math.floor(Math.random() * keys.length)];
            root.children[idx] = JSON.parse(JSON.stringify(LIBRARY[newKey]));
            this.mutationDetails = `Replace ${role.toUpperCase()} card`;
        }
        else if (action < 0.75 && root.children.length < 8) {
            // ADD
            const newKey = keys[Math.floor(Math.random() * keys.length)];
            root.children.push(JSON.parse(JSON.stringify(LIBRARY[newKey])));
            this.mutationDetails = `Add ${role.toUpperCase()} card`;
        }
        else if (root.children.length > 3) {
            // DELETE
            const idx = Math.floor(Math.random() * root.children.length);
            root.children.splice(idx, 1);
            this.mutationDetails = `Delete ${role.toUpperCase()} card`;
        }
    },

    finalizeTraining: function() {
        console.log("🎓 SCOUTING REPORT COMPLETE.");
        this.active = false;
        
        if (this.globalBestJSON) {
            this.downloadJSON(this.globalBestJSON, "_GRAND_CHAMPION");
        }
        this.downloadHistory(); 
        alert("Scouting Complete!");
        gameState = "menu"; 
    },
    
    logHistory: function(stats, outcome) {
        this.mutationHistory.push({
            episode: this.currentEpisode,
            mode: this.mode,
            outcome: outcome,
            stats: { GP: stats.GP, Pts: stats.Pts, SF: stats.totalSOGF, SA: stats.totalSOGA }
        });
    },

    downloadJSON: function(finalJSON, suffix) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(finalJSON, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `THE_SCOUT${suffix}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    },

    downloadHistory: function() {
        const sorted = [...this.mutationHistory].reverse();
        let html = `<!DOCTYPE html><html><body style="background:#222;color:#eee"><h1>Scouting Report</h1><table border="1"><tr><th>Ep</th><th>Mode</th><th>Result</th><th>Pts</th></tr>`;
        sorted.forEach(r => {
             html += `<tr><td>${r.episode}</td><td>${r.mode}</td><td>${r.outcome}</td><td>${r.stats.Pts}</td></tr>`;
        });
        html += `</table></body></html>`;
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "SCOUT_REPORT.html";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }
};