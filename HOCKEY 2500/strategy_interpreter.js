// =========================================================
// STRATEGY INTERPRETER (The Registry Bridge)
// =========================================================

const StrategyInterpreter = {
    
    buildTeamStrategy: function(teamJson) {
        if (!teamJson) return () => ({ tx: 500, ty: 300, action: 'none' });

        const trees = {
            C:  this.buildTree(teamJson.c),
            LW: this.buildTree(teamJson.lw),
            RW: this.buildTree(teamJson.rw),
            LD: this.buildTree(teamJson.ld),
            RD: this.buildTree(teamJson.rd)
        };

        return function(p) {
            const bb = makeBB(p); // Uses your updated helpers.js
            let result = null;

            if (p.role === "C")  result = trees.C ? trees.C.tick(bb) : null;
            else if (p.role === "LW") result = trees.LW ? trees.LW.tick(bb) : null;
            else if (p.role === "RW") result = trees.RW ? trees.RW.tick(bb) : null;
            else if (p.role === "LD") result = trees.LD ? trees.LD.tick(bb) : null;
            else if (p.role === "RD") result = trees.RD ? trees.RD.tick(bb) : null;
            else result = trees.C ? trees.C.tick(bb) : null;

            if (!result || typeof result === "string" || (typeof result === 'object' && isNaN(result.tx))) {
                return { tx: p.x, ty: p.y, action: "none" }; // Target own position
            }
            return result;
        };
    },

    buildTree: function(nodeList) {
        if (!nodeList || nodeList.length === 0) return null;
        return this.createNode(nodeList[0]);
    },

    createNode: function(data) {
        // 1. LOOK UP IN REGISTRY (The Single Source of Truth)
        if (typeof NODE_REGISTRY !== 'undefined' && NODE_REGISTRY[data.type]) {
            const def = NODE_REGISTRY[data.type];
            
            // A. STRUCTURES (Selector/Sequence)
            if (data.cat === "struct") {
                const children = (data.children || []).map(c => this.createNode(c));
                return def.execute(children);
            }
            
            // B. ACTIONS/CONDITIONS
            // Pass 'data' so the Registry can read params (offsetx, etc.)
            return def.execute(data); 
        }

        // 2. FALLBACK: Legacy/Global Functions (Backwards Compatibility)
        if (window[data.type] && typeof window[data.type] === 'function') {
            const NodeClass = (data.cat === 'cond') ? ConditionNode : ActionNode;
            return new NodeClass(window[data.type]);
        }

        // 3. PANIC: Node not found
        console.warn(`⚠️ Interpreter: Unknown node '${data.type}'. Is node_registry.js loaded?`);
        return new ActionNode((bb) => ({ tx: bb.p.x, ty: bb.p.y, action: 'none' }));
    }
};