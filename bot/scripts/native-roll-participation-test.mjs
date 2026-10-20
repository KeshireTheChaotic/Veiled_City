/** W2 full-framework acceptance fixtures; do not execute before phase freeze. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {nativeFixture} from './v9-fixtures.mjs';
import {actionFixture} from './v96-action-fixture.mjs';
import {captureWorldInput,worldInputKey} from '../src/autonomous-world.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {createArbitrationOrigin,buildSceneIntentBoard,currentScenePlayerInputs,bindArbitrationTurn} from '../src/scene-intent-board.js';
import {adjudicateSceneBoard} from '../src/gm-unified-arbitration.js';
import {adjudicateAcceptedIntent} from '../src/rules-arbitration.js';
import {contributeRoll} from '../src/roll-collaboration.js';
import {rollRevision} from '../src/roll-requests.js';
import {typedRollProof} from '../src/typed-roll-proof.js';
import {nativeGmNotice} from '../src/gm-arbitration-output.js';
import {applyAuthoritativeMutation} from '../src/state.js';

function scenario(f,{tag=false,privateTarget=false}={}){
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,scene_continuity:true,narrative_authority:true,playable_narration:true,narrative_camera:true}});
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal',visibility:'party'});
  const x=actionFixture(f,undefined,{privateScene:privateTarget});x.run();
  const q=f.db.listCityRecords(f.guild,{kind:'roll_request',includeGM:true})[0],pc=f.pcs[1],scene=currentScene(f.db,f.guild),
    text=tag?'I also inspect the counter.':'I help the other investigator inspect the counter.',message='collaborator-source';
  const arrival=indexWorldEvent(f.db,f.guild,{key:'collaborator-arrival',kind:'arrival',title:'Established local collaborator',source_id:'gm',
    session_id:scene.session_id,scene:scene.key,location_key:'terminal',visibility:'party'},'gm');
  recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:pc.id,source_event:arrival.event_key,location_key:'terminal',zone:'interior',visibility:'party',accepted_by:pc.owner_user_id},'gm');
  recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:x.pc.id,source_event:arrival.event_key,location_key:'terminal',zone:'interior',visibility:'party',accepted_by:x.pc.owner_user_id},'gm');
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,message,text);
  const scope={mode:'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id},sourceIntent={
    type:'interact',source_span:text,target_name:'',target_key:tag?'':q.subject_key,destination:'unspecified',operation:tag?'inspect':'help_ally',
    utterance:'',excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Original owner-authored contribution.'};
  const [a]=persistPlayerIntents(f.db,f.guild,[sourceIntent],scope,{messageId:message});
  let other=null;
  if(tag){const native=adjudicateAcceptedIntent(f.db,f.guild,{acceptedIntent:a.record_key,mode:'roll_required',kind:'action',trait:'Instinct',difficulty:12,
    risk:'Clues may be missed.',stakes:'Only this investigation attempt.',rawRefs:['srd:action-rolls'],explanation:'Independent original investigation.'},'ai_gm',{scope});
    other=f.db.getCityRecord(f.guild,'roll_request',native.roll_request_ref);}
  const original=f.db.getCityRecord(f.guild,'typed_intent',q.data.input.accepted_intent),origin=createArbitrationOrigin(f.db,f.guild,scope,worldInputKey(message,pc.id)),
    board=buildSceneIntentBoard(f.db,f.guild,origin,currentScenePlayerInputs(f.db,f.guild,origin,tag?[original,a]:[a]),[]),p={proposal_version:3,
      intent_ref:tag?original.record_key:a.record_key,disposition:'native_feature_resolution',rule_basis_refs:[tag?'srd:tag-team-rolls':'srd:help-an-ally'],
      difficulty:null,trait:null,stakes_kind:'attempt_only',stakes:'Eligibility only.',reason:'Source-bound ordinary collaboration.',difficulty_reason:'',
      feature_ref:'',experience_ref:'',advantage:false,disadvantage:false,collaboration:{kind:tag?'tag':'help',request:q.record_key,partner_request:other?.record_key||''}};
  return {x,q,pc,a,scope,origin,board,p,other,sourceIntent,message,run:()=>adjudicateSceneBoard(f.db,f.guild,origin,board,[p])[0]};
}
function choose(f,s,choice,{key='owner-contribution',pay=true}={}){
  const q=f.db.getCityRecord(f.guild,'roll_request',s.q.record_key),e=f.db.getWorldEvent(f.guild,choice.proof),pc=f.db.getCharacter(choice.character);
  const {character:ignored,...fields}=choice;
  return contributeRoll(f.db,f.guild,pc.owner_user_id,{...fields,request:q.record_key,expected_revision:rollRevision(q),key,
    description:e.details.binding.description,...(choice.op==='help'||choice.op==='tag'?{pay_hope:pay}:{})},{rng:()=>3});
}
test('W2 real board Help eligibility leaves cost/dice to the distinct owner and privately projects the exact operation',()=>nativeFixture(f=>{
  const s=scenario(f),before=f.db.getCharacter(s.pc.id).data.resources.hope,d=s.run();
  assert.equal(d.status,'pending_owner_choice');assert.equal(f.db.getCharacter(s.pc.id).data.resources.hope,before);
  const notice=nativeGmNotice(f.db,f.guild,d.record_key,{mode:'private',actorUserId:s.pc.owner_user_id,actorCharacterId:s.pc.id});
  assert.match(notice.text,/Help \(1 Hope\)/);assert.throws(()=>nativeGmNotice(f.db,f.guild,d.record_key,s.scope));
  assert.throws(()=>choose(f,s,d.data.native.choices[0],{pay:false}),/authorization|Hope/i);
  const q=choose(f,s,d.data.native.choices[0]);assert.equal(q.data.helpers.length,1);assert.equal(f.db.getCharacter(s.pc.id).data.resources.hope,before-1);
  assert.equal(choose(f,s,d.data.native.choices[0]).data.helpers.length,1,'duplicate owner operation cannot charge again');
  f.restart();const current=f.db.getCityRecord(f.guild,'roll_request',q.record_key),rolled=contributeRoll(f.db,f.guild,s.x.pc.owner_user_id,
    {op:'roll',request:q.record_key,expected_revision:rollRevision(current),key:'assisted-action'},{rng:sides=>Math.min(8,sides)});
  assert.notEqual(typedRollProof(f.db,f.guild,rolled).outcome,'needs_review');
}));
test('W2 original private attempt is not available to an undisclosed helper',()=>nativeFixture(f=>{
  const s=scenario(f,{privateTarget:true}),d=s.run();assert.equal(d.status,'needs_rules_review');
  assert.equal(f.db.getCharacter(s.pc.id).data.resources.hope,s.pc.data.resources.hope);
}));
test('W2 Tag Team eligibility does not enroll either owner or spend until explicit bilateral native operations',()=>nativeFixture(f=>{
  const s=scenario(f,{tag:true});f.db.updateCharacterData(s.x.pc.id,p=>{p.resources.hope=3;});
  const d=s.run();assert.equal(d.status,'pending_owner_choice');assert.equal(f.db.getCharacter(s.x.pc.id).data.resources.hope,3);
  const first=choose(f,s,d.data.native.choices[0],{key:'tag-propose'});assert.equal(first.status,'awaiting_partner');assert.equal(f.db.getCharacter(s.x.pc.id).data.resources.hope,3);
  const joined=choose(f,s,d.data.native.choices[1],{key:'tag-participate'});assert.equal(joined.status,'pending');
  assert.equal(f.db.getCharacter(s.x.pc.id).data.resources.hope,0);assert.equal(joined.data.tag.participants.length,2);
  f.restart();let q=f.db.getCityRecord(f.guild,'roll_request',s.q.record_key);
  for(const pc of [s.x.pc,s.pc])q=contributeRoll(f.db,f.guild,pc.owner_user_id,{op:'roll',request:q.record_key,
    expected_revision:rollRevision(q),key:`tag-native-${pc.id}`},{rng:sides=>Math.min(sides,7)});
  for(const pc of [s.x.pc,s.pc])q=contributeRoll(f.db,f.guild,pc.owner_user_id,{op:'select',request:q.record_key,
    expected_revision:rollRevision(q),key:`tag-select-${pc.id}`,roll_id:q.data.tag.participants[0].roll_id});
  assert.equal(q.status,'resolved');assert.notEqual(typedRollProof(f.db,f.guild,q).outcome,'needs_review');
}));
test('W2 revoked native feasibility or changed owner cannot spend helper Hope',()=>nativeFixture(f=>{
  const s=scenario(f),d=s.run(),choice=d.data.native.choices[0],before=f.db.getCharacter(s.pc.id).data.resources.hope;
  indexWorldEvent(f.db,f.guild,{key:choice.proof,status:'retracted'},'fixture-revoke');
  assert.throws(()=>choose(f,s,choice),/source|active|retract/i);assert.equal(f.db.getCharacter(s.pc.id).data.resources.hope,before);
}));
test('W2 authoritative turn stages sealed Help as optional collaboration, never hostile PC permission',()=>nativeFixture(f=>{
  const s=scenario(f),narrative={narration:'Your optional help awaits your choice.',narrative_claims:[],player_intents:[s.sourceIntent],
    unified_arbitration:{version:1,npc_intents:[],decisions:[s.p]}};
  bindArbitrationTurn(narrative,s.origin);
  const result=applyAuthoritativeMutation(f.db,{guildId:f.guild,sessionId:f.session.id,scope:s.scope,narrative,provenance:{messageId:s.message}});
  assert(result.unifiedArbitration.some(r=>r.data.entry===s.a.record_key&&r.status==='pending_owner_choice'));
  assert(!f.db.listCityRecords(f.guild,{kind:'pvp_attempt',includeGM:true}).some(r=>r.data.accepted_intent===s.a.record_key));
  assert.equal(f.db.getCharacter(s.pc.id).data.resources.hope,2);assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_operation',includeGM:true}).length,0);
}));
