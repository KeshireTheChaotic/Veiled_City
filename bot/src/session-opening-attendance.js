/** Native operational attendance only. No fictional position, disclosure, proxy or effect authority. */
import {createHash} from 'node:crypto';
import {indexWorldEvent} from './city-calendar.js';
import {conversationPrincipal} from './conversation-principal.js';

const KIND='opening_attendance_registration', ISSUER='native:session-attendance';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const safeKey=value=>String(value).replace(/[^a-zA-Z0-9:_-]/g,'_').slice(0,180);
function fail(){throw Object.assign(new Error('Attendance receipt is missing, stale, or no longer source-valid; inspect or register again.'),
  {code:'SESSION_OPENING_ATTENDANCE',expected:true});}
function binding({guildId,interactionId,userId,character,sessionNumber,ownerBinding}){
  return {version:1,issuer:ISSUER,operation:'register',guild_id:guildId,interaction_id:interactionId,owner_user_id:userId,
    character_id:character.id,owner_binding:ownerBinding,session_number:sessionNumber,terms:'attendance_only_no_arrival_no_movement_no_party_consent'};
}
function createReceipt(db,b){
  const key=`attendance-registration:${safeKey(b.interaction_id)}`;
  if(db.getWorldEvent(b.guild_id,key))fail();
  const receipt=db.recordMutation(b.guild_id,{actorType:'player',actorId:b.owner_user_id,sourceLayer:'command',sourceInteractionId:b.interaction_id,
    mutationType:'session_attendance_register',entityKey:b.character_id,visibility:'gm',rationale:'Authenticated owner-only attendance declaration; no fictional outcome.',
    after:{issuer:ISSUER,binding:b,binding_hash:hash(b)}});
  const event=indexWorldEvent(db,b.guild_id,{key,kind:'native_session_attendance',title:'Owner attendance declaration',source_kind:'mutation',source_id:receipt.id,
    visibility:'gm',details:{issuer:ISSUER,binding:b,binding_hash:hash(b)}},b.owner_user_id);
  return event.event_key;
}
function verifyReceipt(db,guildId,row){
  const b=row?.data?.binding,event=row?.source_event&&db.getWorldEvent(guildId,row.source_event);
  const mutation=event?.source_kind==='mutation'&&db.getMutation(guildId,event.source_id);
  if(!b||row.kind!==KIND||row.visibility!=='gm'||row.subject_key!==null||row.data?.version!==1
    ||b.version!==1||b.issuer!==ISSUER||b.operation!=='register'||b.guild_id!==guildId
    ||!Number.isSafeInteger(b.session_number)||b.session_number<1||typeof b.interaction_id!=='string'||!b.interaction_id
    ||typeof b.owner_binding!=='string'||!/^[a-f0-9]{64}$/.test(b.owner_binding)
    ||b.terms!=='attendance_only_no_arrival_no_movement_no_party_consent'
    ||row.record_key!==`${b.session_number}:${b.owner_user_id}`||row.actor_key!==b.character_id
    ||!event||event.event_key!==row.source_event||event.status!=='active'||event.kind!=='native_session_attendance'
    ||event.event_key!==`attendance-registration:${safeKey(b.interaction_id)}`||event.subject_key!==null
    ||event.source_kind!=='mutation'||event.session_id!==null||event.scene!==''||event.location_key!==''||event.details.issuer!==ISSUER
    ||event.details.binding_hash!==hash(b)||hash(event.details.binding)!==hash(b)
    ||!mutation||mutation.mutation_type!=='session_attendance_register'||mutation.actor_type!=='player'
    ||mutation.guild_id!==guildId||mutation.session_id!==null||mutation.actor_id!==b.owner_user_id||mutation.source_layer!=='command'
    ||mutation.source_interaction_id!==b.interaction_id||mutation.visibility!=='gm'
    ||mutation.entity_key!==b.character_id||mutation.after_json==null) return null;
  let after;try{after=JSON.parse(mutation.after_json);}catch{return null;}
  if(after.issuer!==ISSUER||after.binding_hash!==hash(b)||hash(after.binding)!==hash(b))return null;
  return b;
}

