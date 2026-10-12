/** V9-03 red-first: actual native outcomes must schedule/revalidate descendants, not strand ready nodes. */
import test from "node:test";
import assert from "node:assert/strict";
import {nativeFixture,pvpTerms} from "./v9-fixtures.mjs";
import {configureCityFlags} from "../src/city-core.js";
import {captureWorldInput} from "../src/autonomous-world.js";
import {persistPlayerIntents} from "../src/typed-intents.js";
import {buildActionPlan} from "../src/action-dependency.js";
import {adjudicateAcceptedIntent} from "../src/rules-arbitration.js";
import {contributeRoll} from "../src/roll-collaboration.js";
import {rollRevision} from "../src/roll-requests.js";
import {drainActionContinuations,continuationInbox} from "../src/action-continuation.js";
import {windowOperation} from "../src/window-coordinator.js";
import {indexWorldEvent} from "../src/city-calendar.js";
import {configureSimulationEntity} from "../src/simulation.js";
import {deliverTurnOutbox} from "../src/publication-outbox.js";
import {worldInputKey} from "../src/autonomous-world.js";
import {commitGmTurn} from "../src/turn-orchestration.js";
import {proposePvp,reviewPvp,respondPvp,choosePvp,rollPvp,progressPvp,continuePvp} from "../src/narrative-pvp.js";
import {handleCommand} from "../src/commands.js";
import {refreshActionContinuations} from "../src/action-continuation.js";
import {fearRevision,establishFearContext,selectFearMove,applyFearMove} from "../src/pvp-fear-moves.js";
import {coordinateTypedActionWindows} from "../src/scene-action-window.js";
import {advanceActionWindow,reconcileWindowCustody} from "../src/window-coordinator.js";
import {manageEvidence} from "../src/evidence-custody.js";
import {stateRevision} from "../src/ai-intents.js";
import {recordScenePresence} from "../src/scene-continuity.js";
import {cityContext} from "../src/city-core.js";

async function compound(f,{physical=false,locked=false,custody=false}={}){
  configureCityFlags(f.db,f.guild,{roll_requests:true,roll_collaboration:true},"gm");
  f.db.setSimulationEntity(f.guild,"location","terminal",{name:"Terminal",visibility:"party"});
  f.db.setSimulationEntity(f.guild,"location","booth",{name:"Booth",parent_location_key:"terminal",visibility:"party",locked});
  f.db.upsertReference(f.guild,{kind:"location",key:"booth",name:"Booth",summary:"An ordinary adjacent booth.",visibility:"party"});
  const pc=f.pcs[0],scope={mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  const spans=[custody?"I inspect and collect the parcel.":"I inspect the signs.",physical?"I examine the mechanism.":"I enter the booth.","I look up."],text=spans.join(" ");
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,"continuation-source",text);
  const base=(type,source_span,operation)=>({type,source_span,operation,target_name:"",target_key:"",destination:"unspecified",utterance:"",
    excluded_targets:[],framing:"immediate",resolution:"auto",reason:""});
  const rows=persistPlayerIntents(f.db,f.guild,[base("interact",spans[0],"inspect"),
    {...base(physical?"interact":"move",spans[1],physical?"examine":"enter"),target_name:physical?"":"Booth",target_key:physical?"":"booth",
      destination:physical?"unspecified":"interior",depends_on:[0]},base("observe",spans[2],"look")],scope,{messageId:"continuation-source"});
  buildActionPlan(f.db,f.guild,rows);
  f.db.upsertRulesRuling(f.guild,{key:"continuation-inspect",createdBy:"gm",ruling:"Read the obscured sign with a Knowledge action roll, Difficulty 10."});
  const a=adjudicateAcceptedIntent(f.db,f.guild,{acceptedIntent:rows[0].record_key,mode:"roll_required",risk:"Obscured sign",stakes:"No information on failure",
    savedRulingKey:"continuation-inspect",trait:"Knowledge",kind:"action",difficulty:10,modifierKeys:[],explanation:"Real uncertainty from the reviewed obscured sign."},pc.owner_user_id,{scope});
  const request=f.db.getCityRecord(f.guild,"roll_request",a.roll_request_ref);
  const roll=(faces=[9,2])=>{let n=0;return contributeRoll(f.db,f.guild,pc.owner_user_id,{op:"roll",request:request.record_key,
    expected_revision:rollRevision(request),key:"continuation-roll"},{rng:()=>faces[n++]});};
  return {rows,pc,scope,request,roll,text};
}

