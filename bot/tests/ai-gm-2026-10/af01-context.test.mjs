import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createNativeFeatureCatalog} from '../../src/frameworks/daggerheart/feature-catalog.js';
import {createAdversaryBindingRules} from '../../src/frameworks/daggerheart/adversary-binding-rules.js';
import {projectFeatureRuleContexts} from '../../src/frameworks/daggerheart/feature-context-projection.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const definitions=read('../../src/frameworks/daggerheart/native-feature-definitions.json');
const authoredRules=read('../../src/frameworks/daggerheart/native-house-errata.json');
const adversaries=read('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json');
const environments=read('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json');
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function catalog({actors=adversaries,places=environments,errata=authoredRules}={}){
  return createNativeFeatureCatalog({definitions:structuredClone(definitions),authoredRules:structuredClone(errata),readAdversaries:()=>actors,readEnvironments:()=>places});
}

test('all 49 source contexts retain the exact rule, typed terms and versioned errata without execution authority',()=>{
  const c=catalog();let count=0;
  for(const [kind,actors] of [['adversary',adversaries],['environment',environments]])for(const actor of actors){
    const rules=c.nativeFeatureRuleContextsForTemplate(kind,actor),binding={instance:'native-profile',template_hash:hash(actor),
      features:c.executableNativeFeatures(kind).filter(f=>f.template_hash===hash(actor)).map(f=>({key:f.feature_key,hash:hash(f)}))};
    const projected=projectFeatureRuleContexts(binding,rules,{environment:kind==='environment'});
    const expected=definitions.features.filter(f=>f.template_hash===hash(actor)&&f.native_handler?.endsWith('_context'));
    assert.equal(projected.length,expected.length);
    for(const f of expected){
      const row=projected.find(r=>r.feature_ref===f.feature_key);assert.ok(row);count++;
      assert.equal(row.text,actor.features[f.index]);assert.equal(hash(row.text),f.source_hash);
      assert.equal(row.template_hash,hash(actor));assert.deepEqual(row.costs,f.costs);
      assert.equal(row.trigger_kind,f.trigger_kind);assert.equal(row.target_policy,f.target_policy);
      assert.equal(row.roll_protocol,f.roll_protocol);assert.equal(row.visibility,'gm');
      assert.equal(row.execution_authorized,false);assert.equal(row.publication_authorized,false);
      const linked=authoredRules.entries.filter(r=>r.sources.some(s=>s.kind==='feature'&&s.key===f.feature_key));
      assert.deepEqual(row.house_rules.map(r=>[r.id,r.version,r.hash]),linked.map(r=>[r.id,r.version,hash(r)]));
      if(kind==='environment'){assert.equal(row.receipt_ref,'native-profile');assert.equal(row.receipt_kind,'native_environment_feature_context');}
      assert.ok(Object.isFrozen(row));
    }
  }
  assert.equal(count,49);
});

test('all 153 occurrences are available only for their current exact template, including local review holds',()=>{
  const c=catalog();let count=0;
  for(const [kind,actors] of [['adversary',adversaries],['environment',environments]])for(const actor of actors){
    const rows=c.nativeFeatureRuleContextsForTemplate(kind,actor);
    assert.equal(rows.length,actor.features.length);count+=rows.length;
    assert.deepEqual(c.nativeFeatureRuleContextsForTemplateHash(kind,hash(actor)),rows);
    assert.deepEqual(c.nativeFeatureRuleContextsForTemplate(kind,{...actor,name:'forged'}),[]);
    assert.ok(rows.every(r=>r.visibility==='gm'&&r.execution_authorized===false&&r.publication_authorized===false));
  }
  assert.equal(count,153);
  assert.deepEqual(c.nativeFeatureRuleContextsForTemplateHash('character','anything'),[]);
  assert.deepEqual(c.nativeFeatureRuleContextsForTemplateHash('adversary','stale'),[]);
  assert.equal(c.executableNativeFeatures().length,79); // AF04 additionally qualifies HR15's native token-gain path.
});

