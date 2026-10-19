/** One bounded opening execution per native session. No background actor loop or blind provider/send retry. */
import {inspectSessionOpening,beginSessionOpeningAttempt,assertSessionOpeningAttempt,bindSessionOpeningTurn} from './session-opening.js';
import {certifyAssemblyPlan,assemblyPlanFreshness} from './assembly-context.js';
import {assemblyHasHistory} from './assembly-planning.js';
import {deliverVerifiedAssembly} from './assembly-publications.js';
const flights=new WeakMap();
export function sessionOpeningStatus(job){
  const counts=new Map(),known=new Set(['SOURCE_HOOK_DELIVERED','VERIFIED_SCENE_DELIVERED','FALLBACK_DELIVERED','UNCERTAIN','FAILED','PENDING','BLOCKED','LEGACY_DELIVERED']);
  for(const slot of job.data.slots||[]){
    const label=`${slot.audience==='private'?'Owner-private':'Shared'}: ${known.has(slot.narrative_status)?slot.narrative_status:'REVIEW'}`;
    counts.set(label,(counts.get(label)||0)+1);
  }
  return `Native opening: ${job.status}. Attempts: ${job.data.attempts}.`
    +`\n${[...counts].map(([label,count])=>`${label} × ${count}`).join('\n')}`
    +`${job.data.hold_code?`\nReview reference: ${job.data.hold_code}. Existing acknowledgements and uncertain sends are retained; no blind retry.`:''}`;
}
function save(db,guild,row,status,data={}){
  return db.saveCityRecord(guild,{...row,key:row.record_key,status,data:{...row.data,...data}});
}
function code(error){return /^[A-Z_]{2,60}$/.test(error?.code||'')?error.code:'OPENING_REVIEW_REQUIRED';}
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
  if(!db.getCityRecord(guild.id,'session_opening_job',key))return null;
  let row=inspectSessionOpening(db,guild.id,key);
  if(['planning','publishing'].includes(row.status))return save(db,guild.id,row,'held_interrupted',{hold_code:'OPENING_INTERRUPTED_REVIEW'});
  if(row.status==='prepared_refresh'){
    if(db.isDirectorPaused(guild.id))return row;
    try{return await deliverSessionOpening({db,guild,gm,key});}
    catch(error){return save(db,guild.id,inspectSessionOpening(db,guild.id,key),'needs_review',{hold_code:code(error)});}
  }
  if(!['queued','held_paused'].includes(row.status))return row;
  if(row.data.origin.mode==='manual')return save(db,guild.id,row,'held_manual');
  if(db.isDirectorPaused(guild.id))return save(db,guild.id,row,'held_paused');
  if(typeof gm?.planAssembly!=='function')return save(db,guild.id,row,'queued',{hold_code:'OPENING_PLANNER_UNAVAILABLE'});
  try{
    row=beginSessionOpeningAttempt(db,guild.id,key);
    const session=db.getActiveSession(guild.id);let plan=db.getAssemblyPlan(key)||{};
    const stale=assemblyPlanFreshness(db,guild.id,session,plan)==='stale',history=assemblyHasHistory(db,guild.id,session,plan);
    if(stale&&history)return save(db,guild.id,row,'needs_review',{hold_code:'ASSEMBLY_STALE_REVIEW'});
    if(!plan.public_opening&&!plan.character_entries?.length&&!plan.assembly_contract||stale&&!history){
      const generated=await gm.planAssembly({guildId:guild.id,mode:session.assembly_mode,openingKind:row.data.origin.kind});
      assertSessionOpeningAttempt(db,guild.id,key);
      plan=certifyAssemblyPlan(db,guild.id,session,generated);
      plan.assembly_contract.opening_kind=row.data.origin.kind;db.setAssemblyPlan(key,plan);
    }
    return await deliverSessionOpening({db,guild,gm,key});
  }catch(error){
    // Hold only this job. Already committed fiction, native outcomes and transport acknowledgements remain immutable.
    const current=db.getCityRecord(guild.id,'session_opening_job',key);
    return current?save(db,guild.id,current,'needs_review',{hold_code:code(error)}):null;
  }
}
/** Recovery passes no GM/writer and verifies all slots already have native prepared turns before calling. */
export async function deliverSessionOpening({db,guild,gm=null,key}){
  let row=assertSessionOpeningAttempt(db,guild.id,key);row=save(db,guild.id,row,'publishing');
  const session=db.getActiveSession(guild.id),result=await deliverVerifiedAssembly({db,guild,session,gm,
    assertCurrent:()=>assertSessionOpeningAttempt(db,guild.id,key),bindTurn:turn=>bindSessionOpeningTurn(db,guild.id,key,turn)});
  row=assertSessionOpeningAttempt(db,guild.id,key);
  const slots=result.slots.map(s=>({audience:s.scope.mode,character:s.scope.actorCharacterId,user:s.scope.actorUserId,
    status:s.status,narrative_status:s.narrative_status})),complete=slots.every(s=>['delivered','legacy_delivered'].includes(s.status));
  return save(db,guild.id,row,complete?'completed':'needs_delivery_review',{slots,hold_code:complete?null:'OPENING_DELIVERY_REVIEW'});
}
