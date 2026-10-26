/** Temporary legacy scene-reader compatibility only. NPC owns all observation/evidence policy. */
export function createSessionNpcObservationConsumer(){let source=null;const keys=['npcEvidenceActive','assertNpcObservation'];const current=()=>{if(!source)throw Object.assign(new Error('Legacy NPC observation source has not been composed.'),{code:'SESSION_NPC_OBSERVATION_COMPOSITION'});return source;};return Object.freeze({
 bind(native){if(keys.some(k=>typeof native?.[k]!=='function'))throw new TypeError('Native NPC observation functions required.');if(source&&keys.some(k=>source[k]!==native[k]))throw new Error('Legacy NPC observation replacement forbidden.');source=Object.freeze(Object.fromEntries(keys.map(k=>[k,native[k]])));return this;},
 npcEvidenceActive(...args){return current().npcEvidenceActive(...args);},assertNpcObservation(...args){return current().assertNpcObservation(...args);}
});}
export const sessionNpcObservations=createSessionNpcObservationConsumer();
export const {npcEvidenceActive,assertNpcObservation}=sessionNpcObservations;
