/** Original fixed World/project/NPC/personal identity composition for owner organization initiatives. */
import {cityObject,cityKey,cityAudit,indexWorldEvent} from './city-calendar.js';
import {personalCharacter} from './personal-continuity.js';
import {requireCitySource,requireCityRecord} from './city-core.js';
import {updateCityCivic} from './city-civic.js';
import {manageLongProject} from './long-projects.js';
import {actorSource} from './simulation-motivation.js';
import {createOwnedCommunity} from './frameworks/knowledge/public.js';
let organizationRules;
function organizations(){return organizationRules??=createOwnedCommunity({cityObject:(...args)=>cityObject(...args),cityKey:(...args)=>cityKey(...args),cityAudit:(...args)=>cityAudit(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),personalCharacter:(...args)=>personalCharacter(...args),requireCitySource:(...args)=>requireCitySource(...args),requireCityRecord:(...args)=>requireCityRecord(...args),updateCityCivic:(...args)=>updateCityCivic(...args),manageLongProject:(...args)=>manageLongProject(...args),actorSource:(...args)=>actorSource(...args)});}
export function inviteOrganization(...args){return organizations().inviteOrganization(...args);}
export function organizationRequest(...args){return organizations().organizationRequest(...args);}
export function reviewOrganization(...args){return organizations().reviewOrganization(...args);}
export function organizationInbox(...args){return organizations().organizationInbox(...args);}
