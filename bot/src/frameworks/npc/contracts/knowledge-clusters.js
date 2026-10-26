/** Fixed original Knowledge actor clusters callback; no inferred player or evidence authority. */
export function createNpcKnowledgeClustersConsumer(){let source=null;return Object.freeze({
 bind(native){if(typeof native!=='function')throw new TypeError('Original Knowledge actor clusters function required.');if(source&&source!==native)throw new Error('NPC Knowledge actor clusters replacement forbidden.');source=native;return this;},
 clusterContext(...args){if(!source)throw Object.assign(new Error('NPC Knowledge actor clusters source not composed.'),{code:'NPC_COGNITION_COMPOSITION'});return source(...args);}
});}
export const npcKnowledgeClusters=createNpcKnowledgeClustersConsumer();
