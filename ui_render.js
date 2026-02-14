let menuIndex = 0;
// Add "Training" to the menu list
const menuItems = ["New Game", "Tournament", "Training", "Options", "Exit"];

// --- TRAINING MENU STATE ---
let trainingIndex = 0;
// Menu Options: [0:File, 1:Opp1, 2:Opp2, 3:Opp3, 4:Rounds, 5:Episodes, 6:Start]
const trainingItems = ["Load Trainee", "Opponent 1", "Opponent 2", "Opponent 3", "Rounds", "Episodes", "Baseline", "BEGIN"];

let optionsIndex = 0;        
// *** UPDATE THIS LIST TO INCLUDE "POSITION" ***
const optionsItems = ["Skaters", "Human Team", "Position", "Blue Strategy", "Red Strategy", "Offsides", "Icing", "Back"];

// Helper for display names
const POS_NAMES = ["Center", "Right Wing", "Left Defense", "Left Wing", "Right Defense"];

function drawMenu() {
    // Background
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Title
    ctx.fillStyle = "#fff";
    ctx.font = "40px Arial";
    ctx.fillText("UNIFIED AI HOCKEY", W / 2, 140);

    // Subtitle
    ctx.font = "26px Arial";
    ctx.fillText("MENU", W / 2, 200);

    // Menu items
    ctx.font = "24px Arial";
    for (let i = 0; i < menuItems.length; i++) {
        const y = 280 + i * 40;

        if (i === menuIndex) {
            // highlight box
            ctx.fillStyle = "#2255ff";
            ctx.fillRect(W/2 - 160, y - 20, 320, 36);

            ctx.fillStyle = "#fff";
        } else {
            ctx.fillStyle = "#bbb";
        }

        ctx.fillText(menuItems[i], W / 2, y);
    }

    // Footer hint
    ctx.fillStyle = "#666";
    ctx.font = "16px Arial";
    ctx.fillText("Use ↑ ↓ to navigate, Enter to select", W / 2, H - 60);
}

function drawTrainingMenu() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Title
    ctx.fillStyle = "#7aa2f7"; 
    ctx.font = "bold 40px Arial";
    ctx.fillText("AI TRAINING CAMP", W / 2, 60);

    const keys = Object.keys(Strategies);
    ctx.font = "20px Arial";
    
    // Helper to draw rows
    const drawRow = (idx, label, value) => {
        const y = 140 + (idx * 50);
        
        // Highlight Box
        if (idx === trainingIndex) {
            ctx.fillStyle = "#2255ff";
            ctx.fillRect(W/2 - 300, y - 25, 600, 40);
            ctx.fillStyle = "#fff";
        } else {
            ctx.fillStyle = "#bbb";
        }

        // Draw Text
        ctx.textAlign = "left";
        ctx.fillText(label, W/2 - 280, y);
        
        ctx.textAlign = "right";
        ctx.fillText(value, W/2 + 280, y);
    };

    // 0. Load Trainee
    drawRow(0, "Trainee File:", train_loadedTeamName);

    // 1-3. Opponents
    drawRow(1, "Opponent 1:", Strategies[keys[train_opponents[0]]].teamName);
    drawRow(2, "Opponent 2:", Strategies[keys[train_opponents[1]]].teamName);
    drawRow(3, "Opponent 3:", Strategies[keys[train_opponents[2]]].teamName);

    // 4. Rounds
    drawRow(4, "Tourney Rounds:", train_rounds);

    // 5. Episodes
    const epText = (train_episodes === -1) ? "INFINITE ♾️" : train_episodes;
    drawRow(5, "Total Episodes:", epText);

    // 6. NEW: Baseline Setting
    const blText = (train_baseline === -1) ? "Auto (Ep 1)" : train_baseline + " Pts";
    drawRow(6, "Min Baseline:", blText);

    // 7. BEGIN BUTTON (Now at Index 7)
    const startY = 140 + (7 * 50) + 20;
    if (trainingIndex === 7) {
        ctx.fillStyle = "#00ff00"; // Green Highlight
        ctx.fillRect(W/2 - 100, startY - 25, 200, 50);
        ctx.fillStyle = "#000";
    } else {
        ctx.fillStyle = "#333";
        ctx.fillRect(W/2 - 100, startY - 25, 200, 50);
        ctx.fillStyle = "#fff";
    }
    ctx.textAlign = "center";
    ctx.font = "bold 24px Arial";
    ctx.fillText("BEGIN", W/2, startY);

    // Footer
    ctx.fillStyle = "#666";
    ctx.font = "14px Arial";
    ctx.fillText("ENTER to Select | LEFT/RIGHT to Adjust | ESC to Exit", W/2, H - 30);
}

