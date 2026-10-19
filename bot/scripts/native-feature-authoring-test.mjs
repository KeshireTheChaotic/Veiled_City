import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileNativeFeatures,featureDisposition} from '../src/native-feature-catalog.js';
import {nativeHouseErratum} from '../src/native-house-errata.js';
import {sceneFictionHash as hash} from '../src/scene-fiction-context.js';

const KEY='adversary:catastrophic-echo:break-the-pattern';
const SOURCE_HASH='4e60ea7640e3c1cff3822722f30798595489ca088a64f30d4ef21add27c534a9';
const OTHER_FEATURES_HASH='fd9f63830a8b2631a0ababbf143dcbf4972f53ab9ae9de0e9ddb0a9503651b14';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));

test('HR13 authoring is exact, source-pinned, and still grants no execution authority',()=>{
  const adversaries=read('../../content/GM_PRIVATE/ADVERSARIES/adversaries.json');
  const environments=read('../../content/GM_PRIVATE/ENVIRONMENTS/environments.json');
  const rows=compileNativeFeatures({adversaries,environments});
  const feature=rows.find(row=>row.feature_key===KEY);
  const echo=adversaries.find(actor=>actor.name==='Catastrophic Echo');

  assert(feature,'the source occurrence must remain registered');
  assert.equal(feature.source_hash,SOURCE_HASH);
  assert.equal(feature.template_hash,hash(echo));
  assert.equal(feature.template_hash,'f71790aec63e3a6da0e6b4395c6af2ae58c7344c2ebc503779b62361a4c03086');
  assert.equal(feature.index,1);
  assert.equal(feature.type,'Passive');
  assert.equal(feature.status,'review_only');
  assert.equal(feature.trigger_kind,'after_three_distinct_verified_details');
  assert.equal(feature.target_policy,'source_echo_actor');
  assert.equal(feature.roll_protocol,'ordinary_native_adjudication');
  assert.deepEqual(feature.costs,[]);
  assert.equal(feature.native_handler,null);
  const erratum=nativeHouseErratum('HR13');
  assert(erratum,'owner-authored HR13 v1 must be registered');
  assert.equal(erratum.version,1);
  assert.equal(erratum.status,'review_only');
  assert.equal(erratum.native_handler,null);
  assert.equal(erratum.authority_ref,'owner:break-the-pattern:v1');
  assert.deepEqual(erratum.sources,[{kind:'feature',key:KEY,source_hash:SOURCE_HASH,
    template_hash:'f71790aec63e3a6da0e6b4395c6af2ae58c7344c2ebc503779b62361a4c03086'}]);
  assert.deepEqual(erratum.interpretation,{
    type:'Passive',trigger:'after_three_distinct_verified_details',detail_origin:'gm_established_original_event',
    progress_owner:'same_authenticated_pc',identification:'native_identification_outcome',
    disruption:'native_deliberate_disruption_outcome',adjudication:'ordinary_native_adjudication',
    automatic_roll:false,additional_costs:[],required_details:3,difficulty_delta:-2,
    duration:'rest_of_current_scene',stacking:'once_per_echo_actor_and_scene',
    missing:'native_original_event_detail_and_verified_progress_adapter'
  });
  assert.deepEqual(feature.authored_rule,{id:'HR13',version:1,hash:hash(erratum)});
  assert.equal(featureDisposition(KEY).status,'needs_rules_review');
  assert.equal(featureDisposition(KEY).feature,feature);
  assert(Object.isFrozen(rows));
  assert(Object.isFrozen(feature));
  assert(Object.isFrozen(erratum));
  assert(Object.isFrozen(erratum.interpretation));

  assert.equal(rows.length,153);
  assert.equal(rows.filter(row=>row.status==='supported').length,16);
  assert.equal(rows.filter(row=>row.status==='review_only').length,137);
  assert.equal(rows.filter(row=>row.status==='needs_authoring').length,0);
  assert.equal(hash(rows.filter(row=>row.feature_key!==KEY)),OTHER_FEATURES_HASH,
    'all other catalog identities/descriptors and supported handlers remain unchanged');

  const changedText=structuredClone(adversaries);
  changedText.find(actor=>actor.name==='Catastrophic Echo').features[1]+=' Model-provided mechanic.';
  assert.throws(()=>compileNativeFeatures({adversaries:changedText,environments}),/source/);
  const changedTemplate=structuredClone(adversaries);
  changedTemplate.find(actor=>actor.name==='Catastrophic Echo').attack='+99';
  assert.throws(()=>compileNativeFeatures({adversaries:changedTemplate,environments}),/source/);

  const modelFeature={...feature,status:'supported',native_handler:'invented_model_handler',
    authored_rule:{...feature.authored_rule,authority_ref:'model:asserted',interpretation:{...feature.authored_rule.interpretation,difficulty_delta:-99}}};
  assert.equal(featureDisposition(modelFeature).status,'needs_rules_review');
  assert.equal(featureDisposition(modelFeature).feature,null);
});
