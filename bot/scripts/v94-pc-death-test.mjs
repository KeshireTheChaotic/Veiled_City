import test from "node:test";
import assert from "node:assert/strict";
import {nativeFixture} from "./v9-fixtures.mjs";
import {fallenFixture} from "./v94-death-fixtures.mjs";
import {applyRollOutcome} from "../src/roll-collaboration.js";
import {preparePvpAttack,reviewPvpAttack,authorizePvpAttack,rollPvpAttack} from "../src/pvp-attacks.js";
import {stageDamagePvp} from "../src/pvp-profiles.js";
import {rollPvpDamage,preparePvpDamage,reviewPvpDamage,resolvePvpDamage} from "../src/pvp-damage.js";
import {attackFixture} from "./v94-pvp-attack-fixtures.mjs";
import {indexWorldEvent} from "../src/city-calendar.js";
import {fakeInteraction} from "./contract-fixtures.mjs";
import {handleCommand} from "../src/commands.js";
import {prepareRollRequest,rollRevision} from "../src/roll-requests.js";
import {contributeRoll} from "../src/roll-collaboration.js";
import {incomingFixture} from "./v94-incoming-fixtures.mjs";
import {prepareIncomingAttack,reviewIncomingAttack,confirmIncomingDefense,rollIncomingAttack,resolveIncomingDamage} from "../src/pc-incoming.js";
const api=()=>import("../src/pc-death.js");
async function choose(f,move,faces){const x=await fallenFixture(f),a=await api(),user=f.pcs[1].owner_user_id;
  const review=a.reviewPcDeathMove(f.db,f.guild,user,x.request.record_key);let n=0;
  const outcome=a.choosePcDeathMove(f.db,f.guild,user,{request:x.request.record_key,expected_revision:review.revision,move},{interactionId:`choice:${move}`,rng:()=>faces[n++]});
  return {...x,a,outcome,count:()=>n};}
