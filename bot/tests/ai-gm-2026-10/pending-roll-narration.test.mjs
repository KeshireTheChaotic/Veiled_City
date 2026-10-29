import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {declare,intent} from './play-flow-helpers.mjs';
import {narrativeTasks} from '../../src/narrative-tasks.js';

test('a roll-required action becomes a pending_roll task so the writer cannot settle it', () => {
  const f = createP07NativeFixture();
  try {
    const message = 'I try to talk Mara into lending me the gauge overnight.';
    const persuade = intent(message, {type: 'interact', operation: 'persuade', target_key: 'mara', target_name: 'Mara', resolution: 'roll_required'});
    const {scope, sourceRef} = declare(f, 'pfx-roll', message, []);
    assert.deepEqual(narrativeTasks(f.db, f.guild, {player_intents: [persuade]}, scope, sourceRef).map(t => t.kind), ['pending_roll']);
    const talk = {...persuade, resolution: 'conversational'};
    assert.deepEqual(narrativeTasks(f.db, f.guild, {player_intents: [talk]}, scope, sourceRef).map(t => t.kind), ['npc_response']);
  } finally { f.close(); }
});
