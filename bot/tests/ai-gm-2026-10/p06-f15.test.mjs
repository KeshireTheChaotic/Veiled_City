import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {validateImagingRecordProposal} from '../../src/native-environment-imaging.js';
import {matchesArbitrationSchema,unifiedArbitrationSchema} from '../../src/gm-arbitration-contract.js';

const FEATURE='environment:after-hours-emergency-department:something-in-imaging';
const sources=()=>( {
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});
const proposal=(overrides={})=>({version:1,feature_ref:FEATURE,environment:'ed-profile',modality:'scan',
  impossible_detail:'The scan shows a second shadow in a sealed room.',clue:'The shadow is aligned with a courthouse floor plan.',...overrides});

test('Something in Imaging exposes only its exact creative, source-qualified zero-cost action',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'environment_imaging_record');
  assert.equal(feature.type,'Action');assert.equal(feature.trigger_kind,'spotlight_action');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'none');assert.deepEqual(feature.costs,[]);
  assert.match(inspection.printed_rule,/impossible detail in a scan, monitor, or lab result that provides a clue but creates a record/i);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_imaging_record');assert.equal(contract.transport,10);assert.equal(contract.fear,0);
  assert.deepEqual(contract.required,['version','feature_ref','environment','modality','impossible_detail','clue']);
});

test('native proposal records an authored anomaly and clue without creating a patient or mechanical outcome',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,
    profile={record_key:'ed-profile',data:{environment:'after-hours-emergency-department',template_hash:feature.template_hash}},input=proposal();
  assert.deepEqual(validateImagingRecordProposal(feature,profile,input),{feature,record:{
    modality:'scan',impossible_detail:input.impossible_detail,clue:input.clue
  }});
  for(const modality of ['scan','monitor','lab_result'])assert.equal(validateImagingRecordProposal(feature,profile,proposal({modality})).record.modality,modality);
  assert.throws(()=>validateImagingRecordProposal(feature,profile,proposal({environment:'other'})),{code:'GM_ARBITRATION'});
  assert.throws(()=>validateImagingRecordProposal(feature,profile,proposal({feature_ref:'invented'})),{code:'GM_ARBITRATION'});
  assert.throws(()=>validateImagingRecordProposal(feature,profile,proposal({modality:'patient'})),{code:'GM_ARBITRATION'});
  assert.throws(()=>validateImagingRecordProposal(feature,profile,proposal({clue:''})),{code:'GM_ARBITRATION'});
  assert.throws(()=>validateImagingRecordProposal(feature,{...profile,data:{...profile.data,template_hash:'stale'}},input),{code:'GM_ARBITRATION'});
  assert.throws(()=>validateImagingRecordProposal({...feature,costs:[{resource:'fear',amount:1}]},profile,input),{code:'GM_ARBITRATION'});
});

test('version 10 accepts only the closed imaging record action while prior version remains stable',()=>{
  const action=proposal(),base={npc_intents:[],decisions:[],pre_roll_fear:[],environment_profiles:[],environment_actions:[action]};
  assert.equal(matchesArbitrationSchema(unifiedArbitrationSchema,{...base,version:10}),true);
  assert.equal(matchesArbitrationSchema(unifiedArbitrationSchema,{...base,version:9}),false);
  assert.equal(matchesArbitrationSchema(unifiedArbitrationSchema,{...base,version:10,environment_actions:[{...action,patient:'pc-1'}]}),false);
  assert.equal(matchesArbitrationSchema(unifiedArbitrationSchema,{...base,version:10,environment_actions:[proposal({clue:'x'.repeat(4001)})]}),false);
});

test('the unified route saves one audience-scoped clue record and reuses it only in entitled scene context',()=>{
  const dispatch=fs.readFileSync(new URL('../../src/native-environment-dispatch.js',import.meta.url),'utf8'),
    scene=fs.readFileSync(new URL('../../src/native-environment-scene.js',import.meta.url),'utf8'),
    gm=fs.readFileSync(new URL('../../src/gm-unified-arbitration.js',import.meta.url),'utf8'),
    native=fs.readFileSync(new URL('../../src/native-environment-imaging.js',import.meta.url),'utf8');
  
  assert.match(scene,/nativeEnvironmentImagingSituation\(db,guild,scope,location\)/);
  assert.match(gm,/Version10 also admits After-Hours Emergency Department Something in Imaging/);
  
  
  
});

test('source drift locally removes Imaging from executable capabilities',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='After-Hours Emergency Department');
  actor.features[2]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
});
