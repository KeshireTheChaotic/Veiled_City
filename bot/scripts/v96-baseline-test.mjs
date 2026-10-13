/** BASE01–02: actual native baseline and synthetic model counts, never live-model quality claims. */
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import {nativeFixture} from "./v9-fixtures.mjs";
import {V96_CORPUS,V96_RUBRIC} from "./v96-corpus.mjs";
import {adjudicateAcceptedIntent,selectRuleBasis} from "../src/rules-arbitration.js";
import {configureCityFlags} from "../src/city-core.js";
import {GMService} from "../src/gm.js";
import {ContentIndex} from "../src/content.js";
import {FakeResponses} from "./contract-fixtures.mjs";
import {OperationalMetrics} from "../src/operational-metrics.js";
import {captureWorldInput} from "../src/autonomous-world.js";
import {POST_TURN_REVIEW_CATEGORIES} from "../src/director.js";

test("BASE02 reused four-owner corpus binds each immediate intent without granting effects",()=>nativeFixture(f=>{
  const resources=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  for(const c of V96_CORPUS){
    assert.deepEqual(Object.keys(c.rubric),V96_RUBRIC,c.id);
    const accept=()=>f.accepted(c.actor,c.text,f.pcs[1].id,{type:c.type,framing:c.framing,
      operation:c.id,target:c.target||{kind:"character",key:f.pcs[1].id,phrase:"Choso",grounding:"known"}});
    if(c.framing!=="immediate"){assert.throws(accept,/Only immediate framing/,c.id);continue;}
    const row=accept(),source=f.db.getWorldEvent(f.guild,row.source_event);
    assert.equal(source.details.raw_text,c.text);assert.equal(row.data.source_span,c.text);
    assert.equal(row.data.actor,f.pcs[c.actor].id);assert.equal(row.status,"accepted_for_adjudication");
    assert.equal(row.data.outcome_receipt,null);
  }
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),resources);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,0);
}));

test("BASE01 current generic RAW action creates one native pending request, not a new capability",()=>nativeFixture(f=>{
  configureCityFlags(f.db,f.guild,{roll_requests:true,roll_collaboration:true},"gm");
  const c=V96_CORPUS.find(c=>c.id==="improvised"),pc=f.pcs[c.actor];
  const accepted=f.accepted(c.actor,c.text,"",{type:c.type,operation:c.id,target:c.target});
  const before=f.db.getCharacter(pc.id).data.resources,scope={mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  const input={acceptedIntent:accepted.record_key,mode:"roll_required",rawRefs:["srd:action-rolls"],trait:"Finesse",
    kind:"action",difficulty:15,risk:"The distraction may fail.",stakes:"The attempt draws attention.",
    explanation:"Synthetic existing mundane scene pressure; a roll does not authorize an NPC reaction."};
  const result=adjudicateAcceptedIntent(f.db,f.guild,input,"ai_gm",{scope});
  assert.equal(result.disposition,"roll_pending");assert.equal(result.rule_basis.kind,"RAW");
  assert.equal(adjudicateAcceptedIntent(f.db,f.guild,input,"ai_gm",{scope}).roll_request_ref,result.roll_request_ref);
  assert.deepEqual(f.db.getCharacter(pc.id).data.resources,before);
  assert.deepEqual(selectRuleBasis(f.db,f.guild,{rawRefs:["srd:invented-magic"]}).kind,"provisional");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,1);
}));

test("BASE01 one actual combined GM turn uses one injected request and records unknown usage honestly",()=>nativeFixture(async f=>{
  const c=V96_CORPUS.find(c=>c.id==="reflective"),pc=f.pcs[c.actor],messageId="v96-baseline-gm";
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,messageId,c.text);
  const state_review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(key=>[key,
    {decision:"no_change",reason:"No mutation proposed.",confidence:100}]));
  state_review.scene={decision:"continue",label:"",reason:"No scene change.",confidence:100};
  const response={respond:true,narration:"What kind of work would you like to look for?",world_additions:[],
    scene_actions:[],world_conflicts:[],narrative_interpretation:null,player_intents:[{type:"speak",source_span:c.text,
      target_name:"",target_key:"",destination:"unspecified",operation:"reflect",utterance:c.text,excluded_targets:[],
      framing:"immediate",resolution:"conversational",reason:"An open invitation, not a commitment."}],context_memories:[],
    authored_candidates:null,narrative_claims:[],gm_world_parts:[],private_messages:[],events:[],handouts:[],relationships:[],
    npc_memories:[],npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],ai_intents:[],decision_advisory:null,state_review};
  const ai=new FakeResponses([response]),metrics=new OperationalMetrics();
  const gm=new GMService({db:f.db,content:new ContentIndex(path.resolve("../content")),ai,metrics,
    config:{gmModel:"offline",routineGmModel:"offline",maxRecentMessages:5,maxContentChunks:1,contextInputBudget:100000}});
  const result=await gm.runTurn({guildId:f.guild,actorUserId:pc.owner_user_id,actorName:pc.name,
    actorAssignment:f.db.controlledAssignment(f.session.id,pc.owner_user_id),messageText:c.text,messageId});
  assert.match(result.narration,/What kind of work/);assert.equal(ai.requests.length,1);
  const usage=metrics.snapshot(f.guild).stages.model_request;
  assert.equal(usage.count,1);assert.equal(usage.usage_unknown,1);assert.equal(usage.usage_reported,0);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,0);
  console.log(JSON.stringify({baseline:"injected_combined_gm",requests:usage.count,usage_unknown:usage.usage_unknown,
    prompt_characters:ai.requests[0].input.length,request_latency_ms:usage.latency_ms,
    gm_latency_ms:metrics.snapshot(f.guild).stages.gm.latency_ms,live_requests:0,billable_tokens:0}));
}));

test("BASE01 source registry and authority contracts remain separately mandatory",()=>{
  const registry=fs.readFileSync(new URL("./validate-offline.mjs",import.meta.url),"utf8");
  for(const name of ["v96-baseline-test","v95-deprecation-coverage-test","d08-window-security-test","d08-observability-test"])
    assert(registry.includes(`"${name}"`),name);
  const corpus=V96_CORPUS.map(c=>c.id);assert.equal(new Set(corpus).size,15);
  assert.equal(new Set(V96_CORPUS.map(c=>c.actor)).size,4);
});
