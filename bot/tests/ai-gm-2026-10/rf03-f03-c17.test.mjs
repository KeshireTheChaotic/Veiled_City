import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createActionConsentRules,consentHash} from '../../src/frameworks/daggerheart/action-consent-rules.js';

// New repository fixture. Real disposable SQLite transactions; explicit mocked
// current-principal, scene and terminal-verdict ports, no production database.
function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'vc-consent-c17-')),file=join(dir,'consent.sqlite');
  let sql=new DatabaseSync(file),failSave=false,terminal=false,revision='owner-r1',minute=10;
  t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});
  sql.exec('CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key)); CREATE TABLE events(key TEXT PRIMARY KEY,body TEXT); CREATE TABLE auth(key TEXT PRIMARY KEY,user TEXT);');
  const scene={key:'scene-c17',session_id:'session-c17'},raw='I steady the ladder beside the bell tower.';
  const source={event_key:'declaration-c17',status:'active',kind:'authored_turn',source_id:'player:owner-a',scene:scene.key,session_id:scene.session_id,visibility:'character',subject_key:'pc-a',details:{author:'owner-a',character_id:'pc-a',principal_revision:revision,raw_text:raw,raw_hash:createHash('sha256').update(raw).digest('hex')}};
  function event(value,user){sql.prepare('INSERT OR REPLACE INTO events VALUES(?,?)').run(value.event_key,JSON.stringify(value));if(user)sql.prepare('INSERT OR REPLACE INTO auth VALUES(?,?)').run(value.event_key,user);return value;}
  const db={
    getCityRecord(_g,kind,key){const row=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key??'');return row?JSON.parse(row.body):null;},
    saveCityRecord(_g,value){if(failSave&&value.kind==='action_consent')throw Error('injected consent write');const row={...value,record_key:value.key};sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(value.kind,value.key,JSON.stringify(row));return row;},
    getWorldEvent(_g,key){const row=sql.prepare('SELECT body FROM events WHERE key=?').get(key??'');return row?JSON.parse(row.body):null;},
    ownerAuthoredSource(_g,key,user){return sql.prepare('SELECT user FROM auth WHERE key=?').get(key)?.user===user;},
    getCharacter(key){return ['pc-a','pc-b'].includes(key)?{guild_id:'guild-c17',owner_user_id:key==='pc-a'?'owner-a':'owner-b'}:null;},
    getSimulationClock(){return {minute};},getSavedRoll(_g,key){return key==='roll-c17'?{id:key,session_id:scene.session_id,payload:{request:'request-c17'}}:null;},
    transaction(fn){sql.exec('BEGIN IMMEDIATE');try{const value=fn();sql.exec('COMMIT');return value;}catch(error){sql.exec('ROLLBACK');throw error;}}
  };
  event(source,'owner-a');
  const accepted=db.saveCityRecord('guild-c17',{kind:'typed_intent',key:'accepted-c17',status:'accepted_for_adjudication',source_event:source.event_key,visibility:'character',subject_key:'pc-a',data:{actor:'pc-a',owner_user_id:'owner-a',actor_principal_revision:revision,session_id:scene.session_id,scene:scene.key,start:0,end:raw.length,source_span:raw,source_hash:source.details.raw_hash}});
  event({event_key:'window-source-c17',status:'active'});
  const window=db.saveCityRecord('guild-c17',{kind:'scene_action_window',key:'window-c17',status:'open',source_event:'window-source-c17',data:{scene:scene.key,revision:1}});
  const principal=(_db,_guild,user,pc)=>({kind:db.getCharacter(pc)?.owner_user_id===user?'owner':'observer',revision,user});
  const rules=createActionConsentRules({sources:{conversationPrincipal:principal,historicalOwnerPrincipal:(...args)=>({...principal(...args),kind:'historical_owner'}),currentScene:()=>({...scene}),overlapsOwnerActionTerminal:()=>terminal,indexWorldEvent:(_db,_g,input,user)=>event({...input,event_key:input.key,status:'active'},user)},typedRollProof:()=>({outcome:'success'})});
  const input={window:window.record_key,expected_revision:1,accepted_intent:accepted.record_key,reads:['location:ladder'],writes:['object:ladder'],location_key:'tower-c17',operation:'steady ladder',required_participants:['pc-a','pc-b'],consequences:'Each owner may choose whether to steady the ladder.',expires_minute:20};
  const request=()=>rules.requestActionConsent(db,'guild-c17',input);
  const reply=(offer,user,decision='accept',interaction_id=`${user}-${decision}`)=>rules.respondActionConsent(db,'guild-c17',user,{request:offer.record_key,expected_revision:offer.data.terms_hash,decision,interaction_id});
  const validate=refs=>rules.validateActionConsent(db,'guild-c17',refs,{window:db.getCityRecord('guild-c17','scene_action_window',window.record_key),accepted:db.getCityRecord('guild-c17','typed_intent',accepted.record_key),input});
  return {db,rules,input,accepted,window,source,scene,event,request,reply,validate,setTerminal:value=>terminal=value,setRevision:value=>revision=value,setMinute:value=>minute=value,setFailure:value=>failSave=value,count:table=>Number(sql.prepare(`SELECT count(*) AS n FROM ${table}`).get().n),reopen(){sql.close();sql=new DatabaseSync(file);}};
}

