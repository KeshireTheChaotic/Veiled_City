import test from 'node:test';
import assert from 'node:assert/strict';
import {jsonHash} from '../../src/kernel/json-hash.js';
import {AUDIENCES,createAudienceAuthority,audienceSurface,createNativeAudienceGrantAdapter}
 from '../../src/frameworks/narrative/public.js';
import {AUDIENCES as compatibilityAudiences,createAudienceAuthority as compatibilityAuthority}
 from '../../src/audience-first-capability.js';
import {registerNarrativeContext,mintNarrativeAudience,revalidateNarrativeAudience}
 from '../../src/audience-native-v9.js';

const failure=reason=>Object.assign(new Error(reason),{code:'SCENE_FICTION'});

test('Narrative-owned audience grants preserve opaque native recipient and stale-source checks',()=>{
 assert.deepEqual(AUDIENCES,['channel','player','player_private','gm_internal']);
 assert.equal(compatibilityAudiences,AUDIENCES);
 assert.equal(compatibilityAuthority,createAudienceAuthority);
 assert.equal(typeof registerNarrativeContext,'function');
 assert.equal(typeof mintNarrativeAudience,'function');
 assert.equal(typeof revalidateNarrativeAudience,'function');

 const scope={mode:'private',actorUserId:'ada',actorCharacterId:'pc-ada'};
 const context=()=>({binding:{source:'event:opening-1',source_hash:'source-hash-1',scene:'scene-1',session:'session-1',
  guild:'guild-1',scope:structuredClone(scope),principal:'owner-revision-3',location:null,zone:null,placement:null,viewpoint:'camera'},
  packet:{viewpoint:{zone:null},operation:'describe_scene'}});
 let adapter,current=context();
 adapter=createNativeAudienceGrantAdapter({buildNarrativeContext:()=>adapter.registerNarrativeContext(structuredClone(current)),
  sceneFictionHash:jsonHash,sceneFictionFailure:failure});

 assert.throws(()=>adapter.mintNarrativeAudience(context()),/native_audience_context/);
 const registered=adapter.registerNarrativeContext(context());
 assert.throws(()=>adapter.mintNarrativeAudience(registered,{audience:'channel'}),/native_audience_mismatch/);
 const privateGrant=adapter.mintNarrativeAudience(registered);
 assert.equal(privateGrant.proof.audience,'player_private');
 assert.equal(privateGrant.proof.recipient_user_id,'ada');
 assert.equal(privateGrant.proof.recipient_character_id,'pc-ada');
 assert.deepEqual(audienceSurface(privateGrant.authority,privateGrant.grant),
  {kind:'private_user',recipient_user_id:'ada',publish:true});
 assert.throws(()=>privateGrant.authority.inspect({}),/unissued_capability/);
 assert.equal(Object.isFrozen(privateGrant.proof),true);

 const partyContext=context();partyContext.binding.scope={mode:'party',actorUserId:null,actorCharacterId:null};
 partyContext.binding.viewpoint='camera';
 const partyGrant=adapter.mintNarrativeAudience(adapter.registerNarrativeContext(partyContext));
 assert.equal(partyGrant.proof.audience,'channel');
 assert.deepEqual(audienceSurface(partyGrant.authority,partyGrant.grant),{kind:'party',publish:true});

 const revalidated=adapter.revalidateNarrativeAudience({},'guild-1',privateGrant.proof,scope);
 assert.deepEqual(revalidated.proof,privateGrant.proof);
 current.binding.source_hash='changed-source-hash';
 assert.throws(()=>adapter.revalidateNarrativeAudience({},'guild-1',privateGrant.proof,scope),/native_audience_stale/);
 current=context();
 assert.throws(()=>adapter.revalidateNarrativeAudience({},'other-guild',privateGrant.proof,scope),/native_audience_scope/);
 assert.throws(()=>adapter.revalidateNarrativeAudience({},'guild-1',privateGrant.proof,{...scope,actorUserId:'noor'}),/native_audience_scope/);

 const authority=createAudienceAuthority({authorize:request=>({authorized:true,source_event:'event:1',scene:'s',session:'ss',
  proof_ref:'proof:1',audience:request.audience,task_ids:['task:1'],viewpoint:'camera',recipient_user_id:'ada',
  recipient_character_id:'pc-ada'})});
 assert.throws(()=>authority.issue({audience:'party'}),/audience/);
 assert.throws(()=>createAudienceAuthority({authorize:()=>({authorized:true,source_event:'e',scene:'s',session:'ss',
  proof_ref:'p',audience:'player_private',task_ids:['t'],viewpoint:'camera'})}).issue({audience:'player_private'}),/recipient/);
 assert.throws(()=>createNativeAudienceGrantAdapter({}),/Complete native narrative audience capabilities required/);
});
