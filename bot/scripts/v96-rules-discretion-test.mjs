/** RULE01–04: bounded ordinary GM proposals reuse native arbitration, never fabricate powers or effects. */
import assert from "node:assert/strict";
import test from "node:test";
import {nativeFixture} from "./v9-fixtures.mjs";
import {captureWorldInput,configureWorldAuthority} from "../src/autonomous-world.js";
import {indexWorldEvent} from "../src/city-calendar.js";
import {currentScene} from "../src/scene-continuity.js";
import {applyAuthoritativeMutation} from "../src/state.js";
import {configureCityFlags} from "../src/city-core.js";
import {adjudicateGmRuling,gmRulingContext} from "../src/gm-action-ruling.js";
import {createHash} from "node:crypto";
import {GMService} from "../src/gm.js";
import {ContentIndex} from "../src/content.js";
import path from "node:path";
import {FakeResponses} from "./contract-fixtures.mjs";
import {POST_TURN_REVIEW_CATEGORIES} from "../src/director.js";
import {commitGmTurn} from "../src/turn-orchestration.js";
import {contributeRoll} from "../src/roll-collaboration.js";
import {rollRevision} from "../src/roll-requests.js";
import {adjudicateAcceptedIntent} from "../src/rules-arbitration.js";

function fixture(f,text="I improvise a distraction with the file cart.",{privateScene=false}={}){
  const pc=f.pcs[0],messageId=`v96-${createHash("sha256").update(text).digest("hex").slice(0,12)}`,scene=currentScene(f.db,f.guild);
  const scope={mode:privateScene?"private":"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,messageId,text,{privateScene});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,roll_collaboration:true}});
  const evidence=indexWorldEvent(f.db,f.guild,{key:"visible-cart",kind:"observation",title:"An accessible file cart",
    source_id:"human_gm",truth_status:"observed",visibility:privateScene?"character":"party",subject_key:privateScene?pc.id:null,
    location_key:"terminal",session_id:scene.session_id,
    scene:scene.key,details:{description:"A file cart stands within reach; the attendant may notice a disruption."}},"human_gm");
  const ruling={version:1,disposition:"standard_action_roll",context_refs:[evidence.event_key],
    capability:{kind:"mundane",ref:""},effect_class:"attempt_only",trait:"Finesse",difficulty:15,
    risk:"The attendant may notice.",stakes:"The diversion may fail and draw attention.",
    explanation:"Use ordinary physical improvisation; the roll cannot compel an NPC response.",
    difficulty_reason:"The visible cart is accessible, but the nearby attendant may notice the noise.",
    saved_ruling_key:"",override_refs:[],raw_refs:[],house_refs:[],homebrew_refs:[],modifier_keys:[]};
  const intent={type:"interact",source_span:text,target_name:"",target_key:"",destination:"unspecified",
    operation:"improvise_diversion",utterance:"",excluded_targets:[],framing:"immediate",resolution:"roll_required",
    reason:"Meaningful scene uncertainty.",gm_ruling:ruling};
  const result={narration:"The attempted diversion awaits a native roll.",player_intents:[intent],narrative_claims:[]};
  return {pc,messageId,scope,evidence,ruling,intent,result,run:()=>applyAuthoritativeMutation(f.db,{guildId:f.guild,
    sessionId:f.session.id,scope,narrative:result,provenance:{messageId}})};
}

test("RULE02 production mutation accepts a versioned mundane proposal and prepares one native roll",()=>nativeFixture(f=>{
  const x=fixture(f),before=f.db.getCharacter(x.pc.id).data.resources;
  x.run();
  const requests=f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true});
  assert.equal(requests.length,1);assert.equal(requests[0].status,"pending");
  assert.equal(requests[0].data.breakdown.difficulty,15);assert.equal(requests[0].data.breakdown.trait,"Finesse");
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);
  x.run();f.restart();x.run();
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,1);
  const rulings=f.db.listCityRecords(f.guild,{kind:"gm_action_ruling",includeGM:true});
  assert.equal(rulings.length,1);assert.equal(rulings[0].status,"roll_pending");
  assert.equal(rulings[0].data.rule_basis.kind,"RAW");
  assert.deepEqual(rulings[0].data.rule_basis.refs,["srd:action-rolls"]);
}));