test('exact voluntary participation needs separate authenticated responses from every owner',t=>{
  const f=fixture(t),offer=f.request(),a=f.reply(offer,'owner-a');
  assert.equal(offer.visibility,'gm');assert.equal(a.visibility,'character');assert.equal(a.subject_key,'pc-a');
  assert.equal(f.validate([a.record_key]),false);
  const b=f.reply(offer,'owner-b');assert.equal(f.validate([a.record_key,b.record_key]),true);
  assert.equal(f.validate([a.record_key,a.record_key]),false);
  assert.equal(offer.data.authority,'Voluntary participation only; no dice, costs or outcome.');
  assert.deepEqual(f.request(),offer);
});
test('interaction replay survives SQLite reopen and cannot change its decision',t=>{
  const f=fixture(t),offer=f.request(),a=f.reply(offer,'owner-a'),n=f.count('events');f.reopen();
  assert.deepEqual(f.reply(offer,'owner-a'),a);assert.equal(f.count('events'),n);
  assert.throws(()=>f.reply(offer,'owner-a','decline','owner-a-accept'),/replay cannot change/);
  assert.equal(f.count('events'),n);
});
test('revoke and decline remain terminal, and cooperation cannot stand in for PvP',t=>{
  const f=fixture(t),offer=f.request(),a=f.reply(offer,'owner-a');
  const b=f.reply(offer,'owner-b','decline');assert.equal(f.validate([a.record_key,b.record_key]),false);
  assert.throws(()=>f.reply(offer,'owner-b'),/terminal/);
  const revoked=f.reply(offer,'owner-a','revoke');assert.equal(revoked.data.previous_source,a.source_event);
  assert.throws(()=>f.reply(offer,'owner-a','accept','retry'),/terminal/);
  f.db.saveCityRecord('guild-c17',{...f.window,data:{...f.window.data,reason:'direct_pc_conflict'}});
  assert.throws(f.request,/PvP consent/);
});
test('foreign owner, stale principal, stale window and expired offer fail before response',t=>{
  const f=fixture(t),offer=f.request();assert.throws(()=>f.reply(offer,'outsider'),/affected owner/);
  f.setRevision('changed');assert.throws(()=>f.reply(offer,'owner-a'),/principal changed/);f.setRevision('owner-r1');
  f.db.saveCityRecord('guild-c17',{...f.window,data:{...f.window.data,revision:2}});
  assert.throws(()=>f.reply(offer,'owner-a'),/window revision/);
  f.db.saveCityRecord('guild-c17',f.window);f.setMinute(20);assert.throws(()=>f.reply(offer,'owner-a'),/expired/);
});
test('exact declaration ancestry rejects withdrawal, privacy relabel, source edits and future framing',t=>{
  const f=fixture(t);f.setTerminal(true);assert.throws(f.request,/withdrew/);f.setTerminal(false);
  f.event({...f.source,visibility:'public'});assert.throws(f.request,/audience or scene/);
  f.event({...f.source,details:{...f.source.details,raw_text:'a forged declaration'}});assert.throws(f.request,/declaration range|source, audience/);
  f.event(f.source);f.db.saveCityRecord('guild-c17',{...f.accepted,data:{...f.accepted.data,framing:'future'}});assert.throws(f.request,/immediate/);
});
test('atomic response rollback removes both authenticated source and consent row',t=>{
  const f=fixture(t),offer=f.request(),before=f.count('events');f.setFailure(true);
  assert.throws(()=>f.reply(offer,'owner-a'),/injected consent write/);
  assert.equal(f.count('events'),before);assert.equal(f.count('auth'),1);
  f.setFailure(false);const a=f.reply(offer,'owner-a');assert.equal(a.status,'accepted');
});
test('read-only terminal history requires the exact resolved native receipt and saved roll',t=>{
  const f=fixture(t);f.db.saveCityRecord('guild-c17',{...f.accepted,status:'resolved',data:{...f.accepted.data,outcome_receipt:'outcome-c17'}});
  assert.throws(()=>f.rules.completedActionSource(f.db,'guild-c17',f.accepted.record_key),/terminal action receipt/);
  f.db.saveCityRecord('guild-c17',{kind:'action_outcome_receipt',key:'outcome-c17',status:'resolved',source_event:f.source.event_key,data:{request:'request-c17',action_id:f.accepted.record_key,native_roll_refs:['roll-c17'],outcome:'success'}});
  f.db.saveCityRecord('guild-c17',{kind:'roll_request',key:'request-c17',status:'resolved',source_event:f.source.event_key,subject_key:'pc-a',data:{roll_id:'roll-c17',input:{accepted_intent:f.accepted.record_key}}});
  assert.equal(f.rules.completedActionSource(f.db,'guild-c17',f.accepted.record_key).row.status,'resolved');
  assert.throws(()=>f.rules.consentAction(f.db,'guild-c17',f.accepted.record_key),/current accepted action/);
});
test('actual provider keeps public exports and byte-identical consent hashing',async()=>{
  const provider=await import('../../src/action-consent.js');
  for(const key of ['consentAction','historicalActionSource','completedActionSource','requestActionConsent','respondActionConsent','validateActionConsent'])assert.equal(typeof provider[key],'function');
  const value={source:'c17',terms:['private','owner']};assert.equal(provider.consentHash(value),consentHash(value));
  assert.equal(consentHash(value),createHash('sha256').update(JSON.stringify(value)).digest('hex'));
});
