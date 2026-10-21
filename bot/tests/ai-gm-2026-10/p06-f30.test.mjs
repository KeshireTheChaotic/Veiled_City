import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {projectNativeEnvironmentMarketNeutralityContext} from '../../src/native-environment-market-neutrality.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='environment:abandoned-mall-glass-market:no-violence-in-the-aisles';
const RULE='**No Violence in the Aisles — Passive:** The first party to knowingly break Market neutrality immediately loses standing and attracts enforcement.';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Market neutrality exposes its exact passive source and context contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'environment_market_neutrality_context');
  assert.equal(feature.type,'Passive');assert.equal(feature.trigger_kind,'passive');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'environment_scene_context');assert.deepEqual(feature.costs,[]);assert.equal(inspection.printed_rule,RULE);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_market_neutrality_context');assert.equal(contract.entry,'scene_context');assert.equal(contract.fear,0);
  assert.match(contract.effect,/standing and enforcement/);
});

test('scoped GM context exposes the rule without recording a violation',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,contract=environmentProposalContract(feature),
    capabilities={instance:'market-neutrality-profile',features:[{key:FEATURE,hash:hash(feature),proposal_contract:contract}]},
    [context]=projectNativeEnvironmentMarketNeutralityContext(capabilities);
  assert.deepEqual(context,{receipt_kind:'native_environment_feature_context',receipt_ref:'market-neutrality-profile',source_ref:feature.source_ref,
    text:RULE,authority:'Exact source-bound Market rule cue; the GM authors any fictional standing and enforcement response. Context records no violation or consequence.'});
  assert.deepEqual(projectNativeEnvironmentMarketNeutralityContext(null),[]);
  assert.deepEqual(projectNativeEnvironmentMarketNeutralityContext({instance:'forged',features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('scene wiring is a scoped read-only projection',()=>{
  const source=fs.readFileSync(new URL('../../src/native-environment-market-neutrality.js',import.meta.url),'utf8'),
    scene=fs.readFileSync(new URL('../../src/native-environment-scene.js',import.meta.url),'utf8');
  assert.match(source,/nativeEnvironmentInstanceForScope\(db,guild,scope,location\)/);
  assert.match(scene,/nativeEnvironmentMarketNeutralitySituation\(db,guild,scope,location\)/);
  assert.doesNotMatch(source,/recordMutation|saveCityRecord|indexWorldEvent|changeFear|changeHope/);
});

test('source drift locally removes the Market neutrality capability',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Abandoned Mall Glass Market');
  actor.features[0]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
});
