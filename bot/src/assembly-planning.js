/** GM-reviewed replacement of stale/fallback plans. Delivery acknowledgements are never reset. */
import {randomUUID} from 'node:crypto';
import {assemblyInputFingerprint,assemblyPlanFreshness,certifyAssemblyPlan,hookHash,assemblySourceError,assemblyHookProjection} from './assembly-context.js';
import {assemblyPlanHash} from './assembly-state.js';
import {indexWorldEvent} from './city-calendar.js';
export function assemblyHasHistory(db,guild,session,plan){
  if(Object.values(plan?.delivery_state||{}).some(s=>['delivered','delivering','uncertain'].includes(s.status)))return true;
  return db.listCityRecords(guild,{kind:'assembly_delivery',includeGM:true,limit:1000})
    .filter(r=>r.data.session===session.id&&r.data.turn_id).some(r=>db.listTurnPublications(guild,r.data.turn_id)
      .some(p=>['delivered','delivering','uncertain'].includes(p.status)));
}
function reviewState(db,guild,session){
  const plan=db.getAssemblyPlan(session.id);
  return {plan:assemblyPlanHash(plan),inputs:assemblyInputFingerprint(db,guild,session),legacy:plan.delivery_state||{},
    deliveries:db.listCityRecords(guild,{kind:'assembly_delivery',includeGM:true,limit:1000}).filter(r=>r.data.session===session.id)
      .map(r=>({key:r.record_key,publications:r.data.turn_id?db.listTurnPublications(guild,r.data.turn_id)
        .map(p=>[p.id,p.status,p.payload_hash,p.discord_message_id]):[]})).sort((a,b)=>a.key.localeCompare(b.key))};
}
export function assemblyRefreshRequired(db,guild,session){
  const plan=db.getAssemblyPlan(session.id),freshness=assemblyPlanFreshness(db,guild,session,plan);
  const history=assemblyHasHistory(db,guild,session,plan);
  return {freshness,history,hold:history&&freshness==='stale'};
}
export function prepareAssemblyRefresh(db,guild,session,user){
  const state=assemblyRefreshRequired(db,guild,session),plan=db.getAssemblyPlan(session.id);
  // Legacy uncertain sends must use their existing exact-part reconciliation, never replacement.
  if(!state.history||Object.values(plan.delivery_state||{}).some(s=>['delivered','uncertain','delivering'].includes(s.status)))return null;
  const jobs=db.listCityRecords(guild,{kind:'assembly_delivery',includeGM:true,limit:1000}).filter(r=>r.data.session===session.id);
  if(jobs.some(r=>r.data.turn_id&&db.listTurnPublications(guild,r.data.turn_id).some(p=>['uncertain','delivering'].includes(p.status))))return null;
  if(state.freshness==='current'&&!jobs.some(r=>r.data.evidence?.fallback))return null;
  const key=randomUUID(),source=indexWorldEvent(db,guild,{key:`assembly-refresh:${key}`,kind:'assembly_refresh_review',
    title:'GM-private assembly replacement review; no delivery authorized',source_id:'native:assembly',session_id:session.id,
    visibility:'gm',details:{version:1}},'native:assembly');
  db.saveCityRecord(guild,{kind:'assembly_refresh',key,status:'pending',visibility:'gm',source_event:source.event_key,
    data:{session:session.id,user,state:hookHash(reviewState(db,guild,session))}});return key;
}
export async function refreshAssemblyPlan(db,guild,user,key,gm,{authorized=false}={}){
  const record=db.getCityRecord(guild,'assembly_refresh',key),session=db.getActiveSession(guild);
  if(!authorized||!record||record.data.user!==user)throw assemblySourceError('Original authenticated GM review required.');
  if(!session||session.id!==record.data.session)throw assemblySourceError('Original assembly session required.');
  if(record.status==='prepared')return db.getAssemblyPlan(session?.id);
  if(record.status!=='pending')throw assemblySourceError('Planning already started or held; obtain a fresh GM review, never blindly retry.');
  if(record.data.state!==hookHash(reviewState(db,guild,session)))
    throw assemblySourceError('Assembly sources or delivery changed; obtain a fresh review.');
  db.saveCityRecord(guild,{...record,key,status:'planning'});
  try{
  const generated=await gm.planAssembly({guildId:guild,mode:session.assembly_mode});
  return db.transaction(()=>{
    if(record.data.state!==hookHash(reviewState(db,guild,session)))throw assemblySourceError('Assembly changed during planning; replacement held.');
    const old=db.getAssemblyPlan(session.id),next=certifyAssemblyPlan(db,guild,session,generated);
    next.assembly_contract.parent_plan=assemblyPlanHash(old);
    next.assembly_contract.previous_deliveries=db.listCityRecords(guild,{kind:'assembly_delivery',includeGM:true,limit:1000})
      .filter(r=>r.data.session===session.id&&r.data.turn_id&&db.listTurnPublications(guild,r.data.turn_id).length
        &&db.listTurnPublications(guild,r.data.turn_id).every(p=>p.status==='delivered'))
      .map(r=>({scope:r.data.scope,turn_id:r.data.turn_id,evidence:r.data.evidence||{fallback:true}}));
    db.saveCityRecord(guild,{kind:'assembly_plan_history',key:assemblyPlanHash(old),status:'retained',visibility:'gm',
      source_event:record.source_event,data:{session:session.id,plan:old,replacement_review:key}});
    db.setAssemblyPlan(session.id,next);
    db.saveCityRecord(guild,{...record,key,status:'prepared'});
    db.audit(guild,session.id,'human_gm',user,'assembly_replacement_prepared',{review:key,previous:assemblyPlanHash(old),next:assemblyPlanHash(next),sent:false});
    return next;
  });
  }catch(error){
    db.saveCityRecord(guild,{...record,key,status:'needs_review',data:{...record.data,hold_code:error.code||'ASSEMBLY_PLANNER_UNAVAILABLE'}});
    throw error;
  }
}
export function retainedAssemblyDelivery(db,guild,session,scope,{fallback=false}={}){
  const plan=db.getAssemblyPlan(session.id),previous=plan.assembly_contract?.previous_deliveries||[];
  for(const item of previous.filter(p=>hookHash(p.scope)===hookHash(scope))){
    const rows=db.listTurnPublications(guild,item.turn_id);
    if(!rows.length||!rows.every(r=>r.status==='delivered'))continue;
    if(fallback&&item.evidence.fallback)return item;
    if(scope.mode==='party'&&item.evidence.narrative_verified)return item;
    if(item.evidence.hook_verified){
      try{if(assemblyHookProjection(db,guild,session.id,scope)?.revision===item.evidence.hook_revision)return item;}
      catch(error){if(error.code!=='ASSEMBLY_SOURCE')throw error;}
    }
  }
  return null;
}
