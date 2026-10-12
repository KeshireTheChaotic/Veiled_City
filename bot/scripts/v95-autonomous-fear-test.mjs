/** V95-02 red-first: saved PvP Fear becomes ordered, native, immediate world consequences. */
import test from "node:test";
import assert from "node:assert/strict";
import {nativeFixture,pvpTerms} from "./v9-fixtures.mjs";
import {proposePvp,reviewPvp,respondPvp,choosePvp,rollPvp,progressPvp,continuePvp} from "../src/narrative-pvp.js";
import {configureCityFlags} from "../src/city-core.js";
import {resumeAutonomousPvpFear,resolveAutonomousPvpFear,applyFearMove,establishFearContext,fearRevision} from "../src/pvp-fear-moves.js";
import {publishPvpNotices,materializeNativeNotices} from "../src/native-publications.js";
import {attackFixture} from "./v94-pvp-attack-fixtures.mjs";
import {preparePvpAttack,reviewPvpAttack,authorizePvpAttack,rollPvpAttack} from "../src/pvp-attacks.js";
import {preparePvpReaction,reviewPvpReaction,rollPvpReaction} from "../src/pvp-reactions.js";
import {indexWorldEvent} from "../src/city-calendar.js";
import {EncounterLibrary} from "../src/encounter.js";
import {buildCombatants} from "../src/combat.js";
import {manageWorldEncounter,worldCombatantDrafts,bindWorldCombatants} from "../src/encounter.js";
import {currentScene,recordScenePresence} from "../src/scene-continuity.js";
import {configureSimulationEntity} from "../src/simulation.js";
import {configureWorldAuthority} from "../src/autonomous-world.js";
import {captureWorldInput} from "../src/autonomous-world.js";
import {persistPlayerIntents} from "../src/typed-intents.js";
import {buildActionPlan,transitionAction} from "../src/action-dependency.js";
import {adjudicateAcceptedIntent} from "../src/rules-arbitration.js";
import {prepareRollRequest,rollRevision} from "../src/roll-requests.js";
import {contributeRoll} from "../src/roll-collaboration.js";
import {drainActionContinuations} from "../src/action-continuation.js";
import {deliverTurnOutbox,queueTurnPublications} from "../src/publication-outbox.js";
import {prepareAuthorizedTurnOutput,prepareStoredOutput,certifiedSessionRecap,deliveredPartyOutput} from "../src/pvp-output.js";
import {publishJournal,postJournalEntry} from "../src/publishing.js";
import {VoiceNarrator} from "../src/voice.js";

function independentInvestigation(f,actor=3){
  configureCityFlags(f.db,f.guild,{roll_requests:true,roll_collaboration:true},"synthetic-test");
  const pc=f.pcs[actor],a=f.accepted(actor,"I examine the independent terminal panel.","terminal",{type:"search",operation:"search",
    target:{kind:"location",key:"terminal",phrase:"terminal",grounding:"known"}});
  const q=prepareRollRequest(f.db,f.guild,{accepted_intent:a.record_key,source_event:a.source_event,character_id:pc.id,
    trait:"Knowledge",kind:"action",adjudication:"Independent terminal panel",modifier_keys:[]},"gm");
  let n=0;contributeRoll(f.db,f.guild,pc.owner_user_id,{op:"roll",request:q.record_key,expected_revision:rollRevision(q),key:`independent:${actor}`},
    {rng:()=>[9,2][n++]});
  assert.equal(f.db.getCityRecord(f.guild,"roll_request",q.record_key).status,"resolved");return q;
}

function records(f,kind){return f.db.listCityRecords(f.guild,{kind,includeGM:true,limit:100});}
function establishFearVenue(f){
  configureSimulationEntity(f.db,f.guild,"location","terminal",{name:"Twenty-Four Spin",description:"A neighborhood diner",access:"public"});
  configureCityFlags(f.db,f.guild,{scene_continuity:true},"synthetic-test");
  const scene=currentScene(f.db,f.guild),source=indexWorldEvent(f.db,f.guild,{key:"v95-fear-scene-presence",kind:"observation",
    title:"Established current-scene participant presence",source_id:"gm:gm",session_id:scene.session_id,scene:scene.key,
    location_key:"terminal",visibility:"party"},"gm");
  for(const pc of f.pcs)recordScenePresence(f.db,f.guild,{source_event:source.event_key,entity_type:"character",entity_key:pc.id,
    location_key:"terminal",visibility:"party",accepted_by:pc.owner_user_id},"gm");
}
function paired(f,faces,{automatic=true,audience="bilateral_author_projection",mode="single_roll_duel"}={}){
  if(automatic===null)f.db.setCityCalendar(f.guild,{flags:{scene_continuity:f.db.getCityCalendar(f.guild).flags.scene_continuity}});
  else configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:automatic},"synthetic-test");
  const accepted=f.accepted(0,"I try a harmless feint.",f.pcs[1].id);
  const p=proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:accepted.record_key,opponent:f.pcs[1].id,
    terms:pvpTerms(f.pcs,{audience,mode})});
  for(let i=0;i<2;i++){
    reviewPvp(f.db,f.guild,f.pcs[i].owner_user_id,p.record_key);
    respondPvp(f.db,f.guild,f.pcs[i].owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,
      decision:"accept",interaction_id:`auto-consent-${i}`});
  }
  const op=(i,kind)=>{const v=progressPvp(f.db,f.guild,f.pcs[i].owner_user_id,p.record_key);return {proposal:p.record_key,
    expected_revision:p.data.terms_hash,round:v.round,expected_window_revision:v.window_revision,interaction_id:`auto:${kind}:${i}:${v.window_revision}`};};
  for(let i=0;i<2;i++)choosePvp(f.db,f.guild,f.pcs[i].owner_user_id,{...op(i,"choose"),trait:"Agility",attempt:"A harmless feint."});
  const result=[];
  for(let i=0;i<2;i++){let n=0;result.push(rollPvp(f.db,f.guild,f.pcs[i].owner_user_id,op(i,"roll"),{rng:()=>faces[i][n++]}));}
  return {p,result};
}

