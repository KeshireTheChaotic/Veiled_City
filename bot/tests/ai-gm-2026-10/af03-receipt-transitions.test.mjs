import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createAdversaryDamageDefenseRules} from '../../src/frameworks/daggerheart/adversary-damage-defense-rules.js';
import {createStressPassiveRules} from '../../src/frameworks/daggerheart/stress-passive-rules.js';
import {createFeatureWindowRules} from '../../src/frameworks/daggerheart/feature-window-rules.js';
import {createEnvironmentCountdownRules} from '../../src/frameworks/daggerheart/environment-countdown-rules.js';
import {nativeStore} from './af03-store.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const definitions=read('../../src/frameworks/daggerheart/native-feature-definitions.json').features;
const actors=read('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json');
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),noop=()=>null;
const feature=suffix=>definitions.find(f=>f.feature_key.endsWith(suffix));

test('Contingency Stack writes its first Severe-to-Major proof once and reads its old receipt format',()=>{
  const store=nativeStore(),{db,indexWorldEvent}=store;
  try{
    const f=feature(':contingency-stack'),template=actors.find(a=>a.name===f.actor_name),target={id:'npc',base_name:f.actor_name,hp_current:template.hp,hp_max:template.hp,
      major_threshold:10,severe_threshold:20},scene={key:'scene',session_id:'s'},pc={id:'pc',owner_user_id:'owner',data:{location:'place'}};
    db.getCurrentEncounter=()=>({id:'enc',status:'active'});db.getCharacter=()=>pc;db.ownerAuthoredSource=()=>true;
    db.getSimulationEntity=()=>({state:{location_key:'place'}});
    db.saveCityRecord('g',{kind:'encounter_binding',key:'enc',source_event:'binding',data:{combatants:[{actor:'npc',id:'npc'}]}});
    for(const key of ['binding','presence'])indexWorldEvent(db,'g',{key});
    indexWorldEvent(db,'g',{key:'declaration',kind:'player_declaration',source_id:'player:owner',session_id:'s',scene:'scene',details:{author:'owner',character_id:'pc'}});
    const data={kind:'attack',character_id:'pc',owner_user_id:'owner',session_id:'s',scene:'scene',roll_id:'attack-roll',result:{total:20,duality:'Hope'},
      breakdown:{attack:{difficulty:10,encounter_id:'enc',target_id:'npc'}},input:{},damage:{roll_id:'damage-roll',total:20}};
    let request=db.saveCityRecord('g',{kind:'roll_request',key:'request',subject_key:'pc',source_event:'declaration',data});
    db.getSavedRoll=(g,id)=>id==='attack-roll'?{id,session_id:'s',payload:{request:'request',...data.result}}:
      {id,roll_type:'attack_damage',session_id:'s',character_id:'pc',discord_user_id:'owner',payload:{request:'request',total:20}};
    const rules=createAdversaryDamageDefenseRules({capabilities:{compileNativeFeatures:()=>definitions,EncounterLibrary:class{findAdversary(){return template;}},
      currentScene:()=>scene,scenePresence:()=>({source_event:'presence',location_key:'place',data:{state:'actually_present',scene:'scene'}}),activeCityProxy:()=>false,indexWorldEvent,historicalActionSource:noop}});
    const result=rules.nativeAdversaryDamageDefense(db,'g',request,data,target,{total:20,type:'magic',marks:3});
    assert.equal(result.marks,2);
    assert.equal(rules.nativeAdversaryDamageDefense(db,'g',request,data,target,{total:20,type:'magic',marks:3}),null);
    request=db.saveCityRecord('g',{...request,key:request.record_key,data:{...data,damage_result:{defense_ref:result.ref,marks:2,total:20,type:'magic',target_id:'npc',before:template.hp,after:Math.max(0,template.hp-2)}}});
    const receipt=rules.inspectAdversaryDamageDefense(db,'g',request);assert.equal(receipt.data.marks_before,3);assert.equal(receipt.data.marks_after,2);
    assert.equal(db.listCityRecords('g',{kind:'adversary_defense_charge'}).length,1);
  }finally{store.close();}
});

