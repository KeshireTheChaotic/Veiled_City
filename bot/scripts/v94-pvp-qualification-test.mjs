/** B.7 production adapters; temporary four-owner fixtures, denied networking, real native receipts. */
import test from "node:test";
import assert from "node:assert/strict";
import {nativeFixture,pvpTerms} from "./v9-fixtures.mjs";
import crypto from "node:crypto";
import {syncBuiltinESMExports} from "node:module";
import {fakeInteraction} from "./contract-fixtures.mjs";
import {handleCommand} from "../src/commands.js";
import {progressPvp} from "../src/narrative-pvp.js";
import {captureWorldInput} from "../src/autonomous-world.js";
import {commitGmTurn} from "../src/turn-orchestration.js";
import {deliverTurnOutbox} from "../src/publication-outbox.js";
import {attackFixture} from "./v94-pvp-attack-fixtures.mjs";
import {preparePvpAttack,reviewPvpAttack,authorizePvpAttack,rollPvpAttack} from "../src/pvp-attacks.js";
import {rollPvpDamage,preparePvpDamage,reviewPvpDamage,resolvePvpDamage} from "../src/pvp-damage.js";
import {prepareIncomingAttack,reviewIncomingAttack,confirmIncomingDefense,rollIncomingAttack,resolveIncomingDamage} from "../src/pc-incoming.js";
import {establishFearContext,selectFearMove,applyFearMove,fearRevision,validateFearEffect,renderFearEffect,resumeAutonomousPvpFear} from "../src/pvp-fear-moves.js";
import {configureCityFlags} from "../src/city-core.js";
import {materializeNativeNotices} from "../src/native-publications.js";
import {EncounterLibrary} from "../src/encounter.js";
import {buildCombatants} from "../src/combat.js";
import {indexWorldEvent} from "../src/city-calendar.js";
import {currentScene,recordScenePresence} from "../src/scene-continuity.js";
import {setPvpSafetyStop} from '../src/pvp-campaign-policy.js';

const defenses={resistance:"none",armor_reduction:1,armor_allowed:true,source:"base"};
async function attackFear(f){
  const x=await attackFixture(f),r=preparePvpAttack(f.db,f.guild,"gm",x.input,{gm:true,interactionId:"qualification-attack"});
  for(const pc of f.pcs.slice(0,2)){reviewPvpAttack(f.db,f.guild,pc.owner_user_id,r.record_key);
    authorizePvpAttack(f.db,f.guild,pc.owner_user_id,{attack:r.record_key,expected_revision:r.data.offer_hash},{interactionId:`qualification-sign:${pc.id}`});}
  let n=0;const roll=rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:r.record_key,expected_revision:r.data.offer_hash},{rng:()=>[3,6][n++]});
  const damage=rollPvpDamage(f.db,f.guild,f.pcs[0].owner_user_id,{attack_receipt:roll.record_key},{rng:()=>1});
  const offer=preparePvpDamage(f.db,f.guild,"gm",{damage_receipts:[damage.record_key],ruling:"pc-attack",defenses},{gm:true,interactionId:"qualification-damage"});
  const v=reviewPvpDamage(f.db,f.guild,f.pcs[1].owner_user_id,offer.record_key);
  resolvePvpDamage(f.db,f.guild,f.pcs[1].owner_user_id,{damage:offer.record_key,expected_revision:v.revision,armor:false},{interactionId:"qualification-armor"});
  return {...x,request:r,roll,trigger:f.db.listCityRecords(f.guild,{kind:"pvp_fear_trigger",includeGM:true})[0]};
}
function incoming(f,t,{source=t.source_event}={}){
  const pc=f.pcs[1],library=new EncounterLibrary("../content"),scene=currentScene(f.db,f.guild);
  f.db.upsertNpcProfile(f.guild,{npcKey:"guard",displayName:"Guard"});f.db.setSimulationEntity(f.guild,"npc","guard",{location_key:"terminal"});
  const s=indexWorldEvent(f.db,f.guild,{key:"qualification-guard",kind:"observation",title:"Established guard in the terminal",
    source_id:"gm:gm",session_id:f.session.id,scene:scene.key,location_key:"terminal",visibility:"party"},"gm");
  recordScenePresence(f.db,f.guild,{source_event:s.event_key,entity_type:"npc",entity_key:"guard",location_key:"terminal",zone:"floor",range:"Melee",visibility:"party"},"gm");
  const e=f.db.createEncounter(f.guild,f.session.id,{status:"active",tier:1,pc_count:4,base_bp:14,budget_bp:14,composition:[{name:"Aster Vale Contractor",quantity:1}]});
  const c=f.db.initializeCombatants(e.id,buildCombatants(e,library))[0];
  f.db.saveCityRecord(f.guild,{kind:"encounter_binding",key:e.id,source_event:s.event_key,data:{combatants:[{actor:"guard",id:c.id}]}});
  f.db.upsertRulesRuling(f.guild,{key:"qualification-guard",createdBy:"gm",ruling:"Established hostile guard makes its current standard attack against the present target. Base defenses reviewed; no optional attack/defense modifier."});
  const a=prepareIncomingAttack(f.db,f.guild,"gm",{npc:"guard",combatant:c.id,character:pc.id,source,ruling:"qualification-guard",defenses},
    {gm:true,interactionId:"qualification-incoming",library});return {a,pc,library};
}
function context(f,a){return establishFearContext(f.db,f.guild,"gm",{move_kind:"npc_attack",target_key:a.record_key,location_key:"terminal",
  visibility:"character",subject_key:f.pcs[1].id},{gm:true,interactionId:`qualification-context:${a.record_key}`});}
