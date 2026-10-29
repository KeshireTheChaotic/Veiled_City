import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {contractRecoveryInstructions} from '../../src/gm.js';

test('turn-ending contract failures seen live get a targeted final recovery attempt', () => {
  assert.match(contractRecoveryInstructions({code: 'GM_ARBITRATION'}).join(' '), /Omit unified_arbitration npc_intents/);
  assert.match(contractRecoveryInstructions({code: 'CONSEQUENCE_RECONCILIATION'}).join(' '), /narrative_no_roll/);
  assert.match(contractRecoveryInstructions({code: 'DECISION_ADVISORY'}).join(' '), /mode roll only/);
});

test('other errors keep their existing recovery or failure behaviour', () => {
  for (const code of ['NARRATIVE_PVP', 'PLAYER_INTENT', undefined]) assert.equal(contractRecoveryInstructions({code}), null);
  assert.equal(contractRecoveryInstructions(null), null);
});
