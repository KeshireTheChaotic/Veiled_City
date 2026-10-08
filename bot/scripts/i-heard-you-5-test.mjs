/** Real read-only diagnostics: objective current authority/lineage/plans and receipt arithmetic, never belief repair. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { reconcileHistory } from "../src/history-reconciliation.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-ihy5-")),db=new VeiledDB(path.join(temp,"fixture.sqlite"),path.resolve("sql/schema.sql"));
try{
  const guild="health";db.ensureCampaign(guild);db.startSession(guild,"Audit");configureCityFlags(db,guild,{history_reconciliation:true});
  indexWorldEvent(db,guild,{key:"root",source_id:"gm",title:"Authority"});
  indexWorldEvent(db,guild,{key:"child",source_kind:"event",source_id:"root",title:"Child"});
  db.saveCityRecord(guild,{kind:"long_project",key:"project",status:"active",source_event:"child",data:{index:0,phases:[{prerequisites:["root"]}]}});
  db.upsertNpcProfile(guild,{npcKey:"witness",displayName:"Witness"});
  const memory=db.addNpcMemory(guild,{npcKey:"witness",content:"I suspect a different story",sourceRef:"root",sourceType:"inferred",confidence:30});
  indexWorldEvent(db,guild,{key:"root",status:"retracted"});
  db.saveCityRecord(guild,{kind:"strategy",key:"stale",status:"active",source_event:"child",
    data:{actor_type:"npc",actor_key:"witness",goal_key:"missing",deadline_minute:0}});
  db.saveCityRecord(guild,{kind:"roll_operation",key:"bad",source_event:"child",subject_key:"pc",data:{op:"help",
    resource_deltas:[{character:"pc",hope:{before:4,after:4,delta:-1},stress:{before:0,after:0,delta:0}}]}});
  db.saveCityRecord(guild,{kind:"roll_operation",key:"good",source_event:"child",subject_key:"pc",data:{op:"help",
    resource_deltas:[{character:"pc",hope:{before:4,after:3,delta:-1},stress:{before:0,after:0,delta:0}}]}});
  for(const key of ["one","two"]) db.saveCityRecord(guild,{kind:"commitment",key,source_event:"child",data:{start:10,end:20,participants:["npc:witness"]}});
  const changes=db.db.prepare("SELECT total_changes() n").get().n,clock=db.getSimulationClock(guild),result=reconcileHistory(db,guild);
  for(const type of ["stale_source_authority","stale_plan_objective","stale_plan_deadline","inconsistent_actual_resource_receipt","overlapping_actual_commitments"])
    assert(result.findings.some(row=>row.type===type),type);
  assert(!result.findings.some(row=>row.records.includes("good")));assert(!result.findings.some(row=>row.records.includes(memory.id)));
  assert(result.findings.every(row=>row.requires.includes("human review")));assert.equal(db.getNpcMemory(memory.id).content,memory.content);
  const targeted=reconcileHistory(db,guild,{record_kind:"roll_operation",record_key:"bad"});assert(targeted.coverage.targeted);
  assert(targeted.findings.some(row=>row.type==="inconsistent_actual_resource_receipt"));
  assert.equal(db.db.prepare("SELECT total_changes() n").get().n,changes);assert.deepEqual(db.getSimulationClock(guild),clock);
  assert.equal(reconcileHistory(db,"other").enabled,false);
  console.log("IHY5 PASS: read-only source ancestry/stale plans/commitment overlap/actual receipt math; targeted old record, no belief repair or world/time writes.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
