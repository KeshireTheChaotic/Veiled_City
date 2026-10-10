/** Typed player mechanical intents: no regex phrases, native dice only after validated committed turn. */
import { createHash } from 'node:crypto';
import { pendingRollRequests, rollRevision } from './roll-requests.js';
import { contributeRoll } from './roll-collaboration.js';

const hash=s=>createHash('sha256').update(JSON.stringify(s)).digest('hex').slice(0,32);

/** Executed ONLY inside commitGmTurn's authoritative DB transaction; never in dry-run preview. */
export function resolveTypedNativeRolls(db,guild,scope,intents=[],messageId=''){
  if(!scope?.actorCharacterId||!scope.actorUserId||!messageId)return [];
  const results=[];
  for(const [index,intent] of intents.entries()){
    // Interpretation does not authorize spending, assistance, sharing, consent, or rolling for others.
    if(intent?.type!=='roll'||intent.framing!=='immediate'||!['roll','damage'].includes(intent.operation))continue;
    if(!['roll_required','conversational'].includes(intent.resolution))continue;
    const pending=pendingRollRequests(db,guild,scope.actorUserId).filter(row=>row.subject_key===scope.actorCharacterId
      &&row.status===(intent.operation==='roll'?'pending':'awaiting_damage'));
    if(pending.length!==1){
      results.push({status:'needs_clarification',operation:intent.operation,reason:'No unique current owned pending native roll.'});
      continue;
    }
    const row=pending[0];
    const result=contributeRoll(db,guild,scope.actorUserId,{
      op:intent.operation,request:row.record_key,expected_revision:rollRevision(row),
      key:`typed-roll:${hash([guild,messageId,scope.actorCharacterId,index])}`});
    results.push({status:'accepted',data:{intent:{feature:'roll',operation:intent.operation},
      result:{record_key:result.record_key}},source_span:intent.source_span});
  }
  return results;
}
