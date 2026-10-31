import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {nativeStore} from './af03-store.mjs';
import {nativeScenes} from '../../src/frameworks/daggerheart/contracts/scenes.js';
import {nativeWorldEvents} from '../../src/frameworks/daggerheart/contracts/world-events.js';
import {nativeWorldAuthoring,nativeNarrativeAudience,doorChainSituationPeer,imagingSituationPeer} from '../../src/frameworks/daggerheart/contracts/environment-sources.js';
import {establishNativeEnvironmentInstance,inspectNativeEnvironmentInstance} from '../../src/frameworks/daggerheart/native-environment-instance.js';
import {nativeEnvironmentSituation} from '../../src/frameworks/daggerheart/native-environment-scene.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),noop=()=>null;
const definitions=JSON.parse(fs.readFileSync(new URL('../../src/frameworks/daggerheart/native-feature-definitions.json',import.meta.url),'utf8')).features;
let current,scene,context,allowedFrame;
nativeScenes.bind({currentScene:()=>scene,scenePresence:noop,sceneAccess:()=>true,recordScenePresence:()=>{throw new Error('No presence write expected.');}});
nativeWorldEvents.bind({indexWorldEvent:(...args)=>current.indexWorldEvent(...args),cityAudit:noop,cityKey:v=>v,cityObject:noop});
nativeWorldAuthoring.bind({verifiedWorldAuthoringContext:(db,guild,frame)=>{
  assert.equal(frame,allowedFrame);return {context,private_seed:false};
},worldIdentityOrigin:noop});
nativeNarrativeAudience.bind({mintNarrativeAudience:ctx=>{
  const audience={guild:'g',session:ctx.binding.session,scene:ctx.binding.scene,location:ctx.binding.location,
    source_event:ctx.binding.source,source_hash:hash(current.db.getWorldEvent('g',ctx.binding.source).details),scope:ctx.scope};
  return {proof:{...audience,proof_ref:`audience-v9:${hash(audience)}`}};
},revalidateNarrativeAudience:(db,guild,audience,scope)=>{
  if(audience.scene!==scene.key||hash(scope)!==hash(context.scope))throw Object.assign(new Error('changed scope'),{code:'SCENE_FICTION'});
  return {ctx:context};
}});
doorChainSituationPeer.bind({nativeEnvironmentDoorChainSituation:()=>[]});
imagingSituationPeer.bind({nativeEnvironmentImagingSituation:()=>[]});
function fixture(){
  current=nativeStore();const {db,indexWorldEvent}=current;
  scene={key:'scene',session_id:'s'};allowedFrame=Object.freeze({opaque:true});
  db.getCityCalendar=()=>({flags:{authoring:true,gm_discretion:true}});db.getSession=()=>({guild_id:'g'});
  db.getCharacter=()=>null;
  db.saveCityRecord('g',{kind:'gm_authority',key:'campaign',data:{gm_authority_mode:'autonomous'}});
  const source=indexWorldEvent(db,'g',{key:'input',scene:'scene',session_id:'s',location_key:'here',details:{author:'owner'}});
  context={binding:{source:source.event_key,session:'s',scene:'scene',location:'here'},scope:{mode:'party'}};
  return current;
}
test('native profile receipts feed all 22 exact environment contexts through the actual scene consumer; replay makes no duplicate profile',()=>{
  const f=fixture();try{
    const groups=new Map();
    for(const feature of definitions.filter(f=>f.actor_kind==='environment'&&f.native_handler?.endsWith('_context'))){
      const key=feature.feature_key.split(':').slice(0,2).join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(feature);
    }
    let count=0,index=0;
    for(const [environment,features] of groups){
      scene={key:`scene${index++}`,session_id:'s'};context.binding.scene=scene.key;
      context.binding.source=`input:${scene.key}`;
      f.indexWorldEvent(f.db,'g',{key:context.binding.source,scene:scene.key,session_id:'s',location_key:'here',details:{author:'owner'}});
      const input={version:1,environment,location:'here'},row=establishNativeEnvironmentInstance(f.db,'g',allowedFrame,input),
        replay=establishNativeEnvironmentInstance(f.db,'g',allowedFrame,input);
      assert.equal(replay.record_key,row.record_key);assert.deepEqual(replay,row);
      const projected=nativeEnvironmentSituation(f.db,'g',context.scope,'here');assert.equal(projected.length,features.length);
      for(const feature of features){const cue=projected.find(c=>c.feature_ref===feature.feature_key);assert.ok(cue);
        assert.equal(hash(cue.text),feature.source_hash);assert.equal(cue.receipt_ref,row.record_key);
        assert.equal(cue.visibility,'gm');assert.equal(cue.execution_authorized,false);assert.equal(cue.publication_authorized,false);count++;
      }
      assert.deepEqual(nativeEnvironmentSituation(f.db,'g',{mode:'private',actorUserId:'other'},'here'),[]);
      assert.deepEqual(nativeEnvironmentSituation(f.db,'g',context.scope,'elsewhere'),[]);
      scene={key:'next-scene',session_id:'s'};
      assert.throws(()=>inspectNativeEnvironmentInstance(f.db,'g',row.record_key,context.scope),/environment_native_instance_source_owner_scene_changed/);
      assert.equal(inspectNativeEnvironmentInstance(f.db,'g',row.record_key,context.scope,{historical:true}).record_key,row.record_key);
      assert.deepEqual(nativeEnvironmentSituation(f.db,'g',context.scope,'here'),[]);
    }
    assert.equal(count,22);assert.equal(f.db.listCityRecords('g',{kind:'native_environment_instance'}).length,groups.size);
    assert.equal(f.db.listCityRecords('g',{kind:'native_environment_scene_effect'}).length,0);
  }finally{f.close();}
});
