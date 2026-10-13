/** HOLD01–03: unsupported attempts stay source-bound review; native siblings and owner choices survive. */
import assert from "node:assert/strict";
import test from "node:test";
import {nativeFixture} from "./v9-fixtures.mjs";
import {actionFixture} from "./v96-action-fixture.mjs";
import {windowOperation} from "../src/window-coordinator.js";
import {cityContext} from "../src/city-core.js";
import {indexWorldEvent} from "../src/city-calendar.js";
import {handleCommand} from "../src/commands.js";
import {adjudicateGmRuling} from "../src/gm-action-ruling.js";
import {prepareRollRequest} from "../src/roll-requests.js";
import {adjudicateAcceptedIntent} from "../src/rules-arbitration.js";
import {contributeRoll} from "../src/roll-collaboration.js";
import {rollRevision} from "../src/roll-requests.js";
import {captureWorldInput} from "../src/autonomous-world.js";
import {commitGmTurn} from "../src/turn-orchestration.js";
import {deliverTurnOutbox} from "../src/publication-outbox.js";
import {proposeIntents,acceptIntentForAdjudication} from "../src/typed-intents.js";

test("HOLD01/02 actual unsupported feature has a private auditable review and safe owner status",()=>nativeFixture(f=>{
  const x=actionFixture(f,"I send my shadow through the locked door to scout remotely.");
  Object.assign(x.ruling,{capability:{kind:"special",ref:"Shadow Tell"},effect_class:"special"});x.run();
  const rows=f.db.listCityRecords(f.guild,{kind:"unsupported_action",includeGM:true});
  assert.equal(rows.length,1);const r=rows[0];assert.equal(r.status,"needs_review");assert.equal(r.visibility,"gm");
  assert.equal(r.data.category,"feature_permission");assert.equal(r.data.source_hash,f.db.getCityRecord(f.guild,"typed_intent",r.data.action).data.source_hash);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,0);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"action_outcome_receipt",includeGM:true}).length,0);
  const own=windowOperation(f.db,f.guild,x.pc.owner_user_id,{op:"action-review-inbox"});
  assert.equal(own.length,1);assert.match(own[0].message,/clarify|revise|withdraw/);
  assert.equal(own[0].attempt,x.intent.source_span);
  assert.deepEqual(windowOperation(f.db,f.guild,f.pcs[1].owner_user_id,{op:"action-review-inbox"}),[]);
  assert(!cityContext(f.db,f.guild,r.record_key).records.some(row=>row.kind==="unsupported_action"));
}));

const inbox=(f,x)=>windowOperation(f.db,f.guild,x.pc.owner_user_id,{op:"action-review-inbox"});
const unsupported=f=>{const x=actionFixture(f,"I project my shadow through the locked door.");
  Object.assign(x.ruling,{capability:{kind:"special",ref:"Shadow Tell"},effect_class:"special"});x.run();return x;};

