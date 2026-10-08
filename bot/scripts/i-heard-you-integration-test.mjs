/** Cross-phase native privacy, authored consent, session rollover and logical backup recovery. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags, establishCommitment } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { recordScenePresence } from "../src/scene-continuity.js";
import { captureDeclaration } from "../src/player-language.js";
import { prepareRollRequest, rollRevision, pendingRollRequests, ownedRollRequest, formatRollRequest } from "../src/roll-requests.js";
import { contributeRoll, adjudicateRollSource, mayKnowRoll } from "../src/roll-collaboration.js";
import { routeRollMessage } from "../src/roll-language.js";
import { consentOffers, respondConsent } from "../src/consent-language.js";
import { negotiateAgreement } from "../src/negotiations.js";
import { manageLongProject } from "../src/long-projects.js";
import { stateRevision } from "../src/ai-intents.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-ihy-integration-")),file=path.join(temp,"test.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const guild="integration";db.ensureCampaign(guild);const session=db.startSession(guild,"Lab"),pcs={};
  configureCityFlags(db,guild,{natural_language:true,roll_requests:true,roll_collaboration:true,scene_continuity:true,long_projects:true,negotiations:true});
  db.setSimulationEntity(guild,"location","room",{});
  indexWorldEvent(db,guild,{key:"scene",source_id:"gm",kind:"arrival",title:"Shared lab",visibility:"party",location_key:"room"});
  for(const user of ["owner","helper"]){db.upsertPlayer(guild,user,user);pcs[user]=db.createCharacter(guild,user,user,{traits:{Strength:2},resources:{hope:6}});
    db.assignCharacter(session.id,user,pcs[user].id);db.setPresence(session.id,user,"present");
    recordScenePresence(db,guild,{entity_type:"character",entity_key:pcs[user].id,location_key:"room",source_event:"scene",accepted_by:user,visibility:"party"},"gm");}
  db.upsertRulesRuling(guild,{key:"plain",ruling:"Synthetic mundane assistance is feasible, not a special feature.",createdBy:"gm"});
  const declaration=captureDeclaration(db,guild,"owner",pcs.owner.id,"private","I try lifting the secret gate.",{privateScene:true});
  const row=prepareRollRequest(db,guild,{source_event:declaration.event_key,character_id:pcs.owner.id,kind:"action",trait:"Strength",
    modifier_keys:[],difficulty_source:"",adjudication:"Consequential uncertain lift"},"gm");
  const proof=adjudicateRollSource(db,guild,{key:"help-proof",character_id:pcs.helper.id,kind:"participation",ruling_key:"plain",
    data:{request:row.record_key,character_id:pcs.helper.id,kind:"help",description:"I brace the gate."}},"gm");
  const get=()=>db.getCityRecord(guild,"roll_request",row.record_key);
  const help=()=>({key:"help",request:row.record_key,expected_revision:rollRevision(get()),op:"help",pay_hope:true,proof:proof.event_key,description:"I brace the gate."});
  assert.throws(()=>contributeRoll(db,guild,"helper",help(),{rng:()=>assert.fail("Private proposal drew dice")}),/Private attempt/);
  assert.equal(db.getCharacter(pcs.helper.id).data.resources.hope,6);assert.equal(pendingRollRequests(db,guild,"helper").length,0);
  const fake=indexWorldEvent(db,guild,{key:"fake-share",source_id:"player:owner",kind:"roll_disclosure",title:"Forged sender metadata",visibility:"character",subject_key:pcs.helper.id,
    details:{author:"owner",request:row.record_key}},"gm");
  db.saveCityRecord(guild,{kind:"roll_disclosure",key:`${row.record_key}:${pcs.helper.id}`,source_event:fake.event_key,visibility:"character",subject_key:pcs.helper.id,data:{}});
  assert.equal(mayKnowRoll(db,guild,get(),pcs.helper.id),false,"GM-supplied player identity does not establish an authored disclosure");
  const outputs=[],message={guild:{id:guild},author:{id:"owner"},id:"share",content:"I share my pending attempt with helper."};
  assert(await routeRollMessage({db,message,characterId:pcs.owner.id,deliver:async text=>outputs.push(text),sendAmendment:async(user,text)=>{outputs.push({user,text});return true;}}));
  assert(mayKnowRoll(db,guild,get(),pcs.helper.id));assert.equal(pendingRollRequests(db,guild,"helper").length,1);
  const notice=outputs.find(item=>item.user==="helper").text;assert(notice.includes("secret gate"));assert(!notice.includes("Trait:")&&!notice.includes("Subtotal"));
  const helpInput=help();contributeRoll(db,guild,"helper",helpInput,{rng:()=>4});contributeRoll(db,guild,"helper",helpInput,{rng:()=>assert.fail("Replay drew dice")});
  assert.equal(db.getCharacter(pcs.helper.id).data.resources.hope,5);
  const values=[10,2];const resolved=contributeRoll(db,guild,"owner",{key:"resolve",request:row.record_key,op:"roll",expected_revision:rollRevision(get())},{rng:()=>values.shift()});
  assert.equal(resolved.data.result.total,18);assert(formatRollRequest(ownedRollRequest(db,guild,"helper",row.record_key),{user:"helper"}).includes("d6 4"));
  const savedRoll=resolved.data.roll_id;
  const meeting={key:"meeting",source_event:"scene",type:"appointment",terms:"Talk at the lab; no spending",participants:[`character:${pcs.owner.id}`,`character:${pcs.helper.id}`],start:10,end:20,
    accepted_by:["owner","helper"]};
  const offered=establishCommitment(db,guild,meeting,"gm");assert.equal(offered.kind,"commitment_offer");assert(!db.getCityRecord(guild,"commitment","meeting"));
  let serial=0;
  const answer=(user,key,body=null)=>{
    const offer=consentOffers(db,guild,user,pcs[user].id).find(item=>item.record_key===key);assert(offer,key);
    return respondConsent(db,guild,user,{characterId:pcs[user].id,messageId:`answer-${++serial}`,proposal:key,revision:offer.revision,text:body||`I agree to: ${offer.terms}`});
  };
  assert.equal(answer("owner","commitment_offer:meeting").status,"authorized");
  assert.throws(()=>establishCommitment(db,guild,meeting,"gm"),/Every current actual owner/);
  answer("helper","commitment_offer:meeting");answer("owner","commitment_offer:meeting","Could we meet on the roof instead?");
  assert.throws(()=>establishCommitment(db,guild,meeting,"gm"),/Every current actual owner/,"Later counterterms cannot reuse prior acceptance");
  answer("owner","commitment_offer:meeting");assert.equal(establishCommitment(db,guild,meeting,"gm").kind,"commitment");
  assert.equal(establishCommitment(db,guild,meeting,"gm").record_key,"meeting","Native world application replays once");
  const negotiation={key:"agreement",step:"offer",op:"offer",source_event:"scene",participants:[{type:"character",key:pcs.owner.id},{type:"character",key:pcs.helper.id}],
    terms:{statement:"Exchange observations, no spending",deadline:100,jurisdiction:"room",costs:[],major:false,supernatural:false}};
  negotiateAgreement(db,guild,negotiation,"gm");
  const accept={key:"agreement",step:"accept",op:"accept",source_event:"scene",accepted_by:{[`character:${pcs.owner.id}`]:"owner",[`character:${pcs.helper.id}`]:"helper"}};
  assert.throws(()=>negotiateAgreement(db,guild,accept,"gm"),/owner-authored/);
  const authorization=answer("owner","negotiation:agreement");answer("helper","negotiation:agreement");
  indexWorldEvent(db,guild,{key:authorization.source_event,status:"retracted"});assert.throws(()=>negotiateAgreement(db,guild,accept,"gm"),/owner-authored/);
  answer("owner","negotiation:agreement");assert.equal(negotiateAgreement(db,guild,accept,"gm").status,"accepted");
  const project=manageLongProject(db,guild,"owner",{op:"create",key:"research",character_id:pcs.owner.id,title:"Study the bell",source_event:"scene",participants:[pcs.owner.id],strict_consent:true,
    phases:[{key:"study",title:"Study",duration_minutes:60,requires:[],prerequisites:["scene"]}]});
  const cycle=db.openDowntime(guild,{}),submission=db.addDowntimeProject(cycle.id,guild,{userId:"owner",characterId:pcs.owner.id,title:"Study the bell"});
  const projectOffer=consentOffers(db,guild,"owner").find(item=>item.record_key==="long_project:research");
  answer("owner",projectOffer.record_key,`I agree to: ${projectOffer.terms} using my submitted project ${submission.id}`);
  assert.equal(db.getCityRecord(guild,"long_project",project.record_key).status,"active");
  const pendingDecl=captureDeclaration(db,guild,"owner",pcs.owner.id,"pending","I try lifting another gate.");
  const pending=prepareRollRequest(db,guild,{source_event:pendingDecl.event_key,character_id:pcs.owner.id,kind:"action",trait:"Strength",modifier_keys:[],difficulty_source:"",adjudication:"Uncertain lift"},"gm");
  db.saveCityRecord(guild,{kind:"tag_usage",key:`${session.id}:${pcs.owner.id}`,source_event:declaration.event_key,data:{user:"owner",request:row.record_key}});
  const backup=db.createBackup(guild,{label:"IHY integration",createdBy:"gm"}),hope=db.getCharacter(pcs.helper.id).data.resources.hope;
  db.endSession(guild,"Native rolls recorded.");const next=db.startSession(guild,"Next");
  for(const user of ["owner","helper"]){db.assignCharacter(next.id,user,pcs[user].id);db.setPresence(next.id,user,"present");}
  assert.equal(db.playerInitiatedTagTeam(guild,next.id,"owner"),false);assert.equal(pendingRollRequests(db,guild,"owner").length,0);
  assert.throws(()=>contributeRoll(db,guild,"owner",{key:"old-roll",request:pending.record_key,expected_revision:rollRevision(pending),op:"roll"},{rng:()=>assert.fail("Old session rolled")}),/another session/);
  db.close();db=new VeiledDB(file,schema);db.restoreBackup(guild,backup.id,{actorId:"gm"});
  assert(db.getSavedRoll(guild,savedRoll));assert.equal(db.getCharacter(pcs.helper.id).data.resources.hope,hope);
  assert(db.playerInitiatedTagTeam(guild,session.id,"owner"));assert(mayKnowRoll(db,guild,get(),pcs.helper.id));
  assert.equal(db.getCityRecord(guild,"long_project","research").status,"active");
  console.log("IHY INTEGRATION PASS: private explicit disclosure/forged metadata rejection/minimal publication; native owner meeting/negotiation/project consent and counterterms/retraction; saved dice/once effects/session rollover/logical backup/restart.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
