/** Read-only current owner/typed-source proof for nonbinding proposals, never consent or effect execution. */
import {createHash} from 'node:crypto';
import {conversationPrincipal} from './conversation-principal.js';
import {currentScene} from './scene-continuity.js';
import {overlapsOwnerActionTerminal} from './owner-action-terminal.js';
import {authoredTurnEnvelope} from './authored-turn-envelope.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const semanticCandidateOperations=['personal_commitment_candidate','proposal_campaign_canon'];
function fail(){throw Object.assign(new Error('Current authenticated typed owner proposal/source, framing and audience required.'),
  {code:'SEMANTIC_PROPOSAL',expected:true});}
export function ownerSemanticSource(db,guild,ref,scope,operation,messageId=null){
  if(typeof ref!=='string'||!ref||ref.length>200||!scope||!['party','private'].includes(scope.mode)
    ||typeof scope.actorUserId!=='string'||typeof scope.actorCharacterId!=='string')fail();
  const row=db.getCityRecord(guild,'typed_intent',ref),d=row?.data,source=row&&db.getWorldEvent(guild,row.source_event);
  if(!semanticCandidateOperations.includes(operation)||row?.status!=='accepted_for_adjudication'||!d||d.type!=='other'
    ||d.operation!==operation||d.framing!=='immediate'||d.resolution!=='conversational'||source?.status!=='active'
    ||source.kind!=='authored_turn'||source.details.author!==scope.actorUserId||source.details.character_id!==scope.actorCharacterId
    ||d.actor!==scope.actorCharacterId||d.owner_user_id!==scope.actorUserId
    ||!db.ownerAuthoredSource(guild,source.event_key,scope.actorUserId))fail();
  const principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId),scene=currentScene(db,guild);
  const raw=source.details.raw_text,start=d.start,end=d.end;
  if(principal.kind!=='owner'||principal.revision!==d.actor_principal_revision||principal.revision!==source.details.principal_revision
    ||scene.session_id!==d.session_id||scene.key!==d.scene||scene.session_id!==source.session_id||scene.key!==source.scene
    ||source.details.private_scene!==(scope.mode==='private')||operation==='proposal_campaign_canon'&&scope.mode!=='private'
    ||messageId&&source.details.discord_message_id!==messageId||typeof raw!=='string'
    ||createHash('sha256').update(raw).digest('hex')!==d.source_hash||d.source_hash!==source.details.raw_hash
    ||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>raw.length
    ||raw.slice(start,end)!==d.source_span||overlapsOwnerActionTerminal(db,guild,source.event_key,start,end))fail();
  const envelope=authoredTurnEnvelope(db,guild,source.details.discord_message_id,scope.actorCharacterId);
  if(!envelope||envelope.source_event!==source.event_key
    ||envelope.native_consumed_spans.some(span=>start<span.end&&end>span.start))fail();
  const world=d.world_source_event&&db.getWorldEvent(guild,d.world_source_event);
  if(d.world_source_event&&(!world||world.status!=='active'||world.kind!=='ai_gm_input'||world.details.text!==raw
    ||world.details.author!==principal.user||world.details.character_id!==principal.character_id||world.details.revision!==principal.revision
    ||world.session_id!==scene.session_id||world.scene!==scene.key||world.details.private_scene!==(scope.mode==='private')))fail();
  // Structural quote/statement boundaries are tripwires, not a semantic verb dictionary or meaning certification.
  const prefix=raw.slice(0,start),before=prefix.split(/[.!?;\n]/u).at(-1);
  if(before.trim()||(/["“”`]/u.test(prefix)&&(prefix.match(/["“”`]/gu)||[]).length%2)
    ||/^[\s"“”`]/u.test(d.source_span)||/^\s*(?:OOC\b|\/\/|\(\()/iu.test(raw))fail();
  if(operation==='personal_commitment_candidate'&&!/^(?:I\b|My\b)/iu.test(d.source_span))fail();
  const proof={version:1,accepted_intent:row.record_key,accepted_hash:hash(row),source_ref:source.event_key,
    source_hash:hash(source),world_hash:world?hash(world):null,operation,scope:{...scope}};
  return {row,source,statement:d.source_span,proof};
}
export function assertSemanticCandidateProof(db,guild,proof){
  if(proof?.version!==1)fail();
  const current=ownerSemanticSource(db,guild,proof.accepted_intent,proof.scope,proof.operation);
  if(hash(current.proof)!==hash(proof))fail();return current;
}
/** Rejection/inspection may clear stale proposals; promotion must revalidate the exact original terms and owner source. */
export function assertCanonProposalProof(db,guild,proposal,visibility=null){
  const binding=db.getCityRecord(guild,'canon_proposal_source',proposal.id);
  if(!binding){
    if(proposal.source==='typed_private_proposal_v2')fail();
    return; // Historical/imported human-reviewed proposals retain their native read/review workflow.
  }
  if(visibility&&visibility!==proposal.proposed_visibility)fail();
  if(binding.status!=='verified'||binding.visibility!=='gm'||!binding.data?.proof
    ||binding.source_event!==binding.data.proof.source_ref||binding.data.terms_hash!==hash([
    proposal.character_id,proposal.proposed_by_user_id,proposal.canon_key,proposal.proposed_value,proposal.proposed_visibility]))fail();
  assertSemanticCandidateProof(db,guild,binding.data.proof);
}
export const semanticCandidateHash=hash;
