/** Original fixed World/Session/personal-identity composition for Knowledge evidence custody. */
import {cityObject,cityKey,cityAudit} from './city-calendar.js';
import {requireCitySource} from './city-core.js';
import {personalCharacter} from './personal-continuity.js';
import {scenePresence} from './scene-continuity.js';
import {createEvidenceCustody} from './frameworks/knowledge/public.js';
let custodyRules;
function custody(){return custodyRules??=createEvidenceCustody({cityObject:(...args)=>cityObject(...args),cityKey:(...args)=>cityKey(...args),cityAudit:(...args)=>cityAudit(...args),requireCitySource:(...args)=>requireCitySource(...args),personalCharacter:(...args)=>personalCharacter(...args),scenePresence:(...args)=>scenePresence(...args)});}
export function evidenceView(...args){return custody().evidenceView(...args);}
export function manageEvidence(...args){return custody().manageEvidence(...args);}
