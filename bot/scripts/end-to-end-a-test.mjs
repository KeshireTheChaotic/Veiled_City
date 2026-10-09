/** Governed AI output crosses the real model/commit boundary; all providers are synthetic and network is denied. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { GMService } from "../src/gm.js";
import { FakeResponses, fakeInteraction } from "./contract-fixtures.mjs";
import { applyAuthoritativeMutation } from "../src/state.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { configureDelegation, delegationPolicy, stateRevision, reviewAiIntent } from "../src/ai-intents.js";
import { validateIntent } from "../src/ai-intent-contracts.js";
import { handleStoryCommand } from "../src/story-commands.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-end-to-end-a-")),file=path.join(temp,"test.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const guild="contract";db.ensureCampaign(guild);
  db.upsertNpcProfile(guild,{npcKey:"witness",displayName:"Witness"});
  db.setSimulationEntity(guild,"npc","witness",{location_key:"station"});
  indexWorldEvent(db,guild,{key:"source",title:"Recorded cable damage",source_id:"gm",location_key:"station"});
  db.upsertNpcKnowledge(guild,{npcKey:"witness",knowledgeKey:"cable",content:"Cable damaged",sourceRef:"source",confidence:85});
  const payload={actor_type:"npc",actor_key:"witness",information_key:"cable",source_event:"source",op:"propose",goal_key:"inspect",
    new_goal_key:"",objective:"Inspect cable",reason:"Owned evidence",priority:50,confidence:85,horizon:"near",dependencies:[],acceptable_methods:["observe"],conflicts:[]};
  const intent={version:1,feature:"goal",target_key:"",expected_revision:"absent",policy_revision:0,source_prerequisites:[],payload};
  assert(validateIntent(intent));assert(!validateIntent({...intent,payload:{...payload,gm:true}}));
  const commit=(value,origin="message")=>{
    const narrative={narration:"The witness intends to inspect the cable.",narrative_claims:[],ai_intents:[value]};
    const result=applyAuthoritativeMutation(db,{guildId:guild,narrative,provenance:{messageId:origin}});
    assert.equal(narrative.narration,"The witness intends to inspect the cable.","Nonbinding prose is retained; actual effects are checked separately");return result.intents[0];
  };
  assert.equal(commit(intent).status,"blocked");assert.equal(db.listNpcGoals(guild,"witness").length,0);
  configureCityFlags(db,guild,{emergent_goals:true});
  configureDelegation(db,guild,{mode:"suggest_only",allow:[],max_operations:1,max_cost:0,expires_minute:null},"gm");
  const suggestion={...intent,policy_revision:1};const pending=commit(suggestion);
  assert.equal(pending.status,"pending");assert.equal(db.listNpcGoals(guild,"witness").length,0);
  assert.equal(commit(suggestion).record_key,pending.record_key);
  await assert.rejects(()=>handleStoryCommand(fakeInteraction({gm:false,sub:"delegation"}),{db}),/GM\/admin/);
  configureDelegation(db,guild,{mode:"routine_delegated",allow:["goal.propose"],max_operations:1,max_cost:0,expires_minute:100},"gm");
  assert.throws(()=>reviewAiIntent(db,guild,{key:pending.record_key,decision:"approve",expected_revision:stateRevision(pending)},"gm"),/Policy changed/);
  const delegated={...intent,policy_revision:2};
  const fake=new FakeResponses([{ai_intents:[delegated]}]);
  const gm=new GMService({db,content:{},config:{},ai:fake});
  const parsed=await gm.requestStructured({input:"fixture",text:{format:{schema:{properties:{ai_intents:{}}}}}});
  const accepted=commit(parsed.ai_intents[0]);assert.equal(accepted.status,"accepted",accepted.data.diagnostic);
  assert.equal(db.getNpcGoal(guild,"witness","inspect").status,"active");assert.equal(fake.requests.length,1);
  assert(fake.requests[0].input.includes("Optional ai_intents"));
  db.close();db=new VeiledDB(file,schema);assert.equal(commit(delegated).record_key,accepted.record_key);
  assert.equal(db.listNpcGoals(guild,"witness").length,1);
  assert.equal(commit({...delegated,payload:{...payload,goal_key:"forged",reviewed_by:"gm"}},"attack").status,"blocked");
  assert.equal(commit({...delegated,expected_revision:"not-current",payload:{...payload,goal_key:"stale"}},"stale").status,"blocked");
  assert.equal(commit({...delegated,payload:{...payload,goal_key:"private"}},"private").status,"accepted");
  const privateResult=applyAuthoritativeMutation(db,{guildId:guild,aiIntents:[{...delegated,payload:{...payload,goal_key:"shared"}}],
    scope:{mode:"private",actorUserId:"owner"},provenance:{messageId:"private-scope"}});
  assert.equal(privateResult.intents[0].status,"blocked");
  assert.equal(delegationPolicy(db,guild).revision,2);
  console.log("End-to-end A PASS: closed intents, authenticated configuration, suggest-only, native commit, replay/restart, stale revisions, privacy; zero paid calls.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
