/** B.6 real native adapters, synthetic owners/SQLite/dice only. */
import test from "node:test";
import assert from "node:assert/strict";
import {nativeFixture,pvpTerms} from "./v9-fixtures.mjs";
import {attackFixture} from "./v94-pvp-attack-fixtures.mjs";
import {stageDamagePvp,respondDamagePvp,reviewDamagePvp,proposeDamagePvp,reviseDamagePvp} from "../src/pvp-profiles.js";
import {preparePvpAttack,reviewPvpAttack,authorizePvpAttack,rollPvpAttack} from "../src/pvp-attacks.js";
import {rollPvpDamage,preparePvpDamage,reviewPvpDamage,resolvePvpDamage} from "../src/pvp-damage.js";
import {reviewPcDeathMove,choosePcDeathMove,approveBlazeAction} from "../src/pc-death.js";
import {indexWorldEvent} from "../src/city-calendar.js";
import {lockActionWindow} from "../src/scene-action-window.js";
import {fakeInteraction} from "./contract-fixtures.mjs";
import {handleCommand} from "../src/commands.js";
import {establishFearContext,selectFearMove,applyFearMove,fearRevision} from "../src/pvp-fear-moves.js";
import {prepareRollRequest,rollRevision} from "../src/roll-requests.js";
import {contributeRoll} from "../src/roll-collaboration.js";
import {proposePvp,reviewPvp,respondPvp,progressPvp,choosePvp,rollPvp} from "../src/narrative-pvp.js";
import {recordScenePresence} from "../src/scene-continuity.js";
import {preparePvpReaction,reviewPvpReaction,rollPvpReaction} from "../src/pvp-reactions.js";
import {reviewFeatureEffect} from "../src/pc-effects.js";
function staged(f,i,j){return stageDamagePvp(f.db,f.guild,f.accepted(i,`I attempt to strike ${f.pcs[j].name}.`,f.pcs[j].id,{operation:"attack"}));}
function prepare(f,x,actor,target){const s=staged(f,actor,target);assert(s,"Explicit signed edge required");return preparePvpAttack(f.db,f.guild,"gm",{...x.input,attack:s.record_key},{gm:true,interactionId:`group:${s.record_key}`});}
function approve(f,r){for(const id of [r.data.offer.actor,r.data.offer.target]){const pc=f.db.getCharacter(id);
  reviewPvpAttack(f.db,f.guild,pc.owner_user_id,r.record_key);authorizePvpAttack(f.db,f.guild,pc.owner_user_id,
    {attack:r.record_key,expected_revision:r.data.offer_hash},{interactionId:`group-approve:${r.record_key}:${id}`});}return r;}
function roll(f,r,faces=[3,1]){let n=0;return rollPvpAttack(f.db,f.guild,r.data.offer.snapshot.actor_owner,
  {attack:r.record_key,expected_revision:r.data.offer_hash},{rng:()=>faces[n++]});}
const defenses={source:"base",resistance:"none",armor_reduction:1,armor_allowed:true};
function damage(f,r){return rollPvpDamage(f.db,f.guild,r.data.offer.snapshot.actor_owner,{attack_receipt:`${r.record_key}:roll`},{rng:()=>1});}
function offer(f,rows){return preparePvpDamage(f.db,f.guild,"gm",{damage_receipts:rows.map(r=>r.record_key),ruling:"pc-attack",defenses},{gm:true,interactionId:`group-damage:${rows[0].record_key}`});}
function apply(f,o,armor=false){const pc=f.db.getCharacter(o.data.binding.target),v=reviewPvpDamage(f.db,f.guild,pc.owner_user_id,o.record_key);
  return resolvePvpDamage(f.db,f.guild,pc.owner_user_id,{damage:o.record_key,expected_revision:v.revision,armor},{interactionId:`group-armor:${o.record_key}`});}

