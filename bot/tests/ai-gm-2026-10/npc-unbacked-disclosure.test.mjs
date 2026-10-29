import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {prepareAuthorizedTurnOutput,candidateNarrative} from '../../src/pvp-output.js';
import {validateCandidateClaims} from '../../src/narrative-integrity.js';
import {recordNpcTestimony} from '../../src/state.js';
import {evidenceType,objectiveEvidence} from '../../src/epistemic.js';

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

test('an NPC disclosure claim citing an invented source is also dropped for testimony recording', () => {
  const f = createP07NativeFixture();
  try {
    // Mirrors live writer refs such as conversation:npc-nessa-vale that match no stored fact.
    const result = audit(f, [claim({source_ref: 'conversation:mara'})]);
    assert.equal(result.ok, true);
    assert.equal(result.diagnostics[0].reason_code, 'fact_missing');
  } finally { f.close(); }
});

test('unsupported NPC disclosure is recorded as testimony from that NPC, never objective truth', () => {
  const f = createP07NativeFixture();
  try {
    const source = f.db.getWorldEvent(f.guild, 'p07:npc-arrival:mara').event_key;
    const diagnostic = {reason_code: 'fact_missing'};
    const id = recordNpcTestimony(f.db, f.guild, f.session.id, claim(), diagnostic, f.scope, source);
    assert.ok(id, 'a testimony fact is created');
    const fact = f.db.getFact(f.guild, id);
    assert.equal(fact.content, 'does not recognize the handwriting');
    assert.deepEqual(evidenceType(fact), {kind: 'testimony', source_refs: [source], perspective: 'npc:mara'});
    assert.equal(objectiveEvidence(f.db, f.guild, fact), false);
    const knowledge = f.db.npcKnowledgeForFact(f.guild, 'mara', id);
    assert.equal(knowledge.length, 1);
    assert.equal(knowledge[0].content, fact.content);
    assert.equal(recordNpcTestimony(f.db, f.guild, f.session.id, claim(), diagnostic, f.scope, source), id, 'repeating the line reuses the fact');
    assert.equal(recordNpcTestimony(f.db, f.guild, f.session.id, claim({entity_type: 'character'}), diagnostic, f.scope, source), null);
    assert.equal(recordNpcTestimony(f.db, f.guild, f.session.id, claim(), {reason_code: 'audience_denied'}, f.scope, source), null);
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
