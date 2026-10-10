/** Model-semantic, authenticated owner intents; no action-verb whitelist and no model-granted consequences. */
import { createHash } from 'node:crypto';
import { conversationPrincipal } from './conversation-principal.js';
import { currentScene } from './scene-continuity.js';
import { worldInputKey } from './autonomous-world.js';
import { stateRevision } from './ai-intents.js';
import { resolvePlaceReference } from './location-language.js';
import { captureDialogue } from './dialogue-continuity.js';
import {
  authoredTurnEnvelope,
  captureAuthoredTurnEnvelope,
  overlapsConsumedSpan
} from './authored-turn-envelope.js';

const text = length => ({type:'string',maxLength:length});
const obj = properties => ({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
const digest = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0,32);

export const playerIntentSchema={type:'array',maxItems:12,items:obj({
  type:{type:'string',enum:['move','local_zone','observe','search','interact','speak','roll','consent','other']},
  source_span:text(1200),target_name:text(160),target_key:text(160),
  destination:{type:'string',enum:['exterior','interior','zone','unspecified']},
  operation:text(100),utterance:text(1000),excluded_targets:{type:'array',maxItems:8,items:text(160)},
  framing:{type:'string',enum:['immediate','hypothetical','conditional','quoted','reported']},
  resolution:{type:'string',enum:['auto','roll_required','blocked','needs_clarification','conversational']},
  reason:text(400)
})};

export const PLAYER_INTENT_PROMPT=[
  'Extract player_intents semantically from the authenticated CURRENT PLAYER INPUT, regardless of verbs, grammar, idiom, tense or narrative style.',
  'Interpret complete actions in order: travel, approach, observation, interaction, speech, searching, rolls and proposed agreements.',
  'Copy source_span VERBATIM from this message; do not fabricate owner-authored words, merge unrelated speakers or extract quoted examples as actions.',
  'Use type/operation to describe meaning; NEVER make a dictionary of accepted verbs into a rule gate.',
  'target_key must be an existing audience-visible identity or a same-turn world_additions key, otherwise leave it blank.',
  'Destination exterior means arriving at the outside of a building, not entering it. Do not conflate approach with entry.',
  'For speech, copy utterance verbatim as it appears in source_span; never paraphrase invented PC speech.',
  'For constrained searches, put explicitly excluded destinations in excluded_targets, even when the sentence is not in a predefined format.',
  'Classify merely imagined, conditional, OOC and reported acts honestly: they cannot trigger native effects.',
  'For unobstructed mundane movement, use resolution=auto, scene_actions.move and truthful arrival narration; do not say the attempt is still pending.',
  'Use roll_required only where stakes/uncertainty need native rolls; consent or spending requires an independently authenticated native authorization, not your interpretation.',
  'No inference of voluntary actions, feelings or binding choices for another PC. An NPC proxy controlled by a human remains under that person\'s authority.',
  'Ordinary untracked scene props may be handled descriptively, but never grant permanent inventory custody or a canon possession claim without a verified native handout receipt.',
  'A local NPC receiving the player\'s dialogue must exist and actually share the scene: reuse/create it through world_additions and scene_actions.introduce_npc; give the NPC a natural response when free to speak.',
  'If a player names a location or NPC or takes a consequential action involving it, create/reuse a durable world entity when missing. Name-only narration does not make canon.',
  'Otherwise keep incidental atmosphere ephemeral: describe it in narration, do not put it in world_additions, facts, canon or NPC memories.',
  'Create persistent GM-originated leads, recurring people and actionable places when they become important to continued play.',
  'Every immediate actionable intent needs a resolution; never finish a GM turn by merely repeating its declaration.'
].join(' ');

function error(message,diagnostic={}){
  return Object.assign(new Error(message),{code:'PLAYER_INTENT',diagnostic});
}

const proposalFields=['actor_character_id','attempted_action','authored_outcome_claim','dependencies','desired_outcome',
  'destination_scope','end','framing','operation','proposal_id','sequence_index','source_event','source_span','start',
  'target','temporal_relation','type','version'];
const targetFields=['grounding','key','kind','phrase'];
const framings=['immediate','conditional','hypothetical','quoted','reported','ooc'];
const temporalRelations=['sequential','parallel','reaction','unspecified'];

function exactFields(value,fields){return value&&Object.keys(value).sort().join(',')===fields.slice().sort().join(',');}
function sourceHash(value){return createHash('sha256').update(String(value)).digest('hex');}
function proposalIdentity(value){
  return `proposal:${digest([value.source_event,value.start,value.end,value.actor_character_id,value.type,value.operation])}`;
}

/** Validate a model proposal against the immutable authenticated source. No outcome is accepted here. */
export function validateProposal(value,envelope,scope={}){
  if(!exactFields(value,proposalFields)||value.version!==2)throw error('Closed version-2 semantic proposal required.');
  if(!envelope||value.source_event!==envelope.source_event||envelope.raw_hash!==sourceHash(envelope.raw_text))
    throw error('Proposal requires the immutable current authored source.');
  if(value.actor_character_id!==envelope.character_id||scope.actorCharacterId!==envelope.character_id
    ||scope.actorUserId!==envelope.user_id)throw error('Proposal actor does not match the authenticated principal.');
  if(!Number.isSafeInteger(value.start)||!Number.isSafeInteger(value.end)||value.start<0||value.end<=value.start
    ||value.end>envelope.raw_text.length||envelope.raw_text.slice(value.start,value.end)!==value.source_span)
    throw error('Proposal offsets and span must exactly match the immutable source.');
  if(typeof value.source_span!=='string'||!value.source_span||value.source_span.length>1200
    ||typeof value.attempted_action!=='string'||!value.attempted_action||value.attempted_action.length>1200)
    throw error('Proposal needs bounded source and attempted action text.');
  if(!Number.isSafeInteger(value.sequence_index)||value.sequence_index<0||value.sequence_index>11
    ||!Array.isArray(value.dependencies)||value.dependencies.length>12||value.dependencies.some(x=>typeof x!=='string'||x.length>100))
    throw error('Proposal ordering and dependencies must be bounded.');
  if(!exactFields(value.target,targetFields)||!['known','candidate','ambiguous','unknown'].includes(value.target.grounding)
    ||!['location','npc','character','object','operation','unknown',''].includes(value.target.kind)
    ||typeof value.target.key!=='string'&&value.target.key!==null||typeof value.target.phrase!=='string')
    throw error('Proposal target must use the closed grounding contract.');
  if(!framings.includes(value.framing)||!temporalRelations.includes(value.temporal_relation)
    ||!['approach','exterior','interior','zone','none'].includes(value.destination_scope))
    throw error('Proposal framing, timing or destination scope is invalid.');
  if(value.desired_outcome!==null&&typeof value.desired_outcome!=='string')throw error('Desired outcome must be text or null.');
  if(value.authored_outcome_claim!==null){
    const claim=value.authored_outcome_claim;
    if(!exactFields(claim,['claimed_by','status','text'])||claim.claimed_by!==envelope.user_id
      ||claim.status!=='unverified'||typeof claim.text!=='string'||!claim.text.trim())
      throw error('Authored outcome claims begin as attributed unverified claims.');
  }
  const expected=proposalIdentity(value);
  if(value.proposal_id&&value.proposal_id!==expected)throw error('Proposal identity must be derived from authenticated offsets.');
  return {...value,proposal_id:expected};
}

/** Persist fallible semantic proposals separately from native acceptance. */
export function proposeIntents(db,guild,values,scope={},provenance={}){
  if(!Array.isArray(values)||values.length>12)throw error('Bounded semantic proposal list required.');
  const envelope=authoredTurnEnvelope(db,guild,provenance.messageId,scope.actorCharacterId);
  if(!envelope)throw error('Current authored turn envelope required before semantic proposal.');
  const seen=new Set();
  return values.map(value=>{
    const proposal=validateProposal(value,envelope,scope);
    if(seen.has(proposal.proposal_id))throw error('One source occurrence cannot be proposed twice.');
    seen.add(proposal.proposal_id);
    const prior=db.getCityRecord(guild,'semantic_intent_proposal',proposal.proposal_id);
    if(prior)return prior;
    return db.saveCityRecord(guild,{kind:'semantic_intent_proposal',key:proposal.proposal_id,status:'proposed',
      source_event:envelope.source_event,visibility:envelope.visibility,subject_key:envelope.subject_key,
      data:{...proposal,source_hash:envelope.raw_hash,authority:'Fallible meaning proposal only; no action or outcome authority.'}});
  });
}

/** Native acceptance grounds source, actor, framing and referent; it still does not resolve the action. */
export function acceptIntentForAdjudication(db,guild,proposalRow,scope={},resolved={}){
  if(proposalRow?.kind!=='semantic_intent_proposal'||proposalRow.status!=='proposed')
    throw error('A persisted proposed intent is required for acceptance.');
  const proposal=Object.fromEntries(proposalFields.map(field=>[field,proposalRow.data[field]]));
  // Proposal rows are keyed by their immutable authored event; locate the envelope without trusting model fields.
  const event=db.getWorldEvent(guild,proposalRow.source_event);
  const annotation=db.listCityRecords(guild,{kind:'authored_turn_envelope',includeGM:true,limit:100})
    .find(row=>row.source_event===proposalRow.source_event);
  const currentEnvelope=event&&{version:1,source_event:event.event_key,discord_message_id:event.details.discord_message_id,
    guild_id:guild,session_id:event.details.session_id,scene_id:event.details.scene_id,user_id:event.details.author,
    character_id:event.details.character_id,control_role:event.details.control_role,principal_revision:event.details.principal_revision,
    visibility:event.visibility,subject_key:event.subject_key||null,raw_text:event.details.raw_text,raw_hash:event.details.raw_hash,
    native_consumed_spans:annotation?.data.native_consumed_spans||[]};
  if(!currentEnvelope||event.status!=='active'||!db.ownerAuthoredSource(guild,event.event_key,scope.actorUserId))
    throw error('Accepted intent requires an active owner-authored source.');
  validateProposal({...proposal,proposal_id:proposal.proposal_id},currentEnvelope,scope);
  const principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId),scene=currentScene(db,guild);
  if(principal.kind!=='owner'||principal.revision!==currentEnvelope.principal_revision
    ||scene.session_id!==currentEnvelope.session_id||scene.key!==currentEnvelope.scene_id)
    throw error('Accepted intent principal or scene is stale.');
  if(proposal.framing!=='immediate')throw error('Only immediate framing can be accepted for adjudication.');
  if(overlapsConsumedSpan(currentEnvelope,proposal.start,proposal.end))
    throw error('A native-consumed source span cannot be accepted or executed again.');
  const targetKey=resolved.resolvedTargetKey??proposal.target.key;
  const requiresGroundedTarget=['move','local_zone'].includes(proposal.type);
  if(proposal.target.grounding==='ambiguous'||requiresGroundedTarget&&proposal.target.grounding!=='known'
    ||proposal.target.grounding==='unknown'&&(proposal.target.key||proposal.target.phrase))
    throw error('Material target ambiguity requires clarification, not acceptance.');
  if(proposal.target.key&&targetKey!==proposal.target.key)throw error('Resolved target redirection is not authorized.');
  if(proposal.destination_scope==='interior'&&proposal.operation==='approach')
    throw error('Approach cannot be accepted as interior entry.');
  const key=`accepted:${proposal.proposal_id}`,prior=db.getCityRecord(guild,'typed_intent',key);
  if(prior)return prior;
  return db.saveCityRecord(guild,{kind:'typed_intent',key,status:'accepted_for_adjudication',
    source_event:proposalRow.source_event,visibility:currentEnvelope.visibility,subject_key:currentEnvelope.subject_key,
    data:{...proposal,actor:principal.character_id,owner_user_id:principal.user,actor_principal_revision:principal.revision,
      target_key:targetKey||'',target_name:proposal.target.phrase,destination:proposal.destination_scope==='approach'?'exterior':proposal.destination_scope,
      excluded_targets:[],utterance:'',resolution:'accepted',reason:'',session_id:scene.session_id,scene:scene.key,
      source_hash:currentEnvelope.raw_hash,accepted_scope:`${proposal.type}:${proposal.operation}:${proposal.destination_scope}`,
      outcome_receipt:null,authority:'Canonical adjudication input only; human declaration owns intent; native receipts own outcomes.'}});
}

