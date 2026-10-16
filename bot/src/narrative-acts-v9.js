/** Non-effect creative proposals, verified per act. Never bypass legacy validators until v9 is qualified. */
export const NARRATIVE_ACT_KINDS = Object.freeze([
  'scene_description', 'player_perception', 'npc_speech', 'npc_offer',
  'npc_allegation', 'artifact_text', 'gm_internal_note'
]);
const kinds = new Set(NARRATIVE_ACT_KINDS);
const safeId = value => typeof value === 'string' && value.length > 0 && value.length <= 160;
const hold = (id, reason) => Object.freeze({id: id || '', status: 'held', reason});

/**
 * verifyAct is native and MUST independently check locality, disclosure, NPC knowledge,
 * player agency and unsupported free-text effects against actual state and provenance.
 * Its returned proof is only a candidate for the existing publication boundary.
 * Generated `kind` and `text` alone never make an act safe.
 */
export function compileNarrativeActs({authority, grant, proposals, verifyAct}) {
  if (!authority || typeof authority.inspect !== 'function') throw new TypeError('native audience authority required');
  const binding = authority.inspect(grant);
  if (!Array.isArray(proposals) || proposals.length > 12) throw new TypeError('bounded narrative acts required');
  const seen = new Set();
  return Object.freeze(proposals.map(act => {
    const id = safeId(act?.id) ? act.id : '';
    if (!id || seen.has(id)) return hold(id, 'invalid_or_duplicate_id');
    seen.add(id);
    if (!kinds.has(act.kind) || !safeId(act.task_id) || !binding.task_ids.includes(act.task_id)
      || typeof act.text !== 'string' || !act.text.trim() || act.text.length > 1800
      || !Array.isArray(act.source_refs) || act.source_refs.length > 8
      || act.source_refs.some(ref => !safeId(ref))) return hold(id, 'shape_or_task');
    if (act.kind === 'gm_internal_note' && binding.audience !== 'gm_internal'
      || act.kind !== 'gm_internal_note' && binding.audience === 'gm_internal') return hold(id, 'audience_role');
    if (act.kind === 'player_perception' && (binding.viewpoint !== 'character'
      || !['player', 'player_private'].includes(binding.audience))) return hold(id, 'character_viewpoint');
    // Mechanical input/output are never accepted through this creative prose compiler.
    if (typeof verifyAct !== 'function') return hold(id, 'native_verifier_required');
    let native;
    try { native = verifyAct(Object.freeze({...act, source_refs: Object.freeze([...act.source_refs])}), binding); }
    catch(error) {
      if(!['SCENE_FICTION','NARRATIVE_PVP'].includes(error.code))throw error;
      return hold(id, error.diagnostic?.category || 'native_verification_failed');
    }
    if (native?.approved !== true || !safeId(native.proof_ref) || native.task_id !== act.task_id
      || native.audience !== binding.audience || native.source_event !== binding.source_event) return hold(id, 'native_verification_failed');
    return Object.freeze({id, task_id: act.task_id, kind: act.kind, status: 'verified_candidate',
      text: act.text, proof_ref: native.proof_ref, audience: binding.audience,
      source_event: binding.source_event});
  }));
}
