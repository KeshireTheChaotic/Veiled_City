/** Offline content-seed regression: full coverage, privacy, retries, atomicity, legacy upgrades and export/restore. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { VeiledDB } from "../src/db.js";
import { ContentIndex } from "../src/content.js";
import { GMService } from "../src/gm.js";
import { seedData } from "../src/seed-data.js";
import { seedNpcCognition } from "../src/npc-cognition.js";
import { buildCommands, handleCommand } from "../src/commands.js";

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"vc400-seed-"));
const dbPath=path.join(tmp,"test.sqlite");
const db=new VeiledDB(dbPath,path.resolve("sql/schema.sql"));
const content=new ContentIndex(path.resolve("../content"));
try{
  const guild="seed-packaged";
  db.ensureCampaign(guild);
  const counts=seedData({db,content,guildId:guild,actorId:"gm"});
  const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
  const expected=[...walk(path.join(content.root,"PLAYER")),...walk(path.join(content.root,"GM_PRIVATE"))];
  assert.equal(counts.files,expected.length,"every packaged file must be stored, including JSON and DOCX");
  assert(counts.cognition.profiles>=20);
  assert(counts.entities>0&&counts.binary>0&&counts.catalog>0);
  assert(db.listSeedCatalog(guild,{includeGM:true}).some(row=>row.kind==="adversary"));
  assert(db.listSeedCatalog(guild,{includeGM:true}).some(row=>row.kind==="environment"));
  assert(db.listSeedCatalog(guild,{includeGM:true}).some(row=>row.kind==="mystery"));
  assert(db.listSeedCatalog(guild,{includeGM:true}).some(row=>row.kind==="state"));
  assert(db.listSeedDocuments(guild).every(row=>row.source_path.startsWith("PLAYER/")&&row.visibility==="party"));
  assert.equal(db.listReferences(guild,"npc").length,0,"undiscovered GM dossiers must not publish NPC references");
  assert.equal(db.listReferences(guild,"location").length,0);
  const faction=db.listSimulationEntities(guild,"faction")[0];
  assert(db.listSimulationRecords(guild,{kind:"goal",entityKey:`faction:${faction.entity_key}`}).length);
  assert.equal(db.listCanon(guild,{includeGM:true}).length,0,"seed content must not promote itself to canon");
  const docx=db.listSeedDocuments(guild).find(row=>row.source_path.endsWith(".docx"));
  assert.deepEqual(Buffer.from(docx.body,"base64"),fs.readFileSync(path.join(content.root,docx.source_path)));
  const again=seedData({db,content,guildId:guild,actorId:"gm"});
  assert.equal(again.files,0); assert.equal(again.skipped,counts.files);
  assert.equal(db.listSeedDocuments("unrelated",{includeGM:true}).length,0);

  // Real command execution, permission checks, schema replacement and deferred private response.
  const admin=buildCommands().find(command=>command.name==="vc-admin");
  assert(admin.options.some(option=>option.name==="seed-data"));
  assert(!admin.options.some(option=>option.name==="seed-npc-cognition"));
  const interaction=(id,guildId,gm)=>{
    const replies=[];
    return {id,commandName:"vc-admin",guildId,guild:{id:guildId},user:{id:"gm",username:"GM"},
      memberPermissions:{has:()=>gm},member:{roles:{cache:{has:()=>false}}},deferred:false,replied:false,
      isChatInputCommand:()=>true,options:{getSubcommand:()=>"seed-data",getSubcommandGroup:()=>null,getString:()=>null},
      reply:async payload=>replies.push(payload),editReply:async payload=>replies.push(payload),
      deferReply:async function(payload){this.deferred=true;replies.push(payload);},_replies:replies};
  };
  db.ensureCampaign("denied");
  const denied=interaction("seed-denied","denied",false);
  await handleCommand(denied,{db,gm:{content}});
  assert(denied._replies.some(reply=>reply.content?.includes("GM/admin permission required")));
  assert.equal(db.listSeedDocuments("denied",{includeGM:true}).length,0);
  const allowed=interaction("seed-allowed",guild,true);
  await handleCommand(allowed,{db,gm:{content}});
  assert(allowed._replies[0].ephemeral);
  assert(allowed._replies.some(reply=>typeof reply==="string"&&reply.includes("Content seed complete")));
  const snapshotCount=db.listSnapshots(guild,100).length;
  await handleCommand(interaction("seed-allowed",guild,true),{db,gm:{content}});
  assert.equal(db.listSnapshots(guild,100).length,snapshotCount,"interaction replay must not repeat seeding");

  // Fixtures cover alternate GM roots, private character linkage and metadata that tightens PLAYER privacy.
  const root=path.join(tmp,"content");
  const put=(relative,data)=>{
    const full=path.join(root,relative);fs.mkdirSync(path.dirname(full),{recursive:true});
    fs.writeFileSync(full,typeof data==="string"?data:JSON.stringify(data));
  };
  put("GM/notes.md","# Classified\nThe unique amberpassword identifies the hidden mastermind. Never reveal this secret.");
  put("PLAYER/guide.md","# Guide\nThe unique amberpassword is discussed only as a harmless example in shared lore.");
  put("PLAYER/private.md","---\nvisibility: gm_private\n---\n# Private\nThe unique goldpassword must not be disclosed.\n## More\nThe goldpassword remains secret here too.");
  put("PLAYER/private.json",{visibility:"gm_private",secret:"goldpassword",public:"Do not downgrade this file"});
  put("PLAYER/PLAYERS/Alice.md","# Alice\nAlice's copperpassword background is character-specific and not party knowledge.");
  put("PLAYER/PLAYERS/Missing.md","# Missing\nThis orphan's silverpassword must remain GM-private until ownership is mapped.");
  put("GM_PRIVATE/PLAYERS/GM_PRIVATE_Alice.md","# Alice\nAlice's secret platinumpassword must never appear in her player export.");
  put("GM/NPCS/npcs.json",[{name:"New NPC",want:"Find the lost key",knows:["Knows a witness"],does_not:["The culprit"],secret:"Self secret"}]);
  const fixtures=new ContentIndex(root), fixtureGuild="fixtures";
  db.ensureCampaign(fixtureGuild);
  const alice=db.createCharacter(fixtureGuild,null,"Alice",{});
  const fixtureCounts=seedData({db,content:fixtures,guildId:fixtureGuild,actorId:"gm"});
  assert.equal(fixtureCounts.unmatched,1);
  assert.equal(fixtureCounts.character,1);
  assert.equal(db.listSeedDocuments(fixtureGuild).length,1);
  assert.equal(db.listSeedDocuments(fixtureGuild,{characterId:alice.id}).length,2);
  assert.equal(db.listSeedDocuments(fixtureGuild,{characterId:"another"}).length,1);
  assert.throws(()=>db.insertSeedCatalog(fixtureGuild,{sourcePath:"GM/notes.md",key:"unsafe",kind:"json",data:{},visibility:"party"}),/privacy/);
  assert(db.getCharacterNarrative(fixtureGuild,alice.id,"player").markdown.includes("copperpassword"));
  assert(db.getCharacterNarrative(fixtureGuild,alice.id,"gm_private").markdown.includes("platinumpassword"));
  const service=new GMService({db,content:fixtures,config:{},ai:{}});
  const playerChunks=service.searchContent(fixtureGuild,"amberpassword goldpassword copperpassword silverpassword platinumpassword",50,{gm:false});
  assert(playerChunks.some(chunk=>chunk.file==="PLAYER/guide.md"));
  assert(!playerChunks.some(chunk=>/goldpassword|copperpassword|silverpassword|platinumpassword|hidden mastermind/.test(chunk.body)));
  assert(service.searchContent(fixtureGuild,"goldpassword",20,{gm:true}).length);
  assert(!fixtures.search("goldpassword",20,{gm:false}).length,"privacy must apply to the whole Markdown file before seeding too");

  // Existing runtime modifications, changed source files, and old one-time seed markers are preserved.
  db.upsertNpcProfile(fixtureGuild,{npcKey:"new-npc",displayName:"New NPC",role:"Live role",activityTier:"active"});
  const oldBody=db.getSeedDocument(fixtureGuild,"PLAYER/guide.md").body;
  put("PLAYER/guide.md","# Replacement\nChanged text must not silently replace the original seed or campaign history.");
  put("GM/NPCS/new.json",{name:"An unrelated custom record",secret:"Still GM-private"});
  const second=seedData({db,content:fixtures,guildId:fixtureGuild,actorId:"gm"});
  assert.equal(second.changed,1); assert.equal(second.files,1);
  assert.equal(db.getNpcProfile(fixtureGuild,"new-npc").role,"Live role");
  assert.equal(db.getSeedDocument(fixtureGuild,"PLAYER/guide.md").body,oldBody);
  const upgraded="legacy";db.ensureCampaign(upgraded);
  seedNpcCognition({db,content,guildId:upgraded});
  const original=db.getNpcProfile(upgraded,"mara-voss");
  db.upsertNpcProfile(upgraded,{...original,npcKey:original.npc_key,displayName:original.display_name,role:"Evolved role",activityTier:"active"});
  seedData({db,content,guildId:upgraded});
  assert.equal(db.getNpcProfile(upgraded,"mara-voss").role,"Evolved role");

  // Invalid JSON or a mid-transaction failure leaves no partial seed, marker, or snapshot.
  const failed="failed";db.ensureCampaign(failed);
  const originalInsert=db.insertSeedCatalog.bind(db);
  db.insertSeedCatalog=()=>{throw new Error("Injected catalog failure");};
  assert.throws(()=>seedData({db,content:fixtures,guildId:failed}),/Injected/);
  db.insertSeedCatalog=originalInsert;
  assert.equal(db.listSeedDocuments(failed,{includeGM:true}).length,0);
  assert.equal(db.listSnapshots(failed).length,0);
  assert.equal(db.getSeedRun(failed,"seed_data_v1"),null);
  put("PLAYER/broken.json","{invalid}");
  assert.throws(()=>seedData({db,content:fixtures,guildId:failed}),/Invalid JSON/);
  assert.equal(db.listSnapshots(failed).length,0);
  fs.unlinkSync(path.join(root,"PLAYER/broken.json"));

  const snapshot=db.snapshotCampaign(fixtureGuild,{label:"After seed"});
  assert(snapshot.state.tables.seed_documents.length>0&&snapshot.state.tables.seed_catalog.length>0);
  db.restoreSnapshot(fixtureGuild,snapshot.id);
  assert.equal(db.getSeedDocument(fixtureGuild,"PLAYER/guide.md").body,oldBody);

  // Run the actual export script against the seeded database and inspect both privacy modes.
  const exportScript=path.resolve("scripts/export-campaign.mjs");
  const exportFor=mode=>{
    const run=spawnSync(process.execPath,[exportScript,fixtureGuild,mode],{cwd:tmp,encoding:"utf8",
      env:{...process.env,DATABASE_PATH:dbPath}});
    assert.equal(run.status,0,run.stderr);
    return JSON.parse(fs.readFileSync(run.stdout.trim(),"utf8"));
  };
  fs.mkdirSync(path.join(tmp,"data"));
  const safe=exportFor("player"), full=exportFor("full");
  assert(safe.seed_documents.every(row=>row.visibility==="party"));
  assert(safe.seed_catalog.every(row=>row.visibility==="party"));
  assert(!JSON.stringify(safe).includes("platinumpassword"));
  assert(JSON.stringify(full).includes("platinumpassword"));
  console.log("Veilkeeper v4.0.0 privacy-aware content seed regression: PASS");
}finally{
  db.close();
  fs.rmSync(tmp,{recursive:true,force:true});
}
