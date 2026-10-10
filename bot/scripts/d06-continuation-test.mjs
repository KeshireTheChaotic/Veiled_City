/** D06: native completion resumes only authorized descendants and production reconciliation is strict. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { buildActionPlan } from "../src/action-dependency.js";
import { finalizeTypedRollAction } from "../src/typed-roll-outcomes.js";
import { reconcileConsequences } from "../src/consequence-reconciliation.js";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-d06-")),db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
const guild="d06-fixture";
try{
  db.ensureCampaign(guild);const source=indexWorldEvent(db,guild,{key:"source",kind:"authored_turn",title:"Compound",
    source_id:"player:owner",visibility:"party",details:{author:"owner"}},"owner");
  const typed=(id,index,deps,resolution,type="interact")=>db.saveCityRecord(guild,{kind:"typed_intent",key:`accepted:${id}`,
    status:"accepted_for_adjudication",source_event:source.event_key,visibility:"party",data:{proposal_id:`proposal:${id}`,
      sequence_index:index,dependencies:deps,type,operation:id,source_span:id,actor:"pc",owner_user_id:"owner",
      session_id:"session",scene:"scene",resolution,outcome_receipt:null}});
  const unlock=typed("unlock",0,[],"roll_required"),enter=typed("enter",1,[unlock.data.proposal_id],"auto"),
    warn=typed("warn",2,[],"conversational","speak");
  let plan=buildActionPlan(db,guild,[unlock,enter,warn]);
  assert.deepEqual(plan.map(row=>row.data.status),["pending","suspended","ready"]);
  const request=db.saveCityRecord(guild,{kind:"roll_request",key:"roll:unlock",status:"resolved",source_event:source.event_key,
    visibility:"character",subject_key:"pc",data:{input:{accepted_intent:unlock.record_key},result:{total:18,duality:"Hope"},
      breakdown:{difficulty:14},roll_id:"native-roll",revision:2}});
  db.saveCityRecord(guild,{kind:"native_adjudication",key:"adjudication:unlock",status:"roll_pending",source_event:source.event_key,
    visibility:"character",subject_key:"pc",data:{action_id:unlock.record_key,disposition:"roll_pending",roll_request_ref:request.record_key}});
  const completed=finalizeTypedRollAction(db,guild,request);
  assert.equal(completed.outcome,"success");
  plan=[unlock,enter,warn].map(row=>db.listCityRecords(guild,{kind:"compound_action",includeGM:true,limit:20})
    .find(node=>node.data.action_id===row.record_key));
  assert.deepEqual(plan.map(row=>row.data.status),["resolved","ready","ready"],"only the successful dependent resumes");
  assert.equal(finalizeTypedRollAction(db,guild,request).receipt,completed.receipt,"completion replay is idempotent");
  assert.equal(db.getCityRecord(guild,"typed_intent",unlock.record_key).data.outcome_receipt,completed.receipt);
  assert.equal(reconcileConsequences(db,guild,{intents:[unlock],narration:"The lock opens.",scope:{mode:"party"},strict:true})
    .actions[0].receipt_refs[0],completed.receipt);
  const orchestration=fs.readFileSync(new URL("../src/turn-orchestration.js",import.meta.url),"utf8");
  assert(/reconcileConsequences\([^;]+strict:true/s.test(orchestration),"live orchestration must not use permissive reconciliation");
  console.log("D06 continuation PASS: receipt completion, selective resume, replay and strict live reconciliation.");
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
