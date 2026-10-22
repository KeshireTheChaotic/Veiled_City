import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {projectNativeAdversaryReputationAttackContext} from '../../src/native-adversary-reputation-attack.js';
import {sceneFictionHash as hash} from '../../src/scene-fiction-context.js';

const FEATURE='adversary:pale-court-fixer:reputation-attack';
const RULE='**Reputation Attack — Action:** Mark a Stress and name an institution currently relevant to the PC. Until the PC presents leverage or clears the misunderstanding, rolls using that institution have disadvantage.';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Reputation Attack registers exact Action, target and one NPC Stress',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),feature=featureDisposition(FEATURE,input).feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(feature.status,'supported');assert.equal(feature.native_handler,'adversary_reputation_attack_context');
  assert.equal(feature.type,'Action');assert.equal(feature.trigger_kind,'on_reputation_attack_action');
  assert.equal(feature.target_policy,'one_pc');assert.equal(feature.roll_protocol,'native_adversary_context');
  assert.deepEqual(feature.costs,[{resource:'npc_stress',amount:1}]);assert.equal(inspection.printed_rule,RULE);
  assert.ok(executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});

test('verified Fixer context gives the cue without selecting the institution or imposing the effect',()=>{
  const feature=featureDisposition(FEATURE,sources()).feature,
    [cue]=projectNativeAdversaryReputationAttackContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:hash(feature)}]});
  assert.deepEqual(cue,{feature_ref:FEATURE,source_ref:feature.source_ref,text:RULE,
    authority:'Exact source-bound GM cue only; target relevance, NPC Stress, institution selection, disadvantage and its end condition are not committed.'});
  assert.deepEqual(projectNativeAdversaryReputationAttackContext(null),[]);
  assert.deepEqual(projectNativeAdversaryReputationAttackContext({template_hash:'forged',features:[{key:FEATURE,hash:hash(feature)}]}),[]);
  assert.deepEqual(projectNativeAdversaryReputationAttackContext({template_hash:feature.template_hash,features:[{key:FEATURE,hash:'forged'}]}),[]);
});

test('current GM adversary provenance attaches Reputation Attack to exact live actor context',()=>{
  const source=fs.readFileSync(new URL('../../src/native-adversary-context.js',import.meta.url),'utf8');
  assert.match(source,/projectNativeAdversaryReputationAttackContext\(terms\)/);
  assert.match(source,/nativeEncounterActor/);assert.match(source,/nativeActorControl/);
});

test('Reputation Attack source drift locally removes the native cue',()=>{
  const input=sources(),actor=input.adversaries.find(row=>row.name==='Pale Court Fixer');
  actor.features[0]+=' altered';
  assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('adversary',input).some(row=>row.feature_key===FEATURE));
});
