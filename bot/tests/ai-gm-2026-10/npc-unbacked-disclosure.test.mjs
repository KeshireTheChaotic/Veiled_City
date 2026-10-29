import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {prepareAuthorizedTurnOutput,candidateNarrative} from '../../src/pvp-output.js';
import {validateCandidateClaims} from '../../src/narrative-integrity.js';

// Mirrors the live 2026-10-28 Nessa line: hedged NPC speech the writer labelled as a disclosure.
const line = 'Mara Vale: “I can compare the strokes,” she says, “but I don’t recognize the hand.”';
const claim = (extra = {}) => ({actor: 'npc:mara', entity_type: 'npc', entity: 'mara', action: 'disclosure', prior: '',
  proposed: 'does not recognize the handwriting', visibility: 'party', source_ref: '', mutation_index: -1, certainty: 'dialogue',
  authored_source_span: '', output_claim_span: line, ...extra});

function audit(f, claims) {
  const output = prepareAuthorizedTurnOutput(f.db, f.guild, {narration: line, narrative_claims: claims}, f.scope);
  return validateCandidateClaims(f.db, f.guild, candidateNarrative(output), f.scope, [], {output});
}

test('an NPC disclosure claim that cites no fact is dropped for review instead of failing the turn', () => {
  const f = createP07NativeFixture();
  try {
    const result = audit(f, [claim()]);
    assert.equal(result.ok, true);
    assert.equal(result.diagnostics.length, 1);
    assert.equal(result.diagnostics[0].category, 'scoped_disclosure');
    assert.equal(result.diagnostics[0].reason_code, 'fact_missing');
  } finally { f.close(); }
});

test('an NPC disclosure claim citing a fact that does not exist still fails', () => {
  const f = createP07NativeFixture();
  try {
    assert.throws(() => audit(f, [claim({source_ref: 'fact-404'})]),
      error => error.code === 'NARRATIVE_INTEGRITY' && error.diagnostic.category === 'scoped_disclosure');
  } finally { f.close(); }
});

test('a PC disclosure claim that cites no fact still fails', () => {
  const f = createP07NativeFixture();
  try {
    const pc = f.pcs[0];
    assert.throws(() => audit(f, [claim({actor: `character:${pc.id}`, entity_type: 'character', entity: pc.id})]),
      error => error.code === 'NARRATIVE_INTEGRITY');
  } finally { f.close(); }
});
