/** Offline bulk backfill and draft lifecycle: provenance, privacy, human review, retries, conflicts, and rollback. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { ContentIndex } from "../src/content.js";
import { seedData } from "../src/seed-data.js";
import { addSeedDraft, editSeedDraft, reviewSeedDraft } from "../src/seed-drafts.js";
import { portrayalPacket } from "../src/portrayal.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { buildCommands, handleCommand } from "../src/commands.js";

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-seed-drafts-"));
const db=new VeiledDB(path.join(tmp,"test.sqlite"),path.resolve("sql/schema.sql"));
const guild="drafts",root=path.join(tmp,"content");
function put(relative,data){
  const full=path.join(root,relative);fs.mkdirSync(path.dirname(full),{recursive:true});
  fs.writeFileSync(full,typeof data==="string"?data:JSON.stringify(data));
}
const drafts=(status="")=>db.listCityRecords(guild,{kind:"seed_draft",status,includeGM:true,limit:100});
try{
  db.ensureCampaign(guild);db.ensureCampaign("other");
  put("GM/NPCS/npcs.json",[
    {name:"Quiet Witness",public:"A calm, practical clerk.",want:"Keep records",secret:"secretpassword sarcastic formal",
      knows:["Own source knowledge","Old dossier claim"],does_not:["The culprit"]},
    {name:"Styled NPC",public:"A witness",speaking_style:{formality:"Conversational",humor:"None"}},
    {name:"No Style",public:"A witness",secret:"gentle blunt wry",knows:[],does_not:[]}
  ]);
  put("GM/FACTIONS/factions.json",[{name:"Council",goal:"Keep the lights on",clock:["0 Quiet","1 Alarm","2 Crisis"]}]);
  put("GM/LOCATIONS/locations.json",[{name:"Hall",public:"A hall"}]);
  put("GM/ADVERSARIES/adversaries.json",[{name:"Guard",tier:1,type:"Standard"}]);
  put("GM/ENVIRONMENTS/environments.json",[{name:"Rain",tier:1}]);
  put("GM/MYSTERIES/mystery_index.json",{case:{name:"Missing Clerk",core_truth:"Fixed culprit"}});
  put("GM/districts.json",[{key:"center",data:{name:"Center",indices:{safety:50},connections:[]}}]);
  put("GM/institutions.json",[{key:"office",data:{name:"Office",mandate:"Records",capacity:50,jurisdictions:["hall"],procedures:[]}}]);
  put("GM/routines.json",[{key:"clerk-day",data:{npc:"quiet-witness",residence:"hall",occupation:"Clerk",intervals:[]}}]);
  put("GM/mysteries.json",[{key:"review-case",data:{anchor_key:"gm-must-establish-anchor",question:"Where is the clerk?",routes:[]}}]);
  put("GM/mixed.json",[{kind:"reference",key:"case-notes",data:{note:"Unverified clue"}}]);
  put("GM/GM_STATE.json",{active_mystery:"case",threat_clocks:{case:5}});
  put("GM/notes.md","# Prose\nNever automatically turn this secretpassword into a fact.");
  put("PLAYER/speaking_styles.json",[{key:"quiet-witness",data:{humor:"Secret player instruction"}}]);
  put("PLAYER/guide.md","# Guide\nPublic setting reference.");
  db.upsertNpcProfile(guild,{npcKey:"quiet-witness",displayName:"Quiet Witness",role:"GM-edited role"});
  db.upsertNpcKnowledge(guild,{npcKey:"quiet-witness",knowledgeKey:"seed.known.2",content:"Live corrected knowledge"});
  const content=new ContentIndex(root);
  const first=seedData({db,content,guildId:guild,actorId:"gm"});
  assert.equal(first.bulk.sources,first.files);
  assert.equal(first.bulk.entries,first.catalog);
  assert.equal(first.bulk.byKind.portrayal,2);
  assert.equal(first.bulk.byKind.clock,1);
  assert.equal(first.bulk.byKind.district,1);
  assert.equal(first.bulk.byKind.institution,1);
  assert.equal(first.bulk.byKind.routine,1);
  assert.equal(first.bulk.byKind.mystery,1);
  assert.equal(first.bulk.byKind.reference,1);
  assert(first.bulk.fields>=4);
  assert.equal(db.getNpcProfile(guild,"quiet-witness").role,"GM-edited role");
  assert.equal(db.getNpcKnowledge(guild,"quiet-witness","seed.known.1").content,"Own source knowledge");
  assert.equal(db.getNpcKnowledge(guild,"quiet-witness","seed.known.2").content,"Live corrected knowledge");
  assert.equal(db.getNpcKnowledge(guild,"quiet-witness","seed.unknown.1").belief_state,"unknown");
  assert(db.getNpcGoal(guild,"quiet-witness","seed.primary"));
  const library=db.listCityRecords(guild,{kind:"seed_library",includeGM:true,limit:100});
  assert(library.some(row=>row.data.kind==="adversary"&&row.data.name==="Guard"));
  assert(library.some(row=>row.data.kind==="environment"&&row.data.name==="Rain"));
  assert(library.some(row=>row.data.kind==="mystery"&&row.data.name==="Missing Clerk"));
  assert.equal(db.listCityRecords(guild,{kind:"seed_content"}).length,0);
  assert.equal(db.listCityRecords(guild,{kind:"seed_draft"}).length,0);
  assert.equal(db.listCanon(guild,{includeGM:true}).length,0);
  assert.equal(db.getClock(guild,"case"),undefined,"GM_STATE must not restore live clocks");
  assert.equal(db.getCityRecord(guild,"institution","office"),null);
  assert.equal(portrayalPacket(db,guild,"quiet-witness",{publicVoice:true}),null);
  const quiet=drafts().find(row=>row.data.proposal.key==="quiet-witness");
  assert(quiet.data.provenance.inferred);
  assert(!JSON.stringify(quiet).includes("secretpassword"));
  assert(!drafts().some(row=>row.data.proposal.key==="no-style"));
  assert(!drafts().some(row=>JSON.stringify(row).includes("Secret player instruction")));
  const oldCount=drafts().length;
  const again=seedData({db,content,guildId:guild});
  assert.equal(again.bulk.sources,0);assert.equal(again.bulk.entries,0);assert.equal(again.bulk.drafts,0);
  assert.equal(drafts().length,oldCount);
  db.db.prepare("DELETE FROM npc_knowledge WHERE guild_id=? AND npc_key=? AND knowledge_key=?")
    .run(guild,"quiet-witness","seed.known.1");
  seedData({db,content,guildId:guild});
  assert.equal(db.getNpcKnowledge(guild,"quiet-witness","seed.known.1"),undefined,"field receipts preserve deliberate removals");

  // Simulate an older archived campaign with no v5 bulk projections. Existing archive backfills despite skipped files.
  db.ensureCampaign("legacy");
  for(const document of db.listSeedDocuments(guild,{includeGM:true})){
    db.insertSeedDocument("legacy",{sourcePath:document.source_path,sha256:document.sha256,encoding:document.encoding,
      body:document.body,visibility:document.visibility,actorId:"gm"});
  }
  for(const entry of db.listSeedCatalog(guild,{includeGM:true})) db.insertSeedCatalog("legacy",{
    sourcePath:entry.source_path,key:entry.entry_key,kind:entry.kind,data:entry.data,visibility:entry.visibility});
  const legacy=seedData({db,content,guildId:"legacy"});
  assert.equal(legacy.files,0);assert.equal(legacy.bulk.sources,first.files);
  assert(legacy.cognition.profiles>0&&legacy.entities>0&&legacy.bulk.drafts>0);

  // Edits are replacement proposals; no mutation of NPC memory, private facts, or public voice without review.
  assert.throws(()=>editSeedDraft(db,guild,quiet.record_key,{source_event:"fake"},"gm"),/Only proposal/);
  editSeedDraft(db,guild,quiet.record_key,{data:{emotional_tone:"Measured",verbal_habits:"Brief sentences"}},"gm");
  assert.equal(db.getCityRecord(guild,"seed_draft",quiet.record_key).data.revision,2);
  reviewSeedDraft(db,guild,quiet.record_key,"approve","gm");
  assert.equal(portrayalPacket(db,guild,"quiet-witness").direction.emotional_tone,"Measured");
  assert.equal(portrayalPacket(db,guild,"quiet-witness",{publicVoice:true}),null);
  const styled=drafts().find(row=>row.data.proposal.key==="styled-npc");
  reviewSeedDraft(db,guild,styled.record_key,"approve","gm",{publicVoice:true});
  assert.equal(portrayalPacket(db,guild,"styled-npc",{publicVoice:true}).direction.formality,"Conversational");
  assert.throws(()=>editSeedDraft(db,guild,styled.record_key,{data:{humor:"Changed"}},"gm"),/pending/);
  const clock=drafts().find(row=>row.data.proposal.kind==="clock");
  reviewSeedDraft(db,guild,clock.record_key,"reject","gm",{reason:"Not yet"});
  const reference=drafts().find(row=>row.data.proposal.kind==="reference");
  reviewSeedDraft(db,guild,reference.record_key,"remove","gm");
  seedData({db,content,guildId:guild});
  assert.equal(db.getCityRecord(guild,"seed_draft",clock.record_key).status,"rejected");
  assert.equal(db.getCityRecord(guild,"seed_draft",reference.record_key).status,"removed");
  assert.throws(()=>reviewSeedDraft(db,"other",quiet.record_key,"approve","gm"),/not found/);
  for(const kind of ["district","institution","routine"]){
    const draft=drafts().find(row=>row.data.proposal.kind===kind);
    reviewSeedDraft(db,guild,draft.record_key,"approve","gm");
    assert(db.getCityRecord(guild,kind,draft.data.proposal.key));
  }

  const source=indexWorldEvent(db,guild,{key:"gm-reviewed",source_kind:"gm",source_id:"gm",title:"GM review"}).event_key;
  const add=input=>addSeedDraft(db,guild,{source_event:source,...input},"gm");
  const conflict=add({kind:"portrayal",key:"quiet-witness",data:{emotional_tone:"Angry"}});
  const snapshots=db.listSnapshots(guild,100).length;
  assert.throws(()=>reviewSeedDraft(db,guild,conflict.record_key,"approve","gm"),/already exists/);
  assert.equal(db.listSnapshots(guild,100).length,snapshots,"failed approval snapshot rolls back");
  assert.equal(db.getCityRecord(guild,"seed_draft",conflict.record_key).status,"draft");
  const publishOtherFields=add({kind:"portrayal",key:"quiet-witness",data:{humor:"None"}});
  assert.throws(()=>reviewSeedDraft(db,guild,publishOtherFields.record_key,"approve","gm",{publicVoice:true}),/separate public review/);
  const bad=add({kind:"institution",key:"bad",data:{name:"Bad",mandate:"Bad",capacity:1000,jurisdictions:[],procedures:[]}});
  assert.throws(()=>reviewSeedDraft(db,guild,bad.record_key,"approve","gm"),/integer/);
  assert.equal(db.getCityRecord(guild,"institution","bad"),null);
  const c=add({kind:"clock",key:"manual",data:{label:"Manual",max:6,value:2}});
  reviewSeedDraft(db,guild,c.record_key,"approve","gm");
  assert(db.getClock(guild,"manual"));
  const badMystery=add({kind:"mystery",key:"no-anchor",data:{anchor_key:"missing"}});
  assert.throws(()=>reviewSeedDraft(db,guild,badMystery.record_key,"approve","gm"),/canon anchor/);
  assert.equal(db.listCanon(guild,{includeGM:true}).length,0);
  const acceptedHash=db.getSeedDocument(guild,"GM/NPCS/npcs.json").sha256;
  put("GM/NPCS/npcs.json",[{name:"Injected",public:"formal blunt calm"}]);
  const changed=seedData({db,content,guildId:guild});
  assert.equal(changed.changed,1);assert.equal(changed.bulk.drafts,0);
  assert.equal(db.getSeedDocument(guild,"GM/NPCS/npcs.json").sha256,acceptedHash);
  assert.equal(db.getNpcProfile(guild,"injected"),null);

  // Actual slash commands, pagination past 100, GM-only attachments, readonly inspection and delivery replay.
  for(let n=0;n<125;n++) add({kind:"reference",key:`manual-${n}`,data:{note:`Reference ${n}`}});
  assert.equal(db.listCityRecords(guild,{kind:"seed_draft",includeGM:true,limit:20,offset:100}).length,20);
  const schema=buildCommands().find(command=>command.name==="vc-admin");
  for(const name of ["seed-drafts","seed-add","seed-edit","seed-approve","seed-reject","seed-remove"])
    assert(schema.options.some(option=>option.name===name));
  function interaction(id,sub,strings={},isGm=true,integers={},booleans={}){
    const replies=[];
    return {id,commandName:"vc-admin",guildId:guild,guild:{id:guild},user:{id:"gm",username:"GM"},
      memberPermissions:{has:()=>isGm},member:{roles:{cache:{has:()=>false}}},isChatInputCommand:()=>true,
      options:{getSubcommand:()=>sub,getString:key=>strings[key]??null,getInteger:key=>integers[key]??null,getBoolean:key=>booleans[key]??null},
      reply:async payload=>replies.push(payload),_replies:replies};
  }
  const listing=interaction("list","seed-drafts",{},true,{page:6});
  const beforeRead=db.db.prepare("SELECT total_changes() AS n").get().n;
  await handleCommand(listing,{db,gm:{content}});
  assert.equal(db.db.prepare("SELECT total_changes() AS n").get().n,beforeRead);
  assert(listing._replies[0].ephemeral&&listing._replies[0].files.length);
  const denied=interaction("denied","seed-drafts",{},false);
  await handleCommand(denied,{db,gm:{content}});
  assert(denied._replies[0].content.includes("GM/admin permission required"));assert(!denied._replies[0].files);
  const manual=interaction("new-draft","seed-add",{json:JSON.stringify({kind:"reference",key:"command-test",data:{note:"Test"},source_event:source})});
  await handleCommand(manual,{db,gm:{content}});
  assert(manual._replies[0].content.includes("seed-add complete"));
  const total=db.listCityRecords(guild,{kind:"seed_draft",includeGM:true,limit:100,offset:100}).length;
  await handleCommand(interaction("new-draft","seed-add",{json:"{}"}),{db,gm:{content}});
  assert.equal(db.listCityRecords(guild,{kind:"seed_draft",includeGM:true,limit:100,offset:100}).length,total);
  const commandDraft=db.listCityRecords(guild,{kind:"seed_draft",includeGM:true,query:"command-test"})[0];
  const edit=interaction("command-edit","seed-edit",{draft_id:commandDraft.record_key,json:JSON.stringify({data:{note:"Edited"}})});
  await handleCommand(edit,{db,gm:{content}});assert(edit._replies[0].content.includes("seed-edit complete"));
  const approve=interaction("command-approve","seed-approve",{draft_id:commandDraft.record_key});
  await handleCommand(approve,{db,gm:{content}});assert(approve._replies[0].content.includes("seed-approve complete"));
  assert.equal(db.getCityRecord(guild,"seed_reference","command-test").data.content.note,"Edited");
  for(const action of ["reject","remove"]){
    const pending=add({kind:"reference",key:`command-${action}`,data:{note:"Pending"}});
    const review=interaction(`command-${action}`,`seed-${action}`,{draft_id:pending.record_key,reason:"GM review"});
    await handleCommand(review,{db,gm:{content}});assert(review._replies[0].content.includes(`seed-${action} complete`));
    assert.equal(db.getCityRecord(guild,"seed_draft",pending.record_key).status,action==="reject"?"rejected":"removed");
  }
  const snap=db.snapshotCampaign(guild,{label:"Drafts"});
  assert(snap.state.tables.city_records.some(row=>row.kind==="seed_draft"));
  db.restoreSnapshot(guild,snap.id);
  assert.equal(db.getCityRecord(guild,"seed_draft",quiet.record_key).status,"approved");
  console.log("Bulk seed and inferred draft regression: PASS (offline; zero model calls)");
}finally{db.close();fs.rmSync(tmp,{recursive:true,force:true});}