test("HOLD02 unsupported source holds only descendants; two native siblings, another owner and NPC conversation complete",()=>nativeFixture(async f=>{
  const spans=["I send my shadow through the door.","I examine the visible label.","I brush off my sleeve.","Then I enter using the shadow's findings."];
  const x=actionFixture(f,spans.join(" "));
  Object.assign(x.ruling,{capability:{kind:"special",ref:"Shadow Tell"},effect_class:"special"});x.intent.source_span=spans[0];
  const noRoll={...x.ruling,capability:{kind:"mundane",ref:""},effect_class:"observation",disposition:"narrative_no_roll",
    risk:"none",stakes:"none",trait:null,difficulty:null,difficulty_reason:"No meaningful uncertainty."};
  x.result.player_intents=[x.intent,...spans.slice(1,3).map(source_span=>({...x.intent,source_span,type:"observe",resolution:"auto",gm_ruling:noRoll})),
    {...x.intent,source_span:spans[3],depends_on:[0]}];
  const result=x.run();assert.equal(result.gmRulings.length,3);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"action_outcome_receipt",includeGM:true}).length,2);
  const nodes=f.db.listCityRecords(f.guild,{kind:"compound_action",includeGM:true});
  assert.equal(nodes.filter(n=>n.data.status==="resolved").length,2);
  assert.equal(nodes.find(n=>n.data.sequence_index===3).data.status,"blocked");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,0);
  const choso=f.accepted(1,"I examine the posted public timetable.",null,{type:"observe",operation:"look",
    target:{kind:"unknown",key:"",phrase:"",grounding:"unknown"}});
  const proposal={...noRoll,context_refs:[x.evidence.event_key]};
  adjudicateGmRuling(f.db,f.guild,choso.record_key,proposal,{mode:"party",actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id});
  assert.equal(f.db.getCityRecord(f.guild,"typed_intent",choso.record_key).status,"resolved");
  f.db.setSimulationEntity(f.guild,"location","terminal",{name:"Terminal",visibility:"party"});
  f.db.upsertNpcProfile(f.guild,{npcKey:"attendant",displayName:"Attendant",role:"attendant",publicIdentity:"An attendant."});
  f.db.setSimulationEntity(f.guild,"npc","attendant",{location_key:"terminal",visibility:"party"});
  const billy=f.pcs[2],scope={mode:"party",actorUserId:billy.owner_user_id,actorCharacterId:billy.id},messageId="independent-work-question";
  captureWorldInput(f.db,f.guild,billy.owner_user_id,billy.id,messageId,"I ask the attendant about work.");
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,messageId,actorPrincipal:billy.owner_user_id,sessionId:f.session.id,audience:"party"});
  const response={respond:true,narration:"",narrative_claims:[],player_intents:[],
    gm_world_parts:[{version:1,kind:"npc_dialogue",entity_key:"attendant",acts:["ask_work","ask_skills"],tone:"warm"}]};
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result:response,scope,speaker:billy.name,label:"Independent NPC conversation",
    meta:{messageId,turnId:attempt.turn_id,triggerText:"I ask the attendant about work."}});
  const sent=[];await deliverTurnOutbox(f.db,f.guild,attempt.turn_id,async row=>{sent.push(row.payload);return {messageId:"npc-reply",channelId:"table"};});
  assert.match(sent.join("\n"),/looking for work/i);assert.match(sent.join("\n"),/what.*good at/i);
  assert.equal(f.db.getCharacter(x.pc.id).data.location,"terminal");
  const held=inbox(f,x)[0];windowOperation(f.db,f.guild,x.pc.owner_user_id,{op:"action-review-withdraw",review:held.review,revision:held.revision});
  x.result.player_intents[0].source_span=spans[0].slice(0,-1);x.run();
  assert.equal(f.db.listCityRecords(f.guild,{kind:"action_outcome_receipt",includeGM:true}).length,3,"independent native results survive resegmented replay");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,0);
}));

test("HOLD02 owner withdrawal is neutral, private, source-bound and cannot be reopened by model replay",()=>nativeFixture(f=>{
  const x=unsupported(f),r=inbox(f,x)[0],op={op:"action-review-withdraw",review:r.review,revision:r.revision};
  assert.throws(()=>windowOperation(f.db,f.guild,f.pcs[1].owner_user_id,op),/owner/);
  assert.throws(()=>windowOperation(f.db,f.guild,"fixture-gm",op,{gm:true}),/owner/);
  assert.equal(windowOperation(f.db,f.guild,x.pc.owner_user_id,op).status,"withdrawn");
  assert.throws(()=>windowOperation(f.db,f.guild,x.pc.owner_user_id,op),/terminal|changed/);
  x.run();f.restart();x.run();assert.equal(inbox(f,x)[0].status,"withdrawn");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,0);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,2);
}));

test("HOLD02 owner alternate tactic requires its own exact new declaration; no silent substitution",()=>nativeFixture(f=>{
  const x=unsupported(f),r=inbox(f,x)[0];
  const next=f.accepted(0,"Instead, I listen at the door.",null,{type:"observe",operation:"listen",
    target:{kind:"unknown",key:"",phrase:"",grounding:"unknown"}});
  const op={op:"action-review-replace",review:r.review,revision:r.revision,replacement:next.record_key};
  const raw=f.db.getWorldEvent(f.guild,next.source_event).details.raw_text;
  assert.equal(windowOperation(f.db,f.guild,x.pc.owner_user_id,op).status,"superseded");
  assert.equal(f.db.getWorldEvent(f.guild,next.source_event).details.raw_text,raw);
  assert.equal(f.db.getCityRecord(f.guild,"typed_intent",next.record_key).status,"accepted_for_adjudication");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"action_outcome_receipt",includeGM:true}).length,0);
}));

