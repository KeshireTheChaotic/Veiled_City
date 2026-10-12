/** OBS behavior: native read-side answers are successful without supplying another PC's agency. */
import assert from "node:assert/strict";
import test from "node:test";
import { nativeFixture, pvpTerms } from "./v9-fixtures.mjs";
import { captureWorldInput } from "../src/autonomous-world.js";
import { commitGmTurn } from "../src/turn-orchestration.js";
import { captureAuthoredTurnEnvelope } from "../src/authored-turn-envelope.js";
import { saveVisibleCharacterFacts } from "../src/character-observation.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { deliverTurnOutbox } from "../src/publication-outbox.js";
import { handleCommand } from "../src/commands.js";
import { GMService } from "../src/gm.js";
import { ContentIndex } from "../src/content.js";
import { FakeResponses } from "./contract-fixtures.mjs";
import { POST_TURN_REVIEW_CATEGORIES } from "../src/director.js";
import path from "node:path";

async function question(f,{text="What does Jaxon look like?",actor=1,operation="appearance",id="question"}={}){
  const scope={mode:"party",actorUserId:f.pcs[actor].owner_user_id,actorCharacterId:f.pcs[actor].id};
  captureWorldInput(f.db,f.guild,scope.actorUserId,scope.actorCharacterId,id,text);
  const turn=f.db.beginTurnAttempt({guildId:f.guild,messageId:id,actorPrincipal:scope.actorUserId,sessionId:f.session.id,audience:"party"});
  const result={respond:true,narration:"Jaxon has a secret scar. Choso apologizes for losing.",narrative_claims:[],
    player_intents:[{type:"observe",source_span:text,target_name:"Jaxon",target_key:f.pcs[0].id,destination:"unspecified",
      operation,utterance:"",excluded_targets:[],framing:"immediate",resolution:"conversational",reason:"Information request."}]};
  const mutation=commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:f.pcs[actor].name,
    label:"Observation fixture",meta:{messageId:id,turnId:turn.turn_id,triggerText:text}});
  return {result,mutation,turn,rows:f.db.listTurnPublications(f.guild,turn.turn_id)};
}
test("OBS03/OBS14 actual no-description turn succeeds without roll, invented appearance or compelled reply",()=>nativeFixture(async f=>{
  const out=await question(f);assert.match(out.result.narration,/not.*established|cannot.*see/i);
  assert(!JSON.stringify(out.rows).includes("apologizes"));assert(!out.result.narration.includes("scar"));
  assert.equal(f.db.listCityRecords(f.guild,{kind:"roll_request",includeGM:true,limit:100}).length,0);
  assert.equal(f.db.listCityRecords(f.guild,{kind:"character_visible_fact",includeGM:true,limit:100}).length,0);
}));

function describe(f,{field="hair",value="black",visibility="party",observers=[],id=null}={}){
  const pc=f.pcs[0],source=captureAuthoredTurnEnvelope(f.db,f.guild,pc.owner_user_id,pc.id,id||`desc:${field}:${visibility}`,
    value,{privateScene:visibility!=="party"});
  return saveVisibleCharacterFacts(f.db,f.guild,pc.owner_user_id,pc.id,{source_event:source.source_event,
    facts:[{field,value,start:0,end:value.length}],visibility,observers});
}
test("OBS04 absent target yields a successful truthful visibility answer",()=>nativeFixture(async f=>{
  f.db.updateCharacterData(f.pcs[0].id,d=>{d.location="private-place";});
  const out=await question(f);assert.match(out.result.narration,/cannot currently see/i);
  assert(!out.result.narration.includes("private-place"));
}));
test("OBS05 exact prior witnessed description can be recalled without locating an absent PC",()=>nativeFixture(async f=>{
  describe(f,{observers:[f.pcs[1].id]});f.db.updateCharacterData(f.pcs[0].id,d=>{d.location="private-place";});
  const out=await question(f);assert.match(out.result.narration,/Previously witnessed.*black hair/i);
  assert(!out.result.narration.includes("private-place"));
}));
test("OBS06 GM sheet/hooks and character-private description never enter another observer answer",()=>nativeFixture(async f=>{
  describe(f,{visibility:"character"});f.db.updateCharacterData(f.pcs[0].id,d=>{d.secret_mark="secret scar";});
  const out=await question(f);assert(!out.result.narration.includes("black"));assert(!out.result.narration.includes("scar"));
}));
test("OBS07 explicit visible coat does not disclose hidden equipment",()=>nativeFixture(async f=>{
  describe(f,{field:"coat",value:"blue"});f.db.updateCharacterData(f.pcs[0].id,d=>{d.hidden_equipment="poison knife";});
  const out=await question(f,{text:"What is Jaxon wearing?",operation:"clothing"});
  assert.match(out.result.narration,/blue coat/);assert(!out.result.narration.includes("knife"));
}));
test("OBS09 private unobserved activity remains unknown to Billy",()=>nativeFixture(async f=>{
  const out=await question(f,{text:"What did Jaxon do privately?",actor:2,operation:"activity"});
  assert.match(out.result.narration,/No established witnessed activity/i);assert(!out.result.narration.includes("apologizes"));
}));
test("OBS11 internal thoughts are unknown; observer label supplies no emotion",()=>nativeFixture(async f=>{
  const out=await question(f,{text:"Is Jaxon ashamed?",operation:"thoughts"});
  assert.match(out.result.narration,/thoughts and feelings are not known/i);assert(!out.result.narration.includes("is ashamed"));
}));

