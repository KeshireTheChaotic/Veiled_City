/** Read-only native causal signals for the existing GM request. No world effects, disclosure or provider calls. */
import {sceneFictionHash as hash,narrativeSourceVisible} from './scene-fiction-context.js';
import {listNarrativeRecords} from './narrative-records.js';
import {currentScene,scenePresence} from './scene-continuity.js';
import {conversationPrincipal} from './conversation-principal.js';
import {completedActionSource,historicalActionSource} from './action-consent.js';
import {typedRollProof} from './typed-roll-proof.js';
import {actorEvidenceVisible} from './npc-cognition-projection.js';
import {activeCityProxy} from './city-constraints.js';
import {inspectOpeningEntryOpportunity} from './session-opening-attendance.js';
import {inspectSessionOpening} from './session-opening.js';
import {assemblyDeliverySummary} from './assembly-state.js';
import {renderNarrativeUnit} from './narrative-authority.js';
import {validateFearEffect} from './pvp-fear-moves.js';
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
    origin_kind:['unresolved_narrative_task','opening_opportunity_request'].includes(kind)?'native_diagnostic':'human_action',source_refs:refs,
    authority_disposition:disposition,execution_authority:false,publication_authority:false};
}
/** Exact-owner operational request only. This does NOT make the GM-private receipt a visible fictional event. */
function nativeOpeningRequest(db,guild,scope,scene){
  const initial=nativeInitialOpeningRequest(db,guild,scope,scene);if(initial)return initial;
  if(scope.mode!=='private'||db.getSession(scene.session_id)?.assembly_mode==='manual')return null;
  try{
    const principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId);
    if(principal.kind!=='owner'||!db.roster(scene.session_id).some(r=>r.character_id===scope.actorCharacterId
      &&r.discord_user_id===scope.actorUserId&&['present','late','guest'].includes(r.presence)))return null;
    const key=`opening-entry:${hash([scene.session_id,scope.actorCharacterId,principal.revision])}`;
    if(!db.getCityRecord(guild,'opening_entry_opportunity',key))return null;
    const request=inspectOpeningEntryOpportunity(db,guild,key),delivery=db.getCityRecord(guild,'opening_entry_delivery',key),
      rows=delivery?.data.turn_id?db.listTurnPublications(guild,delivery.data.turn_id):[];
    if(delivery?.source_event===request.source_event&&delivery.data.evidence?.hook_verified===true
      &&rows.length&&rows.every(r=>r.status==='delivered'&&r.discord_message_id))return null;
    const source=db.getWorldEvent(guild,request.source_event);
    return envelope(scene,scope,'opening_opportunity_request',source.event_key,
      [{kind:'opening_entry_opportunity',key:request.record_key,hash:hash(request)},{kind:'world_event',key:source.event_key,hash:hash(source)}],'diagnostic_only');
  }catch(error){
    if(error.code==='SESSION_OPENING_ATTENDANCE'||['Active session required.','Select an authenticated current controlled role.',
      'Controller attendance required.','Active campaign character required.'].includes(error.message))return null;
    throw error;
  }
}
/** Initial/camera coverage uses the authenticated start job, not a fabricated owner check-in or fictional event. */
function nativeInitialOpeningRequest(db,guild,scope,scene){
  if(db.getSession(scene.session_id)?.assembly_mode==='manual'||!db.getCityRecord(guild,'session_opening_job',scene.session_id))return null;
  try{
    const job=inspectSessionOpening(db,guild,scene.session_id),privateScope=scope.mode==='private';
    if(['completed','held_manual'].includes(job.status))return null; // Closed delivery is not permission to retry generation, even after a truthful fallback.
    if(privateScope){
      const principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId);
      if(principal.kind!=='owner'||!job.data.origin.roster.some(p=>p.character===scope.actorCharacterId&&p.user===scope.actorUserId))return null;
    }
    const session=db.getActiveSession(guild),slot=assemblyDeliverySummary(db,guild,session).find(s=>s.scope.mode===scope.mode
      &&(!privateScope||s.scope.actorCharacterId===scope.actorCharacterId&&s.scope.actorUserId===scope.actorUserId));
    if(!slot||['delivered','legacy_delivered'].includes(slot.status)
      &&(privateScope?slot.evidence.hook_verified===true:slot.evidence.narrative_verified===true))return null;
    const source=db.getWorldEvent(guild,job.source_event);
    return envelope(scene,scope,'opening_opportunity_request',source.event_key,
      [{kind:'session_opening_job',key:job.record_key,hash:hash(job)},{kind:'world_event',key:source.event_key,hash:hash(source)}],'diagnostic_only');
  }catch(error){
    if(error.code==='SESSION_OPENING'||['Active session required.','Select an authenticated current controlled role.',
      'Controller attendance required.','Active campaign character required.'].includes(error.message))return null;
    throw error;
  }
}
/** Opening planning needs its own diagnostic only, not repeated scans of every scene result/task/NPC memory. */
export function openingOpportunityRequests(db,guild,scope){
  if(!db.getActiveSession(guild)||!['party','private'].includes(scope?.mode)||!ownerScope(db,guild,scope))return [];
  const signal=nativeOpeningRequest(db,guild,scope,currentScene(db,guild));return signal?[signal]:[];
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
function nativeSceneTransition(db,guild,scope,scene,actorCharacterId,actorUserId){
  if(!actorCharacterId||!actorUserId)return null;
  const pc=db.getCharacter(actorCharacterId);if(pc?.guild_id!==guild||pc.owner_user_id!==actorUserId)return null;
  const proofScope=scope.mode==='party'?{mode:'private',actorCharacterId:pc.id,actorUserId:pc.owner_user_id}:scope;
  const boundaryEligible=row=>scope.mode==='party'?['public','party'].includes(row.visibility):entitled(row,proofScope);
  let principal;try{principal=conversationPrincipal(db,guild,actorUserId,pc.id);}
  catch(error){if(['Active session required.','Select an authenticated current controlled role.','Controller attendance required.','Active campaign character required.'].includes(error.message))return null;throw error;}
  if(principal.kind!=='owner')return null;
  const presence=scenePresence(db,guild,'character',pc.id);
  if(!presence||presence.status!=='active'||presence.data.scene!==scene.key||presence.data.session_id!==scene.session_id
    ||presence.data.entity_type!=='character'||presence.data.entity_key!==pc.id||presence.data.state!=='actually_present'
    ||presence.location_key!==pc.data.location||!presence.source_event||!boundaryEligible(presence))return null;
  const arrival=db.getWorldEvent(guild,presence.source_event);
  if(!arrival||arrival.status!=='active'||arrival.kind!=='arrival'||arrival.session_id!==scene.session_id||arrival.scene!==scene.key
    ||arrival.location_key!==presence.location_key||arrival.source_id!==`player:${pc.owner_user_id}`
    ||arrival.details.entity_type!=='character'||arrival.details.entity_key!==pc.id||arrival.details.owner_user_id!==pc.owner_user_id
    ||!boundaryEligible(arrival))return null;
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
  if(!turn||turn.status!=='active'||turn.source_event!==source.event_key||turn.data.session_id!==scene.session_id||!boundaryEligible(turn))return null;
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
    &&(!row.data.owner_user_id||row.data.owner_user_id===pc.owner_user_id)&&boundaryEligible(row));
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
function nativeConversationSignals(db,guild,scope,scene){
  const signals=[];
  for(const speech of db.listWorldEvents(guild,{includeGM:true,limit:160})){
    const d=speech.details||{};
    if(speech.status!=='active'||speech.kind!=='authored_speech'||speech.session_id!==scene.session_id||speech.scene!==scene.key
      ||speech.source_id!==`player:${d.author}`||!d.typed_intent||!d.input_source||!Array.isArray(d.listeners)||!d.listeners.length
      ||typeof d.quote!=='string'||!d.quote||!d.character_id||!d.principal_revision)continue;
    if(scope.mode==='private'&&(scope.actorCharacterId!==d.character_id||scope.actorUserId!==d.author))continue;
    if(scope.mode==='party'&&d.private_scene===true)continue;
    const typed=db.getCityRecord(guild,'typed_intent',d.typed_intent),t=typed?.data;
    if(!typed||typed.status!=='accepted_for_adjudication'||typed.source_event!==d.input_source||t.type!=='speak'||t.framing!=='immediate'
      ||t.session_id!==scene.session_id||t.scene!==scene.key
      ||t.actor!==d.character_id||t.owner_user_id!==d.author||t.utterance!==d.quote||t.actor_principal_revision!==d.principal_revision)continue;
    const source=db.getWorldEvent(guild,t.world_source_event),ownerEnvelope=db.getWorldEvent(guild,typed.source_event),pc=db.getCharacter(d.character_id);
    if(!source||source.status!=='active'||source.kind!=='ai_gm_input'||source.session_id!==scene.session_id||source.scene!==scene.key
      ||source.details.author!==d.author||source.details.character_id!==d.character_id||source.details.revision!==d.principal_revision
      ||pc?.owner_user_id!==d.author||!db.ownerAuthoredSource(guild,source.event_key,d.author)
      ||!narrativeSourceVisible(db,guild,source.event_key,scope)||!source.details.text?.includes(d.quote)
      ||!ownerEnvelope||ownerEnvelope.status!=='active'||ownerEnvelope.kind!=='authored_turn'||ownerEnvelope.details.author!==d.author
      ||ownerEnvelope.details.character_id!==d.character_id||ownerEnvelope.details.principal_revision!==d.principal_revision
      ||ownerEnvelope.details.raw_text!==source.details.text||ownerEnvelope.details.raw_hash!==t.source_hash
      ||!db.ownerAuthoredSource(guild,ownerEnvelope.event_key,d.author)
      ||speech.details.input_source!==typed.source_event||!db.ownerAuthoredSource(guild,speech.event_key,d.author))continue;
    let principal;try{principal=conversationPrincipal(db,guild,d.author,d.character_id);}
    catch(error){if(['Active session required.','Select an authenticated current controlled role.','Controller attendance required.','Active campaign character required.'].includes(error.message))continue;throw error;}
    if(principal.kind!=='owner'||principal.revision!==d.principal_revision)continue;
    for(const npc of [...new Set(d.listeners)].slice(0,12)){
      if(typeof npc!=='string'||!npc)continue;
      if(activeCityProxy(db,guild,npc))continue;
      const presence=scenePresence(db,guild,'npc',npc),state=db.getSimulationEntity(guild,'npc',npc)?.state;
      const presenceSource=presence?.source_event&&db.getWorldEvent(guild,presence.source_event);
      if(!presence||presence.status!=='active'||presence.data.scene!==scene.key||presence.data.state!=='actually_present'
        ||presence.location_key!==state?.location_key||!presenceSource||presenceSource.status!=='active'
        ||presenceSource.session_id!==scene.session_id||presenceSource.scene!==scene.key||presenceSource.location_key!==presence.location_key
        ||!narrativeSourceVisible(db,guild,presenceSource.event_key,scope)||!db.getNpcProfile(guild,npc))continue;
      const memory=db.listNpcMemories(guild,npc,{status:'active',limit:200}).find(row=>row.source_ref===speech.event_key
        &&row.source_type==='heard'&&actorEvidenceVisible(db,guild,npc,row,scope));
      if(!memory)continue;
      const refs=[{kind:'npc_memory',key:memory.id,actor:npc,hash:hash(memory)},
        {kind:'scene_presence',key:presence.record_key,actor:npc,hash:hash(presence)},
        {kind:'world_event',key:speech.event_key,hash:hash(speech)},{kind:'typed_intent',key:typed.record_key,hash:hash(typed)},
        {kind:'world_event',key:source.event_key,hash:hash(source)}];
      signals.push(envelope(scene,scope,'conversation_development',source.event_key,refs,'ranking_only'));
    }
  }
  return signals;
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
  const transitionActors=scope.mode==='private'?[{character_id:scope.actorCharacterId,user_id:scope.actorUserId}]
    :db.roster(scene.session_id).filter(row=>['present','late','guest'].includes(row.presence)).slice(0,30)
      .map(row=>({character_id:row.character_id,user_id:db.getCharacter(row.character_id)?.owner_user_id}));
  for(const actor of transitionActors){
    const transition=nativeSceneTransition(db,guild,scope,scene,actor.character_id,actor.user_id);if(transition)found.push(transition);
  }
  found.push(...nativeConversationSignals(db,guild,scope,scene));
  const opening=nativeOpeningRequest(db,guild,scope,scene);
  if(opening){if(opening.source_refs[0].kind==='session_opening_job')found.unshift(opening);else found.push(opening);}
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
const FEAR_EFFECT_RECORD_SCAN_LIMIT=500;
const FEAR_EFFECT_VALIDATION_LIMIT=32;
function fearClockAudience(db,guild,row,scope){
  if(scope.mode==='party')return row.visibility==='party'&&row.subject_key==null;
  const pc=db.getCharacter(scope.actorCharacterId);
  return !!scope.actorUserId&&pc?.guild_id===guild&&pc.owner_user_id===scope.actorUserId
    &&row.visibility==='character'&&row.subject_key===scope.actorCharacterId;
}
/** Exact committed clock-effect proof. Labels, prose and GM visibility are not outcome authority. */
function nativeFearClockEffect(db,guild,key,scope,scene){
  const row=db.getCityRecord(guild,'pvp_fear_effect_receipt',key),d=row?.data;
  if(!row||row.status!=='resolved'||!d||!['clock_advance','clock_create_and_advance'].includes(d.move_kind)
    ||d.session!==scene.session_id||d.scene!==scene.key||!fearClockAudience(db,guild,row,scope))return null;
  try{validateFearEffect(db,guild,row.record_key);}
  catch(error){if(error.code==='NARRATIVE_PVP')return null;throw error;}
  const context=db.getCityRecord(guild,'pvp_fear_context',d.context),source=db.getWorldEvent(guild,d.source_event);
  if(!context||context.status!=='active'||context.record_key!==d.context||context.source_event!==d.source_event
    ||context.data.move_kind!==d.move_kind||context.data.target_key!==d.target||context.data.scene!==scene.key
    ||context.data.session!==scene.session_id||context.location_key!==source?.location_key||source?.status!=='active'
    ||source.kind!=='pvp_fear_context_established'||source.session_id!==scene.session_id||source.scene!==scene.key
    ||source.location_key!==context.location_key||source.visibility!==row.visibility||source.subject_key!==row.subject_key
    ||!narrativeSourceVisible(db,guild,source.event_key,scope))return null;
  let principalRevision=null;
  if(scope.mode==='private'){
    let principal;
    try{principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId);}
    catch(error){if(['Active session required.','Select an authenticated current controlled role.','Controller attendance required.','Active campaign character required.'].includes(error.message))return null;throw error;}
    if(principal.kind!=='owner'||context.subject_key!==scope.actorCharacterId||context.data.subject_key!==scope.actorCharacterId)return null;
    principalRevision=principal.revision;
  }else if(context.visibility!=='party'||context.subject_key!==null||context.data.visibility!=='party'||context.data.subject_key!==null)return null;
  const trigger=db.getCityRecord(guild,'pvp_fear_trigger',d.trigger);
  if(!trigger||trigger.status!=='resolved'||trigger.data.effect!==row.record_key||trigger.data.session!==scene.session_id
    ||trigger.data.scene!==scene.key)return null;
  return {row,source,context,trigger,causation:source.event_key,principalRevision};
}
/** Snapshot direct keys for bounded current-scene Fear clock receipts. */
export function nativeFearClockConsequenceSnapshot(db,guild,scope){
  const scene=currentScene(db,guild),receipts=[];let overflow=false,scanned=0,validated=0,offset=0;
  for(;offset<FEAR_EFFECT_RECORD_SCAN_LIMIT;offset+=100){
    const page=db.listCityRecords(guild,{kind:'pvp_fear_effect_receipt',query:scene.key,includeGM:scope.mode==='private',limit:100,offset});
    for(const candidate of page){
      if(candidate.status!=='resolved'||candidate.data?.scene!==scene.key||candidate.data?.session!==scene.session_id
        ||!['clock_advance','clock_create_and_advance'].includes(candidate.data?.move_kind)
        ||!fearClockAudience(db,guild,candidate,scope))continue;
      scanned++;
      if(validated>=FEAR_EFFECT_VALIDATION_LIMIT){overflow=true;break;}
      validated++;
      const proof=nativeFearClockEffect(db,guild,candidate.record_key,scope,scene);if(!proof)continue;
      receipts.push({kind:'pvp_fear_effect_receipt',key:proof.row.record_key,revision:hash(proof.row),
        source_event:proof.source.event_key,source_revision:hash(proof.source),causation_ref:proof.causation,
        audience:audience(scope),session:scene.session_id,scene:scene.key,
        ...(proof.principalRevision?{principal_revision:proof.principalRevision}:{})});
    }
    if(overflow)break;
    if(page.length<100)break;
    if(offset+page.length>=FEAR_EFFECT_RECORD_SCAN_LIMIT)overflow=true;
  }
  return {version:1,receipts:receipts.slice(0,4),omitted:Math.max(0,receipts.length-4),overflow,scanned,validated};
}
/** Audience-bound Director beat metadata only; never a message, knowledge, consent or native outcome. */
export function worldDirectorBridgeBeats(db,guild,source,scope){
  if(!nativeDirectorBridge(db,guild,source,scope))return null;
  const beats=[];let held=0,omitted=0;
  const scene=currentScene(db,guild);
  // Only project scene observations that were already established by the native
  // audience-bound narrative authority. Re-render with the original binding
  // scope on every read; the Director snapshot is a selector, not proof.
  for(const proof of source.details.dramatic_brief?.events||[]){
    if(beats.length>=4)break;
    if(proof.kind!=='native_narrative_unit')continue;
    const event=db.getWorldEvent(guild,proof.ref),unitKey=typeof proof.ref==='string'&&proof.ref.endsWith(':source')
      ?proof.ref.slice(0,-':source'.length):null,row=unitKey&&db.getCityRecord(guild,'narrative_unit',unitKey);
    if(!event||event.status!=='active'||event.kind!=='native_narrative_unit'||event.source_id!=='native:narrative-authority'
      ||hash(event)!==proof.revision||event.session_id!==scene.session_id||event.scene!==scene.key
      ||!narrativeSourceVisible(db,guild,event.event_key,scope)||!row||row.record_key!==unitKey||row.status!=='accepted_established'
      ||row.source_event!==event.event_key){held++;continue;}
    const data=row.data,binding=data?.binding,origin=binding?.source&&db.getWorldEvent(guild,binding.source),pc=binding?.scope?.actorCharacterId
      &&db.getCharacter(binding.scope.actorCharacterId);
    const privateAudience=scope.mode==='private',privateBinding=binding?.scope?.mode==='private',audienceValid=privateAudience===privateBinding
      &&(privateAudience?row.visibility==='character'&&row.subject_key===scope.actorCharacterId&&event.visibility==='character'
        &&event.subject_key===scope.actorCharacterId&&origin?.visibility==='character'&&origin?.subject_key===scope.actorCharacterId
        &&binding.scope.actorCharacterId===scope.actorCharacterId&&binding.scope.actorUserId===scope.actorUserId
        :row.visibility==='party'&&row.subject_key==null&&event.visibility==='party'&&(event.subject_key==null||event.subject_key==='')
          &&origin?.visibility==='party'&&(origin?.subject_key==null||origin?.subject_key===''));
    if(!origin||!audienceValid||data?.issuer!=='native:narrative-authority'||data?.unit?.visibility!==row.visibility
      ||data?.unit?.kind!=='scene'||data?.unit?.epistemic!=='observation'||event.details?.payload_hash!==hash(data)
      ||event.details?.epistemic!=='observation'||event.details?.input_source!==binding?.source
      ||binding.session!==scene.session_id||binding.scene!==scene.key||binding.location!==event.location_key
      ||binding.viewpoint!=='character'||!binding.placement||origin.details?.private_scene!==privateBinding
      ||origin.status!=='active'||origin.kind!=='ai_gm_input'||origin.session_id!==scene.session_id||origin.scene!==scene.key
      ||origin.details.author!==binding.scope.actorUserId||origin.details.character_id!==binding.scope.actorCharacterId
      ||pc?.guild_id!==guild||pc.owner_user_id!==binding.scope.actorUserId||!db.ownerAuthoredSource(guild,origin.event_key,pc.owner_user_id)
      ||!narrativeSourceVisible(db,guild,origin.event_key,scope)) {held++;continue;}
    let principal;try{principal=conversationPrincipal(db,guild,pc.owner_user_id,pc.id);}
    catch(error){if(['Active session required.','Select an authenticated current controlled role.','Controller attendance required.','Active campaign character required.'].includes(error.message)){held++;continue;}throw error;}
    if(principal.kind!=='owner'||principal.revision!==origin.details.revision||principal.character_id!==pc.id){held++;continue;}
    try{renderNarrativeUnit(db,guild,row.record_key,binding.scope);}
    catch(error){if(['SCENE_FICTION','NARRATIVE_PVP'].includes(error.code)){held++;continue;}throw error;}
    const root=origin.event_key,cycle=`world-cycle:${hash([scene.session_id,scene.key,root])}`;
    beats.push({version:1,protocol:'world_beat_v1',id:`world-beat:${hash([source.event_key,event.event_key,scope.mode])}`,
      kind:'established_world_change',source_ref:source.event_key,signal_ref:event.event_key,causation_ref:root,world_cycle_ref:cycle,
      audience:audience(scope),depth:1,origin_kind:'director',epistemic:'observation',fictional_scope:'nonmechanical_established_scene',
      location:event.location_key||'',reason:'native_established_scene_unit',execution_authority:false,publication_authority:false});
  }
  const consequences=source.details.dramatic_brief?.native_clock_consequences;
  if(consequences){
    if(consequences.version!==1||!Array.isArray(consequences.receipts)||consequences.receipts.length>4)held++;
    else for(const [index,proof] of consequences.receipts.entries()){
      if(beats.length>=4){omitted+=consequences.receipts.length-index;break;}
      const current=currentScene(db,guild),validated=nativeFearClockEffect(db,guild,proof.key,scope,current),event=validated?.source;
      if(!validated||proof.kind!=='pvp_fear_effect_receipt'||hash(validated.row)!==proof.revision
        ||event.event_key!==proof.source_event||hash(event)!==proof.source_revision||proof.session!==current.session_id
        ||proof.scene!==current.key||hash(proof.audience)!==hash(audience(scope))
        ||proof.causation_ref!==validated.causation
        ||scope.mode==='private'&&proof.principal_revision!==validated.principalRevision
        ||!narrativeSourceVisible(db,guild,proof.causation_ref,scope)){held++;continue;}
      const root=proof.causation_ref,cycle=`world-cycle:${hash([current.session_id,current.key,root])}`;
      beats.push({version:1,protocol:'world_beat_v1',id:`world-beat:${hash([source.event_key,proof.key,proof.audience])}`,
        kind:'world_consequence',source_ref:source.event_key,signal_ref:proof.key,effect_ref:proof.key,source_event_ref:event.event_key,
        causation_ref:root,world_cycle_ref:cycle,audience:proof.audience,depth:1,origin_kind:'native_consequence',
        consequence:'committed_native_clock_change',location:event.location_key||'',reason:'validated_native_fear_clock_receipt',
        execution_authority:false,publication_authority:false});
    }
  }
  for(const signal of source.details.world_bridge.signals){
    if(!revalidateWorldNarrativeSignal(db,guild,signal,scope)){held++;continue;}
    if(beats.length>=4){omitted++;continue;}
    beats.push({version:1,protocol:'world_beat_v1',id:`world-beat:${hash([source.event_key,signal.id,signal.audience])}`,kind:'pacing_hint',
      source_ref:source.event_key,signal_ref:signal.id,causation_ref:signal.causation_ref,world_cycle_ref:signal.world_cycle_ref,
      audience:signal.audience,depth:1,origin_kind:'director',reason:signal.kind==='opening_opportunity_request'?'request_opening_opportunity':
        signal.kind==='unresolved_narrative_task'?'request_missing_coverage':'consider_native_result_opportunity',
      execution_authority:false,publication_authority:false});
  }
  const sidecar=source.details.dramatic_brief?.native_clock_consequences;
  return {version:1,beats,held,...(sidecar?{omitted:omitted+Number(sidecar.omitted||0),omission_truncated:sidecar.overflow===true}:{}),
    authority:'Source-bound scene fiction and pacing metadata only; no knowledge, consent, publication or native execution authority.'};
}
/** Historical snapshot reader for retrieval weight ONLY; cannot revive a live action or publication grant. */
function activeSignalSnapshot(db,guild,s,scope){
  if(s?.kind==='opening_opportunity_request')return false; // Attendance never earns fictional interest/canon weight, including after restart.
  if(s?.version!==1||s.protocol!=='narrative_signal_v1'||s.depth!==0||hash(s.audience)!==hash(audience(scope))
    ||!['human_action','native_diagnostic'].includes(s.origin_kind)||!Array.isArray(s.source_refs)||s.source_refs.length<2
    ||s.source_refs.length>6||!narrativeSourceVisible(db,guild,s.causation_ref,scope))return false;
  return s.source_refs.every(ref=>{
    const row=ref.kind==='world_event'?db.getWorldEvent(guild,ref.key):ref.kind==='saved_roll'?db.getSavedRoll(guild,ref.key)
      :['typed_intent','action_outcome_receipt','roll_request','native_adjudication','narrative_task_coverage','autonomous_turn','scene_presence'].includes(ref.kind)
        ?db.getCityRecord(guild,ref.kind,ref.key):null;
    if(ref.kind==='npc_memory'){
      if(typeof ref.actor!=='string'||!ref.actor||typeof ref.key!=='string')return false;
      const memory=db.listNpcMemories(guild,ref.actor,{status:'active',limit:200}).find(m=>m.id===ref.key);
      return !!memory&&hash(memory)===ref.hash&&actorEvidenceVisible(db,guild,ref.actor,memory,scope);
    }
    if(ref.kind==='scene_presence'&&ref.actor){
      if(typeof ref.key!=='string'||typeof ref.actor!=='string')return false;
      const presence=db.getCityRecord(guild,'scene_presence',ref.key),source=presence?.source_event&&db.getWorldEvent(guild,presence.source_event),
        npcState=db.getSimulationEntity(guild,'npc',ref.actor)?.state;
      return !!presence&&hash(presence)===ref.hash&&presence.data.entity_type==='npc'&&presence.data.entity_key===ref.actor
        &&presence.data.state==='actually_present'&&presence.data.scene===currentScene(db,guild).key
        &&presence.location_key===npcState?.location_key&&!activeCityProxy(db,guild,ref.actor)
        &&source?.status==='active'&&source.scene===presence.data.scene&&source.location_key===presence.location_key
        &&narrativeSourceVisible(db,guild,source.event_key,scope);
    }
    if(!row||hash(row)!==ref.hash)return false;
    if(ref.kind==='world_event')return row.kind==='authored_speech'
      ?s.source_refs.some(memoryRef=>memoryRef.kind==='npc_memory'&&memoryRef.actor&&memoryRef.key
        &&db.listNpcMemories(guild,memoryRef.actor,{status:'active',limit:200}).some(memory=>memory.id===memoryRef.key
          &&memory.source_ref===row.event_key&&actorEvidenceVisible(db,guild,memoryRef.actor,memory,scope)))
      :narrativeSourceVisible(db,guild,row.event_key,scope);
    if(ref.kind==='saved_roll')return scope.mode==='private'&&row.character_id===scope.actorCharacterId&&row.discord_user_id===scope.actorUserId;
    return (ref.kind==='narrative_task_coverage'||entitled(row,scope))&&narrativeSourceVisible(db,guild,row.source_event,scope);
  });
}
/** Reprojected Director narration inherits the human cause. Ambiguous/missing ancestry earns no new persistence weight. */
export function canonicalNarrativeCause(db,guild,sourceRef,scope){
  const source=db.getWorldEvent(guild,sourceRef);
  if(source?.kind!=='native_director_narrative_scope'||source.details.version!==2)return sourceRef;
  if(!nativeDirectorBridge(db,guild,source,scope))return null;
  const signals=source.details.world_bridge.signals,sidecar=source.details.dramatic_brief?.native_clock_consequences,
    consequences=sidecar?.receipts||[];
  if(sidecar&&(sidecar.version!==1||sidecar.overflow||sidecar.omitted||!Array.isArray(sidecar.receipts)||sidecar.receipts.length>4))return null;
  if(!signals.length&&!consequences.length)return sourceRef;
  if(!signals.every(s=>activeSignalSnapshot(db,guild,s,scope)))return null;
  const scene=currentScene(db,guild);
  for(const proof of consequences){
    const current=nativeFearClockEffect(db,guild,proof.key,scope,scene),event=current?.source;
    if(!current||proof.kind!=='pvp_fear_effect_receipt'||hash(current.row)!==proof.revision||event?.event_key!==proof.source_event
      ||hash(event)!==proof.source_revision||proof.session!==scene.session_id||proof.scene!==scene.key
      ||hash(proof.audience)!==hash(audience(scope))||proof.causation_ref!==current.causation
      ||scope.mode==='private'&&proof.principal_revision!==current.principalRevision
      ||!narrativeSourceVisible(db,guild,proof.causation_ref,scope))return null;
  }
  const roots=[...new Set([...signals.map(s=>s.causation_ref),...consequences.map(c=>c.causation_ref)])];return roots.length===1?roots[0]:null;
}
