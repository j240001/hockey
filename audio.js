// start crowd audio
function startCrowd() {
    // 1. SECURITY CHECK: Is the crowd supposed to be on?
    if (!crowdEnabled) return; 

    // 2. STOP GHOSTS: If a crowd is already playing, kill it first
    // UPDATED: Check crowdDeck, not sound
    if (crowdDeck.playing(crowdId)) {
        crowdDeck.stop(crowdId);
    }

    // 3. START FRESH
    // UPDATED: Use crowdDeck and the correct sprite key ('crowd_bed')
    crowdId = crowdDeck.play('crowd_bed'); 
    crowdDeck.loop(true, crowdId);
    
    // Optional: Fade in for polish, or just set volume
    crowdDeck.volume(0, crowdId); 
    crowdDeck.fade(0, 0.3, 1000, crowdId);
}

function processSkatingAudio(p) {
    // 1. Only play if moving and pushing (accelerating)
    if (!p.isAccelerating) return;

    // 2. Velocity Threshold (Don't play if barely moving)
    const speed = Math.hypot(p.vx, p.vy);
    if (speed < 1.4) return;

    // 3. Initialize Audio Timer if missing
    if (typeof p.audioStrideTimer === 'undefined') p.audioStrideTimer = 0;

    // 4. Increment Timer
    p.audioStrideTimer++;

    // 5. Trigger Sound (Every ~45 frames)
    // Adjust this number to match the visual stride speed
    const STRIDE_TEMPO = 33; 

    if (p.audioStrideTimer > STRIDE_TEMPO) {
        p.audioStrideTimer = 0; // Reset
        
        // A. Randomize between clips 1 and 6
        const clipIndex = Math.floor(Math.random() * 6) + 1;
        const key = `skate_${clipIndex}`;

        // B. Play the sound (Volume 0.3 for background ambience)
        playGameSound(key, 0.2);
    }
}

// =========================================================
// AUDIO DECKS (Split Channels)
// =========================================================
const sfxDeck = new Howl({
    src: ['sprite.mp3'], 
    volume: 1.0,
    sprite: {
        // GOAL HORN
        goal_horn:        [0, 3105], 

        // BOARD HITS
        puck_board_soft:  [3105, 668], // Normal hit
        puck_board_hard:  [3774, 782], // Hard hit

        // STICK/PUCK (Shooting & Catching)
        shoot_soft:       [4556, 337], // Normal shot / pass catch
        shoot_hard:       [4893, 399], // Harder shot

        // WHISTLES (Random)
        whistle_1:        [5292, 619], 
        whistle_2:        [5911, 914],

        // PAD SAVES (Random)
        pad_save_1:       [6825, 533],
        pad_save_2:       [7357, 557],

        stick_drop_1:     [7914, 529],
        stick_drop_2:     [8444, 497],

        skate_1: [8941, 794], 
        skate_2: [9734, 653], 
        skate_3: [10387, 692], 
        skate_4: [11079, 500], 
        skate_5: [11579, 500], 
        skate_6: [12080, 752]
    }
});

// 2. CROWD DECK (Ambient loops - Lower Priority, Duckable)
const crowdDeck = new Howl({
    src: ['crowd_sprite.mp3'], 
    volume: 1.0,
    sprite: {
        // 1. THE BED (0s to 20s)
        // Must match your clip length exactly for the loop to be seamless
        crowd_bed:  [0, 18983, true], 

        // 2. THE OHHH (Starts after bed, e.g., at 21s)
        crowd_ohhh: [18983, 4545], 

        // 3. THE GOAL (Starts after Ohhh, e.g., at 24s)
        crowd_cheer: [23528, 6886] 
    }
});

// 3. VOICE DECK (Announcer/Bob - Highest Priority)
const voiceDeck = new Howl({
    src: ['sprite.mp3'], // You will likely change this to 'voices.mp3' later
    volume: 1.0,
    sprite: {
        // Placeholders for your future assets:
        bob_intro: [0, 1000],
        bob_goal_home: [0, 1000],
        bob_goal_away: [0, 1000],
        bob_save: [0, 1000],
        bob_hit: [0, 1000]
    }
});

// Helper to route sound names to the correct deck
function getDeckForKey(key) {
    if (sfxDeck._sprite[key]) return sfxDeck;
    if (crowdDeck._sprite[key]) return crowdDeck;
    if (voiceDeck._sprite[key]) return voiceDeck;
    return sfxDeck; // Fallback
}


// Store all layer IDs
let crowdLayers = [];

function initAudio() {
    if (crowdLayers.length > 0) return;

    // Layer 1 (Foundation)
    let id1 = crowdDeck.play('crowd_bed');
    crowdDeck.seek(0, id1);
    crowdDeck.volume(0, id1);
    crowdLayers.push(id1);

    // Layer 2 (Widener)
    let id2 = crowdDeck.play('crowd_bed');
    crowdDeck.seek(7.0, id2);
    crowdDeck.rate(1.01, id2);
    crowdDeck.volume(0, id2);
    crowdLayers.push(id2);

    // Layer 3 (Texture)
    let id3 = crowdDeck.play('crowd_bed');
    crowdDeck.seek(15.0, id3);
    crowdDeck.rate(0.99, id3);
    crowdDeck.volume(0, id3);
    crowdLayers.push(id3);
}




