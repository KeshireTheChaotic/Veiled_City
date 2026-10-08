/** Whole-request budgeting regression: native transcripts, real GM assembly and synthetic provider retries only. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { budgetTurnPrompt } from "../src/prompt-budget.js";
import { GMService } from "../src/gm.js";
import { VeiledDB } from "../src/db.js";
import { ContentIndex } from "../src/content.js";
import { configureCityFlags } from "../src/city-core.js";
import { FakeResponses } from "./contract-fixtures.mjs";
import { POST_TURN_REVIEW_CATEGORIES } from "../src/director.js";

const core={label:"AUTHORITY",value:{consent:false,source:"native"},required:true};
const rows=Array.from({length:40},(_,id)=>({id,text:(id===0?"lighthouse clue ":"ordinary ")+"x".repeat(1000),source:`source:${id}`}));
const selected=budgetTurnPrompt([core,{label:"HISTORY",value:rows}],{query:"lighthouse",maxChars:12000,reserveChars:1000});
assert(selected.metrics.compacted);assert(selected.input.includes(JSON.stringify(rows[0])));
assert(selected.input.length<=11000);assert(selected.input.includes('"consent":false'));
const retained=JSON.parse(selected.input.split("HISTORY:\n")[1].split("\n\nCONTEXT BUDGET")[0]);
assert(retained.length<40);for(const row of retained) assert.deepEqual(row,rows[row.id]);
assert.equal(selected.input,budgetTurnPrompt([core,{label:"HISTORY",value:rows}],{query:"lighthouse",maxChars:12000,reserveChars:1000}).input);
const small=budgetTurnPrompt([core,{label:"EMPTY",value:[]}]);assert.equal(small.metrics.compacted,false);
assert.throws(()=>budgetTurnPrompt([{...core,value:"x".repeat(120000)}]),/Mandatory turn context/);
const skip=budgetTurnPrompt([core,{label:"HUGE",value:[{body:"x".repeat(200000)}]},{label:"SMALL",value:[{body:"intact"}]}]);
assert(skip.input.includes('"body":"intact"'));assert(!skip.input.includes("x".repeat(1000)));
const escaped=budgetTurnPrompt([core,{label:"QUOTES",value:Array(100).fill('"\\\n'.repeat(1000))}],{maxChars:12000,reserveChars:1000});
assert(escaped.input.length<=11000,"Array string escaping counts toward the actual serialized budget");

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-prompt-budget-"));
const db=new VeiledDB(path.join(temp,"test.sqlite"),path.resolve("sql/schema.sql"));
try{
  const guild="budget";db.ensureCampaign(guild);const session=db.startSession(guild,"Lighthouse");
  db.upsertPlayer(guild,"owner","Owner");db.upsertPlayer(guild,"other","Other");
  const pc=db.createCharacter(guild,"owner","Actual PC",{traits:{Knowledge:2},resources:{hope:3}});
  db.assignCharacter(session.id,"owner",pc.id);db.setPresence(session.id,"owner","present");
  db.proposeCanon(guild,{key:"location.lighthouse.fixed",value:"NATIVE CANON PRESERVED",visibility:"gm",sourceType:"gm"});
  db.upsertRulesRuling(guild,{key:"lighthouse",question:"lighthouse safety",ruling:"HUMAN RULING PRESERVED",createdBy:"gm"});
  for(let i=0;i<170;i++) db.addMessage({guildId:guild,sessionId:session.id,messageId:`history-${i}`,userId:"owner",
    speakerName:"Owner",characterId:pc.id,visibility:"party",content:`History ${i} `+"old testimony ".repeat(120)});
  db.addMessage({guildId:guild,sessionId:session.id,messageId:"other-secret",userId:"other",subjectUserId:"other",
    speakerName:"Other",visibility:"player",content:"FOREIGN_PRIVATE_TRANSCRIPT"});
  const review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(key=>[key,{decision:"no_change",reason:"No mutation",confidence:100}]));
  review.scene={decision:"continue",label:"",reason:"Same scene"};
  const base={respond:true,narration:"The room remains quiet.",narrative_claims:[],private_messages:[],events:[],handouts:[],relationships:[],
    npc_memories:[],npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],ai_intents:[],state_review:review};
  for(const adaptive_context of [false,true]) for(const scope of ["party","private"]){
    configureCityFlags(db,guild,{adaptive_context});
    const fake=new FakeResponses(["{malformed",{...base,state_review:{}},base]);
    const gm=new GMService({db,content:new ContentIndex(path.resolve("../content")),ai:fake,
      config:{gmModel:"offline",maxRecentMessages:200,maxContentChunks:8}});
    const before=db.db.prepare("SELECT total_changes() n").get().n;
    const text="I examine the lighthouse. AUTHORED_INPUT_PRESERVED";
    await gm.runTurn({guildId:guild,actorUserId:"owner",actorName:"Owner",messageText:text,scope});
    assert.equal(fake.requests.length,3,"Both structured parsing and state-review retries exercised");
    for(const req of fake.requests){
      assert(req.input.length+req.instructions.length<120000,"Instructions, turn input and retry/intent text fit the total budget");
      assert(req.input.includes(text));assert(req.input.includes("HUMAN RULING PRESERVED"));
      assert(req.input.includes("NATIVE CANON PRESERVED"));assert(req.input.includes("CURRENT COMBATANTS"));
      assert(req.input.includes("CONTEXT BUDGET"));assert(!req.input.includes("FOREIGN_PRIVATE_TRANSCRIPT"));
      assert(req.input.includes(`scope=${scope}`));
    }
    assert.equal(db.db.prepare("SELECT total_changes() n").get().n,before,"Compaction/retries do not mutate campaign state");
    const failing=new FakeResponses([]);gm.ai=failing;
    await assert.rejects(()=>gm.runTurn({guildId:guild,actorUserId:"owner",actorName:"Owner",messageText:"x".repeat(130000),scope}),/Mandatory turn context/);
    assert.equal(failing.requests.length,0,"Oversized mandatory input fails before provider calls");
  }
  console.log("Prompt budget PASS: oversized native transcripts; all flag/scope paths; whole records, authority/input/rulings, private isolation; parse/state retries bounded; no writes or live calls.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
