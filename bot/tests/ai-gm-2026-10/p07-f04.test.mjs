import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD_DIRECTOR_OPPORTUNITY_GUIDANCE as guidance} from '../../src/narrative-opportunity-guidance.js';

test('Director guidance prefers sourced organic links only among comparable optional opportunities',()=>{
  assert.match(guidance,/otherwise comparable optional opportunities/);
  assert.match(guidance,/organically sourced links to distinct character interests/);
  assert.match(guidance,/A personal lead remains fully worthwhile/);
  assert.match(guidance,/justified autonomous NPC or faction motives/);
});
test('Director guidance preserves response obligations, agency, privacy and non-forced participation',()=>{
  assert.match(guidance,/Address active player attempts and direct NPC questions before optional broader developments/);
  assert.match(guidance,/leave PC decisions open/);
  assert.match(guidance,/Never infer shared knowledge, co-location, cooperation, party membership, arrival or participation/);
  assert.match(guidance,/Do not reveal hidden source connections/);
});
