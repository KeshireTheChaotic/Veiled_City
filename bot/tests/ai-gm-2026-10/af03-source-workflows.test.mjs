import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createDefensiveFeatureRules} from '../../src/frameworks/daggerheart/defensive-feature-rules.js';
import {createEnvironmentOddsContract} from '../../src/frameworks/daggerheart/environment-odds-contract.js';
import {createEnvironmentAccessRules} from '../../src/frameworks/daggerheart/environment-access-rules.js';
import {createEnvironmentArrivalRules} from '../../src/frameworks/daggerheart/environment-arrival-rules.js';
import {createEnvironmentDoorChainRules} from '../../src/frameworks/daggerheart/environment-door-chain-rules.js';
import {nativeStore} from './af03-store.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const definitions=read('../../src/frameworks/daggerheart/native-feature-definitions.json').features;
const actors=read('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json');
const errata=read('../../src/frameworks/daggerheart/native-house-errata.json').entries;
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail=message=>Object.assign(new Error(message),{code:'GM_ARBITRATION'}),noop=()=>null;
const feature=suffix=>definitions.find(f=>f.feature_key.endsWith(suffix));

for(const suffix of [':stack-formation',':plausible-denial',':consensus-pressure'])test(`${suffix} current proof and saved native Difficulty remain stable after HP/Exposure changes`,()=>{
  const store=nativeStore(),{db,indexWorldEvent}=store;
  try{
    const f=feature(suffix),template=actors.find(a=>a.name===f.actor_name),target={id:'npc',encounter_id:'enc',difficulty:template.difficulty,hp_current:template.hp,hp_max:template.hp},
      presence={source_event:'presence',location_key:'place',data:{state:'actually_present',scene:'scene',zone:'same'}},recipient={actor:'npc',scene:'scene',session:'session',
        encounter:'enc',combatant:target,template,presence},input={character_id:'pc',source_event:'declaration',attack_source:'weapon'};
    let exposure=1;
    db.getCharacter=()=>({id:'pc',guild_id:'g',data:{location:'place'}});db.listCombatants=()=>[target];
    db.getCampaign=()=>({fear:6,veil_exposure:exposure});
    db.saveCityRecord('g',{kind:'encounter_binding',key:'enc',source_event:'binding',data:{combatants:[{actor:'npc',id:'npc'}]}});
    for(const key of ['presence','binding'])indexWorldEvent(db,'g',{key});
    class Library{findAdversary(){return template;}}
    const rules=createDefensiveFeatureRules({capabilities:{compileNativeFeatures:()=>definitions,
      compileNativeActors:()=>[{template_hash:f.template_hash,actor_kind:'adversary',actor_name:f.actor_name}],nativeSignalFeatureTarget:noop,nativeEncounterActor:()=>recipient,
      nativeNpcAlliance:noop,inspectNativeNpcAllianceReceipt:noop,sceneAccess:()=>true,currentScene:()=>({key:'scene',session_id:'session'}),scenePresence:()=>presence,
      activeCityProxy:()=>false,EncounterLibrary:Library,nativeHouseErratum:noop,indexWorldEvent}});
    const proof=suffix===':stack-formation'?rules.nativeFormationDefense(db,'g',target,input):rules.nativeVeilExposureDefense(db,'g',target,input);
    const bonus=suffix===':consensus-pressure'?2:1;assert.equal(proof.detail.bonus,bonus);
    const request={subject_key:'pc',source_event:'declaration',data:{input,session_id:'session',scene:'scene',breakdown:{attack:{encounter_id:'enc',target_id:'npc',
      base_difficulty:template.difficulty,difficulty:template.difficulty+bonus,defense_passive:proof.proof}}}};
    rules.persistNativeFormationDefense(db,'g',request);
    const saved=rules.inspectNativeFormationDefense(db,'g',request);assert.equal(saved.data.bonus,bonus);assert.equal(saved.visibility,'gm');
    target.hp_current=1;exposure=6;assert.equal(rules.inspectNativeFormationDefense(db,'g',request).data.bonus,bonus);
    assert.throws(()=>rules.inspectNativeFormationDefense(db,'g',{...request,subject_key:'other'}),/ancestry/);
  }finally{store.close();}
});

