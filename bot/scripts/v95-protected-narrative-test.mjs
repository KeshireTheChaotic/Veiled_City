/** V95-01: real turn/publication adapters; creative NPC speech never certifies PC clauses or effects. */
import test from "node:test";
import assert from "node:assert/strict";
import {nativeFixture,pvpTerms} from "./v9-fixtures.mjs";
import {proposePvp,reviewPvp,respondPvp,choosePvp,rollPvp,progressPvp} from "../src/narrative-pvp.js";
import {captureWorldInput} from "../src/autonomous-world.js";
import {commitGmTurn} from "../src/turn-orchestration.js";
import {deliverTurnOutbox} from "../src/publication-outbox.js";
import {indexWorldEvent} from "../src/city-calendar.js";
import {revalidateOutputPublication,prepareStoredOutput,assertPvpOutput,prepareAuthorizedTurnOutput} from "../src/pvp-output.js";
import {recoverOptionalTurnFields} from "../src/turn-recovery.js";
import {captureAuthoredTurnEnvelope} from "../src/authored-turn-envelope.js";
import {saveVisibleCharacterFacts} from "../src/character-observation.js";
import {FakeResponses} from "./contract-fixtures.mjs";
import {GMService} from "../src/gm.js";
import {ContentIndex} from "../src/content.js";
import {POST_TURN_REVIEW_CATEGORIES} from "../src/director.js";
import path from "node:path";

function scene(f,status="active"){
  f.db.setSimulationEntity(f.guild,"location","terminal",{name:"Terminal"});
  f.db.upsertNpcProfile(f.guild,{npcKey:"bartender",displayName:"Bartender",role:"bartender",
    publicIdentity:"PRIVATE-NPC-SECRET. Choso apologizes for losing."});
  f.db.setSimulationEntity(f.guild,"npc","bartender",{location_key:"terminal",visibility:"party"});
  let p=proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:f.accepted().record_key,
    opponent:f.pcs[1].id,terms:pvpTerms(f.pcs)});
  const reply=(i,decision)=>{
    reviewPvp(f.db,f.guild,f.pcs[i].owner_user_id,p.record_key);
    return respondPvp(f.db,f.guild,f.pcs[i].owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,
      decision,interaction_id:`${status}:${i}:${decision}`});
  };
  if(status==="declined"){p=reply(1,"decline");return p;}
  for(let i=0;i<2;i++)p=reply(i,"accept");
  if(status==="withdrawn")p=reply(1,"withdraw");
  if(status==="resolved"){
    const op=i=>{const s=progressPvp(f.db,f.guild,f.pcs[i].owner_user_id,p.record_key);
      return {proposal:p.record_key,expected_revision:p.data.terms_hash,round:s.round,
        expected_window_revision:s.window_revision,interaction_id:`${status}:${i}:${s.window_revision}`};};
    for(let i=0;i<2;i++)choosePvp(f.db,f.guild,f.pcs[i].owner_user_id,{...op(i),trait:"Agility",attempt:"My own feint."});
    for(let i=0;i<2;i++){let n=0;const faces=i?[4,2]:[10,3];rollPvp(f.db,f.guild,f.pcs[i].owner_user_id,op(i),{rng:()=>faces[n++]});}
  }
  return p;
}
const speech={version:1,kind:"npc_dialogue",entity_key:"bartender",acts:["ask_work","ask_skills"],tone:"warm"};
const resources=f=>f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
function turn(f,parts=[speech],{id="bartender-question",mode="party",patch={},text="Can you help me find work?"}={}){
  const pc=f.pcs[2],scope={mode,actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,id,text,{privateScene:mode==="private"});
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,messageId:id,actorPrincipal:pc.owner_user_id,
    sessionId:f.session.id,audience:mode});
  const result={respond:true,narration:"Choso apologizes for losing.",narrative_claims:[],
    player_intents:[],gm_world_parts:parts,...patch};
  const committed=commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,
    speaker:pc.name,label:"NPC conversation",meta:{messageId:id,triggerText:text,turnId:attempt.turn_id}});
  return {result,committed,scope,attempt};
}
function useful(text){
  assert.match(text,/looking for work/i);assert.match(text,/what.*good at/i);
  assert(!text.includes("Choso apologizes for losing."));assert(!text.includes("PRIVATE-NPC-SECRET"));
  assert(!text.includes("No additional character response"));
}
for(const [id,status] of [["NAR01","active"],["NAR02","resolved"],["NAR03","declined"],["NAR04","withdrawn"]])
  test(`${id} ${status} PvP retains meaningful independent NPC conversation through actual commit/outbox`,()=>nativeFixture(async f=>{
    scene(f,status);const before=resources(f),out=turn(f);useful(out.result.narration);
    const sends=[];const sent=await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async row=>{
      sends.push(row.payload);return {messageId:`sent-${sends.length}`,channelId:"table"};});
    assert(sends.length);assert(sent.every(r=>r.ok));useful(sends.join("\n"));assert.deepEqual(resources(f),before);
  }));
