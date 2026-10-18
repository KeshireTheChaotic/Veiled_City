/** Read-only native causal signals for the existing GM request. No world effects, disclosure or provider calls. */
import {sceneFictionHash as hash,narrativeSourceVisible} from './scene-fiction-context.js';
import {listNarrativeRecords} from './narrative-records.js';
import {currentScene} from './scene-continuity.js';
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
      refs.push({kind:'roll_request',key:q.record_key,hash:hash(q)});
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
  const signals=[...new Map(found.map(s=>[s.id,s])).values()];
  return {...empty,signals:signals.slice(0,4),eligible:signals.length,omitted:Math.max(0,signals.length-4)};
}
/** Re-read final source/owner/scene/audience/native result before using a saved bridge proposal after restart. */
export function revalidateWorldNarrativeSignal(db,guild,saved,scope){
  if(saved?.version!==1||saved.protocol!=='narrative_signal_v1')return false;
  // The packet is bounded, so a formerly selected signal that is no longer selected is held rather than silently reused.
  return worldNarrativeBridgePacket(db,guild,scope).signals.some(current=>hash(current)===hash(saved));
}
