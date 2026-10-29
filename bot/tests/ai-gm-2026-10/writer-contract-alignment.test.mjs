import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {GMService} from '../../src/gm.js';
import {applyAuthoritativeMutation} from '../../src/state.js';
import {nativeDirectorNarrativeSource} from '../../src/narrative-director-source.js';
import {narrativeResponseV9Schema,NARRATIVE_V9_INSTRUCTIONS} from '../../src/frameworks/narrative/writer-contract-v9.js';
import {actToNativeUnit} from '../../src/narrative-writer-v9.js';
import {PLAYER_INTENT_PROMPT} from '../../src/typed-intents.js';

test('writer schema constrains act ids to the narrative unit id rule', () => {
  const id = narrativeResponseV9Schema.properties.acts.items.anyOf[0].properties.id;
  const rule = new RegExp(id.pattern);
  for (const ok of ['a', 'station-scene', 'scene-1']) assert.match(ok, rule);
  // Ids observed from gpt-6.1-sol and gpt-6-luna before the pattern existed.
  for (const bad of ['act:scene:1', 'scene:hollow-street:opening', 'act_1', 'Scene-1']) assert.doesNotMatch(bad, rule);
  assert.equal(narrativeResponseV9Schema.properties.acts.items.anyOf[1].properties.id.pattern, id.pattern);
});

test('writer instructions state the player character name rule the act guard enforces', () => {
  // Live 2026-10-29: two Nessa replies were held whole because their narration named Tyrell.
  assert.match(NARRATIVE_V9_INSTRUCTIONS, /never contains a player character name or alias/);
  assert.match(NARRATIVE_V9_INSTRUCTIONS, /npc_speech may only open with the name as a direct address/);
});

test('writer instructions require persisting newly described places players may travel to', () => {
  // Live 2026-10-29: the narrated bathhouse was never persisted, so moving there asked "Which specific target did you mean".
  assert.match(NARRATIVE_V9_INSTRUCTIONS, /must be added to fiction_delta as a location/);
  assert.match(NARRATIVE_V9_INSTRUCTIONS, /parent_location_key set to the current location/);
  // establishment only runs for an entity that some act is placed at.
  assert.match(NARRATIVE_V9_INSTRUCTIONS, /the act describing it must use that key as its location_key/);
});

test('writer can produce an actionable lead through the native lead unit kind', () => {
  assert.ok(narrativeResponseV9Schema.properties.acts.items.anyOf[0].properties.kind.enum.includes('lead'));
  const unit = actToNativeUnit({id:'archive-lead',task_id:'investigate',kind:'lead',speaker_key:'',location_key:'station',
    text:'A brass token stamped with the east-road bathhouse mark lies beneath the counter.',source_refs:[]}, {scope:{mode:'party'}});
  assert.equal(unit.kind,'lead');
  assert.equal(unit.epistemic,'observation');
});

test('ordinary established travel is not blocked only because it takes time', () => {
  assert.match(PLAYER_INTENT_PROMPT, /distance, crossing town, transit time or elapsed time alone are not obstacles/);
});

test('model paragraph breaks become spaces while other text is kept exactly', () => {
  const unit = actToNativeUnit({id: 'a', task_id: 't', kind: 'scene_description', speaker_key: '', location_key: 'stall',
    text: 'Rain needles the awning.\n\nA bus sighs past.\r\n\tNobody gets off.', source_refs: []}, {scope: {mode: 'party'}});
  assert.equal(unit.text, 'Rain needles the awning. A bus sighs past. Nobody gets off.');
});

test('multi-paragraph writer output is established instead of held for shape', async () => {
  const f = createP07NativeFixture();
  try {
    for (const [i, pc] of f.pcs.entries()) f.acceptSpeech(i ? 'owner-b' : 'owner-a', pc, `wca-${i}`, i ? 'The station needs repairs.' : 'The pump is still humming.');
    const director = {act: true, public_narration: '', narrative_claims: [], private_messages: [], events: [], handouts: [], relationships: [],
      npc_memories: [], npc_knowledge: [], npc_goals: [], simulation_updates: [], gm_notes: 'Ground the change.', confidence: 100};
    const ai = {responses: {create: async request => {
      if (request.text?.format?.name === 'world_director_manual') return {output_text: JSON.stringify(director), usage: {}};
      const task = JSON.parse(request.input).audience_v9.task_ids[0];
      return {output_text: JSON.stringify({version: 9, fiction_delta: [], acts: [{id: 'station-scene', task_id: task, kind: 'scene_description',
        speaker_key: '', location_key: 'p07-station', source_refs: [],
        text: 'Amber light settles over the old station pump.\n\nIts faint vibration hums through the floor.'}]}), usage: {}};
    }}};
    const service = new GMService({db: f.db, config: {gmModel: 'offline', narrativeModel: 'offline-writer', gmTurnDeadlineMs: 10000,
      structuredRetryMaxTokens: 6000, maxContentChunks: 0, maxRecentMessages: 10, openaiMaxRetries: 0},
      content: {root: '', read: () => '', search: () => []}, ai});
    const result = await service.runWorldDirector({guildId: f.guild, layer: 'manual', trigger: {scope: 'party', reason: 'offline'}});
    applyAuthoritativeMutation(f.db, {guildId: f.guild, sessionId: f.session.id, narrative: result, scope: f.scope,
      source: 'world_director_manual', provenance: {actorType: 'ai', actorId: 'world_director'}});
    const units = f.db.listCityRecords(f.guild, {kind: 'narrative_unit', includeGM: true, limit: 20})
      .filter(row => row.status === 'accepted_established' && row.data.binding.source === nativeDirectorNarrativeSource(result));
    assert.equal(units.length, 1);
    assert.equal(units[0].data.text, 'Amber light settles over the old station pump. Its faint vibration hums through the floor.');
  } finally { f.close(); }
});