const target=a=>({key:a.record_key,source_event:a.source_event,offer:a.data.offer});
function select(f,t,c,a){return selectFearMove(f.db,f.guild,"gm",{trigger:t.record_key,expected_revision:t.data.revision,context:c.record_key,
  expected_target_revision:fearRevision(target(a)),affected_actions:[]},{gm:true,interactionId:"qualification-fear-select"});}

for(const boundary of ['before_npc_roll','before_npc_hp'])test(`W5 owner stop blocks unfinished PvP Fear attack ${boundary}, preserving the original outcome`,()=>nativeFixture(async f=>{
  const x=await attackFear(f),{a,pc,library}=incoming(f,x.trigger);context(f,a);
  configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},'synthetic-test');
  let calls=0;const rng=()=>++calls===1?15:8,run=()=>resumeAutonomousPvpFear(f.db,f.guild,{library,rng});
  assert.equal(run()[0].status,'awaiting_owner');
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library});confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  if(boundary==='before_npc_hp'){assert.equal(run()[0].status,'awaiting_owner');assert.equal(calls,2);}
  const before=f.db.getCharacter(pc.id).data.resources,saved=f.db.getCityRecord(f.guild,'pvp_attack_roll_receipt',x.roll.record_key),priorCalls=calls;
  setPvpSafetyStop(f.db,f.guild,pc.owner_user_id,{character_id:pc.id},{interactionId:`stop-${boundary}`});
  if(boundary==='before_npc_hp')assert.throws(()=>resolveIncomingDamage(f.db,f.guild,pc.owner_user_id,a.record_key,{armor:true,library}),/safety stop/i);
  else {const held=run()[0];assert.equal(held.status,'needs_review');assert.match(held.reason,/safety stop/i);}
  assert.equal(calls,priorCalls,'no extra NPC dice after the owner stop');
  assert.deepEqual(f.db.getCharacter(pc.id).data.resources,before,'neither HP nor Armor changes after the stop');
  assert.deepEqual(f.db.getCityRecord(f.guild,'pvp_attack_roll_receipt',x.roll.record_key),saved);
  assert.notEqual(f.db.getCityRecord(f.guild,'pvp_fear_trigger',x.trigger.record_key).status,'resolved','Fear remains unresolved, not waived');
  f.restart();assert.deepEqual(f.db.getCharacter(pc.id).data.resources,before);
}));

