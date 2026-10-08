/** End-to-end simulation invariants: fictional triggers, finite agency, subjective knowledge, review, and recovery. */
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { VeiledDB } from "../src/db.js";
import { applyAuthoritativeMutation } from "../src/state.js";
import { retrieveNpcCognition } from "../src/npc-cognition.js";
import { configureSimulationEntity, simulationCandidates, applySimulationUpdates, submitNpcAction, resolveNpcAction,
  runNpcDirector, processSimulationEvents, shareInformation, simulationOverview, executeNpcAction } from "../src/simulation.js";
import { publishSimulationHooks } from "../src/publishing.js";
import { handleCommand, buildCommands } from "../src/commands.js";
import { GMService } from "../src/gm.js";
import { ContentIndex } from "../src/content.js";

const db=new VeiledDB(":memory:",fileURLToPath(new URL("../sql/schema.sql",import.meta.url)));
const guild="simulation-test";
db.ensureCampaign(guild);
db.ensureCampaign("other");
db.upsertPlayer(guild,"gm","GM");
db.upsertPlayer(guild,"player","Player");
for(const [key,tier] of [["mara","active"],["jonas","supporting"],["calder","background"],["sleeper","dormant"]]){
  db.upsertNpcProfile(guild,{npcKey:key,displayName:key,activityTier:tier,
    decisionProfile:{risk_tolerance:70,violence_threshold:70,loyalty:50}});
  db.upsertNpcGoal(guild,{npcKey:key,goalKey:"investigate",objective:"Investigate the ward breach at Hollow Street",priority:80,
    horizon:"near",progress:0,status:"active",dependencies:[],acceptableMethods:[]});
  configureSimulationEntity(db,guild,"npc",key,{activity_tier:tier,location_key:"hollow-street"});
}
const action=(actor="mara",type="prepare",extra={})=>({actor_type:"npc",actor_key:actor,type,goal_key:"investigate",
  target_type:"",target_key:"",location_key:"hollow-street",rationale:"Follow established agenda",information_key:"",
  rumor_id:"",obligation_id:"",delay_ticks:0,delay_minutes:0,significance:"routine",public_hook:"",private_user_id:"",...extra});
const update=(kind,extra={})=>({kind,actor_type:"npc",actor_key:"mara",key:"",content:"",status:"active",
  confidence:90,importance:60,source_type:"witnessed",data_json:"{}",...extra});
const succeeds=()=>20;

