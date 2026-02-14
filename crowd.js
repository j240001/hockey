let masterCrowd = []; // This holds every fan's data
let firstWhistleBlown = false; // Starts false, becomes true after the first whistle
let currentDisappointment = 0;

// --- AMBIENT TUNING (The "Normal" Look) ---
let AMBIENT_EXCITEMENT = 0.04; // 4% of crowd moves (Try 0.02 to 0.08)
let AMBIENT_RANGE = 0.4;      // Move +/- 0.8px (Try 0.5 to 1.5)
let AMBIENT_SPEED = 7;       // Update every 10 frames (Higher = Calmer)

// --- CURRENT LIVE STATE (The engine actually uses these) ---
let team0Excitement = AMBIENT_EXCITEMENT; // Visitors
let team1Excitement = AMBIENT_EXCITEMENT; // Home
let fidgetRange = AMBIENT_RANGE;
let fidgetSpeed = AMBIENT_SPEED;

function createMasterCrowd() {


    const skinTones = [
        '#ffdbac', // Pale
        '#f1c27d', // Tan
        '#e0ac69', // Medium
        '#8d5524', // Deep
        '#c68642'  // Bronze
    ];
    const hairColors = ['#442211', '#221100', '#B8860B', '#63472b', '#111111'];
    const casualColors = [
        '#ffffff', // Pure White
        '#f4f4f4', // Off-White / Light Grey
        '#2c3e50', // Navy Blue
        '#5d6d7e', // Steel Blue
        '#34495e', // Slate
        '#707b7c', // Charcoal
        '#5D4037', // Dark Brown
        '#8D6E63', // Light Brown
        '#1B2631'  // Near Black
    ];

    masterCrowd = [];
    firstWhistleBlown = false; 
    const visitor = Team0_Strategy; 
    const home = Team1_Strategy;

    // 1. HOME ATTENDANCE (Bandwagon Factor)
    // Rank 1 (Top) = 5% no-shows | Rank 18 (Bottom) = 55% no-shows
    const homeRank = getRank(home.id); 
    
    // --- TUNING GUIDE ---
    // Rank 1 (Top) Probability: 0.05 (5% empty)
    // Rank 18 (Bottom) Probability: 0.05 + (17 * 0.03) = 0.56 (56% empty)
    // To make the crowd THICKER: Decrease the 0.03 (e.g., 0.02)
    // To make the crowd THINNER: Increase the 0.03 (e.g., 0.04)
    const noShowProb = 0.02 + ((homeRank - 1) * 0.015); 

    // 2. VISITOR TAKEOVER (Rank + Canadian Factors)
    // Base visitor chance is 5%
    let visitorChance = 0.15; 
    
    // A. Rank Bonus: High-ranking visitors bring more fans (Up to 10% bonus)
    const visitorRank = getRank(visitor.id);
    visitorChance += (19 - visitorRank) * 0.006; 

    // B. Canadian Bonus: Flat 15% boost if it's a Canadian team
    const canadianTeams = ["bt1", "bt2", "bt5", "bt6", "bt7", "bt8", "bt9"];
    if (canadianTeams.includes(visitor.id)) {
        visitorChance += 0.08;
    }

    SEAT_LOCATIONS.forEach((seat, index) => {
        // First check if the seat is even occupied (Home Rank logic)
        if (Math.random() < noShowProb) return; 

        // Then check if the fan is a Home fan or a Visitor
        // We use our new dynamic visitorChance
        const isHomeFan = Math.random() > visitorChance;
        const team = isHomeFan ? home : visitor;
        
        masterCrowd.push({
            x: seat.x,
            y: seat.y,
            isHome: isHomeFan,
            color: (Math.random() < 0.7) ? team.colors.main : team.colors.secondary,
            
            skin: skinTones[Math.floor(Math.random() * skinTones.length)],
            isCasual: Math.random() < 0.50, // 50% wear random clothes
            casualColor: casualColors[Math.floor(Math.random() * casualColors.length)],
            headStyle: Math.floor(Math.random() * 3), // 0: Bald, 1: Hair, 2: Hat
            hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
            hatColor: (Math.random() < 0.5) ? team.colors.main : team.colors.secondary,

            // Random scattering for exodus
            leaverThreshold: Math.random(), 

            hasLeft: false,
            
            // Late arrival sequence fix (30% as settled)
            isLate: Math.random() < 0.30, 


            // =============================================
            // *** NEW: WAVE PERSONALITY TRAITS ***
            // =============================================
            
            // 1. PARTICIPATION:
            // Must be a Home Fan AND pass an 80% enthusiasm check.
            // If false, they will never stand for the wave.
            waveActive: isHomeFan && (Math.random() < 0.80),

            // 2. TIMING VARIANCE (The "Messy" Factor):
            // We add a random offset to their X position for the wave calculation.
            // Range: -40 to +40 pixels. 
            // Negative = Early/Anticipating. Positive = Late/Slow reaction.
            waveOffset: (Math.random() - 0.5) * 80,

            // 3. EFFORT LEVEL:
            // 1.0 = Full Stand. 0.3 = Barely lifts butt off seat.
            // We favor higher effort (0.6 to 1.1) but allow for lazy fans.
            waveEffort: 0.5 + (Math.random() * 0.6),
            
            // =============================================

            fidgetX: 0, 
            fidgetY: 0, 
            fidgetAngle: 0
        });
    });

    generateCrowd(0);
}