test("FEA05 trusted autonomous selector resumes an exact native NPC offer through owner defense and Armor",()=>nativeFixture(async f=>{
  const x=await attackFear(f),{a,pc,library}=incoming(f,x.trigger),c=context(f,a),savedRoll=structuredClone(x.roll),before=f.db.getCharacter(pc.id).data.resources;
  configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  let diceCalls=0;const rng=()=>{diceCalls++;return diceCalls===1?15:8;};
  const run=()=>resumeAutonomousPvpFear(f.db,f.guild,{library,rng});
  assert.equal(run()[0].status,"awaiting_owner");assert.equal(diceCalls,0);
  const trigger=f.db.getCityRecord(f.guild,"pvp_fear_trigger",x.trigger.record_key),decision=f.db.getCityRecord(f.guild,"pvp_fear_move_decision",trigger.data.decision);
  assert.equal(trigger.status,"move_selected");assert.equal(decision.data.authority,"autonomous_v1");assert.equal(decision.data.context,c.record_key);
  assert.equal(f.db.getWorldEvent(f.guild,decision.source_event).source_id,"native:autonomous_pvp_fear");
  assert.throws(()=>confirmIncomingDefense(f.db,f.guild,f.pcs[2].owner_user_id,a.record_key));
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library});confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  assert.equal(run()[0].status,"awaiting_owner");assert.equal(diceCalls,2);
  assert.deepEqual(f.db.getCharacter(pc.id).data.resources,before);assert.equal(f.db.getCityRecord(f.guild,"pc_incoming_attack",a.record_key).status,"awaiting_armor");
  f.restart();assert.equal(run()[0].status,"awaiting_owner");assert.equal(diceCalls,2);
  const damage=resolveIncomingDamage(f.db,f.guild,pc.owner_user_id,a.record_key,{armor:true,library}),effect=run()[0];
  assert.equal(effect.data.incoming_effect_ref,damage.record_key);assert.equal(effect.data.incoming_attack_ref,a.record_key);
  assert.equal(effect.data.authority,"autonomous_v1");assert.equal(damage.data.hp_marks,1);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,before.hp.current+1);
  assert.equal(f.db.getCharacter(pc.id).data.resources.armor.current,before.armor.current+1);
  assert.deepEqual(f.db.getCityRecord(f.guild,"pvp_attack_roll_receipt",savedRoll.record_key),savedRoll);
  assert.equal(f.db.getCampaign(f.guild).fear,0);assert.equal(f.db.getCharacter(pc.id).data.resources.hope,before.hope);
  assert.deepEqual(run(),[]);assert.equal(diceCalls,2);validateFearEffect(f.db,f.guild,effect.record_key);
  const notice=f.db.listCityRecords(f.guild,{kind:"pvp_fear_publication",includeGM:true})[0];
  assert.equal(notice.data.user,pc.owner_user_id,"The NPC's defender, not the triggering roller, owns the private incoming result.");
  materializeNativeNotices(f.db,f.guild);const ready=f.db.getCityRecord(f.guild,"pvp_fear_publication",notice.record_key);
  assert.equal(ready.status,"pending");const sent=[];
  await deliverTurnOutbox(f.db,f.guild,ready.data.turn_id,async row=>{sent.push(row);return {messageId:"native-defender",channelId:`dm-${pc.owner_user_id}`};});
  assert(sent.length>0);assert(sent.every(row=>row.target_user_id===pc.owner_user_id&&row.visibility==="character"));
}));

test("PVE03/PVE07 actual NPC Fear attack remains pending through private defense and Armor, then settles once without repeating PC damage",()=>nativeFixture(async f=>{
  const x=await attackFear(f),{a,pc,library}=incoming(f,x.trigger),c=context(f,a),decision=select(f,x.trigger,c,a);
  const apply=()=>applyFearMove(f.db,f.guild,"gm",{trigger:x.trigger.record_key,expected_revision:x.trigger.data.revision+1,decision:decision.record_key},{gm:true});
  assert.throws(apply,e=>e.code==="NATIVE_EFFECT_PENDING");
  assert.equal(f.db.getCityRecord(f.guild,"pvp_fear_trigger",x.trigger.record_key).status,"move_selected");
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library});confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  let n=0;const r=rollIncomingAttack(f.db,f.guild,"gm",a.record_key,{gm:true,library,rng:()=>[15,8][n++]});assert.equal(r.data.evasion,12);
  assert.throws(apply,e=>e.code==="NATIVE_EFFECT_PENDING");
  const native=resolveIncomingDamage(f.db,f.guild,pc.owner_user_id,a.record_key,{armor:true,library});assert.equal(native.data.hp_marks,1);
  const effect=apply();assert.equal(effect.data.incoming_effect_ref,native.record_key);assert.equal(effect.visibility,"character");
  f.restart();assert.deepEqual(apply(),effect);validateFearEffect(f.db,f.guild,effect.record_key);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,2);assert.equal(f.db.getCharacter(pc.id).data.resources.armor.current,1);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hope,2);assert.equal(f.db.getCampaign(f.guild).fear,0);
  assert.equal(f.db.getCityRecord(f.guild,"pvp_attack_request",x.request.record_key).status,"resolved");
  assert.throws(()=>renderFearEffect(f.db,f.guild,effect.record_key,{mode:"party"}),/audience/i);
  assert.match(renderFearEffect(f.db,f.guild,effect.record_key,{mode:"private",actorCharacterId:pc.id}),/native|attack/i);
}));

test("PVE07 an NPC offer from unrelated source cannot discharge PvP Fear",()=>nativeFixture(async f=>{
  const x=await attackFear(f),{a}=incoming(f,x.trigger,{source:"attack-scene"}),c=context(f,a);
  assert.throws(()=>select(f,x.trigger,c,a),/source|trigger|Fear/i);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_fear_effect_receipt",includeGM:true}).length,0);
}));

