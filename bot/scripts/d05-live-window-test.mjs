/** D05: production coordination opens only explicit meaningful shared beats. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { currentScene } from "../src/scene-continuity.js";
import { coordinateTypedActionWindows } from "../src/scene-action-window.js";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-d05-")),db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
const guild="d05-fixture";
try{
  db.ensureCampaign(guild);const session=db.startSession(guild,"D05 shared beat"),scene=currentScene(db,guild);
  db.upsertPlayer(guild,"owner-a","A");db.upsertPlayer(guild,"owner-b","B");
  const pcA=db.createCharacter(guild,"owner-a","A",{location:"terminal"}),pcB=db.createCharacter(guild,"owner-b","B",{location:"terminal"});
  db.updateCharacterData(pcA.id,data=>{data.location="terminal";});db.updateCharacterData(pcB.id,data=>{data.location="terminal";});
  for(const [user,pc] of [["owner-a",pcA],["owner-b",pcB]]){db.assignCharacter(session.id,user,pc.id);db.setPresence(session.id,user,"present");}
  const accepted=(id,actor,coordination=null)=>{
    const source=indexWorldEvent(db,guild,{key:`source:${id}`,kind:"authored_turn",title:id,source_id:`player:${actor}`,
      session_id:session.id,scene:scene.key,visibility:"party",details:{author:actor}},actor);
    const row=db.saveCityRecord(guild,{kind:"typed_intent",key:`accepted:${id}`,status:"accepted_for_adjudication",
      source_event:source.event_key,visibility:"party",actor_key:actor,data:{proposal_id:`proposal:${id}`,sequence_index:0,
        dependencies:[],source_span:id,actor,session_id:session.id,scene:scene.key,resolution:"auto",coordination}});
    const plan=db.saveCityRecord(guild,{kind:"compound_action",key:`action:${id}`,status:"ready",source_event:source.event_key,
      visibility:"party",data:{action_id:row.record_key,status:"ready",source_span:id}});
    return {row,plan};
  };
  const ordinary=accepted("move-near",pcA.id,null);
  assert.deepEqual(coordinateTypedActionWindows(db,guild,[ordinary.row],[ordinary.plan]),[]);
  assert.equal(db.getCityRecord(guild,"compound_action",ordinary.plan.record_key).status,"ready");

  const coordination={reason:"contested_resource",beat_key:"parcel-claim",reads:[],writes:["item:parcel:custody"],
    location_key:"terminal",operation:"claim",required_participants:[],consent_refs:[]};
  const first=accepted("claim-a",pcA.id,coordination),firstResult=coordinateTypedActionWindows(db,guild,[first.row],[first.plan]);
  assert.equal(firstResult[0].status,"joined");
  assert.equal(db.getCityRecord(guild,"compound_action",first.plan.record_key).status,"pending");
  const second=accepted("claim-b",pcB.id,coordination),secondResult=coordinateTypedActionWindows(db,guild,[second.row],[second.plan]);
  assert.equal(secondResult[0].participant.data.classification,"same_scarce_resource");

  const conflict=accepted("kick-choso",pcA.id,{reason:"direct_pc_conflict",beat_key:"kick-choso",reads:[`character:${pcB.id}`],
    writes:[`character:${pcB.id}:body`],location_key:"terminal",operation:"opposed",required_participants:[pcB.id],consent_refs:[]});
  const conflictResult=coordinateTypedActionWindows(db,guild,[conflict.row],[conflict.plan]);
  assert.equal(conflictResult[0].status,"awaiting_consent");
  assert.equal(db.getCityRecord(guild,"compound_action",conflict.plan.record_key).status,"pending");
  assert.equal(conflictResult[0].participant,null,"attempted kick creates no forced participation or outcome");
  assert(!db.listCityRecords(guild,{kind:"action_outcome_receipt",includeGM:true,limit:20}).length);

  const stateSource=fs.readFileSync(new URL("../src/state.js",import.meta.url),"utf8");
  assert(/coordinateTypedActionWindows\(db,guildId,typedIntents,actionPlan\)/.test(stateSource),"live state path must coordinate typed actions");
  console.log("D05 live windows PASS: ordinary independence, scarce overlap and consent-pending PC conflict.");
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
