/** Closed native lifecycle projections. Model summaries are retained privately, never used as proof. */
import {createHash} from 'node:crypto';
import {activeEvidence} from './epistemic.js';
export const lifecycleHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=()=>{throw Object.assign(new Error('Current native lifecycle publication required.'),{code:'NARRATIVE_PVP'});};
export function lifecycleProjection(db,guild,key,scope){
  const row=db.getCityRecord(guild,'lifecycle_publication',key),d=row?.data;
  if(!d||row.status!=='verified'||d.version!==1||d.scope.mode!==scope.mode
    ||d.scope.actorUserId!==scope.actorUserId||d.scope.actorCharacterId!==scope.actorCharacterId)fail();
  const source=db.getWorldEvent(guild,row.source_event);
  const receipt=source&&db.getMutation(guild,source.source_id);
  if(!source||source.source_kind!=='mutation'||receipt?.actor_type!=='system'||receipt.actor_id!=='native:lifecycle-publication'
    ||receipt.mutation_type!=='lifecycle_publication'||receipt.entity_key!==key||receipt.after_json!==JSON.stringify(d)||!activeEvidence(db,guild,row.source_event)
    ||source.details?.digest!==lifecycleHash(d))fail();
  if(d.kind==='aftermath'){
    const encounter=db.getEncounter(d.id),saved=db.getEncounterAftermath(d.id);
    if(encounter?.guild_id!==guild||saved?.status!=='applied'||lifecycleHash(saved)!==d.snapshot)fail();
    if(scope.mode!=='party')fail();
    return {text:`Encounter ${encounter.encounter_number} aftermath has been applied. Native encounter outcomes remain recorded; no additional character action or disclosure is implied.`,title:`Encounter ${encounter.encounter_number} Aftermath`};
  }
  const cycle=db.getDowntimeCycle(d.id);
  if(cycle?.guild_id!==guild||cycle.status!=='resolved'||cycle.source_session_id!==d.source_session)fail();
  if(d.job_source){
    const job=db.getCityRecord(guild,'downtime_authoring_job',`downtime:${cycle.id}`),origin=db.getWorldEvent(guild,d.job_source);
    if(job?.status!=='committed'||job.source_event!==d.job_source||origin?.status!=='active'
      ||origin.kind!=='native_downtime_authoring'||origin.source_id!=='native:downtime'||origin.details.cycle!==cycle.id)fail();
  }
  if(d.kind==='downtime_project'){
    const p=db.getDowntimeProject(guild,d.project);
    if(!p||p.cycle_id!==cycle.id||lifecycleHash(p)!==d.snapshot)fail();
    if(scope.mode==='party'){if(p.visibility!=='party')fail();}
    else if(scope.mode==='private'){
      if(!['character','player'].includes(p.visibility)||p.discord_user_id!==scope.actorUserId
        ||p.character_id!==scope.actorCharacterId||db.getCharacter(p.character_id)?.owner_user_id!==scope.actorUserId)fail();
    }else fail();
    return {title:`Downtime: ${p.title}`,text:`Downtime project ${JSON.stringify(p.title)}: ${p.progress}/${p.max_progress} steps; native status: ${p.status}. Fictional details not independently certified remain GM-private.`};
  }
  if(d.kind!=='downtime_world'||scope.mode!=='party'||lifecycleHash(cycle)!==d.snapshot)fail();
  return {title:`World Movement — ${cycle.label}`,text:`The downtime cycle ${JSON.stringify(cycle.label)} has resolved. Committed world changes remain recorded; unverified Director narration is held for source review.`};
}
