import {jsonHash as hash} from '../../kernel/json-hash.js';
import {delegationPolicy} from './delegation-policy.js';
import {validateIntent} from './ai-intent-contracts.js';
import {intentWorldPrimitives} from './contracts/world-primitives.js';
const {indexWorldEvent,cityAudit}=intentWorldPrimitives;
function decision(db,guild,intent,impact,budget){
  const policy=delegationPolicy(db,guild),minute=db.getSimulationClock(guild).minute;
  if(policy.revision!==intent.policy_revision) return {status:"blocked",reason:"Delegation policy changed."};
  if(policy.mode==="manual") return {status:"blocked",reason:"AI execution is not delegated."};
  if(policy.mode==="suggest_only"||impact.review||!policy.allow.includes(`${intent.feature}.${intent.payload.op}`))
    return {status:"pending",reason:impact.reason||"Human review or explicit delegation required."};
  if(policy.expires_minute===null||minute>=policy.expires_minute) return {status:"blocked",reason:"Delegation expired."};
  if(budget.operations>=policy.max_operations||budget.cost+impact.cost>policy.max_cost) return {status:"blocked",reason:"Delegated budget exhausted."};
  return {status:"accepted",reason:"Routine operation explicitly delegated."};
}
function saveReceipt(db,guild,key,intent,status,reason,context,extra={}){
  const source=validateIntent(intent)&&db.getWorldEvent(guild,intent.payload.source_event)?intent.payload.source_event
    :indexWorldEvent(db,guild,{key:`receipt:${hash(key).slice(0,32)}`,title:"Rejected AI proposal",source_id:context.origin||"ai_policy"},"ai_policy").event_key;
  const row=db.saveCityRecord(guild,{kind:"ai_intent",key,status,source_event:source,
    data:{intent,reason,scope:context.scope||{mode:"party"},origin:context.origin||"",session_id:context.sessionId||null,
      ...(context.ordinaryEffect?{ordinary_effect:context.ordinaryEffect}:{}),...extra}});
  cityAudit(db,guild,"ai_intent",key,null,row,"ai_policy");return row;
}
export {decision,saveReceipt};
