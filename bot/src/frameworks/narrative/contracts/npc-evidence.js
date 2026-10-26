/** Original actor-relative NPC evidence, not global knowledge or invented testimony. */
export function createNarrativeNpcEvidenceConsumer(){let source=null;return Object.freeze({
 bind(native){if(typeof native!=='function')throw new TypeError('Native NPC actorReferenceVisible function required.');if(source&&source!==native)throw new Error('Narrative NPC evidence replacement forbidden.');source=native;return this;},
 actorReferenceVisible(...args){if(!source)throw Object.assign(new Error('Narrative NPC evidence has not been composed.'),{code:'NARRATIVE_NPC_EVIDENCE_COMPOSITION'});return source(...args);}
});}
export const narrativeNpcEvidence=createNarrativeNpcEvidenceConsumer();
