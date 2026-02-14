// =========================================================
// NEW SKATER BIOMECHANICS ENGINE (V5.4 - DYNAMIC SCALING)
// =========================================================

// 1. DEFINE THE SCALE (Change this ONE number to resize everyone)
const SKATER_SCALE = 0.95; 

// 2. DEFINE THE BASE SPECS (The "100%" values)
const BASE_SPECS = {
    topX: 3.0, 
    topY: -3.6, 
    knobLength: 1.8, 
    shoulderX: 1.8, 
    shoulderY: 4.2,
    cradleX: 3.6, 
    cradleY: -2.4,
    maxArmLength: 9.0,
    
    // Default Idle Pose (100% size)
    defaultPose: { botX: 7.5, botY: 3.0, rot: 0, reach: 7.5 },
    
    // Body Dimensions (100% size)
    bodyW: 9.6,
    bodyH: 14.4,
    headRad: 3.4,
    headX: 5.8
};

// 3. GENERATE THE SCALED SPECS AUTOMATICALLY
const SKATER_SPECS = {
    topX: BASE_SPECS.topX * SKATER_SCALE,
    topY: BASE_SPECS.topY * SKATER_SCALE,
    knobLength: BASE_SPECS.knobLength * SKATER_SCALE,
    shoulderX: BASE_SPECS.shoulderX * SKATER_SCALE,
    shoulderY: BASE_SPECS.shoulderY * SKATER_SCALE,
    
    cradleX: BASE_SPECS.cradleX * SKATER_SCALE,
    cradleY: BASE_SPECS.cradleY * SKATER_SCALE,
    maxArmLength: BASE_SPECS.maxArmLength * SKATER_SCALE,
    
    // Scaled Default Pose
    defaultPose: {
        botX: BASE_SPECS.defaultPose.botX * SKATER_SCALE,
        botY: BASE_SPECS.defaultPose.botY * SKATER_SCALE,
        rot: 0,
        reach: BASE_SPECS.defaultPose.reach * SKATER_SCALE
    },
    
    // Visual Dimensions
    bodyW: BASE_SPECS.bodyW * SKATER_SCALE,
    bodyH: BASE_SPECS.bodyH * SKATER_SCALE,
    headRad: BASE_SPECS.headRad * SKATER_SCALE,
    headX: BASE_SPECS.headX * SKATER_SCALE,

    // Animation Config (Unchanged)
    strideFreq: 0.05, 
    strideAmp: 0.14
};

const STICK_PHYSICS = {
    length: 50,       // Total length
    bladeLen: 15,     // Visual blade length
    width: 3,         // Shaft thickness
    mass: 0.5,        // Light enough to be kicked
    friction: 0.96,   // Slides a bit
    rotFriction: 0.92, // Spins die out faster
    restitution: 0.5, // Bounciness
    // CRITICAL: The COG is not in the middle. It's closer to the blade.
    // This value is the offset from the geometrical center.
    // -10 means the pivot is 10px towards the blade.
    cogOffset: -10 
};

const NET_H = 39;
const NET_D = 25;

function buildRinkPolygon() {
    const w = RINK_W, h = RINK_H, r = R, s = STEPS;
    const pts = [];

    pts.push({x:r, y:0});
    pts.push({x:w-r, y:0});

    {   // top-right
        const cx=w-r, cy=r;
        for(let i=1;i<=s;i++){
            const a=1.5*Math.PI + (i/s)*(0.5*Math.PI);
            pts.push({x:cx+Math.cos(a)*r, y:cy+Math.sin(a)*r});
        }
    }

    pts.push({x:w, y:h-r});

    {   // bottom-right
        const cx=w-r, cy=h-r;
        for(let i=1;i<=s;i++){
            const a=(i/s)*(Math.PI/2);
            pts.push({x:cx+Math.cos(a)*r, y:cy+Math.sin(a)*r});
        }
    }

    pts.push({x:w-r, y:h});
    pts.push({x:r,   y:h});

    {   // bottom-left
        const cx=r, cy=h-r;
        for(let i=1;i<=s;i++){
            const a=Math.PI/2 + (i/s)*(Math.PI/2);
            pts.push({x:cx+Math.cos(a)*r, y:cy+Math.sin(a)*r});
        }
    }

    pts.push({x:0, y:h-r});
    pts.push({x:0, y:r});

    {   // top-left
        const cx=r, cy=r;
        for(let i=1;i<=s;i++){
            const a=Math.PI + (i/s)*(Math.PI/2);
            pts.push({x:cx+Math.cos(a)*r, y:cy+Math.sin(a)*r});
        }
    }

    return pts;
}

const rinkPoly = buildRinkPolygon();

// =========================================================
// COMPUTE RINK BOUNDING BOX FROM POLYGON
// =========================================================
let RINK_MIN_X = Infinity;
let RINK_MAX_X = -Infinity;
let RINK_MIN_Y = Infinity;
let RINK_MAX_Y = -Infinity;

