/** Authenticated exact-state recovery of prepared, demonstrably unsent openings. Never calls a provider or resets uncertainty. */
import {randomUUID} from 'node:crypto';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {assemblyDeliverySummary,assemblyPlanHash} from './assembly-state.js';
import {assertSessionOpeningAttempt,inspectSessionOpening} from './session-opening.js';
import {sessionOpeningFlight,deliverSessionOpening} from './session-opening-runner.js';
import {indexWorldEvent} from './city-calendar.js';
function fail(){throw Object.assign(new Error('Original authenticated GM and exact current prepared opening review required.'),{code:'SESSION_OPENING',expected:true});}
function operator(db,i,authorize){
  if(typeof authorize!=='function'||authorize(db,i)!==true||!i?.id||!i.guildId||!i.user?.id)fail();
}
function snapshot(db,guild,key){
  const job=assertSessionOpeningAttempt(db,guild,key),session=db.getActiveSession(guild),slots=assemblyDeliverySummary(db,guild,session);
  if(!['needs_delivery_review','held_interrupted'].includes(job.status)||slots.some(s=>!s.job?.data.turn_id))return null;
  const usable=slots.some(s=>{
    const first=s.rows.find(r=>r.status!=='delivered');
    return first&&(first.status==='pending'||first.status==='failed'&&first.last_failure.startsWith('NOT_SENT: '));
  });
  if(!usable)return null;
  return {job:key,context:hash(job.data.context),status:job.status,plan:assemblyPlanHash(db.getAssemblyPlan(key)),
    slots:slots.map(s=>({scope:s.scope,turn:s.job.data.turn_id,rows:s.rows.map(r=>[r.id,r.status,r.payload_hash,r.attempt_count,r.discord_message_id,r.last_failure])}))};
}
export function prepareSessionOpeningDeliveryReview(db,interaction,authorize){
  operator(db,interaction,authorize);const guild=interaction.guildId,session=db.getActiveSession(guild);if(!session)return null;
  let state;try{state=snapshot(db,guild,session.id);}catch(error){if(error.code==='SESSION_OPENING')return null;throw error;}
  if(!state)return null;
  const key=randomUUID(),data={version:1,job:session.id,user:interaction.user.id,interaction:interaction.id,snapshot:hash(state)},
    source=indexWorldEvent(db,guild,{key:`opening-delivery-review:${key}`,kind:'native_opening_delivery_review',title:'Authenticated prepared opening review',
      source_kind:'event',source_id:inspectSessionOpening(db,guild,session.id).data.attempt_source,session_id:session.id,visibility:'gm',details:data},'native:opening-director');
  db.saveCityRecord(guild,{kind:'session_opening_review',key,status:'pending',visibility:'gm',source_event:source.event_key,data});return key;
}
export async function recoverSessionOpeningDelivery({db,interaction,authorize,key}){
  operator(db,interaction,authorize);const guild=interaction.guildId,review=db.getCityRecord(guild,'session_opening_review',key),data=review?.data,
    source=review&&db.getWorldEvent(guild,review.source_event);
  if(!data||data.version!==1||review.visibility!=='gm'||review.subject_key!==null||data.user!==interaction.user.id
    ||source?.status!=='active'||source.kind!=='native_opening_delivery_review'||source.visibility!=='gm'||source.subject_key!==null
    ||source.session_id!==data.job||source.source_kind!=='event'||hash(source.details)!==hash(data))fail();
  const native=inspectSessionOpening(db,guild,data.job);
  if(source.source_id!==native.data.attempt_source)fail();
  if(review.status==='reconciled')return native;
  if(review.status!=='pending')fail();
  return sessionOpeningFlight(db,guild,data.job,async()=>{
    if(hash(snapshot(db,guild,data.job))!==data.snapshot)fail();
    db.saveCityRecord(guild,{...review,key,status:'executing'});
    try{
      const result=await deliverSessionOpening({db,guild:interaction.guild,key:data.job});
      db.saveCityRecord(guild,{...review,key,status:'reconciled'});
      db.audit(guild,data.job,'human_gm',interaction.user.id,'opening_delivery_recovery',{review:key,interaction:interaction.id,status:result.status,provider_calls:0});
      return result;
    }catch(error){
      db.saveCityRecord(guild,{...review,key,status:'needs_review'});throw error;
    }
  });
}
