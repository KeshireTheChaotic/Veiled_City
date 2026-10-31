import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createFeatureTokenRules} from '../../src/frameworks/daggerheart/feature-token-rules.js';

const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function fixture(){
  const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE records(kind TEXT, key TEXT, body TEXT, PRIMARY KEY(kind,key)); CREATE TABLE events(key TEXT PRIMARY KEY, body TEXT)');
  const causes=new Map(),control={active:true,hash:'source-v1',failBalance:false};
  const db={transaction:fn=>{sql.exec('BEGIN IMMEDIATE');try{const result=fn();sql.exec('COMMIT');return result;}catch(error){sql.exec('ROLLBACK');throw error;}},
    getCityRecord:(g,kind,key)=>{const row=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key);return row?JSON.parse(row.body):null;},
    saveCityRecord:(g,input)=>{if(control.failBalance&&input.kind==='native_feature_token_balance')throw new Error('balance write failed');
      const {key,...rest}=input,row={...rest,record_key:key};sql.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,key) DO UPDATE SET body=excluded.body').run(input.kind,key,JSON.stringify(row));return row;},
    getWorldEvent:(g,key)=>{const row=sql.prepare('SELECT body FROM events WHERE key=?').get(key);return row?JSON.parse(row.body):null;}};
  const indexWorldEvent=(db,g,input)=>{const {key,...rest}=input,row={...rest,event_key:key,status:'active'};sql.prepare('INSERT INTO events VALUES(?,?)').run(key,JSON.stringify(row));return row;};
  const authorize=(db,g,input,{historical=false}={})=>{
    if(!historical&&!control.active)throw new Error('actor control expired');
    const cause=causes.get(input.cause);if(!cause||cause.actor!==input.actor)throw new Error('native actor/cause required');
    return {actor:input.actor,feature:input.feature,pool:'Forecast',feature_hash:'feature-v1',source_hash:control.hash,template_hash:'template-v1',
      location:'location',session:'session',scene:cause.scene,cause:input.cause,occurrence:input.feature==='gain'?cause.scene:input.cause,
      operation:input.feature,amount:input.feature==='clear'?0:1,cap:3};
  };
  const inspectCause=(db,g,key)=>{const cause=causes.get(key);if(!cause)throw new Error('missing source');return {...cause,source_event:`source:${key}`};};
  const service=()=>createFeatureTokenRules({authorize,inspectCause,indexWorldEvent});
  const request=(s,feature,cause)=>s.preflightFeatureToken(db,'g',{feature,actor:'engine',cause});
  return {sql,db,causes,control,service,request};
}

test('owner ruling pins Expected Value to one Engine/scene total with cap three',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../../src/frameworks/daggerheart/native-house-errata.json',import.meta.url),'utf8'));
  const rule=data.entries.find(e=>e.id==='HR15'&&e.version===1);
  assert.equal(rule.authority_ref,'owner:expected-value-once-per-scene:v1');
  assert.equal(rule.interpretation.scope,'once_per_engine_actor_per_scene_total');
  assert.equal(rule.interpretation.per_pc,false);assert.equal(rule.interpretation.cap,3);
  assert.equal(rule.status,'supported');assert.equal(rule.native_handler,'native_token_gain');
  const definitions=JSON.parse(fs.readFileSync(new URL('../../src/frameworks/daggerheart/native-feature-definitions.json',import.meta.url),'utf8'));
  const feature=definitions.features.find(f=>f.feature_key===rule.sources[0].key);
  assert.equal(rule.sources[0].source_hash,feature.source_hash);assert.equal(rule.sources[0].template_hash,feature.template_hash);
});

