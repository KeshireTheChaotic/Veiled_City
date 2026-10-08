/** Reproducible 100-day offline campaign invariant audit; synthetic actors, local dice and retry failures. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { ContextPlanner } from "../src/context-planner.js";
import { validateNarrativeClaims } from "../src/narrative-integrity.js";
import { explainWhy } from "../src/provenance.js";
import { indexWorldEvent, scheduleCityEvent } from "../src/city-calendar.js";
import { configureSimulationEntity, submitNpcAction } from "../src/simulation.js";
import { publishSimulationHooks } from "../src/publishing.js";
import { configureMystery, mysteryView } from "../src/story-continuity.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-endurance-")),schema=path.resolve("sql/schema.sql"),file=path.join(temp,"test.sqlite");
let db=new VeiledDB(file,schema),seed=490;
const metrics={seed,fictional_days:100,actions:0,invalid_proposals:0,max_context_tokens:0,commit_consistency_checks:0,event_replay_checks:0,
  critical_clue_reachability_checks:0,publish_failures:0,publish_repairs:0,billable_tokens:0,live_requests:0};
const roll=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%20+1;};
try{
  const guildId="endurance";db.ensureCampaign(guildId);db.ensureCampaign("other");db.upsertPlayer(guildId,"absent","Absent");
  const pc=db.createCharacter(guildId,"absent","Offscreen",{}),beforePc=JSON.stringify(db.getCharacter(pc.id).data);
  const npcs=["witness","reporter","technician"];
  for(const key of npcs){db.upsertNpcProfile(guildId,{npcKey:key,displayName:key,activityTier:"active"});
    configureSimulationEntity(db,guildId,"npc",key,{activity_tier:"active",location_key:"station",resources:{materials:100}});}
  for(const key of ["lantern","court"]) configureSimulationEntity(db,guildId,"faction",key,{activity_tier:"supporting",location_key:"station"});
  indexWorldEvent(db,guildId,{key:"origin",title:"Synthetic campaign origin",source_kind:"gm",source_id:"Fixture human GM"});
  for(const key of ["hospital","council"]) db.saveCityRecord(guildId,{kind:"institution",key,source_event:"origin",
    data:{name:key,capacity:100,procedures:["document_request"],jurisdictions:[],personnel:[]}});
  db.addFact(guildId,{content:"SECRET_FIXTURE_ANCHOR",visibility:"gm"});
  db.proposeCanon(guildId,{key:"mystery.solution",value:"Immutable fixture solution",visibility:"gm"});
  configureMystery(db,guildId,{key:"case",source_event:"origin",anchor_key:"mystery.solution",question:"Which established source?",
    routes:["Witness","Records","Traces"].map((method,i)=>({key:`route-${i}`,method,fact_id:db.addFact(guildId,{content:`Accessible clue ${i}`,visibility:"party"})}))},"fixture");
  for(let day=1;day<=100;day++){
    scheduleCityEvent(db,guildId,{key:`day-${day}`,title:`Fictional deadline ${day}`,due_minute:day*1440});
    db.advanceSimulationClock(guildId,{minutes:1440,ticks:1});
    const deadline=db.getWorldEvent(guildId,`schedule:day-${day}`);assert(deadline);assert.equal(db.getCitySchedule(guildId,`day-${day}`).status,"fired");
    db.advanceSimulationClock(guildId,{minutes:0});assert.equal(db.getWorldEvent(guildId,deadline.event_key).event_key,deadline.event_key);metrics.event_replay_checks++;
    for(const key of npcs){
      db.upsertNpcGoal(guildId,{npcKey:key,goalKey:`prepare-${day}`,objective:`Prepare for fictional day ${day}`,acceptableMethods:["prepare"]});
      const action=submitNpcAction(db,guildId,{actor_type:"npc",actor_key:key,type:"prepare",goal_key:`prepare-${day}`,significance:"routine"},
        {cycleKey:`day-${day}`,roll});assert.equal(action.status,"completed");metrics.actions++;
      assert.equal(db.getSimulationEntity(guildId,"npc",key).state.resources.materials,100-day);metrics.commit_consistency_checks++;
    }
    db.upsertNpcKnowledge(guildId,{npcKey:"witness",knowledgeKey:`private-${day}`,content:`Witness-only observation ${day}`,isSecret:true});
    const plan=new ContextPlanner(db).plan(guildId,{actorType:"npc",actorKey:"reporter",query:`observation ${day}`,maxTokens:400});
    assert(!JSON.stringify(plan).includes("Witness-only"));assert(!JSON.stringify(plan).includes("SECRET_FIXTURE_ANCHOR"));
    metrics.max_context_tokens=Math.max(metrics.max_context_tokens,plan.estimated_tokens);assert(plan.estimated_tokens<=400);
    assert.equal(mysteryView(db,guildId,"case",{characterId:pc.id,userId:"absent"}).routes.length,3);metrics.critical_clue_reachability_checks++;
    assert.equal(JSON.stringify(db.getCharacter(pc.id).data),beforePc);assert.equal(db.currentCanon(guildId,"mystery.solution").value,"Immutable fixture solution");
    assert.equal(db.listWorldEvents("other",{includeGM:true}).length,0);
    if(day%17===0){assert.throws(()=>validateNarrativeClaims(db,guildId,{narration:"You suffer 2 damage"}),/undeclared/);metrics.invalid_proposals++;}
    if(day===50){const backup=db.createBackup(guildId,{label:"Endurance recovery"}),state=db.snapshotCampaign(guildId).state;
      db.restoreBackup(guildId,backup.id,{actorId:"fixture"});assert.deepEqual(db.snapshotCampaign(guildId).state,state);
      db.close();db=new VeiledDB(file,schema);assert.equal(db.getSimulationClock(guildId).minute,day*1440);}
  }
  const state=db.snapshotCampaign(guildId).state,ledger=db.listMutationLedger(guildId,{limit:100}).length;
  const why=explainWhy(db,guildId,{event_key:"schedule:day-100"});assert.equal(why.visibility,"gm");
  assert.deepEqual(db.snapshotCampaign(guildId).state,state);assert.equal(db.listMutationLedger(guildId,{limit:100}).length,ledger);
  assert.throws(()=>explainWhy(db,"other",{event_key:"origin"}),/not found/);
  const hook=db.putSimulationRecord(guildId,{kind:"hook",status:"ready",data:{content:"A synthetic messenger waits",visibility:"party"}});
  const guild={id:guildId,channels:{fetch:async()=>({isTextBased:()=>true,send:async()=>{throw new Error("Synthetic delivery failure");}})}};
  db.configureCampaign(guildId,{playChannelId:"play"});
  await assert.rejects(()=>publishSimulationHooks({db,guild}),/delivery failure/);
  assert.equal(db.getSimulationRecord(guildId,hook.id).status,"ready");metrics.publish_failures++;
  guild.channels.fetch=async()=>({isTextBased:()=>true,send:async()=>({id:"delivered"})});
  await publishSimulationHooks({db,guild});assert.equal(db.getSimulationRecord(guildId,hook.id).status,"delivered");metrics.publish_repairs++;
  metrics.invalid_proposal_rate=metrics.invalid_proposals/(metrics.actions+metrics.invalid_proposals);
  console.log(`Endurance PASS ${JSON.stringify(metrics)}`);
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
