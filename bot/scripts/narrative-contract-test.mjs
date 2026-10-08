/** Synthetic production contracts: no player recordings, network or paid clients. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { GMService } from "../src/gm.js";
import { ContentIndex } from "../src/content.js";
import { POST_TURN_REVIEW_CATEGORIES } from "../src/director.js";
import { validateNarrativeClaims } from "../src/narrative-integrity.js";
import { handleCityCommand } from "../src/city-commands.js";
import { KeyedSerialQueue } from "../src/serial-queue.js";
import { FakeResponses, fakeInteraction } from "./contract-fixtures.mjs";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-contract-"));
const db=new VeiledDB(path.join(temp,"test.sqlite"),path.resolve("sql/schema.sql"));
try{
  const guild="contract";db.ensureCampaign(guild);db.ensureCampaign("other");db.upsertPlayer(guild,"owner","Owner");
  const pc=db.createCharacter(guild,"owner","Tester",{});
  db.upsertNpcProfile(guild,{npcKey:"witness",displayName:"Witness"});
  db.setSimulationEntity(guild,"npc","witness",{location_key:"station",status:"active"});
  const secret=db.getFact(guild,db.addFact(guild,{content:"SYNTHETIC_SECRET",visibility:"gm"}));
  const base={actor:"",entity_type:"character",entity:pc.id,action:"damage",prior:"0",proposed:"-2",visibility:"party",
    source_ref:"",source_span:"You suffer 2 damage",mutation_index:-1,certainty:"committed"};
  const check=claim=>validateNarrativeClaims(db,guild,{narration:claim.source_span,narrative_claims:[claim]});
  for(const c of [base,{...base,entity_type:"npc",entity:"witness",action:"movement",proposed:"remote",source_span:"Witness teleports"},
    {...base,action:"disclosure",source_ref:secret.id,proposed:secret.content,source_span:"The secret is revealed"},
    {...base,action:"obligation",source_ref:"forged",proposed:"You owe a favor",source_span:"You are now bound"},
    {...base,action:"dice",source_span:"You rolled a 20"}]) assert.throws(()=>check(c),/Narrative integrity/);
  db.setSimulationEntity(guild,"npc","witness",{status:"removed"});
  assert.throws(()=>check({...base,entity_type:"npc",entity:"witness",action:"status",proposed:"active",source_span:"Witness returns active"}),/actor_status/);
  for(const [certainty,span] of [["dialogue","Witness says you owe a favor"],["uncertain","You hallucinate that the wall moves"],
    ["rumor","Rumor claims the bridge fell"],["forecast","The roof might collapse"],["metaphor","The fog is like a curtain"],
    ["intent","Witness intends to leave"]]) check({...base,action:"movement",certainty,source_span:span});
  assert.throws(()=>validateNarrativeClaims(db,guild,{narration:"You suffer 2 damage",narrative_claims:[]}),/undeclared/);
  let seed=450;for(let i=0;i<150;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const visibility=["public","party","gm","player","character"][seed%5];
    const row=db.getFact(guild,db.addFact(guild,{content:`synthetic-${i}`,visibility,subjectUserId:"owner",subjectCharacterId:pc.id}));
    assert.equal(db.playerFactsFor(guild,"stranger",{limit:300}).some(f=>f.id===row.id),["public","party"].includes(visibility));
    assert(!db.playerFactsFor("other","owner",{characterId:pc.id}).some(f=>f.id===row.id));
  }
  const content=new ContentIndex(path.resolve("../content"));
  const review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(key=>[key,{decision:"no_change",reason:"No mutation",confidence:100}]));
  review.scene={decision:"continue",label:"",reason:"Same scene"};
  const turn={respond:true,narration:"Rain patters against the window.",narrative_claims:[],private_messages:[],events:[],handouts:[],relationships:[],
    npc_memories:[],npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],state_review:review};
  const fake=new FakeResponses(["{",turn,{respond:false,reason:"Player-to-player dialogue"}]);
  const gm=new GMService({db,content,ai:fake,config:{gmModel:"offline",routerModel:"offline",maxRecentMessages:8,maxContentChunks:2}});
  assert.equal((await gm.runTurn({guildId:guild,actorUserId:"owner",actorName:"Tester",messageText:"What is outside?"})).narration,turn.narration);
  assert.equal(fake.requests.length,2);assert(fake.requests[0].text.format.schema.required.includes("narrative_claims"));
  assert.equal(await gm.shouldRespond({guildId:guild,mode:"active",message:{content:"We discuss our plan",author:{username:"Tester"}}}),false);
  const broken=new FakeResponses(["{","{"]);
  await assert.rejects(()=>new GMService({db,content,ai:broken,config:{}}).requestStructured({input:"synthetic",max_output_tokens:20}),/after 2 attempts/);
  assert.equal(broken.requests.length,2);
  const interaction=fakeInteraction();await handleCityCommand(interaction,{db,gm});assert(interaction.deliveries[0].ephemeral);
  await assert.rejects(()=>handleCityCommand(fakeInteraction({gm:false}),{db,gm}),/GM\/admin/);
  const queue=new KeyedSerialQueue(),order=[];
  await Promise.all([queue.enqueue(guild,async()=>{order.push(1);}),queue.enqueue(guild,()=>{order.push(2);})]);assert.deepEqual(order,[1,2]);
  await assert.rejects(()=>fetch("https://api.openai.com/v1/responses"),/OFFLINE_NETWORK_FORBIDDEN/);
  console.log("Narrative/service contracts PASS: seed 450; 150 privacy cases; bounded retries; mock Discord; zero outbound requests.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
