// =========================================================
// PLAYOFF ENGINE (Centered Bracket Layout)
// =========================================================

const Playoffs = {
    active: false,
    round: 1, 
    bracket: { round1: [], round2: [], round3: [] },
    
    seriesRotationIndex: 0, 
    activeSeries: null,
    
    // Warp Controls
    watchMode: false,
    speedMult: 300,
    
    // Throttle State
    lastFrameTime: 0,
    
    // View Toggle State
    viewMode: "bracket", 
    finalStandingsReference: null, 

    // 1. INITIALIZE
    init: function(finalStandings) {
        this.active = true;
        this.round = 1;
        this.seriesRotationIndex = 0;
        this.watchMode = false; 
        this.lastFrameTime = 0;
        this.finalStandingsReference = finalStandings;
        this.viewMode = "bracket";

        console.log("🔥 PLAYOFFS INITIALIZED 🔥");

        const sorted = Object.values(finalStandings).sort((a, b) => {
            if (b.Pts !== a.Pts) return b.Pts - a.Pts;
            if (b.W !== a.W) return b.W - a.W;
            return (b.GF - b.GA) - (a.GF - a.GA);
        });

        const seeds = sorted.slice(0, 8);
        if (seeds.length < 8) {
            this.active = false;
            return;
        }

        this.bracket.round1 = [
            this.createSeries(seeds[0], seeds[7]),
            this.createSeries(seeds[1], seeds[6]),
            this.createSeries(seeds[2], seeds[5]),
            this.createSeries(seeds[3], seeds[4])
        ];
        
        this.bracket.round2 = [];
        this.bracket.round3 = [];

        gameState = "playoff_bracket"; 
        
        if (!this.watchMode) {
            setTimeout(() => this.startNextGame(), 1000);
        }
    },

    createSeries: function(teamA, teamB) {
        return {
            highSeed: teamA.id,
            lowSeed: teamB.id,
            highName: teamA.code,
            lowName: teamB.code,
            winsHigh: 0,
            winsLow: 0,
            winner: null,
            games: [] 
        };
    },

    toggleWatchMode: function() {
        this.watchMode = !this.watchMode;
        if (!this.watchMode) faceoffPauseUntil = 0;
    },
    
    toggleView: function() {
        if (this.viewMode === "bracket") this.viewMode = "standings";
        else this.viewMode = "bracket";
    },

    // 3. START NEXT GAME
    startNextGame: function() {
        const roundArr = this.getCurrentRoundArray();
        
        let foundSeries = null;
        let attempts = 0;

        while(attempts < roundArr.length) {
            const s = roundArr[this.seriesRotationIndex];
            if (s.winner === null) {
                foundSeries = s;
                this.seriesRotationIndex = (this.seriesRotationIndex + 1) % roundArr.length;
                break;
            }
            this.seriesRotationIndex = (this.seriesRotationIndex + 1) % roundArr.length;
            attempts++;
        }

        if (!foundSeries) {
            this.advanceRound();
            return;
        }

        this.activeSeries = foundSeries;

        const gameNum = foundSeries.winsHigh + foundSeries.winsLow + 1;
        const isHomeIce = [1, 2, 5, 7].includes(gameNum);

        const homeId = isHomeIce ? foundSeries.highSeed : foundSeries.lowSeed;
        const visitorId = isHomeIce ? foundSeries.lowSeed : foundSeries.highSeed;

        const keys = Object.keys(Strategies);
        team0Index = keys.indexOf(visitorId);
        team1Index = keys.indexOf(homeId);

        Team0_Strategy = Strategies[visitorId];
        Team1_Strategy = Strategies[homeId];

        if (Team0_Strategy.colors) {
            TEAM0_COLOR = Team0_Strategy.colors.main;
            TEAM0_COLOR_HAS_PUCK = Team0_Strategy.colors.secondary;
        }
        if (Team1_Strategy.colors) {
            TEAM1_COLOR = Team1_Strategy.colors.main;
            TEAM1_COLOR_HAS_PUCK = Team1_Strategy.colors.secondary;
        }
        
        if (typeof resolveJerseyClash === 'function') {
            resolveJerseyClash(Team0_Strategy, Team1_Strategy);
        }

        gameState = "playoffs"; 
        fullGameReset();
    },

    // 4. THE GAME LOOP
    runGameTick: function(now) {
        if (this.watchMode) {
            if (now - this.lastFrameTime < 16) {
                if (!TRAINING_MODE || WATCH_MODE) {
                    renderFrame();
                    this.drawGameFooter();
                }
                return;
            }
            this.lastFrameTime = now;
        }

        const loops = this.watchMode ? 1 : this.speedMult;

        for (let i = 0; i < loops; i++) {
            const isPaused = isResetActive() || performance.now() < faceoffPauseUntil;

            if (isPaused) {
                if (this.watchMode) {
                    if (whistleEndTimer && now >= whistleEndTimer) {
                        whistleEndTimer = null; doFaceoffReset();
                    }
                    else if (goalResetTimer && now >= goalResetTimer) {
                        goalResetTimer = null; 
                        if (isSuddenDeathGoal) {
                            this.handleSuddenDeathEnd();
                            return; 
                        } else {
                            doGoalReset();
                        }
                    }
                } 
                else {
                    if (goalResetTimer) goalResetTimer -= 16;
                    if (whistleEndTimer) whistleEndTimer -= 16;
                    if (faceoffPauseUntil) faceoffPauseUntil -= 16;

                    if (whistleEndTimer && whistleEndTimer <= performance.now()) {
                        whistleEndTimer = null; doFaceoffReset();
                    }
                    if (goalResetTimer && goalResetTimer <= performance.now()) {
                        goalResetTimer = null; 
                        if (isSuddenDeathGoal) {
                            this.handleSuddenDeathEnd();
                            return;
                        } else {
                            doGoalReset();
                        }
                    }
                }

                if (isGoalCelebrationActive()) {
                    puck.update();
                    collideCircleWithRink(puck, puck.r, 0.8);
                    for (const p of players) { updatePlayer(p); enforcePlayerWalls(p); }
                    resolvePlayerCollisions();
                }
            } 
            else {
                puck.update();
                checkOffsides();
                checkDeadPuck();
                resolveGoalCollisions(puck);
                checkGoalieHarassment();
                checkNetPinning();

                if (puckEscapedRink()) handlePuckEscape();
                if (puckStealCooldown > 0) puckStealCooldown--;

                checkGoal();

                if (detectPuckStuckInNet()) {
                    whistle("Net Mesh Stoppage");
                    if (this.watchMode) break; 
                }

                for (const p of players) {
                    updatePlayer(p);
                    resolveGoalCollisions(p);
                    blockPlayerFromGoal(p);
                    enforcePlayerWalls(p);
                }
                resolvePlayerCollisions();

                timeRemaining -= (1/60); 
                
                if (timeRemaining <= 0) {
                    this.handlePeriodEndWarp();
                }
            }

            if (gameState === 'gameover') {
                this.reportGameResult(scoreTeam0, scoreTeam1);
                break; 
            }
        }

        if (this.watchMode) {
            if (!TRAINING_MODE || WATCH_MODE) {
                renderFrame();
                this.drawGameFooter(); 
            }
        } else {
            // WARP RENDER
            ctx.fillStyle = "#000"; ctx.fillRect(0,0,W,H);
            ctx.fillStyle = "#fff"; ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            ctx.font = "20px Arial";
            ctx.fillText("SIMULATING PLAYOFFS...", W/2, H/2 - 40);
            
            const s = this.activeSeries;
            const gNum = s.winsHigh + s.winsLow + 1;
            const code0 = Team0_Strategy.code;
            const code1 = Team1_Strategy.code;

            ctx.font = "bold 40px Monospace";
            ctx.fillStyle = "#ffff00";
            ctx.fillText(`${code0}  ${scoreTeam0} - ${scoreTeam1}  ${code1}`, W/2, H/2 + 10);
            
            ctx.font = "14px monospace";
            ctx.fillStyle = "#888";
            ctx.fillText(`${s.highName} vs ${s.lowName} | Game ${gNum}`, W/2, H/2 + 50);
        }
    },

    handleSuddenDeathEnd: function() {
        if (lastGoalTeam === 0) scoreTeam0++;
        if (lastGoalTeam === 1) scoreTeam1++;
        this.reportGameResult(scoreTeam0, scoreTeam1);
    },

    handlePeriodEndWarp: function() {
        timeRemaining = 0;
        if (currentPeriod < TOTAL_PERIODS) {
            currentPeriod++;
            timeRemaining = GAME_DURATION_SECONDS;
            startNextPeriod(); 
            faceoffPauseUntil = this.watchMode ? (performance.now() + 3000) : 0; 
        } else {
            if (scoreTeam0 !== scoreTeam1) {
                gameState = 'gameover';
            } else {
                currentPeriod++;
                timeRemaining = GAME_DURATION_SECONDS;
                startNextPeriod();
                faceoffPauseUntil = this.watchMode ? (performance.now() + 3000) : 0;
            }
        }
    },

    drawGameFooter: function() {
        if (!this.activeSeries) return;
        
        const s = this.activeSeries;
        const gNum = s.winsHigh + s.winsLow + 1;
        let statusText = "";
        
        if (s.winsHigh > s.winsLow) statusText = `${s.highName} leads ${s.winsHigh}-${s.winsLow}`;
        else if (s.winsLow > s.winsHigh) statusText = `${s.lowName} leads ${s.winsLow}-${s.winsHigh}`;
        else statusText = `Series Tied ${s.winsHigh}-${s.winsLow}`;

        ctx.save();
        ctx.fillStyle = "#111";
        ctx.fillRect(0, H - 30, W, 30);
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, H-30); ctx.lineTo(W, H-30); ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "left";
        ctx.fillStyle = "#aaa";
        ctx.fillText(`ROUND ${this.round} | ${statusText}`, 20, H - 15);

        ctx.font = "bold 18px Monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffff00";
        ctx.fillText(`${Team0_Strategy.code}  ${scoreTeam0}  -  ${scoreTeam1}  ${Team1_Strategy.code}`, W/2, H - 15);

        ctx.font = "12px Monospace";
        ctx.textAlign = "right";
        ctx.fillStyle = "#aaa";
        const pTxt = currentPeriod > 3 ? "OT" : "P" + currentPeriod;
        ctx.fillText(`${pTxt} | ${Math.floor(timeRemaining)}s`, W - 20, H - 15);

        ctx.restore();
    },

    reportGameResult: function(scoreVisitor, scoreHome) {
        const s = this.activeSeries;
        if (!s) return;

        const gameCount = s.winsHigh + s.winsLow + 1;
        const visCode = Team0_Strategy.code;
        const homeCode = Team1_Strategy.code;
        const isOT = currentPeriod > 3;
        const otTag = isOT ? " (OT)" : "";
        
        const resultString = `${gameCount}: ${visCode} ${scoreVisitor} ${homeCode} ${scoreHome}${otTag}`;
        s.games.push(resultString);

        const winnerId = (scoreVisitor > scoreHome) ? Team0_Strategy.id : Team1_Strategy.id;

        if (winnerId === s.highSeed) s.winsHigh++;
        else s.winsLow++;

        if (s.winsHigh === 4) s.winner = s.highSeed;
        if (s.winsLow === 4) s.winner = s.lowSeed;

        gameState = "playoff_bracket";
        
        if (!this.watchMode) {
            setTimeout(() => {
                if (gameState === "playoff_bracket") {
                    this.startNextGame();
                }
            }, 100); 
        }
    },

    advanceRound: function() {
        this.seriesRotationIndex = 0;

        if (this.round === 1) {
            const r1 = this.bracket.round1;
            this.bracket.round2 = [
                this.createSeries(this.getTeam(r1[0].winner), this.getTeam(r1[3].winner)),
                this.createSeries(this.getTeam(r1[1].winner), this.getTeam(r1[2].winner))
            ];
            this.round = 2;
            gameState = "playoff_bracket";
            if (!this.watchMode) setTimeout(() => this.startNextGame(), 100);
        } 
        else if (this.round === 2) {
            const r2 = this.bracket.round2;
            this.bracket.round3 = [
                this.createSeries(this.getTeam(r2[0].winner), this.getTeam(r2[1].winner))
            ];
            this.round = 3;
            gameState = "playoff_bracket";
            if (!this.watchMode) setTimeout(() => this.startNextGame(), 100);
        } 
        else {
            this.champion = this.bracket.round3[0].winner;
            gameState = "champion_screen"; 
        }
    },

    getTeam: function(id) {
        return { id: id, code: Strategies[id].code };
    },

    getCurrentRoundArray: function() {
        if (this.round === 1) return this.bracket.round1;
        if (this.round === 2) return this.bracket.round2;
        return this.bracket.round3;
    },

    // =========================================================
    // VISUALIZATION (CENTERED FINAL)
    // =========================================================
    drawBracket: function(ctx, w, h) {
        
        if (this.viewMode === "standings" && this.finalStandingsReference) {
            ctx.fillStyle = "#000"; ctx.fillRect(0,0,w,h);
            ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = "bold 24px Arial";
            ctx.fillText("🏆 SEASON FINAL STANDINGS", w/2, 40);

            const sorted = Object.values(this.finalStandingsReference).sort((a,b) => {
                if (b.Pts !== a.Pts) return b.Pts - a.Pts;
                if (b.W !== a.W) return b.W - a.W;
                return (b.GF - b.GA) - (a.GF - a.GA);
            });

            const startY = 80;
            const rowH = 22;
            const colX = [80, 140, 340, 390, 440, 490, 540, 590, 660, 720, 770, 840, 920]; 
            
            ctx.textAlign = "left"; ctx.font = "bold 13px Monospace"; ctx.fillStyle = "#888"; 
            ctx.fillText("RK", colX[0], startY); ctx.fillText("TEAM", colX[1], startY);
            ctx.fillText("GP", colX[2], startY); ctx.fillText("W", colX[3], startY);
            ctx.fillText("L", colX[4], startY); ctx.fillText("OTL", colX[5], startY);
            ctx.fillText("SOW", colX[6], startY); ctx.fillText("SOL", colX[7], startY);
            ctx.fillStyle = "#fff"; ctx.fillText("PTS", colX[8], startY);
            ctx.fillStyle = "#888"; ctx.fillText("GF", colX[9], startY); ctx.fillText("GA", colX[10], startY);

            ctx.font = "13px Monospace"; 
            sorted.forEach((t, i) => {
                const y = startY + 25 + (i * rowH);
                if (y > h - 50) return; 
                if (i % 2 === 0) { ctx.fillStyle = "rgba(255, 255, 255, 0.05)"; ctx.fillRect(60, y - 16, 900, rowH); }
                ctx.fillStyle = "#ccc"; 
                ctx.fillText((i + 1) + ".", colX[0], y);
                ctx.fillText(t.name.substring(0, 20), colX[1], y);
                ctx.fillText(t.GP, colX[2], y); ctx.fillText(t.W, colX[3], y);
                ctx.fillText(t.L, colX[4], y); ctx.fillText(t.OTL, colX[5], y);
                ctx.fillText(t.SOW, colX[6], y); ctx.fillText(t.SOL, colX[7], y);
                ctx.fillStyle = "#fff"; ctx.fillText(t.Pts, colX[8], y);
                ctx.fillStyle = "#888"; ctx.fillText(t.GF, colX[9], y); ctx.fillText(t.GA, colX[10], y);
            });
            
            ctx.fillStyle = "#666"; ctx.textAlign = "center"; ctx.font = "14px Arial";
            ctx.fillText("Press TAB to Toggle View | ESC to Menu", w/2, h - 30);
            return;
        }

        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, w, h);
        
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "bold 30px Arial";
        
        let title = "STANLEY CUP PLAYOFFS";
        if (this.round === 2) title = "SEMIFINALS";
        if (this.round === 3) title = "STANLEY CUP FINAL";
        
        ctx.fillText(title, w/2, 40);

        const drawSeries = (series, x, y) => {
            const boxW = 150; 
            const headerH = 50;
            const historyH = 90; 
            const boxH = headerH + historyH;
            
            ctx.fillStyle = (series.winner === series.highSeed) ? "#00aa00" : "#333";
            if (series.winner && series.winner !== series.highSeed) ctx.fillStyle = "#222"; 
            ctx.fillRect(x, y, boxW, headerH/2);
            
            ctx.fillStyle = (series.winner === series.lowSeed) ? "#00aa00" : "#333";
            if (series.winner && series.winner !== series.lowSeed) ctx.fillStyle = "#222"; 
            ctx.fillRect(x, y + headerH/2, boxW, headerH/2);
            
            ctx.font = "bold 14px monospace";
            ctx.fillStyle = "#fff";
            
            ctx.textAlign = "left";
            ctx.fillText(series.highName, x + 10, y + 18);
            ctx.textAlign = "right";
            ctx.fillText(series.winsHigh, x + boxW - 10, y + 18);
            
            ctx.textAlign = "left";
            ctx.fillText(series.lowName, x + 10, y + 43);
            ctx.textAlign = "right";
            ctx.fillText(series.winsLow, x + boxW - 10, y + 43);
            
            ctx.fillStyle = "#222"; 
            ctx.fillRect(x, y + headerH, boxW, historyH);
            
            ctx.font = "10px monospace";
            ctx.fillStyle = "#ccc";
            ctx.textAlign = "left";
            
            series.games.forEach((gameStr, i) => {
                ctx.fillText(gameStr, x + 5, y + headerH + 12 + (i * 12));
            });

            ctx.lineWidth = 2;
            
            if (!series.winner) {
                if (this.activeSeries && series === this.activeSeries) {
                     ctx.strokeStyle = "#ffff00"; 
                     ctx.lineWidth = 3;
                } else if (!this.activeSeries) {
                     ctx.strokeStyle = "#888";
                } else {
                     ctx.strokeStyle = "#444";
                }
            } else {
                ctx.strokeStyle = "#666"; 
            }
            
            ctx.strokeRect(x, y, boxW, boxH);
            
            ctx.beginPath();
            ctx.moveTo(x, y + headerH);
            ctx.lineTo(x + boxW, y + headerH);
            ctx.stroke();
        };

        const r1 = this.bracket.round1;
        if (r1.length === 4) {
            drawSeries(r1[0], 40, 60);   
            drawSeries(r1[3], 40, 380);  
            
            drawSeries(r1[1], w - 190, 60); 
            drawSeries(r1[2], w - 190, 380); 
        }

        const r2 = this.bracket.round2;
        if (r2.length > 0) {
            drawSeries(r2[0], 230, 220); 
            drawSeries(r2[1], w - 380, 220);
        }

        // --- CENTERED FINAL (The Big Move) ---
        const r3 = this.bracket.round3;
        if (r3.length > 0) {
            // Draw in the exact center of the screen
            drawSeries(r3[0], w/2 - 75, 230); 
        }
        
        ctx.fillStyle = "#888";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        
        if (gameState === "champion_screen") {
             ctx.save();
             ctx.fillStyle = "#ffff00";
             ctx.font = "bold 40px Arial";
             // Reverted to Bottom Position
             ctx.fillText(Strategies[this.champion].teamName + " WIN THE CUP!", w/2, h - 80);
             ctx.restore();

             ctx.fillStyle = "#fff";
             ctx.font = "20px Arial";
             ctx.fillText("Press TAB to View Standings | ESC to Menu", w/2, h - 40);
        } else {
             if (this.watchMode) ctx.fillText("Press W to Warp | SPACE for Next Game", w/2, h - 25);
             else ctx.fillText("Auto-Simulating... Press W to Watch", w/2, h - 25);
        }
    }
};