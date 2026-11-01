import test from 'node:test';
import assert from 'node:assert/strict';
import {runAf07Scenario,createAf07MockAi} from '../../scripts/af07-codex-scene.mjs';
import {inspectGmReactionInvitation,submitGmReactionInvitation,withdrawGmReactionInvitation} from '../../src/gm-native-rolls.js';
import {inspectGroupFeature,activeNativeConditions,chooseGroupReactionOutcome} from '../../src/native-group-features.js';
import {typedRollProof} from '../../src/typed-roll-proof.js';

test('AF07 mocked Codex scenario commits one source-backed feature and owner reaction invitation in disposable SQLite',async()=>{
  const result=await runAf07Scenario({aiFactory:createAf07MockAi});
  assert.equal(result.ok,true);
  assert.equal(result.live,false);
  assert.equal(result.turnCommitted,true);
  assert.equal(result.gmNativeActions,1);
  assert.equal(result.groupFeatureExecutions,1,JSON.stringify(result));
  assert.equal(result.ownerReactionInvitations,1);
  assert.equal(result.databaseWasTemporary,true);
  assert.equal(result.discordConnected,false);
});

test('AF07 a feature belonging to another adversary is held locally without execution or owner invitations',async()=>{
  const result=await runAf07Scenario({aiFactory:context=>createAf07MockAi({...context,
    proposedFeature:'adversary:pale-regent:command-the-blood'})});
  assert.equal(result.turnCommitted,true);
  assert.equal(result.gmNativeActions,0,JSON.stringify(result));
  assert.equal(result.groupFeatureExecutions,0);
  assert.equal(result.ownerReactionInvitations,0);
});

test('AF07 live runner requires its explicit Codex guard and rejects API-key mode before fixture work',async()=>{
  await assert.rejects(()=>runAf07Scenario(),/mocked AI client.*--live-codex/);
  const oldMode=process.env.AI_AUTH_MODE,oldKey=process.env.OPENAI_API_KEY;
  try{
    process.env.AI_AUTH_MODE='chatgpt';process.env.OPENAI_API_KEY='present-but-never-read';
    await assert.rejects(()=>runAf07Scenario({live:true}),/Refusing API-key mode/);
  }finally{
    if(oldMode===undefined)delete process.env.AI_AUTH_MODE;else process.env.AI_AUTH_MODE=oldMode;
    if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;
  }
});

test('AF07 actual owner submission saves native failure dice and effect exactly once through the unified scene',async()=>{
  const result=await runAf07Scenario({aiFactory:createAf07MockAi,verifyCommittedScene:({fixture:f,invitations,executions})=>{
    const {db,guild,pc}=f,child=invitations[0],before=db.getCharacter(pc.id).data.resources,
      {terms}=inspectGmReactionInvitation(db,guild,'owner-af07',child.record_key),
      input={op:'gm-reaction-roll',request:child.record_key,revision:terms.revision};
    let rolls=0;const options={interactionId:'af07-native-owner-roll',authoredText:JSON.stringify(input),rng:()=>{rolls++;return rolls%2===1?2:3;}};
    assert.throws(()=>submitGmReactionInvitation(db,guild,'owner-af07-b',input,options));assert.equal(rolls,0);
    const request=submitGmReactionInvitation(db,guild,'owner-af07',input,options),proof=typedRollProof(db,guild,request);
    assert.equal(request.status,'resolved');assert.equal(proof.outcome,'failure');assert.equal(request.data.result.total,6);
    assert.equal(rolls,2);assert.equal(db.getCharacter(pc.id).data.resources.stress.current,before.stress.current+1);
    assert.equal(db.getCharacter(pc.id).data.resources.hope,before.hope);
    assert.equal(activeNativeConditions(db,guild,pc.id).length,1);
    assert.equal(inspectGroupFeature(db,guild,executions[0].record_key).execution.status,'resolved');
    assert.deepEqual(submitGmReactionInvitation(db,guild,'owner-af07',input,options),request);assert.equal(rolls,2);
    return {ownerFailureResolved:true,replayRolledAgain:false};
  }});
  assert.deepEqual(result.verification,{ownerFailureResolved:true,replayRolledAgain:false});
});

test('AF07 actual owner withdrawal ends the pending invitation without invented dice, resources or failure effects',async()=>{
  const result=await runAf07Scenario({aiFactory:createAf07MockAi,verifyCommittedScene:({fixture:f,invitations,executions})=>{
    const {db,guild,pc}=f,child=invitations[0],before=db.getCharacter(pc.id).data,
      {terms}=inspectGmReactionInvitation(db,guild,'owner-af07',child.record_key),
      input={op:'gm-reaction-withdraw',request:child.record_key,revision:terms.revision},
      options={interactionId:'af07-native-owner-withdraw',authoredText:JSON.stringify(input)};
    const receipt=withdrawGmReactionInvitation(db,guild,'owner-af07',input,options);
    assert.equal(receipt.status,'withdrawn');assert.deepEqual(db.getCharacter(pc.id).data,before);
    assert.equal(activeNativeConditions(db,guild,pc.id).length,0);
    assert.equal(db.listCityRecords(guild,{kind:'roll_request',includeGM:true,limit:20}).length,0);
    assert.equal(inspectGroupFeature(db,guild,executions[0].record_key).execution.status,'resolved');
    assert.deepEqual(withdrawGmReactionInvitation(db,guild,'owner-af07',input,options),receipt);
    return {withdrawalResolved:true,noDiceOrFailure:true};
  }});
  assert.deepEqual(result.verification,{withdrawalResolved:true,noDiceOrFailure:true});
});

