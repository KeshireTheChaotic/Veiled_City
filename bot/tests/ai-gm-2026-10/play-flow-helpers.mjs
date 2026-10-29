import {captureWorldInput,worldInputKey} from '../../src/autonomous-world.js';
import {captureAuthoredTurnEnvelope} from '../../src/authored-turn-envelope.js';
import {persistPlayerIntents} from '../../src/typed-intents.js';

/** Owner-a's PC declares one message; returns the accepted intents and its world-input source. */
export function declare(f, messageId, message, intents) {
  const pc = f.pcs[0], scope = {mode: 'party', actorUserId: 'owner-a', actorCharacterId: pc.id};
  captureWorldInput(f.db, f.guild, 'owner-a', pc.id, messageId, message);
  captureAuthoredTurnEnvelope(f.db, f.guild, 'owner-a', pc.id, messageId, message);
  const accepted = persistPlayerIntents(f.db, f.guild, intents, scope, {messageId});
  return {pc, scope, accepted, sourceRef: worldInputKey(messageId, pc.id)};
}
export const intent = (span, extra) => ({source_span: span, framing: 'immediate', destination: 'unspecified', reason: '', excluded_targets: [], ...extra});
