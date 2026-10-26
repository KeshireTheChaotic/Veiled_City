/** Fixed original Knowledge actor clusters; subjective context does not grant new effects or disclosure. */
export function createWorldKnowledgeClustersConsumer(){let source=null;return Object.freeze({
 bind(native){if(typeof native!=='function')throw new TypeError('Original Knowledge actor clusters function required.');if(source&&source!==native)throw new Error('World Knowledge actor clusters replacement forbidden.');source=native;return this;},
 clusterContext(...args){if(!source)throw Object.assign(new Error('World Knowledge actor clusters not composed.'),{code:'WORLD_CANDIDATE_CONTEXT_COMPOSITION'});return source(...args);}
});}
export const worldKnowledgeClusters=createWorldKnowledgeClustersConsumer();
