import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDirectorConfidence} from '../../src/director.js';
import {bindArbitrationTurn,arbitrationTurnOrigin} from '../../src/scene-intent-board.js';

test('normalizing director confidence keeps the arbitration turn origin bound to the result', () => {
  // Live 2026-10-28: a copied result lost its origin and the round failed with native_service_origin_required.
  const origin = {binding: {scene: 'scene-1'}}, result = bindArbitrationTurn({act: true, confidence: 40, unified_arbitration: {}}, origin);
  const normalized = normalizeDirectorConfidence(result);
  assert.equal(arbitrationTurnOrigin(normalized), origin);
  assert.equal(normalized.review_required, false);
  assert.equal(normalized.act, true);
});
