import {createHash} from 'node:crypto';
import {authoredTurnEnvelope} from './authored-turn-reader.js';
import {overlapsConsumedSpan} from './authored-turn-envelope.js';
import {isCharacterSourceSpan} from './source-communication.js';
import {sourceSpanInsideQuote} from './source-quote-boundaries.js';
import {proposalFields,sameProposal,validateProposal} from './semantic-proposal.js';
import {intentSessionPrincipal} from './contracts/session-principal.js';
function conversationPrincipal(...args){return intentSessionPrincipal.conversationPrincipal(...args);}
import {intentSessionScene} from './contracts/session-scene.js';
const {currentScene}=intentSessionScene;
import {intentOwnerActionTerminal} from './contracts/owner-action-terminal.js';
function overlapsOwnerActionTerminal(...args){return intentOwnerActionTerminal.overlapsOwnerActionTerminal(...args);}
const digest = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0,32);
function error(message,diagnostic={}){
  return Object.assign(new Error(message),{code:'PLAYER_INTENT',diagnostic});
}

/** Persist fallible semantic proposals separately from native acceptance. */
export function proposeIntents(db,guild,values,scope={},provenance={}){
  if(!Array.isArray(values)||values.length>12)throw error('Bounded semantic proposal list required.');
  const envelope=authoredTurnEnvelope(db,guild,provenance.messageId,scope.actorCharacterId);
  if(!envelope)throw error('Current authored turn envelope required before semantic proposal.');
  const seen=new Set(),ranges=[],withdrawn=new Set();
  return values.map((value,index)=>{
    let proposal;
    try{proposal=validateProposal(value,envelope,scope);}
    catch(cause){
      if(cause.code!=='PLAYER_INTENT'||cause.diagnostic?.category!=='unmatched_source_span')throw cause;
      const key=`diagnostic:${digest([envelope.source_event,index,'unmatched_source_span'])}`;
      return db.getCityRecord(guild,'semantic_intent_diagnostic',key)||db.saveCityRecord(guild,{
        kind:'semantic_intent_diagnostic',key,status:'unmatched_source_span',source_event:envelope.source_event,
        visibility:envelope.visibility,subject_key:envelope.subject_key,data:{version:1,index,category:'unmatched_source_span',
          nearby_offsets:cause.diagnostic.nearby_offsets,source_hash:envelope.raw_hash,
          authority:'Rejected interpretation only; never action or outcome authority.'}
      });
    }
    if(proposal.framing==='immediate'&&(!isCharacterSourceSpan(envelope.raw_text,proposal.start,proposal.end)
      ||sourceSpanInsideQuote(envelope.raw_text,proposal.start))){
      withdrawn.add(proposal.proposal_id);
      const key=`diagnostic:${digest([envelope.source_event,index,'non_ic_source_span'])}`;
      return db.getCityRecord(guild,'semantic_intent_diagnostic',key)||db.saveCityRecord(guild,{
        kind:'semantic_intent_diagnostic',key,status:'non_ic_source_span',source_event:envelope.source_event,
        visibility:'character',subject_key:envelope.character_id,data:{version:1,index,category:'non_ic_source_span',
          source_hash:envelope.raw_hash,authority:'Explicit OOC/quoted source is not an immediate owner declaration; independent IC spans remain eligible.'}});
    }
    if(overlapsOwnerActionTerminal(db,guild,envelope.source_event,proposal.start,proposal.end)){
      withdrawn.add(proposal.proposal_id);
      const key=`diagnostic:${digest([envelope.source_event,index,'withdrawn_source_span'])}`;
      return db.getCityRecord(guild,'semantic_intent_diagnostic',key)||db.saveCityRecord(guild,{
        kind:'semantic_intent_diagnostic',key,status:'withdrawn_source_span',source_event:envelope.source_event,
        visibility:'character',subject_key:envelope.character_id,data:{version:1,index,category:'withdrawn_source_span',
          source_hash:envelope.raw_hash,authority:'Owner withdrew this source range; a model cannot resegment it into new permission.'}});
    }
    if(proposal.dependencies.some(ref=>withdrawn.has(ref))){
      withdrawn.add(proposal.proposal_id);
      const key=`diagnostic:${digest([envelope.source_event,index,'dependency_unavailable'])}`;
      return db.getCityRecord(guild,'semantic_intent_diagnostic',key)||db.saveCityRecord(guild,{
        kind:'semantic_intent_diagnostic',key,status:'dependency_unavailable',source_event:envelope.source_event,
        visibility:'character',subject_key:envelope.character_id,data:{version:1,index,category:'dependency_unavailable',
          source_hash:envelope.raw_hash,authority:'Withdrawn prerequisite supplies no permission; independent source spans remain available.'}});
    }
    if(ranges.some(range=>proposal.start<range.end&&proposal.end>range.start)){
      const key=`diagnostic:${digest([envelope.source_event,index,'overlapping_source_span'])}`;
      return db.getCityRecord(guild,'semantic_intent_diagnostic',key)||db.saveCityRecord(guild,{
        kind:'semantic_intent_diagnostic',key,status:'overlapping_source_span',source_event:envelope.source_event,
        visibility:envelope.visibility,subject_key:envelope.subject_key,data:{version:1,index,category:'overlapping_source_span',
          nearby_offsets:{start:proposal.start,end:proposal.end},source_hash:envelope.raw_hash,
          authority:'Rejected interpretation only; never action or outcome authority.'}
      });
    }
    if(seen.has(proposal.proposal_id))throw error('One source occurrence cannot be proposed twice.');
    seen.add(proposal.proposal_id);
    ranges.push({start:proposal.start,end:proposal.end});
    const prior=db.getCityRecord(guild,'semantic_intent_proposal',proposal.proposal_id);
    if(prior){
      if(!sameProposal(prior,proposal))throw error('A source occurrence cannot be replayed with altered interpretation.',{
        category:'incompatible_proposal_replay',index
      });
      return prior;
    }
    return db.saveCityRecord(guild,{kind:'semantic_intent_proposal',key:proposal.proposal_id,status:'proposed',
      source_event:envelope.source_event,visibility:envelope.visibility,subject_key:envelope.subject_key,
      data:{...proposal,source_hash:envelope.raw_hash,authority:'Fallible meaning proposal only; no action or outcome authority.'}});
  });
}

