import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {GMService} from '../../src/gm.js';
import {applyAuthoritativeMutation} from '../../src/state.js';
import {nativeDirectorNarrativeSource} from '../../src/narrative-director-source.js';
import {renderNarrativeUnit,legacyNpcSpeechLine} from '../../src/narrative-authority.js';

async function speechUnit(text) {
  const f = createP07NativeFixture();
  for (const [i, pc] of f.pcs.entries()) f.acceptSpeech(i ? 'owner-b' : 'owner-a', pc, `nsq-${i}`, i ? 'The station needs repairs.' : 'The pump is still humming.');
  const director = {act: true, public_narration: '', narrative_claims: [], private_messages: [], events: [], handouts: [], relationships: [],
    npc_memories: [], npc_knowledge: [], npc_goals: [], simulation_updates: [], gm_notes: 'Let Mara respond.', confidence: 100};
  const ai = {responses: {create: async request => {
    if (request.text?.format?.name === 'world_director_manual') return {output_text: JSON.stringify(director), usage: {}};
    const task = JSON.parse(request.input).audience_v9.task_ids[0];
    return {output_text: JSON.stringify({version: 9, fiction_delta: [], acts: [{id: 'mara-line', task_id: task, kind: 'npc_speech',
      speaker_key: 'mara', location_key: 'p07-station', source_refs: [], text}]}), usage: {}};
  }}};
  const service = new GMService({db: f.db, config: {gmModel: 'offline', narrativeModel: 'offline-writer', gmTurnDeadlineMs: 10000,
    structuredRetryMaxTokens: 6000, maxContentChunks: 0, maxRecentMessages: 10, openaiMaxRetries: 0},
    content: {root: '', read: () => '', search: () => []}, ai});
  const result = await service.runWorldDirector({guildId: f.guild, layer: 'manual', trigger: {scope: 'party', reason: 'offline'}});
  applyAuthoritativeMutation(f.db, {guildId: f.guild, sessionId: f.session.id, narrative: result, scope: f.scope,
    source: 'world_director_manual', provenance: {actorType: 'ai', actorId: 'world_director'}});
  const unit = f.db.listCityRecords(f.guild, {kind: 'narrative_unit', includeGM: true, limit: 20})
    .find(row => row.status === 'accepted_established' && row.data.binding.source === nativeDirectorNarrativeSource(result));
  return {f, unit};
}

test('speech the writer already quoted is not wrapped in a second pair of quotes', async () => {
  const {f, unit} = await speechUnit('“The blue one,” Mara says, tapping the gauge. “Came in first.”');
  try {
    assert.ok(unit, 'speech unit is established');
    assert.equal(unit.data.text, 'Mara Vale: “The blue one,” Mara says, tapping the gauge. “Came in first.”');
    assert.equal(renderNarrativeUnit(f.db, f.guild, unit.record_key, f.scope), unit.data.text);
  } finally { f.close(); }
});

test('bare speech is still wrapped in quotes', async () => {
  const {f, unit} = await speechUnit('The pump has been running since dawn.');
  try {
    assert.equal(unit.data.text, 'Mara Vale: “The pump has been running since dawn.”');
  } finally { f.close(); }
});

test('units stored with the old double quoting still match on re-render', () => {
  assert.equal(legacyNpcSpeechLine('Nessa Vale: “Both fit,” she says.'), 'Nessa Vale: ““Both fit,” she says.”');
  assert.equal(legacyNpcSpeechLine('no separator'), 'no separator');
});
