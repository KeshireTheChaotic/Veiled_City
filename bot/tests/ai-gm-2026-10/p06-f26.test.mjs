import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {projectNativeEnvironmentAuctionContext} from '../../src/native-environment-auction.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='environment:glass-market-grand-concourse:auction-of-consequences';
const RULE='**Auction of Consequences — Action:** Put a campaign-relevant relic, secret, or person’s contract up for sale. Bids can include non-monetary costs.';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Auction of Consequences exposes its exact source-bound GM prompt contract',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'environment_auction_context');
  assert.equal(feature.type,'Action');assert.equal(feature.trigger_kind,'spotlight_action');assert.equal(feature.target_policy,'none');
  assert.equal(feature.roll_protocol,'environment_scene_context');assert.deepEqual(feature.costs,[]);assert.equal(inspection.printed_rule,RULE);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_auction_context');assert.equal(contract.entry,'scene_context');assert.equal(contract.fear,0);
  assert.match(contract.effect,/audience-bound/);
});

test('current scoped GM context returns exact auction prompt without a bid or transfer receipt',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,contract=environmentProposalContract(feature),
    capabilities={instance:'glass-market-auction-profile',features:[{key:FEATURE,hash:hash(feature),proposal_contract:contract}]},
    [context]=projectNativeEnvironmentAuctionContext(capabilities);
  assert.deepEqual(context,{receipt_kind:'native_environment_feature_context',receipt_ref:'glass-market-auction-profile',source_ref:feature.source_ref,
    text:RULE,authority:'Source-bound GM auction prompt; auction fiction remains GM-authored and audience-bound. Context alone records no bid, sale, transfer or PC commitment.'});
  assert.deepEqual(projectNativeEnvironmentAuctionContext(null),[]);
  assert.deepEqual(projectNativeEnvironmentAuctionContext({instance:'forged',features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('scene context wiring is source-bound projection only',()=>{
  const source=fs.readFileSync(new URL('../../src/native-environment-auction.js',import.meta.url),'utf8'),
    scene=fs.readFileSync(new URL('../../src/native-environment-scene.js',import.meta.url),'utf8');
  
  assert.match(scene,/nativeEnvironmentAuctionSituation\(db,guild,scope,location\)/);
  assert.doesNotMatch(source,/recordMutation|saveCityRecord|indexWorldEvent|changeFear/);
});

test('auction source drift locally removes its native capability',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Glass Market Grand Concourse');
  actor.features[1]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
});
