/** Production GM request/preview/commit contracts with scripted provider outputs, never paid calls. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { GMService } from "../src/gm.js";
import { ContentIndex } from "../src/content.js";
import { FakeResponses } from "./contract-fixtures.mjs";
import { POST_TURN_REVIEW_CATEGORIES, normalizeDirectorConfidence } from "../src/director.js";
import { captureWorldInput } from "../src/autonomous-world.js";
import { commitGmTurn } from "../src/turn-orchestration.js";
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-relax-e2e-"));
const db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
try{
  const guild="contract";db.ensureCampaign(guild);const session=db.startSession(guild,"Rain");db.upsertPlayer(guild,"owner","Owner");
  const pc=db.createCharacter(guild,"owner","Tyrell",{});db.assignCharacter(session.id,"owner",pc.id);db.setPresence(session.id,"owner","present");
  const content=new ContentIndex(path.resolve("../content"));
  const gm=new GMService({db,content,config:{openaiApiKey:"offline-dummy",maxRecentMessages:20,maxContentChunks:2,
    gmModel:"fixture-strong",routineGmModel:"fixture-fast",routerModel:"fixture",maxOutputTokens:5000,
    structuredRetryMaxTokens:6000,contextInputBudget:100000,gmTurnDeadlineMs:2000,aiOperationDeadlineMs:2000},ai:new FakeResponses([])});
  const assignment=db.controlledAssignment(session.id,"owner"),message={id:"work",author:{id:"owner"},content:'**I look up at the rain and sigh, "I need work, PantryQueue isn\'t pulling in enough money..."**'};
  gm.ai=new FakeResponses([]);
  assert.equal(await gm.shouldRespond({guildId:guild,message,actorAssignment:assignment,mode:"assisted"}),true);
  assert.equal(gm.ai.requests.length,0,"Indirect character need bypasses the unnecessary router call");
  assert.equal(await gm.shouldRespond({guildId:guild,message,actorAssignment:assignment,mode:"mention"}),false,"Explicit mention-only preference retained");
  const review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(k=>[k,{decision:"no_change",reason:"No persistent effects.",confidence:40}]));
  review.scene={decision:"continue",label:"",reason:"Same rain-soaked street."};
  const intent=(source_span,type="other",patch={})=>({type,source_span,target_name:"",target_key:"",destination:"unspecified",
    operation:"",utterance:"",excluded_targets:[],framing:"immediate",resolution:"conversational",reason:"",...patch});
  const empty={respond:true,narration:"What sort of work would you look for, and where would you start?",world_additions:[],scene_actions:[],world_conflicts:[],
    narrative_interpretation:null,context_memories:[],authored_candidates:null,narrative_claims:[],private_messages:[],events:[],handouts:[],relationships:[],npc_memories:[],npc_knowledge:[],
    npc_goals:[],canon_proposals:[],simulation_updates:[],ai_intents:[],decision_advisory:null,state_review:review};
  const invitationIntent=[intent(message.content)];
  gm.ai=new FakeResponses([{...empty,respond:false,narration:"",player_intents:invitationIntent},{...empty,player_intents:invitationIntent}]);
  captureWorldInput(db,guild,"owner",pc.id,message.id,message.content);
  const response=await gm.runTurn({guildId:guild,actorUserId:"owner",actorName:"Tyrell",actorAssignment:assignment,messageText:message.content,messageId:message.id});
  assert.equal(gm.ai.requests.length,2,"Suppressed character invitation gets a bounded native retry");
  assert(gm.ai.requests.every(request=>request.model==="fixture-fast"),"Routine turns use the configured low-latency model");
  assert(response.narration.includes("work"));assert(gm.ai.requests[0].instructions.includes("Veilkeeper IS the GM"));
  assert(gm.ai.requests[0].text.format.schema.properties.world_additions);
  const search="I look for an open public place, keeping out of the light, not Hollow Street.";
  const searchIntent=intent(search,"search",{target_name:"an open public place",operation:"find",excluded_targets:["Hollow Street"],resolution:"auto"});
  const finding={...empty,narration:"An open laundromat's deep awning offers shelter away from Hollow Street. What do you do?",
    player_intents:[searchIntent],
    world_additions:[{kind:"location",key:"laundromat",name:"All-Night Laundromat",summary:"An open public laundromat with a shaded awning.",parent_location_key:"",visibility:"party"}],
    scene_actions:[{kind:"reveal_nearby_place",entity_ref:"laundromat",source_span:search,zone:""}]};
  captureWorldInput(db,guild,"owner",pc.id,"search",search);
  gm.ai=new FakeResponses([{...empty,player_intents:[searchIntent],narration:"I need the GM to establish the nearby surroundings before resolving what you find."},finding]);
  const discovered=await gm.runTurn({guildId:guild,actorUserId:"owner",actorName:"Tyrell",actorAssignment:assignment,messageText:search,messageId:"search"});
  assert.equal(gm.ai.requests.length,2,"R01: obsolete human worldbuilding deferral is corrected with a native discovery");
  assert.equal(discovered.world_additions[0].key,"laundromat");assert.equal(db.getCharacter(pc.id).data.location,undefined);
  const badReferenceReview=structuredClone(finding);
  badReferenceReview.state_review.references={decision:"changed",reason:"The nearby location becomes known.",confidence:95};
  captureWorldInput(db,guild,"owner",pc.id,"search-review",search);
  gm.ai=new FakeResponses([badReferenceReview,badReferenceReview,finding]);
  const reviewRecovered=await gm.runTurn({guildId:guild,actorUserId:"owner",actorName:"Tyrell",actorAssignment:assignment,
    messageText:search,messageId:"search-review"});
  assert.equal(reviewRecovered.state_review.references.decision,"no_change");
  assert.equal(reviewRecovered.world_additions[0].key,"laundromat","Review recovery preserves independently valid native worldbuilding");
  assert.equal(gm.ai.requests.length,1,"Optional reference-review mismatch is repaired and revalidated without another model call");
  const invalidInterpretation={...empty,player_intents:[intent("That diner sounds familiar.")],
    narrative_interpretation:{source_ref:"event:missing",references:[],intended_actions:[],acknowledgements:[],unresolved:[]}};
  captureWorldInput(db,guild,"owner",pc.id,"context-recovery","That diner sounds familiar.");
  gm.ai=new FakeResponses([invalidInterpretation,invalidInterpretation,empty]);
  const recovered=await gm.runTurn({guildId:guild,actorUserId:"owner",actorName:"Tyrell",actorAssignment:assignment,
    messageText:"That diner sounds familiar.",messageId:"context-recovery"});
  assert.equal(recovered.narrative_interpretation,null);
  assert.equal(gm.ai.requests.length,1,"Optional invalid interpretation is quarantined and revalidated without another model call");
  const hanging={responses:{create:(_request,{signal})=>new Promise((resolve,reject)=>{
    signal.addEventListener("abort",()=>reject(signal.reason),{once:true});
  })}};
  const bounded=new GMService({db,content,config:{aiOperationDeadlineMs:20},ai:hanging});
  const keepAlive=setTimeout(()=>{},1000);
  try{await assert.rejects(()=>bounded.requestStructured({model:"fixture",input:"wait",text:{format:{schema:{type:"object",properties:{}}}}},
    {label:"fixture deadline"}),error=>error.code==="AI_GENERATION_DEADLINE");}finally{clearTimeout(keepAlive);}
  assert.equal(normalizeDirectorConfidence({act:true,confidence:40}).act,true,"R17 confidence alone isn't human review");
  const enter="I enter the diner.",result={...empty,narration:"You arrive at the diner.",
    player_intents:[intent(enter,"move",{target_name:"Diner",target_key:"diner",destination:"interior",resolution:"auto"})],
    world_additions:[{kind:"location",key:"diner",name:"Diner",summary:"A modest open diner.",parent_location_key:"",visibility:"party"}],
    scene_actions:[{kind:"move",entity_ref:"diner",source_span:enter,zone:"interior"}],
    narrative_claims:[{actor:"",entity_type:"character",entity:pc.id,action:"movement",prior:"",proposed:"diner",visibility:"party",source_ref:"",source_span:"You arrive at the diner.",mutation_index:-1,certainty:"committed"}]};
  captureWorldInput(db,guild,"owner",pc.id,"enter",enter);gm.ai=new FakeResponses([result]);
  const generated=await gm.runTurn({guildId:guild,actorUserId:"owner",actorName:"Tyrell",actorAssignment:assignment,messageText:enter,messageId:"enter"});
  assert.equal(db.getSimulationEntity(guild,"location","diner"),null,"Generation previews but never commits");
  const mutation=commitGmTurn({db,content,guild:{id:guild},session,result:generated,scope:{mode:"party",actorUserId:"owner",actorCharacterId:pc.id},
    speaker:"Tyrell",label:"Fixture",meta:{messageId:"enter",triggerText:enter}});
  assert(mutation.world.some(row=>row.status==="arrived"));assert.equal(db.getCharacter(pc.id).data.location,"diner");
  console.log("RELAX end-to-end PASS: reflective work request routes/responds, false silence corrected, strict creation schema, staged arrival validated, shared commit persists; no paid calls.");
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