test("PVM01/PVM05 three owners can take independent elective opportunities in any order, not rigid initiative",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3});
  for(const [a,t] of [[2,0],[0,1],[1,2]]){const r=approve(f,prepare(f,x,a,t)),result=roll(f,r);assert.equal(result.data.result.hit,false);}
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_attack_roll_receipt",includeGM:true}).length,3);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_spotlight_opportunity",includeGM:true}).filter(r=>r.status==="used").length,3);
  for(const pc of f.pcs)assert.equal(f.db.getCharacter(pc.id).data.resources.hope,2);
}));

test("PVM03 a repeated elective attacker must give other eligible peers their opportunity",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3});roll(f,approve(f,prepare(f,x,0,1)));
  assert.throws(()=>prepare(f,x,0,2),/opportunity|spotlight|fair/i);
  roll(f,approve(f,prepare(f,x,2,0)));assert.throws(()=>prepare(f,x,0,1),/opportunity|spotlight|fair/i);
  roll(f,approve(f,prepare(f,x,1,2)));assert(prepare(f,x,0,2));
}));

test("PVM06 two independent attackers lock one target and must aggregate actual simultaneous hits before Armor",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3}),first=approve(f,prepare(f,x,0,1)),second=approve(f,prepare(f,x,2,1));
  roll(f,first,[6,3]);const d1=damage(f,first);
  assert.throws(()=>offer(f,[d1]),/pending|simultaneous|lock|source/i,"Do not adjudicate one half while a native reserved attacker is unresolved");
  roll(f,second,[6,3]);const d2=damage(f,second);
  assert.throws(()=>offer(f,[d1]),/simultaneous|lock|source/i);
  const o=offer(f,[d1,d2]),effect=apply(f,o,true);
  assert.equal(effect.data.damage_after_resistance,8);assert.equal(effect.data.severity,2);assert.equal(effect.data.hp_marks,1);
  assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.armor.current,1);
  assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,1);
  f.restart();assert.deepEqual(apply(f,o,true),effect);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pc_effect_receipt",includeGM:true}).length,1);
}));

test("PVM13 restart/retry does not mint another opportunity, attack or target lock",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3}),r=approve(f,prepare(f,x,0,1)),result=roll(f,r);f.restart();
  assert.deepEqual(rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:r.record_key,expected_revision:r.data.offer_hash},{rng:()=>assert.fail()}),result);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_spotlight_opportunity",includeGM:true}).length,1);
}));

test("PVM09 neutral withdrawal cancels only uncommitted affected actions and peers retain their signed edges",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:4}),r=approve(f,prepare(f,x,0,1)),pc=f.pcs[1];
  respondDamagePvp(f.db,f.guild,pc.owner_user_id,{contract:x.contract.record_key,expected_revision:x.contract.data.terms_hash,decision:"withdraw"},{interactionId:"group-withdraw"});
  assert.equal(f.db.getCityRecord(f.guild,"pvp_attack_request",r.record_key).status,"cancelled");
  assert.throws(()=>roll(f,r),/withdraw|consent|cancel|scope|edge/i);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,0);
  roll(f,approve(f,prepare(f,x,2,3)));assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_attack_roll_receipt",includeGM:true}).length,1);
}));

test("PVM02 four-player teams execute opposing signed edges, never implied friendly fire",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:4,initialTarget:2,configureTerms:t=>{t.interaction_scope="teams";t.participants.forEach((p,i)=>p.team=i<2?"A":"B");
    t.target_permissions=t.target_permissions.filter(e=>t.participants.find(p=>p.character===e.actor).team!==t.participants.find(p=>p.character===e.target).team);}});
  assert.equal(staged(f,0,1),null);assert.equal(staged(f,2,3),null);
  for(const [a,t] of [[3,0],[0,2],[2,1],[1,3]])roll(f,approve(f,prepare(f,x,a,t)));
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_attack_roll_receipt",includeGM:true}).length,4);
}));