for (const pt of rinkPoly) {
    const gx = pt.x + RINK_X;
    const gy = pt.y + RINK_Y;

    if (gx < RINK_MIN_X) RINK_MIN_X = gx;
    if (gx > RINK_MAX_X) RINK_MAX_X = gx;
    if (gy < RINK_MIN_Y) RINK_MIN_Y = gy;
    if (gy > RINK_MAX_Y) RINK_MAX_Y = gy;
}

// Build wall + net segments with precomputed normals
let rinkSegments = [];
for (let i=0;i<rinkPoly.length;i++){
    const p1 = rinkPoly[i];
    const p2 = rinkPoly[(i+1)%rinkPoly.length];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    rinkSegments.push({
        x1: p1.x + RINK_X,
        y1: p1.y + RINK_Y,
        x2: p2.x + RINK_X,
        y2: p2.y + RINK_Y,
        type: "wall",
        nx: len > 0 ? -dy / len : 0,
        ny: len > 0 ? dx / len : 0,
        len: len
    });
}

function collideWithRink(obj, radius) {
    for (const s of rinkSegments) {
        if (s.len === 0) continue;

        const dx = obj.x - s.x1;
        const dy = obj.y - s.y1;
        const t = (dx * (s.x2 - s.x1) + dy * (s.y2 - s.y1)) / (s.len * s.len);
        const clamped = Math.max(0, Math.min(1, t));

        const cx = s.x1 + clamped * (s.x2 - s.x1);
        const cy = s.y1 + clamped * (s.y2 - s.y1);

        const nx = obj.x - cx;
        const ny = obj.y - cy;
        const dist2 = nx * nx + ny * ny;

        if (dist2 < radius * radius && dist2 > 0) {
            const dist = Math.sqrt(dist2);
            const unx = nx / dist;
            const uny = ny / dist;

            obj.x = cx + unx * radius;
            obj.y = cy + uny * radius;

            let rest = 0.97;
            if (s.type === "goal") rest = 0.2;

            const dot = obj.vx * unx + obj.vy * uny;
            obj.vx -= (1 + rest) * dot * unx;
            obj.vy -= (1 + rest) * dot * uny;

            return true;
        }
    }
    return false;
}

function collideCircleWithRink(obj, radius) {
    let collided = false;

    for (const seg of rinkSegments) {
        const x1 = seg.x1, y1 = seg.y1;
        const x2 = seg.x2, y2 = seg.y2;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const segLen2 = dx * dx + dy * dy;
        if (segLen2 === 0) continue;

        // Project point onto segment
        const t = ((obj.x - x1) * dx + (obj.y - y1) * dy) / segLen2;
        const clamped = Math.max(0, Math.min(1, t));
        const cx = x1 + clamped * dx;
        const cy = y1 + clamped * dy;

        const nx = obj.x - cx;
        const ny = obj.y - cy;
        const dist2 = nx * nx + ny * ny;
        const minDist = radius;

        if (dist2 < minDist * minDist && dist2 > 0.000001) {
            const dist = Math.sqrt(dist2);
            
            // The Wall Normal (Perpendicular)
            const unx = nx / dist;
            const uny = ny / dist;

            // Push out to avoid sticking
            obj.x = cx + unx * minDist;
            obj.y = cy + uny * minDist;

            // --- NEW PHYSICS: COMPONENT SPLITTING ---
            
            // 1. Calculate the impact speed along the Normal (The "smash" factor)
            const vDotN = obj.vx * unx + obj.vy * uny;

            // 2. Separate velocity into Normal (Bounce) and Tangent (Slide) components
            const vNormalX = vDotN * unx;
            const vNormalY = vDotN * uny;
            
            const vTangentX = obj.vx - vNormalX;
            const vTangentY = obj.vy - vNormalY;

            // 3. APPLY SETTINGS (Adjust these two numbers!)
            // A. BOUNCE: How much energy is kept on direct hits?
            // 0.4 = Dead boards (realistic). 0.9 = Super bouncy.
            let wallBounciness = 0.5; 

            // B. FRICTION: How much speed is kept when sliding?
            // 0.98 = Ice (almost no friction). 0.5 = Sandpaper.
            let wallSlide = 0.98;

            // Special case: Goal nets are dead soft
            if (seg.type === "goal") {
                wallBounciness = 0.1;
                wallSlide = 0.5;
            }

            // 4. RECOMBINE
            // Flip the normal (bounce back) and scale it
            const newNormalX = -vNormalX * wallBounciness;
            const newNormalY = -vNormalY * wallBounciness;
            
            // Keep the tangent (slide forward) and scale it
            const newTangentX = vTangentX * wallSlide;
            const newTangentY = vTangentY * wallSlide;

            obj.vx = newNormalX + newTangentX;
            obj.vy = newNormalY + newTangentY;

            // ----------------------------------------

            // PASS INTERRUPT
            if (obj === puck && puck.passTargetId !== null) {
                puck.passTargetId = null; 
            }

            // AUDIO TRIGGER
            if (obj === puck) {
                // impactIntensity is the speed PERPENDICULAR to the wall.
                // Grazing hits have very low impactIntensity, even if the puck is fast.
                const impactIntensity = Math.abs(vDotN); 
                
                // 1. HIGHER THRESHOLD: Ignore anything below 2.0 (was 1.0)
                // This filters out almost all "sliding" sounds.
                if (impactIntensity > 2.0 && isAudioEnabled()) {
                    
                    // 2. GENTLER VOLUME CURVE
                    // Old math: Maxed out at impact 1.5. 
                    // New math: Needs impact 10.0 to reach max volume.
                    // A fast graze (intensity ~3.0) will now be very quiet (0.05).
                    let vol = (impactIntensity - 2.0) * 0.05;
                    
                    // Clamp max volume to 0.4
                    if (vol > 0.4) vol = 0.4;

                    // 3. SELECT SOUND
                    // Only play the "Hard" crack if it's a massive hit (> 8.0)
                    let soundKey = (impactIntensity > 8.0) ? 'puck_board_hard' : 'puck_board_soft';
                    
                    playGameSound(soundKey, vol);

                    // CROWD REACTION (Unchanged)
                    if (crowdEnabled && impactIntensity > 5.0 && Math.random() < 0.4) {
                         let isHomeShot = false;
                         if (puck.lastOwnerId) {
                             const shooter = getPlayerById(puck.lastOwnerId);
                             if (shooter && shooter.team === 1) isHomeShot = true;
                         }
                         let reactionId = crowdDeck.play('crowd_ohhh');
                         crowdDeck.volume(isHomeShot ? 1.0 : 0.3, reactionId); 
                    }
                }
            }

            collided = true;
            break; 
        }
    }

    return collided;
}