function establishedClock(f){
  establishFearVenue(f);
  f.db.changeClock(f.guild,"service-closing",0,{max:6,visibility:"party",label:"The terminal service closes"});
  return establishFearContext(f.db,f.guild,"gm",{move_kind:"clock_advance",target_key:"service-closing",
    location_key:"terminal",visibility:"party",subject_key:null},{gm:true,interactionId:"service-closing-context"});
}
for(const [name,faces,mode,winner] of [
  ["FEA01/FEA06 winning Fear Duel",[[3,10],[4,2]],"single_roll_duel",0],
  ["FEA07 losing Fear Duel",[[2,7],[10,4]],"single_roll_duel",1],
  ["FEA09 tied Three Strikes",[[3,10],[9,4]],"three_strikes",null],
])test(`${name} autonomously advances the established clock once without rewriting the native outcome`,()=>nativeFixture(f=>{
  const context=establishedClock(f),resources=f.pcs.map(p=>f.db.getCharacter(p.id).data.resources);
  const {p}=paired(f,faces,{mode,automatic:false}),rounds=records(f,"pvp_round_receipt"),strikes=records(f,"pvp_strike_receipt"),
    resolutions=records(f,"pvp_resolution_receipt");
  assert.equal(strikes[0].data.winner,winner===null?null:f.pcs[winner].id);
  configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  const effects=resumeAutonomousPvpFear(f.db,f.guild);
  assert.equal(effects.length,1);assert.equal(effects[0].data.context,context.record_key);
  assert.equal(effects[0].data.move_kind,"clock_advance");assert.equal(f.db.getClock(f.guild,"service-closing").value,1);
  assert.deepEqual(records(f,"pvp_round_receipt"),rounds);assert.deepEqual(records(f,"pvp_strike_receipt"),strikes);
  assert.deepEqual(records(f,"pvp_resolution_receipt"),resolutions);
  assert.deepEqual(f.pcs.map(p=>f.db.getCharacter(p.id).data.resources),resources);assert.equal(f.db.getCampaign(f.guild).fear,0);
  f.restart();assert.deepEqual(resumeAutonomousPvpFear(f.db,f.guild),[]);
  assert.equal(records(f,"pvp_fear_effect_receipt").length,1);assert.equal(f.db.getClock(f.guild,"service-closing").value,1);
  assert.equal(records(f,"fear_threat_establishment").length,0);assert.equal(p.data.terms_hash,rounds[0].data.terms_hash);
}));

test("FEA08/FEA12 restart resumes two Fear obligations in native paired order rather than hashed-key order",()=>nativeFixture(f=>{
  establishedClock(f);paired(f,[[3,10],[4,11]],{automatic:false});
  const ordered=records(f,"pvp_fear_trigger").sort((a,b)=>a.data.trigger_ordinal-b.data.trigger_ordinal);
  // Reverse database enumeration explicitly: recovery must follow the native gate, not SQL/hash order.
  configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");f.restart();
  const list=f.db.listCityRecords.bind(f.db);f.db.listCityRecords=(guild,options)=>{
    const rows=list(guild,options);return options.kind==="pvp_fear_trigger"?rows.sort((a,b)=>b.data.trigger_ordinal-a.data.trigger_ordinal):rows;
  };
  const effects=resumeAutonomousPvpFear(f.db,f.guild);
  assert.deepEqual(effects.map(e=>e.data?.trigger),ordered.map(t=>t.record_key));
  assert.equal(f.db.getClock(f.guild,"service-closing").value,2);assert.equal(records(f,"pvp_exchange_gate")[0].status,"ready");
  assert.equal(f.db.getCampaign(f.guild).fear,0);assert.deepEqual(resumeAutonomousPvpFear(f.db,f.guild),[]);
}));

test("FEA10 pending Fear gates only the next Three Strikes exchange; an independent owner still resolves a native action",()=>nativeFixture(f=>{
  establishedClock(f);const {p}=paired(f,[[3,10],[9,4]],{automatic:false,mode:"three_strikes"});
  const input=i=>{const v=progressPvp(f.db,f.guild,f.pcs[i].owner_user_id,p.record_key);return {proposal:p.record_key,
    expected_revision:p.data.terms_hash,round:v.round,expected_window_revision:v.window_revision,interaction_id:`continue:${i}:${v.window_revision}`};};
  assert.throws(()=>continuePvp(f.db,f.guild,f.pcs[0].owner_user_id,input(0)),/Fear.*pending/i);
  independentInvestigation(f);assert.equal(records(f,"pvp_fear_effect_receipt").length,0);
  configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");resumeAutonomousPvpFear(f.db,f.guild);
  for(let i=0;i<2;i++)continuePvp(f.db,f.guild,f.pcs[i].owner_user_id,input(i));
  const v=progressPvp(f.db,f.guild,f.pcs[0].owner_user_id,p.record_key);assert.equal(v.round,2);
  assert(Object.values(v.scores).every(score=>score===0));assert.equal(records(f,"pvp_round_receipt").length,2);
}));

test("FEA15 private threat stays private at deferred/restarted delivery, summaries, journals, shared memory and voice",()=>nativeFixture(async f=>{
  establishFearVenue(f);paired(f,[[3,10],[9,2]],{audience:"private"});
  const effect=records(f,"pvp_fear_effect_receipt")[0];materializeNativeNotices(f.db,f.guild);
  const notice=records(f,"pvp_fear_publication")[0],scope={mode:"private",actorUserId:f.pcs[0].owner_user_id,actorCharacterId:f.pcs[0].id};
  f.restart();const sends=[];
  await deliverTurnOutbox(f.db,f.guild,notice.data.turn_id,async row=>{sends.push(row);return {messageId:"private-threat",channelId:"private"};});
  assert(sends.length>0);assert(sends.every(row=>row.visibility==="character"&&row.target_user_id===scope.actorUserId));
  const text=sends.map(r=>r.payload).join("\n");assert.match(text,/service area interrupted/i);
  assert.equal(deliveredPartyOutput(f.db,f.guild,notice.data.turn_id),"");assert.equal(certifiedSessionRecap(f.db,f.guild,f.session.id),"");
  assert.throws(()=>prepareStoredOutput(f.db,f.guild,text,{mode:"party"}));
  assert.throws(()=>prepareStoredOutput(f.db,f.guild,text,{mode:"private",actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id}));
  const party={narration:text,player_summary:text,context_memories:[{content:text}],npc_knowledge:[{content:text}]};
  prepareAuthorizedTurnOutput(f.db,f.guild,party,{mode:"party",actorUserId:f.pcs[2].owner_user_id,actorCharacterId:f.pcs[2].id});
  assert(!party.narration.includes("service area interrupted"));assert(!party.player_summary.includes("service area interrupted"));
  assert.deepEqual(party.context_memories,[]);assert.deepEqual(party.npc_knowledge,[]);
  let journalSends=0;f.db.configureChannels(f.guild,{journalChannelId:"journal"});
  const guild={id:f.guild,channels:{fetch:async()=>({isTextBased:()=>true,send:async()=>{journalSends++;}})}};
  await assert.rejects(()=>publishJournal({db:f.db,guild,session:f.session,recap:text}));
  await assert.rejects(()=>postJournalEntry({db:f.db,guild,content:text}));assert.equal(journalSends,0);
  let syntheses=0;const voice=new VoiceNarrator({voiceEnabled:true},{db:f.db,getConnection:()=>({}),synthesize:async()=>{syntheses++;return Buffer.alloc(0);}});
  assert.equal((await voice.narrate(guild,text,{force:true,turnId:notice.data.turn_id})).ok,false);
  assert.equal(syntheses,0);assert.equal(f.db.getCityRecord(f.guild,"pvp_fear_effect_receipt",effect.record_key).status,"resolved");
}));

