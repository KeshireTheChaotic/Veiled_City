/** Existing native projection guards. Source, audience and receipt producers are explicit capabilities. */
import {projectGmMechanicalInput} from './mechanical-boundary-v9.js';
export function createGmMechanicalProposalRules({capabilities}){
const {createAudienceAuthority,authorizeIncomingOffer,assertFearIncomingExecution,inspectNativeGmDecision,hash,fail}=capabilities||{};
if([createAudienceAuthority,authorizeIncomingOffer,assertFearIncomingExecution,inspectNativeGmDecision,hash,fail].some(fn=>typeof fn!=='function'))throw new TypeError('Native projection capabilities required');
function projectNativeGmProposal(db,guild,proposal,{library}={}){
  if(!proposal||Object.keys(proposal).sort().join()!=='actor_ref,feature_ref,initiator_class,intent_kind,kind,request_id,source_task_id,stat_block_ref,target_refs,version'
    ||proposal.version!==9||proposal.kind!=='mechanical_input'||!['ai_gm','adversary','environment'].includes(proposal.initiator_class))throw fail('gm_proposal_shape');
  // No generic GM d20 / fabricated owner source / default world-feature executor.
  if(proposal.intent_kind!=='adversary_attack'||!['ai_gm','adversary'].includes(proposal.initiator_class))
    throw fail('gm_native_route_not_implemented_needs_review');
  const c=authorizeIncomingOffer(db,guild,proposal.request_id,{library}),{row}=c,o=row.data.offer;
  // A human-reviewed offer alone NEVER grants autonomous execution. Require the
  // already authenticated exact immediate Fear choice and current native gate.
  if(o.input.ruling?.startsWith('ai-decision:'))inspectNativeGmDecision(db,guild,o.input.ruling.slice(12));
  else assertFearIncomingExecution(db,guild,row,{autonomous:true,committedRoll:!!row.data.roll});
  if(hash(proposal.actor_ref)!==hash({kind:'adversary',id:o.input.npc})
    ||hash(proposal.target_refs)!==hash([{kind:'character',id:o.input.character}])
    ||proposal.stat_block_ref!==o.snapshot.template||proposal.feature_ref!=='standard_attack'
    ||proposal.source_task_id!==`gm-task:${hash([row.source_event,row.record_key])}`)throw fail('gm_native_actor_target_feature');
  if(!['awaiting_defense','ready'].includes(row.status))throw fail('gm_native_request_not_pending');
  const proof={authorized:true,audience:'gm_internal',viewpoint:'internal',source_event:row.source_event,scene:o.snapshot.scene,session:o.snapshot.session,
    task_ids:[proposal.source_task_id],recipient_user_id:null,recipient_character_id:null,native_capability:'gm_action',
    initiator_class:proposal.initiator_class,actor:proposal.actor_ref,request_id:row.record_key,source_revision:hash(row)};
  proof.proof_ref=`gm-mechanical:${hash(proof)}`;
  const authority=createAudienceAuthority({authorize:()=>proof}),grant=authority.issue({audience:'gm_internal'});
  return projectGmMechanicalInput({authority,grant,proposal,verifyInput:()=>({verified:true,proof_ref:proof.proof_ref,
    source_event:proof.source_event,request_id:row.record_key,actor:proof.actor,operation:'commit_adversary_attack',
    disposition:row.status==='ready'?'native_pending':'awaiting_owner_defense'})});
}

return Object.freeze({projectNativeGmProposal});
}
