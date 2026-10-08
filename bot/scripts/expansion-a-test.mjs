/** Real application phase-A fixtures; actor source firewall, history, causal isolation, pending review, replay and restore. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureSimulationEntity } from "../src/simulation.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { configureCityFlags, updateCityCore } from "../src/city-core.js";
import { updateCityCivic } from "../src/city-civic.js";
import { proposeGoalTransition, reviewGoalTransition, runMotivationCycle } from "../src/simulation-motivation.js";
import { subscribeConsequence, coordinateConsequences, reviewConsequence } from "../src/city-consequences.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-expansion-a-")),file=path.join(temp,"test.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const guild="a";db.ensureCampaign(guild);db.ensureCampaign("other");
  indexWorldEvent(db,guild,{key:"source",title:"Observed sabotage",source_kind:"gm",source_id:"human",kind:"infrastructure_damage",location_key:"station"});
  for(const key of ["witness","unaware"]){db.upsertNpcProfile(guild,{npcKey:key,displayName:key});
    configureSimulationEntity(db,guild,"npc",key,{location_key:"station"});}
  db.upsertNpcKnowledge(guild,{npcKey:"witness",knowledgeKey:"sabotage",content:"A cable was cut",sourceRef:"source",confidence:85});
  db.upsertNpcKnowledge(guild,{npcKey:"unaware",knowledgeKey:"sabotage",content:"CLASSIFIED",beliefState:"unknown",sourceRef:"source"});
  const input={key:"first",actor_type:"npc",actor_key:"witness",information_key:"sabotage",source_event:"source",goal_key:"investigate",objective:"Investigate cable",priority:70};
  assert.throws(()=>proposeGoalTransition(db,guild,input),/opt-in/);
  configureCityFlags(db,guild,{emergent_goals:true,consequences:true});
  configureCityFlags(db,"other",{emergent_goals:true});
  assert.throws(()=>proposeGoalTransition(db,guild,{...input,actor_key:"unaware"}),/legitimately/);
  assert.throws(()=>proposeGoalTransition(db,"other",input),/source event/);
  assert.throws(()=>proposeGoalTransition(db,guild,{...input,actor_type:"character"}),/never PCs/);
  db.upsertPlayer(guild,"proxy","Proxy");
  const session=db.startSession(guild,"Sourced actor test");
  const proxy=db.upsertNpcProxy(guild,session.id,{npcName:"witness",userId:"proxy",status:"active"});
  assert.throws(()=>proposeGoalTransition(db,guild,input),/non-proxied/);db.releaseNpcProxy(proxy.id);
  assert.throws(()=>proposeGoalTransition(db,guild,{...input,key:"aggressive",acceptable_methods:["attack"]}),/actor constraints/);
  const formed=runMotivationCycle(db,guild,1);assert.equal(formed.length,1);assert.equal(formed[0].status,"pending");
  assert.equal(db.listNpcGoals(guild,"witness").length,0);
  assert.equal(runMotivationCycle(db,guild,1).length,0,"event/actor receipt deduplicates opportunities");
  reviewGoalTransition(db,guild,{key:formed[0].record_key,decision:"approve"},"gm");
  assert.equal(db.listNpcGoals(guild,"witness").length,1);
  const draft=proposeGoalTransition(db,guild,input);assert.equal(draft.status,"pending");
  reviewGoalTransition(db,guild,{key:"first",decision:"approve"},"gm");
  for(const [op,expected] of [["pause","paused"],["resume","active"],["reprioritize","active"],["complete","completed"]]){
    proposeGoalTransition(db,guild,{...input,key:op,op,objective:undefined,priority:20});
    reviewGoalTransition(db,guild,{key:op,decision:"approve"},"gm");
    assert.equal(db.getNpcGoal(guild,"witness","investigate").status,expected);
  }
  assert.equal(db.getCityRecord(guild,"goal_transition","first").data.objective,"Investigate cable");
  const before=db.getNpcGoal(guild,"witness","investigate");
  reviewGoalTransition(db,guild,{key:"complete",decision:"approve"},"gm");assert.deepEqual(db.getNpcGoal(guild,"witness","investigate"),before);
  proposeGoalTransition(db,guild,{...input,key:"supersede",op:"supersede",new_goal_key:"replacement",objective:"Inspect the source"});
  reviewGoalTransition(db,guild,{key:"supersede",decision:"approve"},"gm");
  assert.equal(db.getNpcGoal(guild,"witness","investigate").status,"superseded");
  proposeGoalTransition(db,guild,{...input,key:"abandon",op:"abandon",goal_key:"replacement"});
  reviewGoalTransition(db,guild,{key:"abandon",decision:"approve"},"gm");
  assert.equal(db.getNpcGoal(guild,"witness","replacement").status,"abandoned");
  configureSimulationEntity(db,guild,"faction","council",{});
  db.putSimulationRecord(guild,{kind:"awareness",entityKey:"faction:council",data:{information_key:"report",content:"Cable report",source_ref:"source",confidence:80}});
  const faction=runMotivationCycle(db,guild,1);assert.equal(faction[0].data.actor_type,"faction");
  for(const key of ["station","unrelated"]) configureSimulationEntity(db,guild,"location",key,{});
  updateCityCore(db,guild,{kind:"institution",key:"works",source_event:"source",data:{name:"Works",mandate:"Repairs",capacity:10,jurisdictions:["station"],procedures:[]}});
  db.saveCityRecord(guild,{kind:"report",key:"report",actor_key:"works",source_event:"source",data:{content:"Filed cable report",confidence:80,belief_state:"suspected"}});
  const institution=runMotivationCycle(db,guild,1);assert.equal(institution[0].data.actor_type,"institution");
  for(const key of ["power","unrelated"]) updateCityCivic(db,guild,{kind:"infrastructure",key,source_event:"source",
    data:{name:key,service:"power",native_condition:80,operator:"works",locations:[key==="power"?"station":"unrelated"]}},"gm");
  subscribeConsequence(db,guild,{key:"power-cut",source_event:"source",handler:"service",entity_key:"power",event_kinds:["infrastructure_damage"],
    location_key:"station",payload:{delta:-10}},"gm");
  const effects=coordinateConsequences(db,guild);assert.equal(effects.length,1);
  assert.equal(db.getCityRecord(guild,"infrastructure","power").data.native_condition,80,"pending costs nothing");
  reviewConsequence(db,guild,{key:effects[0].record_key,decision:"approve"},"gm");
  assert.equal(db.getCityRecord(guild,"infrastructure","power").data.native_condition,70);
  assert.equal(db.getCityRecord(guild,"infrastructure","unrelated").data.native_condition,80);
  reviewConsequence(db,guild,{key:effects[0].record_key,decision:"approve"},"gm");
  assert.equal(db.getCityRecord(guild,"infrastructure","power").data.native_condition,70);
  subscribeConsequence(db,guild,{key:"wrong-path",source_event:"source",handler:"service",entity_key:"unrelated",event_kinds:["infrastructure_damage"],payload:{delta:-10}},"gm");
  const wrong=coordinateConsequences(db,guild)[0];assert.equal(reviewConsequence(db,guild,{key:wrong.record_key,decision:"approve"},"gm").status,"blocked");
  subscribeConsequence(db,guild,{key:"wrong-path",op:"unsubscribe",source_event:"source"},"gm");
  assert.equal(db.getCityRecord(guild,"consequence_subscription","wrong-path").status,"cancelled");
  assert.equal(db.listCityRecords(guild,{kind:"goal_transition"}).length,0);
  const snapshot=db.snapshotCampaign(guild,{label:"Phase A"});db.close();db=new VeiledDB(file,schema);
  assert.equal(coordinateConsequences(db,guild).length,0,"restart retains exactly-once candidates");
  db.restoreSnapshot(guild,snapshot.id);assert.equal(db.getCityRecord(guild,"infrastructure","power").data.native_condition,70);
  assert.equal(db.listCanon(guild,{includeGM:true}).length,0);
  console.log("Expansion A PASS: sourced three-actor motivation, history, private bounded consequences, replay/restore; fixture-only.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