test("RULE01 no-roll observation creates a zero-cost receipt, not hidden knowledge or material effects",()=>nativeFixture(f=>{
  const x=fixture(f,"I examine the visible label on the cart."),before=f.db.getCharacter(x.pc.id).data;
  Object.assign(x.ruling,{disposition:"narrative_no_roll",effect_class:"observation",trait:null,difficulty:null,
    risk:"none",stakes:"none",difficulty_reason:"No consequential uncertainty."});
  Object.assign(x.intent,{type:"observe",resolution:"auto"});x.result.narration="The established file cart is within reach.";
  x.run();x.run();
  const receipts=f.db.listCityRecords(f.guild,{kind:"action_outcome_receipt",includeGM:true});
  assert.equal(receipts.length,1);assert.equal(receipts[0].data.outcome,"resolved_no_roll");
  assert.deepEqual(receipts[0].data.state_mutations,[]);assert.deepEqual(receipts[0].data.native_roll_refs,[]);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data,before);
}));

test("RULE03/04 unsupported power, cost, material effect and invalid rules stay review, never roll",()=>nativeFixture(f=>{
  for(const [i,patch] of [
    {capability:{kind:"special",ref:"Shadow Tell"},effect_class:"special"},
    {effect_class:"resource"},{effect_class:"damage"},{effect_class:"custody"},
    {raw_refs:["srd:invented-magic"]},{raw_refs:["srd:reaction-rolls"]},
    {saved_ruling_key:"missing-special-rule"},{house_refs:["house:missing-special-rule"]}
  ].entries()){
    const x=fixture(f,i===0?"I send my shadow through the door to scout remotely.":`I attempt unsupported tactic ${i}.`);
    Object.assign(x.ruling,patch);x.result.narration="That effect needs scoped review; no effect is applied.";
    x.run();
    const rows=f.db.listCityRecords(f.guild,{kind:"gm_action_ruling",includeGM:true});
    assert.equal(rows[0].status,"needs_review");assert.equal(rows[0].visibility,"gm");
  }
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,0);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"action_outcome_receipt",includeGM:true}).length,0);
  assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.hope,2);
}));

test("RULE04 GM discretion is opt-in; a model cannot assert authority, evidence or owner",()=>nativeFixture(f=>{
  const x=fixture(f);
  configureCityFlags(f.db,f.guild,{gm_discretion:false},"gm");
  x.run();assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,0);
  const row=f.db.listCityRecords(f.guild,{kind:"gm_action_ruling",includeGM:true})[0];
  assert.equal(row.data.review_reason,"GM_DISCRETION_DISABLED");
  configureCityFlags(f.db,f.guild,{gm_discretion:true},"gm");
  assert.throws(()=>adjudicateGmRuling(f.db,f.guild,row.data.accepted_intent,{...x.ruling,gm:true},x.scope),/Closed/);
  assert.throws(()=>adjudicateGmRuling(f.db,f.guild,row.data.accepted_intent,x.ruling,
    {...x.scope,actorUserId:f.pcs[1].owner_user_id}),/owner|principal|controlled/);
}));

test("RULE04 current native scene evidence and publication audience must match, never player success",()=>nativeFixture(f=>{
  const x=fixture(f),scene=currentScene(f.db,f.guild);
  const secret=indexWorldEvent(f.db,f.guild,{key:"other-owner-secret",kind:"observation",title:"PRIVATE_MARKER",
    source_id:"human_gm",truth_status:"established",visibility:"character",subject_key:f.pcs[1].id,
    location_key:"terminal",session_id:scene.session_id,scene:scene.key,details:{}},"human_gm");
  assert(!JSON.stringify(gmRulingContext(f.db,f.guild,x.scope)).includes("PRIVATE_MARKER"));
  x.ruling.context_refs=[secret.event_key];x.run();
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,0);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"gm_action_ruling",includeGM:true})[0].data.review_reason,"CONTEXT_UNVERIFIED");
}));

test("RULE02 current-source replay cannot change terms or revive revoked permission",()=>nativeFixture(f=>{
  const x=fixture(f);x.run();
  const row=f.db.listCityRecords(f.guild,{kind:"gm_action_ruling",includeGM:true})[0];
  assert.throws(()=>adjudicateGmRuling(f.db,f.guild,row.data.accepted_intent,{...x.ruling,difficulty:5},x.scope),/revision|changed/);
  indexWorldEvent(f.db,f.guild,{key:x.evidence.event_key,status:"retracted"},"human_gm");
  assert.throws(()=>adjudicateGmRuling(f.db,f.guild,row.data.accepted_intent,x.ruling,x.scope),/context|evidence/);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,1);
}));

