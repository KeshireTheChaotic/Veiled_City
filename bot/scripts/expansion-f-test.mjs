/** Real source-preserving consolidation and thousand-actor bounded-density fixtures; synthetic, never model-quality claims. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { configureSimulationEntity, simulationCandidates } from "../src/simulation.js";
import { manageMemoryCluster, clusterContext } from "../src/memory-clusters.js";
import { retrieveNpcCognition } from "../src/npc-cognition.js";
import { ContextPlanner } from "../src/context-planner.js";
const root=fs.mkdtempSync(path.join(os.tmpdir(),"vc-expansion-f-")),file=path.join(root,"fixture.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const guild="f";db.ensureCampaign(guild);db.ensureCampaign("other");
  indexWorldEvent(db,guild,{key:"source",title:"Contradictory reports",source_kind:"gm",source_id:"human"});
  for(const npc of ["z-target","other","cold","unaware"]){db.upsertNpcProfile(guild,{npcKey:npc,displayName:npc,activityTier:["cold","unaware"].includes(npc)?"dormant":"active"});
    db.upsertNpcGoal(guild,{npcKey:npc,goalKey:"investigate",objective:"Research the ancient-clue",acceptableMethods:["prepare"],priority:npc==="z-target"?100:90});}
  const old=db.addNpcMemory(guild,{npcKey:"z-target",content:"ancient-clue: witness claims north, uncertain",confidence:40,sourceRef:"source",importance:5});
  const contrary=db.addNpcMemory(guild,{npcKey:"z-target",content:"ancient-clue: another witness claims south",confidence:30,sourceRef:"source",importance:5});
  const privateMemory=db.addNpcMemory(guild,{npcKey:"other",content:"UNAUTHORIZED",sourceRef:"source"});
  const input={key:"cluster",actor_type:"npc",actor_key:"z-target",topic:"ancient-clue contradictory testimony",source_event:"source",
    sources:[{kind:"npc_memory",key:old.id},{kind:"npc_memory",key:contrary.id}]};
  assert.throws(()=>manageMemoryCluster(db,guild,input,"gm"),/opt-in/);configureCityFlags(db,guild,{memory_consolidation:true,activity_density:true});
  assert.throws(()=>manageMemoryCluster(db,guild,{...input,sources:[{kind:"npc_memory",key:privateMemory.id}]},"gm"),/cross-actor/);
  manageMemoryCluster(db,guild,input,"gm");const summary=clusterContext(db,guild,"npc","z-target","ancient-clue");
  assert.equal(summary[0].claims.length,2);assert.deepEqual(summary[0].claims.map(row=>row.confidence),[40,30]);
  assert(!JSON.stringify(new ContextPlanner(db).plan(guild,{actorType:"npc",actorKey:"z-target",query:"ancient-clue"})).includes("UNAUTHORIZED"));
  manageMemoryCluster(db,guild,{...input,op:"revise",sources:[{kind:"npc_memory",key:old.id}],topic:"ancient-clue one source selected"},"gm");
  assert.equal(db.getCityRecord(guild,"memory_cluster","cluster").data.history.length,1);assert.deepEqual(db.getNpcMemory(old.id),old);
  manageMemoryCluster(db,guild,{key:"cluster",op:"revert"},"gm");assert.equal(clusterContext(db,guild,"npc","z-target").length,0);
  assert.deepEqual(db.getNpcMemory(contrary.id),contrary);
  db.transaction(()=>{for(let i=0;i<650;i++) db.addNpcMemory(guild,{npcKey:"z-target",content:`Unrelated day ${i}`,importance:50,sourceRef:"source"});
    for(let i=0;i<1000;i++){const key=`citizen-${String(i).padStart(4,"0")}`;db.upsertNpcProfile(guild,{npcKey:key,displayName:key,activityTier:"background"});
      db.upsertNpcGoal(guild,{npcKey:key,goalKey:"wait",objective:"Wait",priority:1});}});
  db.advanceSimulationClock(guild,{minutes:300*1440});
  const oldPacket=retrieveNpcCognition(db,guild,{npcKey:"z-target",query:"ancient-clue",maxNpcs:1,recordRecall:false});
  assert(oldPacket[0].memories.some(row=>row.id===old.id),"old source recovered independently of recency and profile limits");
  db.upsertNpcKnowledge(guild,{npcKey:"cold",knowledgeKey:"known",content:"ancient-clue observed",sourceRef:"source",confidence:80});
  const start=performance.now(),selected=db.densityActorSelection(guild,"ancient-clue"),packets=simulationCandidates(db,guild,{layer:"scene",query:"ancient-clue"});
  assert(selected.length<=32);assert(packets.length<=4);assert(JSON.stringify(packets).length<=24000);
  assert(packets.some(row=>row.key==="cold"));assert(!packets.some(row=>row.key==="unaware"));
  assert.equal(db.getNpcProfile(guild,"cold").activity_tier,"dormant","ephemeral wake keeps durable cold state");
  configureSimulationEntity(db,guild,"npc","z-target",{resources:{materials:0,information:0,manpower:0,influence:0}});
  assert(!simulationCandidates(db,guild,{layer:"scene",query:"ancient-clue"}).some(row=>row.key==="z-target"));
  assert.equal(db.getCityRecord("other","memory_cluster","cluster"),null);assert.equal(db.listCanon(guild,{includeGM:true}).length,0);
  const snap=db.snapshotCampaign(guild,{label:"memory-density"});db.close();db=new VeiledDB(file,schema);db.restoreSnapshot(guild,snap.id);
  assert.equal(db.getCityRecord(guild,"memory_cluster","cluster").status,"reverted");assert.equal(db.getNpcMemory(old.id).content,old.content);
  console.log(`Expansion F PASS: reversible uncertain clusters, original evidence, 300-day old clues, 1000 actors, <=32 inspected/4 packets/24000 chars; ${Math.round(performance.now()-start)}ms including restore; fixture-only.`);
}finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
