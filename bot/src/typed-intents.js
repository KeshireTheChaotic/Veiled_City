/** Model-semantic, authenticated owner intents; no action-verb whitelist and no model-granted consequences. */
import { createHash } from 'node:crypto';
import {intentSessionPrincipal} from './frameworks/intent/public.js';
function conversationPrincipal(...args){return intentSessionPrincipal.conversationPrincipal(...args);}
import {intentSessionScene} from './frameworks/intent/public.js';
const {currentScene}=intentSessionScene;
import {intentWorldInputKey} from './frameworks/intent/public.js';
function worldInputKey(...args){return intentWorldInputKey.worldInputKey(...args);}
import {stateRevision} from './kernel/state-revision.js';
import {intentWorldOperations} from './frameworks/intent/public.js';
function resolvePlaceReference(...args){return intentWorldOperations.resolvePlaceReference(...args);}
import {intentSessionDialogue} from './frameworks/intent/public.js';
const {captureDialogue}=intentSessionDialogue;
import { intentKnowledgeMemory } from './frameworks/intent/public.js';
import {gmRulingSchema,validateGmRulingProposal} from './gm-ruling-schema.js';
import {intentOwnerActionTerminal} from './frameworks/intent/public.js';
function overlapsOwnerActionTerminal(...args){return intentOwnerActionTerminal.overlapsOwnerActionTerminal(...args);}
import {isCharacterSourceSpan,sourceSpanInsideQuote} from './frameworks/intent/public.js';
import {
  authoredTurnEnvelope,
  captureAuthoredTurnEnvelope,
  overlapsConsumedSpan
} from './frameworks/intent/public.js';

const digest = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0,32);

import {createPlayerIntentContract} from './frameworks/intent/public.js';
export const {playerIntentSchema,PLAYER_INTENT_PROMPT}=createPlayerIntentContract({gmRulingSchema});

function error(message,diagnostic={}){
  return Object.assign(new Error(message),{code:'PLAYER_INTENT',diagnostic});
}

function occurrenceOffsets(source,span){
  const rows=[];
  if(typeof span!=='string'||!span)return rows;
  for(let start=source.indexOf(span);start>=0;start=source.indexOf(span,start+Math.max(1,span.length)))
    rows.push({start,end:start+span.length});
  return rows;
}

import {proposalIdentity,validateProposal} from './frameworks/intent/public.js';
export {validateProposal};

import {proposeIntents,acceptIntentForAdjudication,resolvePendingReferent,currentAcceptedIntent} from './frameworks/intent/public.js';
export {proposeIntents,acceptIntentForAdjudication,resolvePendingReferent,currentAcceptedIntent};

function legacyProposals(intents,envelope){
  const cursor=new Map();
  const proposals=intents.map((intent,index)=>{
    let start=cursor.get(intent.source_span)||0;
    start=envelope.raw_text.indexOf(intent.source_span,start);
    cursor.set(intent.source_span,start<0?envelope.raw_text.length:start+intent.source_span.length);
    return {version:2,proposal_id:'',source_event:envelope.source_event,start,end:start+intent.source_span.length,
      source_span:intent.source_span,actor_character_id:envelope.character_id,sequence_index:index,dependencies:[],
      type:intent.type,operation:intent.operation||intent.type,
      target:{kind:intent.type==='speak'?'npc':intent.type==='move'||intent.type==='local_zone'?'location':'unknown',
        key:intent.target_key||null,phrase:intent.target_name||'',grounding:intent.target_key?'known':intent.target_name?'candidate':'unknown'},
      framing:intent.framing,destination_scope:intent.destination==='unspecified'?'none':intent.destination,
      attempted_action:intent.source_span,desired_outcome:null,authored_outcome_claim:null,temporal_relation:'sequential'};
  });
  const ids=proposals.map(proposal=>proposalIdentity(proposal));
  return proposals.map((proposal,index)=>({...proposal,dependencies:(intents[index].depends_on||[]).map(dep=>ids[dep])}));
}