test('AF07 ordinary success retains the consequence choice until its owner authenticates it',async()=>{
  await runAf07Scenario({aiFactory:createAf07MockAi,verifyCommittedScene:({fixture:f,invitations,executions})=>{
    const {db,guild,pc}=f,child=invitations[0],before=db.getCharacter(pc.id).data.resources,
      {terms}=inspectGmReactionInvitation(db,guild,'owner-af07',child.record_key),
      input={op:'gm-reaction-roll',request:child.record_key,revision:terms.revision};
    let rolls=0;submitGmReactionInvitation(db,guild,'owner-af07',input,{interactionId:'af07-success',authoredText:JSON.stringify(input),rng:()=>++rolls%2?8:9});
    assert.equal(inspectGmReactionInvitation(db,guild,'owner-af07',child.record_key).terms.status,'awaiting_choice');
    assert.deepEqual(db.getCharacter(pc.id).data.resources,before);assert.equal(activeNativeConditions(db,guild,pc.id).length,0);
    const choice={op:'gm-reaction-choice',request:child.record_key,revision:terms.revision,choice:'stress'},
      options={interactionId:'af07-choice',authoredText:JSON.stringify(choice)};
    assert.throws(()=>chooseGroupReactionOutcome(db,guild,'owner-af07-b',choice,options));
    const effect=chooseGroupReactionOutcome(db,guild,'owner-af07',choice,options);
    assert.equal(effect.data.choice,'stress');assert.equal(db.getCharacter(pc.id).data.resources.stress.current,before.stress.current+1);
    assert.equal(inspectGroupFeature(db,guild,executions[0].record_key).execution.status,'resolved');
    assert.deepEqual(chooseGroupReactionOutcome(db,guild,'owner-af07',choice,options),effect);assert.equal(rolls,2);
  }});
});

test('AF07 two owners independently react across database reopen and only both terminal receipts resolve the group',async()=>{
  await runAf07Scenario({actorName:'Traffic Saint',featureKey:'adversary:traffic-saint:all-lanes-stop',aiFactory:createAf07MockAi,
    verifyCommittedScene:({fixture:f,invitations,executions})=>{
      const {guild}=f;let db=f.db;assert.equal(invitations.length,2);assert.equal(executions.length,1);
      for(const [i,pc] of [f.pc,f.pcB].entries()){
        const child=invitations.find(r=>r.data.native.character===pc.id),owner=pc.owner_user_id,
          {terms}=inspectGmReactionInvitation(db,guild,owner,child.record_key),
          input={op:'gm-reaction-roll',request:child.record_key,revision:terms.revision};
        let count=0;const request=submitGmReactionInvitation(db,guild,owner,input,{interactionId:`af07-multi-${i}`,authoredText:JSON.stringify(input),rng:()=>++count%2?(i?9:2):(i?10:3)});
        assert.equal(typedRollProof(db,guild,request).outcome,i?'success':'failure');
        assert.equal(activeNativeConditions(db,guild,pc.id).length,i?0:1);
        assert.equal(inspectGroupFeature(db,guild,executions[0].record_key).execution.status,i?'resolved':'awaiting_owners');
        if(i===0){db=f.reopen();assert.equal(inspectGroupFeature(db,guild,executions[0].record_key).execution.status,'awaiting_owners');}
      }
    }});
});

test('AF07 native Critical reaction ignores Flashbang consequences without generating Hope or clearing Stress',async()=>{
  await runAf07Scenario({aiFactory:createAf07MockAi,verifyCommittedScene:({fixture:f,invitations,executions})=>{
    const {db,guild,pc}=f,child=invitations[0],before=db.getCharacter(pc.id).data.resources,
      {terms}=inspectGmReactionInvitation(db,guild,'owner-af07',child.record_key),
      input={op:'gm-reaction-roll',request:child.record_key,revision:terms.revision};
    const request=submitGmReactionInvitation(db,guild,'owner-af07',input,{interactionId:'af07-critical',authoredText:JSON.stringify(input),rng:()=>6});
    assert.equal(request.data.result.duality,'Critical');assert.equal(typedRollProof(db,guild,request).outcome,'success');
    assert.deepEqual(db.getCharacter(pc.id).data.resources,before);assert.equal(activeNativeConditions(db,guild,pc.id).length,0);
    assert.equal(inspectGroupFeature(db,guild,executions[0].record_key).execution.status,'resolved');
    assert.equal(inspectGmReactionInvitation(db,guild,'owner-af07',child.record_key).terms.status,'resolved');
  }});
});
