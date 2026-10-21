/** W6 construction acceptance fixtures; intentionally NOT RUN before the complete phase freeze. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,candidate} from './narrative-fixtures.mjs';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {establishNativeEnvironmentInstance} from '../src/native-environment-instance.js';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {createArbitrationOrigin,buildSceneIntentBoard,bindArbitrationTurn} from '../src/scene-intent-board.js';
import {applyEnvironmentSceneAction,inspectEnvironmentSceneEffect,environmentSceneProjection} from '../src/native-environment-scene.js';
import {applyUnifiedArbitration} from '../src/gm-unified-arbitration.js';
import {prepareAuthorizedTurnOutput} from '../src/pvp-output.js';
import {queueTurnPublications,deliverTurnOutbox} from '../src/publication-outbox.js';
import {featureDisposition} from '../src/native-feature-catalog.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {recordCharacterArrival} from '../src/scene-continuity.js';
import {actionFixture} from './v96-action-fixture.mjs';
import {resolveNativeEnvironmentEvent,inspectNativeEnvironmentResolution} from '../src/native-environment-recovery.js';
import {applyOrdinaryEffects} from '../src/ordinary-effects.js';
const MEDICAL='environment:after-hours-emergency-department:code-blue',CORRECTION='environment:veil-anchor-chamber:automatic-correction';
const changes=f=>f.db.db.prepare('SELECT total_changes() n').get().n;
function fixture(f,feature=MEDICAL,{privateScene=true}={}){
  assert.equal(featureDisposition(feature).status,'supported');
  const x=setup(f,{privateScene,text:'What is happening here?',messageId:`environment-scene-${feature}`});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,authoring:true,gm_discretion:true}});
  f.db.changeFear(f.guild,3-f.db.getCampaign(f.guild).fear);
  const environment=feature.slice(0,feature.lastIndexOf(':')),
    profile=establishNativeEnvironmentInstance(f.db,f.guild,buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),{version:1,environment,location:'terminal'}),
    [action]=persistPlayerIntents(f.db,f.guild,candidate(x.text).player_intents,x.scope,{messageId:x.messageId}),
    origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),board=buildSceneIntentBoard(f.db,f.guild,origin,[action],[]),
    detail=feature===MEDICAL?{kind:'medical_emergency',category:'medical',property:'',service:'',value:''}
      :{kind:'mundane_detail',category:'',property:'lighting',service:'',value:'dim'};
  return {...x,profile,action,origin,board,proposal:{version:1,feature_ref:feature,environment:profile.record_key,detail}};
}
for(const feature of [MEDICAL,CORRECTION])test(`${feature} commits native scene state once, without PC state or rolls`,()=>nativeFixture(f=>{
  const x=fixture(f,feature),pcs=f.pcs.map(pc=>f.db.getCharacter(pc.id)),fear=f.db.getCampaign(f.guild).fear,
    row=applyEnvironmentSceneAction(f.db,f.guild,x.origin,x.board,x.proposal),spent=feature===CORRECTION?1:0;
  assert.equal(row.status,'resolved');assert.equal(row.visibility,'character');assert.equal(row.subject_key,x.pc.id);
  assert.equal(row.data.fear.spent,spent);assert.equal(f.db.getCampaign(f.guild).fear,fear-spent);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id)),pcs);assert.equal(f.db.getCurrentEncounter(f.session.id),null);
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM rolls WHERE guild_id=?').get(f.guild).n,0);
  assert.equal(Boolean(row.data.presence),feature===MEDICAL);
  const written=changes(f);assert.deepEqual(applyEnvironmentSceneAction(f.db,f.guild,x.origin,x.board,x.proposal),row);assert.equal(changes(f),written);
  f.restart();const restarted=changes(f);assert.deepEqual(inspectEnvironmentSceneEffect(f.db,f.guild,row.record_key,x.scope),row);assert.equal(changes(f),restarted);
}));
test('combined producer to real outbox publishes native complication, not untrusted PC injury or a private staff secret',()=>nativeFixture(async f=>{
  const x=fixture(f),result=bindArbitrationTurn({...candidate(x.text),narration:'Choso accepts treatment and is badly hurt.',unified_arbitration:{version:5,
    npc_intents:[],decisions:[],pre_roll_fear:[],environment_profiles:[],environment_actions:[x.proposal]}},x.origin);
  applyUnifiedArbitration(f.db,f.guild,result,[x.action]);
  prepareAuthorizedTurnOutput(f.db,f.guild,result,x.scope,{sourceRef:x.sourceRef});
  const turn=f.db.beginTurnAttempt({guildId:f.guild,sessionId:f.session.id,messageId:x.messageId,actorPrincipal:x.pc.owner_user_id,audience:'private'});
  queueTurnPublications(f.db,{guild:{id:f.guild},session:f.session,result,scope:x.scope,turnId:turn.turn_id});
  const parts=f.db.listTurnPublications(f.guild,turn.turn_id);assert(parts.length>0);
  assert(parts.every(p=>p.visibility==='character'&&p.target_user_id===x.pc.owner_user_id&&p.target_character_id===x.pc.id));
  const payload=JSON.stringify(parts.map(p=>p.payload));assert.match(payload,/medical emergency/);assert.doesNotMatch(payload,/accepts treatment|badly hurt/);
  f.restart();let sends=0;const send=async()=>({id:`ack-${++sends}`,channelId:'synthetic-private'});
  await deliverTurnOutbox(f.db,f.guild,turn.turn_id,send);const delivered=sends;
  await deliverTurnOutbox(f.db,f.guild,turn.turn_id,send);assert.equal(sends,delivered);
}));
for(const change of ['extra_role','wrong_template','mechanical_detail','foreign_owner'])test(`native scene rejects ${change} without partial effects`,()=>nativeFixture(f=>{
  const x=fixture(f,CORRECTION),p=structuredClone(x.proposal);
  if(change==='extra_role')p.gm=true;
  if(change==='wrong_template')p.feature_ref=MEDICAL;
  if(change==='mechanical_detail'){p.detail.property='hp';p.detail.value='0';}
  const before=changes(f),origin=change==='foreign_owner'?{gm:true,scope:x.scope}:x.origin;
  assert.throws(()=>applyEnvironmentSceneAction(f.db,f.guild,origin,x.board,p));assert.equal(changes(f),before);
}));
test('source retraction holds stale publication but preserves native scene and cost history',()=>nativeFixture(f=>{
  const x=fixture(f,CORRECTION),row=applyEnvironmentSceneAction(f.db,f.guild,x.origin,x.board,x.proposal),fear=f.db.getCampaign(f.guild).fear,
    source=f.db.getWorldEvent(f.guild,x.sourceRef);
  indexWorldEvent(f.db,f.guild,{...source,key:source.event_key,status:'retracted'},x.pc.owner_user_id);
  const before=changes(f);assert.throws(()=>environmentSceneProjection(f.db,f.guild,row.record_key,x.scope));
  assert.equal(changes(f),before);assert.equal(f.db.getCampaign(f.guild).fear,fear);
  assert.equal(f.db.getCityRecord(f.guild,'native_environment_scene_effect',row.record_key).status,'resolved');
}));
test('a party complication is observable by a different actually present owner, never by a remote PC or a proxy',()=>nativeFixture(f=>{
  const x=fixture(f,MEDICAL,{privateScene:false}),row=applyEnvironmentSceneAction(f.db,f.guild,x.origin,x.board,x.proposal),pc=f.pcs[1],
    viewer={mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  assert.throws(()=>environmentSceneProjection(f.db,f.guild,row.record_key,viewer));
  recordCharacterArrival(f.db,f.guild,pc,pc.owner_user_id,'second-observer-arrival');
  const before=changes(f);assert.match(environmentSceneProjection(f.db,f.guild,row.record_key,viewer).text,/medical emergency/);
  assert.equal(changes(f),before);
  assert.throws(()=>environmentSceneProjection(f.db,f.guild,row.record_key,{...viewer,actorUserId:f.pcs[2].owner_user_id}));
}));
test('an entitled local observer cannot promote a character-private native environmental complication to another PC or party',()=>nativeFixture(f=>{
  const x=fixture(f),row=applyEnvironmentSceneAction(f.db,f.guild,x.origin,x.board,x.proposal),pc=f.pcs[1];
  recordCharacterArrival(f.db,f.guild,pc,pc.owner_user_id,'private-negative-observer');
  const before=changes(f);
  for(const viewer of [{...x.scope,mode:'party'},{mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id}])
    assert.throws(()=>environmentSceneProjection(f.db,f.guild,row.record_key,viewer));
  assert.equal(changes(f),before);
}));
function resolve(f,x,original,{run=true}={}){
  const a=actionFixture(f,'I address this local medical emergency with the available ordinary assistance.',{privateScene:true});
  Object.assign(a.intent,{operation:'resolve_environment_event',target_key:original.record_key,resolution:'auto'});
  Object.assign(a.ruling,{disposition:'narrative_no_roll',trait:null,difficulty:null,risk:'none',stakes:'none',
    explanation:'The declared ordinary assistance resolves this exact bounded local complication.',difficulty_reason:'No consequential uncertainty remains in this native mundane ruling.'});
  if(!run)return {a};
  const result=a.run(),accepted=result.typedIntents.find(r=>r.data.operation==='resolve_environment_event');
  return {a,accepted:f.db.getCityRecord(f.guild,'typed_intent',accepted.record_key)};
}
test('real ordinary follow-through resolves only the targeted emergency, stays private and survives scene/session end without replay',()=>nativeFixture(f=>{
  const x=fixture(f),original=applyEnvironmentSceneAction(f.db,f.guild,x.origin,x.board,x.proposal),{a,accepted}=resolve(f,x,original),
    before=f.pcs.map(pc=>f.db.getCharacter(pc.id)),proposal={version:1,accepted_intent_ref:accepted.record_key,effect_class:'environment',
      adapter:'environment_resolve',prerequisite_ref:accepted.data.outcome_receipt,
      payload_json:JSON.stringify({when:'no_roll',environment:{effect:original.record_key}})},
    [effect]=applyOrdinaryEffects(f.db,f.guild,[proposal],a.scope,{typedIntents:[accepted]});
  assert.equal(effect.status,'applied');assert.equal(effect.visibility,'character');assert.equal(effect.subject_key,x.pc.id);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id)),before);
  const receipt=f.db.getCityRecord(f.guild,'native_environment_resolution',effect.data.native_ref);
  assert.equal(receipt.data.after.data.state,'departed');assert.throws(()=>environmentSceneProjection(f.db,f.guild,original.record_key,x.scope));
  const written=changes(f);assert.deepEqual(inspectNativeEnvironmentResolution(f.db,f.guild,receipt.record_key,a.scope),receipt);assert.equal(changes(f),written);
  f.db.endSession(f.guild,'');f.restart();const restarted=changes(f);
  assert.deepEqual(inspectNativeEnvironmentResolution(f.db,f.guild,receipt.record_key,a.scope),receipt);assert.equal(changes(f),restarted);
}));
test('an accepted-only or unrelated owner action cannot end a native emergency',()=>nativeFixture(f=>{
  const x=fixture(f),original=applyEnvironmentSceneAction(f.db,f.guild,x.origin,x.board,x.proposal),{a}=resolve(f,x,original,{run:false}),
    [accepted]=persistPlayerIntents(f.db,f.guild,[a.intent],a.scope,{messageId:a.messageId}),before=changes(f);
  assert.throws(()=>resolveNativeEnvironmentEvent(f.db,f.guild,{effect:original.record_key,accepted_intent:accepted.record_key,prerequisite:'fabricated'},a.scope));
  assert.equal(changes(f),before);assert.match(environmentSceneProjection(f.db,f.guild,original.record_key,x.scope).text,/medical emergency/);
}));
