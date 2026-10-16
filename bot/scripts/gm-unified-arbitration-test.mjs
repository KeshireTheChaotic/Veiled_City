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
import {contributeRoll,adjudicateRollSource} from '../src/roll-collaboration.js';
import {rollRevision,prepareRollRequest} from '../src/roll-requests.js';
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
import {prepareIncomingAttack,prepareArbitratedIncomingAttack,rollArbitratedIncomingAttack,reviewIncomingAttack,confirmIncomingDefense,withholdIncomingDefense,rollIncomingAttack,incomingAttackEvidence,incomingRollProjection,resolveIncomingDamage,validateIncomingDamageApplication,inspectVolley} from '../src/pc-incoming.js';
import {EncounterLibrary} from '../src/encounter.js';
import {buildCombatants} from '../src/combat.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene,recordScenePresence,scenePresence} from '../src/scene-continuity.js';
import {projectNativeGmProposal} from '../src/gm-mechanical-v9.js';
function npc(f,key='attendant',location='terminal'){f.db.upsertNpcProfile(f.guild,{npcKey:key,displayName:'Inez',role:'attendant',publicIdentity:'A local attendant.'});f.db.setSimulationEntity(f.guild,'npc',key,{name:'Inez',location_key:location,visibility:'party'});}
function incoming(f,{privateScene=true,text,template='Aster Vale Contractor',stress=0,allies=0,hpMarked=null,npcHp=null,otherTemplates=[]}={}){
  const x=setup(f,{privateScene,text}),library=new EncounterLibrary('../content'),scene=currentScene(f.db,f.guild);npc(f,'guard');
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_encounters:true}});
  f.db.updateCharacterData(x.pc.id,d=>{d.evasion=12;d.thresholds={major:7,severe:14};if(hpMarked!==null)d.resources.hp.current=hpMarked;});
  const source=indexWorldEvent(f.db,f.guild,{key:'af-guard-source',kind:'observation',source_id:'gm',title:'Native guard encounter',session_id:f.session.id,scene:scene.key,location_key:'terminal',visibility:'party'},'gm');
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:'guard',source_event:source.event_key,location_key:'terminal',zone:'interior',range:'Close',visibility:'party',accepted_by:'gm'},'gm');
  const encounter=f.db.createEncounter(f.guild,f.session.id,{status:'active',tier:1,pc_count:4,base_bp:14,budget_bp:14,composition:[{name:template,quantity:1+allies},...otherTemplates.map(name=>({name,quantity:1}))]}),combatants=f.db.initializeCombatants(encounter.id,buildCombatants(encounter,library)),c=combatants.find(c=>c.base_name===template);
  if(stress)f.db.updateCombatant(c.id,{stress_current:stress});
  if(npcHp!==null)f.db.updateCombatant(c.id,{hp_current:npcHp});
  const bindings=[{actor:'guard',id:c.id}];
  for(const [i,ally] of combatants.filter(a=>a.id!==c.id).entries()){const actor=`ally-${i}`;npc(f,actor);
    recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:actor,source_event:source.event_key,location_key:'terminal',zone:'interior',range:'Close',visibility:'party'},'gm');
    bindings.push({actor,id:ally.id});}
  f.db.saveCityRecord(f.guild,{kind:'encounter_binding',key:encounter.id,source_event:source.event_key,data:{combatants:bindings}});
  f.db.upsertRulesRuling(f.guild,{key:'af-standard',ruling:'Current standard attack; no unreviewed feature or extra spotlight.',createdBy:'gm'});
  const input={npc:'guard',combatant:c.id,character:x.pc.id,source:source.event_key,ruling:'af-standard',defenses:{resistance:'none',armor_reduction:1,armor_allowed:true,source:'base'}};
  const row=prepareIncomingAttack(f.db,f.guild,'gm',input,{gm:true,interactionId:'af-attack',library});reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,row.record_key,{library});confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,row.record_key);
  return {...x,library,row};
}
async function featureScenario(f,{looking=false,extraNpc=false}={}){
  const {pendingFeatureWindows}=await import('../src/native-feature-windows.js'),x=incoming(f,{template:'Pale Court Knight',stress:2,text:looking?'Describe the scene.':'I inspect the counter.'});
  rollIncomingAttack(f.db,f.guild,'gm',x.row.record_key,{gm:true,library:x.library,rng:s=>s});resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,x.row.record_key,{armor:false,library:x.library});
  const w=pendingFeatureWindows(f.db,f.guild)[0];f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true}});
  if(extraNpc){npc(f);recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:'attendant',source_event:x.row.data.offer.input.source,location_key:'terminal',zone:'interior',range:'Close',visibility:'party'},'gm');}
  const rows=persistPlayerIntents(f.db,f.guild,[{...candidate(x.text).player_intents[0],type:looking?'other':'search',operation:looking?'describe_scene':'inspect'}],x.scope,{messageId:x.messageId}),
    origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),board=buildSceneIntentBoard(f.db,f.guild,origin,rows,[{actor_key:'guard',operation:'reaction',target_refs:[x.pc.id],objective_ref:'',source_refs:[],dependencies:[]},
      ...(extraNpc?[{actor_key:'attendant',operation:'prepare',target_refs:[x.pc.id],objective_ref:'',source_refs:[],dependencies:[]}]:[])]);
  const p={...decision(board.data.entries[1].intent_ref,'native_feature_resolution'),proposal_version:2,trigger_ref:w.record_key,
    rule_basis_refs:['srd:adversary-attacks'],feature_ref:w.data.feature,stakes_kind:'native_feature'};
  return {...x,w,rows,origin,board,p};
}
async function feedbackScenario(f,{privateScene=false,proxy=false,stress=0,pcStress=2,category='electronic_device'}={}){
  const x=incoming(f,{privateScene,template:'Static Wraith',stress,text:'I use my phone.'});
  f.db.updateCharacterData(x.pc.id,d=>{d.inventory.push({id:'phone',name:'Phone',category,equipped:true});d.resources.stress.current=pcStress;});
  if(proxy)f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:'guard',userId:f.pcs[1].owner_user_id,status:'active'});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,roll_collaboration:true}});
  const r=candidate(x.text);r.player_intents[0]={...r.player_intents[0],type:'interact',operation:'use_device',target_name:'Phone',target_key:'phone',resolution:'auto'};
  r.unified_arbitration={version:1,npc_intents:[],decisions:[decision('player:0','no_roll')]};
  const out=await run(f,x,{version:9,acts:[],fiction_delta:[]},r),invites=f.db.listCityRecords(f.guild,{kind:'gm_arbitration_decision',includeGM:true}).filter(d=>d.status==='pending_pc_reaction');
  return {...x,out,invites};
}
function strikeAdversary(f,x,serial,{damage=100,critical=false,targetId=null,beforeRoll=()=>{},rollRng=null}={}){
  const targets=f.db.listCombatants(f.db.getCurrentEncounter(f.session.id).id),target=targetId?targets.find(c=>c.id===targetId):targets[0];
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,roll_requests:true,roll_collaboration:true}});
  f.db.updateCharacterData(x.pc.id,d=>{if(!d.inventory.some(i=>i.name==='Fixture blade'))d.inventory.push({name:'Fixture blade',equipped:true});});
  const accepted=f.accepted(0,'I strike the guard.',null,{type:'interact',operation:'attack',target:{kind:'npc',key:'guard',phrase:'guard',grounding:'known'}});
  f.db.upsertRulesRuling(f.guild,{key:'fixture-blade',ruling:'Exact owned equipped fixture blade attack damage 1d100 physical.',createdBy:'gm'});
  const proof=adjudicateRollSource(f.db,f.guild,{key:`blade-${serial}`,character_id:x.pc.id,kind:'attack',ruling_key:'fixture-blade',
    data:{trait:'Finesse',active:true,weapon:'Fixture blade',damage:'1d100',damage_type:'physical',target_id:target.id}},'gm'),
    request=prepareRollRequest(f.db,f.guild,{source_event:accepted.source_event,accepted_intent:accepted.record_key,character_id:x.pc.id,trait:'Finesse',kind:'attack',
      attack_source:proof.event_key,modifier_keys:[],difficulty_source:'',adjudication:'Exact actual native fixture attack.'},'gm',{scope:x.scope});
  beforeRoll({request});let faces=0;const rolled=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',key:`strike-${serial}`,request:request.record_key,expected_revision:rollRevision(request)},
    {rng:rollRng||(()=>[12,critical?12:11][faces++])});
  const input={op:'damage',key:`damage-${serial}`,request:request.record_key,expected_revision:rollRevision(rolled)};
  const resolved=contributeRoll(f.db,f.guild,x.pc.owner_user_id,input,{rng:()=>damage});return {target,request:resolved,input};
}
function meshScenario(f,{template='Static Wraith',relays=1,establish=true}={}){
  const x=incoming(f,{privateScene:false,template,otherTemplates:Array.from({length:relays},()=> 'Choir Relay')});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true}});
  const encounter=f.db.getCurrentEncounter(f.session.id),binding=f.db.getCityRecord(f.guild,'encounter_binding',encounter.id),
    actors=binding.data.combatants,origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),target=actors.find(a=>a.actor==='guard');
  if(establish){
    const proposals=actors.filter(a=>a.actor!=='guard').map(a=>({actor_key:a.actor,operation:'set_allies',target_refs:['guard'],objective_ref:'',source_refs:[],dependencies:[]})),
      board=buildSceneIntentBoard(f.db,f.guild,origin,[],proposals),decisions=adjudicateSceneBoard(f.db,f.guild,origin,board,board.data.entries.map(e=>({...decision(e.intent_ref,'npc_no_roll'),rule_basis_refs:['srd:gm-moves']})),{library:x.library});
    assert(decisions.every(r=>r.status==='gm_action_ready'),decisions.map(r=>r.data.reason).join(';'));
    const effects=executeUnifiedGmActions(f.db,f.guild,decisions,{library:x.library,rng:()=>assert.fail('alliance is not a die roll')});
    assert(effects.every(r=>r.kind==='native_npc_alliance_receipt'));x.allianceDecisions=decisions;x.allianceEffects=effects;
  }
  return {...x,encounter,binding,target,actors};
}
function packFearAttack(f,{looking=false,hopeFailure=false,hp=4,miss=false,armor=false,pcStress=2,signalTouched=false,template='Wraith Pack',beforeDice=()=>{},beforeDamage=()=>{}}={}){
  const x=incoming(f,{privateScene:false,template,text:looking?'Describe the scene.':'I inspect the counter.'});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,roll_collaboration:true}});
  f.db.updateCombatant(f.db.getCurrentEncounter(f.session.id)&&x.row.data.offer.input.combatant,{hp_current:hp});
  f.db.updateCharacterData(x.pc.id,d=>{d.resources.stress.current=pcStress;if(signalTouched)d.domain_cards=[{name:'Signal-Touched',domain:'Signal',active:true}];});
  const rows=persistPlayerIntents(f.db,f.guild,[{...candidate(x.text).player_intents[0],type:looking?'other':'search',operation:looking?'describe_scene':'inspect'}],x.scope,{messageId:x.messageId});
  let request=null;
  if(!looking){
    const a=adjudicateAcceptedIntent(f.db,f.guild,{acceptedIntent:rows[0].record_key,mode:'roll_required',trait:'Knowledge',kind:'action',difficulty:14,
      risk:'The inspection may fail.',stakes:'Attempt only; native source.',rawRefs:['srd:action-rolls'],explanation:'An actual owner-controlled action.'},'native:unified-gm',{scope:x.scope});
    request=f.db.getCityRecord(f.guild,'roll_request',a.roll_request_ref);let faces=0;
    request=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',key:'hr-pack-opportunity',request:request.record_key,expected_revision:rollRevision(request)},
      {rng:()=>hopeFailure?[2,1][faces++]:[8,12][faces++]});
  }
  const origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),board=buildSceneIntentBoard(f.db,f.guild,origin,
    rows.map(r=>f.db.getCityRecord(f.guild,'typed_intent',r.record_key)),[{actor_key:'guard',operation:'attack',target_refs:[x.pc.id],objective_ref:'',source_refs:[],dependencies:[]}]),
    [r]=adjudicateSceneBoard(f.db,f.guild,origin,board,[{...decision(board.data.entries[1].intent_ref,'gm_attack_roll'),feature_ref:'standard_attack',
      rule_basis_refs:['srd:adversary-attacks'],stakes:'The Pack attempts its native standard attack.'}],{library:x.library});
  assert.equal(r.status,'gm_action_ready',r.data.reason);
  const [attack]=executeUnifiedGmActions(f.db,f.guild,[r],{library:x.library});
  reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{library:x.library});confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,attack.record_key);
  beforeDice({x,attack,decision:r,request});
  let dice=0;const roll=rollArbitratedIncomingAttack(f.db,f.guild,attack.record_key,{library:x.library,rng:s=>{dice++;return s===20?(miss?1:15):1;}});
  beforeDamage({x,attack,decision:r,request,roll});const
    effect=miss?null:resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{armor,library:x.library});
  return {...x,request,decision:r,attack,roll,effect,dice};
}

