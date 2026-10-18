/** One bounded opening execution per native session. No background actor loop or blind provider/send retry. */
import {inspectSessionOpening,beginSessionOpeningAttempt,assertSessionOpeningAttempt,bindSessionOpeningTurn} from './session-opening.js';
import {certifyAssemblyPlan,assemblyPlanFreshness} from './assembly-context.js';
import {assemblyHasHistory} from './assembly-planning.js';
import {deliverVerifiedAssembly} from './assembly-publications.js';
const flights=new WeakMap();
function save(db,guild,row,status,data={}){
  return db.saveCityRecord(guild,{...row,key:row.record_key,status,data:{...row.data,...data}});
}
function code(error){return /^[A-Z_]{2,60}$/.test(error?.code||'')?error.code:'OPENING_REVIEW_REQUIRED';}
export function runSessionOpening({db,guild,gm}){
  const session=db.getActiveSession(guild.id);if(!session)return Promise.resolve(null);
  if(!flights.has(db))flights.set(db,new Map());const active=flights.get(db),key=`${guild.id}:${session.id}`;
  if(active.has(key))return active.get(key);
  const work=Promise.resolve().then(()=>execute({db,guild,gm,key:session.id}));
  active.set(key,work);work.finally(()=>{if(active.get(key)===work)active.delete(key);}).catch(()=>{});return work;
}
async function execute({db,guild,gm,key}){
  if(!db.getCityRecord(guild.id,'session_opening_job',key))return null;
  let row=inspectSessionOpening(db,guild.id,key);
  if(['planning','publishing'].includes(row.status))return save(db,guild.id,row,'held_interrupted',{hold_code:'OPENING_INTERRUPTED_REVIEW'});
  if(!['queued','held_paused'].includes(row.status))return row;
  if(row.data.origin.mode==='manual')return save(db,guild.id,row,'held_manual');
  if(db.isDirectorPaused(guild.id))return save(db,guild.id,row,'held_paused');
  // Returning-party resume requires its own current-scene adapter; never use assembly as forced reunion.
  if(row.data.origin.kind!=='assembly')return save(db,guild.id,row,'held_resume',{hold_code:'OPENING_RESUME_ADAPTER_REQUIRED'});
  if(typeof gm?.planAssembly!=='function')return save(db,guild.id,row,'queued',{hold_code:'OPENING_PLANNER_UNAVAILABLE'});
  try{
    row=beginSessionOpeningAttempt(db,guild.id,key);
    const session=db.getActiveSession(guild.id);let plan=db.getAssemblyPlan(key)||{};
    const stale=assemblyPlanFreshness(db,guild.id,session,plan)==='stale',history=assemblyHasHistory(db,guild.id,session,plan);
    if(stale&&history)return save(db,guild.id,row,'needs_review',{hold_code:'ASSEMBLY_STALE_REVIEW'});
    if(!plan.public_opening&&!plan.character_entries?.length&&!plan.assembly_contract||stale&&!history){
      const generated=await gm.planAssembly({guildId:guild.id,mode:session.assembly_mode});
      assertSessionOpeningAttempt(db,guild.id,key);
      plan=certifyAssemblyPlan(db,guild.id,session,generated);db.setAssemblyPlan(key,plan);
    }
    row=assertSessionOpeningAttempt(db,guild.id,key);row=save(db,guild.id,row,'publishing');
    const result=await deliverVerifiedAssembly({db,guild,session,gm,
      assertCurrent:()=>assertSessionOpeningAttempt(db,guild.id,key),
      bindTurn:turn=>bindSessionOpeningTurn(db,guild.id,key,turn)});
    row=assertSessionOpeningAttempt(db,guild.id,key);
    const slots=result.slots.map(s=>({audience:s.scope.mode,character:s.scope.actorCharacterId,user:s.scope.actorUserId,
      status:s.status,narrative_status:s.narrative_status})),complete=slots.every(s=>['delivered','legacy_delivered'].includes(s.status));
    return save(db,guild.id,row,complete?'completed':'needs_delivery_review',{slots,hold_code:complete?null:'OPENING_DELIVERY_REVIEW'});
  }catch(error){
    // Hold only this job. Already committed fiction, native outcomes and transport acknowledgements remain immutable.
    const current=db.getCityRecord(guild.id,'session_opening_job',key);
    return current?save(db,guild.id,current,'needs_review',{hold_code:code(error)}):null;
  }
}
