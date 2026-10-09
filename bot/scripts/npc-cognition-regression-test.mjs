/** v3.8 NPC cognition persistence/retrieval/seeding regression coverage. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { ContentIndex } from "../src/content.js";
import { retrieveNpcCognition, seedNpcCognition } from "../src/npc-cognition.js";
import { applyAuthoritativeMutation } from "../src/state.js";
import { validatePostTurnStateReview } from "../src/director.js";

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"vc380-cognition-"));
const db=new VeiledDB(path.join(tmp,"test.sqlite"),path.resolve("./sql/schema.sql"));
const content=new ContentIndex(path.resolve("../content"));
const guild="g380";
db.ensureCampaign(guild);

// Existing campaign knowledge is eligible seed input only when it already has an NPC-specific relationship/reference boundary.
db.upsertReference(guild,{kind:"npc",key:"jonas-reed",name:"Jonas Reed",summary:"Former PD investigator who works with Mercer Investigations.",visibility:"party"});
db.upsertRelationship(guild,{fromType:"npc",fromKey:"npc:mara-voss",fromLabel:"Mara Voss",toType:"character",toKey:"char-elias",toLabel:"Elias Mercer",relationshipType:"trust",score:2,visibility:"gm",note:"Mercer kept his word during containment."});

const seeded=seedNpcCognition({db,content,guildId:guild,actorId:"gm-1"});
assert(seeded.profiles>=20,"packaged NPC dossiers were not seeded");
assert(seeded.goals>=20,"dossier goals were not seeded");
assert(seeded.knowledge>seeded.goals,"dossier knowledge boundaries were not seeded");
assert(db.getSeedRun(guild,"npc_cognition_v1"));
assert.throws(()=>seedNpcCognition({db,content,guildId:guild,actorId:"gm-1"}),/one-time|already completed/i);

const eliasWren=db.findNpcProfile(guild,"Elias Wren");
assert(eliasWren,"Elias Wren profile missing");
assert(Number(eliasWren.decision_profile.contract_honor)>50,"contract-specialist profile did not receive contract lens");
assert(Number(eliasWren.decision_profile.hospitality_reciprocity)>50,"hospitality/contract reciprocity lens missing");
assert.equal(eliasWren.decision_profile.veil_awareness,"aware");

const mara=db.findNpcProfile(guild,"Mara Voss");
assert(mara,"Mara profile missing");
const maraUnknown=db.listNpcKnowledge(guild,mara.npc_key,{beliefState:"unknown",limit:50});
assert(maraUnknown.some(k=>/morrowline/i.test(k.content)),"explicit NPC knowledge boundary was not retained as unknown");
assert(db.listNpcMemories(guild,mara.npc_key,{limit:50}).some(m=>m.memory_type==="secret"),"NPC secret was not seeded as subjective memory");
assert(db.listNpcMemories(guild,mara.npc_key,{limit:50}).some(m=>m.memory_type==="relational"&&/kept his word/i.test(m.content)),"existing relationship state did not seed relational memory");

// Subjective belief can contradict objective truth without changing canon/facts.
db.addFact(guild,{category:"fact",key:"northbridge.nathan",content:"Nathan did not betray Mercer.",visibility:"gm",source:"test"});
db.upsertNpcKnowledge(guild,{npcKey:mara.npc_key,knowledgeKey:"northbridge.nathan",content:"Calder says Nathan sold Mercer out.",beliefState:"rumor",confidence:42,sourceType:"told",sourceRef:"calder"});
assert.equal(db.listNpcKnowledge(guild,mara.npc_key,{limit:50}).find(k=>k.knowledge_key==="northbridge.nathan").belief_state,"rumor");
assert.match(db.listFactsForGM(guild,{search:"Nathan did not",limit:10})[0].content,/did not betray/);

// Authoritative AI mutation can persist memory, knowledge and goal changes atomically.
db.upsertNpcKnowledge(guild,{npcKey:mara.npc_key,knowledgeKey:"prior-witness",content:"Elias accepted Mara's shelter but explicitly declined any reciprocal supernatural bargain.",
  beliefState:"known",sourceType:"seed_gm",sourceRef:"msg-380"});
const mutation=applyAuthoritativeMutation(db,{
  guildId:guild,source:"ai_gm",provenance:{actorType:"ai",actorId:"veilkeeper",messageId:"msg-380",confidence:92,rationale:"Mara directly witnessed the exchange."},
  npcMemories:[{npc_key:mara.npc_key,memory_type:"episodic",content:"Elias accepted Mara's shelter but explicitly declined any reciprocal supernatural bargain.",subject_type:"character",subject_key:"elias-mercer",sentiment:1,importance:72,confidence:95,source_type:"witnessed",tags:["hospitality","boundary"]}],
  npcKnowledge:[{npc_key:mara.npc_key,knowledge_key:"mercer.hospitality.boundary",content:"Elias treats offered shelter as hospitality, not an automatic supernatural contract, unless terms are explicit.",belief_state:"known",confidence:90,source_type:"inferred",source_ref:"msg-380",is_secret:true}],
  npcGoals:[{npc_key:mara.npc_key,goal_key:"keep-mercer-trust",title:"Preserve Mercer trust",objective:"Avoid implying obligations that Elias did not knowingly accept.",horizon:"near",priority:75,progress:10,status:"active",dependencies:[],acceptable_methods:["plain language","explicit terms"],rationale:"The exchange clarified his boundary."}]
});
assert.equal(mutation.npcMemories.filter(x=>x.ok).length,1);
assert.equal(mutation.npcKnowledge.filter(x=>x.ok).length,1);
assert.equal(mutation.npcGoals.filter(x=>x.ok).length,1);
assert(db.listMutationLedger(guild,{mutationType:"npc_memory",limit:10}).some(x=>x.source_message_id==="msg-380"));

// Retrieval favors relevant memories and returns compact subjective state, not all campaign truth.
db.addNpcMemory(guild,{npcKey:mara.npc_key,memoryType:"episodic",content:"Mara bought ordinary coffee after a quiet shift.",importance:15,confidence:100,sourceType:"witnessed",sourceRef:"test",tags:["mundane"]});
const packet=retrieveNpcCognition(db,guild,{query:"Elias hospitality shelter contract obligation",maxNpcs:3,memoriesPerNpc:3,knowledgePerNpc:4,goalsPerNpc:3,recordRecall:true});
const maraPacket=packet.find(x=>x.npc_key===mara.npc_key);
assert(maraPacket,"Mara was not retrieved for relevant hospitality query");
assert(maraPacket.memories.some(m=>/shelter|reciprocal|hospitality/i.test(m.content)),"relevant hospitality memory was not retrieved");
assert(maraPacket.memories.length<=3,"memory retrieval exceeded requested compact limit");
assert(!JSON.stringify(maraPacket).includes("Nathan did not betray Mercer"),"objective GM fact leaked into NPC cognition packet");

// Mandatory post-turn review now accounts for cognition output.
const review={};
for(const category of ["facts_clues","resources","clocks","threads","references","relationships","handouts","canon","veil_exposure","npc_cognition"]){
  review[category]={decision:"no_change",reason:"No justified change.",confidence:100};
}
review.scene={decision:"continue",label:"",reason:"Same scene."};
const cognitionOutput={events:[],relationships:[],handouts:[],npc_memories:[{npc_key:mara.npc_key}],npc_knowledge:[],npc_goals:[],state_review:structuredClone(review)};
cognitionOutput.state_review.npc_cognition={decision:"changed",reason:"Mara directly witnessed a meaningful boundary.",confidence:92};
assert.equal(validatePostTurnStateReview(cognitionOutput),true);
assert.throws(()=>validatePostTurnStateReview({...cognitionOutput,npc_memories:[]}),/npc_cognition=changed/i);

// Cognition tables participate in logical snapshots/backups.
const snap=db.snapshotCampaign(guild,{label:"Cognition snapshot",reason:"test"});
assert((snap.state.tables.npc_profiles||[]).length>0);
assert((snap.state.tables.npc_memories||[]).length>0);
assert((snap.state.tables.npc_knowledge||[]).length>0);
assert((snap.state.tables.npc_goals||[]).length>0);
assert((snap.state.tables.seed_runs||[]).length===1);

assert(db.doctorData(guild).schemaVersion>=410);
db.close();
fs.rmSync(tmp,{recursive:true,force:true});
console.log("Veilkeeper v4.0.0 NPC cognition regression test: PASS");
