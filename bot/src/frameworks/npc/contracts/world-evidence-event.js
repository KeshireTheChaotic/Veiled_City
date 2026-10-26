/** Fixed original World evidence event source; no inferred audience or player authority. */
export function createNpcWorldEvidenceEventConsumer(){let source=null;return Object.freeze({
 bind(native){if(typeof native!=='function')throw new TypeError('Native World evidence event function required.');if(source&&source!==native)throw new Error('NPC World evidence event replacement forbidden.');source=native;return this;},
 indexWorldEvent(...args){if(!source)throw Object.assign(new Error('NPC World evidence event source has not been composed.'),{code:'NPC_EVIDENCE_COMPOSITION'});return source(...args);}
});}
export const npcWorldEvidenceEvent=createNpcWorldEvidenceEventConsumer();
