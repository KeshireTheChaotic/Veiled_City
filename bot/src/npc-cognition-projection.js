/** Original source composition for actor evidence; no model labels confer audience authority. */
import {narrativeSourceVisible} from './scene-fiction-context.js';
import {conversationPrincipal} from './conversation-principal.js';
import {indexWorldEvent} from './city-calendar.js';
import {createNpcEvidenceProjection} from './frameworks/npc/public.js';
let projectionRules;
function projection(){return projectionRules??=createNpcEvidenceProjection({narrativeSourceVisible:(...args)=>narrativeSourceVisible(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args)});}
export function recordImportedNpcKnowledge(...args){return projection().recordImportedNpcKnowledge(...args);}
export function actorEvidenceVisible(...args){return projection().actorEvidenceVisible(...args);}
export function actorReferenceVisible(...args){return projection().actorReferenceVisible(...args);}
