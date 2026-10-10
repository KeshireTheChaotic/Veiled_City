/** T04: ordered compound-action DAG, suspension, selective failure and replay. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { buildActionPlan, transitionAction, executableActionSpans } from "../src/action-dependency.js";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-t04-"));
const db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
const guild="t04-fixture";
const row=(id,index,dependencies,resolution="auto",span=id)=>({record_key:`accepted:${id}`,source_event:"source",
  visibility:"party",subject_key:null,status:"accepted_for_adjudication",data:{proposal_id:id,sequence_index:index,
    dependencies,type:id==="wait"?"speak":"interact",operation:id,source_span:span,actor:"pc",owner_user_id:"owner",
    session_id:"session",scene:"scene",resolution}});
try{
  db.ensureCampaign(guild);
  indexWorldEvent(db,guild,{key:"source",kind:"authored_turn",title:"Compound declaration",source_id:"player:owner",
    visibility:"party",details:{author:"owner"}},"owner");
  const plan=buildActionPlan(db,guild,[row("unlock",0,[],"roll_required"),row("enter",1,["unlock"]),
    row("search",2,["enter"]),row("wait",3,[],"auto","I warn the others while I wait.")]);
  assert.deepEqual(plan.map(x=>x.data.status),["pending","suspended","suspended","ready"]);
  assert.deepEqual(executableActionSpans(plan),["I warn the others while I wait."],"independent action survives pending prerequisite");
  const failed=transitionAction(db,guild,plan[0].record_key,{expected_status:"pending",status:"failed",receipt:"roll:failed"});
  assert.equal(failed.data.status,"failed");
  const refreshed=buildActionPlan(db,guild,[row("unlock",0,[],"roll_required"),row("enter",1,["unlock"]),
    row("search",2,["enter"]),row("wait",3,[],"auto","I warn the others while I wait.")]);
  assert.deepEqual(refreshed.map(x=>x.data.status),["failed","blocked","blocked","ready"]);
  const independent=transitionAction(db,guild,refreshed[3].record_key,{expected_status:"ready",status:"resolved",receipt:"speech:1"});
  assert.equal(transitionAction(db,guild,refreshed[3].record_key,{expected_status:"ready",status:"resolved",receipt:"speech:1"}).record_key,
    independent.record_key,"same receipt replays idempotently");
  assert.throws(()=>transitionAction(db,guild,refreshed[3].record_key,{expected_status:"ready",status:"resolved",receipt:"speech:2"}),/stale|receipt/i);
  assert.throws(()=>buildActionPlan(db,guild,[row("a",0,["b"]),row("b",1,["a"])]),/cycle/i);
  assert.throws(()=>buildActionPlan(db,guild,[row("a",0,["missing"])]),/dependency/i);
  console.log("T04 compound actions PASS: stable DAG, pending suspension, selective failure, independent completion and replay.");
}finally{
  db.close();
  fs.rmSync(dir,{recursive:true,force:true});
}
