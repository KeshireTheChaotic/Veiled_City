/** v9.3.2 native PvP resource/complication regression gates. No provider/network or campaign fixtures. */
import test from "node:test";
import assert from "node:assert/strict";
import { nativeFixture, pvpTerms } from "./v9-fixtures.mjs";
import { proposePvp, reviewPvp, respondPvp, revisePvp, choosePvp, rollPvp, continuePvp, progressPvp } from "../src/narrative-pvp.js";
import { fearRevision, establishFearContext, selectFearMove, applyFearMove, validateFearEffect, renderFearEffect, reconcileFearMove } from "../src/pvp-fear-moves.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { applyRollOutcome } from "../src/roll-collaboration.js";
import { buildActionPlan, transitionAction } from "../src/action-dependency.js";
import { configureSimulationEntity } from "../src/simulation.js";
import { configureCityFlags } from "../src/city-core.js";
import { recordScenePresence } from "../src/scene-continuity.js";
import { manageWorldEncounter, worldCombatantDrafts, bindWorldCombatants } from "../src/encounter.js";
import { buildCombatants } from "../src/combat.js";
import { captureWorldInput } from "../src/autonomous-world.js";
import { commitGmTurn } from "../src/turn-orchestration.js";

export function lock(f,overrides={}){
  const p=proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:f.accepted().record_key,
    opponent:f.pcs[1].id,terms:pvpTerms(f.pcs,{version:2,hope_policy:"no_pvp_hope_generation",
      fear_policy:"immediate_contextual_fear",...overrides})});
  for(const pc of f.pcs.slice(0,2)){
    reviewPvp(f.db,f.guild,pc.owner_user_id,p.record_key);
    respondPvp(f.db,f.guild,pc.owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,
      decision:"accept",interaction_id:`accept:${pc.id}`});
  }
  return p;
}
export function op(f,p,i){
  const v=progressPvp(f.db,f.guild,f.pcs[i].owner_user_id,p.record_key);
  return {proposal:p.record_key,expected_revision:p.data.terms_hash,round:v.round,expected_window_revision:v.window_revision,
    interaction_id:`${i}:${v.round}:${v.window_revision}`};
}
export function pair(f,p,a,b){
  for(let i=0;i<2;i++)choosePvp(f.db,f.guild,f.pcs[i].owner_user_id,{...op(f,p,i),trait:"Agility",attempt:"I try a harmless feint."});
  let result;
  for(const [i,faces] of [a,b].entries()){
    let n=0;result=rollPvp(f.db,f.guild,f.pcs[i].owner_user_id,op(f,p,i),{rng:()=>faces[n++]});
  }
  return result;
}
const records=(f,kind)=>f.db.listCityRecords(f.guild,{kind,includeGM:true,limit:100});
// Explicit synthetic historical-v1 fixture, not a production migration or a new v1 offer API.
function legacyOffer(f){
  const p=proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:f.accepted().record_key,
    opponent:f.pcs[1].id,terms:pvpTerms(f.pcs)});
  const revision=f.db.getCityRecord(f.guild,"pvp_terms_revision",p.data.terms_revision);
  const snapshot={...revision.data.snapshot,terms:{...revision.data.snapshot.terms,version:1,hope_policy:"roller",fear_policy:"environment_only"}};
  const digest=fearRevision(snapshot),s=f.db.getWorldEvent(f.guild,revision.source_event);
  f.db.saveWorldEvent(f.guild,{...s,key:s.event_key,details:{...s.details,digest}});
  f.db.saveCityRecord(f.guild,{...revision,key:revision.record_key,data:{...revision.data,snapshot,digest}});
  return f.db.saveCityRecord(f.guild,{...p,key:p.record_key,data:{...p.data,terms_hash:digest}});
}
test("FH01 legacy v1 cannot receive fresh consent; historical offer remains intact",()=>nativeFixture(f=>{
  const p=legacyOffer(f),old=f.db.getCityRecord(f.guild,"pvp_terms_revision",p.data.terms_revision);
  reviewPvp(f.db,f.guild,f.pcs[0].owner_user_id,p.record_key);
  assert.throws(()=>respondPvp(f.db,f.guild,f.pcs[0].owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,
    decision:"accept",interaction_id:"stale-v1"}),/v2|polic|boundar/i);
  assert.deepEqual(f.db.getCityRecord(f.guild,"pvp_terms_revision",p.data.terms_revision),old);
  assert.equal(records(f,"pvp_consent").length,0);
}));
test("FH01 unrolled v1 re-offer requires two fresh v2 owner approvals",()=>nativeFixture(f=>{
  const p=legacyOffer(f),old=f.db.getCityRecord(f.guild,"pvp_terms_revision",p.data.terms_revision);
  const next=revisePvp(f.db,f.guild,f.pcs[1].owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,
    terms:pvpTerms(f.pcs),interaction_id:"v2-reoffer"});
  assert.notEqual(next.data.terms_hash,p.data.terms_hash);assert.deepEqual(next.data.approvals,[]);
  for(const [i,pc] of f.pcs.slice(0,2).entries()){
    reviewPvp(f.db,f.guild,pc.owner_user_id,p.record_key);
    const accepted=respondPvp(f.db,f.guild,pc.owner_user_id,{proposal:p.record_key,expected_revision:next.data.terms_hash,
      decision:"accept",interaction_id:`v2-new:${i}`});
    assert.equal(accepted.status,i===0?"awaiting_mutual_consent":"locked");
  }
  assert.deepEqual(f.db.getCityRecord(f.guild,"pvp_terms_revision",p.data.terms_revision),old);
}));
test("Fear gate integrity: forged exchange membership cannot authorize an immediate effect",()=>nativeFixture(f=>{
  const p=lock(f),c=context(f);pair(f,p,[3,10],[4,11]);
  const ts=records(f,"pvp_fear_trigger").sort((a,b)=>a.data.trigger_ordinal-b.data.trigger_ordinal);
  const gate=records(f,"pvp_exchange_gate")[0];
  f.db.saveCityRecord(f.guild,{...gate,key:gate.record_key,data:{...gate.data,expected_fear_trigger_ids:[ts[1].record_key]}});
  assert.throws(()=>select(f,ts[1],c),/gate|pair|native|obligation/i);
  assert.equal(f.db.getClock(f.guild,"closing-time").value,0);
  assert.equal(records(f,"pvp_fear_move_decision").length,0);
}));
test("Fear gate integrity: a substituted pair receipt cannot authorize consequences",()=>nativeFixture(f=>{
  const p=lock(f),c=context(f);pair(f,p,[3,10],[3,2]);
  const t=records(f,"pvp_fear_trigger")[0],gate=records(f,"pvp_exchange_gate")[0];
  f.db.saveCityRecord(f.guild,{...gate,key:gate.record_key,data:{...gate.data,pair_ref:"invented-pair"}});
  f.db.saveCityRecord(f.guild,{...t,key:t.record_key,data:{...t.data,paired_comparison_ref:"invented-pair"}});
  assert.throws(()=>select(f,t,c),/gate|pair|native|obligation/i);
  assert.equal(records(f,"pvp_fear_move_decision").length,0);
}));
function context(f,kind="clock_advance",visibility="party"){
  f.db.setSimulationEntity(f.guild,"location","terminal",{name:"Terminal",access:"public",visibility:"party"});
  if(kind==="clock_advance")f.db.changeClock(f.guild,"closing-time",0,{max:6,visibility});
  return establishFearContext(f.db,f.guild,"gm",{move_kind:kind,target_key:kind==="clock_advance"?"closing-time":"terminal",
    location_key:"terminal",visibility,subject_key:null},{gm:true,interactionId:`context:${kind}:${visibility}`});
}
function select(f,t,c){
  const target=c.data.move_kind==="clock_advance"?f.db.getClock(f.guild,c.data.target_key)
    :c.data.move_kind==="npc_prepare"?f.db.getSimulationEntity(f.guild,"npc",c.data.target_key)
      :f.db.getSimulationEntity(f.guild,"location",c.data.target_key);
  return selectFearMove(f.db,f.guild,"gm",{trigger:t.record_key,expected_revision:t.data.revision,context:c.record_key,
    expected_target_revision:fearRevision(target),affected_actions:[]},{gm:true,interactionId:`select:${t.record_key}:${t.data.revision}`});
}
function investigation(f,actor=2){
  const action=f.accepted(actor,"I investigate the terminal.","terminal",{type:"search",operation:"inspect",
    target:{kind:"location",key:"terminal",phrase:"terminal",grounding:"known"}});
  return {action,node:buildActionPlan(f.db,f.guild,[action])[0]};
}
function apply(f,t,d){
  const current=f.db.getCityRecord(f.guild,"pvp_fear_trigger",t.record_key);
  return applyFearMove(f.db,f.guild,"gm",{trigger:t.record_key,expected_revision:current.data.revision,decision:d.record_key},{gm:true});
}
for(const mode of ["single_roll_duel","three_strikes"])for(const faces of [[[10,3],[9,2]],[[3,3],[12,11]]])
  test(`FH05/FH07/FH09 zero Hope and Critical Stress clearing: ${mode} ${JSON.stringify(faces)}`,()=>nativeFixture(f=>{
    const p=lock(f,{mode}),before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
    const result=pair(f,p,...faces);assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
    assert.equal(records(f,"pvp_fear_trigger").length,0);
    assert.equal(records(f,"pvp_exchange_gate")[0]?.status,"ready");
    assert.equal(records(f,"pvp_resource_receipt").filter(r=>r.data.delta!==0).length,0);
    if(mode==="single_roll_duel")assert.equal(result.resolution.winner,f.pcs[faces[0][0]===3?1:0].id);
  }));