export function validatePlayerIntents(intents,source,scope={}){
  if(!Array.isArray(intents)||intents.length>12)throw error('Bounded model-derived intent list required.');
  if(typeof source!=='string'||source.length>4000)throw error('Current authenticated message required.');
  const seen=new Set(),occurrenceCursor=new Map();
  for(const [i,intent] of intents.entries()){
    const keys=Object.keys(intent||{}).sort().join(','),legacy='destination,excluded_targets,framing,operation,reason,resolution,source_span,target_key,target_name,type,utterance';
    const forms=[legacy,`${legacy},depends_on`,`${legacy},native_adjudication`,`${legacy},depends_on,native_adjudication`,
      `${legacy},coordination`,`${legacy},depends_on,coordination`,`${legacy},native_adjudication,coordination`,
      `${legacy},depends_on,native_adjudication,coordination`]
      .flatMap(value=>[value,`${value},gm_ruling`]).map(value=>value.split(',').sort().join(','));
    if(!intent||!forms.includes(keys))
      throw error('Closed semantic intent schema required.',{index:i});
    for(const [field,max] of [['source_span',1200],['target_key',160],['target_name',160],['operation',100],['utterance',1000],['reason',400]])
      if(typeof intent[field]!=='string'||intent[field].length>max)throw error('Bounded semantic intent fields required.',{index:i,field});
    if(!Array.isArray(intent.excluded_targets)||intent.excluded_targets.length>8||intent.excluded_targets.some(x=>typeof x!=='string'||x.length>160))
      throw error('Invalid excluded destination constraints.',{index:i});
    if(intent.depends_on&&(!Array.isArray(intent.depends_on)||new Set(intent.depends_on).size!==intent.depends_on.length
      ||intent.depends_on.some(dep=>!Number.isSafeInteger(dep)||dep<0||dep>=i)))
      throw error('Dependencies must name unique earlier action indices.',{index:i});
    for(const [field,allowed] of [['type',['move','local_zone','observe','search','interact','speak','roll','consent','other']],
      ['framing',['immediate','hypothetical','conditional','quoted','reported']],
      ['resolution',['auto','roll_required','blocked','needs_clarification','conversational']],
      ['destination',['exterior','interior','zone','unspecified']]])
      if(!allowed.includes(intent[field]))throw error('Unknown semantic intent enumeration.',{index:i,field});
    const occurrences=occurrenceOffsets(source,intent.source_span),ordinal=occurrenceCursor.get(intent.source_span)||0;
    const occurrence=occurrences[ordinal];
    if(!occurrence)throw error('Intent span must occur in the current authored message.',{
      index:i,category:'unmatched_source_span',nearby_offsets:{start:0,end:source.length}
    });
    occurrenceCursor.set(intent.source_span,ordinal+1);
    if(intent.type==='speak'&&(!intent.utterance||!intent.source_span.includes(intent.utterance)))
      throw error('A spoken utterance must be authored verbatim in its own source span.',{index:i});
    const id=`${intent.type}:${occurrence.start}:${occurrence.end}`;
    if(seen.has(id))throw error('An action cannot be applied twice from the same source span.',{index:i});
    seen.add(id);
    // The model identifies quotation/agency, but native refuses execution on any non-immediate framing.
    if(intent.framing!=='immediate'&&intent.resolution==='auto')throw error('Non-immediate intent cannot authorize an automatic effect.',{index:i});
    if(['roll','consent'].includes(intent.type)&&intent.resolution==='auto')
      throw error('Model interpretation cannot authorize dice, spending or binding consent.',{index:i});
    if(intent.gm_ruling){
      validateGmRulingProposal(intent.gm_ruling);
      if(intent.native_adjudication||intent.framing!=='immediate'
        ||intent.resolution==='auto'&&intent.gm_ruling.disposition!=='narrative_no_roll'
        ||intent.resolution==='roll_required'&&intent.gm_ruling.disposition!=='standard_action_roll'
        ||intent.resolution==='conversational')throw error('GM ruling must match a single immediate disposition.',{index:i});
    }else if(intent.resolution==='roll_required'){
      const a=intent.native_adjudication;
      if(!a||Object.keys(a).sort().join(',')!==['attack_source','difficulty','explanation','homebrew_refs','house_refs','kind',
        'modifier_keys','override_refs','raw_refs','risk','saved_ruling_key','stakes','trait'].sort().join(',')
        ||!Number.isSafeInteger(a.difficulty)||a.difficulty<0||a.difficulty>100||!a.risk?.trim()||!a.stakes?.trim()
        ||!a.explanation?.trim())throw error('Roll-required intent needs a complete grounded native adjudication.',{index:i});
    }else if(intent.native_adjudication)throw error('Native roll adjudication belongs only to roll-required intent.',{index:i});
    if(intent.coordination){
      const c=intent.coordination,fields=['beat_key','consent_refs','location_key','operation','reads','reason','required_participants','writes'];
      if(Object.keys(c).sort().join(',')!==fields.sort().join(',')||!c.beat_key.trim()||!c.location_key.trim()||!c.operation.trim()
        ||!['combat_spotlight','cooperative_operation','contested_resource','reaction_opportunity','direct_pc_conflict','gm_declared_beat'].includes(c.reason)
        ||![c.reads,c.writes].every(values=>Array.isArray(values)&&values.length<=32&&new Set(values).size===values.length
          &&values.every(value=>/^[a-z][a-z0-9_-]*:[^\s]{1,180}$/i.test(value)))
        ||![c.required_participants,c.consent_refs].every(values=>Array.isArray(values)&&values.length<=12
          &&new Set(values).size===values.length&&values.every(value=>typeof value==='string'&&value.length>0&&value.length<=160)))
        throw error('Coordination needs a bounded explicit shared beat, resources, location and consent references.',{index:i});
    }
    if(scope.mode==='private'&&scope.actorCharacterId==null)throw error('Private typed intent requires a controlled character.',{index:i});
  }
  return intents;
}

