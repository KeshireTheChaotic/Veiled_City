import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createExperienceEligibilityRules} from '../../src/frameworks/daggerheart/experience-eligibility-rules.js';

function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'vc-experience-c08-')),file=join(dir,'eligibility.sqlite');let sql=new DatabaseSync(file),ownerLive=true,failEvent=false;
  t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});
  sql.exec('CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key)); CREATE TABLE events(key TEXT PRIMARY KEY,body TEXT);');
  const guild='guild-c08',experience={name:'Bell-tower keeper',modifier:2,applies_to:{operations:['climb'],traits:['Agility'],roll_kinds:['action']}};
  const pc={id:'pc-c08',owner_user_id:'owner-c08',data:{experiences:[experience],resources:{hope:3}}};
  const db={getCityRecord(_g,kind,key){const r=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key??'');return r?JSON.parse(r.body):null;},saveCityRecord(_g,v){const r={...v,record_key:v.key};sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(v.kind,v.key,JSON.stringify(r));return r;},getWorldEvent(_g,key){const r=sql.prepare('SELECT body FROM events WHERE key=?').get(key??'');return r?JSON.parse(r.body):null;},transaction(fn){sql.exec('BEGIN IMMEDIATE');try{const v=fn();sql.exec('COMMIT');return v;}catch(e){sql.exec('ROLLBACK');throw e;}}};
  const event=(_d,_g,v)=>{if(failEvent)throw Error('injected eligibility event failure');const row={...v,event_key:v.key,status:'active',source_kind:'gm'};sql.prepare('INSERT OR REPLACE INTO events VALUES(?,?)').run(v.key,JSON.stringify(row));return row;};
  const source=event(db,guild,{key:'owner-source-c08',kind:'authored_turn',details:{author:pc.owner_user_id,character_id:pc.id,principal_revision:'principal-c08'}});
  const accepted=db.saveCityRecord(guild,{kind:'typed_intent',key:'accepted-c08',status:'accepted_for_adjudication',source_event:source.event_key,visibility:'character',subject_key:pc.id,data:{actor:pc.id,owner_user_id:pc.owner_user_id,actor_principal_revision:'principal-c08',session_id:'session-c08',scene:'scene-c08',operation:'climb',source_hash:'hash-c08',source_span:'I climb the tower.',start:0,end:18}});
  const request=db.saveCityRecord(guild,{kind:'roll_request',key:'request-c08',status:'pending',source_event:source.event_key,visibility:'character',subject_key:pc.id,data:{character_id:pc.id,owner_user_id:pc.owner_user_id,session_id:'session-c08',scene:'scene-c08',kind:'action',breakdown:{trait:'Agility'},input:{accepted_intent:accepted.record_key,source_event:source.event_key}}});
  const action=()=>{if(!ownerLive)throw Object.assign(Error('owner control changed'),{code:'SCENE_ACTION_WINDOW'});return {source:db.getWorldEvent(guild,source.event_key),principal:{user:pc.owner_user_id}};};
  const rules=createExperienceEligibilityRules({sources:{indexWorldEvent:event,consentAction:action,historicalActionSource:action,personalCharacter:(_d,_g,user)=>{if(user!==pc.owner_user_id)throw Error('foreign owner');return pc;}}});
  return {db,guild,pc,experience,accepted,request,source,event,rules,issue:()=>rules.recordNativeExperienceEligibility(db,guild,pc.owner_user_id,request.record_key),setOwner:v=>ownerLive=v,setFailure:v=>failEvent=v,reopen(){sql.close();sql=new DatabaseSync(file);}};
}
test('exact structured eligibility is private and does not choose Experience, spend Hope or roll',t=>{
  const f=fixture(t),[proof]=f.issue();assert.equal(proof.visibility,'character');assert.equal(proof.subject_key,f.pc.id);assert.equal(proof.details.binding.context.operation,'climb');assert.equal(f.pc.data.resources.hope,3);
  const checked=f.rules.validateNativeExperienceEligibility(f.db,f.guild,f.request,f.pc,proof.event_key,{name:f.experience.name,bonus:2});assert.equal(checked.binding.experience.modifier,2);
  assert.equal(f.rules.inspectNativeExperienceEligibility(f.db,f.guild,f.request,f.pc,f.experience.name).event_key,proof.event_key);
});
test('receipt identity survives reopen without duplicate issuance or sheet changes',t=>{
  const f=fixture(t),proofs=f.issue();f.reopen();assert.deepEqual(f.issue(),proofs);assert.equal(f.pc.data.resources.hope,3);
});
test('only unique exact applicable structured Experience entries qualify',t=>{
  const f=fixture(t);f.pc.data.experiences.push({...f.experience});assert.deepEqual(f.issue(),[]);assert.equal(f.rules.inspectNativeExperienceEligibility(f.db,f.guild,f.request,f.pc,f.experience.name),null);
  f.pc.data.experiences=[{...f.experience,applies_to:{operations:['speak'],traits:['Agility'],roll_kinds:['action']}}];assert.deepEqual(f.issue(),[]);
  f.pc.data.experiences=['Bell-tower keeper'];assert.deepEqual(f.issue(),[]);
});
test('saved receipt validates prior exact Experience while current use rejects sheet edits',t=>{
  const f=fixture(t),[proof]=f.issue();f.pc.data.experiences[0].modifier=5;
  assert.throws(()=>f.rules.validateNativeExperienceEligibility(f.db,f.guild,f.request,f.pc,proof.event_key,{name:f.experience.name,bonus:2}),/exact current native/i);
  const old={name:f.experience.name,bonus:2,proof:proof.event_key};assert.equal(f.rules.validateSavedNativeExperienceEligibility(f.db,f.guild,f.request,f.pc,old).binding.experience.modifier,2);
  f.pc.data.resources.hope=2;assert.equal(f.rules.validateSavedNativeExperienceEligibility(f.db,f.guild,f.request,f.pc,old).binding.experience.modifier,2);
});
test('current owner and exact request source/audience cannot be substituted',t=>{
  const f=fixture(t);assert.throws(()=>f.rules.recordNativeExperienceEligibility(f.db,f.guild,'foreign-owner',f.request.record_key),/exact current native/i);
  f.setOwner(false);assert.throws(f.issue,/owner control changed/);f.setOwner(true);
  f.db.saveCityRecord(f.guild,{...f.request,visibility:'party'});assert.throws(f.issue,/exact current native/i);
});
test('corrupted native event ancestry is rejected and failed source writes leave no receipt',t=>{
  const f=fixture(t);f.setFailure(true);assert.throws(f.issue,/injected eligibility/);f.setFailure(false);const [proof]=f.issue();
  f.event(f.db,f.guild,{...proof,key:proof.event_key,details:{...proof.details,payload_hash:'tampered'}});
  assert.throws(()=>f.rules.validateNativeExperienceEligibility(f.db,f.guild,f.request,f.pc,proof.event_key,null),/exact current native/i);
});
test('terminal resolved request cannot mint new availability and actual provider cold-imports',async t=>{
  const f=fixture(t);f.db.saveCityRecord(f.guild,{...f.request,status:'resolved'});assert.deepEqual(f.issue(),[]);
  const p=await import('../../src/native-experience-eligibility.js');for(const key of ['recordNativeExperienceEligibility','validateNativeExperienceEligibility','validateSavedNativeExperienceEligibility','inspectNativeExperienceEligibility'])assert.equal(typeof p[key],'function');
});
