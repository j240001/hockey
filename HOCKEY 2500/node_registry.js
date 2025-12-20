// =========================================================
// NODE REGISTRY (BULLETPROOF / TRY-CATCH WRAPPED)
// =========================================================

const NODE_REGISTRY = {
    // --- STRUCTURES ---
    "Selector": {
        cat: "struct", label: "Selector", acr: "SEL", req: "ANY",
        generate: (c) => `new SelectorNode([${c}])`,
        execute: (c) => new SelectorNode(c)
    },
    "Sequence": {
        cat: "struct", label: "Sequence", acr: "SEQ", req: "ANY",
        generate: (c) => `new SequenceNode([${c}])`,
        execute: (c) => new SequenceNode(c)
    },

    // --- CONDITIONS: STATE ---
    "condHasPuck": {
        cat: "cond", label: "Has Puck", acr: "HAVE", req: "ANY",
        generate: () => `new ConditionNode(bb => bb.hasPuck)`,
        execute: () => new ConditionNode(bb => bb.hasPuck)
    },
    "condTeamHasPuck": {
        cat: "cond", label: "Teammate Has", acr: "TM", req: "ANY",
        generate: () => `new ConditionNode(bb => bb.teamHasPuck)`,
        execute: () => new ConditionNode(bb => bb.teamHasPuck)
    },
    "condOppHasPuck": {
        cat: "cond", label: "Opponent Has", acr: "OPP", req: "ANY",
        generate: () => `new ConditionNode(bb => bb.oppHasPuck)`,
        execute: () => new ConditionNode(bb => bb.oppHasPuck)
    },
    "condLoosePuck": {
        cat: "cond", label: "Loose Puck", acr: "LOOSE", req: "ANY",
        generate: () => `new ConditionNode(bb => bb.loosePuck)`,
        execute: () => new ConditionNode(bb => bb.loosePuck)
    },

    // --- CONDITIONS: ZONES ---
    "condPuckInDefZone": {
        cat: "cond", label: "Puck Def Zone", acr: "DZ", req: "ANY",
        generate: () => `new ConditionNode(bb => bb.puckInDefZone)`,
        execute: () => new ConditionNode(bb => bb.puckInDefZone)
    },
    "condPuckInNeuZone": {
        cat: "cond", label: "Puck Neu Zone", acr: "NZ", req: "ANY",
        generate: () => `new ConditionNode(bb => bb.puckInNeuZone)`,
        execute: () => new ConditionNode(bb => bb.puckInNeuZone)
    },
    "condPuckInOffZone": {
        cat: "cond", label: "Puck Off Zone", acr: "OZ", req: "ANY",
        generate: () => `new ConditionNode(bb => bb.puckInOffZone)`,
        execute: () => new ConditionNode(bb => bb.puckInOffZone)
    },
    
    // *** FIX: Wrapped in Try/Catch ***
    "condPuckInZone": {
        cat: "cond", label: "Matrix Zone (1-6)", acr: "ZONE?", req: "ANY",
        params: { zoneindex: 1 },
        generate: (d) => `new ConditionNode(bb => { try { return (typeof getFormationZone==='function' ? getFormationZone(puck.x, bb.p.team)===${Number(d.zoneindex)} : false); } catch(e){return false;} })`,
        execute: (d) => new ConditionNode(bb => { try { return (typeof getFormationZone==='function' ? getFormationZone(puck.x, bb.p.team)===Number(d.zoneindex) : false); } catch(e){return false;} })
    },

    // --- CONDITIONS: TACTICAL ---
    "condInShotRange": {
        cat: "cond", label: "In Shot Range", acr: "RNG", req: "ANY",
        generate: () => `new ConditionNode(bb => bb.inShotRange)`,
        execute: () => new ConditionNode(bb => bb.inShotRange)
    },
    "condTeammatesOffside": {
        cat: "cond", label: "Teammates Offside", acr: "OFFS?", req: "ANY",
        generate: () => `new ConditionNode(bb => { try { return (typeof checkTeammatesOffside === 'function' ? checkTeammatesOffside(bb.p) : false); } catch(e){return false;} })`,
        execute: () => new ConditionNode(bb => { try { return (typeof checkTeammatesOffside === 'function' ? checkTeammatesOffside(bb.p) : false); } catch(e){return false;} })
    },
    "condAmIClosest": {
        cat: "cond", label: "Am I Closest?", acr: "ME?", req: "ANY",
        generate: () => `new ConditionNode(bb => {let c=null,d=9999;for(let m of players){if(m.team===bb.p.team && m.type==='skater'){let dist=Math.hypot(m.x-puck.x,m.y-puck.y);if(dist<d){d=dist;c=m;}}}return c&&c.id===bb.p.id;})`,
        execute: () => new ConditionNode(bb => {let c=null,d=9999;for(let m of players){if(m.team===bb.p.team && m.type==='skater'){let dist=Math.hypot(m.x-puck.x,m.y-puck.y);if(dist<d){d=dist;c=m;}}}return c&&c.id===bb.p.id;})
    },
    "condForwardLaneClear": {
        cat: "cond", label: "Fwd Lane Clear", acr: "CLR?", req: "ANY",
        generate: () => `new ConditionNode(bb => { try { bb.carryTarget={x:bb.p.x+bb.forwardDir*100,y:bb.p.y}; return (typeof isLaneBlocked === 'function' ? !isLaneBlocked(bb.p.x,bb.p.y,bb.carryTarget.x,bb.carryTarget.y,bb.p.team) : true); } catch(e){return true;} })`,
        execute: () => new ConditionNode(bb => { try { bb.carryTarget={x:bb.p.x+bb.forwardDir*100,y:bb.p.y}; return (typeof isLaneBlocked === 'function' ? !isLaneBlocked(bb.p.x,bb.p.y,bb.carryTarget.x,bb.carryTarget.y,bb.p.team) : true); } catch(e){return true;} })
    },
    "condHasBreakoutPass": {
        cat: "cond", label: "Has Breakout", acr: "BRK?", req: "ANY",
        generate: () => `new ConditionNode(bb => { try { for(let m of players){if(m.team===bb.p.team && m.id!==bb.p.id && m.type==='skater' && (m.x-bb.p.x)*bb.forwardDir>0){if(typeof isLaneBlocked === 'function' && !isLaneBlocked(bb.p.x,bb.p.y,m.x,m.y,bb.p.team)){bb.passTarget=m;return true;}}}return false; } catch(e){return false;} })`,
        execute: () => new ConditionNode(bb => { try { for(let m of players){if(m.team===bb.p.team && m.id!==bb.p.id && m.type==='skater' && (m.x-bb.p.x)*bb.forwardDir>0){if(typeof isLaneBlocked === 'function' && !isLaneBlocked(bb.p.x,bb.p.y,m.x,m.y,bb.p.team)){bb.passTarget=m;return true;}}}return false; } catch(e){return false;} })
    },
    "condSmartPass": {
        cat: "cond", label: "Can Smart Pass?", acr: "PASS?", req: "ANY",
        generate: () => `new ConditionNode(bb => { try { const p = (typeof findSmartPass === 'function' ? findSmartPass(bb.p, bb) : null); if(p){bb.passTarget=p;return true;} return false; } catch(e){return false;} })`,
        execute: () => new ConditionNode(bb => { try { const p = (typeof findSmartPass === 'function' ? findSmartPass(bb.p, bb) : null); if(p){bb.passTarget=p;return true;} return false; } catch(e){return false;} })
    },
    "condHasBackdoor": {
        cat: "cond", label: "Has Backdoor", acr: "BD?", req: "ANY",
        generate: () => `new ConditionNode(bb => { try { const t = (typeof findBackdoorTarget === 'function' ? findBackdoorTarget(bb.p) : null); if(t){bb.passTarget=t;return true;} return false; } catch(e){return false;} })`,
        execute: () => new ConditionNode(bb => { try { const t = (typeof findBackdoorTarget === 'function' ? findBackdoorTarget(bb.p) : null); if(t){bb.passTarget=t;return true;} return false; } catch(e){return false;} })
    },
    
    // *** FIX: Wrapped in Try/Catch ***
    "condIsLastMan": {
        cat: "cond", label: "Is Last Man?", acr: "LAST?", req: "ANY",
        generate: () => `new ConditionNode(bb => { try { return (typeof amILastMan === 'function' ? amILastMan(bb.p) : false); } catch(e){return false;} })`,
        execute: () => new ConditionNode(bb => { try { return (typeof amILastMan === 'function' ? amILastMan(bb.p) : false); } catch(e){return false;} })
    },



    // ... inside NODE_REGISTRY ...

    "condWeightedPassCheck": {
        cat: "cond", label: "Weighted Pass Check", acr: "W_PASS?", req: "ANY",
        params: { bias: 50, fear: 50, vision: 50 },
        // We wrap this in 'new ConditionNode' to match your engine's requirement
        generate: (d) => `new ConditionNode(bb => { try { return (typeof condWeightedPassCheck === 'function' ? condWeightedPassCheck(bb, ${d.bias}, ${d.fear}, ${d.vision}) : false); } catch(e){return false;} })`,
        execute: (d) => new ConditionNode(bb => { try { return (typeof condWeightedPassCheck === 'function' ? condWeightedPassCheck(bb, d.bias, d.fear, d.vision) : false); } catch(e){return false;} })
    },



    // --- ACTIONS: OFFENSE ---
    "actShoot": {
        cat: "act", label: "Shoot", acr: "SHOT", req: "ANY",
        generate: () => `new ActionNode(bb => ({ tx: bb.enemyGoal, ty: (typeof RY !== 'undefined' ? RY : 300), action: "shoot" }))`,
        execute: () => new ActionNode(bb => ({ tx: bb.enemyGoal, ty: (typeof RY !== 'undefined' ? RY : 300), action: "shoot" }))
    },
    "actDriveNet": {
        cat: "act", label: "Drive Net", acr: "DRIV", req: "ANY",
        generate: () => `new ActionNode(bb => ({ tx: bb.enemyGoal - (bb.forwardDir * 40), ty: (typeof RY !== 'undefined' ? RY : 300), action: "none" }))`,
        execute: () => new ActionNode(bb => ({ tx: bb.enemyGoal - (bb.forwardDir * 40), ty: (typeof RY !== 'undefined' ? RY : 300), action: "none" }))
    },
    "actExecuteCarry": {
        cat: "act", label: "Execute Carry", acr: "CARY", req: "ANY",
        generate: () => `new ActionNode(bb => { if(bb.carryTarget)return{tx:bb.carryTarget.x,ty:bb.carryTarget.y,action:"none"}; return {tx:bb.enemyGoal,ty:(typeof RY !== 'undefined' ? RY : 300),action:"none"}; })`,
        execute: () => new ActionNode(bb => { if(bb.carryTarget)return{tx:bb.carryTarget.x,ty:bb.carryTarget.y,action:"none"}; return {tx:bb.enemyGoal,ty:(typeof RY !== 'undefined' ? RY : 300),action:"none"}; })
    },
    "actExecutePass": {
        cat: "act", label: "Execute Pass", acr: "PASS", req: "ANY",
        generate: () => `new ActionNode(bb => { if(bb.passTarget)return{tx:bb.passTarget.x,ty:bb.passTarget.y,action:"pass",target:bb.passTarget}; return {tx:bb.enemyGoal,ty:(typeof RY !== 'undefined' ? RY : 300),action:"none"}; })`,
        execute: () => new ActionNode(bb => { if(bb.passTarget)return{tx:bb.passTarget.x,ty:bb.passTarget.y,action:"pass",target:bb.passTarget}; return {tx:bb.enemyGoal,ty:(typeof RY !== 'undefined' ? RY : 300),action:"none"}; })
    },
    "actSmartPass": {
        cat: "act", label: "Exec Smart Pass", acr: "DO_PASS", req: "ANY",
        generate: () => `new ActionNode(bb => { try { if(bb.passTarget)return{tx:bb.passTarget.x,ty:bb.passTarget.y,action:"pass",target:bb.passTarget}; return null; } catch(e){return null;} })`,
        execute: () => new ActionNode(bb => { try { if(bb.passTarget)return{tx:bb.passTarget.x,ty:bb.passTarget.y,action:"pass",target:bb.passTarget}; return null; } catch(e){return null;} })
    },
    "actGoBackdoor": {
        cat: "act", label: "Go Backdoor", acr: "GO_BD", req: "ANY",
        generate: () => `new ActionNode(bb => { try { return (typeof getBackdoorPosition === 'function' ? getBackdoorPosition(bb.p) : {tx:bb.p.x,ty:bb.p.y,action:'none'}); } catch(e){return {tx:bb.p.x,ty:bb.p.y,action:'none'};} })`,
        execute: () => new ActionNode(bb => { try { return (typeof getBackdoorPosition === 'function' ? getBackdoorPosition(bb.p) : {tx:bb.p.x,ty:bb.p.y,action:'none'}); } catch(e){return {tx:bb.p.x,ty:bb.p.y,action:'none'};} })
    },
    "actEvadePressure": {
        cat: "act", label: "Evade Pressure", acr: "EVADE", req: "ANY",
        generate: () => `new ActionNode(bb => { try { return (typeof evadePressure === 'function' ? evadePressure(bb) : {tx:bb.p.x,ty:bb.p.y,action:'none'}); } catch(e){return {tx:bb.p.x,ty:bb.p.y,action:'none'};} })`,
        execute: () => new ActionNode(bb => { try { return (typeof evadePressure === 'function' ? evadePressure(bb) : {tx:bb.p.x,ty:bb.p.y,action:'none'}); } catch(e){return {tx:bb.p.x,ty:bb.p.y,action:'none'};} })
    },

    "actSmartShoot": {
        cat: "act", label: "Smart Shoot", acr: "SSHOT", req: "ANY",
        // FIX: Check for null and return "FAILURE" string
        generate: () => `new ActionNode(bb => { try { const r = (typeof getSmartShootTarget === 'function' ? getSmartShootTarget(bb.p, bb) : null); return r ? r : "FAILURE"; } catch(e){return "FAILURE";} })`,
        execute: () => new ActionNode(bb => { try { const r = (typeof getSmartShootTarget === 'function' ? getSmartShootTarget(bb.p, bb) : null); return r ? r : "FAILURE"; } catch(e){return "FAILURE";} })
    },

    "actOzoneReliefPass": {
        cat: "act", label: "Ozone Relief Pass", acr: "RELIEF", req: "ANY",
        // FIX: Check for null and return "FAILURE" string
        generate: () => `new ActionNode(bb => { try { const t = (typeof findLeastGuardedInZone === 'function' ? findLeastGuardedInZone(bb.p, bb) : null); if(t){ return {tx:t.x, ty:t.y, action:"pass", target:t}; } return "FAILURE"; } catch(e){return "FAILURE";} })`,
        execute: () => new ActionNode(bb => { try { const t = (typeof findLeastGuardedInZone === 'function' ? findLeastGuardedInZone(bb.p, bb) : null); if(t){ return {tx:t.x, ty:t.y, action:"pass", target:t}; } return "FAILURE"; } catch(e){return "FAILURE";} })
    },
    // --- ACTIONS: DEFENSE ---
    "actDefendHome": {
        cat: "act", label: "Defend Home", acr: "HOME", req: "ANY",
        generate: () => `new ActionNode(bb => { let yOff=(bb.p.role==='LD'||bb.p.role==='LW')?-60:60; return {tx:bb.myGoalX+(bb.forwardDir*120),ty:(typeof RY !== 'undefined' ? RY : 300)+yOff,action:'none'}; })`,
        execute: () => new ActionNode(bb => { let yOff=(bb.p.role==='LD'||bb.p.role==='LW')?-60:60; return {tx:bb.myGoalX+(bb.forwardDir*120),ty:(typeof RY !== 'undefined' ? RY : 300)+yOff,action:'none'}; })
    },
    "actAggressiveGap": {
        cat: "act", label: "Aggressive Gap", acr: "GAP", req: "ANY",
        generate: () => `new ActionNode(bb => { try { return (typeof getAggressiveGapTarget === 'function' ? getAggressiveGapTarget(bb.p, (typeof getPuckCarrier === 'function' ? getPuckCarrier() : puck), bb.myGoalX) : {tx:bb.p.x,ty:bb.p.y,action:'none'}); } catch(e){return {tx:bb.p.x,ty:bb.p.y,action:'none'};} })`,
        execute: () => new ActionNode(bb => { try { return (typeof getAggressiveGapTarget === 'function' ? getAggressiveGapTarget(bb.p, (typeof getPuckCarrier === 'function' ? getPuckCarrier() : puck), bb.myGoalX) : {tx:bb.p.x,ty:bb.p.y,action:'none'}); } catch(e){return {tx:bb.p.x,ty:bb.p.y,action:'none'};} })
    },
    "actClearPuck": {
        cat: "act", label: "Clear Puck", acr: "CLR", req: "ANY",
        generate: () => `new ActionNode(bb => { try { return (typeof clearPuckDefensive === 'function' ? clearPuckDefensive(bb.p) : {tx:bb.p.x,ty:bb.p.y,action:'none'}); } catch(e){return {tx:bb.p.x,ty:bb.p.y,action:'none'};} })`,
        execute: () => new ActionNode(bb => { try { return (typeof clearPuckDefensive === 'function' ? clearPuckDefensive(bb.p) : {tx:bb.p.x,ty:bb.p.y,action:'none'}); } catch(e){return {tx:bb.p.x,ty:bb.p.y,action:'none'};} })
    },
    
    // *** FIX: Wrapped in Try/Catch ***
    "actLastManSafety": {
        cat: "act", label: "Last Man Safety", acr: "SAFE_X", req: "ANY",
        generate: () => `new ActionNode(bb => { try { return (typeof getLastManSafetyTarget === 'function' ? getLastManSafetyTarget(bb.p) : {tx:bb.p.x,ty:bb.p.y,action:'none'}); } catch(e){return {tx:bb.p.x,ty:bb.p.y,action:'none'};} })`,
        execute: () => new ActionNode(bb => { try { return (typeof getLastManSafetyTarget === 'function' ? getLastManSafetyTarget(bb.p) : {tx:bb.p.x,ty:bb.p.y,action:'none'}); } catch(e){return {tx:bb.p.x,ty:bb.p.y,action:'none'};} })
    },

    // --- ACTIONS: NEUTRAL / POSITIONING ---
    "actSmartIntercept": {
        cat: "act", label: "Smart Intercept", acr: "INT", req: "ANY",
        generate: () => `new ActionNode(bb => { try { const t = (typeof getPuckIntercept==='function')?getPuckIntercept(bb.p):{x:puck.x,y:puck.y}; return {tx:t.x,ty:t.y,action:"none"}; } catch(e){return {tx:bb.p.x,ty:bb.p.y,action:"none"};} })`,
        execute: () => new ActionNode(bb => { try { const t = (typeof getPuckIntercept==='function')?getPuckIntercept(bb.p):{x:puck.x,y:puck.y}; return {tx:t.x,ty:t.y,action:"none"}; } catch(e){return {tx:bb.p.x,ty:bb.p.y,action:"none"};} })
    },
    "actTagUp_T1": {
        cat: "act", label: "Tag Up", acr: "TAG", req: "ANY",
        generate: () => `new ActionNode(bb => ({ tx: bb.safeRX - bb.forwardDir * 50, ty: (typeof RY !== 'undefined' ? RY : 300), action: "none" }))`,
        execute: () => new ActionNode(bb => ({ tx: bb.safeRX - bb.forwardDir * 50, ty: (typeof RY !== 'undefined' ? RY : 300), action: "none" }))
    },
    "actHoverBlueLine": {
        cat: "act", label: "Hover Blue Line", acr: "HOVR", req: "ANY",
        generate: () => `new ActionNode(bb => { let yOff=(bb.p.role==='LW'||bb.p.role==='LD')?-100:100; return {tx:(bb.forwardDir===1?bb.safeRX+60:bb.safeRX-60),ty:(typeof RY !== 'undefined' ? RY : 300)+yOff,action:"none"}; })`,
        execute: () => new ActionNode(bb => { let yOff=(bb.p.role==='LW'||bb.p.role==='LD')?-100:100; return {tx:(bb.forwardDir===1?bb.safeRX+60:bb.safeRX-60),ty:(typeof RY !== 'undefined' ? RY : 300)+yOff,action:"none"}; })
    },
    "actRegroup": {
        cat: "act", label: "Regroup", acr: "GRP", req: "ANY",
        generate: () => `new ActionNode(bb => ({ tx: bb.myGoalX + (bb.forwardDir * 150), ty: (typeof RY !== 'undefined' ? RY : 300), action: "none" }))`,
        execute: () => new ActionNode(bb => ({ tx: bb.myGoalX + (bb.forwardDir * 150), ty: (typeof RY !== 'undefined' ? RY : 300), action: "none" }))
    },
    "actIdle": {
        cat: "act", label: "Idle / Stop", acr: "IDLE", req: "ANY",
        generate: () => `new ActionNode(bb => ({ tx: (bb.p.x !== undefined ? bb.p.x : 500), ty: (bb.p.y !== undefined ? bb.p.y : 300), action: "none" }))`,
        execute: () => new ActionNode(bb => ({ tx: (bb.p.x !== undefined ? bb.p.x : 500), ty: (bb.p.y !== undefined ? bb.p.y : 300), action: "none" }))
    },
    "actChill": {
        cat: "act", label: "Chill", acr: "CHIL", req: "ANY",
        generate: () => `new ActionNode(bb => ({ tx: (bb.p.x !== undefined ? bb.p.x : 500), ty: (bb.p.y !== undefined ? bb.p.y : 300), action: "none" }))`,
        execute: () => new ActionNode(bb => ({ tx: (bb.p.x !== undefined ? bb.p.x : 500), ty: (bb.p.y !== undefined ? bb.p.y : 300), action: "none" }))
    },

    // --- ACTIONS: MATRIX / PARAMETRIC ---
    "actFormationTarget": {
        cat: "act", label: "Form Target", acr: "FORM", req: "ANY",
        params: { offsetx: 0, offsety: 0 },
        generate: (d) => `new ActionNode(bb => ({ tx: bb.safeRX + (bb.forwardDir * ${Number(d.offsetx)||0}), ty: (typeof RY !== 'undefined' ? RY : 300) + ${Number(d.offsety)||0}, action: 'none' }))`,
        execute: (d) => new ActionNode(bb => ({ tx: bb.safeRX + (bb.forwardDir * (Number(d.offsetx)||0)), ty: (typeof RY !== 'undefined' ? RY : 300) + (Number(d.offsety)||0), action: 'none' }))
    },
    "actSupportPosition": {
        cat: "act", label: "Support Pos", acr: "SUP", req: "ANY",
        params: { offsetx: -40, offsety: 60 },
        generate: (d) => `new ActionNode(bb => { try { const c=(typeof getPlayerById==='function' && puck.ownerId!==null)?getPlayerById(puck.ownerId):null; if(!c)return{tx:bb.p.x,ty:bb.p.y,action:'none'}; return {tx:c.x+(bb.forwardDir*${Number(d.offsetx)||0}),ty:(bb.p.y<(typeof RY !== 'undefined' ? RY : 300)?c.y-${Number(d.offsety)||0}:c.y+${Number(d.offsety)||0}),action:'none'}; } catch(e){return {tx:bb.p.x,ty:bb.p.y,action:'none'};} })`,
        execute: (d) => new ActionNode(bb => { try { const c=(typeof getPlayerById==='function' && puck.ownerId!==null)?getPlayerById(puck.ownerId):null; if(!c)return{tx:bb.p.x,ty:bb.p.y,action:'none'}; return {tx:c.x+(bb.forwardDir*(Number(d.offsetx)||0)),ty:(bb.p.y<(typeof RY !== 'undefined' ? RY : 300)?c.y-(Number(d.offsety)||0):c.y+(Number(d.offsety)||0)),action:'none'}; } catch(e){return {tx:bb.p.x,ty:bb.p.y,action:'none'};} })
    },
    "actSafetyPosition": {
        cat: "act", label: "Safety Pos", acr: "SAFE", req: "ANY",
        params: { depth: 120 },
        generate: (d) => `new ActionNode(bb => ({ tx: bb.myGoalX + (bb.forwardDir * ${Number(d.depth)||120}), ty: (typeof RY !== 'undefined' ? RY : 300), action: 'none' }))`,
        execute: (d) => new ActionNode(bb => ({ tx: bb.myGoalX + (bb.forwardDir * (Number(d.depth)||120)), ty: (typeof RY !== 'undefined' ? RY : 300), action: 'none' }))
    },
    "actHoverDynamic": {
        cat: "act", label: "Hover Dynamic", acr: "DYN", req: "ANY",
        generate: () => `new ActionNode(bb => { try { return (typeof hoverDynamicLine === 'function' ? hoverDynamicLine(bb) : {tx:bb.p.x,ty:bb.p.y,action:'none'}); } catch(e){return {tx:bb.p.x,ty:bb.p.y,action:'none'};} })`,
        execute: () => new ActionNode(bb => { try { return (typeof hoverDynamicLine === 'function' ? hoverDynamicLine(bb) : {tx:bb.p.x,ty:bb.p.y,action:'none'}); } catch(e){return {tx:bb.p.x,ty:bb.p.y,action:'none'};} })
    },
    "actGoToPosition": {
        cat: "act", label: "Go To Position", acr: "GOTO", req: "ANY",
        params: { minDistOwnGoal: 150, minDistOppGoal: 100, minDistLeftBoard: 50, minDistRightBoard: 50 },
        generate: (d) => `new ActionNode(bb => { try { return (typeof getPositionWithinLimits === 'function' ? getPositionWithinLimits(bb.p, bb, ${JSON.stringify(d)}) : {tx:bb.p.x,ty:bb.p.y,action:'none'}); } catch(e){return {tx:bb.p.x,ty:bb.p.y,action:'none'};} })`,
        execute: (d) => new ActionNode(bb => { try { return (typeof getPositionWithinLimits === 'function' ? getPositionWithinLimits(bb.p, bb, d) : {tx:bb.p.x,ty:bb.p.y,action:'none'}); } catch(e){return {tx:bb.p.x,ty:bb.p.y,action:'none'};} })
    },
};