test("PVE07 PvP source cannot roll a second/native NPC attack before the exact contextual GM selection",()=>nativeFixture(async f=>{
  const x=await attackFear(f),{a,pc,library}=incoming(f,x.trigger);
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library});confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);let n=0;
  assert.throws(()=>rollIncomingAttack(f.db,f.guild,"gm",a.record_key,{gm:true,library,rng:sides=>{n++;return sides===20?15:1;}}),/Fear|selection|context/i);
  assert.equal(n,0);assert.equal(f.db.listCityRecords(f.guild,{kind:"npc_attack_roll_receipt",includeGM:true}).length,0);
}));

test("PVE07 native NPC miss completes the immediate attempted attack, never creates HP or a fake damage receipt",()=>nativeFixture(async f=>{
  const x=await attackFear(f),{a,pc,library}=incoming(f,x.trigger),c=context(f,a),d=select(f,x.trigger,c,a);
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library});confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  const r=rollIncomingAttack(f.db,f.guild,"gm",a.record_key,{gm:true,library,rng:()=>1});assert.equal(r.data.hit,false);
  const e=applyFearMove(f.db,f.guild,"gm",{trigger:x.trigger.record_key,expected_revision:x.trigger.data.revision+1,decision:d.record_key},{gm:true});
  assert.equal(e.data.incoming_effect_ref,null);assert.equal(e.data.incoming_roll_ref,r.record_key);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,1);validateFearEffect(f.db,f.guild,e.record_key);
}));

test("PVE07 a previously executed independent NPC attack cannot be adopted as the later Fear move",()=>nativeFixture(async f=>{
  const x=await attackFear(f),{a,pc,library}=incoming(f,x.trigger,{source:"attack-scene"});
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library});confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  rollIncomingAttack(f.db,f.guild,"gm",a.record_key,{gm:true,library,rng:()=>1});const c=context(f,a);
  assert.throws(()=>select(f,x.trigger,c,a),/fresh|source|Fear|old/i);
  assert.equal(f.db.getCityRecord(f.guild,"pvp_fear_trigger",x.trigger.record_key).data.effect,undefined);
}));

test("PVE11 native Fear attack source revoked between selection and dice rejects before RNG, never leaks an effect",()=>nativeFixture(async f=>{
  const x=await attackFear(f),{a,pc,library}=incoming(f,x.trigger),c=context(f,a);select(f,x.trigger,c,a);
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library});confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  indexWorldEvent(f.db,f.guild,{key:c.source_event,status:"retracted"},"gm");let n=0;
  assert.throws(()=>rollIncomingAttack(f.db,f.guild,"gm",a.record_key,{gm:true,library,rng:()=>{n++;return 1;}}),/context|source|GM/i);
  assert.equal(n,0);assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,1);
}));

test("PVE11 selected NPC Fear context revoked after dice cannot authorize a new target HP effect",()=>nativeFixture(async f=>{
  const x=await attackFear(f),{a,pc,library}=incoming(f,x.trigger),c=context(f,a);select(f,x.trigger,c,a);
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library});confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  let n=0;rollIncomingAttack(f.db,f.guild,"gm",a.record_key,{gm:true,library,rng:()=>[15,8][n++]});
  indexWorldEvent(f.db,f.guild,{key:c.source_event,status:"retracted"},"gm");
  assert.throws(()=>resolveIncomingDamage(f.db,f.guild,pc.owner_user_id,a.record_key,{armor:false,library}),/source|context|GM/i);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,1);
  assert.equal(f.db.getCityRecord(f.guild,"pc_effect_receipt",`${a.record_key}:damage`),null);
}));

test("PVE07 native attack effect committed before a Fear receipt write failure remains once, with the same selected retry",()=>nativeFixture(async f=>{
  const x=await attackFear(f),{a,pc,library}=incoming(f,x.trigger),c=context(f,a),d=select(f,x.trigger,c,a);
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library});confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  let n=0;rollIncomingAttack(f.db,f.guild,"gm",a.record_key,{gm:true,library,rng:()=>[15,8][n++]});
  const effect=resolveIncomingDamage(f.db,f.guild,pc.owner_user_id,a.record_key,{armor:false,library});
  const save=f.db.saveCityRecord.bind(f.db);f.db.saveCityRecord=(g,r)=>{if(r.kind==="pvp_fear_effect_receipt")throw new Error("synthetic Fear accounting failure");return save(g,r);};
  const input={trigger:x.trigger.record_key,expected_revision:x.trigger.data.revision+1,decision:d.record_key};
  assert.throws(()=>applyFearMove(f.db,f.guild,"gm",input,{gm:true}),/synthetic Fear/);f.db.saveCityRecord=save;
  assert.deepEqual(f.db.getCityRecord(f.guild,"pc_effect_receipt",effect.record_key),effect);
  assert.equal(f.db.getCityRecord(f.guild,"pvp_fear_trigger",x.trigger.record_key).status,"move_selected");
  f.restart();const saved=applyFearMove(f.db,f.guild,"gm",input,{gm:true});assert.equal(saved.data.incoming_effect_ref,effect.record_key);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,3);assert.equal(f.db.listCityRecords(f.guild,{kind:"npc_attack_roll_receipt",includeGM:true}).length,1);
}));