/** Quarantine malformed optional clauses while retaining only independently source-valid intents. */
export function recoverPlayerIntents(intents,source,scope={}){
  if(!Array.isArray(intents)||intents.length>12)throw error('Bounded model-derived intent list required.');
  const cursor=new Map(),preliminary=[],diagnostics=[];
  for(const [index,intent] of intents.entries()){
    try{
      const standalone={...intent};delete standalone.depends_on;
      validatePlayerIntents([standalone],source,scope);
      const offsets=occurrenceOffsets(source,intent.source_span),ordinal=cursor.get(intent.source_span)||0;
      const occurrence=offsets[ordinal];cursor.set(intent.source_span,ordinal+1);
      if(!occurrence)throw error('Intent span must occur in the current authored message.',{
        index,category:'unmatched_source_span',nearby_offsets:{start:0,end:source.length}
      });
      if(preliminary.some(row=>occurrence.start<row.end&&occurrence.end>row.start)){
        diagnostics.push({index,category:'overlapping_source_span',nearby_offsets:occurrence});continue;
      }
      preliminary.push({index,intent,start:occurrence.start,end:occurrence.end});
    }catch(cause){
      if(cause.code!=='PLAYER_INTENT')throw cause;
      diagnostics.push({index,category:cause.diagnostic?.category||'invalid_optional_proposal',
        nearby_offsets:cause.diagnostic?.nearby_offsets||{start:0,end:source.length}});
    }
  }
  const accepted=[],indexMap=new Map();
  for(const row of preliminary){
    const dependencies=row.intent.depends_on||[];
    if(dependencies.some(dep=>!indexMap.has(dep))){
      diagnostics.push({index:row.index,category:'dependency_unavailable',nearby_offsets:{start:row.start,end:row.end}});continue;
    }
    indexMap.set(row.index,accepted.length);
    accepted.push(dependencies.length?{...row.intent,depends_on:dependencies.map(dep=>indexMap.get(dep))}:{...row.intent});
  }
  return {intents:accepted,diagnostics};
}

/** Persist fail-closed clause diagnostics without retaining fabricated model text. */
export function persistPlayerIntentDiagnostics(db,guild,diagnostics,scope={},provenance={}){
  if(!diagnostics?.length)return [];
  const envelope=authoredTurnEnvelope(db,guild,provenance.messageId,scope.actorCharacterId);
  if(!envelope||envelope.user_id!==scope.actorUserId)throw error('Current authored envelope required for intent diagnostics.');
  return diagnostics.map(item=>{
    const allowed=['unmatched_source_span','overlapping_source_span','dependency_unavailable','invalid_optional_proposal'];
    const category=allowed.includes(item.category)?item.category:'invalid_optional_proposal';
    const key=`diagnostic:${digest([envelope.source_event,item.index,category])}`;
    return db.getCityRecord(guild,'semantic_intent_diagnostic',key)||db.saveCityRecord(guild,{
      kind:'semantic_intent_diagnostic',key,status:category,source_event:envelope.source_event,
      visibility:envelope.visibility,subject_key:envelope.subject_key,data:{version:1,index:item.index,category,
        nearby_offsets:item.nearby_offsets,source_hash:envelope.raw_hash,
        authority:'Rejected interpretation only; never action or outcome authority.'}
    });
  });
}