function getRank(teamID) {
    // Access the standings object from tournament.js
    if (!Tournament || !Tournament.standings) return 9;

    // Convert the object into an array so we can sort it
    const teamsArray = Object.values(Tournament.standings);
    if (teamsArray.length === 0) return 9;

    // Sort by points (highest to lowest)
    teamsArray.sort((a, b) => b.Pts - a.Pts);

    // Find the rank of the specific team
    const index = teamsArray.findIndex(t => t.id === teamID);
    
    // Return rank (1-18), or 9 (middle) if team not found
    return (index !== -1) ? (index + 1) : 9;
}


function calculateExodus() {
    if (currentPeriod < 3) {
        currentDisappointment = 0;
        return;
    }

    let scoreDiff = scoreTeam1 - scoreTeam0; 

    if (scoreDiff < 0) {
        let intensity = Math.abs(scoreDiff) * 0.2; 
        let timeFactor = (GAME_DURATION_SECONDS - timeRemaining) / GAME_DURATION_SECONDS; 
        currentDisappointment = intensity * timeFactor;

        // --- THE "GOODBYE" LOGIC ---
        // Iterate through the crowd and lock in those who leave
        masterCrowd.forEach(fan => {
            if (fan.isHome && !fan.hasLeft) {
                if (currentDisappointment > fan.leaverThreshold) {
                    fan.hasLeft = true;
                }
            }
        });
    }
}



function updateCrowdVisuals() {
    let disappointment = 0;

    const awayScore = scoreTeam0; 
    const homeScore = scoreTeam1;
    const goalDiff = awayScore - homeScore;

    // Trigger exodus if losing by 3 or more in the 3rd period
    if (currentPeriod === 3 && goalDiff >= 3) {
        // CALCULATE AGGRESSION:
        // We want a "dramatic" exit. Instead of linear, we use a multiplier.
        // As time passes, the disappointment grows much faster.
        const timePercent = (GAME_DURATION_SECONDS - timeRemaining) / GAME_DURATION_SECONDS;
        
        // Raising to power of 0.5 makes it ramp up quickly early in the period
        disappointment = Math.pow(timePercent, 0.6) * (goalDiff / 3);  // changed from 0.5 to 0.6 to increase exodus rate)
    }

    // Clamp at 1.0 (Maximum exit)
    disappointment = Math.min(disappointment, 1.0);

    generateCrowd(disappointment);
}








