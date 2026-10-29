import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {declare,intent} from './play-flow-helpers.mjs';
import {narrativeTasks,taskDispositions} from '../../src/narrative-tasks.js';

test('only an auto move asks the writer for an arrival; a blocked move is held and settled', () => {
  // Live 2026-10-29: a blocked bus trip still got an arrival task and the writer narrated arriving at the archive.
  const f = createP07NativeFixture();
  try {
    const message = 'I catch a bus across town to the station.';
    const move = intent(message, {type: 'move', operation: 'travel', target_key: 'p07-station', target_name: 'the station', resolution: 'blocked', reason: 'Not now.'});
    const {scope, sourceRef} = declare(f, 'pfx-move', message, []);
    assert.deepEqual(narrativeTasks(f.db, f.guild, {player_intents: [move]}, scope, sourceRef).map(t => t.kind), ['held_move']);
    assert.deepEqual(narrativeTasks(f.db, f.guild, {player_intents: [{...move, resolution: 'auto'}]}, scope, sourceRef).map(t => t.kind), ['arrival']);
    const [task] = taskDispositions(f.db, f.guild, {player_intents: [move]}, [], scope, sourceRef);
    // Disposition is only reported for an accepted intent; an unaccepted one still needs clarification.
    assert.ok(['move_held', 'needs_clarification'].includes(task.disposition));
  } finally { f.close(); }
});
