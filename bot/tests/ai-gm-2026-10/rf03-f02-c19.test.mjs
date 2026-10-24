import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createConditionRecoveryRules} from '../../src/frameworks/daggerheart/condition-recovery-rules.js';

function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'vc-condition-c19-')),file=join(dir,'recovery.sqlite');let sql=new DatabaseSync(file),failReceipt=false;
  t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});
  sql.exec('CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key)); CREATE TABLE characters(id TEXT PRIMARY KEY,body TEXT); CREATE TABLE events(key TEXT PRIMARY KEY,body TEXT); CREATE TABLE mutations(id INTEGER PRIMARY KEY,body TEXT);');
  const guild='guild-condition-c19',scope={mode:'private',actorUserId:'owner-c19',actorCharacterId:'pc-c19'},scene={key:'scene-c19',session_id:'session-c19'},pc={id:'pc-c19',data:{conditions:[{name:'Vulnerable',native_ref:'condition-c19',active:true},{name:'Other effect',native_ref:'other-condition',active:true}]}};
  sql.prepare('INSERT INTO characters VALUES(?,?)').run(pc.id,JSON.stringify(pc));
  const db={getCityRecord(_g,kind,key){const r=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key??'');return r?JSON.parse(r.body):null;},saveCityRecord(_g,v){if(failReceipt&&v.kind==='pc_native_condition_clear')throw Error('injected condition receipt failure');const r={...v,record_key:v.key};sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(v.kind,v.key,JSON.stringify(r));return r;},getCharacter(id){return JSON.parse(sql.prepare('SELECT body FROM characters WHERE id=?').get(id).body);},updateCharacterData(id,fn){const pc=this.getCharacter(id);fn(pc.data);sql.prepare('UPDATE characters SET body=? WHERE id=?').run(JSON.stringify(pc),id);},getWorldEvent(_g,key){const r=sql.prepare('SELECT body FROM events WHERE key=?').get(key??'');return r?JSON.parse(r.body):null;},recordMutation(_g,v){const r={actor_type:v.actorType,actor_id:v.actorId,source_layer:v.sourceLayer,mutation_type:v.mutationType,entity_key:v.entityKey,visibility:v.visibility,session_id:v.sessionId,before_json:JSON.stringify(v.before),after_json:JSON.stringify(v.after)};return {...r,id:Number(sql.prepare('INSERT INTO mutations(body) VALUES(?)').run(JSON.stringify(r)).lastInsertRowid)};},getMutation(_g,id){const r=sql.prepare('SELECT body FROM mutations WHERE id=?').get(id);return r?{...JSON.parse(r.body),id}:null;},transaction(fn){sql.exec('BEGIN IMMEDIATE');try{const v=fn();sql.exec('COMMIT');return v;}catch(e){sql.exec('ROLLBACK');throw e;}}};
  const save=(kind,key,data,status='resolved',extra={})=>db.saveCityRecord(guild,{kind,key,status,data,...extra}),event=(_d,_g,v)=>{const r={...v,event_key:v.key,status:v.status??'active'};sql.prepare('INSERT OR REPLACE INTO events VALUES(?,?)').run(v.key,JSON.stringify(r));return r;};
  const condition=save('pc_native_condition','condition-c19',{owner:scope.actorUserId,scene:scene.key,feature:'adversary:aster-vale-contractor:flashbang',condition:'Vulnerable',expiry:'until_cleared'},'active',{subject_key:pc.id});
  const action=save('typed_intent','action-c19',{actor:pc.id,owner_user_id:scope.actorUserId,actor_principal_revision:'principal-c19',type:'interact',operation:'clear_condition',target_key:condition.record_key,scene:scene.key,session_id:scene.session_id,source_hash:'action-hash-c19',start:0,end:23,framing:'immediate'},'resolved',{source_event:'owner-source-c19'}),result=save('action_outcome_receipt','outcome-c19',{outcome:'success'});
  const rules=createConditionRecoveryRules({capabilities:{ordinaryActionProof:(_d,_g,key,viewer)=>{if(viewer?.actorUserId!==scope.actorUserId||viewer.actorCharacterId!==pc.id)throw Error('Current exact owner required');return {row:db.getCityRecord(guild,'typed_intent',key),pc:db.getCharacter(pc.id),principal:{user:scope.actorUserId,revision:'principal-c19'},scene,scope:viewer};},ordinaryPrerequisite:()=>({receipt:db.getCityRecord(guild,'action_outcome_receipt',result.record_key)}),validateNativeCondition:(_d,_g,key)=>db.getCityRecord(guild,'pc_native_condition',key),assertPcCanAct:()=>{},indexWorldEvent:event}});
  const input={accepted_intent:action.record_key,condition:condition.record_key,prerequisite:result.record_key},clear=(viewer=scope)=>rules.clearNativeConditionFromOutcome(db,guild,input,viewer);
  return {db,guild,pc,scope,condition,action,result,rules,input,clear,save,event,setFailure:v=>failReceipt=v,count:table=>Number(sql.prepare(`SELECT count(*) n FROM ${table}`).get().n),reopen(){sql.close();sql=new DatabaseSync(file);}};
}
test('resolved exact owner action clears only its native condition marker and persists a private receipt',t=>{
  const f=fixture(t),receipt=f.clear();assert.equal(receipt.visibility,'character');assert.equal(receipt.subject_key,f.pc.id);const conditions=f.db.getCharacter(f.pc.id).data.conditions;assert.equal(conditions[0].active,false);assert.equal(conditions[1].active,true);
  f.reopen();assert.deepEqual(f.clear(),receipt);assert.equal(f.count('mutations'),1);
});
test('private saved receipt cannot authorize a different recipient on replay',t=>{
  const f=fixture(t);f.clear();assert.throws(()=>f.clear({mode:'party',actorUserId:'other-owner',actorCharacterId:'other-pc'}),/exact owner/);assert.equal(f.count('mutations'),1);
});
test('wrong native action target or failed prerequisite cannot clear a condition',t=>{
  const f=fixture(t);f.save('typed_intent',f.action.record_key,{...f.action.data,target_key:'other-condition'},'resolved',{source_event:f.action.source_event});assert.throws(f.clear,/exact_native_owner_action/);
  f.db.saveCityRecord(f.guild,f.action);f.save('action_outcome_receipt',f.result.record_key,{outcome:'failure'});assert.throws(f.clear,/exact_native_owner_action/);assert.equal(f.db.getCharacter(f.pc.id).data.conditions[0].active,true);
});
test('failed receipt write restores condition marker, source, mutation and native condition status',t=>{
  const f=fixture(t);f.setFailure(true);assert.throws(f.clear,/injected condition receipt failure/);assert.equal(f.db.getCharacter(f.pc.id).data.conditions[0].active,true);assert.equal(f.db.getCityRecord(f.guild,'pc_native_condition',f.condition.record_key).status,'active');assert.equal(f.count('events'),0);assert.equal(f.count('mutations'),0);
});
test('immutable clear ancestry rejects revoked receipt source without reapplying sheet changes',t=>{
  const f=fixture(t),receipt=f.clear(),source=f.db.getWorldEvent(f.guild,receipt.source_event);f.event(null,null,{...source,key:source.event_key,status:'revoked'});assert.throws(f.clear,/immutable_ancestry/);assert.equal(f.db.getCharacter(f.pc.id).data.conditions[0].active,false);
});
test('actual condition recovery provider cold-imports with both current APIs',async()=>{
  const p=await import('../../src/native-condition-recovery.js');assert.equal(typeof p.clearNativeConditionFromOutcome,'function');assert.equal(typeof p.inspectNativeConditionClearAncestry,'function');
});
