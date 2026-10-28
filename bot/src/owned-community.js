/** Original fixed World/project/NPC/personal identity composition for owner organization initiatives. */
import {knowledgeWorldMemory,knowledgeWorldEvents,knowledgeWorldRecord} from './frameworks/knowledge/public.js';
function cityObject(...args){return knowledgeWorldMemory.cityObject(...args);}function cityKey(...args){return knowledgeWorldMemory.cityKey(...args);}function cityAudit(...args){return knowledgeWorldMemory.cityAudit(...args);}function indexWorldEvent(...args){return knowledgeWorldEvents.indexWorldEvent(...args);}
import {personalCharacter} from './frameworks/knowledge/public.js';
function requireCitySource(...args){return knowledgeWorldMemory.requireCitySource(...args);}function requireCityRecord(...args){return knowledgeWorldRecord.requireCityRecord(...args);}
import {knowledgeWorldCommunity} from './frameworks/knowledge/public.js';
function updateCityCivic(...args){return knowledgeWorldCommunity.updateCityCivic(...args);}
function manageLongProject(...args){return knowledgeWorldCommunity.manageLongProject(...args);}
import {knowledgeNpcActorSource} from './frameworks/knowledge/public.js';
const {actorSource}=knowledgeNpcActorSource;
import {createOwnedCommunity} from './frameworks/knowledge/public.js';
let organizationRules;
function organizations(){return organizationRules??=createOwnedCommunity({cityObject:(...args)=>cityObject(...args),cityKey:(...args)=>cityKey(...args),cityAudit:(...args)=>cityAudit(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),personalCharacter:(...args)=>personalCharacter(...args),requireCitySource:(...args)=>requireCitySource(...args),requireCityRecord:(...args)=>requireCityRecord(...args),updateCityCivic:(...args)=>updateCityCivic(...args),manageLongProject:(...args)=>manageLongProject(...args),actorSource:(...args)=>actorSource(...args)});}
export function inviteOrganization(...args){return organizations().inviteOrganization(...args);}
export function organizationRequest(...args){return organizations().organizationRequest(...args);}
export function reviewOrganization(...args){return organizations().reviewOrganization(...args);}
export function organizationInbox(...args){return organizations().organizationInbox(...args);}
import {knowledgeOrganizationSource} from './frameworks/knowledge/public.js';
// Provide this module's original organization request to the fixed Knowledge slot; no other authority is granted.
knowledgeOrganizationSource.bind({organizationRequest});
