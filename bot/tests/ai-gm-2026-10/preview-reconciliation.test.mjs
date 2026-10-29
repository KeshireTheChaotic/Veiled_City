import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {declare,intent} from './play-flow-helpers.mjs';
import {previewAuthoritativeMutation} from '../../src/state.js';
import {reconcilePreviewConsequences} from '../../src/turn-orchestration.js';

// Mirrors the live 2026-10-28 failure: an NPC persuasion resolved auto with no ruling, receipt, roll or block.
function preview(f, reconcile) {
  const message = 'I try to talk Mara into sketching the gauge for me.';
  const {scope} = declare(f, `prc-${reconcile}`, message, []);
  const narrative = {narration: '', player_intents: [intent(message, {type: 'interact', operation: 'persuade', target_key: 'mara', target_name: 'Mara', utterance: '', resolution: 'auto'})]};
  return previewAuthoritativeMutation(f.db, {guildId: f.guild, sessionId: f.session.id, scope, narrative,
    provenance: {messageId: `prc-${reconcile}`, actorId: 'owner-a'},
    ...(reconcile ? {inspectMutation: mutation => reconcilePreviewConsequences(f.db, f.guild, mutation, narrative, scope)} : {})});
}

test('player-turn preview rejects an action with no native state so the correction retry can fix it', () => {
  const f = createP07NativeFixture();
  try {
    assert.throws(() => preview(f, true), error => error.code === 'CONSEQUENCE_RECONCILIATION' && error.diagnostic.type === 'interact');
  } finally { f.close(); }
});

test('previews that do not reconcile (director, observation) are unchanged', () => {
  const f = createP07NativeFixture();
  try {
    assert.doesNotThrow(() => preview(f, false));
  } finally { f.close(); }
});
