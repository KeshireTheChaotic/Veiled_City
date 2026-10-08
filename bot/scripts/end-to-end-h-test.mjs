/** Accepted seed pointers prepare actor-owned evidence without changing it; reviewed templates stay inert and inbox transport is read-only. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { VeiledDB } from "../src/db.js";
import { backfillSeedData, reviewSeedDraft, addSeedDraft } from "../src/seed-drafts.js";
import { actorSource, ownedKnowledgeSource } from "../src/simulation-motivation.js";
import { configureCityFlags } from "../src/city-core.js";
import { configureDelegation, stateRevision } from "../src/ai-intents.js";
import { reviewInbox, reviewWorkflow } from "../src/ai-review.js";
import { applyAuthoritativeMutation } from "../src/state.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-end-to-end-h-")),db=new VeiledDB(path.join(temp,"test.sqlite"),path.resolve("sql/schema.sql"));
try{
  const guild="h";db.ensureCampaign(guild);db.upsertNpcProfile(guild,{npcKey:"witness",displayName:"Witness"});db.setSimulationEntity(guild,"npc","witness",{});
  db.upsertNpcKnowledge(guild,{npcKey:"witness",knowledgeKey:"seed.known.1",content:"The cable was cut",sourceType:"seed",sourceRef:"GM_PRIVATE/NPCS/npcs.json",confidence:95});
  const body=JSON.stringify([{name:"Witness",knows:["The cable was cut"]}]),sourcePath="GM/NPCS/npcs.json";
  db.insertSeedDocument(guild,{sourcePath,sha256:createHash("sha256").update(body).digest("hex"),encoding:"utf8",body,visibility:"gm",actorId:"gm"});
  db.insertSeedCatalog(guild,{sourcePath,key:"witness",kind:"npc",data:{name:"Witness",knows:["The cable was cut"]},visibility:"gm"});
  const original=db.getNpcKnowledge(guild,"witness","seed.known.1");backfillSeedData(db,guild,"gm");
  assert.deepEqual(db.getNpcKnowledge(guild,"witness","seed.known.1"),original,"additive pointer, no information rewrite");
  const event=ownedKnowledgeSource(db,guild,"witness",original);assert(event?.event_key);
  actorSource(db,guild,{actor_type:"npc",actor_key:"witness",information_key:original.knowledge_key,source_event:event.event_key});
  backfillSeedData(db,guild,"gm");assert.equal(db.listCityRecords(guild,{kind:"seed_knowledge_source",includeGM:true}).length,1);
  const data={source_event:event.event_key,op:"subscribe",handler:"service",entity_key:"power",event_kinds:["infrastructure_damage"],location_key:"room",delta:-1};
  const draft=addSeedDraft(db,guild,{kind:"consequence_template",key:"cut",data,source_event:event.event_key},"gm");
  reviewSeedDraft(db,guild,draft.record_key,"approve","gm");
  assert.equal(db.listCityRecords(guild,{kind:"consequence_subscription",includeGM:true}).length,0,"templates do not create live subscriptions");
  assert.equal(db.getCityCalendar(guild).flags.consequences,undefined);
  configureCityFlags(db,guild,{emergent_goals:true});configureDelegation(db,guild,{mode:"suggest_only",allow:[],max_operations:1,max_cost:0,expires_minute:null},"gm");
  const intent={version:1,feature:"goal",target_key:"",expected_revision:"absent",policy_revision:1,source_prerequisites:[],payload:{actor_type:"npc",actor_key:"witness",
    information_key:original.knowledge_key,source_event:event.event_key,op:"propose",goal_key:"inspect",new_goal_key:"",objective:"Inspect cable",reason:"Owned seed evidence",
    priority:50,confidence:85,horizon:"near",dependencies:[],acceptable_methods:["observe"],conflicts:[]}};
  let pending=applyAuthoritativeMutation(db,{guildId:guild,aiIntents:[intent],provenance:{messageId:"seeded"}}).intents[0];assert.equal(pending.status,"pending");
  const changes=db.db.prepare("SELECT total_changes() n").get().n;const inbox=reviewInbox(db,guild,{});assert(inbox.items.length);
  reviewInbox(db,guild,{});assert.equal(db.db.prepare("SELECT total_changes() n").get().n,changes,"repair notice is read-only");
  pending=reviewWorkflow(db,guild,{key:pending.record_key,decision:"defer",expected_revision:stateRevision(pending)},"gm");assert.equal(pending.status,"deferred");
  pending=reviewWorkflow(db,guild,{key:pending.record_key,decision:"reject",expected_revision:stateRevision(pending)},"gm");assert.equal(pending.status,"rejected");
  assert.equal(applyAuthoritativeMutation(db,{guildId:guild,aiIntents:[intent],provenance:{messageId:"seeded"}}).intents[0].status,"rejected");
  assert.throws(()=>reviewWorkflow(db,guild,{kind:"arc_candidate",key:"forged",decision:"approve"},"gm"),/consent/);
  console.log("End-to-end H PASS: add-only same-knowledge seed links, inert reviewed templates, seeded AI proposal, zero-write inbox repair and deferred/rejected replay; zero paid calls.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
