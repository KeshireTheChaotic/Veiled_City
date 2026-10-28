import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as native from '../../src/frameworks/daggerheart/environment-rule-contexts.js';
const occurrences=[
  {
    "feature": "environment:glass-market-grand-concourse:auction-of-consequences",
    "provider": "bot/src/frameworks/daggerheart/native-environment-auction.js",
    "factory": "createNativeEnvironmentAuctionContext",
    "projector": "projectNativeEnvironmentAuctionContext",
    "situation": "nativeEnvironmentAuctionSituation"
  },
  {
    "feature": "environment:archive-beneath-the-courthouse:chain-of-title",
    "provider": "bot/src/frameworks/daggerheart/native-environment-chain-of-title.js",
    "factory": "createNativeEnvironmentChainOfTitleContext",
    "projector": "projectNativeEnvironmentChainOfTitleContext",
    "situation": "nativeEnvironmentChainOfTitleSituation"
  },
  {
    "feature": "environment:veil-anchor-chamber:consensus-engine",
    "provider": "bot/src/frameworks/daggerheart/native-environment-consensus-engine.js",
    "factory": "createNativeEnvironmentConsensusEngineContext",
    "projector": "projectNativeEnvironmentConsensusEngineContext",
    "situation": "nativeEnvironmentConsensusEngineSituation"
  },
  {
    "feature": "environment:aster-vale-predictive-lab:containment-shutters",
    "provider": "bot/src/frameworks/daggerheart/native-environment-containment-shutters.js",
    "factory": "createNativeEnvironmentContainmentShuttersContext",
    "projector": "projectNativeEnvironmentContainmentShuttersContext",
    "situation": "nativeEnvironmentContainmentShuttersSituation"
  },
  {
    "feature": "environment:occult-crime-scene:contaminated-scene",
    "provider": "bot/src/frameworks/daggerheart/native-environment-contaminated-scene.js",
    "factory": "createNativeEnvironmentContaminatedSceneContext",
    "projector": "projectNativeEnvironmentContaminatedSceneContext",
    "situation": "nativeEnvironmentContaminatedSceneSituation"
  },
  {
    "feature": "environment:glass-market-grand-concourse:everyone-is-watching",
    "provider": "bot/src/frameworks/daggerheart/native-environment-everyone-is-watching.js",
    "factory": "createNativeEnvironmentEveryoneIsWatchingContext",
    "projector": "projectNativeEnvironmentEveryoneIsWatchingContext",
    "situation": "nativeEnvironmentEveryoneIsWatchingSituation"
  },
  {
    "feature": "environment:dead-platform:express-through-memory",
    "provider": "bot/src/frameworks/daggerheart/native-environment-express-through-memory.js",
    "factory": "createNativeEnvironmentExpressThroughMemoryContext",
    "projector": "projectNativeEnvironmentExpressThroughMemoryContext",
    "situation": "nativeEnvironmentExpressThroughMemorySituation"
  },
  {
    "feature": "environment:pale-court-townhouse:guest-right",
    "provider": "bot/src/frameworks/daggerheart/native-environment-guest-right.js",
    "factory": "createNativeEnvironmentGuestRightContext",
    "projector": "projectNativeEnvironmentGuestRightContext",
    "situation": "nativeEnvironmentGuestRightSituation"
  },
  {
    "feature": "environment:dead-platform:last-train-rules",
    "provider": "bot/src/frameworks/daggerheart/native-environment-last-train-rules.js",
    "factory": "createNativeEnvironmentLastTrainRulesContext",
    "projector": "projectNativeEnvironmentLastTrainRulesContext",
    "situation": "nativeEnvironmentLastTrainRulesSituation"
  },
  {
    "feature": "environment:abandoned-mall-glass-market:no-violence-in-the-aisles",
    "provider": "bot/src/frameworks/daggerheart/native-environment-market-neutrality.js",
    "factory": "createNativeEnvironmentMarketNeutralityContext",
    "projector": "projectNativeEnvironmentMarketNeutralityContext",
    "situation": "nativeEnvironmentMarketNeutralitySituation"
  },
  {
    "feature": "environment:networked-dream:metaphor-is-physics",
    "provider": "bot/src/frameworks/daggerheart/native-environment-metaphor-physics.js",
    "factory": "createNativeEnvironmentMetaphorPhysicsContext",
    "projector": "projectNativeEnvironmentMetaphorPhysicsContext",
    "situation": "nativeEnvironmentMetaphorPhysicsSituation"
  },
  {
    "feature": "environment:aster-vale-predictive-lab:model-room",
    "provider": "bot/src/frameworks/daggerheart/native-environment-model-room.js",
    "factory": "createNativeEnvironmentModelRoomContext",
    "projector": "projectNativeEnvironmentModelRoomContext",
    "situation": "nativeEnvironmentModelRoomSituation"
  },
  {
    "feature": "environment:rupture-district:no-consensus",
    "provider": "bot/src/frameworks/daggerheart/native-environment-no-consensus.js",
    "factory": "createNativeEnvironmentNoConsensusContext",
    "projector": "projectNativeEnvironmentNoConsensusContext",
    "situation": "nativeEnvironmentNoConsensusSituation"
  },
  {
    "feature": "environment:district-blackout:no-ordinary-signal",
    "provider": "bot/src/frameworks/daggerheart/native-environment-no-ordinary-signal.js",
    "factory": "createNativeEnvironmentNoOrdinarySignalContext",
    "projector": "projectNativeEnvironmentNoOrdinarySignalContext",
    "situation": "nativeEnvironmentNoOrdinarySignalSituation"
  },
  {
    "feature": "environment:abandoned-mall-glass-market:everything-has-a-price",
    "provider": "bot/src/frameworks/daggerheart/native-environment-price-offer.js",
    "factory": "createNativeEnvironmentPriceOfferContext",
    "projector": "projectNativeEnvironmentPriceOfferContext",
    "situation": "nativeEnvironmentPriceOfferSituation"
  },
  {
    "feature": "environment:pale-court-townhouse:private-room",
    "provider": "bot/src/frameworks/daggerheart/native-environment-private-room.js",
    "factory": "createNativeEnvironmentPrivateRoomContext",
    "projector": "projectNativeEnvironmentPrivateRoomContext",
    "situation": "nativeEnvironmentPrivateRoomSituation"
  },
  {
    "feature": "environment:after-hours-emergency-department:hipaa-and-procedure",
    "provider": "bot/src/frameworks/daggerheart/native-environment-procedure.js",
    "factory": "createNativeEnvironmentProcedureContext",
    "projector": "projectNativeEnvironmentProcedureContext",
    "situation": "nativeEnvironmentProcedureSituation"
  },
  {
    "feature": "environment:archive-beneath-the-courthouse:sealed-docket",
    "provider": "bot/src/frameworks/daggerheart/native-environment-sealed-docket.js",
    "factory": "createNativeEnvironmentSealedDocketContext",
    "projector": "projectNativeEnvironmentSealedDocketContext",
    "situation": "nativeEnvironmentSealedDocketSituation"
  },
  {
    "feature": "environment:apartment-veil-breach:thin-walls",
    "provider": "bot/src/frameworks/daggerheart/native-environment-thin-walls.js",
    "factory": "createNativeEnvironmentThinWallsContext",
    "projector": "projectNativeEnvironmentThinWallsContext",
    "situation": "nativeEnvironmentThinWallsSituation"
  },
  {
    "feature": "environment:dead-platform:third-rail-spirit",
    "provider": "bot/src/frameworks/daggerheart/native-environment-third-rail-spirit.js",
    "factory": "createNativeEnvironmentThirdRailSpiritContext",
    "projector": "projectNativeEnvironmentThirdRailSpiritContext",
    "situation": "nativeEnvironmentThirdRailSpiritSituation"
  },
  {
    "feature": "environment:occult-crime-scene:three-vectors",
    "provider": "bot/src/frameworks/daggerheart/native-environment-three-vectors.js",
    "factory": "createNativeEnvironmentThreeVectorsContext",
    "projector": "projectNativeEnvironmentThreeVectorsContext",
    "situation": "nativeEnvironmentThreeVectorsSituation"
  },
  {
    "feature": "environment:storm-drain-shrine:wrong-offering",
    "provider": "bot/src/frameworks/daggerheart/native-environment-wrong-offering.js",
    "factory": "createNativeEnvironmentWrongOfferingContext",
    "projector": "projectNativeEnvironmentWrongOfferingContext",
    "situation": "nativeEnvironmentWrongOfferingSituation"
  }
];
const definitions=JSON.parse(fs.readFileSync(new URL('../../src/frameworks/daggerheart/native-feature-definitions.json',import.meta.url),'utf8'));
const environments=JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'));
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
assert.equal(occurrences.length,22);
for(const occurrence of occurrences)test(occurrence.feature+' exact native source context and real provider binding',async()=>{
  const original=definitions.features.find(f=>f.feature_key===occurrence.feature);
  assert.equal(original.status,'supported');
  const template=environments.find(t=>t.name===original.actor_name),printed=template.features[original.index];
  assert.equal(hash(printed),original.source_hash);assert.equal(hash(template),original.template_hash);
  let feature=structuredClone(original),status='supported',source={catalog_status:'supported',source_hash:original.source_hash,template_hash:original.template_hash,printed_rule:printed};
  const capabilities={instance:'environment:receipt',features:[{key:original.feature_key,hash:hash(feature)}]},calls=[];
  const contract={entry:'scene_context',handler:original.native_handler,fear:original.costs.filter(c=>c.resource==='fear').reduce((n,c)=>n+c.amount,0),
    effect:'Exact passive source cue: cellular and normal network access is unreliable; alternate infrastructure or Signal magic is required. A connection attempt has no automatic outcome.'};
  const service=native[occurrence.factory]({
    nativeEnvironmentInstanceForScope:(...args)=>{calls.push(args);return capabilities;},
    environmentProposalContract:()=>contract,
    featureDisposition:()=>{calls.push('source');return {status,feature};},nativeFeatureRuleContext:()=>source
  });
  assert.deepEqual(service[occurrence.projector]({instance:'none',features:[]}),[]);assert.equal(calls.length,0);
  const expected=service[occurrence.projector](capabilities);
  assert.equal(expected.length,1);assert.equal(expected[0].text,printed);assert.equal(expected[0].source_ref,original.source_ref);
  assert.equal(expected[0].receipt_ref,capabilities.instance);assert.equal(expected[0].receipt_kind,'native_environment_feature_context');
  assert.equal(expected[0].execution_authorized,undefined);assert.equal(expected[0].state_mutations,undefined);assert.ok(expected[0].authority.length);
  const scope={mode:'private',actorUserId:'owner',actorCharacterId:'pc'};
  assert.deepEqual(service[occurrence.situation]('repository','guild',scope,'location'),expected);
  assert.deepEqual(calls.find(Array.isArray),['repository','guild',scope,'location']);
  const provider=await import(new URL('../../'+occurrence.provider.replace(/^bot\//,''),import.meta.url));
  assert.deepEqual(provider[occurrence.projector](capabilities),expected);
  status='needs_rules_review';assert.deepEqual(service[occurrence.projector](capabilities),[]);status='supported';
  for(const [field,value] of [['catalog_status','review_only'],['source_hash','changed'],['template_hash','changed'],['printed_rule',printed+' altered']]){
    const prior=source[field];source[field]=value;assert.deepEqual(service[occurrence.projector](capabilities),[]);source[field]=prior;
  }
  feature={...feature,native_handler:'unsupported-handler'};capabilities.features[0].hash=hash(feature);
  assert.deepEqual(service[occurrence.projector](capabilities),[]);feature=structuredClone(original);capabilities.features[0].hash=hash(feature);
  capabilities.features[0].hash='stale-descriptor';assert.deepEqual(service[occurrence.projector](capabilities),[]);capabilities.features[0].hash=hash(feature);
  contract.entry='not-a-context';assert.deepEqual(service[occurrence.projector](capabilities),[]);
});
