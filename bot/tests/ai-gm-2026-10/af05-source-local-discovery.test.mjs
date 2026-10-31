import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createNativeFeatureCatalog} from '../../src/frameworks/daggerheart/feature-catalog.js';
import {createEnvironmentProfileProposalRules} from '../../src/frameworks/daggerheart/environment-profile-proposal-rules.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const definitions=read('../../src/frameworks/daggerheart/native-feature-definitions.json'),
  authoredRules=read('../../src/frameworks/daggerheart/native-house-errata.json'),
  adversaries=read('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json'),
  environments=read('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json');
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const catalog=(actors=adversaries,places=environments,defs=definitions)=>createNativeFeatureCatalog({
  definitions:structuredClone(defs),authoredRules:structuredClone(authoredRules),readAdversaries:()=>actors,readEnvironments:()=>places});

test('one changed signal template is withheld without blocking other actors or environment profile preparation',()=>{
  const actors=structuredClone(adversaries),signal=definitions.actor_taxonomy.signal_based[0],
    changed=actors.find(a=>a.name===signal.actor_name);changed.features[0]+=' changed';
  const c=catalog(actors),rows=c.compileNativeActors(),baseline=catalog().compileNativeActors();
  assert.equal(rows.length,baseline.length-1);assert.ok(!rows.some(a=>a.actor_name===changed.name));
  assert.deepEqual(rows.filter(a=>a.actor_kind==='environment'),baseline.filter(a=>a.actor_kind==='environment'));
  assert.throws(()=>c.compileNativeFeatures(),/feature_source_hash_changed/);
  assert.throws(()=>c.nativeActorTaxonomy('adversary',changed),/actor_template_source_changed/);
  const valid=adversaries.find(a=>a.name!==changed.name);assert.equal(c.nativeActorTaxonomy('adversary',valid).actor_name,valid.name);
  let preparations=0;
  const origin={binding:{source:'source',location:'here',scene:'scene',session:'session'},scope:{mode:'gm'}},
    rules=createEnvironmentProfileProposalRules({capabilities:{...c,hash,
      fail:message=>Object.assign(new Error(message),{code:'GM_ARBITRATION'}),inspectArbitrationOrigin:()=>origin,
      buildNarrativeContext:()=>({native_frame:true}),establishNativeEnvironmentInstance:(db,guild,frame,proposal)=>{
        preparations++;assert.equal(frame.native_frame,true);return {kind:'prepared_test_profile',proposal};
      }}}),
    target=rows.find(a=>a.actor_kind==='environment'&&c.executableNativeFeatures('environment').some(f=>f.template_hash===a.template_hash));
  const result=rules.applyNativeEnvironmentProfileProposals({getCityRecord:()=>null},'guild',{},[
    {version:1,environment:target.actor_key,location:'here'}]);
  assert.equal(preparations,1);assert.equal(result[0].proposal.environment,target.actor_key);
});

test('missing, duplicate and changed environments are omitted locally; no new source actor is discovered',()=>{
  for(const mutate of [a=>a.shift(),a=>a.push(structuredClone(a[0])),a=>{a[0].features.push('invented rule');}]){
    const places=structuredClone(environments);mutate(places);const c=catalog(adversaries,places),rows=c.compileNativeActors();
    assert.ok(!rows.some(a=>a.actor_name===environments[0].name));
    assert.ok(rows.some(a=>a.actor_name===environments[1].name));
    assert.equal(rows.filter(a=>a.actor_kind==='adversary').length,adversaries.length);
    assert.throws(()=>c.compileNativeFeatures());
  }
  const places=[...environments,{name:'Invented environment',features:['Invented power']}];
  assert.ok(!catalog(adversaries,places).compileNativeActors().some(a=>a.actor_name==='Invented environment'));
});

test('corrupt taxonomy metadata remains a hard registry error rather than silently granting or removing signal classification',()=>{
  const defs=structuredClone(definitions);defs.actor_taxonomy.signal_based[0].template_hash='forged';
  assert.throws(()=>catalog(adversaries,environments,defs).compileNativeActors(),/actor_taxonomy_source_hash_changed/);
  const rows=catalog().compileNativeActors();assert.equal(rows.filter(a=>a.signal_based).length,8);
  assert.ok(rows.filter(a=>a.signal_based).every(a=>a.taxonomy_ruling==='owner:signal-taxonomy:v1'));
  assert.ok(Object.isFrozen(rows));assert.ok(rows.every(Object.isFrozen));
});

test('signal target qualification isolates an unrelated source change and still holds a changed feature source',()=>{
  const actors=structuredClone(adversaries);actors[0].features[0]+=' changed';
  const c=catalog(actors),target=adversaries.find(a=>a.name==='Static Wraith'),key='adversary:choir-relay:local-mesh';
  const proof=c.nativeSignalFeatureTarget(key,target);assert.equal(proof.feature_key,key);assert.equal(proof.target.signal_based,true);
  assert.throws(()=>c.nativeSignalFeatureTarget('adversary:invented:power',target),/signal_feature_source/);
  actors.find(a=>a.name==='Choir Relay').features[0]+=' changed';
  assert.throws(()=>c.nativeSignalFeatureTarget(key,target),/signal_feature_source/);
});
