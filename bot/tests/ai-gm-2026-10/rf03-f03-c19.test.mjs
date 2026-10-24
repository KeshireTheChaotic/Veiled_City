import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPvpDamageRules} from '../../src/frameworks/daggerheart/pvp-damage-rules.js';
import {jsonHash as hash} from '../../src/kernel/json-hash.js';

function fixture(t,{critical=true,direct=false,campaign=false,hp=0}={}){
  const dir=mkdtempSync(join(tmpdir(),'vc-pvp-damage-c19-')),file=join(dir,'damage.sqlite');let sql=new DatabaseSync(file),consented=true,failEffect=false,notices=0;
  t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});
  sql.exec('CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key)); CREATE TABLE characters(id TEXT PRIMARY KEY,body TEXT); CREATE TABLE events(key TEXT PRIMARY KEY,body TEXT); CREATE TABLE auth(key TEXT PRIMARY KEY,user TEXT); CREATE TABLE mutations(id INTEGER PRIMARY KEY,body TEXT); CREATE TABLE rolls(id INTEGER PRIMARY KEY,body TEXT);');
  const guild='guild-c19',session='session-c19',scene='scene-c19';
  const db={
    getCityRecord(_g,kind,key){const r=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key??'');return r?JSON.parse(r.body):null;},saveCityRecord(_g,v){if(failEffect&&v.kind==='pc_effect_receipt')throw Error('injected effect receipt failure');const r={...v,record_key:v.key};sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(v.kind,v.key,JSON.stringify(r));return r;},
    listCityRecords(_g,{kind}){return sql.prepare('SELECT body FROM records WHERE kind=?').all(kind).map(r=>JSON.parse(r.body));},
    getCharacter(id){const r=sql.prepare('SELECT body FROM characters WHERE id=?').get(id);return r?JSON.parse(r.body):null;},updateCharacterData(id,fn){const pc=this.getCharacter(id);fn(pc.data);sql.prepare('UPDATE characters SET body=? WHERE id=?').run(JSON.stringify(pc),id);return pc;},
    getWorldEvent(_g,key){const r=sql.prepare('SELECT body FROM events WHERE key=?').get(key??'');return r?JSON.parse(r.body):null;},ownerAuthoredSource(_g,key,user){return sql.prepare('SELECT user FROM auth WHERE key=?').get(key)?.user===user;},
    recordMutation(_g,v){const r={actor_type:v.actorType,actor_id:v.actorId,source_layer:v.sourceLayer,mutation_type:v.mutationType,entity_key:v.entityKey,visibility:v.visibility,session_id:v.sessionId,before_json:JSON.stringify(v.before),after_json:JSON.stringify(v.after)};return {...r,id:Number(sql.prepare('INSERT INTO mutations(body) VALUES(?)').run(JSON.stringify(r)).lastInsertRowid)};},getMutation(_g,id){const r=sql.prepare('SELECT body FROM mutations WHERE id=?').get(id);return r?{...JSON.parse(r.body),id}:null;},
    getRulesRuling(){return {created_by:'gm-c19'};},addRoll(_g,s,user,character,roll_type,payload){return Number(sql.prepare('INSERT INTO rolls(body) VALUES(?)').run(JSON.stringify({session_id:s,discord_user_id:user,character_id:character,roll_type,payload})).lastInsertRowid);},getSavedRoll(_g,id){const r=sql.prepare('SELECT body FROM rolls WHERE id=?').get(id);return r?{id,...JSON.parse(r.body)}:null;},
    transaction(fn){sql.exec('BEGIN IMMEDIATE');try{const v=fn();sql.exec('COMMIT');return v;}catch(e){sql.exec('ROLLBACK');throw e;}}
  };
  const save=(kind,key,data,status='resolved',extra={})=>db.saveCityRecord(guild,{kind,key,status,data,...extra}),event=(_d,_g,v,user)=>{const r={...v,event_key:v.key,status:'active'};sql.prepare('INSERT OR REPLACE INTO events VALUES(?,?)').run(v.key,JSON.stringify(r));if(user)sql.prepare('INSERT OR REPLACE INTO auth VALUES(?,?)').run(v.key,user);return r;};
  const actor={id:'attacker-c19',guild_id:guild,owner_user_id:'owner-a-c19',data:{inventory:[{name:'knife-c19',equipped:true,direct_damage:direct}],resources:{hope:3}}},target={id:'defender-c19',guild_id:guild,owner_user_id:'owner-b-c19',data:{inventory:[],domain_cards:[],conditions:[],resources:{hp:{current:hp,max:6},armor:{current:0,max:3},hope:3},thresholds:{major:7,severe:14}}};
  for(const pc of [actor,target])sql.prepare('INSERT INTO characters VALUES(?,?)').run(pc.id,JSON.stringify(pc));
  const offer={actor:actor.id,target:target.id,session,scene,contract:'contract-c19',terms_hash:'terms-c19',snapshot:{actor_owner:actor.owner_user_id,actor:hash(actor.data),target_principal:'principal-b-c19'},input:{kind:'weapon',weapon:'knife-c19',attack:'staged-c19'},damage:'1d8+2',damage_type:'physical',...(campaign?{native_rule_basis:{kind:'native_campaign'}}:{})};
  const attack=save('pvp_attack_roll_receipt','attack-c19',{result:{hit:true,duality:critical?'Critical':'Hope'},roll_id:'attack-roll-c19'},'resolved',{source_event:'attack-source-c19'});
  const request=save('pvp_attack_request','request-c19',{offer,roll:attack.record_key},'awaiting_damage',{source_event:attack.source_event});
  save('pvp_attack_intent','staged-c19',{accepted_intent:'action-c19'});save('typed_intent','action-c19',{actor:actor.id},'accepted_for_adjudication',{source_event:attack.source_event});event(null,null,{key:attack.source_event,session_id:session,scene});
  const contract={record_key:'contract-c19',data:{version:campaign?4:3}},validateAttack=()=>({offer,contract,receipt:attack,request:db.getCityRecord(guild,'pvp_attack_request',request.record_key)});
  const rules=createPvpDamageRules({capabilities:{validatePvpAttackRoll:validateAttack,campaignAttackActorHash:pc=>hash(pc.data),validateDamagePvp:()=>{if(!consented)throw Object.assign(Error('withdrawn consent'),{code:'NARRATIVE_PVP'});return contract;},personalCharacter:(_d,_g,user,id)=>{const pc=db.getCharacter(id);if(pc?.owner_user_id!==user)throw Error('wrong owner');return pc;},indexWorldEvent:event,pendingPvpFear:()=>[],buildActionPlan:()=>{},transitionAction:()=>{},completeBlazeAction:()=>{},validatePcDeathOutcome:()=>({status:'resolved'}),assertPcAttackable:()=>true,assertBrawlDamageSources:()=>true,releaseBrawlLocks:()=>{},pvpWindowDamageSources:()=>[`${attack.record_key}:damage`],drainActionContinuations:()=>{},assertPvpSafety:()=>true,reserveCampaignDamageNotice:()=>{notices++;}}});
  const roll=(rng=()=>8)=>rules.rollPvpDamage(db,guild,actor.owner_user_id,{attack_receipt:attack.record_key},{rng});
  function prepare(){const damage=roll();return campaign?db.getCityRecord(guild,'pvp_damage_offer',db.getCityRecord(guild,'pvp_damage_group_member',damage.record_key).data.group):rules.preparePvpDamage(db,guild,'gm-c19',{damage_receipts:[damage.record_key],ruling:'ruling-c19',defenses:{source:'base',resistance:'none',armor_reduction:1,armor_allowed:true}},{gm:true,interactionId:'gm-review-c19'});}
  const review=group=>rules.reviewPvpDamage(db,guild,target.owner_user_id,group.record_key),resolve=(group,armor=true)=>rules.resolvePvpDamage(db,guild,target.owner_user_id,{damage:group.record_key,expected_revision:group.data.digest,armor},{interactionId:'armor-choice-c19'});
  return {db,guild,actor,target,request,attack,contract,rules,save,event,roll,prepare,review,resolve,setConsent:v=>consented=v,setFailure:v=>failEffect=v,notices:()=>notices,countRolls:()=>Number(sql.prepare('SELECT count(*) n FROM rolls').get().n),reopen(){sql.close();sql=new DatabaseSync(file);}};
}
test('native Critical damage is separate, saved once, and target alone reviews and chooses Armor',t=>{
  const f=fixture(t),group=f.prepare();assert.equal(f.db.getCharacter(f.target.id).data.resources.hp.current,0);assert.equal(f.countRolls(),1);
  const review=f.review(group);assert.equal(review.damage,18);assert.equal(review.severity,3);
  const effect=f.resolve(group);assert.equal(effect.data.hp_marks,2);assert.equal(effect.data.after.hp.current,2);assert.equal(effect.data.after.armor.current,1);assert.equal(effect.visibility,'character');assert.equal(effect.subject_key,f.target.id);
  f.reopen();assert.deepEqual(f.resolve(group),effect);assert.equal(f.countRolls(),1);assert.equal(f.db.getCharacter(f.target.id).data.resources.hp.current,2);
  assert.throws(()=>f.resolve(group,false),/replay differs/);
});
test('saved native damage replay does not reroll and corrupted arithmetic cannot pass proof',t=>{
  const f=fixture(t);let dice=0;const first=f.roll(()=>{dice++;return 6;});f.reopen();assert.deepEqual(f.roll(()=>{throw Error('must not reroll');}),first);assert.equal(dice,1);
  f.db.saveCityRecord(f.guild,{...first,data:{...first.data,result:{...first.data.result,total:99}}});assert.throws(()=>f.rules.validatePvpDamageRoll(f.db,f.guild,first.record_key),/Critical arithmetic/);
});
test('withdrawn source consent prevents new dice and foreign owner cannot choose defenses',t=>{
  const f=fixture(t);f.setConsent(false);assert.throws(f.roll,/withdrawn consent/);assert.equal(f.countRolls(),0);f.setConsent(true);const group=f.prepare();
  assert.throws(()=>f.rules.reviewPvpDamage(f.db,f.guild,f.actor.owner_user_id,group.record_key),/affected owner/);
  assert.throws(()=>f.rules.resolvePvpDamage(f.db,f.guild,f.actor.owner_user_id,{damage:group.record_key,expected_revision:group.data.digest,armor:true},{interactionId:'foreign-c19'}),/affected owner/);
  assert.equal(f.db.getCharacter(f.target.id).data.resources.armor.current,0);
});
test('injected effect receipt failure restores HP, Armor, choice source, authority and damage state',t=>{
  const f=fixture(t),group=f.prepare();f.review(group);f.setFailure(true);assert.throws(()=>f.resolve(group),/injected effect receipt failure/);
  assert.equal(f.db.getCharacter(f.target.id).data.resources.hp.current,0);assert.equal(f.db.getCharacter(f.target.id).data.resources.armor.current,0);
  assert.equal(f.db.getWorldEvent(f.guild,`${group.record_key}:armor`),null);assert.equal(f.db.getCityRecord(f.guild,'pc_effect_authority',`${group.record_key}:authority`),null);assert.equal(f.db.getCityRecord(f.guild,'pvp_damage_offer',group.record_key).status,'awaiting_owner');
});
test('direct damage cannot spend Armor and review is required before any HP commitment',t=>{
  const f=fixture(t,{direct:true}),group=f.prepare();assert.throws(()=>f.resolve(group,false),/Privately review/);f.review(group);assert.throws(()=>f.resolve(group,true),/direct\/no damage/);
  const effect=f.resolve(group,false);assert.equal(effect.data.hp_marks,3);assert.equal(effect.data.after.armor.current,0);
});
test('stale target compare-and-set fails and native campaign owner refresh preserves all saved dice',t=>{
  const f=fixture(t,{campaign:true}),old=f.prepare();f.db.updateCharacterData(f.target.id,data=>{data.resources.hope=2;});assert.throws(()=>f.review(old),/compare-and-set is stale/);
  assert.throws(()=>f.rules.refreshCampaignPvpDamage(f.db,f.guild,f.actor.owner_user_id,{damage:old.record_key},{interactionId:'foreign-refresh'}),/affected owner/);
  const fresh=f.rules.refreshCampaignPvpDamage(f.db,f.guild,f.target.owner_user_id,{damage:old.record_key},{interactionId:'refresh-c19'});assert.equal(fresh.status,'awaiting_owner');assert.equal(f.db.getCityRecord(f.guild,'pvp_damage_offer',old.record_key).status,'superseded');assert.equal(f.countRolls(),1);
  f.reopen();assert.deepEqual(f.rules.refreshCampaignPvpDamage(f.db,f.guild,f.target.owner_user_id,{damage:old.record_key},{interactionId:'refresh-c19'}),fresh);f.review(fresh);assert.equal(f.resolve(fresh).data.hp_marks,2);assert.equal(f.countRolls(),1);
});
test('final HP creates an owner-private death choice and keeps the dependent action unterminated',t=>{
  const f=fixture(t,{hp:4}),group=f.prepare();f.review(group);const effect=f.resolve(group,false);assert.equal(effect.data.after.hp.current,6);
  const death=f.db.getCityRecord(f.guild,'pc_death_move_request',`${group.record_key}:death`);assert.equal(death.status,'awaiting_owner');assert.equal(death.subject_key,f.target.id);
  assert.equal(f.rules.settlePvpDamageAction(f.db,f.guild,f.request.record_key).status,'death_move_pending');assert.equal(f.db.getCityRecord(f.guild,'pvp_action_terminal_receipt',`${f.request.record_key}:terminal`),null);
});
test('immutable grouping and exact owner status do not grant an outcome or disclose to attacker',t=>{
  const f=fixture(t,{campaign:true}),group=f.prepare();const status=f.rules.pvpDamageOwnerStatus(f.db,f.guild,f.target.owner_user_id,group.record_key);assert.equal(status.status,'awaiting_owner');assert.equal(status.native_campaign,true);
  assert.throws(()=>f.rules.pvpDamageOwnerStatus(f.db,f.guild,f.actor.owner_user_id,group.record_key),/affected current owner/);assert.equal(f.db.getCharacter(f.target.id).data.resources.hp.current,0);
});
test('actual PvP damage provider keeps all native lifecycle entry points',async()=>{
  const p=await import('../../src/pvp-damage.js');for(const name of ['rollPvpDamage','validatePvpDamageRoll','preparePvpDamage','prepareCampaignPvpDamage','refreshCampaignPvpDamage','pvpDamageOwnerStatus','reviewPvpDamage','resolvePvpDamage','validatePvpDamageApplication','settlePvpDamageAction'])assert.equal(typeof p[name],'function');
});
