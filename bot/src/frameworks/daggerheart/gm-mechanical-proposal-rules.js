/** Existing native projection guards. Source, audience and receipt producers are explicit capabilities. */
import {projectGmMechanicalInput} from './mechanical-boundary-v9.js';
export function createGmMechanicalProposalRules({capabilities}){
const {createAudienceAuthority,authorizeIncomingOffer,assertFearIncomingExecution,inspectNativeGmDecision,featureDisposition,hash,fail}=capabilities||{};
if([createAudienceAuthority,authorizeIncomingOffer,assertFearIncomingExecution,inspectNativeGmDecision,featureDisposition,hash,fail].some(fn=>typeof fn!=='function'))throw new TypeError('Native projection capabilities required');
const featureOperations=new Set(['commit_group_feature','commit_adversary_volley','commit_adversary_feature','request_feature_reaction_roll']);
function projectFeature(db,guild,proposal){
  if(!['ai_gm','adversary'].includes(proposal.initiator_class)||db.getCityCalendar(guild).flags.gm_discretion!==true
    ||db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode!=='autonomous')throw fail('gm_feature_autonomous_mode_required');
  const {row,entry}=inspectNativeGmDecision(db,guild,proposal.request_id),n=row.data.native,
    disposition=featureDisposition(proposal.feature_ref),feature=disposition.feature;
  if(disposition.status!=='supported'||!feature||!featureOperations.has(n?.operation)||entry.actor.type!=='npc'
    ||n.feature!==feature.feature_key||n.feature_hash!==hash(feature)||row.data.proposal.feature_ref!==feature.feature_key
    ||proposal.stat_block_ref!==feature.template_hash||hash(proposal.actor_ref)!==hash({kind:'adversary',id:entry.actor.key})
    ||hash(proposal.target_refs)!==hash(entry.target_refs.map(id=>({kind:'character',id})))
    ||proposal.source_task_id!==`gm-task:${hash([row.source_event,row.record_key])}`
    ||!['gm_action_ready','pending_pc_reaction'].includes(row.status))throw fail('gm_feature_exact_native_decision_required');
  const proof={authorized:true,audience:'gm_internal',viewpoint:'internal',source_event:row.source_event,scene:row.data.origin.scene,session:row.data.origin.session,
    task_ids:[proposal.source_task_id],recipient_user_id:null,recipient_character_id:null,native_capability:'gm_action',native_route:'qualified_feature',
    feature_ref:feature.feature_key,allowed_operation:n.operation,initiator_class:proposal.initiator_class,actor:proposal.actor_ref,request_id:row.record_key,source_revision:hash(row)};
  proof.proof_ref=`gm-mechanical:${hash(proof)}`;
  const authority=createAudienceAuthority({authorize:()=>proof}),grant=authority.issue({audience:'gm_internal'});
  return projectGmMechanicalInput({authority,grant,proposal,verifyInput:()=>({verified:true,proof_ref:proof.proof_ref,source_event:row.source_event,
    request_id:row.record_key,actor:proof.actor,feature_ref:feature.feature_key,operation:n.operation,
    disposition:n.operation==='request_feature_reaction_roll'?'awaiting_owner_reaction':n.operation==='commit_adversary_volley'?'awaiting_owner_defense':'native_pending'})});
}
function projectNativeGmProposal(db,guild,proposal,{library}={}){
  if(!proposal||Object.keys(proposal).sort().join()!=='actor_ref,feature_ref,initiator_class,intent_kind,kind,request_id,source_task_id,stat_block_ref,target_refs,version'
    ||proposal.version!==9||proposal.kind!=='mechanical_input'||!['ai_gm','adversary','environment'].includes(proposal.initiator_class))throw fail('gm_proposal_shape');
  if(proposal.intent_kind==='adversary_feature')return projectFeature(db,guild,proposal);
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