function enforcePlayerWalls(p) {
    const r = p.size;

    if (p.x < RINK_MIN_X + r) {
        p.x = RINK_MIN_X + r;
        p.vx *= -0.3;
    }

    if (p.x > RINK_MAX_X - r) {
        p.x = RINK_MAX_X - r;
        p.vx *= -0.3;
    }

    if (p.y < RINK_MIN_Y + r) {
        p.y = RINK_MIN_Y + r;
        p.vy *= -0.3;
    }

    if (p.y > RINK_MAX_Y - r) {
        p.y = RINK_MAX_Y - r;
        p.vy *= -0.3;
    }
}

function puckEscapedRink() {
    const r = puck.r;

    return (
        puck.x < RINK_MIN_X - r ||
        puck.x > RINK_MAX_X + r ||
        puck.y < RINK_MIN_Y - r ||
        puck.y > RINK_MAX_Y + r
    );
}

function resolvePlayerCollisions() {
    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            const a = players[i];
            const b = players[j];

            // Standard Separation Logic (Keep this)
            const ar = a.size / 2; const br = b.size / 2; const minDist = ar + br;
            const dx = b.x - a.x; const dy = b.y - a.y; const dist2 = dx*dx + dy*dy;

            if (dist2 < minDist * minDist && dist2 > 0) {
                const dist = Math.sqrt(dist2);
                const nx = dx / dist; const ny = dy / dist;
                
                // Physics Bounce (Keep this)
                const overlap = (minDist - dist);
                const totalMass = 2.0; // Simplified for now
                a.x -= nx * overlap * 0.5; a.y -= ny * overlap * 0.5;
                b.x += nx * overlap * 0.5; b.y += ny * overlap * 0.5;

                const rvx = b.vx - a.vx; const rvy = b.vy - a.vy;
                const velAlongNormal = rvx * nx + rvy * ny;
                if (velAlongNormal > 0) continue;

                const jImpulse = -(1.9) * velAlongNormal; // 1.9 = bounce factor
                const ix = jImpulse * nx; const iy = jImpulse * ny;
                a.vx -= ix * 0.5; a.vy -= iy * 0.5;
                b.vx += ix * 0.5; b.vy += iy * 0.5;


                
                // ---------------------------------------------------------
                // NEW: ASYMMETRICAL FORCE LOGIC (FIXED)
                // ---------------------------------------------------------

                // 1. SAFETY: The Carrier CANNOT be the Hitter.
                // If you have the puck, you are the Victim, even if holding the button (Charging Shot).
                if (puck.ownerId === a.id) a.isChecking = false;
                if (puck.ownerId === b.id) b.isChecking = false;

                const aHits = (a.isChecking === true);
                const bHits = (b.isChecking === true);
                
                // 2. Base Physics Force
                const rawForce = Math.abs(jImpulse) * 0.5;

                let forceA = rawForce;
                let forceB = rawForce;
                
                // 3. CARRIER VULNERABILITY (Carrier is naturally soft)
                if (puck.ownerId === a.id) forceA *= 1.4;
                if (puck.ownerId === b.id) forceB *= 1.4;

                // 4. APPLY INTENT MODIFIERS
                if (!aHits && !bHits) {
                     // SCENARIO A: ACCIDENT (Neither is hitting)
                     // Both take reduced damage.
                     forceA *= 0.3;
                     forceB *= 0.3;
                } 
                else {
                    // SCENARIO B: VIOLENCE (At least one person is hitting)
                    
                    // Modify Player A
                    if (aHits) forceA *= 0.3; // Hitter feels almost nothing (Iron Shield)
                    else       forceA *= 2.5; // Victim gets CRUSHED
                    
                    // Modify Player B
                    if (bHits) forceB *= 0.3; // Hitter feels almost nothing
                    else       forceB *= 2.5; // Victim gets CRUSHED
                }

                // 5. DETERMINE THRESHOLDS
                // Base thresholds
                let threshA = (puck.ownerId === a.id) ? 1.0 : 1.5;
                let threshB = (puck.ownerId === b.id) ? 1.0 : 1.5;

                // Bonus Shield for the Hitter (Extra insurance)
                if (aHits) threshA = 5.0; 
                if (bHits) threshB = 5.0; 

                // 6. APPLY OUTCOMES (Three-Tier Physicality)
                if (a.team !== b.team) {
                    
                    const KNOCKBACK_SCALAR = 0.15; 
                    const STUN_THRESHOLD = 4.0;      // Tier 1: Big Hit
                    const PUCK_LOSS_THRESHOLD = 2.5; // Tier 2: Jar Loose

                    // --- CHECK PLAYER A (Collision Force on A) ---
                    if (forceA > threshA) {
                        
                        // TIER 1: DESTRUCTION (Force > 4.0)
                        if (forceA >= STUN_THRESHOLD) {
                            let frames = Math.floor(Math.pow(forceA, 2.0) * 6);
                            if (frames > 120) frames = 120;
                            
                            // Stun + Stat + Drop Puck (Handled inside)
                            applyStun(a, frames, forceA, b); 

                            // Knockback
                            a.vx -= nx * (forceA * KNOCKBACK_SCALAR);
                            a.vy -= ny * (forceA * KNOCKBACK_SCALAR);
                        }
                        
                        // TIER 2: JAR PUCK (Force 2.5 - 4.0)
                        else if (forceA >= PUCK_LOSS_THRESHOLD) {
                            // Player keeps footing (no stun), but loses puck
                            if (puck.ownerId === a.id) {
                                ejectPuckFromOwner(a);
                                // Add a "pop" to the puck so it doesn't just sit dead
                                puck.vx += (Math.random() - 0.5) * 2; 
                                puck.vy += (Math.random() - 0.5) * 2;
                                puckStealCooldown = 15; // Brief scramble period
                            }
                            // Moderate slow down
                            a.vx *= 0.6; 
                            a.vy *= 0.6;
                        }

                        // TIER 3: INTERFERENCE (Force < 2.5)
                        else {
                            // Just a rub-out / slowing down
                            a.vx *= 0.85; 
                            a.vy *= 0.85;
                        }
                    }

                    // --- CHECK PLAYER B (Collision Force on B) ---
                    if (forceB > threshB) {
                        
                        // TIER 1: DESTRUCTION
                        if (forceB >= STUN_THRESHOLD) {
                            let frames = Math.floor(Math.pow(forceB, 2.0) * 6);
                            if (frames > 120) frames = 120;
                            
                            applyStun(b, frames, forceB, a); 

                            b.vx += nx * (forceB * KNOCKBACK_SCALAR);
                            b.vy += ny * (forceB * KNOCKBACK_SCALAR);
                        }
                        
                        // TIER 2: JAR PUCK
                        else if (forceB >= PUCK_LOSS_THRESHOLD) {
                            if (puck.ownerId === b.id) {
                                ejectPuckFromOwner(b);
                                puck.vx += (Math.random() - 0.5) * 2; 
                                puck.vy += (Math.random() - 0.5) * 2;
                                puckStealCooldown = 15; 
                            }
                            b.vx *= 0.6; 
                            b.vy *= 0.6;
                        }

                        // TIER 3: INTERFERENCE
                        else {
                            b.vx *= 0.85; 
                            b.vy *= 0.85;
                        }
                    }
                }
            }
        }
    }
}

