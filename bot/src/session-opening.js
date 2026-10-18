/** Native opening scheduling. Operational sources are never fictional placement, PC choice or publication grants. */
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {assemblyInputFingerprint} from './assembly-context.js';
import {indexWorldEvent} from './city-calendar.js';
const ISSUER='native:opening-director',KIND='session_opening_job';
function fail(reason){throw Object.assign(new Error(`Native opening job requires ${reason}.`),{code:'SESSION_OPENING',expected:true});}

export function inspectSessionOpening(db,guild,key){
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

/** Only server command code supplies the actual interaction and native permission callback. */
export function scheduleSessionOpening(db,interaction,session,authorize){
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

/** A native attempt is operational provenance, never an exemption from assembly/output checks. */
export function beginSessionOpeningAttempt(db,guild,key){
  return db.transaction(()=>{
    const row=inspectSessionOpening(db,guild,key),session=db.getActiveSession(guild);
    if(!['queued','held_paused'].includes(row.status)||row.data.attempts!==0||session?.id!==key||db.isDirectorPaused(guild))fail('an unattempted current job');
    const context={version:1,job:key,origin_hash:row.data.origin_hash,input_fingerprint:assemblyInputFingerprint(db,guild,session),attempt:1},
      source=indexWorldEvent(db,guild,{key:`opening-attempt:${key}:1`,kind:'native_session_opening_attempt',title:'Native opening attempt; not fictional authority',
        source_kind:'event',source_id:row.source_event,session_id:key,visibility:'gm',details:context},ISSUER);
    return db.saveCityRecord(guild,{...row,key,status:'planning',data:{...row.data,attempts:1,attempt_source:source.event_key,context}});
  });
}
export function assertSessionOpeningAttempt(db,guild,key){
  const row=inspectSessionOpening(db,guild,key),session=db.getActiveSession(guild),c=row.data.context,e=db.getWorldEvent(guild,row.data.attempt_source);
  if(session?.id!==key||db.isDirectorPaused(guild)||!c||c.version!==1||c.job!==key||c.attempt!==row.data.attempts||c.origin_hash!==row.data.origin_hash
    ||c.input_fingerprint!==assemblyInputFingerprint(db,guild,session)||e?.status!=='active'||e.kind!=='native_session_opening_attempt'
    ||e.event_key!==`opening-attempt:${key}:${c.attempt}`||e.session_id!==key||e.visibility!=='gm'||e.subject_key!==null
    ||e.source_kind!=='event'||e.source_id!==row.source_event||hash(e.details)!==hash(c))fail('the current source-bound attempt');
  return row;
}
export function bindSessionOpeningTurn(db,guild,key,turnId){
  const row=assertSessionOpeningAttempt(db,guild,key),turn=db.getTurnAttempt(turnId);
  if(turn?.guild_id!==guild||turn.session_id!==key)fail('the actual opening turn');
  db.saveCityRecord(guild,{kind:'session_opening_turn',key:turnId,status:'bound',visibility:'gm',source_event:row.data.attempt_source,
    data:{version:1,job:key,origin_hash:row.data.origin_hash,context_hash:hash(row.data.context),turn:turnId}});
}
/** Also called by the common persisted publication verifier, including deferred/private transports. */
export function assertSessionOpeningPublication(db,guild,publication){
  const proof=db.getCityRecord(guild,'session_opening_turn',publication.turn_id);if(!proof)return;
  const row=assertSessionOpeningAttempt(db,guild,proof.data.job);
  if(proof.status!=='bound'||proof.visibility!=='gm'||proof.subject_key!==null||proof.data.version!==1
    ||proof.source_event!==row.data.attempt_source||proof.data.origin_hash!==row.data.origin_hash
    ||proof.data.context_hash!==hash(row.data.context)||proof.data.turn!==publication.turn_id)fail('the persisted opening publication proof');
}