/** Resolve only an already accepted structural route; authored wording is not reparsed here. */
export function currentAcceptedIntent(db,guild,{sourceEvent,actor,type,sourceSpan,targetKey=null,scope=null}={}){
  const rows=db.listCityRecords(guild,{kind:'typed_intent',includeGM:true,limit:120}).filter(row=>
    row.status==='accepted_for_adjudication'
    &&(row.source_event===sourceEvent||row.data.world_source_event===sourceEvent)
    &&row.data.actor===actor&&row.data.type===type&&row.data.source_span===sourceSpan
    &&(targetKey===null||!row.data.target_key||row.data.target_key===targetKey)
    &&(!scope||['public','party'].includes(row.visibility)
      ||scope.mode==='private'&&row.visibility==='character'&&row.subject_key===scope.actorCharacterId));
  return rows.length===1?rows[0]:null;
}

function legacyProposals(intents,envelope){
  const cursor=new Map();
  return intents.map((intent,index)=>{
    let start=cursor.get(intent.source_span)||0;
    start=envelope.raw_text.indexOf(intent.source_span,start);
    if(start<0)throw error('Intent span must occur in the immutable authored message.',{index});
    cursor.set(intent.source_span,start+intent.source_span.length);
    return {version:2,proposal_id:'',source_event:envelope.source_event,start,end:start+intent.source_span.length,
      source_span:intent.source_span,actor_character_id:envelope.character_id,sequence_index:index,dependencies:[],
      type:intent.type,operation:intent.operation||intent.type,
      target:{kind:intent.type==='speak'?'npc':intent.type==='move'||intent.type==='local_zone'?'location':'unknown',
        key:intent.target_key||null,phrase:intent.target_name||'',grounding:intent.target_key?'known':intent.target_name?'candidate':'unknown'},
      framing:intent.framing,destination_scope:intent.destination==='unspecified'?'none':intent.destination,
      attempted_action:intent.source_span,desired_outcome:null,authored_outcome_claim:null,temporal_relation:'sequential'};
  });
}