function applyStun(p, frames, force, attacker) { // <--- Added 'attacker'
    
    // 1. HIT STATS TRACKING
    // We check this FIRST, before the puck is ejected below.
    if (typeof LiveStats !== 'undefined' && attacker) {
        
        const HIT_STAT_THRESHOLD = 6.0; // Only count hard hits
        
        // Condition: Victim (p) has the puck AND hit was hard enough
        if (puck.ownerId === p.id && force > HIT_STAT_THRESHOLD) {
            if (attacker.team === 0) LiveStats.hits.vis++;
            else                     LiveStats.hits.home++;
        }
    }

    // 2. APPLY STUN
    p.stunTimer = frames;
    const spinDir = (Math.random() < 0.5 ? 1 : -1);
    p.stunRot = (0.02 + (force * 0.015)) * spinDir;
    p.recoveryTimer = frames + 20;

    // 3. DROP STICK MECHANIC
    if (force > 7.6 && !p.stickDropped) {
        spawnDroppedStick(p);
    }

    // 4. PUCK EJECTION
    if (puck.ownerId === p.id) {
        ejectPuckFromOwner(p);
        const popScale = 1.0 + force * 1.5;
        puck.vx = p.vx + (Math.random() - 0.5) * popScale;
        puck.vy = p.vy + (Math.random() - 0.5) * popScale;
        puckStealCooldown = 25;
    }
}

