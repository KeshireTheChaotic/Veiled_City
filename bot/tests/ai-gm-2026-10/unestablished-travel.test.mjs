import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {intent} from './play-flow-helpers.mjs';
import {autoCompleteOrdinaryMovements} from '../../src/typed-intents.js';

test('travel to an unestablished place is held as blocked instead of failing the turn', () => {
  const f = createP07NativeFixture();
  try {
    const pc = f.pcs[0], scope = {mode: 'party', actorUserId: 'owner-a', actorCharacterId: pc.id};
    const result = {scene_actions: [], player_intents: [intent('I head out onto the east road', {type: 'move', operation: 'travel', target_key: '', target_name: 'east road', resolution: 'auto'})]};
    assert.doesNotThrow(() => autoCompleteOrdinaryMovements(f.db, f.guild, result, scope));
    assert.equal(result.player_intents[0].resolution, 'blocked');
    assert.match(result.player_intents[0].reason, /east road/);
    assert.equal(result.scene_actions.length, 0, 'no arrival is invented');
    const known = {scene_actions: [], player_intents: [intent('I walk to the station', {type: 'move', operation: 'travel', target_key: '', target_name: 'station', resolution: 'auto'})]};
    autoCompleteOrdinaryMovements(f.db, f.guild, known, scope);
    assert.equal(known.scene_actions[0]?.entity_ref, 'p07-station', 'an established destination still auto-completes');
  } finally { f.close(); }
});
