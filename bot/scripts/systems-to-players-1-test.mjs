/** SP1 production proposals, GM command authentication, native encounters and bounded decision advice; no network. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { GMService } from "../src/gm.js";
import { ContentIndex } from "../src/content.js";
import { FakeResponses, fakeInteraction } from "./contract-fixtures.mjs";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { recordScenePresence } from "../src/scene-continuity.js";
import { EncounterLibrary, manageWorldEncounter, validateWorldEncounterActivation, recordWorldEncounterOutcome } from "../src/encounter.js";
import { configureDelegation, stateRevision } from "../src/ai-intents.js";
import { commitGmTurn } from "../src/turn-orchestration.js";
import { handleCommand } from "../src/commands.js";
import { POST_TURN_REVIEW_CATEGORIES } from "../src/director.js";
import { validateDecisionAdvisory } from "../src/decision-advisory.js";
import { buildCombatants } from "../src/combat.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-sp1-")),file=path.join(temp,"test.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const guild="contract";db.ensureCampaign(guild);db.ensureCampaign("other");
  const session=db.startSession(guild,"Station"),content=new ContentIndex(path.resolve("../content")),lib=new EncounterLibrary(content.root);
  db.setSimulationEntity(guild,"location","station",{});
  db.upsertNpcProfile(guild,{npcKey:"watcher",displayName:"Watcher"});db.setSimulationEntity(guild,"npc","watcher",{location_key:"station"});
  indexWorldEvent(db,guild,{key:"source",kind:"arrival",title:"Watcher saw the scene",source_id:"gm",location_key:"station",visibility:"party"});
  db.upsertNpcKnowledge(guild,{npcKey:"watcher",knowledgeKey:"lead",content:"Scene",sourceRef:"source"});
  const template=lib.adversaries.find(row=>row.tier===1&&!['Minion','Horde'].includes(row.type)),env=lib.environments.find(row=>row.tier===1);
  const bind={op:"bind",actor:"watcher",template:template.name,information_key:"lead",source_event:"source"};
  assert.throws(()=>manageWorldEncounter(db,guild,bind,"gm",lib),/opt-in/);
  configureCityFlags(db,guild,{encounter_intelligence:true,scene_continuity:true,decision_advisory:true});
  const command=fakeInteraction({sub:"world",json:bind});command.commandName="vc-encounter";
  Object.assign(command,{isChatInputCommand:()=>true,guild:{id:guild,channels:{fetch:async()=>null}}});command.user.username="GM";
  command.options.getSubcommandGroup=()=>null;
  const denied={...command,memberPermissions:{has:()=>false}};
  await handleCommand(denied,{db,gm:{content}});assert(!db.getCityRecord(guild,"encounter_actor","watcher"));
  await handleCommand(command,{db,gm:{content}});assert(db.getCityRecord(guild,"encounter_actor","watcher"));
  recordScenePresence(db,guild,{entity_type:"npc",entity_key:"watcher",location_key:"station",source_event:"source",visibility:"party"},"gm");
  const pcs=[];
  for(const user of ["owner","second","absent"]){
    db.upsertPlayer(guild,user,user);const pc=db.createCharacter(guild,user,user,{});pcs.push(pc);
    db.assignCharacter(session.id,user,pc.id);db.setPresence(session.id,user,user==="absent"?"absent":"present");
    if(user!=="absent") recordScenePresence(db,guild,{entity_type:"character",entity_key:pc.id,location_key:"station",source_event:"source",accepted_by:user,visibility:"party"},"gm");
  }
  configureDelegation(db,guild,{mode:"routine_delegated",allow:["encounter.propose"],max_operations:1,max_cost:0,expires_minute:100},"gm");
  const payload={op:"propose",source_event:"source",actors:["watcher"],location_key:"station",objective:"negotiation",environment:env.name};
  const intent={version:1,feature:"encounter",target_key:"negotiation",expected_revision:"absent",policy_revision:1,source_prerequisites:[],payload};
  const review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(key=>[key,{decision:"no_change",reason:"No legacy mutation",confidence:100}]));
  review.scene={decision:"continue",label:"",reason:"Same scene"};
  const advisory={mode:"clarify",check:"",reason:"Ask what the player wants to do",uncertainty:"",consequence:""};
  const output={respond:true,narration:"Rain taps the window.",narrative_claims:[],private_messages:[],events:[],handouts:[],relationships:[],npc_memories:[],
    npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],state_review:review,ai_intents:[intent],decision_advisory:advisory};
  const fake=new FakeResponses([output]),gm=new GMService({db,content,ai:fake,config:{gmModel:"offline",maxRecentMessages:8,maxContentChunks:2}});
  const result=await gm.runTurn({guildId:guild,actorUserId:"owner",actorName:"Owner",messageText:"I consider talking to the watcher."});
  const args={db,guild:{id:guild},session,result,scope:{mode:"party",actorUserId:"owner",actorCharacterId:pcs[0].id},speaker:"Owner",label:"SP1",meta:{messageId:"proposal"}};
  const receipt=commitGmTurn(args).intents[0];assert.equal(receipt.status,"accepted",receipt.data.diagnostic);
  assert.equal(fake.requests.length,1);assert(fake.requests[0].input.includes("DECISION ADVISORY"));
  assert.equal(db.getCurrentEncounter(session.id),null,"proposal must not activate combat");
  assert.equal(commitGmTurn(args).intents[0].record_key,receipt.record_key);
  let planned=manageWorldEncounter(db,guild,{op:"accept",key:"negotiation"},"gm",lib);
  const encounter=db.getEncounter(planned.data.encounter_id);assert.equal(encounter.pc_count,2);assert.equal(encounter.status,"planned");
  validateWorldEncounterActivation(db,guild,encounter);
  db.setPresence(session.id,"second","absent");assert.throws(()=>validateWorldEncounterActivation(db,guild,encounter),/changed/);
  db.setPresence(session.id,"second","present");
  db.initializeCombatants(encounter.id,buildCombatants(encounter,lib));db.setEncounterStatus(encounter.id,"ended");
  const outcome=recordWorldEncounterOutcome(db,guild,encounter);assert.equal(outcome.data.results.length,1);
  assert.equal(recordWorldEncounterOutcome(db,guild,encounter).record_key,outcome.record_key);
  assert.equal(db.getCityRecord("other","encounter_outcome",outcome.record_key),null);
  assert.throws(()=>manageWorldEncounter(db,guild,{op:"propose",...payload,key:"ghost",actors:["unknown"]},"gm",lib),/binding/);
  const bad={...advisory,mode:"roll",check:"action"};assert.throws(()=>validateDecisionAdvisory(db,guild,{decision_advisory:bad}),/uncertainty/);
  for(const mode of ["narrate","clarify","provisional","silence"]){
    validateDecisionAdvisory(db,guild,{decision_advisory:{...advisory,mode},respond:false,narration:""});
  }
  for(const check of ["action","reaction"]) validateDecisionAdvisory(db,guild,{decision_advisory:{...advisory,mode:"roll",check,uncertainty:"Can the declared attempt succeed?",consequence:"A sourced threat may intervene"}});
  assert.throws(()=>validateDecisionAdvisory(db,guild,{decision_advisory:{...advisory,mode:"silence"},events:[{type:"log_only"}]}),/Silent/);
  const snapshot=db.snapshotCampaign(guild,{label:"SP1",createdBy:"gm"});assert(snapshot);
  const before=stateRevision(db.getCityRecord(guild,"encounter_proposal","negotiation"));
  db.close();db=new VeiledDB(file,schema);assert.equal(stateRevision(db.getCityRecord(guild,"encounter_proposal","negotiation")),before);
  assert.equal(recordWorldEncounterOutcome(db,guild,encounter).record_key,outcome.record_key);
  console.log("SP1 PASS: P01 grounded proposal/native review/absence/replay/restart/privacy; P02 advisory production request, classifications and no hidden silent effects; zero paid calls.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
