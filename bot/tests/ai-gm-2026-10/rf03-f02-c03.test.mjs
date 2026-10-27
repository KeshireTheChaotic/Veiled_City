import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeDamageBonusExpression,nativeStandardDamage} from '../../src/native-feature-passives.js';
import {compileNativeFeatures} from '../../src/native-feature-catalog.js';

const adversaries=JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8'));
const executioner=adversaries.find(value=>value.name==='Pale Court Executioner');
const thrall=adversaries.find(value=>value.name==='Pale Court Thrall');
const host=adversaries.find(value=>value.name==='Green Root Host');
const errata=JSON.parse(fs.readFileSync(new URL('../../src/frameworks/daggerheart/native-house-errata.json',import.meta.url),'utf8'));

test('native fixed damage arithmetic preserves exact expression and bounds',()=>{
  assert.equal(nativeDamageBonusExpression('2d8+3',2),'2d8+5');
  assert.equal(nativeDamageBonusExpression('2d8-3',2),'2d8-1');
  assert.equal(nativeDamageBonusExpression('2d8+3',0),'2d8+3');
  assert.throws(()=>nativeDamageBonusExpression('2d8+3',3),e=>e.code==='GM_ARBITRATION');
  assert.throws(()=>nativeDamageBonusExpression('not-dice',1));
});

test('supported Sentence Carried Out uses the current source-pinned catalog and sealed Vulnerable input',()=>{
  const feature=compileNativeFeatures().find(value=>value.feature_key==='adversary:pale-court-executioner:sentence-carried-out');
  assert.equal(feature?.status,'supported');
  const conditions=[{condition:'Vulnerable',source:'effect:test-current'}];
  const result=nativeStandardDamage({template:executioner,combatant:{id:'combatant:7'},damage:'2d8+3',actor:'npc:executioner',
    target:'pc:aya',conditions});
  assert.equal(result.feature,feature.feature_key);
  assert.equal(result.source_hash,feature.source_hash);
  assert.equal(result.template_hash,feature.template_hash);
  assert.equal(result.expression,'2d8+5');
  assert.equal(result.bonus,2);
  assert.deepEqual(result.conditions,conditions);
});

test('unsupported condition evidence is held and unrelated current adversary receives no passive',()=>{
  assert.throws(()=>nativeStandardDamage({template:executioner,combatant:{id:'combatant:7'},damage:'2d8+3',actor:'npc:executioner',
    target:'pc:aya',conditions:[{condition:'Restrained'}]}),e=>e.code==='GM_ARBITRATION');
  assert.equal(nativeStandardDamage({template:thrall,combatant:{id:'combatant:1'},damage:'1d6+2'}),null);
});

test('supported feature cannot activate while its source erratum remains review-only',()=>{
  assert.equal(compileNativeFeatures().find(value=>value.feature_key==='adversary:green-root-host:horde-3d8-8')?.status,'supported');
  assert.equal(errata.entries.find(value=>value.id==='HR11')?.status,'review_only');
  assert.equal(nativeStandardDamage({template:host,combatant:{id:'combatant:host',hp_current:3,hp_max:8},damage:'2d8+3'}),null);
});
