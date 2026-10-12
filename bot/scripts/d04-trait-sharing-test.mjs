/** D04: reviewed alternate traits, paid Experience and affirmative redacted party sharing. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { captureDeclaration } from "../src/player-language.js";
import { prepareRollRequest, rollRevision } from "../src/roll-requests.js";
import { adjudicateRollSource, contributeRoll } from "../src/roll-collaboration.js";
import { discoverRollOptions } from "../src/roll-options.js";
import { publishRollPartyDisclosure } from "../src/roll-sharing.js";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-d04-"));
const db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql")),guild="d04-fixture";
try{
  db.ensureCampaign(guild);configureCityFlags(db,guild,{roll_requests:true,roll_collaboration:true},"gm");
  const session=db.startSession(guild,"D04 choices");db.upsertPlayer(guild,"owner","Owner");db.upsertPlayer(guild,"other","Other");
  const pc=db.createCharacter(guild,"owner","Billy",{traits:{Knowledge:1,Instinct:3},resources:{hope:3},
    experiences:[{name:"Dockworker",modifier:2,applies_to:{operations:["inspect"],traits:["Instinct"],roll_kinds:["action"]}}],
    domain_cards:[{name:"Private Card",equipped:true,roll_option:{kind:"advantage",amount:1,applies_to:{operations:["inspect"]}}}]});
  const other=db.createCharacter(guild,"other","Other",{traits:{Knowledge:4},resources:{hope:3}});
  for(const [user,char] of [["owner",pc],["other",other]]){db.assignCharacter(session.id,user,char.id);db.setPresence(session.id,user,"present");}
  db.upsertRulesRuling(guild,{key:"inspect-instinct",question:"Inspect this terminal by instinct",
    ruling:"For this request Billy may choose Instinct instead of Knowledge.",createdBy:"gm"});
  const source=captureDeclaration(db,guild,"owner",pc.id,"d04-source","I try inspecting the shipping terminal.");
  const request=prepareRollRequest(db,guild,{source_event:source.event_key,character_id:pc.id,trait:"Knowledge",kind:"action",
    modifier_keys:[],difficulty_source:"",adjudication:"Inspect the terminal.",operation:"inspect"},"gm");
  const alternate=adjudicateRollSource(db,guild,{key:"d04-alternate",character_id:pc.id,kind:"alternate_trait",ruling_key:"inspect-instinct",
    data:{request:request.record_key,from_trait:"Knowledge",to_trait:"Instinct",reason:"Read the machinery by feel."}},"gm");
  let options=discoverRollOptions(db,guild,"owner",request.record_key).options;
  assert.equal(options.find(row=>row.key==="alternate_trait:Instinct").state,"requires_owner_choice");
  assert.throws(()=>contributeRoll(db,guild,"owner",{op:"alternate-trait",request:request.record_key,
    expected_revision:rollRevision(request),key:"forged-alt",trait:"Instinct",proof:"missing"}),/source|adjudicat/i);
  let row=contributeRoll(db,guild,"owner",{op:"alternate-trait",request:request.record_key,
    expected_revision:rollRevision(request),key:"choose-alt",trait:"Instinct",proof:alternate.event_key});
  assert.equal(row.data.breakdown.trait,"Instinct");assert.equal(row.data.breakdown.subtotal,3);
  assert.equal(db.getCharacter(pc.id).data.resources.hope,3,"trait choice has no inferred cost");
  const xpProof=adjudicateRollSource(db,guild,{key:"d04-xp",character_id:pc.id,kind:"participation",ruling_key:"inspect-instinct",
    data:{request:request.record_key,character_id:pc.id,kind:"experience",description:"Dock work applies.",experience:"Dockworker"}},"gm");
  row=contributeRoll(db,guild,"owner",{op:"experience",request:request.record_key,expected_revision:rollRevision(row),
    key:"choose-xp",experience:"Dockworker",pay_hope:true,proof:xpProof.event_key,description:"Dock work applies."});
  assert.equal(db.getCharacter(pc.id).data.resources.hope,2);
  row=contributeRoll(db,guild,"owner",{op:"roll",request:request.record_key,expected_revision:rollRevision(row),key:"roll"},{rng:()=>6});
  assert.equal(row.status,"resolved");assert.equal(db.getCityRecord(guild,"roll_disclosure",`${row.record_key}:party`),null,
    "results stay private by default");
  const hopeAfterRoll=db.getCharacter(pc.id).data.resources.hope;
  assert.throws(()=>contributeRoll(db,guild,"other",{op:"share",request:row.record_key,
    expected_revision:rollRevision(row),key:"foreign-share",scope:"party",confirm:true}),/owner|owned/i);
  const shared=contributeRoll(db,guild,"owner",{op:"share",request:row.record_key,expected_revision:rollRevision(row),
    key:"owner-share",scope:"party",confirm:true});
  const sent=[];await publishRollPartyDisclosure(db,guild,shared,async text=>{sent.push(text);return {ok:true,messageId:"party-share",channelId:"play"};});
  assert.equal(sent.length,1);assert.match(sent[0],/Billy.*Native total/s);assert(!sent[0].includes("shipping terminal"),"unreviewed raw declaration is not the public outcome");
  assert(!/Dockworker|Private Card|Instinct|Knowledge/.test(sent[0]),"party projection contains no private option or trait detail");
  await publishRollPartyDisclosure(db,guild,shared,async()=>assert.fail("party disclosure duplicated"));
  contributeRoll(db,guild,"owner",{op:"share",request:row.record_key,expected_revision:rollRevision(row),
    key:"owner-share",scope:"party",confirm:true});
  assert.equal(db.getCharacter(pc.id).data.resources.hope,hopeAfterRoll,"share replay never spends or repeats mechanics");
  console.log("D04 trait/share PASS: reviewed trait choice, exact Experience spend and affirmative redacted publication.");
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
