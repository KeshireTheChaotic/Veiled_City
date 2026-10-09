/** Phase D contracts: recoverable fields, context overflow taxonomy, routing diagnostics and restore retention. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { recoverOptionalTurnFields } from "../src/turn-recovery.js";
import { budgetTurnPrompt } from "../src/prompt-budget.js";
import { ContextPlanner } from "../src/context-planner.js";
import { validateChannelRouting, shouldSendInactiveSessionNotice } from "../src/routing-diagnostics.js";

const review=Object.fromEntries(["facts_clues","resources","clocks","threads","references","relationships","handouts","canon","veil_exposure","npc_cognition"]
  .map(key=>[key,{decision:key==="references"?"changed":"no_change",reason:"Model review",confidence:80}]));
const recovered=recoverOptionalTurnFields({events:[],relationships:[],handouts:[],npc_memories:[],npc_knowledge:[],npc_goals:[],state_review:{...review,
  scene:{decision:"continue",reason:"same",label:""}}},{code:"POST_TURN_REVIEW"});
assert.equal(recovered.result.state_review.references.decision,"no_change");
assert.deepEqual(recoverOptionalTurnFields({narrative_interpretation:{bad:true}},{code:"NARRATIVE_CONTEXT"}).result.narrative_interpretation,null);
assert.throws(()=>budgetTurnPrompt([{label:"AUTH",value:"x".repeat(5000),required:true}],{maxChars:4000,reserveChars:0}),
  error=>error.code==="CONTEXT_OVERFLOW"&&error.diagnostic.retryable===true);
assert.equal(validateChannelRouting({play_channel_id:"one",rules_channel_id:"one"}).ok,false);
assert.equal(shouldSendInactiveSessionNotice("g","u",{now:1000,cooldownMs:100}),true);
assert.equal(shouldSendInactiveSessionNotice("g","u",{now:1050,cooldownMs:100}),false);

const root=fs.mkdtempSync(path.join(os.tmpdir(),"vc-phase-d-")),file=path.join(root,"test.sqlite");let db=new VeiledDB(file,path.resolve("sql/schema.sql"));
try{
  const guild="guild";db.ensureCampaign(guild);db.configureCampaign(guild,{playChannelId:"play"});
  assert.throws(()=>db.configureChannels(guild,{rulesChannelId:"play"}),/routing conflict/i);
  for(let i=0;i<52;i++)db.snapshotCampaign(guild,{label:`Retention ${i}`});
  assert.equal(db.listSnapshots(guild,100).length,50,"snapshot retention is bounded per campaign");
  db.proposeCanon(guild,{key:"location.diner.name",value:"Moonlight Diner",visibility:"gm"});
  const planner=new ContextPlanner(db),index=planner.authorityIndex(guild,"canon",{pageSize:1}),page=planner.authorityPage(guild,"canon",{page:0,pageSize:1});
  assert.equal(index.records[0].content_hash.length,16);assert.equal(page.records[0].value,"Moonlight Diner");
  const snap=db.snapshotCampaign(guild,{label:"Restore drill"});db.proposeCanon(guild,{key:"temporary.fact",value:"Temporary"});
  db.restoreSnapshot(guild,snap.id,{actorId:"test"});assert.equal(db.currentCanon(guild,"temporary.fact"),undefined);
  assert.deepEqual(db.db.prepare("PRAGMA foreign_key_check").all(),[]);
  assert.equal(fs.existsSync(path.resolve("package-lock.json")),true,"reproducible npm lockfile is committed with Phase D");
  console.log("Implementation Phase D PASS: optional recovery, bounded authority paging, routing/session diagnostics, retention and restore drill; zero live calls.");
}finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
