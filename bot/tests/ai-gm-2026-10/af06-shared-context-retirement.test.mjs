import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createNativeFeatureCatalog} from '../../src/frameworks/daggerheart/feature-catalog.js';
import {projectFeatureRuleContexts} from '../../src/frameworks/daggerheart/feature-context-projection.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8')),
  definitions=read('../../src/frameworks/daggerheart/native-feature-definitions.json'),
  authoredRules=read('../../src/frameworks/daggerheart/native-house-errata.json'),
  adversaries=read('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json'),
  environments=read('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json'),
  hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

test('shared source projection replaces retired per-feature factories and preserves Professional Entry mechanics',()=>{
  const catalog=createNativeFeatureCatalog({definitions,authoredRules,readAdversaries:()=>adversaries,readEnvironments:()=>environments}),
    publicSource=fs.readFileSync(new URL('../../src/frameworks/daggerheart/public.js',import.meta.url),'utf8');
  assert.equal(fs.existsSync(new URL('../../src/frameworks/daggerheart/adversary-contexts.js',import.meta.url)),false);
  assert.equal(fs.existsSync(new URL('../../src/frameworks/daggerheart/environment-rule-contexts.js',import.meta.url)),false);
  assert.doesNotMatch(publicSource,/adversary-contexts|environment-rule-contexts|createNativeAdversaryContextProjectors/);
  assert.equal(fs.existsSync(new URL('../../src/frameworks/daggerheart/professional-entry-rules.js',import.meta.url)),true);
  assert.match(fs.readFileSync(new URL('../../src/frameworks/daggerheart/gm-execution-rules.js',import.meta.url),'utf8'),/commitProfessionalEntryUse/);
  let projectedCount=0;
  for(const [kind,actors] of [['adversary',adversaries],['environment',environments]])for(const actor of actors){
    const rules=catalog.nativeFeatureRuleContextsForTemplate(kind,actor),binding={instance:`${kind}:${hash(actor)}`,template_hash:hash(actor),
      features:catalog.compileNativeFeatures().filter(f=>f.actor_kind===kind&&f.template_hash===hash(actor)).map(f=>({key:f.feature_key,hash:hash(f)}))},
      projected=projectFeatureRuleContexts(binding,rules,{environment:kind==='environment'}),
      expected=definitions.features.filter(f=>f.template_hash===hash(actor)&&f.native_handler?.endsWith('_context'));
    assert.equal(projected.length,expected.length);
    for(const row of projected){
      const feature=expected.find(f=>f.feature_key===row.feature_ref);
      assert.ok(feature);assert.equal(row.text,actor.features[feature.index]);assert.equal(hash(row.text),feature.source_hash);
      assert.equal(row.execution_authorized,false);assert.equal(row.publication_authorized,false);projectedCount++;
    }
  }
  assert.equal(projectedCount,49);
});
