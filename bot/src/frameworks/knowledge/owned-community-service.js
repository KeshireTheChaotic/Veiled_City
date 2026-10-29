/** Knowledge-owned composition for owner organization initiatives and their original source port. */
import {createOwnedCommunity} from './owned-community.js';
import {knowledgeWorldMemory} from './contracts/world-memory.js';
import {knowledgeWorldEvents} from './contracts/world-events.js';
import {knowledgeWorldRecord} from './contracts/world-record.js';
import {knowledgeWorldCommunity} from './contracts/world-community.js';
import {knowledgeNpcActorSource} from './contracts/npc-actor-source.js';
import {personalCharacter} from './personal-character.js';
import {knowledgeOrganizationSource} from './contracts/community-evidence-sources.js';

function cityObject(...args){return knowledgeWorldMemory.cityObject(...args);}
function cityKey(...args){return knowledgeWorldMemory.cityKey(...args);}
function cityAudit(...args){return knowledgeWorldMemory.cityAudit(...args);}
function indexWorldEvent(...args){return knowledgeWorldEvents.indexWorldEvent(...args);}
function requireCitySource(...args){return knowledgeWorldMemory.requireCitySource(...args);}
function requireCityRecord(...args){return knowledgeWorldRecord.requireCityRecord(...args);}
function updateCityCivic(...args){return knowledgeWorldCommunity.updateCityCivic(...args);}
function manageLongProject(...args){return knowledgeWorldCommunity.manageLongProject(...args);}
const {actorSource}=knowledgeNpcActorSource;

let organizationRules;
function organizations(){return organizationRules??=createOwnedCommunity({cityObject:(...args)=>cityObject(...args),cityKey:(...args)=>cityKey(...args),cityAudit:(...args)=>cityAudit(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),personalCharacter:(...args)=>personalCharacter(...args),requireCitySource:(...args)=>requireCitySource(...args),requireCityRecord:(...args)=>requireCityRecord(...args),updateCityCivic:(...args)=>updateCityCivic(...args),manageLongProject:(...args)=>manageLongProject(...args),actorSource:(...args)=>actorSource(...args)});}
export function inviteOrganization(...args){return organizations().inviteOrganization(...args);}
export function organizationRequest(...args){return organizations().organizationRequest(...args);}
export function reviewOrganization(...args){return organizations().reviewOrganization(...args);}
export function organizationInbox(...args){return organizations().organizationInbox(...args);}

// Keep the exact original owner request function bound to the fixed consent slot.
knowledgeOrganizationSource.bind({organizationRequest});
