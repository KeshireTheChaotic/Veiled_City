/** W6 native capture fixtures; authored but NOT RUN before the full phase freeze. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup} from './narrative-fixtures.mjs';
import {actionFixture} from './v96-action-fixture.mjs';
import {indexWorldEvent} from '../src/city-calendar.js';
import {recordScenePresence} from '../src/scene-continuity.js';
import {createNativeEnvironmentRecording,inspectNativeEnvironmentRecording} from '../src/native-environment-recording.js';
import {handleCommand} from '../src/commands.js';
const changes=f=>f.db.db.prepare('SELECT total_changes() n').get().n;
function fixture(f){
  const x=setup(f,{privateScene:true,text:'I examine the accessible local equipment.',messageId:'recording-fixture'});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,authoring:true}});
  f.db.setSimulationEntity(f.guild,'location','external-store',{name:'External file store',visibility:'party'});
  f.db.updateCharacterData(x.pc.id,d=>{d.inventory=[{id:'camera',name:'Explicitly mapped video recorder',category:'electronic_device',
    equipped:true,recording:{video:true,upload:true}}];});
  const source=indexWorldEvent(f.db,f.guild,{key:'recordable-hazard',kind:'observation',title:'A visible non-PC local hazard',source_id:'human_gm',
    session_id:f.session.id,scene:x.sourceRef&&f.db.getWorldEvent(f.guild,x.sourceRef).scene,location_key:'terminal',visibility:'character',subject_key:x.pc.id},'human_gm'),
    target=recordScenePresence(f.db,f.guild,{entity_type:'hazard',entity_key:'visible-hazard',location_key:'terminal',zone:'interior',
      visibility:'character',subject_key:x.pc.id,source_event:source.event_key},'human_gm'),
    a=actionFixture(f,'I record the visible hazard using my equipped video recorder.',{privateScene:true});
  Object.assign(a.intent,{operation:'record_video',target_key:'visible-hazard',resolution:'auto'});
  Object.assign(a.ruling,{disposition:'narrative_no_roll',trait:null,difficulty:null,risk:'none',stakes:'none',
    explanation:'The camera is explicitly mapped and the non-PC subject is accessible; no character response or hidden detail is captured.',
    difficulty_reason:'No consequential uncertainty in this ordinary recording.'});
  const result=a.run(),action=result.typedIntents.find(r=>r.data.operation==='record_video'),
    input={op:'recording-upload',accepted_intent:action.record_key,prerequisite:action.data.outcome_receipt,device:'camera',
      target:target.record_key,destination:'external-store'};
  return {...x,a,action,target,input};
}
const capture=(f,x,input=x.input,user=x.pc.owner_user_id)=>createNativeEnvironmentRecording(f.db,f.guild,user,input,
  {interactionId:'synthetic-recording-owner',authoredText:JSON.stringify(input)});
test('native owner choice creates an actual video artifact once, without resource, custody, knowledge or PC effects',()=>nativeFixture(f=>{
  const x=fixture(f),pcs=f.pcs.map(pc=>f.db.getCharacter(pc.id)),row=capture(f,x),handout=f.db.getHandout(row.data.handout.id);
  assert.equal(handout.kind,'video');assert.equal(handout.visibility,'character');assert.equal(handout.subject_character_id,x.pc.id);
  assert.equal(handout.metadata.recording.clarity,'clear');assert.equal(handout.metadata.recording.upload,'pending');
  assert.deepEqual(handout.canonical_facts,[]);assert.equal(handout.metadata.evidence,undefined);
  assert.equal(row.data.knowledge_authorized,false);assert.equal(row.data.pc_effect_authorized,false);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id)),pcs);
  const before=changes(f);assert.deepEqual(capture(f,x),row);assert.equal(changes(f),before);
  f.db.endSession(f.guild,'');f.restart();const restarted=changes(f);
  assert.deepEqual(inspectNativeEnvironmentRecording(f.db,f.guild,row.record_key,x.pc.owner_user_id),row);assert.equal(changes(f),restarted);
}));
for(const negative of ['foreign_owner','fake_outcome','unmapped_device','pc_subject','extra_role'])test(`recording rejects ${negative} without footage`,()=>nativeFixture(f=>{
  const x=fixture(f),input=structuredClone(x.input);let user=x.pc.owner_user_id;
  if(negative==='foreign_owner')user=f.pcs[1].owner_user_id;
  if(negative==='fake_outcome')input.prerequisite='model-success';
  if(negative==='unmapped_device')f.db.updateCharacterData(x.pc.id,d=>{delete d.inventory[0].recording;});
  if(negative==='pc_subject')input.target=x.pc.id;
  if(negative==='extra_role')input.gm=true;
  const before=changes(f);assert.throws(()=>capture(f,x,input,user));assert.equal(changes(f),before);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'native_environment_recording',includeGM:true}).length,0);
}));
test('real owner command returns reference-safe private status, not a public artifact or a replayed native action',()=>nativeFixture(async f=>{
  const x=fixture(f),replies=[],interaction={id:'recording-command',guildId:f.guild,guild:{id:f.guild},user:{id:x.pc.owner_user_id,username:'Owner'},
    commandName:'vc-roll',isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,memberPermissions:{has:()=>false},
    options:{getSubcommand:()=> 'window',getSubcommandGroup:()=>null,getString:k=>k==='json'?JSON.stringify(x.input):null},
    reply:async p=>replies.push(p),deferReply:async()=>{},editReply:async p=>replies.push(p),followUp:async p=>replies.push(p)};
  await handleCommand(interaction,{db:f.db,gm:{}});
  assert(replies.length>0);assert.equal(f.db.listCityRecords(f.guild,{kind:'native_environment_recording',includeGM:true}).length,1);
  assert.equal(f.db.getCurrentEncounter(f.session.id),null);
}));