test("HOLD01 native private Discord review retries the exact newly saved missing rule without dice or new intent",()=>nativeFixture(async f=>{
  const x=actionFixture(f);x.ruling.saved_ruling_key="missing-cart-rule";x.run();const r=inbox(f,x)[0];
  const op={op:"action-review-retry",review:r.review,revision:r.revision,ruling_key:"missing-cart-rule"};
  assert.throws(()=>windowOperation(f.db,f.guild,x.pc.owner_user_id,op),/GM|rule/);
  f.db.upsertRulesRuling(f.guild,{key:"missing-cart-rule",question:"This mundane cart tactic",
    ruling:"Use the standard mundane action check at the proposed Difficulty; no additional effect.",createdBy:"fixture-gm"});
  const replies=[],i={id:"native-gm-review",commandName:"vc-roll",guildId:f.guild,user:{id:"fixture-gm",username:"GM"},
    memberPermissions:{has:()=>true},isChatInputCommand:()=>true,
    options:{getSubcommand:()=>"window",getString:()=>JSON.stringify(op)},
    reply:async p=>replies.push(p),followUp:async p=>replies.push(p)};
  await handleCommand(i,{db:f.db,gm:{}});assert(replies.every(p=>p.ephemeral===true));
  assert.equal(inbox(f,x)[0].status,"reconciled");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,1);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"action_outcome_receipt",includeGM:true}).length,0);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,2);
  f.restart();assert.throws(()=>windowOperation(f.db,f.guild,"fixture-gm",op,{gm:true}),/terminal|changed/);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,1);
}));

test("HOLD01 a human ruling still cannot approve Shadow Tell through the ordinary retry adapter",()=>nativeFixture(f=>{
  const x=unsupported(f),r=inbox(f,x)[0];
  f.db.upsertRulesRuling(f.guild,{key:"magic-override",ruling:"A proposed rule cannot create an adapter.",createdBy:"fixture-gm"});
  assert.throws(()=>windowOperation(f.db,f.guild,"fixture-gm",{op:"action-review-retry",review:r.review,revision:r.revision,
    ruling_key:"magic-override"},{gm:true}),/capability|exact|missing/);
  assert.equal(inbox(f,x)[0].status,"needs_review");assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,0);
}));

test("HOLD03 revoked source survives restart as audit, never retry permission or independent-state rollback",()=>nativeFixture(f=>{
  const x=unsupported(f),r=inbox(f,x)[0],before=f.db.getCharacter(x.pc.id).data;
  const source=f.db.getCityRecord(f.guild,"unsupported_action",r.review).source_event;
  indexWorldEvent(f.db,f.guild,{key:source,status:"retracted"},"fixture-gm");f.restart();
  const stale=inbox(f,x)[0];assert.equal(stale.current_source,false);assert.match(stale.message,/stale/);
  assert.throws(()=>windowOperation(f.db,f.guild,x.pc.owner_user_id,{op:"action-review-withdraw",review:stale.review,revision:stale.revision}),/stale/);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data,before);assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,0);
}));

test("HOLD01 native manual preparation cannot bypass a scoped unsupported capability hold",()=>nativeFixture(f=>{
  const x=unsupported(f),r=inbox(f,x)[0],a=f.db.getCityRecord(f.guild,"typed_intent",r.action);
  assert.throws(()=>prepareRollRequest(f.db,f.guild,{source_event:a.source_event,accepted_intent:a.record_key,
    character_id:x.pc.id,trait:"Finesse",kind:"action",modifier_keys:[],difficulty_source:"",adjudication:"Try the held power."},"fixture-gm"),/ruling|review/);
  assert.throws(()=>adjudicateAcceptedIntent(f.db,f.guild,{acceptedIntent:a.record_key,mode:"roll_required",risk:"unknown",
    stakes:"new power",rawRefs:["srd:action-rolls"],trait:"Finesse",kind:"action",difficulty:10,explanation:"Try the held power."},
    "fixture-gm",{scope:x.scope}),/ruling|review/);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,0);
}));

test("HOLD02 actual saved-rule recovery resumes its original dependent movement after native success",()=>nativeFixture(f=>{
  f.db.setSimulationEntity(f.guild,"location","terminal",{name:"Terminal",visibility:"party"});
  f.db.setSimulationEntity(f.guild,"location","booth",{name:"Booth",parent_location_key:"terminal",visibility:"party"});
  f.db.upsertReference(f.guild,{kind:"location",key:"booth",name:"Booth",summary:"An accessible booth.",visibility:"party"});
  const first="I improvise a distraction with the file cart.",second="Then I enter the booth.",x=actionFixture(f,`${first} ${second}`);
  x.intent.source_span=first;x.ruling.saved_ruling_key="recover-cart";
  x.result.player_intents.push({type:"move",source_span:second,target_name:"Booth",target_key:"booth",destination:"interior",
    operation:"enter",utterance:"",excluded_targets:[],framing:"immediate",resolution:"auto",reason:"",depends_on:[0]});x.run();
  const r=inbox(f,x)[0];f.db.upsertRulesRuling(f.guild,{key:"recover-cart",ruling:"The mundane attempt uses the proposed standard check.",createdBy:"fixture-gm"});
  windowOperation(f.db,f.guild,"fixture-gm",{op:"action-review-retry",review:r.review,revision:r.revision,ruling_key:"recover-cart"},{gm:true});
  const q=f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true})[0],faces=[10,9];
  contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:"roll",request:q.record_key,expected_revision:rollRevision(q),key:"recovery-roll"},{rng:()=>faces.shift()});
  assert.equal(f.db.getCharacter(x.pc.id).data.location,"booth");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"action_continuation",includeGM:true}).filter(t=>t.status==="resolved").length,1);
}));

