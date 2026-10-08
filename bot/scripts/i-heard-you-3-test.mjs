/** Real listener correction, native roll -> tactical witness -> cognition, replay and restart. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { recordScenePresence } from "../src/scene-continuity.js";
import { captureDialogue } from "../src/dialogue-continuity.js";
import { retrieveNpcCognition } from "../src/npc-cognition.js";
import { configureDelegation, dispatchAiIntents } from "../src/ai-intents.js";
import { captureDeclaration } from "../src/player-language.js";
import { prepareRollRequest, rollRevision } from "../src/roll-requests.js";
import { adjudicateRollSource, contributeRoll } from "../src/roll-collaboration.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-ihy3-")),file=path.join(temp,"test.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const guild="continuity";db.ensureCampaign(guild);const session=db.startSession(guild,"Witness lab");
  configureCityFlags(db,guild,{natural_language:true,dialogue_history:true,scene_continuity:true,tactical_memory:true,roll_requests:true,roll_collaboration:true});
  db.setSimulationEntity(guild,"location","room",{});
  indexWorldEvent(db,guild,{key:"scene",source_id:"gm",title:"Lab",kind:"arrival",location_key:"room",visibility:"party"});
  db.upsertPlayer(guild,"owner","Owner");const pc=db.createCharacter(guild,"owner","Doctor",{traits:{Finesse:2},inventory:["Plain blade"]});
  db.assignCharacter(session.id,"owner",pc.id);db.setPresence(session.id,"owner","present");
  recordScenePresence(db,guild,{entity_type:"character",entity_key:pc.id,location_key:"room",source_event:"scene",accepted_by:"owner",visibility:"party"},"gm");
  for(const npc of ["first","second","remote","defeated"]){
    db.upsertNpcProfile(guild,{npcKey:npc,displayName:npc});db.setSimulationEntity(guild,"npc",npc,{location_key:npc==="remote"?"elsewhere":"room"});
    if(npc!=="remote") recordScenePresence(db,guild,{entity_type:"npc",entity_key:npc,location_key:"room",source_event:"scene",visibility:"party"},"gm");
  }
  configureDelegation(db,guild,{mode:"routine_delegated",allow:["dialogue.interpret"],max_operations:4,max_cost:0,expires_minute:100},"gm");
  let serial=0;
  const interpret=(source,npc,interpretation,corrects)=>{
    const payload={op:"interpret",source_event:source.event_key,npc_key:npc,topic:"address",interpretation,confidence:60,...(corrects?{corrects}:{})};
    return dispatchAiIntents(db,guild,[{version:1,feature:"dialogue",target_key:"",expected_revision:"absent",policy_revision:1,source_prerequisites:[],payload}],
      {origin:`interpret-${++serial}`,sessionId:session.id})[0];
  };
  const original=captureDialogue(db,guild,"owner",pc.id,"speech",'I say: "Please call me Doctor, not boss."');
  assert.equal(interpret(original,"first","I believe Doctor is a formal boundary.").status,"accepted");
  assert.equal(interpret(original,"second","I thought this was a joke about titles.").status,"accepted");
  assert.equal(interpret(original,"remote","I heard this remotely.").status,"blocked");
  const old=db.listNpcMemories(guild,"first").find(row=>row.tags.includes("dialogue_interpretation"));
  const correction=captureDialogue(db,guild,"owner",pc.id,"repair",'I say to first: "I meant my professional title, not a joke."');
  assert.equal(interpret(correction,"first","I now understand the professional address.",old.id).status,"accepted");
  assert.equal(interpret(original,"second","I replace another listener's memory.",old.id).status,"blocked");
  assert.equal(db.getNpcMemory(old.id).content,old.content);
  let packet=retrieveNpcCognition(db,guild,{npcKey:"first",query:"Doctor",recordRecall:false})[0];
  assert(packet.memories.find(row=>row.id===old.id).corrections.some(row=>row.source_ref===correction.event_key));
  assert.equal(db.listNpcMemories(guild,"remote").length,0);
  db.upsertRulesRuling(guild,{key:"plain",ruling:"Synthetic mundane blade attack; no exceptional features.",createdBy:"gm"});
  const encounter=db.createEncounter(guild,session.id,{status:"active",tier:1,pc_count:2,base_bp:6,budget_bp:6});
  const combatants=db.initializeCombatants(encounter.id,["first","second","remote","defeated"].map(npc=>({base_name:npc,display_name:npc,
    role:"Standard",tier:1,difficulty:10,major_threshold:5,severe_threshold:10,hp_max:10})));
  db.updateCombatant(combatants.find(row=>row.base_name==="defeated").id,{status:"defeated",hp_current:0});
  db.saveCityRecord(guild,{kind:"encounter_binding",key:encounter.id,source_event:"scene",data:{combatants:combatants.map(row=>({actor:row.base_name,id:row.id}))}});
  const attack=adjudicateRollSource(db,guild,{key:"blade",character_id:pc.id,kind:"attack",ruling_key:"plain",
    data:{trait:"Finesse",active:true,weapon:"Plain blade",damage:"1d6",damage_type:"physical",target_id:combatants.find(row=>row.base_name==="first").id}},"gm");
  const declaration=captureDeclaration(db,guild,"owner",pc.id,"attack","I try striking the target.");
  const pending=prepareRollRequest(db,guild,{source_event:declaration.event_key,character_id:pc.id,trait:"Finesse",kind:"attack",
    attack_source:attack.event_key,modifier_keys:[],difficulty_source:"",adjudication:"Reviewed uncertain attack"},"gm");
  assert(!db.listNpcMemories(guild,"first").some(row=>row.tags.includes("observed_native_attack")),"Declared attempt is not an observed actual roll");
  const input={key:"roll",request:pending.record_key,expected_revision:rollRevision(pending),op:"roll"};
  const values=[12,2];contributeRoll(db,guild,"owner",input,{rng:()=>values.shift()});
  const memories=db.listNpcMemories(guild,"first"),observed=memories.find(row=>row.tags.includes("observed_native_attack"));assert(observed);
  assert(db.listNpcMemories(guild,"second").some(row=>row.tags.includes("observed_native_attack")));
  for(const npc of ["remote","defeated"]) assert(!db.listNpcMemories(guild,npc).some(row=>row.tags.includes("observed_native_attack")));
  assert(!/Finesse|Experience|Difficulty|Hope|Fear/.test(observed.content));
  contributeRoll(db,guild,"owner",input,{rng:()=>assert.fail("Replay rolled")});assert.equal(db.listNpcMemories(guild,"first").length,memories.length);
  indexWorldEvent(db,guild,{key:observed.source_ref,status:"retracted"});
  packet=retrieveNpcCognition(db,guild,{npcKey:"first",query:"blade",recordRecall:false})[0];
  assert.equal(packet.memories.find(row=>row.id===observed.id).source_status,"retracted");assert(packet.continuity_authority.includes("not authority"));
  const snapshot=db.snapshotCampaign(guild,{label:"IHY3",createdBy:"gm"});db.close();db=new VeiledDB(file,schema);db.restoreSnapshot(guild,snapshot.id,{actorId:"gm"});
  assert.equal(db.getNpcMemory(old.id).content,old.content);assert.equal(db.npcMemoryCorrections(guild,"first",old.id).length,1);
  assert.equal(db.listNpcMemories(guild,"first").length,memories.length);
  console.log("IHY3 PASS: native listener correction pointers/divergent beliefs; committed attack witnesses/no hidden stats/no new mechanics; replay/retraction/restore; zero paid calls.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