function drawOptionsMenu() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#fff";
    ctx.font = "30px Arial";
    ctx.fillText("GAME SETUP", W / 2, 80);

    ctx.font = "20px Arial";
    
    // Helper to get names safely
    const keys = Object.keys(Strategies);
    const s0 = keys.length ? Strategies[keys[team0Index % keys.length]] : null;
    const s1 = keys.length ? Strategies[keys[team1Index % keys.length]] : null;

    const name0 = s0 ? `${s0.teamName}` : "None";
    const name1 = s1 ? `${s1.teamName}` : "None";

    // 1. Skaters
    ctx.fillStyle = (optionsIndex === 0) ? "#00d" : "#bbb";
    ctx.fillText(`Skaters: < ${OPT_SKATERS} >`, W / 2, 160);

    // 2. Human Team
    let teamName = "AI vs AI";
    if (OPT_HUMAN_TEAM === 0) teamName = "Play on AWAY team";
    if (OPT_HUMAN_TEAM === 1) teamName = "Play on HOME team";
    
    ctx.fillStyle = (optionsIndex === 1) ? "#00d" : "#bbb";
    ctx.fillText(`Control: < ${teamName} >`, W / 2, 210);

    // 3. Position (Only show if Human is playing)
    if (OPT_HUMAN_TEAM !== -1) {
        ctx.fillStyle = (optionsIndex === 2) ? "#00d" : "#bbb";
        // Safety clamp just in case
        if (OPT_HUMAN_POS >= OPT_SKATERS) OPT_HUMAN_POS = OPT_SKATERS - 1;
        const pName = POS_NAMES[OPT_HUMAN_POS] || "Unknown";
        ctx.fillText(`My Pos: < ${pName} >`, W / 2, 240);
    } else {
        ctx.fillStyle = "#555";
        ctx.fillText(`(Watch Mode Active)`, W / 2, 240);
    }

    // 4. Blue Strategy
    ctx.fillStyle = (optionsIndex === 3) ? "#00d" : "#bbb";
    ctx.fillText(`Away Team: < ${name0} >`, W / 2, 280);

    // 5. Red Strategy
    ctx.fillStyle = (optionsIndex === 4) ? "#00d" : "#bbb";
    ctx.fillText(`Home Team: < ${name1} >`, W / 2, 320);

    // *** 6. Offsides Toggle ***
    ctx.fillStyle = (optionsIndex === 5) ? "#00d" : "#bbb";
    const offText = RULE_OFFSIDES ? "ON" : "OFF";
    ctx.fillText(`Offsides: < ${offText} >`, W / 2, 380);

    // *** 7. Icing Toggle ***
    ctx.fillStyle = (optionsIndex === 6) ? "#00d" : "#bbb";
    const icingText = RULE_ICING ? "ON" : "OFF";
    ctx.fillText(`Icing: < ${icingText} >`, W / 2, 420);

    // 8. Back Button (Moved down)
    ctx.fillStyle = (optionsIndex === 7) ? "#00d" : "#bbb";
    ctx.fillText("START GAME", W / 2, 460); // Adjusted Y position
    
    ctx.fillStyle = "#666";
    ctx.font = "14px Arial";
    ctx.fillText("Left/Right to Change | Enter to Select", W / 2, H - 40);
}