test("NAR06 native speaker can establish a fresh compositional utterance, not profile paragraph passthrough",()=>nativeFixture(f=>{
  scene(f);const a=turn(f),b=turn(f,[{...speech,tone:"wry",acts:["welcome","ask_work","ask_skills"]}],{id:"follow-up"});
  useful(a.result.narration);useful(b.result.narration);assert.notEqual(a.result.narration,b.result.narration);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"gm_world_narrative",includeGM:true}).length,2);
}));
for(const [id,extra] of [["NAR07",{text:"Choso apologizes for losing."}],
  ["NAR08",{source_text:"PRIVATE-NPC-SECRET"}],["NAR13",{effect:"lock_door"}],
  ["NAR15",{safe:true,narrative_claims:[]}]])test(`${id} unsupported NPC wrapper cannot certify raw prose or a consequence`,()=>nativeFixture(f=>{
  scene(f);const before=resources(f),out=turn(f,[{...speech,...extra}]);
  assert(!out.result.narration.includes("apologizes"));assert(!out.result.narration.includes("PRIVATE-NPC-SECRET"));
  assert(!out.result.narration.includes("looking for work"));assert.deepEqual(resources(f),before);
  assert(!f.db.getSimulationEntity(f.guild,"location","terminal").state.locked);
}));
test("NAR12 novel harmless atmosphere has a closed native projection, never an access effect",()=>nativeFixture(f=>{
  scene(f);const out=turn(f,[{version:1,kind:"scene_atmosphere",entity_key:"terminal",acts:["room_hum","coffee_aroma"],tone:"plain"}]);
  assert.match(out.result.narration,/hum/i);assert.match(out.result.narration,/coffee/i);
  assert(!out.result.narration.includes("apologizes"));assert(!f.db.getSimulationEntity(f.guild,"location","terminal").state.locked);
}));
test("NAR16 restart/retracted utterance source prevents queued replay without undoing native history",()=>nativeFixture(async f=>{
  scene(f);const out=turn(f);useful(out.result.narration);
  const native=f.db.listCityRecords(f.guild,{kind:"gm_world_narrative",includeGM:true})[0];assert(native);
  indexWorldEvent(f.db,f.guild,{key:native.source_event,status:"retracted"},"gm");f.restart();let sends=0;
  const sent=await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>{sends++;return {messageId:"bad",channelId:"table"};});
  assert.equal(sends,0);assert(sent.some(r=>!r.ok));assert(f.db.getCityRecord(f.guild,"gm_world_narrative",native.record_key));
}));
test("NAR17 private composition cannot be relabeled as party, and stored output keeps native proof",()=>nativeFixture(f=>{
  scene(f);const out=turn(f,[speech],{mode:"private"});useful(out.result.narration);
  assert.doesNotThrow(()=>prepareStoredOutput(f.db,f.guild,out.result.narration,out.scope));
  assert.throws(()=>prepareStoredOutput(f.db,f.guild,out.result.narration,{mode:"party"}),/PvP|proof|source/i);
  const row=f.db.listTurnPublications(f.guild,out.attempt.turn_id)[0];assert(row);
  assert.throws(()=>revalidateOutputPublication(f.db,f.guild,{...row,visibility:"party",surface:"party",target_user_id:null}),/PvP|proof/i);
}));
test("NAR18 remote/hidden/unavailable NPC cannot speak through a forged current-scene projection",()=>nativeFixture(f=>{
  scene(f);for(const state of [{location_key:"elsewhere"},{location_key:"terminal",hidden:true},{hidden:false,status:"dead"}]){
    f.db.setSimulationEntity(f.guild,"npc","bartender",state);
    const out=turn(f,[speech],{id:`unavailable-${JSON.stringify(state)}`});assert(!out.result.narration.includes("looking for work"));
  }
}));
test("NAR15 direct raw output remains rejected even when a wrapper looks native",()=>nativeFixture(f=>{
  scene(f);assert.throws(()=>assertPvpOutput(f.db,f.guild,{narration:"Choso apologizes for losing.",gm_world_parts:[speech],narrative_claims:[]},
    {mode:"party"}),/PvP|proof/i);
}));
test("NAR05 same-turn native NPC creation qualifies only after its actual local source exists",()=>nativeFixture(f=>{
  scene(f);const out=turn(f,[{...speech,entity_key:"new-porter"}],{text:"I ask the new porter about work.",patch:{
    world_additions:[{kind:"npc",key:"new-porter",name:"Milo Porter",summary:"An ordinary local porter.",
      location_key:"terminal",occupation:"porter",public_identity:"A local porter.",portrayal:"Friendly.",visibility:"party"}]}});
  useful(out.result.narration);const entity=f.db.getCityRecord(f.guild,"autonomous_entity","npc:new-porter");assert(entity);
  const part=f.db.listCityRecords(f.guild,{kind:"gm_world_narrative",includeGM:true})[0];assert(part.data.state.authored);
  assert(f.db.getWorldEvent(f.guild,entity.source_event));
}));
for(const [id,operation] of [["NAR09","appearance"],["NAR11","activity"]])test(`${id} valid PC inquiry remains nonblocking alongside NPC conversation`,
  ()=>nativeFixture(f=>{
    scene(f);const text="What does Choso look like?";
    const out=turn(f,[speech],{text,patch:{player_intents:[{type:"observe",source_span:text,target_name:"Choso",
      target_key:f.pcs[1].id,destination:"unspecified",operation,utterance:"",excluded_targets:[],framing:"immediate",
      resolution:"conversational",reason:"Current information request."}]}});
    useful(out.result.narration);assert.match(out.result.narration,/not.*established|no.*witness|unknown/i);
  }));
