/** Original fixed Knowledge and World source composition for presentation review. */
import {typedEvidence,objectiveEvidence,activeEvidence} from './epistemic.js';
import {cityAudit,indexWorldEvent} from './city-calendar.js';
import {createPresentationEvidence} from './frameworks/knowledge/public.js';
let presentationRules;
function presentation(){return presentationRules??=createPresentationEvidence({typedEvidence:(...args)=>typedEvidence(...args),objectiveEvidence:(...args)=>objectiveEvidence(...args),activeEvidence:(...args)=>activeEvidence(...args),cityAudit:(...args)=>cityAudit(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args)});}
export const inferredSource=presentation().inferredSource;
export function relationshipEvidence(...args){return presentation().relationshipEvidence(...args);}
export function relationshipProvenance(...args){return presentation().relationshipProvenance(...args);}
export function artifactProvenance(...args){return presentation().artifactProvenance(...args);}
export function reviewPresentation(...args){return presentation().reviewPresentation(...args);}
export function presentationContext(...args){return presentation().presentationContext(...args);}
export function presentationView(...args){return presentation().presentationView(...args);}
