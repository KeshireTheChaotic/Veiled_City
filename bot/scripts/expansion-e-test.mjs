/** Real phased downtime, provenance and chronological simulation-conflict fixtures; no invented mechanics. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { manageLongProject } from "../src/long-projects.js";
import { configureSimulationEntity, submitNpcAction, executeNpcAction, actorState } from "../src/simulation.js";
import { updateCityCivic } from "../src/city-civic.js";
const root=fs.mkdtempSync(path.join(os.tmpdir(),"vc-expansion-e-")),file=path.join(root,"fixture.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const guild="e";db.ensureCampaign(guild);db.ensureCampaign("other");db.upsertPlayer(guild,"owner","Owner");db.upsertPlayer(guild,"outsider","Outsider");
  const pc=db.createCharacter(guild,"owner","Researcher",{}),pcBefore=db.getCharacter(pc.id);
  indexWorldEvent(db,guild,{key:"source",title:"Research lead",source_kind:"gm",source_id:"human",visibility:"party"});
  indexWorldEvent(db,guild,{key:"secret",title:"Hidden",source_kind:"gm",source_id:"human"});
  const input={key:"research",character_id:pc.id,title:"Research history",source_event:"source",phases:[
    {key:"collect",title:"Collect evidence",duration_minutes:10,requires:[],prerequisites:["source"]},
    {key:"interpret",title:"Interpret evidence",duration_minutes:5,requires:["collect"],prerequisites:["source"]}]};
  assert.throws(()=>manageLongProject(db,guild,"owner",input),/opt-in/);configureCityFlags(db,guild,{long_projects:true,conflict_mediation:true});
  assert.throws(()=>manageLongProject(db,guild,"owner",{...input,key:"private",source_event:"secret"}),/known to all/);
  manageLongProject(db,guild,"owner",input);
  assert.throws(()=>manageLongProject(db,guild,"outsider",{key:"research",op:"status"}),/unavailable/);
  const cycle=db.openDowntime(guild,{}),result=db.addDowntimeProject(cycle.id,guild,{userId:"owner",characterId:pc.id,title:"Collect evidence"});
  manageLongProject(db,guild,"owner",{key:"research",op:"consent",character_id:pc.id,decision:"accept",project_id:result.id});
  assert.throws(()=>manageLongProject(db,guild,"owner",{key:"research",op:"advance",result_ids:[result.id]}),/GM adjudication/);
  assert.throws(()=>manageLongProject(db,guild,"gm",{key:"research",op:"advance",result_ids:[result.id]},{gm:true}),/duration/);
  db.advanceSimulationClock(guild,{minutes:5});manageLongProject(db,guild,"gm",{key:"research",op:"pause"},{gm:true});
  db.advanceSimulationClock(guild,{minutes:100});manageLongProject(db,guild,"gm",{key:"research",op:"resume"},{gm:true});
  manageLongProject(db,guild,"owner",{key:"research",op:"consent",character_id:pc.id,decision:"accept",project_id:result.id});
  assert.throws(()=>manageLongProject(db,guild,"gm",{key:"research",op:"advance",result_ids:[result.id]},{gm:true}),/duration/);
  db.advanceSimulationClock(guild,{minutes:5});db.updateDowntimeProject(result.id,{status:"completed",progress:4,result:"Collected sourced clues"});db.resolveDowntimeCycle(cycle.id,"GM adjudicated");
  manageLongProject(db,guild,"gm",{key:"research",op:"advance",result_ids:[result.id]},{gm:true});
  const snapshot=db.snapshotCampaign(guild,{label:"partial-project"});db.close();db=new VeiledDB(file,schema);db.restoreSnapshot(guild,snapshot.id);
  assert.equal(db.getCityRecord(guild,"long_project","research").data.index,1);assert(db.downtimeResultClaimed(guild,result.id));
  indexWorldEvent(db,guild,{key:"source",status:"retracted"});
  assert.equal(manageLongProject(db,guild,"gm",{key:"research",op:"resume"},{gm:true}).status,"paused");
  assert.equal(db.getCityRecord(guild,"long_project","research").data.phases[0].status,"completed");
  for(const key of ["home","east","west"]) configureSimulationEntity(db,guild,"location",key,{});
  db.upsertNpcProfile(guild,{npcKey:"courier",displayName:"Courier"});configureSimulationEntity(db,guild,"npc","courier",{location_key:"home",resources:{materials:1}});
  db.upsertNpcGoal(guild,{npcKey:"courier",goalKey:"travel",objective:"Deliver message",acceptableMethods:["travel","prepare"]});
  const action={actor_type:"npc",actor_key:"courier",goal_key:"travel",type:"travel",location_key:"east",delay_minutes:10};
  const first=submitNpcAction(db,guild,action);
  assert.throws(()=>submitNpcAction(db,guild,{...action,location_key:"west"}),/incompatible travel/);
  assert.equal(actorState(db,guild,"npc","courier").resources.materials,1);db.advanceSimulationClock(guild,{minutes:10});
  executeNpcAction(db,guild,first,{roll:()=>20});executeNpcAction(db,guild,first,{roll:()=>20});
  assert.equal(actorState(db,guild,"npc","courier").resources.materials,0);
  const exhausted=submitNpcAction(db,guild,{...action,type:"prepare",location_key:"east",delay_minutes:0},{roll:()=>20});assert.equal(exhausted.status,"failed");
  assert.equal(actorState(db,guild,"npc","courier").resources.materials,0,"last unit is never double spent");
  for(const key of ["claim-one","claim-two"]) updateCityCivic(db,guild,{kind:"property",key,source_event:"secret",data:{location:"home",claim_type:"deed",claimant:key,
    terms:"Contested title",validity:"disputed",domain:"mundane"}},"gm");
  assert.equal(db.getCityRecord(guild,"property","claim-one").data.validity,"disputed");
  assert.deepEqual(db.getCharacter(pc.id),pcBefore);assert.equal(db.getCityRecord("other","long_project","research"),null);
  console.log("Expansion E PASS: phased consent, fictional work duration, pause/restore, adjudicated results, source loss, queued travel and scarce-resource conservation; fixture-only.");
}finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
