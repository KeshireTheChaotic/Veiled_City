import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createWorldIdentityRules,indexWorldEvent} from '../../src/frameworks/world/public.js';
import {jsonHash as hash} from '../../src/kernel/json-hash.js';
import {configureSimulationEntity} from '../../src/simulation.js';
import {validateMinorIdentity} from '../../src/city-depth.js';
import {BACKGROUND_WORLD_KINDS,validateBackgroundIdentity} from '../../src/world-background-identities.js';
import {assertIndependentWorldIdentity,assertWorldIdentityNames} from '../../src/world-authorship.js';
import * as original from '../../src/autonomous-world.js';

function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'rf04-world-identities-')),file=join(dir,'identities.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema),scene='camera-scene',proxy=false,presenceFailure=false,verificationCalls=0;
 db.ensureCampaign('g');db.setCityCalendar('g',{flags:{narrative_authority:true}});const pc=db.createCharacter('g','owner','Traveller');db.setSimulationEntity('g','location','harbor',{name:'Harbor'});
 indexWorldEvent(db,'g',{key:'camera-source',kind:'native_gm_camera',title:'Native GM camera fixture',source_id:'native:camera'});indexWorldEvent(db,'g',{key:'private-seed',kind:'native_gm_hook_seed',title:'Private seed fixture',source_id:'native:fixture',visibility:'gm'});
 const frames=new WeakMap(),presence=[];const fail=message=>{throw Object.assign(Error(message),{code:'AUTONOMOUS_WORLD'});};
 const api=createWorldIdentityRules({BACKGROUND_WORLD_KINDS,configureSimulationEntity,validateMinorIdentity,validateBackgroundIdentity,assertIndependentWorldIdentity,assertWorldIdentityNames,
  verifiedWorldAuthoringContext(database,g,frame){verificationCalls++;const f=frames.get(frame);if(database!==db||g!=='g'||!f)throw Object.assign(Error('unregistered test camera'),{code:'SCENE_FICTION'});return {...f,context:{...f.context,source:db.getWorldEvent(g,f.context.binding.source)}};},
  currentScene:()=>({key:scene}),privateWorldIdentityForGm:()=>true,worldIdentityOrigin:()=>true,activeCityProxy:()=>proxy?{discord_user_id:'human'}:null,stateRevision:r=>r?hash(r):'absent',fail,
  recordScenePresence(database,g,value){if(presenceFailure)throw Error('injected scene presence failure');presence.push(value);return value;}
 });
 const frame=(scope={mode:'party'},seed=null)=>{const token=Object.freeze({});frames.set(token,{audience_ref:'audience-v9:test-only',context:{binding:{source:'camera-source',guild:'g',scene:'camera-scene',session:null,location:'harbor'},scope},...(seed?{private_seed:{source_ref:'private-seed',seed_hash:hash(seed),hook_id:'hook',character_id:pc.id,owner_user_id:'owner'}}:{})});return token;};
 const input=(kind='location',key='lantern-court')=>({kind,key,name:kind==='npc'?'Lantern Keeper':'Lantern Court',summary:'A courtyard with a repair stall and an ordinary open conversation.',aliases:[],location_key:kind==='npc'?'harbor':'',parent_location_key:kind==='location'?'harbor':'',role:kind==='npc'?'repairer':'courtyard'});
 const content={read:()=>''};t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});return {get db(){return db;},pc,api,frame,input,content,presence,verificationCalls:()=>verificationCalls,setScene:v=>scene=v,setProxy:v=>proxy=v,setPresenceFailure:v=>presenceFailure=v,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('inert World factory preserves autonomous defaults and closed human configuration without campaign time change',t=>{
 const f=fixture(t);assert.equal(f.verificationCalls(),0);assert.equal(f.api.worldAuthority(f.db,'g').gm_authority_mode,'autonomous');assert.equal(f.api.worldAuthority(f.db,'g').auto_create_npcs,true);assert.throws(()=>f.api.configureWorldAuthority(f.db,'g',{model:'downgrade'},'owner'),/Closed GM authority/);
 const row=f.api.configureWorldAuthority(f.db,'g',{auto_create_npcs:false},'human');assert.equal(row.data.auto_create_npcs,false);assert.equal(f.db.getSimulationClock('g').minute,0);assert.equal(f.verificationCalls(),0);assert.deepEqual(original.worldAuthority(f.db,'g'),f.api.worldAuthority(f.db,'g'));
});

test('trusted non-player camera capability can create ordinary World fiction without fabricating PC input or movement',t=>{
 const f=fixture(t),before=f.db.getCharacter(f.pc.id),row=f.api.establishNarrativeEntity(f.db,'g',f.input(),f.frame(),{content:f.content});assert.equal(row.visibility,'party');assert.equal(row.data.authority,'ordinary_GM_fiction_not_PC_effect');assert.equal(row.data.narrative_origin,'camera-source');const entity=f.db.getSimulationEntity('g','location','lantern-court');assert.equal(entity.state.access,'public');assert.equal(entity.state.parent_location_key,'harbor');assert.equal(f.db.getWorldEvent('g',row.source_event).details.no_pc_movement,true);assert.deepEqual(f.db.getCharacter(f.pc.id),before);assert.equal(f.db.getWorldEvent('g','camera-source').kind,'native_gm_camera');
});

test('creation receipt replays unchanged across reopen; altered definition cannot reuse it',t=>{
 const f=fixture(t),input=f.input(),row=f.api.establishNarrativeEntity(f.db,'g',input,f.frame(),{content:f.content});f.reopen();assert.deepEqual(f.api.establishNarrativeEntity(f.db,'g',input,f.frame(),{content:f.content}),row);assert.throws(()=>f.api.establishNarrativeEntity(f.db,'g',{...input,summary:'Changed after commit'},f.frame(),{content:f.content}),/replay is immutable/);assert.deepEqual(f.db.getCityRecord('g','autonomous_entity','location:lantern-court'),row);
});

test('character-private fiction keeps its matching subject on entity, source and reference',t=>{
 const f=fixture(t),scope={mode:'private',actorCharacterId:f.pc.id,actorUserId:'owner'},row=f.api.establishNarrativeEntity(f.db,'g',f.input(),f.frame(scope),{content:f.content});assert.equal(row.visibility,'character');assert.equal(row.subject_key,f.pc.id);const event=f.db.getWorldEvent('g',row.source_event),ref=f.db.getReference('g','location','lantern-court');assert.equal(event.visibility,'character');assert.equal(event.subject_key,f.pc.id);assert.equal(ref.visibility,'character');assert.equal(ref.subject_character_id,f.pc.id);assert.equal(f.db.getCharacter(f.pc.id).data.location,undefined);
});

test('private-seed identity remains hidden GM-only even when the frame has a player-private audience',t=>{
 const f=fixture(t),row=f.api.establishNarrativeEntity(f.db,'g',f.input(),f.frame({mode:'private',actorCharacterId:f.pc.id,actorUserId:'owner'},{fixture:'opaque source attestation'}),{content:f.content});const entity=f.db.getSimulationEntity('g','location','lantern-court'),source=f.db.getWorldEvent('g',row.source_event),ref=f.db.getReference('g','location','lantern-court');assert.equal(row.visibility,'gm');assert.equal(row.subject_key,null);assert.equal(entity.state.hidden,true);assert.equal(source.visibility,'gm');assert.equal(source.details.authorship_version,2);assert.equal(ref.visibility,'gm');assert.equal(f.db.getNpcKnowledge('g','invented','private-seed'),undefined);
});

test('protected PC identity and packaged NPC identity cannot be replaced by ordinary invention',t=>{
 const f=fixture(t);assert.throws(()=>f.api.establishNarrativeEntity(f.db,'g',{...f.input(),name:'Traveller'},f.frame(),{content:f.content}),e=>e.code==='SCENE_FICTION');const input={...f.input('npc','oracle'),name:'Known Oracle'},content={read:path=>path==='GM_PRIVATE/NPCS/npcs.json'?JSON.stringify([{name:'Known Oracle'}]):''};assert.throws(()=>f.api.establishNarrativeEntity(f.db,'g',input,f.frame(),{content}),e=>e.code==='AUTONOMOUS_WORLD');assert.equal(f.db.getNpcProfile('g','oracle'),null);assert.equal(f.db.getCityRecord('g','autonomous_entity','npc:oracle'),null);assert.equal(f.db.listSimulationEntities('g','location').length,1);
});

test('unregistered context, changed scene, manual policy and retracted source hold before identity writes',t=>{
 const f=fixture(t);assert.throws(()=>f.api.establishNarrativeEntity(f.db,'g',f.input(),{},{}),/unregistered test camera/);f.setScene('later');assert.throws(()=>f.api.establishNarrativeEntity(f.db,'g',f.input(),f.frame(),{}),/authority is unavailable/);f.setScene('camera-scene');f.api.configureWorldAuthority(f.db,'g',{gm_authority_mode:'manual'},'human');assert.throws(()=>f.api.establishNarrativeEntity(f.db,'g',f.input(),f.frame(),{}),/authority is unavailable/);f.api.configureWorldAuthority(f.db,'g',{gm_authority_mode:'autonomous'},'human');indexWorldEvent(f.db,'g',{key:'camera-source',status:'retracted'});assert.throws(()=>f.api.establishNarrativeEntity(f.db,'g',f.input(),f.frame(),{}),/authority is unavailable/);assert.equal(f.db.getCityRecord('g','autonomous_entity','location:lantern-court'),null);
});

test('ordinary NPC creation records no PC presence and grants no secret knowledge or spendable initial resources',t=>{
 const f=fixture(t),before=f.db.getCharacter(f.pc.id),row=f.api.establishNarrativeEntity(f.db,'g',f.input('npc','keeper'),f.frame(),{content:f.content});assert.equal(row.data.kind,'npc');const state=f.db.getSimulationEntity('g','npc','keeper').state;assert.equal(state.location_key,'harbor');assert.ok(Object.values(state.resources).every(n=>n===0));assert.equal(f.db.getNpcProfile('g','keeper').activity_tier,'background');assert.equal(f.presence.length,1);assert.equal(f.presence[0].entity_type,'npc');assert.equal(f.presence[0].entity_key,'keeper');assert.deepEqual(f.db.getCharacter(f.pc.id),before);
});

test('NPC can inhabit the same-source newly authored local setting; unrelated offcamera position is held',t=>{
 const f=fixture(t),frame=f.frame();f.api.establishNarrativeEntity(f.db,'g',f.input(),frame,{content:f.content});assert.doesNotThrow(()=>f.api.establishNarrativeEntity(f.db,'g',{...f.input('npc','keeper'),location_key:'lantern-court'},frame,{content:f.content}));f.db.setSimulationEntity('g','location','remote',{name:'Remote Site'});assert.throws(()=>f.api.establishNarrativeEntity(f.db,'g',{...f.input('npc','remote-person'),name:'Remote Messenger',location_key:'remote'},frame,{content:f.content}),/offscene NPC presence/);assert.equal(f.db.getNpcProfile('g','remote-person'),null);
});

test('scene-presence callback failure rolls source, profile, entity and receipt back before a clean retry',t=>{
 const f=fixture(t),input=f.input('npc','keeper'),frame=f.frame();f.setPresenceFailure(true);assert.throws(()=>f.api.establishNarrativeEntity(f.db,'g',input,frame,{content:f.content}),/injected scene presence failure/);assert.equal(f.db.getNpcProfile('g','keeper'),null);assert.equal(f.db.getSimulationEntity('g','npc','keeper'),null);assert.equal(f.db.getCityRecord('g','autonomous_entity','npc:keeper'),null);assert.equal(f.db.worldEventsAfter('g').filter(e=>e.kind==='native_narrative_entity').length,0);f.setPresenceFailure(false);assert.equal(f.api.establishNarrativeEntity(f.db,'g',input,frame,{content:f.content}).status,'active');assert.equal(f.db.worldEventsAfter('g').filter(e=>e.kind==='native_narrative_entity').length,1);
});

test('background faction identity remains only a background reference, without actor ownership, resources or knowledge',t=>{
 const f=fixture(t),input={...f.input('faction','brass-circle'),name:'Brass Circle',location_key:'',parent_location_key:''};const row=f.api.establishNarrativeEntity(f.db,'g',input,f.frame(),{content:f.content});assert.equal(row.data.identity_layer,'background_only');assert.equal(row.data.anchor_location,'harbor');assert.equal(row.location_key,'');assert.equal(f.db.getSimulationEntity('g','faction','brass-circle'),null);assert.equal(f.db.getReference('g','faction','brass-circle'),undefined);assert.equal(f.presence.length,0);
});

test('human retcon is revision-bound, preserves private audience and correction history, and leaves PC state unchanged',t=>{
 const f=fixture(t),scope={mode:'private',actorCharacterId:f.pc.id,actorUserId:'owner'},row=f.api.establishNarrativeEntity(f.db,'g',f.input(),f.frame(scope),{content:f.content}),before=f.db.getCharacter(f.pc.id);const input={op:'retcon',kind:'location',key:'lantern-court',summary:'A covered courtyard, as corrected by the human GM.',reason:'The current description was mistaken.',expected_revision:hash(row)};
 const after=f.api.retconAutonomousEntity(f.db,'g',input,'human');assert.equal(after.data.corrections.length,1);assert.equal(after.data.corrections[0].previous_summary,row.data.summary);assert.equal(after.visibility,'character');assert.equal(after.subject_key,f.pc.id);assert.equal(f.db.getReference('g','location','lantern-court').visibility,'character');assert.deepEqual(f.db.getCharacter(f.pc.id),before);assert.throws(()=>f.api.retconAutonomousEntity(f.db,'g',input,'human'),/Current autonomous entity revision/);
});

test('current human proxy retains portrayal control and retcon audit failure rolls all description changes back',t=>{
 const f=fixture(t),row=f.api.establishNarrativeEntity(f.db,'g',f.input('npc','keeper'),f.frame(),{content:f.content}),input={op:'retcon',kind:'npc',key:'keeper',summary:'A corrected portrayal.',reason:'Human correction',expected_revision:hash(row)};f.setProxy(true);assert.throws(()=>f.api.retconAutonomousEntity(f.db,'g',input,'human'),/Human-controlled NPC/);f.setProxy(false);const profile=f.db.getNpcProfile('g','keeper'),ref=f.db.getReference('g','npc','keeper'),recordMutation=f.db.recordMutation;f.db.recordMutation=()=>{throw Error('injected retcon audit failure');};assert.throws(()=>f.api.retconAutonomousEntity(f.db,'g',input,'human'),/injected retcon audit failure/);f.db.recordMutation=recordMutation;assert.deepEqual(f.db.getNpcProfile('g','keeper'),profile);assert.deepEqual(f.db.getReference('g','npc','keeper'),ref);assert.deepEqual(f.db.getCityRecord('g','autonomous_entity','npc:keeper'),row);
});

test('actual original provider rejects fabricated narrative context and still reaches moved human configuration',t=>{
 const f=fixture(t);assert.throws(()=>original.establishNarrativeEntity(f.db,'g',f.input(),{authorized:true,scope:{mode:'party'}},{content:f.content}),e=>e.code==='SCENE_FICTION');assert.equal(f.db.getCityRecord('g','autonomous_entity','location:lantern-court'),null);assert.equal(original.configureWorldAuthority(f.db,'g',{auto_create_locations:false},'human').data.auto_create_locations,false);
});
