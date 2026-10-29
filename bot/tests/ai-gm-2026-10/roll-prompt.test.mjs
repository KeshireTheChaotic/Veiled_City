import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {rollPromptPayload,isPublicRollRequest,publishRollRequests} from '../../src/roll-requests.js';
import {handleRollMenuInteraction,isRollMenuInteraction} from '../../src/roll-menu.js';

function seed(f, {acceptedVisibility = 'party', privateResult = false} = {}) {
  const pc = f.pcs[0];
  f.db.saveCityRecord(f.guild, {kind: 'typed_intent', key: 'accepted:prompt-test', status: 'accepted_for_adjudication', visibility: acceptedVisibility,
    subject_key: acceptedVisibility === 'character' ? pc.id : null, source_event: 'p07:npc-arrival:mara', data: {actor: pc.id}});
  return f.db.saveCityRecord(f.guild, {kind: 'roll_request', key: 'roll:prompt-test', status: 'pending', visibility: 'character', subject_key: pc.id,
    source_event: 'p07:npc-arrival:mara', data: {session_id: f.session.id, character_id: pc.id, owner_user_id: 'owner-a', character_name: pc.name,
      attempt: '<@1555295975042457702> I talk Mara into lending me the gauge.', kind: 'action',
      breakdown: {trait: 'Presence', trait_bonus: 0, modifiers: [], subtotal: 0, advantage: 0, disadvantage: 0, difficulty: 11, attack: null, unresolved: []},
      input: {accepted_intent: 'accepted:prompt-test', ...(privateResult ? {private_result: true} : {})}, revision: 1, history: []}});
}

test('the public prompt summarizes the request and carries owner Roll and Options buttons', () => {
  const f = createP07NativeFixture();
  try {
    const payload = rollPromptPayload(seed(f));
    assert.match(payload.content, /Roll requested — .+ \(<@owner-a>\)/);
    assert.match(payload.content, /> I talk Mara into lending me the gauge\./, 'the bot mention is stripped from the quoted attempt');
    assert.match(payload.content, /Presence action roll \(\+0\) against Difficulty 11\./);
    assert.deepEqual(payload.components[0].components.map(b => b.custom_id), ['vcrp|roll:prompt-test|roll', 'vcrp|roll:prompt-test|options']);
    assert.deepEqual(payload.allowedMentions, {users: ['owner-a']});
  } finally { f.close(); }
});

test('table rolls are public unless the result or the declaration is private', () => {
  for (const [options, expected] of [[{}, true], [{privateResult: true}, false], [{acceptedVisibility: 'character'}, false]]) {
    const f = createP07NativeFixture();
    try { assert.equal(isPublicRollRequest(f.db, f.guild, seed(f, options)), expected, JSON.stringify(options)); } finally { f.close(); }
  }
});

test('a public request is sent once as a table prompt instead of a private breakdown', async () => {
  const f = createP07NativeFixture();
  try {
    const row = seed(f), sent = [];
    await publishRollRequests(f.db, f.guild, {nativeAdjudications: [{roll_request_ref: row.record_key}]},
      async (user, payload, sessionId, characterId, meta) => { sent.push({user, payload, meta}); });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].meta.publicPrompt.record_key, row.record_key);
    assert.match(sent[0].payload.content, /Roll requested/);
  } finally { f.close(); }
});

test('a unified-arbitration roll gets the table prompt when public and stays with the turn output when private', async () => {
  // Mirrors the live 2026-10-28 persuasion: a pending_pc_roll decision, never collected for the prompt before.
  for (const [options, expected] of [[{}, 1], [{privateResult: true}, 0]]) {
    const f = createP07NativeFixture();
    try {
      const row = seed(f, options), sent = [];
      await publishRollRequests(f.db, f.guild, {unifiedArbitration: [{status: 'pending_pc_roll', data: {native: {roll_request_ref: row.record_key}}}]},
        async (user, payload, sessionId, characterId, meta) => { sent.push(meta); });
      assert.equal(sent.length, expected, JSON.stringify(options));
      if (expected) assert.equal(sent[0].publicPrompt.record_key, row.record_key);
    } finally { f.close(); }
  }
});

test('only the owner can press the prompt; others get a private notice and nothing rolls', async () => {
  const f = createP07NativeFixture();
  try {
    const row = seed(f), replies = [];
    const interaction = {customId: `vcrp|${row.record_key}|roll`, guildId: f.guild, user: {id: 'owner-b'}, reply: async r => replies.push(r)};
    assert.equal(isRollMenuInteraction(interaction), true);
    assert.equal(await handleRollMenuInteraction(f.db, interaction), true);
    assert.equal(replies[0].ephemeral, true);
    assert.match(replies[0].content, /Only <@owner-a> can roll this\./);
    assert.equal(f.db.getCityRecord(f.guild, 'roll_request', row.record_key).status, 'pending');
  } finally { f.close(); }
});
