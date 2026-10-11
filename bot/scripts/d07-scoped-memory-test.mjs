/** D07: live, bounded, audience-safe memory and referent continuity. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { rememberEntity } from "../src/memory-lifecycle.js";
import { scopedSceneMemory, resolveScopedMemoryReference } from "../src/scoped-memory.js";
import { GMService } from "../src/gm.js";
import { buildActionPlan } from "../src/action-dependency.js";
import { recordCharacterArrival } from "../src/scene-continuity.js";
import { configureCityFlags } from "../src/city-core.js";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-d07-"));
const db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
const guild="d07-fixture";
try{
  db.ensureCampaign(guild);
  const session=db.startSession(guild,"Scoped continuity");
  db.upsertPlayer(guild,"player-a","Player A");db.upsertPlayer(guild,"player-b","Player B");
  const tyrell=db.createCharacter(guild,"player-a","Tyrell",{});
  const alternate=db.createCharacter(guild,"player-a","Tyrell Alternate",{});
  const choso=db.createCharacter(guild,"player-b","Choso",{});
  db.assignCharacter(session.id,"player-a",tyrell.id);db.assignCharacter(session.id,"player-b",choso.id);
  db.setPresence(session.id,"player-a","present");db.setPresence(session.id,"player-b","present");
  db.updateCharacterData(tyrell.id,data=>{data.location="night-owl-east";});
  db.updateCharacterData(choso.id,data=>{data.location="night-owl-east";});
  db.setSimulationEntity(guild,"location","night-owl-east",{name:"Night Owl",aliases:["the store"]});
  db.setSimulationEntity(guild,"location","night-owl-west",{name:"Night Owl",aliases:["the store"]});
  configureCityFlags(db,guild,{scene_continuity:true},"gm");
  recordCharacterArrival(db,guild,db.getCharacter(tyrell.id),"player-a","arrival-a");
  recordCharacterArrival(db,guild,db.getCharacter(choso.id),"player-b","arrival-b");

  const party=indexWorldEvent(db,guild,{key:"party-memory",kind:"observation",title:"The storefront is observed",
    source_id:"player:player-a",visibility:"party",location_key:"night-owl-east",details:{}} ,"player-a");
  const privateSource=indexWorldEvent(db,guild,{key:"private-memory",kind:"testimony",title:"Tyrell learns a private clue",
    source_id:"player:player-a",visibility:"character",subject_key:tyrell.id,location_key:"night-owl-east",details:{}} ,"player-a");
  const eastDoor=rememberEntity(db,guild,{kind:"object",name:"Front Door",parent_key:"location:night-owl-east",
    aliases:["the front door"],source_event:party.event_key,visibility:"party",epistemic:"observation",summary:"The east storefront has a glass front door."});
  rememberEntity(db,guild,{kind:"object",name:"Front Door",parent_key:"location:night-owl-west",
    aliases:["the front door"],source_event:party.event_key,visibility:"party",epistemic:"observation",summary:"The west storefront has a steel front door."});
  const terminal=rememberEntity(db,guild,{kind:"object",name:"Shipping Terminal",parent_key:"location:night-owl-east",
    aliases:["the terminal"],source_event:party.event_key,visibility:"party",epistemic:"attempt",summary:"Billy attempted to diagnose the shipping terminal.",expires_tick:0});
  rememberEntity(db,guild,{kind:"rumor",name:"Cursed Parcel",parent_key:"location:night-owl-east",aliases:["the parcel"],
    source_event:party.event_key,visibility:"party",epistemic:"testimony",summary:"A courier claims the parcel is cursed."});
  const privateClue=rememberEntity(db,guild,{kind:"clue",name:"Locker Code",parent_key:"location:night-owl-east",aliases:[],
    source_event:privateSource.event_key,visibility:"character",subject_key:tyrell.id,epistemic:"inference",summary:"Tyrell suspects the code is 3141."});
  const terminalIntent=db.saveCityRecord(guild,{kind:"typed_intent",key:"accepted:terminal",status:"accepted_for_adjudication",
    source_event:party.event_key,visibility:"party",data:{proposal_id:"proposal:terminal",sequence_index:0,dependencies:[],
      source_span:"I diagnose the terminal.",actor:tyrell.id,session_id:session.id,scene:`${session.id}:1`,
      resolution:"roll_required",memory_identity_refs:[terminal.identity.record_key]}});
  const terminalPlan=buildActionPlan(db,guild,[terminalIntent])[0];
  assert.deepEqual(terminalPlan.data.memory_identity_refs,[terminal.identity.record_key],
    "pending action persists its durable memory dependency");

  const partyScope={mode:"party",actorUserId:"player-a",actorCharacterId:tyrell.id};
  const partyContext=scopedSceneMemory(db,guild,partyScope,{query:"I check the terminal by the front door",currentLocation:"night-owl-east",atTick:5,limit:8});
  assert(partyContext.memories.some(row=>row.identity===terminal.identity.record_key),"pending identity survives fictional expiry");
  assert(partyContext.memories.some(row=>row.name==="Cursed Parcel"&&row.epistemic==="testimony"),"rumor remains testimony");
  assert(!partyContext.memories.some(row=>row.identity===privateClue.identity.record_key),"party context cannot read character-private memory");
  assert.equal(partyContext.memories[0].parent_key,"location:night-owl-east","current location is prioritized");
  assert.deepEqual(new Set(partyContext.positions.map(row=>row.name)),new Set(["Tyrell","Choso"]),
    "native co-located character positions are available without granting control");

  const door=resolveScopedMemoryReference(db,guild,partyScope,"the front door",{currentLocation:"night-owl-east"});
  assert.equal(door.status,"resolved");assert.equal(door.identity,eastDoor.identity.record_key);
  assert.equal(resolveScopedMemoryReference(db,guild,partyScope,"the front door",{}).status,"ambiguous",
    "same name under different parents cannot be conflated without scope");
  assert.equal(resolveScopedMemoryReference(db,guild,partyScope,"the terminal",{currentLocation:"night-owl-east"}).identity,
    terminal.identity.record_key);

  const privateContext=scopedSceneMemory(db,guild,{...partyScope,mode:"private"},{currentLocation:"night-owl-east"});
  assert(privateContext.memories.some(row=>row.identity===privateClue.identity.record_key));
  assert(!scopedSceneMemory(db,guild,{mode:"private",actorUserId:"player-a",actorCharacterId:alternate.id},
    {currentLocation:"night-owl-east"}).memories.some(row=>row.identity===privateClue.identity.record_key),
  "private memory stays with the character after a same-user character swap");

  const gm=new GMService({db,content:{search:()=>[],read:()=>""},config:{maxRecentMessages:5,maxContentChunks:2},
    ai:{responses:{create:async()=>{throw new Error("offline test must not call a model");}}}});
  const live=gm.buildContext(guild,"player-a","I check the terminal by the front door",db.controlledAssignment(session.id,"player-a"));
  assert(live.scoped_memory.memories.some(row=>row.identity===terminal.identity.record_key),"live GM context receives scoped memory");
  assert(!live.scoped_memory.memories.some(row=>row.identity===privateClue.identity.record_key),"party GM turn remains party-scoped");
  assert.match(live.scoped_memory.authority,/evidence only/i);

  console.log("D07 scoped memory PASS: live injection, parent aliases, pending retention, epistemics and audience isolation.");
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