// Track whether the crowd is currently audible
let currentAmbienceState = 'off'; 

// Global target for smooth fading
let crowdTargetVol = 0.0; 
let currentCrowdVol = 0.0;
let crowdGaspCooldown = 0;

function updateCrowdAmbience() {
    // *** FIX: SHUT UP IF SIMULATING ***
    if (!isAudioEnabled() || !crowdEnabled) {
        if (currentCrowdVol > 0 || crowdLayers.length > 0) {
            currentCrowdVol = 0;
            crowdLayers.forEach(id => {
                crowdDeck.volume(0, id); // Force silent immediately
                // Note: We don't stop() because we want it ready to fade back in
            });
        }
        return;
    }



    // 1. MASTER SWITCH: If crowd is disabled, kill volume and exit
    if (!crowdEnabled) {
        if (currentCrowdVol > 0) {
            currentCrowdVol = 0;
            crowdLayers.forEach(id => crowdDeck.volume(0, id));
        }
        return;
    }

    // 2. DETERMINE GAME STATE
    let activeGame = (gameState === 'playing' || 
                     (gameState === 'playoffs' && Playoffs.watchMode) || 
                     (gameState === 'tournament' && Tournament.watchMode) ||
                     (TRAINING_MODE && WATCH_MODE));

    if (!activeGame) {
        // Menu/Pause: Fade to silence
        crowdTargetVol = 0.0;
    } else {
        // 3. CALCULATE "EXCITEMENT LEVEL"
        // Base level (Neutral Zone / Idle) - Louder than before
        let target = 0.30; 

        // Get Puck Location (0 = Left Wall, 1000 = Right Wall)
        // Home Team (1) usually attacks Right (Goal 2)
        // Visitor Team (0) usually attacks Left (Goal 1)
        
        // Find out which side is the "Home Offensive Zone"
        // If Home attacks Right (normal), Off Zone is > 600
        // If Home attacks Left (period 2), Off Zone is < 400
        const homeAttackingRight = !team0AttacksRight; 
        const isHomeOffense = homeAttackingRight ? (puck.x > RX + 100) : (puck.x < RX - 100);
        const isVisitorOffense = homeAttackingRight ? (puck.x < RX - 100) : (puck.x > RX + 100);

        // A. HOME TEAM ATTACKING (Loud Swell)
        if (isHomeOffense) {
            target = 0.40; // Swell up!
            
            // Super Swell: If Home Team actually HAS the puck in the zone
            if (puck.ownerId !== null) {
                const owner = getPlayerById(puck.ownerId);
                if (owner && owner.team === 1) target = 0.85; // Deafening pressure
            }
        } 
        // B. VISITOR TEAM ATTACKING (Nervous Tension)
        else if (isVisitorOffense) {
            target = 0.25; // Drop slightly (nervous silence)
        }

        crowdTargetVol = target;
    }

    // 4. SMOOTH FADE (The "Swell" Effect)
    // We inch the current volume towards the target volume every frame.
    // 0.01 = Slow fade, 0.05 = Fast fade
    if (Math.abs(currentCrowdVol - crowdTargetVol) > 0.001) {
        // Fade Up faster than we fade down (Excitement builds fast)
        const speed = (crowdTargetVol > currentCrowdVol) ? 0.005 : 0.002;
        
        // Simple Lerp
        currentCrowdVol += (crowdTargetVol - currentCrowdVol) * 0.02;
    }

    // 5. APPLY TO LAYERS
    // We verify the layers exist to avoid errors
    crowdLayers.forEach(id => {
        crowdDeck.volume(currentCrowdVol, id);
    });
}


function toggleCrowd() {
    crowdEnabled = !crowdEnabled;

    if (crowdEnabled) {
        // Only start playing if we are actually watching a game
        if (isAudioEnabled() && !crowdDeck.playing(crowdId)) {
             crowdId = crowdDeck.play('crowd_bed'); 
             crowdDeck.loop(true, crowdId);
             crowdDeck.volume(0, crowdId); // Start silent
             crowdDeck.fade(0, 0.3, 1000, crowdId); // Fade in
        }
        console.log("Crowd Enabled");
    } else {
        // Fade out
        if (crowdDeck.playing(crowdId)) {
             crowdDeck.fade(crowdDeck.volume(crowdId), 0, 1000, crowdId);
             setTimeout(() => {
                 if (!crowdEnabled) crowdDeck.stop(crowdId);
             }, 1000);
        }
        console.log("Crowd Disabled");
    }
}


