/** One bounded opening execution per native session. No background actor loop or blind provider/send retry. */
import {inspectSessionOpening,beginSessionOpeningAttempt,assertSessionOpeningAttempt,assertSessionOpeningFence,rebaseSessionOpening,bindSessionOpeningTurn} from './session-opening.js';
import {certifyAssemblyPlan,assemblyPlanFreshness} from './assembly-context.js';
import {assemblyHasHistory} from './assembly-planning.js';
import {deliverVerifiedAssembly} from './assembly-publications.js';
import {measureStage,operationalMetrics} from './operational-metrics.js';
import {openingErrorCode,openingDiagnostic} from './frameworks/operations/public.js';
const flights=new WeakMap();
export function sessionOpeningStatus(job){
  const counts=new Map(),known=new Set(['VERIFIED_SCENE_DELIVERED','FALLBACK_DELIVERED','UNCERTAIN','FAILED','PENDING','BLOCKED','LEGACY_DELIVERED']);
  const held=(job.data.slots||[]).filter(s=>s.narrative_quarantined===true).length;
  const coverage=(job.data.slots||[]).filter(s=>s.dramatic_coverage==='unverified').length;
  for(const slot of job.data.slots||[]){
    const label=`${slot.audience==='private'?'Owner-private':'Shared'}: ${known.has(slot.narrative_status)?slot.narrative_status:'REVIEW'}`;
    counts.set(label,(counts.get(label)||0)+1);
  }
  return `Native opening: ${job.status}. Attempts: ${job.data.attempts}.`
    +`\n${[...counts].map(([label,count])=>`${label} × ${count}`).join('\n')}`
    +(held?`\nNarrative authoring held for review: ${held} slot(s). Delivered source hooks or orientation do not certify the original draft.`:'')
    +`${job.data.hold_code?`\nReview reference: ${job.data.hold_code}. Existing acknowledgements and uncertain sends are retained; no blind retry.`:''}`
    +`${coverage?`\nDramatic coverage remains unverified for ${coverage} slot(s); accepted prose is not semantic proof.`:''}`;
}
function save(db,guild,row,status,data={}){
  return db.saveCityRecord(guild,{...row,key:row.record_key,status,data:{...row.data,...data}});
}
const code=openingErrorCode;
export function runSessionOpening({db,guild,gm}){
  const session=db.getActiveSession(guild.id);if(!session)return Promise.resolve(null);
  return sessionOpeningFlight(db,guild.id,session.id,()=>execute({db,guild,gm,key:session.id}));
}
export function sessionOpeningFlight(db,guild,session,execute){
  if(!flights.has(db))flights.set(db,new Map());const active=flights.get(db),key=`${guild}:${session}`;
  if(active.has(key))return active.get(key);
  const work=Promise.resolve().then(execute);
  active.set(key,work);work.finally(()=>{if(active.get(key)===work)active.delete(key);}).catch(()=>{});return work;
}
async function execute({db,guild,gm,key}){
  const started=performance.now();let stage='opening_source',plannerInvocations=0;
  if(!db.getCityRecord(guild.id,'session_opening_job',key))return null;
  let row=inspectSessionOpening(db,guild.id,key);
  // Durable claim belongs to its worker. Another connection must not steal or downgrade it.
  if(['planning','publishing'].includes(row.status))return row;
  if(row.status==='prepared_refresh'){
    if(db.isDirectorPaused(guild.id))return row;
    const claimed=db.transaction(()=>{
      const live=assertSessionOpeningAttempt(db,guild.id,key);
      if(live.status!=='prepared_refresh'||live.source_event!==row.source_event)return null;
      return db.transitionCityRecord(guild.id,{kind:'session_opening_job',key,
        expectedStatus:'prepared_refresh',expectedSourceEvent:live.source_event,status:'publishing',data:live.data});
    });
    // The GM-approved refresh may be resumed by several bot processes at once.
    // Only the worker that atomically claims this exact prepared receipt may author.
    if(!claimed)return inspectSessionOpening(db,guild.id,key);
    try{return await deliverSessionOpening({db,guild,gm,key});}
    catch(error){return save(db,guild.id,inspectSessionOpening(db,guild.id,key),'needs_review',{hold_code:code(error)});}
  }
  if(!['queued','held_paused','prepared_rebase'].includes(row.status))return row;
  if(row.data.origin.mode==='manual')return save(db,guild.id,row,'held_manual');
  if(db.isDirectorPaused(guild.id))return save(db,guild.id,row,'held_paused');
  if(typeof gm?.planAssembly!=='function')return save(db,guild.id,row,'queued',{hold_code:'OPENING_PLANNER_UNAVAILABLE'});
  try{
    row=row.status==='prepared_rebase'?db.transaction(()=>{
      const live=assertSessionOpeningAttempt(db,guild.id,key);
      if(live.status!=='prepared_rebase')return null;
      return save(db,guild.id,live,'planning');
    }):beginSessionOpeningAttempt(db,guild.id,key);
    if(!row)return inspectSessionOpening(db,guild.id,key);
    for(let generation=0;generation<2;generation++)try{
    const session=db.getActiveSession(guild.id);let plan=db.getAssemblyPlan(key)||{};
    const stale=assemblyPlanFreshness(db,guild.id,session,plan)==='stale',history=assemblyHasHistory(db,guild.id,session,plan);
    if(stale&&history)return save(db,guild.id,row,'needs_review',{hold_code:'ASSEMBLY_STALE_REVIEW'});
    if(!plan.public_opening&&!plan.character_entries?.length&&!plan.assembly_contract||stale&&!history){
      stage='opening_plan';plannerInvocations++;
      const generated=await measureStage(gm.metrics||operationalMetrics,'opening_plan',
        ()=>gm.planAssembly({guildId:guild.id,mode:session.assembly_mode,openingKind:row.data.origin.kind}),{guildId:guild.id});
      db.transaction(()=>{
        assertSessionOpeningFence(db,guild.id,key,row);
        plan=certifyAssemblyPlan(db,guild.id,session,generated,{fingerprint:row.data.epoch?.input_fingerprint||row.data.context.input_fingerprint});
        plan.assembly_contract.opening_kind=row.data.origin.kind;db.setAssemblyPlan(key,plan);
      });
    }
    stage='opening_authoring_or_publish';
    const delivered=await deliverSessionOpening({db,guild,gm,key,expected:row});
    return save(db,guild.id,delivered,delivered.status,{diagnostic:openingDiagnostic(delivered,{code:'OPENING_FINISHED',stage,
      durationMs:performance.now()-started,plannerInvocations})});
    }catch(error){
      if(error.code!=='OPENING_INPUT_CHANGED')throw error;
      row=rebaseSessionOpening(db,guild.id,key,row);
    }
  }catch(error){
    // Hold only this job. Already committed fiction, native outcomes and transport acknowledgements remain immutable.
    const current=db.getCityRecord(guild.id,'session_opening_job',key);
    if(error.code==='OPENING_FENCE_LOST')return current;
    return current?save(db,guild.id,current,'needs_review',{hold_code:code(error),diagnostic:openingDiagnostic(current,
      {code:code(error),stage,durationMs:performance.now()-started,plannerInvocations})}):null;
  }
}
/** Recovery passes no GM/writer and verifies all slots already have native prepared turns before calling. */
export async function deliverSessionOpening({db,guild,gm=null,key,expected=null}){
  let row=assertSessionOpeningAttempt(db,guild.id,key);row=save(db,guild.id,row,'publishing');
  const fence=expected||row;
  const session=db.getActiveSession(guild.id),result=await deliverVerifiedAssembly({db,guild,session,gm,
    assertCurrent:()=>assertSessionOpeningFence(db,guild.id,key,fence),bindTurn:turn=>bindSessionOpeningTurn(db,guild.id,key,turn)});
  row=assertSessionOpeningAttempt(db,guild.id,key);
  const slots=result.slots.map(s=>({audience:s.scope.mode,character:s.scope.actorCharacterId,user:s.scope.actorUserId,
    status:s.status,narrative_status:s.narrative_status,hook_verified:s.evidence.hook_verified===true,
    narrative_generated:s.evidence.narrative_generated===true,narrative_verified:s.evidence.narrative_verified===true,
    narrative_quarantined:s.evidence.narrative_quarantined===true,fallback:s.evidence.fallback===true,
    dramatic_coverage:s.evidence.dramatic_coverage||'unverified'})),
    complete=slots.length>0&&slots.every(s=>s.status==='delivered'&&s.narrative_status==='VERIFIED_SCENE_DELIVERED'),
    transportComplete=slots.every(s=>['delivered','legacy_delivered'].includes(s.status));
  return save(db,guild.id,row,complete?'completed':transportComplete?'needs_narrative_review':'needs_delivery_review',
    {slots,hold_code:complete?null:transportComplete?'OPENING_NARRATIVE_REQUIRED':'OPENING_DELIVERY_REVIEW'});
}