test("PVM14 simultaneous last HP creates one owner death choice; dead participant never freezes living peers",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3});f.db.updateCharacterData(f.pcs[1].id,d=>{d.resources.hp.current=5;d.level=1;});
  const a=approve(f,prepare(f,x,0,1)),b=approve(f,prepare(f,x,2,1));roll(f,a,[6,3]);roll(f,b,[6,3]);
  const o=offer(f,[damage(f,a),damage(f,b)]),effect=apply(f,o);
  assert.equal(effect.data.hp_marks,1);assert.equal(f.db.listCityRecords(f.guild,{kind:"pc_death_move_request",includeGM:true}).length,1);
  const pc=f.pcs[1],request=`${o.record_key}:death`,v=reviewPcDeathMove(f.db,f.guild,pc.owner_user_id,request);let n=0;
  choosePcDeathMove(f.db,f.guild,pc.owner_user_id,{request,expected_revision:v.revision,move:"risk_it_all"},{interactionId:"group-death",rng:()=>[1,2][n++]});
  assert.equal(f.db.getCharacter(pc.id).status,"dead");
  const next=approve(f,prepare(f,x,0,2));assert.equal(roll(f,next).data.result.hit,false);
}));

test("PVM09 withdrawn owner may leave without freezing independent current group edges",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:4}),pc=f.pcs[1];
  respondDamagePvp(f.db,f.guild,pc.owner_user_id,{contract:x.contract.record_key,expected_revision:x.contract.data.terms_hash,decision:"withdraw"},{interactionId:"leave-brawl"});
  f.db.updateCharacterData(pc.id,d=>{d.location="elsewhere";});
  assert.equal(roll(f,approve(f,prepare(f,x,2,3))).data.result.hit,false);
}));

test("PVM target-entry locks after actual dice, and generic window APIs cannot fabricate group outcomes",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3}),a=approve(f,prepare(f,x,0,1));roll(f,a,[6,3]);
  assert.throws(()=>prepare(f,x,2,1),/lock|late|entry/i);
  const w=f.db.listCityRecords(f.guild,{kind:"scene_action_window",includeGM:true}).find(r=>r.data.pvp_brawl);
  assert.throws(()=>lockActionWindow(f.db,f.guild,w.record_key,{expected_revision:w.data.revision}),/native|PvP/i);
}));

test("PVM forged opportunity or retracted native review fails before any dice",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3}),a=approve(f,prepare(f,x,0,1));
  const opp=f.db.getCityRecord(f.guild,"pvp_spotlight_opportunity",`${a.record_key}:opportunity`);
  f.db.saveCityRecord(f.guild,{...opp,key:opp.record_key,data:{...opp.data,actor:f.pcs[2].id}});
  assert.throws(()=>roll(f,a),/native|opportunity|source/i);
  f.db.saveCityRecord(f.guild,{...opp,key:opp.record_key});indexWorldEvent(f.db,f.guild,{key:a.source_event,status:"retracted"},"gm");
  assert.throws(()=>roll(f,a),/source|retract|review/i);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_attack_roll_receipt",includeGM:true}).length,0);
}));

test("PVM05 actual private Discord owner can review and relinquish only their own opportunity, no dice/effects",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3});roll(f,approve(f,prepare(f,x,0,1)));
  const call=async(user,op,data)=>{const i=fakeInteraction({gm:false,sub:"pvp",json:{op,...data}});
    Object.assign(i,{id:`brawl-ui:${user}:${op}`,guildId:f.guild,commandName:"vc-roll",isChatInputCommand:()=>true});i.user={id:user,username:user};
    await handleCommand(i,{db:f.db,gm:{}});assert(i.deliveries.every(d=>d.ephemeral&&d.content.length<=2000));return i;};
  const user=f.pcs[1].owner_user_id,v=await call(user,"spotlight-review",{contract:x.contract.record_key});
  const view=JSON.parse(v.deliveries.map(d=>d.content).join("\n").replace(/^```(?:json)?\s*|\s*```$/gu,""));
  assert.equal(view.character,f.pcs[1].id);assert.equal(typeof view.revision,"string");
  await call(f.pcs[3].owner_user_id,"spotlight-pass",{contract:x.contract.record_key,expected_revision:view.revision});
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_spotlight_pass",includeGM:true}).length,0);
  await call(user,"spotlight-pass",{contract:x.contract.record_key,expected_revision:view.revision});
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_spotlight_pass",includeGM:true}).length,1);
  assert.throws(()=>prepare(f,x,0,2),/opportunity|spotlight|fair/i,"Billy still has a meaningful opportunity");
}));