test("FEA17 retraction after a real autonomous effect holds restarted delivery, not saved mechanics or independent work",()=>nativeFixture(async f=>{
  establishedClock(f);paired(f,[[3,10],[9,2]]);const effect=records(f,"pvp_fear_effect_receipt")[0];
  materializeNativeNotices(f.db,f.guild);const notice=records(f,"pvp_fear_publication")[0],rounds=records(f,"pvp_round_receipt"),
    strikes=records(f,"pvp_strike_receipt"),resources=f.pcs.slice(0,2).map(p=>f.db.getCharacter(p.id).data.resources);
  indexWorldEvent(f.db,f.guild,{key:effect.source_event,status:"retracted"},"gm");f.restart();let sends=0;
  const deliveries=await deliverTurnOutbox(f.db,f.guild,notice.data.turn_id,async()=>{sends++;return {messageId:"unsafe",channelId:"table"};});
  assert(deliveries.some(d=>!d.ok));assert.equal(sends,0);assert.equal(certifiedSessionRecap(f.db,f.guild,f.session.id),"");
  assert.deepEqual(f.db.getCityRecord(f.guild,"pvp_fear_effect_receipt",effect.record_key),effect);
  assert.equal(f.db.getClock(f.guild,"service-closing").value,1);assert.deepEqual(records(f,"pvp_round_receipt"),rounds);
  assert.deepEqual(records(f,"pvp_strike_receipt"),strikes);assert.deepEqual(f.pcs.slice(0,2).map(p=>f.db.getCharacter(p.id).data.resources),resources);
  independentInvestigation(f);assert.deepEqual(resumeAutonomousPvpFear(f.db,f.guild),[]);
}));

test("FEA14 reviewed unsupported proposals cannot be retried through the direct autonomous entry point without reconciliation",()=>nativeFixture(f=>{
  establishFearVenue(f);paired(f,[[3,10],[9,2]],{automatic:false});configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  const [held]=resumeAutonomousPvpFear(f.db,f.guild,{proposeThreat:()=>({resource_delta:{hp:1}})});assert.equal(held.status,"needs_review");
  let proposals=0;const again=resolveAutonomousPvpFear(f.db,f.guild,held.trigger,{proposeThreat:()=>{proposals++;return null;}});
  assert.equal(again.status,"needs_review");assert.equal(proposals,0);
  assert.equal(records(f,"pvp_fear_effect_receipt").length,0);assert.equal(records(f,"fear_threat_establishment").length,0);
}));

test("FEA18 an explicit manual override also gates the direct autonomous entry point",()=>nativeFixture(f=>{
  establishFearVenue(f);paired(f,[[3,10],[9,2]],{automatic:false});const trigger=records(f,"pvp_fear_trigger")[0];
  assert.equal(resolveAutonomousPvpFear(f.db,f.guild,trigger.record_key).status,"awaiting_manual");
  assert.deepEqual(f.db.getCityRecord(f.guild,"pvp_fear_trigger",trigger.record_key),trigger);
  assert.equal(records(f,"fear_threat_establishment").length,0);assert.equal(records(f,"pvp_fear_effect_receipt").length,0);
}));

for(const failure of ["pvp_fear_effect_receipt","pvp_fear_publication"])
test(`FEA18 crash at ${failure} rolls back the immediate consequence and resumes the same established threat once`,()=>nativeFixture(f=>{
  establishFearVenue(f);paired(f,[[3,10],[9,2]],{automatic:false});configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  const savedRounds=records(f,"pvp_round_receipt"),save=f.db.saveCityRecord.bind(f.db);let faults=0;
  f.db.saveCityRecord=(guild,input)=>{if(input.kind===failure&&faults++===0)throw new Error("Synthetic Fear commit fault");return save(guild,input);};
  try{assert.throws(()=>resumeAutonomousPvpFear(f.db,f.guild),/Synthetic Fear commit fault/);}finally{f.db.saveCityRecord=save;}
  const establishment=records(f,"fear_threat_establishment")[0];assert(establishment);assert.equal(records(f,"fear_threat_establishment").length,1);
  assert.equal(f.db.getCityRecord(f.guild,"pvp_fear_threat_state",establishment.data.state_ref).data.progress,0);
  assert.equal(records(f,"pvp_fear_effect_receipt").length,0);assert.equal(records(f,"pvp_fear_threat_progression_receipt").length,0);
  assert.equal(records(f,"pvp_fear_publication").length,0);assert.equal(records(f,"pvp_fear_trigger")[0].status,"move_selected");
  f.restart();const [effect]=resumeAutonomousPvpFear(f.db,f.guild);assert.equal(effect.status,"resolved");
  assert.equal(effect.data.threat_establishment_ref,establishment.record_key);assert.equal(records(f,"fear_threat_establishment").length,1);
  assert.equal(f.db.getCityRecord(f.guild,"pvp_fear_threat_state",establishment.data.state_ref).data.progress,1);
  assert.equal(records(f,"pvp_fear_effect_receipt").length,1);assert.equal(records(f,"pvp_fear_publication").length,1);
  assert.deepEqual(records(f,"pvp_round_receipt"),savedRounds);assert.deepEqual(resumeAutonomousPvpFear(f.db,f.guild),[]);
}));

test("FEA21 an unattended Fear in a grounded venue creates and advances one native NPC threat",()=>nativeFixture(f=>{
  establishFearVenue(f);
  const before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),campaignFear=f.db.getCampaign(f.guild).fear;
  const {p,result}=paired(f,[[3,10],[9,2]]),triggers=records(f,"pvp_fear_trigger"),effects=records(f,"pvp_fear_effect_receipt");
  assert.equal(triggers.length,1);assert.equal(triggers[0].status,"resolved",triggers[0].data.review_reason);assert.equal(effects.length,1);
  const creations=records(f,"fear_threat_establishment"),progressions=records(f,"pvp_fear_threat_progression_receipt");assert.equal(creations.length,1);
  assert.equal(creations[0].data.trigger,triggers[0].record_key);assert.equal(progressions.length,1);
  assert.equal(effects[0].data.threat_establishment_ref,creations[0].record_key);assert.equal(effects[0].data.threat_progression_ref,progressions[0].record_key);
  assert.equal(result[1].resolution.winner,f.pcs[0].id);assert.equal(f.db.getCampaign(f.guild).fear,campaignFear);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
  assert.equal(records(f,"pvp_resource_receipt").filter(r=>r.data.delta!==0).length,0);
  assert.equal(f.db.getCityRecord(f.guild,"pvp_fear_threat_state",creations[0].data.state_ref).data.progress,1);
  assert.equal(records(f,"pvp_exchange_gate")[0].status,"ready");assert.equal(f.db.getCityRecord(f.guild,"pvp_proposal",p.record_key).status,"resolved");
  const creationMutation=f.db.getMutation(f.guild,creations[0].data.creation_mutation_ref),effectMutation=f.db.getMutation(f.guild,effects[0].data.native_mutation_refs[0]);
  assert.equal(creationMutation.actor_type,"system");assert.equal(creationMutation.actor_id,"autonomous_pvp_fear");
  assert.equal(effectMutation.actor_type,"system");assert.equal(effectMutation.actor_id,"autonomous_pvp_fear");
}));

