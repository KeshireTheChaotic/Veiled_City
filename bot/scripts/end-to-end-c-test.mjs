/** Durable source backlog, routine delegated native consequence, causal caps, retraction and replay. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags, updateCityCore } from "../src/city-core.js";
import { updateCityCivic } from "../src/city-civic.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { subscribeConsequence, coordinateConsequences } from "../src/city-consequences.js";
import { configureDelegation, delegateConsequence } from "../src/ai-intents.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-end-to-end-c-")),file=path.join(temp,"test.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const guild="c";db.ensureCampaign(guild);configureCityFlags(db,guild,{consequences:true});
  db.setSimulationEntity(guild,"location","station",{});
  indexWorldEvent(db,guild,{key:"source",title:"Recorded service damage",source_id:"gm",kind:"infrastructure_damage",location_key:"station"});
  updateCityCore(db,guild,{kind:"institution",key:"works",source_event:"source",data:{name:"Works",mandate:"Repairs",capacity:10,jurisdictions:["station"],procedures:[]}});
  updateCityCivic(db,guild,{kind:"infrastructure",key:"power",source_event:"source",
    data:{name:"Power",service:"power",native_condition:90,operator:"works",locations:["station"]}},"gm");
  subscribeConsequence(db,guild,{key:"cut",source_event:"source",handler:"service",entity_key:"power",event_kinds:["infrastructure_damage"],
    location_key:"station",payload:{delta:-1}},"gm");
  for(let i=0;i<65;i++) indexWorldEvent(db,guild,{key:`backlog:${i}`,title:"Another recorded event",source_id:"gm",kind:"noise"});
  indexWorldEvent(db,guild,{key:"late",title:"Later service damage",source_id:"gm",kind:"infrastructure_damage",location_key:"station"});
  configureDelegation(db,guild,{mode:"routine_delegated",allow:["consequence.apply"],max_operations:4,max_cost:4,expires_minute:100},"gm");
  const all=[];
  for(let i=0;i<5;i++){const budget={operations:0,cost:0};all.push(...coordinateConsequences(db,guild,4,{onProposed:row=>delegateConsequence(db,guild,row,budget)}));}
  assert.equal(all.length,2);assert(all.every(row=>row.status==="completed"));
  assert.equal(db.getCityRecord(guild,"infrastructure","power").data.native_condition,88);
  db.close();db=new VeiledDB(file,schema);assert.equal(coordinateConsequences(db,guild,4).length,0);
  assert.equal(db.getCityRecord(guild,"infrastructure","power").data.native_condition,88);
  indexWorldEvent(db,guild,{key:"cycle",title:"Cyclic source",source_id:"gm",kind:"infrastructure_damage",location_key:"station",
    details:{causal_path:["cut"]}});
  assert.equal(coordinateConsequences(db,guild,4).length,0);
  indexWorldEvent(db,guild,{key:"retract",title:"Retracted damage",source_id:"gm",kind:"infrastructure_damage",location_key:"station"});
  const pending=coordinateConsequences(db,guild,4)[0];assert.equal(pending.status,"pending");
  indexWorldEvent(db,guild,{key:"retract",status:"retracted"});
  assert.equal(delegateConsequence(db,guild,pending).status,"blocked");
  assert.equal(db.getCityRecord(guild,"infrastructure","power").data.native_condition,88);
  console.log("End-to-end C PASS: >50-source durable backlog, routine native consequence, cycle guard, retraction, replay/restart and no partial costs; zero paid calls.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
