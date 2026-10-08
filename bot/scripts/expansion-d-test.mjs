/** Real command/service tests for owner-established arcs and nonmutating scoped discovery. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { personalArc, proposeArcBeat, discoverPersonal } from "../src/personal-continuity.js";
import { ContextPlanner } from "../src/context-planner.js";
import { handleCommand } from "../src/commands.js";
import { stateRevision } from "../src/ai-intents.js";
const root=fs.mkdtempSync(path.join(os.tmpdir(),"vc-expansion-d-")),file=path.join(root,"fixture.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const guild="d";db.ensureCampaign(guild);db.ensureCampaign("other");const session=db.startSession(guild,"Personal continuity");
  for(const user of ["one","two"]) db.upsertPlayer(guild,user,user);
  const one=db.createCharacter(guild,"one","One",{}),two=db.createCharacter(guild,"two","Two",{}),alt=db.createCharacter(guild,"one","Alt",{});
  for(const [user,character] of [["one",one],["two",two]]){db.assignCharacter(session.id,user,character.id);db.setPresence(session.id,user,"present");}
  assert.throws(()=>personalArc(db,guild,"one",{key:"promise",type:"vow",statement:"Find my brother"}),/opt-in/);
  configureCityFlags(db,guild,{personal_arcs:true,discovery:true});
  personalArc(db,guild,"one",{key:"promise",type:"vow",statement:"Find my brother"});
  personalArc(db,guild,"one",{key:"promise",type:"vow",statement:"Find my brother without violence"});
  assert.equal(db.characterContinuity(guild,one.id)[0].data.history.length,1);
  assert.throws(()=>personalArc(db,guild,"two",{character_id:one.id,key:"forged",type:"desire",statement:"FORGED"}),/owned/);
  indexWorldEvent(db,guild,{key:"invitation",source_kind:"gm",source_id:"human",title:"Opportunity"});
  proposeArcBeat(db,guild,{character_id:one.id,arc_key:"promise",key:"callback",source_event:"invitation",invitation:"Would you like to follow the sibling lead?"},"gm");
  const characterBefore=db.getCharacter(one.id);
  personalArc(db,guild,"one",{key:"callback",op:"respond",decision:"decline",
    expected_revision:stateRevision(db.getCityRecord(guild,"arc_beat",`${one.id}:callback`))});
  assert.deepEqual(db.getCharacter(one.id),characterBefore,"decline has no mechanical penalty");
  db.addFact(guild,{key:"own",content:"Witness claims the masked visitor went north",category:"clue",visibility:"character",subjectCharacterId:one.id,source:"witness:statement",confidence:40});
  db.addFact(guild,{key:"other",content:"The visitor went south",category:"clue",visibility:"character",subjectCharacterId:two.id});
  db.addFact(guild,{key:"alias",content:"SECRET-ALIAS is the Mayor",visibility:"gm"});
  const known=discoverPersonal(db,guild,"one",{query:"visitor",mode:"witness"});assert.equal(known.facts.length,1);assert.equal(known.facts[0].confidence,40);
  assert(!JSON.stringify(known).includes("south"));assert(discoverPersonal(db,guild,"one",{query:"SECRET-ALIAS"}).unknown);
  assert(!JSON.stringify(discoverPersonal(db,guild,"two",{mode:"arcs"})).includes("brother"));
  const before=db.snapshotCampaign(guild,{label:"before-query"});
  const interaction={id:"read-only",guildId:guild,commandName:"vc-intel",user:{id:"one"},isChatInputCommand:()=>true,
    options:{getSubcommand:()=>"discover",getString:()=>JSON.stringify({mode:"arcs"})},reply:async()=>{}};
  await handleCommand(interaction,{db,gm:{}});assert(!db.getOperationReceipt(guild,"read-only"));
  const after=db.snapshotCampaign(guild,{label:"after-query"});
  const beforeData=db.getSnapshot(before.id).state,afterData=db.getSnapshot(after.id).state;
  assert.deepEqual(afterData,beforeData,"discovery command writes no campaign data");
  assert(JSON.stringify(new ContextPlanner(db).plan(guild,{actorType:"character",characterId:one.id,userId:"one",scope:"character"})).includes("without violence"));
  db.assignCharacter(session.id,"one",alt.id);
  assert(!JSON.stringify(discoverPersonal(db,guild,"one",{mode:"arcs"})).includes("brother"));
  assert.throws(()=>discoverPersonal(db,guild,"one",{character_id:one.id}),/owned/);
  db.assignCharacter(session.id,"one",one.id);db.setPresence(session.id,"one","absent");
  assert.throws(()=>proposeArcBeat(db,guild,{character_id:one.id,arc_key:"promise",key:"absent",source_event:"invitation",invitation:"Forced?"},"gm"),/attendance/);
  db.setPresence(session.id,"one","present");const snap=db.snapshotCampaign(guild,{label:"restore"});db.close();db=new VeiledDB(file,schema);db.restoreSnapshot(guild,snap.id);
  assert(JSON.stringify(discoverPersonal(db,guild,"one",{mode:"arcs"})).includes("without violence"));
  assert.equal(db.listCanon(guild,{includeGM:true}).length,0);console.log("Expansion D PASS: owner arcs, nonbinding callbacks, character switches, literal scoped discovery, zero-write commands and restore; fixture-only.");
}finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
