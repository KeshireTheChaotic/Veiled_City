import assert from 'node:assert/strict';
import test from 'node:test';
import {createReservationFixture} from './rf06-reservation-fixture.mjs';
import {captureWorldInput} from '../../src/frameworks/world/public.js';
import {currentScene} from '../../src/frameworks/session/public.js';
import {persistPlayerIntents,connectUnifiedArbitration} from '../../src/framework-to-framework/daggerheart--intent/public.js';
import {createArbitrationOrigin,buildSceneIntentBoard} from '../../src/scene-intent-board.js';
import {adjudicateSceneBoard} from '../../src/gm-unified-arbitration.js';
import {applyNativeEnvironmentProfileProposals,nativeEnvironmentInstanceForScope,featureDisposition} from '../../src/frameworks/daggerheart/public.js';
import {contributeRoll} from '../../src/roll-collaboration.js';
import {rollRevision} from '../../src/roll-requests.js';
import {typedRollProof} from '../../src/typed-roll-proof.js';
import {jsonHash} from '../../src/kernel/json-hash.js';

const FEATURE='environment:aster-vale-predictive-lab:everything-logs';
const proposal={disposition:'request_pc_action_roll',intent_ref:'',feature_ref:FEATURE,experience_ref:'',
  rule_basis_refs:['srd:action-rolls'],difficulty:14,trait:'Instinct',stakes_kind:'attempt_only',
  stakes:'Only this attempt can fail; a failed intrusion may leave a trace.',reason:'The active lab feature can preserve a trace of a failed intrusion.',
  difficulty_reason:'The fixed camera network is difficult to evade.',advantage:false,disadvantage:false};

function setupTrace(){
  const fixture=createReservationFixture(),{db,guild,user,pc}=fixture;
  db.setCityCalendar(guild,{...db.getCityCalendar(guild),flags:{...db.getCityCalendar(guild).flags,authoring:true,roll_collaboration:true}});
  const scene=currentScene(db,guild),scope={mode:'party',actorUserId:user,actorCharacterId:pc.id},messageId='r68-owner-intrusion',
    text='I try to slip past the crossing camera console.';
  const authored=captureWorldInput(db,guild,user,pc.id,messageId,text);assert.ok(authored);
  const origin=createArbitrationOrigin(db,guild,scope,authored.event_key);
  const profiles=applyNativeEnvironmentProfileProposals(db,guild,origin,[{version:1,environment:'environment:aster-vale-predictive-lab',location:'crossing'}]);
  assert.equal(profiles.length,1);assert.equal(profiles[0].status,'active',JSON.stringify(profiles[0]));
  assert.equal(nativeEnvironmentInstanceForScope(db,guild,scope,'crossing')?.environment,'environment:aster-vale-predictive-lab');
  assert.equal(featureDisposition(FEATURE).status,'supported');
  const intent={type:'interact',source_span:text,target_key:'crossing',target_name:'the crossing camera console',operation:'interact',
    destination:'unspecified',excluded_targets:[],framing:'immediate',resolution:'roll_required',reason:'I am attempting to evade the camera.',utterance:'',
    native_adjudication:{attack_source:'',difficulty:14,explanation:'A difficult fixed camera network.',homebrew_refs:[],house_refs:[],kind:'action',
      modifier_keys:[],override_refs:[],raw_refs:['srd:action-rolls'],risk:'The camera may record this attempt.',saved_ruling_key:'',
      stakes:'Only this attempt can fail.',trait:'Instinct'}};
  const [action]=persistPlayerIntents(db,guild,[intent],scope,{messageId});assert.ok(action);
  const board=buildSceneIntentBoard(db,guild,origin,[action],[]),actualProposal={...proposal,intent_ref:action.record_key};
  const [decision]=adjudicateSceneBoard(db,guild,origin,board,[actualProposal],{connectUnifiedArbitration});
  assert.equal(decision.status,'pending_pc_roll',JSON.stringify(decision));
  const native=decision.data.native,request=db.getCityRecord(guild,'roll_request',native.roll_request_ref);
  assert.ok(request);assert.equal(request.data.input.accepted_intent,action.record_key);
  return {db,guild,user,pc,action,decision,request,scope,origin,board};
}

function tableSnapshot(db){
  const tables=db.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row=>row.name);
  return Object.fromEntries(tables.map(name=>[name,db.db.prepare(`SELECT * FROM "${name.replaceAll('"','""')}" ORDER BY rowid`).all()]));
}

test('original failed typed-roll finalization preserves the outcome when trace ancestry enters its review branch',()=>{
  const f=setupTrace(),{db,guild,user,request}=f;
  try{
    const input={op:'roll',request:request.record_key,expected_revision:rollRevision(request),key:'r68-failed-roll',accepted_intent:f.action.record_key};
    let faces=0;
    const result=contributeRoll(db,guild,user,input,{rng:sides=>{assert.equal(sides,12);return ++faces%2?1:2;}});
    assert.equal(result.status,'resolved');assert.equal(faces,2);
    assert.equal(typedRollProof(db,guild,result).outcome,'failure');
    const risk=db.getCityRecord(guild,'native_environment_trace_risk',`environment-trace-risk:${jsonHash(f.action.record_key)}`);
    assert.ok(risk);
    const reviews=db.listCityRecords(guild,{kind:'native_environment_trace_review',includeGM:true});
    assert.equal(reviews.length,1);assert.equal(reviews[0].status,'needs_review');
    assert.equal(reviews[0].data.native_outcome_preserved,true);
    assert.equal(reviews[0].data.reason,'Ordinary effect held: NATIVE_CAUSAL_LOCATION_OR_CONTEXT_REQUIRED');
    assert.equal(db.listCityRecords(guild,{kind:'native_environment_trace_offer',includeGM:true}).length,0);
    const after=tableSnapshot(db);
    const replay=contributeRoll(db,guild,user,input,{rng:()=>{throw Error('saved roll replay consumed RNG');}});
    assert.deepEqual(replay,result);assert.deepEqual(tableSnapshot(db),after);
  }finally{db.close();}
});
