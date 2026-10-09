/** Phase C contracts: semantic movement is non-authoritative until native resolution and canon-safe identity preflight. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { captureContextSource } from "../src/narrative-context.js";
import { captureWorldInput } from "../src/autonomous-world.js";
import { applyAuthoritativeMutation } from "../src/state.js";
import { adjudicationEnvelope } from "../src/rules-arbitration.js";
import { preflightNpcIdentity } from "../src/location-language.js";

const root=fs.mkdtempSync(path.join(os.tmpdir(),"vc-phase-c-")),file=path.join(root,"test.sqlite");
const db=new VeiledDB(file,path.resolve("sql/schema.sql")),guild="guild";
try{
  db.ensureCampaign(guild);const session=db.startSession(guild,"Semantic travel");
  db.upsertPlayer(guild,"owner","Owner");const pc=db.createCharacter(guild,"owner","Tyrell",{});
  db.assignCharacter(session.id,"owner",pc.id);db.setPresence(session.id,"owner","present");
  configureCityFlags(db,guild,{natural_language:true,scene_continuity:true},"gm");
  const scope={mode:"party",actorUserId:"owner",actorCharacterId:pc.id};
  const messageId="nearest-shop",text="I duck into the nearest open shop, out of the light.";
  const context=captureContextSource(db,guild,"owner",pc.id,messageId,text);
  captureWorldInput(db,guild,"owner",pc.id,messageId,text);
  const narrative={narrative_interpretation:{source_ref:context.event_key,references:[{phrase:"the nearest open shop",entity_type:"location",
    entity_key:"night-shop",source_refs:[context.event_key],status:"candidate"}],intended_actions:[text],acknowledgements:[],unresolved:[]},
    world_additions:[{kind:"location",key:"night-shop",name:"Night Shop",summary:"A modest open corner shop.",parent_location_key:"",visibility:"party"}],
    scene_actions:[{kind:"move",entity_ref:"night-shop",source_span:text,zone:""}]};
  const result=applyAuthoritativeMutation(db,{guildId:guild,sessionId:session.id,narrative,scope,provenance:{messageId}});
  assert.equal(db.getCharacter(pc.id).data.location,"night-shop","NL-01: semantic candidate may resolve through native local/access checks");
  const arrival=result.world.find(row=>row.status==="arrived");
  assert.equal(arrival.adjudication.mode,"native_resolved");assert.ok(arrival.adjudication.verified_receipts.length);
  assert.equal(db.listCityRecords(guild,{kind:"movement_candidate",includeGM:true}).at(-1).status,"resolved");

  const conditional="I'd go back there if I had time.";
  const conditionalId="conditional",conditionalContext=captureContextSource(db,guild,"owner",pc.id,conditionalId,conditional);
  captureWorldInput(db,guild,"owner",pc.id,conditionalId,conditional);
  applyAuthoritativeMutation(db,{guildId:guild,sessionId:session.id,scope,provenance:{messageId:conditionalId},narrative:{narrative_interpretation:{
    source_ref:conditionalContext.event_key,references:[{phrase:"there",entity_type:"location",entity_key:"night-shop",
      source_refs:[conditionalContext.event_key],status:"resolved"}],intended_actions:[conditional],acknowledgements:[],unresolved:[]}}});
  assert.equal(db.listCityRecords(guild,{kind:"movement_candidate",includeGM:true}).filter(row=>row.data.source_span===conditional).length,0,"NL-04: conditional speech never authorizes travel");

  db.upsertReference(guild,{kind:"npc",key:"secret-keeper",name:"Mara",summary:"Protected identity",visibility:"gm"});
  assert.equal(preflightNpcIdentity(db,guild,{key:"mara",name:"Mara",scope}).status,"protected_collision","NL-12: protected identity collision is opaque");
  assert.throws(()=>adjudicationEnvelope({intent:"attack",source_refs:[context.event_key],mode:"native_resolved",
    rule_basis:{kind:"RAW",refs:["srd:combat"]}}),/receipt/);
  assert.throws(()=>adjudicationEnvelope({intent:"risky task",source_refs:[context.event_key],mode:"roll_required",
    rule_basis:{kind:"RAW",refs:["srd:actions"]}}),/roll request/);
  assert.deepEqual(db.db.prepare("PRAGMA foreign_key_check").all(),[]);
  console.log("Implementation Phase C PASS: source-backed movement, conditional denial, native adjudication and protected identity preflight; zero live calls.");
}finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
