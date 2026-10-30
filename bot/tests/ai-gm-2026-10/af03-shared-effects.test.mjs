import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {featureOperationDescriptor,requireFeatureOperation,planFeatureModifier,planFeatureRecovery} from '../../src/frameworks/daggerheart/feature-operation-descriptors.js';
import {createAdversaryAttackPassiveRules} from '../../src/frameworks/daggerheart/adversary-attack-passive-rules.js';
import {createNativeStandardDamage} from '../../src/frameworks/daggerheart/standard-damage-passives.js';
import {createDefensiveFeatureRules} from '../../src/frameworks/daggerheart/defensive-feature-rules.js';
import {createEnvironmentSceneRules} from '../../src/frameworks/daggerheart/environment-scene-rules.js';
import {nativeStore} from './af03-store.mjs';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const definitions=read('../../src/frameworks/daggerheart/native-feature-definitions.json').features;
const actors=read('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json');
const environments=read('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json');
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail=message=>Object.assign(new Error(message),{code:'GM_ARBITRATION'});
const feature=key=>definitions.find(f=>f.feature_key.endsWith(key));

test('20 declarations bind exact content/template/handler identities and reject stale or invented operations',()=>{
  const ops=read('../../src/frameworks/daggerheart/native-feature-operations.json').entries;
  assert.equal(ops.length,20);
  for(const entry of ops){
    const f=definitions.find(f=>f.feature_key===entry.feature),actor=[...actors,...environments].find(a=>a.name===f.actor_name);
    assert.equal(entry.source_hash,hash(actor.features[f.index]));assert.equal(entry.template_hash,hash(actor));
    assert.deepEqual(requireFeatureOperation(f,entry.operation.kind),entry.operation);
    for(const change of [{source_hash:'forged'},{template_hash:'forged'},{native_handler:'forged'},{status:'review_only'}])
      assert.throws(()=>requireFeatureOperation({...f,...change},entry.operation.kind),/source_changed/);
  }
  assert.equal(featureOperationDescriptor('forged'),null);
  assert.throws(()=>requireFeatureOperation(feature(':pack-pressure'),'resource_recovery'),/source_changed/);
});

test('shared modifier/recovery values preserve printed thresholds, caps and exact NPC recovery',()=>{
  assert.deepEqual([0,1,2,5].map(count=>planFeatureModifier(feature(':pack-pressure'),{count})),[0,1,2,2]);
  assert.deepEqual([0,1,5].map(count=>planFeatureModifier(feature(':local-mesh'),{count})),[0,1,1]);
  assert.deepEqual([1,3,4,6].map(value=>planFeatureModifier(feature(':stack-formation'),{value})),[0,0,1,1]);
  assert.deepEqual([0,1,2,3,4,5,6].map(value=>planFeatureModifier(feature(':plausible-denial'),{value})),[1,1,1,0,0,0,0]);
  assert.deepEqual([0,1,2,3,4,5,6].map(value=>planFeatureModifier(feature(':consensus-pressure'),{value})),[2,2,2,0,0,-1,-1]);
  for(const suffix of [':taste-the-fear',':blood-rush']){
    assert.deepEqual(planFeatureRecovery(feature(suffix),{current:2,max:3}),{before:2,after:1,delta:-1});
    assert.equal(planFeatureRecovery(feature(suffix),{current:0,max:3}).after,0);
    assert.equal(planFeatureRecovery(feature(suffix),{current:2,max:3},{eligible:false}).after,2);
  }
});

test('native standard damage keeps source-pinned condition and marked-versus-remaining HP proof payloads',()=>{
  const rules=createNativeStandardDamage({compileNativeFeatures:()=>definitions,hash,fail,nativeHouseErratum:()=>({status:'supported',interpretation:{Horde_threshold:'marked_hp_at_least_ceiling_half_max'}})});
  const executioner=actors.find(a=>a.name==='Pale Court Executioner'),host=actors.find(a=>a.name==='Green Root Host');
  const base={template:executioner,combatant:{id:'e'},damage:'2d10+8',actor:'npc',target:'pc'};
  assert.equal(rules.nativeStandardDamage({...base,conditions:[]}).expression,'2d10+8');
  const condition={condition:'Vulnerable',receipt:'sealed-proof'};
  const damage=rules.nativeStandardDamage({...base,conditions:[condition]});assert.equal(damage.expression,'2d10+10');assert.deepEqual(damage.conditions,[condition]);
  assert.throws(()=>rules.nativeStandardDamage({...base,conditions:[{condition:'prose'}]}),/condition/);
  const healthy=rules.nativeStandardDamage({template:host,combatant:{id:'h',hp_current:host.hp,hp_max:host.hp},damage:'4d8+10'});
  assert.equal(healthy.expression,'4d8+10');
  const marked=rules.nativeStandardDamage({template:host,combatant:{id:'h',hp_current:Math.floor(host.hp/2),hp_max:host.hp},damage:'4d8+10'});
  assert.equal(marked.expression,'3d8+8');assert.equal(marked.erratum,'HR11');assert.equal(marked.erratum_version,1);
});