function updateDroppedStickPhysics(p) {
    if (!p.stickDropped || !p.droppedStick) return;

    const s = p.droppedStick;

    // --- NEW: THE "SLIPPERY NET" FIX ---
    // If the stick is inside the net, gently push it out towards center ice.
    const leftNetX = Math.min(goal1, goal2);
    const rightNetX = Math.max(goal1, goal2);
    const netMouthY = 25; // Half-height of the net opening

    // 1. Check Left Net (Behind Goal Line + Between Posts)
    if (s.x < leftNetX && Math.abs(s.y - RY) < netMouthY) {
        s.vx += 0.15; // Push Right (Out of the net)
        s.vy += (Math.random() - 0.5) * 0.1; // Jiggle it slightly
    }

    // 2. Check Right Net (Behind Goal Line + Between Posts)
    else if (s.x > rightNetX && Math.abs(s.y - RY) < netMouthY) {
        s.vx -= 0.15; // Push Left (Out of the net)
        s.vy += (Math.random() - 0.5) * 0.1; 
    }
    // ------------------------------------

    // 1. Move
    s.x += s.vx;
    s.y += s.vy;
    s.angle += s.rotVel;

    // 2. Friction
    s.vx *= 0.94;
    s.vy *= 0.94;
    s.rotVel *= 0.94;

    // --- KEEP STICK INSIDE RINK (BOUNCE) ---
    const wallBuffer = 15; 
    const minX = (typeof RINK_MIN_X !== 'undefined' ? RINK_MIN_X : 100) + wallBuffer;
    const maxX = (typeof RINK_MAX_X !== 'undefined' ? RINK_MAX_X : 900) - wallBuffer;
    const minY = (typeof RINK_MIN_Y !== 'undefined' ? RINK_MIN_Y : 150) + wallBuffer;
    const maxY = (typeof RINK_MAX_Y !== 'undefined' ? RINK_MAX_Y : 490) - wallBuffer;

    // Bounce X
    if (s.x < minX) { 
        s.x = minX; 
        s.vx *= -0.6; 
        s.rotVel *= -1; 
    }
    if (s.x > maxX) { 
        s.x = maxX; 
        s.vx *= -0.6; 
        s.rotVel *= -1;
    }

    // Bounce Y
    if (s.y < minY) { 
        s.y = minY; 
        s.vy *= -0.6; 
        s.rotVel *= -1;
    }
    if (s.y > maxY) { 
        s.y = maxY; 
        s.vy *= -0.6; 
        s.rotVel *= -1;
    }

    // 3. Stop calculations if barely moving (Optimization)
    if (Math.abs(s.vx) < 0.01 && Math.abs(s.vy) < 0.01 && Math.abs(s.rotVel) < 0.001) {
        s.vx = 0;
        s.vy = 0;
        s.rotVel = 0;
    }
}