test("G04 actual native roll continues the exact accessible dependent move, without a second declaration",()=>nativeFixture(async f=>{
  const x=await compound(f);x.roll();
  assert.equal(f.db.getCharacter(x.pc.id).data.location,"booth","a ready node must have an actual native arrival or explicit valid hold");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"action_continuation",includeGM:true}).filter(r=>r.status==="resolved").length,1);
}));

test("G04 nondeterministic descendant has a durable scoped adjudication task, not silent ready",()=>nativeFixture(async f=>{
  const x=await compound(f,{physical:true});x.roll();
  const task=f.db.listCityRecords(f.guild,{kind:"action_continuation",includeGM:true}).find(r=>r.data.action===x.rows[1].record_key);
  assert(task,"native completion must durably schedule dependent adjudication");assert.equal(task.status,"needs_adjudication");
  const sibling=f.db.listCityRecords(f.guild,{kind:"compound_action",includeGM:true}).find(r=>r.data.action_id===x.rows[2].record_key);
  assert.equal(sibling.data.status,"ready","an unrelated observation must survive the held physical action");
}));

test("G04 private continuation causal records cannot enter general civic retrieval",()=>nativeFixture(async f=>{
  const x=await compound(f,{physical:true});x.roll();
  const task=f.db.listCityRecords(f.guild,{kind:"action_continuation",includeGM:true})[0];
  assert(f.db.listCityRecords(f.guild,{query:task.record_key,includeGM:true,limit:4}).some(r=>r.kind==="action_continuation"));
  const context=cityContext(f.db,f.guild,task.record_key);
  assert(!context.records.some(r=>r.kind==="action_continuation"||r.kind==="action_continuation_signal"
    ||r.kind==="compound_action"&&r.visibility==="character"),"owner-private native causal material must not be a civic/lore context source");
  assert.equal(continuationInbox(f.db,f.guild,x.pc.owner_user_id).length,1,"the proper native owner surface remains available");
  assert.deepEqual(continuationInbox(f.db,f.guild,f.pcs[2].owner_user_id),[]);
}));

test("G04 later native adjudication terminates its held continuation task without replay",()=>nativeFixture(async f=>{
  const x=await compound(f,{physical:true});x.roll();const a=x.rows[1];
  const q=adjudicateAcceptedIntent(f.db,f.guild,{acceptedIntent:a.record_key,mode:"roll_required",risk:"Mechanism uncertainty",stakes:"No information on failure",
    savedRulingKey:"continuation-inspect",trait:"Knowledge",kind:"action",difficulty:10,modifierKeys:[],explanation:"Current native adjudication of the original dependent mechanism."},x.pc.owner_user_id,{scope:x.scope});
  const request=f.db.getCityRecord(f.guild,"roll_request",q.roll_request_ref);let n=0;
  contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:"roll",request:request.record_key,expected_revision:rollRevision(request),key:"mechanism-roll"},{rng:()=>[9,2][n++]});
  f.restart();refreshActionContinuations(f.db,f.guild);
  const task=f.db.listCityRecords(f.guild,{kind:"action_continuation",includeGM:true})[0];assert.equal(task.status,"resolved");
  assert.equal(task.data.native_receipt,f.db.getCityRecord(f.guild,"typed_intent",a.record_key).data.outcome_receipt);
  assert.equal(f.db.getCharacter(x.pc.id).data.location,"terminal");
}));

