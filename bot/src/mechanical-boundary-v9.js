/** Mechanical IN and OUT projections. They never execute rolls, spend costs or mint receipts. */
const error = code => { throw Object.assign(new Error(`Mechanical boundary refused: ${code}`), {code: 'MECHANICAL_V9'}); };
const id = v => typeof v === 'string' && v.length > 0 && v.length <= 256;
const inputKinds = new Set(['request_roll', 'submit_roll']);
const inputStatuses = new Set(['needs_adjudication', 'needs_selection', 'native_pending']);

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
  if (receipt?.verified !== true || receipt.ref !== receiptRef || !id(receipt.proof_ref)
    || receipt.audience !== binding.audience || receipt.request_source_event !== binding.source_event
    || !id(receipt.native_source_event) || !id(receipt.subject_character_id) || typeof receipt.rendered_text !== 'string'
    || !receipt.rendered_text.trim()) error('native_output_proof');
  return Object.freeze({kind: 'mechanical_output', receipt_ref: receipt.ref,
    proof_ref: receipt.proof_ref, audience: receipt.audience, source_event: receipt.native_source_event,
    subject_character_id: receipt.subject_character_id, text: receipt.rendered_text});
}
