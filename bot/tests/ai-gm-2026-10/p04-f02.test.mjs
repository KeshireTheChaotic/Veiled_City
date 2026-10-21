import test from 'node:test';import assert from 'node:assert/strict';
import {createAudienceAuthority,audienceSurface} from '../../src/audience-first-capability.js';
function proof(){return {authorized:true,source_event:'source',scene:'scene',session:'session',proof_ref:'proof',audience:'player_private',recipient_user_id:'owner',recipient_character_id:'pc',task_ids:['task'],viewpoint:'character',viewpoint_character_id:'pc',scope:{mode:'private',actorUserId:'owner'},revisions:{source:1}};}
test('issued recipient and nested scope are independent immutable snapshots',()=>{
 const original=proof(),authority=createAudienceAuthority({authorize:()=>original}),grant=authority.issue({audience:'player_private'});
 original.scope.actorUserId='intruder';original.revisions.source=2;original.task_ids.push('foreign');
 const saved=authority.inspect(grant);assert.equal(saved.scope.actorUserId,'owner');assert.equal(saved.revisions.source,1);assert.deepEqual(saved.task_ids,['task']);
 assert.throws(()=>{saved.scope.mode='party';},TypeError);assert.equal(audienceSurface(authority,grant).recipient_user_id,'owner');
});
test('JSON copy cannot mint a grant and foreign audience cannot reinterpret a private proof',()=>{
 const authority=createAudienceAuthority({authorize:()=>proof()});
 assert.throws(()=>authority.issue({audience:'channel'}),{code:'AUDIENCE_V9'});
 assert.throws(()=>authority.inspect(JSON.parse('{}')),{code:'AUDIENCE_V9'});
});