/** Native acceptance grounds source, actor, framing and referent; it still does not resolve the action. */
export function acceptIntentForAdjudication(db,guild,proposalRow,scope={},resolved={}){
  if(proposalRow?.kind!=='semantic_intent_proposal'||!['proposed','awaiting_referent'].includes(proposalRow.status))
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
  if(!isCharacterSourceSpan(currentEnvelope.raw_text,proposal.start,proposal.end)
    ||sourceSpanInsideQuote(currentEnvelope.raw_text,proposal.start))throw error('Quoted or explicitly OOC source is not a character action.');
  if(overlapsConsumedSpan(currentEnvelope,proposal.start,proposal.end))
    throw error('A native-consumed source span cannot be accepted or executed again.');
  if(overlapsOwnerActionTerminal(db,guild,event.event_key,proposal.start,proposal.end))
    throw error('The owner withdrew this original source range; a new owner declaration is required.');
  const targetKey=resolved.resolvedTargetKey??proposal.target.key;
  const requiresGroundedTarget=['move','local_zone'].includes(proposal.type);
  const nativeGrounded=resolved.nativeGrounded===true&&typeof targetKey==='string'&&targetKey;
  if(proposal.target.grounding==='ambiguous'||requiresGroundedTarget&&proposal.target.grounding!=='known'&&!nativeGrounded
    ||proposal.target.grounding==='candidate'&&!nativeGrounded
    ||proposal.target.grounding==='unknown'&&(proposal.target.key||proposal.target.phrase)){
    const candidates=[...new Set(resolved.targetCandidates||[])].filter(key=>typeof key==='string'&&key).slice(0,8);
    const awaiting=db.saveCityRecord(guild,{...proposalRow,key:proposalRow.record_key,status:'awaiting_referent',
      data:{...proposalRow.data,target_candidates:candidates,session_id:scene.session_id,scene:scene.key,
        owner_user_id:principal.user,actor_principal_revision:principal.revision,
        clarification:'Which specific current-scene target did you mean?',
        authority:'Pending referent only; never action, access or outcome authority.'}});
    return awaiting;
  }
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

/** Bind an owner clarification to a still-current pending referent using a new authenticated source. */
export function resolvePendingReferent(db,guild,pendingKey,targetKey,scope={},provenance={},currentProposal=null){
  const pending=db.getCityRecord(guild,'semantic_intent_proposal',pendingKey);
  if(!pending||pending.status!=='awaiting_referent')throw error('A current pending referent is required.');
  const principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId),scene=currentScene(db,guild);
  if(principal.kind!=='owner'||pending.data.owner_user_id!==principal.user
    ||pending.data.actor_character_id!==principal.character_id||pending.data.actor_principal_revision!==principal.revision
    ||pending.data.session_id!==scene.session_id||pending.data.scene!==scene.key)
    throw error('Pending referent principal or scene is stale.');
  if(!pending.data.target_candidates?.includes(targetKey))throw error('Clarification target is not one of the bounded candidates.');
  const envelope=authoredTurnEnvelope(db,guild,provenance.messageId,principal.character_id);
  if(!envelope||envelope.user_id!==principal.user||envelope.session_id!==scene.session_id||envelope.scene_id!==scene.key)
    throw error('Clarification requires a new current authenticated owner source.');
  const value=currentProposal?null:{version:2,proposal_id:'',source_event:envelope.source_event,start:0,end:envelope.raw_text.length,
    source_span:envelope.raw_text,actor_character_id:principal.character_id,sequence_index:0,dependencies:[],
    type:pending.data.type,operation:pending.data.operation,target:{...pending.data.target,key:targetKey,grounding:'known'},
    framing:'immediate',destination_scope:pending.data.destination_scope,attempted_action:pending.data.attempted_action,
    desired_outcome:pending.data.desired_outcome,authored_outcome_claim:pending.data.authored_outcome_claim,
    temporal_relation:pending.data.temporal_relation};
  const proposal=currentProposal||proposeIntents(db,guild,[value],scope,provenance)[0];
  if(proposal.source_event!==envelope.source_event||proposal.data.target.key!==targetKey)
    throw error('Current clarification proposal does not bind the selected target.');
  const accepted=acceptIntentForAdjudication(db,guild,proposal,scope,{resolvedTargetKey:targetKey});
  db.saveCityRecord(guild,{...pending,key:pending.record_key,status:'clarified',data:{...pending.data,
    clarified_by:envelope.source_event,resolved_target_key:targetKey}});
  return db.saveCityRecord(guild,{...accepted,key:accepted.record_key,data:{...accepted.data,
    clarified_from:pending.record_key,clarification_source:envelope.source_event}});
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
