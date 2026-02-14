// =========================================================
// TRAINING REWARDS (Pure Performance)
// =========================================================
function applyTrainingRewards() {
    const owner = getPlayerById(puck.ownerId);

    for (const p of players) {
        if (p.team !== 0) continue;

        let r = 0;

        // --- A. MOVEMENT (Drive the play) ---
        // Small reward for moving toward the puck/play
        const dxp = puck.x - p.x;
        const dyp = puck.y - p.y;
        const dot = (p.vx * dxp + p.vy * dyp);
        if (dot > 0) r += 0.01;
        else r -= 0.01;

        // --- B. POSSESSION (The most important non-goal metric) ---
        if (owner && owner.id === p.id) r += 0.1;

        // --- C. SCORING (The ultimate goal) ---
        if (lastGoalTeam !== null && lastGoalTeam === p.team) r += 1.0;

        // --- D. SUPPORT (Keep the play alive) ---
        // Reward purely for being open when a teammate has the puck.
        // We do NOT penalize for being close; we only reward for being useful.
        if (owner && owner.team === p.team && owner.id !== p.id) {
            // Simple check: Do I have a line of sight to the puck carrier?
            // (This is much better than a generic distance check)
            if (typeof isLaneBlocked === 'function') {
                if (!isLaneBlocked(p.x, p.y, owner.x, owner.y, p.team)) {
                    r += 0.05; // Reward for being a valid pass option
                }
            } else {
                // Fallback if helper missing: just reward being somewhat near
                const d = Math.hypot(p.x - owner.x, p.y - owner.y);
                if (d < 300) r += 0.02;
            }
        }

        // --- E. LAZINESS (Anti-Camping) ---
        // We still penalize for doing literally nothing, because that's never good.
        if (Math.abs(p.vx) < 0.1 && Math.abs(p.vy) < 0.1) {
            r -= 0.01;
        }

        p.reward += r;
    }
}
