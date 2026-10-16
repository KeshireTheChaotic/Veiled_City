/** Unified arbitration compact offline table; preserves prior uncommitted GM assertions. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup} from './narrative-fixtures.mjs';
import {sceneFictionHash as hash} from '../src/scene-fiction-context.js';
import {nativeMechanicalOutput,nativeMechanicalInput} from '../src/mechanical-native-v9.js';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {candidate,run} from './narrative-fixtures.mjs';
import {unifiedArbitrationSchema,matchesArbitrationSchema,ARBITRATION_DISPOSITIONS} from '../src/gm-arbitration-contract.js';
import {createArbitrationOrigin,buildSceneIntentBoard,arbitrationPromptBoard} from '../src/scene-intent-board.js';
import {executeUnifiedGmActions,inspectGmReactionInvitation,submitGmReactionInvitation,withdrawGmReactionInvitation,gmReactionInbox} from '../src/gm-native-rolls.js';
import {captureWorldInput,worldInputKey} from '../src/autonomous-world.js';
import {adjudicateAcceptedIntent} from '../src/rules-arbitration.js';
import {contributeRoll} from '../src/roll-collaboration.js';
import {rollRevision} from '../src/roll-requests.js';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {FakeResponses} from './contract-fixtures.mjs';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {nativeGmOpportunity} from '../src/gm-action-capability.js';
import fs from 'node:fs';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
import {adjudicateSceneBoard} from '../src/gm-unified-arbitration.js';
import {handleCommand,buildCommands} from '../src/commands.js';
import {fakeInteraction} from './contract-fixtures.mjs';
async function importCommand(f,{selected=null,admin=false,id='import-test',sheet={name:'Imported PC'},markdown=null,member=null,fetchMember=null,sendError=false}={}){
  const i=fakeInteraction({gm:admin,sub:'import'});Object.assign(i,{id,guildId:f.guild,user:{id:admin?'admin':f.pcs[0].owner_user_id,username:'Invoker'},commandName:'vc-character',isChatInputCommand:()=>true,
    guild:{id:f.guild,members:{fetch:fetchMember||(async user=>member||{id:user,user:selected,guild:{id:f.guild},displayName:'Selected Player'})}}});
  i.options.getUser=()=>selected;i.options.getAttachment=key=>key==='file'?{name:'sheet.json',url:'https://offline.invalid/sheet'}:markdown!==null?{name:'player.md',url:'https://offline.invalid/narrative'}:null;
  if(sendError)i.reply=async()=>{throw new Error('synthetic delivery failure');};
  const original=globalThis.fetch;globalThis.fetch=async url=>{assert(['https://offline.invalid/sheet','https://offline.invalid/narrative'].includes(url));return {ok:true,json:async()=>sheet,text:async()=>markdown};};
  try{await handleCommand(i,{db:f.db,gm:{}});return i;}finally{globalThis.fetch=original;}
}
const decision=(intent_ref,disposition='no_roll')=>({intent_ref,disposition,rule_basis_refs:['srd:action-rolls'],difficulty:null,trait:null,stakes_kind:disposition==='gm_attack_roll'?'native_attack':'attempt_only',stakes:'none',reason:'Ordinary costless observation.',difficulty_reason:'',feature_ref:'',experience_ref:'',advantage:false,disadvantage:false});
function boardFixture(f,{privateScene=false,rollQuestion=false}={}){
  const x=setup(f,{text:rollQuestion?'Can I roll?':'I inspect the counter.',privateScene});f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,roll_collaboration:true}});npc(f);
  const i={...candidate(x.text).player_intents[0],type:rollQuestion?'roll':'search',operation:rollQuestion?'request_roll':'inspect'},rows=persistPlayerIntents(f.db,f.guild,[i],x.scope,{messageId:x.messageId});
  const origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),proposal={actor_key:'attendant',operation:'speak',target_refs:[],objective_ref:'',source_refs:[],dependencies:[]};
  return {...x,rows,origin,proposal};
}
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {mintNarrativeAudience} from '../src/audience-native-v9.js';
import {gmD20Roll,gmAttackDamage} from '../src/dice.js';
import {prepareIncomingAttack,prepareArbitratedIncomingAttack,rollArbitratedIncomingAttack,reviewIncomingAttack,confirmIncomingDefense,rollIncomingAttack,incomingAttackEvidence,resolveIncomingDamage,validateIncomingDamageApplication} from '../src/pc-incoming.js';
import {EncounterLibrary} from '../src/encounter.js';
import {buildCombatants} from '../src/combat.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene,recordScenePresence,scenePresence} from '../src/scene-continuity.js';
import {projectNativeGmProposal} from '../src/gm-mechanical-v9.js';
function npc(f,key='attendant',location='terminal'){f.db.upsertNpcProfile(f.guild,{npcKey:key,displayName:'Inez',role:'attendant',publicIdentity:'A local attendant.'});f.db.setSimulationEntity(f.guild,'npc',key,{name:'Inez',location_key:location,visibility:'party'});}
function incoming(f,{privateScene=true,text,template='Aster Vale Contractor',stress=0}={}){
  const x=setup(f,{privateScene,text}),library=new EncounterLibrary('../content'),scene=currentScene(f.db,f.guild);npc(f,'guard');
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_encounters:true}});
  f.db.updateCharacterData(x.pc.id,d=>{d.evasion=12;d.thresholds={major:7,severe:14};});
  const source=indexWorldEvent(f.db,f.guild,{key:'af-guard-source',kind:'observation',source_id:'gm',title:'Native guard encounter',session_id:f.session.id,scene:scene.key,location_key:'terminal',visibility:'party'},'gm');
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:'guard',source_event:source.event_key,location_key:'terminal',zone:'interior',range:'Close',visibility:'party',accepted_by:'gm'},'gm');
  const encounter=f.db.createEncounter(f.guild,f.session.id,{status:'active',tier:1,pc_count:4,base_bp:14,budget_bp:14,composition:[{name:template,quantity:1}]}),c=f.db.initializeCombatants(encounter.id,buildCombatants(encounter,library))[0];
  if(stress)f.db.updateCombatant(c.id,{stress_current:stress});
  f.db.saveCityRecord(f.guild,{kind:'encounter_binding',key:encounter.id,source_event:source.event_key,data:{combatants:[{actor:'guard',id:c.id}]}});
  f.db.upsertRulesRuling(f.guild,{key:'af-standard',ruling:'Current standard attack; no unreviewed feature or extra spotlight.',createdBy:'gm'});
  const input={npc:'guard',combatant:c.id,character:x.pc.id,source:source.event_key,ruling:'af-standard',defenses:{resistance:'none',armor_reduction:1,armor_allowed:true,source:'base'}};
  const row=prepareIncomingAttack(f.db,f.guild,'gm',input,{gm:true,interactionId:'af-attack',library});reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,row.record_key,{library});confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,row.record_key);
  return {...x,library,row};
}
async function featureScenario(f){
  const {pendingFeatureWindows}=await import('../src/native-feature-windows.js'),x=incoming(f,{template:'Pale Court Knight',stress:2,text:'I inspect the counter.'});
  rollIncomingAttack(f.db,f.guild,'gm',x.row.record_key,{gm:true,library:x.library,rng:s=>s});resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,x.row.record_key,{armor:false,library:x.library});
  const w=pendingFeatureWindows(f.db,f.guild)[0];f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true}});
  const rows=persistPlayerIntents(f.db,f.guild,[{...candidate(x.text).player_intents[0],type:'search',operation:'inspect'}],x.scope,{messageId:x.messageId}),
    origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),board=buildSceneIntentBoard(f.db,f.guild,origin,rows,[{actor_key:'guard',operation:'reaction',target_refs:[x.pc.id],objective_ref:'',source_refs:[],dependencies:[]}]);
  const p={...decision(board.data.entries[1].intent_ref,'native_feature_resolution'),proposal_version:2,trigger_ref:w.record_key,
    rule_basis_refs:['srd:adversary-attacks'],feature_ref:w.data.feature,stakes_kind:'native_feature'};
  return {...x,w,rows,origin,board,p};
}

const cases=[
 ['F7','22','fully marked HP does not erase expressive scene narration or permit a character action',async f=>{
   const x=setup(f,{text:'Describe the scene to me'});f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true}});
   f.db.updateCharacterData(x.pc.id,d=>{d.resources.hp.current=d.resources.hp.max;});const r=candidate(x.text);
   r.unified_arbitration={version:1,npc_intents:[],decisions:[decision('player:0','no_roll')]};
   const task=`narrative-task:${hash([x.sourceRef,hash(f.db.getWorldEvent(f.guild,x.sourceRef).details),x.scope,'describe_scene'])}`,
     answer={version:9,acts:[{id:'scene',task_id:task,kind:'scene_description',speaker_key:'',location_key:'terminal',text:'Amber lights fall across a scarred folding counter; the coin tray rattles beneath a steady dryer hum.',source_refs:[]}],fiction_delta:[]},out=await run(f,x,answer,r);
   assert(out.rows.some(row=>row.payload.includes('Amber lights')));assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,6);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_operation',includeGM:true}).length,0);
   const y=boardFixture(f,{rollQuestion:true}),board=buildSceneIntentBoard(f.db,f.guild,y.origin,y.rows,[]),[held]=adjudicateSceneBoard(f.db,f.guild,y.origin,board,
     [{...decision('player:0','request_pc_action_roll'),difficulty:14,trait:'Finesse',stakes:'Attempt only.',difficulty_reason:'Current scene.'}]);
   assert.equal(held.status,'needs_rules_review');assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true}).length,0);}],
 ['AR5','21','shared public owner inputs retain independent dispositions and exact private rollers',f=>{
   const x=boardFixture(f,{rollQuestion:true}),other=f.pcs[1],scene=currentScene(f.db,f.guild),source=indexWorldEvent(f.db,f.guild,{key:'ar-other-position',kind:'arrival',source_id:`player:${other.owner_user_id}`,
     title:'Native fixture initial position',session_id:f.session.id,scene:scene.key,location_key:'terminal',visibility:'party',details:{entity_type:'character',entity_key:other.id,owner_user_id:other.owner_user_id}},other.owner_user_id);
   recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:other.id,location_key:'terminal',zone:'interior',source_event:source.event_key,visibility:'party',accepted_by:other.owner_user_id},'fixture-native');
   const otherIntent=f.accepted(1,'I inspect the label.',null,{type:'search',operation:'inspect',target:{kind:'unknown',key:'',phrase:'',grounding:'unknown'}}),
     board=buildSceneIntentBoard(f.db,f.guild,x.origin,[...x.rows,otherIntent],[x.proposal]);
   const [pending,done,speech]=adjudicateSceneBoard(f.db,f.guild,x.origin,board,[{...decision('player:0','request_pc_action_roll'),difficulty:14,trait:'Finesse',stakes:'Attempt only.',difficulty_reason:'Current native scene.'},
     decision(otherIntent.record_key,'no_roll'),{...decision(board.data.entries[2].intent_ref,'npc_no_roll'),rule_basis_refs:['srd:gm-moves']}]);
   assert.equal(pending.status,'pending_pc_roll');assert.equal(done.status,'resolved_no_roll');assert.equal(speech.status,'resolved_no_roll');
   const q=f.db.getCityRecord(f.guild,'roll_request',pending.data.native.roll_request_ref);assert.equal(q.data.owner_user_id,x.pc.owner_user_id);assert.equal(q.subject_key,x.pc.id);
   assert.equal(f.db.getCityRecord(f.guild,'typed_intent',otherIntent.record_key).status,'resolved');assert.equal(f.db.getCharacter(other.id).data.resources.hope,2);}],
 ['AR4','20','a stale NPC presence cannot authorize a player reaction even when its profile remains local',f=>{
   const x=incoming(f);f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true}});
   f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.row.data.offer.input.source);
   const rows=persistPlayerIntents(f.db,f.guild,candidate(x.text).player_intents,x.scope,{messageId:x.messageId}),origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),
     proposal={actor_key:'guard',operation:'prepare',target_refs:[x.pc.id],objective_ref:'',source_refs:[],dependencies:[]},board=buildSceneIntentBoard(f.db,f.guild,origin,rows,[proposal]),
     [r]=adjudicateSceneBoard(f.db,f.guild,origin,board,[{...decision(board.data.entries[1].intent_ref,'request_pc_reaction_roll'),rule_basis_refs:['srd:reaction-rolls'],trait:'Agility',difficulty:12,stakes:'Attempt only.',difficulty_reason:'Local NPC attempt.'}]);
   assert.equal(r.status,'needs_rules_review');assert.equal(executeUnifiedGmActions(f.db,f.guild,[r],{rng:()=>assert.fail('no stale dice')}).length,0);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true}).length,0);}],
 ['AR5','19','retired syntax producers have no production import while native readers remain',async()=>{
   for(const file of ['roll-language','consent-language'])assert.equal(fs.existsSync(`src/${file}.js`),false);
   for(const file of fs.readdirSync('src',{recursive:true}).filter(p=>p.endsWith('.js'))){const source=fs.readFileSync(`src/${file}`,'utf8');assert(!/from\s+['"][^'"]*legacy-fixtures\//u.test(source),file);}
   const legacy=await import('./legacy-fixtures/roll-language.mjs'),native=await import('../src/roll-declaration-review.js');assert.equal(legacy.reviewRollDeclaration,native.reviewRollDeclaration);
   const consent=await import('./legacy-fixtures/consent-language.mjs'),service=await import('../src/consent-native.js');assert.equal(consent.respondConsent,service.respondConsent);}],
 ['AR4','18','actual non-PvP action Fear supplies an optional GM opportunity not automatic dice or spending',f=>{
   const x=boardFixture(f,{rollQuestion:true,privateScene:true}),board=buildSceneIntentBoard(f.db,f.guild,x.origin,x.rows,[]),[r]=adjudicateSceneBoard(f.db,f.guild,x.origin,board,
     [{...decision('player:0','request_pc_action_roll'),difficulty:12,trait:'Finesse',stakes:'Attempt only.',difficulty_reason:'Current native scene.'}]);
   assert.throws(()=>nativeGmOpportunity(f.db,f.guild,board));const q=f.db.getCityRecord(f.guild,'roll_request',r.data.native.roll_request_ref);let calls=0;
   const result=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',request:q.record_key,expected_revision:rollRevision(q),key:'ar-action-fear'},
     {rng:()=>[3,10][calls++],gmRng:()=>assert.fail('no automatic GM move')});
   const opportunity=nativeGmOpportunity(f.db,f.guild,board);assert.equal(opportunity.roll,result.data.roll_id);assert.equal(calls,2);
   assert.equal(f.db.getCampaign(f.guild).fear,1);assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_action_cost_receipt',includeGM:true}).length,0);}],
 ['AR4','17','authenticated Director uses the same board without laundering civic simulation or adding a call',async f=>{
   const x=boardFixture(f),r={...candidate(x.text),player_intents:[],act:true,public_narration:'',confidence:100,gm_notes:''},ai=new FakeResponses([r,{version:9,acts:[],fiction_delta:[]}]),original=ai.responses.create;
   ai.responses.create=async req=>{
     if(ai.requests.length===0){const source=f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).find(e=>e.kind==='native_director_narrative_scope'),ref=`npc-intent:${hash([source.event_key,'attendant','speak'])}`;
       r.unified_arbitration={version:1,npc_intents:[x.proposal],decisions:[{...decision(ref,'npc_no_roll'),rule_basis_refs:['srd:gm-moves']}]};}
     return original(req);
   };
   const content=new ContentIndex('../content'),gm=new GMService({db:f.db,content,ai,config:{gmModel:'offline'}}),result=await gm.runWorldDirector({guildId:f.guild,layer:'manual',trigger:{requested_by:'gm',scope:'party',actor_user_id:x.pc.owner_user_id,actor_character_id:x.pc.id}});
   const saved=commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope:x.scope,speaker:'Native Director',label:'Offline Director arbitration',content});
   assert.equal(saved.unifiedArbitration[0].status,'resolved_no_roll');assert.equal(ai.requests.length,2);assert(ai.requests[0].text.format.schema.properties.unified_arbitration);
   assert.equal(f.db.getWorldEvent(f.guild,f.db.getCityRecord(f.guild,'scene_intent_board',saved.unifiedArbitration[0].data.board).data.entries.find(e=>e.actor.type==='npc').source_ref).source_id,'native:unified-gm');}],
 ['AR4','16','saved native success resumes only the exact preauthorized NPC dependent action',f=>{
   const x=incoming(f,{privateScene:false});f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,roll_collaboration:true}});
   const text='I inspect the counter.',messageId='ar-existing-search';captureWorldInput(f.db,f.guild,x.pc.owner_user_id,x.pc.id,messageId,text);
   const [search]=persistPlayerIntents(f.db,f.guild,[{...candidate(text).player_intents[0],type:'search',operation:'inspect'}],x.scope,{messageId});
   f.db.upsertNpcGoal(f.guild,{npcKey:'guard',goalKey:'console',objective:'Operate the independent console.',source:x.row.data.offer.input.source});
   const look=persistPlayerIntents(f.db,f.guild,candidate(x.text).player_intents,x.scope,{messageId:x.messageId}),origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),
     proposal={actor_key:'guard',operation:'exceptional_action',target_refs:[],objective_ref:'console',source_refs:[],dependencies:[search.record_key]},board=buildSceneIntentBoard(f.db,f.guild,origin,[...look,search],[proposal]);
   const [r]=adjudicateSceneBoard(f.db,f.guild,origin,board,[{...decision(board.data.entries[2].intent_ref,'gm_exceptional_action_roll'),rule_basis_refs:['srd:exceptional-adversary-actions'],difficulty:15,stakes:'Independent NPC attempt.',difficulty_reason:'A difficult independent console task.'}],{library:x.library});
   assert.equal(executeUnifiedGmActions(f.db,f.guild,[r],{library:x.library,rng:()=>assert.fail('prerequisite pending')})[0].status,'pending');
   const native=adjudicateAcceptedIntent(f.db,f.guild,{acceptedIntent:search.record_key,mode:'roll_required',trait:'Finesse',kind:'action',difficulty:12,risk:'Delay',stakes:'Attempt may fail.',rawRefs:['srd:action-rolls'],explanation:'Native ordinary action.'},'ai_gm',{scope:x.scope}),q=f.db.getCityRecord(f.guild,'roll_request',native.roll_request_ref);
   let pcCalls=0,gmCalls=0;const result=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',request:q.record_key,expected_revision:rollRevision(q),key:'ar-dependency-owner'},
     {rng:()=>[10,4][pcCalls++],gmRng:()=>{gmCalls++;return 19;}});
   assert.equal(result.status,'resolved');assert.equal(pcCalls,2);assert.equal(gmCalls,1);assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_action_continuation',includeGM:true})[0].status,'resumed');
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_native_roll_receipt',includeGM:true}).length,1);}],
 ['AR4','15','owner may withhold a reaction without dice or an invented failed response',f=>{
   const x=incoming(f);f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true}});
   const rows=persistPlayerIntents(f.db,f.guild,candidate(x.text).player_intents,x.scope,{messageId:x.messageId}),origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),
     proposal={actor_key:'guard',operation:'prepare',target_refs:[x.pc.id],objective_ref:'',source_refs:[],dependencies:[]},board=buildSceneIntentBoard(f.db,f.guild,origin,rows,[proposal]),
     [r]=adjudicateSceneBoard(f.db,f.guild,origin,board,[{...decision(board.data.entries[1].intent_ref,'request_pc_reaction_roll'),rule_basis_refs:['srd:reaction-rolls'],trait:'Agility',difficulty:12,stakes:'Attempt only.',difficulty_reason:'Local NPC attempt.'}]);
   executeUnifiedGmActions(f.db,f.guild,[r],{library:x.library});const terms=inspectGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,r.record_key).terms,input={op:'gm-reaction-withdraw',request:r.record_key,revision:terms.revision},opts={interactionId:'ar-withhold',authoredText:JSON.stringify(input)};
   const saved=withdrawGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,input,opts);assert.equal(saved.status,'withdrawn');assert.equal(withdrawGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,input,opts).record_key,saved.record_key);
   assert.equal(inspectGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,r.record_key).terms.status,'withdrawn');
   assert.equal(gmReactionInbox(f.db,f.guild,x.pc.owner_user_id)[0].status,'withdrawn');assert.equal(gmReactionInbox(f.db,f.guild,f.pcs[1].owner_user_id).length,0);
   const roll={...input,op:'gm-reaction-roll'};assert.throws(()=>submitGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,roll,{interactionId:'ar-no-resurrection',authoredText:JSON.stringify(roll),rng:()=>assert.fail('withheld')}));
   assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_operation',includeGM:true}).length,0);assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);}],
 ['AR4','13','actual outbox privately delivers native pending terms without GM commentary or repeated dice',async f=>{const x=boardFixture(f,{rollQuestion:true}),r=candidate(x.text);
   r.player_intents[0]={...r.player_intents[0],type:'roll',operation:'request_roll'};
   r.unified_arbitration={version:1,npc_intents:[],decisions:[{...decision('player:0','request_pc_action_roll'),difficulty:14,trait:'Finesse',stakes:'SECRET DO NOT DISCLOSE',difficulty_reason:'SECRET DO NOT DISCLOSE'}]};
   const out=await run(f,x,{version:9,acts:[],fiction_delta:[]},r),privateRows=out.rows.filter(row=>row.target_user_id===x.pc.owner_user_id);
   assert(privateRows.length>0);assert(privateRows.some(row=>row.payload.includes('Finesse')&&row.payload.includes('14')));
   assert(!out.rows.some(row=>row.payload.includes('SECRET DO NOT DISCLOSE')));assert(!out.rows.filter(row=>row.surface==='party').some(row=>row.payload.includes('Pending Daggerheart')));
   assert.equal(out.ai.requests.length,2);const delivered=[];await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async row=>{delivered.push(row.payload);return{messageId:`fake-${delivered.length}`,channelId:'offline'};});
   assert(delivered.some(text=>text.includes('Finesse')));await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>assert.fail('no duplicate delivery'));}],
 ['AR4','14','restart revalidates actual pending outbox payload before delivery',async f=>{const x=boardFixture(f,{rollQuestion:true}),r=candidate(x.text);
   r.player_intents[0]={...r.player_intents[0],type:'roll',operation:'request_roll'};r.unified_arbitration={version:1,npc_intents:[],decisions:[{...decision('player:0','request_pc_action_roll'),difficulty:14,trait:'Finesse',stakes:'Attempt only.',difficulty_reason:'Current scene.'}]};
   const out=await run(f,x,{version:9,acts:[],fiction_delta:[]},r);assert(out.rows.some(row=>row.target_user_id===x.pc.owner_user_id));f.restart();
   f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.sourceRef);
   let sends=0;await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>{sends++;return{messageId:'fake',channelId:'offline'};});assert.equal(sends,0);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_operation',includeGM:true}).length,0);}],
 ['AR3','12','additional spotlight plus native Experience costs are additive and committed before dice once',f=>{
   const x=incoming(f),find=x.library.findAdversary.bind(x.library);x.library.findAdversary=name=>({...find(name),experiences:[{name:'Technical systems',modifier:2}]});
   f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true}});
   f.db.upsertNpcGoal(f.guild,{npcKey:'guard',goalKey:'console',objective:'Operate the console independently.',source:x.row.data.offer.input.source});
   const rows=persistPlayerIntents(f.db,f.guild,candidate(x.text).player_intents,x.scope,{messageId:x.messageId}),origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),
     proposals=[{actor_key:'guard',operation:'attack',target_refs:[x.pc.id],objective_ref:'',source_refs:[],dependencies:[]},{actor_key:'guard',operation:'exceptional_action',target_refs:[],objective_ref:'console',source_refs:[],dependencies:[]}],
     board=buildSceneIntentBoard(f.db,f.guild,origin,rows,proposals),[first,r]=adjudicateSceneBoard(f.db,f.guild,origin,board,[
       {...decision(board.data.entries[1].intent_ref,'gm_attack_roll'),rule_basis_refs:['srd:adversary-attacks'],feature_ref:'standard_attack',stakes:'Native standard attack.'},
       {...decision(board.data.entries[2].intent_ref,'gm_exceptional_action_roll'),
       rule_basis_refs:['srd:exceptional-adversary-actions'],experience_ref:'Technical systems',difficulty:15,stakes:'The independent task may fail.',difficulty_reason:'A dramatic self-contained task outside PC influence.'}],{library:x.library});
   assert.equal(executeUnifiedGmActions(f.db,f.guild,[first],{library:x.library})[0].status,'awaiting_defense');
   const [held]=executeUnifiedGmActions(f.db,f.guild,[r],{library:x.library,rng:()=>assert.fail('no unaffordable dice')});assert.equal(held.status,'needs_review');assert.equal(f.db.getCampaign(f.guild).fear,0);
   f.db.changeFear(f.guild,2);let calls=0;const [receipt]=executeUnifiedGmActions(f.db,f.guild,[r],{library:x.library,rng:()=>{calls++;assert.equal(f.db.getCampaign(f.guild).fear,0);return 13;}});
   assert.equal(calls,1);assert.equal(receipt.data.result.total,15);const cost=f.db.getCityRecord(f.guild,'gm_action_cost_receipt',receipt.data.cost);
   assert.deepEqual(cost.data.expenses,{additional_spotlight:1,feature:0,experience:1});assert.equal(cost.data.amount,2);
   executeUnifiedGmActions(f.db,f.guild,[r],{library:x.library,rng:()=>assert.fail('no second payment/roll')});assert.equal(f.db.getCampaign(f.guild).fear,0);}],
 ['AR3','10','ordinary behavior cannot mint attack spotlight and unsupported multi-target features remain held',f=>{
   const x=incoming(f,{text:'I inspect the counter.'});f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true}});
   npc(f);
   const declared={...candidate(x.text).player_intents[0],type:'search',operation:'inspect'},rows=persistPlayerIntents(f.db,f.guild,[declared],x.scope,{messageId:x.messageId}),origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),
     proposal={actor_key:'guard',operation:'attack',target_refs:[x.pc.id],objective_ref:'',source_refs:[],dependencies:[]},board=buildSceneIntentBoard(f.db,f.guild,origin,rows,[proposal,{...proposal,operation:'feature'},{...proposal,actor_key:'attendant',operation:'speak',target_refs:[]}]);
   const [attack,hold,safe]=adjudicateSceneBoard(f.db,f.guild,origin,board,[{...decision(board.data.entries[1].intent_ref,'gm_attack_roll'),rule_basis_refs:['srd:adversary-attacks'],feature_ref:'standard_attack'},
     {...decision(board.data.entries[2].intent_ref,'native_feature_resolution'),feature_ref:'invented-multi-target-feature',stakes_kind:'native_feature'},
     {...decision(board.data.entries[3].intent_ref,'npc_no_roll'),rule_basis_refs:['srd:gm-moves']}],{library:x.library});
   assert.equal(attack.status,'needs_rules_review');assert.match(attack.data.reason,/spotlight/);assert.equal(safe.status,'resolved_no_roll');
   assert.equal(hold.status,'needs_rules_review');assert.equal(executeUnifiedGmActions(f.db,f.guild,[attack,hold,safe],{rng:()=>assert.fail('no unsupported RNG')}).length,0);
   assert.equal(f.db.getCampaign(f.guild).fear,0);}],
 ['AR3','11','untrusted adjudicator commentary never becomes owner-facing stakes or secrets',f=>{const x=boardFixture(f,{rollQuestion:true}),board=buildSceneIntentBoard(f.db,f.guild,x.origin,x.rows,[]);
   const [r]=adjudicateSceneBoard(f.db,f.guild,x.origin,board,[{...decision('player:0','request_pc_action_roll'),difficulty:14,trait:'Finesse',
     stakes:'SECRET HIDDEN CULPRIT',reason:'SECRET HIDDEN CULPRIT',difficulty_reason:'SECRET HIDDEN CULPRIT'}]);
   const q=f.db.getCityRecord(f.guild,'roll_request',r.data.native.roll_request_ref);assert(!JSON.stringify(q.data).includes('SECRET HIDDEN CULPRIT'));
   assert(r.data.proposal.stakes.includes('SECRET HIDDEN CULPRIT'));assert.equal(r.visibility,'gm');}],
 ['AR3','08','GM reaction invitation waits for exact owner command and preserves reaction metacurrency rules',f=>{
   const x=incoming(f);f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,roll_collaboration:true}});
   const rows=persistPlayerIntents(f.db,f.guild,candidate(x.text).player_intents,x.scope,{messageId:x.messageId}),origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),
     proposal={actor_key:'guard',operation:'prepare',target_refs:[x.pc.id],objective_ref:'',source_refs:[],dependencies:[]},board=buildSceneIntentBoard(f.db,f.guild,origin,rows,[proposal]);
   const [r]=adjudicateSceneBoard(f.db,f.guild,origin,board,[{...decision(board.data.entries[1].intent_ref,'request_pc_reaction_roll'),rule_basis_refs:['srd:reaction-rolls'],
     trait:'Agility',difficulty:12,stakes:'The threatened obstruction may impede the attempted passage.',difficulty_reason:'The local guard prepares to obstruct passage.'}]);
   assert.equal(r.status,'pending_pc_reaction');assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true}).length,0);
   executeUnifiedGmActions(f.db,f.guild,[r],{library:x.library,rng:()=>assert.fail('GM invitation is not dice')});
   assert.throws(()=>inspectGmReactionInvitation(f.db,f.guild,f.pcs[1].owner_user_id,r.record_key));
   const terms=inspectGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,r.record_key).terms,input={op:'gm-reaction-roll',request:r.record_key,revision:terms.revision},before=structuredClone(f.db.getCharacter(x.pc.id).data.resources),fear=f.db.getCampaign(f.guild).fear;
   let calls=0;const result=submitGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,input,{interactionId:'ar-reaction-owner',authoredText:JSON.stringify(input),rng:s=>{calls++;assert.equal(s,12);return 8;}});
   assert.equal(result.status,'resolved');assert.equal(calls,2);assert.equal(result.data.kind,'reaction');assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);assert.equal(f.db.getCampaign(f.guild).fear,fear);
   f.restart();assert.equal(submitGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,input,{interactionId:'ar-reaction-retry',authoredText:JSON.stringify(input),rng:()=>assert.fail('no replay')}).record_key,result.record_key);}],
 ['AR3','09','exceptional independent NPC d20 is saved once and differs from ordinary NPC fiction',f=>{
   const x=incoming(f);f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true}});
   f.db.upsertNpcGoal(f.guild,{npcKey:'guard',goalKey:'unlock-console',objective:'Restore the native automated console.',source:x.row.data.offer.input.source});
   const rows=persistPlayerIntents(f.db,f.guild,candidate(x.text).player_intents,x.scope,{messageId:x.messageId}),origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),
     proposal={actor_key:'guard',operation:'exceptional_action',target_refs:[],objective_ref:'unlock-console',source_refs:[],dependencies:[]},board=buildSceneIntentBoard(f.db,f.guild,origin,rows,[proposal]);
   const [r]=adjudicateSceneBoard(f.db,f.guild,origin,board,[{...decision(board.data.entries[1].intent_ref,'gm_exceptional_action_roll'),rule_basis_refs:['srd:exceptional-adversary-actions'],
     difficulty:15,stakes:'The independent NPC task remains stalled on failure.',difficulty_reason:'The self-contained mechanism is not affected by PC actions.'}],{library:x.library});
   assert.equal(r.status,'gm_action_ready');let calls=0;const [saved]=executeUnifiedGmActions(f.db,f.guild,[r],{library:x.library,rng:()=>{calls++;return 19;}});
   assert.equal(calls,1);assert.equal(saved.data.result.success,true);assert.equal(saved.data.result.family,'gm_d20');assert(!('hope' in saved.data.result));
   f.restart();assert.equal(executeUnifiedGmActions(f.db,f.guild,[r],{library:x.library,rng:()=>assert.fail('no replay')})[0].record_key,saved.record_key);}],
 ['AR3','07','native autonomous standard attack requires owner defense then one GM roll and replay-safe costs',f=>{
   const x=incoming(f);f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true}});
   const rows=persistPlayerIntents(f.db,f.guild,candidate(x.text).player_intents,x.scope,{messageId:x.messageId}),origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),
     npcProposal={actor_key:'guard',operation:'attack',target_refs:[x.pc.id],objective_ref:'',source_refs:[],dependencies:[]},board=buildSceneIntentBoard(f.db,f.guild,origin,rows,[npcProposal]);
   const p={...decision(board.data.entries[1].intent_ref,'gm_attack_roll'),rule_basis_refs:['srd:adversary-attacks'],feature_ref:'standard_attack',stakes:'The guard attempts a standard attack against your Evasion.'};
   const [r]=adjudicateSceneBoard(f.db,f.guild,origin,board,[p],{library:x.library});assert.equal(r.status,'gm_action_ready');
   const offer=prepareArbitratedIncomingAttack(f.db,f.guild,r.record_key,{library:x.library}),fear=f.db.getCampaign(f.guild).fear;
   assert.throws(()=>rollArbitratedIncomingAttack(f.db,f.guild,offer.record_key,{library:x.library,rng:()=>assert.fail('no owner review')}));
   reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,offer.record_key,{library:x.library});confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,offer.record_key);
   let calls=0;const result=rollArbitratedIncomingAttack(f.db,f.guild,offer.record_key,{library:x.library,rng:()=>{calls++;return 1;}});assert.equal(calls,1);assert.equal(result.data.hit,false);
   f.restart();assert.equal(rollArbitratedIncomingAttack(f.db,f.guild,offer.record_key,{library:x.library,rng:()=>assert.fail('no reroll')}).record_key,result.record_key);
   assert.equal(f.db.getCampaign(f.guild).fear,fear);assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_action_cost_receipt',includeGM:true}).length,1);}],
 ['AR2','06','combined GM production request arbitrates without an extra provider pass',async f=>{const x=boardFixture(f,{rollQuestion:true}),r=candidate(x.text);
   r.player_intents[0]={...r.player_intents[0],type:'roll',operation:'request_roll'};
   r.unified_arbitration={version:1,npc_intents:[],decisions:[{...decision('player:0','request_pc_action_roll'),difficulty:14,trait:'Finesse',stakes:'A delay if unsuccessful.',difficulty_reason:'A delicate current-scene task.'}]};
   const out=await run(f,x,{version:9,acts:[]},r);
   assert.equal(out.ai.requests.length,2);const saved=f.db.listCityRecords(f.guild,{kind:'gm_arbitration_decision',includeGM:true});assert.equal(saved.length,1);assert.equal(saved[0].status,'pending_pc_roll');
   assert.equal(out.mutation.unifiedArbitration.length,1);}],
 ['AR2','04','autonomous owner roll question prepares real pending dice without rolling',f=>{const x=boardFixture(f,{rollQuestion:true}),row=x.rows[0];
   const source=indexWorldEvent(f.db,f.guild,{key:'ar-counter-evidence',kind:'observation',source_id:'gm',title:'A delicate mechanism is visible in the counter.',session_id:f.session.id,scene:currentScene(f.db,f.guild).key,location_key:'terminal',visibility:'party'},'gm');
   const board=buildSceneIntentBoard(f.db,f.guild,x.origin,x.rows,[]),p={...decision('player:0','request_pc_action_roll'),difficulty:14,trait:'Finesse',stakes:'The mechanism jams on failure.',difficulty_reason:source.title};
   const [r]=adjudicateSceneBoard(f.db,f.guild,x.origin,board,[p]);assert.equal(r.status,'pending_pc_roll');
   assert(f.db.getCityRecord(f.guild,'roll_request',r.data.native.roll_request_ref));assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_operation',includeGM:true}).length,0);
   assert.equal(adjudicateSceneBoard(f.db,f.guild,x.origin,board,[p])[0].record_key,r.record_key);
   assert.throws(()=>adjudicateSceneBoard(f.db,f.guild,x.origin,board,[{...p,difficulty:15}]));assert.equal(f.db.getCityRecord(f.guild,'typed_intent',row.record_key).status,'accepted_for_adjudication');}],
 ['AR2','05','independent native NPC no-roll disposition survives unsupported feature hold',f=>{const x=boardFixture(f),board=buildSceneIntentBoard(f.db,f.guild,x.origin,x.rows,[x.proposal]),npcRef=board.data.entries[1].intent_ref;
   const rows=adjudicateSceneBoard(f.db,f.guild,x.origin,board,[decision('player:0','native_feature_resolution'),{...decision(npcRef,'npc_no_roll'),rule_basis_refs:['srd:gm-moves']}]);
   assert.equal(rows[0].status,'needs_rules_review');assert.equal(rows[1].status,'resolved_no_roll');assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);}],
 ['AR1','03','accepted occurrence identity is independent of mutable adjudication status',f=>{const x=boardFixture(f),first=buildSceneIntentBoard(f.db,f.guild,x.origin,x.rows,[]),row=x.rows[0];
   f.db.saveCityRecord(f.guild,{...row,key:row.record_key,status:'resolved',data:{...row.data,outcome_receipt:'native-test-terminal'}});
   assert.equal(buildSceneIntentBoard(f.db,f.guild,x.origin,[f.db.getCityRecord(f.guild,'typed_intent',row.record_key)],[]).record_key,first.record_key);}],
 ['AR1','01','one native board retains owner and NPC sources without leaking private motives',f=>{const x=boardFixture(f),packet=arbitrationPromptBoard(f.db,f.guild,x.origin),board=buildSceneIntentBoard(f.db,f.guild,x.origin,x.rows,[x.proposal]);
   assert.equal(board.data.entries.length,2);assert.equal(board.data.entries[0].actor.controller,'owner');assert.equal(board.data.entries[1].actor.controller,'ai_gm');
   assert.notEqual(board.data.entries[0].source_ref,board.data.entries[1].source_ref);assert(!JSON.stringify(packet).includes('resources'));assert.equal(buildSceneIntentBoard(f.db,f.guild,x.origin,x.rows,[x.proposal]).record_key,board.record_key);
   assert.throws(()=>buildSceneIntentBoard(f.db,f.guild,{},x.rows,[]));}],
 ['AR1','02','revocation and cross-owner private inputs cannot enter current board',f=>{const x=boardFixture(f,{privateScene:true});
   const foreign=f.accepted(1,'I whisper a secret.',null,{type:'search',operation:'inspect'});assert.throws(()=>buildSceneIntentBoard(f.db,f.guild,x.origin,[foreign],[]));
   f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.sourceRef);assert.throws(()=>buildSceneIntentBoard(f.db,f.guild,x.origin,x.rows,[x.proposal]));}],
 ['AR0','00','closed arbitration schema carries no executable dice or role waiver',()=>{const value={version:1,npc_intents:[],decisions:[]};assert(matchesArbitrationSchema(unifiedArbitrationSchema,value));
   assert(!matchesArbitrationSchema(unifiedArbitrationSchema,{...value,gm:true}));assert(ARBITRATION_DISPOSITIONS.includes('gm_attack_roll'));assert(ARBITRATION_DISPOSITIONS.includes('request_pc_reaction_roll'));}],
 ['F2-GM','31','revoked current query invalidates mechanical grant without rolling',f=>{const x=setup(f,{privateScene:true,text:'Can I roll?'}),i={...candidate(x.text).player_intents[0],type:'roll',operation:'request_roll'};
   const [a]=persistPlayerIntents(f.db,f.guild,[i],x.scope,{messageId:x.messageId}),g=mintNarrativeAudience(buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef));
   assert.equal(nativeMechanicalInput(f.db,f.guild,g,a.record_key).executed,false);
   f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.sourceRef);
   assert.throws(()=>nativeMechanicalInput(f.db,f.guild,g,a.record_key));assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_operation',includeGM:true}).length,0);}],
 ['F2-GM','25','untrusted AI GM role cannot promote ordinary human attack approval to autonomous opportunity',f=>{const x=incoming(f),o=x.row.data.offer;
   assert.throws(()=>projectNativeGmProposal(f.db,f.guild,{version:9,kind:'mechanical_input',initiator_class:'ai_gm',intent_kind:'adversary_attack',actor_ref:{kind:'adversary',id:'guard'},
     target_refs:[{kind:'character',id:x.pc.id}],stat_block_ref:o.snapshot.template,feature_ref:'standard_attack',source_task_id:`gm-task:${hash([x.row.source_event,x.row.record_key])}`,request_id:x.row.record_key},{library:x.library}),/PvP Fear source/);
   assert.equal(f.db.getCityRecord(f.guild,'pc_incoming_attack',x.row.record_key).status,'ready');}],
 ['F2-GM','26','unimplemented environment feature is held not generic d20 or fabricated player source',f=>{const x=setup(f),fear=f.db.getCampaign(f.guild).fear;
   assert.throws(()=>projectNativeGmProposal(f.db,f.guild,{version:9,kind:'mechanical_input',initiator_class:'environment',intent_kind:'apply_world_feature',actor_ref:{kind:'environment',id:'terminal'},target_refs:[],stat_block_ref:'unknown',feature_ref:'made-up',source_task_id:'unknown',request_id:'unknown'}),/not_implemented/);
   assert.equal(f.db.getCampaign(f.guild).fear,fear);assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);}],
 ['F2-GM','18','GM d20 differs from Duality and has no automatic natural-one failure',()=>{assert.equal(gmD20Roll({modifier:20,difficulty:10},()=>1).success,true);const r=gmD20Roll({modifier:2,difficulty:12},()=>11);assert.equal(r.total,13);assert.equal(r.success,true);assert(!('hope' in r));assert(!('fear' in r));}],
 ['F2-GM','19','native 3d6+2 natural-20 damage adds eighteen not another flat modifier',()=>{let n=0;const r=gmD20Roll({kind:'attack',difficulty:99},()=>20),damage=gmAttackDamage(r,'3d6+2',()=>[1,2,3][n++]);assert.equal(damage.total,26);assert.equal(damage.critical_bonus,18);assert.equal(damage.modifier,2);assert.equal(n,3);assert.equal(gmAttackDamage(gmD20Roll({kind:'attack',difficulty:10},()=>19),'3d6+2',()=>1).total,5);}],
 ['F2-GM','20','adversary advantage and disadvantage select among two d20 not d6',()=>{for(const [advantage,disadvantage,face] of [[true,false,20],[false,true,4]]){const sides=[];let n=0;const r=gmD20Roll({advantage,disadvantage,kind:'attack',difficulty:15},s=>{sides.push(s);return [4,20][n++];});assert.deepEqual(sides,[20,20]);assert.equal(r.selected,face);}}],
 ['F2-GM','21','GM reaction natural twenty succeeds but cannot request attack critical damage',()=>{const r=gmD20Roll({kind:'reaction',difficulty:100},()=>20);assert.equal(r.success,true);assert.equal(r.critical,'reaction_success');assert.throws(()=>gmAttackDamage(r,'3d6+2',()=>assert.fail('no reaction damage')));}],
 ['F2-GM','22','miss never samples damage and native incoming replay never rerolls',f=>{const x=incoming(f),before=structuredClone(f.db.getCharacter(x.pc.id).data.resources),fear=f.db.getCampaign(f.guild).fear;
   let calls=0;const result=rollIncomingAttack(f.db,f.guild,'gm',x.row.record_key,{gm:true,library:x.library,rng:s=>{calls++;assert.equal(s,20);return 1;}});assert.equal(result.data.hit,false);assert.equal(result.data.damage,null);assert.equal(calls,1);
   f.restart();const replay=rollIncomingAttack(f.db,f.guild,'gm',x.row.record_key,{gm:true,library:x.library,rng:()=>assert.fail('no replay RNG')});assert.equal(replay.record_key,result.record_key);assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);assert.equal(f.db.getCampaign(f.guild).fear,fear);}],
 ['F2-GM','23','typed native output can name an adversary rather than pretend it is a PC',f=>{const x=incoming(f);let n=0;const receipt=rollIncomingAttack(f.db,f.guild,'gm',x.row.record_key,{gm:true,library:x.library,rng:()=>[20,8][n++]});
   const g=mintNarrativeAudience(buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef));
   const output=nativeMechanicalOutput(f.db,f.guild,g,{version:9,kind:'mechanical_output',receipt_kind:'npc_attack_roll_receipt',ref:receipt.record_key});assert.deepEqual(output.subject,{kind:'adversary',id:'guard'});
   assert.equal(output.native_detail.selected_d20,20);assert.equal(output.native_detail.damage.total,19);assert(output.text.includes('awaiting_armor'));assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);}],
 ['F2-GM','24','stale native attack source denies before GM RNG',f=>{const x=incoming(f);f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.row.data.offer.input.source);assert.throws(()=>rollIncomingAttack(f.db,f.guild,'gm',x.row.record_key,{gm:true,library:x.library,rng:()=>assert.fail('no unauthorized RNG')}));}],

];
cases.push(
 ['UA7','06','forged trigger holds only that feature and preserves an independent native PC disposition',async f=>{
   const x=await featureScenario(f),[held,safe]=adjudicateSceneBoard(f.db,f.guild,x.origin,x.board,[{...x.p,trigger_ref:'model:forged'},decision('player:0','no_roll')],{library:x.library});
   assert.equal(held.status,'needs_rules_review');assert.equal(safe.status,'resolved_no_roll');
   executeUnifiedGmActions(f.db,f.guild,[held,safe],{library:x.library,rng:()=>assert.fail('no forged RNG')});
   assert.equal(f.db.listCombatants(x.row.data.offer.snapshot.encounter)[0].stress_current,2);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_feature_use_receipt',includeGM:true}).length,0);
 }],
 ['UA7','07','source revocation before reaction cannot spend clear Stress or apply an NPC effect',async f=>{
   const x=await featureScenario(f),[r]=adjudicateSceneBoard(f.db,f.guild,x.origin,x.board,[x.p],{library:x.library});
   f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.row.source_event);
   const [held]=executeUnifiedGmActions(f.db,f.guild,[r],{library:x.library,rng:()=>assert.fail('no stale RNG')});assert.equal(held.status,'needs_review');
   assert.equal(f.db.listCombatants(x.row.data.offer.snapshot.encounter)[0].stress_current,2);assert.equal(f.db.getCampaign(f.guild).fear,0);
 }],
 ['UA7','08','proxy takeover and depth tampering invalidate exact native windows',async f=>{
   const {inspectFeatureWindow}=await import('../src/native-feature-windows.js'),x=await featureScenario(f);
   f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:'guard',userId:f.pcs[1].owner_user_id,status:'active'});
   assert.throws(()=>inspectFeatureWindow(f.db,f.guild,x.w.record_key));assert.throws(()=>adjudicateSceneBoard(f.db,f.guild,x.origin,x.board,[x.p],{library:x.library}));
   f.db.saveCityRecord(f.guild,{...x.w,key:x.w.record_key,data:{...x.w.data,depth:4}});assert.throws(()=>inspectFeatureWindow(f.db,f.guild,x.w.record_key));
   assert.equal(f.db.listCombatants(x.row.data.offer.snapshot.encounter)[0].stress_current,2);
 }],
 ['UA7','09','private reaction window stays out of party and foreign-owner prompt boards',async f=>{
   const {featureWindowChoices}=await import('../src/native-feature-windows.js'),x=await featureScenario(f);
   assert.equal(featureWindowChoices(f.db,f.guild,x.scope).length,1);
   assert.deepEqual(featureWindowChoices(f.db,f.guild,{mode:'party',actorUserId:x.pc.owner_user_id,actorCharacterId:x.pc.id}),[]);
   assert.deepEqual(featureWindowChoices(f.db,f.guild,{mode:'private',actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id}),[]);
   assert.deepEqual(featureWindowChoices(f.db,f.guild,{mode:'private',actorUserId:f.pcs[1].owner_user_id,actorCharacterId:x.pc.id}),[]);
   const prompt=arbitrationPromptBoard(f.db,f.guild,x.origin);assert.equal(prompt.feature_windows.length,1);assert(!JSON.stringify(prompt.feature_windows).includes('hp_marks'));
 }],
 ['UA7','05','source-triggered native reaction resolves without spotlight and cannot be charged or replayed twice',async f=>{
   const {pendingFeatureWindows,inspectFeatureUse}=await import('../src/native-feature-windows.js');
   const x=incoming(f,{template:'Pale Court Knight',stress:2,text:'I inspect the counter.'});
   rollIncomingAttack(f.db,f.guild,'gm',x.row.record_key,{gm:true,library:x.library,rng:s=>s});resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,x.row.record_key,{armor:false,library:x.library});
   const w=pendingFeatureWindows(f.db,f.guild)[0];assert(w);f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true}});
   const rows=persistPlayerIntents(f.db,f.guild,[{...candidate(x.text).player_intents[0],type:'search',operation:'inspect'}],x.scope,{messageId:x.messageId}),
     origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),board=buildSceneIntentBoard(f.db,f.guild,origin,rows,[{actor_key:'guard',operation:'reaction',target_refs:[x.pc.id],objective_ref:'',source_refs:[],dependencies:[]}]);
   assert.throws(()=>nativeGmOpportunity(f.db,f.guild,board));
   const [r]=adjudicateSceneBoard(f.db,f.guild,origin,board,[{...decision(board.data.entries[1].intent_ref,'native_feature_resolution'),proposal_version:2,trigger_ref:w.record_key,
     rule_basis_refs:['srd:adversary-attacks'],feature_ref:w.data.feature,stakes_kind:'native_feature'}],{library:x.library});assert.equal(r.status,'gm_action_ready',r.data.reason);
   const before=structuredClone(f.db.getCharacter(x.pc.id).data.resources),[effect]=executeUnifiedGmActions(f.db,f.guild,[r],{library:x.library,rng:()=>assert.fail('no reaction RNG')});
   assert.equal(effect.kind,'gm_feature_use_receipt');assert.equal(effect.data.before.stress_current,2);assert.equal(effect.data.after.stress_current,1);
   assert.equal(effect.data.cost.fear,0);assert.equal(effect.data.cost.npc_stress,0);assert.equal(f.db.getCampaign(f.guild).fear,0);
   assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_action_cost_receipt',includeGM:true}).length,0);
   f.restart();assert.equal(inspectFeatureUse(f.db,f.guild,effect.record_key).record_key,effect.record_key);
   assert.equal(executeUnifiedGmActions(f.db,f.guild,[r],{library:x.library,rng:()=>assert.fail('no replay RNG')})[0].record_key,effect.record_key);
   assert.equal(f.db.listCombatants(x.row.data.offer.snapshot.encounter)[0].stress_current,1);assert.equal(pendingFeatureWindows(f.db,f.guild).length,0);
 }],
 ['UA7','02','actual damage creates an exact reaction window without minting spotlight or replaying costs',async f=>{
   const {pendingFeatureWindows,inspectFeatureWindow}=await import('../src/native-feature-windows.js');
   const x=incoming(f,{template:'Pale Court Knight'});let calls=0;
   rollIncomingAttack(f.db,f.guild,'gm',x.row.record_key,{gm:true,library:x.library,rng:s=>{calls++;return s;}});
   const effect=resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,x.row.record_key,{armor:false,library:x.library});
   const rows=pendingFeatureWindows(f.db,f.guild);assert.equal(rows.length,1);
   const w=inspectFeatureWindow(f.db,f.guild,rows[0].record_key);assert.equal(w.data.phase,'after_damage');assert.equal(w.data.actor,'guard');
   assert.equal(w.data.receipt,effect.record_key);assert.equal(w.data.feature,'adversary:pale-court-knight:blood-rush');
   assert.equal(w.data.timing,'reaction');assert.equal(w.status,'pending');assert.equal(w.visibility,'gm');
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_action_cost_receipt',includeGM:true}).length,0);
   f.restart();assert.equal(pendingFeatureWindows(f.db,f.guild)[0].record_key,w.record_key);
   resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,x.row.record_key,{armor:false,library:x.library});assert.equal(pendingFeatureWindows(f.db,f.guild).length,1);
   assert.equal(calls,3);assert.equal(f.db.getCampaign(f.guild).fear,0);
 }],
 ['UA7','03','window provenance rejects fabricated receipts retraction proxy and stale scene without effects',async f=>{
   const {captureIncomingFeatureWindows,inspectFeatureWindow}=await import('../src/native-feature-windows.js');
   assert.throws(()=>captureIncomingFeatureWindows(f.db,f.guild,'invented'));
   const x=incoming(f,{template:'Pale Court Knight'});rollIncomingAttack(f.db,f.guild,'gm',x.row.record_key,{gm:true,library:x.library,rng:s=>s});
   resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,x.row.record_key,{armor:false,library:x.library});
   const w=f.db.listCityRecords(f.guild,{kind:'native_feature_window',includeGM:true})[0];assert(w);
   f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.row.source_event);
   const before=structuredClone(f.db.getCharacter(x.pc.id).data.resources);assert.throws(()=>inspectFeatureWindow(f.db,f.guild,w.record_key));
   assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);assert.equal(f.db.getCampaign(f.guild).fear,0);
 }],
 ['UA7','04','cost plans are additive bounded and timing-specific without charging unsupported features',async()=>{
   const {featureCostPlan,FEATURE_PHASES,MAX_FEATURE_DEPTH}=await import('../src/native-feature-windows.js');
   assert(FEATURE_PHASES.includes('before_damage_applied'));assert(FEATURE_PHASES.includes('on_pc_action'));assert.equal(MAX_FEATURE_DEPTH,3);
   const descriptor={costs:[{resource:'fear',amount:1},{resource:'npc_stress',amount:2}]};
   assert.deepEqual(featureCostPlan(descriptor,{timing:'spotlight_action',additionalSpotlight:true,experience:true,fear:3,stress:1,stressMax:3}),
     {fear:3,npc_stress:2,expenses:{additional_spotlight:1,feature:1,experience:1}});
   assert.equal(featureCostPlan(descriptor,{timing:'reaction',additionalSpotlight:false,experience:false,fear:1,stress:0,stressMax:2}).fear,1);
   assert.throws(()=>featureCostPlan(descriptor,{timing:'reaction',additionalSpotlight:true,experience:false,fear:3,stress:0,stressMax:2}));
   assert.throws(()=>featureCostPlan(descriptor,{timing:'spotlight_action',additionalSpotlight:true,experience:true,fear:2,stress:0,stressMax:2}));
   assert.throws(()=>featureCostPlan(descriptor,{timing:'reaction',additionalSpotlight:false,experience:false,fear:1,stress:1,stressMax:2}));
 }],
 ['UA7','01','native AI attack injury and last-HP proof remain valid through owner Armor and restart',f=>{
   const x=incoming(f);f.db.updateCharacterData(x.pc.id,d=>{d.resources.hp.current=3;});
   f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true}});
   const rows=persistPlayerIntents(f.db,f.guild,candidate(x.text).player_intents,x.scope,{messageId:x.messageId}),origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),
     proposal={actor_key:'guard',operation:'attack',target_refs:[x.pc.id],objective_ref:'',source_refs:[],dependencies:[]},board=buildSceneIntentBoard(f.db,f.guild,origin,rows,[proposal]),
     [r]=adjudicateSceneBoard(f.db,f.guild,origin,board,[{...decision(board.data.entries[1].intent_ref,'gm_attack_roll'),rule_basis_refs:['srd:adversary-attacks'],feature_ref:'standard_attack',stakes:'Native standard attack.'}],{library:x.library}),
     offer=prepareArbitratedIncomingAttack(f.db,f.guild,r.record_key,{library:x.library});
   reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,offer.record_key,{library:x.library});confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,offer.record_key);
   let n=0;rollArbitratedIncomingAttack(f.db,f.guild,offer.record_key,{library:x.library,rng:()=>[20,8][n++]});assert.equal(n,2);
   const injury=resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,offer.record_key,{armor:false,library:x.library});
   assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,6);
   assert.equal(f.db.getCityRecord(f.guild,'pc_death_move_request',`${offer.record_key}:death`).status,'awaiting_owner');
   assert.equal(validateIncomingDamageApplication(f.db,f.guild,injury.record_key).record_key,injury.record_key);
   f.restart();assert.equal(resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,offer.record_key,{armor:false,library:x.library}).record_key,injury.record_key);
   assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,6);assert.equal(n,2);
   f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,r.source_event);
   assert.throws(()=>validateIncomingDamageApplication(f.db,f.guild,injury.record_key));
   assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,6);assert.equal(n,2);
 }],
 ['UA16','01','optional import owner is a native Discord User option',()=>{
   const root=buildCommands().find(c=>c.name==='vc-character'),option=root.options.find(o=>o.name==='import').options.find(o=>o.name==='player');
   assert.equal(option?.type,6);assert.notEqual(option.required,true);
 }],
 ['UA16','02','admin import assigns selected member and narrative atomically without session presence',async f=>{
   const selected={id:'new-player',username:'New Player',bot:false},before=f.db.roster(f.session.id),i=await importCommand(f,{selected,admin:true,markdown:'# Player-only story',sheet:{name:'Jaxon',owner_user_id:'admin',admin:true}});
   const c=f.db.listCharacters(f.guild,selected.id,{includeClosed:true})[0];assert(c);assert.equal(c.owner_user_id,selected.id);assert.equal(c.name,'Jaxon');
   assert.equal(f.db.getPlayer(f.guild,selected.id).display_name,'Selected Player');assert.equal(f.db.getCharacterNarrative(f.guild,c.id,'player').character_id,c.id);
   assert.equal(f.db.getCharacterNarrative(f.guild,c.id,'gm_private'),null);assert.equal(f.db.getCharacter(f.pcs[0].id).owner_user_id,f.pcs[0].owner_user_id);
   assert.deepEqual(f.db.roster(f.session.id),before);assert.equal(f.db.activeAssignment(f.session.id,selected.id),null);assert.equal(scenePresence(f.db,f.guild,'character',c.id),null);
   const audit=f.db.db.prepare("SELECT * FROM audit_log WHERE action='character_import'").get(),data=JSON.parse(audit.payload_json);
   assert.equal(audit.actor_id,'admin');assert.equal(data.owner_user_id,selected.id);assert.equal(data.character_id,c.id);
   assert(i.deliveries[0].content.includes(`Owner: <@${selected.id}>`));assert.equal(i.deliveries[0].ephemeral,true);assert.deepEqual(i.deliveries[0].allowedMentions,{parse:[]});
   f.restart();assert.equal(f.db.getCharacter(c.id).owner_user_id,selected.id);assert.equal(f.db.listCharacters(f.guild,'admin',{includeClosed:true}).length,0);
 }],
 ['UA16','03','player and admin self-import remain default with no JSON owner spoof',async f=>{
   for(const admin of [false,true]){await importCommand(f,{admin,id:`self-${admin}`,sheet:{name:'Self',owner_user_id:'other'}});
     assert.equal(f.db.listCharacters(f.guild,admin?'admin':f.pcs[0].owner_user_id,{includeClosed:true}).filter(c=>c.name==='Self').length,1);}
 }],
 ['UA16','04','foreign unresolved bot and nonadmin owner selections deny without importing or registering target',async f=>{
   const selected={id:'unentitled',username:'Unknown',bot:false},before=f.db.listCharacters(f.guild,null,{includeClosed:true}).length;
   const failures=[{admin:false},{admin:true,selected:{...selected,bot:true}},{admin:true,fetchMember:async()=>{throw new Error('not a member');}},
     {admin:true,member:{id:'wrong',user:{id:'wrong'},guild:{id:f.guild}}},{admin:true,member:{id:selected.id,user:selected,guild:{id:'other-guild'}}},
     {admin:true,member:{id:selected.id,user:{...selected,bot:true},guild:{id:f.guild}}}];
   for(const [n,options] of failures.entries()){const i=await importCommand(f,{selected,id:`denied-${n}`,...options});
     assert.match(i.deliveries.at(-1).content,/^⚠️.*(?:GM|member|server|bot|identity)/i);}
   assert.equal(f.db.getPlayer(f.guild,selected.id),undefined);assert.equal(f.db.listCharacters(f.guild,null,{includeClosed:true}).length,before);
 }],
 ['UA16','05','narrative persistence or audit failure rolls back player character and hooks',async f=>{
   for(const route of ['upsertCharacterNarrative','audit']){const original=f.db[route];f.db[route]=()=>{throw new Error('synthetic atomic failure');};
     try{const i=await importCommand(f,{admin:true,selected:{id:`new-${route}`,bot:false},id:`rollback-${route}`,markdown:'# valid',sheet:{name:'Must Roll Back'}});
       assert.match(i.deliveries.at(-1).content,/^⚠️.*atomic failure/);}
     finally{f.db[route]=original;}
     assert.equal(f.db.getPlayer(f.guild,`new-${route}`),undefined);assert.equal(f.db.listCharacters(f.guild,`new-${route}`,{includeClosed:true}).length,0);}
 }],
 ['UA16','06','restart replay and failed response do not duplicate import while distinct imports never transfer ownership',async f=>{
   const selected={id:'new-player',bot:false};await assert.rejects(()=>importCommand(f,{admin:true,selected,id:'delivery-failed',sendError:true}),/delivery failure/);
   f.restart();const i=await importCommand(f,{admin:true,selected,id:'delivery-failed'});assert(i.deliveries[0].content.includes('Already applied'));
   assert.equal(f.db.listCharacters(f.guild,selected.id,{includeClosed:true}).length,1);
   await importCommand(f,{admin:true,selected,id:'distinct-import'});assert.equal(f.db.listCharacters(f.guild,selected.id,{includeClosed:true}).length,2);
   assert.equal(f.db.getCharacter(f.pcs[0].id).owner_user_id,f.pcs[0].owner_user_id);
 }],
 ['UA16','07','malformed sheet or narrative does not leave a target owner or partial import',async f=>{
   for(const [n,options] of [{sheet:{}},{markdown:'   '},{markdown:'x'.repeat(131073)}].entries()){
     const i=await importCommand(f,{admin:true,selected:{id:`invalid-${n}`,bot:false},id:`malformed-${n}`,...options});
     assert.match(i.deliveries.at(-1).content,/^⚠️/);assert.equal(f.db.getPlayer(f.guild,`invalid-${n}`),undefined);
     assert.equal(f.db.listCharacters(f.guild,`invalid-${n}`,{includeClosed:true}).length,0);
   }
 }],
 ['UA16','08','actual owner sheet and list see new import while another player cannot select it',async f=>{
   const selected={id:'new-player',bot:false};await importCommand(f,{admin:true,selected,sheet:{name:'Unique Import',class:'Ranger'}});
   for(const [user,sub] of [[selected.id,'list'],[selected.id,'sheet'],[f.pcs[1].owner_user_id,'select']]){
     const i=fakeInteraction({gm:false,sub});Object.assign(i,{id:`visibility-${user}-${sub}`,guildId:f.guild,user:{id:user,username:user},commandName:'vc-character',isChatInputCommand:()=>true});
     i.options.getString=key=>key==='character'?'Unique Import':null;await handleCommand(i,{db:f.db,gm:{}});
     if(user===selected.id)assert(i.deliveries[0].content.includes('Unique Import'));else assert.match(i.deliveries[0].content,/^⚠️.*not found/i);
   }
   assert.equal(f.db.activeAssignment(f.session.id,selected.id),null);
 }],
 ['UA6','01','feature catalog pins every source occurrence without granting execution',async()=>{
   const {compileNativeFeatures,featureDisposition}=await import('../src/native-feature-catalog.js');
   const rows=compileNativeFeatures();assert.equal(rows.length,152);assert.equal(new Set(rows.map(r=>r.feature_key)).size,152);
   assert.equal(rows.filter(r=>r.actor_kind==='adversary').length,104);assert.equal(rows.filter(r=>r.actor_kind==='environment').length,48);
   assert.equal(new Set(rows.filter(r=>r.actor_kind==='adversary').map(r=>r.actor_name)).size,41);
   assert.equal(new Set(rows.filter(r=>r.actor_kind==='environment').map(r=>r.actor_name)).size,16);
   for(const r of rows){assert.match(r.source_hash,/^[a-f0-9]{64}$/);assert.match(r.template_hash,/^[a-f0-9]{64}$/);
     assert(Object.isFrozen(r));assert.equal(featureDisposition(r.feature_key).status,r.native_handler?'supported':'needs_rules_review');}
   assert.deepEqual(rows.filter(r=>r.native_handler).map(r=>r.feature_key),['adversary:pale-court-knight:blood-rush']);
 }],
 ['UA6','02','typed representative descriptors distinguish action reaction passive and defense',async()=>{
   const {compileNativeFeatures}=await import('../src/native-feature-catalog.js'),rows=compileNativeFeatures(),get=(actor,name)=>rows.find(r=>r.actor_name===actor&&r.name===name);
   assert.equal(get('Static Wraith','Feedback').trigger_kind,'on_pc_action');assert.equal(get('Static Wraith','Feedback').roll_protocol,'pc_reaction_each');
   assert.deepEqual(get('Static Wraith','Feedback').costs,[{resource:'npc_stress',amount:1}]);
   assert.equal(get('Choir Relay','Route Around').trigger_kind,'before_damage_applied');
   assert.equal(get('Pale Court Thrall','Pack Pressure').roll_protocol,'none');
   assert.equal(get('Traffic Saint','All Lanes Stop').target_policy,'all_in_range');
   assert.equal(get('Occult Crime Scene','Sirens Outside').roll_protocol,'none');
   assert.equal(get('Pale Court Townhouse','Ownership Bites').trigger_kind,'on_scene_event');
   assert.equal(rows.filter(r=>r.status==='needs_authoring').length,1);
 }],
 ['UA6','03','changed feature text or stats and forged handler status fail catalog validation',async()=>{
   const {compileNativeFeatures,featureDisposition}=await import('../src/native-feature-catalog.js');
   const adversaries=JSON.parse(fs.readFileSync('../content/GM_PRIVATE/ADVERSARIES/adversaries.json','utf8'));
   const environments=JSON.parse(fs.readFileSync('../content/GM_PRIVATE/ENVIRONMENTS/environments.json','utf8'));
   const changed=structuredClone(adversaries);changed[0].features[0]+=' Model grants +99.';
   assert.throws(()=>compileNativeFeatures({adversaries:changed,environments}),/source/);
   const stats=structuredClone(adversaries);stats[0].attack='+99';assert.throws(()=>compileNativeFeatures({adversaries:stats,environments}),/source/);
   assert.equal(featureDisposition('model:invented').status,'needs_rules_review');
   assert.equal(featureDisposition({feature_key:'adversary:static-wraith:feedback',status:'supported',native_handler:'eval'}).status,'needs_rules_review');
 }],
 ['UA6','04','registered unmapped and unregistered feature proposals remain private holds with no costs or dice',async f=>{
   const {compileNativeFeatures}=await import('../src/native-feature-catalog.js');
   const feature=compileNativeFeatures().find(r=>r.actor_name==='Static Wraith'&&r.name==='Feedback');
   const x=boardFixture(f),board=buildSceneIntentBoard(f.db,f.guild,x.origin,x.rows,[{...x.proposal,operation:'feature'},{...x.proposal,operation:'reaction'}]);
   const before=structuredClone(f.db.getCharacter(x.pc.id).data.resources),fear=f.db.getCampaign(f.guild).fear;
   const rows=adjudicateSceneBoard(f.db,f.guild,x.origin,board,board.data.entries.filter(e=>e.actor.type==='npc').map((e,i)=>
     ({...decision(e.intent_ref,'native_feature_resolution'),feature_ref:i?'model:invented':feature.feature_key,stakes_kind:'native_feature'})));
   assert(rows.every(r=>r.status==='needs_rules_review'&&r.visibility==='gm'&&!r.data.native));
   assert(rows[0].data.reason.includes('native handler'));assert(rows[1].data.reason.includes('Unregistered'));
   executeUnifiedGmActions(f.db,f.guild,rows,{rng:()=>assert.fail('no unsupported RNG')});
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_action_cost_receipt',includeGM:true}).length,0);
   assert.equal(f.db.getCampaign(f.guild).fear,fear);assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);
 }]
);
for(const [phase,id,name,body] of cases)test(`${phase} AF${id} ${name}`,()=>nativeFixture(body));
