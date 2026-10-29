import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {declare,intent} from './play-flow-helpers.mjs';
import {prepareAuthorizedTurnOutput} from '../../src/pvp-output.js';

test('acting on a narrated object is grounded to the character location instead of parking', () => {
  const f = createP07NativeFixture();
  try {
    const message = 'I press the old brass key against the red tile.';
    const {pc, accepted} = declare(f, 'pfx-object', message,
      [intent(message, {type: 'interact', operation: 'press key against tile', target_key: '', target_name: 'red tile', utterance: '', resolution: 'auto'})]);
    assert.equal(accepted.length, 1, 'the action is accepted for adjudication');
    assert.equal(accepted[0].data.target_key, pc.data.location);
    assert.equal(accepted[0].data.target_name, 'red tile');
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
