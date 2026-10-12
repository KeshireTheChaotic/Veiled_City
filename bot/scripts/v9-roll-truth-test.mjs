/** V9-04: actual native dice own results; absence of Difficulty or a sole request is not authority. */
import test from "node:test";
import assert from "node:assert/strict";
import {nativeFixture} from "./v9-fixtures.mjs";
import {configureCityFlags} from "../src/city-core.js";
import {prepareRollRequest,rollRevision,pendingRollRequests,formatRollRequest} from "../src/roll-requests.js";
import {contributeRoll,adjudicateRollSource} from "../src/roll-collaboration.js";
import {finalizeTypedRollAction,reviewTypedRollOutcome} from "../src/typed-roll-outcomes.js";
import {buildActionPlan} from "../src/action-dependency.js";
import {resolveTypedNativeRolls} from "../src/typed-mechanics.js";
import {reconcileConsequences} from "../src/consequence-reconciliation.js";
import {handleCommand} from "../src/commands.js";
import {fakeInteraction} from "./contract-fixtures.mjs";
import {indexWorldEvent} from "../src/city-calendar.js";
import {recordScenePresence} from "../src/scene-continuity.js";
import {completedActionSource} from "../src/action-consent.js";
import {captureWorldInput} from "../src/autonomous-world.js";
import {commitGmTurn} from "../src/turn-orchestration.js";