function checkCrowdAnticipation() {

    if (!isAudioEnabled()) return;
    if (!crowdEnabled) return;
    if (isResetActive()) return;
    if (lastGoalTeam !== null) return;  
    if (typeof isReplaying !== 'undefined' && isReplaying) return;
    if (typeof isPaused !== 'undefined' && isPaused) return;


    // 1. Decrement Cooldown
    if (crowdGaspCooldown > 0) {
        crowdGaspCooldown--;
        return;
    }

    // 2. RULES: Puck must be LOOSE
    if (puck.ownerId !== null) return;

    // 3. TARGET: The Visitor Goalie (Team 0)
    // The Home Crowd (Team 1) gasps when the puck is near the OPPONENT's net.
    // (Note: We optimize by assuming Visitor Goalie is roughly at their home post)
    // Team 0 defends Goal 1 usually, but let's find the actual player to be safe.
    const visitorGoalie = players.find(p => p.team === 0 && p.type === "goalie");
    if (!visitorGoalie) return;

    // 4. DISTANCE CHECK
    const dist = Math.hypot(puck.x - visitorGoalie.x, puck.y - visitorGoalie.y);

    // 5. TRIGGER
    // 65px covers the crease + a bit of the slot
    if (dist < 65) {
        // Play the gasp
        const id = crowdDeck.play('crowd_ohhh');
        
        // Randomize volume slightly for variety (0.6 to 0.8)
        // We don't want it AS loud as a missed shot against the boards
        crowdDeck.volume(0.3 + Math.random() * 0.2, id);

        // Set cooldown (1 second)
        crowdGaspCooldown = 60;
    }
}



// =========================================================
// AUDIO COOLDOWN CONFIGURATION
// =========================================================
const SOUND_COOLDOWNS = {
    'shoot_soft': 200,
    'shoot_hard': 200,
    'puck_board_soft': 200,
    'puck_board_hard': 200,
    'pad_save_1': 200,
    'pad_save_2': 200,
    'stick_drop_1': 400,
    'stick_drop_2': 400,
    'whistle_1': 2000, 
    'whistle_2': 2000,
    'goal_horn': 2000,

    // SKATING
    'skate_1': 100,
    'skate_2': 100,
    'skate_3': 100,
    'skate_4': 100,
    'skate_5': 100,
    'skate_6': 100,
    
    // Announcer
    'bob_intro': 10000,
    'bob_goal': 5000
};


function isAudioEnabled() {
    // 1. Regular Game
    if (gameState === 'playing') return true;
    
    // 2. Training Mode
    if (TRAINING_MODE) return WATCH_MODE;
    
    // 3. Tournament Mode (The one you need fixed)
    if (gameState === 'tournament' && typeof Tournament !== 'undefined') {
        return Tournament.watchMode;
    }
    
    // 4. Playoff Mode
    if (gameState === 'playoffs' && typeof Playoffs !== 'undefined') {
        return Playoffs.watchMode;
    }

    return false;
}





// State tracker
const lastSoundTime = {};



function playGameSound(name, volumeOverride) {
    // 1. GAME MODE CHECKS
    if (TRAINING_MODE && !WATCH_MODE) return; 
    if (gameState === 'tournament' && typeof Tournament !== 'undefined' && !Tournament.watchMode) return;
    if (gameState === 'playoffs' && typeof Playoffs !== 'undefined' && !Playoffs.watchMode) return;

    // 2. COOLDOWN CHECK
    const now = performance.now();
    const cooldown = SOUND_COOLDOWNS[name] || 50; 
    const last = lastSoundTime[name] || 0;
    if (now - last < cooldown) return; 

    // 3. ROUTE TO DECK
    const deck = getDeckForKey(name);
    
    // 4. PLAY
    lastSoundTime[name] = now;
    var id = deck.play(name);
    
    // 5. APPLY VOLUME
    if (volumeOverride !== undefined) {
        deck.volume(volumeOverride, id);
    }
    
    return id; // Return ID in case we need to track it (like for loop stopping)
}


// Helper to handle Replay Ducking for ALL layers
function setCrowdReplayMode(isReplay) {
    // SECURITY CHECK: If crowd is muted, do NOT touch the volume.
    if (!crowdEnabled) return; 

    crowdLayers.forEach(id => {
        if (isReplay) {
            // Duck all layers down to 5%
            // UPDATED: Use crowdDeck instead of sound
            crowdDeck.fade(crowdDeck.volume(id), 0.05, 300, id); 
        } else {
            // Bring all layers back to 15% (Normal Volume)
            // UPDATED: Use crowdDeck instead of sound
            crowdDeck.fade(crowdDeck.volume(id), 0.15, 1000, id);
        }
    });
}



// Initialize audio on first user interaction
window.addEventListener('click', () => {
    if (Howler.ctx.state === 'suspended') Howler.ctx.resume();
    initAudio();
}, { once: true });

// +++ FIX FOR MOBILE AUDIO +++
window.addEventListener('touchstart', () => {
    if (Howler.ctx.state === 'suspended') {
        Howler.ctx.resume();
    }
    initAudio();
}, { once: true });

window.addEventListener('keydown', () => {
    if (Howler.ctx.state === 'suspended') Howler.ctx.resume();
    initAudio();
}, { once: true });