test("PVM06 mutable window membership cannot hide a second committed simultaneous hit",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3}),a=approve(f,prepare(f,x,0,1)),b=approve(f,prepare(f,x,2,1));
  roll(f,a,[6,3]);roll(f,b,[6,3]);const da=damage(f,a);damage(f,b);
  const w=f.db.listCityRecords(f.guild,{kind:"scene_action_window",includeGM:true}).find(r=>r.data.pvp_brawl);
  f.db.saveCityRecord(f.guild,{...w,key:w.record_key,data:{...w.data,pvp_brawl:{...w.data.pvp_brawl,requests:[a.record_key]}}});
  assert.throws(()=>offer(f,[da]),/membership|source|lock|opportunity|window/i);
  assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,0);
}));

test("PVM06 a forged cancelled status cannot remove a real hit from the aggregation without an owner stop source",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3}),a=approve(f,prepare(f,x,0,1)),b=approve(f,prepare(f,x,2,1));
  roll(f,a,[6,3]);roll(f,b,[6,3]);const da=damage(f,a);damage(f,b);
  const saved=f.db.getCityRecord(f.guild,"pvp_attack_request",b.record_key);
  f.db.saveCityRecord(f.guild,{...saved,key:saved.record_key,status:"cancelled"});
  assert.throws(()=>offer(f,[da]),/stop|source|cancel|native/i);
}));

test("PVM04 a pre-reserved simultaneous batch saves two Fear attacks, resolves ordered immediate moves and never banks or grants another attack",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3}),a=approve(f,prepare(f,x,0,1)),b=approve(f,prepare(f,x,2,1)),pool=f.db.getCampaign(f.guild).fear;
  roll(f,b,[3,6]);roll(f,a,[3,6]);const o=offer(f,[damage(f,a),damage(f,b)]);apply(f,o);
  const ts=f.db.listCityRecords(f.guild,{kind:"pvp_fear_trigger",includeGM:true});assert.equal(ts.length,2);assert(ts.every(t=>t.status==="awaiting_move"));
  assert.throws(()=>prepare(f,x,1,0),/Fear|pending/i);
  f.db.changeClock(f.guild,"brawl-closing",0,{max:6,visibility:"party"});
  const c=establishFearContext(f.db,f.guild,"gm",{move_kind:"clock_advance",target_key:"brawl-closing",location_key:"terminal",visibility:"party",subject_key:null},{gm:true,interactionId:"group-fear-context"});
  const select=t=>selectFearMove(f.db,f.guild,"gm",{trigger:t.record_key,expected_revision:f.db.getCityRecord(f.guild,"pvp_fear_trigger",t.record_key).data.revision,context:c.record_key,
    expected_target_revision:fearRevision(f.db.getClock(f.guild,"brawl-closing")),affected_actions:[]},{gm:true,interactionId:`group-fear:${t.record_key}`});
  const first=ts.find(t=>t.data.roller_character===f.pcs[0].id),second=ts.find(t=>t.data.roller_character===f.pcs[2].id);
  assert.throws(()=>select(second),/order/i);
  for(const t of [first,second]){const d=select(t),input={trigger:t.record_key,expected_revision:f.db.getCityRecord(f.guild,"pvp_fear_trigger",t.record_key).data.revision,decision:d.record_key};
    const effect=applyFearMove(f.db,f.guild,"gm",input,{gm:true});assert.deepEqual(applyFearMove(f.db,f.guild,"gm",input,{gm:true}),effect);}
  assert.equal(f.db.getClock(f.guild,"brawl-closing").value,2);assert.equal(f.db.getCampaign(f.guild).fear,pool);
  for(const r of [a,b])assert.equal(f.db.getCityRecord(f.guild,"pvp_attack_request",r.record_key).status,"resolved");
  assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,2);
  assert(prepare(f,x,1,0));
}));

