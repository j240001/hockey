// =========================================================
// NODE REGISTRY (Single Source of Truth)
// =========================================================
// Shared by Builder V26 and Strategy Interpreter
// =========================================================

const NODE_REGISTRY = {
    // --- STRUCTURES ---
    "Selector": {
        cat: "struct", label: "Selector", acr: "SEL",
        generate: (c) => `new SelectorNode([${c}])`,
        execute: (c) => new SelectorNode(c)
    },
    "Sequence": {
        cat: "struct", label: "Sequence", acr: "SEQ",
        generate: (c) => `new SequenceNode([${c}])`,
        execute: (c) => new SequenceNode(c)
    },

    // --- CONDITIONS: STATE ---
    "condHasPuck": {
        cat: "cond", label: "Has Puck", acr: "HAVE", sets: "OFF",
        generate: () => `new ConditionNode(bb => bb.hasPuck)`,
        execute: () => new ConditionNode(bb => bb.hasPuck)
    },
    "condTeamHasPuck": {
        cat: "cond", label: "Teammate Has", acr: "TM", sets: "OFF",
        generate: () => `new ConditionNode(bb => bb.teamHasPuck)`,
        execute: () => new ConditionNode(bb => bb.teamHasPuck)
    },
    "condOppHasPuck": {
        cat: "cond", label: "Opponent Has", acr: "OPP", sets: "DEF",
        generate: () => `new ConditionNode(bb => bb.oppHasPuck)`,
        execute: () => new ConditionNode(bb => bb.oppHasPuck)
    },
    "condLoosePuck": {
        cat: "cond", label: "Loose Puck", acr: "LOOSE", sets: "NEU",
        generate: () => `new ConditionNode(bb => bb.loosePuck)`,
        execute: () => new ConditionNode(bb => bb.loosePuck)
    },

    // --- CONDITIONS: ZONES ---
    "condPuckInDefZone": {
        cat: "cond", label: "Puck Def Zone", acr: "DZ",
        generate: () => `new ConditionNode(bb => bb.puckInDefZone)`,
        execute: () => new ConditionNode(bb => bb.puckInDefZone)
    },
    "condPuckInNeuZone": {
        cat: "cond", label: "Puck Neu Zone", acr: "NZ",
        generate: () => `new ConditionNode(bb => bb.puckInNeuZone)`,
        execute: () => new ConditionNode(bb => bb.puckInNeuZone)
    },
    "condPuckInOffZone": {
        cat: "cond", label: "Puck Off Zone", acr: "OZ",
        generate: () => `new ConditionNode(bb => bb.puckInOffZone)`,
        execute: () => new ConditionNode(bb => bb.puckInOffZone)
    },
    "condPuckInZone": {
        cat: "cond", label: "Matrix Zone (1-6)", acr: "ZONE?",
        params: { zoneindex: 1 },
        generate: (d) => `new ConditionNode(bb => (typeof getFormationZone==='function' ? getFormationZone(puck.x, bb.p.team)===${Number(d.zoneindex)} : false))`,
        execute: (d) => new ConditionNode(bb => (typeof getFormationZone==='function' ? getFormationZone(puck.x, bb.p.team)===Number(d.zoneindex) : false))
    },

    // --- CONDITIONS: TACTICAL ---
    "condInShotRange": {
        cat: "cond", label: "In Shot Range", acr: "RNG", req: "OFF",
        generate: () => `new ConditionNode(bb => bb.inShotRange)`,
        execute: () => new ConditionNode(bb => bb.inShotRange)
    },
    "condTeammatesOffside": {
        cat: "cond", label: "Teammates Offside", acr: "OFFS?", sets: "DLY",
        generate: () => `new ConditionNode(bb => checkTeammatesOffside(bb.p))`,
        execute: () => new ConditionNode(bb => checkTeammatesOffside(bb.p))
    },
    "condAmIClosest": {
        cat: "cond", label: "Am I Closest?", acr: "ME?",
        generate: () => `new ConditionNode(bb => {let c=null,d=9999;for(let m of players){if(m.team===bb.p.team && m.type==='skater'){let dist=Math.hypot(m.x-puck.x,m.y-puck.y);if(dist<d){d=dist;c=m;}}}return c&&c.id===bb.p.id;})`,
        execute: () => new ConditionNode(bb => {let c=null,d=9999;for(let m of players){if(m.team===bb.p.team && m.type==='skater'){let dist=Math.hypot(m.x-puck.x,m.y-puck.y);if(dist<d){d=dist;c=m;}}}return c&&c.id===bb.p.id;})
    },
    "condForwardLaneClear": {
        cat: "cond", label: "Fwd Lane Clear", acr: "CLR?", req: "OFF",
        generate: () => `new ConditionNode(bb => { bb.carryTarget={x:bb.p.x+bb.forwardDir*100,y:bb.p.y}; return !isLaneBlocked(bb.p.x,bb.p.y,bb.carryTarget.x,bb.carryTarget.y,bb.p.team); })`,
        execute: () => new ConditionNode(bb => { bb.carryTarget={x:bb.p.x+bb.forwardDir*100,y:bb.p.y}; return !isLaneBlocked(bb.p.x,bb.p.y,bb.carryTarget.x,bb.carryTarget.y,bb.p.team); })
    },
    "condHasBreakoutPass": {
        cat: "cond", label: "Has Breakout", acr: "BRK?", req: "OFF",
        generate: () => `new ConditionNode(bb => {for(let m of players){if(m.team===bb.p.team && m.id!==bb.p.id && m.type==='skater' && (m.x-bb.p.x)*bb.forwardDir>0){if(!isLaneBlocked(bb.p.x,bb.p.y,m.x,m.y,bb.p.team)){bb.passTarget=m;return true;}}}return false;})`,
        execute: () => new ConditionNode(bb => {for(let m of players){if(m.team===bb.p.team && m.id!==bb.p.id && m.type==='skater' && (m.x-bb.p.x)*bb.forwardDir>0){if(!isLaneBlocked(bb.p.x,bb.p.y,m.x,m.y,bb.p.team)){bb.passTarget=m;return true;}}}return false;})
    },
    "condSmartPass": {
        cat: "cond", label: "Can Smart Pass?", acr: "PASS?", req: "OFF",
        generate: () => `new ConditionNode(bb => { const p = findSmartPass(bb.p, bb); if(p){bb.passTarget=p;return true;} return false; })`,
        execute: () => new ConditionNode(bb => { const p = findSmartPass(bb.p, bb); if(p){bb.passTarget=p;return true;} return false; })
    },
    "condHasBackdoor": {
        cat: "cond", label: "Has Backdoor", acr: "BD?", req: "OFF",
        generate: () => `new ConditionNode(bb => { const t = findBackdoorTarget(bb.p); if(t){bb.passTarget=t;return true;} return false; })`,
        execute: () => new ConditionNode(bb => { const t = findBackdoorTarget(bb.p); if(t){bb.passTarget=t;return true;} return false; })
    },

    // --- ACTIONS: OFFENSE ---
    "actShoot": {
        cat: "act", label: "Shoot", acr: "SHOT", req: "OFF",
        generate: () => `new ActionNode(bb => ({ tx: bb.enemyGoal, ty: RY, action: "shoot" }))`,
        execute: () => new ActionNode(bb => ({ tx: bb.enemyGoal, ty: RY, action: "shoot" }))
    },
    "actDriveNet": {
        cat: "act", label: "Drive Net", acr: "DRIV",
        generate: () => `new ActionNode(bb => ({ tx: bb.enemyGoal - (bb.forwardDir * 40), ty: RY, action: "none" }))`,
        execute: () => new ActionNode(bb => ({ tx: bb.enemyGoal - (bb.forwardDir * 40), ty: RY, action: "none" }))
    },
    "actExecuteCarry": {
        cat: "act", label: "Execute Carry", acr: "CARY",
        generate: () => `new ActionNode(bb => { if(bb.carryTarget)return{tx:bb.carryTarget.x,ty:bb.carryTarget.y,action:"none"}; return {tx:bb.enemyGoal,ty:RY,action:"none"}; })`,
        execute: () => new ActionNode(bb => { if(bb.carryTarget)return{tx:bb.carryTarget.x,ty:bb.carryTarget.y,action:"none"}; return {tx:bb.enemyGoal,ty:RY,action:"none"}; })
    },
    "actExecutePass": {
        cat: "act", label: "Execute Pass", acr: "PASS",
        generate: () => `new ActionNode(bb => { if(bb.passTarget)return{tx:bb.passTarget.x,ty:bb.passTarget.y,action:"pass",target:bb.passTarget}; return {tx:bb.enemyGoal,ty:RY,action:"none"}; })`,
        execute: () => new ActionNode(bb => { if(bb.passTarget)return{tx:bb.passTarget.x,ty:bb.passTarget.y,action:"pass",target:bb.passTarget}; return {tx:bb.enemyGoal,ty:RY,action:"none"}; })
    },
    "actSmartPass": {
        cat: "act", label: "Exec Smart Pass", acr: "DO_PASS", req: "OFF",
        generate: () => `new ActionNode(bb => { if(bb.passTarget)return{tx:bb.passTarget.x,ty:bb.passTarget.y,action:"pass",target:bb.passTarget}; return null; })`,
        execute: () => new ActionNode(bb => { if(bb.passTarget)return{tx:bb.passTarget.x,ty:bb.passTarget.y,action:"pass",target:bb.passTarget}; return null; })
    },
    "actGoBackdoor": {
        cat: "act", label: "Go Backdoor", acr: "GO_BD", req: "OFF",
        generate: () => `new ActionNode(bb => getBackdoorPosition(bb.p))`,
        execute: () => new ActionNode(bb => getBackdoorPosition(bb.p))
    },
    "actEvadePressure": {
        cat: "act", label: "Evade Pressure", acr: "EVADE", req: "OFF",
        generate: () => `new ActionNode(bb => evadePressure(bb))`,
        execute: () => new ActionNode(bb => evadePressure(bb))
    },

    // --- ACTIONS: DEFENSE ---
    "actDefendHome": {
        cat: "act", label: "Defend Home", acr: "HOME", req: "DEF",
        generate: () => `new ActionNode(bb => { let yOff=(bb.p.role==='LD'||bb.p.role==='LW')?-60:60; return {tx:bb.myGoalX+(bb.forwardDir*120),ty:RY+yOff,action:'none'}; })`,
        execute: () => new ActionNode(bb => { let yOff=(bb.p.role==='LD'||bb.p.role==='LW')?-60:60; return {tx:bb.myGoalX+(bb.forwardDir*120),ty:RY+yOff,action:'none'}; })
    },
    "actAggressiveGap": {
        cat: "act", label: "Aggressive Gap", acr: "GAP",
        generate: () => `new ActionNode(bb => getAggressiveGapTarget(bb.p, getPuckCarrier()||puck, bb.myGoalX))`,
        execute: () => new ActionNode(bb => getAggressiveGapTarget(bb.p, getPlayerById(puck.ownerId)||puck, bb.myGoalX))
    },
    "actClearPuck": {
        cat: "act", label: "Clear Puck", acr: "CLR", req: "DEF",
        generate: () => `new ActionNode(bb => clearPuckDefensive(bb.p))`,
        execute: () => new ActionNode(bb => clearPuckDefensive(bb.p))
    },

    // --- ACTIONS: NEUTRAL / POSITIONING ---
    "actSmartIntercept": {
        cat: "act", label: "Smart Intercept", acr: "INT",
        generate: () => `new ActionNode(bb => { const t = (typeof getPuckIntercept==='function')?getPuckIntercept(bb.p):{x:puck.x,y:puck.y}; return {tx:t.x,ty:t.y,action:"none"}; })`,
        execute: () => new ActionNode(bb => { const t = (typeof getPuckIntercept==='function')?getPuckIntercept(bb.p):{x:puck.x,y:puck.y}; return {tx:t.x,ty:t.y,action:"none"}; })
    },
    "actTagUp_T1": {
        cat: "act", label: "Tag Up", acr: "TAG", req: "DLY",
        generate: () => `new ActionNode(bb => ({ tx: bb.safeRX - bb.forwardDir * 50, ty: RY, action: "none" }))`,
        execute: () => new ActionNode(bb => ({ tx: bb.safeRX - bb.forwardDir * 50, ty: RY, action: "none" }))
    },
    "actHoverBlueLine": {
        cat: "act", label: "Hover Blue Line", acr: "HOVR",
        generate: () => `new ActionNode(bb => { let yOff=(bb.p.role==='LW'||bb.p.role==='LD')?-100:100; return {tx:(bb.forwardDir===1?bb.safeRX+60:bb.safeRX-60),ty:RY+yOff,action:"none"}; })`,
        execute: () => new ActionNode(bb => { let yOff=(bb.p.role==='LW'||bb.p.role==='LD')?-100:100; return {tx:(bb.forwardDir===1?bb.safeRX+60:bb.safeRX-60),ty:RY+yOff,action:"none"}; })
    },
    "actRegroup": {
        cat: "act", label: "Regroup", acr: "GRP",
        generate: () => `new ActionNode(bb => ({ tx: bb.myGoalX + (bb.forwardDir * 150), ty: RY, action: "none" }))`,
        execute: () => new ActionNode(bb => ({ tx: bb.myGoalX + (bb.forwardDir * 150), ty: RY, action: "none" }))
    },
    "actIdle": {
        cat: "act", label: "Idle / Stop", acr: "IDLE",
        generate: () => `new ActionNode(bb => ({ tx: bb.p.x||500, ty: bb.p.y||300, action: "none" }))`,
        execute: () => new ActionNode(bb => ({ tx: bb.p.x||500, ty: bb.p.y||300, action: "none" }))
    },
    "actChill": {
        cat: "act", label: "Chill", acr: "CHIL",
        generate: () => `new ActionNode(bb => ({ tx: bb.p.x||500, ty: bb.p.y||300, action: "none" }))`,
        execute: () => new ActionNode(bb => ({ tx: bb.p.x||500, ty: bb.p.y||300, action: "none" }))
    },

    // --- ACTIONS: MATRIX / PARAMETRIC ---
    "actFormationTarget": {
        cat: "act", label: "Form Target", acr: "FORM",
        params: { offsetx: 0, offsety: 0 },
        generate: (d) => `new ActionNode(bb => ({ tx: bb.safeRX + (bb.forwardDir * ${Number(d.offsetx)||0}), ty: RY + ${Number(d.offsety)||0}, action: 'none' }))`,
        execute: (d) => new ActionNode(bb => ({ tx: bb.safeRX + (bb.forwardDir * (Number(d.offsetx)||0)), ty: RY + (Number(d.offsety)||0), action: 'none' }))
    },
    "actSupportPosition": {
        cat: "act", label: "Support Pos", acr: "SUP",
        params: { offsetx: -40, offsety: 60 },
        generate: (d) => `new ActionNode(bb => { const c=getPlayerById(puck.ownerId); if(!c)return{tx:bb.p.x,ty:bb.p.y,action:'none'}; return {tx:c.x+(bb.forwardDir*${Number(d.offsetx)||0}),ty:(bb.p.y<RY?c.y-${Number(d.offsety)||0}:c.y+${Number(d.offsety)||0}),action:'none'}; })`,
        execute: (d) => new ActionNode(bb => { const c=getPlayerById(puck.ownerId); if(!c)return{tx:bb.p.x,ty:bb.p.y,action:'none'}; return {tx:c.x+(bb.forwardDir*(Number(d.offsetx)||0)),ty:(bb.p.y<RY?c.y-(Number(d.offsety)||0):c.y+(Number(d.offsety)||0)),action:'none'}; })
    },
    "actSafetyPosition": {
        cat: "act", label: "Safety Pos", acr: "SAFE",
        params: { depth: 120 },
        generate: (d) => `new ActionNode(bb => ({ tx: bb.myGoalX + (bb.forwardDir * ${Number(d.depth)||120}), ty: RY, action: 'none' }))`,
        execute: (d) => new ActionNode(bb => ({ tx: bb.myGoalX + (bb.forwardDir * (Number(d.depth)||120)), ty: RY, action: 'none' }))
    },
    "actHoverDynamic": {
        cat: "act", label: "Hover Dynamic", acr: "DYN",
        generate: () => `new ActionNode(bb => hoverDynamicLine(bb))`,
        execute: () => new ActionNode(bb => hoverDynamicLine(bb))
    }
};

