/** Adaptive-context and contact success/refusal fixtures use production persistence and seeded mechanics. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { ContextPlanner } from "../src/context-planner.js";
import { resolveNpcConversation } from "../src/npc-conversations.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { configureSimulationEntity } from "../src/simulation.js";
import { handleStoryCommand } from "../src/story-commands.js";
import { fakeInteraction } from "./contract-fixtures.mjs";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-context-"));
const db=new VeiledDB(path.join(temp,"test.sqlite"),path.resolve("sql/schema.sql"));
try{
  const guild="contract";db.ensureCampaign(guild);db.ensureCampaign("other");
  for(const npc of ["alice","bob"]){
    db.upsertNpcProfile(guild,{npcKey:npc,displayName:npc,activityTier:"active"});
    configureSimulationEntity(db,guild,"npc",npc,{activity_tier:"active",location_key:"station"});
    db.upsertNpcGoal(guild,{npcKey:npc,goalKey:"contact",objective:"Discuss the established incident",acceptableMethods:["contact"]});
  }
  db.upsertNpcKnowledge(guild,{npcKey:"alice",knowledgeKey:"old-clue",content:"Old clue at the quay",isSecret:true});
  const anchor=db.addFact(guild,{content:"Ancient lighthouse clue",visibility:"party"});
  for(let i=0;i<120;i++){
    db.addFact(guild,{content:`Unrelated recent event ${i}`,visibility:"party"});
    db.upsertNpcKnowledge(guild,{npcKey:"alice",knowledgeKey:`noise-${i}`,content:`Unrelated memory ${i}`});
  }
  db.addFact(guild,{content:"Nearby private lighthouse culprit",visibility:"gm"});
  const planner=new ContextPlanner(db),pc=planner.plan(guild,{actorType:"player",userId:"stranger",scope:"party",query:"lighthouse",maxTokens:200});
  assert(pc.segments.some(row=>row.source===`fact:${anchor}`));assert(!JSON.stringify(pc).includes("culprit"));assert(pc.estimated_tokens<=200);
  const alice=planner.plan(guild,{actorType:"npc",actorKey:"alice",scope:"gm",query:"old-clue",maxTokens:300});
  assert(JSON.stringify(alice).includes("Old clue at the quay"));
  assert(!JSON.stringify(planner.plan(guild,{actorType:"npc",actorKey:"bob",query:"old-clue"})).includes("Old clue at the quay"));
  assert.throws(()=>planner.plan("other",{actorType:"npc",actorKey:"alice"}),/not found/);
  indexWorldEvent(db,guild,{key:"contact-source",title:"Contact opportunity",source_kind:"gm",source_id:"GM approved context"});
  db.saveCityEdge(guild,{kind:"channel",from:"npc:alice",to:"npc:bob",source_event:"contact-source"});
  const input={key:"call-1",from:"alice",to:"bob",from_goal:"contact",to_goal:"contact",source_event:"contact-source",opportunity:"scene",information_key:"old-clue"};
  assert.throws(()=>resolveNpcConversation(db,guild,input,"gm"),/opt-in/);
  configureCityFlags(db,guild,{conversations:true,adaptive_context:true});
  assert.throws(()=>resolveNpcConversation(db,guild,{...input,information_key:"unknown"},"gm"),/unknown/);
  let n=0;const result=resolveNpcConversation(db,guild,input,"gm",{roll:()=>++n%2?20:1});
  assert.equal(result.data.outcome,"contacted");assert.equal(result.data.binding_agreement,false);
  assert(!JSON.stringify(result.data.actor_packets[1]).includes("Old clue at the quay"));
  assert.equal(db.getNpcKnowledge(guild,"bob","old-clue").belief_state,"suspected");
  assert.equal(resolveNpcConversation(db,guild,input,"gm").record_key,result.record_key);
  assert.equal(n,2);assert.equal(db.getSimulationEntity(guild,"npc","alice").state.resources.influence,3);
  assert.throws(()=>resolveNpcConversation(db,guild,{...input,key:"call-2"},"gm"),/budget/);
  db.advanceSimulationClock(guild,{ticks:1});
  db.upsertNpcProfile(guild,{npcKey:"bob",displayName:"bob",decisionProfile:{conversation_policy:"refuse"}});
  const refusal=resolveNpcConversation(db,guild,{...input,key:"refusal"},"gm");assert.equal(refusal.data.outcome,"refused");
  assert.equal(db.getSimulationEntity(guild,"npc","alice").state.resources.influence,3);
  const read=fakeInteraction({sub:"context",json:{actorType:"npc",actorKey:"alice",query:"quay"}});
  await handleStoryCommand(read,{db});assert(read.deliveries[0].ephemeral);
  await assert.rejects(()=>handleStoryCommand(fakeInteraction({gm:false}),{db}),/GM\/admin/);
  console.log("Context/conversation PASS: old clue beyond 120 records; scoped packets; contact/refusal/retry; no extra AI calls.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