test("G04 later native completion cannot certify a changed accepted target in the original held task",()=>nativeFixture(async f=>{
  const x=await compound(f,{physical:true});x.roll();const a=f.db.getCityRecord(f.guild,"typed_intent",x.rows[1].record_key);
  f.db.saveCityRecord(f.guild,{...a,key:a.record_key,data:{...a.data,target_key:"an-unrelated-target"}});
  const q=adjudicateAcceptedIntent(f.db,f.guild,{acceptedIntent:a.record_key,mode:"roll_required",risk:"Mechanism uncertainty",stakes:"No information on failure",
    savedRulingKey:"continuation-inspect",trait:"Knowledge",kind:"action",difficulty:10,modifierKeys:[],explanation:"Current mechanism review."},x.pc.owner_user_id,{scope:x.scope});
  const request=f.db.getCityRecord(f.guild,"roll_request",q.roll_request_ref);let n=0;
  contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:"roll",request:request.record_key,expected_revision:rollRevision(request),key:"changed-mechanism"},{rng:()=>[9,2][n++]});
  assert.equal(f.db.listCityRecords(f.guild,{kind:"action_continuation",includeGM:true})[0].status,"needs_adjudication");
}));

test("G04 locked destination stays explicitly held; roll success cannot unlock access or invent entry",()=>nativeFixture(async f=>{
  const x=await compound(f,{locked:true});x.roll();
  assert.equal(f.db.getCharacter(x.pc.id).data.location,"terminal");
  const task=f.db.listCityRecords(f.guild,{kind:"action_continuation",includeGM:true}).find(r=>r.data.action===x.rows[1].record_key);
  assert(task,"locked entry must leave a recoverable reason, not an orphan ready node");assert.equal(task.status,"needs_adjudication");
  assert.match(task.data.reason,/access|locked|geography/i);
}));

test("G04 current native access repair and private owner resume survive restart without repeating predecessor dice/cost",()=>nativeFixture(async f=>{
  const x=await compound(f,{locked:true});const first=x.roll(),resources=f.db.getCharacter(x.pc.id).data.resources;
  const task=f.db.listCityRecords(f.guild,{kind:"action_continuation",includeGM:true})[0];f.restart();
  configureSimulationEntity(f.db,f.guild,"location","booth",{locked:false});
  assert.throws(()=>windowOperation(f.db,f.guild,f.pcs[1].owner_user_id,{op:"continuation-resume",task:task.record_key}),/owner|continuation|control/i);
  windowOperation(f.db,f.guild,x.pc.owner_user_id,{op:"continuation-resume",task:task.record_key});
  assert.equal(f.db.getCharacter(x.pc.id).data.location,"booth");
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,resources);
  assert.equal(f.db.getCityRecord(f.guild,"roll_request",first.record_key).data.roll_id,first.data.roll_id);
  assert.deepEqual(continuationInbox(f.db,f.guild,f.pcs[1].owner_user_id),[]);
}));

for(const change of ["source","owner","position","audience"])test(`G04 restart cannot execute a stale ${change} continuation`,()=>nativeFixture(async f=>{
  const x=await compound(f,{locked:true});x.roll();const task=f.db.listCityRecords(f.guild,{kind:"action_continuation",includeGM:true})[0];
  configureSimulationEntity(f.db,f.guild,"location","booth",{locked:false});
  if(change==="source")indexWorldEvent(f.db,f.guild,{key:x.rows[1].source_event,status:"retracted"},"gm");
  if(change==="owner")f.db.db.prepare("UPDATE characters SET owner_user_id=? WHERE id=?").run(f.pcs[1].owner_user_id,x.pc.id);
  if(change==="position")f.db.updateCharacterData(x.pc.id,d=>{d.location="elsewhere";});
  if(change==="audience"){const a=f.db.getCityRecord(f.guild,"typed_intent",x.rows[1].record_key);f.db.saveCityRecord(f.guild,{...a,key:a.record_key,visibility:"character",subject_key:x.pc.id});}
  f.restart();drainActionContinuations(f.db,f.guild,{retry:task.record_key});
  assert.notEqual(f.db.getCharacter(x.pc.id).data.location,"booth");
  assert.equal(f.db.getCityRecord(f.guild,"action_continuation",task.record_key).status,"needs_adjudication");
}));

