/** Mechanical IN and OUT projections. They never execute rolls, spend costs or mint receipts. */
const error = code => { throw Object.assign(new Error(`Mechanical boundary refused: ${code}`), {code: 'MECHANICAL_V9'}); };
const id = v => typeof v === 'string' && v.length > 0 && v.length <= 256;
const inputKinds = new Set(['request_roll', 'submit_roll']);
const inputStatuses = new Set(['needs_adjudication', 'needs_selection', 'native_pending']);

/** GM proposal projection, not a generic roll(actor) executor or player authorization. */
export function projectGmMechanicalInput({authority,grant,proposal,verifyInput}){
  const b=authority.inspect(grant);
  if(b.audience!=='gm_internal'||b.native_capability!=='gm_action'||typeof verifyInput!=='function')error('native_gm_capability');
  const p=verifyInput(proposal,b);
  const feature=b.native_route==='qualified_feature',featureOperations=['commit_group_feature','commit_adversary_volley','commit_adversary_feature','request_feature_reaction_roll'];
  if(p?.verified!==true||p.source_event!==b.source_event||p.proof_ref!==b.proof_ref||p.request_id!==b.request_id
    ||p.actor?.kind!=='adversary'||p.actor.id!==b.actor.id
    ||(feature?!featureOperations.includes(p.operation)||p.operation!==b.allowed_operation||!id(b.feature_ref)||p.feature_ref!==b.feature_ref
      ||!['awaiting_owner_defense','awaiting_owner_reaction','native_pending'].includes(p.disposition)
      :p.operation!=='commit_adversary_attack'||!['awaiting_owner_defense','native_pending'].includes(p.disposition)))error('native_gm_input_proof');
  return Object.freeze({kind:'mechanical_input',initiator_class:b.initiator_class,operation:p.operation,actor:Object.freeze({...p.actor}),
    request_ref:p.request_id,source_event:p.source_event,proof_ref:p.proof_ref,disposition:p.disposition,...(feature?{feature_ref:p.feature_ref}:{}),executed:false});
}

/**
 * An authenticated player asking to roll is a mechanical INPUT request, not a completed roll.
 * verifyInput MUST find the accepted typed source and owner/scene/revision, distinguish
 * a roll question from an immediate exact selection, and return native proof.
 * No pending request may be selected by guessing, and this module never invokes dice.
 */
export function projectMechanicalInput({authority, grant, intent, verifyInput}) {
  const binding = authority.inspect(grant);
  if (!['player', 'player_private'].includes(binding.audience) || !id(binding.recipient_character_id)
    || !id(binding.recipient_user_id)) error('player_identity');
  if (!inputKinds.has(intent?.kind) || !id(intent?.typed_intent_key) || !id(intent?.task_id)
    || !binding.task_ids.includes(intent.task_id)) error('source_or_task');
  if (typeof verifyInput !== 'function') error('native_input_verifier_required');
  const proof = verifyInput(intent, binding);
  if (!proof || proof.verified !== true || !id(proof.source_event)
    || proof.source_event !== binding.source_event || proof.typed_intent_key !== intent.typed_intent_key
    || !id(proof.proof_ref)
    || !inputStatuses.has(proof.disposition) || proof.actor_character_id !== binding.recipient_character_id
    || proof.owner_user_id !== binding.recipient_user_id) error('native_input_proof');
  if (intent.kind === 'submit_roll' && proof.disposition === 'native_pending' && !id(proof.exact_request_ref))
    error('exact_request_selection');
  return Object.freeze({kind: 'mechanical_input', operation: intent.kind,
    task_id: intent.task_id, disposition: proof.disposition, actor_character_id: proof.actor_character_id,
    source_event: proof.source_event, proof_ref: proof.proof_ref,
    request_ref: proof.exact_request_ref || null, executed: false});
}

/**
 * Mechanical OUTPUT is a rendering of an actual, independently verified native receipt.
 * verifyReceipt MUST apply typedRollProof or the relevant native HP/Fear/consent/outcome
 * verifier, including audience checks. Never accept model-generated dice or success labels.
 */
export function projectMechanicalOutput({authority, grant, receiptRef, verifyReceipt}) {
  const binding = authority.inspect(grant);
  if (binding.audience === 'gm_internal' || !id(receiptRef) || typeof verifyReceipt !== 'function')
    error('native_output_verifier_required');
  const receipt = verifyReceipt(receiptRef, binding);
  const subject=receipt?.subject || (id(receipt?.subject_character_id)?{kind:'character',id:receipt.subject_character_id}:null);
  if (receipt?.verified !== true || receipt.ref !== receiptRef || !id(receipt.proof_ref)
    || receipt.audience !== binding.audience || receipt.request_source_event !== binding.source_event
    || !id(receipt.native_source_event) || !subject || !['character','adversary','environment'].includes(subject.kind)
    || !id(subject.id) || typeof receipt.rendered_text !== 'string'
    || !receipt.rendered_text.trim()) error('native_output_proof');
  return Object.freeze({kind: 'mechanical_output', receipt_ref: receipt.ref,
    proof_ref: receipt.proof_ref, audience: receipt.audience, source_event: receipt.native_source_event,
    subject:Object.freeze({...subject}),...(subject.kind==='character'?{subject_character_id:subject.id}:{}),
    ...(receipt.native_detail?{native_detail:receipt.native_detail}:{}),text: receipt.rendered_text});
}
