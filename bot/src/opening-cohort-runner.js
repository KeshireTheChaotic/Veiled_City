/** One additive public opportunity after a verified zero-attendee camera and a genuinely owner-controlled cohort. */
import {assemblyDeliverySummary} from './assembly-state.js';
import {assemblyInputFingerprint,certifyAssemblyPlan,assemblySourceError} from './assembly-context.js';
import {currentOpeningCohort,openingCohortHash,openingCohortNarrativeCandidate,
  inspectOpeningCohortSource,openingCohortEligible,openingCohortIsAdditive} from './opening-cohort-state.js';
import {prepareOpeningCohortOutput} from './pvp-output.js';
import {queueTurnPublications} from './publication-outbox.js';
import {deliverQueuedTurn} from './publishing.js';
import {indexWorldEvent} from './city-calendar.js';
import {measureStage,measureNative,operationalMetrics} from './operational-metrics.js';

const flights=new WeakMap();
function save(db,guild,row,status,data=row.data){return db.saveCityRecord(guild,{...row,key:row.record_key,status,data});}
function code(error){return /^[A-Z_]{2,60}$/.test(error?.code||'')?error.code:'OPENING_COHORT_REVIEW';}
function initialCameraAcknowledged(db,guild,session){
  const opening=db.getCityRecord(guild,'session_opening_job',session.id);
  if(opening?.status!=='completed')return null;
  const slot=assemblyDeliverySummary(db,guild,session).find(row=>row.scope.mode==='party');
  return slot&&slot.status==='delivered'&&slot.evidence.narrative_verified===true
    &&slot.rows.length>0&&slot.rows.every(row=>row.status==='delivered'&&row.discord_message_id)?opening:null;
}
function jobSource(db,guild,session,key,data){
  return indexWorldEvent(db,guild,{key:`opening-cohort-job:${key}`,kind:'native_opening_cohort_job',
    title:'Native additive cohort plan; no placement or party state',source_id:'native:opening-cohort',session_id:session.id,
    visibility:'gm',details:{version:1,job:key,payload_hash:openingCohortHash(data)}},'native:opening-cohort');
}
function current(db,guild,session,row){
  if(!session||session.id!==row.data.session)throw assemblySourceError('Original active cohort session required.');
  const state=currentOpeningCohort(db,guild,session);
  if(state.roster_revision!==row.data.roster_revision||state.input_fingerprint!==row.data.input_fingerprint||state.scene!==row.data.scene)
    throw assemblySourceError('Cohort roster, sources or scene changed; review the additive opportunity.');
  return state;
}
function publicationStatus(rows,pending){
  if(rows.some(row=>['uncertain','delivering'].includes(row.status)))return 'uncertain';
  if(rows.some(row=>row.status==='failed'))return 'failed';
  if(!rows.length||pending.length||!rows.every(row=>row.status==='delivered'&&row.discord_message_id))return 'pending';
  return 'delivered';
}
async function publish({db,guild,gm,row}){
  if(['delivered','uncertain','failed','needs_review','needs_narrative_review','held_interrupted'].includes(row.status))return row;
  if(row.status==='planning'||row.status==='authoring')return save(db,guild.id,row,'held_interrupted',
    {...row.data,hold_code:'OPENING_COHORT_INTERRUPTED_REVIEW'});
  if(row.data.turn_id){
    if(row.status==='pending'){
      try{
        const live=db.getActiveSession(guild.id);current(db,guild.id,live,row);
        const result=await measureStage(gm?.metrics||operationalMetrics,'opening_publish',
          ()=>deliverQueuedTurn({db,guild,turnId:row.data.turn_id}),{guildId:guild.id});
        const parts=db.listTurnPublications(guild.id,row.data.turn_id);
        return save(db,guild.id,row,publicationStatus(parts,result.pending),row.data);
      }catch(error){return save(db,guild.id,row,'needs_review',{...row.data,hold_code:code(error)});}
    }
    return row;
  }
  if(row.status!=='prepared')return save(db,guild.id,row,'needs_review',{...row.data,hold_code:'OPENING_COHORT_STATE_REVIEW'});
  const session=db.getActiveSession(guild.id);current(db,guild.id,session,row);
  row=save(db,guild.id,row,'authoring',row.data);
  try{
    if(typeof gm?.authorOpeningCohort!=='function')throw Object.assign(new Error('Cohort writer unavailable.'),{code:'OPENING_COHORT_WRITER'});
    await gm.authorOpeningCohort(guild.id,row.record_key);
    const {source}=openingCohortNarrativeCandidate(db,guild.id,row.record_key),cohort=inspectOpeningCohortSource(db,guild.id,source);
    current(db,guild.id,cohort.session,row);
    const committed=measureNative('opening_commit',guild.id,()=>db.transaction(()=>{
      const live=db.getActiveSession(guild.id);current(db,guild.id,live,row);
      const result=prepareOpeningCohortOutput(db,guild.id,row.record_key,{mode:'party',actorUserId:null,actorCharacterId:null});
      if(!result)throw Object.assign(new Error('No accepted audience-first cohort scene; retain a native review state.'),
        {code:'OPENING_COHORT_NARRATIVE_REQUIRED',expected:true});
      const turn=db.beginTurnAttempt({guildId:guild.id,sessionId:row.data.session,messageId:`opening-cohort:${row.record_key}`,
        actorPrincipal:'__opening_cohort__',audience:'party'});
      queueTurnPublications(db,{guild,session:live,result,scope:{mode:'party',actorUserId:null,actorCharacterId:null},turnId:turn.turn_id});
      db.updateTurnAttempt(turn.turn_id,{stage:'committed',committed:'yes',nativeCommitId:row.record_key});
      return save(db,guild.id,row,'pending',{...row.data,turn_id:turn.turn_id,evidence:result.cohort_evidence,raw_prose_held:true});
    }));
    const delivery=await measureStage(gm?.metrics||operationalMetrics,'opening_publish',
      ()=>deliverQueuedTurn({db,guild,turnId:committed.data.turn_id}),{guildId:guild.id}),
      parts=db.listTurnPublications(guild.id,committed.data.turn_id);
    return save(db,guild.id,committed,publicationStatus(parts,delivery.pending),committed.data);
  }catch(error){
    const live=db.getCityRecord(guild.id,'opening_cohort_job',row.record_key);
    if(!live)return null;
    if(live.data.turn_id){
      const parts=db.listTurnPublications(guild.id,live.data.turn_id),status=publicationStatus(parts,[]);
      if(['uncertain','failed','pending','delivered'].includes(status))return save(db,guild.id,live,status,{...live.data,...(status==='delivered'?{}:{hold_code:code(error)})});
    }
    return save(db,guild.id,live,'needs_review',{...live.data,hold_code:code(error)});
  }
}
async function execute({db,guild,gm,session}){
  const old=db.getCityRecord(guild.id,'opening_cohort_job',session.id);
  if(old)return publish({db,guild,gm,row:old});
  if(session.assembly_phase!=='assembly'||session.assembly_mode==='manual')return null;
  const initial=initialCameraAcknowledged(db,guild.id,session);if(!initial)return null;
  const sourceStarted=performance.now(),state=currentOpeningCohort(db,guild.id,session);
  (gm?.metrics||operationalMetrics).record('opening_source',{guildId:guild.id,durationMs:performance.now()-sourceStarted});
  if(!openingCohortEligible(state.roster)||!openingCohortIsAdditive(state.roster,initial.data.origin))return null;
  const data={version:1,session:session.id,scene:state.scene,roster_revision:state.roster_revision,
    input_fingerprint:state.input_fingerprint,attempts:1,turn_id:null};
  const source=jobSource(db,guild.id,session,session.id,data),row=db.saveCityRecord(guild.id,{kind:'opening_cohort_job',key:session.id,
    status:'planning',visibility:'gm',source_event:source.event_key,data:{...data,source_event:source.event_key}});
  try{
    if(typeof gm?.planAssembly!=='function')throw Object.assign(new Error('Assembly planner unavailable.'),{code:'OPENING_COHORT_PLANNER'});
    const generated=await measureStage(gm.metrics||operationalMetrics,'opening_plan',
      ()=>gm.planAssembly({guildId:guild.id,mode:session.assembly_mode,openingKind:'assembly'}),{guildId:guild.id});
    const live=db.getActiveSession(guild.id);current(db,guild.id,live,row);
    const plan=certifyAssemblyPlan(db,guild.id,live,generated,{strict:true,fingerprint:data.input_fingerprint}),
      prepared=db.saveCityRecord(guild.id,{...row,key:row.record_key,status:'prepared',data:{...row.data,plan,
        plan_hash:openingCohortHash(plan)}});
    return publish({db,guild,gm,row:prepared});
  }catch(error){
    return save(db,guild.id,row,'needs_review',{...row.data,hold_code:code(error)});
  }
}
export function runOpeningCohort({db,guild,gm}){
  const session=db.getActiveSession(guild.id);if(!session)return Promise.resolve(null);
  if(!flights.has(db))flights.set(db,new Map());const active=flights.get(db),key=`${guild.id}:${session.id}`;
  if(active.has(key))return active.get(key);
  const work=Promise.resolve().then(()=>execute({db,guild,gm,session}));active.set(key,work);
  work.finally(()=>{if(active.get(key)===work)active.delete(key);}).catch(()=>{});return work;
}
export function openingCohortStatus(row){
  if(!row)return null;
  const state=row.status==='delivered'?'Shared opportunity acknowledged':row.status==='uncertain'?'Shared opportunity delivery uncertain; held for review'
    :row.status==='failed'?'Shared opportunity delivery failed; held for review':row.status==='needs_review'||row.status==='held_interrupted'
      ?'Shared opportunity needs native review':'Shared opportunity processing';
  return `${state}. Check-in does not establish arrival, location, cooperation, party state or a PC response.`;
}
