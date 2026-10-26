/** Fixed original Session scene view callback; no inferred player or evidence authority. */
export function createNpcSessionViewConsumer(){let source=null;return Object.freeze({
 bind(native){if(typeof native!=='function')throw new TypeError('Original Session scene view function required.');if(source&&source!==native)throw new Error('NPC Session scene view replacement forbidden.');source=native;return this;},
 sceneView(...args){if(!source)throw Object.assign(new Error('NPC Session scene view source not composed.'),{code:'NPC_COGNITION_COMPOSITION'});return source(...args);}
});}
export const npcSessionView=createNpcSessionViewConsumer();
