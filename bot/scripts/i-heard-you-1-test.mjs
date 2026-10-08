/** IHY1 exercises authenticated capture, real GM contracts, native commit, scoped publication and restart without network. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { recordScenePresence } from "../src/scene-continuity.js";
import { captureDialogue } from "../src/dialogue-continuity.js";
import { captureDeclaration, interpretAuthoredText } from "../src/player-language.js";
import { prepareRollRequest, pendingRollRequests, formatRollRequest, publishRollRequests } from "../src/roll-requests.js";
import { configureDelegation } from "../src/ai-intents.js";
import { commitGmTurn } from "../src/turn-orchestration.js";
import { GMService } from "../src/gm.js";
import { ContentIndex } from "../src/content.js";
import { handleCommand } from "../src/commands.js";
import { FakeResponses, fakeInteraction } from "./contract-fixtures.mjs";
import { POST_TURN_REVIEW_CATEGORIES } from "../src/director.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-ihy1-")),file=path.join(temp,"test.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const guild="contract";db.ensureCampaign(guild);db.ensureCampaign("other");const session=db.startSession(guild,"Station");
  db.setSimulationEntity(guild,"location","room",{});
  indexWorldEvent(db,guild,{key:"source",kind:"arrival",source_id:"gm",title:"Scene established",location_key:"room",visibility:"party"});
  configureCityFlags(db,guild,{natural_language:true,roll_requests:true,dialogue_history:true,scene_continuity:true});
  const pcs=[];
  for(const [user,knowledge] of [["owner",2],["second",-1],["missing",null]]){
    db.upsertPlayer(guild,user,user);
    const pc=db.createCharacter(guild,user,user,{traits:knowledge===null?{}:{Knowledge:knowledge,Presence:1},proficiency:5});pcs.push(pc);
    db.assignCharacter(session.id,user,pc.id);db.setPresence(session.id,user,"present");
    recordScenePresence(db,guild,{entity_type:"character",entity_key:pc.id,location_key:"room",source_event:"source",accepted_by:user,visibility:"party"},"gm");
  }
  db.upsertNpcProfile(guild,{npcKey:"listener",displayName:"Listener"});
  db.setSimulationEntity(guild,"npc","listener",{location_key:"room"});
  recordScenePresence(db,guild,{entity_type:"npc",entity_key:"listener",location_key:"room",source_event:"source",visibility:"party"},"gm");
  db.upsertNpcProfile(guild,{npcKey:"absent",displayName:"Absent"});
  const mixed='I say to listener: "Please call me Doctor.", I try examining the terminal.';
  assert.equal(interpretAuthoredText(mixed,{natural:true}).kind,"mixed");
  const speech=captureDialogue(db,guild,"owner",pcs[0].id,"mixed",mixed);
  assert.equal(speech.details.quote,"Please call me Doctor.");assert.deepEqual(speech.details.listeners,["listener"]);
  assert.equal(db.listNpcMemories(guild,"absent").length,0);
  for(const text of ['OOC: I say: "Hello."','I might say: "Hello."','If I open the door, what happens?','Someone says: "Hello."']){
    assert.equal(captureDialogue(db,guild,"owner",pcs[0].id,text,text),null);
    assert.equal(captureDeclaration(db,guild,"owner",pcs[0].id,text,text),null);
  }
  assert.equal(captureDialogue(db,guild,"intruder",pcs[0].id,"forged",mixed),null);
  assert.equal(captureDeclaration(db,guild,"intruder",pcs[0].id,"forged","I examine it."),null);
  const declarations=pcs.map((pc,i)=>captureDeclaration(db,guild,pc.owner_user_id,pc.id,`attempt-${i}`,"I try examining the terminal."));
  const payload=i=>({op:"prepare",source_event:declarations[i].event_key,character_id:pcs[i].id,trait:"Knowledge",kind:"action",
    modifier_keys:[],difficulty_source:"",attack_source:"",adjudication:"Examination of a compromised terminal has uncertain consequences."});
  configureDelegation(db,guild,{mode:"routine_delegated",allow:["roll.prepare"],max_operations:4,max_cost:0,expires_minute:100},"gm");
  const review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(key=>[key,{decision:"no_change",reason:"No legacy mutation",confidence:100}]));
  review.scene={decision:"continue",label:"",reason:"Same scene"};
  const base={respond:true,narration:"Prepare a check.",narrative_claims:[],private_messages:[],events:[],handouts:[],relationships:[],
    npc_memories:[],npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],state_review:review};
  const intent=i=>({version:1,feature:"roll",target_key:"",expected_revision:"absent",policy_revision:1,source_prerequisites:[],payload:payload(i)});
  const fake=new FakeResponses([{...base,ai_intents:[intent(0)]}]);
  const gm=new GMService({db,content:new ContentIndex(path.resolve("../content")),ai:fake,
    config:{gmModel:"offline",maxRecentMessages:8,maxContentChunks:2}});
  const result=await gm.runTurn({guildId:guild,actorUserId:"owner",actorName:"owner",actorAssignment:db.activeAssignment(session.id,"owner"),
    messageText:"I try examining the terminal.",scope:"private"});
  assert.equal(fake.requests.length,1);assert(fake.requests[0].input.includes("AUTHENTICATED DECLARATION"));
  const commitArgs={db,guild:{id:guild},session,result,scope:{mode:"private",actorUserId:"owner",actorCharacterId:pcs[0].id},
    speaker:"owner",label:"IHY1",meta:{messageId:"request-0"}};
  const mutation=commitGmTurn(commitArgs);
  assert.equal(mutation.intents[0].status,"accepted",mutation.intents[0].data.diagnostic);
  const request=mutation.intents[0].data.result;
  assert.equal(request.data.breakdown.subtotal,2,"Proficiency is not an action bonus");
  assert.equal(commitGmTurn(commitArgs).intents[0].record_key,mutation.intents[0].record_key);
  await assert.rejects(()=>publishRollRequests(db,guild,mutation,async()=>false),/Retrieve/);
  const delivered=[];await publishRollRequests(db,guild,mutation,async(...args)=>{delivered.push(args);return true;});
  assert.equal(delivered[0][0],"owner");assert(delivered[0][1].includes("Knowledge +2"));assert(!delivered[0][1].includes("second"));
  await publishRollRequests(db,guild,mutation,async()=>assert.fail("Already delivered request was reposted"));
  assert.equal(db.getCharacter(pcs[0].id).data.resources.hope,2);
  const second=prepareRollRequest(db,guild,payload(1),"gm");assert(formatRollRequest(second).includes("Knowledge -1"));
  const missing=prepareRollRequest(db,guild,payload(2),"gm");assert.equal(missing.status,"needs_review");assert.equal(missing.data.breakdown.subtotal,null);
  assert.throws(()=>prepareRollRequest(db,"other",payload(0),"gm"),/opt-in/);
  assert.throws(()=>prepareRollRequest(db,guild,{...payload(0),character_id:pcs[1].id},"gm"),/authenticated/);
  assert.throws(()=>prepareRollRequest(db,guild,payload(1),"ai_policy",{scope:commitArgs.scope}),/Private/);
  assert.throws(()=>prepareRollRequest(db,guild,{...payload(1),modifier_keys:["source"]},"gm"),/Modifiers/);
  db.upsertRulesRuling(guild,{key:"terminal",question:"Established terminal assistance",ruling:"The established mundane tool grants +1 for this task.",createdBy:"gm"});
  indexWorldEvent(db,guild,{key:"modifier",kind:"roll_adjudication",source_id:"gm",title:"Human-adjudicated task modifier",
    visibility:"character",subject_key:pcs[1].id,details:{human_reviewed:true,
      roll_modifier:{trait:"Knowledge",roll_kind:"action",kind:"flat",amount:1,name:"Established tool",ruling_key:"terminal"}}});
  const extra=captureDeclaration(db,guild,"second",pcs[1].id,"extra","I try examining a second terminal.");
  const modified=prepareRollRequest(db,guild,{...payload(1),source_event:extra.event_key,modifier_keys:["modifier"]},"gm");
  assert.equal(modified.data.breakdown.subtotal,0);assert(formatRollRequest(modified).includes("Established tool: +1"));
  indexWorldEvent(db,guild,{key:"modifier",status:"retracted"});
  assert.throws(()=>prepareRollRequest(db,guild,{...payload(1),modifier_keys:["modifier"]},"gm"),/active source/);
  assert.equal(pendingRollRequests(db,guild,"owner").length,1);
  const interaction=fakeInteraction({gm:false,sub:"pending"});interaction.user.id="owner";
  interaction.isChatInputCommand=()=>true;interaction.commandName="vc-roll";
  interaction.followUp=async content=>interaction.deliveries.push(content);
  const before=db.db.prepare("SELECT total_changes() n").get().n;
  await handleCommand(interaction,{db,gm});
  assert.equal(db.db.prepare("SELECT total_changes() n").get().n,before,"Pending command must be zero-write");
  assert.equal(interaction.deliveries[0].ephemeral,true);assert(interaction.deliveries[0].content.includes("Knowledge +2"));
  const raw=fakeInteraction({gm:false,sub:"duality"});raw.user={id:"owner",username:"owner"};raw.isChatInputCommand=()=>true;raw.commandName="vc-roll";
  raw.options.getBoolean=()=>false;await handleCommand(raw,{db,gm});
  assert(raw.deliveries[0].content.includes("cannot resolve or bypass"));assert.equal(db.getCharacter(pcs[0].id).data.resources.hope,2);
  const snapshot=db.snapshotCampaign(guild,{label:"IHY1 requests",createdBy:"gm"});db.close();db=new VeiledDB(file,schema);
  db.restoreSnapshot(guild,snapshot.id,{actorId:"gm"});assert.equal(pendingRollRequests(db,guild,"owner")[0].record_key,request.record_key);
  db.setPresence(session.id,"owner","absent");assert.throws(()=>pendingRollRequests(db,guild,"owner"),/attendance/);
  assert.throws(()=>prepareRollRequest(db,guild,payload(0),"gm"),/attendance/);
  configureCityFlags(db,guild,{natural_language:false,roll_requests:false});
  assert.equal(captureDeclaration(db,guild,"second",pcs[1].id,"off","I open the door."),null);
  console.log("IHY1 PASS: authenticated exact speech/attempt/OOC isolation; actual per-PC traits; no invented bonuses/spend/RNG; real GM/commit/private delivery/replay/read-only command/restore.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
