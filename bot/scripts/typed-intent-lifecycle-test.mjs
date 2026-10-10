/** T01: immutable authored envelopes and proposal/acceptance separation. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import {
  captureAuthoredTurnEnvelope,
  recordNativeConsumedSpans,
  authoredTurnEnvelope
} from "../src/authored-turn-envelope.js";
import {
  proposeIntents,
  acceptIntentForAdjudication
} from "../src/typed-intents.js";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-t01-"));
const db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
const guild="t01-fixture";

function proposal(envelope,span,start,patch={}){
  return {
    version:2,proposal_id:"",source_event:envelope.source_event,start,end:start+span.length,source_span:span,
    actor_character_id:envelope.character_id,sequence_index:0,dependencies:[],type:"move",operation:"approach",
    target:{kind:"location",key:"night-market",phrase:"the night market",grounding:"known"},
    framing:"immediate",destination_scope:"exterior",attempted_action:"Approach the night market.",desired_outcome:null,
    authored_outcome_claim:null,temporal_relation:"sequential",...patch
  };
}

try{
  db.ensureCampaign(guild);
  const session=db.startSession(guild,"T01 source envelopes");
  db.upsertPlayer(guild,"owner","Owner");
  const pc=db.createCharacter(guild,"owner","Tyrell",{});
  db.assignCharacter(session.id,"owner",pc.id);
  db.setPresence(session.id,"owner","present");
  const scope={mode:"party",actorUserId:"owner",actorCharacterId:pc.id};
  const raw='I approach the night market. I approach the night market. "I enter the vault."';
  const envelope=captureAuthoredTurnEnvelope(db,guild,"owner",pc.id,"message-1",raw);
  assert.equal(envelope.raw_text,raw,"the untouched authenticated source is persisted");
  assert.equal(envelope.native_consumed_spans.length,0);

  const first=raw.indexOf("I approach"),second=raw.indexOf("I approach",first+1);
  const span="I approach the night market.";
  const proposed=proposeIntents(db,guild,[
    proposal(envelope,span,first,{sequence_index:0}),
    proposal(envelope,span,second,{sequence_index:1,dependencies:[],desired_outcome:"arrive unnoticed",
      authored_outcome_claim:{text:"I arrived unnoticed",claimed_by:"owner",status:"unverified"}})
  ],scope,{messageId:"message-1"});
  assert.equal(proposed.length,2);
  assert.notEqual(proposed[0].record_key,proposed[1].record_key,"identical text at different offsets has distinct identity");
  assert.equal(proposed[0].status,"proposed");

  const accepted=acceptIntentForAdjudication(db,guild,proposed[0],scope,{resolvedTargetKey:"night-market"});
  assert.equal(accepted.status,"accepted_for_adjudication");
  assert.match(accepted.data.authority,/input/i);
  assert.equal(accepted.data.authored_outcome_claim,null,"acceptance does not invent success");
  assert.equal(acceptIntentForAdjudication(db,guild,proposed[0],scope,{resolvedTargetKey:"night-market"}).record_key,
    accepted.record_key,"acceptance replay is idempotent");

  const claimedAccepted=acceptIntentForAdjudication(db,guild,proposed[1],scope,{resolvedTargetKey:"night-market"});
  assert.equal(claimedAccepted.data.authored_outcome_claim.status,"unverified");
  assert.equal(claimedAccepted.data.outcome_receipt,null,"a player success claim is not an outcome receipt");

  recordNativeConsumedSpans(db,guild,"owner",pc.id,"message-1",[{start:first,end:first+span.length,receipt_ref:"native:1"}]);
  assert.equal(authoredTurnEnvelope(db,guild,"message-1",pc.id).native_consumed_spans.length,1);
  const consumed=proposeIntents(db,guild,[proposal(envelope,span,first,{sequence_index:4})],scope,{messageId:"message-1"});
  assert.throws(()=>acceptIntentForAdjudication(db,guild,consumed[0],scope,{resolvedTargetKey:"night-market"}),/consumed/i,
    "a native-consumed span cannot execute again through the GM");

  assert.throws(()=>proposeIntents(db,guild,[proposal(envelope,span,first+1)],scope,{messageId:"message-1"}),/offset|span/i);
  assert.throws(()=>proposeIntents(db,guild,[proposal(envelope,span,second,{actor_character_id:"other"})],scope,
    {messageId:"message-1"}),/actor|principal/i);
  const redirected=proposeIntents(db,guild,[proposal(envelope,span,second,{sequence_index:7})],scope,{messageId:"message-1"})[0];
  assert.throws(()=>acceptIntentForAdjudication(db,guild,redirected,scope,{resolvedTargetKey:"other-place"}),/target|redirect/i);

  const quotedStart=raw.indexOf("I enter the vault.");
  const quoted=proposeIntents(db,guild,[proposal(envelope,"I enter the vault.",quotedStart,{sequence_index:8,
    operation:"enter",framing:"quoted",destination_scope:"interior",target:{kind:"location",key:"vault",phrase:"vault",grounding:"known"}})],
  scope,{messageId:"message-1"})[0];
  assert.throws(()=>acceptIntentForAdjudication(db,guild,quoted,scope,{resolvedTargetKey:"vault"}),/framing|immediate/i);

  db.upsertPlayer(guild,"other","Other");
  const other=db.createCharacter(guild,"other","Other",{});
  db.assignCharacter(session.id,"other",other.id);
  db.setPresence(session.id,"other","present");
  assert.throws(()=>acceptIntentForAdjudication(db,guild,proposed[1],{mode:"party",actorUserId:"other",actorCharacterId:other.id},
    {resolvedTargetKey:"night-market"}),/actor|principal|owner/i);

  const source=db.getWorldEvent(guild,envelope.source_event);
  db.saveWorldEvent(guild,{...source,key:source.event_key,status:"retracted",details:source.details});
  assert.throws(()=>acceptIntentForAdjudication(db,guild,proposed[1],scope,{resolvedTargetKey:"night-market"}),/active|source|stale/i);
  console.log("T01 typed intent lifecycle PASS: raw envelope, offsets, consumed spans, proposal/acceptance, claims and replay.");
}finally{
  db.close();
  fs.rmSync(dir,{recursive:true,force:true});
}
