/** Audit acceptance: meaning, native staging, evidence and cognition stay separate; offline only. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { captureContextSource, persistInterpretation, interpretationContext, validateInterpretation } from "../src/narrative-context.js";
import { prepareSceneEntry, configureEntryPolicy, reviewSceneEntry } from "../src/scene-entry.js";
import { configureDelegation, stateRevision, dispatchAiIntents } from "../src/ai-intents.js";
import { applyAuthoritativeMutation, previewAuthoritativeMutation, applyGMEvents, applyNpcCognitionDrafts } from "../src/state.js";
import { validateNarrativeClaims } from "../src/narrative-integrity.js";
import { evidenceType, objectiveEvidence, establishFact } from "../src/epistemic.js";
import { validateDecisionAdvisory } from "../src/decision-advisory.js";
import { GMService } from "../src/gm.js";
import { ContentIndex } from "../src/content.js";
import { FakeResponses } from "./contract-fixtures.mjs";
import { POST_TURN_REVIEW_CATEGORIES } from "../src/director.js";
import { commitGmTurn } from "../src/turn-orchestration.js";
import { connectCity, transmitCityBelief } from "../src/city-civic.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-inference-")),file=path.join(temp,"test.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const guild="inference";db.ensureCampaign(guild);const session=db.startSession(guild,"Context lab");
  configureCityFlags(db,guild,{natural_language:true,scene_continuity:true,semantic_integrity:true});
  for(const key of ["street","moon","locked"])db.setSimulationEntity(guild,"location",key,{name:key==="moon"?"Silver Moon diner":key,locked:key==="locked"});
  db.upsertPlayer(guild,"owner","Owner");const pc=db.createCharacter(guild,"owner","Doctor",{location:"street",resources:{hp:{current:5,max:5}}});
  db.assignCharacter(session.id,"owner",pc.id);db.setPresence(session.id,"owner","present");
  db.updateCharacterData(pc.id,data=>{data.location="street";});
  db.upsertPlayer(guild,"other","Other");const other=db.createCharacter(guild,"other","Other",{});
  db.assignCharacter(session.id,"other",other.id);db.setPresence(session.id,"other","present");
  const scope={mode:"private",actorUserId:"owner",actorCharacterId:pc.id};
  const entry=prepareSceneEntry(db,guild,"owner",pc.id,"attempt","I enter the diner.",{privateScene:true});
  const paraphrases=["That one.","The place we discussed.","I mean the Silver Moon diner.","Yes, that diner—not a different building."];
  for(const [i,text] of paraphrases.entries()){
    const source=captureContextSource(db,guild,"owner",pc.id,`context-${i}`,text,{privateScene:true});
    const value={source_ref:source.event_key,references:[],intended_actions:["Entry remains pending"],acknowledgements:[text],unresolved:[]};
    persistInterpretation(db,guild,value,scope,{messageId:`context-${i}`});
    assert.equal(db.getCharacter(pc.id).data.location,"street");
    assert.throws(()=>validateInterpretation(db,guild,value,{mode:"private",actorUserId:"other",actorCharacterId:other.id}),/audience-visible/);
    assert.throws(()=>validateInterpretation(db,guild,value,{...scope,mode:"party"}),/audience-visible/);
  }
  const source=captureContextSource(db,guild,"owner",pc.id,"clarification","I mean the Silver Moon diner.",{privateScene:true});
  const value={source_ref:source.event_key,references:[{phrase:"Silver Moon diner",entity_type:"location",entity_key:"moon",
    source_refs:[entry.source_event,source.event_key],status:"resolved"}],intended_actions:[],acknowledgements:["Understood"],unresolved:[]};
  persistInterpretation(db,guild,value,scope,{messageId:"clarification"});
  let pending=db.getCityRecord(guild,"scene_entry",entry.record_key);
  assert.equal(pending.data.target,"the diner");assert.equal(pending.data.candidates[0].location_key,"moon");
  assert.throws(()=>reviewSceneEntry(db,guild,{op:"review-entry",key:entry.record_key,expected_revision:stateRevision(entry),location_key:"moon",adjudication:"Review"},"gm"),/revision/);
  configureEntryPolicy(db,guild,{op:"entry-policy",location_key:"moon",from_locations:["street"]},"gm");
  configureEntryPolicy(db,guild,{op:"entry-policy",location_key:"locked",from_locations:["street"]},"gm");
  configureDelegation(db,guild,{mode:"routine_delegated",allow:["scene.enter"],max_operations:2,max_cost:0,expires_minute:100},"gm");
  const intent={version:1,feature:"scene",target_key:entry.record_key,expected_revision:stateRevision(pending),policy_revision:1,
    source_prerequisites:[],payload:{op:"enter",entry_key:entry.record_key,location_key:"moon",source_event:entry.source_event}};
  const span="You have entered the Silver Moon diner.";
  const claim={actor:"",entity_type:"character",entity:pc.id,action:"movement",prior:"street",proposed:"moon",visibility:"character",
    source_ref:entry.source_event,source_span:span,mutation_index:-1,certainty:"committed"};
  const narrative={narration:span,narrative_claims:[claim],ai_intents:[intent]};
  const input={guildId:guild,sessionId:session.id,scope,narrative,provenance:{messageId:"move"}};
  assert.throws(()=>validateNarrativeClaims(db,guild,narrative,scope),/uncommitted_movement/);
  assert.equal(previewAuthoritativeMutation(db,input).intents[0].status,"accepted");
  assert.equal(db.getCharacter(pc.id).data.location,"street","Preview rolls back native entry");
  assert.equal(db.getCityRecord(guild,"scene_entry",entry.record_key).status,"awaiting_adjudication");
  const review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(key=>[key,{decision:"no_change",reason:"No legacy mutation",confidence:100}]));
  review.scene={decision:"continue",label:"",reason:"No scene transition"};
  const provider=new FakeResponses([{...narrative,respond:true,private_messages:[],events:[],handouts:[],relationships:[],
    npc_memories:[],npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],state_review:review}]);
  const service=new GMService({db,content:new ContentIndex(path.resolve("../content")),
    config:{gmModel:"offline",maxRecentMessages:8,maxContentChunks:2},ai:provider});
  const generated=await service.runTurn({guildId:guild,actorUserId:"owner",actorName:"Doctor",messageText:"Okay, I go inside.",scope:"private",messageId:"move"});
  assert.equal(provider.requests.length,1);assert.equal(generated.narration,span);
  assert.equal(db.getCharacter(pc.id).data.location,"street","Generation previews but cannot commit movement");
  let published=false;
  assert.throws(()=>{
    applyAuthoritativeMutation(db,{...input,narrative:{...narrative,narration:span+" You are dead.",
      narrative_claims:[claim,{...claim,action:"status",proposed:"dead",source_span:"You are dead."}]}});published=true;
  },/actor_status/);
  assert.equal(published,false);assert.equal(db.getCharacter(pc.id).data.location,"street");
  const unauthorized={...intent,payload:{...intent.payload,location_key:"locked"}};
  assert.equal(dispatchAiIntents(db,guild,[unauthorized],{scope,sessionId:session.id,origin:"locked"})[0].status,"pending");
  const wrongOwner={...scope,actorUserId:"other",actorCharacterId:other.id};
  assert.equal(dispatchAiIntents(db,guild,[intent],{scope:wrongOwner,sessionId:session.id,origin:"other"})[0].status,"blocked");
  const destination=db.getSimulationEntity(guild,"location","moon");
  db.setSimulationEntity(guild,"location","moon",{...destination.state,hazards:["Smoke"]});
  assert.equal(dispatchAiIntents(db,guild,[intent],{scope,sessionId:session.id,origin:"changed-access"})[0].status,"pending");
  db.setSimulationEntity(guild,"location","moon",destination.state);
  configureEntryPolicy(db,guild,{op:"entry-policy",location_key:"moon",from_locations:["street"]},"gm");
  const encounter=db.getCurrentEncounter.bind(db);db.getCurrentEncounter=()=>({status:"active"});
  assert.equal(dispatchAiIntents(db,guild,[intent],{scope,sessionId:session.id,origin:"combat"})[0].status,"pending");db.getCurrentEncounter=encounter;
  assert.equal(commitGmTurn({db,guild:{id:guild},session,result:generated,scope,speaker:"Doctor",label:"Native inference",meta:{messageId:"move"}}).intents[0].status,"accepted");
  assert.equal(db.getCharacter(pc.id).data.location,"moon");
  validateNarrativeClaims(db,guild,{narration:"Access is established.",narrative_claims:[{...claim,action:"access",source_span:"Access is established."}]},scope);
  assert.throws(()=>validateNarrativeClaims(db,guild,{narration:"Access is established.",narrative_claims:[{...claim,action:"access",source_span:"Access is established."}]},{mode:"party"}),/scoped_movement/);
  assert.equal(applyAuthoritativeMutation(db,input).intents[0].status,"accepted","Replay uses existing receipt");
  assert.equal(db.listWorldEvents(guild,{includeGM:true,limit:100}).filter(row=>row.event_key===`arrival:${entry.record_key}`).length,1);
  assert.throws(()=>validateNarrativeClaims(db,guild,{narration:"Perhaps it rains and you have entered the vault.",
    narrative_claims:[{...claim,certainty:"uncertain",source_span:"Perhaps it rains and you have entered the vault."}]},scope),/uncertainty_framing/);
  const clue=indexWorldEvent(db,guild,{key:"clue",kind:"observation",title:"An upstairs light",source_id:"gm",visibility:"party",details:{observation:"An upstairs light"}},"gm");
  const observedEvent={type:"clue",key:"light",value:"An upstairs light",visibility:"party",
    epistemic:{kind:"observation",source_refs:[clue.event_key],perspective:`character:${pc.id}`}};
  const observedClaim={...claim,action:"disclosure",source_ref:"event:0",mutation_index:0,proposed:observedEvent.value,source_span:observedEvent.value};
  const observedInput={guildId:guild,sessionId:session.id,scope,events:[observedEvent],
    narrative:{narration:observedEvent.value,narrative_claims:[observedClaim],events:[observedEvent]}};
  previewAuthoritativeMutation(db,observedInput);
  assert.equal(db.listFactsForGM(guild,{search:"An upstairs light"}).length,0,"New fact preview rolls back");
  assert(applyAuthoritativeMutation(db,observedInput).events[0].ok,"Same-turn disclosure binds the native fact receipt, not an invented ID");
  const result=applyGMEvents(db,guild,session.id,[{type:"fact",key:"guess",value:"Perhaps she is upstairs",visibility:"character",
    epistemic:{kind:"hypothesis",source_refs:[clue.event_key],perspective:`character:${pc.id}`}}],scope);
  assert(result[0].ok);const factId=result[0].id;
  assert.equal(applyGMEvents(db,guild,session.id,[{type:"canon",key:"guess-as-truth",value:"She is upstairs",visibility:"party"}],{...scope,mode:"party"})[0].ok,false);
  assert.equal(db.currentCanon(guild,"guess-as-truth"),undefined);
  assert.throws(()=>applyAuthoritativeMutation(db,{guildId:guild,simulationUpdates:[{kind:"obligation",actor_type:"character",actor_key:pc.id,
    content:"You owe a favor",data_json:JSON.stringify({debtor:`character:${pc.id}`,creditor:"npc:witness"})}]}),/native negotiated/);
  const accepted=db.putSimulationRecord(guild,{kind:"obligation",entityKey:`character:${pc.id}`,data:{content:"A voluntary favor",
    debtor:`character:${pc.id}`,creditor:"npc:witness",accepted_by:["owner"]}});
  const bound={...claim,action:"obligation",source_ref:accepted.id,proposed:"A voluntary favor",source_span:"A voluntary favor"};
  validateNarrativeClaims(db,guild,{narration:bound.source_span,narrative_claims:[bound]},scope);
  assert.throws(()=>validateNarrativeClaims(db,guild,{narration:bound.source_span,narrative_claims:[{...bound,entity:other.id}]},scope),
    error=>error.diagnostic?.source==="Obligation belongs to a different debtor.");
  assert.throws(()=>validateNarrativeClaims(db,guild,{narration:bound.source_span,narrative_claims:[bound]},{mode:"party"}),/scoped_obligation/);
  assert.equal(evidenceType(db.getFact(guild,factId)).kind,"hypothesis");assert.equal(objectiveEvidence(db,guild,db.getFact(guild,factId)),false);
  const disclosure={...claim,action:"disclosure",source_ref:factId,proposed:"Perhaps she is upstairs",source_span:"Perhaps she is upstairs"};
  assert.throws(()=>validateNarrativeClaims(db,guild,{narration:disclosure.source_span,narrative_claims:[disclosure]},scope),/epistemic_authority/);
  db.upsertNpcProfile(guild,{npcKey:"witness",displayName:"Witness"});db.upsertNpcProfile(guild,{npcKey:"absent",displayName:"Absent"});
  db.upsertNpcKnowledge(guild,{npcKey:"witness",knowledgeKey:"own-clue",content:"An upstairs light",beliefState:"known",sourceType:"witnessed",sourceRef:"clue"});
  const cognition=applyNpcCognitionDrafts(db,guild,{memories:[{npc_key:"witness",content:"Someone may be upstairs",source_type:"inferred",source_ref:"own-clue"}],
    knowledge:[{npc_key:"witness",knowledge_key:"guess",content:"Someone may be upstairs",source_type:"inferred",source_ref:"own-clue",belief_state:"known"}]});
  assert(cognition.memories[0].ok);assert.equal(cognition.knowledge[0].row.belief_state,"suspected");
  assert.equal(applyNpcCognitionDrafts(db,guild,{memories:[{npc_key:"absent",content:"An upstairs light",source_type:"witnessed",source_ref:"clue"}]}).memories[0].ok,false);
  assert.equal(applyNpcCognitionDrafts(db,guild,{memories:[{npc_key:"invented",content:"A thought",source_type:"inferred",source_ref:"own-clue"}]}).memories[0].ok,false);
  assert.equal(db.getNpcProfile(guild,"invented"),null);
  const publicAttempt=prepareSceneEntry(db,guild,"owner",pc.id,"public-attempt","I enter the cafe.");
  const publicSource=captureContextSource(db,guild,"owner",pc.id,"public-clarification","By cafe I mean the Silver Moon diner.");
  persistInterpretation(db,guild,{...value,source_ref:publicSource.event_key,references:[{...value.references[0],
    source_refs:[publicAttempt.source_event,publicSource.event_key]}]},{...scope,mode:"party"},{messageId:"public-clarification"});
  assert.equal(db.getCityRecord(guild,"scene_entry",publicAttempt.record_key).data.candidates[0].location_key,"moon");
  connectCity(db,guild,{kind:"channel",from:"npc:witness",to:"npc:absent",source_event:"clue"},"gm");
  transmitCityBelief(db,guild,{key:"delivered",source_event:"clue",from_type:"npc",from_key:"witness",to_type:"npc",to_key:"absent",
    information_key:"own-clue",mechanism:"authorized_report",authorized:true,distortion:0},"gm");
  const delivered=applyNpcCognitionDrafts(db,guild,{memories:[{npc_key:"absent",content:"An upstairs light",source_type:"told",source_ref:"delivered"}],
    knowledge:[{npc_key:"absent",knowledge_key:"report",content:"An upstairs light",source_type:"told",source_ref:"delivered",belief_state:"known"}]});
  assert(delivered.memories[0].ok);assert.equal(delivered.knowledge[0].row.belief_state,"suspected","Delivery does not become omniscient truth");
  db.close();db=new VeiledDB(file,schema);
  assert.equal(evidenceType(db.getFact(guild,factId)).kind,"hypothesis","Restart preserves type");
  assert(interpretationContext(db,guild,"owner",pc.id,"diner").records.length);
  indexWorldEvent(db,guild,{key:source.event_key,status:"retracted"});
  assert(!interpretationContext(db,guild,"owner",pc.id,"diner").records.some(row=>row.source_ref===source.event_key));
  indexWorldEvent(db,guild,{key:"clue",status:"retracted"});
  assert.equal(applyNpcCognitionDrafts(db,guild,{memories:[{npc_key:"witness",content:"Another guess",source_type:"inferred",source_ref:"own-clue"}]}).memories[0].ok,false);
  establishFact(db,guild,factId,"gm");assert(objectiveEvidence(db,guild,db.getFact(guild,factId)),"Explicit GM ruling independently establishes truth");
  configureCityFlags(db,guild,{decision_advisory:true});
  validateDecisionAdvisory(db,guild,{decision_advisory:{mode:"narrate",check:"",reason:"Describe saved surroundings while entry is pending",
    uncertainty:"",referent_uncertainty:"Which table?",fictional_uncertainty:"A possible chill",consequence:""}});
  const fake=new FakeResponses([{respond:true,reason:"Answer to GM question"}]);
  const gm=new GMService({db,content:new ContentIndex(path.resolve("../content")),config:{routerModel:"offline"},ai:fake});
  db.addMessage({guildId:guild,sessionId:session.id,userId:"bot",speakerName:"Veilkeeper",content:"Which diner did you mean?"});
  db.addMessage({guildId:guild,sessionId:session.id,messageId:"followup",userId:"owner",speakerName:"Doctor",characterId:pc.id,content:"That one."});
  const message={id:"followup",content:"That one.",author:{id:"owner",username:"Owner"},client:{user:{id:"bot"}}};
  assert.equal(await gm.shouldRespond({guildId:guild,message,mode:"assisted"}),true);
  assert.equal(await gm.shouldRespond({guildId:guild,message:{...message,content:"OOC: dinner time"},mode:"assisted"}),false);
  assert.equal(await gm.shouldRespond({guildId:guild,message,mode:"mention"}),false);
  assert.equal(fake.requests.length,1,"No extra interpretation model call");
  console.log("Narrative inference PASS: paraphrases, privacy, referents, staged movement/rollback/replay, locked/encounter/owner guards, epistemic restart/retraction, cognition, advisory and contextual routing; zero live calls.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
