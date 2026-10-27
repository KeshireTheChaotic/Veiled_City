/** Additive post-start opening identity. It is deliberately separate from the immutable start job and plan. */
import {createHash} from 'node:crypto';
import {assemblyInputFingerprint,assemblySourceError} from './assembly-context.js';
import {currentScene,sessionWorldEvents} from './frameworks/session/public.js';
function indexWorldEvent(...args){return sessionWorldEvents.indexWorldEvent(...args);}
import {inspectSessionOpening} from './session-opening.js';

export const openingCohortHash=value=>createHash('sha256').update(JSON.stringify(value??null)).digest('hex');
export function independentOpeningCameraBasis(db,guild,session){
  if(!db.getCityRecord(guild,'session_opening_job',session.id))return null;
  const job=inspectSessionOpening(db,guild,session.id);
  if(['queued','planning','publishing','prepared_refresh','prepared_rebase','held_paused'].includes(job.status)
    ||!db.openingCameraState(guild,session.id).independent_safe)return null;
  return {version:1,kind:'independent_absent_original',origin_hash:job.data.origin_hash,source:job.source_event};
}
export function openingCohortRoster(db,guild,session){
  return db.roster(session.id).filter(r=>r.character_id&&['present','late','guest'].includes(r.presence))
    .map(r=>{const pc=db.getCharacter(r.character_id),a=db.activeAssignment(session.id,r.discord_user_id);
      return {character:r.character_id,user:r.discord_user_id,presence:r.presence,owner:pc?.owner_user_id||null,
        control_revision:a?.control_revision||null,control_policy:a?.control_policy||null,proxy:a?.proxy_user_id||null,
        valid:pc?.guild_id===guild&&['active','reserve','guest'].includes(pc.status)&&pc.owner_user_id===r.discord_user_id&&a?.character_id===pc.id
          &&a.control_policy==='player_only'&&!a.proxy_user_id};})
    .sort((a,b)=>a.character.localeCompare(b.character));
}
export function openingCohortRosterRevision(db,guild,session){
  return openingCohortHash(openingCohortRoster(db,guild,session));
}
export function openingCohortEligible(roster){
  const owners=roster.filter(row=>row.valid).map(row=>row.user);
  return owners.length>=2&&new Set(owners).size>=2;
}
export function openingCohortIsAdditive(roster,openingOrigin){
  const initial=new Set((openingOrigin?.roster||[]).map(row=>`${row.user}:${row.character}`));
  return roster.some(row=>row.valid&&!initial.has(`${row.user}:${row.character}`));
}
export function currentOpeningCohort(db,guild,session){
  return {roster:openingCohortRoster(db,guild,session),roster_revision:openingCohortRosterRevision(db,guild,session),
    input_fingerprint:assemblyInputFingerprint(db,guild,session),scene:currentScene(db,guild).key};
}
export function inspectOpeningCohortSource(db,guild,source){
  const d=source?.details,job=d?.job&&db.getCityRecord(guild,'opening_cohort_job',d.job),session=job&&db.getActiveSession(guild),saved=job?.data;
  const nativeJob=job&&db.getWorldEvent(guild,job.source_event),jobBinding=saved&&{version:saved.version,session:saved.session,scene:saved.scene,
    roster_revision:saved.roster_revision,input_fingerprint:saved.input_fingerprint,attempts:saved.attempts,turn_id:null,
    ...(saved.attempt_id?{attempt_id:saved.attempt_id}:{}),
    ...(saved.camera_basis?{camera_basis:saved.camera_basis}:{})},legacy=!saved?.attempt_id;
  if(!source||source.status!=='active'||source.kind!=='native_opening_cohort_scope'||source.source_id!=='native:opening-cohort'
    ||source.visibility!=='party'||source.subject_key!==null||!job||job.visibility!=='gm'||job.subject_key!==null
    ||source.event_key!==`opening-cohort-scope:${openingCohortHash(legacy?[d.job,d.scope]:[d.job,d.attempt_id,d.scope])}`
    ||nativeJob?.status!=='active'||nativeJob.kind!=='native_opening_cohort_job'||nativeJob.source_id!=='native:opening-cohort'
    ||nativeJob.visibility!=='gm'||nativeJob.session_id!==saved.session||nativeJob.details.job!==saved.session
    ||nativeJob.details.version!==(legacy?1:2)||!legacy&&nativeJob.details.attempt_id!==saved.attempt_id
    ||nativeJob.details.payload_hash!==openingCohortHash(jobBinding)||job.source_event!==saved.source_event
    ||!['authoring','prepared','pending'].includes(job.status)||saved.version!==1||saved.session!==session?.id||source.session_id!==session.id
    ||source.scene!==saved.scene||saved.scene!==currentScene(db,guild).key||d.version!==1||d.audience!=='party'
    ||openingCohortHash(d.scope)!==openingCohortHash({mode:'party',actorUserId:null,actorCharacterId:null})
    ||saved.plan_hash!==openingCohortHash(saved.plan)||d.plan_hash!==saved.plan_hash||d.roster_revision!==saved.roster_revision
    ||d.input_fingerprint!==saved.input_fingerprint||!legacy&&d.attempt_id!==saved.attempt_id
    ||d.revision!==openingCohortHash([saved.session,saved.scene,saved.plan_hash,saved.roster_revision,saved.input_fingerprint,d.scope])
    ||saved.plan?.assembly_contract?.version!==2||saved.plan.assembly_contract.input_fingerprint!==saved.input_fingerprint
    ||saved.roster_revision!==openingCohortRosterRevision(db,guild,session)
    ||saved.input_fingerprint!==assemblyInputFingerprint(db,guild,session)
    ||saved.camera_basis&&openingCohortHash(saved.camera_basis)!==openingCohortHash(independentOpeningCameraBasis(db,guild,session)))
    throw assemblySourceError('Current additive opening cohort source and roster required.');
  return {job,session,plan:saved.plan,scope:d.scope,revision:d.revision};
}
export function openingCohortNarrativeCandidate(db,guild,key){
  const job=db.getCityRecord(guild,'opening_cohort_job',key),session=db.getActiveSession(guild),d=job?.data;
  if(!job||job.status!=='authoring'||job.visibility!=='gm'||d?.version!==1||session?.id!==d.session
    ||d.scene!==currentScene(db,guild).key||d.roster_revision!==openingCohortRosterRevision(db,guild,session)
    ||d.input_fingerprint!==assemblyInputFingerprint(db,guild,session)||d.plan_hash!==openingCohortHash(d.plan))
    throw assemblySourceError('Current additive opening cohort plan required.');
  const scope={mode:'party',actorUserId:null,actorCharacterId:null},details={version:1,job:key,...(d.attempt_id?{attempt_id:d.attempt_id}:{}),plan_hash:d.plan_hash,
    roster_revision:d.roster_revision,input_fingerprint:d.input_fingerprint,audience:'party',scope},
    revision=openingCohortHash([d.session,d.scene,d.plan_hash,d.roster_revision,d.input_fingerprint,scope]),
    source=indexWorldEvent(db,guild,{key:`opening-cohort-scope:${openingCohortHash(d.attempt_id?[key,d.attempt_id,scope]:[key,scope])}`,kind:'native_opening_cohort_scope',
      title:'Native additive opening cohort narrative scope',source_id:'native:opening-cohort',session_id:d.session,scene:d.scene,
      visibility:'party',details:{...details,revision}},'native:opening-cohort');
  inspectOpeningCohortSource(db,guild,source);
  return {job,session,plan:d.plan,scope,source,revision,candidate:{narration:'',player_summary:'',private_messages:[],narrative_claims:[],
    gm_world_parts:[{version:8,kind:'narrative_request',operation:'describe_scene',source_refs:[]}]}};
}