test("PVM08 a declined proposed expansion never conscripts the fourth PC or blocks their ordinary native investigation",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3}),t=structuredClone(x.contract.data.snapshot.terms),pc=f.pcs[3];
  t.participants.push({character:pc.id,team:null});t.stakes.push({character:pc.id,best:"My own objective.",worst:"My own selected death risk."});
  for(const p of f.pcs.slice(0,3))for(const [actor,target] of [[p.id,pc.id],[pc.id,p.id]])t.target_permissions.push({actor,target,effect_class:"attack_damage",max_risk:"lethal"});
  const declaration=f.accepted(0,"I attempt to strike Tyrell.",pc.id,{operation:"attack"}),p=proposeDamagePvp(f.db,f.guild,f.pcs[0].owner_user_id,
    {accepted_intent:declaration.record_key,terms:t},{interactionId:"unaccepted-expansion"});
  const declined=respondDamagePvp(f.db,f.guild,pc.owner_user_id,{contract:p.record_key,expected_revision:p.data.terms_hash,decision:"decline"},{interactionId:"no-expansion"});
  assert.equal(declined.status,"declined");assert.equal(staged(f,0,3),null);
  const a=f.accepted(3,"I investigate the independent terminal panel.","terminal",{type:"search",operation:"search",target:{kind:"location",key:"terminal",phrase:"terminal",grounding:"known"}});
  const r=prepareRollRequest(f.db,f.guild,{accepted_intent:a.record_key,source_event:a.source_event,character_id:pc.id,trait:"Knowledge",kind:"action",adjudication:"Independent terminal investigation",modifier_keys:[]},"gm");let n=0;
  const result=contributeRoll(f.db,f.guild,pc.owner_user_id,{request:r.record_key,expected_revision:rollRevision(r),op:"roll",key:"independent-fourth"},{rng:()=>[9,2][n++]});
  assert.equal(result.status,"resolved");assert.equal(f.db.getCharacter(pc.id).data.resources.hope,3);assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,0);
  assert(prepare(f,x,0,1));
}));

test("PVM10 late join after committed damage requires a new independently signed contract, never rewriting old effects",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3}),r=approve(f,prepare(f,x,0,1));roll(f,r,[6,3]);const effect=apply(f,offer(f,[damage(f,r)]));
  const t=structuredClone(x.contract.data.snapshot.terms),pc=f.pcs[3];t.participants.push({character:pc.id,team:null});
  t.stakes.push({character:pc.id,best:"My own objective.",worst:"My own selected death risk."});
  for(const p of f.pcs.slice(0,3))for(const [actor,target] of [[p.id,pc.id],[pc.id,p.id]])t.target_permissions.push({actor,target,effect_class:"attack_damage",max_risk:"lethal"});
  assert.throws(()=>reviseDamagePvp(f.db,f.guild,f.pcs[0].owner_user_id,{contract:x.contract.record_key,expected_revision:x.contract.data.terms_hash,terms:t},{interactionId:"rewrite-rolled"}),/immutable|attack|started/i);
  for(const p of f.pcs.slice(0,2))respondDamagePvp(f.db,f.guild,p.owner_user_id,{contract:x.contract.record_key,expected_revision:x.contract.data.terms_hash,decision:"withdraw"},{interactionId:`close-old:${p.id}`});
  const a=f.accepted(0,"I attempt a new consented exchange with Tyrell.",pc.id,{operation:"attack"});
  const p=proposeDamagePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:a.record_key,terms:t},{interactionId:"new-four-owner-scope"});
  for(const who of f.pcs){reviewDamagePvp(f.db,f.guild,who.owner_user_id,p.record_key);respondDamagePvp(f.db,f.guild,who.owner_user_id,
    {contract:p.record_key,expected_revision:p.data.terms_hash,decision:"accept"},{interactionId:`new-scope:${who.id}`});}
  f.db.updateCharacterData(pc.id,d=>{d.evasion=12;d.proficiency=2;d.thresholds={major:7,severe:14};d.inventory=structuredClone(f.db.getCharacter(f.pcs[0].id).data.inventory);});
  recordScenePresence(f.db,f.guild,{source_event:"attack-scene",entity_type:"character",entity_key:pc.id,location_key:"terminal",zone:"floor",range:"Melee",visibility:"party",accepted_by:pc.owner_user_id},"gm");
  assert.notEqual(p.data.terms_hash,x.contract.data.terms_hash);const next=prepare(f,x,3,0);roll(f,approve(f,next));
  assert.deepEqual(f.db.getCityRecord(f.guild,"pc_effect_receipt",effect.record_key),effect);assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,1);
}));

