/** Fixed original Narrative eligibility callback; no inferred player or evidence authority. */
export function createNpcNarrativeContextConsumer(){let source=null;return Object.freeze({
 bind(native){if(typeof native!=='function')throw new TypeError('Original Narrative eligibility function required.');if(source&&source!==native)throw new Error('NPC Narrative eligibility replacement forbidden.');source=native;return this;},
 narrativeContextEligible(...args){if(!source)throw Object.assign(new Error('NPC Narrative eligibility source not composed.'),{code:'NPC_COGNITION_COMPOSITION'});return source(...args);}
});}
export const npcNarrativeContext=createNpcNarrativeContextConsumer();
