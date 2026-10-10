/** T00.1 authority gate: only current verified move intent or an explicit legacy-entry adapter can move a PC. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { applyAuthoritativeMutation } from "../src/state.js";
import { captureWorldInput } from "../src/autonomous-world.js";
import { configureSimulationEntity } from "../src/simulation.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { prepareSceneEntry } from "../src/scene-entry.js";

const location=(key,name=key)=>({kind:"location",key,name,summary:"An ordinary open local place.",parent_location_key:"",visibility:"party"});
const action=(target,span,zone="scene")=>({kind:"move",entity_ref:target,source_span:span,zone});
const moveIntent=(span,key,name=key,patch={})=>({type:"move",source_span:span,target_name:name,target_key:key,
  destination:"unspecified",operation:"",utterance:"",excluded_targets:[],framing:"immediate",resolution:"auto",reason:"",...patch});

function createFixture(label){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),`vc-move-auth-${label}-`));
  const db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
  const guild=`move-auth-${label}`;
  db.ensureCampaign(guild);
  const session=db.startSession(guild,"Movement authority");
  db.upsertPlayer(guild,"owner","Owner");
  const pc=db.createCharacter(guild,"owner","Tyrell",{});
  db.assignCharacter(session.id,"owner",pc.id);
  db.setPresence(session.id,"owner","present");
  const scope={mode:"party",actorUserId:"owner",actorCharacterId:pc.id};
  return {dir,db,guild,session,pc,scope,close(){db.close();fs.rmSync(dir,{recursive:true,force:true});}};
}

function attempt(fixture,id,text,narrative){
  captureWorldInput(fixture.db,fixture.guild,"owner",fixture.pc.id,id,text);
  return applyAuthoritativeMutation(fixture.db,{guildId:fixture.guild,sessionId:fixture.session.id,narrative,
    scope:fixture.scope,provenance:{messageId:id}});
}

function assertRejectedVariant(name,playerIntents){
  const fixture=createFixture(name);
  try{
    const text="I look around.",narrative={world_additions:[location("forged-shop","Forged Shop")],
      scene_actions:[action("forged-shop",text)],world_conflicts:[]};
    if(playerIntents!=="missing") narrative.player_intents=playerIntents;
    assert.throws(()=>attempt(fixture,name,text,narrative),/typed|intent|authorization/i,`SEC-01/02 ${name} must reject movement`);
    assert.equal(fixture.db.getSimulationEntity(fixture.guild,"location","forged-shop"),null,`${name} must roll back the proposed entity`);
    assert.equal(fixture.db.getCharacter(fixture.pc.id).data.location??null,null,`${name} must not move the character`);
  }finally{fixture.close();}
}

assertRejectedVariant("missing","missing");
assertRejectedVariant("empty",[]);
assertRejectedVariant("null",null);
assertRejectedVariant("observe",[{...moveIntent("I look around.","forged-shop"),type:"observe",resolution:"conversational"}]);

{
  const fixture=createFixture("redirect");
  try{
    const text="I enter Alpha.";
    assert.throws(()=>attempt(fixture,"redirect",text,{player_intents:[moveIntent(text,"alpha","Alpha",{destination:"interior"})],
      world_additions:[location("alpha","Alpha"),location("beta","Beta")],scene_actions:[action("beta",text,"interior")],world_conflicts:[]}),
    /target|destination|intent/i,"SEC-03 model target redirection must fail");
    assert.equal(fixture.db.getSimulationEntity(fixture.guild,"location","alpha"),null);
    assert.equal(fixture.db.getSimulationEntity(fixture.guild,"location","beta"),null);
  }finally{fixture.close();}
}

{
  const fixture=createFixture("approach");
  try{
    const text="I approach the Shop door.";
    assert.throws(()=>attempt(fixture,"approach",text,{player_intents:[moveIntent(text,"shop","Shop",{destination:"exterior"})],
      world_additions:[location("shop","Shop")],scene_actions:[action("shop",text,"interior")],world_conflicts:[]}),
    /exterior|interior|scope|destination/i,"SEC-04 approach/exterior cannot become interior entry");
    assert.equal(fixture.db.getCharacter(fixture.pc.id).data.location??null,null);
    assert.equal(fixture.db.getSimulationEntity(fixture.guild,"location","shop"),null);
  }finally{fixture.close();}
}

for(const [label,text,patch] of [
  ["conditional","I consider going inside.",{framing:"conditional",resolution:"blocked",reason:"Only considered."}],
  ["quoted",'Someone says "I enter the store."',{framing:"quoted",resolution:"blocked",reason:"Reported quotation."}],
  ["blocked","I enter the locked store.",{resolution:"blocked",reason:"Access is locked."}],
  ["roll-pending","I leap across the alley.",{resolution:"roll_required",reason:"A risky leap requires a roll."}]
]){
  const fixture=createFixture(label);
  try{
    assert.throws(()=>attempt(fixture,label,text,{player_intents:[moveIntent(text,"store","Store",patch)],
      world_additions:[location("store","Store")],scene_actions:[action("store",text,"interior")],world_conflicts:[]}),
    /intent|immediate|quoted|conditional|roll|blocked|authorization/i,`SEC-05/06 blocked framing ${label} must not execute`);
    assert.equal(fixture.db.getCharacter(fixture.pc.id).data.location??null,null);
    assert.equal(fixture.db.getSimulationEntity(fixture.guild,"location","store"),null);
  }finally{fixture.close();}
}

{
  const fixture=createFixture("wrong-principal");
  try{
    const text="I enter the Shop.";
    captureWorldInput(fixture.db,fixture.guild,"owner",fixture.pc.id,"wrong-principal",text);
    fixture.db.upsertPlayer(fixture.guild,"other","Other");
    const other=fixture.db.createCharacter(fixture.guild,"other","Other PC",{});
    fixture.db.assignCharacter(fixture.session.id,"other",other.id);
    fixture.db.setPresence(fixture.session.id,"other","present");
    assert.throws(()=>applyAuthoritativeMutation(fixture.db,{guildId:fixture.guild,sessionId:fixture.session.id,
      narrative:{player_intents:[moveIntent(text,"shop","Shop",{destination:"interior"})],world_additions:[location("shop","Shop")],
        scene_actions:[action("shop",text,"interior")],world_conflicts:[]},
      scope:{mode:"party",actorUserId:"other",actorCharacterId:other.id},provenance:{messageId:"wrong-principal"}}),
    /source|owner|current|authenticated/i,"SEC-07 another principal cannot reuse the source message");
    assert.equal(fixture.db.getSimulationEntity(fixture.guild,"location","shop"),null);
  }finally{fixture.close();}
}

function prepareLegacy(fixture,id="legacy-entry"){
  configureCityFlags(fixture.db,fixture.guild,{natural_language:true,scene_continuity:true},"gm");
  configureSimulationEntity(fixture.db,fixture.guild,"location","legacy-cafe",{name:"Legacy Cafe",ai_gm_origin:true,access:"public"});
  fixture.db.upsertReference(fixture.guild,{kind:"location",key:"legacy-cafe",name:"Legacy Cafe",summary:"An open local cafe.",visibility:"party"});
  const declaration="I enter the Legacy Cafe.";
  const entry=prepareSceneEntry(fixture.db,fixture.guild,"owner",fixture.pc.id,id,declaration);
  assert(entry&&["pending","awaiting_adjudication"].includes(entry.status));
  captureWorldInput(fixture.db,fixture.guild,"owner",fixture.pc.id,`${id}-followup`,"I wait for the door.");
  return {declaration,entry};
}

{
  const fixture=createFixture("legacy-valid");
  try{
    const {declaration}=prepareLegacy(fixture);
    const result=applyAuthoritativeMutation(fixture.db,{guildId:fixture.guild,sessionId:fixture.session.id,
      narrative:{world_additions:[],scene_actions:[action("legacy-cafe",declaration,"interior")],world_conflicts:[]},
      scope:fixture.scope,provenance:{messageId:"legacy-entry-followup"}});
    assert.equal(result.world[0].status,"arrived","SEC-08 valid persisted legacy entry resolves");
    assert.equal(result.world[0].authorization?.kind,"legacy_scene_entry","legacy resolution needs an explicit adapter receipt");
    assert(result.world[0].authorization?.receipt,"legacy adapter receipt must be durable and addressable");
    const receipt=fixture.db.getCityRecord(fixture.guild,"legacy_scene_entry_adapter",result.world[0].authorization.receipt);
    assert.equal(receipt?.visibility,"character","legacy adapter must preserve the private character audience");
    assert.equal(receipt?.subject_key,fixture.pc.id,"legacy adapter must remain bound to the declaring character");
  }finally{fixture.close();}
}

{
  const fixture=createFixture("legacy-stale");
  try{
    const {declaration,entry}=prepareLegacy(fixture,"stale-entry");
    indexWorldEvent(fixture.db,fixture.guild,{key:entry.source_event,status:"retracted"});
    assert.throws(()=>applyAuthoritativeMutation(fixture.db,{guildId:fixture.guild,sessionId:fixture.session.id,
      narrative:{world_additions:[],scene_actions:[action("legacy-cafe",declaration,"interior")],world_conflicts:[]},
      scope:fixture.scope,provenance:{messageId:"stale-entry-followup"}}),/legacy|entry|source|authorization/i,
    "SEC-09 retracted legacy source must fail closed");
    assert.equal(fixture.db.getCharacter(fixture.pc.id).data.location??null,null);
  }finally{fixture.close();}
}

console.log("T00.1 movement authorization PASS: SEC-01 through SEC-09, rollback, scoped legacy adapter and receipt.");
