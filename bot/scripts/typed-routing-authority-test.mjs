/** T02: ordinary roleplay routes from accepted typed inputs, never phrase patterns. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { captureAuthoredTurnEnvelope } from "../src/authored-turn-envelope.js";
import { proposeIntents, acceptIntentForAdjudication, currentAcceptedIntent } from "../src/typed-intents.js";
import { rollDeclaration } from "../src/roll-language.js";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-t02-"));
const db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
const guild="t02-fixture";
try{
  db.ensureCampaign(guild);
  const session=db.startSession(guild,"T02 typed routing");
  db.upsertPlayer(guild,"owner","Owner");
  const pc=db.createCharacter(guild,"owner","Tyrell",{});
  db.assignCharacter(session.id,"owner",pc.id);
  db.setPresence(session.id,"owner","present");
  const scope={mode:"party",actorUserId:"owner",actorCharacterId:pc.id};

  for(const [id,raw,type,operation,targetKind,targetKey] of [
    ["fragment","Toward the night market, Tyrell drifts.","move","approach","location","night-market"],
    ["passive","The back room is searched next.","search","inspect","location","back-room"],
    ["speech","To Mara: Work available tonight?","speak","address","npc","mara"]
  ]){
    const envelope=captureAuthoredTurnEnvelope(db,guild,"owner",pc.id,id,raw);
    const proposal={version:2,proposal_id:"",source_event:envelope.source_event,start:0,end:raw.length,source_span:raw,
      actor_character_id:pc.id,sequence_index:0,dependencies:[],type,operation,
      target:{kind:targetKind,key:targetKey,phrase:targetKey.replaceAll("-"," "),grounding:"known"},
      framing:"immediate",destination_scope:type==="move"?"exterior":"none",attempted_action:raw,desired_outcome:null,
      authored_outcome_claim:null,temporal_relation:"sequential"};
    const proposed=proposeIntents(db,guild,[proposal],scope,{messageId:id})[0];
    const accepted=acceptIntentForAdjudication(db,guild,proposed,scope,{resolvedTargetKey:targetKey});
    assert.equal(currentAcceptedIntent(db,guild,{sourceEvent:envelope.source_event,actor:pc.id,type,sourceSpan:raw,targetKey})?.record_key,
      accepted.record_key,`${id} routes by accepted structure without a phrase whitelist`);
  }

  assert.equal(rollDeclaration("Could you please spend my Hope to help Mara?"),null,
    "polite or inferred prose cannot authorize a spend");
  assert.equal(rollDeclaration("I spend 1 Hope to help Mara by covering the exit.")?.op,"help",
    "the existing exact owner spend adapter remains available to native review");
  console.log("T02 typed routing PASS: syntax-independent accepted routes; explicit spend gate preserved.");
}finally{
  db.close();
  fs.rmSync(dir,{recursive:true,force:true});
}
