import {createKnowledgeWorldEventConsumer,factVisibleTo,listNarrativeRecords,NARRATIVE_RECORD_LIMIT,createKnowledgeWorldIdentityConsumer} from '../../frameworks/knowledge/public.js';
import {indexWorldEvent,cityAudit,createWorldKnowledgeConsumer,resolvePlaceReference,preflightNpcIdentity,worldIdentityOrigin} from '../../frameworks/world/public.js';
/** Native event/audit identity and transaction forwarding only; no evidence classification copied. */
export function connectKnowledgeWorld({consumer=createKnowledgeWorldEventConsumer()}={}){
  return consumer.bind({indexWorldEvent,cityAudit});
}
/** Reverse direction: forward original Knowledge functions without exposing or relabeling records. */
export function connectWorldKnowledge({consumer=createWorldKnowledgeConsumer()}={}){
  return consumer.bind({factVisibleTo,listNarrativeRecords,narrativeRecordLimit:NARRATIVE_RECORD_LIMIT});
}
/** Existing-identity lookup and read-only provenance; no new native entity or PC placement. */
export function connectKnowledgeIdentities({consumer=createKnowledgeWorldIdentityConsumer()}={}){
  return consumer.bind({resolvePlaceReference,preflightNpcIdentity,worldIdentityOrigin});
}

import {knowledgeWorldMemory,knowledgeWorldRecord} from '../../frameworks/knowledge/public.js';
import {cityObject,cityKey,cityInteger,requireCitySource,requireCityRecord} from '../../frameworks/world/public.js';
export function connectKnowledgeMemory(){return knowledgeWorldMemory.bind({cityObject,cityKey,cityInteger,cityAudit,requireCitySource});}
export function connectKnowledgeWorldRecord(){return knowledgeWorldRecord.bind({requireCityRecord});}

import {knowledgeWorldHistory} from '../../frameworks/knowledge/public.js';
import {historyContext} from '../../frameworks/world/public.js';
export function connectKnowledgeHistory(){return knowledgeWorldHistory.bind(historyContext);}

import {worldKnowledgeClusters} from '../../frameworks/world/public.js';
import {clusterContext} from '../../frameworks/knowledge/public.js';
export function connectWorldKnowledgeClusters(){return worldKnowledgeClusters.bind(clusterContext);}

import {evidenceType,objectiveEvidence} from '../../frameworks/knowledge/public.js';
import {worldEstablishedEvidence} from '../../frameworks/world/public.js';
export function connectWorldEstablishedEvidence(){return worldEstablishedEvidence.bind({evidenceType,objectiveEvidence});}

import {personalCharacter as knowledgePersonalCharacter} from '../../frameworks/knowledge/public.js';
import {worldPersonalContinuity} from '../../frameworks/world/public.js';
export function connectWorldPersonalContinuity(){return worldPersonalContinuity.bind({personalCharacter:knowledgePersonalCharacter});}

import {knowledgeContextMemorySource} from '../../frameworks/knowledge/public.js';
import {worldContextMemory} from '../../frameworks/world/public.js';
/** Pass Knowledge's original scoped context memory reader to World unchanged. */
export function connectWorldContextMemory(){return worldContextMemory.bind({contextMemoriesForScope:knowledgeContextMemorySource.contextMemoriesForScope});}

import {knowledgeWorldCommunity} from '../../frameworks/knowledge/public.js';
import {worldLongProjectSource,worldCityCivicSource} from '../../frameworks/world/public.js';
/** Pass World's original long project and civic update functions to Knowledge unchanged. */
export function connectKnowledgeWorldCommunity(){return knowledgeWorldCommunity.bind({manageLongProject:worldLongProjectSource.manageLongProject,updateCityCivic:worldCityCivicSource.updateCityCivic});}
