import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCanonAnnotations,validateCandidateClaims} from '../../src/narrative-integrity.js';
import {claimFields} from '../../src/frameworks/narrative/material-claim-schema.js';

const claim = {actor: 'npc-nessa-vale', entity_type: 'npc', entity: 'npc-nessa-vale', action: 'disclosure', prior: '', proposed: 'shares a guess',
  visibility: 'party', source_ref: '', mutation_index: 0, certainty: 'dialogue', authored_source_span: '', output_claim_span: 'The blue one'};

test('claim shape check uses the schema-owned field list', () => {
  assert.deepEqual(claimFields, ['actor', 'entity_type', 'entity', 'action', 'prior', 'proposed', 'visibility', 'source_ref', 'mutation_index', 'certainty']);
});

test('a well-formed non-canon claim passes canon annotation validation instead of throwing ReferenceError', () => {
  assert.doesNotThrow(() => validateCanonAnnotations(null, 'g', {narrative_claims: [claim]}, {mode: 'party'}));
});

test('a claim with an unknown action is denied by the schema-owned enum check', () => {
  const db = {getCityCalendar: () => ({flags: {}}), listGuildCharacters: () => [], listNpcProfiles: () => []};
  assert.throws(() => validateCandidateClaims(db, 'g', {narration: 'The blue one', narrative_claims: [{...claim, action: 'teleport'}]}, {mode: 'party'}, []),
    error => error.code === 'NARRATIVE_INTEGRITY' && error.diagnostic.category === 'claim_shape');
});

test('a claim with a missing field is denied as claim_shape', () => {
  const {certainty, ...missing} = claim;
  assert.throws(() => validateCanonAnnotations(null, 'g', {narrative_claims: [missing]}, {mode: 'party'}),
    error => error.code === 'NARRATIVE_INTEGRITY' && error.diagnostic.category === 'claim_shape');
});