test("FEA22 two paired Fear dice create two separately receipted threat progressions in locked owner order",()=>nativeFixture(async f=>{
  establishFearVenue(f);
  const campaignFear=f.db.getCampaign(f.guild).fear,before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  const {result}=paired(f,[[3,10],[4,11]]),triggers=records(f,"pvp_fear_trigger").sort((a,b)=>a.data.trigger_ordinal-b.data.trigger_ordinal);
  const rank=id=>triggers.findIndex(t=>t.record_key===id),effects=records(f,"pvp_fear_effect_receipt").sort((a,b)=>rank(a.data.trigger)-rank(b.data.trigger)),
    created=records(f,"pvp_fear_threat_progression_receipt").sort((a,b)=>rank(a.data.trigger)-rank(b.data.trigger));
  assert.equal(triggers.length,2);assert(triggers.every(t=>t.status==="resolved"),JSON.stringify(triggers.map(t=>t.data.review_reason)));
  assert.equal(effects.length,2);assert.equal(created.length,2);
  assert.deepEqual(effects.map(e=>e.data.trigger),triggers.map(t=>t.record_key));
  assert.deepEqual(created.map(c=>c.data.trigger),triggers.map(t=>t.record_key));
  assert.equal(new Set(created.map(c=>c.data.state_ref)).size,1);assert.deepEqual(created.map(c=>c.data.after_progress),[1,2]);
  assert.equal(result[1].resolution.winner,f.pcs[1].id);
  assert.equal(f.db.getCampaign(f.guild).fear,campaignFear);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
  assert.equal(records(f,"pvp_exchange_gate")[0].status,"ready");
  const party=[];await publishPvpNotices(f.db,f.guild,records(f,"pvp_proposal")[0].record_key,(user,content)=>({messageId:`dm-${user}`,channelId:`dm-${user}`}),
    content=>{party.push(content);return {messageId:`party-${party.length}`,channelId:"table"};});
  assert.equal(party.length,2);assert(party.every(text=>/service area interrupted/i.test(text)));
}));

test("FEA23 critical or Fear reaction dice never create a PvP action complication",()=>nativeFixture(f=>{
  // A Critical is not Fear. Reaction rolls are covered independently by the native reaction authority suite.
  paired(f,[[12,12],[10,4]]);
  assert.equal(records(f,"pvp_fear_trigger").length,0);
  assert.equal(records(f,"pvp_fear_effect_receipt").length,0);
  assert.equal(records(f,"pvp_fear_complication_receipt").length,0);
}));

test("FEA24 opt-out preserves manual review; restart resume completes the saved obligation exactly once",()=>nativeFixture(f=>{
  establishFearVenue(f);
  paired(f,[[3,10],[9,2]],{automatic:false});
  const trigger=records(f,"pvp_fear_trigger")[0],saved=records(f,"pvp_round_receipt").map(r=>r.record_key);
  assert.equal(trigger.status,"awaiting_move");assert.equal(records(f,"pvp_fear_effect_receipt").length,0);
  configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");f.restart();
  const recovered=resumeAutonomousPvpFear(f.db,f.guild);
  assert.equal(recovered.length,1);assert.equal(recovered[0].status,"resolved");
  assert.deepEqual(records(f,"pvp_round_receipt").map(r=>r.record_key),saved);
  assert.equal(records(f,"pvp_fear_effect_receipt").length,1);
  assert.equal(resumeAutonomousPvpFear(f.db,f.guild).length,0);
  assert.equal(records(f,"pvp_fear_effect_receipt").length,1);
}));

test("FEA25 Fear consequences publish only to the negotiated audience through the native outbox",()=>nativeFixture(async f=>{
  establishFearVenue(f);
  const {p}=paired(f,[[3,10],[9,2]],{audience:"private"}),privateMessages=new Map(),partyMessages=[];
  const trigger=records(f,"pvp_fear_trigger")[0];assert.equal(trigger.status,"resolved",trigger.data.review_reason);
  await publishPvpNotices(f.db,f.guild,p.record_key,(user,content)=>{
    privateMessages.set(user,[...(privateMessages.get(user)||[]),content]);return {messageId:`dm-${user}-${privateMessages.get(user).length}`,channelId:`dm-${user}`};
  },content=>{partyMessages.push(content);return {messageId:`party-${partyMessages.length}`,channelId:"table"};});
  const roller=f.pcs[0].owner_user_id,other=f.pcs[1].owner_user_id;
  assert(privateMessages.get(roller).some(text=>/service area interrupted/i.test(text)),JSON.stringify([...privateMessages]));
  assert(!privateMessages.get(other).some(text=>/service area interrupted/i.test(text)));
  assert.equal(partyMessages.length,0);
  assert.equal(records(f,"pvp_fear_publication").filter(r=>r.status==="delivered").length,1);
  const sent=privateMessages.get(roller).length+privateMessages.get(other).length;
  await publishPvpNotices(f.db,f.guild,p.record_key,(user,content)=>{
    privateMessages.set(user,[...(privateMessages.get(user)||[]),content]);return {messageId:`duplicate-${user}`,channelId:`dm-${user}`};
  },content=>{partyMessages.push(content);return {messageId:`duplicate-party`,channelId:"table"};});
  assert.equal(privateMessages.get(roller).length+privateMessages.get(other).length,sent,"saved publications are not reposted on retry");
}));

test("FEA26 a damage-enabled PvP action Fear also creates an immediate native consequence, not HP or banked Fear",()=>nativeFixture(async f=>{
  establishFearVenue(f);
  configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  const x=await attackFixture(f),offer=preparePvpAttack(f.db,f.guild,"gm",x.input,{gm:true,interactionId:"v95-attack"});
  for(const pc of f.pcs.slice(0,2)){
    reviewPvpAttack(f.db,f.guild,pc.owner_user_id,offer.record_key);
    authorizePvpAttack(f.db,f.guild,pc.owner_user_id,{attack:offer.record_key,expected_revision:offer.data.offer_hash},{interactionId:`v95-auth-${pc.id}`});
  }
  const before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);let n=0;
  const roll=rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:offer.record_key,expected_revision:offer.data.offer_hash},{rng:()=>[1,2][n++]});
  assert.equal(roll.data.result.duality,"Fear");
  const trigger=records(f,"pvp_fear_trigger").find(t=>t.data.version===2);
  assert(trigger);assert.equal(trigger.status,"resolved",trigger.data.review_reason);assert.equal(records(f,"pvp_fear_effect_receipt").length,1);
  assert.equal(records(f,"fear_threat_establishment").length,1);assert.equal(records(f,"pvp_fear_threat_progression_receipt").length,1);
  assert.equal(records(f,"pvp_fear_complication_receipt").length,0);assert.equal(f.db.getCampaign(f.guild).fear,0);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
}));

