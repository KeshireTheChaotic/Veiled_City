import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createAdvantageOpportunitySource} from '../../src/frameworks/daggerheart/advantage-opportunity-source.js';
import {createFeatureOpportunityRules} from '../../src/frameworks/daggerheart/feature-opportunity-rules.js';
import {createRollRequestRules} from '../../src/frameworks/daggerheart/roll-request-rules.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
function fixture(){
  const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key)); CREATE TABLE events(key TEXT PRIMARY KEY,body TEXT); CREATE TABLE mutations(id TEXT PRIMARY KEY,body TEXT)');
  const template=read('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json').find(a=>a.name==='Aster Vale Forecast Engine');
  const feature=read('../../src/frameworks/daggerheart/native-feature-definitions.json').features.find(f=>f.feature_key==='adversary:aster-vale-forecast-engine:expected-value');
  const rule=read('../../src/frameworks/daggerheart/native-house-errata.json').entries.find(e=>e.id==='HR15');
  // Exercise the pending integration with source-derived in-memory qualification.
  // Production descriptors are left review-only until AF04 qualification.
  feature.status='supported';feature.native_handler='native_token_gain';rule.status='supported';rule.native_handler='native_token_gain';
  let depth=0,mutationId=0,currentPc='pc1',mode='autonomous',owned=true,hasAdvantage=true;
  const scene={key:'scene1',session_id:'session'};
  const pcs=new Map(['pc1','pc2'].map(id=>[id,{id,name:id,owner_user_id:`owner:${id}`,data:{location:'place',traits:{Instinct:2}}}]));
  const eventSave=input=>{const {key,...rest}=input,row={...rest,event_key:key,status:'active'};sql.prepare('INSERT INTO events VALUES(?,?) ON CONFLICT(key) DO UPDATE SET body=excluded.body').run(key,JSON.stringify(row));return row;};
  const db={
    transaction:fn=>{const level=++depth;sql.exec(level===1?'BEGIN IMMEDIATE':`SAVEPOINT af${level}`);try{const v=fn();sql.exec(level===1?'COMMIT':`RELEASE af${level}`);return v;}
      catch(e){sql.exec(level===1?'ROLLBACK':`ROLLBACK TO af${level}`);throw e;}finally{depth--;}},
    getCityCalendar:()=>({flags:{roll_requests:true,gm_discretion:true}}),getActiveSession:()=>({id:'session'}),
    getCurrentEncounter:()=>({id:'encounter',status:'active'}),getCharacter:id=>pcs.get(id),ownerAuthoredSource:()=>true,
    getCityRecord:(g,kind,key)=>{
      if(kind==='gm_authority')return {data:{gm_authority_mode:mode}};
      if(kind==='encounter_binding')return {status:'active',data:{combatants:[{actor:'engine1'},{actor:'engine2'},{actor:'proxy'}]}};
      const row=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key);return row?JSON.parse(row.body):null;},
    saveCityRecord:(g,input)=>{const {key,...rest}=input,row={...rest,record_key:key};sql.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,key) DO UPDATE SET body=excluded.body').run(input.kind,key,JSON.stringify(row));return row;},
    getWorldEvent:(g,key)=>{const row=sql.prepare('SELECT body FROM events WHERE key=?').get(key);return row?JSON.parse(row.body):null;},
    recordMutation:(g,input)=>{const id=`mutation${++mutationId}`,row={id,actor_type:input.actorType,actor_id:input.actorId,source_layer:input.sourceLayer,
      mutation_type:input.mutationType,entity_key:input.entityKey,session_id:input.sessionId,visibility:input.visibility,after_json:JSON.stringify(input.after)};
      sql.prepare('INSERT INTO mutations VALUES(?,?)').run(id,JSON.stringify(row));return row;},
    getMutation:(g,id)=>{const row=sql.prepare('SELECT body FROM mutations WHERE id=?').get(id);return row?JSON.parse(row.body):null;},
    rollModifierSources:()=>[db.getWorldEvent('g','modifier')]
  };
  const currentScene=()=>scene,nativeActorControl=(db,g,type,actor)=>({owner_control_type:actor==='proxy'||!owned?'player':'ai_world',revision:'control1'}),
    nativeEncounterActor=(db,g,actor)=>({actor,template,scene:scene.key,session:'session',presence:{location_key:'place'}}),
    indexWorldEvent=(db,g,input)=>eventSave(input);
  const source=createAdvantageOpportunitySource({currentScene,nativeEncounterActor,nativeActorControl,indexWorldEvent});
  const createService=()=>createFeatureOpportunityRules({capabilities:{...source,currentScene,nativeEncounterActor,nativeActorControl,indexWorldEvent,
    compileNativeFeatures:()=>[feature],nativeHouseErratum:()=>rule}});
  let service=createService();
  const noop=()=>null;
  const requests=createRollRequestRules({traits:['Instinct'],reserveRollAmendment:noop,sources:{personalCharacter:()=>pcs.get(currentPc),currentScene,
    requireCitySource:(db,g,key)=>db.getWorldEvent(g,key),cityAudit:noop,cityKey:s=>s,overlapsOwnerActionTerminal:()=>false},mechanics:{
      isPvpIntent:()=>false,assertNonPvpCombatant:noop,assertPcCanAct:noop,blazeActionAuthorization:noop,nativeDefenseAura:noop,persistNativeDefenseAura:noop,
      nativeFormationDefense:noop,persistNativeFormationDefense:noop,nativeVeilExposureDefense:noop,inspectNativeUnarmedAttack:noop,inspectNativeEquippedAttack:noop,
      inspectOrdinaryRollModifier:()=>({name:'Source-bound modifier',kind:hasAdvantage?'advantage':'flat',amount:hasAdvantage?1:0,ruling_key:''}),
      captureAdvantageFeatureOpportunities:(db,g,row)=>service.captureAdvantageFeatureOpportunities(db,g,row)}});
  function prepare(id='pc1',suffix=''){
    currentPc=id;const pc=pcs.get(id),key=`owner-source:${id}:${scene.key}:${suffix}`;
    eventSave({key,kind:'player_declaration',source_id:`player:${pc.owner_user_id}`,scene:scene.key,session_id:'session',visibility:'character',subject_key:id,
      details:{author:pc.owner_user_id,character_id:id,text:'I investigate the device.'}});
    eventSave({key:'modifier',details:{issuer:'native:ordinary-roll-modifier'}});
    return requests.prepareRollRequest(db,'g',{source_event:key,character_id:id,kind:'action',trait:'Instinct',adjudication:'Native source-bound ruling',modifier_keys:['modifier']},pc.owner_user_id);
  }
  const receipts=()=>sql.prepare("SELECT body FROM records WHERE kind='native_feature_token_receipt'").all().map(r=>JSON.parse(r.body));
  return {sql,db,scene,feature,rule,prepare,receipts,source,get service(){return service;},restart:()=>{service=createService();},mode:value=>{mode=value;},ownership:value=>{owned=value;},advantage:value=>{hasAdvantage=value;}};
}