function drawBroadcastScoreboard() {
    // --- MAIN CONTAINER CONFIG ---
    const x = 100;    
    const y = 20;     
    const w = 200;    
    const h = 40;     
    const r = 8;      

    // --- CALCULATE DATA ---
    const goalie0 = players.find(p => p.team === 0 && p.type === "goalie");
    const goalie1 = players.find(p => p.team === 1 && p.type === "goalie");
    const sog0 = scoreTeam0 + (goalie1 ? goalie1.saves : 0);
    const sog1 = scoreTeam1 + (goalie0 ? goalie0.saves : 0);

    // Calculate Period String
    let periodText = "";
    if (currentPeriod === 1) periodText = "1ST ";
    else if (currentPeriod === 2) periodText = "2ND ";
    else if (currentPeriod === 3) periodText = "3RD ";
    else periodText = "OT" + (currentPeriod - 3) + " "; // OT1, OT2, etc.

    // Calculate Clock String
    let clockText = formatTime(timeRemaining);
    if (gameState === 'intermission') clockText = "INT"; // Shortened for space
    else if (gameState === 'gameover') clockText = "END";

    ctx.save();

    // 1. DRAW MAIN WHITE BACKGROUND
    ctx.beginPath();
    ctx.moveTo(x, y);             
    ctx.lineTo(x + w, y);         
    ctx.lineTo(x + w, y + h - r); 
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); 
    ctx.lineTo(x, y + h);         
    ctx.lineTo(x, y);             
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();


    // 2. INNER RECTANGLES SETUP
    const rectW = 60;
    const rectH = 25;
    const gap = 2; 
    
    const totalInnerW = (rectW * 2) + gap;
    const startX = x + (w - totalInnerW) / 2; 
    const rectY = y; 

    // 3. DRAW COLORED TABS
    // Team 0 (Left)
    ctx.fillStyle = TEAM0_COLOR;
    ctx.fillRect(startX, rectY, rectW, rectH);

    // Get Codes from current strategies (Default to "BLU"/"RED" if missing)
    const code0 = Team0_Strategy ? Team0_Strategy.code : "BLU";
    const code1 = Team1_Strategy ? Team1_Strategy.code : "RED";


    // Team 1 (Right)
    const rightBoxX = startX + rectW + gap;
    ctx.fillStyle = TEAM1_COLOR;
    ctx.fillRect(rightBoxX, rectY, rectW, rectH);

    // 4. DRAW SCORES & NAMES
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle"; 

    // Team 0
    ctx.textAlign = "left";
    ctx.font = "12px Arial"; 
    ctx.fillText(code0, startX + 5, rectY + rectH/2 + 1);

    ctx.textAlign = "right";
    ctx.font = "bold 16px Arial"; 
    ctx.fillText(scoreTeam0, startX + rectW - 5, rectY + rectH/2 + 1);

    // Team 1
    ctx.textAlign = "left";
    ctx.font = "12px Arial"; 
    ctx.fillText(code1, rightBoxX + 5, rectY + rectH/2 + 1);

    ctx.textAlign = "right";
    ctx.font = "bold 16px Arial"; 
    ctx.fillText(scoreTeam1, rightBoxX + rectW - 5, rectY + rectH/2 + 1);

    // 5. DRAW CLOCK & PERIOD (Top Right Stack)
    ctx.fillStyle = "#000000";
    ctx.textAlign = "right";
    
    // Clock (Top half of the space)
    ctx.font = "bold 14px Arial"; 
    ctx.fillText(clockText, x + w - 8, y + 14); 

    // Period (Bottom half of the space)
    ctx.font = "10px Arial"; 
    ctx.fillText(periodText, x + w - 8, y + 28); 

    // 6. DRAW SHOTS (Bottom Center Strip)
    const bottomCenterY = y + 33; 
    const centerX = x + w / 2;

    ctx.textAlign = "center";
    ctx.font = "bold 10px Arial"; 
    ctx.fillText("SHOTS", centerX, bottomCenterY);

    ctx.font = "12px Arial";
    ctx.fillText(sog0, centerX - 35, bottomCenterY); 
    ctx.fillText(sog1, centerX + 35, bottomCenterY); 

    ctx.restore();



        // Add this inside drawScoreboard or drawBroadcastScoreboard
    if (pendingRosterChanges.team0 !== 0 || pendingRosterChanges.team1 !== 0) {
        ctx.save();
        ctx.font = "bold 16px Arial";
        ctx.fillStyle = "#ffff00"; // Yellow warning text
        ctx.textAlign = "center";
        
        let msg = "ROSTER CHANGE PENDING (WAIT FOR WHISTLE)";
        // Draw it just below the scoreboard
        ctx.fillText(msg, W/2, 110); 
        
        // Optional: Show specific details
        let detail = "";
        if (pendingRosterChanges.team0 !== 0) detail += `Visitor: ${pendingRosterChanges.team0 > 0 ? '+' : ''}${pendingRosterChanges.team0} `;
        if (pendingRosterChanges.team1 !== 0) detail += `Home: ${pendingRosterChanges.team1 > 0 ? '+' : ''}${pendingRosterChanges.team1}`;
        
        ctx.font = "12px Arial";
        ctx.fillText(detail, W/2, 130);
        ctx.restore();
    }
}