// ... (PALETTE_LAYOUT remains the same)
const PALETTE_LAYOUT = [
    { header: "FLOW CONTROL" }, "Selector", "Sequence",
    { header: "STATE SETTERS" }, "condHasPuck", "condTeamHasPuck", "condOppHasPuck", "condLoosePuck",
    { header: "MATRIX / FORMATION" }, "condPuckInZone", "actFormationTarget", "actHoverDynamic", "actGoToPosition",
    { header: "OFFENSIVE" }, "condInShotRange", "actShoot", "actSmartShoot", "actOzoneReliefPass", "actDriveNet", "condHasBackdoor", "actGoBackdoor", "condSmartPass", "actSmartPass", "condWeightedPassCheck", "actExecuteCarry", "actExecutePass", "actEvadePressure",
    { header: "DEFENSIVE" }, "actDefendHome", "actAggressiveGap", "actClearPuck", "actSupportPosition", "condIsLastMan", "actLastManSafety",
    { header: "NEUTRAL / ZONES" }, "condPuckInDefZone", "condPuckInNeuZone", "condPuckInOffZone", "actSmartIntercept", "actHoverBlueLine", "actRegroup", "actSafetyPosition",
    { header: "OFFSIDE LOGIC" }, "condTeammatesOffside", "actTagUp_T1",
    { header: "UTILITY" }, "condAmIClosest", "condForwardLaneClear", "condHasBreakoutPass", "actIdle", "actChill"
];