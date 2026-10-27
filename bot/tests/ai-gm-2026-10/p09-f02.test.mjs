import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativeFeatureRuleContextsForTemplate} from '../../src/native-feature-catalog.js';

const adversaries=JSON.parse(readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8'));
const environments=JSON.parse(readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'));
const definitions=JSON.parse(readFileSync(new URL('../../src/frameworks/daggerheart/native-feature-definitions.json',import.meta.url),'utf8')).features;

test('retrieves exact current-template rules including review-only prose without execution authority',()=>{
  const template=adversaries.find(row=>row.name==='Pale Regent');
  const rules=nativeFeatureRuleContextsForTemplate('adversary',template);
  const expected=definitions.filter(row=>row.actor_name===template.name&&row.actor_kind==='adversary');
  assert.equal(rules.length,expected.length);
  assert.ok(rules.some(row=>row.catalog_status==='review_only'));
  for(const rule of rules){
    const descriptor=expected.find(row=>row.feature_key===rule.feature);
    assert.equal(rule.printed_rule,template.features[descriptor.index]);
    assert.equal(rule.source_hash,descriptor.source_hash);
    assert.equal(rule.template_hash,descriptor.template_hash);
    assert.equal(rule.visibility,'gm');
    assert.equal(rule.execution_authorized,false);
  }
});

test('retrieval is actor-scoped, source freshness-bound and supports current environments',()=>{
  const regent=adversaries.find(row=>row.name==='Pale Regent'),analyst=adversaries.find(row=>row.name==='Aster Vale Catastrophe Analyst');
  const regentRules=nativeFeatureRuleContextsForTemplate('adversary',regent),analystRules=nativeFeatureRuleContextsForTemplate('adversary',analyst);
  assert.ok(regentRules.every(row=>row.template_hash===regentRules[0].template_hash));
  assert.ok(analystRules.every(row=>row.template_hash===analystRules[0].template_hash));
  assert.notDeepEqual(regentRules.map(row=>row.feature),analystRules.map(row=>row.feature));
  const changed=structuredClone(regent);changed.features[0]+=' altered source';
  assert.deepEqual(nativeFeatureRuleContextsForTemplate('adversary',changed),[]);
  const environment=environments.find(row=>row.name==='Networked Dream');
  const environmentRules=nativeFeatureRuleContextsForTemplate('environment',environment);
  assert.equal(environmentRules.length,environment.features.length);
  assert.ok(environmentRules.some(row=>row.catalog_status==='review_only'&&row.execution_authorized===false));
  assert.deepEqual(nativeFeatureRuleContextsForTemplate('player',regent),[]);
});