test('Pack Pressure uses only live source-bound eligible allies and preserves evidence payload',()=>{
  const thrall=actors.find(a=>a.name==='Pale Court Thrall'),templateHash=hash(thrall),combatants=[{id:'self',base_name:thrall.name,status:'active',hp_current:1},
    ...['a','b','dead'].map(id=>({id,base_name:thrall.name,status:'active',hp_current:id==='dead'?0:1}))];
  const presence=()=>({source_event:'presence',location_key:'place',data:{state:'actually_present',zone:'same'}});
  const db={listCombatants:()=>combatants,getWorldEvent:()=>({status:'active'}),getSimulationEntity:()=>({state:{location_key:'place'}})};
  const rules=createAdversaryAttackPassiveRules({capabilities:{compileNativeFeatures:()=>definitions,scenePresence:presence,sceneAccess:()=>true,nativeHouseErratum:()=>null,activeCityProxy:()=>false}});
  const result=rules.nativeAttackPassives(db,'g',{npc:'self',combatant:combatants[0],character:'pc',encounter:{id:'enc'},
    binding:{data:{combatants:combatants.map(c=>({actor:c.id,id:c.id}))}},template:thrall,library:{findAdversary:()=>thrall}});
  assert.equal(result[0].modifier,2);assert.deepEqual(result[0].allies.map(a=>a.actor),['a','b']);
  assert.equal(result[0].template_hash,templateHash);assert.equal(result[0].feature_hash,hash(feature(':pack-pressure')));
});

for(const suffix of [':code-blue',':emergency-cascade',':maintenance-memory',':automatic-correction'])test(`native scene operation ${suffix} commits an inspectable private receipt once`,()=>{
  const store=nativeStore(),{db,indexWorldEvent}=store;
  try{
    const f=feature(suffix),scope={mode:'private',actorUserId:'owner',actorCharacterId:'pc'},binding={source:'input',scope,session:'session',scene:'scene',location:'place'},
      origin={binding,scope},profile={record_key:'profile',data:{template_hash:f.template_hash,location:'place',scene:'scene',session:'session'}},
      board=db.saveCityRecord('g',{kind:'scene_intent_board',key:'board',data:{origin:binding}}),presence=new Map();
    indexWorldEvent(db,'g',{key:'input',kind:'authored_turn'});
    const serviceSource=indexWorldEvent(db,'g',{key:'service-source'});
    db.saveCityRecord('g',{kind:'infrastructure',key:'service',status:'active',visibility:'party',source_event:serviceSource.event_key,data:{locations:['place'],service:'fire'}});
    const rules=createEnvironmentSceneRules({capabilities:{inspectArbitrationOrigin:()=>origin,inspectNativeEnvironmentInstance:()=>profile,
      featureDisposition:key=>({status:'supported',feature:definitions.find(f=>f.feature_key===key)}),nativeGmOpportunity:()=>({key:'spotlight'}),reservedCampaignFear:()=>0,
      currentScene:()=>({key:'scene',session_id:'session'}),scenePresence:(db,g,type,key)=>presence.get(key),hash,narrativeSourceVisible:()=>true,indexWorldEvent,
      assertEnvironmentAudience:(db,g,saved,current)=>{if(hash(saved)!==hash(current))throw fail('audience changed');},
      nativeEstablishedFact:()=>({fact:{content:'Established memory'},ruling:{event_key:'fact-source'}}),fail,
      recordScenePresence:(db,g,input)=>{const row={record_key:`presence:${input.entity_key}`,source_event:input.source_event,visibility:input.visibility,
        location_key:input.location_key,data:{...input,scene:'scene'}};presence.set(input.entity_key,row);return row;}}});
    const operation=requireFeatureOperation(f,'scene_event'),detail={kind:operation.effect_kind,category:'',property:'',service:'',value:''};
    if(detail.kind==='medical_emergency')detail.category='medical';
    if(detail.kind==='service_emergency'){detail.category='fire';detail.service='service';}
    if(detail.kind==='historical_memory')detail.property='established-fact';
    if(detail.kind==='mundane_detail'){detail.property='lamp color';detail.value='green';}
    const input={version:1,feature_ref:f.feature_key,environment:'profile',detail};
    const saved=rules.applyEnvironmentSceneAction(db,'g',{},board,input),fear=db.getCampaign('g').fear;
    assert.equal(saved.visibility,'character');assert.equal(saved.subject_key,'pc');assert.equal(saved.data.effect.pc_response,'unselected');
    assert.equal(fear,6-operation.fear);assert.deepEqual(rules.inspectEnvironmentSceneEffect(db,'g',saved.record_key,scope),saved);
    assert.equal(rules.applyEnvironmentSceneAction(db,'g',{},board,input).record_key,saved.record_key);assert.equal(db.getCampaign('g').fear,fear);
    assert.throws(()=>rules.inspectEnvironmentSceneEffect(db,'g',saved.record_key,{...scope,actorCharacterId:'other'}),/audience/);
    assert.throws(()=>rules.applyEnvironmentSceneAction(db,'g',{},board,{...input,detail:{...detail,value:'changed'}}),/immutable_replay/);
    assert.equal(db.getCampaign('g').fear,fear);
  }finally{store.close();}
});