test("RULE01/02 combined GM generation previews then commits the exact pending request without another model call",()=>nativeFixture(async f=>{
  const x=fixture(f);
  const state_review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(key=>[key,
    {decision:"no_change",reason:"No category effect.",confidence:100}]));
  state_review.scene={decision:"continue",label:"",reason:"No transition.",confidence:100};
  const response={...x.result,respond:true,world_additions:[],scene_actions:[],world_conflicts:[],narrative_interpretation:null,
    context_memories:[],authored_candidates:null,gm_world_parts:[],private_messages:[],events:[],handouts:[],relationships:[],
    npc_memories:[],npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],ai_intents:[],decision_advisory:null,state_review};
  const ai=new FakeResponses([response]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve("../content")),ai,
    config:{gmModel:"offline",routineGmModel:"offline",maxRecentMessages:5,maxContentChunks:1}});
  const result=await gm.runTurn({guildId:f.guild,actorUserId:x.pc.owner_user_id,actorName:x.pc.name,messageId:x.messageId,
    actorAssignment:f.db.controlledAssignment(f.session.id,x.pc.owner_user_id),messageText:x.intent.source_span});
  assert.equal(ai.requests.length,1);assert.match(ai.requests[0].input,/visible-cart/);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,0,"Preview is rolled back.");
  const committed=commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope:x.scope,speaker:x.pc.name,
    label:"synthetic creative turn",meta:{messageId:x.messageId}});
  assert.equal(committed.gmRulings[0].status,"roll_pending");
  assert.equal(committed.reconciliation.actions[0].disposition,"roll_pending");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,1);
}));

test("RULE04 explicit saved-rule precedence and current revisions are native, not generic fallback",()=>nativeFixture(f=>{
  const x=fixture(f);
  f.db.upsertRulesRuling(f.guild,{key:"cart-distraction",question:"File cart distractions",ruling:"Use the agreed mundane action procedure.",createdBy:"gm"});
  x.ruling.saved_ruling_key="cart-distraction";x.run();
  const row=f.db.listCityRecords(f.guild,{kind:"gm_action_ruling",includeGM:true})[0];
  assert.equal(row.data.rule_basis.kind,"saved_ruling");
  f.db.db.prepare("UPDATE rules_rulings SET updated_at='changed-revision' WHERE guild_id=? AND ruling_key=?")
    .run(f.guild,"cart-distraction");
  assert.throws(()=>adjudicateGmRuling(f.db,f.guild,row.data.accepted_intent,x.ruling,x.scope),/rule revision changed/);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,1);
}));

test("RULE03 PC conflict and revoked owner sources cannot use ordinary discretion",()=>nativeFixture(f=>{
  const x=fixture(f),a=f.accepted(0,"I attempt a harmless shin tap.");
  assert.throws(()=>adjudicateGmRuling(f.db,f.guild,a.record_key,x.ruling,x.scope),/bilateral PvP/);
  x.run();const row=f.db.listCityRecords(f.guild,{kind:"gm_action_ruling",includeGM:true})[0];
  const action=f.db.getCityRecord(f.guild,"typed_intent",row.data.accepted_intent);
  indexWorldEvent(f.db,f.guild,{key:action.source_event,status:"retracted"},"human_gm");
  assert.throws(()=>adjudicateGmRuling(f.db,f.guild,row.data.accepted_intent,x.ruling,x.scope),/stale/);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,2);
}));

test("RULE04 private grounding prepares owner-only options and cannot replay into party scope",()=>nativeFixture(f=>{
  const x=fixture(f,"I improvise a private distraction.",{privateScene:true});x.run();
  const q=f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true})[0];
  assert.equal(q.visibility,"character");assert.equal(q.subject_key,x.pc.id);
  assert.equal(gmRulingContext(f.db,f.guild,{...x.scope,mode:"party"}).evidence.length,0);
  const row=f.db.listCityRecords(f.guild,{kind:"gm_action_ruling",includeGM:true})[0];
  assert.throws(()=>adjudicateGmRuling(f.db,f.guild,row.data.accepted_intent,x.ruling,{...x.scope,mode:"party"}),/audience/);
}));

test("RULE04 scene changes invalidate new execution without rewriting saved requests",()=>nativeFixture(f=>{
  const x=fixture(f);x.run();const row=f.db.listCityRecords(f.guild,{kind:"gm_action_ruling",includeGM:true})[0];
  f.db.setDirectorState(f.session.id,{scene_number:2});
  assert.throws(()=>adjudicateGmRuling(f.db,f.guild,row.data.accepted_intent,x.ruling,x.scope),/stale/);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,1);
}));

test("RULE04 ruling context revalidates before owner dice or optional spends",()=>nativeFixture(f=>{
  const x=fixture(f);x.run();const q=f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true})[0];
  indexWorldEvent(f.db,f.guild,{key:x.evidence.event_key,status:"retracted"},"human_gm");
  const before=f.db.getCharacter(x.pc.id).data.resources;let sampled=0;
  assert.throws(()=>contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:"roll",request:q.record_key,
    expected_revision:rollRevision(q),key:"stale-context"},{rng:()=>{sampled++;return 12;}}),/context|evidence/);
  assert.equal(sampled,0);assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);
}));