function generateCrowd(disappointment = 0) {
    const crowdCanvas = document.createElement('canvas');
    crowdCanvas.width = 1000; crowdCanvas.height = 600;
    const cctx = crowdCanvas.getContext('2d');

    // --- CONFIGURABLE SIZE VARIABLES ---
    const bW = 11; // Width of horizontal body
    const bH = 7;  // Height of horizontal body
    const sT = 3;  // Stripe Thickness
    // ------------------------------------

    const visitor = Team0_Strategy; 
    const home = Team1_Strategy;

    masterCrowd.forEach(fan => {
        const topXStart = 180, topXEnd = 820, topYStart = 0,   topYEnd = 240; 
        const botXStart = 190, botXEnd = 820, botYStart = 360, botYEnd = 600; 
        const leftXLimit = 180, rightXLimit = 820;
        const midYStart = 250, midYEnd = 440;

        if (fan.isLate && !firstWhistleBlown) return;
        if (fan.hasLeft) return; 

        const team = fan.isHome ? home : visitor;
        const stripColor = (fan.color === team.colors.main) ? team.colors.secondary : team.colors.main;
        const rad = 3; // Corner radius for the "capsule" look
        
        // 1. TOP SECTION (Facing DOWN)
        if (fan.x >= topXStart && fan.x <= topXEnd && fan.y >= topYStart && fan.y <= topYEnd) {
            // CLOTHING: Use casual color or team color
            cctx.fillStyle = fan.isCasual ? fan.casualColor : fan.color;
            cctx.beginPath();
            cctx.roundRect(fan.x - (bW/2) + fan.fidgetX, fan.y - (bH/2) + fan.fidgetY, bW, bH, rad);
            cctx.fill();
            
            // STRIPE: Only draw if wearing a jersey
            if (!fan.isCasual) {
                cctx.fillStyle = stripColor;
                cctx.beginPath();
                cctx.roundRect(fan.x - (bW/2) + fan.fidgetX, fan.y - (sT/2) + fan.fidgetY, bW, sT, rad);
                cctx.fill();
            }

            // HEAD: Use individual skin tone
            cctx.fillStyle = fan.skin;
            cctx.beginPath(); 
            cctx.arc(fan.x + 0.5 + fan.fidgetX, fan.y + 2 + fan.fidgetY, 2, 0, Math.PI * 2); 
            cctx.fill();

            // HAIR OR HATS
            if (fan.headStyle === 1) { // HAIR
                cctx.fillStyle = fan.hairColor;
                cctx.beginPath();
                // Draw a small arc over the top of the head
                cctx.arc(fan.x + 0.5 + fan.fidgetX, fan.y + 1.5 + fan.fidgetY, 2, Math.PI, 0);
                cctx.fill();
            } else if (fan.headStyle === 2) { // HAT
                cctx.fillStyle = fan.hatColor;
                // Draw a tiny rectangle for a cap
                cctx.fillRect(fan.x - 1 + fan.fidgetX, fan.y + 0.5 + fan.fidgetY, 3, 2);
            }
        }
    // 2. BOTTOM SECTION (Facing UP)
    else if (fan.x >= botXStart && fan.x <= botXEnd && fan.y >= botYStart && fan.y <= botYEnd) {
        cctx.fillStyle = fan.isCasual ? fan.casualColor : fan.color;
        cctx.beginPath();
        cctx.roundRect(fan.x - (bW/2) + fan.fidgetX, fan.y - (bH/2) + fan.fidgetY, bW, bH, rad);
        cctx.fill();
        
        if (!fan.isCasual) {
            cctx.fillStyle = stripColor;
            cctx.beginPath();
            cctx.roundRect(fan.x - (bW/2) + fan.fidgetX, fan.y - (sT/2) + fan.fidgetY, bW, sT, rad);
            cctx.fill();
        }

        cctx.fillStyle = fan.skin;
        cctx.beginPath(); 
        cctx.arc(fan.x + 0.5 + fan.fidgetX, fan.y - 2 + fan.fidgetY, 2, 0, Math.PI * 2); 
        cctx.fill();

        if (fan.headStyle === 1) { // HAIR
            cctx.fillStyle = fan.hairColor;
            cctx.beginPath();
            cctx.arc(fan.x + 0.5 + fan.fidgetX, fan.y - 2.5 + fan.fidgetY, 2, Math.PI, 0);
            cctx.fill();
        } else if (fan.headStyle === 2) { // HAT
            cctx.fillStyle = fan.hatColor;
            cctx.fillRect(fan.x - 1 + fan.fidgetX, fan.y - 2.5 + fan.fidgetY, 3, 2);
        }
    }
    // 3. LEFT END (Facing RIGHT)
    else if (fan.x < leftXLimit && fan.y >= midYStart && fan.y <= midYEnd) {
        cctx.fillStyle = fan.isCasual ? fan.casualColor : fan.color;
        cctx.beginPath();
        cctx.roundRect(fan.x - (bH/2) + fan.fidgetX, fan.y - (bW/2) + fan.fidgetY, bH, bW, rad);
        cctx.fill();
        
        if (!fan.isCasual) {
            cctx.fillStyle = stripColor;
            cctx.beginPath();
            cctx.roundRect(fan.x - (sT/2) + fan.fidgetX, fan.y - (bW/2) + fan.fidgetY, sT, bW, rad);
            cctx.fill();
        }

        cctx.fillStyle = fan.skin;
        cctx.beginPath(); 
        cctx.arc(fan.x + 2.5 + fan.fidgetX, fan.y + fan.fidgetY, 2, 0, Math.PI * 2); 
        cctx.fill();

        if (fan.headStyle === 1) { // HAIR
            cctx.fillStyle = fan.hairColor;
            cctx.beginPath();
            cctx.arc(fan.x + 2.0 + fan.fidgetX, fan.y + fan.fidgetY, 2, -Math.PI/2, Math.PI/2);
            cctx.fill();
        } else if (fan.headStyle === 2) { // HAT
            cctx.fillStyle = fan.hatColor;
            cctx.fillRect(fan.x + 0.5 + fan.fidgetX, fan.y - 1.5 + fan.fidgetY, 2, 3);
        }
    }
    // 4. RIGHT END (Facing LEFT)
    else if (fan.x > rightXLimit && fan.y >= midYStart && fan.y <= midYEnd) {
        cctx.fillStyle = fan.isCasual ? fan.casualColor : fan.color;
        cctx.beginPath();
        cctx.roundRect(fan.x - (bH/2) + fan.fidgetX, fan.y - (bW/2) + fan.fidgetY, bH, bW, rad);
        cctx.fill();
        
        if (!fan.isCasual) {
            cctx.fillStyle = stripColor;
            cctx.beginPath();
            cctx.roundRect(fan.x - (sT/2) + fan.fidgetX, fan.y - (bW/2) + fan.fidgetY, sT, bW, rad);
            cctx.fill();
        }

        cctx.fillStyle = fan.skin;
        cctx.beginPath(); 
        cctx.arc(fan.x - 2.5 + fan.fidgetX, fan.y + fan.fidgetY, 2, 0, Math.PI * 2); 
        cctx.fill();

        if (fan.headStyle === 1) { // HAIR
            cctx.fillStyle = fan.hairColor;
            cctx.beginPath();
            cctx.arc(fan.x - 2.0 + fan.fidgetX, fan.y + fan.fidgetY, 2, Math.PI/2, -Math.PI/2);
            cctx.fill();
        } else if (fan.headStyle === 2) { // HAT
            cctx.fillStyle = fan.hatColor;
            cctx.fillRect(fan.x - 2.5 + fan.fidgetX, fan.y - 1.5 + fan.fidgetY, 2, 3);
        }
    }
    // 5. CORNERS (Rotated)
    else {
        cctx.save();
        cctx.translate(fan.x + fan.fidgetX, fan.y + fan.fidgetY);
        
        let angle = 0;
        if (fan.x < 500 && fan.y < 300) angle = -225 * Math.PI / 180;
        else if (fan.x >= 500 && fan.y < 300) angle = 225 * Math.PI / 180;
        else if (fan.x < 500 && fan.y >= 300) angle = 45 * Math.PI / 180;
        else angle = -45 * Math.PI / 180;

        cctx.rotate(angle + fan.fidgetAngle);

        cctx.fillStyle = fan.isCasual ? fan.casualColor : fan.color;
        cctx.beginPath();
        cctx.roundRect(-(bW/2), -(bH/2), bW, bH, rad);
        cctx.fill();

        if (!fan.isCasual) {
            cctx.fillStyle = stripColor;
            cctx.beginPath();
            cctx.roundRect(-(bW/2), -(sT/2), bW, sT, rad);
            cctx.fill();
        }

        cctx.fillStyle = fan.skin;
        cctx.beginPath(); 
        cctx.arc(0, -(bH/2) + 1.5, 2, 0, Math.PI * 2); 
        cctx.fill();

        if (fan.headStyle === 1) { // HAIR
            cctx.fillStyle = fan.hairColor;
            cctx.beginPath();
            cctx.arc(0, -(bH/2) + 1.0, 2, Math.PI, 0);
            cctx.fill();
        } else if (fan.headStyle === 2) { // HAT
            cctx.fillStyle = fan.hatColor;
            cctx.fillRect(-1.5, -(bH/2) - 0.5, 3, 2);
        }
        
        cctx.restore();
    }
    });

    crowdLayer = crowdCanvas;
}







