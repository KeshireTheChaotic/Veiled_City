/** V9 audience capability: only native policy can issue a recipient-bound grant. */
export const AUDIENCES = Object.freeze(['channel', 'player', 'player_private', 'gm_internal']);
const audiences = new Set(AUDIENCES);
const nonempty = value => typeof value === 'string' && value.length > 0 && value.length <= 256;
const fail = reason => { throw Object.assign(new Error(`Audience capability refused: ${reason}`), {code: 'AUDIENCE_V9'}); };
function frozenSnapshot(value,seen=new WeakSet()){
  if(value&&typeof value==='object'&&!seen.has(value)){
    seen.add(value);for(const child of Object.values(value))frozenSnapshot(child,seen);Object.freeze(value);
  }
  return value;
}

/** The callback MUST verify source, scene, location/zone, owner/revision, recipient/disclosure and viewpoint. */
export function createAudienceAuthority({authorize}) {
  if (typeof authorize !== 'function') fail('native_authorizer_required');
  const issued = new WeakMap();
  return Object.freeze({
    issue(request) {
      if (!request || !audiences.has(request.audience)) fail('audience');
      const proof = authorize(request);
      if (!proof || proof.authorized !== true || !nonempty(proof.source_event)
        || !nonempty(proof.scene) || !nonempty(proof.session) || !nonempty(proof.proof_ref)) fail('native_proof');
      if (proof.audience !== request.audience) fail('audience_mismatch');
      if (['player', 'player_private'].includes(proof.audience)
        && (!nonempty(proof.recipient_user_id) || !nonempty(proof.recipient_character_id))) fail('recipient');
      if (['channel', 'gm_internal'].includes(proof.audience)
        && (proof.recipient_user_id || proof.recipient_character_id)) fail('unexpected_recipient');
      if (!Array.isArray(proof.task_ids) || !proof.task_ids.length
        || proof.task_ids.length > 24 || proof.task_ids.some(id => !nonempty(id))
        || new Set(proof.task_ids).size !== proof.task_ids.length) fail('task_binding');
      if (!['camera', 'character', 'internal'].includes(proof.viewpoint)) fail('viewpoint');
      if (proof.viewpoint === 'character' && !nonempty(proof.viewpoint_character_id)) fail('viewpoint_character');
      if (proof.audience === 'gm_internal' && proof.viewpoint !== 'internal') fail('internal_viewpoint');
      if (proof.audience !== 'gm_internal' && proof.viewpoint === 'internal') fail('external_viewpoint');
      const grant = Object.freeze(Object.create(null));
      issued.set(grant, frozenSnapshot(structuredClone(proof)));
      return grant;
    },
    inspect(grant) {
      const proof = grant && typeof grant === 'object' ? issued.get(grant) : null;
      if (!proof) fail('unissued_capability');
      return proof;
    }
  });
}

export function audienceSurface(authority, grant) {
  if (!authority || typeof authority.inspect !== 'function') fail('native_authority_required');
  const proof = authority.inspect(grant);
  if (!audiences.has(proof.audience)) fail('audience');
  if (proof.audience === 'gm_internal') return Object.freeze({kind: 'backend', publish: false});
  if (proof.audience === 'player_private') return Object.freeze({kind: 'private_user', recipient_user_id: proof.recipient_user_id, publish: true});
  return Object.freeze({kind: 'party', publish: true});
}
