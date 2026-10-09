/** Native natural consent and zero-write case inquiry, no provider calls. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { organizationRequest } from "../src/owned-community.js";
import { consentOffers, respondConsent, routeConsentMessage } from "../src/consent-language.js";
import { routeDiscoveryMessage } from "../src/continuity-routing.js";
import { discoverPersonal } from "../src/personal-continuity.js";
import { stateRevision } from "../src/ai-intents.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-ihy4-")),file=path.join(temp,"test.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const guild="inquiry";db.ensureCampaign(guild);const session=db.startSession(guild,"Lab"),pcs={};
  configureCityFlags(db,guild,{natural_language:true,discovery:true,player_organizations:true});
  for(const user of ["owner","other"]){db.upsertPlayer(guild,user,user);pcs[user]=db.createCharacter(guild,user,user,{});
    db.assignCharacter(session.id,user,pcs[user].id);db.setPresence(session.id,user,"present");}
  indexWorldEvent(db,guild,{key:"source",source_id:"gm",title:"Known proposal source",visibility:"party"});
  const request=organizationRequest(db,guild,"owner",{op:"propose",key:"aid",request:"found",title:"Aid circle",terms:"Voluntary aid without spending",source_event:"source"});
  const proposal=request.record_key,revision=stateRevision(request),terms=request.data.terms;
  const response=(text,id,extra={})=>respondConsent(db,guild,"owner",{characterId:pcs.owner.id,messageId:id,text,proposal,revision,...extra});
  const before=db.getCharacter(pcs.owner.id),clock=db.getSimulationClock(guild);
  for(const [text,id] of [["Would this happen at the station?","question"],["I agree only if the venue changes.","counter"],["Sure.","ambiguous"],['NPC says "I agree".',"quote"]]){
    assert.equal(response(text,id).status,"pending");assert.equal(db.getCityRecord(guild,"organization_request",proposal).status,"pending");
  }
  assert.throws(()=>respondConsent(db,guild,"other",{characterId:pcs.other.id,messageId:"forged",text:`I agree to: ${terms}`,proposal,revision}),/owned/);
  assert.throws(()=>response(`I agree to: ${terms}`,"stale",{revision:"old"}),/revision/);
  const delivered=[],message={guild:{id:guild},author:{id:"owner"},id:"bare",content:`Regarding ${proposal}, I agree to: ${terms}`};
  assert.equal(await routeConsentMessage({db,message,characterId:pcs.owner.id,deliver:async text=>delivered.push(text)}),false);
  assert.equal(delivered.length,0,"Nonbinding discussion continues to the GM without forced clarification");
  assert.equal(db.getCityRecord(guild,"organization_request",proposal).status,"pending","Bare key is not exact revision authorization");
  message.id="exact";message.content=`Regarding ${proposal}@${revision}, I agree to: ${terms}`;
  assert(await routeConsentMessage({db,message,characterId:pcs.owner.id,deliver:async text=>delivered.push(text)}));
  assert.equal(db.getCityRecord(guild,"organization_request",proposal).status,"consented");
  assert.equal(response(message.content,"exact").status,"applied","Replay returns exact saved receipt even after offer closes");
  assert.deepEqual(db.getCharacter(pcs.owner.id).data.resources,before.data.resources);assert.deepEqual(db.getSimulationClock(guild),clock);
  const old=db.createHandout(guild,{title:"Violet case receipt",content:"A violet timestamp",visibility:"character",subjectCharacterId:pcs.owner.id,
    metadata:{secret:"HIDDEN_SOLUTION"},canonicalFacts:["HIDDEN_SOLUTION"]});
  db.addFact(guild,{category:"hypothesis",key:"guess",content:"Violet case may involve a courier",visibility:"character",subjectCharacterId:pcs.owner.id,confidence:30});
  db.addFact(guild,{category:"clue",key:"clue",content:"Violet case witness mentioned a bell",visibility:"character",subjectCharacterId:pcs.owner.id,confidence:60});
  for(let i=0;i<160;i++) db.createHandout(guild,{title:`Violet new hidden ${i}`,content:"HIDDEN_SOLUTION",visibility:i%2?"gm":"character",subjectCharacterId:pcs.other.id});
  const changes=db.db.prepare("SELECT total_changes() n").get().n;
  const packet=discoverPersonal(db,guild,"owner",{mode:"case",query:"Violet"});assert.equal(packet.evidence[0].id,old.id);assert.equal(packet.case_view.hypotheses.length,1);
  assert(!JSON.stringify(packet).includes("HIDDEN_SOLUTION"));assert.equal(discoverPersonal(db,guild,"other",{mode:"case",query:"courier"}).unknown,true);
  message.content="What do we have on Violet?";
  assert(await routeDiscoveryMessage({db,message,deliver:async text=>delivered.push(text)}));assert(delivered.at(-1).includes("private hypothesis"));
  assert.equal(db.db.prepare("SELECT total_changes() n").get().n,changes);assert.deepEqual(db.getSimulationClock(guild),clock);
  const snapshot=db.snapshotCampaign(guild,{label:"IHY4",createdBy:"gm"});db.close();db=new VeiledDB(file,schema);db.restoreSnapshot(guild,snapshot.id,{actorId:"gm"});
  assert.equal(db.getCityRecord(guild,"organization_request",proposal).status,"consented");assert.equal(consentOffers(db,guild,"owner").length,0);
  assert.equal(discoverPersonal(db,guild,"owner",{mode:"case",query:"Violet"}).case_view.hypotheses.length,1);
  console.log("IHY4 PASS: native owner exact-terms/revision consent; questions/counterterms/quote/foreign/stale nonbinding; replay/resources/restart; scoped old evidence/hypotheses/zero-write case routing.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