test("PVD20 final HP must await owner death move before dependent attack terminal",()=>nativeFixture(async f=>{
  const x=await fallenFixture(f);assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_action_terminal_receipt",includeGM:true}).length,0);
  assert.equal(f.db.getCityRecord(f.guild,"pvp_attack_request",x.attack.record_key).status,"damage_applied");
}));
test("PVD20 Risk It All Hope saves actual dice and waits for owner HP/Stress allocation, no Hope award",()=>nativeFixture(async f=>{
  const {a,outcome,count,request}=await choose(f,"risk_it_all",[4,2]);assert.equal(count(),2);assert.equal(outcome.status,"awaiting_allocation");
  assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,6);assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hope,2);
  const allocated=a.allocatePcDeathRecovery(f.db,f.guild,f.pcs[1].owner_user_id,{request:request.record_key,expected_revision:outcome.data.digest,hp:3,stress:1},{interactionId:"allocation"});
  assert.equal(allocated.status,"resolved");assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,3);assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.stress.current,1);
}));
test("PVD20 Risk It All matching dice use vanilla death recovery, not action-roll critical bonus; no Hope/Fear",()=>nativeFixture(async f=>{
  const {outcome,count}=await choose(f,"risk_it_all",[2,2]);assert.equal(count(),2);assert.equal(outcome.status,"resolved");
  const r=f.db.getCharacter(f.pcs[1].id).data.resources;assert.equal(r.hp.current,0);assert.equal(r.stress.current,0);assert.equal(r.hope,2);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_fear_trigger",includeGM:true}).length,0);
}));
test("PVD20 Risk It All Fear records owner-chosen native death once; no GM choice or extra Fear move",()=>nativeFixture(async f=>{
  const {outcome,count}=await choose(f,"risk_it_all",[2,4]);assert.equal(count(),2);assert.equal(outcome.status,"resolved");assert.equal(outcome.data.result,"dead");
  assert.equal(f.db.getCharacter(f.pcs[1].id).status,"dead");assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_fear_trigger",includeGM:true}).length,0);
}));
for(const [face,scar] of [[1,true],[12,false]])test(`PVD20 Avoid Death native unconscious and scar=${scar}, no authored scar story`,()=>nativeFixture(async f=>{
  const {outcome,count}=await choose(f,"avoid_death",[face]);assert.equal(count(),1);assert.equal(outcome.data.result,"unconscious");
  const pc=f.db.getCharacter(f.pcs[1].id);assert.equal(pc.data.death_state.status,"unconscious");assert.equal(pc.data.resources.hope_max,scar?5:6);assert.equal(pc.data.resources.hp.current,6);
  assert.equal(outcome.data.scar,scar);assert.equal(outcome.data.scar_description,undefined);
}));
test("PVD20 Blaze of Glory is owner-selected pending final action, not immediate GM-authored death or fabricated dice",()=>nativeFixture(async f=>{
  const {outcome,count}=await choose(f,"blaze_of_glory",[]);assert.equal(count(),0);assert.equal(outcome.status,"awaiting_final_action");
  assert.equal(f.db.getCharacter(f.pcs[1].id).status,"active");assert.equal(f.db.getCharacter(f.pcs[1].id).data.death_state.status,"blaze_pending");
}));
test("PVD20 foreign owner, absent review, stale revision and retracted cause cannot choose or roll",()=>nativeFixture(async f=>{
  const x=await fallenFixture(f),a=await api(),input={request:x.request.record_key,expected_revision:x.request.data.digest,move:"risk_it_all"};
  for(const user of ["gm",f.pcs[0].owner_user_id])assert.throws(()=>a.choosePcDeathMove(f.db,f.guild,user,input,{interactionId:"foreign",rng:()=>assert.fail()}),/owner|owned|assignment/i);
  assert.throws(()=>a.choosePcDeathMove(f.db,f.guild,f.pcs[1].owner_user_id,input,{interactionId:"unreviewed",rng:()=>assert.fail()}),/review/i);
  assert.equal(f.db.getCharacter(f.pcs[1].id).status,"active");
}));
test("PVD20 saved death dice cannot be relabeled as generic Critical resources; restart does not reroll",()=>nativeFixture(async f=>{
  const {a,request,outcome}=await choose(f,"risk_it_all",[1,1]),user=f.pcs[1].owner_user_id;
  const roll=f.db.getSavedRoll(f.guild,outcome.data.roll);applyRollOutcome(f.db,f.guild,f.session.id,[f.pcs[1].id],roll.payload);
  assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hope,2);f.restart();
  const prior=a.choosePcDeathMove(f.db,f.guild,user,{request:request.record_key,expected_revision:request.data.digest,move:"risk_it_all"},{interactionId:"retry",rng:()=>assert.fail()});
  assert.deepEqual(prior,outcome);
}));
test("PVD20 unconscious targets cannot be attacked; other independent native attacks are not frozen",()=>nativeFixture(async f=>{
  const x=await attackFixture(f);f.db.updateCharacterData(f.pcs[1].id,d=>{d.death_state={status:"unconscious"};});
  assert.throws(()=>preparePvpAttack(f.db,f.guild,"gm",x.input,{gm:true,interactionId:"unconscious-target"}),/unconscious|death|cannot/i);
}));
test("PVD20 stale private review and revoked death cause reject without RNG or automatic choice",()=>nativeFixture(async f=>{
  const x=await fallenFixture(f),a=await api(),user=f.pcs[1].owner_user_id,view=a.reviewPcDeathMove(f.db,f.guild,user,x.request.record_key);
  const input={request:x.request.record_key,expected_revision:view.revision,move:"risk_it_all"};
  assert.throws(()=>a.choosePcDeathMove(f.db,f.guild,user,{...input,expected_revision:"stale"},{interactionId:"stale",rng:()=>assert.fail()}),/revision/i);
  f.db.updateCharacterData(f.pcs[1].id,d=>{d.resources.stress.current++;});
  assert.throws(()=>a.choosePcDeathMove(f.db,f.guild,user,input,{interactionId:"stale-sheet",rng:()=>assert.fail()}),/stale|compare/i);
  indexWorldEvent(f.db,f.guild,{key:x.offer.source_event,status:"retracted"},"gm");
  assert.throws(()=>a.reviewPcDeathMove(f.db,f.guild,user,x.request.record_key),/source|review/i);
  assert.equal(f.db.getCharacter(f.pcs[1].id).status,"active");
}));
test("PVD20 scar cap constrains ordinary non-PvP Hope but leaves normal Critical Stress rule intact",()=>nativeFixture(async f=>{
  f.db.updateCharacterData(f.pcs[0].id,d=>{d.resources.hope_max=5;d.resources.hope=5;});
  applyRollOutcome(f.db,f.guild,f.session.id,[f.pcs[0].id],{duality:"Critical"});
  const r=f.db.getCharacter(f.pcs[0].id).data.resources;assert.equal(r.hope,5);assert.equal(r.stress.current,1);
}));
test("PVD20 allocation proof rejects a private record rewrite without exact owner source/mutation",()=>nativeFixture(async f=>{
  const {a,outcome,request}=await choose(f,"risk_it_all",[4,2]),user=f.pcs[1].owner_user_id;
  const row=a.allocatePcDeathRecovery(f.db,f.guild,user,{request:request.record_key,expected_revision:outcome.data.digest,hp:3,stress:1},{interactionId:"proof"});
  const {createHash}=await import("node:crypto"),{digest,...material}=row.data;material.allocation.hp=4;
  f.db.saveCityRecord(f.guild,{...row,key:row.record_key,data:{...material,digest:createHash("sha256").update(JSON.stringify(material)).digest("hex")}});
  assert.throws(()=>a.validatePcDeathOutcome(f.db,f.guild,row.record_key),/allocation|mutation|source|recovery/i);
}));
test("PVD20 actual Discord death review/choice stays private and never grants a foreign owner selection",()=>nativeFixture(async f=>{
  const x=await fallenFixture(f),user=f.pcs[1].owner_user_id;
  const call=async(who,op,data)=>{const i=fakeInteraction({sub:"effect",json:{op,...data}});
    Object.assign(i,{id:`death-ui:${who}:${op}`,guildId:f.guild,commandName:"vc-roll",isChatInputCommand:()=>true});i.user={id:who,username:who};
    await handleCommand(i,{db:f.db,gm:{}});return i;};
  const review=await call(user,"death-review",{request:x.request.record_key});assert.match(JSON.stringify(review.deliveries),/Risk It All/);
  assert(review.deliveries.every(d=>d.ephemeral&&d.content.length<=2000));
  const input={request:x.request.record_key,expected_revision:x.request.data.digest,move:"blaze_of_glory"};
  await call(f.pcs[0].owner_user_id,"death-choose",input);
  assert.equal(f.db.getCityRecord(f.guild,"pc_death_move_request",x.request.record_key).status,"awaiting_owner");
  const chosen=await call(user,"death-choose",input);assert(chosen.deliveries.every(d=>d.ephemeral&&d.content.length<=2000));
  assert.equal(f.db.getCityRecord(f.guild,"pc_death_move_request",x.request.record_key).status,"awaiting_final_action");
}));

