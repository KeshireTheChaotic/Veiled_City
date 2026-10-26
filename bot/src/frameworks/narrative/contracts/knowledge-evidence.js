/** Fixed original Knowledge evidence/disclosure functions; no new audience grant. */
export function createNarrativeKnowledgeEvidenceConsumer(){let source=null;const keys=['factVisibleTo','activeEvidence','evidenceType'];const current=()=>{if(!source)throw Object.assign(new Error('Narrative Knowledge evidence has not been composed.'),{code:'NARRATIVE_EVIDENCE_COMPOSITION'});return source;};return Object.freeze({
 bind(native){if(keys.some(k=>typeof native?.[k]!=='function'))throw new TypeError('Complete native Knowledge evidence functions required.');if(source&&keys.some(k=>source[k]!==native[k]))throw new Error('Narrative Knowledge evidence replacement forbidden.');source=Object.freeze(Object.fromEntries(keys.map(k=>[k,native[k]])));return this;},
 factVisibleTo(...args){return current().factVisibleTo(...args);},activeEvidence(...args){return current().activeEvidence(...args);},evidenceType(...args){return current().evidenceType(...args);}
});}
export const narrativeKnowledgeEvidence=createNarrativeKnowledgeEvidenceConsumer();