test("OBS10 actual owner speech is heard, private speech is not, source retraction removes recall",()=>nativeFixture(async f=>{
  const pc=f.pcs[0],text='I say "Hello."',scope={mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  const source=captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,"heard-speech",text);
  const result={respond:true,narration:"Your greeting is spoken.",narrative_claims:[],player_intents:[{
    type:"speak",source_span:text,target_name:"",target_key:"",destination:"unspecified",operation:"",utterance:"Hello.",
    excluded_targets:[],framing:"immediate",resolution:"conversational",reason:"Own greeting."}]};
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:pc.name,label:"speech",
    meta:{messageId:"heard-speech",triggerText:text}});
  const heard=await question(f,{text:"What did Jaxon say?",operation:"dialogue",id:"heard-question"});
  assert.match(heard.result.narration,/Hello\./);
  indexWorldEvent(f.db,f.guild,{key:source.event_key,status:"retracted"},pc.owner_user_id);
  const absent=await question(f,{text:"What did Jaxon say?",operation:"dialogue",id:"retracted-speech-question"});
  assert(!absent.result.narration.includes("Hello."));assert.match(absent.result.narration,/No established heard response/);
}));

test("OBS10 private authored speech never becomes another PC's heard dialogue",()=>nativeFixture(async f=>{
  const pc=f.pcs[0],text='I say "A private secret."',scope={mode:"private",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,"private-speech",text,{privateScene:true});
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result:{respond:true,narration:"Private speech.",narrative_claims:[],player_intents:[{
    type:"speak",source_span:text,target_name:"",target_key:"",destination:"unspecified",operation:"",utterance:"A private secret.",
    excluded_targets:[],framing:"immediate",resolution:"conversational",reason:"Private speech."}]},scope,speaker:pc.name,label:"private speech",
    meta:{messageId:"private-speech",triggerText:text,privateScene:true}});
  assert(!((await question(f,{operation:"dialogue",text:"What did Jaxon say?"})).result.narration.includes("private secret")));
}));

test("OBS08 actual movement saves departure witnesses, not later visitors or remote whereabouts",()=>nativeFixture(async f=>{
  const pc=f.pcs[0],text="I enter the annex.",scope={mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  f.db.updateCharacterData(f.pcs[2].id,d=>{d.location="elsewhere";});
  f.db.setSimulationEntity(f.guild,"location","terminal",{name:"Terminal"});
  f.db.setSimulationEntity(f.guild,"location","annex",{name:"Annex",parent_location_key:"terminal"});
  const source=captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,"departure",text);
  f.db.saveCityRecord(f.guild,{kind:"autonomous_entity",key:"location:annex",visibility:"party",source_event:source.event_key,
    status:"active",data:{kind:"location",key:"annex",name:"Annex"}});
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result:{respond:true,narration:"Jaxon leaves.",narrative_claims:[],
    player_intents:[{type:"move",source_span:text,target_name:"Annex",target_key:"annex",destination:"interior",operation:"",
      utterance:"",excluded_targets:[],framing:"immediate",resolution:"auto",reason:"Open local entry."}],
    scene_actions:[{kind:"move",entity_ref:"annex",source_span:text,zone:"interior"}]},scope,speaker:pc.name,label:"departure",
    meta:{messageId:"departure",triggerText:text}});
  const observed=await question(f,{text:"Where did Jaxon go?",operation:"location",id:"witness"});
  assert.match(observed.result.narration,/witnessed.*depart.*terminal/i);
  assert(!observed.result.narration.includes("annex"));
  f.db.updateCharacterData(f.pcs[2].id,d=>{d.location="terminal";});
  const late=await question(f,{text:"Where did Jaxon go?",operation:"location",actor:2,id:"late"});
  assert.match(late.result.narration,/not known/);assert(!late.result.narration.includes("annex"));
}));