/** Store the meaning with the owner's actual source; typed intent is never an execution receipt. */
export function persistPlayerIntents(db,guild,intents,scope={},provenance={}){
  if(!intents?.length)return [];
  if(!provenance.messageId||!scope.actorCharacterId||!scope.actorUserId)throw error('Owner and current message required.');
  const principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId);
  if(principal.kind!=='owner')throw error('A proxy cannot authorize owner effects through typed intent.');
  const source=db.getWorldEvent(guild,worldInputKey(provenance.messageId,principal.character_id));
  const session=db.getActiveSession(guild),scene=currentScene(db,guild);
  if(!source||source.status!=='active'||source.details.message_id!==provenance.messageId||source.details.author!==principal.user
    ||source.details.character_id!==principal.character_id||source.details.revision!==principal.revision
    ||source.session_id!==session?.id||source.scene!==scene.key
    ||source.details.private_scene!==(scope.mode==='private')||!db.ownerAuthoredSource(guild,source.event_key,principal.user))
    throw error('Current verified player origin/session/scene is required.');
  validatePlayerIntents(intents,source.details.text,scope);
  const pc=db.getCharacter(principal.character_id);
  let envelope=authoredTurnEnvelope(db,guild,provenance.messageId,principal.character_id);
  // Additive compatibility for old fixture/direct callers. Production intake captures this before native routing.
  if(!envelope)envelope=captureAuthoredTurnEnvelope(db,guild,principal.user,principal.character_id,
    provenance.messageId,source.details.text,{privateScene:scope.mode==='private'});
  const candidates=legacyProposals(intents,envelope),proposals=proposeIntents(db,guild,candidates,scope,provenance),accepted=[];
  const unavailable=new Set(proposals.flatMap((row,i)=>row.kind==='semantic_intent_diagnostic'?[proposalIdentity(candidates[i])]:[]));
  for(const [index,row] of proposals.entries()){
    const intent=intents[index];
    if(row.kind==='semantic_intent_diagnostic')continue;
    if(row.data.dependencies.some(ref=>unavailable.has(ref))){
      unavailable.add(row.record_key);
      db.saveCityRecord(guild,{kind:'semantic_intent_diagnostic',key:`diagnostic:${digest([envelope.source_event,index,'dependency_unavailable'])}`,
        status:'dependency_unavailable',source_event:envelope.source_event,visibility:'character',subject_key:principal.character_id,
        data:{version:1,index,category:'dependency_unavailable',source_hash:envelope.raw_hash,
          authority:'Only this descendant is held; rejected/withdrawn interpretation supplies no prerequisite.'}});
      continue;
    }
    if(intent.framing!=='immediate')continue;
    let resolvedTargetKey=intent.target_key||null,targetCandidates=[],nativeGrounded=false,memoryIdentityRefs=[];
    if(['move','local_zone'].includes(intent.type)&&intent.target_name){
      const reference=resolvePlaceReference(db,guild,principal.character_id,intent.target_name,
        {mode:scope.mode,user:principal.user});
      if(reference.status==='resolved_existing'){
        resolvedTargetKey=reference.location.entity_key;nativeGrounded=true;
      }else targetCandidates=reference.candidates||[];
    }else if(!resolvedTargetKey&&intent.target_name){
      const reference=intentKnowledgeMemory.resolveScopedMemoryReference(db,guild,scope,intent.target_name,
        {currentLocation:pc.data.location||'',sourceEvent:source.event_key});
      if(reference.status==='resolved'){
        resolvedTargetKey=reference.entity_key;nativeGrounded=true;
        if(reference.identity)memoryIdentityRefs=[reference.identity];
      }else if(!reference.candidates?.length&&(intent.type==='observe'||['interact','search'].includes(intent.type)
        &&['roll_required','blocked','needs_clarification'].includes(intent.resolution))&&pc.data.location
        &&db.getSimulationEntity(guild,'location',pc.data.location)){
        // Narrated scene objects (a tile, a key) are not tracked entities; act on them within the PC's established
        // location. target_name keeps the object phrase; adjudication still owns any outcome. Auto/conversational
        // interact or search would have no native receipt for consequence reconciliation, so those keep waiting.
        resolvedTargetKey=pc.data.location;nativeGrounded=true;
      }else targetCandidates=reference.candidates||[];
    }
    if(!resolvedTargetKey&&!intent.target_name&&intent.type==='observe'&&pc.data.location
      &&db.getSimulationEntity(guild,'location',pc.data.location)){
      resolvedTargetKey=pc.data.location;nativeGrounded=true;
    }
    const pending=resolvedTargetKey&&db.listCityRecords(guild,{kind:'semantic_intent_proposal',includeGM:true,limit:100})
      .find(candidate=>candidate.status==='awaiting_referent'&&candidate.data.owner_user_id===principal.user
        &&candidate.data.actor_character_id===principal.character_id&&candidate.data.session_id===session.id
        &&candidate.data.scene===scene.key&&candidate.data.target_candidates?.includes(resolvedTargetKey));
    const acceptedRow=pending
      ?resolvePendingReferent(db,guild,pending.record_key,resolvedTargetKey,scope,provenance,row)
      :acceptIntentForAdjudication(db,guild,row,scope,{resolvedTargetKey,targetCandidates,nativeGrounded});
    if(acceptedRow.status==='awaiting_referent')continue;
    // Retain the existing action fields and native pre-state for T00.1/T03 compatibility.
    accepted.push(db.saveCityRecord(guild,{...acceptedRow,key:acceptedRow.record_key,source_event:acceptedRow.source_event,
      data:{...acceptedRow.data,...intent,target_key:resolvedTargetKey||acceptedRow.data.target_key||'',
        memory_identity_refs:memoryIdentityRefs,proposal_id:row.data.proposal_id,world_source_event:source.event_key,
        actor:pc.id,owner_user_id:principal.user,session_id:session.id,scene:scene.key,
        from_ref:pc.data.location||null,from_revision:pc.data.location?
          stateRevision(db.getSimulationEntity(guild,'location',pc.data.location)):'absent',
        authority:'Canonical adjudication input only; human declaration owns intent; native receipts own outcomes.'}}));
  }
  return accepted;
}

