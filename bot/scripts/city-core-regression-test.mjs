/** Core civic acceptance fixtures: knowledge firewall, local jurisdiction, beliefs, review, causality and consent. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { VeiledDB } from "../src/db.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { configureSimulationEntity, applySimulationUpdates } from "../src/simulation.js";
import { updateCityCore, assignDistrictLocation, fileInstitutionReport, addWorldLink, submitInstitutionAction,
  reviewInstitutionAction, configureCityFlags, runInstitutionDirector, establishCommitment, cityContext, proposeCityOpportunity } from "../src/city-core.js";

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-city-core-"));
const db=new VeiledDB(path.join(temp,"test.sqlite"),path.resolve("sql/schema.sql"));
const guild="civic",start=performance.now();
try{
  db.ensureCampaign(guild);db.ensureCampaign("other");
  const source=key=>indexWorldEvent(db,guild,{key,kind:"observation",title:`Sourced ${key}`,source_kind:"gm",source_id:"GM approved fixture",truth_status:"observed"});
  source("incident");source("report");source("outage");
  const update=(kind,key,data)=>updateCityCore(db,guild,{kind,key,source_event:"incident",data});
  update("district","north",{name:"North district",indices:{safety:50,veil_pressure:30},connections:[]});
  update("district","south",{name:"South district",indices:{safety:50},connections:[]});
  configureSimulationEntity(db,guild,"location","hospital",{});
  assignDistrictLocation(db,guild,{district:"north",location:"hospital",source_event:"incident"});
  assert.equal(db.districtLocations(guild,"south").length,0);
  update("institution","hospital",{name:"North Hospital",mandate:"Patient care",public_policy:"Incident reports are reviewed",
    jurisdictions:["north"],procedures:["file_case","document_request","seek_warrant"],capacity:4});
  db.upsertNpcProfile(guild,{npcKey:"nurse",displayName:"Nurse Lee"});
  db.upsertNpcKnowledge(guild,{npcKey:"nurse",knowledgeKey:"anomaly",content:"The patient monitor displayed an impossible signal.",beliefState:"suspected",confidence:70});
  db.addFact(guild,{key:"private-pc",content:"Private PC diagnosis",visibility:"gm"});
  assert.equal(db.listCityRecords(guild,{kind:"report",actor:"hospital",includeGM:true}).length,0,"employee knowledge is not institutional knowledge");
  assert.throws(()=>fileInstitutionReport(db,guild,{key:"bad",institution:"hospital",source_event:"incident",from_type:"npc",from_key:"nurse",information_key:"private-pc",authorized:true}),/does not know/);
  fileInstitutionReport(db,guild,{key:"report-1",institution:"hospital",source_event:"report",from_type:"npc",from_key:"nurse",information_key:"anomaly",authorized:true});
  assert.equal(db.getCityRecord(guild,"report","report-1").data.belief_state,"suspected");
  assert.equal(db.listCityRecords(guild).length,0,"civic state is not a generic player view");
  assert.equal(db.listCityRecords("other",{includeGM:true}).length,0);
  assert.throws(()=>updateCityCore(db,"other",{kind:"district",key:"leak",source_event:"incident",data:{name:"Leak"}}),/source event/);
  update("case","case-1",{institution:"hospital",jurisdiction:"north",title:"Hospital incident",heat:12,evidence_reports:["report-1"],leads:["Review authorized monitor records"],hypotheses:["Possible interference"]});
  assert.throws(()=>update("case","bad-case",{institution:"hospital",jurisdiction:"south",title:"Outside",heat:0}),/jurisdiction/);
  for(const [key,interpretation] of [["witness","A supernatural anomaly"],["newsroom","Equipment tampering"],["agency","An unverified software incident"]]){
    update("belief",key,{audience:key,allegation:"Hospital signal",interpretation,evidence_events:["incident"],credibility:65,reach:20});
  }
  assert.equal(db.listCityRecords(guild,{kind:"belief",includeGM:true}).length,3);
  assert.equal(db.listCanon(guild,{includeGM:true}).length,0);
  const meters={fear:db.getCampaign(guild).fear,exposure:db.getCampaign(guild).veil_exposure};
  const intent={key:"case-request",institution:"hospital",type:"file_case",jurisdiction:"north",source_event:"report",report_keys:["report-1"]};
  submitInstitutionAction(db,guild,intent);submitInstitutionAction(db,guild,intent);
  assert.equal(runInstitutionDirector(db,guild,"first").length,0,"new director is opt-in");
  configureCityFlags(db,guild,{institutions:true,opportunities:true});
  assert.equal(runInstitutionDirector(db,guild,"first").length,1);
  assert.equal(db.getCityRecord(guild,"institution","hospital").data.capacity,3);
  assert.equal(runInstitutionDirector(db,guild,"first").length,0);
  const major={...intent,key:"warrant",type:"seek_warrant"};
  submitInstitutionAction(db,guild,major);
  assert.equal(db.getCityRecord(guild,"action","warrant").status,"pending");
  assert.equal(runInstitutionDirector(db,guild,"second").length,0);
  assert.equal(db.getCityRecord(guild,"institution","hospital").data.capacity,3,"pending action spends nothing");
  reviewInstitutionAction(db,guild,{key:"warrant",decision:"defer"},"gm");
  reviewInstitutionAction(db,guild,{key:"warrant",decision:"approve"},"gm");
  assert.equal(runInstitutionDirector(db,guild,"third").length,1);
  assert.throws(()=>submitInstitutionAction(db,guild,{...intent,key:"pc-control",target_type:"character",target_key:"pc"}),/cannot control/);
  assert.equal(db.getCampaign(guild).fear,meters.fear);assert.equal(db.getCampaign(guild).veil_exposure,meters.exposure);
  addWorldLink(db,guild,{from:"outage",to:"incident",relation:"caused_by"});
  assert.throws(()=>addWorldLink(db,guild,{from:"incident",to:"outage",relation:"caused_by"}),/cycle/);
  addWorldLink(db,guild,{from:"incident",to:"outage",relation:"caused_by",asserted_by:"nurse"});
  assert.equal(db.worldLinks(guild).length,2,"attributed explanations are not proven causal edges");
  const accepted=establishCommitment(db,guild,{key:"consult",source_event:"incident",type:"appointment",terms:"Agreed consultation",
    participants:["npc:nurse"],start:600,end:660,location_key:"hospital"});
  assert(db.getSimulationRecord(guild,accepted.data.obligation_id));
  assert.throws(()=>establishCommitment(db,guild,{key:"conflict",source_event:"incident",type:"appointment",terms:"Other meeting",participants:["npc:nurse"],start:620,end:670}),/Conflicting/);
  establishCommitment(db,guild,{key:"consult",op:"cancel"});
  assert.equal(db.getCityRecord(guild,"commitment","consult").status,"cancelled");
  db.upsertPlayer(guild,"player","Player");const pc=db.createCharacter(guild,"player","PC",{});
  assert.throws(()=>establishCommitment(db,guild,{key:"no-consent",source_event:"incident",type:"promise",terms:"Unasked promise",participants:[`character:${pc.id}`],start:1,end:2}),/acceptance/);
  const blocked=applySimulationUpdates(db,guild,[{kind:"city_action",key:"private-write",data_json:JSON.stringify({...intent,key:undefined})}],{scope:{mode:"private"}});
  assert(blocked[0].blocked);
  assert.equal(db.getCityRecord(guild,"action","private-write"),null);
  const proposal=proposeCityOpportunity(db,guild,"north hospital incident", "gm");
  assert.equal(proposal.data.authority,"proposal_only");
  assert.equal(proposal.data.options.length,3);
  assert(cityContext(db,guild,"north hospital incident").chars<=10000);
  const backup=db.createBackup(guild);db.restoreBackup(guild,backup.id);
  assert(db.getCityRecord(guild,"case","case-1"));assert.equal(db.worldLinks(guild).length,2);
  console.log(`Core civic regressions PASS; ${(performance.now()-start).toFixed(1)}ms; 0 extra model calls; institution action budget 2; context <=10000 chars.`);
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
