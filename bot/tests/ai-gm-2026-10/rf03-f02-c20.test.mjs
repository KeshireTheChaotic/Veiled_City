import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAdversaryBindingRules} from '../../src/frameworks/daggerheart/adversary-binding-rules.js';
import {executableNativeFeatures,featureDisposition,nativeFeatureRuleContext,nativeFeatureRuleContextsForTemplate} from '../../src/native-feature-catalog.js';
import {jsonHash as hash} from '../../src/kernel/json-hash.js';

// Current production source assets, not a historical fixture or copied golden.
const template=JSON.parse(readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')).find(t=>t.name==='Pale Court Thrall');
function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'vc-adversary-bind-c20-')),file=join(dir,'binding.sqlite');let sql=new DatabaseSync(file);
  t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});sql.exec('CREATE TABLE snapshots(key TEXT PRIMARY KEY,body TEXT)');
  const guild='guild-c20',actor='npc-c20',bound={scene:'scene-c20',session:'session-c20',encounter:'encounter-c20',presence:{location_key:'tower-c20'},combatant:{id:'combatant-c20'},template:structuredClone(template)},origin={binding:{source:'origin-c20',source_hash:'current-source-hash-c20',scene:bound.scene,session:bound.session,location:bound.presence.location_key},scope:{mode:'private',actorUserId:'owner-c20',actorCharacterId:'pc-c20'},eligible:[{key:actor}]};
  const put=(key,value)=>sql.prepare('INSERT OR REPLACE INTO snapshots VALUES(?,?)').run(key,JSON.stringify(value)),get=key=>JSON.parse(sql.prepare('SELECT body FROM snapshots WHERE key=?').get(key).body);
  put('bound',bound);put('origin',origin);put('control',{owner_control_type:'ai_world',revision:'control-c20'});
  const rules=createAdversaryBindingRules({capabilities:{nativeEncounterActor:()=>get('bound'),nativeActorControl:()=>get('control'),inspectArbitrationOrigin:()=>get('origin'),executableNativeFeatures,featureDisposition,nativeFeatureRuleContext,nativeFeatureRuleContextsForTemplate}});
  return {guild,actor,db:{},rules,get,put,proof:()=>rules.nativeAdversaryFeatureContext({},guild,'sealed-c20',actor),reopen(){sql.close();sql=new DatabaseSync(file);}};
}
test('current source catalog and actual printed adversary contexts require exact native actor binding',t=>{
  const f=fixture(t),proof=f.proof();assert.equal(proof.template_hash,hash(template));assert.equal(proof.actor,f.actor);assert.equal(proof.execution_authorized,false);assert.equal(proof.publication_authorized,false);
  const cue=proof.feature_rule_contexts.find(c=>c.feature_ref==='adversary:pale-court-thrall:break-the-hold');assert.equal(cue.text,nativeFeatureRuleContext(cue.feature_ref).printed_rule);assert.equal(cue.authority.includes('PC chooses'),true);
});
test('necessary native feature precondition returns only the same qualified source and context',t=>{
  const f=fixture(t),result=f.rules.requireNativeAdversaryFeature(f.db,f.guild,'sealed-c20',f.actor,'adversary:pale-court-thrall:break-the-hold');assert.equal(result.feature.feature_key,'adversary:pale-court-thrall:break-the-hold');assert.equal(result.context.execution_authorized,false);
  assert.throws(()=>f.rules.requireNativeAdversaryFeature(f.db,f.guild,'sealed-c20',f.actor,'adversary:aster-vale-contractor:professional-entry'),/exact_bound_template/);
});
test('proxy control, different scene or missing local eligibility rejects current binding',t=>{
  const f=fixture(t),original=f.get('control');f.put('control',{owner_control_type:'proxy',revision:'proxy-c20'});assert.throws(f.proof,/gm_owned_local_source/);f.put('control',original);
  f.put('bound',{...f.get('bound'),scene:'another-scene'});assert.throws(f.proof,/gm_owned_local_source/);
});
test('saved native context rejects changed origin or template fingerprint',t=>{
  const f=fixture(t),proof=f.proof(),origin=f.get('origin');f.put('origin',{...origin,binding:{...origin.binding,source_hash:'revised'}});assert.throws(()=>f.rules.inspectNativeAdversaryFeatureContext(f.db,f.guild,'sealed-c20',proof),/source_control_template_or_scene_changed/);f.put('origin',origin);
  const bound=f.get('bound');f.put('bound',{...bound,template:{...bound.template,difficulty:99}});assert.throws(()=>f.rules.inspectNativeAdversaryFeatureContext(f.db,f.guild,'sealed-c20',proof),/source_control_template_or_scene_changed/);
});
test('source-bound context reopens unchanged and malformed native actor locators fail closed',t=>{
  const f=fixture(t),proof=f.proof();f.reopen();assert.deepEqual(f.rules.inspectNativeAdversaryFeatureContext(f.db,f.guild,'sealed-c20',proof),proof);assert.throws(()=>f.rules.nativeAdversaryFeatureContext(f.db,f.guild,'sealed-c20',''),/exact_native_actor/);
});
test('actual bound adversary provider cold-imports with all three native APIs',async()=>{
  const p=await import('../../src/native-adversary-context.js');for(const name of ['nativeAdversaryFeatureContext','inspectNativeAdversaryFeatureContext','requireNativeAdversaryFeature'])assert.equal(typeof p[name],'function');
});
