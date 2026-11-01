import {stateRevision} from '../../kernel/state-revision.js';
import {validateIntent} from './ai-intent-contracts.js';
import {delegationPolicy} from './delegation-policy.js';
import {intentWorldPrimitives} from './contracts/world-primitives.js';
import {intentReviewExecution} from './contracts/review-execution.js';
const {cityAudit}=intentWorldPrimitives;
const {preflight,applyNative}=intentReviewExecution;
export function reviewAiIntent(db,guild,{key,decision:response,expected_revision,replacement_intent=null},reviewer){
  if(!reviewer||!["approve","reject","defer","modify"].includes(response)) throw new Error("Authenticated GM review required.");
  const row=db.getCityRecord(guild,"ai_intent",key);
  if(!row||!["pending","blocked","deferred"].includes(row.status)||response==="approve"&&!row.data.intent) throw new Error("Reviewable intent required.");
  if(stateRevision(row)!==expected_revision) throw new Error("Inbox item changed; refresh before reviewing.");
  return db.transaction(()=>{
    if(response!=="approve"){
      if(response==='modify'&&(row.data.ordinary_effect||String(row.data.origin||'').startsWith('ordinary-effect:')))
        throw new Error('Bound ordinary follow-through needs a fresh proposal; no substituted native child.');
      if(response==="modify"&&!validateIntent(replacement_intent)) throw new Error("A complete closed replacement intent is required.");
      const after=db.saveCityRecord(guild,{...row,key,status:{reject:"rejected",defer:"deferred",modify:"pending"}[response],
        data:{...row.data,intent:response==="modify"?replacement_intent:row.data.intent,reviewed_by:reviewer,
          history:[...(row.data.history||[]).slice(-19),{decision:response,intent:row.data.intent,by:reviewer}]}});
      cityAudit(db,guild,"ai_intent_review",key,row,after,reviewer);return after;
    }
    const context={scope:row.data.scope,sessionId:row.data.session_id,origin:row.data.origin,ordinaryEffect:row.data.ordinary_effect},intent=row.data.intent;
    const {adapter,before,impact,privateWorld}=preflight(db,guild,intent,context);
    if(intent.policy_revision!==delegationPolicy(db,guild).revision) throw new Error("Policy changed; request a fresh proposal.");
    const result=response==="approve"?applyNative(db,guild,intent,key,reviewer,context,adapter,privateWorld):null;
    const after=db.saveCityRecord(guild,{...row,key,status:response==="approve"?"accepted":"rejected",
      data:{...row.data,before,impact,result,reviewed_by:reviewer}});
    cityAudit(db,guild,"ai_intent_review",key,row,after,reviewer);return after;
  });
}