test("FH04 new signed policy cannot downgrade to old Hope/Fear flavor choices",()=>nativeFixture(f=>{
  for(const override of [{hope_policy:"roller"},{hope_policy:"opponent"},{fear_policy:"flavor_only"},{version:1}])
    assert.throws(()=>lock(f,override),/polic|version|v2|boundar/i);
  assert.equal(records(f,"pvp_round_receipt").length,0);
}));
for(const [faces,count] of [[[[10,3],[3,9]],1],[[[3,10],[4,9]],2],[[[3,10],[9,4]],1]])
  test(`FH15/FH17/FH18 atomic exact Fear obligations ${JSON.stringify(faces)}`,()=>nativeFixture(f=>{
    const p=lock(f),before=f.db.getCampaign(f.guild).fear;
    const result=pair(f,p,...faces),triggers=records(f,"pvp_fear_trigger"),gate=records(f,"pvp_exchange_gate")[0];
    assert.equal(triggers.length,count);assert.equal(gate.status,"pending_fear");
    assert.equal(result.consequence_status,"pending_fear");
    const totals=faces.map(pair=>pair[0]+pair[1]+2);
    assert.equal(result.resolution.winner,totals[0]===totals[1]?null:f.pcs[totals[0]>totals[1]?0:1].id);
    assert.equal(f.db.getCampaign(f.guild).fear,before);
    assert.equal(records(f,"pvp_fear_effect_receipt").length,0);
    assert.equal(records(f,"scene_action_window")[0].status,"locked");
    assert(triggers.every(t=>t.data.round_receipt&&t.data.roll_id&&t.status==="awaiting_move"));
  }));
