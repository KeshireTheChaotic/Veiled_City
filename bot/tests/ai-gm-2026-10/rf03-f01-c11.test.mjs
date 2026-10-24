import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createEquippedAttackRules} from '../../src/frameworks/daggerheart/equipped-attack-rules.js';
import {createUnarmedAttackRules} from '../../src/frameworks/daggerheart/unarmed-attack-rules.js';
import {jsonHash as hash} from '../../src/kernel/json-hash.js';

function fixture(t,{equipped=false}={}){
  const dir=mkdtempSync(join(tmpdir(),'vc-attack-c11-')),file=join(dir,'attacks.sqlite');let sql=new DatabaseSync(file),control='ai_world',failRequest=false,approvalCount=1;
  t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});
  sql.exec('CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key)); CREATE TABLE events(key TEXT PRIMARY KEY,body TEXT); CREATE TABLE mutations(id INTEGER PRIMARY KEY,body TEXT);');
  const guild='guild-c11',session='session-c11',scene='scene-c11',pc={id:'pc-c11',owner_user_id:'owner-c11',data:{location:'tower-c11',traits:{Strength:2,Finesse:1},proficiency:2,inventory:equipped?[{name:'spear-c11',equipped:true}]:[],resources:{hope:3}}};
  const presence={status:'active',source_event:'pc-presence-c11',location_key:pc.data.location,data:{scene,state:'actually_present',zone:'same'}},npcPresence={...presence,source_event:'npc-presence-c11'},template={name:'NPC C11',difficulty:13},combatant={id:'combatant-c11',difficulty:13,hp_current:4,status:'active',stress_current:0};
  const db={getCityRecord(_g,kind,key){const r=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key??'');return r?JSON.parse(r.body):null;},saveCityRecord(_g,v){if(failRequest&&v.kind==='roll_request')throw Error('injected private request failure');const r={...v,record_key:v.key};sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(v.kind,v.key,JSON.stringify(r));return r;},getWorldEvent(_g,key){const r=sql.prepare('SELECT body FROM events WHERE key=?').get(key??'');return r?JSON.parse(r.body):null;},getCharacter(key){return key===pc.id?pc:null;},getRulesRuling(){return {rule:'current native spear mapping'};},rollModifierSources(){return [];},scopedRollAttackSources(){return Array.from({length:approvalCount},(_,i)=>this.getWorldEvent(guild,`approval-c11-${i}`));},getCityCalendar(){return {flags:{gm_discretion:true}};},recordMutation(_g,v){const r={actor_type:v.actorType,actor_id:v.actorId,source_layer:v.sourceLayer,mutation_type:v.mutationType,entity_key:v.entityKey,visibility:v.visibility,session_id:v.sessionId,after_json:JSON.stringify(v.after)};return {...r,id:Number(sql.prepare('INSERT INTO mutations(body) VALUES(?)').run(JSON.stringify(r)).lastInsertRowid)};},getMutation(_g,id){const r=sql.prepare('SELECT body FROM mutations WHERE id=?').get(id);return r?{...JSON.parse(r.body),id}:null;},transaction(fn){sql.exec('BEGIN IMMEDIATE');try{const v=fn();sql.exec('COMMIT');return v;}catch(e){sql.exec('ROLLBACK');throw e;}}};
  const event=(_d,_g,v)=>{const r={...v,event_key:v.key,status:v.status??'active',subject_key:v.subject_key??null};sql.prepare('INSERT OR REPLACE INTO events VALUES(?,?)').run(v.key,JSON.stringify(r));return r;};
  const originSource=event(db,guild,{key:'origin-c11',details:{camera:'tower'}}),origin={source:originSource.event_key,source_hash:hash(originSource.details),session,scene,location:pc.data.location},scope={mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  for(const key of [presence.source_event,npcPresence.source_event])event(db,guild,{key});
  const accepted=db.saveCityRecord(guild,{kind:'typed_intent',key:'accepted-c11',status:'accepted_for_adjudication',source_event:'declaration-c11',visibility:'character',subject_key:pc.id,data:{actor:pc.id,owner_user_id:pc.owner_user_id,actor_principal_revision:'principal-c11',scene,session_id:session,type:'interact',operation:equipped?'weapon_attack':'unarmed_attack',target_key:'npc-c11',framing:'immediate',source_hash:'declaration-hash-c11',source_span:'I attack the blocking NPC.',start:0,end:25}});
  const approval=i=>event(db,guild,{key:`approval-c11-${i}`,kind:'roll_adjudication',source_kind:'gm',visibility:'character',subject_key:pc.id,scene,session_id:session,details:{human_reviewed:true,roll_attack:{ruling_key:'ruling-c11',weapon:'spear-c11',trait:'Strength',active:true,target_id:combatant.id,damage:'2d6',damage_type:'physical'}}});approval(0);approval(1);
  const caps={inspectArbitrationOrigin:()=>({binding:origin,scope,eligible:[{key:'npc-c11'}]}),consentAction:()=>({row:db.getCityRecord(guild,'typed_intent',accepted.record_key)}),historicalActionSource:()=>({row:db.getCityRecord(guild,'typed_intent',accepted.record_key)}),nativeEncounterActor:()=>({combatant:structuredClone(combatant),presence:npcPresence,template:structuredClone(template),encounter:'encounter-c11',binding:'binding-c11',entity:{location_key:pc.data.location}}),nativeActorControl:()=>({owner_control_type:control}),scenePresence:()=>presence,sceneAccess:()=>true,narrativeSourceVisible:()=>true,indexWorldEvent:event,isPvpIntent:()=>false,assertNonPvpCombatant:()=>{},adjudicateAcceptedIntent:(_d,_g,input,_issuer,options)=>{
    const key='request-c11',prior=db.getCityRecord(guild,'roll_request',key);if(prior)return {roll_request_ref:key};
    db.saveCityRecord(guild,{kind:'roll_request',key,status:'pending',visibility:'character',subject_key:pc.id,source_event:accepted.source_event,data:{kind:'attack',input:{accepted_intent:accepted.record_key,character_id:pc.id,source_event:accepted.source_event,kind:'attack',trait:input.trait,attack_source:input.attackSource,private_result:true,...(options.nativeEquippedRef?{native_equipped_ref:options.nativeEquippedRef}:{})}}});return {roll_request_ref:key};
  }};
  const rules=equipped?createEquippedAttackRules({capabilities:caps}):createUnarmedAttackRules({capabilities:caps}),entry={intent_ref:accepted.record_key,actor:{type:'character',key:pc.id},source_ref:accepted.source_event,source_hash:accepted.data.source_hash,target_refs:['npc-c11']},proposal={disposition:'request_pc_action_roll',stakes_kind:'native_attack',feature_ref:equipped?'equipped_attack':'unarmed_attack',experience_ref:'',advantage:false,disadvantage:false,rule_basis_refs:['srd:attack-rolls'],difficulty:null,trait:'Strength',stakes:'The attack may miss.',difficulty_reason:'The native local NPC determines Difficulty.'};
  const prepare=()=>rules[equipped?'prepareNativeEquippedAttack':'prepareNativeUnarmedAttack'](db,guild,'sealed-c11',entry,proposal),inspect=(options={})=>rules[equipped?'inspectNativeEquippedAttack':'inspectNativeUnarmedAttack'](db,guild,db.getCityRecord(guild,'roll_request','request-c11').data.input,pc,options);
  return {db,guild,pc,presence,npcPresence,combatant,accepted,proposal,origin,rules,prepare,inspect,event,setControl:v=>control=v,setFailure:v=>failRequest=v,setApprovalCount:v=>approvalCount=v,count:table=>Number(sql.prepare(`SELECT count(*) n FROM ${table}`).get().n),reopen(){sql.close();sql=new DatabaseSync(file);}};
}
test('unarmed preparation uses exact native NPC Difficulty and Proficiency d4 without owner dice',t=>{
  const f=fixture(t);f.prepare();const proof=f.inspect();assert.equal(proof.attack.damage,'2d4');assert.equal(proof.attack.difficulty,13);assert.equal(f.pc.data.resources.hope,3);
  const request=f.db.getCityRecord(f.guild,'roll_request','request-c11');assert.equal(request.status,'pending');assert.equal(request.visibility,'character');assert.equal(request.data.input.private_result,true);
  const mutations=f.count('mutations');f.reopen();f.prepare();assert.equal(f.count('mutations'),mutations);assert.equal(f.inspect().attack.damage,'2d4');
});
test('unarmed current use rejects changed target while historical reader preserves committed source',t=>{
  const f=fixture(t);f.prepare();f.combatant.difficulty=17;assert.throws(()=>f.inspect(),/melee_target_or_audience|current_target_or_rules/);assert.equal(f.inspect({historical:true}).attack.difficulty,13);
});
test('unarmed source and player/proxy target cannot be relabeled into native NPC attack',t=>{
  const f=fixture(t);f.setControl('proxy');assert.throws(f.prepare,/unproxied_npc_target_only/);f.setControl('ai_world');f.prepare();
  f.event(null,null,{key:f.origin.source,status:'revoked',details:{camera:'tower'}});assert.throws(()=>f.inspect({historical:true}),/origin_source_revoked/);
});
test('failed private native request rolls unarmed source and mutation preparation back',t=>{
  const f=fixture(t),before=f.count('events');f.setFailure(true);assert.throws(f.prepare,/injected private request/);assert.equal(f.count('mutations'),0);assert.equal(f.count('events'),before);
});
test('equipped preparation requires the existing owned weapon and exact human-approved attack source',t=>{
  const f=fixture(t,{equipped:true});f.prepare();const proof=f.inspect();assert.equal(proof.attack.weapon,'spear-c11');assert.equal(proof.attack.damage,'2d6');assert.equal(proof.attack.target_id,'combatant-c11');assert.equal(f.pc.data.resources.hope,3);
  f.reopen();assert.equal(f.inspect().attack.difficulty,13);
});
test('missing or ambiguous equipped approval cannot invent equipment, rule or attack mapping',t=>{
  const f=fixture(t,{equipped:true});f.setApprovalCount(0);assert.throws(f.prepare,/unique_existing_approval/);f.setApprovalCount(2);assert.throws(f.prepare,/unique_existing_approval/);f.setApprovalCount(1);f.pc.data.inventory=[];assert.throws(f.prepare,/unique_existing_approval/);assert.equal(f.count('mutations'),0);
});
test('equipped current placement changes fail while saved approved attack ancestry remains readable',t=>{
  const f=fixture(t,{equipped:true});f.prepare();f.presence.data.zone='elsewhere';assert.throws(()=>f.inspect(),/local_target_required|placement_or_template/);assert.equal(f.inspect({historical:true}).attack.weapon,'spear-c11');
});
test('actual attack providers cold-import and expose only the same preparation/proof APIs',async()=>{
  const e=await import('../../src/native-equipped-attacks.js'),u=await import('../../src/native-unarmed-attacks.js');assert.deepEqual(Object.keys(e).sort(),['inspectNativeEquippedAttack','prepareNativeEquippedAttack']);assert.deepEqual(Object.keys(u).sort(),['inspectNativeUnarmedAttack','prepareNativeUnarmedAttack']);
});