test("G04 failed native prerequisite has an explicit neutral dependent disposition; independent observation survives",()=>nativeFixture(async f=>{
  const x=await compound(f);x.roll([2,3]);
  const task=f.db.listCityRecords(f.guild,{kind:"action_continuation",includeGM:true})[0];assert.equal(task?.status,"blocked");
  assert.equal(f.db.getCharacter(x.pc.id).data.location,"terminal");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"compound_action",includeGM:true}).find(n=>n.data.action_id===x.rows[2].record_key).data.status,"ready");
}));

test("G04 continuation checkpoint, native arrival and queued notice roll back together, then retry once",()=>nativeFixture(async f=>{
  const x=await compound(f),save=f.db.saveCityRecord.bind(f.db);f.db.saveCityRecord=(g,r)=>{
    if(r.kind==="action_continuation"&&r.status==="resolved")throw new Error("synthetic continuation checkpoint failure");return save(g,r);};
  assert.throws(()=>x.roll(),/synthetic continuation/);f.db.saveCityRecord=save;
  assert.equal(f.db.getCharacter(x.pc.id).data.location,"terminal");assert.equal(f.db.getCityRecord(f.guild,"roll_request",x.request.record_key).status,"pending");
  x.roll();const task=f.db.listCityRecords(f.guild,{kind:"action_continuation",includeGM:true})[0];f.restart();
  drainActionContinuations(f.db,f.guild,{retry:task.record_key});
  assert.equal(f.db.getCharacter(x.pc.id).data.location,"booth");
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).filter(e=>e.kind==="arrival").length,1);
  assert.equal(f.db.getWorldEvent(f.guild,worldInputKey("continuation-source",x.pc.id)).details.text,x.text);
}));

test("G04 continuation notice uses owner-private outbox proof; source revocation blocks send, not prior native effects",()=>nativeFixture(async f=>{
  const x=await compound(f);x.roll();const task=f.db.listCityRecords(f.guild,{kind:"action_continuation",includeGM:true})[0];
  const rows=f.db.db.prepare("SELECT * FROM publication_outbox WHERE guild_id=?").all(f.guild);assert.equal(rows.length,1);
  assert.equal(rows[0].visibility,"character");assert.equal(rows[0].target_user_id,x.pc.owner_user_id);
  indexWorldEvent(f.db,f.guild,{key:task.source_event,status:"retracted"},"gm");let sends=0;
  const result=await deliverTurnOutbox(f.db,f.guild,rows[0].turn_id,async()=>{sends++;return {messageId:"must-not-send"};});
  assert.equal(sends,0);assert.equal(result[0].ok,false);assert.equal(f.db.getCharacter(x.pc.id).data.location,"booth");
}));

test("G04 actual committed compound turn retains suspended movement until its real native roll resolves",()=>nativeFixture(async f=>{
  const x=await compound(f),id="production-continuation",text="I read another sign. I enter the booth.";
  captureWorldInput(f.db,f.guild,x.pc.owner_user_id,x.pc.id,id,text);
  const base={target_name:"",target_key:"",destination:"unspecified",utterance:"",excluded_targets:[],framing:"immediate",resolution:"auto",reason:""};
  const result={narration:"The sign needs a native check; entry remains uncommitted.",narrative_claims:[],player_intents:[
    {...base,type:"interact",operation:"read",source_span:"I read another sign.",resolution:"roll_required",reason:"Obscured sign",
      native_adjudication:{risk:"Obscured text",stakes:"No information on failure",saved_ruling_key:"continuation-inspect",override_refs:[],raw_refs:[],house_refs:[],homebrew_refs:[],
        trait:"Knowledge",kind:"action",difficulty:10,modifier_keys:[],attack_source:"",explanation:"Reviewed current sign."}},
    {...base,type:"move",operation:"enter",source_span:"I enter the booth.",target_key:"booth",target_name:"Booth",destination:"interior",depends_on:[0]}],
    scene_actions:[{kind:"move",entity_ref:"booth",source_span:"I enter the booth.",zone:"interior"}]};
  assert.doesNotThrow(()=>commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope:x.scope,speaker:"Jaxon",label:"Compound replay",meta:{messageId:id,triggerText:text}}));
  assert.equal(f.db.getCharacter(x.pc.id).data.location,"terminal");
  const pending=f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).find(q=>q.source_event===worldInputKey(id,x.pc.id)||q.data.input.accepted_intent===
    f.db.listCityRecords(f.guild,{kind:"typed_intent",includeGM:true}).find(a=>a.data.source_span==="I read another sign.")?.record_key);
  assert(pending);let n=0;contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:"roll",request:pending.record_key,expected_revision:rollRevision(pending),key:"production-roll"},{rng:()=>[9,2][n++]});
  assert.equal(f.db.getCharacter(x.pc.id).data.location,"booth");
}));

