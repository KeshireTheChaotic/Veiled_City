import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAdversaryHitRules} from '../../src/frameworks/daggerheart/adversary-hit-rules.js';
import {jsonHash as hash} from '../../src/kernel/json-hash.js';

function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'vc-many-deaths-c18-')),file=join(dir,'hit.sqlite');let sql=new DatabaseSync(file),failEffect=false;
  t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});
  sql.exec('CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key)); CREATE TABLE events(key TEXT PRIMARY KEY,body TEXT); CREATE TABLE characters(id TEXT PRIMARY KEY,body TEXT); CREATE TABLE mutations(id INTEGER PRIMARY KEY,body TEXT);');
  const guild='guild-hit-c18',session='session-hit-c18',scene='scene-hit-c18',template={name:'Wraith C18'},feature={feature_key:'adversary:wraith-pack:many-deaths',template_hash:hash(template)},erratum={status:'supported',native_handler:'many_deaths_fear_opportunity'};
  const pc={id:'pc-hit-c18',owner_user_id:'owner-hit-c18',data:{domain_cards:[],resources:{stress:{current:0,max:6},hp:{current:1,max:6}}}};sql.prepare('INSERT INTO characters VALUES(?,?)').run(pc.id,JSON.stringify(pc));
  const db={getCityRecord(_g,kind,key){const r=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key??'');return r?JSON.parse(r.body):null;},saveCityRecord(_g,v){if(failEffect&&v.kind==='gm_feature_effect_receipt')throw Error('injected hit receipt failure');const r={...v,record_key:v.key};sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(v.kind,v.key,JSON.stringify(r));return r;},getWorldEvent(_g,key){const r=sql.prepare('SELECT body FROM events WHERE key=?').get(key??'');return r?JSON.parse(r.body):null;},getCharacter(id){const r=sql.prepare('SELECT body FROM characters WHERE id=?').get(id);return r?JSON.parse(r.body):null;},updateCharacterData(id,fn){const pc=this.getCharacter(id);fn(pc.data);sql.prepare('UPDATE characters SET body=? WHERE id=?').run(JSON.stringify(pc),id);},recordMutation(_g,v){const r={source_layer:v.sourceLayer,entity_key:v.entityKey,before_json:JSON.stringify(v.before),after_json:JSON.stringify(v.after)};return {...r,id:Number(sql.prepare('INSERT INTO mutations(body) VALUES(?)').run(JSON.stringify(r)).lastInsertRowid)};},getMutation(_g,id){const r=sql.prepare('SELECT body FROM mutations WHERE id=?').get(id);return r?{...JSON.parse(r.body),id}:null;},transaction(fn){sql.exec('BEGIN IMMEDIATE');try{const v=fn();sql.exec('COMMIT');return v;}catch(e){sql.exec('ROLLBACK');throw e;}}};
  const save=(kind,key,data,status='resolved',extra={})=>db.saveCityRecord(guild,{kind,key,data,status,...extra}),event=(_d,_g,v)=>{const r={...v,event_key:v.key,status:'active'};sql.prepare('INSERT OR REPLACE INTO events VALUES(?,?)').run(v.key,JSON.stringify(r));return r;};
  event(null,null,{key:'owner-source-hit-c18',details:{declaration:'I cross the hall.'}});
  const accepted=save('typed_intent','owner-action-hit-c18',{outcome_receipt:'owner-outcome-hit-c18'},'resolved',{source_event:'owner-source-hit-c18'});
  const request=save('roll_request','owner-request-hit-c18',{kind:'action',roll_id:'owner-roll-hit-c18',result:{duality:'Fear'},input:{},scene,session_id:session});
  save('action_outcome_receipt','owner-outcome-hit-c18',{request:request.record_key,native_roll_refs:['owner-roll-hit-c18']});
  const decision=save('gm_arbitration_decision','decision-hit-c18',{origin:{scene,session},native:{operation:'commit_adversary_attack',opportunity:{request:request.record_key,roll:'owner-roll-hit-c18',source:accepted.source_event,key:'gm-opportunity:roll:owner-roll-hit-c18'}}},'committed',{source_event:'decision-source-hit-c18'});
  const combatant={id:'wraith-combatant-c18',hp_current:4,hp_max:6},input={npc:'wraith-c18',character:pc.id,combatant:combatant.id,ruling:`ai-decision:${decision.record_key}`};
  save('gm_action_cost_receipt','cost-hit-c18',{decision:decision.record_key,opportunity:'gm-opportunity:roll:owner-roll-hit-c18'},'committed',{source_event:decision.source_event});
  const base=save('pc_effect_receipt','incoming-hit-c18:damage',{after:structuredClone(pc.data.resources),session,scene},'resolved',{subject_key:pc.id});
  const rules=createAdversaryHitRules({capabilities:{compileNativeFeatures:()=>[feature],nativeHouseErratum:()=>erratum,inspectNativeGmDecision:()=>({row:db.getCityRecord(guild,'gm_arbitration_decision',decision.record_key),entry:{actor:{key:input.npc},target_refs:[pc.id]}}),typedRollProof:()=>({outcome:'success',accepted}),validateIncomingDamageApplication:()=>base,incomingAttackEvidence:()=>({roll:{data:{hit:true,gm_decision:decision.record_key,cost_ref:'cost-hit-c18'}}}),indexWorldEvent:event,applyNativeStressPassive:()=>{}}});
  const candidates=()=>rules.nativeHitFeatureCandidates(db,guild,{template,combatant,input});
  function prepare(){const [proof]=candidates(),key='hit-proof-c18';save('npc_hit_feature_proof',key,{proof,attack:'incoming-hit-c18'},'verified',{visibility:'gm',source_event:'incoming-source-hit-c18'});return save('pc_incoming_attack','incoming-hit-c18',{offer:{input,snapshot:{template:hash(template)},hit_features:[{ref:key,fingerprint:hash(proof)}]}},'resolved',{subject_key:pc.id,source_event:'incoming-source-hit-c18'});}
  return {db,guild,pc,request,combatant,rules,save,event,candidates,prepare,apply:()=>rules.applyManyDeathsAfterIncoming(db,guild,'incoming-hit-c18'),setFailure:v=>failEffect=v,count:table=>Number(sql.prepare(`SELECT count(*) n FROM ${table}`).get().n),reopen(){sql.close();sql=new DatabaseSync(file);}};
}
test('exact native causal Fear and remaining adversary HP qualify an optional source-pinned candidate',t=>{
  const f=fixture(t),[candidate]=f.candidates();assert.equal(candidate.erratum,'HR01');assert.equal(candidate.proof.roll,'owner-roll-hit-c18');assert.equal(f.db.getCharacter(f.pc.id).data.resources.stress.current,0);
  f.combatant.hp_current=3;assert.deepEqual(f.candidates(),[]);f.combatant.hp_current=4;f.db.saveCityRecord(f.guild,{...f.request,data:{...f.request.data,result:{duality:'Hope'}}});assert.deepEqual(f.candidates(),[]);
});
test('verified incoming hit adds one native private Stress receipt once, including after reopen',t=>{
  const f=fixture(t);f.prepare();const effect=f.apply();assert.equal(effect.kind,'gm_feature_effect_receipt');assert.equal(effect.visibility,'character');assert.equal(effect.subject_key,f.pc.id);assert.equal(f.db.getCharacter(f.pc.id).data.resources.stress.current,1);
  f.reopen();assert.deepEqual(f.apply(),effect);assert.equal(f.db.getCharacter(f.pc.id).data.resources.stress.current,1);assert.equal(f.count('mutations'),1);
});
test('changed causal opportunity holds only the extra effect and preserves committed incoming damage',t=>{
  const f=fixture(t);f.prepare();f.db.saveCityRecord(f.guild,{...f.request,data:{...f.request.data,result:{duality:'Hope'}}});const held=f.apply();assert.equal(held.kind,'gm_feature_effect_review');assert.equal(f.db.getCharacter(f.pc.id).data.resources.stress.current,0);assert.equal(f.db.getCityRecord(f.guild,'pc_effect_receipt','incoming-hit-c18:damage').status,'resolved');
});
test('Signal-Touched preconsequence choice cannot be bypassed by automatic additional Stress',t=>{
  const f=fixture(t);f.prepare();f.db.updateCharacterData(f.pc.id,data=>{data.domain_cards=[{name:'Signal-Touched',active:true}];});assert.equal(f.apply().status,'needs_rules_review');assert.equal(f.db.getCharacter(f.pc.id).data.resources.stress.current,0);
});
test('receipt failure rolls optional Stress, mutation and source back without changing base damage',t=>{
  const f=fixture(t);f.prepare();const n=f.count('events');f.setFailure(true);assert.throws(f.apply,/injected hit receipt failure/);assert.equal(f.db.getCharacter(f.pc.id).data.resources.stress.current,0);assert.equal(f.count('mutations'),0);assert.equal(f.count('events'),n);assert.equal(f.db.getCityRecord(f.guild,'pc_effect_receipt','incoming-hit-c18:damage').status,'resolved');
});
test('actual Many Deaths provider cold-imports with the existing candidate/proof/apply API',async()=>{
  const p=await import('../../src/native-feature-hit.js');assert.deepEqual(Object.keys(p).sort(),['applyManyDeathsAfterIncoming','inspectManyDeathsEffect','nativeHitFeatureCandidates']);
});
