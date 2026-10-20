/** Campaign PvP execution contract: typed intent owns intent; native receipts own outcomes. */
import assert from "node:assert/strict";
import test from "node:test";
import {nativeFixture} from "./v9-fixtures.mjs";
import {currentScene,recordScenePresence} from "../src/scene-continuity.js";
import {indexWorldEvent} from "../src/city-calendar.js";
import {setCampaignPvpMode,setPvpSafetyStop} from "../src/pvp-campaign-policy.js";
import {stageDamagePvp} from "../src/pvp-profiles.js";
import {preparePvpAttack,reviewPvpAttack,authorizePvpAttack,rollPvpAttack} from "../src/pvp-attacks.js";
import {stagePvpAttempts} from "../src/narrative-pvp.js";
import {rollPvpDamage,preparePvpDamage,reviewPvpDamage,resolvePvpDamage,validatePvpDamageApplication} from "../src/pvp-damage.js";

function rng(faces){let n=0;const roll=s=>{assert(n<faces.length,"No unexpected dice");const face=faces[n++];assert(face>=1&&face<=s,`Face ${face} outside d${s}`);return face;};roll.count=()=>n;return roll;}
function noResourcesChanged(f){for(const pc of f.pcs)assert.deepEqual(f.db.getCharacter(pc.id).data.resources,pc.data.resources);}
function scope(f){
  const [actor,target]=f.pcs,scene=currentScene(f.db,f.guild);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,scene_continuity:true,roll_requests:true,roll_collaboration:true}});
  f.db.setSimulationEntity(f.guild,"location","terminal",{name:"Terminal"});
  const source=indexWorldEvent(f.db,f.guild,{key:"campaign-attack-scene",kind:"observation",source_id:"gm",title:"Established scene positions",
    session_id:f.session.id,scene:scene.key,visibility:"party",location_key:"terminal"},"gm");
  for(const pc of [actor,target]){
    f.db.updateCharacterData(pc.id,d=>{d.evasion=12;d.proficiency=2;d.thresholds={major:7,severe:14};
      d.inventory=[{name:"Practice Blade",equipped:true,trait:"Finesse",range:"Melee",damage_die:8,damage_modifier:2,damage_type:"physical"}];});
    recordScenePresence(f.db,f.guild,{source_event:source.event_key,entity_type:"character",entity_key:pc.id,location_key:"terminal",
      zone:"floor",range:"Melee",visibility:"party",accepted_by:pc.owner_user_id},"gm");
  }
  f.db.upsertRulesRuling(f.guild,{key:"pc-attack",createdBy:"gm",ruling:"SRD 2.0: owned equipped Blade uses Finesse, Melee, proficiency d8+2 physical; standard target Evasion; no extra defender roll."});
  return {actor,target,accepted:f.accepted(0,"I strike Choso with the Practice Blade.",target.id,{operation:"attack"}),
    input:{kind:"weapon",weapon:"Practice Blade",trait:"Finesse",modifier_keys:[],ruling:"pc-attack"}};
}
function enable(f,id="enable-campaign-pvp"){setCampaignPvpMode(f.db,f.guild,"gm",{enabled:true},{interactionId:id,gm:true});}
function prepare(f,s,staged,id="campaign-attack"){
  return preparePvpAttack(f.db,f.guild,"gm",{...s.input,attack:staged.record_key},{gm:true,interactionId:id});
}
function authorizeAttackerOnly(f,row){
  const pc=f.pcs[0];reviewPvpAttack(f.db,f.guild,pc.owner_user_id,row.record_key);
  authorizePvpAttack(f.db,f.guild,pc.owner_user_id,{attack:row.record_key,expected_revision:row.data.offer_hash},{interactionId:`authorize:${row.record_key}`});
}

test("campaign mode disabled leaves accepted PC attack without campaign staging",()=>nativeFixture(async f=>{
  const s=scope(f);assert.equal(stageDamagePvp(f.db,f.guild,s.accepted),null);noResourcesChanged(f);
}));

