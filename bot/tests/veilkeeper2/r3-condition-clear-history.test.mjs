import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {openLegacyReadOnlyRepository} from '../../src/v2/legacy-readonly-repository.js';
import {inspectNativeConditionClearAncestry} from '../../src/v2/rules/condition-clear-history.js';

const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const textHash=x=>createHash('sha256').update(x).digest('hex');
function fixture(t,{privateSource=false}={}){
  const dir=mkdtempSync(join(tmpdir(),'vk2-clear-history-')),file=join(dir,'source.sqlite'),db=new DatabaseSync(file);
  db.exec(`CREATE TABLE characters(id TEXT,guild_id TEXT,owner_user_id TEXT,name TEXT,status TEXT,character_json TEXT);
    CREATE TABLE campaigns(guild_id TEXT);
    CREATE TABLE city_records(guild_id TEXT,kind TEXT,record_key TEXT,actor_key TEXT,subject_key TEXT,status TEXT,visibility TEXT,source_event TEXT,data_json TEXT);
    CREATE TABLE world_events(guild_id TEXT,event_key TEXT,kind TEXT,status TEXT,source_id TEXT,visibility TEXT,subject_key TEXT,scene TEXT,session_id TEXT,details_json TEXT);
    CREATE TABLE mutation_ledger(guild_id TEXT,id INTEGER,source_layer TEXT,mutation_type TEXT,actor_type TEXT,actor_id TEXT,entity_key TEXT,session_id TEXT,visibility TEXT,before_json TEXT,after_json TEXT);`);
  // Today's owner/location are deliberately different from the historical actor authority.
  db.prepare('INSERT INTO characters VALUES(?,?,?,?,?,?)').run('pc','g','new-owner','PC','reserve','{"scene":"later"}');
  const raw='I free myself.',visibility=privateSource?'character':'party',subject=privateSource?'pc':null;
  const condition={owner:'old-owner',feature:'original-condition-effect'};
  const action={type:'interact',actor:'pc',owner_user_id:'old-owner',actor_principal_revision:4,scene:'old-scene',session_id:'old-session',source_hash:textHash(raw),start:0,end:raw.length,source_span:raw,framing:'immediate',operation:'clear_condition',target_key:'condition',outcome_receipt:'outcome'};
  const city=(kind,key,status,vis,sub,source,data)=>db.prepare('INSERT INTO city_records VALUES(?,?,?,?,?,?,?,?,?)').run('g',kind,key,'pc',sub,status,vis,source,JSON.stringify(data));
  city('pc_native_condition','condition','cleared','character','pc','original-effect',condition);
  city('typed_intent','action','resolved',visibility,subject,'authored',action);
  city('action_outcome_receipt','outcome','resolved',visibility,subject,'authored',{action_id:'action',actor_ref:'pc',outcome:'success'});
  let repo=openLegacyReadOnlyRepository(file);
  const actual=repo.getCityRecord('g','pc_native_condition','condition'),saved=repo.getCityRecord('g','typed_intent','action'),result=repo.getCityRecord('g','action_outcome_receipt','outcome');
  const actionSeal=hash({key:saved.record_key,source:saved.source_event,type:action.type,actor:action.actor,owner:action.owner_user_id,principal:action.actor_principal_revision,scene:action.scene,session:action.session_id,source_hash:action.source_hash,start:action.start,end:action.end,framing:action.framing,operation:action.operation,target:action.target_key});
  const before=[{native_ref:'condition',active:true},{native_ref:'other-condition',active:true}];
  const d={version:1,condition:'condition',condition_hash:hash(condition),owner:'old-owner',character:'pc',principal:4,scene:'old-scene',session:'old-session',action:'action',action_hash:actionSeal,action_source:'authored',prerequisite:'outcome',prerequisite_hash:hash(result),scope:{mode:privateSource?'private':'party',actorUserId:'old-owner',actorCharacterId:'pc'},mutation:1,before,after:before.map(c=>c.native_ref==='condition'?{...c,active:false}:c)};
  const receiptKey=`native-condition-clear:${hash('condition')}`;
  city('pc_native_condition_clear',receiptKey,'resolved','character','pc','clear-event',d);
  const event=(key,kind,source,vis,sub,details)=>db.prepare('INSERT INTO world_events VALUES(?,?,?,?,?,?,?,?,?,?)').run('g',key,kind,'active',source,vis,sub,'old-scene','old-session',JSON.stringify(details));
  event('authored','authored_turn','player:old-owner',visibility,subject,{author:'old-owner',character_id:'pc',principal_revision:4,raw_text:raw,raw_hash:textHash(raw)});
  event('clear-event','native_condition_clear','native:unified-gm','character','pc',{payload_hash:hash(d),input_source:'authored'});
  const ledger=(id,layer,type,actorType,actor,entity,vis,b,a)=>db.prepare('INSERT INTO mutation_ledger VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('g',id,layer,type,actorType,actor,entity,'old-session',vis,JSON.stringify(b),JSON.stringify(a));
  ledger(1,'native_condition','owner_action_condition_clear','system','native:unified-gm','pc','character',d.before,d.after);
  ledger(2,'city','world_event_index','user','old-owner','authored',visibility,{},{});
  t.after(()=>{repo.close();db.close();rmSync(dir,{recursive:true,force:true});});
  const read=()=>repo.withValidationSnapshot(()=>inspectNativeConditionClearAncestry(repo,'g',repo.getCityRecord('g','pc_native_condition','condition')));
  const updateData=(kind,key,edit)=>{const row=repo.getCityRecord('g',kind,key);edit(row.data);db.prepare('UPDATE city_records SET data_json=? WHERE guild_id=? AND kind=? AND record_key=?').run(JSON.stringify(row.data),'g',kind,key);};
  const reseal=()=>{const data=repo.getCityRecord('g','pc_native_condition_clear',receiptKey).data;db.prepare('UPDATE world_events SET details_json=? WHERE event_key=?').run(JSON.stringify({payload_hash:hash(data),input_source:data.action_source}),'clear-event');};
  return {db,repo,file,actual,receiptKey,read,updateData,reseal};
}

test('sealed public and private clears survive present owner/location changes and remain read-only',t=>{
  for(const privateSource of [false,true]){const f=fixture(t,{privateSource}),before=textHash(readFileSync(f.file));
    assert.equal(f.repo.getCharacter('pc').owner_user_id,'new-owner');
    assert.equal(f.read().record_key,f.receiptKey);
    assert.equal(textHash(readFileSync(f.file)),before);
    assert.equal(f.repo.getMutation('other',1),null);
    assert.equal(f.repo.ownerAuthoredSource('other','authored','old-owner'),false);
    assert.equal(f.repo.ownerAuthoredSource('g','authored','new-owner'),false);
    assert.throws(()=>f.repo.getMutation('g',{}),/identity/);
  }
});

for(const [name,sql] of [
  ['condition status',"UPDATE city_records SET status='active' WHERE kind='pc_native_condition'"],
  ['receipt status',"UPDATE city_records SET status='active' WHERE kind='pc_native_condition_clear'"],
  ['native publication identity',"UPDATE world_events SET source_id='player:old-owner' WHERE event_key='clear-event'"],
  ['native ledger actor',"UPDATE mutation_ledger SET actor_id='other' WHERE id=1"],
  ['owner source audit',"UPDATE mutation_ledger SET actor_id='new-owner' WHERE id=2"],
  ['historical source visibility',"UPDATE world_events SET visibility='character' WHERE event_key='authored'"],
  ['historical session',"UPDATE world_events SET session_id='later' WHERE event_key='authored'"],
  ['missing action',"DELETE FROM city_records WHERE kind='typed_intent'"],
  ['missing outcome',"DELETE FROM city_records WHERE kind='action_outcome_receipt'"],
  ['foreign guild ledger',"UPDATE mutation_ledger SET guild_id='other' WHERE id=1"]
])test(`rejects tampered ${name}`,t=>{const f=fixture(t);f.db.exec(sql);assert.throws(f.read,/native_condition_clear/);});

test('action span, original owner and outcome must agree with authored source beyond receipt hashes',t=>{
  for(const [field,value] of [['source_span','Someone else acts.'],['owner_user_id','new-owner'],['outcome_receipt','other-outcome']]){
    const f=fixture(t);f.updateData('typed_intent','action',d=>{d[field]=value;});assert.throws(f.read,/native_condition_clear/);
  }
  const f=fixture(t);f.updateData('action_outcome_receipt','outcome',d=>{d.outcome='failure';});
  // Even a matching saved outcome hash must not turn a failed attempt into a clear.
  f.updateData('pc_native_condition_clear',f.receiptKey,d=>{d.prerequisite_hash=hash(f.repo.getCityRecord('g','action_outcome_receipt','outcome'));});f.reseal();
  assert.throws(f.read,/saved_source_owner_result/);
});

test('resealed clear cannot deactivate another condition or broaden a private source',t=>{
  const other=fixture(t);other.updateData('pc_native_condition_clear',other.receiptKey,d=>{d.after[1].active=false;});
  other.db.prepare('UPDATE mutation_ledger SET after_json=? WHERE id=1').run(JSON.stringify(other.repo.getCityRecord('g','pc_native_condition_clear',other.receiptKey).data.after));other.reseal();
  assert.throws(other.read,/immutable_ancestry/);
  const privateSource=fixture(t,{privateSource:true});privateSource.updateData('pc_native_condition_clear',privateSource.receiptKey,d=>{d.scope.mode='party';});privateSource.reseal();
  assert.throws(privateSource.read,/saved_source_owner_result/);
});

test('stale condition snapshot and altered raw text fail without repairing stored ancestry',t=>{
  const f=fixture(t);const stale=structuredClone(f.actual);stale.data.owner='new-owner';
  assert.throws(()=>f.repo.withValidationSnapshot(()=>inspectNativeConditionClearAncestry(f.repo,'g',stale)),/immutable_ancestry/);
  const event=f.repo.getWorldEvent('g','authored');event.details.raw_text='I did something else.';
  f.db.prepare('UPDATE world_events SET details_json=? WHERE event_key=?').run(JSON.stringify(event.details),'authored');
  const before=textHash(readFileSync(f.file));assert.throws(f.read,/saved_source_owner_result/);assert.equal(textHash(readFileSync(f.file)),before);
});
