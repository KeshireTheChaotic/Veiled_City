import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {connectUnifiedArbitration} from '../../src/framework-to-framework/daggerheart--intent/public.js';

// Mirrors the live 2026-10-28 hold: Nessa's proposed action targeted a narrated object, so npc_native_target failed the turn.
function fixture(t) {
  const sqlite = new DatabaseSync(':memory:'); t.after(() => sqlite.close());
  sqlite.exec('CREATE TABLE records (guild TEXT, kind TEXT, key TEXT, value TEXT, PRIMARY KEY(guild,kind,key))'); let depth = 0;
  const db = {getCityRecord(g, k, r) { const row = sqlite.prepare('SELECT value FROM records WHERE guild=? AND kind=? AND key=?').get(g, k, r); return row ? JSON.parse(row.value) : null; },
    saveCityRecord(g, r) { const v = {...r, record_key: r.key}; sqlite.prepare('INSERT OR REPLACE INTO records VALUES (?,?,?,?)').run(g, r.kind, r.key, JSON.stringify(v)); return v; },
    transaction(fn) { if (depth) return fn(); sqlite.exec('BEGIN IMMEDIATE'); depth++; try { const v = fn(); sqlite.exec('COMMIT'); return v; } catch (e) { sqlite.exec('ROLLBACK'); throw e; } finally { depth--; } },
    getRulesRuling() { return null; },
    getCharacter: key => key === 'pc-tyrell' ? {id: key} : null, getNpcProfile: (_g, key) => key === 'npc-nessa' ? {npc_key: key} : null,
    getSimulationEntity: (_g, kind, key) => kind === 'location' && key === 'market' ? {entity_key: key} : null};
  const binding = {source: 'source-41', scene: 'scene-market', session: 9, location: 'market'}, seen = [];
  const board = db.saveCityRecord('g', {kind: 'scene_intent_board', key: 'board-41', source_event: binding.source, data: {origin: binding, entries: []}});
  const source = {gmArbitrationProposalSchema: {}, unifiedArbitrationSchema: {}, inspectArbitrationOrigin: () => ({binding, scope: {mode: 'party'}}),
    buildSceneIntentBoard(_d, _g, _o, _rows, npcProposals) { seen.push(npcProposals); return board; },
    currentScenePlayerInputs: (_d, _g, _o, rows) => rows, arbitrationTurnOrigin: r => r.origin, matchesArbitrationSchema: () => true};
  const mechanics = {EncounterLibrary: class {}, indexWorldEvent: (_d, _g, e) => ({event_key: e.key}), consentAction() {}, historicalActionSource() {}, isPvpIntent: () => false,
    applyNativeEnvironmentProfileProposals() {}, establishPreparedPositions() {}, pendingFeatureWindows: () => [], prepareNativeRollParticipation: () => ({eligibility: true}),
    executeEnvironmentProposal() {}, reserveFeatureWindow() { throw new Error('unexpected feature spend'); }};
  return {db, seen, service: connectUnifiedArbitration({source, mechanics})};
}

test('an NPC proposal keeps only native targets; narrated objects no longer fail the turn', t => {
  const f = fixture(t);
  const npc = {actor_key: 'npc-nessa', operation: 'offer', target_refs: ['pc-tyrell', 'red-tile', 'pc-tyrell', 'market'], objective_ref: '', source_refs: [], dependencies: []};
  f.service.applyUnifiedArbitration(f.db, 'g', {origin: {opaque: true}, unified_arbitration: {decisions: [], npc_intents: [npc], environment_actions: []}}, []);
  assert.deepEqual(f.seen[0].map(p => p.target_refs), [['pc-tyrell', 'market']]);
  assert.deepEqual(npc.target_refs, ['pc-tyrell', 'red-tile', 'pc-tyrell', 'market'], 'the model output itself is not mutated');
});