test("OBS05 observer lists cannot manufacture a remote prior witness",()=>nativeFixture(f=>{
  f.db.updateCharacterData(f.pcs[1].id,d=>{d.location="elsewhere";});
  assert.throws(()=>describe(f,{observers:[f.pcs[1].id]}),/visible|witness|owner|source/i);
}));
test("OBS13 actual owner Discord adapter establishes only explicit description fields",()=>nativeFixture(async f=>{
  const sent=[],input={text:"black private-secret",facts:[{field:"hair",value:"black",start:0,end:5}],visibility:"party",observers:[]};
  const interaction={id:"description-adapter",guildId:f.guild,guild:{id:f.guild},user:{id:f.pcs[0].owner_user_id,username:"Jaxon"},
    isChatInputCommand:()=>true,commandName:"vc-character",options:{getSubcommand:()=>"describe",getString:()=>JSON.stringify(input)},
    reply:async p=>sent.push(p),followUp:async p=>sent.push(p)};
  await handleCommand(interaction,{db:f.db,gm:{}});assert(sent.every(p=>p.ephemeral));
  const out=await question(f);assert.match(out.result.narration,/black hair/);
  assert(!JSON.stringify(f.db.listWorldEvents(f.guild,{includeGM:false,limit:100})).includes("private-secret"));
}));
test("OBS16/OBS18 observation answer cannot launder added apology or fabricated scar",()=>nativeFixture(async f=>{
  const out=await question(f);assert(!JSON.stringify(out.rows).includes("apologizes"));assert(!out.result.narration.includes("scar"));
  assert(f.db.listCityRecords(f.guild,{kind:"pvp_output_quarantine",includeGM:true,limit:100}).length);
}));
test("OBS19 disguise selects visible owner fields only",()=>nativeFixture(async f=>{
  describe(f,{field:"disguise",value:"masked"});describe(f,{visibility:"character"});
  const out=await question(f);assert.match(out.result.narration,/masked/);assert(!out.result.narration.includes("black"));
}));
test("OBS20 revoked description holds queued output and new inquiry succeeds with unknown",()=>nativeFixture(async f=>{
  const fact=describe(f)[0],out=await question(f);
  indexWorldEvent(f.db,f.guild,{key:fact.source_event,status:"retracted"},f.pcs[0].owner_user_id);f.restart();
  let sends=0;await deliverTurnOutbox(f.db,f.guild,out.turn.turn_id,async()=>{sends++;return {messageId:"no"};});assert.equal(sends,0);
  const next=await question(f,{id:"new-question"});assert.match(next.result.narration,/not established/);
}));
test("OBS03 actual GM generation and commit answer no-description question with one synthetic provider response",()=>nativeFixture(async f=>{
  const text="What does Jaxon look like?",pc=f.pcs[1];
  const state_review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(k=>[k,{decision:"no_change",reason:"Inquiry only.",confidence:100}]));
  state_review.scene={decision:"continue",label:"",reason:"Same scene."};
  const raw={respond:true,narration:"Jaxon has a secret scar. Choso apologizes for losing.",narrative_claims:[],
    player_intents:[{type:"observe",source_span:text,target_name:"Jaxon",target_key:f.pcs[0].id,destination:"unspecified",
      operation:"appearance",utterance:"",excluded_targets:[],framing:"immediate",resolution:"conversational",reason:"A question."}],
    world_additions:[],scene_actions:[],world_conflicts:[],context_memories:[],narrative_interpretation:null,authored_candidates:null,
    events:[],relationships:[],handouts:[],npc_memories:[],npc_knowledge:[],npc_goals:[],simulation_updates:[],private_messages:[],
    canon_proposals:[],ai_intents:[],decision_advisory:null,state_review};
  const ai=new FakeResponses([raw]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve("../content")),ai,
    config:{openaiApiKey:"offline-dummy",gmModel:"fixture",maxRecentMessages:10,maxContentChunks:2,
      contextInputBudget:100000,gmTurnDeadlineMs:3000}});
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,"gm-question",text);
  const result=await gm.runTurn({guildId:f.guild,actorUserId:pc.owner_user_id,actorName:pc.name,
    actorAssignment:f.db.controlledAssignment(f.session.id,pc.owner_user_id),messageText:text,messageId:"gm-question"});
  assert.match(result.narration,/not established/);assert.equal(ai.requests.length,1);
  const scope={mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  assert.doesNotThrow(()=>commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:pc.name,
    label:"GM inquiry",meta:{messageId:"gm-question",triggerText:text}}));
}));
test("OBS01/OBS02 owner-sourced visible hair is rendered but absent fields are not invented",()=>nativeFixture(async f=>{
  const {saveVisibleCharacterFacts}=await import("../src/character-observation.js");
  const pc=f.pcs[0],text="black";
  const envelope=captureAuthoredTurnEnvelope(f.db,f.guild,pc.owner_user_id,pc.id,"description",text);
  saveVisibleCharacterFacts(f.db,f.guild,pc.owner_user_id,pc.id,{source_event:envelope.source_event,
    facts:[{field:"hair",value:"black",start:0,end:5}],visibility:"party",observers:[]});
  const out=await question(f);assert.match(out.result.narration,/black hair/i);
  assert(!out.result.narration.includes("scar"));assert.match(out.result.narration,/unspecified|not.*established/i);
}));

