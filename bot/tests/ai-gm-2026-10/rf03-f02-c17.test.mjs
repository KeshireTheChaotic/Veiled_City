import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAdversaryDamageDefenseRules} from '../../src/frameworks/daggerheart/adversary-damage-defense-rules.js';
import {createAdversaryAttackPassiveRules} from '../../src/frameworks/daggerheart/adversary-attack-passive-rules.js';
import {jsonHash as hash} from '../../src/kernel/json-hash.js';

function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'vc-adversary-passive-c17-')),file=join(dir,'passive.sqlite');let sql=new DatabaseSync(file),proxy=false,failCharge=false;
  t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});
  sql.exec('CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key)); CREATE TABLE events(key TEXT PRIMARY KEY,body TEXT); CREATE TABLE rolls(id TEXT PRIMARY KEY,body TEXT);');
  const guild='guild-c17-passive',session='session-c17-passive',scene='scene-c17-passive',template={name:'Native passive C17',difficulty:12};
  const defenseFeature={feature_key:'adversary:aster-vale-catastrophe-analyst:contingency-stack',native_handler:'first_severe_to_major',actor_name:template.name,template_hash:hash(template)},packFeature={feature_key:'adversary:pale-court-thrall:pack-pressure',native_handler:'pack_pressure',actor_name:template.name,template_hash:hash(template)};
  const pc={id:'pc-c17',owner_user_id:'owner-c17',data:{location:'tower-c17'}},target={id:'combatant-c17',base_name:template.name,hp_current:5,hp_max:5,major_threshold:8,severe_threshold:14,status:'active'};
  const db={getCityRecord(_g,kind,key){const r=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key??'');return r?JSON.parse(r.body):null;},saveCityRecord(_g,v){if(failCharge&&v.kind==='adversary_defense_charge')throw Error('injected charge failure');const r={...v,record_key:v.key};sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(v.kind,v.key,JSON.stringify(r));return r;},getWorldEvent(_g,key){const r=sql.prepare('SELECT body FROM events WHERE key=?').get(key??'');return r?JSON.parse(r.body):null;},getSavedRoll(_g,id){const r=sql.prepare('SELECT body FROM rolls WHERE id=?').get(id);return r?JSON.parse(r.body):null;},getCharacter(id){return id===pc.id?pc:null;},ownerAuthoredSource(_g,_key,user){return user===pc.owner_user_id;},getCurrentEncounter(){return {id:'encounter-c17',status:'active'};},getSimulationEntity(){return {state:{location_key:pc.data.location}};},listCombatants(){return combatants;},transaction(fn){sql.exec('BEGIN IMMEDIATE');try{const v=fn();sql.exec('COMMIT');return v;}catch(e){sql.exec('ROLLBACK');throw e;}}};
  const save=(kind,key,data,status='resolved',extra={})=>db.saveCityRecord(guild,{kind,key,data,status,...extra}),event=(_d,_g,v)=>{const r={...v,event_key:v.key,status:v.status??'active'};sql.prepare('INSERT OR REPLACE INTO events VALUES(?,?)').run(v.key,JSON.stringify(r));return r;};
  const source=event(null,null,{key:'owner-source-c17',kind:'authored_turn',source_id:`player:${pc.owner_user_id}`,session_id:session,scene,details:{author:pc.owner_user_id,character_id:pc.id}});
  const result={total:18,duality:'Hope'},damage={roll_id:'damage-roll-c17',total:16};
  const request=save('roll_request','request-c17',{kind:'attack',session_id:session,scene,character_id:pc.id,owner_user_id:pc.owner_user_id,roll_id:'attack-roll-c17',result,breakdown:{attack:{encounter_id:'encounter-c17',target_id:target.id,difficulty:12}},input:{},damage},'resolved',{source_event:source.event_key,subject_key:pc.id});
  for(const roll of [{id:'attack-roll-c17',session_id:session,payload:{request:request.record_key,...result}},{id:'damage-roll-c17',roll_type:'attack_damage',session_id:session,character_id:pc.id,discord_user_id:pc.owner_user_id,payload:{request:request.record_key,total:16}}])sql.prepare('INSERT INTO rolls VALUES(?,?)').run(roll.id,JSON.stringify(roll));
  const presences={npc:{source_event:'npc-presence-c17',location_key:pc.data.location,data:{state:'actually_present',scene,zone:'same'}},pc:{location_key:pc.data.location,data:{zone:'same'}}};
  for(const key of ['binding-source-c17','npc-presence-c17'])event(null,null,{key});
  save('encounter_binding','encounter-c17',{combatants:[{actor:'npc-c17',id:target.id}]},'active',{source_event:'binding-source-c17'});
  class Library{findAdversary(){return template;}}
  const defense=createAdversaryDamageDefenseRules({capabilities:{compileNativeFeatures:()=>[defenseFeature],EncounterLibrary:Library,currentScene:()=>({key:scene,session_id:session}),scenePresence:()=>presences.npc,activeCityProxy:()=>proxy,indexWorldEvent:event,historicalActionSource:()=>({})}});
  const combatants=Array.from({length:3},(_,i)=>({id:`ally-${i}`,base_name:template.name,status:'active',hp_current:3}));
  const passive=createAdversaryAttackPassiveRules({capabilities:{compileNativeFeatures:()=>[packFeature],scenePresence:(_d,_g,type)=>type==='character'?presences.pc:presences.npc,sceneAccess:()=>true,nativeHouseErratum:()=>null,activeCityProxy:()=>proxy}});
  const apply=(marks=3)=>defense.nativeAdversaryDamageDefense(db,guild,db.getCityRecord(guild,'roll_request',request.record_key),db.getCityRecord(guild,'roll_request',request.record_key).data,target,{total:16,type:'physical',marks});
  const odds=()=>passive.nativeAttackPassives(db,guild,{npc:'npc-c17',combatant:target,character:pc.id,encounter:{id:'encounter-c17'},binding:{data:{combatants:combatants.map((c,i)=>({actor:`ally-npc-${i}`,id:c.id}))}},template,library:new Library()});
  return {db,guild,pc,target,template,request,presences,combatants,defense,passive,apply,odds,save,event,setProxy:v=>proxy=v,setFailure:v=>failCharge=v,count:table=>Number(sql.prepare(`SELECT count(*) n FROM ${table}`).get().n),reopen(){sql.close();sql=new DatabaseSync(file);}};
}
test('Contingency Stack changes only the first verified severe result to two marks and consumes one immutable charge',t=>{
  const f=fixture(t),result=f.db.transaction(()=>f.apply());assert.equal(result.marks,2);assert.equal(f.target.hp_current,5);assert.equal(f.apply(),null);f.reopen();assert.equal(f.apply(),null);assert.equal(f.count('rolls'),2);
  const saved=f.db.saveCityRecord(f.guild,{...f.request,data:{...f.request.data,damage_result:{defense_ref:result.ref,marks:2,total:16,type:'physical',target_id:f.target.id,before:5,after:3}}});
  const receipt=f.defense.inspectAdversaryDamageDefense(f.db,f.guild,saved);assert.equal(receipt.record_key,result.ref);assert.equal(receipt.visibility,'gm');
});
test('ordinary damage or a human-proxied adversary never spends this automatic native charge',t=>{
  const f=fixture(t);assert.equal(f.apply(2),null);f.setProxy(true);assert.equal(f.apply(),null);assert.equal(f.count('records'),2);
});
test('fabricated attack result and mismatched saved damage cannot authorize defense',t=>{
  const f=fixture(t);f.db.saveCityRecord(f.guild,{...f.request,data:{...f.request.data,result:{total:99,duality:'Hope'}}});assert.throws(f.apply,/actual_saved_attack/);
  f.db.saveCityRecord(f.guild,{...f.request,data:{...f.request.data,damage:{roll_id:'damage-roll-c17',total:30}}});assert.throws(f.apply,/actual_saved_damage/);
});
test('failed charge write rolls receipt and source back in the unchanged enclosing damage transaction',t=>{
  const f=fixture(t),before=f.count('events');f.setFailure(true);assert.throws(()=>f.db.transaction(()=>f.apply()),/injected charge failure/);assert.equal(f.count('events'),before);assert.equal(f.count('records'),2);
});
test('Pack Pressure uses actual living local allies and caps the native modifier at two',t=>{
  const f=fixture(t),[odds]=f.odds();assert.equal(odds.modifier,2);assert.equal(odds.allies.length,3);assert.equal(odds.allies.every(a=>a.range==='Melee'),true);
  f.combatants[0].hp_current=0;f.combatants[1].status='removed';assert.equal(f.odds()[0].modifier,1);assert.equal(f.count('rolls'),2);
});
test('Pack Pressure rejects stale template and excludes proxies or separate zones',t=>{
  const f=fixture(t);f.setProxy(true);assert.equal(f.odds()[0].modifier,0);f.setProxy(false);f.presences.pc.data.zone='separate';assert.equal(f.odds()[0].modifier,0);
  f.template.changed=true;assert.throws(f.odds,/template_source_changed/);
});
test('actual defense/passive providers cold-import with existing native damage APIs',async()=>{
  const d=await import('../../src/native-feature-damage.js'),p=await import('../../src/native-feature-passives.js');assert.equal(typeof d.inspectAdversaryDamageDefense,'function');assert.equal(typeof p.nativeAttackPassives,'function');assert.equal(typeof p.nativeStandardDamage,'function');assert.equal(typeof p.nativeDamageBonusExpression,'function');
});