function checkPuckGoalieCollision(puck, g) {
    // --- 1. CONFIGURATION (Tune these numbers!) ---
    const padDepth  = 3;    // How "thick" the pads are (Front to Back)
    const padWidth  = 3;   // Width of ONE pad
    const gapWidth  = 2.5;  // The Five-Hole (Puck is diameter 3.0, so this fits easily)
    const fwdOffset = 6;    // How far "Forward" from the center point the pads sit

    // --- 2. TRANSFORM TO LOCAL SPACE ---
    // We rotate the world around the goalie so calculations are easy (AABB)
    const dx = puck.x - g.x;
    const dy = puck.y - g.y;
    const cos = Math.cos(-g.angle); 
    const sin = Math.sin(-g.angle);
    
    // localX = Distance in front of goalie (Forward/Back)
    // localY = Distance to the side (Left/Right)
    const localX = dx * cos - dy * sin; 
    const localY = dx * sin + dy * cos;

    // --- 3. DEFINE THE TWO BOXES (In Local Space) ---
    // Left Pad is at negative Y, Right Pad is at positive Y
    const leftPadY  = -(gapWidth/2 + padWidth/2);
    const rightPadY = +(gapWidth/2 + padWidth/2);
    
    // Both pads are at the same X (Forward offset)
    const padCenterX = fwdOffset;

    // --- 4. CHECK COLLISION HELPER ---
    function checkPad(pX, pY, boxX, boxY, w, h) {
        // Simple AABB vs Circle logic
        // Find closest point on the box to the puck center
        const closestX = Math.max(boxX - w/2, Math.min(pX, boxX + w/2));
        const closestY = Math.max(boxY - h/2, Math.min(pY, boxY + h/2));
        
        const dX = pX - closestX;
        const dY = pY - closestY;
        const distSq = dX*dX + dY*dY;
        
        if (distSq < (puck.r * puck.r)) {
            // HIT! Return the normal (direction to push out)
            const dist = Math.sqrt(distSq);
            return {
                nx: (dist > 0) ? dX / dist : 1, // Default forward if inside
                ny: (dist > 0) ? dY / dist : 0,
                pen: puck.r - dist // Penetration depth
            };
        }
        return null;
    }

    // Check LEFT Pad
    const hitL = checkPad(localX, localY, padCenterX, leftPadY, padDepth, padWidth);
    // Check RIGHT Pad
    const hitR = checkPad(localX, localY, padCenterX, rightPadY, padDepth, padWidth);

    // Pick the hit (or the stronger hit if both somehow happen)
    const hit = hitL || hitR; 

    if (hit) {
        // --- 5. RESOLVE COLLISION ---
        
        // Rotate the local Normal back to World Space
        const worldCos = Math.cos(g.angle);
        const worldSin = Math.sin(g.angle);
        
        const worldNx = hit.nx * worldCos - hit.nx * worldSin; // Wait, rotation formula check below
        const wx = hit.nx * worldCos - hit.ny * worldSin;
        const wy = hit.nx * worldSin + hit.ny * worldCos;

        // Reflect Velocity: v' = v - 2(v.n)n
        const dot = puck.vx * wx + puck.vy * wy;
        
        // BOUNCE!
        puck.vx = (puck.vx - 2 * dot * wx) * 0.5; // 0.5 dampening (soft pads)
        puck.vy = (puck.vy - 2 * dot * wy) * 0.5;
        
        // Push Out (Prevent sticking)
        puck.x += wx * (hit.pen + 0.5);
        puck.y += wy * (hit.pen + 0.5);

        if (Math.abs(dot) > 2.0) {
            const saveKey = (Math.random() < 0.5) ? 'pad_save_1' : 'pad_save_2';
            playGameSound(saveKey, 0.4);
        }

        return true;
    }

    return false;
}

function enforceNetIntegrity(puck) {
    // 1. Define Net Dimensions (Visual Match)
    const goalYTop = topY; // The top post Y
    const goalYBot = botY; // The bottom post Y
    const netDepth = 25;   // How deep the net is
    
    // Left Net (Goal 1)
    const leftGoalLine = Math.min(goal1, goal2);
    const leftNetBack = leftGoalLine - netDepth;
    
    // Right Net (Goal 2)
    const rightGoalLine = Math.max(goal1, goal2);
    const rightNetBack = rightGoalLine + netDepth;

    // 2. CHECK LEFT NET ILLEGAL ENTRY
    // If puck is physically inside the Left Net box...
    if (puck.y > goalYTop && puck.y < goalYBot && puck.x < leftGoalLine && puck.x > leftNetBack) {
        
        // ...BUT it is NOT a goal (game didn't reset), it means it's an illegal state.
        // We push it OUT to the closest valid side (Top, Bottom, or Back).
        
        // Distances to escape
        const dTop = Math.abs(puck.y - goalYTop);
        const dBot = Math.abs(puck.y - goalYBot);
        const dBack = Math.abs(puck.x - leftNetBack);
        
        // Find shortest escape route (Don't push forward into the goal line, that would score!)
        const min = Math.min(dTop, dBot, dBack);
        
        if (min === dTop) {
            puck.y = goalYTop - puck.r - 1; // Pop up
            puck.vy = -Math.abs(puck.vy);   // Reflect velocity
        } else if (min === dBot) {
            puck.y = goalYBot + puck.r + 1; // Pop down
            puck.vy = Math.abs(puck.vy);
        } else {
            puck.x = leftNetBack - puck.r - 1; // Pop back
            puck.vx = -Math.abs(puck.vx);
        }
    }

    // 3. CHECK RIGHT NET ILLEGAL ENTRY
    // If puck is physically inside the Right Net box...
    if (puck.y > goalYTop && puck.y < goalYBot && puck.x > rightGoalLine && puck.x < rightNetBack) {
        
        const dTop = Math.abs(puck.y - goalYTop);
        const dBot = Math.abs(puck.y - goalYBot);
        const dBack = Math.abs(puck.x - rightNetBack);
        
        const min = Math.min(dTop, dBot, dBack);
        
        if (min === dTop) {
            puck.y = goalYTop - puck.r - 1;
            puck.vy = -Math.abs(puck.vy);
        } else if (min === dBot) {
            puck.y = goalYBot + puck.r + 1;
            puck.vy = Math.abs(puck.vy);
        } else {
            puck.x = rightNetBack + puck.r + 1; // Pop back (Right side)
            puck.vx = Math.abs(puck.vx);
        }
    }
}

