import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {applyEnvironmentWitnessAccounts} from '../../src/native-environment-witnesses.js';

const FEATURE='environment:haunted-nightclub:everybody-saw-something-different';
const sources=()=>(
  {
    adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
    environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
  }
);

test('Everybody Saw Something Different exposes the exact zero-cost attributed-witness handler',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),disposition=featureDisposition(FEATURE,input),feature=disposition.feature;
  assert.equal(inspection.status,'verified_source');
  assert.equal(inspection.execution_authorized,false);
  assert.equal(disposition.status,'supported');
  assert.equal(feature.native_handler,'nightclub_inconsistent_witnesses');
  assert.equal(feature.type,'Action');
  assert.equal(feature.trigger_kind,'spotlight_action');
  assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'none');
  assert.deepEqual(feature.costs,[]);
  assert.match(inspection.printed_rule,/give three mutually inconsistent witness accounts/);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'nightclub_inconsistent_witnesses');
  assert.equal(contract.transport,7);
  assert.equal(contract.entry,'environment_actions');
  assert.deepEqual(contract.required,['version','feature_ref','environment','incident_ref','accounts','inconsistency']);
  assert.equal(contract.fear,0);
  assert.match(contract.effect,/Inconsistency remains contextual judgment, not objective truth/);
});

test('the native witness adapter rejects malformed proposals before touching state',()=>{
  const malformed={version:1,feature_ref:FEATURE,environment:'current',incident_ref:'incident',accounts:[],inconsistency:[]};
  assert.throws(()=>applyEnvironmentWitnessAccounts(null,'guild',null,null,malformed),{code:'GM_ARBITRATION'});
  const repeatedNpc={version:1,feature_ref:FEATURE,environment:'current',incident_ref:'incident',
    accounts:[{npc:'npc-a',unit_ref:'unit-a',truth_ref:'fact-a',evidence_ref:'event-a'},
      {npc:'npc-a',unit_ref:'unit-b',truth_ref:'fact-b',evidence_ref:'event-b'},
      {npc:'npc-c',unit_ref:'unit-c',truth_ref:'fact-c',evidence_ref:'event-c'}],
    inconsistency:[{left:'one',right:'two'},{left:'three',right:'four'},{left:'five',right:'six'}]};
  assert.throws(()=>applyEnvironmentWitnessAccounts(null,'guild',null,null,repeatedNpc),{code:'GM_ARBITRATION'});
});

test('source drift and forged handler or cost keep witness accounts held',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Haunted Nightclub');
  actor.features[2]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));

  const actual=featureDisposition(FEATURE,sources()).feature;
  assert.equal(environmentProposalContract({...actual,native_handler:'invented'}),null);
  assert.equal(environmentProposalContract({...actual,costs:[{resource:'fear',amount:1}]}),null);
  assert.equal(environmentProposalContract({...actual,trigger_kind:'passive'}),null);
  assert.equal(environmentProposalContract({...actual,target_policy:'acting_pc'}),null);
  assert.equal(environmentProposalContract({...actual,roll_protocol:'difficulty'}),null);
  assert.equal(environmentProposalContract({...actual,status:'review_only'}),null);
});
