import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRollModifierRules} from '../../src/frameworks/daggerheart/roll-modifier-rules.js';
import {createRollParticipationRules} from '../../src/frameworks/daggerheart/roll-participation-rules.js';
import {jsonHash as hash} from '../../src/kernel/json-hash.js';

function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'vc-roll-eligibility-c10-')),file=join(dir,'eligibility.sqlite');let sql=new DatabaseSync(file),visible=true,access=true,authority=true,failEvent=false;
  t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});
  sql.exec('CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key)); CREATE TABLE events(key TEXT PRIMARY KEY,body TEXT); CREATE TABLE mutations(id INTEGER PRIMARY KEY,body TEXT);');
  const guild='guild-c10',scene='scene-c10',session='session-c10',pcs={a:{id:'pc-a',data:{resources:{hope:3}}},b:{id:'pc-b',data:{resources:{hope:3}}}};
  const db={getCityRecord(_g,kind,key){const r=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key??'');return r?JSON.parse(r.body):null;},saveCityRecord(_g,v){const r={...v,record_key:v.key};sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(v.kind,v.key,JSON.stringify(r));return r;},getWorldEvent(_g,key){const r=sql.prepare('SELECT body FROM events WHERE key=?').get(key??'');return r?JSON.parse(r.body):null;},recordMutation(_g,v){const r={actor_type:v.actorType,actor_id:v.actorId,source_layer:v.sourceLayer,mutation_type:v.mutationType,entity_key:v.entityKey,session_id:v.sessionId,visibility:v.visibility,after_json:JSON.stringify(v.after)};return {...r,id:Number(sql.prepare('INSERT INTO mutations(body) VALUES(?)').run(JSON.stringify(r)).lastInsertRowid)};},getMutation(_g,id){const r=sql.prepare('SELECT body FROM mutations WHERE id=?').get(id);return r?{...JSON.parse(r.body),id}:null;},getCharacter(key){return Object.values(pcs).find(pc=>pc.id===key);},getCityCalendar(){return {flags:{gm_discretion:authority}};},transaction(fn){sql.exec('BEGIN IMMEDIATE');try{const v=fn();sql.exec('COMMIT');return v;}catch(e){sql.exec('ROLLBACK');throw e;}}};
  const save=(kind,key,data,status='accepted_for_adjudication',extra={})=>db.saveCityRecord(guild,{kind,key,status,data,...extra});
  const event=(_d,_g,v)=>{if(failEvent)throw Error('injected source write');const r={...v,event_key:v.key,status:v.status??'active',subject_key:v.subject_key??null};sql.prepare('INSERT OR REPLACE INTO events VALUES(?,?)').run(v.key,JSON.stringify(r));return r;};
  const originEvent=event(db,guild,{key:'origin-c10',details:{observation:'a fixed ladder'}}),evidence=event(db,guild,{key:'evidence-c10',details:{observation:'steady footholds'}});
  const origin={source:originEvent.event_key,source_hash:hash(originEvent.details),scene,session},scope={mode:'party',actorUserId:'owner-a',actorCharacterId:'pc-a'};
  const action=(suffix,operation,target)=>save('typed_intent',`action-${suffix}`,{actor:`pc-${suffix}`,owner_user_id:`owner-${suffix}`,actor_principal_revision:`principal-${suffix}`,source_hash:`source-hash-${suffix}`,source_span:`I ${operation}.`,type:'interact',framing:'immediate',operation,target_key:target,scene,session_id:session},'accepted_for_adjudication',{source_event:`source-${suffix}`,visibility:'party'});
  const a=action('a','climb','ladder'),b=action('b','help_ally','pc-a');
  const q=save('roll_request','roll-a',{owner_user_id:'owner-a',scene,session_id:session,kind:'action',input:{accepted_intent:a.record_key,trait:'Agility'},breakdown:{advantage:0,disadvantage:0}},'pending',{source_event:a.source_event,visibility:'character',subject_key:'pc-a'});
  const presences={a:{location_key:'tower',data:{state:'actually_present',scene}},b:{location_key:'tower',data:{state:'actually_present',scene}}};
  const sources={inspectArbitrationOrigin:()=>({binding:origin,scope}),consentAction:(_d,_g,key)=>({row:db.getCityRecord(guild,'typed_intent',key)}),historicalActionSource:()=>({}),narrativeSourceVisible:()=>visible,indexWorldEvent:event,isPvpIntent:()=>false};
  const modifiers=createRollModifierRules({capabilities:{...sources,gmRulingContext:()=>({enabled:authority,evidence:[{ref:evidence.event_key}]}),nativeGmSceneContext:()=>({ref:'native-context-c10'}),prepareEnvironmentNoiseOdds:()=>null,prepareEnvironmentMemoryOdds:()=>null,inspectEnvironmentNoiseOdds:()=>true}});
  const participation=createRollParticipationRules({capabilities:{...sources,sceneAccess:()=>access,scenePresence:(_d,_g,_type,key)=>presences[key==='pc-a'?'a':'b'],mayKnowRoll:()=>visible}});
  const proposal={disposition:'request_pc_action_roll',stakes_kind:'attempt_only',feature_ref:'',experience_ref:'',advantage:true,disadvantage:false,reason:'The established footholds favor this attempt.',rule_basis_refs:['srd:action-rolls'],trait:'Agility'};
  const entry={intent_ref:a.record_key,actor:{type:'character',key:'pc-a'}};
  const help={disposition:'native_feature_resolution',stakes_kind:'attempt_only',feature_ref:'',experience_ref:'',advantage:false,disadvantage:false,difficulty:null,trait:null,rule_basis_refs:['srd:help-an-ally'],collaboration:{kind:'help',request:q.record_key,partner_request:''}};
  return {db,guild,a,b,q,origin,entry,proposal,help,pcs,presences,evidence,save,event,modifiers,participation,prepare:()=>modifiers.prepareOrdinaryRollModifier(db,guild,'sealed-origin',entry,proposal),helpPlan:()=>participation.prepareNativeRollParticipation(db,guild,'sealed-origin',{intent_ref:b.record_key,actor:{type:'character',key:'pc-b'}},help),setVisible:v=>visible=v,setAccess:v=>access=v,setAuthority:v=>authority=v,setFailure:v=>failEvent=v,count:table=>Number(sql.prepare(`SELECT count(*) n FROM ${table}`).get().n),reopen(){sql.close();sql=new DatabaseSync(file);}};
}
test('ordinary contextual Advantage is source-bound and replayable without dice or resource changes',t=>{
  const f=fixture(t),[key]=f.prepare(),event=f.db.getWorldEvent(f.guild,key),input={accepted_intent:f.a.record_key,trait:'Agility',kind:'action'};
  const modifier=f.modifiers.inspectOrdinaryRollModifier(f.db,f.guild,input,f.pcs.a,event);assert.equal(modifier.kind,'advantage');assert.equal(modifier.amount,1);assert.equal(event.visibility,'gm');
  f.reopen();assert.deepEqual(f.prepare(),[key]);assert.equal(f.count('mutations'),1);assert.equal(f.pcs.a.data.resources.hope,3);
});
test('contextual odds reject invalid ordinary terms and stale authoritative evidence',t=>{
  const f=fixture(t);f.proposal.disadvantage=true;assert.throws(f.prepare,/exact_nonfeature_action/);f.proposal.disadvantage=false;
  const [key]=f.prepare(),event=f.db.getWorldEvent(f.guild,key);f.event(null,null,{...f.evidence,key:f.evidence.event_key,details:{observation:'changed'}});
  assert.throws(()=>f.modifiers.inspectOrdinaryRollModifier(f.db,f.guild,{accepted_intent:f.a.record_key,trait:'Agility',kind:'action'},f.pcs.a,event),/evidence_changed/);
});
test('failed contextual source insertion rolls its native mutation back',t=>{
  const f=fixture(t),before=f.count('events');f.setFailure(true);assert.throws(f.prepare,/injected source write/);assert.equal(f.count('mutations'),0);assert.equal(f.count('events'),before);
});
test('Help proves an exact owner declaration and local communication but does not enroll or pay Hope',t=>{
  const f=fixture(t),plan=f.helpPlan(),choice=plan.choices[0],event=f.db.getWorldEvent(f.guild,choice.proof);
  assert.equal(choice.character,'pc-b');assert.equal(choice.pay_hope,true);assert.equal(f.pcs.b.data.resources.hope,3);assert.deepEqual(f.db.getCityRecord(f.guild,'roll_request',f.q.record_key),f.q);
  assert.equal(f.participation.inspectNativeRollParticipation(f.db,f.guild,f.q,f.pcs.b,event,'help',f.b.data.source_span).kind,'help');
  f.reopen();assert.deepEqual(f.helpPlan(),plan);assert.equal(f.count('mutations'),1);
});
test('private/inaccessible Help and net disadvantage cannot manufacture participation',t=>{
  const f=fixture(t);f.setAccess(false);assert.throws(f.helpPlan,/private_or_inaccessible/);f.setAccess(true);f.setVisible(false);assert.throws(f.helpPlan,/private_or_inaccessible/);f.setVisible(true);
  f.db.saveCityRecord(f.guild,{...f.q,data:{...f.q.data,breakdown:{advantage:0,disadvantage:1}}});assert.throws(f.helpPlan,/disadvantage_requires_review/);assert.equal(f.count('mutations'),0);
});
test('separate compatible Tag Team requests yield two eligibility proofs with no automatic owner acceptance',t=>{
  const f=fixture(t);f.db.saveCityRecord(f.guild,{...f.b,data:{...f.b.data,operation:'climb',target_key:'ladder'}});
  const other=f.save('roll_request','roll-b',{...f.q.data,owner_user_id:'owner-b',input:{accepted_intent:f.b.record_key,trait:'Agility'}},'pending',{visibility:'character',subject_key:'pc-b',source_event:f.b.source_event});
  const proposal={...f.help,rule_basis_refs:['srd:tag-team-rolls'],collaboration:{kind:'tag',request:f.q.record_key,partner_request:other.record_key}};
  const plan=f.participation.prepareNativeRollParticipation(f.db,f.guild,'sealed-origin',f.entry,proposal);assert.deepEqual(plan.choices.map(c=>c.op),['tag','participate']);assert.equal(f.count('mutations'),2);assert.equal(f.pcs.a.data.resources.hope,3);assert.equal(f.pcs.b.data.resources.hope,3);
});
test('current collaboration use rejects changed presence and disabled authority while saved proof remains read-only',t=>{
  const f=fixture(t),plan=f.helpPlan(),event=f.db.getWorldEvent(f.guild,plan.choices[0].proof);f.presences.b.data.state='left';
  const inspect=options=>f.participation.inspectNativeRollParticipation(f.db,f.guild,f.q,f.pcs.b,event,'help',f.b.data.source_span,options);assert.throws(()=>inspect(),/presence_changed/);assert.equal(inspect({historical:true}).kind,'help');
  f.presences.b.data.state='actually_present';f.setAuthority(false);assert.throws(()=>inspect(),/authority_disabled/);
});
test('actual eligibility providers cold-import without changing public exports',async()=>{
  const m=await import('../../src/native-roll-modifiers.js'),p=await import('../../src/native-roll-participation.js');assert.equal(typeof m.prepareOrdinaryRollModifier,'function');assert.equal(typeof m.inspectOrdinaryRollModifier,'function');assert.equal(typeof p.prepareNativeRollParticipation,'function');assert.equal(typeof p.inspectNativeRollParticipation,'function');
});
