import {createKnowledgeWorldEventConsumer,factVisibleTo,listNarrativeRecords,createKnowledgeWorldIdentityConsumer} from '../../frameworks/knowledge/public.js';
import {indexWorldEvent,cityAudit,createWorldKnowledgeConsumer,resolvePlaceReference,preflightNpcIdentity,worldIdentityOrigin} from '../../frameworks/world/public.js';
/** Native event/audit identity and transaction forwarding only; no evidence classification copied. */
export function connectKnowledgeWorld({consumer=createKnowledgeWorldEventConsumer()}={}){
  return consumer.bind({indexWorldEvent,cityAudit});
}
/** Reverse direction: forward original Knowledge functions without exposing or relabeling records. */
export function connectWorldKnowledge({consumer=createWorldKnowledgeConsumer()}={}){
  return consumer.bind({factVisibleTo,listNarrativeRecords});
}
/** Existing-identity lookup and read-only provenance; no new native entity or PC placement. */
export function connectKnowledgeIdentities({consumer=createKnowledgeWorldIdentityConsumer()}={}){
  return consumer.bind({resolvePlaceReference,preflightNpcIdentity,worldIdentityOrigin});
}

import {knowledgeWorldMemory} from '../../frameworks/knowledge/public.js';
import {cityObject,cityKey,requireCitySource} from '../../frameworks/world/public.js';
export function connectKnowledgeMemory(){return knowledgeWorldMemory.bind({cityObject,cityKey,cityAudit,requireCitySource});}

import {knowledgeWorldHistory} from '../../frameworks/knowledge/public.js';
import {historyContext} from '../../frameworks/world/public.js';
export function connectKnowledgeHistory(){return knowledgeWorldHistory.bind(historyContext);}
