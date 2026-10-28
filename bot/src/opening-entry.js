/** Native entry delivery uses the existing certified output and outbox; it never calls a planner or publishes shared prose. */
import {sessionOpeningAttendanceSource} from './frameworks/session/public.js';
function inspectOpeningEntryOpportunity(...args){return sessionOpeningAttendanceSource.inspectOpeningEntryOpportunity(...args);}
import {sessionOpeningEntrySource} from './frameworks/session/public.js';
function openingEntryProjection(...args){return sessionOpeningEntrySource.openingEntryProjection(...args);}function openingEntryNarrativeCandidate(...args){return sessionOpeningEntrySource.openingEntryNarrativeCandidate(...args);}
import {prepareOpeningEntryOutput} from './pvp-output.js';
import {queueTurnPublications} from './publication-outbox.js';
import {deliverQueuedTurn} from './publishing.js';
import {sessionOpeningSource} from './frameworks/session/public.js';
function inspectSessionOpening(...args){return sessionOpeningSource.inspectSessionOpening(...args);}
import {jsonHash as hash} from './kernel/json-hash.js';
import {openingEntryDeliveryStatus,openingEntryAuthoringCode} from './frameworks/session/public.js';
import {openingErrorCode} from './frameworks/operations/public.js';
function save(db,guild,key,row,status,data){
  return db.transaction(()=>{
    const live=db.getCityRecord(guild,'opening_entry_delivery',key);
    if(live?.data.turn_id&&live.data.turn_id!==data.turn_id)return live;
    if(data.turn_id){const parts=db.listTurnPublications(guild,data.turn_id);if(parts.length)status=openingEntryDeliveryStatus(data.evidence,parts);}
    return db.saveCityRecord(guild,{kind:'opening_entry_delivery',key,status,visibility:'gm',actor_key:row.data.character,
      source_event:row.source_event,data});
  });
}
function acknowledged(db,guild,record){
  if(!record?.data.turn_id)return false;
  const rows=db.listTurnPublications(guild,record.data.turn_id);return rows.length>0&&rows.every(p=>p.status==='delivered');
}
/** Historical unresolved parts can only hold new output, never authorize its payload or audience. */
function unresolvedPrior(db,guild,opportunity){
  const d=opportunity.data,initial=db.getCityRecord(guild,'session_opening_job',d.session);
  if(initial&&['queued','planning','publishing','held_paused','held_interrupted','needs_narrative_review'].includes(initial.status)){
    inspectSessionOpening(db,guild,d.session);
    if(['queued','planning','publishing'].includes(initial.status))return {job:initial.record_key,code:'OPENING_INITIAL_WORK_ACTIVE'};
    if(initial.data.origin.roster.some(r=>r.character===d.character&&r.user===d.user))
      return {job:initial.record_key,code:'OPENING_INITIAL_SLOT_PENDING'};
  }
  const entries=db.listCityRecords(guild,{kind:'opening_entry_delivery',actor:d.character,includeGM:true,limit:101}),
    assemblies=db.listCityRecords(guild,{kind:'assembly_delivery',includeGM:true,limit:1001});
  if(entries.length>100||assemblies.length>1000)
    throw Object.assign(new Error('Opening acknowledgement history needs scoped review.'),{code:'OPENING_ENTRY_HISTORY'});
  const candidates=[...entries.filter(r=>r.record_key!==opportunity.record_key&&r.data.session===d.session&&r.data.user===d.user),
    ...assemblies.filter(r=>r.data.session===d.session&&r.data.scope?.mode==='private'
      &&r.data.scope.actorUserId===d.user&&r.data.scope.actorCharacterId===d.character)];
  for(const row of candidates){
    if(!row.data.turn_id)continue;
    const parts=db.listTurnPublications(guild,row.data.turn_id);
    if(parts.some(p=>p.status!=='delivered'))return {turn:row.data.turn_id,code:'OPENING_PRIOR_DELIVERY_REVIEW'};
  }
  return null;
}
function priorAssembly(db,guild,opportunity,view){
  const d=opportunity.data,initial=db.getCityRecord(guild,'session_opening_job',d.session);
  // Delivery ancestry is not renewed conversational control or consent. Current owner/source are checked by projection.
  if(!initial)return null;
  inspectSessionOpening(db,guild,d.session);
  const jobs=db.listCityRecords(guild,{kind:'assembly_delivery',includeGM:true,limit:1001});
  if(jobs.length>1000)throw Object.assign(new Error('Opening acknowledgement history needs scoped review.'),{code:'OPENING_ENTRY_HISTORY'});
  return jobs.find(r=>r.data.session===d.session&&r.data.scope?.mode==='private'&&r.data.scope.actorUserId===d.user
    &&r.data.scope.actorCharacterId===d.character&&(r.data.evidence?.hook_source_refs||[]).every(ref=>view.source_refs.includes(ref))
    &&db.getCityRecord(guild,'session_opening_turn',r.data.turn_id)?.data.origin_hash===initial.data.origin_hash
    &&acknowledged(db,guild,r));
}
export async function deliverOpeningEntry({db,guild,key,gm=null}){
  const opportunity=inspectOpeningEntryOpportunity(db,guild.id,key),d=opportunity.data,
    scope={mode:'private',actorUserId:d.user,actorCharacterId:d.character},view=openingEntryProjection(db,guild.id,key,scope),
    prior=db.getCityRecord(guild.id,'opening_entry_delivery',key);
  let job=prior;
  const assertCurrent=()=>{
    if(db.isDirectorPaused(guild.id))throw Object.assign(new Error('Director paused.'),{code:'OPENING_DIRECTOR_PAUSED',expected:true,deliveryCertainty:'not_sent'});
    if(openingEntryProjection(db,guild.id,key,scope).revision!==view.revision)
      throw Object.assign(new Error('Entry source changed during authoring.'),{code:'OPENING_ENTRY_STALE',expected:true,deliveryCertainty:'not_sent'});
  };
  try{
    assertCurrent();
    const unresolved=unresolvedPrior(db,guild.id,opportunity);
    if(unresolved)return save(db,guild.id,key,opportunity,'needs_review',{
      ...(prior?.data||{version:1,session:d.session,user:d.user,character:d.character,revision:view.revision,material_revision:view.material_revision}),
      ...(unresolved.turn?{held_turn_id:unresolved.turn}:{held_job_id:unresolved.job}),hold_code:unresolved.code});
    if(prior){
      if(prior.source_event!==opportunity.source_event||prior.visibility!=='gm'||prior.data.revision!==view.revision)
        return save(db,guild.id,key,opportunity,'needs_review',{...prior.data,hold_code:'OPENING_ENTRY_STALE'});
      if(prior.status==='retained_acknowledgement'||acknowledged(db,guild.id,prior))return prior;
    }
    if(!prior?.data.turn_id){
      const previous=db.listCityRecords(guild.id,{kind:'opening_entry_delivery',actor:d.character,includeGM:true,limit:101});
      if(previous.length>100)return save(db,guild.id,key,opportunity,'needs_review',{version:1,session:d.session,user:d.user,character:d.character,
        revision:view.revision,hold_code:'OPENING_ENTRY_HISTORY_REVIEW'});
      const retained=previous.find(r=>r.data.session===d.session&&r.data.user===d.user&&r.data.material_revision===view.material_revision&&acknowledged(db,guild.id,r))
        ||priorAssembly(db,guild.id,opportunity,view);
      if(retained)return save(db,guild.id,key,opportunity,'retained_acknowledgement',{version:1,session:d.session,user:d.user,character:d.character,
        revision:view.revision,material_revision:view.material_revision,turn_id:retained.data.turn_id,evidence:retained.data.evidence});
      const claimed=db.transaction(()=>{
        if(db.getCityRecord(guild.id,'opening_entry_authoring_claim',key))return false;
        db.saveCityRecord(guild.id,{kind:'opening_entry_authoring_claim',key,status:'claimed',visibility:'gm',source_event:opportunity.source_event,
          data:{version:1,revision:view.revision,opportunity:key}});return true;
      });
      if(!claimed)return db.getCityRecord(guild.id,'opening_entry_delivery',key);
      let authoring_code=typeof gm?.authorOpeningEntry==='function'?null:'WRITER_UNAVAILABLE';
      const authoring_started=performance.now();
      job=save(db,guild.id,key,opportunity,'authoring',{version:1,session:d.session,user:d.user,character:d.character,
        revision:view.revision,material_revision:view.material_revision});
      try{if(typeof gm?.authorOpeningEntry==='function')await gm.authorOpeningEntry(guild.id,key,scope,{assertCurrent});}
      catch(error){authoring_code=openingEntryAuthoringCode(error);}
      // Source, owner, attendance and continuity can change across the writer await.
      if(openingEntryProjection(db,guild.id,key,scope).revision!==view.revision)
        throw Object.assign(new Error('Entry source changed during authoring.'),{code:'OPENING_ENTRY_STALE',expected:true});
      job=db.transaction(()=>{
        assertCurrent();
        const result=prepareOpeningEntryOutput(db,guild.id,key,scope),turn=db.beginTurnAttempt({guildId:guild.id,sessionId:d.session,
          messageId:`owner-entry:${key}`,actorPrincipal:d.user,audience:'private'});
        queueTurnPublications(db,{guild,session:db.getActiveSession(guild.id),result,scope,turnId:turn.turn_id});
        db.updateTurnAttempt(turn.turn_id,{stage:'committed',committed:'yes',nativeCommitId:key});
        return save(db,guild.id,key,opportunity,'pending',{version:1,session:d.session,user:d.user,character:d.character,
          revision:view.revision,material_revision:view.material_revision,turn_id:turn.turn_id,evidence:result.entry_evidence,
          authoring:{stage:'opening_authoring',duration_ms:Math.round(performance.now()-authoring_started),writer_invocations:typeof gm?.authorOpeningEntry==='function'?1:0,
            provider_calls:'UNMEASURED',code:result.entry_evidence.narrative_verified?'ACCEPTED_UNITS':authoring_code
            ||db.openingAuthoringState(guild.id,openingEntryNarrativeCandidate(db,guild.id,key,scope).source.event_key)}});
      });
    }
    if(!job?.data.turn_id)return job;
    const delivered=await deliverQueuedTurn({db,guild,turnId:job.data.turn_id,beforeSend:assertCurrent}),rows=db.listTurnPublications(guild.id,job.data.turn_id),
      status=openingEntryDeliveryStatus(job.data.evidence,rows,delivered.pending.length);
    return save(db,guild.id,key,opportunity,status,job.data);
  }catch(error){
    const code=openingErrorCode(error);
    return save(db,guild.id,key,opportunity,'needs_review',{...(job?.data||{version:1,session:d.session,user:d.user,character:d.character,revision:view.revision}),hold_code:code});
  }
}