let crowdFrameCounter = 0;

// =========================================================
// CROWD UPDATE (Time-Based to fix Speed)
// =========================================================
let lastCrowdUpdate = 0;

function updateLivingCrowd() {
    const now = performance.now();
    
    // 1. THROTTLE (Time-based update)
    if (now - lastCrowdUpdate < 120) return;
    lastCrowdUpdate = now;

    // 2. TRIGGER CONDITIONS
    // Condition: 3rd Period AND Home Team leads by 3+ goals
    const isThirdPeriod = (typeof currentPeriod !== 'undefined' && currentPeriod >= 3); 
    const isBigHomeLead = (typeof scoreTeam1 !== 'undefined' && typeof scoreTeam0 !== 'undefined' && scoreTeam1 - scoreTeam0 >= 3);

    // Note: We check if 'executeTheWave' exists before calling it
    if (isThirdPeriod && isBigHomeLead && typeof executeTheWave === 'function') {
        executeTheWave();
    } else {
        // Run Standard Fidgets (Only when NOT waving)
        if (typeof masterCrowd !== 'undefined') {
            masterCrowd.forEach(fan => {
                let currentExcitement = fan.isHome ? team1Excitement : team0Excitement;

                if (Math.random() < currentExcitement) {
                    let range = currentExcitement > AMBIENT_EXCITEMENT ? 4.0 : AMBIENT_RANGE;
                    
                    fan.fidgetX = (Math.random() * (range * 2) - range); 
                    fan.fidgetY = (Math.random() * (range * 2) - range);
                    fan.fidgetAngle = (Math.random() * (range * 0.2) - (range * 0.1));
                }
            });
        }
    }

    // 3. REDRAW
    if (typeof generateCrowd === 'function' && typeof currentDisappointment !== 'undefined') {
        generateCrowd(currentDisappointment);
    }
}



