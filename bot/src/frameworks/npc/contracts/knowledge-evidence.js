/** Fixed original source capability; no new evidence, awareness or disclosure entitlement. */
export function createNpcKnowledgeEvidenceConsumer(){let source=null;return Object.freeze({
 bind(native){if(typeof native!=='function')throw new TypeError('Native activeEvidence function required.');if(source&&source!==native)throw new Error('NPC activeEvidence replacement forbidden.');source=native;return this;},
 activeEvidence(...args){if(!source)throw Object.assign(new Error('NPC activeEvidence source has not been composed.'),{code:'NPC_OBSERVATION_COMPOSITION'});return source(...args);}
});}
export const npcKnowledgeEvidence=createNpcKnowledgeEvidenceConsumer();