test("NAR10 owner-disclosed partial appearance remains scoped and does not become an apology",()=>nativeFixture(f=>{
  scene(f);const pc=f.pcs[1],envelope=captureAuthoredTurnEnvelope(f.db,f.guild,pc.owner_user_id,pc.id,"partial-description","blue");
  saveVisibleCharacterFacts(f.db,f.guild,pc.owner_user_id,pc.id,{source_event:envelope.source_event,visibility:"party",observers:[],
    facts:[{field:"coat",value:"blue",start:0,end:4}]});
  const text="What is Choso wearing?",out=turn(f,[speech],{text,patch:{player_intents:[{type:"observe",source_span:text,
    target_name:"Choso",target_key:pc.id,destination:"unspecified",operation:"clothing",utterance:"",excluded_targets:[],
    framing:"immediate",resolution:"conversational",reason:"Selected clothing only."}]}});
  useful(out.result.narration);assert.match(out.result.narration,/blue coat/);assert(!out.result.narration.includes("scar"));
}));
test("NAR14 independent Billy arrival survives mixed unsupported NPC/PC prose",()=>nativeFixture(f=>{
  scene(f);const span="I enter the terminal lobby.",out=turn(f,[speech,{...speech,text:"Choso apologizes for losing."}],{
    text:`${span} Can you help me find work?`,patch:{player_intents:[{type:"move",source_span:span,target_name:"Terminal Lobby",
      target_key:"terminal-lobby",destination:"interior",operation:"enter",utterance:"",excluded_targets:[],framing:"immediate",
      resolution:"auto",reason:"An ordinary adjacent public lobby."}],
      world_additions:[{kind:"location",key:"terminal-lobby",name:"Terminal Lobby",summary:"An adjoining public lobby.",
        parent_location_key:"terminal",visibility:"party"}],scene_actions:[{kind:"move",entity_ref:"terminal-lobby",source_span:span,zone:"interior"}]}});
  useful(out.result.narration);assert.equal(f.db.getCharacter(f.pcs[2].id).data.location,"terminal-lobby");
  assert.match(out.result.narration,/Billy has arrived/);assert.equal(f.db.getCharacter(f.pcs[1].id).data.location,"terminal");
}));
test("NAR18 native refusal policy is not overwritten by a model's friendly utterance",()=>nativeFixture(f=>{
  scene(f);f.db.upsertNpcProfile(f.guild,{npcKey:"bartender",displayName:"Bartender",decisionProfile:{conversation_policy:"refuse"}});
  const out=turn(f);assert(!out.result.narration.includes("Looking for work?"));
  const declined=turn(f,[{...speech,acts:["decline"]}],{id:"npc-decline"});assert.match(declined.result.narration,/can't help/);
}));
test("NAR18 current human NPC proxy cancels queued autonomous speech, not committed native results",()=>nativeFixture(async f=>{
  scene(f);const out=turn(f);useful(out.result.narration);
  const proxy=f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:"bartender",userId:f.pcs[3].owner_user_id});
  f.db.activateNpcProxy(proxy.id,f.pcs[3].owner_user_id);let sends=0;
  const result=await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>{sends++;return {messageId:"bad",channelId:"table"};});
  assert.equal(sends,0);assert(result.some(r=>!r.ok));
}));
for(const mode of ["party","private"])test(`NAR17 real ${mode} World Director preserves verified dialogue at its own output audience`,
  ()=>nativeFixture(async f=>{
    scene(f,"declined");const {applyAuthoritativeMutation}=await import("../src/state.js");
    const {queueDirectorPublications}=await import("../src/publication-outbox.js");
    const scope={mode,actorUserId:mode==="private"?f.pcs[2].owner_user_id:null,actorCharacterId:mode==="private"?f.pcs[2].id:null};
    const ai=new FakeResponses([{act:true,public_narration:"Choso apologizes for losing.",gm_world_parts:[speech],
      private_messages:[],events:[],narrative_claims:[],relationships:[],handouts:[],npc_memories:[],npc_knowledge:[],npc_goals:[],
      simulation_updates:[],ai_intents:[],confidence:100,gm_notes:""}]);
    const gm=new GMService({db:f.db,content:new ContentIndex(path.resolve("../content")),ai,
      config:{gmModel:"fixture",maxRecentMessages:5,maxContentChunks:1}});
    const result=await gm.runWorldDirector({guildId:f.guild,layer:"manual",trigger:{scope:mode,
      actor_user_id:scope.actorUserId,actor_character_id:scope.actorCharacterId}});
    applyAuthoritativeMutation(f.db,{guildId:f.guild,sessionId:f.session.id,narrative:result,scope});
    const id=queueDirectorPublications(f.db,{guild:{id:f.guild},session:f.session,result,scope,key:`v95-director:${mode}`});
    const sends=[];await deliverTurnOutbox(f.db,f.guild,id,async row=>{sends.push(row);return {
      messageId:`director-${sends.length}`,channelId:row.target_user_id?`dm-${row.target_user_id}`:"table"};});
    assert(sends.length);useful(sends.map(row=>row.payload).join("\n"));assert.equal(ai.requests.length,1);
    assert(sends.every(row=>row.visibility===(mode==="party"?"party":"character")));
  }));
