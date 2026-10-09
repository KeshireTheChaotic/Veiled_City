/** Optional-depth regressions plus deployment-recovery fixtures: no automatic spending, minor drafts, source migration and failed publish. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { performance } from "node:perf_hooks";
import { VeiledDB } from "../src/db.js";
import { ContentIndex } from "../src/content.js";
import { GMService } from "../src/gm.js";
import { configureCityFlags } from "../src/city-core.js";
import { recordCityUpkeep, draftMinorNpc, reviewMinorNpc } from "../src/city-depth.js";
import { indexWorldEvent, scheduleCityEvent } from "../src/city-calendar.js";
import { configureSimulationEntity } from "../src/simulation.js";
import { publishSimulationHooks } from "../src/publishing.js";

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-city-depth-"));
const schema=path.resolve("sql/schema.sql"),db=new VeiledDB(path.join(temp,"test.sqlite"),schema);
const guild="depth",content=new ContentIndex(path.resolve("../content")),start=performance.now();
try{
  db.ensureCampaign(guild);db.ensureCampaign("other");db.upsertPlayer(guild,"owner","Owner");
  const pc=db.createCharacter(guild,"owner","Renter",{resources:{hope:3,hp:{current:6,max:6},stress:{current:0,max:6}}});
  const pcBefore=JSON.stringify(db.getCharacter(pc.id).data);
  db.upsertNpcProfile(guild,{npcKey:"landlord",displayName:"Landlord"});
  indexWorldEvent(db,guild,{key:"agreement",title:"Explicit agreement",source_kind:"gm",source_id:"GM observed consent"});
  db.addFact(guild,{key:"private-fact",content:"PRIVATE_CAMPAIGN_SECRET_NOT_FOR_GENERATION",visibility:"gm"});
  const bill={key:"rent-1",source_event:"agreement",debtor:`character:${pc.id}`,creditor:"npc:landlord",terms:"Agreed studio lease installment",
    cost_description:"The previously agreed amount, without a new currency system",due_minute:1440,agreed:true,accepted_by:"owner"};
  assert.throws(()=>recordCityUpkeep(db,guild,bill,"gm"),/opt-in/);
  configureCityFlags(db,guild,{economy:true,minor_npcs:true});
  assert.throws(()=>recordCityUpkeep(db,guild,{...bill,accepted_by:undefined},"gm"),/owner opt-in/);
  const upkeep=recordCityUpkeep(db,guild,bill,"gm");
  assert.equal(recordCityUpkeep(db,guild,bill,"gm").data.obligation_id,upkeep.data.obligation_id);
  db.advanceSimulationClock(guild,{minutes:1440});
  assert.equal(db.getCitySchedule(guild,"upkeep:rent-1").status,"fired");
  assert.equal(db.getCityRecord(guild,"upkeep","rent-1").status,"active","due does not auto-pay, default, or punish the PC");
  assert.equal(JSON.stringify(db.getCharacter(pc.id).data),pcBefore);
  assert.throws(()=>recordCityUpkeep(db,guild,{key:"rent-1",op:"settle",source_event:"agreement",resolution:"paid"},"gm"),/confirmation/);
  recordCityUpkeep(db,guild,{key:"rent-1",op:"settle",source_event:"agreement",resolution:"paid",accepted_by:"owner"},"gm");
  assert.equal(db.getSimulationRecord(guild,upkeep.data.obligation_id).status,"fulfilled");
  assert.equal(JSON.stringify(db.getCharacter(pc.id).data),pcBefore,"settlement is a record, not an auto-debit");
  assert(db.worldLinks(guild).some(link=>link.relation==="resolved_by"));
  assert.equal(db.listCityRecords("other",{kind:"upkeep",includeGM:true}).length,0);

  configureSimulationEntity(db,guild,"location","station",{});
  const request={key:"minor-station-clerk",source_event:"agreement",location:"station",role:"Transit clerk",established_interaction:true,public_context:"A clerk answered a routine travel question."};
  let calls=0,lastPrompt="",response={name:"Harper Moss",occupation:"Transit clerk",public_identity:"The evening ticket clerk",portrayal:"Patient and precise"};
  const gm=new GMService({db,content,config:{routerModel:"offline-fixture"},ai:{responses:{create:async input=>{
    calls++;lastPrompt=input.input;assert.equal(input.max_output_tokens,700);return {output_text:JSON.stringify(response)};
  }}}});
  const draft=await draftMinorNpc({db,gm,content,guildId:guild,input:request,actorId:"gm"});
  assert.equal(draft.status,"draft");assert.equal(db.getNpcProfile(guild,request.key),null);
  assert(!lastPrompt.includes("PRIVATE_CAMPAIGN_SECRET_NOT_FOR_GENERATION"));
  await draftMinorNpc({db,gm,content,guildId:guild,input:request,actorId:"gm"});assert.equal(calls,1,"stable draft retry does not regenerate");
  reviewMinorNpc({db,content,guildId:guild,input:{key:request.key,decision:"promote"},actorId:"gm"});
  assert.equal(db.getNpcProfile(guild,request.key).activity_tier,"background");
  assert.equal(db.listNpcKnowledge(guild,request.key).length,0);assert.equal(db.listNpcGoals(guild,request.key).length,0);
  assert.equal(db.getSimulationEntity(guild,"npc",request.key).state.location_key,"station");
  reviewMinorNpc({db,content,guildId:guild,input:{key:request.key,decision:"promote"},actorId:"gm"});
  response={...response,name:"Mara Voss"};
  await assert.rejects(()=>draftMinorNpc({db,gm,content,guildId:guild,input:{...request,key:"minor-canonical-copy"},actorId:"gm"}),/identity already exists/);
  assert.equal(db.getCityRecord(guild,"minor_draft","minor-canonical-copy"),null);
  response={...response,name:"New Extra",knowledge:["An unearned secret"]};
  await assert.rejects(()=>draftMinorNpc({db,gm,content,guildId:guild,input:{...request,key:"minor-invalid"},actorId:"gm"}),/unearned knowledge/);
  assert.equal(db.getCityRecord(guild,"minor_draft","minor-invalid"),null);
  const failedGm={planMinorNpc:async()=>{throw new Error("Injected model failure");}};
  await assert.rejects(()=>draftMinorNpc({db,gm:failedGm,content,guildId:guild,input:{...request,key:"minor-model-failed"},actorId:"gm"}),/model failure/);
  assert.equal(db.getCityRecord(guild,"minor_draft","minor-model-failed"),null);
  assert.equal(db.listCityRecords("other",{kind:"minor_draft",includeGM:true}).length,0);

  // A real failed publication leaves a committed due event and retryable outbox, with no duplicated mutation.
  db.configureCampaign(guild,{playChannelId:"play"});
  scheduleCityEvent(db,guild,{key:"known-notice",title:"Known due event",due_minute:1440,visibility:"party",hook:"The agreed appointment is due."});
  db.advanceSimulationClock(guild,{minutes:0});const event=db.getWorldEvent(guild,"schedule:known-notice");
  let fail=true,sends=0;
  const discordGuild={id:guild,channels:{fetch:async()=>({isTextBased:()=>true,send:async()=>{
    if(fail) throw new Error("Injected Discord delivery failure");sends++;return {id:"published"};
  }})}};
  await assert.rejects(()=>publishSimulationHooks({db,guild:discordGuild}),/delivery failure/);
  assert.equal(db.getSimulationRecord(guild,`city-hook:${guild}:known-notice`).status,"ready");
  fail=false;assert.equal(await publishSimulationHooks({db,guild:discordGuild}),1);
  assert.equal(await publishSimulationHooks({db,guild:discordGuild}),0);assert.equal(sends,1);
  assert.equal(db.getWorldEvent(guild,event.event_key).source_id,event.source_id);
  const backup=db.createBackup(guild);db.restoreBackup(guild,backup.id);
  assert.equal(db.getNpcProfile(guild,request.key).display_name,"Harper Moss");

  // Reopen a pre-city v4-shaped database after removing only the new additive tables.
  const legacyPath=path.join(temp,"legacy.sqlite"),legacy=new VeiledDB(legacyPath,schema);
  legacy.ensureCampaign("legacy");legacy.upsertNpcProfile("legacy",{npcKey:"legacy-witness",displayName:"Legacy witness"});
  legacy.addNpcMemory("legacy",{npcKey:"legacy-witness",content:"Preserved subjective memory",memoryType:"episodic"});
  legacy.addFact("legacy",{key:"legacy-secret",content:"Preserved private fact",visibility:"gm"});legacy.close();
  const old=new DatabaseSync(legacyPath);
  old.exec("DROP TABLE city_edges; DROP TABLE district_locations; DROP TABLE world_event_links; DROP TABLE city_records; DROP TABLE city_schedule; DROP TABLE world_events; DROP TABLE city_calendar; PRAGMA user_version=380;");old.close();
  const migrated=new VeiledDB(legacyPath,schema);
  try{
    assert.equal(migrated.doctorData("legacy").schemaVersion,460);
    assert.equal(migrated.listNpcMemories("legacy","legacy-witness").length,1);
    assert.equal(migrated.playerFactsFor("legacy","player").length,0);
    assert.equal(migrated.getCityCalendar("legacy").epoch,null,"migration invents no past dates");
    assert.equal(migrated.getNpcProfile("legacy","legacy-witness").display_name,"Legacy witness");
  }finally{migrated.close();}
  console.log(`Opt-in depth regressions PASS; ${(performance.now()-start).toFixed(1)}ms; minor generation <=700 output tokens; no automatic PC spending; live API calls 0.`);
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
