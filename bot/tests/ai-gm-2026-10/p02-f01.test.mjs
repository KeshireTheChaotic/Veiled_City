import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeNativeScenes} from '../../src/application/composition/public.js';
initializeNativeScenes();
import {createHash} from 'node:crypto';
import {consentAction} from '../../src/action-consent.js';
const hash=v=>createHash('sha256').update(v).digest('hex');
function fixture(){
 const revision=hash(JSON.stringify(['session','owner','pc','assignment',1,'owner',undefined,undefined])).slice(0,24);
 const text='I examine the latch.',digest=hash(text);
 const row={status:'accepted_for_adjudication',source_event:'source',visibility:'character',subject_key:'pc',data:{start:0,end:text.length,source_span:text,framing:'immediate',owner_user_id:'owner',actor:'pc',actor_principal_revision:revision,session_id:'session',scene:'session:1',source_hash:digest}};
 const source={event_key:'source',status:'active',kind:'authored_turn',session_id:'session',scene:'session:1',source_id:'player:owner',visibility:'character',subject_key:'pc',details:{author:'owner',character_id:'pc',principal_revision:revision,raw_text:text,raw_hash:digest}};
 const db={getActiveSession:()=>({id:'session'}),getDirectorState:()=>({scene_number:1}),getCityRecord:(_g,k)=>k==='typed_intent'?row:null,getWorldEvent:()=>source,
 activeAssignment:()=>({id:'assignment',character_id:'pc',control_revision:1,control_policy:'owner'}),proxyAssignments:()=>[],npcProxyAssignments:()=>[],roster:()=>[{discord_user_id:'owner',presence:'present'}],getCharacter:()=>({id:'pc',guild_id:'g',owner_user_id:'owner',status:'active'}),ownerAuthoredSource:()=>true};
 return {db,row,source};
}
test('exact owned declaration remains usable without committing an effect',()=>{
 const {db,row}=fixture();assert.equal(consentAction(db,'g','intent').row,row);
});
test('fractional, empty, out-of-bounds, hypothetical and quoted action rows cannot gain live consent',()=>{
 for(const change of [{start:0.5},{end:0},{end:500},{framing:'hypothetical'},{framing:'quoted'},{source_span:''}]){
  const {db,row}=fixture();Object.assign(row.data,change);assert.throws(()=>consentAction(db,'g','intent'),{code:'SCENE_ACTION_WINDOW'});
 }
});
test('forged owner or changed source is rejected',()=>{
 for(const mutate of [f=>f.source.details.author='other',f=>f.source.details.raw_text='I consent to spending.']){
  const f=fixture();mutate(f);assert.throws(()=>consentAction(f.db,'g','intent'),{code:'SCENE_ACTION_WINDOW'});
 }
});