async function nativeInjury(f){
  const {EncounterLibrary}=await import("../src/encounter.js"),{buildCombatants}=await import("../src/combat.js");
  const {currentScene,recordScenePresence}=await import("../src/scene-continuity.js");
  const {prepareIncomingAttack,reviewIncomingAttack,confirmIncomingDefense,rollIncomingAttack,resolveIncomingDamage}=await import("../src/pc-incoming.js");
  const pc=f.pcs[0],library=new EncounterLibrary("../content"),scene=currentScene(f.db,f.guild);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,scene_continuity:true}});
  f.db.setSimulationEntity(f.guild,"location","terminal",{name:"Terminal"});
  f.db.upsertNpcProfile(f.guild,{npcKey:"guard",displayName:"Guard"});
  f.db.setSimulationEntity(f.guild,"npc","guard",{location_key:"terminal"});
  f.db.updateCharacterData(pc.id,d=>{d.evasion=12;d.thresholds={major:7,severe:14};});
  const source=indexWorldEvent(f.db,f.guild,{key:"visible-injury-scene",kind:"observation",source_id:"gm",title:"Native guard attack context",
    session_id:f.session.id,scene:scene.key,location_key:"terminal",visibility:"party"},"gm");
  for(const [type,key] of [["npc","guard"],...f.pcs.map(p=>["character",p.id])])recordScenePresence(f.db,f.guild,{source_event:source.event_key,
    entity_type:type,entity_key:key,location_key:"terminal",zone:"scene",range:"Close",visibility:"party",accepted_by:f.pcs.find(p=>p.id===key)?.owner_user_id||pc.owner_user_id},"gm");
  const encounter=f.db.createEncounter(f.guild,f.session.id,{status:"active",tier:1,pc_count:4,base_bp:14,budget_bp:14,
    composition:[{name:"Aster Vale Contractor",quantity:1}]});
  const combatant=f.db.initializeCombatants(encounter.id,buildCombatants(encounter,library))[0];
  f.db.saveCityRecord(f.guild,{kind:"encounter_binding",key:encounter.id,source_event:source.event_key,data:{combatants:[{actor:"guard",id:combatant.id}]}});
  f.db.upsertRulesRuling(f.guild,{key:"injury-standard",ruling:"Reviewed standard attack and base defenses.",createdBy:"gm"});
  const a=prepareIncomingAttack(f.db,f.guild,"gm",{npc:"guard",combatant:combatant.id,character:pc.id,source:source.event_key,ruling:"injury-standard",
    defenses:{resistance:"none",armor_reduction:1,armor_allowed:true,source:"base"}},{gm:true,interactionId:"visible-injury",library});
  reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library});confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);
  let at=0;rollIncomingAttack(f.db,f.guild,"gm",a.record_key,{gm:true,library,rng:()=>[15,8][at++]});
  return resolveIncomingDamage(f.db,f.guild,pc.owner_user_id,a.record_key,{armor:false,library});
}