test('actual native roll preparation captures independent Engine gains before dice, once per scene total across PCs',()=>{
  const f=fixture();try{
    const request=f.prepare();assert.equal(request.status,'pending');assert.equal(request.data.roll_id,undefined);
    assert.equal(f.receipts().length,2);assert.ok(f.receipts().every(r=>r.visibility==='gm'&&r.data.after===1));
    f.prepare('pc2');assert.equal(f.receipts().length,2);
    assert.deepEqual(f.receipts().map(r=>r.data.terms.actor).sort(),['engine1','engine2']);
    f.restart();f.prepare('pc1');assert.equal(f.receipts().length,2);
    for(let i=2;i<=5;i++){f.scene.key=`scene${i}`;f.prepare();}
    assert.equal(f.receipts().length,10);assert.ok(f.receipts().filter(r=>r.data.terms.scene==='scene5').every(r=>r.data.after===3));
  }finally{f.sql.close();}
});

test('manual mode, review-only source and player-controlled actors do not gain tokens or block valid PC requests',()=>{
  const f=fixture();try{
    f.mode('manual');assert.equal(f.prepare().status,'pending');assert.equal(f.receipts().length,0);
    f.mode('autonomous');f.feature.status='review_only';assert.equal(f.prepare('pc2').status,'pending');assert.equal(f.receipts().length,0);
    f.feature.status='supported';f.ownership(false);assert.equal(f.prepare('pc1','new').status,'pending');assert.equal(f.receipts().length,0);
  }finally{f.sql.close();}
});

test('settled token receipt remains readable after scene/ownership change; changed source or tampered private provenance is held',()=>{
  const f=fixture();try{
    const request=f.prepare(),receipt=f.receipts()[0];
    f.db.saveCityRecord('g',{...request,key:request.record_key,status:'resolved',data:{...request.data,result:{total:15}}});
    f.scene.key='later';f.ownership(false);f.restart();
    assert.equal(f.service.inspectFeatureTokenReceipt(f.db,'g',receipt.record_key).data.after,1);
    const old=f.feature.source_hash;f.feature.source_hash='changed';
    assert.throws(()=>f.service.inspectFeatureTokenReceipt(f.db,'g',receipt.record_key),/source_not_qualified/);f.feature.source_hash=old;
    const proof=f.db.getCityRecord('g','native_roll_opportunity',receipt.data.terms.cause);
    f.db.saveCityRecord('g',{...proof,key:proof.record_key,visibility:'party'});
    assert.throws(()=>f.service.inspectFeatureTokenReceipt(f.db,'g',receipt.record_key),/ancestry/);
  }finally{f.sql.close();}
});

test('a later native Help advantage gain requires the helper’s actual die, authorized Hope payment and operation receipt',()=>{
  const f=fixture();try{
    f.advantage(false);const original=f.prepare();assert.equal(f.receipts().length,0);
    const helper={character:'pc2',user:'owner:pc2',die:5,proof:'help-proof',roll_id:'help-roll',operation_key:'help-op'};
    f.db.getSavedRoll=()=>({roll_type:'help',session_id:'session',character_id:'pc2',discord_user_id:'owner:pc2',
      payload:{request:original.record_key,hope_spent:1,die:5,proof:'help-proof'}});
    f.db.saveCityRecord('g',{kind:'roll_operation',key:'help-op',data:{op:'help',request:original.record_key,user:'owner:pc2',authorization:{pay_hope:true},
      resource_deltas:[{character:'pc2',hope:{before:3,after:2,delta:-1}}]}});
    const helped=f.db.saveCityRecord('g',{...original,key:original.record_key,data:{...original.data,helpers:[helper]}});
    const result=f.service.captureAdvantageFeatureOpportunities(f.db,'g',helped);assert.equal(result.length,2);assert.equal(f.receipts().length,2);
    assert.ok(result.every(r=>r.data.after===1));
    const forged=f.db.saveCityRecord('g',{...helped,key:helped.record_key,data:{...helped.data,helpers:[{...helper,die:6}]}});
    const held=f.service.captureAdvantageFeatureOpportunities(f.db,'g',forged);assert.equal(held[0].status,'held');assert.match(held[0].reason,/helper_payment/);
    assert.equal(f.receipts().length,2);
  }finally{f.sql.close();}
});
