/** V9-01 A01-A07: exact separately authenticated owner consent, use-time authority and replay. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { captureAuthoredTurnEnvelope } from "../src/authored-turn-envelope.js";
import { proposeIntents, acceptIntentForAdjudication } from "../src/typed-intents.js";
import { openActionWindow, joinActionWindow } from "../src/frameworks/session/public.js";
import { requestActionConsent, respondActionConsent, validateActionConsent } from "../src/action-consent.js";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-v9-consent-"));
const db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql")),guild="v9-consent";
try{
  db.ensureCampaign(guild);const session=db.startSession(guild,"Native consent");
  const pcs=["a","b","c"].map(user=>{
    db.upsertPlayer(guild,user,user);const pc=db.createCharacter(guild,user,user,{location:"terminal"});
    db.assignCharacter(session.id,user,pc.id);db.setPresence(session.id,user,"present");return pc;
  });
  const raw="I help lift the crate.",envelope=captureAuthoredTurnEnvelope(db,guild,"a",pcs[0].id,"consent-attempt",raw);
  const scope={mode:"party",actorUserId:"a",actorCharacterId:pcs[0].id};
  const proposal=proposeIntents(db,guild,[{version:2,proposal_id:"",source_event:envelope.source_event,start:0,end:raw.length,
    source_span:raw,actor_character_id:pcs[0].id,sequence_index:0,dependencies:[],type:"interact",operation:"lift",
    target:{kind:"object",key:"crate",phrase:"crate",grounding:"known"},framing:"immediate",destination_scope:"none",
    attempted_action:raw,desired_outcome:null,authored_outcome_claim:null,temporal_relation:"sequential"}],scope,{messageId:"consent-attempt"})[0];
  const accepted=acceptIntentForAdjudication(db,guild,proposal,scope);
  const window=openActionWindow(db,guild,{key:"crate",source_event:envelope.source_event,reason:"cooperative_operation"});
  const terms={accepted_intent:accepted.record_key,reads:["item:crate"],writes:["item:crate:position"],location_key:"terminal",
    operation:"group_action",participation:"voluntary",required_participants:pcs.slice(0,2).map(pc=>pc.id)};
  const offer=requestActionConsent(db,guild,{window:window.record_key,expected_revision:window.data.revision,...terms,
    consequences:"Attempt to lift together; no roll, costs, movement or success authorized.",expires_minute:100});
  const reply=(user,decision,key,extra={})=>respondActionConsent(db,guild,user,{request:offer.record_key,
    expected_revision:offer.data.terms_hash,decision,interaction_id:key,...extra});
  assert.throws(()=>reply("c","accept","foreign"),/owner|participant|controlled/i);
  assert.throws(()=>reply("b","accept","wrong-hash",{expected_revision:"wrong"}),/revision|terms/i);
  assert.throws(()=>reply("b","accept","wild",{extra:"wildcard"}),/closed|field/i);
  const a=reply("a","accept","a-accept"),b=reply("b","accept","b-accept");
  const context={window,accepted,input:terms};
  assert(validateActionConsent(db,guild,[a.record_key,b.record_key],context));
  assert.equal(reply("b","accept","b-accept").record_key,b.record_key,"identical retry never creates a new signature");
  assert(!validateActionConsent(db,guild,[a.record_key,b.record_key],{...context,input:{...terms,writes:["item:crate:owner"]}}));
  const participant=joinActionWindow(db,guild,window.record_key,{...terms,consent_refs:[a.record_key,b.record_key]});
  assert.equal(participant.status,"accepted");
  const isolated=change=>{
    const rollback={};
    try{db.transaction(()=>{change();assert(!validateActionConsent(db,guild,[a.record_key,b.record_key],context));throw rollback;});}
    catch(error){if(error!==rollback)throw error;}
  };
  isolated(()=>{
    const source=db.getWorldEvent(guild,envelope.source_event);
    db.saveWorldEvent(guild,{...source,key:source.event_key,status:"retracted"});
  });
  isolated(()=>{
    const source=db.getWorldEvent(guild,b.source_event);
    db.saveWorldEvent(guild,{...source,key:source.event_key,status:"retracted"});
  });
  isolated(()=>db.advanceSimulationClock(guild,{minutes:100}));
  isolated(()=>db.setDirectorState(session.id,{scene_number:2}));
  isolated(()=>{
    const other=db.createCharacter(guild,"b","B second",{});
    db.assignCharacter(session.id,"b",other.id);
  });
  isolated(()=>db.assignCharacter(session.id,"b",pcs[1].id));
  isolated(()=>db.saveCityRecord(guild,{...b,key:b.record_key,visibility:"party"}));
  isolated(()=>db.saveCityRecord(guild,{...offer,key:offer.record_key,data:{...offer.data,consequences:"Different costs"}}));
  assert(validateActionConsent(db,guild,[a.record_key,b.record_key],context),"all negative fixture mutations rolled back");
  assert(!JSON.stringify(b.data).includes(raw),"private consent receipt carries references, not copied declarations");
  reply("b","revoke","b-revoke");
  assert(!validateActionConsent(db,guild,[a.record_key,b.record_key],context));
  assert.throws(()=>joinActionWindow(db,guild,window.record_key,{...terms,consent_refs:[a.record_key,b.record_key]}),/consent/i,
    "replaying an existing participant cannot bypass revocation");
  // A fresh offer must be used for a fresh window revision; old signatures cannot be resurrected by a new button ID.
  assert.throws(()=>reply("b","accept","reaccept-old"),/revoked|terminal|stale|revision/i);
  assert.equal(db.listCityRecords(guild,{kind:"action_outcome_receipt",includeGM:true,limit:10}).length,0);
  console.log("V9-01 PASS: exact current terms, independent owners, foreign/changed/revoked denial, replay; no effects.");
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
