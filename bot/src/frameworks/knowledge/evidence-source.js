/** One lazy Knowledge evidence engine; pure saved-source readers do not require event binding. */
import {createEvidenceRules} from './epistemic.js';
import {knowledgeWorldEvents} from './contracts/world-events.js';
let evidenceRules;
function evidence(){return evidenceRules??=createEvidenceRules({indexWorldEvent:(...args)=>knowledgeWorldEvents.indexWorldEvent(...args),cityAudit:(...args)=>knowledgeWorldEvents.cityAudit(...args)});}
export function evidenceType(...args){return evidence().evidenceType(...args);}
export function activeEvidence(...args){return evidence().activeEvidence(...args);}
export function objectiveEvidence(...args){return evidence().objectiveEvidence(...args);}
export function typedEvidence(...args){return evidence().typedEvidence(...args);}
export function establishFact(...args){return evidence().establishFact(...args);}
