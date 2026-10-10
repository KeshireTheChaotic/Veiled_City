/** D03: private restart-safe Discord components with owner/revision/exactly-once binding. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { captureDeclaration } from "../src/player-language.js";
import { prepareRollRequest } from "../src/roll-requests.js";
import { adjudicateRollSource } from "../src/roll-collaboration.js";
import { openRollMenu, handleRollMenuInteraction } from "../src/roll-menu.js";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-d03-")),file=path.join(dir,"fixture.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
const guild="d03-fixture";
const interaction=(user,customId,{values=[]}={})=>({guildId:guild,user:{id:user},customId,values,
  isButton:()=>customId.includes(":b:"),isStringSelectMenu:()=>customId.includes(":s:"),
  updated:null,update(payload){this.updated=payload;this.replied=true;return Promise.resolve(payload);}});
try{
  db.ensureCampaign(guild);configureCityFlags(db,guild,{roll_requests:true,roll_collaboration:true},"gm");
  const session=db.startSession(guild,"D03 menus");db.upsertPlayer(guild,"owner","Owner");db.upsertPlayer(guild,"other","Other");
  const pc=db.createCharacter(guild,"owner","Jaxon",{traits:{Knowledge:2},resources:{hope:3},
    experiences:[{name:"Streetwise",modifier:2,applies_to:{operations:["inspect"],roll_kinds:["action"]}}]});
  const other=db.createCharacter(guild,"other","Other",{traits:{Knowledge:1},resources:{hope:3}});
  for(const [user,char] of [["owner",pc],["other",other]]){db.assignCharacter(session.id,user,char.id);db.setPresence(session.id,user,"present");}
  db.upsertRulesRuling(guild,{key:"inspect",question:"Streetwise inspection",ruling:"Streetwise applies to this inspection.",createdBy:"gm"});
  const source=captureDeclaration(db,guild,"owner",pc.id,"d03-source","I try inspecting the terminal.");
  const request=prepareRollRequest(db,guild,{source_event:source.event_key,character_id:pc.id,trait:"Knowledge",kind:"action",
    modifier_keys:[],difficulty_source:"",adjudication:"Inspect the terminal.",operation:"inspect"},"gm");
  adjudicateRollSource(db,guild,{key:"d03-xp",character_id:pc.id,kind:"participation",ruling_key:"inspect",
    data:{request:request.record_key,character_id:pc.id,kind:"experience",description:"Street knowledge applies.",experience:"Streetwise"}},"gm");

  const opened=openRollMenu(db,guild,"owner",request.record_key);
  assert.equal(opened.ephemeral,true);assert(opened.components.length>=2);assert.match(opened.content,/Streetwise.*1 Hope/s);
  assert(!opened.content.includes(other.name));
  const selectId=opened.components.map(row=>row.toJSON()).flatMap(row=>row.components).find(c=>c.type===3).custom_id;
  const optionValue=opened.components.map(row=>row.toJSON()).flatMap(row=>row.components).find(c=>c.type===3).options[0].value;
  const foreign=interaction("other",selectId,{values:[optionValue]});
  await assert.rejects(()=>handleRollMenuInteraction(db,foreign),/owner|belong/i);
  const selected=interaction("owner",selectId,{values:[optionValue]});await handleRollMenuInteraction(db,selected);
  assert.equal(db.getCharacter(pc.id).data.resources.hope,3,"selection preview does not spend");
  const confirmId=selected.updated.components.map(row=>row.toJSON()).flatMap(row=>row.components).find(c=>c.label==="Confirm").custom_id;
  const confirm=interaction("owner",confirmId);await handleRollMenuInteraction(db,confirm,{rng:()=>6});
  assert.equal(db.getCharacter(pc.id).data.resources.hope,2,"owner confirmation charges once");
  await assert.rejects(()=>handleRollMenuInteraction(db,interaction("owner",confirmId),{rng:()=>assert.fail("no replay")}),/closed|used|current/i);
  assert.equal(db.getCharacter(pc.id).data.resources.hope,2,"double click cannot charge twice");

  const secondSource=captureDeclaration(db,guild,"owner",pc.id,"d03-stale-source","I try inspecting the lock.");
  const second=prepareRollRequest(db,guild,{source_event:secondSource.event_key,character_id:pc.id,trait:"Knowledge",kind:"action",
    modifier_keys:[],difficulty_source:"",adjudication:"Inspect the lock.",operation:"inspect"},"gm");
  adjudicateRollSource(db,guild,{key:"d03-stale-xp",character_id:pc.id,kind:"participation",ruling_key:"inspect",
    data:{request:second.record_key,character_id:pc.id,kind:"experience",description:"Street knowledge applies.",experience:"Streetwise"}},"gm");
  const stale=openRollMenu(db,guild,"owner",second.record_key),staleJson=stale.components.map(row=>row.toJSON()).flatMap(row=>row.components);
  const staleSelect=interaction("owner",staleJson.find(c=>c.type===3).custom_id,{values:[staleJson.find(c=>c.type===3).options[0].value]});
  await handleRollMenuInteraction(db,staleSelect);
  db.saveCityRecord(guild,{...second,key:second.record_key,data:{...second.data,revision:second.data.revision+1,adjudication:"Changed stakes"}});
  const staleConfirm=staleSelect.updated.components.map(row=>row.toJSON()).flatMap(row=>row.components).find(c=>c.label==="Confirm").custom_id;
  await assert.rejects(()=>handleRollMenuInteraction(db,interaction("owner",staleConfirm)),/changed|stale/i);
  assert.equal(db.getCharacter(pc.id).data.resources.hope,2);

  db.close();db=new VeiledDB(file,schema);
  const restored=openRollMenu(db,guild,"owner",second.record_key);
  assert(restored.components.length,"a restart reconstructs a fresh private menu");
  console.log("D03 roll menu PASS: private owner binding, preview, CAS, exactly-once confirmation and restart.");
}finally{
  db.close();fs.rmSync(dir,{recursive:true,force:true});
}