test("G04 real compound commit does not prepare a dependent roll before its prerequisite",()=>nativeFixture(async f=>{
  const x=await compound(f),id="dependent-native-roll",spans=["I read another sign.","I read the next obscured sign."],text=spans.join(" ");
  captureWorldInput(f.db,f.guild,x.pc.owner_user_id,x.pc.id,id,text);
  const base={type:"interact",operation:"read",target_name:"",target_key:"",destination:"unspecified",utterance:"",excluded_targets:[],framing:"immediate",resolution:"roll_required",reason:"Obscured sign",
    native_adjudication:{risk:"Obscured text",stakes:"No information on failure",saved_ruling_key:"continuation-inspect",override_refs:[],raw_refs:[],house_refs:[],homebrew_refs:[],
      trait:"Knowledge",kind:"action",difficulty:10,modifier_keys:[],attack_source:"",explanation:"Reviewed obscured sign."}};
  const result={narration:"The first sign awaits its native check; the next sign depends on it.",narrative_claims:[],player_intents:[
    {...base,source_span:spans[0]},{...base,source_span:spans[1],depends_on:[0]}]};
  const committed=commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope:x.scope,speaker:"Jaxon",label:"Deferred native roll",meta:{messageId:id,triggerText:text}});
  assert.equal(committed.nativeAdjudications.length,1,"dependent native roll must not exist before current prerequisite outcome");
  const request=f.db.getCityRecord(f.guild,"roll_request",committed.nativeAdjudications[0].roll_request_ref);let n=0;
  contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:"roll",request:request.record_key,expected_revision:rollRevision(request),key:"first-sign"},{rng:()=>[9,2][n++]});
  const a=committed.typedIntents[1],task=f.db.listCityRecords(f.guild,{kind:"action_continuation",includeGM:true}).find(t=>t.data.action===a.record_key);
  assert.equal(task.status,"needs_adjudication");assert.match(task.data.reason,/native adjudication/);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true}).filter(q=>q.data.input.accepted_intent===a.record_key).length,0);
}));

test("G04 private Discord continuation inbox resumes only its current owner",()=>nativeFixture(async f=>{
  const x=await compound(f,{locked:true});x.roll();configureSimulationEntity(f.db,f.guild,"location","booth",{locked:false});
  const task=continuationInbox(f.db,f.guild,x.pc.owner_user_id)[0];const sent=[],privateSends=[];
  const interaction={id:"continuation-adapter",guildId:f.guild,guild:{id:f.guild,members:{fetch:async user=>({send:async text=>{privateSends.push({user,text});return {id:"continuation-dm"};}})}},user:{id:x.pc.owner_user_id,username:x.pc.name},
    isChatInputCommand:()=>true,commandName:"vc-roll",options:{getSubcommand:()=>"window",getString:()=>JSON.stringify({op:"continuation-resume",task:task.task})},
    reply:async p=>{sent.push(p);return {id:"offline"};},followUp:async p=>{sent.push(p);return {id:"offline"};}};
  await handleCommand(interaction,{db:f.db,gm:{}});assert.equal(f.db.getCharacter(x.pc.id).data.location,"booth");
  assert(sent.length);assert(sent.every(p=>p.ephemeral&&p.content.length<=2000));
  assert.equal(privateSends.length,1,"post-commit native continuation must actually reach its owner through the existing outbox adapter");
  assert.equal(privateSends[0].user,x.pc.owner_user_id);assert.match(privateSends[0].text,/native arrival/);
  await handleCommand(interaction,{db:f.db,gm:{}});assert.equal(privateSends.length,1,"native adapter replay cannot repeat the notice or movement");
}));

