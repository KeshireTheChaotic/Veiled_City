/** Scoped conversational understanding never authorizes travel, presence, access or encounters. Offline fixtures only. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { prepareSceneEntry, routeSceneEntryMessage, entryReferenceContext, reviewSceneEntry } from "../src/scene-entry.js";
import { declarationContext } from "../src/player-language.js";
import { validateNarrativeClaims } from "../src/narrative-integrity.js";
import { scenePresence } from "../src/scene-continuity.js";
import { stateRevision } from "../src/ai-intents.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { GMService } from "../src/gm.js";
import { ContentIndex } from "../src/content.js";
import { FakeResponses } from "./contract-fixtures.mjs";
import { POST_TURN_REVIEW_CATEGORIES } from "../src/director.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-understanding-"));
const db=new VeiledDB(path.join(temp,"fixture.sqlite"),path.resolve("sql/schema.sql"));
try{
  const guild="understanding";db.ensureCampaign(guild);const session=db.startSession(guild,"References");
  configureCityFlags(db,guild,{natural_language:true,scene_continuity:true,semantic_integrity:true});
  const pcs=[];
  for(const user of ["owner","other"]){
    db.upsertPlayer(guild,user,user);const pc=db.createCharacter(guild,user,user,{});pcs.push(pc);
    db.assignCharacter(session.id,user,pc.id);db.setPresence(session.id,user,"present");
  }
  const [pc,other]=pcs,scope={mode:"private",actorUserId:"owner",actorCharacterId:pc.id};
  const entry=prepareSceneEntry(db,guild,"owner",pc.id,"entry","I enter the diner.",{privateScene:true});
  prepareSceneEntry(db,guild,"other",other.id,"other-entry","I enter Secret Sentinel.",{privateScene:true});
  const refs=entryReferenceContext(db,guild,"owner",pc.id);
  assert.equal(refs.attempts.length,1);assert.equal(refs.attempts[0].target,"the diner");
  assert.doesNotMatch(JSON.stringify(refs),/Secret Sentinel/);
  assert.equal(entryReferenceContext(db,guild,"other",pc.id),null);
  assert.equal(entryReferenceContext(db,guild,"owner",pc.id,{mode:"party"}).attempts.length,0,"Private intent is not party context");
  assert.equal(declarationContext(db,guild,"owner",pc.id,"That diner, the one we discussed.").kind,"unclear");
  assert.match(declarationContext(db,guild,"owner",pc.id,"That diner.").authority,/not a demand for clarification/);
  assert.equal(await routeSceneEntryMessage({db,message:{guild:{id:guild},author:{id:"owner"},id:"entry"},
    characterId:pc.id,text:"I enter the diner.",privateScene:true,deliver:async()=>assert.fail("No automatic clarification")}),false);

  const span="That clarifies the destination of your earlier entry attempt.";
  const claim={actor:"",entity_type:"character",entity:pc.id,action:"movement",prior:"",proposed:"diner",visibility:"character",
    source_ref:`event:${entry.source_event}`,source_span:span,mutation_index:-1,certainty:"intent"};
  const check=(c,audience=scope)=>validateNarrativeClaims(db,guild,{narration:c.source_span,narrative_claims:[c]},audience);
  check(claim);
  assert.equal(db.getCharacter(pc.id).data.location,undefined);assert.equal(scenePresence(db,guild,"character",pc.id),null);
  assert.throws(()=>check(claim,{mode:"party"}),/uncertainty_framing/);
  assert.throws(()=>check({...claim,entity:other.id}),/uncertainty_framing/);
  assert.throws(()=>check({...claim,source_ref:"event:missing"}),/uncertainty_framing/);
  assert.throws(()=>check({...claim,source_span:span+" You have entered the diner."}),/uncertainty_framing/);
  assert.throws(()=>check({...claim,certainty:"committed",source_span:"You have entered the diner."}),/uncommitted_movement/);
  assert.throws(()=>check({...claim,certainty:"committed",action:"status",proposed:"dead",source_span:"You are dead."}),/actor_status/);
  const secret=db.addFact(guild,{content:"Hidden occupant",visibility:"gm"});
  assert.throws(()=>check({...claim,action:"disclosure",certainty:"uncertain",source_ref:secret,proposed:"Hidden occupant",
    source_span:"Perhaps the hidden occupant is here."}),/scoped_disclosure/);

  const categories=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(key=>[key,{decision:"no_change",reason:"No mutation",confidence:100}]));
  categories.scene={decision:"continue",label:"",reason:"Understanding intent is not travel"};
  const base={respond:true,narration:span,narrative_claims:[claim],private_messages:[],events:[],handouts:[],relationships:[],
    npc_memories:[],npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],ai_intents:[],state_review:categories};
  const before=JSON.stringify(db.getCharacter(pc.id).data);
  const fake=new FakeResponses([base,{...base,narration:"I understand which destination you mean.",narrative_claims:[]}]);
  const gm=new GMService({db,content:new ContentIndex(path.resolve("../content")),
    config:{gmModel:"offline",maxRecentMessages:8,maxContentChunks:2},ai:fake});
  for(const messageText of ["By diner I mean the place we discussed.","That one, yes."]){
    const result=await gm.runTurn({guildId:guild,actorUserId:"owner",actorName:"Owner",messageText,scope:"private"});
    assert.equal(result.events.length,0);assert.equal(result.simulation_updates.length,0);
  }
  assert.equal(fake.requests.length,2,"Each ordinary acknowledgement should succeed without a corrective retry");
  assert.match(fake.requests[0].input,/CONVERSATIONAL ENTRY REFERENCES \(not authority\)/);
  assert.match(fake.requests[0].instructions,/Separate conversational understanding from authority/);
  assert.equal(JSON.stringify(db.getCharacter(pc.id).data),before);
  assert.equal(scenePresence(db,guild,"character",pc.id),null);
  assert.equal(db.getNpcProfile(guild,"hidden-occupant"),null);
  assert.equal(db.getCityRecord(guild,"scene_entry",entry.record_key).status,"pending");

  const review={op:"review-entry",key:entry.record_key,expected_revision:stateRevision(entry),location_key:"diner",adjudication:"Human access ruling"};
  assert.throws(()=>reviewSceneEntry(db,guild,review,"gm"),/Establish/);
  db.setSimulationEntity(guild,"location","diner",{name:"Diner",restricted:true});
  // Context does not bypass native encounter movement review, even for a known destination.
  const encounter=db.getCurrentEncounter.bind(db);db.getCurrentEncounter=()=>({status:"active"});
  assert.throws(()=>reviewSceneEntry(db,guild,review,"gm"),/encounter movement/);
  db.getCurrentEncounter=encounter;
  assert.equal(scenePresence(db,guild,"character",pc.id),null);
  indexWorldEvent(db,guild,{key:entry.source_event,status:"retracted"});
  assert.equal(entryReferenceContext(db,guild,"owner",pc.id).attempts.length,0);
  assert.throws(()=>check(claim),/uncertainty_framing/);
  assert.throws(()=>reviewSceneEntry(db,guild,review,"gm"),/source/);
  console.log("Narrative understanding PASS: contextual follow-ups without forced questions; owner/source privacy; no travel/access/presence/encounter authority; no live calls.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