function drawScoreboard() {
    const centerX = W / 2;
    const topMargin = 50;
    const fontHeight = 40;
    const timeStr = formatTime(timeRemaining);
    
    // Find Goalies to get stats
    const goalie0 = players.find(p => p.team === 0 && p.type === "goalie");
    const goalie1 = players.find(p => p.team === 1 && p.type === "goalie");

    // CALCULATE SHOTS ON GOAL (SOG)
    // Team 0 SOG = Team 0 Goals + Goalie 1 Saves
    const sog0 = scoreTeam0 + (goalie1 ? goalie1.saves : 0);

    // Team 1 SOG = Team 1 Goals + Goalie 0 Saves
    const sog1 = scoreTeam1 + (goalie0 ? goalie0.saves : 0);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 1. Period
    ctx.font = "24px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText("P" + currentPeriod, centerX, topMargin - 35);

    // 2. Scores
    ctx.font = `bold ${fontHeight}px Arial`;
    
    // Team 0 (Blue/Left)
    ctx.fillStyle = TEAM0_COLOR; 
    ctx.fillText(scoreTeam0, centerX - 100, topMargin);
    
    // Team 1 (Red/Right)
    ctx.fillStyle = TEAM1_COLOR; 
    ctx.fillText(scoreTeam1, centerX + 100, topMargin);

    // 3. Shots on Goal (UPDATED)
    ctx.font = "14px Arial";
    ctx.fillStyle = "#bbb";
    
    // Display SOG under the score
    ctx.fillText(`SOG: ${sog0}`, centerX - 100, topMargin + 30);
    ctx.fillText(`SOG: ${sog1}`, centerX + 100, topMargin + 30);

    // 4. Clock
    ctx.font = `${fontHeight}px Arial`; 
    ctx.fillStyle = "#fff"; 
    ctx.fillText(timeStr, centerX, topMargin);
}

function drawStatsOverlay() {
    if (!SHOW_STATS_OVERLAY) return;

    // 1. Setup Window Dimensions (Your Custom Size)
    const boxW = 300; 
    const boxH = 120; 
    const margin = 10;
    const x = W - boxW - margin; 
    const y = margin;

    ctx.save();

    // 2. Draw Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, boxW, boxH);

    // 3. Header
    ctx.fillStyle = "#aaa";
    ctx.font = "11px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("ATTACK ZONE TIME", x + 10, y + 10); // Changed Label

    // Separator
    ctx.strokeStyle = "#444";
    ctx.beginPath(); ctx.moveTo(x + 10, y + 28); ctx.lineTo(x + boxW - 10, y + 28); ctx.stroke();

    // 4. Data Rows
    ctx.font = "12px Monospace";
    const fmt = (sec) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    let rowY = y + 40;
    const gap = 20;

    // VISITOR ROW (Attack Time)
    ctx.fillStyle = "#fff"; 
    // Label: AWAY ATTACK
    ctx.fillText(`AWAY: ${fmt(LiveStats.attackTime.vis)}   HITS: ${LiveStats.hits.vis}`, x + 10, rowY);
    
    // HOME ROW (Attack Time)
    rowY += gap;
    ctx.fillStyle = "#fff";
    // Label: HOME ATTACK
    ctx.fillText(`HOME: ${fmt(LiveStats.attackTime.home)}   HITS: ${LiveStats.hits.home}`, x + 10, rowY);

    ctx.restore();
}

function drawGameOverOverlay() {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#fff";
    ctx.font = "bold 60px Arial";
    ctx.fillText("GAME OVER", W/2, H/2);

    let winner;
    if (scoreTeam0 > scoreTeam1) winner = "TEAM 0 WINS!";
    else if (scoreTeam1 > scoreTeam0) winner = "TEAM 1 WINS!";
    else winner = "TIE GAME";

    ctx.font = "40px Arial";
    // ctx.fillText(winner, W/2, H/2 + 10);

    ctx.font = "24px Arial";
    // ctx.fillText("Press ESC for Menu", W/2, H/2 + 70);

    ctx.restore();
}

