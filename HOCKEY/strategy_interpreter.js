// =========================================================
// STRATEGY INTERPRETER (Updated for Matrix & Pro Nodes)
// =========================================================

const StrategyInterpreter = {
    buildTeamStrategy: function(json) {
        const trees = {
            C: this.buildTree(json.c),
            LW: this.buildTree(json.lw),
            RW: this.buildTree(json.rw),
            LD: this.buildTree(json.ld),
            RD: this.buildTree(json.rd)
        };
        return function(p) {
            const bb = makeBB(p);
            let result = null;
            // ... (Role switching logic remains same) ...
            if (p.role === "C") result = trees.C.tick(bb);
            // ... etc ...
            return result || { tx: p.x, ty: p.y, action: "none" };
        };
    },

    buildTree: function(nodes) {
        if (!nodes || nodes.length === 0) return null;
        // Map top-level nodes
        return this.createNode(nodes[0]); 
    },

    createNode: function(data) {
        const def = getNodeDef(data.type);
        
        // Structure Handling
        if (data.cat === "struct") {
            const children = (data.children || []).map(c => this.createNode(c));
            return def.execute(children);
        }

        // Logic Handling (Condition / Action)
        // We pass the 'data' object so it can extract params like offsetx/zoneindex
        return def.execute(data);
    }
};