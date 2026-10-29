/** GM-reviewed replacement of stale/fallback plans. Delivery acknowledgements are never reset. */
import {randomUUID} from 'node:crypto';
import {sessionAssemblyContextSource,sessionAssemblyStateSource,sessionOpeningSource,hookHash,assemblySourceError} from './frameworks/session/public.js';
import {indexWorldEvent} from './frameworks/world/public.js';
const {assemblyInputFingerprint,assemblyPlanFreshness,certifyAssemblyPlan,assemblyHookSelection}=sessionAssemblyContextSource;
const {assemblyPlanHash}=sessionAssemblyStateSource;
const {inspectSessionOpening,rebindSessionOpeningRefresh}=sessionOpeningSource;
function deliveries(db,guild,session){
  const rows=db.assemblyDeliveryRecords(guild,session.id);
  if(rows.length>=1001)throw assemblySourceError('Assembly delivery inventory exceeds bounded review; retain history for scoped review.');
  return rows;
}
function opening(db,guild,session){
  return db.getCityRecord(guild,'session_opening_job',session.id)?inspectSessionOpening(db,guild,session.id):null;
}
function reviewSource(db,guild,record){
  const source=db.getWorldEvent(guild,record.source_event);
  if(record.data.version!==2||record.visibility!=='gm'||record.subject_key!==null||source?.status!=='active'
    ||source.event_key!==`assembly-refresh:${record.record_key}`||source.kind!=='assembly_refresh_review'||source.source_id!=='native:assembly'
    ||source.visibility!=='gm'||source.subject_key!==null||source.session_id!==record.data.session||hookHash(source.details)!==hookHash(record.data))
    throw assemblySourceError('Current source-bound assembly review required; obtain a fresh review.');
}
export function assemblyHasHistory(db,guild,session,plan){
  if(Object.values(plan?.delivery_state||{}).some(s=>['delivered','delivering','uncertain'].includes(s.status)))return true;
  return deliveries(db,guild,session).filter(r=>r.data.turn_id).some(r=>db.listTurnPublications(guild,r.data.turn_id)
      .some(p=>['delivered','delivering','uncertain'].includes(p.status)));
}
function reviewState(db,guild,session){
  const plan=db.getAssemblyPlan(session.id),job=opening(db,guild,session);
  return {plan:assemblyPlanHash(plan),inputs:assemblyInputFingerprint(db,guild,session),legacy:plan.delivery_state||{},
    opening:job?{row:job,source:db.getWorldEvent(guild,job.source_event),attempt:db.getWorldEvent(guild,job.data.attempt_source)}:null,
    paused:db.isDirectorPaused(guild),
    deliveries:deliveries(db,guild,session).map(r=>({record:r,source:db.getWorldEvent(guild,r.source_event),
      publications:r.data.turn_id?db.listTurnPublications(guild,r.data.turn_id):[]})).sort((a,b)=>a.record.record_key.localeCompare(b.record.record_key))};
}
export function assemblyRefreshRequired(db,guild,session){
  const plan=db.getAssemblyPlan(session.id),freshness=assemblyPlanFreshness(db,guild,session,plan);
  const history=assemblyHasHistory(db,guild,session,plan);
  return {freshness,history,hold:history&&freshness==='stale'};
}
export function prepareAssemblyRefresh(db,guild,session,user){
  const state=assemblyRefreshRequired(db,guild,session),plan=db.getAssemblyPlan(session.id),job=opening(db,guild,session);
  if(job&&(db.isDirectorPaused(guild)||job.data.attempts!==1||['planning','publishing','prepared_refresh'].includes(job.status)))return null;
  if(db.getCityRecord(guild,'assembly_refresh_lease',session.id)?.status==='planning')return null;
  // Legacy uncertain sends must use their existing exact-part reconciliation, never replacement.
  if(!state.history&&!job||Object.values(plan.delivery_state||{}).some(s=>['delivered','uncertain','delivering'].includes(s.status)))return null;
  const jobs=deliveries(db,guild,session);
  if(jobs.some(r=>r.data.turn_id&&db.listTurnPublications(guild,r.data.turn_id).some(p=>['uncertain','delivering'].includes(p.status))))return null;
  if(state.freshness==='current'&&!jobs.some(r=>r.data.evidence?.fallback))return null;
  const key=randomUUID(),data={version:2,session:session.id,user,state:hookHash(reviewState(db,guild,session)),
    lease:hookHash(db.getCityRecord(guild,'assembly_refresh_lease',session.id))},
    source=indexWorldEvent(db,guild,{key:`assembly-refresh:${key}`,kind:'assembly_refresh_review',
    title:'GM-private assembly replacement review; no delivery authorized',source_id:'native:assembly',session_id:session.id,
    visibility:'gm',details:data},'native:assembly');
  db.saveCityRecord(guild,{kind:'assembly_refresh',key,status:'pending',visibility:'gm',source_event:source.event_key,
    data});return key;
}
export async function refreshAssemblyPlan(db,guild,user,key,gm,{authorized=false,interactionId=null}={}){
  const record=db.getCityRecord(guild,'assembly_refresh',key),session=db.getActiveSession(guild);
  if(!authorized||!record||record.data.user!==user)throw assemblySourceError('Original authenticated GM review required.');
  if(!session||session.id!==record.data.session)throw assemblySourceError('Original assembly session required.');
  reviewSource(db,guild,record);
  if(record.status==='prepared')return db.getAssemblyPlan(session?.id);
  if(record.status!=='pending')throw assemblySourceError('Planning already started or held; obtain a fresh GM review, never blindly retry.');
  if(record.data.state!==hookHash(reviewState(db,guild,session)))
    throw assemblySourceError('Assembly sources or delivery changed; obtain a fresh review.');
  const native=opening(db,guild,session);
  if(native&&(native.data.attempts!==1||!interactionId||db.isDirectorPaused(guild)))throw assemblySourceError('One authenticated opening replacement required.');
  db.transaction(()=>{
    const lease=db.getCityRecord(guild,'assembly_refresh_lease',session.id);
    if(lease?.status==='planning'||record.data.lease!==hookHash(lease))throw assemblySourceError('Assembly planning lease changed; obtain a fresh review, never retry a sibling approval.');
    db.saveCityRecord(guild,{kind:'assembly_refresh_lease',key:session.id,status:'planning',visibility:'gm',source_event:record.source_event,data:{review:key}});
    db.saveCityRecord(guild,{...record,key,status:'planning'});
  });
  try{
  const generated=await gm.planAssembly({guildId:guild,mode:session.assembly_mode,...(native?{openingKind:native.data.origin.kind}:{})});
  return db.transaction(()=>{
    reviewSource(db,guild,record);
    const lease=db.getCityRecord(guild,'assembly_refresh_lease',session.id);
    if(lease?.status!=='planning'||lease.data.review!==key)throw assemblySourceError('Original planning lease required.');
    if(record.data.state!==hookHash(reviewState(db,guild,session)))throw assemblySourceError('Assembly changed during planning; replacement held.');
    const old=db.getAssemblyPlan(session.id),next=certifyAssemblyPlan(db,guild,session,generated);
    if(native)next.assembly_contract.opening_kind=native.data.origin.kind;
    next.assembly_contract.parent_plan=assemblyPlanHash(old);
    next.assembly_contract.previous_deliveries=deliveries(db,guild,session)
      .filter(r=>r.data.turn_id&&db.listTurnPublications(guild,r.data.turn_id).length
        &&db.listTurnPublications(guild,r.data.turn_id).every(p=>p.status==='delivered'))
      .map(r=>({scope:r.data.scope,turn_id:r.data.turn_id,evidence:r.data.evidence||{fallback:true}}));
    db.saveCityRecord(guild,{kind:'assembly_plan_history',key:assemblyPlanHash(old),status:'retained',visibility:'gm',
      source_event:record.source_event,data:{session:session.id,plan:old,replacement_review:key}});
    db.setAssemblyPlan(session.id,next);
    const prepared=db.saveCityRecord(guild,{...record,key,status:'prepared'});
    rebindSessionOpeningRefresh(db,guild,session.id,prepared,user,interactionId);
    db.saveCityRecord(guild,{kind:'assembly_refresh_lease',key:session.id,status:'prepared',visibility:'gm',source_event:record.source_event,data:{review:key}});
    db.audit(guild,session.id,'human_gm',user,'assembly_replacement_prepared',{review:key,previous:assemblyPlanHash(old),next:assemblyPlanHash(next),sent:false});
    return next;
  });
  }catch(error){
    db.saveCityRecord(guild,{kind:'assembly_refresh_lease',key:session.id,status:'needs_review',visibility:'gm',source_event:record.source_event,data:{review:key}});
    db.saveCityRecord(guild,{...record,key,status:'needs_review',data:{...record.data,hold_code:error.code||'ASSEMBLY_PLANNER_UNAVAILABLE'}});
    throw error;
  }
}
export function retainedAssemblyDelivery(db,guild,session,scope,{fallback=false}={}){
  const plan=db.getAssemblyPlan(session.id),previous=plan?.assembly_contract?.previous_deliveries||[];
  for(const item of previous.filter(p=>p?.scope&&p.evidence&&p.turn_id&&hookHash(p.scope)===hookHash(scope))){
    const rows=db.listTurnPublications(guild,item.turn_id);
    if(!rows.length||!rows.every(r=>r.status==='delivered'))continue;
    if(fallback&&item.evidence.fallback)return item;
    if(scope.mode==='party'&&item.evidence.narrative_verified)return item;
    if(item.evidence.hook_verified||item.evidence.narrative_verified){
      try{if(assemblyHookSelection(db,guild,session.id,scope)?.revision===item.evidence.hook_revision)return item;}
      catch(error){if(error.code!=='ASSEMBLY_SOURCE')throw error;}
    }
  }
  return null;
}