test("G04 edited accepted target cannot replace a held original declaration",()=>nativeFixture(async f=>{
  const x=await compound(f,{locked:true});x.roll();const task=continuationInbox(f.db,f.guild,x.pc.owner_user_id)[0];
  const a=f.db.getCityRecord(f.guild,"typed_intent",x.rows[1].record_key);
  f.db.saveCityRecord(f.guild,{...a,key:a.record_key,data:{...a.data,target_key:"terminal"}});
  drainActionContinuations(f.db,f.guild,{retry:task.task});assert.equal(f.db.getCityRecord(f.guild,"action_continuation",task.task).status,"needs_adjudication");
  assert.match(f.db.getCityRecord(f.guild,"action_continuation",task.task).data.reason,/original|changed/i);
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).filter(e=>e.kind==="arrival").length,0);
}));

test("G04 restart recovers native completion checkpoint without another roll",()=>nativeFixture(async f=>{
  const x=await compound(f),native=x.roll(),task=continuationInbox(f.db,f.guild,x.pc.owner_user_id)[0];
  f.restart();refreshActionContinuations(f.db,f.guild);
  assert.equal(f.db.getCharacter(x.pc.id).data.location,"booth");
  assert.equal(f.db.getCityRecord(f.guild,"roll_request",native.record_key).data.roll_id,native.data.roll_id);
  assert.equal(continuationInbox(f.db,f.guild,x.pc.owner_user_id)[0].task,task.task);
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).filter(e=>e.kind==="arrival").length,1);
}));

test("G04 older committed native result without a continuation checkpoint resumes from original source after restart",()=>nativeFixture(async f=>{
  const x=await compound(f),plans=f.db.listCityRecords(f.guild,{kind:"compound_action",includeGM:true});
  // Simulate old-version derived planning state, not fabricated native dice or changed owner declarations.
  for(const n of plans.filter(n=>n.data.action_id!==x.rows[0].record_key))
    f.db.db.prepare("DELETE FROM city_records WHERE guild_id=? AND kind='compound_action' AND record_key=?").run(f.guild,n.record_key);
  const native=x.roll();assert.equal(f.db.getCharacter(x.pc.id).data.location,"terminal");f.restart();
  buildActionPlan(f.db,f.guild,x.rows.map(a=>f.db.getCityRecord(f.guild,"typed_intent",a.record_key)));
  refreshActionContinuations(f.db,f.guild);assert.equal(f.db.getCharacter(x.pc.id).data.location,"booth");
  assert.equal(f.db.getCityRecord(f.guild,"roll_request",native.record_key).data.roll_id,native.data.roll_id);
  refreshActionContinuations(f.db,f.guild);
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).filter(e=>e.kind==="arrival").length,1);
}));

test("G04 moved destination and unresolved native interruption hold only the dependent action",()=>nativeFixture(async f=>{
  const x=await compound(f,{locked:true});x.roll();const task=continuationInbox(f.db,f.guild,x.pc.owner_user_id)[0];
  configureSimulationEntity(f.db,f.guild,"location","booth",{locked:false,parent_location_key:"elsewhere"});
  drainActionContinuations(f.db,f.guild,{retry:task.task});assert.equal(f.db.getCharacter(x.pc.id).data.location,"terminal");
  const n=f.db.listCityRecords(f.guild,{kind:"compound_action",includeGM:true}).find(n=>n.data.action_id===x.rows[1].record_key);
  f.db.saveCityRecord(f.guild,{kind:"action_interrupt_receipt",key:"native-interrupt",status:"pending",visibility:"gm",source_event:n.source_event,data:{action:n.record_key}});
  f.db.saveCityRecord(f.guild,{...n,key:n.record_key,data:{...n.data,interrupt_refs:["native-interrupt"]}});
  configureSimulationEntity(f.db,f.guild,"location","booth",{parent_location_key:"terminal"});
  drainActionContinuations(f.db,f.guild,{retry:task.task});assert.match(f.db.getCityRecord(f.guild,"action_continuation",task.task).data.reason,/interruption/i);
  assert.equal(f.db.getCharacter(x.pc.id).data.location,"terminal");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"compound_action",includeGM:true}).find(n=>n.data.action_id===x.rows[2].record_key).data.status,"ready");
}));