/** Deterministic entropy ONLY inside this denied-network fixture; d()/native adapters still save every real receipt. */
async function entropy(faces,run){const original=crypto.randomInt;let i=0;
  crypto.randomInt=(min,max)=>{const n=faces[i++];assert(Number.isSafeInteger(n)&&n>=min&&n<max,"Synthetic native RNG exhausted/out of bounds");return n;};syncBuiltinESMExports();
  try{const r=await run();assert.equal(i,faces.length);return r;}finally{crypto.randomInt=original;syncBuiltinESMExports();}
}
function adapter(f,gmService={}){let sequence=0;return async (actor,op,input={},sub="pvp",faces=null)=>{
  const user=actor==="gm"?"gm":f.pcs[actor].owner_user_id,i=fakeInteraction({gm:actor==="gm",sub,json:{op,...input}});
  Object.assign(i,{id:`qualification-ui:${sequence++}`,guildId:f.guild,commandName:"vc-roll",isChatInputCommand:()=>true});i.user={id:user,username:user};
  i.followUp=async p=>i.deliveries.push(p);const run=()=>handleCommand(i,{db:f.db,gm:gmService});
  if(faces)await entropy(faces,run);else await run();
  assert(i.deliveries.length);assert(i.deliveries.every(p=>p.ephemeral&&p.content.length<=2000));return i;
};}

test("PVE07/FH40 narrative no-harm Fear cannot authorize the damage-profile NPC move, even through actual adapters",()=>nativeFixture(async f=>{
  await attackFixture(f);const call=adapter(f),a=f.accepted(0,"I attempt my own harmless feint against Choso.",f.pcs[1].id);
  await call(0,"propose",{accepted_intent:a.record_key,opponent:f.pcs[1].id,terms:pvpTerms(f.pcs)});
  const p=f.db.listCityRecords(f.guild,{kind:"pvp_proposal",includeGM:true})[0];
  for(const i of [0,1]){await call(i,"review",{proposal:p.record_key});await call(i,"respond",{proposal:p.record_key,expected_revision:p.data.terms_hash,decision:"accept"});}
  const input=i=>{const v=progressPvp(f.db,f.guild,f.pcs[i].owner_user_id,p.record_key);return {proposal:p.record_key,expected_revision:p.data.terms_hash,round:v.round,expected_window_revision:v.window_revision};};
  for(const i of [0,1])await call(i,"choose",{...input(i),trait:"Agility",attempt:"I attempt a harmless feint."});
  await call(0,"roll",input(0),"pvp",[3,6]);await call(1,"roll",input(1),"pvp",[9,2]);
  const t=f.db.listCityRecords(f.guild,{kind:"pvp_fear_trigger",includeGM:true})[0],{a:offer}=incoming(f,t),c=context(f,offer);
  assert.throws(()=>select(f,t,c,offer),/damage profile|source|Fear/i);
  assert(f.pcs.every(pc=>f.db.getCharacter(pc.id).data.resources.hp.current===0));
  assert.equal(f.db.listCityRecords(f.guild,{kind:"npc_attack_roll_receipt",includeGM:true}).length,0);
}));

test("PVE07 actual private Discord defense, GM NPC dice, owner Armor and Fear completion use separate native receipts",()=>nativeFixture(async f=>{
  const x=await attackFear(f),{a,pc}=incoming(f,x.trigger),c=context(f,a),call=adapter(f,{content:{root:"../content"}});
  await call("gm","fear-select",{trigger:x.trigger.record_key,expected_revision:x.trigger.data.revision,context:c.record_key,
    expected_target_revision:fearRevision(target(a)),affected_actions:[]});
  const t=f.db.getCityRecord(f.guild,"pvp_fear_trigger",x.trigger.record_key);
  await call(0,"review",{attack:a.record_key},"effect");assert.equal(f.db.getCityRecord(f.guild,"pc_incoming_review",`${a.record_key}:review`),null);
  await call(1,"review",{attack:a.record_key},"effect");await call(1,"incoming-defense",{attack:a.record_key},"effect");
  await call("gm","incoming-roll",{attack:a.record_key},"effect",[15,8]);
  await call(0,"incoming-armor",{attack:a.record_key,armor:true},"effect");assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,1);
  await call(1,"incoming-armor",{attack:a.record_key,armor:true},"effect");
  const input={trigger:t.record_key,expected_revision:t.data.revision,decision:t.data.decision};await call("gm","fear-apply",input);
  f.restart();await call("gm","fear-apply",input);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,2);assert.equal(f.db.listCityRecords(f.guild,{kind:"npc_attack_roll_receipt",includeGM:true}).length,1);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_fear_effect_receipt",includeGM:true}).length,1);
  assert.equal(f.db.getCampaign(f.guild).fear,0);
}));