test("PVD20 Discord Hope recovery review supplies only its owner the exact native allocation revision and budget",()=>nativeFixture(async f=>{
  const {outcome,request}=await choose(f,"risk_it_all",[4,2]),pc=f.pcs[1];
  const call=async(who,op,data)=>{const i=fakeInteraction({gm:false,sub:"effect",json:{op,...data}});
    Object.assign(i,{id:`allocation-ui:${who}:${op}`,guildId:f.guild,commandName:"vc-roll",isChatInputCommand:()=>true});i.user={id:who,username:who};
    await handleCommand(i,{db:f.db,gm:{}});return i;};
  const review=await call(pc.owner_user_id,"death-review",{request:request.record_key});
  assert(review.deliveries.every(d=>d.ephemeral&&d.content.length<=2000));
  const text=review.deliveries.map(d=>d.content).join("\n"),view=JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/gu,""));
  assert.equal(view.status,"awaiting_allocation");assert.equal(view.revision,outcome.data.digest);
  assert.deepEqual(view.recovery,{budget:4,hp_marked:6,stress_marked:2});
  const foreign=await call(f.pcs[0].owner_user_id,"death-review",{request:request.record_key});
  assert(!JSON.stringify(foreign.deliveries).includes(outcome.data.digest));
  assert(!JSON.stringify(foreign.deliveries).includes('"recovery"'));
  assert(foreign.deliveries.every(d=>d.ephemeral));
  await call(pc.owner_user_id,"death-allocate",{request:request.record_key,expected_revision:view.revision,hp:3,stress:1});
  assert.equal(f.db.getCityRecord(f.guild,"pc_death_move_request",request.record_key).status,"resolved");
  const r=f.db.getCharacter(pc.id).data.resources;assert.equal(r.hp.current,3);assert.equal(r.stress.current,1);
}));
test("PVD20 owner-authored GM-approved Blaze final action uses native automatic Critical, no fabricated dice or Hope; then dies once",()=>nativeFixture(async f=>{
  const {a,request}=await choose(f,"blaze_of_glory",[]),pc=f.pcs[1];
  const action=f.accepted(1,"I attempt to throw the emergency lever.","terminal",{type:"other",operation:"operate",
    target:{kind:"location",key:"terminal",phrase:"terminal",grounding:"known"}});
  f.db.upsertRulesRuling(f.guild,{key:"blaze-lever",createdBy:"gm",ruling:"Approve this exact owner-authored final lever action under Blaze of Glory."});
  const input={request:request.record_key,accepted_intent:action.record_key,ruling:"blaze-lever"};
  assert.throws(()=>a.approveBlazeAction(f.db,f.guild,pc.owner_user_id,input,{interactionId:"not-gm"}),/GM|review/i);
  a.approveBlazeAction(f.db,f.guild,"gm",input,{gm:true,interactionId:"approve-blaze"});
  const roll=prepareRollRequest(f.db,f.guild,{accepted_intent:action.record_key,source_event:action.source_event,character_id:pc.id,
    trait:"Strength",kind:"action",adjudication:"Approved exact final action",modifier_keys:[]},"gm");
  assert.equal(roll.data.input.private_result,true,"Native final-action/death outcome defaults private even with a party declaration");
  const contribution={request:roll.record_key,expected_revision:rollRevision(roll),op:"roll",key:"owner-final-lever"};
  const result=contributeRoll(f.db,f.guild,pc.owner_user_id,contribution,{rng:()=>assert.fail("Blaze is native automatic Critical, not fabricated matching dice")});
  assert.equal(result.status,"resolved");assert.equal(result.data.result.duality,"Critical");assert.equal(result.data.result.hope,undefined);
  assert.equal(result.data.result.fear,undefined);assert.equal(f.db.getCharacter(pc.id).status,"dead");assert.equal(f.db.getCharacter(pc.id).data.resources.hope,2);
  assert.equal(f.db.getCityRecord(f.guild,"pc_death_move_request",request.record_key).status,"resolved");
  f.restart();assert.deepEqual(a.choosePcDeathMove(f.db,f.guild,pc.owner_user_id,{request:request.record_key,
    expected_revision:request.data.digest,move:"blaze_of_glory"},{interactionId:"saved-blaze-retry",rng:()=>assert.fail()}).status,"resolved");
  const native=f.db.getSavedRoll(f.guild,result.data.roll_id),{auto_critical,...stripped}=native.payload;
  applyRollOutcome(f.db,f.guild,f.session.id,[pc.id],stripped);
  assert.equal(f.db.getCharacter(pc.id).data.resources.hope,2,"Native final-action Critical cannot be relabeled for Hope");
  assert.equal(f.db.getCharacter(pc.id).data.resources.stress.current,2);
}));
test("PVD20 Blaze PC attack retains both-owner live risk approvals, actual damage dice and Armor; never death before committed final effect",()=>nativeFixture(async f=>{
  const {a,request}=await choose(f,"blaze_of_glory",[]),pc=f.pcs[1],target=f.pcs[0];
  const action=f.accepted(1,"I attempt one final strike at Jaxon.",target.id,{operation:"attack"});
  f.db.upsertRulesRuling(f.guild,{key:"blaze-strike",createdBy:"gm",ruling:"Approve the exact owned Blade final attack, native attack/target defenses/damage still required."});
  a.approveBlazeAction(f.db,f.guild,"gm",{request:request.record_key,accepted_intent:action.record_key,ruling:"blaze-strike"},{gm:true,interactionId:"approve-strike"});
  const staged=stageDamagePvp(f.db,f.guild,action),attack=preparePvpAttack(f.db,f.guild,"gm",{attack:staged.record_key,kind:"weapon",weapon:"Practice Blade",
    trait:"Finesse",modifier_keys:[],ruling:"pc-attack"},{gm:true,interactionId:"final-attack"});
  for(const p of [pc,target]){reviewPvpAttack(f.db,f.guild,p.owner_user_id,attack.record_key);authorizePvpAttack(f.db,f.guild,p.owner_user_id,
    {attack:attack.record_key,expected_revision:attack.data.offer_hash},{interactionId:`final-approve:${p.id}`});}
  const roll=rollPvpAttack(f.db,f.guild,pc.owner_user_id,{attack:attack.record_key,expected_revision:attack.data.offer_hash},{rng:()=>assert.fail()});
  assert.equal(roll.data.result.duality,"Critical");assert.equal(roll.data.result.hope,undefined);assert.equal(f.db.getCharacter(pc.id).status,"active");
  let n=0;const damage=rollPvpDamage(f.db,f.guild,pc.owner_user_id,{attack_receipt:roll.record_key},{rng:()=>{n++;return 1;}});assert.equal(n,2);
  const offer=preparePvpDamage(f.db,f.guild,"gm",{damage_receipts:[damage.record_key],ruling:"death-damage",defenses:{source:"base",resistance:"none",armor_reduction:1,armor_allowed:true}},
    {gm:true,interactionId:"final-damage"});
  const view=reviewPvpDamage(f.db,f.guild,target.owner_user_id,offer.record_key);
  const effect=resolvePvpDamage(f.db,f.guild,target.owner_user_id,{damage:offer.record_key,expected_revision:view.revision,armor:true},{interactionId:"final-armor"});
  assert.equal(effect.data.hp_marks,2);assert.equal(f.db.getCharacter(pc.id).status,"dead");assert.equal(f.db.getCharacter(target.id).data.resources.hp.current,2);
  f.restart();assert.deepEqual(resolvePvpDamage(f.db,f.guild,target.owner_user_id,{damage:offer.record_key,expected_revision:view.revision,armor:true},{interactionId:"final-armor-retry"}),effect);
  for(const p of [pc,target])assert.equal(f.db.getCharacter(p.id).data.resources.hope,2);
}));
test("PVD20 real incoming NPC last HP uses the same owner death workflow; saved fatal result never rerolls/reapplies",()=>nativeFixture(async f=>{
  const x=incomingFixture(f),a=await api();f.db.updateCharacterData(x.pc.id,d=>{d.resources.hp.current=5;});
  const attack=prepareIncomingAttack(f.db,f.guild,"gm",x.input,{gm:true,interactionId:"npc-final",library:x.lib});
  reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{library:x.lib});confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,attack.record_key);
  rollIncomingAttack(f.db,f.guild,"gm",attack.record_key,{gm:true,library:x.lib,rng:s=>s===20?20:1});
  const effect=resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{armor:false,library:x.lib});
  const request=f.db.getCityRecord(f.guild,"pc_death_move_request",`${attack.record_key}:death`),view=a.reviewPcDeathMove(f.db,f.guild,x.pc.owner_user_id,request.record_key);
  let n=0;const result=a.choosePcDeathMove(f.db,f.guild,x.pc.owner_user_id,{request:request.record_key,expected_revision:view.revision,move:"risk_it_all"},
    {interactionId:"npc-death-choice",rng:()=>[2,3][n++]});assert.equal(result.data.result,"dead");assert.equal(n,2);
  f.restart();assert.deepEqual(resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{armor:false,library:x.lib}),effect);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,6);
}));
test("PVD20 Risk It All recovery caps at actual marked slots, never blocks a high Hope die on excess recovery",()=>nativeFixture(async f=>{
  const {a,request,outcome}=await choose(f,"risk_it_all",[12,1]);
  const result=a.allocatePcDeathRecovery(f.db,f.guild,f.pcs[1].owner_user_id,{request:request.record_key,expected_revision:outcome.data.digest,hp:6,stress:2},{interactionId:"excess-recovery"});
  assert.equal(result.status,"resolved");const r=f.db.getCharacter(f.pcs[1].id).data.resources;assert.equal(r.hp.current,0);assert.equal(r.stress.current,0);
}));
test("PVD20 legacy full marked HP cannot authorize travel/dice or invent death receipts; independent healthy PC still acts",()=>nativeFixture(async f=>{
  const {assertPcCanAct}=await import("../src/pc-native-eligibility.js");
  f.db.updateCharacterData(f.pcs[1].id,d=>{d.resources.hp.current=6;});
  assert.throws(()=>assertPcCanAct(f.db.getCharacter(f.pcs[1].id)),/death|cannot/i);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pc_death_move_request",includeGM:true}).length,0);
  assert.equal(assertPcCanAct(f.db.getCharacter(f.pcs[2].id)).id,f.pcs[2].id);
}));
test("PVD20 unconscious PC cannot roll, while an independent Billy native action still rolls and gains ordinary Hope",()=>nativeFixture(async f=>{
  await choose(f,"avoid_death",[12]);
  const build=actor=>{const action=f.accepted(actor,"I attempt to lift the lever.","terminal",{type:"other",operation:"operate",target:{kind:"location",key:"terminal",phrase:"terminal",grounding:"known"}});
    return prepareRollRequest(f.db,f.guild,{source_event:action.source_event,accepted_intent:action.record_key,character_id:f.pcs[actor].id,
      trait:"Strength",kind:"action",adjudication:"Independent ordinary action",modifier_keys:[]},"gm");};
  assert.throws(()=>build(1),/cannot|unconscious/i);const request=build(2);let n=0;
  const result=contributeRoll(f.db,f.guild,f.pcs[2].owner_user_id,{op:"roll",key:"billy-independent",request:request.record_key,expected_revision:rollRevision(request)},
    {rng:()=>[9,2][n++]});assert.equal(n,2);assert.equal(result.status,"resolved");assert.equal(f.db.getCharacter(f.pcs[2].id).data.resources.hope,3);
}));
test("PVD20 Risk It All permits source-verified all-Stress recovery without inventing a mandatory HP allocation",()=>nativeFixture(async f=>{
  const {a,request,outcome}=await choose(f,"risk_it_all",[2,1]),pc=f.pcs[1];
  a.allocatePcDeathRecovery(f.db,f.guild,pc.owner_user_id,{request:request.record_key,expected_revision:outcome.data.digest,hp:0,stress:2},{interactionId:"all-stress"});
  const action=f.accepted(1,"I attempt to lift the lever.","terminal",{type:"other",operation:"operate",target:{kind:"location",key:"terminal",phrase:"terminal",grounding:"known"}});
  const next=prepareRollRequest(f.db,f.guild,{source_event:action.source_event,accepted_intent:action.record_key,character_id:pc.id,
    trait:"Strength",kind:"action",adjudication:"Standing after native owner recovery",modifier_keys:[]},"gm");
  assert.equal(next.status,"pending");assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,6);
  // A model-like flag is not source proof and must not recover a legacy invalid sheet.
  f.db.updateCharacterData(f.pcs[2].id,d=>{d.resources.hp.current=6;d.death_state={status:"recovered",request:request.record_key};});
  const {assertPcCanAct}=await import("../src/pc-native-eligibility.js");
  assert.throws(()=>assertPcCanAct(f.db.getCharacter(f.pcs[2].id),f.db,f.guild),/native|cannot|owner|character/i);
}));
test("PVD20 forged resolved status cannot bypass pending native recovery allocation",()=>nativeFixture(async f=>{
  const {a,outcome}=await choose(f,"risk_it_all",[4,1]);
  f.db.saveCityRecord(f.guild,{...outcome,key:outcome.record_key,status:"resolved"});
  assert.throws(()=>a.validatePcDeathOutcome(f.db,f.guild,outcome.record_key),/status|allocation|lifecycle/i);
}));
test("PVD20 unsupported native death features hold before dice instead of silently discarding vanilla options",()=>nativeFixture(async f=>{
  const x=await fallenFixture(f),a=await api(),pc=f.pcs[1];
  f.db.updateCharacterData(pc.id,d=>{d.inventory.push({name:"Hallowed Heroplate",equipped:true});});
  const view=a.reviewPcDeathMove(f.db,f.guild,pc.owner_user_id,x.request.record_key);
  assert.throws(()=>a.choosePcDeathMove(f.db,f.guild,pc.owner_user_id,{request:x.request.record_key,expected_revision:view.revision,move:"risk_it_all"},
    {interactionId:"unmapped-death",rng:()=>assert.fail("Hold before any death dice")}),/mapping|feature|review/i);
  assert.equal(f.db.getCityRecord(f.guild,"pc_death_move_request",x.request.record_key).status,"awaiting_owner");
}));
test("PVD20 failed death receipt atomically rolls back native dice, choice, scar and character status",()=>nativeFixture(async f=>{
  const x=await fallenFixture(f),a=await api(),pc=f.pcs[1];
  assert.equal(x.request.status,"awaiting_owner");
  const oldSave=f.db.saveCityRecord.bind(f.db);f.db.saveCityRecord=(g,r)=>{if(r.kind==="pc_death_outcome")throw new Error("synthetic death receipt failure");return oldSave(g,r);};
  const view=a.reviewPcDeathMove(f.db,f.guild,pc.owner_user_id,x.request.record_key);
  const before=f.db.getCharacter(pc.id);
  assert.throws(()=>a.choosePcDeathMove(f.db,f.guild,pc.owner_user_id,{request:x.request.record_key,expected_revision:view.revision,move:"avoid_death"},
    {interactionId:"rollback-death",rng:()=>1}),/synthetic/);
  f.db.saveCityRecord=oldSave;
  assert.deepEqual(f.db.getCharacter(pc.id),before);assert.equal(f.db.getWorldEvent(f.guild,`${x.request.record_key}:choice`),null);
}));
test("PVD20 Avoid Death crossing out last Hope slot ends journey once, never adds a scar story",()=>nativeFixture(async f=>{
  const x=await fallenFixture(f,{setup:f=>f.db.updateCharacterData(f.pcs[1].id,d=>{d.resources.hope_max=1;d.resources.hope=1;})}),a=await api(),pc=f.pcs[1];
  const view=a.reviewPcDeathMove(f.db,f.guild,pc.owner_user_id,x.request.record_key),result=a.choosePcDeathMove(f.db,f.guild,pc.owner_user_id,
    {request:x.request.record_key,expected_revision:view.revision,move:"avoid_death"},{interactionId:"last-hope-slot",rng:()=>1});
  assert.equal(result.data.result,"journey_ended");assert.equal(f.db.getCharacter(pc.id).status,"dead");
  assert.equal(f.db.getCharacter(pc.id).data.resources.hope_max,0);assert.equal(f.db.getCharacter(pc.id).data.resources.hope,0);
  f.restart();assert.deepEqual(a.validatePcDeathOutcome(f.db,f.guild,result.record_key),result);
  assert.equal(result.data.scar_description,undefined);
}));
test("PVD20 further native NPC damage against standing all-Stress recovery opens a fresh owner death choice, not stale recovery permission",()=>nativeFixture(async f=>{
  const {a,request,outcome}=await choose(f,"risk_it_all",[2,1]),pc=f.pcs[1];
  a.allocatePcDeathRecovery(f.db,f.guild,pc.owner_user_id,{request:request.record_key,expected_revision:outcome.data.digest,hp:0,stress:2},{interactionId:"standing-recovery"});
  const x=incomingFixture(f),attack=prepareIncomingAttack(f.db,f.guild,"gm",x.input,{gm:true,interactionId:"standing-incoming",library:x.lib});
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,attack.record_key,{library:x.lib});confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,attack.record_key);
  rollIncomingAttack(f.db,f.guild,"gm",attack.record_key,{gm:true,library:x.lib,rng:s=>s===20?20:1});
  resolveIncomingDamage(f.db,f.guild,pc.owner_user_id,attack.record_key,{armor:false,library:x.lib});
  const next=f.db.getCityRecord(f.guild,"pc_death_move_request",`${attack.record_key}:death`);assert.equal(next.status,"awaiting_owner");
  assert.equal(f.db.getCharacter(pc.id).data.death_state.request,next.record_key);
  const {assertPcCanAct}=await import("../src/pc-native-eligibility.js");assert.throws(()=>assertPcCanAct(f.db.getCharacter(pc.id),f.db,f.guild),/cannot|death/i);
  const v=a.reviewPcDeathMove(f.db,f.guild,pc.owner_user_id,next.record_key);assert.equal(v.request,next.record_key);
}));
test("PVD20 unconscious owner cannot bypass native death state with the raw Discord Duality command",()=>nativeFixture(async f=>{
  await choose(f,"avoid_death",[12]);const pc=f.pcs[1],before=f.db.db.prepare("SELECT COUNT(*) n FROM rolls WHERE guild_id=?").get(f.guild).n;
  const i=fakeInteraction({sub:"duality",json:{}});Object.assign(i,{id:"unconscious-raw-roll",guildId:f.guild,commandName:"vc-roll",isChatInputCommand:()=>true});
  i.options.getBoolean=()=>false;i.options.getInteger=()=>0;
  i.user={id:pc.owner_user_id,username:"Choso owner"};await handleCommand(i,{db:f.db,gm:{}});
  assert.equal(f.db.db.prepare("SELECT COUNT(*) n FROM rolls WHERE guild_id=?").get(f.guild).n,before,"No raw dice or generic reward before execution eligibility");
  assert.match(JSON.stringify(i.deliveries),/cannot|unconscious|death/);
}));
test("PVD20 committed fatal PvP damage remains read-only replayable after owner-selected death; no fresh permission",()=>nativeFixture(async f=>{
  const {effect,offer}=await choose(f,"risk_it_all",[1,2]),pc=f.pcs[1];assert.equal(f.db.getCharacter(pc.id).status,"dead");f.restart();
  assert.deepEqual(resolvePvpDamage(f.db,f.guild,pc.owner_user_id,{damage:offer.record_key,expected_revision:offer.data.digest,armor:false},
    {interactionId:"fatal-damage-replay"}),effect);
  assert.equal(reviewPvpDamage(f.db,f.guild,pc.owner_user_id,offer.record_key).effect,effect.record_key);
  assert.throws(()=>resolvePvpDamage(f.db,f.guild,f.pcs[0].owner_user_id,{damage:offer.record_key,expected_revision:offer.data.digest,armor:false},
    {interactionId:"foreign-fatal-replay"}),/owner|owned|current/i);
  assert.equal(f.db.getCharacter(pc.id).status,"dead");assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,6);
}));
