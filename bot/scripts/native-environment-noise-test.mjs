/** W6 acceptance fixtures: authored during construction; NOT RUN before full phase freeze. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,candidate} from './narrative-fixtures.mjs';
import {actionFixture} from './v96-action-fixture.mjs';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {establishNativeEnvironmentInstance} from '../src/native-environment-instance.js';
import {clearNativeEnvironmentNoise,inspectNativeEnvironmentNoiseClear,nativeEnvironmentNoiseState} from '../src/native-environment-noise.js';
import {applyOrdinaryEffects} from '../src/ordinary-effects.js';
import {verifyOrdinaryEffect} from '../src/ordinary-effect-proof.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {featureDisposition} from '../src/native-feature-catalog.js';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {createArbitrationOrigin,buildSceneIntentBoard} from '../src/scene-intent-board.js';
import {adjudicateSceneBoard} from '../src/gm-unified-arbitration.js';
import {contributeRoll} from '../src/roll-collaboration.js';
import {rollRevision,rollBreakdown} from '../src/roll-requests.js';
import {typedRollProof} from '../src/typed-roll-proof.js';
import {inspectOrdinaryRollModifier} from '../src/native-roll-modifiers.js';
const FEATURE='environment:haunted-nightclub:too-loud-to-think';
const changes=f=>f.db.db.prepare('SELECT total_changes() n').get().n;
function scene(f){
  const x=setup(f,{privateScene:true,text:'I listen for an opening in the music.',messageId:'nightclub-source'});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,authoring:true,gm_discretion:true,roll_requests:true,roll_collaboration:true}});
  const frame=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),profile=establishNativeEnvironmentInstance(f.db,f.guild,frame,
    {version:1,environment:'environment:haunted-nightclub',location:'terminal'});
  return {...x,profile};
}
function quiet(f,x,{run=true}={}){
  const a=actionFixture(f,'I turn down the accessible sound system to quiet this environment.',{privateScene:true});
  Object.assign(a.intent,{operation:'quiet_environment',target_key:x.profile.record_key,target_name:'The sound system',resolution:'auto'});
  Object.assign(a.ruling,{disposition:'narrative_no_roll',trait:null,difficulty:null,risk:'none',stakes:'none',
    explanation:'The owner changes the accessible local environment; no resources, PC reactions or hidden device capability is granted.',
    difficulty_reason:'Native GM mundane ruling, not an automatic success inferred from prose.'});
  if(!run)return {a};
  const result=a.run(),accepted=result.typedIntents.find(r=>r.data.operation==='quiet_environment');
  return {a,accepted:f.db.getCityRecord(f.guild,'typed_intent',accepted.record_key)};
}
test('printed nightclub noise ends only through an exact native successful owner action; restart does not repeat effects',()=>nativeFixture(f=>{
  // This assertion deliberately requires eventual complete catalog qualification, not a test-only bypass.
  assert.equal(featureDisposition(FEATURE).status,'supported');
  const x=scene(f),{accepted}=quiet(f,x),before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),
    input={environment:x.profile.record_key,accepted_intent:accepted.record_key,prerequisite:accepted.data.outcome_receipt},
    row=clearNativeEnvironmentNoise(f.db,f.guild,input,x.scope);
  assert.equal(row.status,'resolved');assert.equal(row.data.state,'quiet');assert.equal(row.visibility,'gm');
  assert.equal(nativeEnvironmentNoiseState(f.db,f.guild,x.profile.record_key,x.scope).quiet,true);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
  const written=changes(f);assert.deepEqual(clearNativeEnvironmentNoise(f.db,f.guild,input,x.scope),row);assert.equal(changes(f),written);
  f.restart();const restarted=changes(f);assert.deepEqual(inspectNativeEnvironmentNoiseClear(f.db,f.guild,row.record_key,x.scope),row);
  assert.deepEqual(clearNativeEnvironmentNoise(f.db,f.guild,input,x.scope),row);assert.equal(changes(f),restarted);
}));
test('ordinary follow-through uses the same native environmental receipt and remains owner-private',()=>nativeFixture(f=>{
  const x=scene(f),{accepted}=quiet(f,x),proposal={version:1,accepted_intent_ref:accepted.record_key,effect_class:'environment',
    adapter:'environment_quiet',prerequisite_ref:accepted.data.outcome_receipt,
    payload_json:JSON.stringify({when:'no_roll',environment:{environment:x.profile.record_key}})};
  const [row]=applyOrdinaryEffects(f.db,f.guild,[proposal],x.scope,{typedIntents:[accepted]});
  assert.equal(row.kind,'ordinary_effect_receipt');assert.equal(row.visibility,'character');assert.equal(row.subject_key,x.pc.id);
  assert.match(verifyOrdinaryEffect(f.db,f.guild,row.record_key,x.scope).text,/noise has been quieted/);
  assert.throws(()=>verifyOrdinaryEffect(f.db,f.guild,row.record_key,{...x.scope,mode:'party'}));
}));
function investigate(f,x){
  const intent={...candidate(x.text).player_intents[0],type:'search',operation:'listen',resolution:'conversational'},
    [accepted]=persistPlayerIntents(f.db,f.guild,[intent],x.scope,{messageId:x.messageId}),
    origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),board=buildSceneIntentBoard(f.db,f.guild,origin,[accepted],[]),
    proposal={intent_ref:accepted.record_key,disposition:'request_pc_action_roll',rule_basis_refs:['srd:action-rolls'],difficulty:14,
      trait:'Knowledge',stakes_kind:'attempt_only',stakes:'This declared auditory inspection may fail; no damage or knowledge is invented.',
      reason:'The current local music interferes with this delicate auditory investigation.',difficulty_reason:'Current contextual native GM ruling.',
      feature_ref:FEATURE,experience_ref:'',advantage:false,disadvantage:true};
  const [decision]=adjudicateSceneBoard(f.db,f.guild,origin,board,[proposal]);
  return {accepted,decision,request:f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true}).find(r=>r.data.input.accepted_intent===accepted.record_key)};
}
test('actual unified scene decision prepares acoustic disadvantage without rolling; later quieting never rewrites committed dice',()=>nativeFixture(f=>{
  const x=scene(f),before=structuredClone(f.db.getCharacter(x.pc.id).data.resources),s=investigate(f,x);
  assert.equal(s.decision.status,'pending_pc_roll');assert(s.request);assert.equal(s.request.visibility,'character');
  assert.equal(s.request.data.breakdown.disadvantage,1);assert.equal(s.request.data.roll_id,undefined);
  assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);
  const rolled=contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',request:s.request.record_key,expected_revision:rollRevision(s.request),key:'auditory-roll'},
    {rng:sides=>Math.min(sides,8)}),saved=structuredClone(rolled.data.result),source=f.db.getWorldEvent(f.guild,s.request.data.input.modifier_keys[0]);
  const {accepted}=quiet(f,x);
  clearNativeEnvironmentNoise(f.db,f.guild,{environment:x.profile.record_key,accepted_intent:accepted.record_key,prerequisite:accepted.data.outcome_receipt},x.scope);
  f.restart();const actual=f.db.getCityRecord(f.guild,'roll_request',s.request.record_key);
  assert.deepEqual(actual.data.result,saved);assert.notEqual(typedRollProof(f.db,f.guild,actual).outcome,'needs_review');
  inspectOrdinaryRollModifier(f.db,f.guild,actual.data.input,f.db.getCharacter(x.pc.id),source,{historical:true});
  assert.throws(()=>rollBreakdown(f.db,f.guild,actual.data.input,f.db.getCharacter(x.pc.id)),'Old acoustic odds cannot authorize another current roll.');
}));
for(const change of ['accepted-only','wrong-target','wrong-owner','revoked-source','extra-role'])
test(`nightclub recovery rejects ${change} without quiet state or resource mutation`,()=>nativeFixture(f=>{
  const x=scene(f),{a,accepted}=quiet(f,x,{run:change!=='accepted-only'});
  let scope=x.scope,input={environment:x.profile.record_key,accepted_intent:accepted?.record_key||'not-a-native-outcome',
    prerequisite:accepted?.data.outcome_receipt||'not-a-native-receipt'};
  if(change==='wrong-target')input.environment='unrelated-environment';
  if(change==='wrong-owner')scope={...scope,actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id};
  if(change==='revoked-source')indexWorldEvent(f.db,f.guild,{key:x.profile.source_event,status:'retracted'});
  if(change==='extra-role')input={...input,gm:true};
  const before=changes(f),pcs=f.pcs.map(pc=>f.db.getCharacter(pc.id));
  assert.throws(()=>clearNativeEnvironmentNoise(f.db,f.guild,input,scope));assert.equal(changes(f),before);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id)),pcs);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'native_environment_noise_clear',includeGM:true}).length,0);
  assert(a);
}));
