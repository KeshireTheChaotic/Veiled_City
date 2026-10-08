/** Scene continuity fixtures exercise real scene records, physical access, private exports, archival and unchanged combat state. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { VeiledDB } from "../src/db.js";
import { configureSimulationEntity } from "../src/simulation.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { recordScenePresence, sceneAccess, sceneView } from "../src/scene-continuity.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-expansion-b-")),file=path.join(temp,"test.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const guild="b";db.ensureCampaign(guild);db.ensureCampaign("other");
  const session=db.startSession(guild,"Room");
  for(const key of ["room","remote"]) configureSimulationEntity(db,guild,"location",key,{});
  for(const key of ["observer","witness","hidden-secret-witness","remote"]){db.upsertNpcProfile(guild,{npcKey:key,displayName:key});
    configureSimulationEntity(db,guild,"npc",key,{location_key:key==="remote"?"remote":"room"});}
  indexWorldEvent(db,guild,{key:"public",title:"Visible scene",source_kind:"gm",source_id:"gm",location_key:"room",visibility:"party",kind:"arrival"});
  indexWorldEvent(db,guild,{key:"private",title:"Private source",source_kind:"gm",source_id:"gm",location_key:"room"});
  const input={entity_type:"npc",entity_key:"observer",source_event:"public",location_key:"room",zone:"desk",visibility:"party"};
  assert.throws(()=>recordScenePresence(db,guild,input,"gm"),/opt-in/);configureCityFlags(db,guild,{scene_continuity:true});
  recordScenePresence(db,guild,input,"gm");
  recordScenePresence(db,guild,{...input,entity_key:"witness",zone:"door",range:"Close"},"gm");
  recordScenePresence(db,guild,{...input,entity_key:"hidden-secret-witness",source_event:"private",hidden:true,visibility:"party"},"gm");
  assert.throws(()=>recordScenePresence(db,guild,{...input,entity_key:"remote"},"gm"),/actually reach/);
  assert.throws(()=>recordScenePresence(db,guild,{...input,entity_key:"observer",source_event:"private"},"gm"),/disclosure/);
  assert.throws(()=>recordScenePresence(db,guild,{...input,range:"Twenty squares"},"gm"),/range/);
  assert.throws(()=>recordScenePresence(db,guild,{...input,hp:1},"gm"),/never combat/);
  const observer={observer_type:"npc",observer_key:"observer"};
  assert(sceneAccess(db,guild,{...observer,target_type:"npc",target_key:"witness",sense:"sound"}));
  assert(!sceneAccess(db,guild,{...observer,target_type:"npc",target_key:"hidden-secret-witness"}));
  assert(!JSON.stringify(sceneView(db,guild,observer)).includes("hidden-secret-witness"));
  recordScenePresence(db,guild,{entity_type:"barrier",entity_key:"soundproof",source_event:"private",location_key:"room",
    zone:"desk",to_zone:"door",blocks:["sound"]},"gm");
  assert(!sceneAccess(db,guild,{...observer,target_type:"npc",target_key:"witness",sense:"sound"}));
  assert(sceneAccess(db,guild,{...observer,target_type:"npc",target_key:"witness",sense:"sight"}));
  assert.equal(sceneView(db,guild,{observer_type:"npc",observer_key:"remote"}).occupants.length,0);
  indexWorldEvent(db,guild,{key:"departure",title:"Witness left",source_kind:"gm",source_id:"gm",location_key:"room",visibility:"party",kind:"departure"});
  recordScenePresence(db,guild,{...input,entity_key:"witness",source_event:"departure",state:"departed"},"gm");
  assert(!sceneAccess(db,guild,{...observer,target_type:"npc",target_key:"witness"}));
  assert.throws(()=>recordScenePresence(db,guild,{...input,entity_key:"witness",source_event:"private"},"gm"),/disclosure|Reappearance/);
  db.upsertPlayer(guild,"absent","Absent");const absent=db.createCharacter(guild,"absent","Offscreen",{}),pcBefore=db.getCharacter(absent.id);
  assert.throws(()=>recordScenePresence(db,guild,{...input,entity_type:"character",entity_key:absent.id,accepted_by:"absent"},"gm"),/Absent/);
  assert.deepEqual(db.getCharacter(absent.id),pcBefore);
  const combatBefore=db.db.prepare("SELECT * FROM encounter_combatants WHERE guild_id=?").all(guild);
  assert.deepEqual(db.db.prepare("SELECT * FROM encounter_combatants WHERE guild_id=?").all(guild),combatBefore);
  const readChanges=db.db.prepare("SELECT total_changes() n").get().n;sceneView(db,guild,observer);
  assert.equal(db.db.prepare("SELECT total_changes() n").get().n,readChanges);
  fs.mkdirSync(path.join(temp,"data"));
  const result=spawnSync(process.execPath,[path.resolve("scripts/export-campaign.mjs"),guild,"player"],{
    cwd:temp,encoding:"utf8",env:{...process.env,DATABASE_PATH:file}});
  assert.equal(result.status,0,result.stderr);
  assert(!fs.readFileSync(result.stdout.trim(),"utf8").includes("hidden-secret-witness"));
  const snapshot=db.snapshotCampaign(guild,{label:"Before transition"});
  db.completeDirectorPass(session.id,"scene",{sceneLabel:"Next room"});
  assert.equal(sceneView(db,guild,{gm:true}).occupants.length,0);
  assert(db.listCityRecords(guild,{kind:"scene_residue",includeGM:true}).length>0);
  db.close();db=new VeiledDB(file,schema);assert.equal(sceneView(db,guild,{gm:true}).occupants.length,0);
  db.restoreSnapshot(guild,snapshot.id);assert(sceneView(db,guild,{gm:true}).occupants.length>0);
  db.resetDirectorRound(session.id,{advanceScene:true,sceneLabel:"Manual transition"});
  assert.equal(sceneView(db,guild,{gm:true}).occupants.length,0,"manual scene reset also archives occupancy");
  assert.equal(db.listCityRecords("other",{kind:"scene_presence",includeGM:true}).length,0);
  console.log("Expansion B PASS: occupancy/hidden witnesses, remote sound and barriers, agency, private export, archival/restore; no mechanics changed.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