test('Memory Leech clears exactly one own Stress on the first verified PC mark and replays without another clear',()=>{
  const store=nativeStore(),{db,indexWorldEvent}=store;
  try{
    const f=feature(':taste-the-fear'),template=actors.find(a=>a.name===f.actor_name),scene={key:'scene',session_id:'s'};
    let combatant={id:'leech',base_name:template.name,stress_current:2,stress_max:template.stress};
    db.getCurrentEncounter=()=>({id:'enc',status:'active'});db.listCombatants=()=>[combatant];db.nativeStressMarkHistory=()=>[];
    db.getCharacter=()=>({owner_user_id:'owner',data:{location:'place'}});
    db.cityRecordSequence=(g,kind)=>kind==='gm_group_feature_effect'?10:kind==='encounter_binding'?2:3;
    db.worldEventSequence=(g,key)=>key==='cause'?10:1;
    db.updateCombatant=(id,patch)=>combatant={...combatant,...patch};
    db.saveCityRecord('g',{kind:'encounter_binding',key:'enc',status:'active',source_event:'binding',data:{combatants:[{id:'leech',actor:'leech'}]}});
    for(const key of ['binding','presence','cause'])indexWorldEvent(db,'g',{key,scene:'scene',session_id:'s'});
    const cause=db.saveCityRecord('g',{kind:'gm_group_feature_effect',key:'effect',status:'resolved',source_event:'cause',data:{character:'pc',owner:'owner',stress:1}});
    const presence={record_key:'presence',source_event:'presence',status:'active',location_key:'place',data:{state:'actually_present',scene:'scene'}};
    const rules=createStressPassiveRules({capabilities:{compileNativeFeatures:()=>definitions,currentScene:()=>scene,scenePresence:()=>presence,indexWorldEvent,
      nativeEncounterActor:()=>({combatant,template,encounter:'enc',presence}),validateGroupReactionEffect:()=>cause,validateFeatureReactionEffect:noop,
      inspectManyDeathsEffect:noop,validatedPcEffectProjection:noop,nativeActorControl:()=>({owner_control_type:'ai_world'}),assertNonPvpCombatant:noop}});
    const receipts=rules.applyNativeStressPassive(db,'g','group','effect');assert.equal(receipts[0].kind,'native_stress_passive_receipt');
    assert.equal(receipts[0].data.cleared,1);assert.equal(combatant.stress_current,1);
    assert.equal(rules.applyNativeStressPassive(db,'g','group','effect')[0].record_key,receipts[0].record_key);assert.equal(combatant.stress_current,1);
    assert.equal(rules.inspectNativeStressPassive(db,'g',receipts[0].record_key).data.mutation_after.stress_current,1);
  }finally{store.close();}
});

test('Blood Rush captures actual after-damage cause, commits recovery and preserves source/window/use replay proof',()=>{
  const store=nativeStore(),{db,indexWorldEvent}=store;
  try{
    const f=feature(':blood-rush'),template=actors.find(a=>a.name===f.actor_name),scene={key:'scene',session_id:'s'};
    let combatant={id:'knight',base_name:template.name,status:'active',hp_current:template.hp,stress_current:2,stress_max:template.stress};
    db.getCurrentEncounter=()=>({id:'enc',status:'active'});db.listCombatants=()=>[combatant];db.getNpcProfile=()=>({name:'Knight'});db.listNpcProxies=()=>[];
    db.getSimulationEntity=()=>({state:{location_key:'place'}});db.getCharacter=()=>({owner_user_id:'owner'});db.updateCombatant=(id,patch)=>combatant={...combatant,...patch};
    db.saveCityRecord('g',{kind:'encounter_binding',key:'enc',source_event:'binding',data:{combatants:[{actor:'knight',id:'knight'}]}});
    for(const key of ['binding','presence','damage-source'])indexWorldEvent(db,'g',{key,scene:'scene',session_id:'s'});
    const cause={record_key:'damage',source_event:'damage-source',visibility:'party',subject_key:'pc',data:{hp_marks:2,roll:'attack:roll'}};
    const presence={record_key:'presence',source_event:'presence',location_key:'place',data:{state:'actually_present',scene:'scene',zone:'same'}};
    let decision;
    const rules=createFeatureWindowRules({catalog:{compileNativeFeatures:()=>definitions,executableNativeFeatures:()=>[f],featureDisposition:()=>({status:'supported',feature:f})},
      sources:{currentScene:()=>scene,scenePresence:()=>presence,sceneAccess:()=>true,activeCityProxy:()=>false,indexWorldEvent,EncounterLibrary:class{findAdversary(){return template;}}},
      mechanics:{validateIncomingDamageApplication:()=>cause,incomingAttackEvidence:()=>({offer:{input:{npc:'knight'}}}),typedRollProof:noop,isPvpIntent:()=>false,
        inspectNativeGmDecision:()=>decision,nativeReactionTarget:noop,historicalActionSource:noop,assertPcCanAct:noop}});
    const windows=rules.captureIncomingFeatureWindows(db,'g','damage');assert.equal(windows.length,1);
    const origin={binding:{scene:'scene',session:'s',location:'place'},scope:{mode:'party'}},entry={actor:{type:'npc',key:'knight'},operation:'reaction',target_refs:['pc']},
      proposal={proposal_version:2,disposition:'native_feature_resolution',stakes_kind:'native_feature',experience_ref:null,advantage:false,disadvantage:false,
        trigger_ref:windows[0].record_key,trait:null,difficulty:null};
    const plan=rules.authorizeFeatureChoice(db,'g',origin,entry,proposal,f);
    decision={entry,row:{record_key:'decision',source_event:'damage-source',data:{origin:origin.binding,scope:origin.scope,proposal,native:plan}}};
    const receipt=rules.commitFeatureChoice(db,'g','decision');assert.equal(combatant.stress_current,1);
    assert.equal(receipt.data.position_choice,'retain_current_position');assert.equal(receipt.visibility,'gm');
    assert.equal(rules.commitFeatureChoice(db,'g','decision').record_key,receipt.record_key);assert.equal(combatant.stress_current,1);
    assert.equal(rules.inspectFeatureUse(db,'g',receipt.record_key).data.cost.fear,0);
  }finally{store.close();}
});