test("FEA27 an actual Fear reaction roll does not create an action Fear trigger",()=>nativeFixture(async f=>{
  const x=await attackFixture(f),offer=preparePvpAttack(f.db,f.guild,"gm",x.input,{gm:true,interactionId:"reaction-parent"});
  for(const pc of f.pcs.slice(0,2)){
    reviewPvpAttack(f.db,f.guild,pc.owner_user_id,offer.record_key);
    authorizePvpAttack(f.db,f.guild,pc.owner_user_id,{attack:offer.record_key,expected_revision:offer.data.offer_hash},{interactionId:`reaction-auth-${pc.id}`});
  }
  const attack=rollPvpAttack(f.db,f.guild,f.pcs[0].owner_user_id,{attack:offer.record_key,expected_revision:offer.data.offer_hash},{rng:()=>1});
  const accepted=f.accepted(1,"I try to avoid the falling debris.","terminal",{type:"roll",operation:"reaction",
    target:{kind:"location",key:"terminal",phrase:"terminal",grounding:"known"}});
  f.db.upsertRulesRuling(f.guild,{key:"v95-reaction-hazard",ruling:"Synthetic hazard reaction: Agility Difficulty 13; no attack result is changed.",createdBy:"gm"});
  const source=indexWorldEvent(f.db,f.guild,{key:"v95-debris",kind:"environment_hazard",title:"Established falling debris",source_id:"gm:gm",
    session_id:f.session.id,scene:x.contract.data.scene,location_key:"terminal",visibility:"gm",
    details:{reaction_rule:{trait:"Agility",difficulty:13,normal_success:"partial",critical_success:"none",ruling:"v95-reaction-hazard"}}},"gm");
  const reaction=preparePvpReaction(f.db,f.guild,"gm",{attack_receipt:attack.record_key,accepted_intent:accepted.record_key,
    trigger:source.event_key,ruling:"v95-reaction-hazard",trait:"Agility",modifier_keys:[]},{gm:true,interactionId:"v95-reaction-offer"});
  reviewPvpReaction(f.db,f.guild,f.pcs[1].owner_user_id,reaction.record_key);let n=0;
  const result=rollPvpReaction(f.db,f.guild,f.pcs[1].owner_user_id,{offer:reaction.record_key,expected_revision:reaction.data.digest},
    {interactionId:"v95-reaction-roll",rng:()=>[1,2][n++]});
  assert.equal(result.data.result.duality,"Fear");assert.equal(records(f,"pvp_fear_trigger").length,0);
  assert.equal(records(f,"pvp_fear_effect_receipt").length,0);
}));

test("FEA28 missing city flag enables the normal autonomous path; explicit false remains the manual-GM override",()=>nativeFixture(f=>{
  establishFearVenue(f);
  paired(f,[[3,10],[9,2]],{automatic:null});
  assert.equal(f.db.getCityCalendar(f.guild).flags.autonomous_pvp_fear,undefined);
  assert.equal(records(f,"pvp_fear_trigger")[0].status,"resolved");
  assert.equal(records(f,"pvp_fear_effect_receipt").length,1);
}));

test("FEA29 retracted action source is held for bounded GM review without creating a complication",()=>nativeFixture(f=>{
  paired(f,[[3,10],[9,2]],{automatic:false});
  const trigger=records(f,"pvp_fear_trigger")[0],rounds=records(f,"pvp_round_receipt");
  indexWorldEvent(f.db,f.guild,{key:trigger.source_event,status:"retracted"},"gm");
  configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  const result=resumeAutonomousPvpFear(f.db,f.guild);
  assert.equal(result.length,1);assert.equal(result[0].status,"needs_review");
  assert.equal(f.db.getCityRecord(f.guild,"pvp_fear_trigger",trigger.record_key).status,"needs_review");
  assert.equal(records(f,"pvp_fear_complication_receipt").length,0);assert.equal(records(f,"pvp_fear_effect_receipt").length,0);
  assert.equal(records(f,"pvp_round_receipt").length,rounds.length);
}));

test("FEA03 a no-context Fear materializes and immediately progresses a current-scene NPC threat through native receipts",()=>nativeFixture(async f=>{
  establishFearVenue(f);
  paired(f,[[3,10],[9,2]],{automatic:false,audience:"private"});
  configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  const before=f.db.listNpcProfiles(f.guild,{limit:100}).map(row=>row.npc_key),pcResources=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  const [result]=resumeAutonomousPvpFear(f.db,f.guild),created=f.db.listNpcProfiles(f.guild,{limit:100}).filter(row=>!before.includes(row.npc_key));
  assert.equal(result.status,"resolved");assert.equal(created.length,1,"Fear should introduce one source-grounded scene threat, not only scenery");
  const threat=created[0],world=f.db.getCityRecord(f.guild,"autonomous_entity","npc:"+threat.npc_key),
    source=world&&f.db.getWorldEvent(f.guild,world.source_event),presence=f.db.listCityRecords(f.guild,{kind:"scene_presence",includeGM:true}).find(row=>row.data.entity_type==="npc"&&row.data.entity_key===threat.npc_key),
    establishment=records(f,"fear_threat_establishment")[0],state=establishment&&f.db.getCityRecord(f.guild,"pvp_fear_threat_state",establishment.data.state_ref),
    progression=records(f,"pvp_fear_threat_progression_receipt")[0],progressionSource=progression&&f.db.getWorldEvent(f.guild,progression.source_event);
  assert(world);assert.equal(source.kind,"ai_gm_world_create");assert.equal(source.scene,currentScene(f.db,f.guild).key);
  assert.equal(source.session_id,f.session.id);assert.equal(source.location_key,"terminal");assert.equal(source.visibility,"character");
  assert.equal(world.location_key,"terminal");assert.equal(world.data.epistemic_label,"introduced_now");assert(presence,"new threat must be present from this source onward");
  assert.equal(source.source_id,"native:autonomous_pvp_fear");assert.equal(source.details.combat_template,null);assert.deepEqual(source.details.knowledge_grant,[]);
  assert.equal(threat.source,"pvp_fear_native_world_authoring");assert.deepEqual(threat.capabilities,[]);
  const entity=f.db.getSimulationEntity(f.guild,"npc",threat.npc_key);assert.deepEqual(entity.state.resources,{influence:0,materials:0,information:0,manpower:0,leverage:0,wounds:0,stress:0,favors:0});
  assert.equal(records(f,"fear_threat_establishment").length,1);assert(establishment.data.creation_mutation_ref);assert(establishment.data.state_creation_mutation_ref);
  assert(state);assert.equal(state.data.progress,1);assert.equal(state.data.immediate_consequence,"interrupt_service");
  assert(progression);assert.equal(progression.status,"applied");assert.equal(progression.data.establishment_ref,establishment.record_key);
  assert.equal(progression.data.before_progress,0);assert.equal(progression.data.after_progress,1);assert.equal(progressionSource.kind,"pvp_fear_threat_progression");
  assert.equal(records(f,"pvp_fear_effect_receipt").length,1);assert.equal(result.data.threat_establishment_ref,establishment.record_key);
  assert.equal(result.data.threat_progression_ref,progression.record_key);
  assert.equal(records(f,"pvp_fear_complication_receipt").length,0,"NPC introduction is its own native consequence, not a disguised clock fallback");
  assert.equal(f.db.listCombatants(f.session.id).length,0,"establishing a threat cannot fabricate a combatant or encounter");
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),pcResources,"NPC creation/progression cannot alter PC resources");
  assert.equal(f.db.getCurrentEncounter(f.session.id),null,"threat creation does not fabricate encounter/combatant bindings");
  const privateMessages=new Map(),partyMessages=[];
  const proposal=records(f,"pvp_proposal")[0];
  await publishPvpNotices(f.db,f.guild,proposal.record_key,(user,content)=>{privateMessages.set(user,content);return {messageId:`fear-${user}`,channelId:`dm-${user}`};},
    content=>{partyMessages.push(content);return {messageId:"fear-party",channelId:"table"};});
  assert(privateMessages.get(f.pcs[0].owner_user_id)?.includes("service area interrupted"));
  assert(!privateMessages.get(f.pcs[1].owner_user_id)?.includes("service area interrupted"));assert.equal(partyMessages.length,0,
    "private threat details cannot be disclosed to the opponent or party");
  const replay=resumeAutonomousPvpFear(f.db,f.guild);assert.equal(replay.length,0);assert.equal(records(f,"pvp_fear_threat_progression_receipt").length,1);
  f.restart();assert.equal(resumeAutonomousPvpFear(f.db,f.guild).length,0);assert.equal(records(f,"fear_threat_establishment").length,1);
  assert.equal(records(f,"pvp_fear_threat_progression_receipt").length,1);assert.equal(f.db.getCityRecord(f.guild,"pvp_fear_threat_state",state.record_key).data.progress,1);
}));