function executeTheWave() {
    const now = performance.now();
    
    // ==========================================
    // 🎛️ WAVE TUNING KNOBS
    // ==========================================
    
    // 1. DIRECTION
    // true = Clockwise? (Depends on coordinate system)
    // false = Counter-Clockwise? 
    // Just toggle this if it's going the wrong way.
    const REVERSE_DIRECTION = true; 

    // 2. WAVE ROTATION SPEED (How fast it circles the rink)
    // 0.0005 = Slow / Majestic
    // 0.0010 = Fast / Exciting
    // 0.0020 = Hyper Speed
    const ROTATION_SPEED = 0.0005; 

    // 3. FAN POP SPEED (How fast they stand up/sit down)
    // This controls the "Width" of the wave.
    // 0.60 = Wide Wave (Slow, lazy stand up)
    // 0.80 = Normal Wave
    // 0.90 = Narrow Wave (Very fast, snappy jump)
    // 0.95 = Needle (Twitch)
    const POP_THRESHOLD = 0.97; 

    // ==========================================

    const dir = REVERSE_DIRECTION ? -1 : 1;
    const waveRotation = now * ROTATION_SPEED * dir;

    const centerX = 500; 
    const centerY = 300; 

    if (typeof masterCrowd !== 'undefined') {
        masterCrowd.forEach(fan => {
            // Check Participation
            if (!fan.waveActive || fan.hasLeft) {
                if (fan.fidgetY < 0) fan.fidgetY = 0; 
                return; 
            }

            // 1. Calculate Angle
            let angle = Math.atan2(fan.y - centerY, fan.x - centerX);

            // 2. Apply Messy Timing Offset
            angle += (fan.waveOffset * 0.002);

            // 3. Calculate Wave Height
            const val = Math.sin(angle + waveRotation);
            
            // 4. Trigger Stand Up
            if (val > POP_THRESHOLD) { 
                const effort = fan.waveEffort || 1.0;
                
                // MATH: We need to normalize the value from [Threshold -> 1.0] to [0.0 -> 1.0]
                // Example: If val is 0.9 and threshold is 0.8, result is 0.5 (Halfway up)
                const range = 1.0 - POP_THRESHOLD;
                const normalizedHeight = (val - POP_THRESHOLD) / range;

                // Apply Height (-12px max)
                fan.fidgetY = (-12 * effort) * normalizedHeight; 
                
                fan.fidgetX = 0;
                fan.fidgetAngle = 0;
            } else {
                fan.fidgetY = 0;
            }
        });
    }
}




function triggerGoalExcitement(scoringTeam) {
    if (scoringTeam === 1) { // Home Goal
        team1Excitement = 0.95; 
        team0Excitement = 0.00;
        // Home fans stay excited for 5 seconds
        setTimeout(() => { resetExcitement(); }, 5000);
    } else { // Visitor Goal
        team0Excitement = 0.95; 
        team1Excitement = 0.00; 
        // HOME FANS EXODUS: Reset excitement sooner (2 seconds) 
        // so the 'leaving' is visible during the faceoff setup.
        setTimeout(() => { resetExcitement(); }, 2000);
    }
}

function resetExcitement() {
    team1Excitement = AMBIENT_EXCITEMENT;
    team0Excitement = AMBIENT_EXCITEMENT;
}
