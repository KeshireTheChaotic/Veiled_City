import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {projectNativeEnvironmentPriceOfferContext} from '../../src/native-environment-price-offer.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='environment:abandoned-mall-glass-market:everything-has-a-price';
const RULE='**Everything Has a Price — Action:** Present a useful item or answer at a cost tailored to the PC’s current problem. State the price before acceptance.';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Everything Has a Price exposes its exact source-bound creative offer contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'environment_price_offer_context');
  assert.equal(feature.type,'Action');assert.equal(feature.trigger_kind,'spotlight_action');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'environment_scene_context');assert.deepEqual(feature.costs,[]);assert.equal(inspection.printed_rule,RULE);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_price_offer_context');assert.equal(contract.entry,'scene_context');assert.equal(contract.fear,0);
  assert.match(contract.effect,/price stated before acceptance/);
});

test('entitled current profile exposes the creative prompt and preserves PC acceptance choice',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,contract=environmentProposalContract(feature),
    capabilities={instance:'glass-market-profile',features:[{key:FEATURE,hash:hash(feature),proposal_contract:contract}]},
    [context]=projectNativeEnvironmentPriceOfferContext(capabilities);
  assert.deepEqual(context,{receipt_kind:'native_environment_feature_context',receipt_ref:'glass-market-profile',source_ref:feature.source_ref,
    text:RULE,authority:'Source-bound creative offer prompt; the GM authors the useful item or answer and tailored price, states the price before acceptance, and the PC chooses whether to accept. Context alone records no trade.'});
  assert.deepEqual(projectNativeEnvironmentPriceOfferContext(null),[]);
  assert.deepEqual(projectNativeEnvironmentPriceOfferContext({instance:'forged',features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('scene context wiring projects only and does not record a trade',()=>{
  const source=fs.readFileSync(new URL('../../src/native-environment-price-offer.js',import.meta.url),'utf8'),
    scene=fs.readFileSync(new URL('../../src/frameworks/daggerheart/native-environment-scene.js',import.meta.url),'utf8');
  
  assert.match(scene,/nativeEnvironmentPriceOfferSituation\(db,guild,scope,location\)/);
  assert.doesNotMatch(source,/recordMutation|saveCityRecord|indexWorldEvent|changeFear/);
});

test('source drift locally removes Everything Has a Price capability',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Abandoned Mall Glass Market');
  actor.features[1]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
});
