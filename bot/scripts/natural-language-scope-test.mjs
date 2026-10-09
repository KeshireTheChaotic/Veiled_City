/** D1-D8 synthetic integration: meaning, privacy, native authority and presentation are independent. No live calls. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { captureContextSource, interpretationContext, persistInterpretation, validateInterpretation } from "../src/narrative-context.js";
import { conversationPrincipal } from "../src/conversation-principal.js";
import { persistAuthoredCandidates } from "../src/authored-candidates.js";
import { configureEntryPolicy } from "../src/scene-entry.js";
import { configureDelegation, dispatchAiIntents, stateRevision, projectPrivateEffect } from "../src/ai-intents.js";
import { discoverPersonal } from "../src/personal-continuity.js";
import { routeDiscoveryMessage } from "../src/continuity-routing.js";
import { applyAuthoritativeMutation, applyRelationshipDrafts, applyHandoutDrafts, previewAuthoritativeMutation } from "../src/state.js";
import { recordCharacterArrival, reconcileSceneArrival } from "../src/scene-continuity.js";
import { AUTHORITY_POLICY } from "../src/authority-policy.js";
import { reviewPresentation } from "../src/presentation-evidence.js";
import { objectiveEvidence } from "../src/epistemic.js";
import { handoutMarkdown } from "../src/handout.js";
import { GMService } from "../src/gm.js";
import { seedNpcCognition } from "../src/npc-cognition.js";
import { ContentIndex } from "../src/content.js";
import { FakeResponses, fakeInteraction } from "./contract-fixtures.mjs";
import { handleCommand } from "../src/commands.js";
import { handleStoryCommand } from "../src/story-commands.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-language-scope-")),file=path.join(temp,"test.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const guild="scope";db.ensureCampaign(guild);const session=db.startSession(guild,"Lab"),pcs={};
  configureCityFlags(db,guild,{natural_language:true,scene_continuity:true,dialogue_history:true,discovery:true,emergent_goals:true});
  for(const user of ["owner","other","proxy"]){db.upsertPlayer(guild,user,user);db.setPresence(session.id,user,"present");
    if(user!=="proxy"){pcs[user]=db.createCharacter(guild,user,user,{location:"street"});db.assignCharacter(session.id,user,pcs[user].id);}}
  for(const key of ["street","diner"])db.setSimulationEntity(guild,"location",key,{name:key});
  const pc=pcs.owner,scope={mode:"private",actorUserId:"owner",actorCharacterId:pc.id};
  db.updateCharacterData(pc.id,data=>{data.location="street";});
  const candidate=(id,text,kind="entry",target="diner",quote="")=>{
    const source=captureContextSource(db,guild,"owner",pc.id,id,text,{privateScene:true});
    return {kind,source_ref:source.event_key,source_span:text,target,quote};
  };
  // D1: fragments and semantic candidates stage the same native entry as first-person grammar.
  const item=candidate("fragment","Heading inside the diner.");
  previewAuthoritativeMutation(db,{guildId:guild,narrative:{authored_candidates:[item]},scope,provenance:{messageId:"fragment"}});
  assert.equal(db.characterContinuity(guild,pc.id,{kind:"scene_entry"}).length,0,"Preview must roll back candidate and entry");
  const saved=persistAuthoredCandidates(db,guild,[item],scope,{messageId:"fragment"});
  const entry=db.characterContinuity(guild,pc.id,{kind:"scene_entry"})[0];assert.equal(entry.data.target,"diner");
  assert.equal(db.getCharacter(pc.id).data.location,"street");assert.equal(persistAuthoredCandidates(db,guild,[item],scope,{messageId:"fragment"})[0].record_key,saved[0].record_key);
  for(const [id,text,span] of [["ooc","OOC: Heading inside the diner.","Heading inside the diner."],
    ["hypo","If I enter the diner, what happens?","I enter the diner"],["report",'She said "I enter the diner".',"I enter the diner"]]){
    const negative=candidate(id,text);negative.source_span=span;
    assert.throws(()=>persistAuthoredCandidates(db,guild,[negative],scope,{messageId:id}));
  }
  assert.throws(()=>persistAuthoredCandidates(db,guild,[{...item,source_span:"I enter a vault"}],scope,{messageId:"fragment"}),/span/);
  configureEntryPolicy(db,guild,{op:"entry-policy",location_key:"diner",from_locations:["street"]},"gm");
  configureDelegation(db,guild,{mode:"routine_delegated",allow:["scene.enter"],max_operations:2,max_cost:0,expires_minute:100},"gm");
  const intent={version:1,feature:"scene",target_key:entry.record_key,expected_revision:stateRevision(entry),policy_revision:1,source_prerequisites:[],
    payload:{op:"enter",entry_key:entry.record_key,source_event:entry.source_event,location_key:"diner"}};
  assert.equal(dispatchAiIntents(db,guild,[intent],{scope,origin:"entry",sessionId:session.id})[0].status,"accepted");
  assert.equal(db.getCharacter(pc.id).data.location,"diner");
  // Actual listeners, exact unquoted speech and multiword addressee, not remote actors.
  db.upsertNpcProfile(guild,{npcKey:"mara",displayName:"Mara Voss"});db.setSimulationEntity(guild,"npc","mara",{location_key:"diner"});
  indexWorldEvent(db,guild,{key:"mara-arrival",kind:"arrival",title:"Mara arrived",source_id:"gm",location_key:"diner",visibility:"party",details:{entity_type:"npc",entity_key:"mara"}});
  reconcileSceneArrival(db,guild,{type:"npc",key:"mara",source_event:"mara-arrival"});
  const speech=candidate("speech","I tell Mara Voss: Have you seen the courier?","speech","Mara Voss","Have you seen the courier?");
  persistAuthoredCandidates(db,guild,[speech],scope,{messageId:"speech"});
  assert(db.listNpcMemories(guild,"mara").some(row=>row.content.includes(speech.quote)));
  const hypotheticalSpeech=candidate("conditional-speech","I tell Mara Voss: If I find it, I will call.","speech","Mara Voss","If I find it, I will call.");
  persistAuthoredCandidates(db,guild,[hypotheticalSpeech],scope,{messageId:"conditional-speech"});
  assert(db.listNpcMemories(guild,"mara").some(row=>row.content.includes(hypotheticalSpeech.quote)),"An actually spoken conditional is speech, not an action authorization");
  assert.equal(db.getCharacter(pc.id).data.location,"diner");
  // D2/D5: privacy-before-ranking, older synonymous recall and zero writes.
  db.addFact(guild,{key:"old",category:"clue",content:"The diner courier left a violet receipt.",visibility:"character",subjectCharacterId:pc.id});
  for(let i=0;i<170;i++)db.addFact(guild,{key:`hidden-${i}`,content:"HIDDEN_CAFE_SOLUTION",visibility:i%2?"gm":"character",subjectCharacterId:pcs.other.id});
  const changes=db.db.prepare("SELECT total_changes() n").get().n,deliveries=[];
  assert(await routeDiscoveryMessage({db,message:{guild:{id:guild},author:{id:"owner"},content:"What was the lead at that cafe?"},deliver:async text=>deliveries.push(text)}));
  assert(deliveries[0].includes("violet receipt"));assert(!deliveries[0].includes("HIDDEN_CAFE_SOLUTION"));
  assert.equal(db.db.prepare("SELECT total_changes() n").get().n,changes);
  const source=captureContextSource(db,guild,"owner",pc.id,"focus","That place is the diner.",{privateScene:true});
  persistInterpretation(db,guild,{source_ref:source.event_key,references:[{phrase:"diner",entity_type:"location",entity_key:"diner",source_refs:[source.event_key],status:"resolved"}],intended_actions:[],acknowledgements:[],unresolved:[]},scope,{messageId:"focus"});
  assert(interpretationContext(db,guild,"owner",pc.id,"What was there?").targeted_sources.some(row=>row.content.includes("violet")));
  // D3: authenticated PC/NPC proxies share interpretation, not owner memories or consent.
  db.assignCharacter(session.id,"owner",pc.id,{controlPolicy:"proxy",proxyUserId:"proxy"});
  const proxy=conversationPrincipal(db,guild,"proxy",pc.id);assert.equal(proxy.kind,"pc_proxy");
  assert.equal(discoverPersonal(db,guild,"proxy",{character_id:pc.id,query:"violet"}).unknown,true);
  const proxySource=captureContextSource(db,guild,"proxy",pc.id,"proxy-input","That place.",{privateScene:true});
  const proxyValue={source_ref:proxySource.event_key,references:[],intended_actions:[],acknowledgements:["Understood"],unresolved:[]};
  const proxyScope={mode:"private",actorUserId:"proxy",actorCharacterId:pc.id};
  persistInterpretation(db,guild,proxyValue,proxyScope,{messageId:"proxy-input"});
  assert.equal(interpretationContext(db,guild,"proxy",pc.id).records.length,1);
  db.assignCharacter(session.id,"owner",pc.id,{controlPolicy:"player_only"});
  assert.throws(()=>validateInterpretation(db,guild,proxyValue,proxyScope),/controlled role/);
  db.assignCharacter(session.id,"owner",pc.id,{controlPolicy:"proxy",proxyUserId:"proxy"});
  assert.notEqual(conversationPrincipal(db,guild,"proxy",pc.id).revision,proxy.revision,"Regrant in the same second cannot revive old authority");
  assert.throws(()=>validateInterpretation(db,guild,proxyValue,proxyScope),/audience-visible/);
  db.assignCharacter(session.id,"owner",pc.id,{controlPolicy:"player_only"});
  const npc=db.upsertNpcProxy(guild,session.id,{npcName:"Guest",userId:"proxy",status:"active",playerPacket:{public_identity:"Guest"}});
  const npcPrincipal=conversationPrincipal(db,guild,"proxy",npc.knowledge_id);assert.equal(npcPrincipal.kind,"npc_proxy");
  const secondNpc=db.upsertNpcProxy(guild,session.id,{npcName:"Second Guest",userId:"proxy",status:"active"});
  assert.throws(()=>conversationPrincipal(db,guild,"proxy"),/Select/);db.releaseNpcProxy(secondNpc.id);
  captureContextSource(db,guild,"proxy",npc.knowledge_id,"npc-input","The place we discussed.",{privateScene:true});
  assert(interpretationContext(db,guild,"proxy",npc.knowledge_id,"",{messageId:"npc-input"}).input_source);
  db.releaseNpcProxy(npc.id);assert.throws(()=>conversationPrincipal(db,guild,"proxy",npc.knowledge_id));
  // D4: private native world reaction needs explicit private allow, retains private cause, separate public observation.
  indexWorldEvent(db,guild,{key:"private-cause",kind:"observation",title:"Private source",source_id:"gm",visibility:"character",subject_key:pc.id,details:{observation:"A courier requested help"}});
  db.upsertNpcGoal(guild,{npcKey:"mara",goalKey:"help",objective:"Investigate courier",acceptableMethods:["investigate"]});
  db.upsertNpcKnowledge(guild,{npcKey:"mara",knowledgeKey:"help",content:"A courier requested help",sourceType:"seed",sourceRef:"private-cause",beliefState:"known"});
  const goal=db.getNpcGoal(guild,"mara","help");
  const goalIntent={version:1,feature:"goal",target_key:"help",expected_revision:stateRevision(goal),policy_revision:2,source_prerequisites:[],payload:{op:"reprioritize",actor_type:"npc",actor_key:"mara",goal_key:"help",new_goal_key:"",source_event:"private-cause",information_key:"help",objective:"Investigate courier",horizon:"near",acceptable_methods:["research"],reason:"Actual private conversation",priority:80,confidence:70,dependencies:[],conflicts:[]}};
  configureDelegation(db,guild,{mode:"routine_delegated",allow:["goal.reprioritize"],max_operations:2,max_cost:0,expires_minute:100},"gm");
  assert.equal(dispatchAiIntents(db,guild,[goalIntent],{scope,origin:"blocked",sessionId:session.id})[0].status,"blocked");
  configureDelegation(db,guild,{mode:"routine_delegated",allow:["goal.reprioritize"],private_allow:["goal.reprioritize"],max_operations:2,max_cost:0,expires_minute:100},"gm");
  goalIntent.policy_revision=3;
  const effect=dispatchAiIntents(db,guild,[goalIntent],{scope,origin:"private-world",sessionId:session.id})[0];
  assert.equal(effect.status,"accepted",effect.data.diagnostic);assert.equal(effect.visibility,"gm");assert.equal(db.getNpcGoal(guild,"mara","help").priority,80);
  assert.equal(dispatchAiIntents(db,guild,[goalIntent],{scope,origin:"private-world",sessionId:session.id})[0].record_key,effect.record_key);
  const projection=projectPrivateEffect(db,guild,{op:"project-effect",key:effect.record_key,expected_revision:stateRevision(effect),projection_key:"mara-reading",observation:"Mara is consulting a ledger."},"gm");
  assert.equal(db.getWorldEvent(guild,projection.source_event).visibility,"party");
  assert(!JSON.stringify(db.listWorldEvents(guild)).includes("A courier requested help"));
  // D6/D7: indirect world actions and banter both reach ONE existing classifier, hard gates stay free.
  const fake=new FakeResponses([{respond:true,reason:"Environmental reaction"},{respond:false,reason:"Banter"}]);
  const gm=new GMService({db,content:new ContentIndex(path.resolve("../content")),config:{routerModel:"offline",maxRecentMessages:20,maxContentChunks:2},ai:fake});
  for(const [content,expected] of [["Heading inside.",true],["Nice hat, fellow player.",false],["OOC: nice hat",false]])
    assert.equal(await gm.shouldRespond({guildId:guild,message:{content,author:{id:"owner",username:"owner"}},mode:"assisted"}),expected);
  assert.equal(await gm.shouldRespond({guildId:guild,message:{content:"Heading inside.",author:{id:"owner"}},mode:"mention"}),false);
  assert.equal(fake.requests.length,2);assert(gm.buildContext(guild,"owner","diner").constitution.includes(AUTHORITY_POLICY));
  assert(fake.requests.every(request=>request.instructions.includes(AUTHORITY_POLICY)),"Actual assembled model requests use the shared policy");
  assert(!gm.buildContext(guild,"owner","diner").constitution.includes("If the model must generate dice itself"));
  // D8: scores cannot become PC feelings/debt; artifacts retain original presentation without new truth.
  const draft={from_type:"character",from_key:pc.id,from_label:"Owner",to_type:"npc",to_key:"mara",to_label:"Mara",relationship_type:"trust",mode:"set",score:5,visibility:"party",note:"Owner must love Mara"};
  const relation=applyRelationshipDrafts(db,guild,[draft],scope)[0];assert(relation.ok,relation.error);assert(relation.interpretation_only);
  assert(!db.listRelationships(guild,{includeGM:true}).some(row=>row.from_key===pc.id&&row.note===draft.note));
  const artifact=applyHandoutDrafts(db,guild,session.id,[{title:"Dramatic letter",authority:"canonical",canonical_facts:["Hidden invented culprit"],player_visible_text:"A dramatic invented flourish",visibility:"party"}],{mode:"party"})[0].row;
  assert.equal(artifact.authority,"illustrative");assert.deepEqual(artifact.canonical_facts,[]);assert.deepEqual(artifact.metadata.proposed_canonical_facts,["Hidden invented culprit"]);
  assert(!handoutMarkdown(artifact).includes("Deliberately presented details are campaign facts"));
  const approvedFact=db.addFact(guild,{content:"The diner receipt is violet.",visibility:"party",source:"human_gm"});
  const proven=applyHandoutDrafts(db,guild,session.id,[{title:"Verified receipt",authority:"canonical",canonical_facts:["The diner receipt is violet."],
    player_visible_text:"Violet receipt",visibility:"party",epistemic:{kind:"testimony",perspective:"receipt",source_refs:[approvedFact]}}],{mode:"party"})[0].row;
  assert.equal(proven.authority,"canonical");assert.deepEqual(proven.canonical_facts,["The diner receipt is violet."]);
  const recap=db.addFact(guild,{category:"recap",source:"system",content:"Old summary asserts a culprit",visibility:"party"});assert(!objectiveEvidence(db,guild,db.getFact(guild,recap)));
  db.upsertRelationship(guild,{fromType:"npc",fromKey:"invented",toType:"character",toKey:pc.id,source:"ai_gm",note:"Legacy unsupported acquaintance"});
  seedNpcCognition({db,content:{read:()=>""},guildId:guild,actorId:"gm",incremental:true});
  assert.equal(db.getNpcProfile(guild,"invented"),null,"Bulk bootstrap cannot promote an AI hypothesis into an NPC");
  const review=reviewPresentation(db,guild,{op:"review-presentation",kind:"handout",key:artifact.id,expected_revision:stateRevision(artifact),decision:"reject",reason:"Decorative inference is not proof",source_refs:[]},"gm");
  assert.equal(db.getHandout(artifact.id).content,artifact.content);assert.equal(review.data.decision,"reject");
  const inspection=fakeInteraction({sub:"scene-view",json:{op:"presentations",kind:"handout",key:artifact.id}});
  Object.assign(inspection,{guildId:guild,id:"presentation-inspection",commandName:"vc-story",isChatInputCommand:()=>true});
  const beforeInspection=db.db.prepare("SELECT total_changes() n").get().n;
  await handleCommand(inspection,{db,gm:{}});assert(inspection.deliveries[0].files.length);
  assert.equal(db.db.prepare("SELECT total_changes() n").get().n,beforeInspection,"Presentation review fingerprints have a real zero-write operator command");
  await assert.rejects(()=>handleStoryCommand({...inspection,memberPermissions:{has:()=>false},member:{roles:{cache:new Map()}}},{db,gm:{}}),/GM\/admin/);
  db.close();db=new VeiledDB(file,schema);
  assert.equal(db.getHandout(artifact.id).metadata.epistemic.kind,"hypothesis");assert.equal(db.getCityRecord(guild,"presentation_review",review.record_key).data.decision,"reject");
  indexWorldEvent(db,guild,{key:source.event_key,status:"retracted"});
  assert(!interpretationContext(db,guild,"owner",pc.id,"there").query_plan.aliases.length);
  const databaseAudit=fs.readFileSync("../docs/DATABASE_USAGE_AUDIT.md","utf8");
  for(const [,table] of fs.readFileSync(schema,"utf8").matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g))
    assert(databaseAudit.includes(`\`${table}\``),`Database audit omits ${table}`);
  console.log("Natural-language scope PASS: D1-D8 grammar/candidates, scoped old recall/zero writes, proxy revocation, private native reaction/projection/replay, router matrix, unified policy, nonbinding relationships/artifacts/recaps and restart/retraction; zero live calls.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
