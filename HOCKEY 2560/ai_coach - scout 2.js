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
// 2. THE FORENSIC SCOUT (Strict Filter + Clean Report)
// =============================================================================
const AICoach = {
    active: false,
    stopRequested: false, 
    
    // Configuration
    opponents: [],
    roundsPerEpisode: 0,    
    maxEpisodes: 0,
    
    // State
    mode: "HUNTING",
    polishingCounter: 0,
    POLISHING_LIMIT: 50,
    
    // Records
    globalBestPoints: -1,
    globalBestGoalDiff: -999,
    globalBestJSON: null,

    localBestPoints: -1,
    localBestGoalDiff: -999,
    localBestJSON: null,
    
    currentJSON: null,
    currentEpisode: 0,
    mutationDetails: "",    
    mutationHistory: [], 

    // 1. INITIALIZE 
    initTournamentTraining: function(json, opponents, rounds, episodes, manualBaseline = 55) {
        console.log(`🕵️ SCOUT: Initialized. Strict Activity Filter (SF>=8 && SA>=8) Active.`);
        
        this.opponents = opponents;
        this.roundsPerEpisode = rounds;
        this.maxEpisodes = episodes;
        
        this.globalBestPoints = manualBaseline; 
        this.globalBestGoalDiff = -999;
        this.globalBestJSON = null;

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
        this.mode = "HUNTING";
        this.polishingCounter = 0;
        this.localBestPoints = -1;
        this.localBestGoalDiff = -999;
        this.localBestJSON = null;
        this.currentJSON = this.createRandomGenome(); 
        this.mutationDetails = "New Smart Draft";
    },

    // 2. START EPISODE
    startEpisode: function() {
        if (this.stopRequested) {
            this.finalizeTraining();
            return;
        }

        this.currentEpisode++;
        console.log(`\n🎬 EP ${this.currentEpisode} | ${this.mode} | ${this.mutationDetails}`);

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
        if (!stats) { console.error("CRITICAL: Trainee stats missing!"); return; }

        const GP = stats.GP || 1;
        const Pts = stats.Pts;
        const GD = stats.GF - stats.GA;
        const SF = stats.totalSOGF || 0;
        const SA = stats.totalSOGA || 0;
        const avgSF = SF / GP;
        const avgSA = SA / GP; // Calculate Shots Against
        
        // --- CONSOLE REPORT (Includes SOW for forensic check) ---
        console.log(`📊 STATS: Pts:${Pts} | SF/G:${avgSF.toFixed(1)} | SA/G:${avgSA.toFixed(1)} | SOW:${stats.SOW}`);

        // 1. FUNCTIONALITY CHECK
        // STRICT MODE RESTORED: Must be a high-event game. 
        // Both teams must shoot > 8.0 times. No frozen games allowed.
        const isFunctional = (avgSF >= 8.0 && avgSA >= 8.0);
        
        if (!isFunctional) {
            console.log(`🗑️ DELETE: Dysfunctional (Low Activity)`);
            this.logHistory(stats, "DYSFUNCTIONAL");
            
            if (this.mode === "HUNTING") {
                this.currentJSON = this.createRandomGenome();
                this.mutationDetails = "Shuffle";
            } else {
                this.currentJSON = JSON.parse(JSON.stringify(this.localBestJSON));
                this.mutationDetails = "Reverted";
            }
        } 
        else {
            // FUNCTIONAL
            if (this.mode === "HUNTING") {
                console.log(`✨ PROSPECT FOUND! (Pts:${Pts}) -> Polishing`);
                this.mode = "POLISHING";
                this.polishingCounter = this.POLISHING_LIMIT;
                
                this.localBestPoints = Pts;
                this.localBestGoalDiff = GD;
                this.localBestJSON = JSON.parse(JSON.stringify(this.currentJSON));
                
                this.checkGlobalRecord(Pts, GD, this.currentJSON, GP);
            } 
            else {
                this.polishingCounter--;
                
                if (Pts > this.localBestPoints || (Pts === this.localBestPoints && GD > this.localBestGoalDiff)) {
                    console.log(`🚀 IMPROVED! (${Pts} > ${this.localBestPoints})`);
                    this.localBestPoints = Pts;
                    this.localBestGoalDiff = GD;
                    this.localBestJSON = JSON.parse(JSON.stringify(this.currentJSON));
                    this.checkGlobalRecord(Pts, GD, this.currentJSON, GP);
                } else {
                    console.log(`❌ No improvement.`);
                }

                if (this.polishingCounter <= 0) {
                    console.log(`🏁 CAMP DONE. Releasing.`);
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

    checkGlobalRecord: function(pts, gd, json, gp) {
        // 🛑 DOWNLOAD FILTER: 
        // If Points < Games Played (e.g., 30 pts in 45 games), it's not good enough to save.
        if (pts < gp) return;

        if (pts > this.globalBestPoints || (pts === this.globalBestPoints && gd > this.globalBestGoalDiff)) {
            console.log(`🏆 🚨 NEW KING! 🚨 (${pts} Pts)`);
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
            this.currentJSON = JSON.parse(JSON.stringify(this.localBestJSON));
            this.mutateGenome(this.currentJSON); 
            this.mutationDetails = "Refining...";
        }
        this.startEpisode();
    },

    // 5. UTILS (Smart Draft - Action First)
    createRandomGenome: function() {
        const roles = ['c', 'rw', 'ld']; 
        let genome = {
            name: "Random_Prospect",
            teamName: "PROSPECT",
            code: "PRO",
            colors: { main: "#"+Math.floor(Math.random()*16777215).toString(16), secondary: "#ffffff" },
            c:[], rw:[], ld:[] 
        };
        
        roles.forEach(role => {
            const deckSize = 3 + Math.floor(Math.random() * 5); 
            genome[role] = this.generateRandomDeck(deckSize);
        });
        return genome;
    },

    generateRandomDeck: function(size) {
        let deck = [];
        const keys = Object.keys(LIBRARY);
        
        // PRIORITY 1: ACTIONS (Shoot/Pass)
        const actKeys = keys.filter(k => LIBRARY[k].tags && LIBRARY[k].tags.includes("action"));
        if (actKeys.length > 0) {
            const k = actKeys[Math.floor(Math.random() * actKeys.length)];
            deck.push(JSON.parse(JSON.stringify(LIBRARY[k])));
        }

        // PRIORITY 2: MOVEMENT
        const moveKeys = keys.filter(k => LIBRARY[k].tags && LIBRARY[k].tags.includes("move"));
        if (moveKeys.length > 0) {
            const k = moveKeys[Math.floor(Math.random() * moveKeys.length)];
            deck.push(JSON.parse(JSON.stringify(LIBRARY[k])));
        }

        // PRIORITY 3: FILLER
        for(let i=2; i<size; i++) {
            const key = keys[Math.floor(Math.random() * keys.length)];
            deck.push(JSON.parse(JSON.stringify(LIBRARY[key])));
        }

        return [{ type: "Selector", cat: "struct", children: deck }]; 
    },

    mutateGenome: function(genome) {
        const roles = ['c', 'rw', 'ld']; 
        const role = roles[Math.floor(Math.random() * roles.length)];
        if (!genome[role]) return; 
        const root = genome[role][0]; 
        if (!root || !root.children) return;
        
        const action = Math.random();
        const keys = Object.keys(LIBRARY);
        
        if (action < 0.25 && root.children.length > 1) {
            const i1 = Math.floor(Math.random() * root.children.length);
            let i2 = Math.floor(Math.random() * root.children.length);
            while(i1 === i2) i2 = Math.floor(Math.random() * root.children.length);
            [root.children[i1], root.children[i2]] = [root.children[i2], root.children[i1]];
            this.mutationDetails = `Swap ${role.toUpperCase()}`;
        } 
        else if (action < 0.5) {
            const idx = Math.floor(Math.random() * root.children.length);
            const newKey = keys[Math.floor(Math.random() * keys.length)];
            root.children[idx] = JSON.parse(JSON.stringify(LIBRARY[newKey]));
            this.mutationDetails = `Replace ${role.toUpperCase()}`;
        }
        else if (action < 0.75 && root.children.length < 8) {
            const newKey = keys[Math.floor(Math.random() * keys.length)];
            root.children.push(JSON.parse(JSON.stringify(LIBRARY[newKey])));
            this.mutationDetails = `Add ${role.toUpperCase()}`;
        }
        else if (root.children.length > 3) {
            const idx = Math.floor(Math.random() * root.children.length);
            root.children.splice(idx, 1);
            this.mutationDetails = `Delete ${role.toUpperCase()}`;
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
            stats: { GP: stats.GP, Pts: stats.Pts, SF: stats.totalSOGF }
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
        let html = `<!DOCTYPE html><html><body style="background:#222;color:#eee"><h1>Scouting Report</h1><table border="1"><tr><th>Ep</th><th>Mode</th><th>Result</th><th>Pts</th><th>S/G</th></tr>`;
        sorted.forEach(r => {
             if (r.outcome === "DYSFUNCTIONAL") return;
             const spg = (r.stats.SF / (r.stats.GP || 1)).toFixed(1);
             html += `<tr><td>${r.episode}</td><td>${r.mode}</td><td>${r.outcome}</td><td>${r.stats.Pts}</td><td>${spg}</td></tr>`;
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