test("enabled campaign stages accepted intent without manufacturing bilateral approvals and permits attacker-only roll",()=>nativeFixture(async f=>{
  const s=scope(f);enable(f);const staged=stageDamagePvp(f.db,f.guild,s.accepted);assert(staged);
  assert.equal(staged.data.version,4);assert.equal(staged.data.accepted_intent,s.accepted.record_key);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_damage_consent",includeGM:true}).length,0);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_agreement",includeGM:true}).length,0);
  const row=prepare(f,s,staged);authorizeAttackerOnly(f,row);
  const dice=rng([5,4]),receipt=rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,
    {attack:row.record_key,expected_revision:row.data.offer_hash},{rng:dice});
  assert.equal(receipt.data.result.hit,true);assert.equal(dice.count(),2);noResourcesChanged(f);
}));

test("campaign staging participates in accepted typed-intent action planning",()=>nativeFixture(async f=>{
  const s=scope(f);enable(f);const rows=stagePvpAttempts(f.db,f.guild,[s.accepted],[]);
  assert.equal(rows.length,1);assert.equal(rows[0].data.version,4);assert.equal(rows[0].data.accepted_intent,s.accepted.record_key);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_consent",includeGM:true}).length,0);noResourcesChanged(f);
}));

test("campaign safety stop before dice leaves attack unrolled",()=>nativeFixture(async f=>{
  const s=scope(f);enable(f);const staged=stageDamagePvp(f.db,f.guild,s.accepted),row=prepare(f,s,staged);authorizeAttackerOnly(f,row);
  setPvpSafetyStop(f.db,f.guild,s.target.owner_user_id,{character_id:s.target.id},{interactionId:"stop-before-campaign-dice"});
  const dice=rng([]);assert.throws(()=>rollPvpAttack(f.db,f.guild,s.actor.owner_user_id,
    {attack:row.record_key,expected_revision:row.data.offer_hash},{rng:dice}),/safety|stop/i);
  assert.equal(dice.count(),0);noResourcesChanged(f);
}));

test("mode disable before a campaign roll blocks fresh dice",()=>nativeFixture(async f=>{
  const s=scope(f);enable(f);const staged=stageDamagePvp(f.db,f.guild,s.accepted),row=prepare(f,s,staged);authorizeAttackerOnly(f,row);
  setCampaignPvpMode(f.db,f.guild,"gm",{enabled:false},{interactionId:"disable-before-campaign-dice",gm:true});
  const dice=rng([]);assert.throws(()=>rollPvpAttack(f.db,f.guild,s.actor.owner_user_id,
    {attack:row.record_key,expected_revision:row.data.offer_hash},{rng:dice}),/campaign|mode|enabled|scope/i);
  assert.equal(dice.count(),0);noResourcesChanged(f);
}));

for(const change of ["source","owner"])
test(`campaign ${change} invalidation blocks dice before commitment`,()=>nativeFixture(async f=>{
  const s=scope(f);enable(f);const staged=stageDamagePvp(f.db,f.guild,s.accepted),row=prepare(f,s,staged);authorizeAttackerOnly(f,row);
  if(change==="source")indexWorldEvent(f.db,f.guild,{key:s.accepted.source_event,status:"retracted"},"gm");
  else f.db.db.prepare("UPDATE characters SET owner_user_id=? WHERE id=?").run("replacement-owner",s.actor.id);
  const dice=rng([]);assert.throws(()=>rollPvpAttack(f.db,f.guild,s.actor.owner_user_id,
    {attack:row.record_key,expected_revision:row.data.offer_hash},{rng:dice}),/source|owner|principal|stale|revok/i);
  assert.equal(dice.count(),0);noResourcesChanged(f);
}));

test("campaign Critical preserves native result without Hope or Stress and uses no second owner authorization",()=>nativeFixture(async f=>{
  const s=scope(f);enable(f);const staged=stageDamagePvp(f.db,f.guild,s.accepted),row=prepare(f,s,staged);authorizeAttackerOnly(f,row);
  const receipt=rollPvpAttack(f.db,f.guild,s.actor.owner_user_id,{attack:row.record_key,expected_revision:row.data.offer_hash},{rng:rng([1,1])});
  assert.equal(receipt.data.result.duality,"Critical");assert.equal(receipt.data.result.hit,true);
  assert.equal(f.db.getWorldEvent(f.guild,`${row.record_key}:authorize:${s.target.id}`),null);noResourcesChanged(f);
}));

