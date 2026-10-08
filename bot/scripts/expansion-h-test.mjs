/** Integration contracts: synthetic legacy shapes, safe flags, ledger-backed readonly diagnostics, backup and version rollover. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { EXPANSION_FEATURES, expansionStatus } from "../src/expansion-contracts.js";
import { explainWhy } from "../src/provenance.js";
import { handleCommand } from "../src/commands.js";
import { fakeInteraction } from "./contract-fixtures.mjs";
import { nextMinorVersion, phaseVersion, nextMajorVersion } from "./release-version.mjs";
import { manifestBytes } from "./release-files.mjs";
import { configureSimulationEntity, submitNpcAction } from "../src/simulation.js";
import { manageGroup } from "../src/city-groups.js";
const root=fs.mkdtempSync(path.join(os.tmpdir(),"vc-expansion-h-")),schema=path.resolve("sql/schema.sql");
let db;
try{
  for(const legacy of [333,380,440]){
    const file=path.join(root,`legacy-${legacy}.sqlite`);db=new VeiledDB(file,schema);db.ensureCampaign("contract");db.upsertPlayer("contract","owner","Owner");
    const pc=db.createCharacter("contract","owner","Legacy character",{}),fact=db.addFact("contract",{content:"Legacy preserved fact",visibility:"party"});
    db.upsertNpcProfile("contract",{npcKey:"legacy",displayName:"Legacy"});db.addNpcMemory("contract",{npcKey:"legacy",content:"Original source memory"});
    db.close();db=null;
    const raw=new DatabaseSync(file);
    if(legacy<440){
      raw.exec("ALTER TABLE facts DROP COLUMN confidence; ALTER TABLE facts DROP COLUMN provenance_json; ALTER TABLE npc_memories DROP COLUMN created_tick;");
      raw.exec(`CREATE TABLE threads_legacy(id TEXT PRIMARY KEY,guild_id TEXT NOT NULL,label TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',
        visibility TEXT NOT NULL DEFAULT 'party',subject_user_id TEXT,subject_character_id TEXT,notes TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
        INSERT INTO threads_legacy SELECT * FROM threads; DROP TABLE threads; ALTER TABLE threads_legacy RENAME TO threads;`);
    }
    raw.exec(`PRAGMA user_version=${legacy}`);raw.close();
    db=new VeiledDB(file,schema);
    assert.equal(db.getCharacter(pc.id).name,"Legacy character");assert.equal(db.getFact("contract",fact).content,"Legacy preserved fact");
    assert.equal(db.listNpcMemories("contract","legacy")[0].content,"Original source memory");assert.equal(db.schemaVersion(),440);
    assert(expansionStatus(db,"contract").features.every(feature=>feature.default===false&&feature.enabled===false));
    if(legacy===440){
      db.ensureCampaign("other");const baseline=db.createBackup("contract",{label:"legacy baseline"});
      indexWorldEvent(db,"contract",{key:"source",title:"Recorded expansion source",source_kind:"gm",source_id:"human"});
      configureCityFlags(db,"contract",Object.fromEntries(Object.keys(EXPANSION_FEATURES).map(key=>[key,true])));
      assert.throws(()=>configureCityFlags(db,"contract",{invented:true}),/Unknown/);assert.throws(()=>configureCityFlags(db,"contract",{strategies:1}),/Unknown/);
      db.saveCityRecord("contract",{kind:"strategy",key:"blocked",status:"blocked",source_event:"source",data:{error:"Insufficient established resources",revision:1,steps:[],spent:0}});
      db.recordMutation("contract",{mutationType:"strategy_blocked",entityKey:"blocked",sourceLayer:"city",rationale:"Known resource shortage",after:{status:"blocked"}});
      db.saveCityEdge("contract",{kind:"route",from:"home",to:"station",duration:5,source_event:"source"});
      const diagnosis=explainWhy(db,"contract",{kind:"strategy",key:"blocked"});
      assert.equal(diagnosis.entity.reason,"Insufficient established resources");assert(diagnosis.ledger.length);
      assert.equal(explainWhy(db,"contract",{route:{from:"home",to:"station"}}).route.duration_minutes,5);
      assert.throws(()=>explainWhy(db,"other",{kind:"strategy",key:"blocked"}),/not found/);
      const totalChanges=db.db.prepare("SELECT total_changes() n").get().n;
      for(const sub of ["why","expansion-status"]){
        const interaction=fakeInteraction({sub,json:sub==="why"?{kind:"strategy",key:"blocked"}:null});
        Object.assign(interaction,{id:`readonly-${sub}`,commandName:"vc-story",isChatInputCommand:()=>true});
        await handleCommand(interaction,{db,gm:{}});assert(interaction.deliveries[0].ephemeral);assert(!db.getOperationReceipt("contract",interaction.id));
      }
      assert.equal(db.db.prepare("SELECT total_changes() n").get().n,totalChanges,"GM explanations/status have no writes");
      const denied=fakeInteraction({gm:false,sub:"expansion-status"});Object.assign(denied,{id:"denied",commandName:"vc-story",isChatInputCommand:()=>true});
      await handleCommand(denied,{db,gm:{}});assert(denied.deliveries[0].content.includes("permission"));
      configureSimulationEntity(db,"contract","npc","legacy",{status:"dead"});
      db.upsertNpcGoal("contract",{npcKey:"legacy",goalKey:"act",objective:"Prepare",acceptableMethods:["prepare"]});
      assert.throws(()=>submitNpcAction(db,"contract",{actor_type:"npc",actor_key:"legacy",goal_key:"act",type:"prepare"}),/unavailable/);
      assert.throws(()=>manageGroup(db,"contract",{key:"dead-member",group_key:"circle",name:"Circle",source_event:"source",members:["legacy"]},"gm"),/unavailable/);
      const expanded=db.createBackup("contract",{label:"expanded"});
      db.restoreBackup("contract",baseline.id,{actorId:"gm"});
      assert.equal(db.getCityRecord("contract","strategy","blocked"),null);assert(expansionStatus(db,"contract").features.every(row=>!row.enabled));
      db.restoreBackup("contract",expanded.id,{actorId:"gm"});assert.equal(db.getCityRecord("contract","strategy","blocked").status,"blocked");
    }
    db.close();db=null;
  }
  assert.equal(nextMinorVersion("5.8.0"),"5.9.0");assert.equal(nextMinorVersion("5.9.0"),"6.0.0");assert.equal(nextMinorVersion("9.9.0"),"10.0.0");
  assert.throws(()=>phaseVersion("5.9.0","5.10.0"),/next minor/);assert.throws(()=>phaseVersion("5.7.0","6.0.0"),/next minor/);
  const manifest=JSON.parse(fs.readFileSync("../manifest.json","utf8")),pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
  assert.equal(manifest.version,pkg.version);
  assert.equal(nextMajorVersion("6.7.0"),"7.0.0");
  assert.equal(phaseVersion("6.7.0","7.0.0",{major:true}),"7.0.0");
  assert.throws(()=>phaseVersion("6.7.0","7.0.0"));
  assert.deepEqual(manifestBytes(Buffer.from("one\r\ntwo\r\n")),Buffer.from("one\ntwo\n"));
  const binary=Buffer.from([0,13,10,255]);assert.deepEqual(manifestBytes(binary),binary);
  for(const entry of manifest.files){const raw=fs.readFileSync(path.resolve("..",entry.path));
    const bytes=manifest.content_normalization==="utf8-lf"?manifestBytes(raw):raw;
    assert.equal(bytes.length,entry.size_bytes,entry.path);assert.equal(createHash("sha256").update(bytes).digest("hex"),entry.sha256,entry.path);}
  console.log("Expansion H PASS: synthetic 3.3/3.8/5.0 shapes, schema440, all safe flags, zero-write GM diagnostics, backup/rollback, lifecycle guards, .9 rollover and manifest hashes; no deployment.");
}finally{if(db) db.close();fs.rmSync(root,{recursive:true,force:true});}