test("FEA03 malformed NPC identity remains pending without profile or world receipts",()=>nativeFixture(f=>{
  establishFearVenue(f);paired(f,[[3,10],[9,2]],{automatic:false});configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  const [result]=resumeAutonomousPvpFear(f.db,f.guild,{proposeThreat:()=>({key:"Bad NPC Key",name:"Untrusted Attendant",occupation:"Attendant",
    public_identity:"An attendant",portrayal:"Present.",threat_label:"Service interrupted",immediate_consequence:"interrupt_service"})}),
    trigger=records(f,"pvp_fear_trigger")[0];
  assert.equal(result.status,"needs_review");assert.equal(trigger.status,"needs_review");assert.match(trigger.data.review_reason,/Unsupported or ungrounded NPC threat proposal|identity/i);
  assert.equal(f.db.getNpcProfile(f.guild,"Bad NPC Key"),null);assert.equal(records(f,"fear_threat_establishment").length,0);
  assert.equal(records(f,"pvp_fear_threat_progression_receipt").length,0);assert.equal(records(f,"pvp_fear_effect_receipt").length,0);
}));

test("FEA03 incompatible participant location remains pending without inferred movement",()=>nativeFixture(f=>{
  establishFearVenue(f);paired(f,[[3,10],[9,2]],{automatic:false});configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  f.db.updateCharacterData(f.pcs[1].id,data=>{data.location="elsewhere";});
  const [result]=resumeAutonomousPvpFear(f.db,f.guild),trigger=records(f,"pvp_fear_trigger")[0];
  assert.equal(result.status,"needs_review");assert.equal(trigger.status,"needs_review");assert.match(trigger.data.review_reason,/participant position changed|already be at the exact threat location/);
  assert.equal(f.db.listNpcProfiles(f.guild,{limit:100}).length,0);assert.equal(records(f,"fear_threat_establishment").length,0);
  assert.equal(records(f,"pvp_fear_threat_progression_receipt").length,0);assert.equal(records(f,"pvp_fear_effect_receipt").length,0);
}));

test("FEA03 GM-only location evidence cannot ground a party or owner-visible NPC threat",()=>nativeFixture(f=>{
  establishFearVenue(f);paired(f,[[3,10],[9,2]],{automatic:false,audience:"private"});
  configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  configureSimulationEntity(f.db,f.guild,"location","terminal",{visibility:"gm",description:"A diner; confidential campaign site details"});
  const [result]=resumeAutonomousPvpFear(f.db,f.guild),trigger=records(f,"pvp_fear_trigger")[0];
  assert.equal(result.status,"needs_review");assert.equal(trigger.status,"needs_review");
  assert.match(trigger.data.review_reason,/outside the authorized Fear audience|visible/i);
  assert.equal(f.db.listNpcProfiles(f.guild,{limit:100}).length,0);assert.equal(records(f,"fear_threat_establishment").length,0);
  assert.equal(records(f,"pvp_fear_threat_progression_receipt").length,0);assert.equal(records(f,"pvp_fear_effect_receipt").length,0);
}));

test("FEA03 revoked action source preserves Fear in review and creates no NPC",()=>nativeFixture(f=>{
  establishFearVenue(f);paired(f,[[3,10],[9,2]],{automatic:false});configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  const trigger=records(f,"pvp_fear_trigger")[0],rounds=records(f,"pvp_round_receipt");
  indexWorldEvent(f.db,f.guild,{key:trigger.source_event,status:"retracted"},"gm");
  const [result]=resumeAutonomousPvpFear(f.db,f.guild);
  assert.equal(result.status,"needs_review");assert.equal(f.db.getCityRecord(f.guild,"pvp_fear_trigger",trigger.record_key).status,"needs_review");
  assert.equal(f.db.listNpcProfiles(f.guild,{limit:100}).length,0);assert.equal(records(f,"fear_threat_establishment").length,0);
  assert.equal(records(f,"pvp_fear_threat_progression_receipt").length,0);assert.equal(records(f,"pvp_fear_effect_receipt").length,0);
  assert.equal(records(f,"pvp_round_receipt").length,rounds.length,"retraction cannot erase committed dice");
}));

test("FEA03 unsupported immediate effect stays pending rather than substituting a clock or cosmetic move",()=>nativeFixture(f=>{
  establishFearVenue(f);paired(f,[[3,10],[9,2]],{automatic:false});configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  const [result]=resumeAutonomousPvpFear(f.db,f.guild,{proposeThreat:()=>({key:"unsupported-threat",name:"Door Attendant",
    occupation:"Attendant",public_identity:"A door attendant",portrayal:"At the entrance.",threat_label:"Door blocked",
    immediate_consequence:"damage_pc"})}),trigger=records(f,"pvp_fear_trigger")[0];
  assert.equal(result.status,"needs_review");assert.equal(trigger.status,"needs_review");
  assert.match(trigger.data.review_reason,/Unsupported or ungrounded NPC threat proposal/);
  assert.equal(f.db.listNpcProfiles(f.guild,{limit:100}).length,0);assert.equal(records(f,"pvp_fear_complication_receipt").length,0);
  assert.equal(records(f,"fear_threat_establishment").length,0);assert.equal(records(f,"pvp_fear_effect_receipt").length,0);
}));

test("FEA03 disabled autonomous NPC authoring leaves the exact Fear obligation in private review",()=>nativeFixture(f=>{
  establishFearVenue(f);paired(f,[[3,10],[9,2]],{automatic:false});
  configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  configureWorldAuthority(f.db,f.guild,{auto_create_npcs:false},"gm");
  const [result]=resumeAutonomousPvpFear(f.db,f.guild),trigger=records(f,"pvp_fear_trigger")[0];
  assert.equal(result.status,"needs_review");assert.equal(trigger.status,"needs_review");
  assert.match(trigger.data.review_reason,/world-authoring authority is disabled/i);
  assert.equal(f.db.listNpcProfiles(f.guild,{limit:100}).length,0);assert.equal(records(f,"fear_threat_establishment").length,0);
  assert.equal(records(f,"pvp_fear_threat_progression_receipt").length,0);assert.equal(records(f,"pvp_fear_effect_receipt").length,0);
}));