test("FEA05 actual private Discord defense wakes the trusted selector, owner Armor completes it without a GM impersonation or reroll",()=>nativeFixture(async f=>{
  const x=await attackFear(f),{a,pc}=incoming(f,x.trigger);context(f,a);
  configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  const call=adapter(f,{content:{root:"../content"}});
  assert.equal(resumeAutonomousPvpFear(f.db,f.guild)[0].status,"awaiting_owner");
  await call(0,"review",{attack:a.record_key},"effect");assert.equal(f.db.getCityRecord(f.guild,"pc_incoming_review",`${a.record_key}:review`),null);
  await call(1,"review",{attack:a.record_key},"effect");
  await call(1,"incoming-defense",{attack:a.record_key},"effect",[15,8]);
  assert.equal(f.db.getCityRecord(f.guild,"pc_incoming_attack",a.record_key).status,"awaiting_armor");
  const native=f.db.listCityRecords(f.guild,{kind:"npc_attack_roll_receipt",includeGM:true})[0],saved=f.db.getSavedRoll(f.guild,native.data.roll);
  assert.equal(saved.discord_user_id,"autonomous_pvp_fear");
  await call(0,"incoming-armor",{attack:a.record_key,armor:true},"effect");assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,1);
  await call(1,"incoming-armor",{attack:a.record_key,armor:true},"effect");
  const effect=f.db.listCityRecords(f.guild,{kind:"pvp_fear_effect_receipt",includeGM:true})[0];assert(effect);
  assert.equal(effect.data.authority,"autonomous_v1");assert.equal(effect.data.incoming_roll_ref,native.record_key);
  f.restart();await call(1,"incoming-armor",{attack:a.record_key,armor:true},"effect");
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,2);assert.equal(f.db.getCharacter(pc.id).data.resources.armor.current,1);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"npc_attack_roll_receipt",includeGM:true}).length,1);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_fear_effect_receipt",includeGM:true}).length,1);
}));

test("FEA05/FEA14 changed NPC native template holds autonomous execution for private review before RNG",()=>nativeFixture(async f=>{
  const x=await attackFear(f),{a,pc,library}=incoming(f,x.trigger);context(f,a);
  configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  assert.equal(resumeAutonomousPvpFear(f.db,f.guild)[0].status,"awaiting_owner");
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library});confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  const template=library.findAdversary("Aster Vale Contractor"),changed={...library,findAdversary:()=>({...template,attack:Number(template.attack)+1})};
  let calls=0;const result=resumeAutonomousPvpFear(f.db,f.guild,{library:changed,rng:()=>{calls++;return 15;}});
  assert.equal(result[0].status,"needs_review");assert.equal(calls,0);
  assert.equal(f.db.getCityRecord(f.guild,"pvp_fear_trigger",x.trigger.record_key).status,"needs_review");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"npc_attack_roll_receipt",includeGM:true}).length,0);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_fear_effect_receipt",includeGM:true}).length,0);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,1);assert.deepEqual(resumeAutonomousPvpFear(f.db,f.guild,{library}),[]);
}));
function observedTurn(f,actor,target,name,text,id,mode="party"){
  const pc=f.pcs[actor],scope={mode,actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,id,text,{privateScene:mode==="private"});
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,messageId:id,actorPrincipal:pc.owner_user_id,sessionId:f.session.id,audience:mode});
  const result={respond:true,narration:"Choso apologizes for losing.",narrative_claims:[],player_intents:[{type:"observe",source_span:text,target_name:name,
    target_key:target,operation:"appearance",destination:"unspecified",utterance:"",excluded_targets:[],framing:"immediate",resolution:"conversational",reason:"Ordinary information request."}]};
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:pc.name,label:"Four-player inquiry",meta:{messageId:id,triggerText:text,turnId:attempt.turn_id}});
  return {result,attempt};
}