test("OBS12 native injury stays private until owner discloses bounded visible condition through actual adapter",()=>nativeFixture(async f=>{
  const receipt=await nativeInjury(f),pc=f.pcs[0];
  const unknown=await question(f,{text:"Does Jaxon look injured?",operation:"condition",id:"private-injury"});
  assert(!unknown.result.narration.includes("established injured"));
  const input={text:"injured",facts:[{field:"visible_condition",value:"injured",start:0,end:7,cause_receipt:receipt.record_key}],visibility:"party",observers:[]};
  const interaction={id:"injury-disclosure",guildId:f.guild,guild:{id:f.guild},user:{id:pc.owner_user_id,username:pc.name},
    isChatInputCommand:()=>true,commandName:"vc-character",options:{getSubcommand:()=>"describe",getString:()=>JSON.stringify(input)},
    reply:async()=>{},followUp:async()=>{}};
  await handleCommand(interaction,{db:f.db,gm:{}});
  const known=await question(f,{text:"Does Jaxon look injured?",operation:"condition",id:"visible-injury"});
  assert.match(known.result.narration,/established injured visible condition/);
  assert(!known.result.narration.includes("HP"));assert(!known.result.narration.includes("apologizes"));
  f.db.updateCharacterData(pc.id,d=>{d.resources.hp.current=0;});
  const healed=await question(f,{text:"Does Jaxon look injured?",operation:"condition",id:"healed"});
  assert(!healed.result.narration.includes("established injured"));
}));

test("OBS12 appearance adapter cannot invent a visible injury from player assertion or private HP",()=>nativeFixture(f=>{
  f.db.updateCharacterData(f.pcs[0].id,d=>{d.resources.hp.current=1;});
  const source=captureAuthoredTurnEnvelope(f.db,f.guild,f.pcs[0].owner_user_id,f.pcs[0].id,"false-injury","injured");
  assert.throws(()=>saveVisibleCharacterFacts(f.db,f.guild,f.pcs[0].owner_user_id,f.pcs[0].id,{source_event:source.source_event,
    facts:[{field:"visible_condition",value:"injured",start:0,end:7,cause_receipt:"forged"}],visibility:"party",observers:[]}),/source|native|condition/i);
}));

test("OBS15 pending PvP does not block an ordinary unknown appearance inquiry",()=>nativeFixture(async f=>{
  const {proposePvp}=await import("../src/narrative-pvp.js");
  const p=proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:f.accepted().record_key,opponent:f.pcs[1].id,terms:pvpTerms(f.pcs)});
  const out=await question(f);assert.match(out.result.narration,/not.*established/);
  assert.equal(f.db.getCityRecord(f.guild,"pvp_proposal",p.record_key).status,"proposed");
  assert.equal(f.db.listCityRecords(f.guild,{kind:"pvp_round_receipt",includeGM:true}).length,0);
}));

test("OBS17 sourced outdoor rain and unproxied NPC greeting survive protected PC observation without PC reaction",()=>nativeFixture(async f=>{
  const {proposePvp}=await import("../src/narrative-pvp.js"),{fakeInteraction}=await import("./contract-fixtures.mjs");
  proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:f.accepted().record_key,opponent:f.pcs[1].id,terms:pvpTerms(f.pcs)});
  describe(f,{field:"coat",value:"blue"});f.db.setSimulationEntity(f.guild,"location","terminal",{name:"Terminal"});
  f.db.upsertNpcProfile(f.guild,{npcKey:"attendant",displayName:"Station Attendant"});
  f.db.setSimulationEntity(f.guild,"npc","attendant",{location_key:"terminal"});
  for(const [entity_type,entity_key,facts] of [["location","terminal",{weather:"rain",exposure:"outdoors"}],["npc","attendant",{greeting:"hello"}]]){
    const interaction=fakeInteraction({sub:"scene-description",json:{entity_type,entity_key,location_key:"terminal",visibility:"party",facts}});
    Object.assign(interaction,{guildId:f.guild,id:`external:${entity_type}`,commandName:"vc-gm",isChatInputCommand:()=>true});
    interaction.user.username="GM";await handleCommand(interaction,{db:f.db,gm:{}});
  }
  const before=f.pcs.map(p=>f.db.getCharacter(p.id).data.resources);
  const out=await question(f,{text:"What is Jaxon wearing?",operation:"clothing"});
  assert.match(out.result.narration,/rain-wet blue coat/);assert.match(out.result.narration,/Station Attendant says:.*Hello/);
  assert(!out.result.narration.includes("apologizes"));
  assert.deepEqual(f.pcs.map(p=>f.db.getCharacter(p.id).data.resources),before);
}));

