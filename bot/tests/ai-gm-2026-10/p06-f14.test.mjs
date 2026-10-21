import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {validateDoorChainProposal} from '../../src/native-environment-door-chain.js';
import {matchesArbitrationSchema,unifiedArbitrationSchema} from '../../src/gm-arbitration-contract.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='environment:apartment-veil-breach:door-chain';
const sources=()=>( {
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});
const proposal=(environment='apartment-profile')=>({version:1,feature_ref:FEATURE,environment,
  npc:{kind:'npc',key:'door-chain-resident',name:'Mara Venn',aliases:[],location_key:'apartment-lobby',parent_location_key:'',
    role:'resident',summary:'A frightened resident holding a chain across the direct route.'}});

test('Door Chain is supported only for its exact source, handler and zero-cost action contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),disposition=featureDisposition(FEATURE,input),feature=disposition.feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(disposition.status,'supported');assert.equal(feature.native_handler,'environment_door_chain');
  assert.equal(feature.type,'Action');assert.equal(feature.trigger_kind,'spotlight_action');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'none');assert.deepEqual(feature.costs,[]);
  assert.match(inspection.printed_rule,/frightened resident blocks the most direct path and demands a believable explanation/i);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_door_chain');assert.equal(contract.transport,9);
  assert.deepEqual(contract.required,['version','feature_ref','environment','npc']);assert.equal(contract.fear,0);
});

test('native proposal accepts one bounded resident at the current environment and rejects forged authority',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,
    profile={record_key:'apartment-profile',data:{environment:'apartment-veil-breach',template_hash:feature.template_hash,location:'apartment-lobby'}},
    input=proposal();
  assert.deepEqual(validateDoorChainProposal(feature,profile,input),{feature,npc:input.npc});
  assert.throws(()=>validateDoorChainProposal(feature,{...profile,data:{...profile.data,environment:'different-place'}},input),{code:'GM_ARBITRATION'});
  assert.throws(()=>validateDoorChainProposal(feature,profile,{...input,feature_ref:'invented'}),{code:'GM_ARBITRATION'});
  assert.throws(()=>validateDoorChainProposal(feature,profile,{...input,extra:true}),{code:'GM_ARBITRATION'});
  assert.throws(()=>validateDoorChainProposal(feature,profile,{...input,npc:{...input.npc,role:'combatant'}}),{code:'GM_ARBITRATION'});
  assert.throws(()=>validateDoorChainProposal(feature,profile,{...input,npc:{...input.npc,location_key:'elsewhere'}}),{code:'GM_ARBITRATION'});
  assert.throws(()=>validateDoorChainProposal({...feature,costs:[{resource:'fear',amount:1}]},profile,input),{code:'GM_ARBITRATION'});
});

test('version 9 alone accepts the closed Door Chain scene action',()=>{
  const action=proposal(),base={npc_intents:[],decisions:[],pre_roll_fear:[],environment_profiles:[],environment_actions:[action]};
  assert.equal(matchesArbitrationSchema(unifiedArbitrationSchema,{...base,version:9}),true);
  assert.equal(matchesArbitrationSchema(unifiedArbitrationSchema,{...base,version:8}),false);
  assert.equal(matchesArbitrationSchema(unifiedArbitrationSchema,{...base,version:9,environment_actions:[{...action,extra:'forged'}]}),false);
  const actual=featureDisposition(FEATURE,sources()).feature;
  assert.equal(environmentProposalContract({...actual,native_handler:'forged'}),null);
  assert.equal(hash(actual.template_hash),hash('7907b02aa1aabb205de4b7ee6a37ac09ff6c6f2f047daf555190b45734d99653'));
});

test('unified dispatcher and current scene context reach the receipt; player response stays open',()=>{
  const dispatch=fs.readFileSync(new URL('../../src/native-environment-dispatch.js',import.meta.url),'utf8'),
    scene=fs.readFileSync(new URL('../../src/native-environment-scene.js',import.meta.url),'utf8'),
    gm=fs.readFileSync(new URL('../../src/gm-unified-arbitration.js',import.meta.url),'utf8'),
    native=fs.readFileSync(new URL('../../src/native-environment-door-chain.js',import.meta.url),'utf8');
  assert.match(dispatch,/proposal\.feature_ref==='environment:apartment-veil-breach:door-chain'[\s\S]*applyEnvironmentDoorChain/);
  assert.match(scene,/nativeEnvironmentDoorChainSituation\(db,guild,scope,location\)/);
  assert.match(gm,/Version9 also admits Apartment Veil Breach Door Chain/);
  assert.match(native,/worldAuthority\(db,guild\)\.gm_authority_mode!=='autonomous'/);
  assert.match(native,/no PC response, movement, access outcome, resource or combat result/i);
  assert.match(native,/visibility=o\.scope\.mode==='private'\?'character':'party'/);
});

test('source drift locally removes Door Chain from executable capabilities',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Apartment Veil Breach');
  actor.features[1]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
});