function detectPuckStuckInNet() {
    // 1. Safety Check
    if (isResetActive()) return false;

    // 2. Define Net Boundaries (Internal Volume)
    // Slightly smaller than physical size to ensure we are truly "inside"
    const internalHeightHalf = (NET_H / 2) - 2;
    const minY = RY - internalHeightHalf; // Top internal edge
    const maxY = RY + internalHeightHalf; // Bottom internal edge

    // Quick vertical check (Optimization)
    if (puck.y < minY || puck.y > maxY) return false;

    const netDepth = 25;    
    const saveBuffer = 5; 
    const r = puck.r;  

    // --- LOGIC: FIND CLOSEST EXIT ---
    function ejectFromNet(isLeftNet, netBackX, netTopY, netBotY) {
        // Drop ownership immediately
        if (puck.ownerId !== null) puck.ownerId = null;

        // Calculate distances to the 3 "walls" (Top, Bottom, Back)
        // We ignore the "Front" because that is the goal line (valid play area)
        
        const dTop = Math.abs(puck.y - netTopY);
        const dBot = Math.abs(puck.y - netBotY);
        const dBack = Math.abs(puck.x - netBackX);

        // Find the winner (smallest distance)
        const min = Math.min(dTop, dBot, dBack);
        const bump = 1.0; // Gentle nudge velocity

        // 1. Closest to TOP mesh?
        if (min === dTop) {
            puck.y = netTopY - (r + 1); // Pop just above the net
            puck.vy = -bump;            // Push Up
            puck.vx *= 0.5;             // Dampen forward momentum
        }
        // 2. Closest to BOTTOM mesh?
        else if (min === dBot) {
            puck.y = netBotY + (r + 1); // Pop just below the net
            puck.vy = bump;             // Push Down
            puck.vx *= 0.5;
        }
        // 3. Closest to BACK mesh?
        else {
            if (isLeftNet) {
                puck.x = netBackX - (r + 1); // Pop left (behind)
                puck.vx = -bump;
            } else {
                puck.x = netBackX + (r + 1); // Pop right (behind)
                puck.vx = bump;
            }
            puck.vy *= 0.5;
        }
    }

    // --- LEFT NET (Goal 1) ---
    const leftGoalLine = Math.min(goal1, goal2);
    const leftNetBack  = leftGoalLine - netDepth;

    // Check if inside Left Net Mesh
    if (puck.x < (leftGoalLine - saveBuffer) && puck.x > leftNetBack) {
        ejectFromNet(true, leftNetBack, minY, maxY);
        return false; // NO WHISTLE
    }

    // --- RIGHT NET (Goal 2) ---
    const rightGoalLine = Math.max(goal1, goal2);
    const rightNetBack  = rightGoalLine + netDepth;

    // Check if inside Right Net Mesh
    if (puck.x > (rightGoalLine + saveBuffer) && puck.x < rightNetBack) {
        ejectFromNet(false, rightNetBack, minY, maxY);
        return false; // NO WHISTLE
    }

    return false;
}

function keepSkatersOutOfNet(p) {
    // Goalies are allowed in the net; everyone else gets kicked out
    if (p.type === "goalie") return;

    // 1. Identify Net Locations
    const leftNetX = Math.min(goal1, goal2);
    const rightNetX = Math.max(goal1, goal2);

    // 2. Define the "No-Go Zone"
    // We allow them to step slightly onto the line (to poke at rebounds), 
    // but not deep into the net.
    const allowedDepth = 5; // How far past the line they can go
    const netDepth = 40;    // The back of the net
    const netHeight = (NET_H / 2) + 2;

    // --- CHECK LEFT NET ---
    // If player is between the goal line and the back of the net
    if (p.x < leftNetX + allowedDepth && p.x > leftNetX - netDepth) {
        if (Math.abs(p.y - RY) < netHeight) {
            // EJECT RIGHT
            p.x = leftNetX + allowedDepth + 2; // Snap them to the ice
            p.vx = Math.abs(p.vx) * 0.5 + 2.0; // Add strong rightward velocity
        }
    }

    // --- CHECK RIGHT NET ---
    if (p.x > rightNetX - allowedDepth && p.x < rightNetX + netDepth) {
        if (Math.abs(p.y - RY) < netHeight) {
            // EJECT LEFT
            p.x = rightNetX - allowedDepth - 2; // Snap them to the ice
            p.vx = -(Math.abs(p.vx) * 0.5 + 2.0); // Add strong leftward velocity
        }
    }
}