test('Local Mesh remains nonstacking and keeps exact alliance and historical aura receipts',()=>{
  const store=nativeStore(),{db,indexWorldEvent}=store;
  try{
    const f=feature(':local-mesh'),template=actors.find(a=>a.name===f.actor_name),target={id:'receiver',encounter_id:'enc',difficulty:template.difficulty},
      pres={source_event:'presence',location_key:'place',data:{state:'actually_present',zone:'same'}},
      recipient={actor:'receiver',scene:'scene',session:'session',combatant:target,template,presence:pres},input={character_id:'pc',source_event:'declaration',attack_source:'weapon'};
    const alliance=actor=>({record_key:`alliance:${actor}`,data:{receipt:`receipt:${actor}`}});
    db.listCombatants=()=>[target];
    db.saveCityRecord('g',{kind:'encounter_binding',key:'enc',data:{combatants:['receiver','relay1','relay2'].map(actor=>({actor,id:actor}))}});
    const rules=createDefensiveFeatureRules({capabilities:{compileNativeFeatures:()=>definitions,compileNativeActors:()=>[{template_hash:f.template_hash,signal_based:true}],
      nativeSignalFeatureTarget:()=>({target:{signal_based:true}}),nativeEncounterActor:(db,g,actor)=>actor==='receiver'?recipient:{...recipient,actor,combatant:{id:actor}},
      nativeNpcAlliance:(db,g,enc,actor,other)=>alliance(other),inspectNativeNpcAllianceReceipt:(db,g,key)=>({data:{plan:{encounter:'enc',state:'allied',actor:'receiver',targets:[{actor:key.slice('receipt:'.length)}]}}}),
      sceneAccess:()=>true,currentScene:noop,scenePresence:noop,activeCityProxy:()=>false,EncounterLibrary:class{},
      nativeHouseErratum:(id,v)=>errata.find(e=>e.id===id&&e.version===v),indexWorldEvent}});
    const proof=rules.nativeDefenseAura(db,'g',target,input);assert.equal(proof.detail.bonus,1);assert.equal(proof.detail.contributors.length,2);
    const request={subject_key:'pc',source_event:'declaration',data:{input,scene:'scene',session_id:'session',breakdown:{attack:{target_id:'receiver',encounter_id:'enc',
      base_difficulty:template.difficulty,difficulty:template.difficulty+1,defense_aura:proof.proof}}}};
    rules.persistNativeDefenseAura(db,'g',request);assert.equal(rules.inspectNativeDefenseAura(db,'g',request).data.bonus,1);
    assert.throws(()=>rules.inspectNativeDefenseAura(db,'g',{...request,subject_key:'other'}),/ancestry/);
  }finally{store.close();}
});

for(const [suffix,kind] of [[':too-loud-to-think','disadvantage'],[':local-memory','advantage']])test(`${suffix} preserves scoped pre-roll modifier evidence without granting dice or payment`,()=>{
  const f=feature(suffix),profile={record_key:'profile',data:{template_hash:f.template_hash,session:'s',scene:'scene'}},
    action={record_key:'action',data:{actor:'pc',session_id:'s',scene:'scene'}},entry={intent_ref:'action',actor:{type:'character',key:'pc'}},
    proposal={feature_ref:f.feature_key,disposition:'request_pc_action_roll',stakes_kind:'attempt_only',advantage:kind==='advantage',disadvantage:kind==='disadvantage',
      experience_ref:null,reason:'Exact contextual relevance',rule_basis_refs:['srd:action-rolls']};
  const rules=createEnvironmentOddsContract({hash,fail});
  const result=rules.validateEnvironmentOddsProposal({feature:f,profile,entry,action,proposal,kind});
  assert.equal(result.amount,1);assert.equal(result.feature_hash,hash(f));assert.equal(result.action,'action');
  assert.throws(()=>rules.validateEnvironmentOddsProposal({feature:f,profile,entry,action,proposal:{...proposal,advantage:!proposal.advantage},kind}),/required/);
});