/** After native movement/NPC presence is committed, let real listeners remember the exact authored speech. */
export function persistTypedDialogue(db,guild,intents,scope={},provenance={}){
  if(!intents?.length||!scope.actorCharacterId||!scope.actorUserId||!provenance.messageId)return [];
  const source=db.getWorldEvent(guild,worldInputKey(provenance.messageId,scope.actorCharacterId));
  if(!source||source.status!=='active'||source.details.author!==scope.actorUserId)return [];
  const rows=[];
  for(const intent of intents){
    if(intent.type!=='speak'||intent.framing!=='immediate'||!intent.utterance||
      !source.details.text.includes(intent.source_span)||!intent.source_span.includes(intent.utterance))continue;
    const accepted=currentAcceptedIntent(db,guild,{sourceEvent:source.event_key,actor:scope.actorCharacterId,type:'speak',sourceSpan:intent.source_span,scope});
    if(!accepted||accepted.data.framing!=='immediate'||accepted.data.utterance!==intent.utterance
      ||intent.target_key&&accepted.data.target_key!==intent.target_key||source.details.text.slice(accepted.data.start,accepted.data.end)!==intent.source_span)continue;
    const record=captureDialogue(db,guild,scope.actorUserId,scope.actorCharacterId,provenance.messageId,
      source.details.text,{privateScene:scope.mode==='private',typedIntentKey:accepted.record_key,candidate:{
        source_span:intent.source_span,target:accepted.data.target_key||'',quote:accepted.data.utterance}});
    if(record)rows.push(record);
  }
  return rows;
}

/** Match typed semantic intent against exact source, actor, scene and current position. */
export function currentTypedMovement(db,guild,pc,sourceSpan,target,scope={},sourceEvent=""){
  const scene=currentScene(db,guild);
  const candidates=db.listCityRecords(guild,{kind:'typed_intent',includeGM:true,limit:120}).filter(row=>
    ['interpreted','accepted_for_adjudication'].includes(row.status)&&!row.data.gm_review_terminal
    &&!overlapsOwnerActionTerminal(db,guild,row.source_event,row.data.start,row.data.end)
    &&(row.source_event===sourceEvent||row.data.world_source_event===sourceEvent)
    &&row.data.type==='move'&&row.data.framing==='immediate'
    &&row.data.resolution==='auto'
    &&row.data.source_span===sourceSpan&&row.data.actor===pc.id
    &&row.data.session_id===scene.session_id&&row.data.scene===scene.key
    &&(row.data.from_ref||null)===(pc.data.location||null)
    &&(row.data.target_key===''||row.data.target_key===target)
    &&(['public','party'].includes(row.visibility)||scope.mode==='private'&&row.visibility==='character'&&row.subject_key===pc.id));
  return candidates.length===1?candidates[0]:null;
}