test("OBS20 historical observation archive revalidates the description source, not just the inquiry",()=>nativeFixture(async f=>{
  const {proposePvp}=await import("../src/narrative-pvp.js"),{publishJournal}=await import("../src/publishing.js");
  proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:f.accepted().record_key,opponent:f.pcs[1].id,terms:pvpTerms(f.pcs)});
  const fact=describe(f)[0],out=await question(f);
  const delivered=await deliverTurnOutbox(f.db,f.guild,out.turn.turn_id,async()=>({messageId:"observed",channelId:"table"}));
  assert(delivered.every(r=>r.ok));const session=f.db.endSession(f.guild,"");
  f.db.configureChannels(f.guild,{journalChannelId:"journal"});const sends=[];
  const guild={id:f.guild,channels:{fetch:async()=>({isTextBased:()=>true,send:async s=>{sends.push(s);return{id:"archive"};}})}};
  assert.equal(await publishJournal({db:f.db,guild,session,recap:out.result.narration}),true);
  indexWorldEvent(f.db,f.guild,{key:fact.source_event,status:"retracted"},f.pcs[0].owner_user_id);
  await assert.rejects(()=>publishJournal({db:f.db,guild,session,recap:out.result.narration}),/source|proof|PvP/i);
}));

test("OBS12 healed then privately re-injured PC cannot revive an old public injury disclosure at the same HP count",()=>nativeFixture(async f=>{
  const {reviewFeatureEffect,reviewPcEffect,approvePcEffect,applyPcEffect}=await import("../src/pc-effects.js");
  const receipt=await nativeInjury(f),pc=f.pcs[0],count=f.db.getCharacter(pc.id).data.resources.hp.current;
  const envelope=captureAuthoredTurnEnvelope(f.db,f.guild,pc.owner_user_id,pc.id,"old-visible-injury","injured");
  saveVisibleCharacterFacts(f.db,f.guild,pc.owner_user_id,pc.id,{source_event:envelope.source_event,
    facts:[{field:"visible_condition",value:"injured",start:0,end:7,cause_receipt:receipt.record_key}],visibility:"party",observers:[]});
  assert.match((await question(f,{operation:"condition",text:"Does Jaxon look injured?",id:"before-heal"})).result.narration,/established injured/);
  f.db.updateCharacterData(pc.id,d=>{d.domain_cards=["Synthetic Healing"];});
  f.db.upsertRulesRuling(f.guild,{key:"native-heal",ruling:"Synthetic Healing clears the reviewed marked HP.",createdBy:"gm"});
  const source=f.accepted(0,"I use Synthetic Healing.",pc.id).source_event;
  const cause=reviewFeatureEffect(f.db,f.guild,"gm",{character:pc.id,feature:"Synthetic Healing",ruling:"native-heal",source,resource:"hp",amount:-count},
    {gm:true,interactionId:"actual-heal"});
  reviewPcEffect(f.db,f.guild,pc.owner_user_id,cause.record_key);approvePcEffect(f.db,f.guild,pc.owner_user_id,cause.record_key,{interactionId:"heal-choice"});
  applyPcEffect(f.db,f.guild,cause.record_key);assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,0);
  await nativeInjury(f);assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,count);
  assert(!((await question(f,{operation:"condition",text:"Does Jaxon look injured?",id:"new-private-injury"})).result.narration.includes("established injured")));
}));

for(const visibility of ["party","character"])test(`OBS07 current ${visibility} outfit supersedes old visible clothing without leaking private replacements`,()=>nativeFixture(async f=>{
  describe(f,{field:"coat",value:"blue",observers:[f.pcs[1].id]});
  describe(f,{field:"coat",value:"green",visibility,id:"new-outfit"});
  const current=await question(f,{operation:"clothing",text:"What is Jaxon wearing?",id:"current-outfit"});
  assert(!current.result.narration.includes("blue coat"));
  if(visibility==="party")assert.match(current.result.narration,/green coat/);
  else{
    assert(!current.result.narration.includes("green"));assert.match(current.result.narration,/not.*established/);
    f.db.updateCharacterData(f.pcs[0].id,d=>{d.location="elsewhere";});
    const remembered=await question(f,{operation:"clothing",text:"What did Jaxon wear?",id:"remembered-outfit"});
    assert.match(remembered.result.narration,/Previously witnessed.*blue coat/);assert(!remembered.result.narration.includes("green"));
  }
}));
