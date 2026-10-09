/** Whole-loop synthetic evaluation uses real GM prompts, production turn commits, native domains and Discord publication. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { GMService } from "../src/gm.js";
import { ContentIndex } from "../src/content.js";
import { FakeResponses } from "./contract-fixtures.mjs";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { configureDelegation, FEATURE_FLAGS, stateRevision } from "../src/ai-intents.js";
import { commitGmTurn } from "../src/turn-orchestration.js";
import { POST_TURN_REVIEW_CATEGORIES } from "../src/director.js";
import { postPlayMessage } from "../src/publishing.js";
import { routeDiscoveryMessage } from "../src/continuity-routing.js";
import { captureArcCandidate, personalArc } from "../src/personal-continuity.js";
import { scenePresence } from "../src/scene-continuity.js";
import { runNpcDirector } from "../src/simulation.js";
import { assertInstitutionDelegation } from "../src/city-constraints.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-end-to-end-i-")),file=path.join(temp,"test.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const id="whole-loop";db.ensureCampaign(id);db.configureCampaign(id,{playChannelId:"play"});
  const session=db.startSession(id,"Whole loop");db.upsertPlayer(id,"owner","Owner");
  const pc=db.createCharacter(id,"owner","Owner",{});db.assignCharacter(session.id,"owner",pc.id);db.setPresence(session.id,"owner","present");
  db.setSimulationEntity(id,"location","room",{});
  for(const key of ["first","second"]){db.upsertNpcProfile(id,{npcKey:key,displayName:key});db.setSimulationEntity(id,"npc",key,{location_key:"room"});
    db.upsertNpcKnowledge(id,{npcKey:key,knowledgeKey:"lead",content:"Recorded cable damage",sourceRef:"source",confidence:90});}
  indexWorldEvent(db,id,{key:"source",kind:"infrastructure_damage",title:"Recorded cable damage",source_id:"gm",location_key:"room",visibility:"party"});
  indexWorldEvent(db,id,{key:"arrival",kind:"arrival",title:"First arrived",source_id:"gm",location_key:"room",visibility:"party",
    details:{entity_type:"npc",entity_key:"first"}});
  db.saveCityRecord(id,{kind:"infrastructure",key:"power",source_event:"source",data:{locations:["room"],capacity:5,load:0}});
  configureCityFlags(db,id,Object.fromEntries(Object.values(FEATURE_FLAGS).map(key=>[key,true])));
  const operations=["goal.propose","scene.record","group.propose","group.respond","strategy.propose","strategy.run","consequence.subscribe",
    "arc.candidate","arc.invite","project.propose","memory.consolidate","memory.revise","mediation.reconcile","density.inspect"];
  configureDelegation(db,id,{mode:"routine_delegated",allow:operations,max_operations:4,max_cost:4,expires_minute:10000},"gm");
  const outputs=[],guild={id,channels:{fetch:async()=>({isTextBased:()=>true,send:async content=>{outputs.push(content);return {id:`sent-${outputs.length}`};}})}};
  const review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(key=>[key,{decision:"no_change",reason:"No legacy mutation",confidence:100}]));
  review.scene={decision:"continue",label:"",reason:"Same scene"};
  const base={respond:true,narration:"Rain patters against the window.",narrative_claims:[],private_messages:[],events:[],handouts:[],relationships:[],
    npc_memories:[],npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],state_review:review};
  let requests=0,previous=null;const counts={};
  const make=(feature,payload,before=null,target_key="")=>({version:1,feature,payload,target_key,expected_revision:stateRevision(before),policy_revision:1,source_prerequisites:[]});
  async function turn(intent,{scope="party",origin=`turn-${requests}`,status="accepted"}={}){
    const fake=new FakeResponses([{...base,ai_intents:[intent]}]);
    const gm=new GMService({db,content:new ContentIndex(path.resolve("../content")),ai:fake,
      config:{gmModel:"offline",maxRecentMessages:8,maxContentChunks:2}});
    const result=await gm.runTurn({guildId:id,actorUserId:"owner",actorName:"Owner",actorAssignment:db.activeAssignment(session.id,"owner"),
      messageText:"Consider the established situation.",scope});requests+=fake.requests.length;
    assert.equal(fake.requests.length,1,"reuse exactly one existing gameplay request");
    assert(fake.requests[0].input.includes("AI MANAGEMENT"));assert(fake.requests[0].input.includes('"policy"'));
    if(previous) assert(fake.requests[0].input.includes(previous),"next model request contains actual prior receipt");
    const mutation=commitGmTurn({db,guild,session,result,scope:{mode:scope,actorUserId:"owner",actorCharacterId:pc.id},speaker:"Owner",
      label:"Whole loop",meta:{messageId:origin}}),receipt=mutation.intents[0];
    assert.equal(receipt.status,status,receipt.data.diagnostic||receipt.data.reason);previous=receipt.record_key;
    assert.equal(result.narration,"Rain patters against the window.","Native validation retains safe narration instead of replacing every intent turn");
    if(scope==="party") await postPlayMessage({db,guild,sessionId:session.id,content:result.narration});
    counts[intent.feature]=(counts[intent.feature]||0)+1;return receipt;
  }
  const goal={actor_type:"npc",actor_key:"first",information_key:"lead",source_event:"source",op:"propose",goal_key:"inspect",new_goal_key:"",
    objective:"Inspect cable",reason:"Own evidence",priority:50,confidence:90,horizon:"near",dependencies:[],acceptable_methods:["observe"],conflicts:[]};
  const goalIntent=make("goal",goal),first=await turn(goalIntent,{origin:"goal"});assert.equal(db.getNpcGoal(id,"first","inspect").status,"active");
  assert.equal((await turn(goalIntent,{origin:"goal"})).record_key,first.record_key,"duplicate delivery cannot create a second goal");
  await turn(make("scene",{source_event:"arrival",op:"record",entity_type:"npc",entity_key:"first",location_key:"room",zone:"scene",to_zone:"",
    range:"Close",state:"actually_present",hidden:false,known_to:[],visibility:"party",subject_key:"",blocks:[]}));
  assert.equal(scenePresence(db,id,"npc","first").data.state,"actually_present");
  const group={source_event:"source",op:"propose",operation:"form",group_key:"watch",name:"Watch",members:["first","second"],
    from_groups:[],shared_projects:[],member:"first",decision:"",information_key:"lead",reason:"Shared threat"};
  const proposal=(await turn(make("group",group))).data.result;
  for(const member of group.members){const row=db.getCityRecord(id,"group_transition",proposal.record_key);
    await turn(make("group",{...group,op:"respond",member,decision:"accept"},row,row.record_key));}
  assert.equal(db.getCityRecord(id,"community","watch").data.members.length,2);
  const strategy={...goal,op:"propose",cost_ceiling:1,deadline_minute:10000,steps:[{key:"look",requires:[],
    action:{type:"observe",target_type:"",target_key:"",location_key:"room",information_key:"lead",reason:"Look locally"}}],alternatives:[],assumptions:[]};
  for(const field of ["new_goal_key","objective","reason","priority","confidence","horizon","dependencies","acceptable_methods","conflicts"]) delete strategy[field];
  const plan=(await turn(make("strategy",strategy))).data.result;
  let row=db.getCityRecord(id,"strategy",plan.record_key);
  const run=(await turn(make("strategy",{...strategy,op:"run"},row,row.record_key))).data.result;
  const action=db.getSimulationRecord(id,run.data.steps[0].action_id);assert(action);
  await turn(make("mediation",{source_event:"source",op:"reconcile",actor_type:"npc",actor_key:"first",action_key:action.id},action,action.id));
  await turn(make("consequence",{source_event:"source",op:"subscribe",handler:"service",entity_key:"power",event_kinds:["infrastructure_damage"],location_key:"room",delta:-1}));
  const candidate=captureArcCandidate(db,id,"owner",pc.id,"quote","I vow to find my brother.");
  await turn(make("arc",{source_event:candidate.source_event,op:"candidate",character_id:pc.id,arc_key:"vow",type:"vow",
    statement:candidate.data.statement,invitation:""},candidate,candidate.record_key),{scope:"private"});
  personalArc(db,id,"owner",{op:"confirm",key:candidate.record_key,arc_key:"vow",expected_revision:stateRevision(candidate)});
  row=db.getCityRecord(id,"arc",`${pc.id}:vow`);
  const invitation=(await turn(make("arc",{source_event:row.source_event,op:"invite",character_id:pc.id,arc_key:"vow",type:"vow",
    statement:row.data.statement,invitation:"SECRET_CANNOT_BE_PUBLISHED"},row,row.record_key),{scope:"private"})).data.result;
  personalArc(db,id,"owner",{op:"respond",key:invitation.record_key,decision:"decline",expected_revision:stateRevision(invitation)});
  assert.equal(db.getCityRecord(id,"arc_beat",invitation.record_key).status,"declined");
  const draft=(await turn(make("project",{source_event:"source",op:"propose",character_id:pc.id,title:"Study lead",participants:[pc.id],
    result_ids:[],npc_collaborators:[],phases:[{key:"study",title:"Study",duration_minutes:1440,requires:[],prerequisites:["source"]}]}))).data.result;
  assert.equal(draft.status,"pending");assert.equal(db.getCityRecord(id,"long_project",draft.record_key),null);
  const memories=["Cable cut","Window open"].map(content=>db.addNpcMemory(id,{npcKey:"first",content,sourceRef:"source",confidence:80}));
  const memory={source_event:"source",op:"consolidate",actor_type:"npc",actor_key:"first",topic:"Cable",sources:memories.map(m=>({kind:"npc_memory",key:m.id}))};
  const cluster=(await turn(make("memory",memory))).data.result;
  db.annotateNpcMemory(id,memories[0].id,{status:"challenged"});row=db.getCityRecord(id,"memory_cluster",cluster.record_key);
  await turn(make("memory",{...memory,op:"revise"},row,row.record_key));
  assert.equal(db.getNpcMemory(memories[0].id).status,"challenged","consolidation preserves original evidence");
  await turn(make("density",{source_event:"source",op:"inspect",location_key:"room"}));
  db.addFact(id,{content:"Cable damage reported",category:"clue",visibility:"character",subjectCharacterId:pc.id});
  db.addFact(id,{content:"SECRET_CANNOT_BE_PUBLISHED",visibility:"gm"});
  const before=db.db.prepare("SELECT total_changes() n").get().n,privateOutput=[];
  assert(await routeDiscoveryMessage({db,message:{guild:{id},author:{id:"owner"},content:"What do I know about cable?"},deliver:async text=>privateOutput.push(text)}));
  assert(privateOutput[0].includes("Cable"));assert(!privateOutput[0].includes("SECRET"));
  assert.equal(db.db.prepare("SELECT total_changes() n").get().n,before);counts.discovery=1;
  assert.equal(Object.keys(counts).length,11);
  await turn(make("goal",{...goal,goal_key:"forged",gm:true}),{status:"blocked"});
  await turn({...goalIntent,payload:{...goal,goal_key:"stale"},policy_revision:0},{status:"blocked"});
  await turn(make("goal",{...goal,goal_key:"private"}),{scope:"private",status:"blocked"});
  const backup=db.createBackup(id,{label:"Whole loop"});
  db.close();db=new VeiledDB(file,schema);db.restoreBackup(id,backup.id,{actorId:"gm"});
  assert.equal((await turn(goalIntent,{origin:"goal"})).record_key,first.record_key,"restore preserves idempotency");
  assert.equal(db.listNpcGoals(id,"first").length,1);
  assert(outputs.every(text=>!text.includes("SECRET")));
  const directorFake=new FakeResponses([{actions:[],ai_intents:[make("density",{source_event:"source",op:"inspect",location_key:"room"})]}]);
  const directorGm=new GMService({db,content:new ContentIndex(path.resolve("../content")),ai:directorFake,config:{gmModel:"offline"}});
  await runNpcDirector({db,gm:directorGm,guildId:id,layer:"downtime",cycleKey:"integration",query:"first"});
  assert.equal(directorFake.requests.length,1);assert(directorFake.requests[0].input.includes("AI MANAGEMENT"));
  assert.throws(()=>commitGmTurn({db,guild,session,result:{...base,npc_goals:[{npc_key:"first",goal_key:"bypass",objective:"Bypass policy"}]},
    scope:{mode:"party"},speaker:"Owner",label:"Attack"}),/policy-governed/);
  assert.throws(()=>commitGmTurn({db,guild,session,result:{...base,simulation_updates:[{kind:"faction_goal",actor_key:"forged",data_json:"{}"}]},
    scope:{mode:"party"},speaker:"Owner",label:"Attack"}),/policy-governed/);
  configureDelegation(db,id,{mode:"suggest_only",allow:[],max_operations:1,max_cost:0,expires_minute:null},"gm");
  previous=null; // The separate director opportunity may rotate the bounded receipt window.
  await turn({...make("goal",{...goal,goal_key:"suggestion"}),policy_revision:2},{status:"pending"});
  assert.equal(db.getNpcGoal(id,"first","suggestion"),null);
  db.saveCityRecord(id,{kind:"strategy",key:"institution-plan",source_event:"source",data:{reviewed_by:"ai_policy",delegation_revision:1,revision:1}});
  assert.throws(()=>assertInstitutionDelegation(db,id,{record_key:"office",data:{personnel:[]}},
    {strategy_key:"institution-plan",strategy_revision:1,type:"document_request"}),/execution delegation/);
  console.log(`End-to-end I PASS: 11 scoped feature triggers; ${requests+1} synthetic existing-request calls; `+
    "real prompt/commit/publication/future context, owner decline, forged/stale/private refusals, zero-write discovery and restart/restore replay; zero paid calls.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
