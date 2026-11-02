import test from 'node:test';
import assert from 'node:assert/strict';
import {runAf07Scenario,createAf07MockAi} from '../../scripts/af07-codex-scene.mjs';
import {inspectGmReactionInvitation,submitGmReactionInvitation} from '../../src/gm-native-rolls.js';
import {activeNativeConditions,validateNativeCondition,nativeMovementConditionIssue} from '../../src/native-group-features.js';
import {clearNativeConditionFromOutcome,inspectNativeConditionClearAncestry} from '../../src/native-condition-recovery.js';
import {nativeTypedIntentSource,nativeConditionSource} from '../../src/frameworks/daggerheart/public.js';
import {captureWorldInput,indexWorldEvent} from '../../src/frameworks/world/public.js';
import {adjudicateGmRuling} from '../../src/gm-action-ruling.js';
import {contributeRoll} from '../../src/roll-collaboration.js';
import {rollRevision} from '../../src/roll-requests.js';
import {typedRollProof} from '../../src/typed-roll-proof.js';

test('AF07 actual owner action clears a native condition and preserves history after scene change and database reopen',async()=>{
  await runAf07Scenario({aiFactory:createAf07MockAi,verifyCommittedScene:({fixture:f,invitations})=>{
    let db=f.db;const {guild,pc}=f,owner=pc.owner_user_id,child=invitations[0],
      {terms}=inspectGmReactionInvitation(db,guild,owner,child.record_key),
      reaction={op:'gm-reaction-roll',request:child.record_key,revision:terms.revision};
    let reactionDice=0;
    submitGmReactionInvitation(db,guild,owner,reaction,{interactionId:'af07-recovery-reaction',authoredText:JSON.stringify(reaction),rng:()=>++reactionDice%2?2:3});
    const [condition]=activeNativeConditions(db,guild,pc.id);assert.ok(condition);assert.equal(reactionDice,2);
    assert.deepEqual(nativeConditionSource.activeNativeConditions(db,guild,pc.id),[condition]);
    const scope={mode:'private',actorUserId:owner,actorCharacterId:pc.id},text='I steady my breathing and refocus my vision.',messageId='af07-free-self';
    captureWorldInput(db,guild,owner,pc.id,messageId,text,{privateScene:true});
    const context=indexWorldEvent(db,guild,{key:'af07:recovery-context',title:'Visible recovery opportunity',kind:'scene_observation',source_id:'fixture',session_id:f.session.id,scene:f.scene.key,
      location_key:'af07-room',visibility:'character',subject_key:pc.id,truth_status:'established',details:{description:'The bright afterimage fades as the room comes back into view.'}},'fixture');
    const proposal={version:1,disposition:'standard_action_roll',context_refs:[context.event_key],
      capability:{kind:'mundane',ref:''},effect_class:'attempt_only',trait:'Instinct',difficulty:10,
      risk:'Continuing disorientation',stakes:'Success permits recovery from the flashbang effect.',explanation:'Refocus using the native action roll.',
      difficulty_reason:'A simple deliberate effort in the established room.',saved_ruling_key:'',override_refs:[],raw_refs:['srd:action-rolls'],
      house_refs:[],homebrew_refs:[],modifier_keys:[]};
    const [action]=nativeTypedIntentSource.persistPlayerIntents(db,guild,[{type:'interact',source_span:text,target_name:'',target_key:condition.record_key,
      destination:'unspecified',operation:'clear_condition',utterance:'',excluded_targets:[],framing:'immediate',resolution:'roll_required',reason:'Owner attempts to recover.',
      gm_ruling:proposal}],scope,{messageId});
    assert.ok(action,'Exact owner-authored recovery action must be accepted.');
    const ruling=adjudicateGmRuling(db,guild,action.record_key,proposal,scope);
    assert.equal(ruling.status,'roll_pending',JSON.stringify(ruling.data.review_reason));
    const pending=db.getCityRecord(guild,'roll_request',ruling.data.adjudication.roll_request_ref);let dice=0;
    const result=contributeRoll(db,guild,owner,{op:'roll',request:pending.record_key,expected_revision:rollRevision(pending),key:'af07-recover-roll'},
      {rng:()=>++dice%2?8:9});
    assert.equal(typedRollProof(db,guild,result).outcome,'success');assert.equal(dice,2);
    const resolved=db.getCityRecord(guild,'typed_intent',action.record_key),input={condition:condition.record_key,accepted_intent:action.record_key,prerequisite:resolved.data.outcome_receipt};
    assert.throws(()=>clearNativeConditionFromOutcome(db,guild,input,{...scope,actorUserId:'owner-af07-b'}));
    const receipt=clearNativeConditionFromOutcome(db,guild,input,scope);
    assert.equal(validateNativeCondition(db,guild,condition.record_key).status,'cleared');
    assert.deepEqual(activeNativeConditions(db,guild,pc.id),[]);
    db.resetDirectorRound(f.session.id,{advanceScene:true});db=f.reopen();
    assert.deepEqual(inspectNativeConditionClearAncestry(db,guild,validateNativeCondition(db,guild,condition.record_key)),receipt);
    assert.deepEqual(activeNativeConditions(db,guild,pc.id),[]);
    assert.equal(nativeMovementConditionIssue(db,guild,pc.id,{range:'Close'}),null);
    assert.throws(()=>clearNativeConditionFromOutcome(db,guild,input,scope));
    assert.equal(db.listCityRecords(guild,{kind:'pc_native_condition_clear',includeGM:true,limit:20}).length,1);
    assert.equal(db.getSavedRoll(guild,result.data.roll_id).payload.total,result.data.result.total);
  }});
});