function setup(f,{difficulty=null,kind="action",actor=0,text="I inspect the terminal.",type="search",target="terminal",attack=null}={}){
  configureCityFlags(f.db,f.guild,{roll_requests:true,roll_collaboration:true},"gm");
  const pc=f.pcs[actor],a=f.accepted(actor,text,null,{type,operation:type==="roll"?"roll":"inspect",
    target:{kind:"object",key:target,phrase:target,grounding:"known"}});
  const scope={mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  let proof="";
  if(difficulty!==null){
    f.db.upsertRulesRuling(f.guild,{key:"truth",createdBy:"gm",ruling:"Current terminal test Difficulty."});
    proof=adjudicateRollSource(f.db,f.guild,{key:`difficulty-${a.record_key}`,character_id:pc.id,kind:"difficulty",
      ruling_key:"truth",data:{declaration:a.source_event,value:difficulty}},"gm").event_key;
  }
  const attackSource=attack?adjudicateRollSource(f.db,f.guild,{key:`attack-${a.record_key}`,character_id:pc.id,kind:"attack",ruling_key:"attack",
    data:{trait:"Knowledge",active:true,...attack}},"gm").event_key:"";
  const q=prepareRollRequest(f.db,f.guild,{source_event:a.source_event,accepted_intent:a.record_key,character_id:pc.id,
    trait:"Knowledge",kind,modifier_keys:[],difficulty_source:proof,attack_source:attackSource,adjudication:"An actual uncertain terminal inspection."},"gm",{scope});
  f.db.saveCityRecord(f.guild,{kind:"native_adjudication",key:`adjudicate:${a.record_key}`,status:"roll_pending",source_event:a.source_event,
    visibility:"character",subject_key:pc.id,data:{action_id:a.record_key,disposition:"roll_pending",roll_request_ref:q.record_key}});
  buildActionPlan(f.db,f.guild,[a]);
  const roll=(faces=[9,2])=>{let n=0;return contributeRoll(f.db,f.guild,pc.owner_user_id,{op:"roll",request:q.record_key,
    expected_revision:rollRevision(q),key:`native-${a.record_key}`},{rng:()=>faces[n++]});};
  return {pc,a,q,scope,roll};
}

test("G05 actual native roll without Difficulty stays review-only, never success; replay preserves dice/resources",()=>nativeFixture(f=>{
  const x=setup(f),q=x.roll(),a=f.db.getCityRecord(f.guild,"typed_intent",x.a.record_key),r=f.db.getCityRecord(f.guild,"action_outcome_receipt",a.data.outcome_receipt);
  assert.equal(r.data.outcome,"needs_review");assert.equal(r.status,"needs_review");assert.equal(a.status,"accepted_for_adjudication");
  assert(pendingRollRequests(f.db,f.guild,x.pc.owner_user_id).some(r=>r.record_key===q.record_key),"saved dice awaiting verdict must remain discoverable");
  assert.match(formatRollRequest(q),/saved dice.*review|review.*saved dice/i);
  assert.match(formatRollRequest(q),/^\[Review required/);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"compound_action",includeGM:true})[0].data.status,"pending");
  const before=f.db.getCharacter(x.pc.id).data.resources;
  assert.equal(finalizeTypedRollAction(f.db,f.guild,q).receipt,r.record_key);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);
  assert.equal(reconcileConsequences(f.db,f.guild,{intents:[x.a],scope:x.scope,strict:true}).actions[0].disposition,"needs_review");
}));
for(const difficulty of [10,null])test(`G05 bilateral Tag Team selection ${difficulty===null?"with missing Difficulty review":"of partner's actual dice"} preserves native ancestry`,()=>nativeFixture(f=>{
  const x=setup(f,{difficulty}),y=setup(f,{difficulty:10,actor:1});
  f.db.upsertRulesRuling(f.guild,{key:"truth",createdBy:"gm",ruling:"Current terminal test Difficulty."});
  configureCityFlags(f.db,f.guild,{scene_continuity:true},"gm");
  f.db.setSimulationEntity(f.guild,"location","terminal",{name:"Terminal"});
  const source=indexWorldEvent(f.db,f.guild,{key:"team-room",kind:"arrival",source_id:"gm",title:"Terminal",location_key:"terminal",visibility:"party"},"gm");
  for(const pc of f.pcs.slice(0,2)){
    f.db.updateCharacterData(pc.id,d=>{d.resources.hope=6;});
    recordScenePresence(f.db,f.guild,{entity_type:"character",entity_key:pc.id,location_key:"terminal",source_event:source.event_key,
      accepted_by:pc.owner_user_id,visibility:"party"},"gm");
  }
  let serial=0;
  const operate=(pc,op,extra={},faces=[])=>{let n=0;const q=f.db.getCityRecord(f.guild,"roll_request",x.q.record_key);
    return contributeRoll(f.db,f.guild,pc.owner_user_id,{op,request:q.record_key,expected_revision:rollRevision(q),key:`team-${serial++}`,...extra},{rng:()=>faces[n++]});};
  const participation=(pc,kind)=>({proof:adjudicateRollSource(f.db,f.guild,{key:`team-proof-${kind}`,character_id:pc.id,kind:"participation",ruling_key:"truth",
    data:{request:x.q.record_key,character_id:pc.id,kind,description:"I coordinate this terminal inspection."}},"gm").event_key,description:"I coordinate this terminal inspection."});
  operate(x.pc,"tag",{partner_request:y.q.record_key,pay_hope:true,...participation(x.pc,"tag")});
  operate(y.pc,"participate",participation(y.pc,"participate"));operate(x.pc,"roll",{},[2,3]);const rolled=operate(y.pc,"roll",{},[9,2]);
  const chosen=rolled.data.tag.participants[1].roll_id;
  operate(x.pc,"select",{roll_id:chosen});let q=operate(y.pc,"select",{roll_id:chosen});
  if(difficulty===null){
    assert.equal(finalizeTypedRollAction(f.db,f.guild,q).outcome,"needs_review");
    const resources=f.pcs.slice(0,2).map(pc=>f.db.getCharacter(pc.id).data.resources);
    const source=adjudicateRollSource(f.db,f.guild,{key:"team-outcome",character_id:x.pc.id,kind:"difficulty",ruling_key:"truth",
      data:{declaration:x.a.source_event,value:10}},"gm");
    reviewTypedRollOutcome(f.db,f.guild,{op:"resolve-outcome",request:q.record_key,expected_revision:rollRevision(q),difficulty_source:source.event_key},"gm",{gm:true});
    q=f.db.getCityRecord(f.guild,"roll_request",q.record_key);
    assert.deepEqual(f.pcs.slice(0,2).map(pc=>f.db.getCharacter(pc.id).data.resources),resources);
  }
  assert.equal(finalizeTypedRollAction(f.db,f.guild,q).outcome,"success");
  assert.equal(completedActionSource(f.db,f.guild,x.a.record_key).row.record_key,x.a.record_key);
}));
for(const [label,difficulty,faces,want] of [["zero",0,[2,3],"success"],["success",10,[9,2],"success"],
  ["failure",20,[2,3],"failure"],["natural Critical",100,[2,2],"success"],["Critical without Difficulty",null,[2,2],"success"]]){
  test(`G05 ${label} has exact native success basis`,()=>nativeFixture(f=>{
    const x=setup(f,{difficulty}),q=x.roll(faces),r=f.db.getCityRecord(f.guild,"action_outcome_receipt",f.db.getCityRecord(f.guild,"typed_intent",x.a.record_key).data.outcome_receipt);
    assert.equal(r.data.outcome,want);assert(r.data.success_basis,"native verdict needs independently verifiable basis");
    const resources=f.db.getCharacter(x.pc.id).data.resources;
    assert.equal(resources.hope,faces[0]>=faces[1]?3:2,"ordinary SRD Hope is unchanged by the PvP override");
    assert.equal(resources.stress.current,faces[0]===faces[1]?1:2,"ordinary Critical Stress clear remains vanilla");
    assert.equal(finalizeTypedRollAction(f.db,f.guild,q).receipt,r.record_key);
  }));
}
test("G05 reaction without Difficulty is neutral review and changes no generic metacurrency",()=>nativeFixture(f=>{
  const x=setup(f,{kind:"reaction"}),before=f.db.getCharacter(x.pc.id).data.resources,q=x.roll();
  assert.equal(finalizeTypedRollAction(f.db,f.guild,q).outcome,"needs_review");assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);
}));
test("G05 absent legacy Difficulty is neutral, not JavaScript coercion success",()=>nativeFixture(f=>{
  const x=setup(f),q=x.roll();delete q.data.breakdown.difficulty;
  const saved=f.db.saveCityRecord(f.guild,{...q,key:q.record_key});
  assert.equal(finalizeTypedRollAction(f.db,f.guild,saved).outcome,"needs_review");
}));
test("G05 a persisted forged total cannot replace actual saved native dice",()=>nativeFixture(f=>{
  const x=setup(f,{difficulty:10}),q=x.roll();q.data.result.total=99;
  const saved=f.db.saveCityRecord(f.guild,{...q,key:q.record_key});
  assert.throws(()=>finalizeTypedRollAction(f.db,f.guild,saved),/native|saved|exact/i);
}));
test("G12 stale accepted source is rejected before native RNG or spending in direct contribution",()=>nativeFixture(f=>{
  const x=setup(f,{difficulty:10}),a=f.db.getCityRecord(f.guild,"typed_intent",x.a.record_key);
  f.db.saveCityRecord(f.guild,{...a,key:a.record_key,data:{...a.data,source_hash:"changed-source"}});
  let draws=0;
  assert.throws(()=>contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:"roll",request:x.q.record_key,
    expected_revision:rollRevision(x.q),key:"stale-source-roll"},{rng:()=>{draws++;return 2;}}),/source|stale|native/i);
  assert.equal(draws,0,"source/principal eligibility must precede native sampling, not rely on later transaction rollback");
  assert.equal(f.db.getCityRecord(f.guild,"roll_request",x.q.record_key).status,"pending");assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,x.pc.data.resources);
}));
test("G05 reaction Critical remains neutral for SRD resources",()=>nativeFixture(f=>{
  const x=setup(f,{kind:"reaction"}),before=f.db.getCharacter(x.pc.id).data.resources,q=x.roll([2,2]);
  assert.equal(finalizeTypedRollAction(f.db,f.guild,q).outcome,"success");assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);
}));
test("G05 player cannot use GM outcome review",()=>nativeFixture(async f=>{
  const x=setup(f),q=x.roll(),i=fakeInteraction({gm:false,sub:"adjudicate",json:{op:"resolve-outcome",request:q.record_key,expected_revision:rollRevision(q),difficulty_source:"forged"}});
  Object.assign(i,{id:"not-gm",guildId:f.guild,commandName:"vc-roll",isChatInputCommand:()=>true,guild:null,user:{id:x.pc.owner_user_id,username:"Player"}});
  await handleCommand(i,{db:f.db,gm:{}});assert(i.deliveries.some(p=>/GM\/admin permission required/.test(p.content)&&p.ephemeral));
  assert.throws(()=>reviewTypedRollOutcome(f.db,f.guild,{op:"resolve-outcome",request:q.record_key,expected_revision:rollRevision(q),difficulty_source:"forged"},x.pc.owner_user_id),/authenticated GM/i);
  assert.equal(finalizeTypedRollAction(f.db,f.guild,q).outcome,"needs_review");
}));
for(const corrupt of ["false Difficulty","forged result","missing roll","wrong request"]){
  test(`G05 ${corrupt} cannot mint terminal success`,()=>nativeFixture(f=>{
    const x=setup(f,{difficulty:10}),q=x.roll(),fake=structuredClone(q);
    if(corrupt==="false Difficulty")fake.data.breakdown.difficulty=false;
    if(corrupt==="forged result")fake.data.result.total=99;
    if(corrupt==="missing roll")fake.data.roll_id="not-a-native-roll";
    if(corrupt==="wrong request")fake.source_event="other-source";
    assert.throws(()=>finalizeTypedRollAction(f.db,f.guild,fake),/native|saved|exact|request|changed/i);
  }));
}