test("PVM11 bilateral narrative scoring and a simultaneous damage group never contaminate one another",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3}),actors=f.pcs.slice(2),a=f.accepted(2,"I attempt a harmless feint toward Tyrell.",actors[1].id);
  const p=proposePvp(f.db,f.guild,actors[0].owner_user_id,{accepted_intent:a.record_key,opponent:actors[1].id,terms:pvpTerms(actors)});
  for(const pc of actors){reviewPvp(f.db,f.guild,pc.owner_user_id,p.record_key);respondPvp(f.db,f.guild,pc.owner_user_id,
    {proposal:p.record_key,expected_revision:p.data.terms_hash,decision:"accept",interaction_id:`narrative:${pc.id}`});}
  const input=pc=>{const v=progressPvp(f.db,f.guild,pc.owner_user_id,p.record_key);return {proposal:p.record_key,expected_revision:p.data.terms_hash,
    round:v.round,expected_window_revision:v.window_revision,interaction_id:`mixed:${pc.id}:${v.window_revision}`};};
  for(const pc of actors)choosePvp(f.db,f.guild,pc.owner_user_id,{...input(pc),trait:"Agility",attempt:"I attempt my own harmless feint."});
  for(const pc of actors){let n=0;rollPvp(f.db,f.guild,pc.owner_user_id,input(pc),{rng:()=>[8,2][n++]});}
  const r=approve(f,prepare(f,x,0,1));roll(f,r,[6,3]);apply(f,offer(f,[damage(f,r)]));
  assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,1);
  for(const pc of actors){assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,0);assert.equal(f.db.getCharacter(pc.id).data.resources.hope,2);}
}));

test("PVM native approved Blaze final action is an urgent exception, not another elective monopoly or invented PC response",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3}),pc=f.pcs[1];f.db.updateCharacterData(pc.id,d=>{d.resources.hp.current=5;d.level=1;});
  const r=approve(f,prepare(f,x,0,1));roll(f,r,[6,3]);const o=offer(f,[damage(f,r)]);apply(f,o);
  const request=`${o.record_key}:death`,v=reviewPcDeathMove(f.db,f.guild,pc.owner_user_id,request);
  choosePcDeathMove(f.db,f.guild,pc.owner_user_id,{request,expected_revision:v.revision,move:"blaze_of_glory"},{interactionId:"group-blaze-choice"});
  const a=f.accepted(1,"I attempt my final strike at Jaxon.",f.pcs[0].id,{operation:"attack"});
  f.db.upsertRulesRuling(f.guild,{key:"group-blaze",createdBy:"gm",ruling:"Approve this exact owner-authored final attack with all native target permissions/defenses still required."});
  approveBlazeAction(f.db,f.guild,"gm",{request,accepted_intent:a.record_key,ruling:"group-blaze"},{gm:true,interactionId:"group-blaze-approval"});
  const s=stageDamagePvp(f.db,f.guild,a),final=approve(f,preparePvpAttack(f.db,f.guild,"gm",{...x.input,attack:s.record_key},{gm:true,interactionId:"group-blaze-attack"}));
  const result=rollPvpAttack(f.db,f.guild,pc.owner_user_id,{attack:final.record_key,expected_revision:final.data.offer_hash},{rng:()=>assert.fail("Native automatic Critical, not invented dice")});
  assert.equal(result.data.result.duality,"Critical");apply(f,offer(f,[damage(f,final)]));
  assert.equal(f.db.getCharacter(pc.id).status,"dead");assert.equal(f.db.getCharacter(pc.id).data.resources.hope,2);
}));

