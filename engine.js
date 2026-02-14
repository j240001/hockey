// =========================================================
// UNIFIED GAME ENGINE (Physics & Rules Core)
// =========================================================

const Engine = {
    
    /**
     * PROCESS A SINGLE FRAME OF ACTIVE GAMEPLAY
     * Handles: Physics, Collisions, Rules, AI Movement
     * Does NOT Handle: Timers, Whistles, Celebrations (yet)
     */
    stepGameFrame: function() {
        
        // 1. FACEOFF DROP (Transition from Stoppage to Play)
        // Checks if waitingForFaceoffDrop is true, drops puck, clears flag.
        if (typeof processFaceoffDrop === 'function') {
            processFaceoffDrop();
        }

        this.updateStats();

        // 2. PUCK PHYSICS
        puck.update();
        
        if (typeof updateDroppedSticks === 'function') {
            updateDroppedSticks();
        }

        // 3. RULES ENGINE
        // (Helpers.js functions)
        checkOffsides();
        checkIcing();
        checkDeadPuck();

        // 4. GOAL & NET PHYSICS
        checkGoal(); 
        if (typeof resolveGoalCollisions === 'function') {
            resolveGoalCollisions(puck);
        }
        
        checkGoalieHarassment();
        checkNetPinning();

        if (typeof detectPuckStuckInNet === 'function' && detectPuckStuckInNet()) {
             if (typeof whistle === 'function') whistle("Net Mesh Stoppage");
             return; // Stop processing this frame
        }

        // 5. BOUNDARY CHECKS
        if (puckEscapedRink()) {
            handlePuckEscape();
        }

        // 6. COOLDOWNS
        if (typeof puckStealCooldown !== 'undefined' && puckStealCooldown > 0) {
            puckStealCooldown--;
        }

        // 7. PLAYER PHYSICS LOOP
        for (const p of players) {
            updatePlayer(p); // Movement & AI

            // Player vs Net
            if (typeof resolveGoalCollisions === 'function') {
                resolveGoalCollisions(p);
            }
            if (typeof blockPlayerFromGoal === 'function') {
                blockPlayerFromGoal(p);
            }

            // Player vs Boards
            enforcePlayerWalls(p);
        }

        // 8. PLAYER VS PLAYER COLLISIONS
        resolvePlayerCollisions();


    },


/**
     * TRACKS STATS (Attack Zone Time, etc.)
     */
    updateStats: function() {
        // 1. Define Zone Boundaries
        const BLUE_LINE_LEFT = 390;  
        const BLUE_LINE_RIGHT = 610; 
        
        // 2. Identify Current Sides
        // team0AttacksRight is TRUE in P1/P3.
        // If Team 0 attacks Right, they Defend Left.
        const visDefendsLeft = (typeof team0AttacksRight !== 'undefined') ? team0AttacksRight : true;

        // 3. Check Puck Position
        const dt = 1/60; 

        if (puck.x < BLUE_LINE_LEFT) {
            // --- LEFT ZONE ---
            if (visDefendsLeft) {
                // Visitor is Defending Left -> HOME IS ATTACKING
                if (typeof LiveStats !== 'undefined') LiveStats.attackTime.home += dt;
            } else {
                // Home is Defending Left -> VISITOR IS ATTACKING
                if (typeof LiveStats !== 'undefined') LiveStats.attackTime.vis += dt;
            }
        } 
        else if (puck.x > BLUE_LINE_RIGHT) {
            // --- RIGHT ZONE ---
            if (visDefendsLeft) {
                // Visitor Defends Left, so Home Defends Right -> VISITOR IS ATTACKING
                if (typeof LiveStats !== 'undefined') LiveStats.attackTime.vis += dt;
            } else {
                // Home Defends Left, so Visitor Defends Right -> HOME IS ATTACKING
                if (typeof LiveStats !== 'undefined') LiveStats.attackTime.home += dt;
            }
        }
        // Else: Neutral Zone (No stats)
    },




    /**
     * PROCESS PHYSICS DURING CELEBRATIONS
     * (Players keep skating, puck bounces, but no rules are enforced)
     */
    stepCelebrationFrame: function() {
        puck.update();
        if (typeof collideCircleWithRink === 'function') {
             collideCircleWithRink(puck, puck.r, 0.8);
        }
        for (const p of players) { 
            updatePlayer(p); 
            enforcePlayerWalls(p); 
        }
        resolvePlayerCollisions();
    },

    /**
     * HANDLE STOPPAGE TIMERS (Whistles & Goals)
     * Returns a string indicating if a UI event is needed:
     * - "CONTINUE": No timer finished
     * - "RESET_DONE": A simple reset (faceoff) was handled internally
     * - "GOAL_RESET": A goal timer finished (trigger replay/reset logic)
     * - "SUDDEN_DEATH": Sudden death timer finished (trigger game over)
     */
    handleStoppageTimers: function(now) {
        
        // 1. Whistle Timer (Simple Reset)
        if (whistleEndTimer && now >= whistleEndTimer) {
            whistleEndTimer = null;
            if (typeof doFaceoffReset === 'function') {
                // Use the global nextFaceoffSpot
                doFaceoffReset(nextFaceoffSpot.x, nextFaceoffSpot.y);
            }
            return "RESET_DONE";
        }

        // 2. Goal Timer (Complex Reset)
        if (goalResetTimer && now >= goalResetTimer) {
            goalResetTimer = null;

            // Check for Sudden Death
            if (typeof isSuddenDeathGoal !== 'undefined' && isSuddenDeathGoal) {
                return "SUDDEN_DEATH";
            }
            
            // Standard Goal
            return "GOAL_RESET";
        }

        return "CONTINUE";
    }
};