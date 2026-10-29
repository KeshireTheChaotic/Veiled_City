/** Original fixed World/Session/Publication and own Knowledge composition for personal continuity. */
import {knowledgeWorldMemory,knowledgeWorldEvents} from './frameworks/knowledge/public.js';
function cityObject(...args){return knowledgeWorldMemory.cityObject(...args);}function cityKey(...args){return knowledgeWorldMemory.cityKey(...args);}function cityInteger(...args){return knowledgeWorldMemory.cityInteger(...args);}function cityAudit(...args){return knowledgeWorldMemory.cityAudit(...args);}function indexWorldEvent(...args){return knowledgeWorldEvents.indexWorldEvent(...args);}
function requireCitySource(...args){return knowledgeWorldMemory.requireCitySource(...args);}
import {handoutPlayerView} from './handout.js';
import {organizationInbox,evidenceView} from './frameworks/knowledge/public.js';
import {evidenceType,activeEvidence} from './epistemic.js';
import {knowledgeSessionScene} from './frameworks/knowledge/public.js';
function conversationPrincipal(...args){return knowledgeSessionScene.conversationPrincipal(...args);}
import {ownerSemanticSource,assertSemanticCandidateProof} from './semantic-candidate-source.js';
import {createPersonalContinuity} from './frameworks/knowledge/public.js';
let personalRules;
function personal(){return personalRules??=createPersonalContinuity({cityObject:(...args)=>cityObject(...args),cityKey:(...args)=>cityKey(...args),cityInteger:(...args)=>cityInteger(...args),cityAudit:(...args)=>cityAudit(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),requireCitySource:(...args)=>requireCitySource(...args),handoutPlayerView:(...args)=>handoutPlayerView(...args),organizationInbox:(...args)=>organizationInbox(...args),evidenceView:(...args)=>evidenceView(...args),evidenceType:(...args)=>evidenceType(...args),activeEvidence:(...args)=>activeEvidence(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),ownerSemanticSource:(...args)=>ownerSemanticSource(...args),assertSemanticCandidateProof:(...args)=>assertSemanticCandidateProof(...args)});}
export function personalCharacter(...args){return personal().personalCharacter(...args);}
export function personalArc(...args){return personal().personalArc(...args);}
export function proposeArcBeat(...args){return personal().proposeArcBeat(...args);}
export function captureArcCandidate(...args){return personal().captureArcCandidate(...args);}
export function personalInbox(...args){return personal().personalInbox(...args);}
export function discoverPersonal(...args){return personal().discoverPersonal(...args);}
import {knowledgePersonalContinuity} from './frameworks/knowledge/public.js';
// Provide this module's original readers to the fixed Knowledge slot; no other authority is granted.
knowledgePersonalContinuity.bind({personalArc,personalInbox});
