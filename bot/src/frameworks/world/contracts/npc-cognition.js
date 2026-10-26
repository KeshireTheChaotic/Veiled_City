/** Fixed original NPC cognition; subjective context does not grant new effects or disclosure. */
export function createWorldNpcCognitionConsumer(){let source=null;return Object.freeze({
 bind(native){if(typeof native!=='function')throw new TypeError('Original NPC cognition function required.');if(source&&source!==native)throw new Error('World NPC cognition replacement forbidden.');source=native;return this;},
 retrieveNpcCognition(...args){if(!source)throw Object.assign(new Error('World NPC cognition not composed.'),{code:'WORLD_CANDIDATE_CONTEXT_COMPOSITION'});return source(...args);}
});}
export const worldNpcCognition=createWorldNpcCognitionConsumer();
