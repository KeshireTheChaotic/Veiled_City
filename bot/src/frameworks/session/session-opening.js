/** Source-bound native opening attempts and immutable precommit revision fences. */
import {jsonHash as hash} from '../../kernel/json-hash.js';
export function createSessionOpening({assemblyInputFingerprint,indexWorldEvent,assemblyPlanHash}){
const ISSUER='native:opening-director',KIND='session_opening_job';

function fail(reason){throw Object.assign(new Error(`Native opening job requires ${reason}.`),{code:'SESSION_OPENING',expected:true});}

const epochFailure=code=>Object.assign(new Error('Opening generation requires current native revision and no prior commitment.'),{code,expected:true});

const snapshotRoster=(db,key)=>db.roster(key).filter(r=>r.character_id&&['present','late','guest'].includes(r.presence))
  .map(r=>({user:r.discord_user_id,character:r.character_id}));

function rebaseSessionOpening(db,guild,key,expected,{prepared=false,interactionId=null}={}){
  return db.transaction(()=>{
    const row=inspectSessionOpening(db,guild,key),session=db.getActiveSession(guild),prior=row.data.epoch;
    if(hash(row.data.context)!==hash(expected.data.context)||hash(prior||null)!==hash(expected.data.epoch||null))throw epochFailure('OPENING_FENCE_LOST');
    if(session?.id!==key||db.isDirectorPaused(guild))throw epochFailure('OPENING_PAUSED_OR_REVOKED');
    if(row.data.attempts!==1)throw epochFailure('OPENING_MANUAL_REFRESH_REQUIRED');
    if(!db.openingCommitmentState(guild,key).safe)throw epochFailure('OPENING_COMMITTED_SOURCE_CHANGED');
    if((prior?.number||0)>=1)throw epochFailure('OPENING_REBASE_PENDING');
    const epoch={version:1,number:1,job:key,attempt_source:row.data.attempt_source,context_hash:hash(row.data.context),
      previous_fingerprint:prior?.input_fingerprint||row.data.context.input_fingerprint,
      input_fingerprint:assemblyInputFingerprint(db,guild,session),
      roster:snapshotRoster(db,key)},
      mutation=db.recordMutation(guild,{sessionId:key,actorType:'system',actorId:ISSUER,sourceLayer:'opening_precommit',
        sourceInteractionId:interactionId,
        mutationType:'session_opening_rebase',entityKey:key,visibility:'gm',before:row.data.context,after:epoch,
        rationale:'Supersede only proven uncommitted generation; original authenticated attempt and all receipts retained.'}),
      source=indexWorldEvent(db,guild,{key:`opening-epoch:${key}:${row.data.attempts}:1`,kind:'native_opening_epoch',
        title:'Source-bound precommit revision fence',source_kind:'mutation',source_id:mutation.id,session_id:key,visibility:'gm',details:epoch},ISSUER);
    db.saveCityRecord(guild,{kind:'session_opening_generation',key:`${key}:${row.data.attempts}:0`,status:'superseded_uncommitted',
      visibility:'gm',source_event:row.data.attempt_source,data:{context:row.data.context,plan:db.getAssemblyPlan(key),replacement:source.event_key}});
    db.setAssemblyPlan(key,{});
    return db.saveCityRecord(guild,{...row,key,status:prepared?'prepared_rebase':'planning',data:{...row.data,epoch:{...epoch,source:source.event_key},hold_code:null}});
  });
}

function assertSessionOpeningFence(db,guild,key,expected){
  const row=assertSessionOpeningAttempt(db,guild,key);
  if(hash(row.data.context)!==hash(expected.data.context)||hash(row.data.epoch||null)!==hash(expected.data.epoch||null))throw epochFailure('OPENING_FENCE_LOST');
  return row;
}

function inspectSessionOpening(db,guild,key){
  const row=db.getCityRecord(guild,KIND,key),d=row?.data,o=d?.origin;
  if(!o||d.version!==1||o.version!==1||o.issuer!==ISSUER||o.guild!==guild||o.session!==key||row.visibility!=='gm'||row.subject_key!==null
    ||d.origin_hash!==hash(o)||!Number.isSafeInteger(d.attempts)||d.attempts<0||d.attempts>2
    ||!['assembly','resume'].includes(o.kind)||!Array.isArray(o.roster)||o.roster.length>5000)fail('a closed native origin');
  const session=db.getSession(o.session),e=db.getWorldEvent(guild,row.source_event),m=e&&db.getMutation(guild,e.source_id);
  let after;try{after=JSON.parse(m?.after_json||'null');}catch{fail('the native start mutation');}
  if(session?.guild_id!==guild||session.session_number!==o.session_number||e?.status!=='active'
    ||e.kind!=='native_session_opening_job'||e.event_key!==`opening-job:${key}:source`||e.source_kind!=='mutation'
    ||e.session_id!==o.session||e.visibility!=='gm'||e.subject_key!==null||e.scene!==''||e.location_key!==''
    ||e.details.origin_hash!==hash(o)||hash(after)!==hash(o)||m?.mutation_type!=='session_opening_schedule'
    ||m.actor_type!=='human_gm'||m.actor_id!==o.operator||m.source_layer!=='session_start'||m.session_id!==o.session
    ||m.source_interaction_id!==o.start_interaction||m.entity_key!==key||m.visibility!=='gm')fail('the immutable authenticated start receipt');
  return row;
}

function scheduleSessionOpening(db,interaction,session,authorize){
  if(typeof authorize!=='function'||authorize(db,interaction)!==true||typeof interaction?.id!=='string'||!interaction.id
    ||typeof interaction?.user?.id!=='string'||!interaction.user.id||interaction.guildId!==session?.guild_id)fail('an authenticated GM start');
  const guild=interaction.guildId;
  return db.transaction(()=>{
    const live=db.getActiveSession(guild);
    if(live?.id!==session.id||live.session_number!==session.session_number)fail('the current native session');
    if(db.getCityRecord(guild,KIND,session.id))return inspectSessionOpening(db,guild,session.id);
    const roster=db.roster(session.id).filter(r=>r.character_id&&['present','late','guest'].includes(r.presence)).map(r=>{
      const pc=db.getCharacter(r.character_id),assignment=db.activeAssignment(session.id,r.discord_user_id);
      if(pc?.guild_id!==guild||pc.owner_user_id!==r.discord_user_id||assignment?.character_id!==pc.id
        ||assignment.control_policy!=='player_only'||assignment.proxy_user_id)fail('owner-controlled initial attendance');
      return {character:pc.id,user:r.discord_user_id,control_revision:assignment.control_revision};
    }).sort((a,b)=>a.character.localeCompare(b.character));
    const origin={version:1,issuer:ISSUER,guild,session:session.id,session_number:session.session_number,
      mode:live.assembly_mode,kind:live.assembly_phase==='party'?'resume':'assembly',operator:interaction.user.id,start_interaction:interaction.id,
      roster,input_fingerprint:assemblyInputFingerprint(db,guild,live)},
      mutation=db.recordMutation(guild,{sessionId:session.id,actorType:'human_gm',actorId:interaction.user.id,sourceLayer:'session_start',
        sourceInteractionId:interaction.id,mutationType:'session_opening_schedule',entityKey:session.id,visibility:'gm',after:origin,
        rationale:'Authenticated operator starts one opening job; no fiction, co-location, consent or delivered message.'}),
      source=indexWorldEvent(db,guild,{key:`opening-job:${session.id}:source`,kind:'native_session_opening_job',title:'Native session opening schedule',
        source_kind:'mutation',source_id:mutation.id,session_id:session.id,visibility:'gm',details:{origin_hash:hash(origin)}},ISSUER);
    db.saveCityRecord(guild,{kind:KIND,key:session.id,status:live.assembly_mode==='manual'?'held_manual':'queued',visibility:'gm',source_event:source.event_key,
      data:{version:1,origin,origin_hash:hash(origin),attempts:0}});
    return inspectSessionOpening(db,guild,session.id);
  });
}

function beginSessionOpeningAttempt(db,guild,key){
  return db.transaction(()=>{
    const row=inspectSessionOpening(db,guild,key),session=db.getActiveSession(guild);
    if(row.data.attempts!==0||!['queued','held_paused'].includes(row.status))return null;
    if(!['queued','held_paused'].includes(row.status)||row.data.attempts!==0||session?.id!==key||db.isDirectorPaused(guild))fail('an unattempted current job');
    const context={version:1,job:key,origin_hash:row.data.origin_hash,input_fingerprint:assemblyInputFingerprint(db,guild,session),attempt:1,roster:snapshotRoster(db,key)},
      source=indexWorldEvent(db,guild,{key:`opening-attempt:${key}:1`,kind:'native_session_opening_attempt',title:'Native opening attempt; not fictional authority',
        source_kind:'event',source_id:row.source_event,session_id:key,visibility:'gm',details:context},ISSUER);
    return db.saveCityRecord(guild,{...row,key,status:'planning',data:{...row.data,attempts:1,attempt_source:source.event_key,context}});
  });
}

function assertSessionOpeningAttempt(db,guild,key){
  const row=inspectSessionOpening(db,guild,key),session=db.getActiveSession(guild),c=row.data.context,e=db.getWorldEvent(guild,row.data.attempt_source);
  if(db.isDirectorPaused(guild))throw epochFailure('OPENING_DIRECTOR_PAUSED');
  if(session?.id!==key||!c||c.version!==1||c.job!==key||c.attempt!==row.data.attempts||c.origin_hash!==row.data.origin_hash
    ||e?.status!=='active'||e.kind!=='native_session_opening_attempt'
    ||e.event_key!==`opening-attempt:${key}:${c.attempt}`||e.session_id!==key||e.visibility!=='gm'||e.subject_key!==null
    ||e.source_kind!=='event'||e.source_id!==row.source_event||hash(e.details)!==hash(c))fail('the current source-bound attempt');
  const epoch=row.data.epoch;
  if(epoch){
    const {source,...payload}=epoch,event=db.getWorldEvent(guild,source),mutation=event&&db.getMutation(guild,event.source_id);
    if(epoch.version!==1||epoch.number!==1||epoch.job!==key||epoch.attempt_source!==row.data.attempt_source
      ||epoch.context_hash!==hash(c)||event?.status!=='active'||event.kind!=='native_opening_epoch'||event.visibility!=='gm'
      ||event.session_id!==key||event.source_kind!=='mutation'||event.event_key!==`opening-epoch:${key}:${c.attempt}:1`
      ||hash(event.details)!==hash(payload)||mutation?.actor_type!=='system'||mutation.actor_id!==ISSUER
      ||mutation.mutation_type!=='session_opening_rebase'||mutation.source_layer!=='opening_precommit'||mutation.entity_key!==key
      ||mutation.session_id!==key||hash(JSON.parse(mutation.after_json))!==hash(payload)||hash(JSON.parse(mutation.before_json))!==hash(c))fail('the authenticated generation receipt');
  }
  if((epoch?.input_fingerprint||c.input_fingerprint)!==assemblyInputFingerprint(db,guild,session))throw epochFailure('OPENING_INPUT_CHANGED');
  if(c.attempt===2){
    const approval=db.getMutation(guild,c.approval_mutation),{approval_mutation,...approved}=c,
      review=db.getCityRecord(guild,'assembly_refresh',c.refresh?.review),source=review&&db.getWorldEvent(guild,review.source_event),
      prior=db.getWorldEvent(guild,c.refresh?.previous_source);
    if(!approval||approval.actor_type!=='human_gm'||approval.actor_id!==review?.data.user||!approval.source_interaction_id
      ||approval.source_layer!=='assembly_refresh'||approval.mutation_type!=='session_opening_refresh'||approval.entity_key!==key
      ||approval.session_id!==key||approval.visibility!=='gm'||hash(JSON.parse(approval.after_json))!==hash(approved)
      ||hash(JSON.parse(approval.before_json))!==c.refresh.previous_context||hash(prior?.details)!==c.refresh.previous_context
      ||prior?.status!=='active'||prior.kind!=='native_session_opening_attempt'||prior.event_key!==`opening-attempt:${key}:1`
      ||prior.source_kind!=='event'||prior.source_id!==row.source_event||prior.visibility!=='gm'||prior.session_id!==key
      ||review?.status!=='prepared'||review.visibility!=='gm'||review.data.version!==2||review.data.session!==key
      ||source?.status!=='active'||source.kind!=='assembly_refresh_review'||source.source_id!=='native:assembly'
      ||source.visibility!=='gm'||source.subject_key!==null||source.session_id!==key||hash(source.details)!==hash(review.data)
      ||c.refresh.plan!==assemblyPlanHash(db.getAssemblyPlan(key)))fail('the exact authenticated replacement receipt');
  }
  return row;
}

function rebindSessionOpeningRefresh(db,guild,key,review,user,interactionId){
  if(!db.getCityRecord(guild,KIND,key))return null;
  const row=inspectSessionOpening(db,guild,key),session=db.getActiveSession(guild),source=db.getWorldEvent(guild,review.source_event);
  if(session?.id!==key||db.isDirectorPaused(guild)||row.data.attempts!==1||!row.data.context
    ||['planning','publishing','prepared_refresh'].includes(row.status)||!interactionId||review.status!=='prepared'
    ||review.visibility!=='gm'||review.data.version!==2||review.data.session!==key||review.data.user!==user
    ||source?.status!=='active'||source.kind!=='assembly_refresh_review'||source.source_id!=='native:assembly'
    ||source.visibility!=='gm'||source.subject_key!==null||source.session_id!==key||hash(source.details)!==hash(review.data))
    fail('one authenticated exact-state replacement');
  const context={version:1,job:key,origin_hash:row.data.origin_hash,input_fingerprint:assemblyInputFingerprint(db,guild,session),attempt:2,
    roster:snapshotRoster(db,key),
    refresh:{review:review.record_key,previous_source:row.data.attempt_source,previous_context:hash(row.data.context),plan:assemblyPlanHash(db.getAssemblyPlan(key))}},
    mutation=db.recordMutation(guild,{sessionId:key,actorType:'human_gm',actorId:user,sourceLayer:'assembly_refresh',sourceInteractionId:interactionId,
      mutationType:'session_opening_refresh',entityKey:key,visibility:'gm',before:row.data.context,after:context,
      rationale:'Exact reviewed source replacement only; old attempts, dice, effects and delivery acknowledgements retained.'});
  context.approval_mutation=mutation.id;
  const event=indexWorldEvent(db,guild,{key:`opening-attempt:${key}:2`,kind:'native_session_opening_attempt',
    title:'Explicit source-reviewed replacement opening attempt',source_kind:'event',source_id:row.source_event,
    session_id:key,visibility:'gm',details:context},ISSUER);
  db.saveCityRecord(guild,{...row,key,status:'prepared_refresh',data:{...row.data,attempts:2,attempt_source:event.event_key,context,
    previous_epoch:row.data.epoch||row.data.previous_epoch||null,epoch:null,hold_code:null}});
  return assertSessionOpeningAttempt(db,guild,key);
}

function bindSessionOpeningTurn(db,guild,key,turnId){
  const row=assertSessionOpeningAttempt(db,guild,key),turn=db.getTurnAttempt(turnId);
  if(turn?.guild_id!==guild||turn.session_id!==key)fail('the actual opening turn');
  const previous=db.getCityRecord(guild,'session_opening_turn',turnId);
  if(previous&&(previous.source_event!==row.data.attempt_source||previous.data.context_hash!==hash(row.data.context)
    ||(previous.data.epoch_hash||null)!==(row.data.epoch?hash(row.data.epoch):null)))
    fail('the original immutable turn binding');
  if(previous)return previous;
  db.saveCityRecord(guild,{kind:'session_opening_turn',key:turnId,status:'bound',visibility:'gm',source_event:row.data.attempt_source,
    data:{version:1,job:key,origin_hash:row.data.origin_hash,context_hash:hash(row.data.context),turn:turnId,
      ...(row.data.epoch?{epoch_hash:hash(row.data.epoch)}:{})}});
}

function assertSessionOpeningPublication(db,guild,publication){
  const proof=db.getCityRecord(guild,'session_opening_turn',publication.turn_id);if(!proof)return;
  const row=assertSessionOpeningAttempt(db,guild,proof.data.job);
  if(proof.status!=='bound'||proof.visibility!=='gm'||proof.subject_key!==null||proof.data.version!==1
    ||proof.source_event!==row.data.attempt_source||proof.data.origin_hash!==row.data.origin_hash
    ||(proof.data.epoch_hash||null)!==(row.data.epoch?hash(row.data.epoch):null)
    ||proof.data.context_hash!==hash(row.data.context)||proof.data.turn!==publication.turn_id)fail('the persisted opening publication proof');
}
return Object.freeze({rebaseSessionOpening,assertSessionOpeningFence,inspectSessionOpening,scheduleSessionOpening,beginSessionOpeningAttempt,assertSessionOpeningAttempt,rebindSessionOpeningRefresh,bindSessionOpeningTurn,assertSessionOpeningPublication});
}
