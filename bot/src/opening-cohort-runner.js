/** One additive public opportunity after a verified zero-attendee camera and a genuinely owner-controlled cohort. */
import {assemblyInputFingerprint,certifyAssemblyPlan,assemblySourceError} from './assembly-context.js';
import {currentOpeningCohort,openingCohortHash,openingCohortNarrativeCandidate,
  inspectOpeningCohortSource,openingCohortEligible,openingCohortIsAdditive,independentOpeningCameraBasis} from './opening-cohort-state.js';
import {prepareOpeningCohortOutput} from './pvp-output.js';
import {queueTurnPublications} from './publication-outbox.js';
import {deliverQueuedTurn} from './publishing.js';
import {indexWorldEvent} from './frameworks/world/public.js';
import {measureStage,measureNative,operationalMetrics} from './frameworks/operations/public.js';
import {openingErrorCode} from './frameworks/operations/public.js';

const flights=new WeakMap();
function publicationStatus(rows){
  if(!rows.length)return 'needs_review';
  const acknowledged=row=>row.status==='delivered'&&typeof row.discord_message_id==='string'&&!!row.discord_message_id.trim()
    &&typeof row.channel_id==='string'&&!!row.channel_id.trim()&&typeof row.payload_hash==='string'&&!!row.payload_hash;
  if(rows.every(acknowledged))return 'delivered';
  if(rows.some(row=>['uncertain','delivering'].includes(row.status)))return 'uncertain';
  if(rows.some(row=>row.status==='failed'))return 'failed';
  return 'pending';
}
/** CAS every async callback against its exact job/source/turn snapshot; outbox receipts own transport truth. */
export function reconcileOpeningCohortStatus(db,guild,row,status=row?.status,data=row?.data){
  if(!row)return null;
  return db.transaction(()=>{
    const live=db.getCityRecord(guild,'opening_cohort_job',row.record_key);
    if(!live||live.status!==row.status||live.source_event!==row.source_event
      ||live.data.attempt_id!==row.data.attempt_id||live.data.roster_revision!==row.data.roster_revision
      ||live.data.input_fingerprint!==row.data.input_fingerprint||live.data.turn_id!==(row.data.turn_id||null))return live;
    if(live.data.turn_id&&data?.turn_id!==live.data.turn_id)return live;
    const next={...live.data,...data,turn_id:live.data.turn_id||data?.turn_id||null};let target=status;
    if(target==='held_paused'&&next.turn_id){next.operational_hold='OPENING_DIRECTOR_PAUSED';next.hold_code='OPENING_DIRECTOR_PAUSED';}
    if(next.turn_id){
      const receipts=db.listTurnPublications(guild,next.turn_id);target=publicationStatus(receipts);
      next.evidence={...(next.evidence||{}),transport_acknowledged:target==='delivered',needs_review:target!=='delivered'};
    }
    const updated=db.transitionCityRecord(guild,{kind:live.kind,key:live.record_key,expectedStatus:live.status,
      expectedAttemptId:live.data.attempt_id,expectedRosterRevision:live.data.roster_revision,
      expectedInputFingerprint:live.data.input_fingerprint,expectedTurnId:live.data.turn_id||null,
      expectedSourceEvent:live.source_event,status:target,data:next});
    return updated||db.getCityRecord(guild,'opening_cohort_job',row.record_key);
  });
}
function save(db,guild,row,status,data=row.data){return reconcileOpeningCohortStatus(db,guild,row,status,data);}
const code=openingErrorCode;
export function initialCameraAcknowledged(db,guild,session){
  const opening=db.getCityRecord(guild,'session_opening_job',session.id);
  const originalRoster=opening?.data?.epoch?.roster||opening?.data?.context?.roster||opening?.data?.origin?.roster;
  // A later cohort is only an additive opening when the immutable original
  // camera had fewer than two owners. One-to-two is eligible; two-to-three
  // must not create a second assembly scene for an already shared start.
  if(!['completed','needs_narrative_review'].includes(opening?.status)||!Array.isArray(originalRoster)||originalRoster.length>1)return null;
  const attempts=db.listCityRecords(guild,{kind:'session_opening_turn',includeGM:true,limit:1000})
    .filter(turn=>turn.data.job===session.id&&turn.source_event===opening.data.attempt_source
      &&turn.data.origin_hash===opening.data.origin_hash&&turn.data.turn===turn.record_key);
  for(const attempt of attempts){
    const source=db.getWorldEvent(guild,attempt.source_event);
    if(source?.status!=='active'||source.kind!=='native_session_opening_attempt'||source.session_id!==session.id
      ||source.visibility!=='gm'||source.details?.job!==session.id||source.details?.origin_hash!==opening.data.origin_hash)continue;
    const delivery=db.listCityRecords(guild,{kind:'assembly_delivery',includeGM:true,limit:1000})
      .find(row=>row.data.turn_id===attempt.record_key&&row.data.scope?.mode==='party'
        &&row.data.scope.actorCharacterId==null&&row.data.scope.actorUserId==null&&row.data.evidence?.narrative_verified===true);
    if(!delivery)continue;
    const rows=db.listTurnPublications(guild,attempt.record_key);
    if(rows.length&&rows.every(row=>row.status==='delivered'&&row.discord_message_id&&['public','party'].includes(row.visibility)))return opening;
  }
  return null;
}
function jobSource(db,guild,session,key,data){
  return indexWorldEvent(db,guild,{key:`opening-cohort-job:${key}:${data.attempt_id}`,kind:'native_opening_cohort_job',
    title:'Native additive cohort plan; no placement or party state',source_id:'native:opening-cohort',session_id:session.id,
    visibility:'gm',details:{version:2,job:key,attempt_id:data.attempt_id,payload_hash:openingCohortHash(data)}},'native:opening-cohort');
}
function current(db,guild,session,row){
  if(!session||session.id!==row.data.session)throw assemblySourceError('Original active cohort session required.');
  if(db.isDirectorPaused(guild))throw Object.assign(new Error('World Director is paused; cohort work remains held.'),
    {code:'OPENING_DIRECTOR_PAUSED',expected:true});
  const state=currentOpeningCohort(db,guild,session);
  if(state.roster_revision!==row.data.roster_revision||state.input_fingerprint!==row.data.input_fingerprint||state.scene!==row.data.scene)
    throw assemblySourceError('Cohort roster, sources or scene changed; review the additive opportunity.');
  if(row.data.camera_basis&&openingCohortHash(row.data.camera_basis)!==openingCohortHash(independentOpeningCameraBasis(db,guild,session)))
    throw assemblySourceError('Independent camera no-send basis changed.');
  return state;
}
function coverage(rows,pending,evidence){
  const acknowledged=publicationStatus(rows)==='delivered'&&!pending.length;
  return {...evidence,transport_acknowledged:acknowledged,native_narrative_accepted:evidence?.narrative_verified===true,
    dramatic_coverage:'unverified',hook_selected:false,hook_revealed:false,fallback_delivered:false,needs_review:!acknowledged};
}
async function publish({db,guild,gm,row}){
  row=save(db,guild.id,row,row.status,row.data);
  if(['delivered','uncertain','needs_review','needs_narrative_review','held_interrupted'].includes(row.status))return row;
  if(row.status==='failed'&&!(row.data.turn_id&&db.listTurnPublications(guild.id,row.data.turn_id).length
    &&db.listTurnPublications(guild.id,row.data.turn_id).every(part=>part.status==='delivered'&&part.discord_message_id
      &&part.channel_id&&part.payload_hash||part.status==='failed'&&part.last_failure?.startsWith('NOT_SENT: '))))return row;
  if(db.isDirectorPaused(guild.id))return save(db,guild.id,row,'held_paused',{...row.data,hold_code:'OPENING_DIRECTOR_PAUSED'});
  if(row.data.operational_hold)row=save(db,guild.id,row,row.status,{...row.data,operational_hold:null,hold_code:null});
  // Another worker may currently own planning or authoring. Leave its state
  // intact; stale revisions are handled by the explicit unsent refresh path.
  if(row.status==='planning'||row.status==='authoring')return row;
  if(row.status==='held_paused')row=save(db,guild.id,row,row.data.turn_id?'pending':row.data.plan?'prepared':'needs_review',
    {...row.data,hold_code:null});
  if(row.data.turn_id){
    if(['pending','failed'].includes(row.status)){
      try{
        const live=db.getActiveSession(guild.id);current(db,guild.id,live,row);
        const result=await measureStage(gm?.metrics||operationalMetrics,'opening_publish',
          ()=>deliverQueuedTurn({db,guild,turnId:row.data.turn_id,beforeSend:()=>{
            if(db.isDirectorPaused(guild.id))throw Object.assign(new Error('World Director paused before publication.'),{deliveryCertainty:'not_sent'});
            current(db,guild.id,db.getActiveSession(guild.id),row);
          }}),{guildId:guild.id});
        const parts=db.listTurnPublications(guild.id,row.data.turn_id),status=publicationStatus(parts);
        return save(db,guild.id,row,status,{...row.data,evidence:coverage(parts,result.pending,row.data.evidence),hold_code:null});
      }catch(error){return save(db,guild.id,row,db.isDirectorPaused(guild.id)?'held_paused':'needs_review',
        {...row.data,hold_code:db.isDirectorPaused(guild.id)?'OPENING_DIRECTOR_PAUSED':code(error)});}
    }
    return row;
  }
  if(row.status!=='prepared')return save(db,guild.id,row,'needs_review',{...row.data,hold_code:'OPENING_COHORT_STATE_REVIEW'});
  const session=db.getActiveSession(guild.id);current(db,guild.id,session,row);
  const claimed=db.transitionCityRecord(guild.id,{kind:'opening_cohort_job',key:row.record_key,
    expectedStatus:'prepared',expectedAttemptId:row.data.attempt_id,expectedRosterRevision:row.data.roster_revision,
    expectedInputFingerprint:row.data.input_fingerprint,expectedTurnId:null,expectedSourceEvent:row.source_event,status:'authoring',data:row.data});
  if(!claimed)return db.getCityRecord(guild.id,'opening_cohort_job',row.record_key);
  row=claimed;
  try{
    if(typeof gm?.authorOpeningCohort!=='function')throw Object.assign(new Error('Cohort writer unavailable.'),{code:'OPENING_COHORT_WRITER'});
    await gm.authorOpeningCohort(guild.id,row.record_key,{assertCurrent:()=>current(db,guild.id,db.getActiveSession(guild.id),row)});
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
    if(db.isDirectorPaused(guild.id))return save(db,guild.id,committed,'held_paused',
      {...committed.data,hold_code:'OPENING_DIRECTOR_PAUSED'});
    const delivery=await measureStage(gm?.metrics||operationalMetrics,'opening_publish',
      ()=>deliverQueuedTurn({db,guild,turnId:committed.data.turn_id,beforeSend:()=>{
        if(db.isDirectorPaused(guild.id))throw Object.assign(new Error('World Director paused before publication.'),{deliveryCertainty:'not_sent'});
        current(db,guild.id,db.getActiveSession(guild.id),committed);
      }}),{guildId:guild.id}),
      parts=db.listTurnPublications(guild.id,committed.data.turn_id);
    return save(db,guild.id,committed,publicationStatus(parts),
      {...committed.data,evidence:coverage(parts,delivery.pending,committed.data.evidence),hold_code:null});
  }catch(error){
    const live=db.getCityRecord(guild.id,'opening_cohort_job',row.record_key);
    if(!live)return null;
    if(live.data.turn_id){
      const parts=db.listTurnPublications(guild.id,live.data.turn_id),status=publicationStatus(parts);
      if(db.isDirectorPaused(guild.id))return save(db,guild.id,live,status,{...live.data,operational_hold:'OPENING_DIRECTOR_PAUSED',hold_code:'OPENING_DIRECTOR_PAUSED'});
      if(['uncertain','failed','pending','delivered'].includes(status))return save(db,guild.id,live,status,{...live.data,...(status==='delivered'?{}:{hold_code:code(error)})});
    }
    return save(db,guild.id,live,db.isDirectorPaused(guild.id)?'held_paused':'needs_review',
      {...live.data,hold_code:db.isDirectorPaused(guild.id)?'OPENING_DIRECTOR_PAUSED':code(error)});
  }
}
async function execute({db,guild,gm,session}){
  let old=db.getCityRecord(guild.id,'opening_cohort_job',session.id);
  if(old){old=save(db,guild.id,old,old.status,old.data);if(old.status==='delivered')return old;}
  if(db.isDirectorPaused(guild.id))return old?save(db,guild.id,old,'held_paused',{...old.data,hold_code:'OPENING_DIRECTOR_PAUSED'}):null;
  if(old){
    if(old.data.operational_hold)old=save(db,guild.id,old,old.status,{...old.data,operational_hold:null,hold_code:null});
    const state=currentOpeningCohort(db,guild.id,session),stale=state.scene!==old.data.scene
      ||state.roster_revision!==old.data.roster_revision||state.input_fingerprint!==old.data.input_fingerprint;
    const safeUnsentRefresh=stale||old.status==='held_paused'&&!old.data.plan&&!old.data.turn_id;
    if(safeUnsentRefresh&&!old.data.turn_id&&['planning','prepared','authoring','held_interrupted','needs_review','held_paused'].includes(old.status)){
      const archived=db.transaction(()=>{
        const live=db.getCityRecord(guild.id,'opening_cohort_job',session.id);
        if(live?.data.attempt_id!==old.data.attempt_id||live.data.turn_id)return null;
        db.saveCityRecord(guild.id,{kind:'opening_cohort_attempt',key:`${session.id}:${old.data.attempt_id||'legacy'}`,
          status:'superseded_unsent',visibility:'gm',source_event:old.source_event,data:{...old.data,previous_status:old.status}});
        return true;
      });
      if(!archived)return db.getCityRecord(guild.id,'opening_cohort_job',session.id);
    }else return publish({db,guild,gm,row:old});
  }
  if(session.assembly_phase!=='assembly'||session.assembly_mode==='manual')return null;
  if(db.isDirectorPaused(guild.id))return old?save(db,guild.id,old,'held_paused',{...old.data,hold_code:'OPENING_DIRECTOR_PAUSED'}):null;
  const initial=initialCameraAcknowledged(db,guild.id,session),camera_basis=!initial&&independentOpeningCameraBasis(db,guild.id,session);
  if(!initial&&!camera_basis)return null;
  const sourceStarted=performance.now(),state=currentOpeningCohort(db,guild.id,session);
  (gm?.metrics||operationalMetrics).record('opening_source',{guildId:guild.id,durationMs:performance.now()-sourceStarted});
  if(camera_basis?!state.roster.some(r=>r.valid):!openingCohortEligible(state.roster)||!openingCohortIsAdditive(state.roster,initial.data.origin))return null;
  const data={version:1,session:session.id,scene:state.scene,roster_revision:state.roster_revision,
    input_fingerprint:state.input_fingerprint,attempts:(old?.data.attempts||0)+1,turn_id:null,
    attempt_id:openingCohortHash([session.id,state.scene,state.roster_revision,state.input_fingerprint,(old?.data.attempts||0)+1]),
    ...(camera_basis?{camera_basis}:{})};
  const claim=db.transaction(()=>{
    if(camera_basis&&openingCohortHash(camera_basis)!==openingCohortHash(independentOpeningCameraBasis(db,guild.id,session)))return {claimed:false,row:old};
    const currentJob=db.getCityRecord(guild.id,'opening_cohort_job',session.id);
    if(currentJob&&currentJob.data.attempt_id!==old?.data.attempt_id)return {claimed:false,row:currentJob};
    if(currentJob?.data.turn_id)return {claimed:false,row:currentJob};
    const source=jobSource(db,guild.id,session,session.id,data),row=db.saveCityRecord(guild.id,{kind:'opening_cohort_job',key:session.id,
      status:'planning',visibility:'gm',source_event:source.event_key,data:{...data,source_event:source.event_key}});
    return {claimed:true,row};
  });
  if(!claim.claimed)return claim.row;
  const row=claim.row;
  try{
    if(typeof gm?.planAssembly!=='function')throw Object.assign(new Error('Assembly planner unavailable.'),{code:'OPENING_COHORT_PLANNER'});
    const generated=await measureStage(gm.metrics||operationalMetrics,'opening_plan',
      ()=>gm.planAssembly({guildId:guild.id,mode:session.assembly_mode,openingKind:'assembly'}),{guildId:guild.id});
    const live=db.getActiveSession(guild.id);current(db,guild.id,live,row);
    const plan=certifyAssemblyPlan(db,guild.id,live,generated,{strict:true,fingerprint:data.input_fingerprint}),
      prepared=db.transitionCityRecord(guild.id,{kind:'opening_cohort_job',key:row.record_key,
        expectedStatus:'planning',expectedAttemptId:row.data.attempt_id,expectedRosterRevision:row.data.roster_revision,
        expectedInputFingerprint:row.data.input_fingerprint,expectedTurnId:null,expectedSourceEvent:row.source_event,
        status:'prepared',data:{...row.data,plan,
          plan_hash:openingCohortHash(plan)}});
    if(!prepared)return db.getCityRecord(guild.id,'opening_cohort_job',row.record_key);
    return publish({db,guild,gm,row:prepared});
  }catch(error){
    return save(db,guild.id,row,db.isDirectorPaused(guild.id)?'held_paused':'needs_review',
      {...row.data,hold_code:db.isDirectorPaused(guild.id)?'OPENING_DIRECTOR_PAUSED':code(error)});
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
  const state=row.status==='delivered'?'Shared opportunity transport acknowledged; dramatic fulfillment remains unverified':row.status==='uncertain'&&row.data.operational_hold?'World Director paused; shared opportunity delivery remains uncertain and held for review':row.status==='uncertain'?'Shared opportunity delivery uncertain; held for review'
    :row.status==='failed'?'Shared opportunity delivery failed; held for review':row.status==='held_paused'?'World Director paused; shared opportunity retained for safe resumption':row.status==='needs_review'||row.status==='held_interrupted'
      ?'Shared opportunity needs native review':'Shared opportunity processing';
  const paused=row.data.operational_hold&&row.status!=='uncertain'?' World Director paused; committed unsent work is held without changing its outbox-derived status.':'';
  return `${state}.${paused} Check-in does not establish arrival, location, cooperation, party state or a PC response.`;
}
