/** T03: grounded no-roll/roll arbitration and native receipts. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { captureAuthoredTurnEnvelope } from "../src/authored-turn-envelope.js";
import { proposeIntents, acceptIntentForAdjudication } from "../src/typed-intents.js";
import { adjudicateAcceptedIntent, selectRuleBasis } from "../src/rules-arbitration.js";
import { contributeRoll } from "../src/roll-collaboration.js";
import { rollRevision } from "../src/roll-requests.js";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-t03-"));
const db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
const guild="t03-fixture";

function accepted(id,raw,operation,claim=null){
  const envelope=captureAuthoredTurnEnvelope(db,guild,"owner",pc.id,id,raw);
  const proposal={version:2,proposal_id:"",source_event:envelope.source_event,start:0,end:raw.length,source_span:raw,
    actor_character_id:pc.id,sequence_index:0,dependencies:[],type:"interact",operation,
    target:{kind:"object",key:"fixture",phrase:"fixture",grounding:"known"},framing:"immediate",destination_scope:"none",
    attempted_action:raw,desired_outcome:claim?claim.text:null,authored_outcome_claim:claim,temporal_relation:"sequential"};
  return acceptIntentForAdjudication(db,guild,proposeIntents(db,guild,[proposal],scope,{messageId:id})[0],scope,
    {resolvedTargetKey:"fixture"});
}

let pc,session,scope;
try{
  db.ensureCampaign(guild);
  configureCityFlags(db,guild,{roll_requests:true,roll_collaboration:true},"gm");
  session=db.startSession(guild,"T03 rules");
  db.upsertPlayer(guild,"owner","Owner");
  pc=db.createCharacter(guild,"owner","Tyrell",{traits:{Agility:2},resources:{hope:2,stress:{current:1,max:6}}});
  db.assignCharacter(session.id,"owner",pc.id);
  db.setPresence(session.id,"owner","present");
  scope={mode:"party",actorUserId:"owner",actorCharacterId:pc.id};
  db.upsertRulesRuling(guild,{key:"bench",question:"Sitting on an open bench",ruling:"No roll when unobstructed.",createdBy:"gm"});

  assert.equal(selectRuleBasis(db,guild,{savedRulingKey:"bench",rawRefs:["srd:action-rolls"]}).kind,"saved_ruling");
  assert.equal(selectRuleBasis(db,guild,{rawRefs:["srd:action-rolls"],houseRefs:["house:night"]}).kind,"RAW");
  assert.equal(selectRuleBasis(db,guild,{houseRefs:["house:night"]}).kind,"house_rule");
  assert.equal(selectRuleBasis(db,guild,{}).kind,"provisional");

  const sit=accepted("sit","Tyrell settles onto the open bench.","sit");
  const noRoll=adjudicateAcceptedIntent(db,guild,{acceptedIntent:sit.record_key,mode:"no_roll",risk:"none",stakes:"none",
    savedRulingKey:"bench",explanation:"Open, uncontested and costless."},"ai_gm",{scope});
  assert.equal(noRoll.disposition,"resolved");
  assert(noRoll.receipts.length===1);
  assert.equal(adjudicateAcceptedIntent(db,guild,{acceptedIntent:sit.record_key,mode:"no_roll",risk:"none",stakes:"none",
    savedRulingKey:"bench",explanation:"Open, uncontested and costless."},"ai_gm",{scope}).receipts[0],noRoll.receipts[0],
  "replay reuses the same no-roll receipt");

  const claim={text:"I crossed unseen",claimed_by:"owner",status:"unverified"};
  const stealth=accepted("stealth","I glide unseen across the guarded hall.","stealth",claim);
  const pending=adjudicateAcceptedIntent(db,guild,{acceptedIntent:stealth.record_key,mode:"roll_required",risk:"guards",
    stakes:"Detection blocks entry.",rawRefs:["srd:action-rolls"],trait:"Agility",kind:"action",difficulty:15,
    modifierKeys:[],explanation:"Meaningful uncertainty and consequence."},"ai_gm",{scope});
  assert.equal(pending.disposition,"roll_pending");
  assert(pending.roll_request_ref);
  const request=db.getCityRecord(guild,"roll_request",pending.roll_request_ref);
  assert.equal(request.status,"pending");
  assert.equal(request.data.input.accepted_intent,stealth.record_key);
  assert.equal(db.getCityRecord(guild,"typed_intent",stealth.record_key).data.authored_outcome_claim.status,"unverified");
  const beforeHope=db.getCharacter(pc.id).data.resources.hope;
  const rolled=contributeRoll(db,guild,"owner",{op:"roll",request:request.record_key,expected_revision:rollRevision(request),key:"t03-roll"},
    {rng:sides=>sides===12?6:1});
  assert(rolled.data.roll_id,"native commit stores actual dice");
  assert.equal(db.getCharacter(pc.id).data.resources.hope,beforeHope+1,"Hope result uses native Daggerheart resource semantics");
  assert.equal(contributeRoll(db,guild,"owner",{op:"roll",request:request.record_key,expected_revision:"stale",key:"t03-roll"},
    {rng:()=>{throw new Error("must not reroll");}}).data.roll_id,rolled.data.roll_id,"receipt replay does not reroll");
  console.log("T03 rules adjudication PASS: precedence, no-roll receipt, real pending request, native dice and claim isolation.");
}finally{
  db.close();
  fs.rmSync(dir,{recursive:true,force:true});
}