for(const variant of ["win","decline","fear","strikes","tie","withdraw"])test(`G04 exact native PvP ${variant} dependent action without a fabricated reaction`,()=>nativeFixture(async f=>{
  const decline=variant==="decline";
  const neutral=decline||variant==="tie"||variant==="withdraw";
  configureCityFlags(f.db,f.guild,{roll_requests:true,roll_collaboration:true},"gm");
  f.db.setSimulationEntity(f.guild,"location","terminal",{visibility:"party"});
  f.db.setSimulationEntity(f.guild,"location","booth",{parent_location_key:"terminal",visibility:"party"});
  f.db.upsertReference(f.guild,{kind:"location",key:"booth",name:"Booth",summary:"An adjacent open booth.",visibility:"party"});
  const pc=f.pcs[0],scope={mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  const spans=["I attempt a harmless shin tap.","I enter the booth."],text=spans.join(" ");
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,"pvp-continuation",text);
  const base={target_name:"",target_key:"",destination:"unspecified",utterance:"",excluded_targets:[],framing:"immediate",resolution:"auto",reason:""};
  const rows=persistPlayerIntents(f.db,f.guild,[{...base,type:"interact",operation:"contest",source_span:spans[0],target_key:f.pcs[1].id,target_name:"Choso"},
    {...base,type:"move",operation:"enter",source_span:spans[1],target_key:"booth",target_name:"Booth",destination:"interior",depends_on:[0]}],scope,{messageId:"pvp-continuation"});
  buildActionPlan(f.db,f.guild,rows);
  const p=proposePvp(f.db,f.guild,pc.owner_user_id,{accepted_intent:rows[0].record_key,opponent:f.pcs[1].id,terms:pvpTerms(f.pcs,{mode:variant==="strikes"?"three_strikes":"single_roll_duel"})});
  for(const who of f.pcs.slice(0,2)){reviewPvp(f.db,f.guild,who.owner_user_id,p.record_key);
    respondPvp(f.db,f.guild,who.owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,decision:decline&&who.id===f.pcs[1].id?"decline":"accept",interaction_id:`consent-${who.id}`});}
  if(variant==="withdraw")respondPvp(f.db,f.guild,pc.owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,decision:"withdraw",interaction_id:"withdraw-original"});
  if(!decline&&variant!=="withdraw"){
    const input=i=>{const v=progressPvp(f.db,f.guild,f.pcs[i].owner_user_id,p.record_key);return {proposal:p.record_key,expected_revision:p.data.terms_hash,round:v.round,expected_window_revision:v.window_revision,interaction_id:`${i}-${v.window_revision}`};};
    for(let round=0;round<(variant==="strikes"?3:1);round++){
    for(let i=0;i<2;i++)choosePvp(f.db,f.guild,f.pcs[i].owner_user_id,{...input(i),trait:"Agility",attempt:"I attempt my own harmless feint."});
    const faces=variant==="tie"?[[7,4],[6,5]]:[variant==="fear"?[6,9]:[9,2],[4,1]];
    for(let i=0;i<2;i++){let n=0;rollPvp(f.db,f.guild,f.pcs[i].owner_user_id,input(i),{rng:()=>faces[i][n++]});}
    if(variant==="strikes"&&round<2){
      assert.equal(f.db.getCharacter(pc.id).data.location,"terminal");
      for(let i=0;i<2;i++)continuePvp(f.db,f.guild,f.pcs[i].owner_user_id,input(i));
    }
    }
    if(variant==="fear"){
      assert.equal(f.db.getCharacter(pc.id).data.location,"terminal");
      assert.equal(f.db.listCityRecords(f.guild,{kind:"action_continuation",includeGM:true}).length,0,"native pair does not waive immediate Fear");
      f.db.changeClock(f.guild,"closing-time",0,{max:6,visibility:"party"});
      const context=establishFearContext(f.db,f.guild,"gm",{move_kind:"clock_advance",target_key:"closing-time",location_key:"terminal",visibility:"party",subject_key:null},{gm:true,interactionId:"continuation-clock"});
      const t=f.db.listCityRecords(f.guild,{kind:"pvp_fear_trigger",includeGM:true})[0];
      const d=selectFearMove(f.db,f.guild,"gm",{trigger:t.record_key,expected_revision:t.data.revision,context:context.record_key,
        expected_target_revision:fearRevision(f.db.getClock(f.guild,"closing-time")),affected_actions:[]},{gm:true,interactionId:"continuation-fear-selection"});
      const current=f.db.getCityRecord(f.guild,"pvp_fear_trigger",t.record_key);
      applyFearMove(f.db,f.guild,"gm",{trigger:t.record_key,expected_revision:current.data.revision,decision:d.record_key},{gm:true});
      assert.equal(f.db.getClock(f.guild,"closing-time").value,1);
    }
  }
  const tasks=f.db.listCityRecords(f.guild,{kind:"action_continuation",includeGM:true});assert.equal(tasks.length,1);
  assert.equal(tasks[0].status,neutral?"blocked":"resolved");
  assert.equal(f.db.getCharacter(pc.id).data.location,neutral?"terminal":"booth");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_narrative",includeGM:true}).length,0);
}));