test('owner ruling pins Break the Line’s secondary ally and range origin without enabling the unimplemented effect',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../../src/frameworks/daggerheart/native-house-errata.json',import.meta.url),'utf8'));
  const rule=data.entries.find(e=>e.id==='HR16'&&e.version===1);
  assert.equal(rule.authority_ref,'owner:break-the-line-target-ally:v1');assert.equal(rule.status,'review_only');
  assert.equal(rule.interpretation.secondary_actor,'ally_of_primary_target');assert.equal(rule.interpretation.secondary_range_origin,'primary_target');
  assert.equal(rule.interpretation.secondary_range,'Very Close');assert.equal(rule.interpretation.secondary_choice_owner,'affected_actor_controller');
  assert.deepEqual(rule.interpretation.secondary_choice,['mark_1_Stress','native_forced_push']);assert.equal(rule.interpretation.silence,'pending');
});

test('distinct PCs in one scene share one gain; later scenes gain until the cap, replay survives restart',()=>{
  const f=fixture();try{
    let s=f.service();
    for(let i=0;i<5;i++)f.causes.set(`pc${i}`,{actor:'engine',scene:`scene${i}`,session:'session',pc:`pc${i}`});
    f.causes.set('other-pc',{actor:'engine',scene:'scene0',session:'session',pc:'other'});
    const token=f.request(s,'gain','pc0').token,first=s.commitFeatureToken(f.db,'g',token);
    assert.equal(first.data.after,1);assert.equal(first.visibility,'gm');
    assert.equal(s.commitFeatureToken(f.db,'g',token).record_key,first.record_key);
    assert.equal(f.request(s,'gain','other-pc').status,'already_committed');
    for(let i=1;i<5;i++){const result=f.request(s,'gain',`pc${i}`);const receipt=s.commitFeatureToken(f.db,'g',result.token);assert.equal(receipt.data.after,Math.min(3,i+1));}
    s=f.service();assert.equal(f.request(s,'gain','pc0').status,'already_committed');
    f.control.active=false;assert.equal(s.inspectFeatureTokenReceipt(f.db,'g',first.record_key).data.after,1);
    assert.throws(()=>f.request(s,'gain','pc0'),/control expired/);
  }finally{f.sql.close();}
});

test('spend, clear, underflow, stale preparations and forged tokens remain bounded',()=>{
  const f=fixture();try{
    const s=f.service();f.causes.set('gain',{actor:'engine',scene:'scene',session:'session'});
    f.causes.set('spend',{actor:'engine',scene:'scene',session:'session'});
    f.causes.set('clear',{actor:'engine',scene:'scene',session:'session'});
    assert.throws(()=>f.request(s,'spend','spend'),/capacity/);
    assert.throws(()=>s.commitFeatureToken(f.db,'g',{}),/native_preparation/);
    const first=f.request(s,'gain','gain');s.commitFeatureToken(f.db,'g',first.token);
    const spend=f.request(s,'spend','spend'),clear=f.request(s,'clear','clear');
    assert.equal(s.commitFeatureToken(f.db,'g',spend.token).data.after,0);
    assert.throws(()=>s.commitFeatureToken(f.db,'g',clear.token),/preparation_changed/);
    const current=f.request(s,'clear','clear');assert.equal(s.commitFeatureToken(f.db,'g',current.token).data.after,0);
    assert.throws(()=>s.preflightFeatureToken(f.db,'g',{feature:'gain',actor:'engine',cause:'gain',amount:99}),/closed_input/);
  }finally{f.sql.close();}
});

test('a failed ledger projection rolls back the receipt and event; changed source versions hold saved readers',()=>{
  const f=fixture();try{
    const s=f.service();f.causes.set('gain',{actor:'engine',scene:'scene',session:'session'});
    const p=f.request(s,'gain','gain');f.control.failBalance=true;
    assert.throws(()=>s.commitFeatureToken(f.db,'g',p.token),/balance write failed/);
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM records').get().n,0);
    assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM events').get().n,0);
    f.control.failBalance=false;const receipt=s.commitFeatureToken(f.db,'g',p.token);
    f.control.hash='source-v2';assert.throws(()=>s.inspectFeatureTokenReceipt(f.db,'g',receipt.record_key),/historical_source_changed/);
  }finally{f.sql.close();}
});
