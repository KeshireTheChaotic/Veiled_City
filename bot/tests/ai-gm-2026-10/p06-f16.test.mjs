import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {projectNativeEnvironmentProcedureContext} from '../../src/native-environment-procedure.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='environment:after-hours-emergency-department:hipaa-and-procedure';
const sources=()=>( {
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('HIPAA and Procedure is an exact supported passive context contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'environment_patient_procedure_context');
  assert.equal(feature.type,'Passive');assert.equal(feature.trigger_kind,'passive');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'environment_scene_context');assert.deepEqual(feature.costs,[]);
  assert.match(inspection.printed_rule,/Routine access to patient information requires appropriate credentials, consent, or a credible workaround/);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_patient_procedure_context');assert.equal(contract.entry,'scene_context');
  assert.equal(contract.fear,0);assert.match(contract.effect,/context alone creates no permission or access decision/);
  const vip=featureDisposition('environment:haunted-nightclub:vip-threshold',input).feature;
  assert.equal(environmentProposalContract(vip).handler,'nightclub_vip_threshold');
});

test('entitled native profile receives source text only, with no inferred credential or access decision',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,contract=environmentProposalContract(feature),
    capabilities={instance:'profile-1',features:[{key:FEATURE,hash:hash(feature),proposal_contract:contract}]},
    [context]=projectNativeEnvironmentProcedureContext(capabilities);
  assert.deepEqual(context,{receipt_kind:'native_environment_feature_context',receipt_ref:'profile-1',source_ref:feature.source_ref,
    text:'**HIPAA and Procedure — Passive:** Routine access to patient information requires appropriate credentials, consent, or a credible workaround.',
    authority:'Exact passive source context only; no credential, consent, workaround or access outcome is created.'});
  assert.deepEqual(projectNativeEnvironmentProcedureContext(null),[]);
  assert.deepEqual(projectNativeEnvironmentProcedureContext({instance:'other',features:[{key:'environment:other:feature'}]}),[]);
  assert.deepEqual(projectNativeEnvironmentProcedureContext({instance:'forged',features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('passive source context is delivered through current audience scene construction without committing state',()=>{
  const procedure=fs.readFileSync(new URL('../../src/native-environment-procedure.js',import.meta.url),'utf8'),
    scene=fs.readFileSync(new URL('../../src/native-environment-scene.js',import.meta.url),'utf8'),
    authority=fs.readFileSync(new URL('../../src/narrative-authority-context.js',import.meta.url),'utf8');
  
  assert.match(scene,/nativeEnvironmentProcedureSituation\(db,guild,scope,location\)/);
  
  assert.doesNotMatch(procedure,/recordMutation|saveCityRecord|changeFear/);
});

test('source drift locally removes HIPAA and Procedure from native capabilities',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='After-Hours Emergency Department');
  actor.features[0]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
});