export function validatePlayerIntents(intents,source,scope={}){
  if(!Array.isArray(intents)||intents.length>12)throw error('Bounded model-derived intent list required.');
  if(typeof source!=='string'||source.length>4000)throw error('Current authenticated message required.');
  const seen=new Set();
  for(const [i,intent] of intents.entries()){
    if(!intent||Object.keys(intent).sort().join(',')!=='destination,excluded_targets,framing,operation,reason,resolution,source_span,target_key,target_name,type,utterance')
      throw error('Closed semantic intent schema required.',{index:i});
    for(const [field,max] of [['source_span',1200],['target_key',160],['target_name',160],['operation',100],['utterance',1000],['reason',400]])
      if(typeof intent[field]!=='string'||intent[field].length>max)throw error('Bounded semantic intent fields required.',{index:i,field});
    if(!Array.isArray(intent.excluded_targets)||intent.excluded_targets.length>8||intent.excluded_targets.some(x=>typeof x!=='string'||x.length>160))
      throw error('Invalid excluded destination constraints.',{index:i});
    for(const [field,allowed] of [['type',['move','local_zone','observe','search','interact','speak','roll','consent','other']],
      ['framing',['immediate','hypothetical','conditional','quoted','reported']],
      ['resolution',['auto','roll_required','blocked','needs_clarification','conversational']],
      ['destination',['exterior','interior','zone','unspecified']]])
      if(!allowed.includes(intent[field]))throw error('Unknown semantic intent enumeration.',{index:i,field});
    if(!intent.source_span||!source.includes(intent.source_span))throw error('Intent span must occur in the current authored message.',{index:i});
    if(intent.type==='speak'&&(!intent.utterance||!intent.source_span.includes(intent.utterance)))
      throw error('A spoken utterance must be authored verbatim in its own source span.',{index:i});
    const id=`${intent.type}:${intent.source_span}`;
    if(seen.has(id))throw error('An action cannot be applied twice from the same source span.',{index:i});
    seen.add(id);
    // The model identifies quotation/agency, but native refuses execution on any non-immediate framing.
    if(intent.framing!=='immediate'&&intent.resolution==='auto')throw error('Non-immediate intent cannot authorize an automatic effect.',{index:i});
    if(['roll','consent'].includes(intent.type)&&intent.resolution==='auto')
      throw error('Model interpretation cannot authorize dice, spending or binding consent.',{index:i});
    if(scope.mode==='private'&&scope.actorCharacterId==null)throw error('Private typed intent requires a controlled character.',{index:i});
  }
  return intents;
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
  const proposals=proposeIntents(db,guild,legacyProposals(intents,envelope),scope,provenance),accepted=[];
  for(const [index,row] of proposals.entries()){
    const intent=intents[index];
    if(intent.framing!=='immediate')continue;
    const acceptedRow=acceptIntentForAdjudication(db,guild,row,scope,{resolvedTargetKey:intent.target_key||null});
    // Retain the existing action fields and native pre-state for T00.1/T03 compatibility.
    accepted.push(db.saveCityRecord(guild,{...acceptedRow,key:acceptedRow.record_key,source_event:acceptedRow.source_event,
      data:{...acceptedRow.data,...intent,proposal_id:row.data.proposal_id,world_source_event:source.event_key,
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
    const record=captureDialogue(db,guild,scope.actorUserId,scope.actorCharacterId,provenance.messageId,
      source.details.text,{privateScene:scope.mode==='private',candidate:{
        source_span:intent.source_span,target:intent.target_key||intent.target_name||'',quote:intent.utterance}});
    if(record)rows.push(record);
  }
  return rows;
}

/** Match typed semantic intent against exact source, actor, scene and current position. */
export function currentTypedMovement(db,guild,pc,sourceSpan,target,scope={},sourceEvent=""){
  const scene=currentScene(db,guild);
  const candidates=db.listCityRecords(guild,{kind:'typed_intent',includeGM:true,limit:120}).filter(row=>
    ['interpreted','accepted_for_adjudication'].includes(row.status)
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
    const sameTurn=(result.world_additions||[]).find(a=>a.kind==='location'&&
      (a.key===intent.target_key||a.name.toLowerCase()===intent.target_name.toLowerCase()));
    const pc=scope.actorCharacterId?db.getCharacter(scope.actorCharacterId):null;
    const resolved=pc&&resolvePlaceReference(db,guild,pc.id,intent.target_name||intent.target_key,
      {mode:scope.mode,user:scope.actorUserId});
    const key=intent.target_key||sameTurn?.key||
      (resolved?.status==='resolved_existing'?resolved.location.entity_key:'');
    if(!key)throw error('A declared automatic move requires a resolvable destination or a matching new ordinary place.',
      {source_span:intent.source_span,target:intent.target_name});
    // Preserve the schema's existing zone field. Native access checks still decide if arrival is allowed.
    auto.push({kind:'move',entity_ref:key,source_span:intent.source_span,
      zone:intent.destination==='exterior'?'exterior':intent.destination==='interior'?'interior':'scene'});
    existing.add(intent.source_span);
  }
  // Introducing an ordinary newly-generated local listener is native scene presence, not human approval.
  for(const intent of result.player_intents){
    if(!['speak','interact'].includes(intent.type)||intent.framing!=='immediate'||!intent.target_key)continue;
    if((result.scene_actions||[]).some(a=>a.kind==='introduce_npc'&&a.entity_ref===intent.target_key)||
      auto.some(a=>a.kind==='introduce_npc'&&a.entity_ref===intent.target_key))continue;
    const npc=(result.world_additions||[]).find(a=>a.kind==='npc'&&a.key===intent.target_key);
    if(npc)auto.push({kind:'introduce_npc',entity_ref:intent.target_key,source_span:intent.source_span,zone:''});
  }
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
