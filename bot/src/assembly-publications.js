/** Native assembly projection uses the shared transactional outbox; raw plan prose stays GM-private. */
import {randomUUID} from 'node:crypto';
import {assemblyHash,assemblyPlanHash,assemblySlots,legacyAssemblyState,assemblyDeliverySummary} from './assembly-state.js';
import {prepareAssemblyOutput} from './pvp-output.js';
import {queueTurnPublications} from './publication-outbox.js';
import {deliverQueuedTurn} from './publishing.js';
import {PermissionError,StateConflictError} from './errors.js';
import {indexWorldEvent} from './city-calendar.js';
function metadataSource(db,guild,session,key){
  return indexWorldEvent(db,guild,{key:`assembly-meta:${assemblyHash(key)}`,kind:'assembly_delivery_metadata',
    title:'Assembly transport bookkeeping, not fictional authority',source_id:'native:assembly',visibility:'gm',session_id:session.id,
    details:{key,plan:assemblyPlanHash(db.getAssemblyPlan(session.id))}},'native:assembly').event_key;
}
export async function deliverVerifiedAssembly({db,guild,session}){
  const plan=db.getAssemblyPlan(session.id)||{},diagnostics=[];
  for(const slot of assemblySlots(db,guild.id,session)){
    const legacy=legacyAssemblyState(plan,slot.scope);
    if(legacy.uncertain.length||legacy.partial||legacy.complete)continue;
    let job=db.getCityRecord(guild.id,'assembly_delivery',slot.key);
    try{
      if(!job?.data.turn_id)job=db.transaction(()=>{
        const result=prepareAssemblyOutput(db,guild.id,session.id,slot.scope),turn=db.beginTurnAttempt({guildId:guild.id,sessionId:session.id,
          messageId:slot.key,actorPrincipal:slot.scope.actorUserId||'__assembly__',audience:slot.scope.mode});
        queueTurnPublications(db,{guild,session,result,scope:slot.scope,turnId:turn.turn_id});
        db.updateTurnAttempt(turn.turn_id,{stage:'committed',committed:'yes',nativeCommitId:slot.key});
        return db.saveCityRecord(guild.id,{kind:'assembly_delivery',key:slot.key,status:'pending',visibility:'gm',source_event:metadataSource(db,guild.id,session,slot.key),
          data:{version:1,session:session.id,plan_hash:assemblyPlanHash(plan),scope:slot.scope,turn_id:turn.turn_id,raw_prose_held:true}});
      });
      const delivered=await deliverQueuedTurn({db,guild,turnId:job.data.turn_id});
      db.saveCityRecord(guild.id,{...job,key:slot.key,status:delivered.pending.length?'pending':'delivered'});
    }catch(error){
      if(!error.expected&&!['ASSEMBLY_SOURCE','NARRATIVE_PVP','OUTPUT_AUTHORITY','NARRATIVE_INTEGRITY'].includes(error.code))throw error;
      diagnostics.push({name:slot.name,code:error.code||'ASSEMBLY_DELIVERY'});
      if(!job?.data.turn_id)db.saveCityRecord(guild.id,{kind:'assembly_delivery',key:slot.key,status:'blocked',visibility:'gm',source_event:metadataSource(db,guild.id,session,slot.key),
        data:{version:1,session:session.id,scope:slot.scope,hold_code:error.code||'ASSEMBLY_SOURCE'}});
    }
  }
  return {slots:assemblyDeliverySummary(db,guild.id,session),diagnostics};
}
function reviewSnapshot(db,guild,session){
  const plan=db.getAssemblyPlan(session.id)||{};
  return {plan:assemblyPlanHash(plan),roster:assemblySlots(db,guild,session).map(s=>[s.scope,db.getCharacter(s.scope.actorCharacterId)?.owner_user_id]),
    state:plan.delivery_state||{}};
}
export function prepareAssemblyReconciliation(db,guild,session,user,{authorized=false}={}){
  if(!authorized)throw new PermissionError('GM/admin permission required.');
  const snapshot=reviewSnapshot(db,guild,session),keys=Object.entries(snapshot.state)
    .filter(([,s])=>['uncertain','delivering'].includes(s.status)&&!s.discord_message_id).map(([key])=>key);
  if(!keys.length)return null;
  const key=randomUUID();db.saveCityRecord(guild,{kind:'assembly_reconciliation',key,status:'pending',visibility:'gm',source_event:metadataSource(db,guild,session,key),
    data:{version:1,session:session.id,user,revision:assemblyHash(snapshot),keys}});return key;
}
export function reconcileAssemblyNotSent(db,guild,user,key,{authorized=false,interactionId=null}={}){
  const record=db.getCityRecord(guild,'assembly_reconciliation',key),session=db.getActiveSession(guild);
  if(!authorized||!record||record.data.user!==user)throw new PermissionError('Original authenticated GM review owner required.');
  if(record.status==='reconciled')return record;
  if(!session||session.id!==record.data.session||assemblyHash(reviewSnapshot(db,guild,session))!==record.data.revision)
    throw new StateConflictError('Assembly plan, owner or delivery state changed; refresh stale review.');
  return db.transaction(()=>{
    const plan=db.getAssemblyPlan(session.id),state={...plan.delivery_state};
    for(const key of record.data.keys){
      if(!['uncertain','delivering'].includes(state[key]?.status)||state[key].discord_message_id)throw new StateConflictError('Exact unacknowledged legacy part required.');
      state[key]={...state[key],status:'not_sent',reconciled_by:user,reconciliation:record.record_key};
    }
    db.setAssemblyPlan(session.id,{...plan,delivery_state:state});
    db.audit(guild,session.id,'human',user,'assembly_confirmed_not_sent',{review:key,parts:record.data.keys,interaction:interactionId});
    return db.saveCityRecord(guild,{...record,key,status:'reconciled'});
  });
}
