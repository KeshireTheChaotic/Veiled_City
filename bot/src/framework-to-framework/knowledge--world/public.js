import {createKnowledgeWorldEventConsumer,factVisibleTo,listNarrativeRecords} from '../../frameworks/knowledge/public.js';
import {indexWorldEvent,cityAudit,createWorldKnowledgeConsumer} from '../../frameworks/world/public.js';
/** Native event/audit identity and transaction forwarding only; no evidence classification copied. */
export function connectKnowledgeWorld({consumer=createKnowledgeWorldEventConsumer()}={}){
  return consumer.bind({indexWorldEvent,cityAudit});
}
/** Reverse direction: forward original Knowledge functions without exposing or relabeling records. */
export function connectWorldKnowledge({consumer=createWorldKnowledgeConsumer()}={}){
  return consumer.bind({factVisibleTo,listNarrativeRecords});
}
