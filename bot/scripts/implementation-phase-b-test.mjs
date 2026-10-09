/** Phase B contracts: transactional ordered outbox, partial failure, restart uncertainty, retry and restore. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { beginTurnAttempt } from "../src/turn-attempts.js";
import { queueTurnPublications, deliverTurnOutbox } from "../src/publication-outbox.js";

const root=fs.mkdtempSync(path.join(os.tmpdir(),"vc-phase-b-"));
const file=path.join(root,"test.sqlite");let db=new VeiledDB(file,path.resolve("sql/schema.sql"));
try{
  db.ensureCampaign("guild");
  const attempt=beginTurnAttempt(db,{guildId:"guild",messageId:"message",actorPrincipal:"discord:owner",sessionId:"session",audience:"party"});
  db.transaction(()=>{
    db.updateTurnAttempt(attempt.turn_id,{stage:"committed",committed:"yes",nativeCommitId:"commit"});
    queueTurnPublications(db,{guild:{id:"guild"},session:{id:"session"},scope:{mode:"party"},turnId:attempt.turn_id,
      channelId:"play",result:{narration:`${"a".repeat(1800)}\n${"b".repeat(1800)}`,private_messages:[]}});
  });
  const rows=db.listTurnPublications("guild",attempt.turn_id);assert.equal(rows.length,2);assert.equal(rows[0].status,"pending");
  const sent=[];
  const first=await deliverTurnOutbox(db,"guild",attempt.turn_id,async row=>{
    sent.push(row.ordinal);if(row.ordinal===1)throw new Error("injected Discord failure");return {messageId:`discord-${row.ordinal}`,channelId:"play"};
  });
  assert.deepEqual(sent,[0,1]);assert.equal(first[0].ok,true);assert.equal(first[1].ok,false);
  assert.deepEqual(db.listTurnPublications("guild",attempt.turn_id).map(row=>row.status),["delivered","failed"]);
  sent.length=0;await deliverTurnOutbox(db,"guild",attempt.turn_id,async row=>{sent.push(row.ordinal);return {messageId:"discord-1",channelId:"play"};});
  assert.deepEqual(sent,[1],"retry sends only the missing part");

  db.updatePublication(rows[0].id,{status:"delivering"});db.close();db=new VeiledDB(file,path.resolve("sql/schema.sql"));
  db.markAllInterruptedPublicationsUncertain();assert.equal(db.listTurnPublications("guild",attempt.turn_id)[0].status,"uncertain");
  sent.length=0;await deliverTurnOutbox(db,"guild",attempt.turn_id,async row=>{sent.push(row.ordinal);return {};});assert.deepEqual(sent,[]);
  await deliverTurnOutbox(db,"guild",attempt.turn_id,async row=>{sent.push(row.ordinal);return {};},{forceUncertain:true});assert.deepEqual(sent,[0]);
  const snapshot=db.snapshotCampaign("guild",{label:"with delivery"});db.updatePublication(rows[0].id,{status:"failed"});
  db.restoreSnapshot("guild",snapshot.id,{actorId:"gm"});assert.equal(db.listTurnPublications("guild",attempt.turn_id)[0].status,"delivered");
  console.log("Implementation Phase B PASS: atomic ordered outbox, partial retry, uncertain restart and snapshot restore; zero live calls.");
}finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