try{
  assert(buildCommands().some(command=>command.name==="vc-sim"));
  assert.deepEqual(simulationCandidates(db,guild,{layer:"scene",query:"unrelated"}).map(actor=>actor.key),["mara"]);
  const downtimeCandidates=simulationCandidates(db,guild,{layer:"downtime"});
  assert(downtimeCandidates.some(actor=>actor.key==="calder"));
  assert(!downtimeCandidates.some(actor=>actor.key==="sleeper"));

  // Actor-specific packets must not acquire an objective GM secret by proximity.
  db.addFact(guild,{key:"secret",content:"Calder sabotaged the ward",visibility:"gm"});
  const packets=simulationCandidates(db,guild,{layer:"scene"});
  assert(!JSON.stringify(packets).includes("Calder sabotaged"));
  let proposedRequest;
  const service=new GMService({db,content:new ContentIndex(fileURLToPath(new URL("../../content",import.meta.url))),
    config:{gmModel:"test-model",maxRecentMessages:28,maxContentChunks:4,structuredRetryMaxTokens:6000},
    ai:{responses:{create:async request=>{proposedRequest=request;return {output_text:'{"actions":[]}'};}}}});
  await service.planNpcActions({guildId:guild,layer:"scene",query:"ward",candidates:packets});
  assert.equal(proposedRequest.text.format.name,"npc_director");
  assert(!proposedRequest.input.includes("Calder sabotaged"));
  assert(proposedRequest.input.includes("opposed mechanics"));
  assert.throws(()=>submitNpcAction(db,guild,action("mara","research",{information_key:"secret"})),/not learned/);
  assert.equal(db.listSimulationRecords(guild,{kind:"action"}).length,0,"invalid proposal left a partial record");

  // Budgeted cycles are fictional, durable, and replay-safe.
  let requests=0;
  const gm={planNpcActions:async()=>{requests++;return {actions:[action(),action(),action("jonas")]};}};
  const first=await runNpcDirector({db,gm,guildId:guild,layer:"scene",cycleKey:"scene-1",query:"ward breach",roll:succeeds});
  assert.equal(first.actions.length,2,"one action per actor per cycle");
  assert.equal(db.getSimulationClock(guild).tick,1);
  const resourceAfter=db.getSimulationEntity(guild,"npc","mara").state.resources.materials;
  await runNpcDirector({db,gm,guildId:guild,layer:"scene",cycleKey:"scene-1",query:"ward breach",roll:succeeds});
  assert.equal(requests,1);
  assert.equal(db.getSimulationClock(guild).tick,1);
  assert.equal(db.getSimulationEntity(guild,"npc","mara").state.resources.materials,resourceAfter);
  db.setDirectorPaused(guild,true);
  assert((await runNpcDirector({db,gm,guildId:guild,layer:"scene",cycleKey:"paused"})).paused);
  assert.equal(db.getSimulationClock(guild).tick,1);
  db.setDirectorPaused(guild,false);
  await assert.rejects(runNpcDirector({db,gm,guildId:guild,layer:"wall_clock",cycleKey:"illegal"}),/fictional/);

  // Delay is tied to fictional minutes, without timers or wall-clock aging.
  const delayed=submitNpcAction(db,guild,action("mara","contact",{delay_minutes:1440,target_type:"npc",target_key:"jonas"}),{roll:succeeds});
  assert.equal(delayed.status,"scheduled");
  processSimulationEvents(db,guild,{roll:succeeds});
  assert.equal(db.getSimulationRecord(guild,delayed.id).status,"scheduled");
  db.advanceSimulationClock(guild,{minutes:1439});
  processSimulationEvents(db,guild,{roll:succeeds});
  assert.equal(db.getSimulationRecord(guild,delayed.id).status,"scheduled");
  db.advanceSimulationClock(guild,{minutes:1});
  processSimulationEvents(db,guild,{roll:succeeds});
  assert.equal(db.getSimulationRecord(guild,delayed.id).status,"completed");
  assert(db.listNpcMemories(guild,"jonas").some(memory=>memory.content.includes("contact")));

  // Consequential actions have no cost or outcome before a human approves them.
  const pending=submitNpcAction(db,guild,action("mara","attack",{target_type:"npc",target_key:"jonas",significance:"major_npc_removal"}));
  assert.equal(pending.status,"pending");
  assert.equal(db.getSimulationEntity(guild,"npc","jonas").state.removed,undefined);
  resolveNpcAction(db,guild,pending.id,{decision:"defer"});
  assert.equal(db.getSimulationRecord(guild,pending.id).status,"deferred");
  const approved=resolveNpcAction(db,guild,pending.id,{decision:"modify",patch:{rationale:"GM-approved removal after review"},roll:succeeds});
  assert.equal(approved.status,"completed");
  assert.equal(db.getSimulationEntity(guild,"npc","jonas").state.removed,true);
  assert(!simulationCandidates(db,guild,{layer:"downtime"}).some(actor=>actor.key==="jonas"));
  assert.throws(()=>resolveNpcAction(db,"other",pending.id,{decision:"approve"}),/not found/);
  const rejected=submitNpcAction(db,guild,action("mara","prepare",{significance:"supernatural_disaster"}));
  resolveNpcAction(db,guild,rejected.id,{decision:"reject"});
  assert.equal(db.getSimulationRecord(guild,rejected.id).status,"rejected");

  // Personality and resources constrain actions, irrespective of model intent.
  configureSimulationEntity(db,guild,"npc","calder",{personality:{violence_threshold:10}});
  assert.throws(()=>submitNpcAction(db,guild,action("calder","attack",{target_type:"npc",target_key:"mara"})),/decision profile/);
  configureSimulationEntity(db,guild,"npc","calder",{resources:{materials:0}});
  assert.equal(submitNpcAction(db,guild,action("calder","prepare")).status,"failed");

  // Obligations require terms and retain lifecycle history on transfer/forgiveness.
  const obligation=applySimulationUpdates(db,guild,[update("obligation",{content:"Mara owes Calder one promised file",
    data_json:JSON.stringify({debtor:"npc:mara",creditor:"npc:calder"})})])[0].row;
  applySimulationUpdates(db,guild,[update("obligation",{key:obligation.id,status:"transferred",data_json:'{"transferred_to":"npc:calder"}'})]);
  assert.equal(db.getSimulationRecord(guild,obligation.id).data.debtor,"npc:calder");
  applySimulationUpdates(db,guild,[update("obligation",{key:obligation.id,status:"forgiven"})]);
  assert.equal(db.getSimulationRecord(guild,obligation.id).status,"forgiven");
  assert.equal(db.getSimulationRecord(guild,obligation.id).data.history.length,3);

  // Rumors propagate subjective belief and retain origin/distortion/credibility.
  const rumor=applySimulationUpdates(db,guild,[update("rumor",{key:"ward",content:"Someone says Calder broke the ward"})])[0].row;
  submitNpcAction(db,guild,action("mara","spread_rumor",{target_type:"npc",target_key:"calder",rumor_id:rumor.id}),{roll:succeeds});
  const propagated=db.getSimulationRecord(guild,rumor.id);
  assert(propagated.data.holders.includes("npc:calder"));
  assert.equal(propagated.data.distortion,1);
  assert(db.listNpcKnowledge(guild,"calder").some(knowledge=>knowledge.belief_state==="rumor"));
  assert.equal(db.listFactsForGM(guild,{search:"Someone says"}).length,0);

  // Investigation learns discoverable scene residue, not private global facts.
  const residue={participants:["mara"],actions:["left"],witnesses:[],evidence:["A scorched brass key"],traces:["Veil ash"],
    casualties:[],damage:[],exposure:[],threats:[],escaped:[]};
  applySimulationUpdates(db,guild,[update("residue",{key:"hollow-street",data_json:JSON.stringify(residue)})]);
  submitNpcAction(db,guild,action("mara","investigate"),{roll:succeeds});
  const clue=db.listNpcKnowledge(guild,"mara").find(knowledge=>knowledge.content==="A scorched brass key");
  assert(clue);
  assert(!db.playerFactsFor(guild,"player").some(fact=>fact.content==="A scorched brass key"));
  const pc=db.createCharacter(guild,"player","Investigator",{});
  shareInformation(db,guild,{fromType:"npc",fromKey:"mara",toType:"character",toKey:pc.id,informationKey:clue.knowledge_key});
  assert(db.playerFactsFor(guild,"player",{characterId:pc.id}).some(fact=>fact.content==="A scorched brass key"));

  // Factions retain their own memory, goals, policies and finite agency.
  applySimulationUpdates(db,guild,[update("faction_memory",{actor_type:"faction",actor_key:"lantern-office",content:"Mercer returned our file"}),
    update("faction_goal",{actor_type:"faction",actor_key:"lantern-office",content:"Repair the ward",data_json:'{"priority":90,"horizon":"long"}'})]);
  const faction=simulationCandidates(db,guild,{layer:"downtime"}).find(actor=>actor.type==="faction");
  assert(faction.memories.some(memory=>memory.content==="Mercer returned our file"));
  assert.equal(submitNpcAction(db,guild,{...action(),actor_type:"faction",actor_key:faction.key,goal_key:faction.goals[0].goal_key},
    {roll:succeeds}).status,"completed");

  // Dimensions coexist on one directional pair and milestones become durable.
  for(const [relationshipType,score] of [["trust",4],["suspicion",3],["respect",5]])
    db.upsertRelationship(guild,{fromType:"npc",fromKey:"mara",toType:"character",toKey:pc.id,relationshipType,score,visibility:"gm"});
  const pair=db.listSimulationEntities(guild,"relationship").find(row=>row.state.to===`character:${pc.id}`);
  assert.equal(pair.state.dimensions.trust,4);
  assert.equal(pair.state.dimensions.suspicion,3);
  assert.equal(pair.state.dimensions.respect,5);
  assert.equal(pair.state.milestone,"suspicious");
  // A legacy namespaced NPC endpoint feeds the same directional dimensions.
  db.upsertRelationship(guild,{fromType:"npc",fromKey:"npc:mara",toType:"character",toKey:pc.id,
    relationshipType:"debt",score:2,visibility:"gm"});
  const updatedPair=db.getSimulationEntity(guild,"relationship",pair.entity_key);
  assert.equal(updatedPair.state.dimensions.trust,4);
  assert.equal(updatedPair.state.dimensions.debt,2);

  // Contradictions retain the old belief instead of silently erasing history.
  db.upsertNpcKnowledge(guild,{npcKey:"mara",knowledgeKey:"suspect",content:"Nathan betrayed Mercer",beliefState:"rumor"});
  applyAuthoritativeMutation(db,{guildId:guild,npcKnowledge:[{npc_key:"mara",knowledge_key:"suspect",content:"Nathan did not betray Mercer",belief_state:"known"}]});
  assert(db.listNpcMemories(guild,"mara").some(memory=>memory.status==="superseded"&&memory.content.includes("Nathan betrayed")));
  const memory=db.addNpcMemory(guild,{npcKey:"mara",content:"The ward was intact"});
  applySimulationUpdates(db,guild,[update("reconcile_memory",{key:memory.id,status:"challenged",content:"The footage shows a crack"})]);
  assert.equal(db.getNpcMemory(memory.id).status,"challenged");
  applySimulationUpdates(db,guild,[update("voice",{data_json:'{"formality":"precise","verbal_habits":"calls Mercer detective"}'})]);
  assert.equal(retrieveNpcCognition(db,guild,{query:"mara",npcKey:"mara",recordRecall:false})[0].persistent_state.voice.formality,"precise");

  // Invalid updates roll back alongside ordinary facts; private scope blocks global simulation.
  assert.throws(()=>applyAuthoritativeMutation(db,{guildId:guild,events:[{type:"fact",key:"atomic",value:"Must roll back"}],
    simulationUpdates:[update("location",{key:"hollow-street",data_json:'{"unsupported":true}'})]}),/Unsupported/);
  assert(!db.listFactsForGM(guild,{search:"Must roll back"}).length);
  const transition={respond:true,narration:"The group leaves.",private_messages:[],events:[],handouts:[],relationships:[],
    npc_memories:[],npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],state_review:{}};
  for(const category of ["facts_clues","resources","clocks","threads","references","relationships","npc_cognition","handouts","canon","veil_exposure"])
    transition.state_review[category]={decision:"no_change",reason:"No additional mechanical consequence.",confidence:100};
  transition.state_review.scene={decision:"transition",label:"Lantern Office",reason:"The group leaves the prior scene."};
  let turnRequests=0;
  service.ai.responses.create=async()=>({output_text:JSON.stringify(++turnRequests===1?transition:
    {...transition,simulation_updates:[update("residue",{key:"hollow-street",data_json:JSON.stringify(residue)})]})});
  const correctedTurn=await service.runTurn({guildId:guild,actorUserId:"player",actorName:"Investigator",messageText:"We leave for the office."});
  assert.equal(turnRequests,2,"scene exit missing residue must receive a corrective retry");
  assert.equal(correctedTurn.simulation_updates[0].kind,"residue");
  const privateMutation=applyAuthoritativeMutation(db,{guildId:guild,scope:{mode:"private",actorUserId:"player"},
    simulationUpdates:[update("rumor",{content:"Should remain blocked"})]});
  assert(privateMutation.simulation[0].blocked);

  // Hooks retry failed delivery and expose only the player-facing text.
  configureSimulationEntity(db,guild,"npc","mara",{resources:{materials:3}});
  submitNpcAction(db,guild,action("mara","prepare",{public_hook:"A courier knocks at Mercer Investigations."}),{roll:succeeds});
  assert(simulationOverview(db,guild).hooks.length);
  await publishSimulationHooks({db,guild:{id:guild,channels:{fetch:async()=>null}}});
  assert(simulationOverview(db,guild).hooks.length);
  db.configureCampaign(guild,{playChannelId:"table"});
  const sent=[];
  await publishSimulationHooks({db,guild:{id:guild,channels:{fetch:async()=>({isTextBased:()=>true,send:async content=>{sent.push(content);return {id:"message"};}})}}});
  assert.deepEqual(sent,["A courier knocks at Mercer Investigations."]);
  assert.equal(simulationOverview(db,guild).hooks.length,0);

  // Logical backup/restore includes simulation and leaves other guilds untouched.
  const backup=db.createBackup(guild);
  const clockBefore=db.getSimulationClock(guild);
  db.advanceSimulationClock(guild,{minutes:99});
  db.restoreBackup(guild,backup.id);
  assert.deepEqual(db.getSimulationClock(guild),clockBefore);
  assert(db.getSimulationRecord(guild,rumor.id));
  assert.equal(db.listSimulationRecords("other").length,0);

  // Slash-command reads and writes remain GM-only.
  const replies=[];
  const interaction={id:"unauthorized-sim",commandName:"vc-sim",guildId:guild,guild:{id:guild},user:{id:"player",username:"player"},
    memberPermissions:{has:()=>false},member:{roles:{cache:{has:()=>false}}},isChatInputCommand:()=>true,
    options:{getSubcommand:()=>"status"},reply:async payload=>replies.push(payload.content)};
  await handleCommand(interaction,{db,gm:null});
  assert(replies.some(reply=>reply.includes("GM/admin permission required")));

  // A backlog of scheduled events shares the same budget as fresh proposals.
  for(let index=0;index<7;index++){
    const key=`worker-${index}`;
    db.upsertNpcProfile(guild,{npcKey:key,displayName:key,activityTier:"active",decisionProfile:{violence_threshold:70}});
    db.upsertNpcGoal(guild,{npcKey:key,goalKey:"investigate",objective:"Repair the ward",priority:90});
    submitNpcAction(db,guild,action(key,"prepare",{delay_ticks:1}),{roll:succeeds});
  }
  const noNewActions={planNpcActions:async()=>({actions:[]})};
  const dueRound=await runNpcDirector({db,gm:noNewActions,guildId:guild,layer:"round",cycleKey:"backlog-round",roll:succeeds});
  assert.equal(dueRound.actions.length,1);
  assert.equal(simulationOverview(db,guild).scheduled.length,6);
  const dueScene=await runNpcDirector({db,gm:noNewActions,guildId:guild,layer:"scene",cycleKey:"backlog-scene",roll:succeeds});
  assert.equal(dueScene.actions.length,3);
  assert.equal(simulationOverview(db,guild).scheduled.length,3);
  await runNpcDirector({db,gm:noNewActions,guildId:guild,layer:"downtime",cycleKey:"backlog-downtime",roll:succeeds});
  assert.equal(simulationOverview(db,guild).scheduled.length,0);
  const dice=[1,20];
  const failedAttack=submitNpcAction(db,guild,action("worker-0","attack",{target_type:"npc",target_key:"worker-1"}),{roll:()=>dice.shift()});
  assert.equal(failedAttack.data.result.success,false);
  assert.equal(db.getSimulationEntity(guild,"npc","worker-1").state.resources.wounds,0);
  executeNpcAction(db,guild,failedAttack,{roll:()=>{throw Error("Completed actions must never reroll");}});
  console.log("Veilkeeper persistent simulation regression test: PASS");
}finally{db.close();}