test("G12 a new owner's unrelated roll declaration must not consume their sole pending request",()=>nativeFixture(f=>{
  const x=setup(f,{difficulty:10}),a=f.accepted(0,"I roll for something else.",null,{type:"roll",operation:"roll",
    target:{kind:"",key:null,phrase:"",grounding:"unknown"}}),s=f.db.getWorldEvent(f.guild,a.source_event),before=f.db.getCharacter(x.pc.id).data.resources;
  const results=resolveTypedNativeRolls(f.db,f.guild,x.scope,[{type:"roll",operation:"roll",resolution:"conversational",framing:"immediate",source_span:a.data.source_span,target_key:""}],s.details.discord_message_id);
  assert.equal(results[0].status,"needs_clarification");assert.equal(f.db.getCityRecord(f.guild,"roll_request",x.q.record_key).status,"pending");
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);
}));
test("G12 explicit owner-authored request identity selects one of two pending requests",()=>nativeFixture(f=>{
  const x=setup(f,{difficulty:10}),other=setup(f,{difficulty:12}),a=f.accepted(0,`I roll ${x.q.record_key}.`,null,{type:"roll",operation:"roll",
    target:{kind:"object",key:x.q.record_key,phrase:x.q.record_key,grounding:"known"}}),s=f.db.getWorldEvent(f.guild,a.source_event);
  const result=resolveTypedNativeRolls(f.db,f.guild,x.scope,[{type:"roll",operation:"roll",resolution:"conversational",framing:"immediate",source_span:a.data.source_span,target_key:x.q.record_key}],s.details.discord_message_id);
  assert.equal(result[0].status,"accepted");assert.equal(f.db.getCityRecord(f.guild,"roll_request",x.q.record_key).status,"resolved");
  assert.equal(f.db.getCityRecord(f.guild,"roll_request",other.q.record_key).status,"pending");
  assert.equal(reconcileConsequences(f.db,f.guild,{intents:[a],scope:x.scope,strict:true}).actions[0].disposition,"resolved");
}));
test("G05 authenticated GM review classifies saved dice without reroll or metacurrency replay",()=>nativeFixture(async f=>{
  const x=setup(f),q=x.roll(),before=f.db.getCharacter(x.pc.id).data.resources;
  f.db.upsertRulesRuling(f.guild,{key:"late",createdBy:"gm",ruling:"The terminal inspection Difficulty was 10."});
  const proof=adjudicateRollSource(f.db,f.guild,{key:"late-proof",character_id:x.pc.id,kind:"difficulty",ruling_key:"late",
    data:{declaration:x.a.source_event,value:10}},"gm");
  const interaction=fakeInteraction({sub:"adjudicate",json:{op:"resolve-outcome",request:q.record_key,
    expected_revision:rollRevision(q),difficulty_source:proof.event_key}});
  Object.assign(interaction,{id:"truth-review",guildId:f.guild,commandName:"vc-roll",isChatInputCommand:()=>true,guild:null});
  interaction.user.username="GM";
  await handleCommand(interaction,{db:f.db,gm:{},content:{}});
  const current=f.db.getCityRecord(f.guild,"roll_request",q.record_key);
  assert.equal(finalizeTypedRollAction(f.db,f.guild,current).outcome,"success");assert.equal(current.data.roll_id,q.data.roll_id);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);
}));
test("G12 a model-selected request absent from owner's exact clause cannot authorize dice",()=>nativeFixture(f=>{
  const x=setup(f,{difficulty:10}),a=f.accepted(0,"I roll for something else.",null,{type:"roll",operation:"roll",
    target:{kind:"object",key:x.q.record_key,phrase:x.q.record_key,grounding:"known"}}),s=f.db.getWorldEvent(f.guild,a.source_event);
  const result=resolveTypedNativeRolls(f.db,f.guild,x.scope,[{type:"roll",operation:"roll",resolution:"conversational",framing:"immediate",source_span:a.data.source_span,target_key:x.q.record_key}],s.details.discord_message_id);
  assert.equal(result[0].status,"needs_clarification");assert.equal(f.db.getCityRecord(f.guild,"roll_request",x.q.record_key).status,"pending");
}));
test("G05 ordinary attack awaits actual damage, then uses target Difficulty and preserves native damage on replay",()=>nativeFixture(f=>{
  f.db.upsertRulesRuling(f.guild,{key:"attack",createdBy:"gm",ruling:"An ordinary equipped practice tool attacks this NPC."});
  f.db.updateCharacterData(f.pcs[0].id,d=>{d.inventory=[{name:"Plain tool",equipped:true}];});
  const encounter=f.db.createEncounter(f.guild,f.session.id,{status:"active",tier:1,pc_count:4,base_bp:12,budget_bp:12});
  const target=f.db.initializeCombatants(encounter.id,[{base_name:"Training target",display_name:"Training target",role:"Standard",tier:1,
    difficulty:10,major_threshold:5,severe_threshold:10,hp_max:10}])[0];
  const x=setup(f,{kind:"attack",attack:{weapon:"Plain tool",damage:"1d6+1",damage_type:"physical",target_id:target.id}}),q=x.roll();
  assert.equal(q.status,"awaiting_damage");assert.equal(f.db.getCityRecord(f.guild,"typed_intent",x.a.record_key).data.outcome_receipt,null);
  const input={op:"damage",request:q.record_key,expected_revision:rollRevision(q),key:"ordinary-damage"};
  const final=contributeRoll(f.db,f.guild,x.pc.owner_user_id,input,{rng:()=>4}),hp=f.db.listCombatants(encounter.id)[0].hp_current;
  assert.equal(finalizeTypedRollAction(f.db,f.guild,final).outcome,"success");
  assert.equal(f.db.getCityRecord(f.guild,"action_outcome_receipt",f.db.getCityRecord(f.guild,"typed_intent",x.a.record_key).data.outcome_receipt).data.success_basis.kind,"native_attack_target");
  contributeRoll(f.db,f.guild,x.pc.owner_user_id,input,{rng:()=>assert.fail("Replay must not roll")});assert.equal(f.db.listCombatants(encounter.id)[0].hp_current,hp);
}));
test("G12 same current accepted roll occurrence binds its own request without a count heuristic",()=>nativeFixture(f=>{
  const x=setup(f,{difficulty:10,type:"roll",text:"I roll my terminal inspection."}),s=f.db.getWorldEvent(f.guild,x.a.source_event);
  setup(f,{difficulty:20});
  const r=resolveTypedNativeRolls(f.db,f.guild,x.scope,[{type:"roll",operation:"roll",framing:"immediate",resolution:"conversational",
    source_span:x.a.data.source_span,target_key:""}],s.details.discord_message_id);
  assert.equal(r[0].status,"accepted");assert.equal(f.db.getCityRecord(f.guild,"roll_request",x.q.record_key).status,"resolved");
}));
for(const mismatch of ["unaccepted message","foreign owner","private scope","two unrelated requests"]){
  test(`G12 ${mismatch} cannot select or consume dice`,()=>nativeFixture(f=>{
    const x=setup(f,{difficulty:10});if(mismatch==="two unrelated requests")setup(f,{difficulty:12});
    const a=f.accepted(0,"I roll for something else.",null,{type:"roll",operation:"roll",target:{kind:"",key:null,phrase:"",grounding:"unknown"}}),s=f.db.getWorldEvent(f.guild,a.source_event);
    const scope={...x.scope,...(mismatch==="foreign owner"?{actorUserId:f.pcs[1].owner_user_id}:{}),...(mismatch==="private scope"?{mode:"private"}:{})};
    const result=resolveTypedNativeRolls(f.db,f.guild,scope,[{type:"roll",operation:"roll",framing:"immediate",resolution:"conversational",
      source_span:a.data.source_span,target_key:""}],mismatch==="unaccepted message"?"unaccepted-message":s.details.discord_message_id);
    assert.equal(result[0].status,"needs_clarification");assert.equal(f.db.getCityRecord(f.guild,"roll_request",x.q.record_key).status,"pending");
    assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,x.pc.data.resources);
  }));
}
for(const explicit of [true,false])test(`G12 actual commit adapter ${explicit?"explicit selection":"unrelated ambiguity"} preserves strict reconciliation`,()=>nativeFixture(f=>{
  const x=setup(f,{difficulty:10}),text=explicit?`I roll ${x.q.record_key}.`:"I roll for something else.",messageId="roll-commit";
  captureWorldInput(f.db,f.guild,x.pc.owner_user_id,x.pc.id,messageId,text);
  const result={narration:"The native request controls this check.",narrative_claims:[],player_intents:[{type:"roll",operation:"roll",framing:"immediate",
    resolution:"conversational",source_span:text,target_key:explicit?x.q.record_key:"",target_name:"",destination:"unspecified",utterance:"",excluded_targets:[],reason:""}]};
  const mutation=commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope:x.scope,speaker:"Jaxon",label:"Roll intent",meta:{messageId,triggerText:text}});
  assert.equal(mutation.reconciliation.actions[0].disposition,explicit?"resolved":"needs_clarification");
  assert.equal(f.db.getCityRecord(f.guild,"roll_request",x.q.record_key).status,explicit?"resolved":"pending");
  const before=f.db.getCharacter(x.pc.id).data.resources,rollId=f.db.getCityRecord(f.guild,"roll_request",x.q.record_key).data.roll_id;
  assert.doesNotThrow(()=>commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope:x.scope,speaker:"Jaxon",label:"Same turn replay",meta:{messageId,triggerText:text}}));
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);assert.equal(f.db.getCityRecord(f.guild,"roll_request",x.q.record_key).data.roll_id,rollId);
}));
