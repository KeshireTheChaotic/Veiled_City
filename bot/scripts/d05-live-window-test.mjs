/** D05: production coordination opens only explicit meaningful shared beats. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { currentScene } from "../src/scene-continuity.js";
import { coordinateTypedActionWindows } from "../src/frameworks/session/public.js";
import { captureAuthoredTurnEnvelope } from "../src/authored-turn-envelope.js";
import { proposeIntents, acceptIntentForAdjudication } from "../src/typed-intents.js";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-d05-")),db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
const guild="d05-fixture";
try{
  db.ensureCampaign(guild);const session=db.startSession(guild,"D05 shared beat"),scene=currentScene(db,guild);
  db.upsertPlayer(guild,"owner-a","A");db.upsertPlayer(guild,"owner-b","B");
  const pcA=db.createCharacter(guild,"owner-a","A",{location:"terminal"}),pcB=db.createCharacter(guild,"owner-b","B",{location:"terminal"});
  db.updateCharacterData(pcA.id,data=>{data.location="terminal";});db.updateCharacterData(pcB.id,data=>{data.location="terminal";});
  for(const [user,pc] of [["owner-a",pcA],["owner-b",pcB]]){db.assignCharacter(session.id,user,pc.id);db.setPresence(session.id,user,"present");}
  const accepted=(id,actor,coordination=null)=>{
    const user=db.getCharacter(actor).owner_user_id,scope={mode:"party",actorUserId:user,actorCharacterId:actor};
    const source=captureAuthoredTurnEnvelope(db,guild,user,actor,id,id);
    const proposed=proposeIntents(db,guild,[{version:2,proposal_id:"",source_event:source.source_event,start:0,end:id.length,
      source_span:id,actor_character_id:actor,sequence_index:0,dependencies:[],type:"interact",operation:"inspect",
      target:{kind:"object",key:"parcel",phrase:"parcel",grounding:"known"},framing:"immediate",destination_scope:"none",
      attempted_action:id,desired_outcome:null,authored_outcome_claim:null,temporal_relation:"sequential"}],scope,{messageId:id})[0];
    let row=acceptIntentForAdjudication(db,guild,proposed,scope);
    row=db.saveCityRecord(guild,{...row,key:row.record_key,data:{...row.data,coordination}});
    const plan=db.saveCityRecord(guild,{kind:"compound_action",key:`action:${id}`,status:"ready",source_event:source.source_event,
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
