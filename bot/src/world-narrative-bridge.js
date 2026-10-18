/** Read-only native causal signals for the existing GM request. No world effects, disclosure or provider calls. */
import {sceneFictionHash as hash,narrativeSourceVisible} from './scene-fiction-context.js';
import {listNarrativeRecords} from './narrative-records.js';
import {currentScene,scenePresence} from './scene-continuity.js';
import {conversationPrincipal} from './conversation-principal.js';
import {completedActionSource,historicalActionSource} from './action-consent.js';
import {typedRollProof} from './typed-roll-proof.js';
const entitled=(row,scope)=>['public','party'].includes(row.visibility)||scope.mode==='private'&&row.visibility==='character'
  &&row.subject_key===scope.actorCharacterId&&!!scope.actorUserId;
const audience=s=>s.mode==='private'?{visibility:'character',character:s.actorCharacterId,user:s.actorUserId}:{visibility:'party',character:null,user:null};
function ownerScope(db,guild,s){
  if(s.mode!=='private')return s.mode==='party';
  const pc=db.getCharacter(s.actorCharacterId);return pc?.guild_id===guild&&pc.owner_user_id===s.actorUserId;
}
function envelope(scene,scope,kind,root,refs,disposition){
  const boundary=audience(scope),operation=refs[0].key,cycle=`world-cycle:${hash([scene.session_id,scene.key,root])}`;
  return {version:1,protocol:'narrative_signal_v1',id:`world-signal:${hash([kind,root,operation,boundary,cycle])}`,kind,operation_ref:operation,
    session:scene.session_id,scene:scene.key,audience:boundary,causation_ref:root,world_cycle_ref:cycle,depth:0,
    origin_kind:kind==='unresolved_narrative_task'?'native_diagnostic':'human_action',source_refs:refs,
    authority_disposition:disposition,execution_authority:false,publication_authority:false};
}
function nativeResult(db,guild,a,scope,scene){
  const d=a.data;
  if(a.status!=='resolved'||d.session_id!==scene.session_id||d.scene!==scene.key||!entitled(a,scope)
    ||!narrativeSourceVisible(db,guild,a.source_event,scope)||!d.outcome_receipt)return null;
  try{
    const r=db.getCityRecord(guild,'action_outcome_receipt',d.outcome_receipt);
    if(!r||!entitled(r,scope)||r.status!=='resolved'||r.source_event!==a.source_event||r.data.action_id!==a.record_key||r.data.actor_ref!==d.actor)return null;
    const refs=[{kind:'typed_intent',key:a.record_key,hash:hash(a)},{kind:'action_outcome_receipt',key:r.record_key,hash:hash(r)}];
    if(r.data.request){
      if(!Array.isArray(r.data.native_roll_refs)||r.data.native_roll_refs.length!==1||typeof r.data.native_roll_refs[0]!=='string')return null;
      const q=db.getCityRecord(guild,'roll_request',r.data.request);if(!q||!entitled(q,scope))return null;
      completedActionSource(db,guild,a.record_key);const proof=typedRollProof(db,guild,q);
      if(proof.outcome==='needs_review'||r.data.outcome!==proof.outcome)return null;
      refs.push({kind:'roll_request',key:q.record_key,hash:hash(q)},
        {kind:'saved_roll',key:proof.roll.id,hash:hash(db.getSavedRoll(guild,proof.roll.id))});
    }else if(r.data.outcome==='resolved_no_roll'){
      historicalActionSource(db,guild,a.record_key,{resolved:true});
      const key=`adjudication:${hash([a.record_key,'no_roll']).slice(0,40)}`,ad=db.getCityRecord(guild,'native_adjudication',key);
      if(ad?.status!=='resolved'||ad.source_event!==a.source_event||ad.data.action_id!==a.record_key||ad.data.disposition!=='resolved'
        ||ad.data.roll_request_ref!==null||ad.data.receipts?.length!==1||ad.data.receipts[0]!==r.record_key
        ||!ad.data.rule_basis_refs?.length||hash(ad.data.rule_basis_refs)!==hash(r.data.rule_refs)
        ||r.data.state_mutations?.length!==0||r.data.native_roll_refs?.length!==0)return null;
      refs.push({kind:'native_adjudication',key:ad.record_key,hash:hash(ad)});
    }else return null;
    const root=d.world_source_event||a.source_event,source=db.getWorldEvent(guild,root),decl=db.getWorldEvent(guild,a.source_event);
    if(!narrativeSourceVisible(db,guild,root,scope)||root!==a.source_event&&(source.kind!=='ai_gm_input'
        ||source.details.author!==d.owner_user_id||source.details.character_id!==d.actor||source.details.text!==decl.details.raw_text
        ||source.session_id!==scene.session_id||source.scene!==scene.key||source.details.revision!==d.actor_principal_revision
        ||source.details.message_id!==decl.details.discord_message_id||!db.ownerAuthoredSource(guild,root,d.owner_user_id)))return null;
    return envelope(scene,scope,'resolved_player_intent',root,[...refs,{kind:'world_event',key:root,hash:hash(source)}],'ranking_only');
  }catch(error){if(['SCENE_ACTION_WINDOW','TYPED_ROLL_PROOF'].includes(error.code))return null;throw error;}
}
function nativeTask(db,guild,row,scope,scene){
  const d=row.data,requested=d.scope;
  if(requested?.mode==='private'&&(scope.mode!=='private'||requested.actorCharacterId!==scope.actorCharacterId||requested.actorUserId!==scope.actorUserId))return null;
  const s=db.getWorldEvent(guild,row.source_event);
  if(d.version!==1||d.authority!=='coverage_only_not_effect_authority'||row.status!=='incomplete'
    ||d.source!==row.source_event||!requested||!s||s.kind!=='ai_gm_input'||s.status!=='active'||typeof s.details.text!=='string'
    ||s.scene!==scene.key||s.session_id!==scene.session_id||!entitled(s,scope)||!narrativeSourceVisible(db,guild,s.event_key,scope)
    ||requested.actorUserId!==s.details.author||requested.actorCharacterId!==s.details.character_id||s.details.private_scene!==(requested.mode==='private')
    ||!db.ownerAuthoredSource(guild,s.event_key,requested.actorUserId)||!ownerScope(db,guild,requested))return null;
  let principal;try{principal=conversationPrincipal(db,guild,requested.actorUserId,requested.actorCharacterId);}
  catch(error){if(['Active session required.','Select an authenticated current controlled role.','Controller attendance required.','Active campaign character required.'].includes(error.message))return null;throw error;}
  if(principal.kind!=='owner'||principal.revision!==s.details.revision||!Array.isArray(d.tasks)||!d.tasks.length||d.tasks.length>32)return null;
  const tasks=d.tasks.filter(t=>{
    const b=t.binding;return b&&t.id===`narrative-task:${hash(b)}`&&hash(b.scope)===hash(requested)&&b.source===s.event_key
      &&b.source_hash===hash(s.details)&&b.scene===scene.key&&b.session===scene.session_id&&b.actor===principal.character_id
      &&b.principal===principal.revision&&Number.isSafeInteger(b.start)&&Number.isSafeInteger(b.end)&&b.start>=0&&b.end>b.start&&b.end<=s.details.text.length
      &&['not_attempted','needs_clarification'].includes(t.disposition);
  });
  if(!tasks.length)return null;
  return envelope(scene,scope,'unresolved_narrative_task',s.event_key,[{kind:'narrative_task_coverage',key:row.record_key,hash:hash(row)},
    {kind:'world_event',key:s.event_key,hash:hash(s)}],'diagnostic_only');
}
function nativeSceneTransition(db,guild,scope,scene){
  if(!scope.actorCharacterId||!scope.actorUserId)return null;
  const pc=db.getCharacter(scope.actorCharacterId);if(pc?.guild_id!==guild||pc.owner_user_id!==scope.actorUserId)return null;
  let principal;try{principal=conversationPrincipal(db,guild,scope.actorUserId,pc.id);}
  catch(error){if(['Active session required.','Select an authenticated current controlled role.','Controller attendance required.','Active campaign character required.'].includes(error.message))return null;throw error;}
  if(principal.kind!=='owner')return null;
  const presence=scenePresence(db,guild,'character',pc.id);
  if(!presence||presence.status!=='active'||presence.data.scene!==scene.key||presence.data.session_id!==scene.session_id
    ||presence.data.entity_type!=='character'||presence.data.entity_key!==pc.id||presence.data.state!=='actually_present'
    ||presence.location_key!==pc.data.location||!presence.source_event||!entitled(presence,scope))return null;
  const arrival=db.getWorldEvent(guild,presence.source_event);
  if(!arrival||arrival.status!=='active'||arrival.kind!=='arrival'||arrival.session_id!==scene.session_id||arrival.scene!==scene.key
    ||arrival.location_key!==presence.location_key||arrival.source_id!==`player:${pc.owner_user_id}`
    ||arrival.details.entity_type!=='character'||arrival.details.entity_key!==pc.id||arrival.details.owner_user_id!==pc.owner_user_id
    ||!entitled(arrival,scope))return null;
  if(!arrival.details.input_source||!arrival.details.declaration)return null;
  const source=db.getWorldEvent(guild,arrival.details.input_source),decl=arrival.details.declaration;
  if(!source||source.event_key!==decl||source.status!=='active'||source.kind!=='ai_gm_input'||source.session_id!==scene.session_id
    ||source.scene!==scene.key||source.details.author!==pc.owner_user_id||source.details.character_id!==pc.id
    ||source.details.revision!==principal.revision||!db.ownerAuthoredSource(guild,source.event_key,pc.owner_user_id)
    ||!narrativeSourceVisible(db,guild,source.event_key,scope)||!narrativeSourceVisible(db,guild,arrival.event_key,scope))return null;
  if(typeof source.details.message_id!=='string'||!source.details.message_id)return null;
  const turnKey=`world-turn:${hash([scene.session_id,source.details.message_id,pc.id]).slice(0,40)}`;
  const actionSuffix=arrival.event_key.slice(turnKey.length);
  if(!/^:action:\d+$/.test(actionSuffix))return null;
  const turn=db.getCityRecord(guild,'autonomous_turn',turnKey);
  if(!turn||turn.status!=='active'||turn.source_event!==source.event_key||turn.data.session_id!==scene.session_id||!entitled(turn,scope))return null;
  const movement=arrival.details.departure;
  if(!movement||movement.location===arrival.location_key||arrival.location_key!==presence.location_key
    ||typeof movement.location!=='string'||!movement.location)return null;
  const matches=(turn.data.results||[]).filter(result=>result.status==='arrived'&&result.source_event===arrival.event_key
    &&result.adjudication?.intent==='movement'&&result.adjudication.mode==='native_resolved'
    &&result.adjudication.source_refs?.length===1&&result.adjudication.source_refs[0]===source.event_key
    &&result.adjudication.verified_receipts?.length===1&&result.adjudication.verified_receipts[0]===arrival.event_key
    &&typeof result.adjudication.source_span==='string'&&result.adjudication.source_span.length>0
    &&source.details.text.includes(result.adjudication.source_span));
  const intents=listNarrativeRecords(db,guild,'typed_intent').filter(row=>row.status==='resolved'
    &&row.data.world_source_event===source.event_key&&row.data.arrival===arrival.event_key&&row.data.type==='move'
    &&row.data.framing==='immediate'&&row.data.resolution==='auto'&&row.data.actor===pc.id&&row.data.owner_user_id===pc.owner_user_id
    &&row.data.session_id===scene.session_id&&row.data.scene===scene.key&&row.data.source_span&&source.details.text.includes(row.data.source_span)
    &&row.data.actor_principal_revision===principal.revision&&row.data.target_key===arrival.location_key
    &&(!row.data.owner_user_id||row.data.owner_user_id===pc.owner_user_id)&&entitled(row,scope));
  const pairs=matches.flatMap(result=>intents.filter(row=>row.data.source_span===result.adjudication.source_span).map(row=>({result,row})));
  if(pairs.length!==1)return null;
  const {row}=pairs[0],root=source.event_key;
  let sourceProof;try{sourceProof=historicalActionSource(db,guild,row.record_key,{resolved:true});}
  catch(error){if(error.code==='SCENE_ACTION_WINDOW')return null;throw error;}
  if(sourceProof.principal.user!==pc.owner_user_id||sourceProof.source.details.author!==pc.owner_user_id)return null;
  if(!['scene','interior','exterior'].includes(presence.data.zone)
    ||!['none','interior','exterior'].includes(row.data.destination_scope)
    ||row.data.destination_scope==='interior'&&presence.data.zone!=='interior'
    ||row.data.destination_scope==='exterior'&&presence.data.zone!=='exterior')return null;
  if(pairs[0].result.key!==arrival.location_key)return null;
  return envelope(scene,scope,'scene_transition',root,[{kind:'typed_intent',key:row.record_key,hash:hash(row)},
    {kind:'autonomous_turn',key:turn.record_key,hash:hash(turn)},{kind:'world_event',key:arrival.event_key,hash:hash(arrival)},
    {kind:'world_event',key:source.event_key,hash:hash(source)},{kind:'scene_presence',key:presence.record_key,hash:hash(presence)}],'ranking_only');
}
/** At most four entitled signals; no scan/write/model loop over background actors. Missing adapters stay absent, not fabricated. */
export function worldNarrativeBridgePacket(db,guild,scope){
  const empty={version:1,signals:[],eligible:0,omitted:0,
    authority:'Native results rank opportunities; diagnostics request coverage. Neither grants knowledge, effects, consent or answered tasks.'};
  if(!db.getActiveSession(guild)||!['party','private'].includes(scope?.mode)||!ownerScope(db,guild,scope))return empty;
  const scene=currentScene(db,guild);
  const found=[];
  for(const a of listNarrativeRecords(db,guild,'typed_intent')){
    const signal=nativeResult(db,guild,a,scope,scene);if(signal)found.push(signal);
  }
  for(const row of listNarrativeRecords(db,guild,'narrative_task_coverage')){
    const signal=nativeTask(db,guild,row,scope,scene);if(signal)found.push(signal);
  }
  const transition=nativeSceneTransition(db,guild,scope,scene);if(transition)found.push(transition);
  const signals=[...new Map(found.map(s=>[s.id,s])).values()];
  return {...empty,signals:signals.slice(0,4),eligible:signals.length,omitted:Math.max(0,signals.length-4)};
}
/** Re-read final source/owner/scene/audience/native result before using a saved bridge proposal after restart. */
export function revalidateWorldNarrativeSignal(db,guild,saved,scope){
  if(saved?.version!==1||saved.protocol!=='narrative_signal_v1')return false;
  // The packet is bounded, so a formerly selected signal that is no longer selected is held rather than silently reused.
  return worldNarrativeBridgePacket(db,guild,scope).signals.some(current=>hash(current)===hash(saved));
}
function nativeDirectorBridge(db,guild,source,scope){
  const actual=source&&db.getWorldEvent(guild,source.event_key),d=source?.details;
  return !!(actual&&hash(actual)===hash(source)&&source.status==='active'&&source.kind==='native_director_narrative_scope'
    &&source.source_id==='native:director'&&source.event_key===`director-fiction:${hash(d)}`&&d?.version===2
    &&hash(d.scope)===hash(scope)&&narrativeSourceVisible(db,guild,source.event_key,scope)
    &&d.world_bridge?.version===1&&Array.isArray(d.world_bridge.signals)&&d.world_bridge.signals.length<=4);
}
/** Sidecar hints only. Never a public message, NPC knowledge, new world change or consent receipt. */
export function worldDirectorBridgeBeats(db,guild,source,scope){
  if(!nativeDirectorBridge(db,guild,source,scope))return null;
  const beats=[];let held=0;
  for(const signal of source.details.world_bridge.signals){
    if(!revalidateWorldNarrativeSignal(db,guild,signal,scope)){held++;continue;}
    beats.push({version:1,protocol:'world_beat_v1',id:`world-beat:${hash([source.event_key,signal.id,signal.audience])}`,kind:'pacing_hint',
      source_ref:source.event_key,signal_ref:signal.id,causation_ref:signal.causation_ref,world_cycle_ref:signal.world_cycle_ref,
      audience:signal.audience,depth:1,origin_kind:'director',reason:signal.kind==='unresolved_narrative_task'?'request_missing_coverage':'consider_native_result_opportunity',
      execution_authority:false,publication_authority:false});
  }
  return {version:1,beats,held,authority:'Pacing only; not fictional facts, speaker knowledge, PC outcomes or native execution authority.'};
}
/** Historical snapshot reader for retrieval weight ONLY; cannot revive a live action or publication grant. */
function activeSignalSnapshot(db,guild,s,scope){
  if(s?.version!==1||s.protocol!=='narrative_signal_v1'||s.depth!==0||hash(s.audience)!==hash(audience(scope))
    ||!['human_action','native_diagnostic'].includes(s.origin_kind)||!Array.isArray(s.source_refs)||s.source_refs.length<2
    ||s.source_refs.length>6||!narrativeSourceVisible(db,guild,s.causation_ref,scope))return false;
  return s.source_refs.every(ref=>{
    const row=ref.kind==='world_event'?db.getWorldEvent(guild,ref.key):ref.kind==='saved_roll'?db.getSavedRoll(guild,ref.key)
      :['typed_intent','action_outcome_receipt','roll_request','native_adjudication','narrative_task_coverage','autonomous_turn','scene_presence'].includes(ref.kind)
        ?db.getCityRecord(guild,ref.kind,ref.key):null;
    if(!row||hash(row)!==ref.hash)return false;
    if(ref.kind==='world_event')return narrativeSourceVisible(db,guild,row.event_key,scope);
    if(ref.kind==='saved_roll')return scope.mode==='private'&&row.character_id===scope.actorCharacterId&&row.discord_user_id===scope.actorUserId;
    return (ref.kind==='narrative_task_coverage'||entitled(row,scope))&&narrativeSourceVisible(db,guild,row.source_event,scope);
  });
}
/** Reprojected Director narration inherits the human cause. Ambiguous/missing ancestry earns no new persistence weight. */
export function canonicalNarrativeCause(db,guild,sourceRef,scope){
  const source=db.getWorldEvent(guild,sourceRef);
  if(source?.kind!=='native_director_narrative_scope'||source.details.version!==2)return sourceRef;
  if(!nativeDirectorBridge(db,guild,source,scope))return null;
  const signals=source.details.world_bridge.signals;if(!signals.length)return sourceRef;
  if(!signals.every(s=>activeSignalSnapshot(db,guild,s,scope)))return null;
  const roots=[...new Set(signals.map(s=>s.causation_ref))];return roots.length===1?roots[0]:null;
}