test("PVM07 two established effects require distinct owner reactions; no cross-attack result or declaration reuse",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3}),a=approve(f,prepare(f,x,0,1)),b=approve(f,prepare(f,x,2,1));
  roll(f,a,[6,3]);roll(f,b,[6,3]);const pc=f.pcs[1],offers=[];
  f.db.upsertRulesRuling(f.guild,{key:"brawl-hazard",createdBy:"gm",ruling:"Established debris: Agility reaction Difficulty 13, normal success partial, Critical none. No alteration of PC attacks."});
  for(const [i,parent] of [a,b].entries()){
    const source=indexWorldEvent(f.db,f.guild,{key:`brawl-hazard:${i}`,title:`Established debris ${i}`,kind:"environment_hazard",source_id:"gm:gm",visibility:"gm",scene:x.contract.data.scene,
      session_id:f.session.id,location_key:"terminal",details:{reaction_rule:{trait:"Agility",difficulty:13,normal_success:"partial",critical_success:"none",ruling:"brawl-hazard"}}},"gm");
    const action=f.accepted(1,`I attempt to evade debris ${i}.`,"terminal",{type:"roll",operation:"reaction",target:{kind:"location",key:"terminal",phrase:"terminal",grounding:"known"}});
    const offer=preparePvpReaction(f.db,f.guild,"gm",{attack_receipt:`${parent.record_key}:roll`,accepted_intent:action.record_key,trigger:source.event_key,
      ruling:"brawl-hazard",trait:"Agility",modifier_keys:[]},{gm:true,interactionId:`group-reaction:${i}`});offers.push(offer);
    reviewPvpReaction(f.db,f.guild,pc.owner_user_id,offer.record_key);
  }
  for(const [i,o] of offers.entries()){let n=0;const r=rollPvpReaction(f.db,f.guild,pc.owner_user_id,{offer:o.record_key,expected_revision:o.data.digest},
    {interactionId:`separate-reaction:${i}`,rng:()=>[1,2][n++]});assert.equal(n,2);assert.equal(r.data.outcome,"failure_effect_pending");}
  assert.notEqual(offers[0].data.binding.request,offers[1].data.binding.request);
  assert.throws(()=>rollPvpReaction(f.db,f.guild,pc.owner_user_id,{offer:offers[1].record_key,expected_revision:offers[0].data.digest},{interactionId:"borrow-result",rng:()=>assert.fail()}),/revision|exact/i);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_fear_trigger",includeGM:true}).length,0);assert.equal(f.db.getCharacter(pc.id).data.resources.hope,2);
}));

test("PVM12 unsupported multi-target feature never partially damages a nonconsenting PC or mints group receipts",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3});assert.equal(staged(f,0,3),null);
  f.db.updateCharacterData(f.pcs[0].id,d=>{d.domain_cards=[{name:"Unmapped Wave",active:true}];});
  const s=staged(f,0,1);assert.throws(()=>preparePvpAttack(f.db,f.guild,"gm",{...x.input,attack:s.record_key,kind:"feature",weapon:null,trait:"Knowledge"},
    {gm:true,interactionId:"atomic-unmapped-wave"}),/mapping|feature|unsupported/i);
  for(const kind of ["pvp_attack_request","pvp_spotlight_opportunity","pvp_attack_roll_receipt","pc_effect_receipt"])
    assert.equal(f.db.listCityRecords(f.guild,{kind,includeGM:true}).length,0);
  for(const pc of f.pcs)assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,0);
}));