test('Upload in Progress retains native artifact proof, a four-step countdown, one Fear payment and restart receipt',()=>{
  const store=nativeStore(),{db,indexWorldEvent}=store;
  try{
    const f=feature(':upload-in-progress'),scope={mode:'private',actorUserId:'owner',actorCharacterId:'pc'},binding={source:'input',scene:'scene',session:'s',location:'place'},
      origin={binding,scope},profile={record_key:'profile',data:{template_hash:f.template_hash,location:'place',scene:'scene',session:'s'}},
      board=db.saveCityRecord('g',{kind:'scene_intent_board',key:'board',data:{origin:binding}}),clock=new Map();
    const inputSource=indexWorldEvent(db,'g',{key:'input'}),handout={id:'video',guild_id:'g',status:'active',kind:'video',location_key:'place',visibility:'party',
      metadata:{recording:{clarity:'clear',upload:'pending',destination:'outside',source_event:'recording'}}};
    const creationMutation=db.recordMutation('g',{sessionId:'s',actorType:'human',actorId:'gm',sourceLayer:'artifacts',mutationType:'handout',entityKey:'video',after:handout});
    const creation=indexWorldEvent(db,'g',{key:'creation',source_kind:'mutation',source_id:creationMutation.id});
    const artifact={...handout,metadata:{recording:{...handout.metadata.recording,source_event:null}}};
    const registration=db.recordMutation('g',{sessionId:'s',actorType:'ai_gm',actorId:'native:environment-countdown',sourceLayer:'native_environment',mutationType:'establish_recording_upload',entityKey:'video',after:artifact});
    indexWorldEvent(db,'g',{key:'recording',kind:'native_recording_upload',source_kind:'mutation',source_id:registration.id,location_key:'place',
      details:{handout_id:'video',payload_hash:hash(artifact),creation_source:creation.event_key,creation_hash:hash(creation),input_source:inputSource.event_key,input_hash:hash(inputSource)}});
    db.getHandout=()=>handout;db.getClock=(g,key)=>clock.get(key);db.changeClock=(g,key,delta,options)=>{const old=clock.get(key);clock.set(key,{value:(old?.value||0)+delta,max_value:options.max||old?.max_value,visibility:options.visibility});};
    const factory=()=>createEnvironmentCountdownRules({capabilities:{inspectArbitrationOrigin:()=>origin,inspectNativeEnvironmentInstance:()=>profile,
      featureDisposition:()=>({status:'supported',feature:f}),nativeGmOpportunity:()=>({key:'opportunity'}),reservedCampaignFear:()=>0,ordinaryActionProof:noop,
      ordinaryPrerequisite:noop,inspectEnvironmentSceneEffect:noop,narrativeSourceVisible:()=>true,currentScene:()=>({key:'scene',session_id:'s'}),indexWorldEvent,inspectNativeEnvironmentRecording:noop}});
    let rules=factory();const input={version:1,feature_ref:f.feature_key,environment:'profile',handout:'video'};
    const receipt=rules.startEnvironmentUploadCountdown(db,'g',{},board,input);assert.equal(receipt.data.max,4);assert.equal(db.getCampaign('g').fear,5);
    rules=factory();const readback=rules.inspectEnvironmentCountdown(db,'g',receipt.record_key,scope,{current:true});assert.equal(readback.value,0);assert.equal(readback.max,4);
    assert.equal(rules.startEnvironmentUploadCountdown(db,'g',{},board,input).record_key,receipt.record_key);assert.equal(db.getCampaign('g').fear,5);
    assert.throws(()=>rules.inspectEnvironmentCountdown(db,'g',receipt.record_key,{...scope,actorCharacterId:'other'}),/terms_changed/);
  }finally{store.close();}
});