test("HOLD03 changed scene or owner cannot reactivate review; model gm fields provide no authority",()=>nativeFixture(f=>{
  const x=unsupported(f),r=inbox(f,x)[0],op={op:"action-review-withdraw",review:r.review,revision:r.revision};
  assert.throws(()=>windowOperation(f.db,f.guild,x.pc.owner_user_id,{...op,gm:true}),/Closed/);
  f.db.setDirectorState(f.session.id,{scene_number:2,scene_label:"Another scene"});
  assert.equal(inbox(f,x)[0].current_source,false);
  assert.throws(()=>windowOperation(f.db,f.guild,x.pc.owner_user_id,op),/stale/);
  f.db.db.prepare("UPDATE characters SET owner_user_id=? WHERE id=?").run(f.pcs[1].owner_user_id,x.pc.id);
  assert.deepEqual(inbox(f,x),[]);assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,0);
}));

test("HOLD03 no-session review inbox is empty and cannot trigger model work or native effects",()=>nativeFixture(f=>{
  const x=unsupported(f);f.db.endSession(f.guild);
  assert.deepEqual(inbox(f,x),[]);
  assert.deepEqual(windowOperation(f.db,f.guild,"fixture-gm",{op:"action-review-inbox"},{gm:true}),[]);
  assert.equal(f.db.getCharacter(x.pc.id).data.resources.hope,2);
}));

test("HOLD03 a new model offset cannot resurrect a withdrawn source occurrence",()=>nativeFixture(f=>{
  const x=unsupported(f),r=inbox(f,x)[0],a=f.db.getCityRecord(f.guild,"typed_intent",r.action);
  const original=f.db.getCityRecord(f.guild,"semantic_intent_proposal",a.data.proposal_id);
  const {source_hash,authority,...proposal}=original.data;
  proposal.proposal_id="";proposal.end--;proposal.source_span=proposal.source_span.slice(0,-1);
  const unaccepted=proposeIntents(f.db,f.guild,[proposal],x.scope,{messageId:x.messageId})[0];
  windowOperation(f.db,f.guild,x.pc.owner_user_id,{op:"action-review-withdraw",review:r.review,revision:r.revision});
  assert.throws(()=>acceptIntentForAdjudication(f.db,f.guild,unaccepted,x.scope),/withdrew/);
  const p=proposeIntents(f.db,f.guild,[proposal],x.scope,{messageId:x.messageId})[0];
  assert.equal(p.status,"withdrawn_source_span");
  assert.throws(()=>acceptIntentForAdjudication(f.db,f.guild,p,x.scope),/withdraw|consumed|terminal|propos/i);
}));

test("HOLD03 withdrawal also invalidates an unexecuted overlapping alias accepted before cancellation",()=>nativeFixture(f=>{
  const x=unsupported(f),r=inbox(f,x)[0],a=f.db.getCityRecord(f.guild,"typed_intent",r.action);
  const {source_hash,authority,...proposal}=f.db.getCityRecord(f.guild,"semantic_intent_proposal",a.data.proposal_id).data;
  proposal.proposal_id="";proposal.end--;proposal.source_span=proposal.source_span.slice(0,-1);
  const p=proposeIntents(f.db,f.guild,[proposal],x.scope,{messageId:x.messageId})[0],alias=acceptIntentForAdjudication(f.db,f.guild,p,x.scope);
  windowOperation(f.db,f.guild,x.pc.owner_user_id,{op:"action-review-withdraw",review:r.review,revision:r.revision});
  assert.throws(()=>prepareRollRequest(f.db,f.guild,{source_event:alias.source_event,accepted_intent:alias.record_key,
    character_id:x.pc.id,trait:"Finesse",kind:"action",modifier_keys:[],difficulty_source:"",adjudication:"An overlapping alias."},"fixture-gm"),/withdr|terminal/);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).length,0);
}));
