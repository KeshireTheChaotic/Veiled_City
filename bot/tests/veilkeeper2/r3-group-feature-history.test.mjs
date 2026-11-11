import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,fileHash} from './helpers/group-feature-history-fixture.mjs';
import {inspectMixedConditionClear} from '../../src/v2/rules/npc-condition-clear-history.js';
test('source-bound historical group execution composes actual decision reader and preserves source bytes',t=>{const f=fixture(t),before=fileHash(f.file),r=f.read();assert.equal(r.parent.record_key,'parent');assert.equal(r.cost.status,'committed');assert.equal(r.execution.status,'preparing_effects');assert.equal(fileHash(f.file),before);});
test('terminal owner outcome requires its saved native roll and exact effect snapshots',t=>{const f=fixture(t,{resolved:true});assert.equal(f.read().execution.status,'resolved');f.db.exec("UPDATE rolls SET payload_json='{}'");assert.throws(f.read,/actual_effect/);});
test('owner withdrawal is preserved as withdrawal and requires original owner publication audit',t=>{const f=fixture(t,{resolved:true,withdrawn:true});assert.equal(f.read().execution.status,'resolved');f.db.exec("UPDATE mutation_ledger SET actor_id='different-owner'");assert.throws(f.read,/actual_withdrawal/);});
test('mixed historical execution verifies adversary and ordinary NPC receipts alongside pending PC owners',t=>{for(const ordinary of [false,true]){const f=fixture(t,{area:true,ordinary});assert.equal(f.read().execution.data.mixed.reactions[0].kind,'character');assert.equal(f.read().execution.data.mixed.reactions[1].receipt.version,ordinary?2:1);}});
test('terminal failed NPC reaction retains exact condition source without assigning any PC failure',t=>{const f=fixture(t,{area:true,resolved:true,withdrawn:true,npcFailure:true});const r=f.read();assert.equal(r.execution.status,'resolved');assert.equal(f.repo.getCityRecord('g','native_mixed_condition',f.conditionRef).status,'active');f.db.exec("UPDATE city_records SET status='deleted' WHERE kind='native_mixed_condition'");assert.throws(f.read,/terminal_npc_condition/);});
test('cleared NPC condition composes historical native decision, paid spotlight, exact ledger and private release',t=>{const f=fixture(t,{area:true,ordinary:true,resolved:true,withdrawn:true,npcFailure:true,npcCleared:true}),before=fileHash(f.file);assert.equal(f.readClear().record_key,f.clearRef);assert.equal(f.read().execution.status,'resolved');assert.equal(fileHash(f.file),before);f.db.exec("UPDATE city_records SET status='prepared' WHERE record_key='clear-cost'");assert.throws(f.readClear,/paid_spotlight_source/);assert.throws(f.read,/paid_spotlight_source/);});
for(const [name,sql] of [
  ['parent source',"UPDATE world_events SET status='revoked' WHERE event_key='parent:source'"],
  ['feature publication',"UPDATE world_events SET source_id='player:owner' WHERE kind='native_group_feature'"],
  ['paid cost',"UPDATE city_records SET status='pending' WHERE record_key='cost'"],
  ['actor source',"UPDATE world_events SET status='revoked' WHERE event_key='caster-source'"],
  ['child state',"UPDATE city_records SET status='resolved' WHERE record_key='child'"],
  ['child audience',"UPDATE city_records SET visibility='party' WHERE record_key='child'"],
  ['foreign cost',"UPDATE city_records SET guild_id='foreign' WHERE record_key='cost'"]
])test(`execution rejects altered ${name}`,t=>{const f=fixture(t);f.db.exec(sql);assert.throws(f.read);});
test('changed feature definitions, PC target and cost snapshots cannot survive saved execution hashes',t=>{
  for(const edit of [d=>{d.feature_definition.costs=[{resource:'fear',amount:9}];},d=>{d.targets[0].character='another-pc';}]){const f=fixture(t);f.update('gm_arbitration_decision','parent',d=>edit(d.native));assert.throws(f.read);}
  const f=fixture(t);f.update('gm_action_cost_receipt','cost',d=>{d.amount=9;});assert.throws(f.read,/execution_ancestry/);
});
test('mixed source cannot substitute a different NPC receipt, profile or revoked native reaction',t=>{
  for(const sql of ["UPDATE city_records SET actor_key='wrong' WHERE kind='native_npc_reaction'","UPDATE world_events SET status='revoked' WHERE kind='native_npc_reaction'"]){const f=fixture(t,{area:true,ordinary:true});f.db.exec(sql);assert.throws(f.read,/mixed_npc_receipt/);}
  const f=fixture(t,{area:true});f.update('gm_group_feature_execution',f.executionKey,d=>{d.mixed.reactions[1].receipt.result.success=false;});assert.throws(f.read);
});
test('NPC clear rejects changed ledger actor, multiple-condition removal and stale original condition',t=>{
  for(const sql of ["UPDATE mutation_ledger SET actor_id='wrong' WHERE id=1","UPDATE mutation_ledger SET after_json='[]' WHERE id=1","UPDATE world_events SET status='revoked' WHERE event_key='clear-cost:spotlight'"]){const f=fixture(t,{area:true,resolved:true,withdrawn:true,npcFailure:true,npcCleared:true});f.db.exec(sql);assert.throws(f.readClear);}
  const f=fixture(t,{area:true,resolved:true,withdrawn:true,npcFailure:true,npcCleared:true});const stale=f.repo.getCityRecord('g','native_mixed_condition',f.conditionRef);stale.data.target.key='different';assert.throws(()=>f.repo.withValidationSnapshot(()=>inspectMixedConditionClear(f.repo,'g',stale)),/clear_receipt/);
});