test("committed campaign roll replays after restart and mode disable; safety stop blocks fresh damage dice",()=>nativeFixture(async f=>{
  const s=scope(f);enable(f);const staged=stageDamagePvp(f.db,f.guild,s.accepted),row=prepare(f,s,staged);authorizeAttackerOnly(f,row);
  const input={attack:row.record_key,expected_revision:row.data.offer_hash},receipt=rollPvpAttack(f.db,f.guild,s.actor.owner_user_id,input,{rng:rng([5,4])});
  setPvpSafetyStop(f.db,f.guild,s.target.owner_user_id,{character_id:s.target.id},{interactionId:"stop-after-campaign-roll"});
  setCampaignPvpMode(f.db,f.guild,"gm",{enabled:false},{interactionId:"disable-after-campaign-roll",gm:true});f.restart();
  assert.deepEqual(rollPvpAttack(f.db,f.guild,s.actor.owner_user_id,input,{rng:()=>assert.fail("No reroll")}),receipt);
  const next=f.accepted(0,"I strike Choso again.",s.target.id,{operation:"attack"});
  assert.throws(()=>stageDamagePvp(f.db,f.guild,next),/safety|stop|enabled|mode/i);
  const dice=rng([]);assert.throws(()=>rollPvpDamage(f.db,f.guild,s.actor.owner_user_id,{attack_receipt:receipt.record_key},{rng:dice}),/safety|stop|campaign|mode/i);
  assert.equal(dice.count(),0);
  noResourcesChanged(f);
}));

test("native campaign damage receipts use target-owned Armor and saved effect remains readable after stop/restart",()=>nativeFixture(async f=>{
  const s=scope(f);enable(f);const staged=stageDamagePvp(f.db,f.guild,s.accepted),row=prepare(f,s,staged);authorizeAttackerOnly(f,row);
  const attack=rollPvpAttack(f.db,f.guild,s.actor.owner_user_id,{attack:row.record_key,expected_revision:row.data.offer_hash},{rng:rng([5,4])});
  const damage=rollPvpDamage(f.db,f.guild,s.actor.owner_user_id,{attack_receipt:attack.record_key},{rng:rng([6,6])});
  f.db.upsertRulesRuling(f.guild,{key:"pc-damage",createdBy:"gm",ruling:"SRD current thresholds. Armor reduces severity by one; native owner makes the Armor choice."});
  const offer=preparePvpDamage(f.db,f.guild,"gm",{damage_receipts:[damage.record_key],ruling:"pc-damage",
    defenses:{source:"base",resistance:"none",armor_reduction:1,armor_allowed:true}},{gm:true,interactionId:"campaign-damage-review"});
  assert.throws(()=>reviewPvpDamage(f.db,f.guild,s.actor.owner_user_id,offer.record_key),/owner|affected/i);
  const view=reviewPvpDamage(f.db,f.guild,s.target.owner_user_id,offer.record_key);
  const choice={damage:offer.record_key,expected_revision:view.revision,armor:true};
  assert.throws(()=>resolvePvpDamage(f.db,f.guild,s.actor.owner_user_id,choice,{interactionId:"wrong-owner-armor"}),/owner|affected/i);
  const effect=resolvePvpDamage(f.db,f.guild,s.target.owner_user_id,choice,{interactionId:"target-armor"});
  assert.equal(effect.data.armor,true);assert.equal(f.db.getCharacter(s.target.id).data.resources.armor.current,1);
  assert.equal(f.db.getCharacter(s.target.id).data.resources.hp.current,2);
  setPvpSafetyStop(f.db,f.guild,s.target.owner_user_id,{character_id:s.target.id},{interactionId:"stop-after-campaign-effect"});f.restart();
  assert.deepEqual(resolvePvpDamage(f.db,f.guild,s.target.owner_user_id,choice,{interactionId:"armor-replay"}),effect);
  assert.deepEqual(validatePvpDamageApplication(f.db,f.guild,effect.record_key),effect);
  assert.equal(f.db.getCharacter(s.target.id).data.resources.armor.current,1);assert.equal(f.db.getCharacter(s.target.id).data.resources.hp.current,2);
}));
