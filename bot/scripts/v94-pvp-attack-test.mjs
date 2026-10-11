/** B.4: real owner/consent/command paths, temporary SQLite and deterministic native RNG. */
import assert from "node:assert/strict";
import test from "node:test";
import {nativeFixture} from "./v9-fixtures.mjs";
import {respondDamagePvp,stageDamagePvp} from "../src/pvp-profiles.js";
import {attackFixture} from "./v94-pvp-attack-fixtures.mjs";
import {currentScene,recordScenePresence} from "../src/scene-continuity.js";
import {indexWorldEvent} from "../src/city-calendar.js";
import {applyRollOutcome,contributeRoll} from "../src/roll-collaboration.js";
import {prepareRollRequest,rollRevision} from "../src/roll-requests.js";
import {fakeInteraction} from "./contract-fixtures.mjs";
import {handleCommand} from "../src/commands.js";
import {adjudicateRollSource} from "../src/roll-collaboration.js";
import {fearRevision,establishFearContext,selectFearMove,applyFearMove,validateFearEffect} from "../src/pvp-fear-moves.js";
const api=()=>import("../src/pvp-attacks.js");
async function ready(f,options={}){
  const a=await api(),x=await attackFixture(f,options),row=a.preparePvpAttack(f.db,f.guild,"gm",x.input,{gm:true,interactionId:"attack-review"});
  for(const pc of f.pcs.slice(0,2)){
    a.reviewPvpAttack(f.db,f.guild,pc.owner_user_id,row.record_key);
    a.authorizePvpAttack(f.db,f.guild,pc.owner_user_id,{attack:row.record_key,expected_revision:row.data.offer_hash},{interactionId:`attack-authorize:${pc.id}`});
  }
  return {...x,row,a};
}
function rng(faces){let n=0;const roll=s=>{assert.equal(s,12);assert(n<faces.length,"No automatic defender/damage dice");return faces[n++];};roll.count=()=>n;return roll;}
function noEffects(f){for(const pc of f.pcs)assert.deepEqual(f.db.getCharacter(pc.id).data.resources,pc.data.resources);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pc_effect_receipt",includeGM:true}).length,0);}

test("PVD01/PVD03/PVD09 actual attack equals current Evasion, never adversary Difficulty or extra defender dice",()=>nativeFixture(async f=>{
  const {a,row}=await ready(f),dice=rng([5,4]),r=a.rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:row.record_key,expected_revision:row.data.offer_hash},{rng:dice});
  assert.equal(r.data.result.evasion,12);assert.equal(r.data.result.total,12);assert.equal(r.data.result.hit,true);assert.equal(dice.count(),2);noEffects(f);
}));
test("PVD04 below Evasion misses without damage and PVD05 Critical auto-hits below Evasion with no Hope/Stress grant",()=>nativeFixture(async f=>{
  const {a,row}=await ready(f),r=a.rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:row.record_key,expected_revision:row.data.offer_hash},{rng:rng([2,1])});
  assert.equal(r.data.result.hit,false);noEffects(f);
  const action=f.accepted(0,"I attempt another strike.",f.pcs[1].id,{operation:"attack"}),staged=stageDamagePvp(f.db,f.guild,action);
  const second=a.preparePvpAttack(f.db,f.guild,"gm",{attack:staged.record_key,kind:"weapon",weapon:"Practice Blade",trait:"Finesse",modifier_keys:[],ruling:"pc-attack"},{gm:true,interactionId:"second"});
  for(const pc of f.pcs.slice(0,2)){a.reviewPvpAttack(f.db,f.guild,pc.owner_user_id,second.record_key);a.authorizePvpAttack(f.db,f.guild,pc.owner_user_id,{attack:second.record_key,expected_revision:second.data.offer_hash},{interactionId:`second:${pc.id}`});}
  const critical=a.rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:second.record_key,expected_revision:second.data.offer_hash},{rng:rng([1,1])});
  assert.equal(critical.data.result.duality,"Critical");assert.equal(critical.data.result.total,5);assert.equal(critical.data.result.hit,true);
  applyRollOutcome(f.db,f.guild,f.session.id,[f.pcs[0].id],critical.data.result);noEffects(f);
}));
for(const change of ["evasion","equipment","trait","range","source","ruling","withdraw"])
test(`PVD02/PVD08 live ${change} invalidation holds without dice, spending or damage`,()=>nativeFixture(async f=>{
  const {a,row,contract}=await ready(f);
  if(change==="evasion")f.db.updateCharacterData(f.pcs[1].id,d=>{d.evasion++;d.domain_cards=[{name:"New defense",active:true}];});
  if(change==="equipment")f.db.updateCharacterData(f.pcs[0].id,d=>{d.inventory[0].equipped=false;});
  if(change==="trait")f.db.updateCharacterData(f.pcs[0].id,d=>{d.traits.Finesse++;});
  if(change==="range"){const scene=currentScene(f.db,f.guild);indexWorldEvent(f.db,f.guild,{key:"remote",kind:"observation",source_id:"gm",visibility:"party",title:"Established remote target position",location_key:"terminal",scene:scene.key,session_id:f.session.id},"gm");
    recordScenePresence(f.db,f.guild,{source_event:"remote",entity_type:"character",entity_key:f.pcs[1].id,location_key:"terminal",zone:"remote",range:"Far",visibility:"party",accepted_by:f.pcs[1].owner_user_id},"gm");}
  if(change==="source")indexWorldEvent(f.db,f.guild,{key:row.source_event,status:"retracted"},"gm");
  if(change==="ruling")f.db.upsertRulesRuling(f.guild,{key:"pc-attack",ruling:"Changed current ruling.",createdBy:"gm"});
  if(change==="withdraw")respondDamagePvp(f.db,f.guild,f.pcs[1].owner_user_id,{contract:contract.record_key,expected_revision:contract.data.terms_hash,decision:"withdraw"},{interactionId:"withdraw-before-roll"});
  assert.throws(()=>a.rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:row.record_key,expected_revision:row.data.offer_hash},{rng:()=>assert.fail("No RNG")}),/stale|changed|range|source|equipped|withdrawn|locked/i);noEffects(f);
}));
test("PVD07 unarmed snapshots native Proficiency d4, not invented equipment",()=>nativeFixture(async f=>{
  const {row}=await ready(f,{kind:"unarmed"});assert.equal(row.data.offer.damage,"2d4");assert.equal(row.data.offer.trait,"Strength");noEffects(f);
}));
test("PVD08/PVD21 absent equipment or adversary-only domain mapping cannot become a PC attack",()=>nativeFixture(async f=>{
  const a=await api(),x=await attackFixture(f);
  assert.throws(()=>a.preparePvpAttack(f.db,f.guild,"gm",{...x.input,weapon:"Missing weapon"},{gm:true,interactionId:"missing"}),/equipped|weapon/i);
  assert.throws(()=>a.preparePvpAttack(f.db,f.guild,"gm",{...x.input,kind:"spell",weapon:"Adversary-only spell"},{gm:true,interactionId:"spell"}),/mapping|native|unsupported|weapon/i);noEffects(f);
}));
test("PVD owner-only private review and exact two owner approvals; authenticated GM cannot roll for attacker",()=>nativeFixture(async f=>{
  const a=await api(),x=await attackFixture(f),r=a.preparePvpAttack(f.db,f.guild,"gm",x.input,{gm:true,interactionId:"review"});
  assert.throws(()=>a.reviewPvpAttack(f.db,f.guild,f.pcs[2].owner_user_id,r.record_key),/owner|participant/i);
  assert.throws(()=>a.authorizePvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:r.record_key,expected_revision:r.data.offer_hash},{interactionId:"blind"}),/review/i);
  a.reviewPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,r.record_key);a.authorizePvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:r.record_key,expected_revision:r.data.offer_hash},{interactionId:"first"});
  assert.throws(()=>a.rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:r.record_key,expected_revision:r.data.offer_hash},{rng:()=>assert.fail()}),/defense|owner|ready/i);
  assert.throws(()=>a.rollPvpAttack(f.db,f.guild,"gm",{attack:r.record_key,expected_revision:r.data.offer_hash},{rng:()=>assert.fail()}),/owner|attacker/i);
  const target=a.reviewPvpAttack(f.db,f.guild,f.pcs[1].owner_user_id,r.record_key);assert.equal(target.evasion,12);assert.equal(target.trait_bonus,undefined);noEffects(f);
}));
test("PVD restart/redelivery returns exact saved attack, cannot forge generic PvP resources",()=>nativeFixture(async f=>{
  const {a,row}=await ready(f),input={attack:row.record_key,expected_revision:row.data.offer_hash};
  const r=a.rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,input,{rng:rng([5,4])});f.restart();
  assert.deepEqual(a.rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,input,{rng:()=>assert.fail("No reroll")}),r);
  assert.throws(()=>applyRollOutcome(f.db,f.guild,f.session.id,[f.pcs[0].id],{...r.data.result,duality:"Critical"}),/native|unverified/i);noEffects(f);
}));
test("PVD Fear action has one immediate native obligation and prevents next attack, not banked Fear",()=>nativeFixture(async f=>{
  const {a,row}=await ready(f),before=f.db.getCampaign(f.guild).fear; a.rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:row.record_key,expected_revision:row.data.offer_hash},{rng:rng([4,5])});
  const triggers=f.db.listCityRecords(f.guild,{kind:"pvp_fear_trigger",includeGM:true});assert.equal(triggers.length,1);assert.equal(triggers[0].status,"awaiting_move");assert.equal(f.db.getCampaign(f.guild).fear,before);
  const next=stageDamagePvp(f.db,f.guild,f.accepted(0,"I strike again.",f.pcs[1].id,{operation:"attack"}));
  assert.throws(()=>a.preparePvpAttack(f.db,f.guild,"gm",{attack:next.record_key,kind:"weapon",weapon:"Practice Blade",trait:"Finesse",modifier_keys:[],ruling:"pc-attack"},{gm:true,interactionId:"next"}),/Fear|pending|unfinished/i);noEffects(f);
}));
test("PVD10/PVD11 native source-triggered reaction reuses existing owner roll path with no PvP metacurrency",()=>nativeFixture(async f=>{
  await ready(f);const pc=f.pcs[1],scene=currentScene(f.db,f.guild);
  const source=indexWorldEvent(f.db,f.guild,{key:"reaction-source",kind:"player_declaration",title:"Owner attempts to avoid the established hazard",source_id:`player:${pc.owner_user_id}`,
    visibility:"character",subject_key:pc.id,scene:scene.key,session_id:f.session.id,details:{author:pc.owner_user_id,character_id:pc.id,text:"I try to avoid the established hazard."}},pc.owner_user_id);
  const request=prepareRollRequest(f.db,f.guild,{source_event:source.event_key,character_id:pc.id,kind:"reaction",trait:"Agility",modifier_keys:[],adjudication:"SRD reaction against the separately established hazard, not a free defense against the PC attack."},"gm");
  const response=contributeRoll(f.db,f.guild,pc.owner_user_id,{key:"reaction-operation",request:request.record_key,expected_revision:rollRevision(request),op:"roll"},{rng:rng([1,1])});
  assert.equal(response.data.result.duality,"Critical");noEffects(f);assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_fear_trigger",includeGM:true}).length,0);
}));
test("PVD command adapter uses native identity and private bounded owner reviews",()=>nativeFixture(async f=>{
  const x=await attackFixture(f),call=async(user,op,input,gm=false)=>{
    const i=fakeInteraction({gm,sub:"pvp",json:{op,...input}});Object.assign(i,{id:`${user}:${op}`,guildId:f.guild,commandName:"vc-roll",isChatInputCommand:()=>true,user:{id:user,username:user}});
    await handleCommand(i,{db:f.db,gm:{}});return i;
  };
  await call("gm","attack-prepare",x.input,true);const r=f.db.listCityRecords(f.guild,{kind:"pvp_attack_request",includeGM:true})[0];assert(r);
  for(const pc of f.pcs.slice(0,2)){const i=await call(pc.owner_user_id,"attack-review",{attack:r.record_key});assert(i.deliveries.every(x=>x.ephemeral&&x.content.length<=2000));
    await call(pc.owner_user_id,"attack-authorize",{attack:r.record_key,expected_revision:r.data.offer_hash});}
  assert.equal(f.db.getCityRecord(f.guild,"pvp_attack_request",r.record_key).status,"ready");noEffects(f);
}));
test("PVD actual attack modifiers cannot be omitted, stale or replaced by action-only modifiers",()=>nativeFixture(async f=>{
  const a=await api(),x=await attackFixture(f),pc=f.pcs[0];
  const mod=adjudicateRollSource(f.db,f.guild,{key:"blade-modifier",character_id:pc.id,kind:"modifier",ruling_key:"pc-attack",
    data:{trait:"Finesse",roll_kind:"attack",kind:"flat",amount:1,name:"Reviewed situational attack bonus"}},"gm");
  assert.throws(()=>a.preparePvpAttack(f.db,f.guild,"gm",x.input,{gm:true,interactionId:"omit-modifier"}),/modifier|accounted/i);
  const row=a.preparePvpAttack(f.db,f.guild,"gm",{...x.input,modifier_keys:[mod.event_key]},{gm:true,interactionId:"with-modifier"});
  assert.equal(row.data.offer.breakdown.subtotal,4);noEffects(f);
}));
test("PVD saved dice cannot be relabeled as generic Critical to create Hope or clear Stress",()=>nativeFixture(async f=>{
  const {a,row}=await ready(f),r=a.rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:row.record_key,expected_revision:row.data.offer_hash},{rng:rng([1,1])});
  const {roll_type,attack,terms_hash,character_id,target_character_id,evasion,hit,...stripped}=r.data.result;
  applyRollOutcome(f.db,f.guild,f.session.id,[f.pcs[0].id],stripped);noEffects(f);
}));
test("PVD saved Fear survives restart/withdrawal and resolves one actual immediate clock move exactly once",()=>nativeFixture(async f=>{
  const {a,row,contract}=await ready(f),r=a.rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:row.record_key,expected_revision:row.data.offer_hash},{rng:rng([1,2])});
  assert.equal(r.data.result.hit,false);f.restart();respondDamagePvp(f.db,f.guild,f.pcs[1].owner_user_id,
    {contract:contract.record_key,expected_revision:contract.data.terms_hash,decision:"withdraw"},{interactionId:"after-dice-withdraw"});
  f.db.changeClock(f.guild,"closing-time",0,{max:6,visibility:"party"});
  const c=establishFearContext(f.db,f.guild,"gm",{move_kind:"clock_advance",target_key:"closing-time",location_key:"terminal",visibility:"party",subject_key:null},{gm:true,interactionId:"attack-clock"});
  const t=f.db.listCityRecords(f.guild,{kind:"pvp_fear_trigger",includeGM:true})[0],d=selectFearMove(f.db,f.guild,"gm",{trigger:t.record_key,
    expected_revision:t.data.revision,context:c.record_key,expected_target_revision:fearRevision(f.db.getClock(f.guild,"closing-time")),affected_actions:[]},{gm:true,interactionId:"attack-clock-select"});
  const input={trigger:t.record_key,expected_revision:f.db.getCityRecord(f.guild,"pvp_fear_trigger",t.record_key).data.revision,decision:d.record_key};
  const e=applyFearMove(f.db,f.guild,"gm",input,{gm:true});assert.equal(f.db.getClock(f.guild,"closing-time").value,1);assert.equal(validateFearEffect(f.db,f.guild,e.record_key).record_key,e.record_key);
  assert.deepEqual(applyFearMove(f.db,f.guild,"gm",input,{gm:true}),e);assert.equal(f.db.getClock(f.guild,"closing-time").value,1);noEffects(f);
}));
test("PVD invalid RNG rolls back dice, authorizations remain available and no cost/effect is applied",()=>nativeFixture(async f=>{
  const {a,row}=await ready(f);assert.throws(()=>a.rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,
    {attack:row.record_key,expected_revision:row.data.offer_hash},{rng:()=>13}),/range/i);
  assert.equal(f.db.getCityRecord(f.guild,"pvp_attack_request",row.record_key).status,"ready");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_attack_roll_receipt",includeGM:true}).length,0);noEffects(f);
}));
test("PVD group consent cannot execute before native multiplayer lock/spotlight lifecycle",()=>nativeFixture(async f=>{
  const a=await api(),x=await attackFixture(f,{count:3});assert.throws(()=>a.preparePvpAttack(f.db,f.guild,"gm",x.input,
    {gm:true,interactionId:"premature-group"}),/Group|spotlight|locks/i);noEffects(f);
}));
test("PVD attack/roll internal receipts never expose the opponent's confidential Evasion through scoped retrieval",()=>nativeFixture(async f=>{
  const {a,row}=await ready(f),r=a.rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:row.record_key,expected_revision:row.data.offer_hash},{rng:rng([5,4])});
  assert.equal(row.visibility,"gm");assert.equal(r.visibility,"gm");assert.equal(f.db.getWorldEvent(f.guild,row.source_event).visibility,"gm");
  const own=a.reviewPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,row.record_key);assert.equal(own.evasion,undefined);noEffects(f);
}));
test("PVD an expired consent cannot erase an already committed immediate Fear obligation",()=>nativeFixture(async f=>{
  const {a,row}=await ready(f);a.rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:row.record_key,expected_revision:row.data.offer_hash},{rng:rng([1,2])});
  f.db.advanceSimulationClock(f.guild,{minutes:1001});
  f.db.changeClock(f.guild,"closing-time",0,{max:6,visibility:"party"});
  const c=establishFearContext(f.db,f.guild,"gm",{move_kind:"clock_advance",target_key:"closing-time",location_key:"terminal",visibility:"party",subject_key:null},{gm:true,interactionId:"expired-context"});
  const t=f.db.listCityRecords(f.guild,{kind:"pvp_fear_trigger",includeGM:true})[0],d=selectFearMove(f.db,f.guild,"gm",{trigger:t.record_key,expected_revision:t.data.revision,
    context:c.record_key,expected_target_revision:fearRevision(f.db.getClock(f.guild,"closing-time")),affected_actions:[]},{gm:true,interactionId:"expired-select"});
  assert(d);const next=stageDamagePvp(f.db,f.guild,f.accepted(0,"I strike again.",f.pcs[1].id,{operation:"attack"}));assert.equal(next,null);
}));