test("G04 actual window custody receipt, not merely window lock, unlocks original dependent movement",()=>nativeFixture(async f=>{
  const x=await compound(f,{custody:true});configureCityFlags(f.db,f.guild,{evidence_custody:true,scene_continuity:true},"gm");
  const handout=f.db.createHandout(f.guild,{title:"Parcel",visibility:"party"});
  const action=f.db.getCityRecord(f.guild,"typed_intent",x.rows[0].record_key);
  // Coordination interprets this accepted inspection; it cannot substitute a new declaration or outcome.
  const a=f.db.saveCityRecord(f.guild,{...action,key:action.record_key,data:{...action.data,coordination:{reason:"contested_resource",beat_key:"continuation-parcel",
    reads:[],writes:[`item:${handout.id}:custody`],location_key:"terminal",operation:"claim",required_participants:[],consent_refs:[]}}});
  const rows=[a,...x.rows.slice(1)],plan=buildActionPlan(f.db,f.guild,rows),w=coordinateTypedActionWindows(f.db,f.guild,rows,plan)[0].window;
  advanceActionWindow(f.db,f.guild,"gm",{window:w.record_key,expected_revision:f.db.getCityRecord(f.guild,"scene_action_window",w.record_key).data.revision,op:"close"},{gm:true});
  assert.equal(f.db.getCharacter(x.pc.id).data.location,"terminal");
  const source=(key,from,to)=>indexWorldEvent(f.db,f.guild,{key,kind:"evidence_transfer",source_id:"gm",title:"Reviewed native parcel event",
    details:{human_reviewed:true,window:w.record_key,accepted_intent:a.record_key,evidence:{handout_id:handout.id,from,to}}},"gm").event_key;
  manageEvidence(f.db,f.guild,{op:"register",key:"register",id:handout.id,source_event:source("register",null,"location:terminal"),
    holder:"location:terminal",expected_revision:stateRevision(undefined)},"gm",{gm:true});
  const arrival=indexWorldEvent(f.db,f.guild,{key:"presence",kind:"arrival",source_id:"gm",title:"At terminal",location_key:"terminal",visibility:"party"},"gm");
  recordScenePresence(f.db,f.guild,{entity_type:"character",entity_key:x.pc.id,location_key:"terminal",source_event:arrival.event_key,accepted_by:x.pc.owner_user_id,visibility:"party"},"gm");
  manageEvidence(f.db,f.guild,{op:"collect",key:"collect",id:handout.id,source_event:source("collect","location:terminal",`character:${x.pc.id}`),
    expected_revision:stateRevision(f.db.getHandout(handout.id).metadata.evidence)},x.pc.owner_user_id);
  reconcileWindowCustody(f.db,f.guild,w.record_key,`${handout.id}:collect`);
  assert.equal(f.db.getCharacter(x.pc.id).data.location,"booth");
  assert.equal(f.db.getCityRecord(f.guild,"roll_request",x.request.record_key).status,"pending","custody did not roll the independent native request");
}));
