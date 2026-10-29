import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {declare,intent} from './play-flow-helpers.mjs';
import {prepareAuthorizedTurnOutput} from '../../src/pvp-output.js';

test('observing or risking an action on a narrated object is grounded to the character location', () => {
  const f = createP07NativeFixture();
  try {
    for (const [id, message, type, resolution] of [
      ['pfx-observe', 'I study the branching mark on the red tile.', 'observe', 'auto'],
      ['pfx-risk', 'I pry at the glaze on the red tile with my knife.', 'interact', 'blocked']]) {
      const {pc, accepted} = declare(f, id, message,
        [intent(message, {type, operation: 'act on tile', target_key: '', target_name: 'red tile', utterance: '', resolution,
          reason: resolution === 'blocked' ? 'Nessa stops the attempt.' : ''})]);
      assert.equal(accepted.length, 1, `${type}/${resolution} is accepted for adjudication`);
      assert.equal(accepted[0].data.target_key, pc.data.location);
      assert.equal(accepted[0].data.target_name, 'red tile');
    }
  } finally { f.close(); }
});

test('an auto interaction on a narrated object keeps waiting, since it would have no native receipt', () => {
  const f = createP07NativeFixture();
  try {
    const message = 'I press the old brass key against the red tile.';
    const {accepted} = declare(f, 'pfx-auto', message,
      [intent(message, {type: 'interact', operation: 'press key against tile', target_key: '', target_name: 'red tile', utterance: '', resolution: 'auto'})]);
    assert.equal(accepted.length, 0);
  } finally { f.close(); }
});

test('an action still parked on an unknown target shows the player a clarification question', () => {
  const f = createP07NativeFixture();
  try {
    const message = 'I tell the carter: where did the crate come from?';
    const {scope, accepted, sourceRef} = declare(f, 'pfx-clarify', message,
      [intent(message, {type: 'speak', operation: 'speak', target_key: '', target_name: 'the carter', utterance: 'where did the crate come from?', resolution: 'conversational'})]);
    assert.equal(accepted.length, 0, 'speech to an unknown person still waits for its target');
    const output = prepareAuthorizedTurnOutput(f.db, f.guild, {narration: '', player_intents: []}, scope, {sourceRef});
    assert.match(output.narration, /Which specific target did you mean by "the carter"\?/);
  } finally { f.close(); }
});
