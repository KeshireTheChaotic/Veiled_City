import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {validateMundaneEnvironmentDetail} from '../../src/frameworks/daggerheart/native-environment-scene.js';

const FEATURE='environment:veil-anchor-chamber:automatic-correction';
const sources=()=>(
  {
    adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
    environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
  }
);

test('Automatic Correction retains its exact source and native one-Fear action contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),disposition=featureDisposition(FEATURE,input),feature=disposition.feature;
  assert.equal(inspection.status,'verified_source');
  assert.equal(inspection.execution_authorized,false);
  assert.equal(disposition.status,'supported');
  assert.equal(feature.native_handler,'environment_mundane_correction');
  assert.equal(feature.type,'Action');
  assert.equal(feature.trigger_kind,'spotlight_action');
  assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'none');
  assert.deepEqual(feature.costs,[{resource:'fear',amount:1}]);
  assert.match(inspection.printed_rule,/Spend a Fear to rewrite one mundane environmental detail/);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_mundane_correction');
  assert.equal(contract.fear,1);
  assert.equal(contract.kind,'mundane_detail');
  assert.equal(contract.detail_shape,'open_property_and_value');
  assert.equal(Object.hasOwn(contract,'properties'),false);
});

test('the native scene adapter accepts authored mundane properties beyond its former four types',()=>{
  const detail={kind:'mundane_detail',category:'',property:'the air near the old radiator',service:'',value:'carries a faint smell of oranges'};
  assert.deepEqual(validateMundaneEnvironmentDetail(detail),{
    kind:'mundane_detail',property:detail.property,value:detail.value,pc_response:'unselected'
  });
  assert.throws(()=>validateMundaneEnvironmentDetail({...detail,value:'contains\u0000 control data'}),{code:'GM_ARBITRATION'});
  assert.throws(()=>validateMundaneEnvironmentDetail({...detail,category:'medical'}),{code:'GM_ARBITRATION'});
});

test('source drift locally holds Automatic Correction and cannot forge its native contract',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Veil Anchor Chamber');
  actor.features[2]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));

  const actual=featureDisposition(FEATURE,sources()).feature;
  assert.equal(environmentProposalContract({...actual,native_handler:'invented'}),null);
  assert.equal(environmentProposalContract({...actual,costs:[{resource:'fear',amount:2}]}),null);
  assert.equal(environmentProposalContract({...actual,trigger_kind:'passive'}),null);
  assert.equal(environmentProposalContract({...actual,target_policy:'one'}),null);
  assert.equal(environmentProposalContract({...actual,roll_protocol:'difficulty'}),null);
  assert.equal(environmentProposalContract({...actual,status:'review_only'}),null);
});
