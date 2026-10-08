/** SP9 real private routes/slash access, old evidence, explicit commitments and native GM previews. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { personalArc, discoverPersonal } from "../src/personal-continuity.js";
import { organizationRequest, reviewOrganization } from "../src/owned-community.js";
import { manageLongProject, projectPhaseRevision } from "../src/long-projects.js";
import { routeDiscoveryMessage, discoveryQuestion } from "../src/continuity-routing.js";
import { handleCommand } from "../src/commands.js";
import { handleStoryCommand } from "../src/story-commands.js";
import { reviewInbox } from "../src/ai-review.js";
import { stateRevision } from "../src/ai-intents.js";
import { fakeInteraction } from "./contract-fixtures.mjs";
const root=fs.mkdtempSync(path.join(os.tmpdir(),"vc-sp9-")),file=path.join(root,"fixture.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const guild="contract";db.ensureCampaign(guild);db.ensureCampaign("other");const session=db.startSession(guild,"Queries");
  db.upsertPlayer(guild,"owner","Owner");db.upsertPlayer(guild,"other","Other");
  const pc=db.createCharacter(guild,"owner","Owner",{}),alt=db.createCharacter(guild,"owner","Alt",{}),foreign=db.createCharacter(guild,"other","Other",{});
  for(const [user,c] of [["owner",pc],["other",foreign]]){db.assignCharacter(session.id,user,c.id);db.setPresence(session.id,user,"present");}
  configureCityFlags(db,guild,{discovery:true,personal_arcs:true,player_organizations:true,long_projects:true});
  configureCityFlags(db,"other",{discovery:true});
  indexWorldEvent(db,guild,{key:"source",source_id:"gm",title:"Established visible lead",visibility:"party"});
  const old=db.createHandout(guild,{title:"Old violet receipt",content:"Visible ink; unreliable testimony",authority:"unreliable",visibility:"character",subjectCharacterId:pc.id,
    metadata:{SYNTHETIC_PRIVATE_LAB:"secret"},canonicalFacts:["SYNTHETIC_PRIVATE_CANON"]});
  for(let i=0;i<150;i++) db.createHandout(guild,{title:`New hidden ${i}`,content:"SYNTHETIC_PRIVATE_LAB",visibility:i%2?"gm":"character",subjectCharacterId:foreign.id});
  assert.equal(db.listHandoutsFor(guild,"owner",{characterId:pc.id,limit:1})[0].id,old.id,"authorize before retrieval limit");
  db.addFact(guild,{content:"A recorded active lead",category:"lead",visibility:"character",subjectCharacterId:pc.id,confidence:40});
  personalArc(db,guild,"owner",{key:"promise",type:"vow",statement:"I vow to find the violet receipt peacefully."});
  let request=organizationRequest(db,guild,"owner",{op:"propose",key:"helpers",request:"found",title:"Violet Helpers",terms:"Voluntary aid, no spending",source_event:"source"});
  const preview=reviewInbox(db,guild,{kind:"organization_request"}).items[0].preview;assert(preview.player_consent.includes("WAITING"));
  request=organizationRequest(db,guild,"owner",{op:"confirm",key:request.record_key,expected_revision:stateRevision(request)});
  assert(discoverPersonal(db,guild,"owner",{mode:"commitments",query:"Helpers"}).commitments[0].status.includes("consented"));
  reviewOrganization(db,guild,{kind:"organization_request",op:"approve",key:request.record_key,expected_revision:stateRevision(request)},"gm");
  const project=manageLongProject(db,guild,"owner",{op:"create",key:"research",character_id:pc.id,title:"Violet research",source_event:"source",participants:[pc.id],strict_consent:true,
    phases:[{key:"study",title:"Study violet",duration_minutes:60,requires:[],prerequisites:["source"]}]});
  assert.equal(discoverPersonal(db,guild,"owner",{mode:"commitments",query:"research"}).commitments.length,0,"proposal alone isn't acceptance");
  const cycle=db.openDowntime(guild,{}),submission=db.addDowntimeProject(cycle.id,guild,{userId:"owner",characterId:pc.id,title:"Violet research"});
  manageLongProject(db,guild,"owner",{op:"consent",key:"research",character_id:pc.id,project_id:submission.id,decision:"accept",phase_revision:projectPhaseRevision(project)});
  const writes=db.db.prepare("SELECT total_changes() n").get().n,clock=db.getSimulationClock(guild),delivered=[];
  for(const content of ["Show my known evidence about violet?","List my accepted commitments about violet?","What organizations do I belong to about Violet?","What leads do I have?"]){
    assert(discoveryQuestion(content));assert(await routeDiscoveryMessage({db,message:{guild:{id:guild},author:{id:"owner"},content},deliver:async text=>delivered.push(text)}));
  }
  assert(delivered[0].includes("Old violet receipt"));assert(delivered[0].includes("unreliable"));
  assert(delivered[1].includes("I vow"));assert(delivered[1].includes("explicitly accepted current project phase"));
  assert(delivered[2].includes("Violet Helpers"));assert(delivered[3].includes("recorded active lead"));
  assert(!JSON.stringify(delivered).includes("SYNTHETIC_PRIVATE"));assert(delivered.every(text=>text.length<=1900));
  async function slash(json=null,options={}){
    const interaction=fakeInteraction({gm:false,sub:"discover",json});Object.assign(interaction,{id:`read:${JSON.stringify(options)}`,commandName:"vc-intel",isChatInputCommand:()=>true});
    interaction.user={id:"owner",username:"Owner"};const oldGet=interaction.options.getString;
    interaction.options.getString=key=>options[key]??oldGet(key);await handleCommand(interaction,{db,gm:{}});return interaction;
  }
  const modern=await slash(null,{mode:"evidence",query:"violet"});assert(modern.deliveries[0].content.includes("Old violet receipt"));
  assert(modern.deliveries[0].ephemeral);assert.deepEqual(modern.deliveries[0].allowedMentions,{parse:[]});
  const legacy=await slash({mode:"evidence",query:"violet"});assert(legacy.deliveries[0].content.includes("Old violet receipt"));
  await routeDiscoveryMessage({db,message:{guild:{id:guild},author:{id:"owner"},content:"Show my known evidence?"},deliver:async()=>{throw new Error("Offline Discord failure");}});
  const gm=fakeInteraction({sub:"ai-inbox",json:{kind:"organization_request"}});await handleStoryCommand(gm,{db});assert(gm.deliveries[0].content.includes("Owner confirmed exact terms"));
  await assert.rejects(()=>handleStoryCommand(fakeInteraction({gm:false,sub:"ai-inbox"}),{db}),/GM\/admin/);
  assert.equal(db.db.prepare("SELECT total_changes() n").get().n,writes);assert.deepEqual(db.getSimulationClock(guild),clock);
  assert(!db.getOperationReceipt(guild,modern.id));
  assert.throws(()=>discoverPersonal(db,guild,"owner",{mode:"evidence",character_id:foreign.id}),/owned/);
  assert.throws(()=>discoverPersonal(db,"other","owner",{mode:"evidence"}),/owned/);
  db.assignCharacter(session.id,"owner",alt.id);
  for(const mode of ["evidence","commitments","organizations"]) assert(discoverPersonal(db,guild,"owner",{mode}).unknown);
  db.assignCharacter(session.id,"owner",pc.id);db.setPresence(session.id,"owner","absent");assert.throws(()=>discoverPersonal(db,guild,"owner",{mode:"evidence"}),/attendance/);
  db.setPresence(session.id,"owner","present");db.setAccessibility(guild,"owner",{response_length:"compact",screen_reader:true});
  const compact=[];await routeDiscoveryMessage({db,message:{guild:{id:guild},author:{id:"owner"},content:"List my accepted commitments?"},deliver:async text=>compact.push(text)});
  assert(compact[0].length<=900);assert(!compact[0].includes("|"));
  configureCityFlags(db,guild,{discovery:false});assert.equal(await routeDiscoveryMessage({db,message:{guild:{id:guild},content:"Show my known evidence?"},deliver:async()=>assert.fail("Disabled route delivered")}),false);
  configureCityFlags(db,guild,{discovery:true});const snap=db.snapshotCampaign(guild,{label:"Queries",createdBy:"gm"});db.close();db=new VeiledDB(file,schema);db.restoreSnapshot(guild,snap.id,{actorId:"gm"});
  assert(discoverPersonal(db,guild,"owner",{mode:"organizations",query:"Violet"}).organizations.length);
  console.log("SP9 PASS: real JSON-free/legacy slash and natural discovery, scoped old evidence, explicit accepted vows/initiatives/project phases, native membership, private GM previews, no writes/receipts/time, delivery failure, switch/absence/foreign denial, compact accessibility and restore; zero paid calls.");
}finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
