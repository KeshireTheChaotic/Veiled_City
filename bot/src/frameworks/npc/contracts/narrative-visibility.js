/** Fixed original Narrative visibility source; no inferred audience or player authority. */
export function createNpcNarrativeVisibilityConsumer(){let source=null;return Object.freeze({
 bind(native){if(typeof native!=='function')throw new TypeError('Native Narrative visibility function required.');if(source&&source!==native)throw new Error('NPC Narrative visibility replacement forbidden.');source=native;return this;},
 narrativeSourceVisible(...args){if(!source)throw Object.assign(new Error('NPC Narrative visibility source has not been composed.'),{code:'NPC_EVIDENCE_COMPOSITION'});return source(...args);}
});}
export const npcNarrativeVisibility=createNpcNarrativeVisibilityConsumer();
