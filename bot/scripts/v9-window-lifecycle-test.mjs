/** V9-02: production windows use native identity, authenticated closure and actual custody receipts. */
import assert from "node:assert/strict";
import test from "node:test";
import { nativeFixture, pvpTerms } from "./v9-fixtures.mjs";
import { coordinateTypedActionWindows, openActionWindow, joinActionWindow } from "../src/scene-action-window.js";
import { buildActionPlan } from "../src/action-dependency.js";
import { advanceActionWindow, reconcileWindowCustody, synchronizePvpWindow, windowOperation } from "../src/window-coordinator.js";
import { proposePvp, reviewPvp, respondPvp } from "../src/narrative-pvp.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { manageEvidence } from "../src/evidence-custody.js";
import { recordScenePresence } from "../src/scene-continuity.js";
import { stateRevision } from "../src/ai-intents.js";

function claim(f,index,resource,label){
  let action=f.accepted(index,`I attempt to collect the parcel ${index}.`,resource);
  action=f.db.saveCityRecord(f.guild,{...action,key:action.record_key,data:{...action.data,coordination:{reason:"contested_resource",
    beat_key:label,reads:[],writes:[`item:${resource}:custody`],location_key:"terminal",operation:"claim",required_participants:[],consent_refs:[]}}});
  const plan=buildActionPlan(f.db,f.guild,[action]);
  return {action,plan,result:coordinateTypedActionWindows(f.db,f.guild,[action],plan)[0]};
}
test("W03 different model beat labels collide on the same native resource",()=>nativeFixture(f=>{
  const a=claim(f,0,"parcel","grab-it"),b=claim(f,1,"parcel","totally-different-label");
  assert.equal(a.result.window.record_key,b.result.window.record_key);
  assert.equal(b.result.participant.data.classification,"same_scarce_resource");
  assert.equal(buildActionPlan(f.db,f.guild,[a.action])[0].status,"pending","rebuild must preserve live coordination holds");
}));
test("W02 native consent consumer joins only after all signatures; revoke closes neutrally",()=>nativeFixture(f=>{
  let action=f.accepted(0,"I offer to cooperate on lifting the crate.","crate");
  const coordination={reason:"cooperative_operation",beat_key:"lift",reads:["item:crate"],writes:["item:crate:position"],
    location_key:"terminal",operation:"group_action",required_participants:f.pcs.slice(0,2).map(p=>p.id),consent_refs:[]};
  action=f.db.saveCityRecord(f.guild,{...action,key:action.record_key,data:{...action.data,coordination}});
  const plans=buildActionPlan(f.db,f.guild,[action]);
  const pending=coordinateTypedActionWindows(f.db,f.guild,[action],plans)[0];
  assert.equal(pending.status,"awaiting_consent");
  const request=windowOperation(f.db,f.guild,f.pcs[0].owner_user_id,{op:"request",window:pending.window.record_key,
    expected_revision:pending.window.data.revision,accepted_intent:action.record_key,
    consequences:"Participation only; no expense, relocation or success is authorized.",expires_minute:1000});
  assert.deepEqual(windowOperation(f.db,f.guild,f.pcs[3].owner_user_id,{op:"inbox"}),[]);
  for(let i=0;i<2;i++){
    windowOperation(f.db,f.guild,f.pcs[i].owner_user_id,{op:"respond",request:request.request,expected_revision:request.terms_hash,
      decision:"accept",interaction_id:`native-${i}`});
    assert.equal(f.db.getCityRecord(f.guild,"scene_action_window",pending.window.record_key).data.participants.length,i===0?0:1);
  }
  const joined=f.db.getCityRecord(f.guild,"scene_action_window",pending.window.record_key);
  const locked=advanceActionWindow(f.db,f.guild,f.pcs[0].owner_user_id,{op:"close",window:joined.record_key,expected_revision:joined.data.revision});
  assert.equal(locked.status,"locked");f.restart();
  windowOperation(f.db,f.guild,f.pcs[1].owner_user_id,{op:"respond",request:request.request,expected_revision:request.terms_hash,
    decision:"revoke",interaction_id:"revoke"});
  assert.equal(f.db.getCityRecord(f.guild,"scene_action_window",joined.record_key).status,"closed");
  assert.equal(buildActionPlan(f.db,f.guild,[action])[0].status,"blocked");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true,limit:10}).length,0);
}));
test("W04/W07 stale source cannot adjudicate; only explicit GM recovery cancels the hold",()=>nativeFixture(f=>{
  const a=claim(f,0,"parcel","label"),w=f.db.getCityRecord(f.guild,"scene_action_window",a.result.window.record_key);
  const source=f.db.getWorldEvent(f.guild,a.action.source_event);f.db.saveWorldEvent(f.guild,{...source,key:source.event_key,status:"retracted"});
  assert.throws(()=>advanceActionWindow(f.db,f.guild,"gm",{op:"close",window:w.record_key,expected_revision:w.data.revision},{gm:true}),/stale|source/i);
  assert.throws(()=>windowOperation(f.db,f.guild,f.pcs[0].owner_user_id,{op:"cancel",window:w.record_key,
    expected_revision:w.data.revision,interaction_id:"cancel"}),/GM/i);
  assert.equal(windowOperation(f.db,f.guild,"gm",{op:"cancel",window:w.record_key,
    expected_revision:w.data.revision,interaction_id:"cancel"},{gm:true}).status,"closed");
  assert.equal(buildActionPlan(f.db,f.guild,[a.action])[0].status,"blocked");
}));
test("W05/W06/W08 actual native custody closes one winner and truthful losing attempt across restart",()=>nativeFixture(f=>{
  configureCityFlags(f.db,f.guild,{evidence_custody:true,scene_continuity:true},"gm");
  f.db.setSimulationEntity(f.guild,"location","terminal",{});
  const handout=f.db.createHandout(f.guild,{title:"Parcel",visibility:"party"});
  const a=claim(f,0,handout.id,"a"),b=claim(f,1,handout.id,"b"),key=a.result.window.record_key;
  const window=f.db.getCityRecord(f.guild,"scene_action_window",key);
  assert.throws(()=>advanceActionWindow(f.db,f.guild,"foreign",{window:key,expected_revision:window.data.revision,op:"close"}),/owner|GM|participant/i);
  const locked=advanceActionWindow(f.db,f.guild,"gm",{window:key,expected_revision:window.data.revision,op:"close"},{gm:true});
  assert.equal(locked.status,"locked");f.restart();
  assert.throws(()=>reconcileWindowCustody(f.db,f.guild,key,"missing"),/receipt|evidence/i);
  const source=(name,from,to)=>indexWorldEvent(f.db,f.guild,{key:name,kind:"evidence_transfer",source_id:"gm",title:"Reviewed physical event",
    details:{human_reviewed:true,window:key,accepted_intent:a.action.record_key,evidence:{handout_id:handout.id,from,to}}},"gm").event_key;
  manageEvidence(f.db,f.guild,{op:"register",key:"register",id:handout.id,source_event:source("register",null,"location:terminal"),
    holder:"location:terminal",expected_revision:stateRevision(undefined)},"gm",{gm:true});
  const arrival=indexWorldEvent(f.db,f.guild,{key:"presence",kind:"arrival",source_id:"gm",title:"At terminal",location_key:"terminal",visibility:"party"},"gm");
  recordScenePresence(f.db,f.guild,{entity_type:"character",entity_key:f.pcs[0].id,location_key:"terminal",source_event:arrival.event_key,
    accepted_by:f.pcs[0].owner_user_id,visibility:"party"},"gm");
  manageEvidence(f.db,f.guild,{op:"collect",key:"collect",id:handout.id,
    source_event:source("collect","location:terminal",`character:${f.pcs[0].id}`),
    expected_revision:stateRevision(f.db.getHandout(handout.id).metadata.evidence)},f.pcs[0].owner_user_id);
  const result=reconcileWindowCustody(f.db,f.guild,key,`${handout.id}:collect`);
  assert.equal(result.status,"closed");assert.equal(result.data.outcomes.filter(row=>row.status==="resolved").length,1);
  assert.equal(result.data.outcomes.filter(row=>row.status==="blocked").length,1);
  assert.equal(f.db.getHandout(handout.id).metadata.evidence.original.holder,`character:${f.pcs[0].id}`);
  assert.equal(reconcileWindowCustody(f.db,f.guild,key,`${handout.id}:collect`).record_key,result.record_key);
  assert.throws(()=>joinActionWindow(f.db,f.guild,key,{accepted_intent:f.accepted(2,"I also try for the parcel.",handout.id).record_key}),/open|closed/i);
  const next=claim(f,2,handout.id,"a");assert.notEqual(next.result.window.record_key,key,"new native beat is not permanently closed by an old label");
}));
test("W01 PvP agreement stages a locked non-damaging window but invents no opponent action",()=>nativeFixture(f=>{
  const action=f.accepted(),p=proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:action.record_key,opponent:f.pcs[1].id,terms:pvpTerms(f.pcs)});
  assert.throws(()=>synchronizePvpWindow(f.db,f.guild,p.record_key),/locked|agreement/i);
  for(const pc of f.pcs.slice(0,2)){
    reviewPvp(f.db,f.guild,pc.owner_user_id,p.record_key);
    respondPvp(f.db,f.guild,pc.owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,decision:"accept",interaction_id:pc.id});
  }
  const window=synchronizePvpWindow(f.db,f.guild,p.record_key);
  assert.equal(window.status,"locked");assert.equal(window.data.pvp_participants.length,2);
  assert.equal(window.data.participants.length,0,"consent is not a fabricated typed action for the defender");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true,limit:10}).length,0);
  assert.equal(synchronizePvpWindow(f.db,f.guild,p.record_key).record_key,window.record_key);
}));