for(const change of ["revoked_source","lost_terminal"])test(`PVE11 ${change} NPC Fear effect is held at private output without aborting an independent valid observation`,()=>nativeFixture(async f=>{
  const x=await attackFear(f),{a,pc,library}=incoming(f,x.trigger),c=context(f,a),d=select(f,x.trigger,c,a);
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library});confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  let n=0;rollIncomingAttack(f.db,f.guild,"gm",a.record_key,{gm:true,library,rng:()=>[15,8][n++]});resolveIncomingDamage(f.db,f.guild,pc.owner_user_id,a.record_key,{armor:true,library});
  applyFearMove(f.db,f.guild,"gm",{trigger:x.trigger.record_key,expected_revision:x.trigger.data.revision+1,decision:d.record_key},{gm:true});
  if(change==="revoked_source")indexWorldEvent(f.db,f.guild,{key:a.source_event,status:"retracted"},"gm");
  else {const saved=f.db.getCityRecord(f.guild,"pc_incoming_attack",a.record_key);f.db.saveCityRecord(f.guild,{...saved,key:saved.record_key,status:"awaiting_armor"});}
  const out=observedTurn(f,1,f.pcs[0].id,"Jaxon","What does Jaxon look like?","revoked-fear-observation","private");
  assert.match(out.result.narration,/not.*established|cannot.*see/i);assert(!out.result.narration.includes("apologizes"));
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_fear_publication_hold",includeGM:true}).length,1);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,2);
}));

test("PVE14 four-player actual Discord/turn replay: both narrative modes, withheld reaction, native damage, OBS21 and unknown PC appearance",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:4}),call=adapter(f),initial=f.pcs.map(p=>f.db.getCharacter(p.id).data.resources);
  for(const mode of ["single_roll_duel","three_strikes"]){
    const accepted=f.accepted(0,`I attempt a harmless ${mode} contest with Choso.`,f.pcs[1].id),terms=pvpTerms(f.pcs,{mode});
    await call(0,"propose",{accepted_intent:accepted.record_key,opponent:f.pcs[1].id,terms});
    const p=f.db.listCityRecords(f.guild,{kind:"pvp_proposal",includeGM:true}).find(r=>r.data.accepted_intent===accepted.record_key);assert(p);
    for(const i of [0,1]){await call(i,"review",{proposal:p.record_key});await call(i,"respond",{proposal:p.record_key,expected_revision:p.data.terms_hash,decision:"accept"});}
    const input=i=>{const v=progressPvp(f.db,f.guild,f.pcs[i].owner_user_id,p.record_key);return {proposal:p.record_key,expected_revision:p.data.terms_hash,round:v.round,expected_window_revision:v.window_revision};};
    const winners=mode==="three_strikes"?[0,1,0,1,0]:[0];
    for(const [round,winner] of winners.entries()){
      for(const i of [0,1])await call(i,"choose",{...input(i),trait:"Agility",attempt:"I attempt only my own harmless feint."});
      for(const i of [0,1])await call(i,"roll",input(i),"pvp",i===winner?[9,2]:[4,1]);
      if(round<winners.length-1)for(const i of [0,1])await call(i,"continue",input(i));
    }
    const finished=f.db.getCityRecord(f.guild,"pvp_proposal",p.record_key),r=f.db.getCityRecord(f.guild,"pvp_resolution_receipt",finished.data.resolution_receipt);
    assert.equal(r.data.winner,f.pcs[0].id);if(mode==="three_strikes")assert.deepEqual(Object.values(r.data.scores).sort(),[2,3]);
    await call(0,"narrate",{proposal:p.record_key,expected_revision:p.data.terms_hash,resolution:r.record_key,role:"success",subject_character:f.pcs[0].id,text:"Choso apologizes for losing."});
    assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_narrative_clause",includeGM:true}).length,0);
    assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),initial);
  }
  const unknown=observedTurn(f,2,f.pcs[0].id,"Jaxon","What does Jaxon look like?","qualification-unknown");
  assert.match(unknown.result.narration,/not.*established|cannot.*see/i);assert(!unknown.result.narration.includes("apologizes"));
  f.db.upsertNpcProfile(f.guild,{npcKey:"station-attendant",displayName:"Station Attendant",publicIdentity:"Choso apologizes for losing."});
  f.db.setSimulationEntity(f.guild,"npc","station-attendant",{location_key:"terminal"});
  recordScenePresence(f.db,f.guild,{source_event:"attack-scene",entity_type:"npc",entity_key:"station-attendant",location_key:"terminal",zone:"floor",range:"Melee",visibility:"party"},"gm");
  const description=fakeInteraction({sub:"scene-description",json:{entity_type:"npc",entity_key:"station-attendant",location_key:"terminal",visibility:"party",facts:{coat:"blue"}}});
  Object.assign(description,{guildId:f.guild,id:"qualification-description",commandName:"vc-gm",isChatInputCommand:()=>true});description.user.username="Synthetic GM";
  await handleCommand(description,{db:f.db,gm:{}});
  const npc=observedTurn(f,3,"station-attendant","Station Attendant","What does the station attendant look like?","qualification-npc");assert.match(npc.result.narration,/blue coat/i);
  for(const turn of [unknown,npc]){const sent=[];const delivery=await deliverTurnOutbox(f.db,f.guild,turn.attempt.turn_id,async row=>{sent.push(row.payload);return {messageId:"synthetic-delivery",channelId:"table"};});assert(delivery.every(r=>r.ok));assert(!JSON.stringify(sent).includes("apologizes"));}
  await call("gm","attack-prepare",x.input);const request=f.db.listCityRecords(f.guild,{kind:"pvp_attack_request",includeGM:true})[0];assert(request);
  for(const i of [0,1]){await call(i,"attack-review",{attack:request.record_key});await call(i,"attack-authorize",{attack:request.record_key,expected_revision:request.data.offer_hash});}
  const rollInput={attack:request.record_key,expected_revision:request.data.offer_hash};await call(0,"attack-roll",rollInput,"pvp",[6,3]);
  await call(0,"damage-roll",{attack_receipt:`${request.record_key}:roll`},"pvp",[1,1]);
  const damage=f.db.listCityRecords(f.guild,{kind:"pvp_damage_roll_receipt",includeGM:true})[0];
  await call("gm","damage-prepare",{damage_receipts:[damage.record_key],ruling:"pc-attack",defenses});
  const offer=f.db.listCityRecords(f.guild,{kind:"pvp_damage_offer",includeGM:true})[0];assert(offer);
  const review=await call(1,"armor-review",{damage:offer.record_key}),view=JSON.parse(review.deliveries.map(d=>d.content).join("\n"));
  const armorInput={damage:offer.record_key,expected_revision:view.revision,armor:false};await call(1,"armor-choose",armorInput);
  f.restart();await call(0,"attack-roll",rollInput,"pvp",[]);await call(1,"armor-choose",armorInput);
  assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,1);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pc_effect_receipt",includeGM:true}).length,1);
  assert(f.pcs.every(p=>f.db.getCharacter(p.id).data.resources.hope===2));assert.equal(f.db.getCampaign(f.guild).fear,0);
}));

