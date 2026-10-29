import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {promptResult} from '../../src/roll-menu.js';

function rolled(f, result, deltas, outcome) {
  const pc = f.pcs[0], key = `roll:result-${result.duality}`;
  const row = f.db.saveCityRecord(f.guild, {kind: 'roll_request', key, status: 'resolved', visibility: 'character', subject_key: pc.id,
    source_event: 'p07:npc-arrival:mara', data: {character_name: pc.name, owner_user_id: 'owner-a', result, input: {}}});
  f.db.saveCityRecord(f.guild, {kind: 'roll_operation', key: `op-${key}`, visibility: 'character', subject_key: pc.id, source_event: 'p07:npc-arrival:mara',
    data: {request: key, op: 'roll', resource_deltas: deltas.map(d => ({character: pc.id, ...d}))}});
  f.db.saveCityRecord(f.guild, {kind: 'action_outcome_receipt', key: `receipt-${key}`, status: 'resolved', visibility: 'party', source_event: 'p07:npc-arrival:mara',
    data: {request: key, outcome}});
  return {pc, row};
}
const dice = (hope, fear, extra) => ({hope, fear, modifier: 0, experience: 0, total: hope + fear, ...extra});

test('a critical shows both dice, the verdict and the Hope and Stress changes', () => {
  const f = createP07NativeFixture();
  try {
    // Mirrors the live 2026-10-28 roll: Hope 1 + Fear 1 = 2, Critical success.
    const {pc, row} = rolled(f, dice(1, 1, {duality: 'Critical'}), [{hope: {before: 2, after: 3, delta: 1}, stress: {before: 1, after: 0, delta: -1}}], 'success');
    assert.equal(promptResult(f.db, f.guild, row), `🎲 Hope **1** + Fear **1** = **2** — **Critical**: **success**.\n${pc.name}: Hope +1 (2 → 3), Stress -1 (1 → 0).`);
  } finally { f.close(); }
});

test('modifiers, Experience and advantage are shown as separate terms', () => {
  const f = createP07NativeFixture();
  try {
    const {row} = rolled(f, {hope: 7, fear: 3, modifier: 2, experience: 2, total: 18, duality: 'Hope'}, [{hope: {before: 6, after: 6, delta: 0}, stress: {before: 0, after: 0, delta: 0}}], 'success');
    const text = promptResult(f.db, f.guild, row);
    assert.match(text, /^🎲 Hope \*\*7\*\* \+ Fear \*\*3\*\* \+ 2 \+ Experience 2 \+ advantage 4 = \*\*18\*\* — with \*\*Hope\*\*: \*\*success\*\*\./);
    assert.match(text, /Hope stays at 6 \(maximum\)\./);
  } finally { f.close(); }
});

test('a roll with Fear reports the GM Fear gained', () => {
  const f = createP07NativeFixture();
  try {
    f.db.changeFear(f.guild, 1);
    const {row} = rolled(f, dice(2, 9, {modifier: -1, total: 10, duality: 'Fear'}), [{hope: {before: 2, after: 2, delta: 0}, stress: {before: 0, after: 0, delta: 0}}], 'failure');
    const text = promptResult(f.db, f.guild, row);
    assert.match(text, /^🎲 Hope \*\*2\*\* \+ Fear \*\*9\*\* − 1 = \*\*10\*\* — with \*\*Fear\*\*: \*\*failure\*\*\./);
    assert.match(text, /The GM gains 1 Fear \(now 1\/12\)\./);
    assert.doesNotMatch(text, /Hope stays/);
  } finally { f.close(); }
});
