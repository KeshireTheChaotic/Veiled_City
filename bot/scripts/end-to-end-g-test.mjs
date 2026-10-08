/** Automatic governed memory indices, source correction and fair real director opportunities within existing budgets. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { configureDelegation, maintainMemory, intentContext } from "../src/ai-intents.js";
import { clusterContext } from "../src/memory-clusters.js";
import { commitNpcDirector } from "../src/simulation.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-end-to-end-g-")),db=new VeiledDB(path.join(temp,"test.sqlite"),path.resolve("sql/schema.sql"));
try{
  const guild="g";db.ensureCampaign(guild);configureCityFlags(db,guild,{memory_consolidation:true,activity_density:true});
  db.upsertNpcProfile(guild,{npcKey:"witness",displayName:"Witness"});
  indexWorldEvent(db,guild,{key:"source",title:"Recorded uncertain visitor",source_id:"gm"});
  const originals=["Visitor might be a courier","Visitor claimed to carry a parcel"].map(content=>db.addNpcMemory(guild,
    {npcKey:"witness",memoryType:"episodic",content,confidence:50,importance:40,sourceRef:"source"}));
  configureDelegation(db,guild,{mode:"routine_delegated",allow:["memory.consolidate","memory.revise","memory.revert"],max_operations:1,max_cost:0,expires_minute:10000},"gm");
  const maintained=maintainMemory(db,guild)[0];assert.equal(maintained.status,"accepted",maintained.data.diagnostic);
  const key=maintained.data.result.record_key;
  assert.equal(clusterContext(db,guild,"npc","witness","Who remembers the visitor carrying parcel?").length,1,"token matching not exact whole query");
  db.annotateNpcMemory(guild,originals[0].id,{status:"challenged"});db.advanceSimulationClock(guild,{ticks:1});
  assert.equal(maintainMemory(db,guild)[0].status,"accepted");assert.equal(db.getCityRecord(guild,"memory_cluster",key).data.revision,2);
  assert.equal(db.getNpcMemory(originals[1].id).content,originals[1].content);
  indexWorldEvent(db,guild,{key:"source",status:"retracted"});assert.equal(clusterContext(db,guild,"npc","witness","visitor").length,0);
  db.advanceSimulationClock(guild,{ticks:1});assert.equal(maintainMemory(db,guild)[0].status,"accepted");
  assert.equal(db.getCityRecord(guild,"memory_cluster",key).status,"reverted");
  const attempted=new Set();
  for(let i=0;i<21;i++){
    const cycleKey=`fair:${i}`,result=commitNpcDirector(db,{guildId:guild,layer:"round",cycleKey,cycleId:`simulation:${guild}:${cycleKey}`,
      minutes:1,candidates:[],proposed:{actions:[]},query:"visitor"});
    assert(result.telemetry.used<=1);assert(result.telemetry.institution_count<=2);
    for(const [name,row] of Object.entries(result.telemetry.work)) if(row.status!=="deferred") attempted.add(name);
  }
  assert.equal(attempted.size,7,"every category receives opportunities without extra work budget");
  const packet=intentContext(db,guild);assert(JSON.stringify(packet).length<=24000);
  console.log("End-to-end G PASS: automatic pointer index, uncertainty/correction/retraction, whole-record packet bounds and seven fair categories under 1/3/4 budgets; zero paid calls.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
