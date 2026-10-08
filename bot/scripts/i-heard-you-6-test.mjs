/** Native source-aware director ranking and quiet path; no extra provider requests or budgets. */
import assert from "node:assert/strict";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { configureSimulationEntity, simulationCandidates, rankDirectorActions, prepareNpcDirector, commitNpcDirector } from "../src/simulation.js";
const db=new VeiledDB(":memory:","sql/schema.sql");
try{
  const guild="relevance";db.ensureCampaign(guild);db.startSession(guild,"Lab");configureCityFlags(db,guild,{narrative_relevance:true});
  db.setSimulationEntity(guild,"location","room",{});
  indexWorldEvent(db,guild,{key:"source",source_id:"gm",title:"Ward evidence",session_id:db.getActiveSession(guild).id});
  for(const [npc,objective] of [["related","Protect the ward breach witnesses"],["unrelated","Maintain the garden"]]){
    db.upsertNpcProfile(guild,{npcKey:npc,displayName:npc,activityTier:"active"});
    db.upsertNpcGoal(guild,{npcKey:npc,goalKey:"work",objective,priority:50,acceptableMethods:["prepare"]});
    configureSimulationEntity(db,guild,"npc",npc,{activity_tier:"active",location_key:"room"});
    db.upsertNpcKnowledge(guild,{npcKey:npc,knowledgeKey:"known",content:objective,sourceRef:"source"});
  }
  const action=npc=>({actor_type:"npc",actor_key:npc,type:"prepare",goal_key:"work",information_key:"known",target_type:"",target_key:"",location_key:"room",
    rationale:"Native preparation",delay_ticks:0,delay_minutes:0,significance:"routine"});
  const candidates=simulationCandidates(db,guild,{layer:"scene",query:"ward breach"});
  const prepared={guildId:guild,layer:"round",cycleKey:"ranked",cycleId:`simulation:${guild}:ranked`,minutes:0,candidates,
    proposed:{actions:[action("unrelated"),action("related"),{...action("related"),information_key:"forged"}]},query:"ward breach"};
  const changes=db.db.prepare("SELECT total_changes() n").get().n,ranked=rankDirectorActions(db,prepared);
  assert.equal(ranked.length,2);assert.equal(ranked[0].action.actor_key,"related");assert.equal(db.db.prepare("SELECT total_changes() n").get().n,changes);
  const result=commitNpcDirector(db,prepared,{roll:()=>20});assert(result.telemetry.used<=1);assert(result.telemetry.institution_count<=2);
  assert.equal(result.actions[0].data.actor_key,"related");assert.equal(commitNpcDirector(db,prepared).replayed,true);
  const before=db.db.prepare("SELECT total_changes() n").get().n,clock=db.getSimulationClock(guild);
  const quiet=await prepareNpcDirector({db,guildId:guild,layer:"round",cycleKey:"quiet",query:"OOC just chatting",
    gm:{planNpcActions:()=>assert.fail("Quiet exchange requested a provider")}});
  assert(quiet.quiet);assert(commitNpcDirector(db,quiet).quiet);assert.equal(db.db.prepare("SELECT total_changes() n").get().n,before);
  assert.deepEqual(db.getSimulationClock(guild),clock);
  indexWorldEvent(db,guild,{key:"source",status:"retracted"});assert.equal(rankDirectorActions(db,prepared).length,0);
  console.log("IHY6 PASS: native legal/source-grounded ranking, rejected unknown/retracted knowledge; same one-action/institution budgets, replay; quiet no writes/time/provider calls.");
}finally{db.close();}
