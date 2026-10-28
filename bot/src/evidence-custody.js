/** Original fixed World/Session/personal-identity composition for Knowledge evidence custody. */
import {knowledgeWorldMemory} from './frameworks/knowledge/public.js';
function cityObject(...args){return knowledgeWorldMemory.cityObject(...args);}function cityKey(...args){return knowledgeWorldMemory.cityKey(...args);}function cityAudit(...args){return knowledgeWorldMemory.cityAudit(...args);}
function requireCitySource(...args){return knowledgeWorldMemory.requireCitySource(...args);}
import {personalCharacter} from './frameworks/knowledge/public.js';
import {knowledgeSessionScene} from './frameworks/knowledge/public.js';
function scenePresence(...args){return knowledgeSessionScene.scenePresence(...args);}
import {createEvidenceCustody} from './frameworks/knowledge/public.js';
let custodyRules;
function custody(){return custodyRules??=createEvidenceCustody({cityObject:(...args)=>cityObject(...args),cityKey:(...args)=>cityKey(...args),cityAudit:(...args)=>cityAudit(...args),requireCitySource:(...args)=>requireCitySource(...args),personalCharacter:(...args)=>personalCharacter(...args),scenePresence:(...args)=>scenePresence(...args)});}
export function evidenceView(...args){return custody().evidenceView(...args);}
export function manageEvidence(...args){return custody().manageEvidence(...args);}
import {knowledgeEvidenceCustodySource} from './frameworks/knowledge/public.js';
// Provide this module's original evidence custody operation to the fixed Knowledge slot; no other authority is granted.
knowledgeEvidenceCustodySource.bind({manageEvidence});
