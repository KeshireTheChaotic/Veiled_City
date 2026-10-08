/** Regression coverage for queue failures, guild isolation, receipts, and provenance. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { VeiledDB } from "../src/db.js";
import { applyAuthoritativeMutation } from "../src/state.js";
import { installReceiptCapture, replayReceiptIfPresent } from "../src/idempotency.js";

const schemaPath=fileURLToPath(new URL("../sql/schema.sql",import.meta.url));
const queueUrl=new URL("../src/serial-queue.js",import.meta.url).href;
// An unhandled internal promise rejects on the next event-loop turn, so check
// process survival as well as the error received by the caller.
const child=spawnSync(process.execPath,["--input-type=module","-e",`
  import assert from 'node:assert/strict';
  const { KeyedSerialQueue } = await import(${JSON.stringify(queueUrl)});
  const queue=new KeyedSerialQueue();
  await assert.rejects(queue.enqueue('guild',()=>{throw Error('turn failed');}),/turn failed/);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(queue.pending('guild'),false);
  const order=[];
  const first=queue.enqueue('guild',async()=>{order.push(1);throw Error('another failure');});
  const second=queue.enqueue('guild',()=>{order.push(2);return 'recovered';});
  await assert.rejects(first,/another failure/);
  assert.equal(await second,'recovered');
  assert.deepEqual(order,[1,2]);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(queue.pending('guild'),false);
`],{encoding:"utf8"});
assert.equal(child.status,0,child.stderr||child.error?.message);

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-audit-regression-"));
const databasePath=path.join(tmp,"legacy.sqlite");
let db;
try{
  // Build the old thread schema, then reopen through the real migration path.
  const legacy=new DatabaseSync(databasePath);
  const schema=fs.readFileSync(schemaPath,"utf8");
  const oldSchema=schema.replace(/CREATE TABLE IF NOT EXISTS threads \([\s\S]*?\n\);/,table=>
    table.replace("id TEXT NOT NULL","id TEXT PRIMARY KEY").replace("  PRIMARY KEY(guild_id,id),\n",""));
  legacy.exec(oldSchema);
  legacy.prepare("INSERT INTO campaigns(guild_id) VALUES(?)").run("a");
  legacy.prepare("INSERT INTO threads(id,guild_id,label,notes) VALUES(?,?,?,?)")
    .run("missing-person","a","Campaign A case","Preserve this note");
  legacy.close();
  db=new VeiledDB(databasePath,schemaPath);
  assert.equal(db.getThread("a","missing-person").notes,"Preserve this note");
  db.ensureCampaign("b");
  applyAuthoritativeMutation(db,{guildId:"b",events:[{type:"thread",key:"missing-person",value:"Campaign B case"}]});
  assert.equal(db.getThread("a","missing-person").label,"Campaign A case");
  assert.equal(db.getThread("b","missing-person").label,"Campaign B case");
  const snapshot=db.snapshotCampaign("b");
  db.upsertThread("b",{id:"missing-person",label:"Changed B case"});
  db.restoreSnapshot("b",snapshot.id);
  assert.equal(db.getThread("b","missing-person").label,"Campaign B case");
  assert.equal(db.getThread("a","missing-person").notes,"Preserve this note");
  db.close();
  db=new VeiledDB(databasePath,schemaPath);
  assert.equal(db.getThread("b","missing-person").label,"Campaign B case","migration must be idempotent");

  applyAuthoritativeMutation(db,{
    guildId:"a",scope:{mode:"private",actorUserId:"user"},
    events:[{type:"veil_exposure_delta",amount:1},
      {type:"fact",key:"private-clue",value:"The clue",visibility:"party"}]
  });
  const rows=db.listMutationLedger("a");
  assert(!rows.some(row=>row.mutation_type==="event:veil_exposure_delta"));
  const fact=rows.find(row=>row.mutation_type==="event:fact");
  assert.equal(fact.entity_key,"private-clue");
  assert.equal(JSON.parse(fact.payload_json).type,"fact");
  assert.equal(JSON.parse(fact.after_json).content,"The clue");
  assert.equal(fact.visibility,"player","ledger must use the enforced private visibility");

  for(const responseMethod of ["reply","editReply"]){
    const id=`failed-${responseMethod}`;
    const interaction={id,guildId:"a",user:{id:"user"},commandName:"vc-gm",
      [responseMethod]:async()=>{throw Error("Discord unavailable");}};
    const restore=installReceiptCapture({db,interaction,group:"gm",sub:"fear"});
    db.changeFear("a",1);
    await assert.rejects(interaction[responseMethod]({content:"Fear increased"}),/Discord unavailable/);
    restore();
    assert(db.getOperationReceipt("a",id));
    let replayText="";
    const replay={...interaction,reply:async payload=>{replayText=payload.content;}};
    assert.equal(await replayReceiptIfPresent({db,interaction:replay,group:"gm",sub:"fear"}),true);
    assert.match(replayText,/Already applied/);
    assert.equal(db.listMutationLedger("a").filter(row=>row.source_interaction_id===id).length,1);
  }
  assert.equal(db.getCampaign("a").fear,2);
  const invalid={id:"invalid",guildId:"a",user:{id:"user"},reply:async()=>{}};
  const restore=installReceiptCapture({db,interaction:invalid,group:"gm",sub:"fear"});
  await invalid.reply({content:"⚠️ Permission denied"});
  assert.equal(db.getOperationReceipt("a","invalid"),undefined,"failed validation must remain retryable");
  restore();
}finally{
  db?.close();
  fs.rmSync(tmp,{recursive:true,force:true});
}
console.log("Veilkeeper audit regression test: PASS");
