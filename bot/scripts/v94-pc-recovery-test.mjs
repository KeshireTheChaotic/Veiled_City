/** Native post-death recovery: ally-owned source, both private decisions, no forged wake or automatic character action. */
import test from "node:test";
import assert from "node:assert/strict";
import {nativeFixture} from "./v9-fixtures.mjs";
import {fallenFixture} from "./v94-death-fixtures.mjs";
import {reviewPcDeathMove,choosePcDeathMove} from "../src/pc-death.js";
import {recordScenePresence} from "../src/scene-continuity.js";
import {indexWorldEvent} from "../src/city-calendar.js";
import {assertPcCanAct} from "../src/pc-native-eligibility.js";
import {fakeInteraction} from "./contract-fixtures.mjs";
import {handleCommand} from "../src/commands.js";
import {validatePcConsciousness} from "../src/pc-death.js";
const api=()=>import("../src/pc-effects.js");
async function unconscious(f){const x=await fallenFixture(f),user=f.pcs[1].owner_user_id;
  const view=reviewPcDeathMove(f.db,f.guild,user,x.request.record_key);
  choosePcDeathMove(f.db,f.guild,user,{request:x.request.record_key,expected_revision:view.revision,move:"avoid_death"},{interactionId:"recovery-death",rng:()=>12});
  const healer=f.pcs[2];f.db.updateCharacterData(healer.id,d=>{d.domain_cards=[{name:"Healing Touch",active:true,healing:{fixed_hp:1,range:"Melee"}}];});
  recordScenePresence(f.db,f.guild,{source_event:"attack-scene",entity_type:"character",entity_key:healer.id,location_key:"terminal",zone:"floor",range:"Melee",visibility:"party",accepted_by:healer.owner_user_id},"gm");
  const action=f.accepted(2,"I attempt to use Healing Touch on Choso.",f.pcs[1].id,{operation:"heal"});
  f.db.upsertRulesRuling(f.guild,{key:"ally-heal",createdBy:"gm",ruling:"Reviewed synthetic fixed healing mapping: owned free Healing Touch clears 1 HP on an ally within Melee; no cost or dice."});
  return {...x,healer,action,input:{character:f.pcs[1].id,healer:healer.id,accepted_intent:action.record_key,feature:"Healing Touch",ruling:"ally-heal",source:action.source_event,resource:"hp",amount:-1}};
}
async function offer(f){const x=await unconscious(f),a=await api(),row=a.reviewFeatureEffect(f.db,f.guild,"gm",x.input,{gm:true,interactionId:"native-heal"});return {...x,a,row};}
test("PVD20 actual ally healing wakes Avoid Death once, preserving scar/death history and no invented reaction",()=>nativeFixture(async f=>{
  const x=await offer(f),{a,row}=x,target=f.pcs[1];
  a.reviewHealingSource(f.db,f.guild,x.healer.owner_user_id,row.record_key);
  a.authorizeHealingSource(f.db,f.guild,x.healer.owner_user_id,{authority:row.record_key,expected_revision:row.data.healing_digest},{interactionId:"healer-owns"});
  a.reviewPcEffect(f.db,f.guild,target.owner_user_id,row.record_key);a.approvePcEffect(f.db,f.guild,target.owner_user_id,row.record_key,{interactionId:"target-heal"});
  const receipt=a.applyPcEffect(f.db,f.guild,row.record_key);assert.equal(receipt.data.amount,-1);
  const pc=f.db.getCharacter(target.id);assert.equal(pc.data.resources.hp.current,5);assert.equal(pc.data.death_state.status,"recovered");assert.equal(assertPcCanAct(pc).id,pc.id);
  assert.equal(pc.data.resources.hope,2);assert.equal(pc.data.resources.hope_max,6);assert.equal(pc.status,"active");
  f.restart();assert.deepEqual(a.applyPcEffect(f.db,f.guild,row.record_key),receipt);assert.equal(f.db.getCharacter(target.id).data.resources.hp.current,5);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pc_consciousness_receipt",includeGM:true}).length,1);
}));
test("PVD20 GM/target cannot choose the healer's feature; missing healer authorization holds all effects",()=>nativeFixture(async f=>{
  const x=await offer(f),{a,row}=x,target=f.pcs[1];
  for(const user of ["gm",target.owner_user_id])assert.throws(()=>a.reviewHealingSource(f.db,f.guild,user,row.record_key),/owner|healer|owned/i);
  a.reviewPcEffect(f.db,f.guild,target.owner_user_id,row.record_key);a.approvePcEffect(f.db,f.guild,target.owner_user_id,row.record_key,{interactionId:"target-only"});
  assert.throws(()=>a.applyPcEffect(f.db,f.guild,row.record_key),/healer|authorization/i);
  assert.equal(f.db.getCharacter(target.id).data.death_state.status,"unconscious");assert.equal(f.db.getCharacter(target.id).data.resources.hp.current,6);
}));
test("PVD20 withdrawn ally source, invented amount or unmapped healing never clear HP or wake a PC",()=>nativeFixture(async f=>{
  const x=await unconscious(f),a=await api();
  assert.throws(()=>a.reviewFeatureEffect(f.db,f.guild,"gm",{...x.input,amount:-6},{gm:true,interactionId:"invented-heal"}),/mapping|fixed|native/i);
  indexWorldEvent(f.db,f.guild,{key:x.action.source_event,status:"retracted"},x.healer.owner_user_id);
  assert.throws(()=>a.reviewFeatureEffect(f.db,f.guild,"gm",x.input,{gm:true,interactionId:"retracted-heal"}),/source|retract|owner/i);
  assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,6);
}));
test("PVD20 unconscious PC cannot self-activate an arbitrary native healing feature to evade owner death state",()=>nativeFixture(async f=>{
  await unconscious(f);const a=await api(),target=f.pcs[1];f.db.updateCharacterData(target.id,d=>{d.domain_cards=["Self Heal"];});
  const action=f.accepted(1,"I activate Self Heal.","terminal",{type:"other",target:{kind:"location",key:"terminal",phrase:"terminal",grounding:"known"}});
  assert.throws(()=>a.reviewFeatureEffect(f.db,f.guild,"gm",{character:target.id,feature:"Self Heal",ruling:"ally-heal",source:action.source_event,resource:"hp",amount:-1},
    {gm:true,interactionId:"unconscious-self"}),/cannot|unconscious/i);
}));
test("PVD20 actual Discord ally recovery requires both owners and never exposes recipient HP to healer",()=>nativeFixture(async f=>{
  const x=await offer(f),target=f.pcs[1],{row}=x;
  const call=async(user,op,data)=>{const i=fakeInteraction({sub:"effect",json:{op,...data}});
    Object.assign(i,{id:`recovery-ui:${user}:${op}`,guildId:f.guild,commandName:"vc-roll",isChatInputCommand:()=>true});i.user={id:user,username:user};
    await handleCommand(i,{db:f.db,gm:{}});assert(i.deliveries.every(d=>d.ephemeral&&d.content.length<=2000));return i;};
  const view=await call(x.healer.owner_user_id,"healer-review",{authority:row.record_key});
  assert.doesNotMatch(JSON.stringify(view.deliveries),/"current"|"max"|hope_max|scar_description|native death dice/);
  await call(x.healer.owner_user_id,"healer-authorize",{authority:row.record_key,expected_revision:row.data.healing_digest});
  await call(target.owner_user_id,"review",{authority:row.record_key});await call(target.owner_user_id,"approve",{authority:row.record_key});
  assert.equal(f.db.getCharacter(target.id).data.death_state.status,"recovered");
  const wake=f.db.listCityRecords(f.guild,{kind:"pc_consciousness_receipt",includeGM:true})[0];assert.equal(wake.visibility,"character");
  assert.equal(validatePcConsciousness(f.db,f.guild,wake.record_key).record_key,wake.record_key);
}));
test("PVD20 waking receipt failure rolls back HP and consciousness together; preserved approvals allow safe retry",()=>nativeFixture(async f=>{
  const x=await offer(f),{a,row}=x,target=f.pcs[1];
  a.reviewHealingSource(f.db,f.guild,x.healer.owner_user_id,row.record_key);
  a.authorizeHealingSource(f.db,f.guild,x.healer.owner_user_id,{authority:row.record_key,expected_revision:row.data.healing_digest},{interactionId:"rollback-healer"});
  a.reviewPcEffect(f.db,f.guild,target.owner_user_id,row.record_key);a.approvePcEffect(f.db,f.guild,target.owner_user_id,row.record_key,{interactionId:"rollback-target"});
  const before=f.db.getCharacter(target.id),save=f.db.saveCityRecord.bind(f.db);
  f.db.saveCityRecord=(g,r)=>{if(r.kind==="pc_consciousness_receipt")throw new Error("synthetic wake failure");return save(g,r);};
  assert.throws(()=>a.applyPcEffect(f.db,f.guild,row.record_key),/synthetic wake/);f.db.saveCityRecord=save;
  assert.deepEqual(f.db.getCharacter(target.id),before);assert.equal(f.db.getCityRecord(f.guild,"pc_effect_authority",row.record_key).status,"approved");
  a.applyPcEffect(f.db,f.guild,row.record_key);assert.equal(f.db.getCharacter(target.id).data.death_state.status,"recovered");
}));
test("PVD20 a rehashed consciousness record cannot authorize an invented wake without native source and mutation",()=>nativeFixture(async f=>{
  const x=await offer(f),{a,row}=x,target=f.pcs[1];
  a.reviewHealingSource(f.db,f.guild,x.healer.owner_user_id,row.record_key);
  a.authorizeHealingSource(f.db,f.guild,x.healer.owner_user_id,{authority:row.record_key,expected_revision:row.data.healing_digest},{interactionId:"proof-healer"});
  a.reviewPcEffect(f.db,f.guild,target.owner_user_id,row.record_key);a.approvePcEffect(f.db,f.guild,target.owner_user_id,row.record_key,{interactionId:"proof-target"});
  a.applyPcEffect(f.db,f.guild,row.record_key);const wake=f.db.listCityRecords(f.guild,{kind:"pc_consciousness_receipt",includeGM:true})[0];
  const {digest,...v}=wake.data;v.after.data.resources.hp.current=0;const {createHash}=await import("node:crypto");
  f.db.saveCityRecord(f.guild,{...wake,key:wake.record_key,data:{...v,digest:createHash("sha256").update(JSON.stringify(v)).digest("hex")}});
  assert.throws(()=>validatePcConsciousness(f.db,f.guild,wake.record_key),/native|mutation|source/i);
}));
