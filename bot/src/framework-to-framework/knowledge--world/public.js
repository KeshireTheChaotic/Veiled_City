import {createKnowledgeWorldEventConsumer} from '../../frameworks/knowledge/public.js';
import {indexWorldEvent,cityAudit} from '../../frameworks/world/public.js';
/** Native event/audit identity and transaction forwarding only; no evidence classification copied. */
export function connectKnowledgeWorld({consumer=createKnowledgeWorldEventConsumer()}={}){
  return consumer.bind({indexWorldEvent,cityAudit});
}