test("RULE04 native missing-trait review remains a native request, not an unsupported-capability hold",()=>nativeFixture(f=>{
  const x=fixture(f);f.db.updateCharacterData(x.pc.id,data=>{delete data.traits.Finesse;});
  x.run();x.run();
  const row=f.db.listCityRecords(f.guild,{kind:"gm_action_ruling",includeGM:true})[0];
  assert.equal(row.status,"needs_review");assert.equal(row.data.review_reason,null);
  assert.equal(f.db.getCityRecord(f.guild,"typed_intent",row.data.accepted_intent).data.resolution,"roll_required");
  assert.equal(f.db.getCityRecord(f.guild,"roll_request",row.data.adjudication.roll_request_ref).status,"needs_review");
}));

test("RULE04 manual GM authority overrides the opt-in proposal flag",()=>nativeFixture(f=>{
  const x=fixture(f);configureWorldAuthority(f.db,f.guild,{gm_authority_mode:"manual"},"gm");x.run();
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,0);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"gm_action_ruling",includeGM:true})[0].data.review_reason,"MANUAL_GM_AUTHORITY");
}));

test("RULE04 saved-rule content changes invalidate execution even with the exact same timestamp",()=>nativeFixture(f=>{
  const x=fixture(f);
  f.db.upsertRulesRuling(f.guild,{key:"cart-distraction",question:"File cart distractions",ruling:"Use the ordinary action procedure.",createdBy:"gm"});
  x.ruling.saved_ruling_key="cart-distraction";x.run();
  const q=f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true})[0];
  const timestamp=f.db.getRulesRuling(f.guild,"cart-distraction").updated_at;
  f.db.db.prepare("UPDATE rules_rulings SET ruling=? WHERE guild_id=? AND ruling_key=?")
    .run("This scoped procedure now requires review.",f.guild,"cart-distraction");
  assert.equal(f.db.getRulesRuling(f.guild,"cart-distraction").updated_at,timestamp);
  let sampled=0;
  assert.throws(()=>contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:"roll",request:q.record_key,
    expected_revision:rollRevision(q),key:"same-timestamp-rule-change"},{rng:()=>{sampled++;return 12;}}),/rule revision changed/);
  assert.equal(sampled,0);
}));

test("RULE04 old native completion is history, not authority to mint a new ruling interpretation",()=>nativeFixture(f=>{
  const x=fixture(f),a=f.accepted(0,"I examine the visible label.","",{type:"observe",
    target:{kind:"unknown",key:"",phrase:"",grounding:"unknown"}});
  const old=adjudicateAcceptedIntent(f.db,f.guild,{acceptedIntent:a.record_key,mode:"no_roll",risk:"none",stakes:"none",
    rawRefs:["srd:action-rolls"],explanation:"An established visible label, zero effects."},"ai_gm",{scope:x.scope});
  const candidate={...x.ruling,disposition:"narrative_no_roll",effect_class:"observation",trait:null,difficulty:null,risk:"none",stakes:"none"};
  assert.throws(()=>adjudicateGmRuling(f.db,f.guild,a.record_key,candidate,x.scope),/Historical|historical/);
  assert.equal(f.db.getCityRecord(f.guild,"typed_intent",a.record_key).data.outcome_receipt,old.receipts[0]);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"gm_action_ruling",includeGM:true}).length,0);
}));

test("RULE04 an existing native request is not silently adopted into different ruling terms",()=>nativeFixture(f=>{
  const x=fixture(f),a=f.accepted(0,"I attempt a mundane diversion.","",{type:"interact",
    target:{kind:"unknown",key:"",phrase:"",grounding:"unknown"}});
  const old=adjudicateAcceptedIntent(f.db,f.guild,{acceptedIntent:a.record_key,mode:"roll_required",trait:"Finesse",kind:"action",
    difficulty:12,risk:"Detection",stakes:"The diversion fails.",rawRefs:["srd:action-rolls"],
    explanation:"Existing native action adjudication."},"ai_gm",{scope:x.scope});
  assert.throws(()=>adjudicateGmRuling(f.db,f.guild,a.record_key,x.ruling,x.scope),/Historical|historical/);
  const request=f.db.getCityRecord(f.guild,"roll_request",old.roll_request_ref);
  assert.equal(request.data.breakdown.difficulty,12);assert.equal(request.data.input.gm_ruling,undefined);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"gm_action_ruling",includeGM:true}).length,0);
}));