function solveSkaterKinematics(p) {
    const s = SKATER_SPECS;
    const handDir = p.handing || 1; 

    // --- FETCH DRIBBLE OFFSETS ---
    const dRot = p.dribbleRot || 0;
    const dY   = p.dribbleY || 0;

    // 1. Body & Hands
    const torsoRotRad = ((p.pose.rot + dRot) * Math.PI / 180);
    const totalRot = p.visualBodyAngle + torsoRotRad;
    const cos = Math.cos(totalRot);
    const sin = Math.sin(totalRot);

    const toWorld = (lx, ly) => ({
        x: p.x + (lx * cos) - (ly * sin),
        y: p.y + (lx * sin) + (ly * cos)
    });

    p.topHand = toWorld(s.topX, s.topY * handDir);
    p.bottomHand = toWorld(p.pose.botX, (p.pose.botY + dY) * handDir);

    // 2. Stick Angle
    const stickDX = p.bottomHand.x - p.topHand.x;
    const stickDY = p.bottomHand.y - p.topHand.y;
    p.currentStickAngle = Math.atan2(stickDY, stickDX);

    // 3. Blade Position
    p.bladePos = {
        x: p.bottomHand.x + Math.cos(p.currentStickAngle) * p.pose.reach,
        y: p.bottomHand.y + Math.sin(p.currentStickAngle) * p.pose.reach
    };

    // 4. Wall Clamp (Blade Safety)
    // We keep the blade inside so the stick doesn't look like it's piercing the glass
    const wallBuffer = 2.5; 
    const minX = (typeof RINK_MIN_X !== 'undefined') ? RINK_MIN_X : 100;
    const maxX = (typeof RINK_MAX_X !== 'undefined') ? RINK_MAX_X : 900;
    const minY = (typeof RINK_MIN_Y !== 'undefined') ? RINK_MIN_Y : 150;
    const maxY = (typeof RINK_MAX_Y !== 'undefined') ? RINK_MAX_Y : 490;

    if (p.bladePos.x < minX + wallBuffer) p.bladePos.x = minX + wallBuffer;
    if (p.bladePos.x > maxX - wallBuffer) p.bladePos.x = maxX - wallBuffer;
    if (p.bladePos.y < minY + wallBuffer) p.bladePos.y = minY + wallBuffer;
    if (p.bladePos.y > maxY - wallBuffer) p.bladePos.y = maxY - wallBuffer;

    // 5. CRADLE CALCULATION (Puck Position)
    const visualBladeAngle = p.currentStickAngle - (0.7 * handDir);
    const normAng = visualBladeAngle + Math.PI/2;
    
    const maxGap = 1.5; 
    const baseMag = Math.abs(s.cradleY) + maxGap;

    let crossoverFactor = 0;
    if (typeof p.dribblePhase !== 'undefined') {
        const wave = Math.sin(p.dribblePhase);
        crossoverFactor = Math.tanh(wave * 4); 
    } else {
        crossoverFactor = 1.0; 
    }

    let dir = Math.sign(s.cradleY * handDir); 
    if (dir === 0) dir = 1;
    let pocketDepth = baseMag * dir * crossoverFactor; 

    p.cradlePos = {
        x: p.bladePos.x + (Math.cos(visualBladeAngle) * s.cradleX) + (Math.cos(normAng) * pocketDepth),
        y: p.bladePos.y + (Math.sin(visualBladeAngle) * s.cradleX) + (Math.sin(normAng) * pocketDepth)
    };

    // --- 6. CRADLE CLAMP (THE FIX) ---
    // Ensure the puck itself NEVER clips through the wall, regardless of animation.
    // We clamp slightly more aggressively than the blade (puck.r is usually ~2.0)
    const puckR = (typeof puck !== 'undefined') ? puck.r : 2.0;
    const puckBuffer = puckR + 0.5;

    if (p.cradlePos.x < minX + puckBuffer) p.cradlePos.x = minX + puckBuffer;
    if (p.cradlePos.x > maxX - puckBuffer) p.cradlePos.x = maxX - puckBuffer;
    if (p.cradlePos.y < minY + puckBuffer) p.cradlePos.y = minY + puckBuffer;
    if (p.cradlePos.y > maxY - puckBuffer) p.cradlePos.y = maxY - puckBuffer;
}
