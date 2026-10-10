/** D02: owner-private, source-grounded roll-option arbitration without inferred costs. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { captureDeclaration } from "../src/player-language.js";
import { prepareRollRequest, rollRevision } from "../src/roll-requests.js";
import { adjudicateRollSource } from "../src/roll-collaboration.js";
import { arbitrateRollOptions } from "../src/roll-options.js";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-d02-"));
const db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
const guild="d02-fixture";
try{
  db.ensureCampaign(guild);
  configureCityFlags(db,guild,{roll_requests:true,roll_collaboration:true},"gm");
  const session=db.startSession(guild,"D02 options");
  db.upsertPlayer(guild,"owner","Owner");
  db.upsertPlayer(guild,"other","Other");
  const pc=db.createCharacter(guild,"owner","Choso",{traits:{Knowledge:2},resources:{hope:3},
    experiences:[
      {name:"Streetwise",modifier:2,applies_to:{operations:["inspect"],roll_kinds:["action"]},exclusive_group:"approach"},
      {name:"Court Etiquette",modifier:2,applies_to:{operations:["persuade"],roll_kinds:["action"]}},
      {name:"Unindexed Past",modifier:2}
    ],domain_cards:[
      {name:"Measured Focus",equipped:true,roll_option:{kind:"advantage",amount:1,
        applies_to:{operations:["inspect"],roll_kinds:["action"]},cost:{resource:"stress",amount:1},exclusive_group:"approach"}},
      {name:"Shelved Trick",equipped:false,roll_option:{kind:"flat",amount:3,
        applies_to:{operations:["inspect"],roll_kinds:["action"]}}}
    ],inventory:[{name:"Forensic Kit",equipped:true,roll_option:{kind:"flat",amount:1,
      applies_to:{operations:["inspect"],roll_kinds:["action"]}}}]});
  const other=db.createCharacter(guild,"other","Billy",{traits:{Knowledge:1},resources:{hope:3},
    experiences:[{name:"Ghost Step",modifier:20,applies_to:{operations:["inspect"],roll_kinds:["action"]}}]});
  for(const [user,char] of [["owner",pc],["other",other]]){
    db.assignCharacter(session.id,user,char.id); db.setPresence(session.id,user,"present");
  }
  db.updateCharacterData(pc.id,data=>{data.conditions=[{name:"Distracted",roll_option:{kind:"disadvantage",amount:1,
    applies_to:{operations:["inspect"],roll_kinds:["action"]},optional:false}}];});
  db.upsertRulesRuling(guild,{key:"inspect",question:"Inspecting secured technical evidence",
    ruling:"Knowledge action roll; relevant Experience requires owner choice and Hope.",createdBy:"gm"});
  const source=captureDeclaration(db,guild,"owner",pc.id,"d02-declaration","I try inspecting the locked case.");
  const modifier=adjudicateRollSource(db,guild,{key:"d02-modifier",character_id:pc.id,kind:"modifier",ruling_key:"inspect",
    data:{trait:"Knowledge",roll_kind:"action",kind:"flat",amount:1,name:"Established lighting",feature:null}},"gm");
  const disadvantage=adjudicateRollSource(db,guild,{key:"d02-disadvantage",character_id:pc.id,kind:"modifier",ruling_key:"inspect",
    data:{trait:"Knowledge",roll_kind:"action",kind:"disadvantage",amount:1,name:"Poor visibility",feature:null}},"gm");
  const request=prepareRollRequest(db,guild,{source_event:source.event_key,character_id:pc.id,trait:"Knowledge",kind:"action",
    modifier_keys:[modifier.event_key,disadvantage.event_key],difficulty_source:"",adjudication:"Inspect the secured case.",operation:"inspect"},"gm");
  adjudicateRollSource(db,guild,{key:"d02-experience-proof",character_id:pc.id,kind:"participation",ruling_key:"inspect",
    data:{request:request.record_key,character_id:pc.id,kind:"experience",description:"Street knowledge applies.",experience:"Streetwise"}},"gm");

  const hopeBefore=db.getCharacter(pc.id).data.resources.hope;
  const revisionBefore=rollRevision(request);
  const result=arbitrateRollOptions(db,guild,"owner",{request:request.record_key,
    proposed_keys:["experience:Streetwise","feature:Measured Focus","asset:Forensic Kit","experience:Ghost Step"]});
  const byKey=new Map(result.options.map(row=>[row.key,row]));
  assert.equal(byKey.get("trait:Knowledge").state,"applied");
  assert.equal(byKey.get(`modifier:${modifier.event_key}`).state,"applied");
  assert.deepEqual(byKey.get("experience:Streetwise").cost,{resource:"hope",amount:1});
  assert.equal(byKey.get("experience:Streetwise").state,"requires_owner_choice");
  assert.equal(byKey.get("experience:Streetwise").exclusive_group,"approach");
  assert.equal(byKey.get("feature:Measured Focus").state,"requires_additional_authorization");
  assert.equal(byKey.get("asset:Forensic Kit").state,"requires_additional_authorization");
  assert.equal(byKey.get("condition:Distracted").state,"requires_additional_authorization");
  assert.equal(byKey.get("party_aid:help").state,"blocked");
  assert.match(byKey.get("party_aid:help").reason,/saved GM ruling/i);
  assert(!byKey.has("experience:Court Etiquette"),"irrelevant options stay out of the menu");
  assert.equal(byKey.get("experience:Unindexed Past").state,"requires_additional_authorization",
    "missing applicability is surfaced for review, not guessed relevant");
  assert.equal(result.rejected[0].key,"experience:Ghost Step","another character's option is rejected without disclosure");
  assert(!JSON.stringify(result).includes("modifier\":20"),"foreign sheet values never leak");
  assert.equal(db.getCharacter(pc.id).data.resources.hope,hopeBefore,"discovery never spends resources");
  assert.equal(rollRevision(db.getCityRecord(guild,"roll_request",request.record_key)),revisionBefore,
    "candidate arbitration does not amend the actionable request");
  assert.equal(db.getCityRecord(guild,"roll_option_registry",request.record_key).visibility,"character");
  assert.equal(db.getCityRecord(guild,"roll_request",request.record_key).status,"pending",
    "rejected proposals leave the roll usable");
  assert.throws(()=>arbitrateRollOptions(db,guild,"other",{request:request.record_key,proposed_keys:[]}),/owned/i);
  console.log("D02 roll options PASS: grounded ownership/relevance/cost states, privacy and zero-spend rejection.");
}finally{
  db.close();
  fs.rmSync(dir,{recursive:true,force:true});
}
