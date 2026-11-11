import test from 'node:test';
import assert from 'node:assert/strict';
import {conditionFixture,attachOwnerClear} from './helpers/condition-history-fixture.mjs';
import {fileHash,hash} from './helpers/group-feature-history-fixture.mjs';
import {LANES,FLASH,REGENT} from '../../src/v2/rules/group-feature-rules.js';

test('original active condition composes committed parent, owner dice/effect, ledger and exact source without writes',t=>{const f=conditionFixture(t),before=fileHash(f.file);assert.equal(f.readCondition().status,'active');assert.equal(f.readCondition().data.condition,'Vulnerable');assert.equal(f.readEffect().data.stress,1);assert.equal(fileHash(f.file),before);});
test('All Lanes Stop original condition and later paid duration expiry compose without current owner state',t=>{for(const expired of [false,true]){const f=conditionFixture(t,{feature:LANES,stress:0,conditionName:'Movement limited',expired});assert.equal(f.readCondition().status,expired?'expired':'active');assert.equal(f.readCondition().data.cast_spotlight,1);}});
test('ordinary Flashbang success requires exact owner consequence choice; Critical applies neither consequence',t=>{
  for(const [choice,stress,conditionName] of [['vulnerable',0,'Vulnerable'],['stress',1,null]]){const f=conditionFixture(t,{success:true,choice,stress,conditionName});assert.equal(f.readEffect().data.choice,choice);if(conditionName)assert.equal(f.readCondition().data.condition,conditionName);}
  const critical=conditionFixture(t,{success:true,critical:true,stress:0,conditionName:null});assert.equal(critical.readEffect().data.version,3);assert.equal(critical.readEffect().data.condition,null);
});
test('Command the Blood historical Hope and Stress alternatives retain exact owner choice and resource change',t=>{
  for(const [choice,stress,hope] of [['hope',0,2],['stress',2,0]]){const f=conditionFixture(t,{feature:REGENT,choice,stress,hope,conditionName:null});const e=f.readEffect();assert.equal(e.data.choice,choice);assert.equal(e.data.after.resources.hope,4-hope);assert.equal(e.data.after.resources.stress.current,stress);}
});
test('area PC failure composes exact owner reaction and mixed-condition cause; success has no condition',t=>{
  const failed=conditionFixture(t,{area:true,stress:0,conditionName:'Restrained'});const c=failed.readCondition();assert.equal(c.data.version,2);assert.equal(c.data.cause.spellcast_disadvantage,true);assert.equal(failed.readEffect().data.version,4);
  const passed=conditionFixture(t,{area:true,success:true,stress:0,conditionName:null});assert.equal(passed.readEffect().data.condition,null);
});
test('source revocation and original owner choice audit remain required after current authority changes',t=>{
  for(const sql of ["UPDATE world_events SET status='revoked' WHERE event_key='request:source'","UPDATE mutation_ledger SET actor_id='new-owner' WHERE id=12"]){const f=conditionFixture(t,{success:true,choice:'vulnerable',stress:0});f.db.exec(sql);assert.throws(f.readCondition);}
  const f=conditionFixture(t,{area:true,stress:0,conditionName:'Restrained'});f.db.exec("UPDATE mutation_ledger SET actor_id='new-owner' WHERE id=11");assert.throws(f.readCondition,/actual_owner_reaction/);
});
test('resealed effect cannot silently debit extra PC resources or replace an owner choice',t=>{
  const extra=conditionFixture(t);extra.update('gm_group_feature_effect',extra.effectKey,d=>{d.after.resources.hope--;});extra.resealEffect();assert.throws(extra.readCondition,/native_ancestry/);
  const choice=conditionFixture(t,{success:true,choice:'vulnerable',stress:0});choice.db.prepare("UPDATE world_events SET details_json=? WHERE event_key='owner-choice'").run(JSON.stringify({choice:'stress'}));assert.throws(choice.readCondition,/native_ancestry/);
});
test('condition names, actor addressing and feature-defined duration must match original effect history',t=>{
  for(const [field,value] of [['condition','Restrained'],['owner','different-owner'],['expiry','forever'],['actor','different-caster'],['cast_spotlight',9]]){const f=conditionFixture(t);f.update('pc_native_condition',f.conditionRef,d=>{d[field]=value;});assert.throws(f.readCondition);}
  const f=conditionFixture(t);f.db.exec("UPDATE city_records SET subject_key='different-pc' WHERE kind='pc_native_condition'");assert.throws(f.readCondition,/effect_source/);
});
test('cyclic reused-condition ancestry holds and releases its guard/snapshot for the next valid read',t=>{
  const f=conditionFixture(t),original=f.repo.getCityRecord('g','gm_group_feature_effect',f.effectKey).data;
  f.update('gm_group_feature_effect',f.effectKey,d=>{d.condition_reused=true;});f.resealEffect();assert.throws(f.readCondition,/cycle_or_depth/);
  f.db.prepare("UPDATE city_records SET data_json=? WHERE kind='gm_group_feature_effect'").run(JSON.stringify(original));f.resealEffect();assert.equal(f.readCondition().status,'active');
});
test('mixed condition exact mutation and causal definition cannot be forged by changing receipt text',t=>{
  const f=conditionFixture(t,{area:true,stress:0,conditionName:'Restrained'});f.update('pc_native_condition',f.conditionRef,d=>{d.cause.spellcast_disadvantage=false;});const row=f.repo.getCityRecord('g','pc_native_condition',f.conditionRef);f.world(row.source_event,'native_pc_condition',{payload_hash:hash(row.data)},{visibility:'character',subject:'pc'});assert.throws(f.readCondition,/mutation_source/);
  const altered=conditionFixture(t,{area:true,stress:0,conditionName:'Restrained'});altered.db.exec("UPDATE mutation_ledger SET after_json='[]' WHERE id=10");assert.throws(altered.readCondition,/mutation_source/);
});
test('unproven cleared/expired markers are not treated as absence of active conditions',t=>{
  for(const status of ['cleared','expired']){const f=conditionFixture(t);f.db.prepare("UPDATE city_records SET status=? WHERE kind='pc_native_condition'").run(status);assert.throws(f.readCondition);}
});
test('original individual and area conditions compose exact historical owner clears, not current controller authority',t=>{
  for(const area of [false,true]){const f=conditionFixture(t,area?{area:true,stress:0,conditionName:'Restrained'}:{});attachOwnerClear(f);assert.equal(f.readCondition().status,'cleared');f.db.exec("UPDATE mutation_ledger SET actor_id='new-owner' WHERE id=16");assert.throws(f.readCondition,/saved_source_owner_result/);}
});
test('clearing a condition cannot hide broken original effect ancestry',t=>{
  const f=conditionFixture(t);attachOwnerClear(f);f.db.exec("UPDATE world_events SET status='revoked' WHERE event_key='request:source'");assert.throws(f.readCondition,/reaction_snapshot/);
});
test('original active and cleared NPC conditions compose actual native failure and complete mixed-source ledger',t=>{
  for(const npcCleared of [false,true]){const f=conditionFixture(t,{area:true,npcFailure:true,npcCleared,ordinary:npcCleared,stress:0,conditionName:'Restrained'});const read=()=>f.reader.inspectMixedCondition('g',f.npcConditionRef);const c=read();assert.equal(c.status,npcCleared?'cleared':'active');assert.equal(c.data.target.kind,'npc');assert.equal(c.data.cause.spellcast_disadvantage,true);f.db.exec("UPDATE mutation_ledger SET after_json='[]' WHERE id=20");assert.throws(read,/mutation_source/);}
});