test('changed actor/source or ruling holds the affected rule without dropping independent templates',()=>{
  const actors=structuredClone(adversaries),original=actors[0];actors[0]={...original,features:[...original.features,'forged rule']};
  const c=catalog({actors});assert.deepEqual(c.nativeFeatureRuleContextsForTemplate('adversary',actors[0]),[]);
  assert.equal(c.nativeFeatureRuleContextsForTemplate('adversary',actors[1]).length,actors[1].features.length);
  const errata=structuredClone(authoredRules),entry=errata.entries.find(e=>e.id==='HR10');
  entry.sources[0].source_hash='forged';
  const held=catalog({errata}),crime=environments.find(e=>e.name==='Occult Crime Scene');
  const rules=held.nativeFeatureRuleContextsForTemplate('environment',crime);
  assert.ok(!rules.some(r=>r.feature.endsWith(':three-vectors')));
  assert.ok(rules.some(r=>r.feature.endsWith(':contaminated-scene')));
});

test('projection rejects unbound hashes, public rows and claimed authority',()=>{
  const c=catalog(),actor=adversaries[0],rows=c.nativeFeatureRuleContextsForTemplate('adversary',actor),
    features=c.executableNativeFeatures('adversary').filter(f=>f.template_hash===hash(actor)).map(f=>({key:f.feature_key,hash:hash(f)}));
  assert.deepEqual(projectFeatureRuleContexts(null,rows),[]);
  assert.deepEqual(projectFeatureRuleContexts({features:[]},rows),[]);
  assert.deepEqual(projectFeatureRuleContexts({features,template_hash:'wrong'},rows),[]);
  for(const change of [{visibility:'public'},{execution_authorized:true},{publication_authorized:true},{feature_hash:'forged'}])
    assert.deepEqual(projectFeatureRuleContexts({features},rows.map(r=>({...r,...change}))),[]);
});

test('real adversary binding keeps source, scene, current control, immutable snapshot and supported feature gates',()=>{
  const c=catalog(),actor=adversaries[0],origin={binding:{scene:'scene',session:'session',location:'here',source:'source',source_hash:'source-hash'},
    eligible:[{key:'npc'}],scope:{mode:'private',actorUserId:'owner',actorCharacterId:'pc'}};
  let control={owner_control_type:'ai_world',revision:'r1'};
  const bound={template:actor,combatant:{id:'combatant'},encounter:'encounter',scene:'scene',session:'session',presence:{location_key:'here'}};
  const rules=createAdversaryBindingRules({capabilities:{...c,nativeEncounterActor:()=>bound,nativeActorControl:()=>control,inspectArbitrationOrigin:()=>origin}});
  const proof=rules.nativeAdversaryFeatureContext(null,'guild',{},'npc');
  assert.equal(proof.feature_rule_contexts.length,1);assert.equal(proof.authored_feature_rules.length,2);
  assert.equal(proof.scope.mode,'private');assert.equal(proof.execution_authorized,false);
  assert.equal(rules.inspectNativeAdversaryFeatureContext(null,'guild',{},proof).actor,'npc');
  const f=definitions.features.find(f=>f.actor_name===actor.name);
  assert.equal(rules.requireNativeAdversaryFeature(null,'guild',{},'npc',f.feature_key).feature.feature_key,f.feature_key);
  control={owner_control_type:'player',revision:'r2'};
  assert.throws(()=>rules.nativeAdversaryFeatureContext(null,'guild',{},'npc'),/adversary_current_gm_owned/);
  control={owner_control_type:'ai_world',revision:'r3'};
  assert.throws(()=>rules.inspectNativeAdversaryFeatureContext(null,'guild',{},proof),/adversary_source_control/);
  bound.scene='elsewhere';assert.throws(()=>rules.nativeAdversaryFeatureContext(null,'guild',{},'npc'),/adversary_current_gm_owned/);
});