test("PVM reservation persistence failure rolls back native windows, source, pointer and opportunity together",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3}),save=f.db.saveCityRecord.bind(f.db);
  f.db.saveCityRecord=(g,r)=>{if(r.kind==="pvp_spotlight_opportunity")throw new Error("synthetic opportunity failure");return save(g,r);};
  assert.throws(()=>prepare(f,x,0,1),/synthetic opportunity/);f.db.saveCityRecord=save;
  for(const kind of ["pvp_attack_request","pvp_target_lock","scene_action_window","pvp_spotlight_opportunity"])
    assert.equal(f.db.listCityRecords(f.guild,{kind,includeGM:true}).length,0);
  assert(prepare(f,x,0,1));
}));

test("PVM committed roll/opportunity failure rolls back dice and preserves the same private approvals for retry",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3}),r=approve(f,prepare(f,x,0,1)),save=f.db.saveCityRecord.bind(f.db);
  f.db.saveCityRecord=(g,row)=>{if(row.kind==="pvp_spotlight_opportunity"&&row.status==="used")throw new Error("synthetic consume failure");return save(g,row);};
  assert.throws(()=>roll(f,r),/synthetic consume/);f.db.saveCityRecord=save;
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_attack_roll_receipt",includeGM:true}).length,0);
  assert.equal(f.db.getCityRecord(f.guild,"pvp_spotlight_opportunity",`${r.record_key}:opportunity`).status,"reserved");
  assert.equal(roll(f,r).data.result.hit,false);
}));

test("PVM group execution policy must be included in newly signed terms, never inferred from legacy group consent",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3}),terms=structuredClone(x.contract.data.snapshot.terms);delete terms.spotlight_policy;
  const a=f.accepted(0,"I attempt a newly proposed clash with Choso.",f.pcs[1].id,{operation:"attack"});
  assert.throws(()=>proposeDamagePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:a.record_key,terms},{interactionId:"missing-group-policy"}),/spotlight|policy|explicit/i);
}));

test("PVM a malformed Fear ancestor cannot authorize a reserved sibling roll before native proof",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3}),a=approve(f,prepare(f,x,0,1)),b=approve(f,prepare(f,x,2,1));roll(f,a,[3,6]);
  const t=f.db.listCityRecords(f.guild,{kind:"pvp_fear_trigger",includeGM:true})[0];
  f.db.saveCityRecord(f.guild,{...t,key:t.record_key,data:{...t.data,attack_receipt:"made-up-native-receipt"}});let n=0;
  assert.throws(()=>rollPvpAttack(f.db,f.guild,f.pcs[2].owner_user_id,{attack:b.record_key,expected_revision:b.data.offer_hash},
    {rng:()=>[3,6][n++]}),/native|Fear|source/i);
  assert.equal(n,0);assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_attack_roll_receipt",includeGM:true}).length,1);
}));

test("PVM even an owner who is GM cannot turn the native PvP reservation source into a Hope-generating feature",()=>nativeFixture(async f=>{
  const x=await attackFixture(f,{count:3}),pc=f.pcs[0];f.db.updateCharacterData(pc.id,d=>{d.domain_cards=["Synthetic Ordinary Hope Feature"];});
  const r=preparePvpAttack(f.db,f.guild,pc.owner_user_id,x.input,{gm:true,interactionId:"owner-gm-reservation"});
  const opp=f.db.getCityRecord(f.guild,"pvp_spotlight_opportunity",`${r.record_key}:opportunity`);
  assert.throws(()=>reviewFeatureEffect(f.db,f.guild,pc.owner_user_id,{character:pc.id,feature:"Synthetic Ordinary Hope Feature",ruling:"pc-attack",
    source:opp.source_event,resource:"hope",amount:1},{gm:true,interactionId:"no-reservation-hope"}),/PvP|zero Hope/i);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hope,2);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pc_effect_authority",includeGM:true}).length,0);
}));
