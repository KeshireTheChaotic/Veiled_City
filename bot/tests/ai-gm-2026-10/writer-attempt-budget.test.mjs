import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {GMService} from '../../src/gm.js';
import {nativeDirectorNarrativeSource} from '../../src/narrative-director-source.js';
import {authorNarrativeRequests} from '../../src/narrative-authority.js';

const act = task => ({version: 9, fiction_delta: [], acts: [{id: 'station-scene', task_id: task, kind: 'scene_description', speaker_key: '',
  location_key: 'p07-station', source_refs: [], text: 'Amber light settles over the old station pump.'}]});

test('a corrected request for the same source gets its own writer call; repeating a request reuses its draft', async () => {
  const f = createP07NativeFixture();
  try {
    for (const [i, pc] of f.pcs.entries()) f.acceptSpeech(i ? 'owner-b' : 'owner-a', pc, `wab-${i}`, i ? 'The station needs repairs.' : 'The pump is still humming.');
    const director = {act: true, public_narration: '', narrative_claims: [], private_messages: [], events: [], handouts: [], relationships: [],
      npc_memories: [], npc_knowledge: [], npc_goals: [], simulation_updates: [], gm_notes: 'Ground the change.', confidence: 100};
    const ai = {responses: {create: async request => {
      if (request.text?.format?.name === 'world_director_manual') return {output_text: JSON.stringify(director), usage: {}};
      return {output_text: JSON.stringify(act(JSON.parse(request.input).audience_v9.task_ids[0])), usage: {}};
    }}};
    const service = new GMService({db: f.db, config: {gmModel: 'offline', narrativeModel: 'offline-writer', gmTurnDeadlineMs: 10000,
      structuredRetryMaxTokens: 6000, maxContentChunks: 0, maxRecentMessages: 10, openaiMaxRetries: 0},
      content: {root: '', read: () => '', search: () => []}, ai});
    // First attempt: the director's writer call saves an authoring attempt for this source and audience.
    const result = await service.runWorldDirector({guildId: f.guild, layer: 'manual', trigger: {scope: 'party', reason: 'offline'}});
    const sourceRef = nativeDirectorNarrativeSource(result);
    const first = f.db.listCityRecords(f.guild, {kind: 'narrative_draft', includeGM: true, limit: 5}).map(r => r.data.input);
    const corrected = {version: 8, kind: 'narrative_request', operation: 'describe_scene', source_refs: []};
    assert.equal(first.length, 1);
    assert.notDeepEqual(first[0], corrected, 'the corrected request differs from the first attempt');

    let writerCalls = 0;
    const generate = async packet => { writerCalls++; return act(packet.audience_v9.task_ids[0]); };
    const author = () => authorNarrativeRequests({db: f.db, guild: f.guild, result: {gm_world_parts: [corrected]}, scope: f.scope, sourceRef,
      budget: {used: false}, generate});
    await author();
    assert.equal(writerCalls, 1, 'the corrected request is authored instead of held as writer_budget');
    const held = f.db.listCityRecords(f.guild, {kind: 'narrative_unit_review', includeGM: true, limit: 50}).filter(r => r.data.reason === 'writer_budget');
    assert.equal(held.length, 0);
    await author();
    assert.equal(writerCalls, 1, 'the same request reuses its saved draft without another writer call');
  } finally { f.close(); }
});
