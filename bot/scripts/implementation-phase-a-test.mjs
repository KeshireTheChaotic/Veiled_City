/** Phase A contracts: durable attempts, mixed-message spans, response obligations and truthful recovery. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { messageSpans, routeMessageSpans } from "../src/message-span-ledger.js";
import { responseObligation } from "../src/player-language.js";
import { beginTurnAttempt, advanceTurnAttempt, isTurnReplay, turnFailureNotice } from "../src/turn-attempts.js";

const root=fs.mkdtempSync(path.join(os.tmpdir(),"vc-phase-a-"));
const db=new VeiledDB(path.join(root,"test.sqlite"),path.resolve("sql/schema.sql"));
try{
  db.ensureCampaign("guild");
  const first=beginTurnAttempt(db,{guildId:"guild",messageId:"message-1",actorPrincipal:"discord:owner",sessionId:"session-1",audience:"party"});
  const replay=beginTurnAttempt(db,{guildId:"guild",messageId:"message-1",actorPrincipal:"discord:owner",sessionId:"session-1",audience:"party"});
  assert.equal(first.turn_id,replay.turn_id,"duplicate Discord delivery resolves to one logical turn");
  advanceTurnAttempt(db,first.turn_id,"committed",{committed:"yes",nativeCommitId:"commit-1"});
  assert(isTurnReplay(db.getTurnAttempt(first.turn_id)));
  assert.match(turnFailureNotice(db.getTurnAttempt(first.turn_id),"ref-1"),/Do not repeat/);

  const source="I roll and ask the barman what he saw.";
  assert.deepEqual(messageSpans(source).map(row=>row.text),["I roll","ask the barman what he saw."]);
  let rolls=0;
  const ledger=await routeMessageSpans(source,[{kind:"roll",route:async span=>{
    if(span.text!=="I roll")return null;rolls++;return {handled:true,committed:true,receipt:"roll-1"};
  }}]);
  assert.equal(rolls,1);assert.equal(ledger.native_receipts.length,1);
  assert.equal(ledger.remaining_text,"ask the barman what he saw.");

  assert(responseObligation("Another empty shift.",{authenticated:true}).needed);
  assert(responseObligation("I look up at the rain and sigh, \"I need work.\"",{authenticated:true}).needed);
  assert.equal(responseObligation("OOC I will be late",{authenticated:true}).needed,false);
  assert.equal(responseObligation("Nice plan",{authenticated:false}).needed,false);
  console.log("Implementation Phase A PASS: durable replay, truthful recovery, exact mixed spans and bounded response obligation; zero live calls.");
}finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
