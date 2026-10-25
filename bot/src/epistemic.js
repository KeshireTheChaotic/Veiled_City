/** Original World source composition for Knowledge evidence rules. */
import {indexWorldEvent,cityAudit} from './city-calendar.js';
import {createEvidenceRules} from './frameworks/knowledge/public.js';
export {epistemicSchema} from './frameworks/knowledge/public.js';
let evidenceRules;
function evidence(){return evidenceRules??=createEvidenceRules({indexWorldEvent:(...args)=>indexWorldEvent(...args),cityAudit:(...args)=>cityAudit(...args)});}
export function evidenceType(...args){return evidence().evidenceType(...args);}
export function activeEvidence(...args){return evidence().activeEvidence(...args);}
export function objectiveEvidence(...args){return evidence().objectiveEvidence(...args);}
export function typedEvidence(...args){return evidence().typedEvidence(...args);}
export function establishFact(...args){return evidence().establishFact(...args);}