test("FEA03 protected NPC identity collision does not overwrite canon or fall back to a pressure clock",()=>nativeFixture(f=>{
  establishFearVenue(f);paired(f,[[3,10],[9,2]],{automatic:false});
  f.db.upsertNpcProfile(f.guild,{npcKey:"protected-counter-attendant",displayName:"Counter Attendant",source:"synthetic-protected"});
  configureSimulationEntity(f.db,f.guild,"npc","protected-counter-attendant",{location_key:"elsewhere",visibility:"gm"});
  f.db.upsertReference(f.guild,{kind:"npc",key:"protected-counter-attendant",name:"Counter Attendant",summary:"Private profile",visibility:"gm"});
  configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  const [result]=resumeAutonomousPvpFear(f.db,f.guild),trigger=records(f,"pvp_fear_trigger")[0];
  assert.equal(result.status,"needs_review");assert.equal(trigger.status,"needs_review");
  assert.match(trigger.data.review_reason,/collides with protected campaign identity/i);
  assert.equal(records(f,"fear_threat_establishment").length,0);assert.equal(records(f,"pvp_fear_threat_progression_receipt").length,0);
  assert.equal(records(f,"pvp_fear_complication_receipt").length,0);
  assert.equal(f.db.getNpcProfile(f.guild,"protected-counter-attendant").public_identity,"");
}));

test("FEA03 scene drift before resolution keeps Fear pending and creates no NPC",()=>nativeFixture(f=>{
  establishFearVenue(f);paired(f,[[3,10],[9,2]],{automatic:false});
  configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  const state=f.db.getDirectorState(f.session.id);f.db.setDirectorState(f.session.id,{scene_number:state.scene_number+1});
  const [result]=resumeAutonomousPvpFear(f.db,f.guild),trigger=records(f,"pvp_fear_trigger")[0];
  assert.equal(result.status,"needs_review");assert.equal(trigger.status,"needs_review");
  assert.equal(f.db.listNpcProfiles(f.guild,{limit:100}).length,0);assert.equal(records(f,"fear_threat_establishment").length,0);
  assert.equal(records(f,"pvp_fear_effect_receipt").length,0);
}));

test("FEA14 unsupported domain/resource Fear proposals remain in review without a generic delta",()=>nativeFixture(f=>{
  const before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),campaignFear=f.db.getCampaign(f.guild).fear;
  paired(f,[[3,10],[9,2]],{automatic:false});const trigger=records(f,"pvp_fear_trigger")[0];
  assert.equal(trigger.status,"awaiting_move");
  assert.throws(()=>applyFearMove(f.db,f.guild,"gm",{trigger:trigger.record_key,expected_revision:trigger.data.revision,
    decision:"untrusted-domain-cost",resource_delta:{hope:-1,stress:1}},{gm:true}),/closed native Fear move fields/i);
  const held=f.db.getCityRecord(f.guild,"pvp_fear_trigger",trigger.record_key);
  assert.equal(held.status,"needs_review");assert.match(held.data.review_reason,/closed native Fear move fields/i);
  assert.equal(records(f,"pvp_fear_effect_receipt").length,0);assert.equal(records(f,"pvp_fear_threat_progression_receipt").length,0);
  assert.equal(records(f,"pvp_resource_receipt").filter(row=>row.data.delta!==0).length,0);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);assert.equal(f.db.getCampaign(f.guild).fear,campaignFear);
}));

test("FEA19 an untrusted AI threat proposal cannot supply GM identity, source or player authority",()=>nativeFixture(f=>{
  establishFearVenue(f);paired(f,[[3,10],[9,2]],{automatic:false});configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  let calls=0;const [result]=resumeAutonomousPvpFear(f.db,f.guild,{proposeThreat:input=>{
    calls++;assert.equal(input.scene.key,currentScene(f.db,f.guild).key);assert.equal(input.location.key,"terminal");
    assert.equal(input.permitted_consequence,"interrupt_service");
    return {key:"untrusted-threat",name:"Untrusted Attendant",occupation:"Attendant",public_identity:"A local attendant",
      portrayal:"Ordinary and present.",threat_label:"Service interruption",immediate_consequence:"interrupt_service",
      gm:true,player_identity:f.pcs[0].owner_user_id,source_event:"forged-source",resource_delta:{hope:1}};
  }}),trigger=records(f,"pvp_fear_trigger")[0];
  assert.equal(calls,1);assert.equal(result.status,"needs_review");assert.equal(trigger.status,"needs_review");
  assert.match(trigger.data.review_reason,/bounded NPC\/threat proposal fields/i);
  assert.equal(f.db.getNpcProfile(f.guild,"untrusted-threat"),null);assert.equal(records(f,"fear_threat_establishment").length,0);
  assert.equal(records(f,"pvp_fear_threat_progression_receipt").length,0);assert.equal(records(f,"pvp_fear_effect_receipt").length,0);
}));

for(const field of ["threat_label","public_identity","portrayal","occupation"])
test(`FEA19/PVP30q in-schema ${field} cannot launder Choso's unowned apology through native NPC creation`,()=>nativeFixture(f=>{
  establishFearVenue(f);paired(f,[[3,10],[9,2]],{automatic:false});configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  const resources=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  const [result]=resumeAutonomousPvpFear(f.db,f.guild,{proposeThreat:input=>({key:`fear-attendant-${fearRevision([input.scene.key,input.location.key]).slice(0,12)}`,
    name:"Counter Attendant",occupation:"Service attendant",public_identity:`A staff member at ${input.location.name}`,
    portrayal:"A present, ordinary staff member trying to keep the public area clear.",threat_label:"service area interrupted",
    immediate_consequence:"interrupt_service",[field]:"Choso apologizes for losing."})});
  assert.equal(result.status,"needs_review","A native creation receipt cannot certify cross-character meaning in arbitrary proposal prose.");
  assert.equal(records(f,"narrative_claims").length,0);assert.equal(records(f,"pvp_fear_effect_receipt").length,0);
  assert.equal(records(f,"pvp_fear_publication").length,0);assert.equal(records(f,"fear_threat_establishment").length,0);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),resources);
}));

