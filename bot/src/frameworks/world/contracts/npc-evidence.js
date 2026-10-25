/** World consumes only current NPC actor evidence. This interface grants no publication or PC authority. */
export function createNpcEvidenceConsumer(){
 let source=null;
 const consumer=Object.freeze({actorSource(...args){if(!source)throw Object.assign(new Error('NPC/World evidence has not been composed.'),{code:'NPC_WORLD_EVIDENCE_COMPOSITION'});return source(...args);}});
 return Object.freeze({...consumer,bind(native){if(typeof native!=='function')throw new TypeError('Native NPC actor-evidence function required.');if(source&&source!==native)throw new Error('NPC/World actor-evidence replacement forbidden.');source=native;return consumer;}});
}
export const worldNpcEvidence=createNpcEvidenceConsumer();
