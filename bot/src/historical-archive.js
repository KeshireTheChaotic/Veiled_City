/** GM-only administrative closure. Original sources/receipts stay immutable; archival never authorizes gameplay. */
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {PermissionError,StateConflictError,UserInputError} from './errors.js';

const secret=randomBytes(32),ttl=10*60*1000;
const archiveKind='historical_record_archive';
const terminal=new Set(['resolved','complete','completed','cancelled','withdrawn','declined','ended','failed',
  'rejected','superseded','delivered','verified','revoked']);
const eligible={compound_action:['ready','blocked','clarification'],semantic_intent_proposal:['awaiting_referent'],
  pvp_output_quarantine:['needs_scope_review']};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=row=>`${row.kind}:${row.record_key}`;
const archiveKey=(guild,row)=>`historical-archive:${hash([guild,row.kind,row.record_key])}`;
const parse=row=>{try{return JSON.parse(row?.data_json||'{}');}catch{return null;}};
const fail=message=>{throw new StateConflictError(message);};
function authorize(guild,user,options){
  if(options?.authorized!==true||!guild||!user)throw new PermissionError('GM/admin permission required.');
}
function strings(value,result=new Set()){
  if(typeof value==='string')result.add(value);
  else if(Array.isArray(value))for(const v of value)strings(v,result);
  else if(value&&typeof value==='object')for(const v of Object.values(value))strings(v,result);
  return result;
}
function sessionRefs(row,events){
  const d=parse(row),source=events.get(row.source_event),e=source&&JSON.parse(source.details_json||'{}');
  if(!d)return [];
  return [d.session_id,d.session,e?.session_id,e?.session,source?.session_id].filter(v=>v!==null&&v!==undefined&&v!=='');
}
function sessionOf(row,events){
  const refs=sessionRefs(row,events);
  return refs.length&&refs.every(v=>typeof v==='string'&&v===refs[0])?refs[0]:null;
}
function nativePending(row){
  if(row.kind==='pvp_fear_trigger')return row.status!=='resolved';
  if(terminal.has(row.status))return false;
  if(row.kind==='compound_action')return !['blocked','clarification'].includes(row.status);
  if(row.kind.startsWith('pvp_output_')||row.kind==='pvp_delivered_archive')return false;
  return /^(?:pvp_|pc_|roll_|action_continuation|action_interrupt|scene_action_window)/.test(row.kind);
}
function analyze(db,guild,{preview=false}={}){
  const state=db.historicalArchiveState(guild,{proofOnly:!preview}),rows=state.tables.city_records,byId=new Map(rows.map(r=>[id(r),r])),
    events=new Map(state.tables.world_events.map(r=>[r.event_key,r])),sessions=new Map(state.tables.sessions.map(r=>[r.id,r]));
  const byKey=new Map(),edges=new Map();
  const link=(a,b)=>{if(!edges.has(a))edges.set(a,new Set());if(!edges.has(b))edges.set(b,new Set());edges.get(a).add(b);edges.get(b).add(a);};
  for(const r of rows){const entries=byKey.get(r.record_key)||[];entries.push(id(r));byKey.set(r.record_key,entries);}
  for(const r of rows){
    link(id(r),`event:${r.source_event}`);
    for(const ref of strings(parse(r))){for(const key of byKey.get(ref)||[])link(id(r),key);if(events.has(ref))link(id(r),`event:${ref}`);}
  }
  const connected=row=>{const seen=new Set([id(row)]),todo=[id(row)];
    while(todo.length){for(const ref of edges.get(todo.pop())||[])if(!seen.has(ref)){seen.add(ref);todo.push(ref);}}return seen;};
  const candidates=rows.filter(r=>eligible[r.kind]?.includes(r.status)),units=[],conflicts=[];
  const obligationSession=r=>sessionOf(r,events)||[parse(r)?.session_id,parse(r)?.session].find(s=>sessions.has(s))||null;
  for(const row of candidates){
    const data=parse(row),sessionId=sessionOf(row,events),session=sessions.get(sessionId),source=events.get(row.source_event),related=[];
    let reason=null;
    if(!session||session.status!=='ended'||!session.ended_at||state.campaign?.active_session_id===sessionId)reason='session_not_ended_or_ambiguous';
    else if(!source||source.status!=='active')reason='source_missing_or_retracted';
    else if(row.kind==='pvp_output_quarantine'&&data?.canonical!==false)reason='quarantine_not_noncanonical';
    if(!reason&&row.kind==='compound_action'){
      const action=byId.get(`typed_intent:${data.action_id}`),proposal=byId.get(`semantic_intent_proposal:${data.proposal_id}`);
      if(!action||!proposal||action.source_event!==row.source_event||proposal.source_event!==row.source_event
        ||parse(action)?.proposal_id!==data.proposal_id||sessionOf(action,events)!==sessionId||sessionOf(proposal,events)!==sessionId)
        reason='related_action_ancestry_missing';
      else for(const r of [action,proposal])related.push({kind:r.kind,key:r.record_key,row_hash:hash(r)});
    }
    if(!reason){
      const refs=connected(row);
      if(rows.some(r=>!candidates.includes(r)&&nativePending(r)
        &&(!obligationSession(r)||obligationSession(r)===sessionId||refs.has(id(r)))))reason='unresolved_native_dependency';
      // A ready work unit in another session may refer back to this one.
      if(candidates.some(r=>sessionOf(r,events)!==sessionId&&nativePending(r)&&refs.has(id(r))))reason='live_reverse_dependency';
      const turns=state.tables.turn_attempts,turnIds=new Set(turns.filter(t=>t.session_id===sessionId).map(t=>t.turn_id));
      if(state.tables.publication_outbox.some(p=>p.status!=='delivered'&&turnIds.has(p.turn_id)))reason='unresolved_publication';
      if(turns.some(t=>t.session_id===sessionId&&!['delivered','failed'].includes(t.stage)))reason='unresolved_turn';
      if(JSON.parse(session.director_state_json||'{}').pending_pass)reason='pending_director';
      if(state.tables.encounters.some(e=>e.session_id===sessionId&&['planned','active'].includes(e.status)))reason='pending_encounter';
      if(state.tables.simulation_records.some(r=>r.kind==='action'&&!terminal.has(r.status)
        &&(!parse(r)?.source_context?.session||parse(r).source_context.session===sessionId)))reason='pending_simulation_action';
    }
    const annotation=byId.get(`${archiveKind}:${archiveKey(guild,row)}`),d=annotation&&parse(annotation);
    let archived=false;
    if(annotation){
      const reversed=rows.some(r=>r.kind==='historical_record_archive_reversal'&&parse(r)?.batch===d?.batch);
      archived=!reason&&!reversed&&annotation.status==='archived'&&annotation.visibility==='gm'
        &&annotation.source_event===row.source_event&&d?.version===1&&d.canonical===false&&d.authorizes_execution===false
        &&d.disposition==='administratively_closed_ended_session'&&d.target_kind===row.kind&&d.target_key===row.record_key
        &&d.session_id===sessionId&&d.session_number===session.session_number&&d.original_status===row.status
        &&d.stored_row_hash===hash(row)&&d.original_row_hash===hash({...row,archive_session_id:sessionId,session_number:session.session_number})
        &&hash(d.related)===hash(related);
      if(!archived){reason=reason||'archive_annotation_invalid_or_reversed';conflicts.push({kind:row.kind,key:row.record_key,code:reason});}
    }
    units.push({row,session,sessionId,sessionRefs:sessionRefs(row,events),related,reason,archived});
  }
  // Changed original statuses still invalidate any existing closure rather than silently hiding history.
  for(const r of rows.filter(r=>r.kind===archiveKind)){
    const d=parse(r);if(!units.some(u=>archiveKey(guild,u.row)===r.record_key))
      conflicts.push({kind:archiveKind,key:r.record_key,code:d?'archive_target_missing_or_changed':'malformed_annotation'});
  }
  return {state,units,conflicts,digest:hash(state)};
}
function selected(db,guild,number){
  const a=analyze(db,guild,{preview:true}),session=a.state.tables.sessions.find(s=>s.session_number===number);
  if(!Number.isSafeInteger(number)||!session||session.status!=='ended'||!session.ended_at||a.state.campaign?.active_session_id===session.id)
    throw new UserInputError('Select one ended session in this guild.');
  const units=a.units.filter(u=>u.sessionId===session.id||!u.sessionId&&u.sessionRefs.includes(session.id));
  if(units.length>200)throw new UserInputError('Session inventory exceeds 200 records; scoped operator review required.');
  return {...a,session,units};
}
function sign(data){const body=Buffer.from(JSON.stringify(data)).toString('base64url');return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`;}
function verify(token){
  if(typeof token!=='string'||token.length>1000)fail('Invalid or expired archive preview; preview again.');
  const [body,signature,...extra]=token.split('.'),expected=createHmac('sha256',secret).update(body).digest();
  const actual=Buffer.from(signature||'','base64url');
  if(extra.length||actual.length!==expected.length||!timingSafeEqual(actual,expected))fail('Invalid archive preview; preview again.');
  try{return JSON.parse(Buffer.from(body,'base64url').toString());}catch{fail('Invalid archive preview.');}
}
function metadata(a){
  return {visibility:'gm',session:a.session.session_number,eligible:a.units.filter(u=>!u.archived&&!u.reason).length,
    held:a.units.filter(u=>!!u.reason).length,already_archived:a.units.filter(u=>u.archived).length,
    items:a.units.map(u=>({kind:u.row.kind,key:u.row.record_key,original_status:u.row.status,
      administrative_status:u.archived?'archived':u.reason?'held':'eligible',reason_code:u.reason,
      related:u.related.map(({kind,key})=>({kind,key}))})),
    authority:'Administrative closure only; no consent, withdrawal, outcome, publication or replay authority.'};
}
export function previewHistoricalArchive(db,guild,user,number,options={}){
  authorize(guild,user,options);const a=selected(db,guild,number);
  return {...metadata(a),preview:sign({guild,user,session:number,digest:a.digest,expires:(options.now??Date.now())+ttl})};
}
export function listHistoricalArchive(db,guild,user,number,options={}){
  authorize(guild,user,options);return metadata(selected(db,guild,number));
}
export function historicalArchiveProjection(db,guild){
  if(!db.hasHistoricalArchives(guild))return {archived:0,conflicts:[],excluded:[]};
  let a;
  try{a=analyze(db,guild);}catch(error){
    if(error.code!=='ARCHIVAL_INVENTORY_LIMIT')throw error;
    // A bounded read projection can SHOW the original rows, but can never hide unverified obligations or freeze unrelated roleplay.
    return {archived:0,conflicts:[{kind:'historical_archive_inventory',key:'inventory',code:error.code}],excluded:[]};
  }
  const excluded=[];
  for(const u of a.units.filter(u=>u.archived))excluded.push({kind:u.row.kind,key:u.row.record_key},...u.related.map(({kind,key})=>({kind,key})));
  return {archived:a.units.filter(u=>u.archived).length,conflicts:a.conflicts,excluded};
}
export function applyHistoricalArchive(db,guild,user,input,options={}){
  authorize(guild,user,options);
  if(!input||Object.keys(input).sort().join()!=='interactionId,preview,reason'||!input.interactionId
    ||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>600||typeof input.preview!=='string')
    throw new UserInputError('Exact preview, interaction ID and bounded administrative reason required.');
  return db.transaction(()=>{
    const prior=db.getOperationReceipt(guild,input.interactionId)||db.historicalArchiveReplay(guild,user,hash(input.preview));
    if(prior){
      const payload=JSON.parse(prior.payload_json);
      if(prior.command_key!=='admin:archive-history'||prior.actor_user_id!==user||payload.preview_hash!==hash(input.preview)
        ||payload.reason_hash!==hash(input.reason))fail('Archive interaction receipt does not match this request.');
      return payload.result;
    }
    const token=verify(input.preview);
    if(token.guild!==guild||token.user!==user||token.expires<=(options.now??Date.now()))fail('Archive preview expired or belongs to another GM/guild.');
    const a=selected(db,guild,token.session);
    if(a.digest!==token.digest)fail('Archive preview is stale; campaign evidence changed. Preview again.');
    const targets=a.units.filter(u=>!u.archived&&!u.reason);
    if(!targets.length)fail('No eligible unfinished records to archive.');
    const batch=`historical-archive-batch:${hash([guild,a.session.id,targets.map(u=>[id(u.row),hash(u.row)])])}`;
    const backup=db.createHistoricalArchiveBackup(guild,user,batch,a.state),time=new Date(options.now??Date.now()).toISOString();
    for(const u of targets){
      const row=u.row;
      db.saveCityRecord(guild,{kind:archiveKind,key:archiveKey(guild,row),status:'archived',visibility:'gm',source_event:row.source_event,
        data:{version:1,batch,session_id:a.session.id,session_number:a.session.session_number,target_kind:row.kind,target_key:row.record_key,
          original_status:row.status,stored_row_hash:hash(row),
          original_row_hash:hash({...row,archive_session_id:a.session.id,session_number:a.session.session_number}),related:u.related,
          disposition:'administratively_closed_ended_session',archived_at:time,actor:user,reason:input.reason,
          canonical:false,authorizes_execution:false,
          authority:'Administrative ended-session history only; native receipts own outcomes and human declarations own intent.'}});
    }
    const result={batch_id:batch,archived:targets.length,already_archived:a.units.filter(u=>u.archived).length,held:a.units.filter(u=>u.reason).length,backup_id:backup.id};
    db.recordMutation(guild,{actorType:'human_gm',actorId:user,sessionId:a.session.id,sourceLayer:'historical_archive',
      sourceInteractionId:input.interactionId,mutationType:'historical_records_archived',entityKey:batch,
      rationale:input.reason,before:{archived:0},after:{archived:targets.length},payload:result});
    db.recordOperationReceipt(guild,{interactionId:input.interactionId,commandKey:'admin:archive-history',actorUserId:user,
      responseText:`Archived ${targets.length} historical work units; no gameplay outcomes changed.`,
      payload:{preview_hash:hash(input.preview),reason_hash:hash(input.reason),result}});
    return result;
  });
}
