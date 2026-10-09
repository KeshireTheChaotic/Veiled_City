/** Scene intent and witness integration across native commits, model drafts, actor packets and narrative validation. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { configureDelegation, stateRevision } from "../src/ai-intents.js";
import { applyAuthoritativeMutation } from "../src/state.js";
import { scenePresence, sceneAccess, reconcileSceneArrival, recordScenePresence, recordCharacterArrival, assertNpcObservation } from "../src/scene-continuity.js";
import { retrieveNpcCognition } from "../src/npc-cognition.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-end-to-end-b-")),db=new VeiledDB(path.join(temp,"test.sqlite"),path.resolve("sql/schema.sql"));
try{
  const guild="b";db.ensureCampaign(guild);db.startSession(guild,"Room");
  configureCityFlags(db,guild,{scene_continuity:true});
  for(const key of ["room","remote"]) db.setSimulationEntity(guild,"location",key,{});
  db.upsertPlayer(guild,"owner","Owner");
  const pc=db.createCharacter(guild,"owner","Transferred PC",{}),session=db.getActiveSession(guild);
  db.setPresence(session.id,"owner","present");db.assignCharacter(session.id,"owner",pc.id);
  const eventsBefore=db.db.prepare("SELECT count(*) AS count FROM world_events").get().count;
  assert.equal(recordCharacterArrival(db,guild,pc,"owner","missing-location"),null);
  for(const location of [null,"","   ",{},[],42,"unestablished"]){
    assert.equal(recordCharacterArrival(db,guild,{...pc,data:{...pc.data,location}},"owner","invalid-location"),null);
  }
  assert.equal(db.db.prepare("SELECT count(*) AS count FROM world_events").get().count,eventsBefore,
    "Missing or invalid locations must not invent arrival evidence");
  assert.equal(scenePresence(db,guild,"character",pc.id),null);
  const arrival=recordCharacterArrival(db,guild,{...pc,data:{...pc.data,location:"room"}},"owner","valid-location");
  assert.equal(arrival.location_key,"room");
  assert.equal(scenePresence(db,guild,"character",pc.id).record_key,arrival.record_key);
  assert.equal(recordCharacterArrival(db,guild,{...pc,data:{...pc.data,location:"room"}},"owner","valid-location").record_key,
    arrival.record_key,"Arrival retries remain idempotent");
  for(const key of ["witness","other","remote"]){db.upsertNpcProfile(guild,{npcKey:key,displayName:key});
    db.setSimulationEntity(guild,"npc",key,{location_key:key==="remote"?"remote":"room"});}
  indexWorldEvent(db,guild,{key:"arrival",title:"Other entered the room",kind:"arrival",source_id:"gm",location_key:"room",visibility:"party",
    details:{entity_type:"npc",entity_key:"other",observation:"Other entered the room"}});
  indexWorldEvent(db,guild,{key:"witness-arrival",title:"Witness entered",kind:"arrival",source_id:"gm",location_key:"room",visibility:"party",
    details:{entity_type:"npc",entity_key:"witness"}});
  reconcileSceneArrival(db,guild,{type:"npc",key:"witness",source_event:"witness-arrival"});
  configureDelegation(db,guild,{mode:"routine_delegated",allow:["scene.record"],max_operations:1,max_cost:0,expires_minute:100},"gm");
  const payload={source_event:"arrival",op:"record",entity_type:"npc",entity_key:"other",location_key:"room",zone:"scene",to_zone:"",range:"Close",
    state:"actually_present",hidden:false,known_to:[],visibility:"party",subject_key:"",blocks:[]};
  const intent={version:1,feature:"scene",target_key:"",expected_revision:"absent",policy_revision:1,source_prerequisites:[],payload};
  const applied=applyAuthoritativeMutation(db,{guildId:guild,aiIntents:[intent],provenance:{messageId:"arrival"}});
  assert.equal(applied.intents[0].status,"accepted",applied.intents[0].data.diagnostic);
  assert(sceneAccess(db,guild,{observer_type:"npc",observer_key:"witness",target_type:"npc",target_key:"other"}));
  assertNpcObservation(db,guild,"witness","arrival",{sourceType:"witnessed",content:payload.source_event==="arrival"?"Other entered the room":""});
  assert.throws(()=>assertNpcObservation(db,guild,"remote","arrival",{sourceType:"witnessed",content:"Other entered the room"}),/accessible/);
  assert.throws(()=>applyAuthoritativeMutation(db,{guildId:guild,npcKnowledge:[{npc_key:"remote",knowledge_key:"impossible",
    source_ref:"arrival",source_type:"witnessed",content:"Other entered the room"}]}),/accessible/);
  assert(!db.getNpcKnowledge(guild,"remote","impossible"));
  indexWorldEvent(db,guild,{key:"concealment",title:"Other is concealed",source_id:"gm",location_key:"room",
    details:{entity_type:"npc",entity_key:"other",hidden:true}});
  const prior=scenePresence(db,guild,"npc","other");
  const hidden={...intent,expected_revision:stateRevision(prior),payload:{...payload,source_event:"concealment",hidden:true,visibility:"gm"}};
  assert.equal(applyAuthoritativeMutation(db,{guildId:guild,aiIntents:[hidden],provenance:{messageId:"hidden"}}).intents[0].status,"accepted");
  assert.throws(()=>assertNpcObservation(db,guild,"witness","arrival",{sourceType:"witnessed",content:"Other entered the room"}),/accessible/);
  const packets=retrieveNpcCognition(db,guild,{query:"witness",maxNpcs:1,recordRecall:false});
  assert(!JSON.stringify(packets.npcs?.[0]?.scene_observations||packets).includes('"entity_key":"other"'));
  assert.equal(reconcileSceneArrival(db,guild,{type:"npc",key:"witness",source_event:"witness-arrival"}).record_key,
    scenePresence(db,guild,"npc","witness").record_key);
  console.log("End-to-end B PASS: delegated sourced scene intents, deterministic arrivals, unknown/remote/hidden witness refusal and actor packets; zero paid calls.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