// UI Order Definition
const PALETTE_LAYOUT = [
    { header: "FLOW CONTROL" },
    "Selector", "Sequence",
    
    { header: "STATE SETTERS" },
    "condHasPuck", "condTeamHasPuck", "condOppHasPuck", "condLoosePuck",
    
    { header: "MATRIX / FORMATION" },
    "condPuckInZone", "actFormationTarget", "actHoverDynamic",
    
    { header: "OFFENSIVE" },
    "condInShotRange", "actShoot", "actDriveNet", "condHasBackdoor", "actGoBackdoor", 
    "condSmartPass", "actSmartPass", "actExecuteCarry", "actExecutePass", "actEvadePressure",
    
    { header: "DEFENSIVE" },
    "actDefendHome", "actAggressiveGap", "actClearPuck", "actSupportPosition",
    
    { header: "NEUTRAL / ZONES" },
    "condPuckInDefZone", "condPuckInNeuZone", "condPuckInOffZone",
    "actSmartIntercept", "actHoverBlueLine", "actRegroup", "actSafetyPosition",
    
    { header: "OFFSIDE LOGIC" },
    "condTeammatesOffside", "actTagUp_T1",
    
    { header: "UTILITY" },
    "condAmIClosest", "condForwardLaneClear", "condHasBreakoutPass", "actIdle", "actChill"
];

// Helper to get definition safely
function getNodeDef(type) {
    return NODE_REGISTRY[type] || { 
        label: type, 
        acr: "???", 
        generate: () => `new ActionNode(() => ({tx:0,ty:0,action:'none'}))`,
        execute: () => new ActionNode(() => ({tx:0,ty:0,action:'none'}))
    };
}