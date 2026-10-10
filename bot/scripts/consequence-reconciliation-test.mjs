/** T06: narration follows pending/resolved native receipts and preserves audience projections. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { reconcileConsequences } from "../src/consequence-reconciliation.js";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-t06-"));
const db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
const guild="t06-fixture";
try{
  db.ensureCampaign(guild);
  const source=indexWorldEvent(db,guild,{key:"source",kind:"authored_turn",title:"Stealth attempt",source_id:"player:owner",
    visibility:"party",details:{}},"owner");
  const intent=db.saveCityRecord(guild,{kind:"typed_intent",key:"accepted:stealth",status:"accepted_for_adjudication",
    source_event:source.event_key,visibility:"party",data:{actor:"pc",type:"interact",resolution:"roll_required",source_span:"I pass unseen",
      authored_outcome_claim:{text:"I pass unseen",claimed_by:"owner",status:"unverified"}}});
  const request=db.saveCityRecord(guild,{kind:"roll_request",key:"request:stealth",status:"pending",source_event:source.event_key,
    visibility:"character",subject_key:"pc",data:{}});
  db.saveCityRecord(guild,{kind:"native_adjudication",key:"adjudication:stealth",status:"roll_pending",source_event:source.event_key,
    visibility:"character",subject_key:"pc",data:{action_id:intent.record_key,disposition:"roll_pending",roll_request_ref:request.record_key,receipts:[]}});
  assert.throws(()=>reconcileConsequences(db,guild,{intents:[intent],narration:"I pass unseen beyond the guards.",private_messages:[],scope:{mode:"party"}}),/claim|pending/i);
  const pending=reconcileConsequences(db,guild,{intents:[intent],narration:"The guards turn; whether you pass unseen is unresolved.",private_messages:[],scope:{mode:"party"}});
  assert.equal(pending.actions[0].disposition,"roll_pending");
  const receipt=db.saveCityRecord(guild,{kind:"action_outcome_receipt",key:"receipt:stealth",status:"resolved",source_event:source.event_key,
    visibility:"party",data:{outcome:"success"}});
  db.saveCityRecord(guild,{...intent,key:intent.record_key,status:"resolved",data:{...intent.data,outcome_receipt:receipt.record_key}});
  const resolved=reconcileConsequences(db,guild,{intents:[db.getCityRecord(guild,"typed_intent",intent.record_key)],
    narration:"You pass unseen beyond the guards.",private_messages:[],scope:{mode:"party"}});
  assert.equal(resolved.actions[0].disposition,"resolved");
  const privateIntent=db.saveCityRecord(guild,{kind:"typed_intent",key:"accepted:private",status:"resolved",source_event:source.event_key,
    visibility:"character",subject_key:"pc",data:{actor:"pc",type:"observe",resolution:"auto",source_span:"I inspect it",
      outcome_receipt:receipt.record_key,authored_outcome_claim:null}});
  const privateResult=reconcileConsequences(db,guild,{intents:[privateIntent],narration:"A private mark is visible.",private_messages:[],
    scope:{mode:"private",actorCharacterId:"pc",actorUserId:"owner"}});
  assert.equal(privateResult.projections[0].visibility,"character");
  assert.equal(reconcileConsequences(db,guild,{intents:[privateIntent],narration:"A private mark is visible.",private_messages:[],
    scope:{mode:"private",actorCharacterId:"pc",actorUserId:"owner"}}).record_key,privateResult.record_key,"replay is stable");
  console.log("T06 consequence reconciliation PASS: false success refusal, pending uncertainty, receipts, privacy and replay.");
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