test('VIP admission retains owner credential proof and historical native receipts without moving the PC',()=>{
  const store=nativeStore(),{db,indexWorldEvent}=store;
  try{
    const f=feature(':vip-threshold'),scope={actorUserId:'owner',actorCharacterId:'pc',mode:'private'},
      profile={record_key:'profile',data:{template_hash:f.template_hash,location:'place',session:'s',scene:'scene'}},pc={id:'pc',owner_user_id:'owner',data:{location:'place'}},
      destination={state:{parent_location_key:'place',access:'private'}},credential={fact:{provenance_json:JSON.stringify({access_grant:{character:'pc',destination:'floor',method:'invitation'}})},ruling:{event_key:'source'}};
    db.getCharacter=()=>pc;db.getSimulationEntity=()=>destination;
    const rules=createEnvironmentAccessRules({capabilities:{inspectNativeEnvironmentInstance:()=>profile,featureDisposition:()=>({status:'supported',feature:f}),
      ordinaryActionProof:noop,ordinaryPrerequisite:noop,captureCountdownActionAncestry:noop,inspectCountdownActionAncestry:noop,nativeEstablishedFact:()=>credential,
      conversationPrincipal:()=>({kind:'owner',revision:'r'}),currentScene:()=>({key:'scene',session_id:'s'}),stateRevision:hash,hash,indexWorldEvent,fail}});
    const input={accepted_intent:'',credential:'invitation',destination:'floor',environment:'profile',method:'invitation',prerequisite:''};
    const receipt=rules.establishEnvironmentAdmission(db,'g',input,scope);assert.equal(pc.data.location,'place');
    assert.equal(rules.establishEnvironmentAdmission(db,'g',input,scope).record_key,receipt.record_key);
    assert.equal(rules.inspectEnvironmentAdmission(db,'g',receipt.record_key,scope).visibility,'gm');
    assert.throws(()=>rules.inspectEnvironmentAdmission(db,'g',receipt.record_key,{...scope,actorUserId:'other'}),/receipt_required/);
    assert.throws(()=>rules.establishEnvironmentAdmission(db,'g',{...input,method:'forged'},scope),/closed_admission/);
  }finally{store.close();}
});

for(const door of [false,true])test(`${door?'Door Chain':'Sirens Outside'} creates only its bounded ordinary identity and replays native receipts`,()=>{
  const store=nativeStore(),{db,indexWorldEvent}=store;
  try{
    const f=feature(door?':door-chain':':sirens-outside'),scope={mode:'private',actorUserId:'owner',actorCharacterId:'pc'},
      binding={source:'input',session:'s',scene:'scene',location:'place'},origin={binding,scope},
      profile={record_key:'profile',data:{environment:'apartment-veil-breach',template_hash:f.template_hash,scene:'scene',session:'s',location:'place'}},
      board=db.saveCityRecord('g',{kind:'scene_intent_board',key:'board',data:{origin:binding}}),npc={kind:'npc',key:'new-resident',name:'Resident',aliases:[],
        parent_location_key:'',location_key:'place',role:door?'resident':'authority',summary:'An ordinary local person.'};
    const presenceSource=indexWorldEvent(db,'g',{key:'presence'});indexWorldEvent(db,'g',{key:'input'});
    db.getNpcProfile=()=>null;db.getSimulationEntity=()=>({state:{location_key:'place'}});
    const establishNarrativeEntity=(db,g,npc)=>db.saveCityRecord(g,{kind:'autonomous_entity',key:`npc:${npc.key}`,source_event:presenceSource.event_key,data:npc});
    const caps={inspectArbitrationOrigin:()=>origin,buildNarrativeContext:()=>({}),inspectNativeEnvironmentInstance:()=>profile,
      featureDisposition:()=>({status:'supported',feature:f}),nativeGmOpportunity:()=>({key:'opportunity'}),reservedCampaignFear:()=>0,establishNarrativeEntity,
      worldIdentityOrigin:()=>({version:1,identity_hash:hash(npc)}),indexWorldEvent,hash,fail,assertEnvironmentAudience:(db,g,saved,current)=>{if(hash(saved)!==hash(current))throw fail('audience');},
      environmentProposalContract:()=>({handler:f.native_handler}),worldAuthority:()=>({gm_authority_mode:'autonomous'}),currentScene:()=>({key:'scene',session_id:'s'}),
      scenePresence:()=>({source_event:'presence',location_key:'place',data:{state:'actually_present',scene:'scene'}}),narrativeSourceVisible:()=>true};
    const rules=door?createEnvironmentDoorChainRules({capabilities:caps}):createEnvironmentArrivalRules({capabilities:caps}),
      input={version:1,feature_ref:f.feature_key,environment:'profile',npc,...(!door?{category:'authority'}:{})},options={content:{read:()=>''}},
      apply=door?rules.applyEnvironmentDoorChain:rules.applyEnvironmentArrival,inspect=door?rules.inspectEnvironmentDoorChain:rules.inspectEnvironmentArrival;
    const receipt=apply(db,'g',{},board,input,options);assert.equal(db.getCampaign('g').fear,door?6:5);
    assert.equal(inspect(db,'g',receipt.record_key,scope).record_key,receipt.record_key);
    assert.equal(apply(db,'g',{},board,input,options).record_key,receipt.record_key);assert.equal(db.getCampaign('g').fear,door?6:5);
    assert.throws(()=>inspect(db,'g',receipt.record_key,{...scope,actorCharacterId:'other'}),/audience/);
    assert.equal(receipt.data.cost.npc_stress,0);
  }finally{store.close();}
});