export function autoCompleteOrdinaryMovements(db,guild,result,scope={}){
  if(!Array.isArray(result.player_intents))return result;
  const auto=[];
  const existing=new Set((result.scene_actions||[]).filter(action=>action.kind==='move').map(action=>action.source_span));
  for(const intent of result.player_intents){
    if(intent.type!=='move'||intent.framing!=='immediate'||intent.resolution!=='auto'||existing.has(intent.source_span))continue;
    const pc=scope.actorCharacterId?db.getCharacter(scope.actorCharacterId):null;
    const resolved=pc&&resolvePlaceReference(db,guild,pc.id,intent.target_name||intent.target_key,
      {mode:scope.mode,user:scope.actorUserId});
    const key=resolved?.status==='resolved_existing'?resolved.location.entity_key:'';
    if(intent.target_key&&key&&intent.target_key!==key)throw error('A declared automatic move requires an established audience-visible native destination.',
      {source_span:intent.source_span,target:intent.target_name});
    if(!key){
      // New places are minted only by native narrative authorship after validation, so a not-yet-established
      // destination cannot be arrived at this turn. Hold the move (no arrival) and let the scene introduce the way there.
      intent.resolution='blocked';
      intent.reason=`"${intent.target_name||intent.target_key||'That destination'}" is not an established place yet; the character sets out, but arrival waits until the place is introduced.`;
      continue;
    }
    // Preserve the schema's existing zone field. Native access checks still decide if arrival is allowed.
    auto.push({kind:'move',entity_ref:key,source_span:intent.source_span,
      zone:intent.destination==='exterior'?'exterior':intent.destination==='interior'?'interior':'scene'});
    existing.add(intent.source_span);
  }
  // Raw listener proposals cannot establish identity/presence. Native GM authoring owns fresh NPCs.
  if(auto.length)result.scene_actions=[...(result.scene_actions||[]),...auto];
  return result;
}

/** No material action can vanish behind a declaration-only narrative. */
export function validateIntentResolutions(result){
  const intents=(result.player_intents||[]).filter(x=>x.framing==='immediate');
  for(const intent of intents){
    const matches=(result.scene_actions||[]).filter(action=>action.source_span===intent.source_span);
    if(intent.type==='move'){
      if(intent.resolution==='auto'&&!matches.some(a=>a.kind==='move'))
        throw error('Automatic movement must include an executable native move.',{source_span:intent.source_span});
      if(intent.resolution!=='auto'&&matches.some(a=>a.kind==='move'))
        throw error('Blocked, pending, conditional, or conversational movement cannot include an executable native move.',
          {source_span:intent.source_span,resolution:intent.resolution});
      if(intent.resolution==='conversational')
        throw error('Player movement cannot end as conversational acknowledgement.',{source_span:intent.source_span});
    }
    if(intent.type==='local_zone'&&intent.resolution==='auto'&&!matches.some(a=>a.kind==='local_zone'))
      throw error('Automatic local-zone travel requires a matching native scene action.',{source_span:intent.source_span});
    if(['blocked','roll_required','needs_clarification'].includes(intent.resolution)&&!intent.reason.trim())
      throw error('An action delay needs a specific mechanical obstacle, stakes, or material ambiguity.',{source_span:intent.source_span});
    if(['observe','search','speak','interact'].includes(intent.type)&&intent.resolution==='auto'
      &&!String(result.narration||'').trim())
      throw error('A resolved interaction needs an actual GM reaction, not silent acceptance.',{source_span:intent.source_span});
    if(['interact','local_zone'].includes(intent.type)&&intent.resolution==='conversational')
      throw error('A physical action cannot be dismissed as a conversational declaration.',{source_span:intent.source_span});
  }
  return true;
}
import {intentTypedIntentReaders} from './frameworks/intent/public.js';
// Provide this module's original typed-intent readers to the fixed Intent slot; no other authority is granted.
intentTypedIntentReaders.bind({currentAcceptedIntent,currentTypedMovement});