export function registerOpeningAttendance(db,guildId,userId,interactionId,characterQuery=''){
  return db.transaction(()=>registerAttendance(db,guildId,userId,interactionId,characterQuery));
}
function registerAttendance(db,guildId,userId,interactionId,characterQuery){
  if(typeof userId!=='string'||!userId||typeof interactionId!=='string'||!interactionId||interactionId.length>120)fail();
  if(db.getActiveSession(guildId))throw new Error('A session is already active; use `/vc-session present` to check in.');
  const character=db.findOwnedCharacter(guildId,userId,characterQuery);
  if(!character||character.owner_user_id!==userId||character.guild_id!==guildId||!['active','reserve','guest'].includes(character.status))
    throw new Error('Choose an active, reserve, or guest character that you own.');
  const sessionNumber=db.nextSessionNumber(guildId),key=`${sessionNumber}:${userId}`;
  const existing=db.getCityRecord(guildId,KIND,key);
  if(existing){
    const prior=verifyReceipt(db,guildId,existing);
    if(existing.status==='registered'&&prior?.character_id===character.id&&prior.owner_user_id===userId
      &&prior.session_number===sessionNumber&&prior.owner_binding===db.attendanceOwnerBinding(guildId,userId,character.id))
      return {character,duplicate:true,sessionNumber};
  }
  const b=binding({guildId,interactionId,userId,character,sessionNumber,ownerBinding:db.attendanceOwnerBinding(guildId,userId,character.id)});
  const source=createReceipt(db,b);
  if(existing&&verifyReceipt(db,guildId,existing))
    indexWorldEvent(db,guildId,{key:existing.source_event,status:'superseded',superseded_by:source},userId);
  db.saveCityRecord(guildId,{kind:KIND,key,actor_key:character.id,status:'registered',source_event:source,visibility:'gm',subject_key:null,
    data:{version:1,binding:b}});
  return {character,duplicate:false,sessionNumber};
}

export function carryOpeningAttendance(db,guildId,session){
  return db.transaction(()=>carryAttendance(db,guildId,session));
}

