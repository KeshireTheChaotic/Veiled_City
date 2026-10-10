/** T05b: scoped identity, epistemic memory revisions, correction/retraction and expiry. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { rememberEntity, reviseMemory, retractMemory, retrieveMemoryRevisions } from "../src/memory-lifecycle.js";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-t05b-"));
const db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
const guild="t05b-fixture";
try{
  db.ensureCampaign(guild);
  const party=indexWorldEvent(db,guild,{key:"party-source",kind:"observation",title:"Party sees a back door",source_id:"player:a",
    visibility:"party",details:{}},"a");
  const privateSource=indexWorldEvent(db,guild,{key:"private-source",kind:"testimony",title:"A private rumor",source_id:"player:a",
    visibility:"character",subject_key:(db.upsertPlayer(guild,"a","A"),db.createCharacter(guild,"a","A",{}).id),details:{}},"a");
  const east=rememberEntity(db,guild,{kind:"object",name:"Back Door",parent_key:"location:east",aliases:[],source_event:party.event_key,
    visibility:"party",epistemic:"observation",summary:"A green back door.",expires_tick:10});
  const west=rememberEntity(db,guild,{kind:"object",name:"Back Door",parent_key:"location:west",aliases:[],source_event:party.event_key,
    visibility:"party",epistemic:"observation",summary:"A red back door.",expires_tick:10});
  assert.notEqual(east.identity.record_key,west.identity.record_key,"same name under different parents is not one object");
  const renamed=rememberEntity(db,guild,{identity_key:east.identity.record_key,kind:"object",name:"Service Door",parent_key:"location:east",
    aliases:["Back Door"],source_event:party.event_key,visibility:"party",epistemic:"observation",summary:"The green door is labelled Service."});
  assert.equal(renamed.identity.record_key,east.identity.record_key);assert(renamed.identity.data.aliases.includes("Back Door"));
  const rumor=rememberEntity(db,guild,{kind:"detail",name:"Hidden Registry",parent_key:"location:east",aliases:[],source_event:privateSource.event_key,
    visibility:"character",subject_key:privateSource.subject_key,epistemic:"testimony",summary:"Someone claims it is here."});
  assert.equal(retrieveMemoryRevisions(db,guild,{mode:"party",actorUserId:"a",actorCharacterId:privateSource.subject_key}).some(x=>x.identity===rumor.identity.record_key),false);
  assert.equal(retrieveMemoryRevisions(db,guild,{mode:"private",actorUserId:"a",actorCharacterId:privateSource.subject_key}).some(x=>x.identity===rumor.identity.record_key),true);
  assert.throws(()=>rememberEntity(db,guild,{kind:"object",name:"Ledger",parent_key:"location:east",aliases:[],source_event:party.event_key,
    visibility:"party",epistemic:"native_fact",summary:"A owns it."}),/receipt/i,"claimed custody is not a fact without a native receipt");
  const corrected=reviseMemory(db,guild,renamed.revision.record_key,{source_event:party.event_key,summary:"The service door is blue.",epistemic:"observation"});
  assert.equal(db.getCityRecord(guild,"memory_revision",east.revision.record_key).status,"superseded");
  assert.equal(retrieveMemoryRevisions(db,guild,{mode:"party"}).find(x=>x.identity===east.identity.record_key).summary,"The service door is blue.");
  retractMemory(db,guild,corrected.record_key,{source_event:party.event_key,reason:"Observation withdrawn"});
  assert.equal(retrieveMemoryRevisions(db,guild,{mode:"party"}).some(x=>x.identity===east.identity.record_key),false);
  assert.equal(retrieveMemoryRevisions(db,guild,{mode:"party"},{at_tick:20}).some(x=>x.identity===west.identity.record_key),false,"expired memory is omitted");
  const protectedRows=retrieveMemoryRevisions(db,guild,{mode:"party"},{at_tick:20,pending_identity_refs:[west.identity.record_key]});
  assert(protectedRows.some(x=>x.identity===west.identity.record_key),"causally pending references protect memory from expiry");
  console.log("T05b memory lifecycle PASS: scoped identity, aliases, epistemics, privacy, receipts, correction, retraction and expiry.");
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
