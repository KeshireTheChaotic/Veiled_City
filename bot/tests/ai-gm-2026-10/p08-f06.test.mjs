import test from 'node:test';
import assert from 'node:assert/strict';
import {openingEntryEvidence,openingEntryDeliveryStatus} from '../../src/opening-entry-evidence.js';
import {assemblyCoverageEvidence} from '../../src/assembly-evidence.js';

test('native entry fallback is useful but never claims authored scene or hook success',()=>{
  const view={source_refs:['owner-source-1']};
  const evidence=openingEntryEvidence(view,{fallback:true});
  assert.equal(evidence.fallback,true);
  assert.equal(evidence.narrative_verified,false);
  assert.equal(evidence.hook_verified,false);
  assert.equal(evidence.dramatic_coverage,'unverified');
  assert.equal(openingEntryDeliveryStatus(evidence,[{status:'delivered',discord_message_id:'m1'}],0),'fallback_delivered');
  assert.equal(openingEntryDeliveryStatus(evidence,[{status:'uncertain'}],0),'uncertain');
  assert.equal(openingEntryDeliveryStatus(evidence,[{status:'delivered',discord_message_id:'m1'}],1),'pending');
});

test('accepted entry prose stays distinct from semantic opportunity coverage',()=>{
  const evidence=openingEntryEvidence({source_refs:[]},{narrativeVerified:true});
  assert.equal(evidence.narrative_verified,true);
  assert.equal(evidence.fallback,false);
  assert.equal(evidence.dramatic_coverage,'unverified');
  assert.equal(evidence.coverage_reason,'semantic_coverage_not_natively_proven');
});

test('assembly intent provenance never claims semantic coverage from accepted prose',()=>{
  const result=assemblyCoverageEvidence({convergence_goal:'A public opportunity.',assembly_contract:{version:2,input_fingerprint:'fp'}},'s1');
  assert.equal(result.dramatic_coverage,'unverified');
  assert.equal(result.coverage_reason,'semantic_coverage_not_natively_proven');
  assert.match(result.dramatic_intent_revision,/^[0-9a-f]{64}$/);
  assert.equal(assemblyCoverageEvidence({},'s1').dramatic_intent_revision,null);
});
