/** Original NPC acquired-source and attributed-testimony proof, never a new native execution or disclosure grant. */
export function createNativeNpcEvidenceConsumer(){let source=null;const keys=['actorSource','actorReferenceVisible'];const current=()=>{if(!source)throw Object.assign(new Error('Native NPC evidence not composed.'),{code:'NATIVE_NPC_EVIDENCE_COMPOSITION'});return source;};return Object.freeze({
 bind(native){if(keys.some(k=>typeof native?.[k]!=='function'))throw new TypeError('Complete original NPC evidence functions required.');if(source&&keys.some(k=>source[k]!==native[k]))throw new Error('Native NPC evidence replacement forbidden.');source=Object.freeze(Object.fromEntries(keys.map(k=>[k,native[k]])));return this;},
 actorSource(...args){return current().actorSource(...args);},actorReferenceVisible(...args){return current().actorReferenceVisible(...args);}
});}
export const nativeNpcEvidence=createNativeNpcEvidenceConsumer();
