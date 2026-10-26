/** Fixed original Session principal source; no inferred audience or player authority. */
export function createNpcSessionPrincipalConsumer(){let source=null;return Object.freeze({
 bind(native){if(typeof native!=='function')throw new TypeError('Native Session principal function required.');if(source&&source!==native)throw new Error('NPC Session principal replacement forbidden.');source=native;return this;},
 conversationPrincipal(...args){if(!source)throw Object.assign(new Error('NPC Session principal source has not been composed.'),{code:'NPC_EVIDENCE_COMPOSITION'});return source(...args);}
});}
export const npcSessionPrincipal=createNpcSessionPrincipalConsumer();
