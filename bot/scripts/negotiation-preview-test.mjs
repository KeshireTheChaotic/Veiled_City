/** Offers, review, costs, PC consent, revisions and strictly nonmutating hypothetical forecasts. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { negotiateAgreement } from "../src/negotiations.js";
import { previewOutcomes } from "../src/outcome-preview.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { configureSimulationEntity } from "../src/simulation.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-negotiation-"));
const db=new VeiledDB(path.join(temp,"test.sqlite"),path.resolve("sql/schema.sql"));
try{
  const guild="negotiation";db.ensureCampaign(guild);db.ensureCampaign("other");db.upsertPlayer(guild,"owner","Owner");
  const pc=db.createCharacter(guild,"owner","Principal",{}),pcBefore=JSON.stringify(db.getCharacter(pc.id).data);
  indexWorldEvent(db,guild,{key:"source",title:"A grounded offer",source_kind:"gm",source_id:"Human GM"});
  for(const npc of ["alice","bob"]){db.upsertNpcProfile(guild,{npcKey:npc,displayName:npc});configureSimulationEntity(db,guild,"npc",npc,{});
    db.upsertNpcGoal(guild,{npcKey:npc,goalKey:"bargain",objective:"An established bargain",acceptableMethods:["negotiate"]});}
  const participants=["alice","bob"].map(key=>({type:"npc",key,goal_key:"bargain"}));
  const terms={statement:"Agreed repair supplies",deadline:1440,costs:[{party:"npc:alice",resource:"materials",amount:2}],major:true,
    obligation:{debtor:"npc:alice",creditor:"npc:bob",content:"Deliver agreed supplies"}};
  const offer={key:"deal",step:"offer-1",source_event:"source",participants,terms};
  assert.throws(()=>negotiateAgreement(db,guild,offer,"gm"),/opt-in/);configureCityFlags(db,guild,{negotiations:true});
  negotiateAgreement(db,guild,offer,"gm");assert.equal(db.getSimulationEntity(guild,"npc","alice").state.resources.materials,4);
  const acceptance={key:"deal",step:"accept",op:"accept",source_event:"source",accepted_by:{"npc:alice":"npc:alice","npc:bob":"npc:bob"}};
  assert.throws(()=>negotiateAgreement(db,guild,acceptance,"gm"),/requires review/);
  const counter=negotiateAgreement(db,guild,{key:"deal",step:"counter",op:"counteroffer",source_event:"source",terms:{...terms,statement:"Revised delivery terms"}},"gm");
  assert.equal(counter.data.history[0].terms.statement,"Agreed repair supplies");
  negotiateAgreement(db,guild,{key:"deal",step:"review",op:"approve",source_event:"source"},"gm");
  const accepted=negotiateAgreement(db,guild,acceptance,"gm");assert.equal(accepted.status,"accepted");
  assert.equal(db.getSimulationEntity(guild,"npc","alice").state.resources.materials,2);assert(accepted.data.obligation_id);
  negotiateAgreement(db,guild,acceptance,"gm");assert.equal(db.getSimulationEntity(guild,"npc","alice").state.resources.materials,2);
  assert.throws(()=>negotiateAgreement(db,guild,{...offer,key:"overdraft",terms:{...terms,costs:[{party:"npc:alice",resource:"materials",amount:10}]}},"gm"),/unavailable/);
  db.saveCityRecord(guild,{kind:"institution",key:"office",source_event:"source",data:{capacity:1,procedures:["negotiate_request"],jurisdictions:["station"],personnel:[]}});
  const instOffer={...offer,key:"office-deal",participants:[participants[0],{type:"institution",key:"office"}],
    terms:{statement:"Offer office support",deadline:1440,jurisdiction:"station",costs:[{party:"institution:office",resource:"capacity",amount:2}]}};
  assert.throws(()=>negotiateAgreement(db,guild,instOffer,"gm"),/unavailable/);
  assert.throws(()=>negotiateAgreement(db,guild,{...instOffer,terms:{...instOffer.terms,jurisdiction:"unknown"}},"gm"),/authority\/jurisdiction/);
  const pcOffer={...offer,key:"pc-deal",participants:[participants[0],{type:"character",key:pc.id}],terms:{statement:"Proposed PC promise",deadline:1440,costs:[]}};
  negotiateAgreement(db,guild,pcOffer,"gm");
  assert.throws(()=>negotiateAgreement(db,guild,{...acceptance,key:"pc-deal"},"gm"),/Explicit acceptance/);
  assert.equal(JSON.stringify(db.getCharacter(pc.id).data),pcBefore);
  db.saveCityRecord(guild,{kind:"infrastructure",key:"pump",source_event:"source",data:{name:"Pump",native_condition:50}});
  const before=db.snapshotCampaign(guild).state,ledger=db.listMutationLedger(guild,{limit:100}).length;
  const preview=previewOutcomes(db,guild,{query:"pump"});assert.equal(preview.status,"hypothetical");assert.equal(preview.branches[0].status,"possible");
  assert.deepEqual(db.snapshotCampaign(guild).state,before);assert.equal(db.listMutationLedger(guild,{limit:100}).length,ledger);
  assert.throws(()=>previewOutcomes(db,"other",{event_key:"source"}),/not found/);
  console.log("Negotiation/preview PASS: revisions, no pending costs, explicit PC consent, replay conservation, nonmutating forecasts.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