test("FH21 pending Fear blocks next three-strikes exchange without erasing saved strike",()=>nativeFixture(f=>{
  const p=lock(f,{mode:"three_strikes"}),r=pair(f,p,[3,10],[3,2]);
  const saved=records(f,"pvp_strike_receipt")[0];assert.equal(r.scores[f.pcs[0].id],1);
  assert.throws(()=>continuePvp(f.db,f.guild,f.pcs[0].owner_user_id,op(f,p,0)),/Fear|consequence|gate/i);
  assert.deepEqual(records(f,"pvp_strike_receipt")[0],saved);
}));
test("FH21 resolved label without native effect cannot unlock continuation",()=>nativeFixture(f=>{
  const p=lock(f,{mode:"three_strikes"});pair(f,p,[3,10],[3,2]);
  const t=records(f,"pvp_fear_trigger")[0];
  f.db.saveCityRecord(f.guild,{...t,key:t.record_key,status:"resolved",data:{...t.data,effect:"invented-effect"}});
  assert.throws(()=>continuePvp(f.db,f.guild,f.pcs[0].owner_user_id,op(f,p,0)),/Fear|receipt|gate|native/i);
  assert.equal(records(f,"pvp_round_continuation").length,0);
}));
test("FH25/FH52 first sealed Fear roll survives restart without exposing it to opponent",()=>nativeFixture(f=>{
  const p=lock(f);
  for(let i=0;i<2;i++)choosePvp(f.db,f.guild,f.pcs[i].owner_user_id,{...op(f,p,i),trait:"Agility",attempt:"I try a feint."});
  let n=0;const first=rollPvp(f.db,f.guild,f.pcs[0].owner_user_id,op(f,p,0),{rng:()=>[3,10][n++]});
  assert.equal(records(f,"pvp_fear_trigger").length,1);assert.equal(records(f,"pvp_fear_trigger")[0].status,"awaiting_pair");
  f.restart();const other=progressPvp(f.db,f.guild,f.pcs[1].owner_user_id,p.record_key);
  assert(!JSON.stringify(other).includes(first.own.roll_id));assert(!JSON.stringify(other).includes("awaiting_move"));
  const replay=rollPvp(f.db,f.guild,f.pcs[0].owner_user_id,op(f,p,0),{rng:()=>{throw Error("No reroll");}});
  assert.equal(replay.own.roll_id,first.own.roll_id);assert.equal(records(f,"pvp_fear_trigger").length,1);
}));
test("FH18/FH24/FH26 native clock consequence applies exactly once and closes terminal window",()=>nativeFixture(f=>{
  const p=lock(f),c=context(f),before=f.db.getCampaign(f.guild).fear;
  const r=pair(f,p,[3,10],[3,2]),t=records(f,"pvp_fear_trigger")[0],d=select(f,t,c),effect=apply(f,t,d);
  assert.equal(f.db.getClock(f.guild,"closing-time").value,1);assert.equal(validateFearEffect(f.db,f.guild,effect.record_key).record_key,effect.record_key);
  f.restart();assert.equal(apply(f,t,d).record_key,effect.record_key);assert.equal(f.db.getClock(f.guild,"closing-time").value,1);
  assert.equal(records(f,"scene_action_window")[0].status,"closed");assert.equal(records(f,"pvp_exchange_gate")[0].status,"ready");
  assert.equal(f.db.getCampaign(f.guild).fear,before);assert.equal(progressPvp(f.db,f.guild,f.pcs[0].owner_user_id,p.record_key).resolution.receipt,r.resolution.receipt);
}));
test("FH17/FH23 two Fear resolve in participant order with state revalidation",()=>nativeFixture(f=>{
  const p=lock(f),c=context(f);pair(f,p,[3,10],[4,11]);
  let ts=records(f,"pvp_fear_trigger").sort((a,b)=>a.data.trigger_ordinal-b.data.trigger_ordinal);
  assert.throws(()=>select(f,ts[1],c),/order/i);apply(f,ts[0],select(f,ts[0],c));
  assert.equal(records(f,"pvp_exchange_gate")[0].status,"pending_fear");
  ts=records(f,"pvp_fear_trigger").sort((a,b)=>a.data.trigger_ordinal-b.data.trigger_ordinal);
  apply(f,ts[1],select(f,ts[1],c));assert.equal(f.db.getClock(f.guild,"closing-time").value,2);
  assert.equal(records(f,"pvp_fear_effect_receipt").length,2);assert.equal(records(f,"pvp_exchange_gate")[0].status,"ready");
}));
test("FH27 source retraction cannot discharge Fear",()=>nativeFixture(f=>{
  const p=lock(f),c=context(f);pair(f,p,[3,10],[3,2]);const t=records(f,"pvp_fear_trigger")[0],d=select(f,t,c);
  const before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  indexWorldEvent(f.db,f.guild,{key:t.source_event,status:"retracted"},f.pcs[0].owner_user_id);
  assert.throws(()=>apply(f,t,d),/stale|authoriz|source/i);assert.equal(f.db.getClock(f.guild,"closing-time").value,0);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);assert.equal(records(f,"pvp_fear_effect_receipt").length,0);
  assert.equal(records(f,"pvp_fear_trigger")[0].status,"needs_review");
  const held=records(f,"pvp_fear_trigger")[0];
  assert.throws(()=>reconcileFearMove(f.db,f.guild,"gm",{trigger:t.record_key,expected_revision:held.data.revision},
    {gm:true,interactionId:"cannot-waive"}),/source|authoriz|stale/i);
  assert.equal(records(f,"pvp_exchange_gate")[0].status,"pending_fear");
}));
test("FH22/FH23 changed native target is auditable/reselectable, never silently spent",()=>nativeFixture(f=>{
  const p=lock(f),c=context(f);pair(f,p,[3,10],[3,2]);const t=records(f,"pvp_fear_trigger")[0],d=select(f,t,c);
  f.db.changeClock(f.guild,"closing-time",1,{max:6,visibility:"party"});
  assert.throws(()=>apply(f,t,d),/precondition|changed/i);
  let held=records(f,"pvp_fear_trigger")[0];assert.equal(held.status,"needs_review");
  assert.equal(records(f,"pvp_fear_effect_receipt").length,0);f.restart();
  reconcileFearMove(f.db,f.guild,"gm",{trigger:t.record_key,expected_revision:held.data.revision},{gm:true,interactionId:"review-current-clock"});
  held=records(f,"pvp_fear_trigger")[0];assert.equal(held.status,"awaiting_move");
  assert.equal(f.db.getCityRecord(f.guild,"pvp_fear_move_decision",d.record_key).status,"superseded");
  apply(f,held,select(f,held,c));assert.equal(f.db.getClock(f.guild,"closing-time").value,2);
  assert.equal(records(f,"pvp_fear_recovery").length,1);
}));
test("FH28 actual Fear remains due after neutral withdrawal with no fake opponent roll",()=>nativeFixture(f=>{
  const p=lock(f),c=context(f);
  for(let i=0;i<2;i++)choosePvp(f.db,f.guild,f.pcs[i].owner_user_id,{...op(f,p,i),trait:"Agility",attempt:"I try a feint."});
  let n=0;rollPvp(f.db,f.guild,f.pcs[0].owner_user_id,op(f,p,0),{rng:()=>[3,10][n++]});
  respondPvp(f.db,f.guild,f.pcs[1].owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,decision:"withdraw",interaction_id:"stop"});
  const t=records(f,"pvp_fear_trigger")[0];assert.equal(t.status,"awaiting_move");assert.equal(records(f,"scene_action_window")[0].status,"locked");
  apply(f,t,select(f,t,c));assert.equal(records(f,"pvp_round_receipt").length,1);assert.equal(records(f,"scene_action_window")[0].status,"closed");
  assert.equal(records(f,"pvp_resolution_receipt")[0].data.winner,null);
}));
test("FH38/FH45 access changes are native; private effect is never party projection",()=>nativeFixture(f=>{
  const p=lock(f),c=context(f,"access_obstacle","gm");pair(f,p,[3,10],[3,2]);const t=records(f,"pvp_fear_trigger")[0];
  const e=apply(f,t,select(f,t,c));assert.equal(f.db.getSimulationEntity(f.guild,"location","terminal").state.locked,true);
  assert.throws(()=>renderFearEffect(f.db,f.guild,e.record_key,{mode:"party"}),/audience|authoriz/i);
  assert.equal(f.db.getCampaign(f.guild).fear,0);
}));
test("FH12 generic resource adapter must reject/reuse PvP results without grants or Stress clearing",()=>nativeFixture(f=>{
  const p=lock(f);pair(f,p,[3,3],[12,11]);const before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  for(const r of records(f,"pvp_round_receipt"))applyRollOutcome(f.db,f.guild,f.session.id,[r.data.character],r.data.result);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
  assert.equal(f.db.getCampaign(f.guild).fear,0);
}));
test("FH13/FH33 ordinary non-PvP Hope/Critical/Fear behavior is unchanged",()=>nativeFixture(f=>{
  applyRollOutcome(f.db,f.guild,f.session.id,[f.pcs[0].id],{duality:"Hope",total:12});
  assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.hope,3);
  applyRollOutcome(f.db,f.guild,f.session.id,[f.pcs[1].id],{duality:"Critical",total:10});
  assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hope,3);assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.stress.current,1);
  applyRollOutcome(f.db,f.guild,f.session.id,[f.pcs[0].id],{duality:"Fear",total:10});assert.equal(f.db.getCampaign(f.guild).fear,1);
}));
test("FH30/FH32 ordinary pool changes cannot discharge PvP Fear at either cap",()=>nativeFixture(f=>{
  const p=lock(f);f.db.changeFear(f.guild,12);pair(f,p,[3,10],[3,2]);assert.equal(f.db.getCampaign(f.guild).fear,12);
  f.db.changeFear(f.guild,-12);assert.equal(records(f,"pvp_exchange_gate")[0].status,"pending_fear");
  assert.equal(records(f,"pvp_fear_effect_receipt").length,0);assert.equal(f.db.getCampaign(f.guild).fear,0);
}));
test("FH36 native obstacle holds Billy's pending investigation, not independent Tyrell",()=>nativeFixture(f=>{
  const p=lock(f),c=context(f,"access_obstacle"),billy=investigation(f),tyrell=investigation(f,3);
  pair(f,p,[3,10],[3,2]);const t=records(f,"pvp_fear_trigger")[0];
  const d=selectFearMove(f.db,f.guild,"gm",{trigger:t.record_key,expected_revision:t.data.revision,context:c.record_key,
    expected_target_revision:fearRevision(f.db.getSimulationEntity(f.guild,"location","terminal")),affected_actions:[billy.node.record_key]},
  {gm:true,interactionId:"interruption-decision"});
  const before=f.db.getCityRecord(f.guild,"compound_action",tyrell.node.record_key);apply(f,t,d);
  assert.equal(buildActionPlan(f.db,f.guild,[billy.action])[0].status,"pending");
  assert.deepEqual(f.db.getCityRecord(f.guild,"compound_action",tyrell.node.record_key),before);
  assert.equal(records(f,"action_interrupt_receipt").length,1);
  assert.throws(()=>transitionAction(f.db,f.guild,billy.node.record_key,{expected_status:"pending",status:"failed",receipt:"invented"}),/Interrupted/i);
}));
function nativeAdversary(f){
  context(f);
  f.db.upsertNpcProfile(f.guild,{npcKey:"guard",displayName:"Guard",source:"gm"});
  configureSimulationEntity(f.db,f.guild,"npc","guard",{location_key:"terminal",resources:{manpower:2}});
  f.db.upsertNpcGoal(f.guild,{npcKey:"guard",goalKey:"secure",objective:"Secure the terminal",acceptableMethods:["prepare"]});
  configureCityFlags(f.db,f.guild,{encounter_intelligence:true,scene_continuity:true});
  const evidence=indexWorldEvent(f.db,f.guild,{key:"guard-sees-terminal",title:"Visible terminal activity",source_id:"gm",location_key:"terminal",visibility:"party"},"gm");
  f.db.upsertNpcKnowledge(f.guild,{npcKey:"guard",knowledgeKey:"scene",content:"Visible terminal activity",sourceRef:evidence.event_key});
  for(const pc of f.pcs)recordScenePresence(f.db,f.guild,{entity_type:"character",entity_key:pc.id,location_key:"terminal",
    source_event:evidence.event_key,visibility:"party",accepted_by:pc.owner_user_id},"gm");
  recordScenePresence(f.db,f.guild,{entity_type:"npc",entity_key:"guard",location_key:"terminal",source_event:evidence.event_key,visibility:"party"},"gm");
  const template={name:"Guard",type:"Standard",tier:1,hp:3,stress:2,difficulty:10,thresholds:"5/10"};
  const lib={adversaries:[template],environments:[{name:"Terminal",tier:1}],findAdversary:()=>template};
  manageWorldEncounter(f.db,f.guild,{op:"bind",actor:"guard",template:"Guard",information_key:"scene",source_event:evidence.event_key},"gm",lib);
  manageWorldEncounter(f.db,f.guild,{op:"propose",key:"guard-encounter",actors:["guard"],objective:"containment",environment:"Terminal",
    source_event:evidence.event_key,location_key:"terminal"},"gm",lib);
  const accepted=manageWorldEncounter(f.db,f.guild,{op:"accept",key:"guard-encounter"},"gm",lib);
  const encounter=f.db.setEncounterStatus(accepted.data.encounter_id,"active");
  const combatants=f.db.initializeCombatants(encounter.id,worldCombatantDrafts(f.db,f.guild,encounter,buildCombatants(encounter,lib)));
  bindWorldCombatants(f.db,f.guild,encounter,combatants);
  return encounter;
}
function npcContext(f){return establishFearContext(f.db,f.guild,"gm",{move_kind:"npc_prepare",target_key:"guard",location_key:"terminal",visibility:"party",subject_key:null},
    {gm:true,interactionId:"native-npc-context"});
}
test("FH34 NPC acts now through its native encounter-bound action, never future spotlight",()=>nativeFixture(f=>{
  const p=lock(f),encounter=nativeAdversary(f),c=npcContext(f);
  pair(f,p,[3,10],[3,2]);const t=records(f,"pvp_fear_trigger")[0],d=select(f,t,c);
  const effect=applyFearMove(f.db,f.guild,"gm",{trigger:t.record_key,
    expected_revision:f.db.getCityRecord(f.guild,"pvp_fear_trigger",t.record_key).data.revision,decision:d.record_key},{gm:true,rng:()=>20});
  assert(effect.data.npc_action_ref);assert.equal(f.db.getSimulationRecord(f.guild,effect.data.npc_action_ref).status,"completed");
  assert.equal(f.db.getSimulationEntity(f.guild,"npc","guard").state.preparation,1);
  assert.equal(f.db.getCampaign(f.guild).fear,0);assert.deepEqual(f.db.getEncounter(encounter.id).combat_state.spotlight.counts,{});
}));
test("FH45 hidden NPC preparation cannot be selected as a party consequence",()=>nativeFixture(f=>{
  lock(f);nativeAdversary(f);
  configureSimulationEntity(f.db,f.guild,"npc","guard",{hidden:true,visibility:"gm"});
  assert.throws(()=>npcContext(f),/audience|private|visible|hidden/i);
  assert.equal(records(f,"pvp_fear_context").filter(c=>c.data.move_kind==="npc_prepare").length,0);
}));
test("FH23 native NPC goal revision after selection requires a new decision",()=>nativeFixture(f=>{
  const p=lock(f);nativeAdversary(f);const c=npcContext(f);pair(f,p,[3,10],[3,2]);
  const t=records(f,"pvp_fear_trigger")[0],d=select(f,t,c);
  f.db.upsertNpcGoal(f.guild,{npcKey:"guard",goalKey:"secure",objective:"A changed native objective",acceptableMethods:["prepare"]});
  assert.throws(()=>applyFearMove(f.db,f.guild,"gm",{trigger:t.record_key,
    expected_revision:f.db.getCityRecord(f.guild,"pvp_fear_trigger",t.record_key).data.revision,decision:d.record_key},{gm:true,rng:()=>20}),/revision|precondition|changed/i);
  assert.equal(f.db.getSimulationEntity(f.guild,"npc","guard").state.preparation||0,0);
  assert.equal(records(f,"pvp_fear_effect_receipt").length,0);
}));
test("FH46 a missing native NPC action invalidates its saved/publication effect",()=>nativeFixture(f=>{
  const p=lock(f);nativeAdversary(f);const c=npcContext(f);pair(f,p,[3,10],[3,2]);
  const t=records(f,"pvp_fear_trigger")[0],d=select(f,t,c),effect=applyFearMove(f.db,f.guild,"gm",{trigger:t.record_key,
    expected_revision:f.db.getCityRecord(f.guild,"pvp_fear_trigger",t.record_key).data.revision,decision:d.record_key},{gm:true,rng:()=>20});
  // Deliberate corruption in temporary fixture only: no replacement/fabricated native receipt.
  const native=f.db.getSimulationRecord(f.guild,effect.data.npc_action_ref);
  f.db.putSimulationRecord(f.guild,{id:native.id,kind:native.kind,entityKey:native.entity_key,status:"rejected",data:native.data});
  assert.throws(()=>validateFearEffect(f.db,f.guild,effect.record_key),/native|NPC|receipt/i);
}));
test("FH27/FH46 revoked Fear publication holds that part, not independent Billy movement",()=>nativeFixture(f=>{
  const p=lock(f),c=context(f);pair(f,p,[3,10],[3,2]);const t=records(f,"pvp_fear_trigger")[0];
  const effect=apply(f,t,select(f,t,c));
  indexWorldEvent(f.db,f.guild,{key:effect.source_event,status:"retracted"},"gm");
  f.db.setSimulationEntity(f.guild,"location","annex",{name:"Annex",parent_location_key:"terminal"});
  f.db.saveCityRecord(f.guild,{kind:"autonomous_entity",key:"location:annex",visibility:"party",source_event:p.source_event,
    status:"active",data:{kind:"location",key:"annex",name:"Annex"}});
  const pc=f.pcs[2],text="I enter the annex.",scope={mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,"fear-independent",text);
  const result={respond:true,narration:"Billy enters. Choso apologizes for losing.",narrative_claims:[],
    player_intents:[{type:"move",source_span:text,target_name:"Annex",target_key:"annex",destination:"interior",operation:"",
      utterance:"",excluded_targets:[],framing:"immediate",resolution:"auto",reason:"Open local entry."}],
    scene_actions:[{kind:"move",entity_ref:"annex",source_span:text,zone:"interior"}]};
  assert.doesNotThrow(()=>commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:pc.name,label:"independent",
    meta:{messageId:"fear-independent",triggerText:text}}));
  assert.equal(f.db.getCharacter(pc.id).data.location,"annex");assert.match(result.narration,/annex/);
  assert(!result.narration.includes("countdown"));assert(!result.narration.includes("apologizes"));
  assert.equal(f.db.getClock(f.guild,"closing-time").value,1);
}));