test("NAR17 delivered verified NPC prose survives journal/voice paths without raw shadow text",()=>nativeFixture(async f=>{
  scene(f,"resolved");const out=turn(f),sends=[];
  await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async row=>{
    sends.push(row.payload);return {messageId:`verified-${sends.length}`,channelId:"table"};});
  const {VoiceNarrator}=await import("../src/voice.js"),{postJournalEntry}=await import("../src/publishing.js");
  let calls=0;const voice=new VoiceNarrator({voiceEnabled:true,voiceMode:"on",voiceMaxCharsPerTurn:4000,voiceMaxQueue:5},
    {db:f.db,getConnection:()=>({}),synthesize:async()=>{calls++;return Buffer.from("offline-fake-audio");}});
  voice.ffmpegAvailable=true;voice._enqueueReserved=()=>{};
  assert.equal((await voice.narrate({id:f.guild},out.result.narration,{force:true,turnId:out.attempt.turn_id})).ok,true);assert(calls>0);
  f.db.configureChannels(f.guild,{journalChannelId:"journal"});const journal=[];
  await postJournalEntry({db:f.db,guild:{id:f.guild,channels:{fetch:async()=>({isTextBased:()=>true,
    send:async text=>{journal.push(text);return {id:"entry"};}})}},content:out.result.narration});
  useful(journal.join("\n"));
}));
test("NAR06 production GM turn schema and prompt use bounded NPC speech proposals",()=>nativeFixture(async f=>{
  scene(f);const pc=f.pcs[2],messageId="real-gm-turn-npc",text="Can you help me find work?";
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,messageId,text);
  const state_review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(key=>[key,
    {decision:"no_change",reason:"No corresponding state mutation.",confidence:100}]));
  state_review.scene={decision:"continue",label:"",reason:"The scene continues.",confidence:100};
  const response={respond:true,narration:"Choso apologizes for losing.",world_additions:[],scene_actions:[],world_conflicts:[],
    narrative_interpretation:null,player_intents:[{type:"speak",source_span:text,target_name:"Bartender",target_key:"",
      destination:"unspecified",operation:"ask_for_work",utterance:text,excluded_targets:[],framing:"immediate",
      resolution:"conversational",reason:"The player asks the nearby bartender."}],context_memories:[],authored_candidates:null,
    narrative_claims:[],gm_world_parts:[speech],private_messages:[],events:[],handouts:[],relationships:[],npc_memories:[],
    npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],ai_intents:[],decision_advisory:null,
    state_review};
  const ai=new FakeResponses([response]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve("../content")),ai,
    config:{gmModel:"fixture",routineGmModel:"fixture",maxRecentMessages:5,maxContentChunks:1,contextInputBudget:100000}});
  const result=await gm.runTurn({guildId:f.guild,actorUserId:pc.owner_user_id,actorName:pc.name,
    actorAssignment:f.db.controlledAssignment(f.session.id,pc.owner_user_id),messageText:text,messageId});
  useful(result.narration);assert.equal(ai.requests.length,1);
  assert(ai.requests[0].text.format.schema.required.includes("gm_world_parts"));
  assert.match(ai.requests[0].input,/gm_world_parts/);assert.deepEqual(result.gm_world_parts,[]);
}));
test("NAR02 historical revoked PC attempt is not authority for, or a freeze on, a new GM-owned scene utterance",()=>nativeFixture(async f=>{
  const p=scene(f,"declined"),{applyAuthoritativeMutation}=await import("../src/state.js");
  indexWorldEvent(f.db,f.guild,{key:p.source_event,status:"retracted"},"gm");
  const result={act:true,public_narration:"Choso apologizes for losing.",narrative_claims:[],gm_world_parts:[speech]};
  applyAuthoritativeMutation(f.db,{guildId:f.guild,sessionId:f.session.id,narrative:result,
    scope:{mode:"party",actorUserId:null,actorCharacterId:null},source:"world_director_manual"});
  useful(result.public_narration);
}));
test("NAR14 optional recovery preserves nonauthorizing NPC proposals and revalidates their proof",()=>nativeFixture(f=>{
  scene(f);const pc=f.pcs[2],scope={mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  const source=captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,"recover-speech","Can you help me find work?");
  const result={narration:"Choso apologizes for losing.",narrative_claims:[],gm_world_parts:[speech],narrative_interpretation:{bad:true}};
  prepareAuthorizedTurnOutput(f.db,f.guild,result,scope,{sourceRef:source.event_key});useful(result.narration);
  const recovered=recoverOptionalTurnFields(result,{code:"NARRATIVE_CONTEXT"});assert(recovered);
  prepareAuthorizedTurnOutput(f.db,f.guild,recovered.result,scope,{sourceRef:source.event_key});useful(recovered.result.narration);
  f.db.setSimulationEntity(f.guild,"npc","bartender",{hidden:true});
  const retry=recoverOptionalTurnFields(result,{code:"NARRATIVE_CONTEXT"});
  prepareAuthorizedTurnOutput(f.db,f.guild,retry.result,scope,{sourceRef:source.event_key});
  assert(!retry.result.narration.includes("Looking for work?"));assert(!retry.result.narration.includes("apologizes"));
}));
