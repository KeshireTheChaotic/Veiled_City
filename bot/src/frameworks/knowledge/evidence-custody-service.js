/** Knowledge-owned composition for evidence custody and its original source port. */
import {createEvidenceCustody} from './evidence-custody.js';
import {knowledgeWorldMemory} from './contracts/world-memory.js';
import {personalCharacter} from './personal-character.js';
import {knowledgeSessionScene} from './contracts/session-scene.js';
import {knowledgeEvidenceCustodySource} from './contracts/community-evidence-sources.js';

function cityObject(...args){return knowledgeWorldMemory.cityObject(...args);}
function cityKey(...args){return knowledgeWorldMemory.cityKey(...args);}
function cityAudit(...args){return knowledgeWorldMemory.cityAudit(...args);}
function requireCitySource(...args){return knowledgeWorldMemory.requireCitySource(...args);}
function scenePresence(...args){return knowledgeSessionScene.scenePresence(...args);}

let custodyRules;
function custody(){return custodyRules??=createEvidenceCustody({cityObject:(...args)=>cityObject(...args),cityKey:(...args)=>cityKey(...args),cityAudit:(...args)=>cityAudit(...args),requireCitySource:(...args)=>requireCitySource(...args),personalCharacter:(...args)=>personalCharacter(...args),scenePresence:(...args)=>scenePresence(...args)});}
export function evidenceView(...args){return custody().evidenceView(...args);}
export function manageEvidence(...args){return custody().manageEvidence(...args);}

// Bind the original Knowledge operation at module load; grant no additional authority.
knowledgeEvidenceCustodySource.bind({manageEvidence});
