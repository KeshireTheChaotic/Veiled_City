/** W6 source-projection fixtures, authored before the complete-phase freeze; NOT RUN during construction. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileNativeFeatures,compileNativeFeatureRuleContexts,nativeFeatureRuleContext,featureDisposition,executableNativeFeatures} from '../src/native-feature-catalog.js';
import {nativeFeatureReviewContract} from '../src/native-house-errata.js';
import {sceneFictionHash as hash} from '../src/scene-fiction-context.js';
const read=relative=>JSON.parse(fs.readFileSync(new URL(relative,import.meta.url),'utf8'));

test('every original occurrence projects its exact printed rule without changing descriptor hashes or authorizing effects',()=>{
  const before=compileNativeFeatures().map(feature=>[feature.feature_key,hash(feature)]),
    contexts=compileNativeFeatureRuleContexts();
  assert.equal(contexts.length,153);assert.equal(new Set(contexts.map(row=>row.feature)).size,153);
  for(const row of contexts){
    assert.equal(hash(row.printed_rule),row.source_hash);assert.equal(row.execution_authorized,false);
    assert.ok(Object.isFrozen(row));assert.ok(row.source_ref.includes('/features/'));
    assert.equal(row.catalog_status,featureDisposition(row.feature).feature.status);
  }
  assert.deepEqual(compileNativeFeatures().map(feature=>[feature.feature_key,hash(feature)]),before);
});

test('review contracts expose exact source in private diagnosis, never fabricate a handler or invent printed costs',()=>{
  const features=compileNativeFeatures(),before=features.map(feature=>[feature.feature_key,feature.status,feature.native_handler]);
  assert.equal(features.length,153);
  for(const feature of features){
    const review=nativeFeatureReviewContract(feature.feature_key);
    assert.equal(review.source.source_hash,feature.source_hash);assert.equal(review.source.template_hash,feature.template_hash);
    assert.equal(review.native_authority_granted,false);assert.equal(review.effect_status,'not_executed');
    assert.equal(review.source.execution_authorized,false);assert.equal(review.source.native_handler,feature.native_handler);
    if(feature.status==='review_only')assert.equal(featureDisposition(feature.feature_key).status,'needs_rules_review');
  }
  assert.deepEqual(compileNativeFeatures().map(feature=>[feature.feature_key,feature.status,feature.native_handler]),before);
  assert.equal(nativeFeatureRuleContext({feature:'adversary:pale-court-thrall:break-the-hold',gm:true}),null);
  assert.equal(nativeFeatureRuleContext('unregistered:feature'),null);
});

test('changed printed rule, actor template or feature order cannot reuse the pinned source projection',()=>{
  const adversaries=read('../../content/GM_PRIVATE/ADVERSARIES/adversaries.json'),
    environments=read('../../content/GM_PRIVATE/ENVIRONMENTS/environments.json');
  for(const change of ['rule','template','order']){
    const actors=structuredClone(adversaries);
    if(change==='rule')actors[0].features[0]+=' Caller invents a free PC injury.';
    if(change==='template')actors[0].difficulty++;
    if(change==='order')actors[0].features.reverse();
    assert.throws(()=>compileNativeFeatureRuleContexts({adversaries:actors,environments}),/feature_source_hash_changed/);
  }
});

test('Director capability discovery excludes every review-only occurrence, regardless of available source text',()=>{
  const all=compileNativeFeatures(),available=executableNativeFeatures(),keys=new Set(available.map(f=>f.feature_key));
  for(const row of all){
    assert.equal(keys.has(row.feature_key),row.status==='supported');
    if(row.status!=='supported')assert.equal(featureDisposition(row.feature_key).status,'needs_rules_review');
  }
  for(const kind of ['environment','adversary']){
    const scoped=executableNativeFeatures(kind);
    assert.ok(scoped.every(row=>row.actor_kind===kind&&row.status==='supported'&&row.native_handler));
    assert.deepEqual(scoped,available.filter(row=>row.actor_kind===kind));
  }
  assert.deepEqual(executableNativeFeatures({kind:'environment',supported:true,gm:true}),[]);
});
