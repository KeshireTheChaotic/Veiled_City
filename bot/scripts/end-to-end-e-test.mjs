/** Authenticated owner confirmation, bound invitation lifecycle and actual zero-write conversational discovery route. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { captureArcCandidate, personalArc, personalInbox, proposeArcBeat } from "../src/personal-continuity.js";
import { routeDiscoveryMessage } from "../src/continuity-routing.js";
import { stateRevision } from "../src/ai-intents.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-end-to-end-e-")),db=new VeiledDB(path.join(temp,"test.sqlite"),path.resolve("sql/schema.sql"));
try{
  const guild="e";db.ensureCampaign(guild);const session=db.startSession(guild,"Owner continuity");
  db.upsertPlayer(guild,"one","One");db.upsertPlayer(guild,"two","Two");
  const pc=db.createCharacter(guild,"one","Owner",{}),other=db.createCharacter(guild,"two","Other",{});
  for(const [user,c] of [["one",pc],["two",other]]){db.assignCharacter(session.id,user,c.id);db.setPresence(session.id,user,"present");}
  configureCityFlags(db,guild,{personal_arcs:true,discovery:true});
  const candidate=captureArcCandidate(db,guild,"one",pc.id,"message","I vow to find my brother.");assert(candidate);
  assert.equal(db.characterContinuity(guild,pc.id,{kind:"arc"}).length,0,"quotation is not consent");
  assert.equal(captureArcCandidate(db,guild,"one",pc.id,"message","I vow to find my brother.").record_key,candidate.record_key);
  assert.throws(()=>personalArc(db,guild,"two",{key:candidate.record_key,op:"confirm",expected_revision:stateRevision(candidate)}),/candidate/);
  assert.throws(()=>personalArc(db,guild,"one",{key:candidate.record_key,op:"confirm",expected_revision:"forged"}),/revision/);
  personalArc(db,guild,"one",{key:candidate.record_key,op:"confirm",arc_key:"vow",expected_revision:stateRevision(candidate)});
  const arc=db.getCityRecord(guild,"arc",`${pc.id}:vow`);assert.equal(arc.data.statement,"I vow to find my brother.");
  const beat=proposeArcBeat(db,guild,{key:"invite",character_id:pc.id,arc_key:"vow",source_event:arc.source_event,invitation:"Would you revisit your vow?"},"gm");
  personalArc(db,guild,"one",{key:beat.record_key,op:"respond",decision:"defer",expected_revision:stateRevision(beat)});
  assert.throws(()=>proposeArcBeat(db,guild,{key:"spam",character_id:pc.id,arc_key:"vow",source_event:arc.source_event,invitation:"Again?"},"gm"),/cooldown/);
  db.addFact(guild,{key:"own",content:"Recorded visitor went north",category:"clue",visibility:"character",subjectCharacterId:pc.id,confidence:40});
  db.addFact(guild,{key:"secret",content:"SECRET_ALIAS went south",visibility:"gm"});
  const delivered=[],changes=db.db.prepare("SELECT total_changes() n").get().n,clock=db.getSimulationClock(guild);
  assert(await routeDiscoveryMessage({db,message:{guild:{id:guild},author:{id:"one"},content:"What do I know about visitor?"},deliver:async text=>delivered.push(text)}));
  assert(delivered[0].includes("north"));assert(!delivered[0].includes("SECRET_ALIAS"));
  assert(await routeDiscoveryMessage({db,message:{guild:{id:guild},author:{id:"one"},content:"What do I know about SECRET_ALIAS?"},deliver:async text=>delivered.push(text)}));
  assert(delivered[1].includes("no matching"));personalInbox(db,guild,"one");
  assert.equal(db.db.prepare("SELECT total_changes() n").get().n,changes);assert.deepEqual(db.getSimulationClock(guild),clock);
  console.log("End-to-end E PASS: explicit owner quote/confirmation, stale/foreign refusal, invitation defer/cooldown, private zero-write natural-language discovery; zero paid calls.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