function nativeWatcher(f){
  configureCityFlags(f.db,f.guild,{encounter_intelligence:true,scene_continuity:true},"synthetic-test");
  configureSimulationEntity(f.db,f.guild,"location","terminal",{name:"Twenty-Four Spin",description:"A neighborhood diner",access:"public"});
  const library=new EncounterLibrary("../content"),scene=currentScene(f.db,f.guild),source=indexWorldEvent(f.db,f.guild,{key:"v95-established-threat",
    kind:"observation",title:"Established present adversary",source_id:"gm:gm",session_id:f.session.id,scene:scene.key,
    location_key:"terminal",visibility:"party"},"gm");
  const template=library.adversaries.find(row=>row.tier===1&&!["Minion","Horde"].includes(row.type));
  f.db.upsertNpcProfile(f.guild,{npcKey:"watcher",displayName:"Watcher",role:"Security",source:"synthetic-established"});
  configureSimulationEntity(f.db,f.guild,"npc","watcher",{location_key:"terminal",resources:{manpower:2,information:1}});
  f.db.upsertNpcGoal(f.guild,{npcKey:"watcher",goalKey:"hold-the-line",title:"Hold the line",objective:"Keep watch at the terminal",
    acceptableMethods:["prepare"],source:"gm"});
  f.db.upsertNpcKnowledge(f.guild,{npcKey:"watcher",knowledgeKey:"scene",content:"Visible terminal activity",sourceRef:source.event_key});
  for(const pc of f.pcs)recordScenePresence(f.db,f.guild,{source_event:source.event_key,entity_type:"character",entity_key:pc.id,
    location_key:"terminal",visibility:"party",accepted_by:pc.owner_user_id},"gm");
  recordScenePresence(f.db,f.guild,{source_event:source.event_key,entity_type:"npc",entity_key:"watcher",location_key:"terminal",
    zone:"floor",range:"Melee",visibility:"party"},"gm");
  const lib={adversaries:[template],environments:[{name:"Terminal",tier:1}],findAdversary:()=>template};
  manageWorldEncounter(f.db,f.guild,{op:"bind",actor:"watcher",template:template.name,information_key:"scene",source_event:source.event_key},"gm",lib);
  manageWorldEncounter(f.db,f.guild,{op:"propose",key:"watcher-encounter",actors:["watcher"],objective:"containment",
    environment:"Terminal",source_event:source.event_key,location_key:"terminal"},"gm",lib);
  const accepted=manageWorldEncounter(f.db,f.guild,{op:"accept",key:"watcher-encounter"},"gm",lib),encounter=f.db.setEncounterStatus(accepted.data.encounter_id,"active");
  const combatants=f.db.initializeCombatants(encounter.id,worldCombatantDrafts(f.db,f.guild,encounter,buildCombatants(encounter,lib)));
  bindWorldCombatants(f.db,f.guild,encounter,combatants);
  return encounter;
}
test("FEA04 a unique established adversary preparation goal is resolved through the native encounter action",()=>nativeFixture(f=>{
  nativeWatcher(f);
  paired(f,[[3,10],[9,2]],{automatic:false});configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  const [result]=resumeAutonomousPvpFear(f.db,f.guild),actions=f.db.listSimulationRecords(f.guild,{kind:"action",status:"completed",limit:100});
  assert.equal(result.status,"resolved");assert.equal(actions.filter(row=>row.data.actor_key==="watcher"&&row.data.type==="prepare").length,1);
  assert.equal(records(f,"pvp_fear_complication_receipt").length,0,"don't ignore a verified existing native context in favor of a generic fallback");
  assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.hp.current,0);assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,0);
}));

test("FEA13 native NPC preparation interrupts only Billy's unfinished target-bound investigation, preserving completed receipts and siblings",()=>nativeFixture(f=>{
  nativeWatcher(f);configureCityFlags(f.db,f.guild,{roll_requests:true,roll_collaboration:true},"synthetic-test");
  const pc=f.pcs[2],scope={mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id},
    spans=["I study the watcher's shift.","I search the watcher's belongings.","I look up."],text=spans.join(" ");
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,"billy-fear-investigation",text);
  const base=(type,source_span)=>({type,source_span,operation:type==="search"?"search":"look",target_name:"Watcher",target_key:"watcher",
    destination:"unspecified",utterance:"",excluded_targets:[],framing:"immediate",resolution:"auto",reason:""});
  const actions=persistPlayerIntents(f.db,f.guild,[base("search",spans[0]),{...base("search",spans[1]),depends_on:[0]},
    {...base("observe",spans[2]),target_name:"",target_key:""}],scope,{messageId:"billy-fear-investigation"});
  buildActionPlan(f.db,f.guild,actions);
  f.db.upsertRulesRuling(f.guild,{key:"watcher-inspect",createdBy:"gm",ruling:"Knowledge action, Difficulty 10, to interpret the watcher's shift."});
  const a=adjudicateAcceptedIntent(f.db,f.guild,{acceptedIntent:actions[0].record_key,mode:"roll_required",risk:"Unknown shift",
    stakes:"No information on failure",savedRulingKey:"watcher-inspect",trait:"Knowledge",kind:"action",difficulty:10,modifierKeys:[],
    explanation:"Established watcher's observable shift."},pc.owner_user_id,{scope});
  const q=f.db.getCityRecord(f.guild,"roll_request",a.roll_request_ref);let n=0;
  contributeRoll(f.db,f.guild,pc.owner_user_id,{op:"roll",request:q.record_key,expected_revision:rollRevision(q),key:"billy-shift"},{rng:()=>[9,2][n++]});
  const completed=f.db.getCityRecord(f.guild,"typed_intent",actions[0].record_key),outcome=f.db.getCityRecord(f.guild,"action_outcome_receipt",completed.data.outcome_receipt),
    source=f.db.getWorldEvent(f.guild,actions[0].source_event),beforeNodes=records(f,"compound_action"),
    unfinished=beforeNodes.find(row=>row.data.action_id===actions[1].record_key),sibling=beforeNodes.find(row=>row.data.action_id===actions[2].record_key);
  assert.equal(completed.status,"resolved");assert(outcome);assert.equal(unfinished.status,"pending");
  paired(f,[[3,10],[9,2]],{automatic:false});configureCityFlags(f.db,f.guild,{autonomous_pvp_fear:true},"synthetic-test");
  const [effect]=resumeAutonomousPvpFear(f.db,f.guild);assert.equal(effect.data.move_kind,"npc_prepare");
  assert.equal(effect.data.hold_refs.length,1);const hold=f.db.getCityRecord(f.guild,"action_interrupt_receipt",effect.data.hold_refs[0]);
  assert.equal(hold.data.action,unfinished.record_key);assert.equal(hold.data.effect,effect.record_key);
  assert.deepEqual(f.db.getCityRecord(f.guild,"typed_intent",completed.record_key),completed);
  assert.deepEqual(f.db.getCityRecord(f.guild,"action_outcome_receipt",outcome.record_key),outcome);
  assert.deepEqual(f.db.getWorldEvent(f.guild,source.event_key),source);assert.deepEqual(f.db.getCityRecord(f.guild,"compound_action",sibling.record_key),sibling);
  assert.throws(()=>transitionAction(f.db,f.guild,unfinished.record_key,{expected_status:"pending",status:"failed",receipt:"invented"}),/Interrupted/);
  independentInvestigation(f);f.restart();drainActionContinuations(f.db,f.guild);
  assert.equal(f.db.getCityRecord(f.guild,"action_interrupt_receipt",hold.record_key).status,"pending");
  assert.equal(f.db.getCityRecord(f.guild,"compound_action",unfinished.record_key).status,"pending");
}));
