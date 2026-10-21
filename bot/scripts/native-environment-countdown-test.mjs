/** W6 construction acceptance fixtures. Authored only; DO NOT RUN until the complete framework freeze. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,candidate} from './narrative-fixtures.mjs';
import {actionFixture} from './v96-action-fixture.mjs';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {establishNativeEnvironmentInstance} from '../src/native-environment-instance.js';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {createArbitrationOrigin,buildSceneIntentBoard} from '../src/scene-intent-board.js';
import {featureDisposition} from '../src/native-feature-catalog.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {worldInputKey} from '../src/autonomous-world.js';
import {sceneFictionHash as hash} from '../src/scene-fiction-context.js';
import {establishEnvironmentUploadRecording,startEnvironmentUploadCountdown,advanceEnvironmentUploadCountdown,
  adjustEnvironmentUploadCountdown,inspectEnvironmentCountdown,environmentCountdownProjection,environmentUploadState,
  captureCountdownActionAncestry,inspectCountdownActionAncestry,closingTimeMovesReadiness} from '../src/native-environment-countdown.js';
const FEATURE='environment:apartment-veil-breach:upload-in-progress';
const writes=f=>f.db.db.prepare('SELECT total_changes() n').get().n;
function fixture(f,{register=true}={}){
  // No catalog injection or test-only authority. Acceptance depends on real qualification after construction.
  assert.equal(featureDisposition(FEATURE).status,'supported');
  const x=setup(f,{privateScene:true,text:'What is happening in the apartment building?',messageId:'upload-start'});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,authoring:true}});
  f.db.changeFear(f.guild,4-f.db.getCampaign(f.guild).fear);
  f.db.setSimulationEntity(f.guild,'location','external-upload-route',{name:'Established external network destination',visibility:'gm'});
  const profile=establishNativeEnvironmentInstance(f.db,f.guild,buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),
    {version:1,environment:'environment:apartment-veil-breach',location:'terminal'}),
    [accepted]=persistPlayerIntents(f.db,f.guild,candidate(x.text).player_intents,x.scope,{messageId:x.messageId}),
    origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),board=buildSceneIntentBoard(f.db,f.guild,origin,[accepted],[]),
    handout=f.db.createHandout(f.guild,{sessionId:f.session.id,title:'Existing clear hallway recording',kind:'video',locationKey:'terminal',
      source:'human_gm',visibility:'character',subjectCharacterId:x.pc.id,content:'Existing recorded hallway footage.',
      metadata:{recording:{clarity:'clear',upload:'pending',destination:'external-upload-route',source_event:'existing-upload-recording'}}}),
    mutation=f.db.recordMutation(f.guild,{sessionId:f.session.id,actorType:'human_gm',actorId:'human_gm',sourceLayer:'state',
      mutationType:'handout',entityKey:handout.id,visibility:'character',after:handout}),
    creation=indexWorldEvent(f.db,f.guild,{key:'original-recording-created',kind:'handout',title:'Native existing video artifact',
      source_kind:'mutation',source_id:mutation.id,session_id:f.session.id,scene:profile.data.scene,location_key:'terminal',
      visibility:'character',subject_key:x.pc.id,details:{payload_hash:hash(handout)}},'human_gm'),
    registration={environment:profile.record_key,handout:handout.id,creation_source:creation.event_key},
    input={version:1,feature_ref:FEATURE,environment:profile.record_key,handout:handout.id};
  if(register)establishEnvironmentUploadRecording(f.db,f.guild,origin,board,registration);
  return {...x,profile,accepted,origin,board,handout,creation,registration,input};
}
function ownerBeat(f,x,index,{operation='use_device',target=x.handout.id,run=true}={}){
  const a=actionFixture(f,operation==='tick_back_upload'?`I interrupt this upload and tick its progress back, attempt ${index}.`
    :operation==='redirect_upload'?`I divert this upload away from its external route, attempt ${index}.`
      :`I inspect the hallway as the upload advances through fictional beat ${index}.`,{privateScene:true});
  Object.assign(a.intent,{operation,target_key:target,target_name:'Existing recording',resolution:'auto'});
  Object.assign(a.ruling,{disposition:'narrative_no_roll',trait:null,difficulty:null,risk:'none',stakes:'none',
    explanation:'The declared ordinary task is feasible against the established visible recording; no hidden capability or PC response is inferred.',
    difficulty_reason:'Contextual native mundane ruling, not a model-authored outcome.'});
  if(!run)return {a};
  const result=a.run(),accepted=result.typedIntents.find(r=>r.data.operation===operation),
    actual=f.db.getCityRecord(f.guild,'typed_intent',accepted.record_key),sourceRef=worldInputKey(a.messageId,a.pc.id),
    origin=createArbitrationOrigin(f.db,f.guild,x.scope,sourceRef),board=buildSceneIntentBoard(f.db,f.guild,origin,[actual],[]);
  return {a,accepted:actual,origin,board,advance:{countdown:x.root.record_key,beat_kind:'owner_action',beat_ref:actual.data.outcome_receipt,
    accepted_intent:actual.record_key,ruling:`This actual completed local exchange is fictional upload beat ${index}; advance exactly one step.`},
    adjust:{countdown:x.root.record_key,accepted_intent:actual.record_key,prerequisite:actual.data.outcome_receipt,
      ruling:'The actual successful relevant declared action changes this exact upload.'}};
}
function started(f){const x=fixture(f);x.root=startEnvironmentUploadCountdown(f.db,f.guild,x.origin,x.board,x.input);return x;}
test('actual clear recording starts a four-step native clock for exactly one Fear and survives restart',()=>nativeFixture(f=>{
  const x=fixture(f),pcs=f.pcs.map(pc=>f.db.getCharacter(pc.id)),fear=f.db.getCampaign(f.guild).fear,
    row=startEnvironmentUploadCountdown(f.db,f.guild,x.origin,x.board,x.input);
  assert.equal(f.db.getCampaign(f.guild).fear,fear-1);assert.equal(row.data.max,4);assert.equal(row.data.value,0);
  assert.equal(f.db.getClock(f.guild,row.data.clock).max_value,4);assert.equal(f.db.getClock(f.guild,row.data.clock).visibility,'gm');
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id)),pcs);
  const before=writes(f);assert.deepEqual(startEnvironmentUploadCountdown(f.db,f.guild,x.origin,x.board,x.input),row);assert.equal(writes(f),before);
  f.restart();const restarted=writes(f);assert.equal(inspectEnvironmentCountdown(f.db,f.guild,row.record_key,x.scope,{current:true}).value,0);
  const origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef);
  assert.deepEqual(startEnvironmentUploadCountdown(f.db,f.guild,origin,x.board,x.input),row);assert.equal(writes(f),restarted);
}));
test('four unique actual native beats complete once; retry and restart cannot double tick or charge',()=>nativeFixture(f=>{
  const x=started(f),fear=f.db.getCampaign(f.guild).fear;
  for(let n=1;n<=4;n++){
    const b=ownerBeat(f,x,n),row=advanceEnvironmentUploadCountdown(f.db,f.guild,b.origin,b.board,b.advance),before=writes(f);
    assert.equal(row.data.value,n);assert.deepEqual(advanceEnvironmentUploadCountdown(f.db,f.guild,b.origin,b.board,b.advance),row);assert.equal(writes(f),before);
    f.restart();assert.equal(inspectEnvironmentCountdown(f.db,f.guild,x.root.record_key,x.scope,{current:true}).value,n);
  }
  const state=environmentUploadState(f.db,f.guild,x.profile.record_key,x.handout.id,x.scope);
  assert.equal(state.state,'left_building');assert.equal(state.footage_left_building,true);assert.equal(state.knowledge_authorized,false);
  assert.equal(f.db.getCampaign(f.guild).fear,fear);assert.match(environmentCountdownProjection(f.db,f.guild,x.root.record_key,x.scope).text,/left the building/);
  const fifth=ownerBeat(f,x,5),before=writes(f);assert.throws(()=>advanceEnvironmentUploadCountdown(f.db,f.guild,fifth.origin,fifth.board,fifth.advance));
  assert.equal(writes(f),before);
}));
test('native successful owner action ticks back or redirects without choosing PC action, costs, recipient or custody',()=>nativeFixture(f=>{
  const x=started(f),one=ownerBeat(f,x,1);advanceEnvironmentUploadCountdown(f.db,f.guild,one.origin,one.board,one.advance);
  const back=ownerBeat(f,x,2,{operation:'tick_back_upload'}),beforePc=f.db.getCharacter(x.pc.id),fear=f.db.getCampaign(f.guild).fear,
    receipt=adjustEnvironmentUploadCountdown(f.db,f.guild,back.origin,back.board,back.adjust);
  assert.equal(receipt.data.value,0);assert.deepEqual(f.db.getCharacter(x.pc.id),beforePc);assert.equal(f.db.getCampaign(f.guild).fear,fear);
  const replay=writes(f);assert.deepEqual(adjustEnvironmentUploadCountdown(f.db,f.guild,back.origin,back.board,back.adjust),receipt);assert.equal(writes(f),replay);
  const redirect=ownerBeat(f,x,3,{operation:'redirect_upload'}),row=adjustEnvironmentUploadCountdown(f.db,f.guild,redirect.origin,redirect.board,redirect.adjust);
  assert.equal(row.data.state,'redirected');assert.deepEqual(f.db.getHandout(x.handout.id),x.handout);
  f.restart();assert.equal(inspectEnvironmentCountdown(f.db,f.guild,x.root.record_key,x.scope).state,'redirected');
}));
test('saved owner-beat ancestry remains read-only after scene changes and does not supply a new current authority',()=>nativeFixture(f=>{
  const x=started(f),b=ownerBeat(f,x,1),snapshot=captureCountdownActionAncestry(f.db,f.guild,b.accepted.record_key,x.scope);
  advanceEnvironmentUploadCountdown(f.db,f.guild,b.origin,b.board,b.advance);
  f.db.setDirectorState(f.session.id,{scene_number:f.db.getDirectorState(f.session.id).scene_number+1});f.restart();
  const before=writes(f);assert.deepEqual(inspectCountdownActionAncestry(f.db,f.guild,snapshot),snapshot);
  assert.equal(inspectEnvironmentCountdown(f.db,f.guild,x.root.record_key,x.scope).value,1);
  assert.throws(()=>environmentCountdownProjection(f.db,f.guild,x.root.record_key,x.scope));assert.equal(writes(f),before);
}));
for(const change of ['unregistered-recording','forged-origin','wrong-profile','extra-role','insufficient-fear'])
test(`upload start holds ${change} without partial cost or clock`,()=>nativeFixture(f=>{
  const x=fixture(f,{register:change!=='unregistered-recording'}),input=structuredClone(x.input);
  if(change==='wrong-profile')input.feature_ref='environment:abandoned-mall-glass-market:closing-time-moves';
  if(change==='extra-role')input.gm=true;
  if(change==='insufficient-fear')f.db.changeFear(f.guild,-f.db.getCampaign(f.guild).fear);
  const before=writes(f),fear=f.db.getCampaign(f.guild).fear;
  assert.throws(()=>startEnvironmentUploadCountdown(f.db,f.guild,change==='forged-origin'?{gm:true}:x.origin,x.board,input));
  assert.equal(writes(f),before);assert.equal(f.db.getCampaign(f.guild).fear,fear);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'native_environment_countdown',includeGM:true}).length,0);
}));
for(const change of ['model-tick','simulation-clock','wrong-owner','wrong-target','same-occurrence-different-mode'])
test(`upload progression holds ${change} without new effects`,()=>nativeFixture(f=>{
  const x=started(f),b=ownerBeat(f,x,1,{operation:change==='same-occurrence-different-mode'?'tick_back_upload':'use_device',
    target:change==='wrong-target'?'unrelated-artifact':x.handout.id});
  if(change==='same-occurrence-different-mode')advanceEnvironmentUploadCountdown(f.db,f.guild,b.origin,b.board,b.advance);
  const input=structuredClone(b.advance);
  if(change==='model-tick'){input.beat_kind='model';input.tick=true;}
  if(change==='simulation-clock'){input.beat_kind='simulation_clock';input.beat_ref='1';}
  const before=writes(f);
  if(['wrong-owner','wrong-target','same-occurrence-different-mode'].includes(change)){
    const origin=change==='wrong-owner'?{scope:{...x.scope,actorUserId:f.pcs[1].owner_user_id}}:b.origin;
    assert.throws(()=>adjustEnvironmentUploadCountdown(f.db,f.guild,origin,b.board,b.adjust));
  }else assert.throws(()=>advanceEnvironmentUploadCountdown(f.db,f.guild,b.origin,b.board,input));
  assert.equal(writes(f),before);
}));
test('source revocation holds current and saved readers while preserving clock, cost and committed history',()=>nativeFixture(f=>{
  const x=started(f),b=ownerBeat(f,x,1),step=advanceEnvironmentUploadCountdown(f.db,f.guild,b.origin,b.board,b.advance),
    fear=f.db.getCampaign(f.guild).fear,clock=f.db.getClock(f.guild,x.root.data.clock),recorded=f.db.getWorldEvent(f.guild,x.creation.event_key);
  indexWorldEvent(f.db,f.guild,{...recorded,key:recorded.event_key,status:'retracted'},'human_gm');
  f.restart();const before=writes(f);assert.throws(()=>inspectEnvironmentCountdown(f.db,f.guild,x.root.record_key,x.scope));
  assert.throws(()=>environmentCountdownProjection(f.db,f.guild,x.root.record_key,x.scope));assert.equal(writes(f),before);
  assert.equal(f.db.getCampaign(f.guild).fear,fear);assert.deepEqual(f.db.getClock(f.guild,x.root.data.clock),clock);
  assert.deepEqual(f.db.getCityRecord(f.guild,'native_environment_countdown_step',step.record_key),step);
}));
test('Closing Time is an exact internal implementation hold with no PC relocation or payment',()=>{
  const r=closingTimeMovesReadiness();assert.equal(r.status,'held');assert.match(r.reason,/INTERNAL_IMPLEMENTATION_REQUIRED/);
  assert.equal(r.fear_spent,0);assert.equal(r.pc_relocation_authorized,false);
});
