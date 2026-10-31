import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createNativeFeatureCatalog} from '../../src/frameworks/daggerheart/feature-catalog.js';
import {createNativeHouseErrata} from '../../src/frameworks/daggerheart/house-errata.js';
import {featureRuntimeCapability} from '../../src/frameworks/daggerheart/feature-capability-rules.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const definitions=read('../../src/frameworks/daggerheart/native-feature-definitions.json'),authoredRules=read('../../src/frameworks/daggerheart/native-house-errata.json'),
  adversaries=read('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json'),environments=read('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json');
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),fail=message=>Object.assign(new Error(message),{code:'GM_ARBITRATION'});
const catalog=(actors=adversaries)=>createNativeFeatureCatalog({definitions:structuredClone(definitions),authoredRules:structuredClone(authoredRules),readAdversaries:()=>actors,readEnvironments:()=>environments});

test('all 153 current source occurrences report exact bounded capability or a specific local hold without execution grants',()=>{
  const c=catalog(),rows=c.compileNativeFeatureRuleContexts();assert.equal(rows.length,153);
  const counts={};
  for(const row of rows){
    const f=definitions.features.find(f=>f.feature_key===row.feature),actor=[...adversaries,...environments].find(a=>a.name===f.actor_name),cap=row.capability;
    counts[cap.capability]=(counts[cap.capability]||0)+1;
    assert.equal(hash(row.printed_rule),f.source_hash);assert.equal(hash(actor),f.template_hash);
    assert.equal(row.execution_authorized,false);assert.equal(cap.execution_authorized,false);assert.equal(cap.publication_authorized,false);
    if(['held','fiction_only'].includes(cap.capability)){
      assert.ok(cap.missing.length>0);assert.equal(c.featureDisposition(row.feature).status,'needs_rules_review');
      assert.ok(c.featureDisposition(row.feature).reason.includes(cap.missing[0]));
    }
  }
  assert.deepEqual(counts,{native_bounded:30,rule_context_only:49,held:69,fiction_only:5});
  assert.equal(c.executableNativeFeatures().length,79);
});

test('HR15 qualifies only native Forecast gain and HR16 remains a source ruling with an execution hold',()=>{
  const c=catalog(),signal=fs.readFileSync(new URL('../../../content/CARDS/DOMAINS/SIGNAL.md',import.meta.url),'utf8').replace(/\r\n/g,'\n'),
    errata=createNativeHouseErrata({data:structuredClone(authoredRules),signal,compileNativeFeatures:c.compileNativeFeatures,nativeFeatureRuleContext:c.nativeFeatureRuleContext,hash,fail});
  assert.equal(errata.compileNativeHouseErrata().length,authoredRules.entries.length);
  const gain=c.featureDisposition('adversary:aster-vale-forecast-engine:expected-value');assert.equal(gain.status,'supported');assert.equal(gain.feature.native_handler,'native_token_gain');
  assert.deepEqual(c.nativeFeatureRuleContext(gain.feature.feature_key).capability.operations,['token_gain']);
  assert.equal(c.featureDisposition('adversary:aster-vale-forecast-engine:spend-forecast').status,'needs_rules_review');
  assert.equal(errata.nativeHouseErratum('HR16',1).status,'review_only');
  const foam=errata.nativeHouseErratum('HR17',1);
  assert.equal(foam.status,'review_only');assert.equal(foam.native_handler,null);
  assert.equal(foam.interpretation.reaction.npc_die,'native_d20');
  assert.equal(foam.interpretation.reaction.npc_modifier,'applicable_source_backed_Experience');
  assert.equal(foam.interpretation.reaction.npc_default_modifier,0);
  assert.equal(foam.interpretation.reaction.pc_trait,'Agility');
  assert.equal(foam.interpretation.reaction.pc_executor,'authenticated_owner');
  assert.equal(foam.interpretation.cost_policy,'existing_native_costs_unchanged');
  const area=errata.nativeHouseErratum('HR17',2);
  assert.equal(area.status,'review_only');assert.equal(area.native_handler,null);
  assert.deepEqual(area.interpretation.reaction,foam.interpretation.reaction);
  assert.deepEqual(area.interpretation.activation,{npc_stress:1,cost_applies:'when_actor_has_native_Stress_track',
    cost_timing:'before_area_effect',area_selector:'adversary_controller',area_range:'Close',area_range_origin:'acting_adversary',
    area:'designated_local_area',affected:'everyone_within_designated_area',exclude_allies:false,exclude_caster:false});
  assert.equal(errata.nativeFeatureReviewContract('adversary:ritual-enforcement-team:null-foam').erratum_version,2);
  assert.equal(c.featureDisposition('adversary:ritual-enforcement-team:null-foam').status,'needs_rules_review');
  const held=errata.nativeFeatureReviewContract('adversary:pale-court-executioner:break-the-line');
  assert.equal(held.native_authority_granted,false);assert.match(held.missing,/independent_secondary_owner_choice/);
  assert.match(held.recovery,/another legal/);
});

test('one changed actor source cannot disable retrieval of an independent current occurrence',()=>{
  const actors=structuredClone(adversaries);actors[0].features[0]+=' changed';
  const c=catalog(actors);assert.equal(c.nativeFeatureRuleContext('adversary:pale-court-thrall:pack-pressure'),null);
  assert.ok(c.nativeFeatureRuleContext('adversary:aster-vale-contractor:flashbang'));
  const rules=c.nativeFeatureRuleContextsForTemplate('adversary',actors[1]);assert.equal(rules.length,actors[1].features.length);
});

test('stale hold metadata cannot grant fictional or mechanical authority for a new source revision',()=>{
  const f=definitions.features.find(f=>f.feature_key==='adversary:skin-thief:perfect-surface');
  assert.equal(featureRuntimeCapability(f).capability,'fiction_only');
  const changed=featureRuntimeCapability({...f,source_hash:'new-revision'});assert.equal(changed.capability,'held');
  assert.equal(changed.execution_authorized,false);assert.equal(changed.operations.length,0);
  const unknown=featureRuntimeCapability(null);assert.equal(unknown.capability,'held');assert.equal(unknown.execution_authorized,false);
});