for(const change of ["audience","move_kind"])test(`PVE11 a rehashed native Fear receipt cannot change its selected ${change}`,()=>nativeFixture(async f=>{
  const x=await attackFear(f),{a,pc,library}=incoming(f,x.trigger),c=context(f,a),d=select(f,x.trigger,c,a);
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library});confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  rollIncomingAttack(f.db,f.guild,"gm",a.record_key,{gm:true,library,rng:()=>1});
  const e=applyFearMove(f.db,f.guild,"gm",{trigger:x.trigger.record_key,expected_revision:x.trigger.data.revision+1,decision:d.record_key},{gm:true});
  const {effect_digest,...material}=e.data;
  if(change==="audience"){material.visibility="party";material.subject_key=null;}else material.move_kind="clock_advance";
  f.db.saveCityRecord(f.guild,{...e,key:e.record_key,visibility:material.visibility,subject_key:material.subject_key,data:{...material,effect_digest:fearRevision(material)}});
  assert.throws(()=>renderFearEffect(f.db,f.guild,e.record_key,change==="audience"?{mode:"party"}:{mode:"private",actorCharacterId:pc.id}),/native|context|audience|proof|kind/i);
}));

for(const change of ["context_scene","decision_scene"])test(`PVE11 selected NPC attack rejects mismatched ${change} before RNG`,()=>nativeFixture(async f=>{
  const x=await attackFear(f),{a,pc,library}=incoming(f,x.trigger),c=context(f,a),d=select(f,x.trigger,c,a);
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library});confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  const key=change==="context_scene"?c.source_event:d.source_event;
  // saveWorldEvent deliberately preserves immutable metadata on conflict. Simulate a malformed
  // historical record directly in this temporary fixture, and prove the corruption took effect.
  f.db.db.prepare("UPDATE world_events SET scene=? WHERE guild_id=? AND event_key=?").run("unrelated-old-scene",f.guild,key);
  assert.equal(f.db.getWorldEvent(f.guild,key).scene,"unrelated-old-scene");let n=0;
  assert.throws(()=>rollIncomingAttack(f.db,f.guild,"gm",a.record_key,{gm:true,library,rng:()=>{n++;return 1;}}),/context|source|scene|GM/i);
  assert.equal(n,0);
}));
