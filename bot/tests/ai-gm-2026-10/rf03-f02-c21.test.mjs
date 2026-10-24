import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {jsonHash} from '../../src/kernel/json-hash.js';

// Test only the modified immutable source loader/asset path. No database or
// historical fixtures are needed for an immutable content read.
const dir=mkdtempSync(join(tmpdir(),'vc-catalog-c21-')),cwd=process.cwd();
let catalog;
try{process.chdir(dir);catalog=await import('../../src/native-feature-catalog.js');}finally{process.chdir(cwd);rmSync(dir,{recursive:true,force:true});}
const definitions=JSON.parse(readFileSync(new URL('../../src/frameworks/daggerheart/native-feature-definitions.json',import.meta.url),'utf8'));
test('relocated immutable definitions load independently of the application working directory',()=>{
  const actual=catalog.compileNativeFeatures();assert.equal(actual.length,153);assert.deepEqual(actual.map(f=>f.feature_key).sort(),definitions.features.map(f=>f.feature_key).sort());
  assert.deepEqual(actual.reduce((m,f)=>(m[f.status]=(m[f.status]||0)+1,m),{}),{supported:78,review_only:75});
});
test('every current source definition retains its qualified descriptor identity and disposition',()=>{
  for(const source of definitions.features){const disposition=catalog.featureDisposition(source.feature_key);assert.equal(disposition.status,source.status==='supported'?'supported':'needs_rules_review');assert.equal(disposition.feature.status,source.status);assert.equal(disposition.feature.feature_key,source.feature_key);assert.equal(disposition.feature.native_handler,source.native_handler);assert.equal(disposition.feature.source_ref,source.source_ref);assert.equal(disposition.feature.source_hash,source.source_hash);}
});
test('current actor taxonomy and printed source rules still derive from actual native templates',()=>{
  const actors=catalog.compileNativeActors();assert.equal(actors.filter(a=>a.signal_based).length,8);const feature=catalog.compileNativeFeatures().find(f=>f.feature_key==='adversary:pale-court-thrall:break-the-hold'),rule=catalog.nativeFeatureRuleContext(feature.feature_key);
  assert.equal(rule.source_hash,feature.source_hash);assert.equal(rule.template_hash,feature.template_hash);assert.equal(rule.catalog_status,'supported');assert.equal(rule.printed_rule.includes('Break the Hold'),true);
});
test('immutable catalog descriptors cannot be mutated into supported rules or effects',()=>{
  const features=catalog.compileNativeFeatures(),held=features.find(f=>f.status==='review_only'),before=jsonHash(held);assert.equal(Object.isFrozen(features),true);assert.equal(Object.isFrozen(held),true);assert.throws(()=>{held.status='supported';},TypeError);assert.equal(jsonHash(catalog.featureDisposition(held.feature_key).feature),before);
  assert.equal(catalog.executableNativeFeatures('adversary').every(f=>f.status==='supported'),true);
});