const VOLLEY='adversary:ritual-enforcement-team:coordinated-volley';
const LANES='adversary:traffic-saint:all-lanes-stop',FLASH='adversary:aster-vale-contractor:flashbang';
function groupReactionScenario(f,{flash=false,fear=2,expectReady=true,privateScene=false,beforeDecision=()=>{},proposalPatch={},targets=null,throughTurn=false}={}){
  const x=incoming(f,{privateScene,template:flash?'Aster Vale Contractor':'Traffic Saint',text:'Describe the scene.'});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,roll_collaboration:true}});
  f.db.changeFear(f.guild,fear-f.db.getCampaign(f.guild).fear);
  for(const pc of f.pcs.slice(1,3))recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:pc.id,source_event:x.row.data.offer.input.source,
    location_key:'terminal',zone:'interior',range:'Close',visibility:'party',accepted_by:pc.owner_user_id},'fixture-native');
  beforeDecision(x);
  const rows=persistPlayerIntents(f.db,f.guild,candidate(x.text).player_intents,x.scope,{messageId:x.messageId}),origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),
    proposal={actor_key:'guard',operation:'feature',target_refs:(targets?targets.map(i=>f.pcs[i]):f.pcs.slice(0,flash?1:3)).map(p=>p.id),objective_ref:'',source_refs:[],dependencies:[]},
    board=buildSceneIntentBoard(f.db,f.guild,origin,rows,[proposal]),[r]=adjudicateSceneBoard(f.db,f.guild,origin,board,[{...decision(board.data.entries[1].intent_ref,'native_feature_resolution'),
      rule_basis_refs:['srd:reaction-rolls'],stakes_kind:'native_feature',feature_ref:flash?FLASH:LANES,trait:'Instinct',difficulty:flash?12:14,stakes:'Exact native feature reaction.',...proposalPatch}],{library:x.library});
  if(!expectReady)return {...x,decision:r};
  assert.equal(r.status,'gm_action_ready',r.data.reason);
  if(throughTurn)return {...x,decision:r,proposal};
  const [group]=executeUnifiedGmActions(f.db,f.guild,[r],{library:x.library,rng:()=>assert.fail('a feature invitation never rolls')});assert.equal(group.kind,'gm_group_feature_execution');
  return {...x,decision:r,group,children:group.data.children.map(c=>f.db.getCityRecord(f.guild,'gm_arbitration_decision',c.decision))};
}
function groupChild(f,x,index){return x.children.find(c=>c.data.native.character===f.pcs[index].id);}
function submitGroupReaction(f,x,index,faces=[10,8]){
  const child=groupChild(f,x,index),user=f.pcs[index].owner_user_id,terms=inspectGmReactionInvitation(f.db,f.guild,user,child.record_key).terms,
    input={op:'gm-reaction-roll',request:child.record_key,revision:terms.revision};let calls=0;
  const request=submitGmReactionInvitation(f.db,f.guild,user,input,{interactionId:`group-roll-${index}`,authoredText:JSON.stringify(input),rng:()=>faces[calls++]});
  return {child,request,input,calls};
}
function volleyScenario(f,{evasions=[12,17,24],fear=3,privateScene=false,extraSpotlight=false,throughTurn=false,hpMarked=null,deferred=false}={}){
  const x=incoming(f,{privateScene,template:'Ritual Enforcement Team',text:'Describe the scene.',hpMarked});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true}});
  f.db.changeFear(f.guild,fear-f.db.getCampaign(f.guild).fear);
  for(const [i,evasion] of evasions.entries()){
    const pc=f.pcs[i];f.db.updateCharacterData(pc.id,d=>{d.evasion=evasion;d.thresholds={major:7,severe:14};if(hpMarked!==null)d.level=1;});
    if(i)recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:pc.id,source_event:x.row.data.offer.input.source,
      location_key:'terminal',zone:'interior',range:'Close',visibility:'party',accepted_by:pc.owner_user_id},'fixture-native');
  }
  let search=null;
  if(deferred){const text='I inspect the counter.',messageId='volley-prerequisite';captureWorldInput(f.db,f.guild,x.pc.owner_user_id,x.pc.id,messageId,text);
    [search]=persistPlayerIntents(f.db,f.guild,[{...candidate(text).player_intents[0],type:'search',operation:'inspect'}],x.scope,{messageId});
    f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,roll_requests:true,roll_collaboration:true}});}
  const rows=persistPlayerIntents(f.db,f.guild,[candidate(x.text).player_intents[0]],x.scope,{messageId:x.messageId}),
    origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),board=buildSceneIntentBoard(f.db,f.guild,origin,[...rows,...(search?[search]:[])],
      [...(extraSpotlight?[{actor_key:'guard',operation:'prepare',target_refs:[x.pc.id],objective_ref:'',source_refs:[],dependencies:[]}]:[]),
        {actor_key:'guard',operation:'attack',target_refs:f.pcs.slice(0,evasions.length).map(p=>p.id),objective_ref:'',source_refs:[],dependencies:search?[search.record_key]:[]}]),
    index=1+Number(extraSpotlight)+Number(!!search),
    proposal={...decision(board.data.entries[index].intent_ref,'gm_attack_roll'),feature_ref:VOLLEY,rule_basis_refs:['srd:adversary-attacks'],stakes:'The Team attempts its source-pinned Coordinated Volley.'};
  if(throughTurn)return {...x,origin,board,proposal};
  const rulings=adjudicateSceneBoard(f.db,f.guild,origin,board,[...(extraSpotlight?[{...decision(board.data.entries[1].intent_ref,'request_pc_reaction_roll'),
      rule_basis_refs:['srd:reaction-rolls'],trait:'Agility',difficulty:14,stakes:'Avoid an attempted interruption.',difficulty_reason:'Current native local NPC threat.'}]:[]),proposal],{library:x.library}),r=rulings.at(-1);
  assert.equal(r.status,'gm_action_ready',r.data.reason);
  const [parent]=executeUnifiedGmActions(f.db,f.guild,[r],{library:x.library,rng:()=>assert.fail('Preparation must not roll')});
  if(deferred){assert.equal(parent.kind,'gm_action_continuation');assert.equal(parent.status,'pending');return {...x,search,decision:r};}
  assert.equal(parent.kind,'npc_volley_attack');
  const attacks=parent.data.targets.map(t=>f.db.getCityRecord(f.guild,'pc_incoming_attack',t.attack));
  return {...x,decision:r,parent,attacks,board,origin};
}
function readyVolley(f,x,i=0){const pc=f.pcs[i],a=x.attacks[i];reviewIncomingAttack(f.db,f.guild,pc.owner_user_id,a.record_key,{library:x.library});confirmIncomingDefense(f.db,f.guild,pc.owner_user_id,a.record_key);return a;}
const cases=[
 ['UA9','G15','direct native consequence cannot accept a model-selected option or forged source',async f=>{
   const x=groupReactionScenario(f,{flash:true}),a=submitGroupReaction(f,x,0),{applyGroupReactionOutcome}=await import('../src/native-group-features.js');
   assert.throws(()=>applyGroupReactionOutcome(f.db,f.guild,a.child,a.request,x.sourceRef,'stress'));
   assert.throws(()=>applyGroupReactionOutcome(f.db,f.guild,a.child,a.request,null,'vulnerable'));
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_group_feature_effect',includeGM:true}).length,0);
   assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,2);assert.equal(f.db.getCharacter(x.pc.id).data.conditions?.length||0,0);
 }],
 ['UA9','G16','private reaction inbox does not lose an older owned request behind the database page cap',f=>{
   const x=groupReactionScenario(f),own=groupChild(f,x,0),other=groupChild(f,x,1);
   for(let i=0;i<120;i++)f.db.saveCityRecord(f.guild,{...other,key:`unrelated-pending-${i}`});
   assert(gmReactionInbox(f.db,f.guild,x.pc.owner_user_id).some(r=>r.request===own.record_key&&r.status==='pending'));
 }],
 ...['valid','resource','revoked'].map(mode=>['UA9',`G13-${mode}`,'expiration during native attack cost preserves exact defense CAS without unrelated change waivers '+mode,f=>{
   const x=groupReactionScenario(f);submitGroupReaction(f,x,0,[2,1]);
   const messageId='saint-after-lanes',text='Describe the scene.';captureWorldInput(f.db,f.guild,x.pc.owner_user_id,x.pc.id,messageId,text);
   const rows=persistPlayerIntents(f.db,f.guild,candidate(text).player_intents,x.scope,{messageId}),
     origin=createArbitrationOrigin(f.db,f.guild,x.scope,worldInputKey(messageId,x.pc.id,false)),
     board=buildSceneIntentBoard(f.db,f.guild,origin,rows,[{actor_key:'guard',operation:'attack',target_refs:[x.pc.id],objective_ref:'',source_refs:[],dependencies:[]}]),
     [r]=adjudicateSceneBoard(f.db,f.guild,origin,board,[{...decision(board.data.entries.at(-1).intent_ref,'gm_attack_roll'),rule_basis_refs:['srd:adversary-attacks'],feature_ref:'standard_attack',stakes:'Visible standard attack.'}],{library:x.library});
   assert.equal(r.status,'gm_action_ready');const [attack]=executeUnifiedGmActions(f.db,f.guild,[r],{library:x.library});
   reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{library:x.library});confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,attack.record_key);
   const roll=rollArbitratedIncomingAttack(f.db,f.guild,attack.record_key,{library:x.library,rng:s=>s===20?19:1});assert.equal(roll.data.hit,true);
   if(mode==='resource')f.db.updateCharacterData(x.pc.id,d=>{d.resources.stress.current++;});
   if(mode==='revoked'){const expiry=f.db.listCityRecords(f.guild,{kind:'pc_native_condition_expiry',includeGM:true})[0];indexWorldEvent(f.db,f.guild,{key:expiry.source_event,status:'retracted'},'gm');}
   if(mode!=='valid'){
     assert.throws(()=>resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{armor:false,library:x.library}));
     assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);return;
   }
   const effect=resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{armor:false,library:x.library});
   assert.equal(effect.status,'resolved');validateIncomingDamageApplication(f.db,f.guild,effect.record_key);
 }]),
 ['UA9','G14','group replay never charges another Fear or creates another cohort after restart',f=>{
   const x=groupReactionScenario(f);submitGroupReaction(f,x,0,[2,1]);f.restart();
   const [again]=executeUnifiedGmActions(f.db,f.guild,[x.decision],{library:x.library,rng:()=>assert.fail('no replay')});
   assert.equal(again.record_key,x.group.record_key);assert.equal(f.db.getCampaign(f.guild).fear,1);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_group_feature_execution',includeGM:true}).length,1);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'pc_native_condition',includeGM:true}).length,1);
 }],
 ...[
   ['no-fear',{fear:0}],['incomplete-cohort',{targets:[0,1]}],['absent-target',{targets:[0,1,2,3]}],['private-cross-owner',{privateScene:true}],
   ['wrong-fixed-difficulty',{proposalPatch:{difficulty:13}}],['wrong-trait',{proposalPatch:{trait:'Agility'}}],
 ].map(([id,options])=>['UA9',`G08-${id}`,'group feature rejects missing authority before costs or owner dice '+id,f=>{
   const x=groupReactionScenario(f,{...options,expectReady:false});assert.equal(x.decision.status,'needs_rules_review');
   assert.deepEqual(executeUnifiedGmActions(f.db,f.guild,[x.decision],{library:x.library,rng:()=>assert.fail('no illegal dice')}),[]);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_group_feature_execution',includeGM:true}).length,0);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_action_cost_receipt',includeGM:true}).length,0);
   assert.equal(f.db.getCampaign(f.guild).fear,options.fear??2);for(const pc of f.pcs)assert.equal(f.db.getCharacter(pc.id).data.resources.hp.current,0);
 }]),
 ['UA9','G09','a changed owner or revoked child holds only that owner, never another target',f=>{
   const x=groupReactionScenario(f),child=groupChild(f,x,1);indexWorldEvent(f.db,f.guild,{key:child.source_event,status:'retracted'},'gm');
   assert.throws(()=>inspectGmReactionInvitation(f.db,f.guild,f.pcs[1].owner_user_id,child.record_key));
   submitGroupReaction(f,x,0);f.restart();submitGroupReaction(f,x,2);assert.equal(f.db.getCampaign(f.guild).fear,1);
 }],
 ['UA9','G10','resource overflow preserves owner dice and reports scoped review rather than false completion',f=>{
   const x=groupReactionScenario(f,{flash:true,beforeDecision:()=>f.db.updateCharacterData(f.pcs[0].id,d=>{d.resources.stress.current=d.resources.stress.max;})});
   const a=submitGroupReaction(f,x,0,[2,1]);assert.equal(a.calls,2);
   assert.equal(inspectGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,a.child.record_key).terms.status,'needs_rules_review');
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_group_feature_effect',includeGM:true}).length,0);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_group_feature_review',includeGM:true}).length,1);
   const repeat=submitGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,a.input,{interactionId:'repeat-review',authoredText:JSON.stringify(a.input),rng:()=>assert.fail('no duplicate dice')});
   assert.equal(repeat.data.roll_id,a.request.data.roll_id);
 }],
 ['UA9','G11','private successful Flashbang choice reaches the actual command with no forced PC response',async f=>{
   const x=groupReactionScenario(f,{flash:true}),a=submitGroupReaction(f,x,0),{nativeGmNotice}=await import('../src/gm-arbitration-output.js');
   const scope={mode:'private',actorUserId:x.pc.owner_user_id,actorCharacterId:x.pc.id},notice=nativeGmNotice(f.db,f.guild,a.child.record_key,scope,{library:x.library});
   assert.match(notice.text,/Choose exactly ONE/);assert.match(notice.text,/gm-reaction-choice/);
   assert.throws(()=>nativeGmNotice(f.db,f.guild,a.child.record_key,{mode:'party',actorUserId:x.pc.owner_user_id,actorCharacterId:x.pc.id}));
   const input={op:'gm-reaction-choice',request:a.child.record_key,revision:hash(a.child.data),choice:'vulnerable'},
     i=fakeInteraction({gm:false,sub:'window'});Object.assign(i,{id:'native-group-command',guildId:f.guild,user:{id:x.pc.owner_user_id,username:x.pc.owner_user_id},commandName:'vc-roll',isChatInputCommand:()=>true});
   i.options.getString=key=>key==='json'?JSON.stringify(input):null;await handleCommand(i,{db:f.db,gm:{}});
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_group_feature_effect',includeGM:true}).length,1);assert.match(i.deliveries[0].content,/resolved/);
   assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,2);
 }],
 ['UA9','G12','combined GM turn delivers three separate private reaction notices exactly once through restart-safe outbox',async f=>{
   const x=groupReactionScenario(f,{throughTurn:true}),r=candidate(x.text);
   r.unified_arbitration={version:1,npc_intents:[x.proposal],decisions:[x.decision.data.proposal]};
   const out=await run(f,x,{version:9,acts:[],fiction_delta:[]},r),rows=out.rows.filter(row=>row.payload.includes('Pending owner reaction'));
   assert.equal(out.ai.requests.length,2);assert.equal(rows.length,3);
   for(const pc of f.pcs.slice(0,3)){const row=rows.find(r=>r.target_user_id===pc.owner_user_id);assert(row);assert.equal(row.visibility,'character');assert.equal(row.target_character_id,pc.id);assert(!row.payload.includes('SECRET'));}
   assert(!out.rows.filter(row=>row.surface==='party').some(row=>row.payload.includes('gm-reaction-review')));
   f.restart();const sent=[];await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async row=>{sent.push(row);return{messageId:`offline-group-${sent.length}`,channelId:'offline'};});
   assert.equal(sent.filter(row=>row.payload.includes('Pending owner reaction')).length,3);
   await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>assert.fail('no repeated delivery'));
   assert.equal(f.db.getCampaign(f.guild).fear,1);assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true}).length,0);
 }],
 ['UA9','G05','native movement guard enforces a failed group reaction without blocking description or unrelated PCs',async f=>{
   const x=groupReactionScenario(f);submitGroupReaction(f,x,0,[2,1]);
   const {nativeMovementConditionIssue}=await import('../src/native-group-features.js');
   assert.equal(nativeMovementConditionIssue(f.db,f.guild,f.pcs[0].id,{range:'Close'}),'NATIVE_MOVEMENT_LIMIT_VERY_CLOSE');
   assert.equal(nativeMovementConditionIssue(f.db,f.guild,f.pcs[0].id,{range:'Very Close'}),null);
   assert.equal(nativeMovementConditionIssue(f.db,f.guild,f.pcs[1].id,{range:'Far'}),null);
   const source=indexWorldEvent(f.db,f.guild,{key:'blocked-movement',kind:'observation',source_id:'gm',title:'Owner movement attempt',session_id:f.session.id,
     scene:currentScene(f.db,f.guild).key,location_key:'terminal',visibility:'party'},'gm');
   assert.throws(()=>recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:f.pcs[0].id,source_event:source.event_key,
     location_key:'terminal',zone:'elsewhere',range:'Far',visibility:'party',accepted_by:f.pcs[0].owner_user_id},'gm'),/NATIVE_MOVEMENT_LIMIT/);
   assert.equal(scenePresence(f.db,f.guild,'character',f.pcs[0].id).data.zone,'interior');
 }],
 ['UA9','G06','next legitimate Saint spotlight expires only its sourced movement restriction once',async f=>{
   const x=groupReactionScenario(f);submitGroupReaction(f,x,0,[2,1]);const {nativeMovementConditionIssue,validateNativeCondition}=await import('../src/native-group-features.js');
   const condition=f.db.listCityRecords(f.guild,{kind:'pc_native_condition',includeGM:true})[0];
   const messageId='next-saint-spotlight',text='What happens next?';captureWorldInput(f.db,f.guild,x.pc.owner_user_id,x.pc.id,messageId,text);
   const [accepted]=persistPlayerIntents(f.db,f.guild,[{...candidate(text).player_intents[0],operation:'continuation'}],x.scope,{messageId}),
     origin=createArbitrationOrigin(f.db,f.guild,x.scope,worldInputKey(messageId,x.pc.id,false)),
     board=buildSceneIntentBoard(f.db,f.guild,origin,[accepted],[{actor_key:'guard',operation:'prepare',target_refs:[f.pcs[1].id],objective_ref:'',source_refs:[],dependencies:[]}]),
     [r]=adjudicateSceneBoard(f.db,f.guild,origin,board,[{...decision(board.data.entries.at(-1).intent_ref,'request_pc_reaction_roll'),
       rule_basis_refs:['srd:reaction-rolls'],trait:'Agility',difficulty:14,stakes:'Dodge the guard attempt.',difficulty_reason:'Verified local danger.'}],{library:x.library});
   assert.equal(r.status,'pending_pc_reaction');executeUnifiedGmActions(f.db,f.guild,[r],{library:x.library});
   assert.equal(validateNativeCondition(f.db,f.guild,condition.record_key).status,'expired');
   assert.equal(nativeMovementConditionIssue(f.db,f.guild,f.pcs[0].id,{range:'Far'}),null);f.restart();
   executeUnifiedGmActions(f.db,f.guild,[r],{library:x.library});assert.equal(f.db.listCityRecords(f.guild,{kind:'pc_native_condition_expiry',includeGM:true}).length,1);
   const moved=indexWorldEvent(f.db,f.guild,{key:'after-expiry-presence',kind:'observation',source_id:'gm',title:'Verified test movement',session_id:f.session.id,
     scene:currentScene(f.db,f.guild).key,location_key:'terminal',visibility:'party'},'gm');
   recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:x.pc.id,source_event:moved.event_key,location_key:'terminal',zone:'other-side',range:'Close',visibility:'party',accepted_by:x.pc.owner_user_id},'gm');
   assert.equal(nativeMovementConditionIssue(f.db,f.guild,x.pc.id,{range:'Far'}),null);
   f.db.setDirectorState(f.session.id,{scene_number:2});
   assert.equal(nativeMovementConditionIssue(f.db,f.guild,x.pc.id,{range:'Far'}),null,'expired native proof cannot freeze later scenes');
 }],
 ['UA9','G07','native Vulnerable grants real incoming d20 advantage without model permission or replay dice',f=>{
   const x=groupReactionScenario(f,{flash:true});submitGroupReaction(f,x,0,[2,1]);
   const old=x.row.data.offer.input,source=indexWorldEvent(f.db,f.guild,{key:'post-flash-attack',kind:'observation',source_id:'gm',title:'Visible standard attack',
     session_id:f.session.id,scene:currentScene(f.db,f.guild).key,location_key:'terminal',visibility:'party'},'gm'),
     attack=prepareIncomingAttack(f.db,f.guild,'gm',{...old,source:source.event_key},{gm:true,interactionId:'after-flash',library:x.library});
   reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,attack.record_key,{library:x.library});confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,attack.record_key);
   let calls=0;const faces=[1,19,1,1],result=rollIncomingAttack(f.db,f.guild,'gm',attack.record_key,{gm:true,library:x.library,rng:()=>faces[calls++]});
   assert.equal(result.data.face,19);assert.equal(calls,3);assert.deepEqual(result.data.gm_d20.faces,[1,19]);
   assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);f.restart();
   assert.equal(incomingRollProjection(f.db,f.guild,attack.record_key).receipt.data.face,19);
   assert.equal(rollIncomingAttack(f.db,f.guild,'gm',attack.record_key,{gm:true,library:x.library,rng:()=>assert.fail('no replay')}).record_key,result.record_key);
 }],
 ['UA9','G01','All Lanes Stop creates three independent owner reactions with one Fear cost and no GM dice',f=>{
   const x=groupReactionScenario(f);assert.equal(x.children.length,3);assert.equal(f.db.getCampaign(f.guild).fear,1);
   const a=submitGroupReaction(f,x,0,[2,1]);assert.equal(a.calls,2);assert.equal(a.request.data.kind,'reaction');assert.equal(a.request.data.breakdown.difficulty,14);
   assert.equal(f.db.getCharacter(f.pcs[0].id).data.conditions.filter(c=>c.native_ref&&c.active).length,1);
   assert.equal(f.db.getCharacter(f.pcs[1].id).data.conditions?.length||0,0);assert.equal(f.db.getCampaign(f.guild).fear,1);
   assert.equal(inspectGmReactionInvitation(f.db,f.guild,f.pcs[1].owner_user_id,groupChild(f,x,1).record_key).terms.status,'pending');
 }],
 ['UA9','G02','group withdrawal and restart do not block siblings or manufacture a failed reaction',f=>{
   const x=groupReactionScenario(f),child=groupChild(f,x,1),user=f.pcs[1].owner_user_id,terms=inspectGmReactionInvitation(f.db,f.guild,user,child.record_key).terms,
     input={op:'gm-reaction-withdraw',request:child.record_key,revision:terms.revision};
   assert.throws(()=>withdrawGmReactionInvitation(f.db,f.guild,f.pcs[0].owner_user_id,input,{interactionId:'foreign',authoredText:JSON.stringify(input)}));
   withdrawGmReactionInvitation(f.db,f.guild,user,input,{interactionId:'group-withhold',authoredText:JSON.stringify(input)});f.restart();
   const a=submitGroupReaction(f,x,0);submitGroupReaction(f,x,2,[6,6]);
   const repeat=submitGmReactionInvitation(f.db,f.guild,f.pcs[0].owner_user_id,a.input,{interactionId:'group-roll-0',authoredText:JSON.stringify(a.input),rng:()=>assert.fail('no replay dice')});
   assert.equal(repeat.record_key,a.request.record_key);assert.equal(f.db.getCampaign(f.guild).fear,1);
   for(const pc of f.pcs){const data=f.db.getCharacter(pc.id).data;assert.equal(data.resources.hope,2);assert.equal(data.resources.stress.current,2);assert.equal(data.resources.hp.current,0);assert.equal(data.conditions?.length||0,0);}
 }],
 ['UA9','G03','Flashbang success waits for an exact owner choice instead of selecting a consequence',async f=>{
   const x=groupReactionScenario(f,{flash:true}),a=submitGroupReaction(f,x,0),{chooseGroupReactionOutcome}=await import('../src/native-group-features.js');
   assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.stress.current,2);assert.equal(f.db.getCharacter(f.pcs[0].id).data.conditions?.length||0,0);
   const input={op:'gm-reaction-choice',request:a.child.record_key,revision:hash(a.child.data),choice:'stress'};
   assert.throws(()=>chooseGroupReactionOutcome(f.db,f.guild,f.pcs[1].owner_user_id,input,{interactionId:'foreign-choice',authoredText:JSON.stringify(input)}));
   chooseGroupReactionOutcome(f.db,f.guild,f.pcs[0].owner_user_id,input,{interactionId:'flash-choice',authoredText:JSON.stringify(input)});f.restart();
   chooseGroupReactionOutcome(f.db,f.guild,f.pcs[0].owner_user_id,input,{interactionId:'flash-choice',authoredText:JSON.stringify(input)});
   assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.stress.current,3);assert.equal(f.db.getCharacter(f.pcs[0].id).data.conditions?.length||0,0);
   assert.equal(f.db.getCampaign(f.guild).fear,2);
 }],
 ['UA9','G04','Flashbang failed owner reaction applies both native consequences exactly once',f=>{
   const x=groupReactionScenario(f,{flash:true});submitGroupReaction(f,x,0,[2,1]);
   const pc=f.db.getCharacter(f.pcs[0].id);assert.equal(pc.data.resources.stress.current,3);assert.equal(pc.data.conditions.filter(c=>c.name==='Vulnerable'&&c.native_ref&&c.active).length,1);
   assert.equal(f.db.listCombatants(f.db.getCurrentEncounter(f.session.id).id)[0].stress_current,1);assert.equal(f.db.getCampaign(f.guild).fear,2);
 }],
 ['UA9','V01','Coordinated Volley shares one attack and damage roll but preserves each owner workflow',f=>{
   const x=volleyScenario(f);readyVolley(f,x);let calls=0;
   const r=rollArbitratedIncomingAttack(f.db,f.guild,x.attacks[0].record_key,{library:x.library,rng:s=>{calls++;return s===20?14:4;}});
   assert.equal(calls,3);assert.equal(r.data.damage.total,11);assert.equal(f.db.getCampaign(f.guild).fear,2);
   for(const [i,a] of x.attacks.entries()){
     const proof=incomingRollProjection(f.db,f.guild,a.record_key).receipt;
     assert.equal(proof.data.hit,i<2);assert.equal(proof.data.roll,r.data.roll);assert.equal(f.db.getCharacter(f.pcs[i].id).data.resources.hp.current,0);
   }
   assert.equal(f.db.getCityRecord(f.guild,'pc_incoming_attack',x.attacks[1].record_key).status,'awaiting_defense');
   resolveIncomingDamage(f.db,f.guild,f.pcs[0].owner_user_id,x.attacks[0].record_key,{armor:true,library:x.library});
   assert.equal(rollArbitratedIncomingAttack(f.db,f.guild,x.attacks[0].record_key,{library:x.library,rng:()=>assert.fail('terminal target replay')}).data.roll,r.data.roll);
   readyVolley(f,x,1);rollArbitratedIncomingAttack(f.db,f.guild,x.attacks[1].record_key,{library:x.library,rng:()=>assert.fail('shared dice never repeat')});
   resolveIncomingDamage(f.db,f.guild,f.pcs[1].owner_user_id,x.attacks[1].record_key,{armor:false,library:x.library});
   assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.hp.current,1);assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,2);
   assert.equal(f.db.getCharacter(f.pcs[2].id).data.resources.hp.current,0);
   readyVolley(f,x,2);assert.equal(rollArbitratedIncomingAttack(f.db,f.guild,x.attacks[2].record_key,{library:x.library,rng:()=>assert.fail('no repeat')}).data.damage,null);
   assert.equal(f.db.getCityRecord(f.guild,'pc_incoming_attack',x.attacks[2].record_key).status,'missed');
   assert.equal(inspectVolley(f.db,f.guild,x.parent.record_key).row.status,'resolved');
   assert.equal(executeUnifiedGmActions(f.db,f.guild,[x.decision],{library:x.library,rng:()=>assert.fail('completed execution replay')})[0].kind,'npc_volley_attack');
   assert.equal(f.db.getCampaign(f.guild).fear,2);
   assert.deepEqual(f.db.db.prepare('SELECT roll_type, COUNT(*) AS count FROM rolls WHERE guild_id=? GROUP BY roll_type ORDER BY roll_type').all(f.guild).map(r=>[r.roll_type,r.count]),
     [['npc_incoming_volley',1],['npc_incoming_volley_damage',1]]);
 }],
 ...[1,19,20].map(face=>['UA9',`V02-${face}`,'Coordinated Volley miss and natural critical damage '+face,f=>{
   const x=volleyScenario(f,{evasions:face===19?[12,17,24]:[24,25,26]});readyVolley(f,x);let calls=0;
   const r=rollArbitratedIncomingAttack(f.db,f.guild,x.attacks[0].record_key,{library:x.library,rng:s=>{calls++;return s===20?face:4;}});
   assert.equal(calls,face===1?1:3);assert.equal(r.data.hit,face!==1);assert.equal(r.data.damage?.total??null,face===20?27:face===19?11:null);
   assert.equal(f.db.getCampaign(f.guild).fear,2);
 }]),
 ['UA9','V03','Coordinated Volley pays extra spotlight and Fear feature separately once',f=>{
   const x=volleyScenario(f,{extraSpotlight:true,fear:2});readyVolley(f,x);
   const r=rollArbitratedIncomingAttack(f.db,f.guild,x.attacks[0].record_key,{library:x.library,rng:s=>s===20?14:4}),cost=f.db.getCityRecord(f.guild,'gm_action_cost_receipt',r.data.cost_ref);
   assert.deepEqual(cost.data.expenses,{additional_spotlight:1,feature:1,experience:0});assert.equal(f.db.getCampaign(f.guild).fear,0);
   rollArbitratedIncomingAttack(f.db,f.guild,x.attacks[0].record_key,{library:x.library,rng:()=>assert.fail('no duplicate cost/dice')});
 }],
 ...[{fear:0},{fear:1,extraSpotlight:true}].map((options,i)=>['UA9',`V04-${i}`,'unaffordable shared cost holds all target dice and resources',f=>{
   const x=volleyScenario(f,options);readyVolley(f,x);const before=f.db.getCampaign(f.guild).fear;
   assert.throws(()=>rollArbitratedIncomingAttack(f.db,f.guild,x.attacks[0].record_key,{library:x.library,rng:()=>assert.fail('unaffordable RNG')}));
   assert.equal(f.db.getCampaign(f.guild).fear,before);assert.equal(f.db.listCityRecords(f.guild,{kind:'npc_volley_roll_receipt',includeGM:true}).length,0);
   assert(x.attacks.every(a=>f.db.getCharacter(a.subject_key).data.resources.hp.current===0));
 }]),
 ...['owner','source','range','proxy','template','scene'].map(mode=>['UA9',`V05-${mode}`,'stale Volley authority rejects before shared RNG '+mode,f=>{
   const x=volleyScenario(f);readyVolley(f,x);const before=f.db.getCampaign(f.guild).fear;
   if(mode==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[3].owner_user_id,f.pcs[1].id);
   if(mode==='source')f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.sourceRef);
   if(mode==='proxy')f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:'guard',userId:f.pcs[3].owner_user_id,status:'active'});
   if(mode==='range'){const p=scenePresence(f.db,f.guild,'character',f.pcs[1].id);f.db.saveCityRecord(f.guild,{...p,key:p.record_key,data:{...p.data,zone:'remote',range:'Very Far'}});}
   if(mode==='template'){const find=x.library.findAdversary.bind(x.library);x.library.findAdversary=name=>({...find(name),attack:'+99'});}
   if(mode==='scene')f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:false}});
   assert.throws(()=>rollArbitratedIncomingAttack(f.db,f.guild,x.attacks[0].record_key,{library:x.library,rng:()=>assert.fail('stale RNG')}));
   assert.equal(f.db.getCampaign(f.guild).fear,before);assert.equal(f.db.listCityRecords(f.guild,{kind:'npc_volley_roll_receipt',includeGM:true}).length,0);
 }]),
 ['UA9','V06','withheld owner and restart preserve independent native damage and exact saved dice',f=>{
   const x=volleyScenario(f);const held=x.attacks[1];
   assert.throws(()=>withholdIncomingDefense(f.db,f.guild,f.pcs[0].owner_user_id,held.record_key,{library:x.library,interactionId:'wrong-owner'}));
   withholdIncomingDefense(f.db,f.guild,f.pcs[1].owner_user_id,held.record_key,{library:x.library,interactionId:'hold-own'});
   readyVolley(f,x);rollArbitratedIncomingAttack(f.db,f.guild,x.attacks[0].record_key,{library:x.library,rng:s=>s===20?14:4});f.restart();
   assert.equal(f.db.getCityRecord(f.guild,'pc_incoming_attack',held.record_key).status,'hold_for_owner');
   const receipt=resolveIncomingDamage(f.db,f.guild,f.pcs[0].owner_user_id,x.attacks[0].record_key,{armor:false,library:x.library});
   assert.equal(receipt.data.hp_marks,2);assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,0);
   assert.equal(resolveIncomingDamage(f.db,f.guild,f.pcs[0].owner_user_id,x.attacks[0].record_key,{armor:false,library:x.library}).record_key,receipt.record_key);
   readyVolley(f,x,1);rollArbitratedIncomingAttack(f.db,f.guild,held.record_key,{library:x.library,rng:()=>assert.fail('restart replay')});
   resolveIncomingDamage(f.db,f.guild,f.pcs[1].owner_user_id,held.record_key,{armor:true,library:x.library});assert.equal(f.db.getCampaign(f.guild).fear,2);
 }],
 ['UA9','V07','changed sibling owner after saved Volley holds only that target not independent damage',f=>{
   const x=volleyScenario(f);readyVolley(f,x);rollArbitratedIncomingAttack(f.db,f.guild,x.attacks[0].record_key,{library:x.library,rng:s=>s===20?14:4});
   f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[3].owner_user_id,f.pcs[1].id);
   assert.throws(()=>reviewIncomingAttack(f.db,f.guild,f.pcs[1].owner_user_id,x.attacks[1].record_key,{library:x.library}));
   assert.throws(()=>reviewIncomingAttack(f.db,f.guild,f.pcs[3].owner_user_id,x.attacks[1].record_key,{library:x.library}));
   assert.equal(resolveIncomingDamage(f.db,f.guild,f.pcs[0].owner_user_id,x.attacks[0].record_key,{armor:false,library:x.library}).data.hp_marks,2);
   assert.equal(f.db.getCampaign(f.guild).fear,2);
 }],
 ['UA9','V08','retracted shared result preserves committed HP and forbids unresolved sibling effects',f=>{
   const x=volleyScenario(f);readyVolley(f,x);rollArbitratedIncomingAttack(f.db,f.guild,x.attacks[0].record_key,{library:x.library,rng:s=>s===20?14:4});
   resolveIncomingDamage(f.db,f.guild,f.pcs[0].owner_user_id,x.attacks[0].record_key,{armor:false,library:x.library});
   const parent=inspectVolley(f.db,f.guild,x.parent.record_key);f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,parent.result.source_event);
   assert.throws(()=>reviewIncomingAttack(f.db,f.guild,f.pcs[1].owner_user_id,x.attacks[1].record_key,{library:x.library}));
   assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.hp.current,2);assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,0);
   assert.equal(f.db.getCampaign(f.guild).fear,2);
 }],
 ['UA9','V09','ordinary GM cannot roll a shared child or choose another owner Armor',f=>{
   const x=volleyScenario(f);readyVolley(f,x);assert.throws(()=>rollIncomingAttack(f.db,f.guild,'gm',x.attacks[0].record_key,{gm:true,library:x.library,rng:()=>assert.fail('independent child dice')}));
   rollArbitratedIncomingAttack(f.db,f.guild,x.attacks[0].record_key,{library:x.library,rng:s=>s===20?14:4});
   assert.throws(()=>resolveIncomingDamage(f.db,f.guild,f.pcs[1].owner_user_id,x.attacks[0].record_key,{armor:true,library:x.library}));
   assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.hp.current,0);
 }],
 ['UA9','V10','GM combined turn publishes three distinct owner-private offers through actual outbox',async f=>{
   const x=volleyScenario(f,{throughTurn:true}),r=candidate(x.text);
   r.unified_arbitration={version:1,npc_intents:[{actor_key:'guard',operation:'attack',target_refs:f.pcs.slice(0,3).map(p=>p.id),objective_ref:'',source_refs:[],dependencies:[]}],decisions:[x.proposal]};
   const out=await run(f,x,{version:9,acts:[],fiction_delta:[]},r);assert.equal(out.ai.requests.length,2);
   assert(out.ai.requests.some(request=>JSON.stringify(request).includes(VOLLEY)),'Native action selector must reach the existing GM prompt');
   const rows=out.rows.filter(row=>row.payload.includes('Incoming native Coordinated Volley'));assert.equal(rows.length,3);
   for(const [i,pc] of f.pcs.slice(0,3).entries()){
     const own=rows.find(row=>row.target_user_id===pc.owner_user_id);assert(own);assert.equal(own.visibility,'character');assert.equal(own.target_character_id,pc.id);
     assert(!own.payload.includes('SECRET'));assert(!own.payload.includes('Evasion'));assert(!/HP\s*\d/u.test(own.payload));
     assert(!rows.filter(row=>row.target_user_id!==pc.owner_user_id).some(row=>row.payload.includes(own.payload.match(/npc-incoming:[a-f0-9]+/u)[0])));
   }
   assert(!out.rows.filter(row=>row.surface==='party').some(row=>row.payload.includes('npc-incoming:')));
   assert.equal(f.db.listCityRecords(f.guild,{kind:'npc_volley_roll_receipt',includeGM:true}).length,0);
   f.restart();const sent=[];
   await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async row=>{sent.push({recipient:row.target_user_id,text:row.payload});return{messageId:`offline-${sent.length}`,channelId:'offline'};});
   assert.equal(sent.filter(r=>r.text.includes('Incoming native Coordinated Volley')).length,3);
   await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>assert.fail('delivered replay'));
   assert.equal(f.db.getCampaign(f.guild).fear,3);
 }],
 ['UA9','V11','uncertain Volley outbox is not blindly resent after restart',async f=>{
   const x=volleyScenario(f,{throughTurn:true}),r=candidate(x.text);
   r.unified_arbitration={version:1,npc_intents:[{actor_key:'guard',operation:'attack',target_refs:f.pcs.slice(0,3).map(p=>p.id),objective_ref:'',source_refs:[],dependencies:[]}],decisions:[x.proposal]};
   const out=await run(f,x,{version:9,acts:[],fiction_delta:[]},r);let sends=0;
   await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async row=>{sends++;if(row.target_user_id)throw new Error('unknown transport result');return{messageId:'offline-party',channelId:'offline'};});
   assert(f.db.listTurnPublications(f.guild,out.attempt.turn_id).some(r=>r.status==='uncertain'));const before=sends;f.restart();
   await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>{sends++;assert.fail('uncertain resend');});assert.equal(sends,before);
   assert.equal(f.db.getCampaign(f.guild).fear,3);assert.equal(f.db.listCityRecords(f.guild,{kind:'npc_volley_roll_receipt',includeGM:true}).length,0);
 }],
 ['UA9','V12','shared attack damage at last HP opens only the affected owner death choice',async f=>{
   const x=volleyScenario(f,{hpMarked:3});
   readyVolley(f,x);const r=rollArbitratedIncomingAttack(f.db,f.guild,x.attacks[0].record_key,{library:x.library,rng:s=>s===20?20:4});
   const effect=resolveIncomingDamage(f.db,f.guild,f.pcs[0].owner_user_id,x.attacks[0].record_key,{armor:false,library:x.library});
   assert.equal(r.data.damage.total,27);assert.equal(effect.data.hp_marks,3);assert.equal(f.db.getCharacter(f.pcs[0].id).status,'active');
   const death=f.db.getCityRecord(f.guild,'pc_death_move_request',`${x.attacks[0].record_key}:death`);assert.equal(death.status,'awaiting_owner');
   const {reviewPcDeathMove}=await import('../src/pc-death.js');assert.throws(()=>reviewPcDeathMove(f.db,f.guild,f.pcs[1].owner_user_id,death.record_key));
   assert.equal(reviewPcDeathMove(f.db,f.guild,f.pcs[0].owner_user_id,death.record_key).request,death.record_key);
   validateIncomingDamageApplication(f.db,f.guild,effect.record_key);assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,0);
   assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.hope,2);assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.stress.current,2);
 }],
 ...[{privateScene:true},{evasions:[12,13,14,15]},{evasions:[]}].map((options,i)=>['UA9',`V13-${i}`,'Volley rejects cross-private or invalid target cardinality '+i,f=>{
   assert.throws(()=>volleyScenario(f,options));
   assert.equal(f.db.listCityRecords(f.guild,{kind:'npc_volley_attack',includeGM:true}).length,0);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_action_cost_receipt',includeGM:true}).length,0);
 }]),
 ['UA9','V14','Discord owner command withholds only its own target and applies only its own Armor',async f=>{
   const x=volleyScenario(f),effect=async(user,input,id)=>{
     const i=fakeInteraction({gm:false,sub:'effect',json:input});Object.assign(i,{id,guildId:f.guild,user:{id:user,username:user},commandName:'vc-roll',isChatInputCommand:()=>true});
     await handleCommand(i,{db:f.db,gm:{content:{root:'../content'}}});return i;
   };
   const denied=await effect(f.pcs[0].owner_user_id,{op:'incoming-withhold',attack:x.attacks[1].record_key},'wrong-withhold');assert(denied.deliveries.some(d=>d.content.startsWith('⚠')));
   const own=await effect(f.pcs[1].owner_user_id,{op:'incoming-withhold',attack:x.attacks[1].record_key},'own-withhold');assert(own.deliveries.every(d=>d.ephemeral));
   assert.equal(f.db.getCityRecord(f.guild,'pc_incoming_attack',x.attacks[1].record_key).status,'hold_for_owner');
   readyVolley(f,x);rollArbitratedIncomingAttack(f.db,f.guild,x.attacks[0].record_key,{library:x.library,rng:s=>s===20?14:4});
   await effect(f.pcs[0].owner_user_id,{op:'incoming-armor',attack:x.attacks[0].record_key,armor:true},'own-armor');
   assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.hp.current,1);assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.hp.current,0);
   f.restart();await effect(f.pcs[0].owner_user_id,{op:'incoming-armor',attack:x.attacks[0].record_key,armor:true},'own-armor');
   assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.armor.current,1);assert.equal(f.db.getCampaign(f.guild).fear,2);
 }],
 ['UA9','V15','changed private recipient holds deferred Volley text before fake transport',async f=>{
   const x=volleyScenario(f,{throughTurn:true}),r=candidate(x.text);
   r.unified_arbitration={version:1,npc_intents:[{actor_key:'guard',operation:'attack',target_refs:f.pcs.slice(0,3).map(p=>p.id),objective_ref:'',source_refs:[],dependencies:[]}],decisions:[x.proposal]};
   const out=await run(f,x,{version:9,acts:[],fiction_delta:[]},r);f.restart();
   f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[3].owner_user_id,f.pcs[1].id);
   const sent=[];await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async row=>{sent.push(row);return{messageId:`offline-${sent.length}`,channelId:'offline'};});
   assert(!sent.some(row=>row.target_user_id===f.pcs[1].owner_user_id||row.target_user_id===f.pcs[3].owner_user_id));
   assert(f.db.listTurnPublications(f.guild,out.attempt.turn_id).some(row=>row.target_user_id===f.pcs[1].owner_user_id&&row.status==='failed'));
   assert.equal(f.db.getCampaign(f.guild).fear,3);
 }],
 ['UA9','V16','shuffled native target list cannot reuse a sealed Volley offer',f=>{
   const x=volleyScenario(f);readyVolley(f,x);const p=f.db.getCityRecord(f.guild,'npc_volley_attack',x.parent.record_key);
   f.db.saveCityRecord(f.guild,{...p,key:p.record_key,data:{...p.data,offer:{...p.data.offer,targets:[...p.data.offer.targets].reverse()}}});
   assert.throws(()=>rollArbitratedIncomingAttack(f.db,f.guild,x.attacks[0].record_key,{library:x.library,rng:()=>assert.fail('reordered RNG')}));
   assert.equal(f.db.getCampaign(f.guild).fear,3);
 }],
 ['UA9','V17','damaged target receipt cannot authorize HP or another target private result',async f=>{
   const x=volleyScenario(f);readyVolley(f,x);const r=rollArbitratedIncomingAttack(f.db,f.guild,x.attacks[0].record_key,{library:x.library,rng:s=>s===20?14:4});
   f.db.saveCityRecord(f.guild,{...r,key:r.record_key,data:{...r.data,evasion:1}});
   assert.throws(()=>incomingRollProjection(f.db,f.guild,x.attacks[0].record_key));
   assert.throws(()=>resolveIncomingDamage(f.db,f.guild,f.pcs[0].owner_user_id,x.attacks[0].record_key,{armor:false,library:x.library}));
   const {nativeGmNotice}=await import('../src/gm-arbitration-output.js');
   const own=nativeGmNotice(f.db,f.guild,x.decision.record_key,{mode:'private',actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id});
   assert(own.text.includes('Evasion 17'));assert(own.text.includes('awaiting_defense'));assert(!own.text.includes('Evasion 12'));
   assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.hp.current,0);assert.equal(f.db.getCampaign(f.guild).fear,2);
 }],
 ['UA9','V18','actual owner success resumes a dependent Volley once without executing the GM attack',f=>{
   const x=volleyScenario(f,{deferred:true}),a=adjudicateAcceptedIntent(f.db,f.guild,{acceptedIntent:x.search.record_key,mode:'roll_required',trait:'Finesse',kind:'action',difficulty:12,
     risk:'Delay',stakes:'Declared inspection only.',rawRefs:['srd:action-rolls'],explanation:'Native owner-controlled prerequisite.'},'native:unified-gm',{scope:x.scope}),
     request=f.db.getCityRecord(f.guild,'roll_request',a.roll_request_ref);let pcDice=0;
   contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',key:'volley-prerequisite-owner',request:request.record_key,expected_revision:rollRevision(request)},
     {rng:()=>[10,4][pcDice++],gmRng:()=>assert.fail('GM dice await target owner defense')});
   assert.equal(pcDice,2);const continuation=f.db.listCityRecords(f.guild,{kind:'gm_action_continuation',includeGM:true})[0];assert.equal(continuation.status,'resumed');
   const parent=f.db.getCityRecord(f.guild,'npc_volley_attack',continuation.data.result);assert.equal(parent.status,'awaiting_defense');assert.equal(parent.data.targets.length,3);
   f.restart();assert.equal(executeUnifiedGmActions(f.db,f.guild,[x.decision],{library:x.library,rng:()=>assert.fail('restart does not roll')})[0].record_key,parent.record_key);
   assert.equal(f.db.getCampaign(f.guild).fear,3);
 }],
 ...[
   ['HR04','Pale Court Elder','adversary:pale-court-elder:invitation-revoked','npc_stress'],
   ['HR06','Aster Vale Contractor','adversary:aster-vale-contractor:flashbang','success'],
   ['HR07','Pale Regent','adversary:pale-regent:command-the-blood','failure'],
   ['HR08','Morrowline Matured','adversary:morrowline-matured:spend-forecast','executor']
 ].map(([id,template,feature,requirement])=>[id,'review','unsupported native feature has a precise private erratum hold, never substituted dice or PC effects',f=>{
   const x=incoming(f,{template,text:'Describe the scene.'});f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true}});
   const before=f.db.getCharacter(x.pc.id).data,origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),
     board=buildSceneIntentBoard(f.db,f.guild,origin,[],[{actor_key:'guard',operation:'feature',target_refs:[x.pc.id],objective_ref:'',source_refs:[],dependencies:[]}]),
     [held]=adjudicateSceneBoard(f.db,f.guild,origin,board,[{...decision(board.data.entries[0].intent_ref,'native_feature_resolution'),
       rule_basis_refs:['srd:gm-moves'],feature_ref:feature,stakes_kind:'native_feature'}],{library:x.library});
   assert.equal(held.status,'needs_rules_review');assert.equal(held.visibility,'gm');assert.equal(held.data.native,null);
   assert.equal(held.data.review_contract.erratum,id);assert.equal(held.data.review_contract.erratum_version,1);
   assert(held.data.review_contract.requirements[requirement]);assert.match(held.data.reason,/missing native authority/i);
   assert.deepEqual(executeUnifiedGmActions(f.db,f.guild,[held],{rng:()=>assert.fail('no unsupported RNG')}),[]);
   assert.deepEqual(f.db.getCharacter(x.pc.id).data,before);assert.equal(f.db.getCampaign(f.guild).fear,0);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_action_cost_receipt',includeGM:true}).length,0);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_feature_effect_receipt',includeGM:true}).length,0);
 }]),
 ['HR03','meshClear','ending an NPC alliance recalculates later attacks but never rewrites saved earlier dice',async f=>{
   const x=meshScenario(f),first=strikeAdversary(f,x,'before-ending',{damage:1,targetId:x.target.id}),ally=x.actors.find(a=>a.actor!=='guard'),
     source=worldInputKey('mesh-end',x.pc.id);
   captureWorldInput(f.db,f.guild,x.pc.owner_user_id,x.pc.id,'mesh-end','Describe the scene.');
   const origin=createArbitrationOrigin(f.db,f.guild,x.scope,source),board=buildSceneIntentBoard(f.db,f.guild,origin,[],[
     {actor_key:ally.actor,operation:'clear_allies',target_refs:['guard'],objective_ref:'',source_refs:[],dependencies:[]}]),
     decisions=adjudicateSceneBoard(f.db,f.guild,origin,board,[{...decision(board.data.entries[0].intent_ref,'npc_no_roll'),rule_basis_refs:['srd:gm-moves']}],{library:x.library});
   assert.equal(decisions[0].status,'gm_action_ready');
   const [ended]=executeUnifiedGmActions(f.db,f.guild,decisions,{rng:()=>assert.fail('no alliance dice')});assert.equal(ended.data.plan.state,'ended');
   const second=strikeAdversary(f,x,'after-ending',{damage:1,targetId:x.target.id}),{typedRollProof}=await import('../src/typed-roll-proof.js');
   assert.equal(second.request.data.breakdown.attack.difficulty,second.target.difficulty);
   assert.equal(first.request.data.breakdown.attack.difficulty,first.target.difficulty+1);
   assert.equal(typedRollProof(f.db,f.guild,first.request).outcome,'success');
   assert.equal(f.db.listCityRecords(f.guild,{kind:'native_npc_alliance_receipt',includeGM:true}).length,2);
 }],
 ['HR03','meshCombined','same combined GM and writer calls commit one private alliance without new provider roundtrip',async f=>{
   const x=meshScenario(f,{establish:false}),ally=x.actors.find(a=>a.actor!=='guard'),r=candidate(x.text),ref=`npc-intent:${hash([x.sourceRef,ally.actor,'set_allies'])}`;
   r.unified_arbitration={version:1,npc_intents:[{actor_key:ally.actor,operation:'set_allies',target_refs:['guard'],objective_ref:'',source_refs:[],dependencies:[]}],
     decisions:[{...decision(ref,'npc_no_roll'),rule_basis_refs:['srd:gm-moves']}]};
   const out=await run(f,x,{version:9,acts:[],fiction_delta:[]},r),receipts=f.db.listCityRecords(f.guild,{kind:'native_npc_alliance_receipt',includeGM:true});
   assert.equal(out.ai.requests.length,2);assert.equal(receipts.length,1);assert.equal(receipts[0].visibility,'gm');
   assert(!out.rows.some(row=>row.payload.includes('npc-alliance')||row.payload.includes('ally-0')));
   assert.equal(f.db.listNpcKnowledge(f.guild,ally.actor).length,0);assert.equal(f.db.getCampaign(f.guild).fear,0);
 }],
 ['HR03','meshAuthority','GM alliance creation rejects PC participation human proxy and forged principal while independent fiction remains valid',async f=>{
   const x=meshScenario(f,{establish:false}),ally=x.actors.find(a=>a.actor!=='guard'),origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),
     board=buildSceneIntentBoard(f.db,f.guild,origin,[],[{actor_key:ally.actor,operation:'set_allies',target_refs:[x.pc.id],objective_ref:'',source_refs:[],dependencies:[]}]),
     [held]=adjudicateSceneBoard(f.db,f.guild,origin,board,[{...decision(board.data.entries[0].intent_ref,'npc_no_roll'),rule_basis_refs:['srd:gm-moves']}],{library:x.library}),
     {commitNativeNpcAlliance}=await import('../src/native-encounter-relations.js');
   assert.equal(held.status,'needs_rules_review');assert.equal(held.data.native,null);
   assert.throws(()=>commitNativeNpcAlliance(f.db,f.guild,held.record_key),/alliance_native_decision/);
   assert.throws(()=>buildSceneIntentBoard(f.db,f.guild,{gm:true,actor:'ai_gm'},[],[]),/native_origin/);
   f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:ally.actor,userId:f.pcs[1].owner_user_id,status:'active'});
   assert.throws(()=>buildSceneIntentBoard(f.db,f.guild,origin,[],[{actor_key:ally.actor,operation:'set_allies',target_refs:['guard'],objective_ref:'',source_refs:[],dependencies:[]}]),/origin_source_owner_scene_or_control_changed/);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'native_npc_alliance_receipt',includeGM:true}).length,0);
   assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources.hope,2);
 }],
 ['HR03','mesh1','Local Mesh changes only native PC attack defense Difficulty with independently authored alliance',f=>{
   const x=meshScenario(f),result=strikeAdversary(f,x,'mesh',{damage:1,targetId:x.target.id});
   assert.equal(result.request.data.breakdown.attack.difficulty,result.target.difficulty+1);
   assert(result.request.data.breakdown.attack.defense_aura);assert(!JSON.stringify(result.request.data.breakdown.attack).includes('ally-0'));
   assert.equal(x.row.data.offer.bonus,Number(x.library.findAdversary('Static Wraith').attack));
   f.restart();
   assert.equal(f.db.getCityRecord(f.guild,'roll_request',result.request.record_key).data.breakdown.attack.difficulty,result.target.difficulty+1);
 }],
 ['HR03','mesh2','two allied Relays do not stack defense and share one Signal classification gate',f=>{
   const x=meshScenario(f,{relays:2}),result=strikeAdversary(f,x,'mesh2',{damage:1,targetId:x.target.id});
   assert.equal(result.request.data.breakdown.attack.difficulty,result.target.difficulty+1);
 }],
 ...[{establish:false},{template:'Wraith Pack'}].map((v,i)=>['HR03',`meshDeny${i}`,'same scene group or electrical description is not Local Mesh eligibility '+JSON.stringify(v),f=>{
   const x=meshScenario(f,v),result=strikeAdversary(f,x,'mesh-none',{damage:1,targetId:x.target.id});
   assert.equal(result.request.data.breakdown.attack.difficulty,result.target.difficulty);assert.equal(result.request.data.breakdown.attack.defense_aura,undefined);
 }]),
 ...[{template:'Choir Relay',relays:0,bonus:0},{template:'Choir Relay',relays:1,bonus:1}].map((v,i)=>['HR03',`meshRelay${i}`,'Relay self and other-source distinction '+JSON.stringify(v),f=>{
   const x=meshScenario(f,{...v,establish:v.relays>0}),result=strikeAdversary(f,x,'mesh-relay',{damage:1,targetId:x.target.id});
   assert.equal(result.request.data.breakdown.attack.difficulty,result.target.difficulty+v.bonus);
 }]),
 ...['moved','defeated','proxy','revoked'].map(kind=>['HR03',`meshStale-${kind}`,'pending Local Mesh proof revalidates '+kind+' before owner dice without granting another action',f=>{
   const x=meshScenario(f),ally=x.actors.find(a=>a.actor!=='guard'),before=f.db.getCharacter(x.pc.id).data.resources;
   assert.throws(()=>strikeAdversary(f,x,'mesh-stale',{targetId:x.target.id,rollRng:()=>assert.fail('no stale-proof RNG'),beforeRoll:()=>{
     if(kind==='moved'){
       const source=indexWorldEvent(f.db,f.guild,{key:'mesh-ally-moved',kind:'observation',source_id:'gm',title:'Relay changes native zone',
         session_id:f.session.id,scene:currentScene(f.db,f.guild).key,location_key:'terminal',visibility:'party'},'gm');
       recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:ally.actor,source_event:source.event_key,location_key:'terminal',zone:'remote',range:'Far',visibility:'party'},'gm');
     }
     if(kind==='defeated')f.db.updateCombatant(ally.id,{hp_current:0,status:'defeated'});
     if(kind==='proxy')f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:ally.actor,userId:f.pcs[1].owner_user_id,status:'active'});
     if(kind==='revoked')indexWorldEvent(f.db,f.guild,{key:x.allianceEffects[0].source_event,status:'retracted'},'gm');
   }}),/Sheet or authority changed/);
   assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);assert.equal(f.db.getCampaign(f.guild).fear,0);
 }]),
 ['HR03','meshHistory','native alliance replay and source retraction preserve saved damage and private receipt history',async f=>{
   const x=meshScenario(f),result=strikeAdversary(f,x,'mesh-history',{damage:1,targetId:x.target.id}),before=f.db.listCombatants(x.encounter.id),
     {typedRollProof}=await import('../src/typed-roll-proof.js');
   assert.equal(typedRollProof(f.db,f.guild,result.request).outcome,'success');
   const replay=executeUnifiedGmActions(f.db,f.guild,x.allianceDecisions,{rng:()=>assert.fail('no alliance replay RNG')});
   assert.equal(replay[0].record_key,x.allianceEffects[0].record_key);
   indexWorldEvent(f.db,f.guild,{key:x.allianceEffects[0].source_event,status:'retracted'},'gm');f.restart();
   assert.throws(()=>typedRollProof(f.db,f.guild,f.db.getCityRecord(f.guild,'roll_request',result.request.record_key)),/alliance/);
   assert.deepEqual(f.db.listCombatants(x.encounter.id),before);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'native_npc_alliance_receipt',includeGM:true}).length,1);
 }],
 ['HR11','hordeAI','native AI Host attack keeps the same saved GM d20 cost and owner Armor workflow',f=>{
   const x=packFearAttack(f,{template:'Green Root Host',hp:4,armor:true}),r=x.roll.data;
   assert.equal(r.damage.expression,'3d8+8');assert.equal(r.damage.total,11);assert.equal(r.gm_d20.family,'gm_d20');
   assert.equal(f.db.getCampaign(f.guild).fear,1);assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,2);
   assert.equal(x.effect.data.armor,true);assert.equal(f.db.getCityRecord(f.guild,'gm_action_cost_receipt',r.cost_ref).data.amount,0);
 }],
 ...['hp','proof','owner'].map(kind=>['HR11',`hordeDeny-${kind}`,'native Host '+kind+' mismatch never executes unentitled dice or HP',f=>{
   const x=incoming(f,{template:'Green Root Host',npcHp:4}),before=f.db.getCharacter(x.pc.id).data.resources;
   if(kind==='hp')f.db.updateCombatant(x.row.data.offer.input.combatant,{hp_current:5});
   if(kind==='proof'){
     const p=f.db.getCityRecord(f.guild,'npc_damage_passive_proof',x.row.data.offer.damage_passive.ref);
     f.db.saveCityRecord(f.guild,{...p,key:p.record_key,data:{...p.data,proof:{...p.data.proof,expression:'50d1000'}}});
   }
   if(kind==='owner')assert.throws(()=>resolveIncomingDamage(f.db,f.guild,f.pcs[1].owner_user_id,x.row.record_key,{armor:false,library:x.library}));
   else assert.throws(()=>rollIncomingAttack(f.db,f.guild,'gm',x.row.record_key,{gm:true,library:x.library,rng:()=>assert.fail('no invalid-source RNG')}),/stale|proof/);
   assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);assert.equal(f.db.listCityRecords(f.guild,{kind:'npc_attack_roll_receipt',includeGM:true}).length,0);
 }]),
 ...[{remaining:5,face:19,expression:'4d8+12',total:16},{remaining:4,face:19,expression:'3d8+8',total:11},
   {remaining:3,face:20,expression:'3d8+8',total:35}].map((v,i)=>['HR11',`horde${i}`,'native Host attack uses marked-half threshold and saved damage '+JSON.stringify(v),f=>{
   const x=incoming(f,{template:'Green Root Host',npcHp:v.remaining}),before=f.db.getCharacter(x.pc.id).data.resources;
   const roll=rollIncomingAttack(f.db,f.guild,'gm',x.row.record_key,{gm:true,library:x.library,rng:s=>s===20?v.face:1});
   assert.equal(roll.data.damage.expression,v.expression);assert.equal(roll.data.damage.total,v.total);
   assert.equal(roll.data.damage.critical_bonus,v.face===20?24:0);
   const effect=resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,x.row.record_key,{armor:true,library:x.library});
   assert.equal(effect.data.after.hope,before.hope);assert.equal(f.db.getCampaign(f.guild).fear,0);
   f.restart();const replay=incomingRollProjection(f.db,f.guild,x.row.record_key).receipt;
   assert.equal(replay.record_key,roll.record_key);assert.equal(replay.data.damage.total,v.total);
   assert.equal(resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,x.row.record_key,{armor:true,library:x.library}).record_key,effect.record_key);
 }]),
 ['HR01','a','Many Deaths marks exactly one additional Stress from actual causal PC Fear and native hit',f=>{
   const x=packFearAttack(f),pc=f.db.getCharacter(x.pc.id);
   assert.equal(x.request.data.result.duality,'Fear');assert.equal(x.roll.data.hit,true);assert.equal(pc.data.resources.stress.current,3);
   assert.equal(f.db.getCampaign(f.guild).fear,1);assert.equal(pc.data.resources.hope,2);assert.equal(x.roll.data.gm_d20.family,'gm_d20');
   f.restart();resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,x.attack.record_key,{armor:false,library:x.library});
   assert.equal(f.db.getCharacter(pc.id).data.resources.stress.current,3);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_feature_effect_receipt',includeGM:true}).filter(r=>r.data.feature==='adversary:wraith-pack:many-deaths').length,1);
 }],
 ...[{looking:true},{hopeFailure:true},{hp:3},{miss:true}].map((options,i)=>['HR01',`b${i}`,'Many Deaths does not invent a d20 Fear trigger '+JSON.stringify(options),f=>{
   const x=packFearAttack(f,options);assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,2);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_feature_effect_receipt',includeGM:true}).filter(r=>r.data.feature==='adversary:wraith-pack:many-deaths').length,0);
   if(options.miss)assert.equal(x.roll.data.damage,null);
 }]),
 ['HR02','a','resolver and application policy honor explicit override precedence without authorizing effects',async f=>{
   const {selectRuleBasis}=await import('../src/rules-arbitration.js'),{AUTHORITY_POLICY}=await import('../src/authority-policy.js');
   f.db.upsertRulesRuling(f.guild,{key:'hr-scoped',question:'Scoped native fixture ruling',ruling:'Current scoped ruling.',createdBy:'gm'});
   f.db.upsertRulesRuling(f.guild,{key:'hr-override',question:'Explicit override fixture',ruling:'Exact override.',createdBy:'gm'});
   const input={savedRulingKey:'hr-scoped',overrideRefs:['override:hr-override'],rawRefs:['srd:action-rolls'],houseRefs:['house:missing']};
   assert.equal(selectRuleBasis(f.db,f.guild,input).kind,'saved_ruling');
   assert.equal(selectRuleBasis(f.db,f.guild,{...input,savedRulingKey:''}).kind,'campaign_override');
   assert.equal(selectRuleBasis(f.db,f.guild,{...input,savedRulingKey:'',overrideRefs:[]}).kind,'RAW');
   assert.equal(selectRuleBasis(f.db,f.guild,{...input,savedRulingKey:'',overrideRefs:['override:missing']}).kind,'provisional');
   assert.match(AUTHORITY_POLICY,/saved scoped GM ruling > verified explicit campaign override > verified Daggerheart SRD/);
   assert.match(AUTHORITY_POLICY,/consent.*ownership.*source.*receipt/i);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true}).length,0);
 }],
 ['HR01','c','Armor does not erase a genuine on-hit Fear erratum and cannot replay the extra Stress',async f=>{
   const x=packFearAttack(f,{armor:true}),{inspectManyDeathsEffect}=await import('../src/native-feature-hit.js'),receipt=f.db.listCityRecords(f.guild,{kind:'gm_feature_effect_receipt',includeGM:true})[0];
   assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,3);assert.equal(x.effect.data.hp_marks,0);
   assert.equal(inspectManyDeathsEffect(f.db,f.guild,receipt.record_key).record_key,receipt.record_key);
   f.restart();assert.equal(inspectManyDeathsEffect(f.db,f.guild,receipt.record_key).record_key,receipt.record_key);
   assert.throws(()=>resolveIncomingDamage(f.db,f.guild,f.pcs[1].owner_user_id,x.attack.record_key,{armor:true,library:x.library}));
 }],
 ['HR01','d','revoked causal roll proof holds only extra Stress after a saved valid standard hit',f=>{
   const x=packFearAttack(f,{beforeDamage:({request})=>indexWorldEvent(f.db,f.guild,{key:request.data.input.difficulty_source,status:'retracted'},'gm')});
   assert.equal(x.roll.data.hit,true);assert(x.effect.data.hp_marks>0);assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,2);
   assert.equal(f.db.getCityRecord(f.guild,'pc_incoming_attack',x.attack.record_key).status,'resolved');
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_feature_effect_review',includeGM:true})[0].status,'needs_rules_review');
 }],
 ['HR01','e','revoked or altered extra-effect proof cannot reverse committed damage or Stress',async f=>{
   const x=packFearAttack(f),{inspectManyDeathsEffect}=await import('../src/native-feature-hit.js'),receipt=f.db.listCityRecords(f.guild,{kind:'gm_feature_effect_receipt',includeGM:true})[0],
     before=structuredClone(f.db.getCharacter(x.pc.id).data.resources);
   indexWorldEvent(f.db,f.guild,{key:receipt.source_event,status:'retracted'},'gm');
   assert.throws(()=>inspectManyDeathsEffect(f.db,f.guild,receipt.record_key));f.restart();
   assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);
 }],
 ...[{pcStress:6},{signalTouched:true}].map((options,i)=>['HR01',`f${i}`,'unsupported extra Stress prerequisite preserves standard damage '+JSON.stringify(options),f=>{
   const x=packFearAttack(f,options),review=f.db.listCityRecords(f.guild,{kind:'gm_feature_effect_review',includeGM:true})[0];
   assert.equal(x.roll.data.hit,true);assert(x.effect.data.hp_marks>0);
   assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,options.pcStress||2);assert.equal(f.db.getCampaign(f.guild).fear,1);
   assert.equal(review.status,'needs_rules_review');assert.equal(review.visibility,'gm');
   assert.match(review.data.reason,options.signalTouched?/owner_preconsequence_choice/:/stress_overflow/);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_feature_effect_receipt',includeGM:true}).length,0);
 }]),
 ['HR12','a','death protocol wording matches native affected-owner selection and automatic terminal status',()=>{
   const rules=fs.readFileSync('../content/ENGINE/MULTIPLAYER_GM_RULES.md','utf8'),source=fs.readFileSync('src/gm.js','utf8');
   assert(!rules.includes('A human resolves the death move'));assert(!source.includes('death/retirement is a human-controlled lifecycle action'));
   assert(rules.includes('affected player selects'));assert(source.includes('affected-owner-only native death choice'));
 }],
 ['HR11','a','native HP representation handles odd maxima final marks and DB clamping without confusing PC marks',async f=>{
   const {adversaryHpState,wouldMarkLastAdversaryHp}=await import('../src/combat.js'),x=incoming(f),encounter=f.db.getCurrentEncounter(f.session.id),c=f.db.listCombatants(encounter.id)[0];
   const zero=f.db.updateCombatant(c.id,{hp_current:-9}),full=f.db.updateCombatant(c.id,{hp_current:c.hp_max+9});
   assert.equal(adversaryHpState(zero).remaining,0);assert.equal(adversaryHpState(full).marked,0);
   assert.equal(adversaryHpState({hp_current:3,hp_max:5}).marked_half_or_more,false);
   assert.equal(adversaryHpState({hp_current:2,hp_max:5}).marked_half_or_more,true);
   assert.equal(wouldMarkLastAdversaryHp({...c,hp_current:2},1),false);assert.equal(wouldMarkLastAdversaryHp({...c,hp_current:2},2),true);
   assert.equal(wouldMarkLastAdversaryHp(zero,3),false);assert.throws(()=>adversaryHpState(f.db.getCharacter(x.pc.id).data.resources.hp));
   assert.throws(()=>adversaryHpState({hp_current:6,hp_max:5}));assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);
 }],
 ['HR','registry','house errata is explicit immutable source-pinned and never a generic feature executor',async()=>{
   const {compileNativeHouseErrata,nativeHouseErratum}=await import('../src/native-house-errata.js'),rows=compileNativeHouseErrata();
   assert.equal(rows.length,11);assert(Object.isFrozen(rows));
   for(const row of rows){assert(Object.isFrozen(row));assert(row.sources.every(s=>/^[a-f0-9]{64}$/.test(s.source_hash)));
     if(row.version===1&&row.id!=='HR01'){assert.equal(row.status,'review_only');assert.equal(row.native_handler,null);}}
   assert.equal(nativeHouseErratum('HR03').status,'review_only');assert.equal(nativeHouseErratum('HR03',2).native_handler,'local_mesh_allied_zone');
   assert.equal(nativeHouseErratum({id:'HR01',native_handler:'eval'}),null);assert.equal(nativeHouseErratum('model:HR01'),null);
   assert.equal(nativeHouseErratum('HR01',2),null);assert.equal(nativeHouseErratum('HR01','1'),null);
   assert.equal(nativeHouseErratum('HR03').interpretation.maximum_aura_bonus,1);
   assert.equal(nativeHouseErratum('HR05').interpretation.normal_fear_gain,'unchanged');
   assert.equal(nativeHouseErratum('HR08').interpretation.executor,'same_pc_owner');
   assert.equal(nativeHouseErratum('HR09').interpretation.generic_machine_d20,false);
 }],
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
 ...[{privateScene:true},{proxy:true},{stress:3},{pcStress:6},{category:'ordinary_item'}].map((options,i)=>['UA8',`N${i}`,'Feedback rejects unavailable source controller budget or native effect '+JSON.stringify(options),async f=>{
   const x=await feedbackScenario(f,options);assert.equal(x.invites.length,0);assert.equal(x.out.ai.requests.length,2);
   assert.equal(f.db.listCombatants(x.row.data.offer.snapshot.encounter)[0].stress_current,options.stress||0);
   assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,options.pcStress||2);
   assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_action_cost_receipt',includeGM:true}).length,0);
   assert(x.out.mutation.unifiedArbitration.some(r=>r.status==='resolved_no_roll'));
 }]),
 ['UA8','F2','Feedback Critical succeeds without Hope Fear Stress reward or device shutdown',async f=>{
   const x=await feedbackScenario(f),r=x.invites[0],terms=inspectGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,r.record_key).terms,
     input={op:'gm-reaction-roll',request:r.record_key,revision:terms.revision};
   submitGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,input,{interactionId:'feedback-critical',authoredText:JSON.stringify(input),rng:()=>12});
   const pc=f.db.getCharacter(x.pc.id);assert.equal(pc.data.resources.stress.current,2);assert.equal(pc.data.resources.hope,2);assert.equal(f.db.getCampaign(f.guild).fear,0);
   assert(!pc.data.inventory.find(i=>i.id==='phone').disabled_by);
 }],
 ['UA8','F3','Feedback owner may withhold but another player cannot roll or withdraw that reaction',async f=>{
   const x=await feedbackScenario(f),r=x.invites[0],terms=inspectGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,r.record_key).terms,
     input={op:'gm-reaction-roll',request:r.record_key,revision:terms.revision},options={interactionId:'feedback-wrong-owner',authoredText:JSON.stringify(input),rng:()=>assert.fail('no foreign dice')};
   assert.throws(()=>submitGmReactionInvitation(f.db,f.guild,f.pcs[1].owner_user_id,input,options));
   const withdraw={...input,op:'gm-reaction-withdraw'},w={interactionId:'feedback-withheld',authoredText:JSON.stringify(withdraw)};
   assert.throws(()=>withdrawGmReactionInvitation(f.db,f.guild,f.pcs[1].owner_user_id,withdraw,w));
   withdrawGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,withdraw,w);f.restart();withdrawGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,withdraw,w);
   assert.equal(inspectGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,r.record_key).terms.status,'withdrawn');
   assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,2);assert(!f.db.getCharacter(x.pc.id).data.inventory[0].disabled_by);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_operation',includeGM:true}).length,0);assert.equal(f.db.listCombatants(x.row.data.offer.snapshot.encounter)[0].stress_current,1);
 }],
 ['UA8','F4','retracted Feedback payment proof blocks owner dice and deferred publication without refund or replay',async f=>{
   const x=await feedbackScenario(f),r=x.invites[0],terms=inspectGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,r.record_key).terms,
     cost=f.db.listCityRecords(f.guild,{kind:'gm_action_cost_receipt',includeGM:true})[0],input={op:'gm-reaction-roll',request:r.record_key,revision:terms.revision};
   f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,cost.data.payment_source);
   assert.throws(()=>submitGmReactionInvitation(f.db,f.guild,x.pc.owner_user_id,input,{interactionId:'feedback-revoked',authoredText:JSON.stringify(input),rng:()=>assert.fail('no revoked dice')}));
   const sent=[];await deliverTurnOutbox(f.db,f.guild,x.out.attempt.turn_id,async row=>{sent.push(row);return{messageId:'fake',channelId:'offline'};});
   assert(!sent.some(row=>row.target_user_id===x.pc.owner_user_id&&row.payload.includes('Pending owner reaction')));
   assert.equal(f.db.listCombatants(x.row.data.offer.snapshot.encounter)[0].stress_current,1);assert.equal(f.db.getCharacter(x.pc.id).data.resources.stress.current,2);
 }],
 ['UA8','F1','visible native device use reaches an owner-only Feedback reaction in the same GM call',async f=>{
   const x=await feedbackScenario(f),{out,invites}=x;
   assert.equal(invites.length,1);assert.equal(out.ai.requests.length,2);
   const pc=f.db.getCharacter(x.pc.id),terms=inspectGmReactionInvitation(f.db,f.guild,pc.owner_user_id,invites[0].record_key).terms;
   assert.equal(terms.trait,'Instinct');assert.equal(terms.difficulty,12);assert(terms.stakes.includes('Stress'));assert(terms.stakes.includes('device'));
   assert.equal(f.db.listCombatants(x.row.data.offer.snapshot.encounter)[0].stress_current,1);assert.equal(pc.data.resources.stress.current,2);assert.equal(pc.data.resources.hp.current,0);
   assert(out.rows.some(row=>row.target_user_id===pc.owner_user_id&&row.payload.includes('Instinct')));
   let calls=0;const input={op:'gm-reaction-roll',request:invites[0].record_key,revision:terms.revision},options={interactionId:'feedback-owner',authoredText:JSON.stringify(input),rng:()=>[1,2][calls++]};
   submitGmReactionInvitation(f.db,f.guild,pc.owner_user_id,input,options);assert.equal(calls,2);
   const after=f.db.getCharacter(pc.id);assert.equal(after.data.resources.stress.current,3);assert.equal(after.data.resources.hope,2);assert.equal(after.data.resources.hp.current,0);
   assert(after.data.inventory.find(i=>i.id==='phone').disabled_by);assert.equal(f.db.getCampaign(f.guild).fear,0);
   f.restart();submitGmReactionInvitation(f.db,f.guild,pc.owner_user_id,input,{...options,rng:()=>assert.fail('no repeated reaction dice')});
   assert.equal(f.db.getCharacter(pc.id).data.resources.stress.current,3);
 }],
 ['UA8','D1','Contingency Stack reduces only the first actual Severe hit before NPC HP finalization',f=>{
   const x=incoming(f,{template:'Aster Vale Catastrophe Analyst'}),first=strikeAdversary(f,x,1);
   assert.equal(first.request.data.damage_result.marks,2);assert.equal(first.request.data.damage_result.before-first.request.data.damage_result.after,2);
   assert(first.request.data.damage_result.defense_ref);assert.equal(first.request.data.damage.total,100);
   f.restart();const replay=contributeRoll(f.db,f.guild,x.pc.owner_user_id,first.input,{rng:()=>assert.fail('saved damage must not reroll')});
   assert.deepEqual(replay.data.damage_result,first.request.data.damage_result);
   const second=strikeAdversary(f,x,2);assert.equal(second.request.data.damage_result.marks,3);assert(!second.request.data.damage_result.defense_ref);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'adversary_defense_charge',includeGM:true}).length,1);
 }],
 ['UA8','D2','Contingency Stack does not consume its scene charge on a lesser hit',f=>{
   const x=incoming(f,{template:'Aster Vale Catastrophe Analyst'}),minor=strikeAdversary(f,x,1,{damage:1});
   assert.equal(minor.request.data.damage_result.marks,1);assert.equal(f.db.listCityRecords(f.guild,{kind:'adversary_defense_charge',includeGM:true}).length,0);
   const severe=strikeAdversary(f,x,2);assert.equal(severe.request.data.damage_result.marks,2);
 }],
 ['UA8','D3','altered native pre-damage proof cannot certify or refresh an already consumed scene defense',async f=>{
   const x=incoming(f,{template:'Aster Vale Catastrophe Analyst'}),first=strikeAdversary(f,x,1),
     {inspectAdversaryDamageDefense}=await import('../src/native-feature-damage.js'),ref=first.request.data.damage_result.defense_ref,
     receipt=f.db.getCityRecord(f.guild,'adversary_defense_receipt',ref),before=f.db.listCombatants(f.db.getCurrentEncounter(f.session.id).id)[0].hp_current;
   assert.equal(inspectAdversaryDamageDefense(f.db,f.guild,first.request).record_key,ref);
   f.db.saveCityRecord(f.guild,{...receipt,key:ref,data:{...receipt.data,marks_after:1}});
   assert.throws(()=>inspectAdversaryDamageDefense(f.db,f.guild,first.request));
   assert.equal(f.db.listCombatants(f.db.getCurrentEncounter(f.session.id).id)[0].hp_current,before);
   const second=strikeAdversary(f,x,2);assert.equal(second.request.data.damage_result.marks,3);
 }],
 ...['proxy','unbound'].map(mode=>['UA8',`D4-${mode}`,'pre-damage automatic AI defense requires actual unproxied bound actor '+mode,f=>{
   const x=incoming(f,{template:'Aster Vale Catastrophe Analyst'}),encounter=f.db.getCurrentEncounter(f.session.id);
   if(mode==='proxy')f.db.upsertNpcProxy(f.guild,f.session.id,{npcName:'guard',userId:f.pcs[1].owner_user_id,status:'active'});
   else{const b=f.db.getCityRecord(f.guild,'encounter_binding',encounter.id);f.db.saveCityRecord(f.guild,{...b,key:b.record_key,data:{combatants:[]}});}
   const result=strikeAdversary(f,x,1);assert.equal(result.request.data.damage_result.marks,3);assert(!result.request.data.damage_result.defense_ref);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'adversary_defense_charge',includeGM:true}).length,0);
 }]),
 ['UA8','D5','source retraction holds defense presentation without undoing damage or restoring its scene charge',async f=>{
   const x=incoming(f,{template:'Aster Vale Catastrophe Analyst'}),first=strikeAdversary(f,x,1),{inspectAdversaryDamageDefense}=await import('../src/native-feature-damage.js'),
     receipt=f.db.getCityRecord(f.guild,'adversary_defense_receipt',first.request.data.damage_result.defense_ref),hp=f.db.listCombatants(f.db.getCurrentEncounter(f.session.id).id)[0].hp_current;
   indexWorldEvent(f.db,f.guild,{key:receipt.source_event,status:'retracted'},'gm');
   assert.throws(()=>inspectAdversaryDamageDefense(f.db,f.guild,first.request));f.restart();
   assert.equal(f.db.listCombatants(f.db.getCurrentEncounter(f.session.id).id)[0].hp_current,hp);
   const second=strikeAdversary(f,x,2);assert.equal(second.request.data.damage_result.marks,3);
 }],
 ['UA8','D6','Contingency Stack preserves Critical dice and never resurrects an NPC at last HP',f=>{
   const x=incoming(f,{template:'Aster Vale Catastrophe Analyst'}),target=f.db.listCombatants(f.db.getCurrentEncounter(f.session.id).id)[0];
   f.db.updateCombatant(target.id,{hp_current:1});const result=strikeAdversary(f,x,1,{critical:true});
   assert.equal(result.request.data.result.duality,'Critical');assert.equal(result.request.data.damage.total,200);
   assert.equal(result.request.data.damage_result.marks,2);assert.equal(result.request.data.damage_result.after,0);
   const saved=f.db.listCombatants(f.db.getCurrentEncounter(f.session.id).id)[0];assert.equal(saved.status,'defeated');
   assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);
 }],
 ['UA8','F5','a disabled Feedback device cannot acquire another native use completion without reset proof',async f=>{
   const x=await feedbackScenario(f),invitation=x.invites[0],pc=f.db.getCharacter(x.pc.id),terms=inspectGmReactionInvitation(f.db,f.guild,pc.owner_user_id,invitation.record_key).terms,
     input={op:'gm-reaction-roll',request:invitation.record_key,revision:terms.revision};let face=0;
   submitGmReactionInvitation(f.db,f.guild,pc.owner_user_id,input,{interactionId:'feedback-before-reuse',authoredText:JSON.stringify(input),rng:()=>[1,2][face++]});
   const text='I use my phone again.',messageId='feedback-disabled-use';captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,messageId,text);
   const rows=persistPlayerIntents(f.db,f.guild,[{...candidate(text).player_intents[0],type:'interact',operation:'use_device',target_key:'phone',resolution:'auto'}],x.scope,{messageId}),
     origin=createArbitrationOrigin(f.db,f.guild,x.scope,worldInputKey(messageId,pc.id)),board=buildSceneIntentBoard(f.db,f.guild,origin,rows,[]),
     [held]=adjudicateSceneBoard(f.db,f.guild,origin,board,[decision('player:0','no_roll')]);
   assert.equal(held.status,'needs_rules_review');assert.equal(held.data.native,null);assert.equal(f.db.getCharacter(pc.id).data.resources.stress.current,3);
   assert.equal(f.db.getCityRecord(f.guild,'typed_intent',rows[0].record_key).status,'accepted_for_adjudication');
   assert.equal(f.db.listCityRecords(f.guild,{kind:'action_outcome_receipt',includeGM:true}).filter(r=>r.data.action_id===rows[0].record_key).length,0);
 }],
 ['UA8','T2','native feature backlog cannot hide an older live window behind the database page cap',async f=>{
   const x=await featureScenario(f),{featureWindowChoices}=await import('../src/native-feature-windows.js');
   for(let i=0;i<102;i++)f.db.saveCityRecord(f.guild,{kind:'native_feature_window',key:`untrusted-backlog-${i}`,source_event:x.sourceRef,
     status:'pending',visibility:'gm',data:{phase:'on_scene_event',receipt:`untrusted-${i}`,audience:{visibility:'gm',subject:null}}});
   assert(featureWindowChoices(f.db,f.guild,x.scope).some(w=>w.trigger_ref===x.w.record_key));
 }],
 ['UA8','T1','feature reaction does not consume the first normal GM spotlight or charge its sibling Fear',async f=>{
   const x=await featureScenario(f,{looking:true,extraNpc:true}),p={...decision(x.board.data.entries[2].intent_ref,'request_pc_reaction_roll'),
     rule_basis_refs:['srd:reaction-rolls'],trait:'Instinct',difficulty:12,stakes:'Attempt only.',difficulty_reason:'A local NPC attempt.'},
     rows=adjudicateSceneBoard(f.db,f.guild,x.origin,x.board,[x.p,p],{library:x.library});
   assert.equal(rows[0].status,'gm_action_ready');assert.equal(rows[1].status,'pending_pc_reaction');
   const effects=executeUnifiedGmActions(f.db,f.guild,rows,{library:x.library,rng:()=>assert.fail('no PC dice')});
   assert.equal(effects[0].kind,'gm_feature_use_receipt');assert.equal(effects[1].kind,'gm_action_cost_receipt');
   assert.equal(effects[1].data.ordinal,0);assert.equal(effects[1].data.amount,0);assert.equal(f.db.getCampaign(f.guild).fear,0);
 }],
 ...[0,1,3].map(allies=>['UA8',`P${allies}`,'Pack Pressure native ally count '+allies+' has bounded modifier and actual Evasion result',f=>{
   const x=incoming(f,{template:'Pale Court Thrall',allies}),expected=2+Math.min(2,allies);assert.equal(x.row.data.offer.bonus,expected);
   assert(!JSON.stringify(x.row.data.offer).includes('ally-'));assert(f.db.listCityRecords(f.guild,{kind:'npc_passive_proof',includeGM:true}).every(r=>r.visibility==='gm'));
   let calls=0;const roll=rollIncomingAttack(f.db,f.guild,'gm',x.row.record_key,{gm:true,library:x.library,rng:()=>[8,1][calls++]});
   assert.equal(roll.data.total,8+expected);assert.equal(roll.data.hit,allies>=2);assert.equal(calls,allies>=2?2:1);
   assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);
   if(allies>=2){const effect=resolveIncomingDamage(f.db,f.guild,x.pc.owner_user_id,x.row.record_key,{armor:false,library:x.library});
     assert.equal(effect.data.hp_marks,1);f.db.setSimulationEntity(f.guild,'npc','ally-0',{location_key:'elsewhere'});
     assert.equal(validateIncomingDamageApplication(f.db,f.guild,effect.record_key).record_key,effect.record_key);assert.equal(calls,2);}
 }]),
 ['UA8','P4','ally movement after native attack offer invalidates passive proof before RNG',f=>{
   const x=incoming(f,{template:'Pale Court Thrall',allies:2}),before=structuredClone(f.db.getCharacter(x.pc.id).data.resources);
   assert.equal(x.row.data.offer.bonus,4);f.db.setSimulationEntity(f.guild,'npc','ally-0',{location_key:'elsewhere'});
   assert.throws(()=>rollIncomingAttack(f.db,f.guild,'gm',x.row.record_key,{gm:true,library:x.library,rng:()=>assert.fail('no stale passive RNG')}));
   assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);
 }],
 ['UA8','P5','missing GM-internal passive proof cannot authorize a bonus roll or PC effect',f=>{
   const x=incoming(f,{template:'Pale Court Thrall',allies:2}),proof=f.db.listCityRecords(f.guild,{kind:'npc_passive_proof',includeGM:true})[0];
   f.db.saveCityRecord(f.guild,{...proof,key:proof.record_key,status:'held'});
   assert.throws(()=>rollIncomingAttack(f.db,f.guild,'gm',x.row.record_key,{gm:true,library:x.library,rng:()=>assert.fail('no uncertified bonus RNG')}));
   assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);assert.equal(f.db.getCampaign(f.guild).fear,0);
 }],
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
   const rows=compileNativeFeatures();assert.equal(rows.length,153);assert.equal(new Set(rows.map(r=>r.feature_key)).size,153);
   assert.equal(rows.filter(r=>r.actor_kind==='adversary').length,105);assert.equal(rows.filter(r=>r.actor_kind==='environment').length,48);
   assert.equal(new Set(rows.filter(r=>r.actor_kind==='adversary').map(r=>r.actor_name)).size,41);
   assert.equal(new Set(rows.filter(r=>r.actor_kind==='environment').map(r=>r.actor_name)).size,16);
   for(const r of rows){assert.match(r.source_hash,/^[a-f0-9]{64}$/);assert.match(r.template_hash,/^[a-f0-9]{64}$/);
     assert(Object.isFrozen(r));assert.equal(featureDisposition(r.feature_key).status,r.native_handler?'supported':'needs_rules_review');}
   assert.deepEqual(rows.filter(r=>r.native_handler).map(r=>r.feature_key),['adversary:pale-court-thrall:pack-pressure',FLASH,'adversary:static-wraith:feedback','adversary:choir-relay:local-mesh','adversary:pale-court-knight:blood-rush',VOLLEY,LANES,'adversary:wraith-pack:many-deaths','adversary:green-root-host:horde-3d8-8','adversary:aster-vale-catastrophe-analyst:contingency-stack']);
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
 ['UA8','S1','owner Signal taxonomy classifies exactly eight source-pinned templates without changing feature proof',async()=>{
   const {compileNativeActors,compileNativeFeatures,nativeActorTaxonomy}=await import('../src/native-feature-catalog.js'),before=hash(compileNativeFeatures()),actors=compileNativeActors(),
     expected=['Static Wraith','Choir Relay','Morrowline Echo','Traffic Saint','Choir Junction Intelligence','Morrowline Matured','Citywide Choir','Choir Storm Node'];
   assert.equal(actors.length,57);assert.deepEqual(actors.filter(a=>a.signal_based).map(a=>a.actor_name).sort(),expected.sort());
   const library=new EncounterLibrary('../content');
   for(const name of expected){const template=library.findAdversary(name),a=nativeActorTaxonomy('adversary',template);
     assert.equal(a.signal_based,true);assert.equal(a.template_hash,hash(template));assert.equal(a.taxonomy_ruling,'owner:signal-taxonomy:v1');
     assert(Object.isFrozen(a));assert.throws(()=>{a.signal_based=false;},TypeError);}
   assert(Object.isFrozen(actors));assert.equal(hash(compileNativeFeatures()),before);
 }],
 ['UA8','S2','technological equipment and electrical portrayal do not confer Signal classification',async f=>{
   const {compileNativeActors,nativeActorTaxonomy}=await import('../src/native-feature-catalog.js'),library=new EncounterLibrary('../content'),
     excluded=['Aster Vale Forecast Engine','Aster Vale Catastrophe Analyst','Aster Vale Occult Analyst','Ritual Enforcement Team','Blacksite Null Team','Civic Null Operative','Wraith Pack'],
     before=structuredClone(f.db.getCharacter(f.pcs[0].id).data.resources),fear=f.db.getCampaign(f.guild).fear;
   for(const name of excluded)assert.equal(nativeActorTaxonomy('adversary',library.findAdversary(name)).signal_based,false,name);
   assert(compileNativeActors().filter(a=>a.actor_kind==='environment').every(a=>a.signal_based===false));
   assert.deepEqual(f.db.getCharacter(f.pcs[0].id).data.resources,before);assert.equal(f.db.getCampaign(f.guild).fear,fear);
   assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_action_cost_receipt',includeGM:true}).length,0);
 }],
 ['UA8','S3','Signal metadata cannot be supplied by model flags names changed stats or narrative keywords',async()=>{
   const {compileNativeActors,nativeActorTaxonomy}=await import('../src/native-feature-catalog.js'),library=new EncounterLibrary('../content'),
     wraith=library.findAdversary('Static Wraith'),pack=library.findAdversary('Wraith Pack');
   for(const forged of [undefined,null,[],'Static Wraith',{name:'Static Wraith',signal_based:true},{...pack,signal_based:true},{...pack,name:'Static Wraith'},
     {...wraith,attack:'+99'},{...pack,description:'Explicit Signal-based network intelligence.'}])assert.throws(()=>nativeActorTaxonomy('adversary',forged),/source/);
   assert.throws(()=>nativeActorTaxonomy('environment',wraith),/source/);
   const adversaries=JSON.parse(fs.readFileSync('../content/GM_PRIVATE/ADVERSARIES/adversaries.json','utf8'));
   adversaries.find(a=>a.name==='Static Wraith').signal_based=true;
   assert.throws(()=>compileNativeActors({adversaries}),/source/);
 }],
 ['UA8','S4','Local Mesh and Route Around share one necessary-only Signal taxonomy gate',async()=>{
   const {nativeSignalFeatureTarget,compileNativeActors}=await import('../src/native-feature-catalog.js'),library=new EncounterLibrary('../content');
   for(const actor of compileNativeActors().filter(a=>a.actor_kind==='adversary')){
     const template=library.findAdversary(actor.actor_name),mesh=nativeSignalFeatureTarget('adversary:choir-relay:local-mesh',template),
       route=nativeSignalFeatureTarget('adversary:choir-relay:route-around',template);
     assert.deepEqual(mesh.target,route.target);assert.equal(mesh.target.signal_based,actor.signal_based);
     for(const proof of [mesh,route]){assert(Object.isFrozen(proof));assert.deepEqual(Object.keys(proof).sort(),['feature_hash','feature_key','target']);
       assert(!Object.hasOwn(proof,'allied'));assert(!Object.hasOwn(proof,'powered'));assert(!Object.hasOwn(proof,'authorized'));}
   }
   assert.throws(()=>nativeSignalFeatureTarget('model:route-around',library.findAdversary('Static Wraith')),/source/);
 }],
 ['UA6','04','registered unmapped and unregistered feature proposals remain private holds with no costs or dice',async f=>{
   const {compileNativeFeatures}=await import('../src/native-feature-catalog.js');
   const feature=compileNativeFeatures().find(r=>r.actor_name==='Aster Vale Contractor'&&r.name==='Flashbang');
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
