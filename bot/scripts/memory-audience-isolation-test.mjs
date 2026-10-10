/** T05a red/green security target: memory keeps the exact supporting audience. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { captureWorldInput } from "../src/autonomous-world.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { contextMemoriesForScope, persistentMemories, saveContextMemories } from "../src/context-memory.js";

const privateOnly={
  narration:"Rain ticks against the diner window.",
  player_intents:[],
  context_memories:[{
    kind:"detail",
    key:"morrow-locker-code",
    name:"Morrow locker code",
    summary:"Morrow's locker code is 3141.",
    retention:"durable"
  }],
  private_messages:[{
    discord_user_id:"player-a",
    content:"Only you notice the Morrow locker code: 3141."
  }]
};

assert.deepEqual(
  persistentMemories(privateOnly,"I watch the rain."),
  [],
  "a private-message-only detail must not qualify for party-scoped persistence"
);

console.log("T05a memory audience isolation PASS: private output cannot promote party memory.");

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-memory-audience-"));
const db=new VeiledDB(path.join(temp,"fixture.sqlite"),path.resolve("sql/schema.sql"));
const guild="memory-audience-fixture";
try{
  db.ensureCampaign(guild);
  const session=db.startSession(guild,"Audience isolation");
  db.upsertPlayer(guild,"player-a","Player A");
  db.upsertPlayer(guild,"player-b","Player B");
  const a=db.createCharacter(guild,"player-a","Aster",{});
  const alternate=db.createCharacter(guild,"player-a","Aster Alternate",{});
  const b=db.createCharacter(guild,"player-b","Briar",{});
  db.assignCharacter(session.id,"player-a",a.id);
  db.assignCharacter(session.id,"player-b",b.id);
  db.setPresence(session.id,"player-a","present");
  db.setPresence(session.id,"player-b","present");
  captureWorldInput(db,guild,"player-a",a.id,"audience-turn","I watch the rain.");

  const result={
    narration:"Everyone can read the Brass Menu beside the counter.",
    player_intents:[],
    context_memories:[
      {kind:"object",key:"brass-menu",name:"Brass Menu",summary:"The Brass Menu is shared.",retention:"durable"},
      {kind:"detail",key:"morrow-locker-code",name:"Morrow locker code",summary:"Morrow's code is 3141 and Aster is a traitor.",retention:"durable"},
      {kind:"detail",key:"blue-token",name:"Blue Token",summary:"The Blue Token opens the hidden vault.",retention:"durable"}
    ],
    private_messages:[
      {discord_user_id:"player-a",content:"Only Aster notices the Morrow locker code: 3141."},
      {discord_user_id:"player-b",content:"Only Briar notices the Blue Token under the third stool."}
    ]
  };
  const saved=saveContextMemories(db,guild,result,{mode:"party",actorUserId:"player-a",actorCharacterId:a.id},
    {messageId:"audience-turn"});
  assert.equal(saved.length,3);
  assert.equal(saved.filter(row=>row.visibility==="party").length,1,"only shared narration may create party memory");

  db.saveCityRecord(guild,{kind:"context_memory",key:"legacy-broad-secret",source_event:saved[0].source_event,
    visibility:"party",data:{kind:"detail",key:"legacy-secret",name:"Legacy Secret",summary:"must remain unavailable"}});

  const names=scope=>contextMemoriesForScope(db,guild,scope).map(row=>row.name).sort();
  assert.deepEqual(names({mode:"party",actorUserId:"player-a",actorCharacterId:a.id}),["Brass Menu"],
    "party generation must not retrieve even the acting character's private memory");
  assert.deepEqual(names({mode:"private",actorUserId:"player-a",actorCharacterId:a.id}),["Brass Menu","Morrow locker code"]);
  assert.deepEqual(names({mode:"private",actorUserId:"player-b",actorCharacterId:b.id}),["Blue Token","Brass Menu"]);
  assert.deepEqual(names({mode:"private",actorUserId:"player-a",actorCharacterId:alternate.id}),["Brass Menu"],
    "character-private memory must not follow the human into another character");

  const aMemories=contextMemoriesForScope(db,guild,{mode:"private",actorUserId:"player-a",actorCharacterId:a.id});
  assert(!aMemories.some(row=>row.summary.includes("traitor")),"model summary text cannot cross-contaminate a supported surface");
  const bMemories=contextMemoriesForScope(db,guild,{mode:"private",actorUserId:"player-b",actorCharacterId:b.id});
  assert(!bMemories.some(row=>row.summary.includes("vault")),"saved summary must be the audience-visible supporting excerpt");
  captureWorldInput(db,guild,"player-a",a.id,"private-turn","I listen alone.",{privateScene:true});
  const blocked=saveContextMemories(db,guild,{narration:"",player_intents:[],context_memories:[
    {kind:"detail",key:"wrong-recipient",name:"Wrong Recipient",summary:"Must not persist.",retention:"durable"}
  ],private_messages:[{discord_user_id:"player-b",content:"Wrong Recipient"}]},
  {mode:"private",actorUserId:"player-a",actorCharacterId:a.id},{messageId:"private-turn"});
  assert.deepEqual(blocked,[],"private-scene output addressed to another player must not persist before delivery rejects it");
  assert(!db.listNpcMemories(guild,"any-npc",{limit:20}).length,"context memory must not create NPC witness knowledge");
  indexWorldEvent(db,guild,{key:saved[0].source_event,status:"retracted"});
  assert.deepEqual(names({mode:"private",actorUserId:"player-b",actorCharacterId:b.id}),[],
    "retracted source ancestry must remove every derived memory from retrieval");
}finally{
  db.close();
  fs.rmSync(temp,{recursive:true,force:true});
}

console.log("T05a scoped persistence PASS: party/private surfaces, cross-character reads, summaries, legacy rows, and NPC isolation.");