function drawWhistleOverlay() {
    // This assumes the canvas context 'ctx', width 'W', height 'H', and center 'RY' are globally available.
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 4;
    
    const boxW = 500;
    const boxH = 80;
    const boxX = (W - boxW) / 2;
    const boxY = RY - boxH / 2; // RY is the vertical center

    // Draw background box
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#333";
    ctx.font = "bold 30px Arial";
    ctx.fillText("WHISTLE!", W/2, boxY + 25);

    ctx.font = "20px Arial";
    ctx.fillText(whistleMessage, W/2, boxY + 55);

    ctx.restore();
}

function drawPeriodOverlay() {
    if (!periodMessage || performance.now() > periodMessageUntil) return;

    updateCrowdVisuals()

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#fff";
    ctx.font = "bold 48px Arial";
    ctx.fillText(periodMessage, W/2, H/2);

    ctx.restore();
}

function renderTournamentStatus() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    
    // =========================================================
    // MODE A: TRAINING GAUNTLET VIEW (With SOG Columns)
    // =========================================================
    if (typeof Tournament !== 'undefined' && Tournament.isTrainingEpisode) {
        
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 24px Arial";
        ctx.fillText("🏋️ TRAINING CAMP REPORT", W/2, 40);

        // Header Info
        ctx.font = "16px Arial";
        ctx.fillStyle = "#aaa";
        if (typeof AICoach !== 'undefined') {
            const epTxt = (AICoach.maxEpisodes > 99999) ? "∞" : AICoach.maxEpisodes;
            ctx.fillText(`Episode: ${AICoach.currentEpisode} / ${epTxt}`, W/2, 65);
            ctx.font = "italic 14px Arial";
            ctx.fillText(AICoach.mutationDetails, W/2, 85);
        }

        const startY = 120;
        const rowH = 35;
        // Columns: MATCHUP, GP, W, L, OTL, GF, GA, SOGF, SOGA, PTS
        const colX = [150, 320, 380, 440, 500, 580, 640, 720, 780, 880];

        // Headers
        ctx.textAlign = "right";
        ctx.fillStyle = "#888";
        ctx.font = "bold 14px Monospace";
        ctx.fillText("MATCHUP", colX[0], startY);
        
        ctx.textAlign = "center";
        ctx.fillText("GP", colX[1], startY);
        ctx.fillText("W", colX[2], startY);
        ctx.fillText("L", colX[3], startY);
        ctx.fillText("OTL", colX[4], startY);
        ctx.fillText("GF", colX[5], startY);
        ctx.fillText("GA", colX[6], startY);
        ctx.fillStyle = "#aaa";
        ctx.fillText("SOGF", colX[7], startY);
        ctx.fillText("SOGA", colX[8], startY);
        ctx.fillStyle = "#fff";
        ctx.fillText("PTS", colX[9], startY);

        ctx.font = "16px Monospace";

        // 1. Draw Individual Opponent Rows
        const oppKeys = Object.keys(Tournament.matchupStats);
        let y = startY + 30;

        oppKeys.forEach((oppId, i) => {
            const s = Tournament.matchupStats[oppId];
            
            ctx.fillStyle = "#ccc";
            ctx.textAlign = "right";
            ctx.fillText("vs " + s.code, colX[0], y);

            ctx.textAlign = "center";
            ctx.fillText(s.GP, colX[1], y);
            ctx.fillStyle = "#4f4"; ctx.fillText(s.W, colX[2], y);
            ctx.fillStyle = "#f44"; ctx.fillText(s.L, colX[3], y);
            ctx.fillStyle = "#ccc"; ctx.fillText(s.OTL, colX[4], y);
            
            ctx.fillStyle = "#888";
            ctx.fillText(s.GF, colX[5], y);
            ctx.fillText(s.GA, colX[6], y);
            
            // Draw SOG Averages
            const avgSOGF = s.GP > 0 ? (s.SOGF / s.GP).toFixed(1) : "0.0";
            const avgSOGA = s.GP > 0 ? (s.SOGA / s.GP).toFixed(1) : "0.0";
            ctx.fillStyle = "#aaa";
            ctx.fillText(avgSOGF, colX[7], y);
            ctx.fillText(avgSOGA, colX[8], y);
            
            ctx.fillStyle = "#fff";
            ctx.font = "bold 16px Monospace";
            ctx.fillText(s.Pts, colX[9], y);
            ctx.font = "16px Monospace";

            y += rowH;
        });

        // Divider
        y += 5;
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(950, y); ctx.stroke();
        y += 30;

        // 2. TOTALS ROW (Blue)
        const total = Tournament.standings["TRAINEE"];
        if (total) {
            ctx.fillStyle = "#7aa2f7"; 
            ctx.textAlign = "right";
            ctx.font = "bold 18px Monospace";
            ctx.fillText("CURRENT TOTAL", colX[0], y);

            ctx.textAlign = "center";
            ctx.fillText(total.GP, colX[1], y);
            ctx.fillText(total.W, colX[2], y);
            ctx.fillText(total.L, colX[3], y);
            ctx.fillText(total.OTL, colX[4], y);
            ctx.fillText(total.GF, colX[5], y);
            ctx.fillText(total.GA, colX[6], y);
            
            const totSOGF = total.GP > 0 ? (total.totalSOGF / total.GP).toFixed(1) : "0.0";
            const totSOGA = total.GP > 0 ? (total.totalSOGA / total.GP).toFixed(1) : "0.0";
            ctx.fillStyle = "#aaa";
            ctx.fillText(totSOGF, colX[7], y);
            ctx.fillText(totSOGA, colX[8], y);
            
            ctx.fillStyle = "#fff";
            ctx.fillText(total.Pts, colX[9], y);
            
            y += rowH + 10;
        }

        // 3. BEST RECORD ROW (Gold)
        if (typeof AICoach !== 'undefined' && AICoach.bestStats) {
            const bs = AICoach.bestStats;
            

            ctx.fillStyle = "#FFD700"; // Gold Text
            ctx.textAlign = "right"; 
            ctx.fillText("BEST SO FAR", colX[0], y);

            ctx.textAlign = "center";
            ctx.fillText(bs.GP, colX[1], y);
            ctx.fillText(bs.W, colX[2], y);
            ctx.fillText(bs.L, colX[3], y);
            ctx.fillText(bs.OTL, colX[4], y);
            ctx.fillText(bs.GF, colX[5], y);
            ctx.fillText(bs.GA, colX[6], y);
            
            const bSOGF = bs.GP > 0 ? (bs.totalSOGF / bs.GP).toFixed(1) : "-";
            const bSOGA = bs.GP > 0 ? (bs.totalSOGA / bs.GP).toFixed(1) : "-";
            ctx.fillText(bSOGF, colX[7], y);
            ctx.fillText(bSOGA, colX[8], y);
            
            ctx.font = "bold 18px Monospace";
            ctx.fillText(bs.Pts, colX[9], y);
        }

        // Stop Warning Overlay
        if (typeof AICoach !== 'undefined' && AICoach.stopRequested) {
            ctx.fillStyle = "rgba(0,0,0,0.8)";
            ctx.fillRect(W/2 - 200, H - 120, 400, 50);
            ctx.strokeStyle = "#f7768e"; ctx.lineWidth = 2; ctx.strokeRect(W/2 - 200, H - 120, 400, 50);
            ctx.fillStyle = "#f7768e"; ctx.textAlign = "center"; ctx.font = "bold 18px Arial";
            ctx.fillText("🛑 STOP REQUESTED... Finishing Episode", W/2, H - 90);
        } else if (typeof AICoach !== 'undefined' && AICoach.active) {
            ctx.fillStyle = "#666"; ctx.textAlign = "center"; ctx.font = "12px Arial";
            ctx.fillText("Press 'Q' to Save & Quit", W/2, H - 70);
        }
    }
    // =========================================================
    // MODE B: STANDARD SEASON VIEW (Standard Tournament)
    // =========================================================
    else {
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 24px Arial";
        
        // DYNAMIC TITLE
        const title = (Tournament.active) ? "🏆 LIVE STANDINGS" : "🏆 FINAL STANDINGS";
        ctx.fillText(title, W/2, 40);

        const sorted = Object.values(Tournament.standings).sort((a,b) => {
            if (b.Pts !== a.Pts) return b.Pts - a.Pts;
            if (b.W !== a.W) return b.W - a.W;
            return (b.GF - b.GA) - (a.GF - a.GA);
        });

        const startY = 80;
        const rowH = 22;
        const colX = [80, 140, 340, 390, 440, 490, 540, 590, 660, 720, 770, 840, 920]; 
        
        ctx.textAlign = "left";
        ctx.font = "bold 13px Monospace";
        ctx.fillStyle = "#888"; 
        
        ctx.fillText("RK", colX[0], startY);
        ctx.fillText("TEAM", colX[1], startY);
        ctx.fillText("GP", colX[2], startY);
        ctx.fillText("W", colX[3], startY);
        ctx.fillText("L", colX[4], startY);
        ctx.fillText("OTL", colX[5], startY);
        ctx.fillText("SOW", colX[6], startY);
        ctx.fillText("SOL", colX[7], startY);
        
        ctx.fillStyle = "#fff"; ctx.fillText("PTS", colX[8], startY);
        ctx.fillStyle = "#888"; ctx.fillText("GF", colX[9], startY); ctx.fillText("GA", colX[10], startY);
        ctx.fillStyle = "#aaa"; ctx.fillText("SOGF", colX[11], startY); ctx.fillText("SOGA", colX[12], startY);

        ctx.font = "13px Monospace"; 
        
        sorted.forEach((t, i) => {
            const y = startY + 25 + (i * rowH);
            if (y > H - 100) return; 

            if (i % 2 === 0) {
                ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
                ctx.fillRect(60, y - 16, 900, rowH);
            }

            ctx.fillStyle = "#ccc"; 
            ctx.fillText((i + 1) + ".", colX[0], y);
            ctx.fillText(t.name.substring(0, 20), colX[1], y);
            ctx.fillText(t.GP, colX[2], y);
            ctx.fillText(t.W, colX[3], y);
            ctx.fillText(t.L, colX[4], y);
            ctx.fillText(t.OTL, colX[5], y);
            ctx.fillText(t.SOW, colX[6], y);
            ctx.fillText(t.SOL, colX[7], y);
            ctx.fillStyle = "#fff"; ctx.fillText(t.Pts, colX[8], y);
            ctx.fillStyle = "#888"; ctx.fillText(t.GF, colX[9], y); ctx.fillText(t.GA, colX[10], y);

            // FIX IS HERE: DEFINING THE VARIABLES BEFORE USING THEM
            const avgSOGF = (t.GP > 0) ? (t.totalSOGF / t.GP).toFixed(1) : "0.0";
            const avgSOGA = (t.GP > 0) ? (t.totalSOGA / t.GP).toFixed(1) : "0.0";

            ctx.fillStyle = "#aaa"; ctx.fillText(avgSOGF, colX[11], y); ctx.fillText(avgSOGA, colX[12], y);
        });

        // EXIT INSTRUCTION
        if (!Tournament.active) {
            ctx.fillStyle = "#666";
            ctx.textAlign = "center";
            ctx.font = "14px Arial";
            ctx.fillText("Press ESC to Return to Menu", W/2, H - 30);
        }
    }

    // 5. FOOTER (Active Match Score) - Only show if tournament is ACTIVE
    if (Tournament.active && Tournament.currentMatchIndex < Tournament.matches.length) {
        const idx = Tournament.currentMatchIndex;
        const total = Tournament.matches.length;
        const m = Tournament.matches[idx];
        const hName = Strategies[m.home].code;
        const aName = Strategies[m.away].code;
        
        // Safe fallback for SOG display
        const sog0 = Tournament.standings[m.home] ? (Tournament.standings[m.home].totalSOGF || 0) : 0; 
        
        ctx.fillStyle = "#111";
        ctx.fillRect(0, H - 60, W, 60);
        ctx.strokeStyle = "#444"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, H-60); ctx.lineTo(W, H-60); ctx.stroke();

        const footerY = H - 25;
        ctx.textAlign = "left"; ctx.font = "14px Arial"; ctx.fillStyle = "#666";
        ctx.fillText(`MATCH ${idx+1} / ${total}`, 30, footerY);

        ctx.textAlign = "center"; ctx.font = "bold 24px Arial"; ctx.fillStyle = "#fff";
        ctx.fillText(`${hName}  ${scoreTeam0} - ${scoreTeam1}  ${aName}`, W/2, footerY + 8);
        
        ctx.textAlign = "right"; ctx.font = "14px Monospace"; ctx.fillStyle = "#888";
        const pTxt = currentPeriod > 3 ? "OT" : "P" + currentPeriod;
        ctx.fillText(`${pTxt} | ${Math.floor(timeRemaining)}s`, W - 30, footerY);
    }
}

function drawTournamentResults() {
    // Re-use logic from Live Status but center it for final screen
    renderTournamentStatus();
    
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px Arial";
    ctx.fillText("TOURNAMENT COMPLETE - Press ESC to Return", W/2, H - 85); // Above footer
    ctx.restore();
}