/** A current owner attendance opportunity, not an arrival or permission to generate/send prose. */
export function inspectOpeningEntryOpportunity(db,guildId,key){
  const row=db.getCityRecord(guildId,'opening_entry_opportunity',key),d=row?.data;
  if(!d||row.visibility!=='gm'||row.subject_key!==null||d.version!==1||d.issuer!==ISSUER
    ||d.execution_authority!==false||d.publication_authority!==false||typeof d.source_interaction!=='string'||!d.source_interaction)fail();
  const session=db.getActiveSession(guildId),pc=db.getCharacter(d.character),e=db.getWorldEvent(guildId,row.source_event),
    m=e&&db.getMutation(guildId,e.source_id);
  if(session?.id!==d.session||pc?.guild_id!==guildId||pc.owner_user_id!==d.user||row.actor_key!==pc.id
    ||key!==`opening-entry:${hash([d.session,d.character,d.principal])}`||e?.status!=='active'
    ||e.kind!=='native_opening_entry_opportunity'||e.event_key!==`opening-entry-source:${safeKey(d.source_interaction)}`
    ||e.visibility!=='gm'||e.subject_key!==null||e.session_id!==d.session||e.scene!==''||e.location_key!==''
    ||e.source_kind!=='mutation'||e.details.payload_hash!==hash(d)||m?.mutation_type!=='session_entry_opportunity'
    ||m.actor_type!=='player'||m.actor_id!==d.user||m.session_id!==d.session||m.entity_key!==pc.id
    ||m.source_layer!=='command'||m.source_interaction_id!==d.source_interaction||m.visibility!=='gm')fail();
  let after;try{after=JSON.parse(m.after_json);}catch{fail();}
  const principal=conversationPrincipal(db,guildId,d.user,pc.id);
  if(hash(after)!==hash(d)||principal.kind!=='owner'||principal.revision!==d.principal)fail();
  return row;
}
export function prepareOpeningEntryOpportunity(db,guildId,userId,characterId,interactionId){
  return db.transaction(()=>{
    const pc=db.getCharacter(characterId),session=db.getActiveSession(guildId);
    if(!session||pc?.guild_id!==guildId||pc.owner_user_id!==userId||typeof interactionId!=='string'||!interactionId||interactionId.length>120)fail();
    const principal=conversationPrincipal(db,guildId,userId,pc.id);
    if(principal.kind!=='owner')fail();
    const key=`opening-entry:${hash([session.id,pc.id,principal.revision])}`;
    if(db.getCityRecord(guildId,'opening_entry_opportunity',key))return inspectOpeningEntryOpportunity(db,guildId,key);
    const data={version:1,issuer:ISSUER,session:session.id,character:pc.id,user:userId,principal:principal.revision,
      source_interaction:interactionId,execution_authority:false,publication_authority:false},
      m=db.recordMutation(guildId,{sessionId:session.id,actorType:'player',actorId:userId,sourceLayer:'command',sourceInteractionId:interactionId,
        mutationType:'session_entry_opportunity',entityKey:pc.id,visibility:'gm',after:data,
        rationale:'Owner attendance requests an entry opportunity only; no fictional location, arrival or knowledge.'}),
      event=indexWorldEvent(db,guildId,{key:`opening-entry-source:${safeKey(interactionId)}`,kind:'native_opening_entry_opportunity',
        title:'Native owner attendance opportunity',source_kind:'mutation',source_id:m.id,session_id:session.id,visibility:'gm',
        details:{payload_hash:hash(data)}},userId);
    db.saveCityRecord(guildId,{kind:'opening_entry_opportunity',key,status:'pending',actor_key:pc.id,visibility:'gm',source_event:event.event_key,data});
    return inspectOpeningEntryOpportunity(db,guildId,key);
  });
}
function carryAttendance(db,guildId,session){
  if(!session||session.guild_id!==guildId||session.status!=='active'||db.getActiveSession(guildId)?.id!==session.id
    ||db.nextSessionNumber(guildId)!==session.session_number+1)throw new Error('Current new session required to carry attendance.');
  const prior=db.getCityRecord(guildId,'opening_attendance_carry',session.id);
  if(prior){
    const e=db.getWorldEvent(guildId,prior.source_event),d=prior.data,m=e&&db.getMutation(guildId,e.source_id);
    let after;try{after=JSON.parse(m?.after_json||'null');}catch{fail();}
    if(prior.status!=='applied'||prior.visibility!=='gm'||prior.subject_key!==null||d.version!==1||d.issuer!==ISSUER
      ||d.session!==session.id||d.session_number!==session.session_number||e?.status!=='active'||e.kind!=='native_attendance_carry'
      ||e.source_kind!=='mutation'||e.visibility!=='gm'||e.subject_key!==null||e.session_id!==session.id
      ||e.event_key!==`attendance-carry:${session.id}`||e.details.payload_hash!==hash(d)||hash(after)!==hash(d)
      ||m?.actor_type!=='system'||m.actor_id!==ISSUER||m.source_layer!=='session_start'||m.mutation_type!=='session_attendance_carry'
      ||m.session_id!==session.id||m.entity_key!==session.id||m.visibility!=='gm')fail();
    return structuredClone(d.result); // Historical acknowledgement, never a new assignment or control revision.
  }
  const result={carried:[],held:[]},records=[];
  for(let offset=0;offset<=5000;offset+=100){
    const page=db.openingAttendanceRegistrations(guildId,{limit:100,offset});records.push(...page);
    if(records.length>5000)throw new Error('Attendance registration capacity requires native reconciliation before session start.');
    if(page.length<100)break;
  }
  for(const row of records){
    const b=verifyReceipt(db,guildId,row),character=b&&db.getCharacter(b.character_id);
    const valid=row.status==='registered'&&row.record_key===`${session.session_number}:${b?.owner_user_id}`
      &&b?.guild_id===guildId&&b.session_number===session.session_number
      &&b.owner_user_id&&b.character_id===row.actor_key&&character?.guild_id===guildId
      &&character.owner_user_id===b.owner_user_id&&['active','reserve','guest'].includes(character.status)
      &&b.owner_binding===db.attendanceOwnerBinding(guildId,b.owner_user_id,b.character_id)
      &&db.listPlayers(guildId).some(p=>p.discord_user_id===b.owner_user_id);
    if(valid){
      db.setPresence(session.id,b.owner_user_id,'present','offscreen',null,'Pre-start attendance registration; no arrival or movement inferred.');
      db.assignCharacter(session.id,b.owner_user_id,b.character_id,{role:'primary',controlPolicy:'player_only'});
      db.saveCityRecord(guildId,{...row,key:row.record_key,status:'carried',data:{...row.data,carried_session_id:session.id}});
      result.carried.push(b.character_id);
    }else{
      db.saveCityRecord(guildId,{...row,key:row.record_key,status:'held',data:{...row.data,hold_reason:'source_or_owner_validation_failed'}});
      result.held.push(row.record_key);
    }
  }
  const data={version:1,issuer:ISSUER,session:session.id,session_number:session.session_number,result},
    m=db.recordMutation(guildId,{sessionId:session.id,actorType:'system',actorId:ISSUER,sourceLayer:'session_start',
      mutationType:'session_attendance_carry',entityKey:session.id,visibility:'gm',after:data,
      rationale:'Native attendance carry only; no fictional action, consent, placement or publication.'}),
    event=indexWorldEvent(db,guildId,{key:`attendance-carry:${session.id}`,kind:'native_attendance_carry',title:'Native session attendance carry',
      source_kind:'mutation',source_id:m.id,session_id:session.id,visibility:'gm',details:{payload_hash:hash(data)}},ISSUER);
  db.saveCityRecord(guildId,{kind:'opening_attendance_carry',key:session.id,status:'applied',source_event:event.event_key,visibility:'gm',data});
  return result;
}
