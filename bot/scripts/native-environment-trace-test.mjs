/** W6/HR14 construction fixtures, deliberately NOT RUN before the full W6 freeze. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,candidate} from './narrative-fixtures.mjs';
import {actionFixture} from './v96-action-fixture.mjs';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {establishNativeEnvironmentInstance} from '../src/native-environment-instance.js';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {createArbitrationOrigin,buildSceneIntentBoard} from '../src/scene-intent-board.js';
import {adjudicateSceneBoard} from '../src/gm-unified-arbitration.js';
import {contributeRoll} from '../src/roll-collaboration.js';
import {rollRevision} from '../src/roll-requests.js';
import {typedRollProof} from '../src/typed-roll-proof.js';
import {inspectEnvironmentTrace,chooseEnvironmentTrace,inspectEnvironmentTraceResult,traceOfferForRisk} from '../src/native-environment-trace.js';
import {nativeGmNotice} from '../src/gm-arbitration-output.js';
import {handleCommand} from '../src/commands.js';
import {sceneFictionHash as hash} from '../src/scene-fiction-context.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {nativeHouseErratum} from '../src/native-house-errata.js';
const FEATURE='environment:aster-vale-predictive-lab:everything-logs';
const changes=f=>f.db.db.prepare('SELECT total_changes() n').get().n;
function fixture(f,{roll=true,success=false}={}){
  const x=setup(f,{privateScene:true,text:'I attempt to intrude through the lab access console.',messageId:'lab-intrusion'});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,authoring:true,gm_discretion:true,roll_requests:true,roll_collaboration:true}});
  establishNativeEnvironmentInstance(f.db,f.guild,buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),
    {version:1,environment:'environment:aster-vale-predictive-lab',location:'terminal'});
  const [action]=persistPlayerIntents(f.db,f.guild,[{...candidate(x.text).player_intents[0],type:'interact',operation:'intrude',resolution:'conversational'}],x.scope,{messageId:x.messageId}),
    origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),board=buildSceneIntentBoard(f.db,f.guild,origin,[action],[]),
    [decision]=adjudicateSceneBoard(f.db,f.guild,origin,board,[{intent_ref:action.record_key,disposition:'request_pc_action_roll',
      rule_basis_refs:['srd:action-rolls'],trait:'Knowledge',difficulty:14,stakes_kind:'attempt_only',stakes:'An unsuccessful intrusion may leave a trace; no other effects.',
      reason:'The source-grounded native GM classifies this exact approach as an intrusion before dice.',difficulty_reason:'Current lab circumstances.',
      feature_ref:FEATURE,experience_ref:'',advantage:false,disadvantage:false}]);
  assert.equal(decision.status,'pending_pc_roll');
  const request=f.db.getCityRecord(f.guild,'roll_request',decision.data.native.roll_request_ref);
  if(roll){let n=0;contributeRoll(f.db,f.guild,x.pc.owner_user_id,{op:'roll',request:request.record_key,expected_revision:rollRevision(request),key:'lab-owner-roll'},
    {rng:()=>success?[11,10][n++]:[1,2][n++]});}
  const offer=traceOfferForRisk(f.db,f.guild,decision.data.native.environment_trace_risk);
  return {...x,action,decision,request,offer};
}
const choice=(s,branch='pay_hope')=>({op:'environment-trace-choice',request:s.offer.record_key,revision:hash(s.offer.data),choice:branch,accepted_intent:'',prerequisite:''});
const choose=(f,s,input=choice(s),user=s.pc.owner_user_id)=>chooseEnvironmentTrace(f.db,f.guild,user,input,
  {interactionId:'native-trace-owner-choice',authoredText:JSON.stringify(input)});
test('owner-authored HR14 pins 1 Hope without falsely qualifying feature execution',()=>{
  const rule=nativeHouseErratum('HR14');assert.equal(rule.interpretation.hope_cost,1);
  assert.equal(rule.authority_ref,'owner:everything-logs-hope:v1');assert.equal(rule.interpretation.silence,'never_authorizes_payment');
});
test('native intrusion risk precedes dice; no offer, payment, extra reaction or consequence is inferred before failure',()=>nativeFixture(f=>{
  const s=fixture(f,{roll:false}),before=structuredClone(f.db.getCharacter(s.pc.id).data.resources);
  assert.equal(s.offer,null);assert.equal(s.request.data.roll_id,undefined);
  assert.deepEqual(f.db.getCharacter(s.pc.id).data.resources,before);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'native_environment_trace_result',includeGM:true}).length,0);
}));
test('an actual successful action creates no failed-intrusion trace response',()=>nativeFixture(f=>{
  const s=fixture(f,{success:true});assert.equal(s.offer,null);
  const request=f.db.getCityRecord(f.guild,'roll_request',s.request.record_key);assert.equal(typedRollProof(f.db,f.guild,request).outcome,'success');
}));
test('actual owner command pays exactly 1 Hope once and does not replay normal Daggerheart metacurrency or dice',()=>nativeFixture(async f=>{
  const s=fixture(f),before=structuredClone(f.db.getCharacter(s.pc.id).data.resources),saved=f.db.getCityRecord(f.guild,'roll_request',s.request.record_key),
    fear=f.db.getCampaign(f.guild).fear,replies=[],guild={id:f.guild,channels:{fetch:async()=>null},members:{fetch:async()=>({send:async()=>({id:'ack',channelId:'dm'})})}};
  const command=id=>({id,guildId:f.guild,guild,user:{id:s.pc.owner_user_id,username:'Owner'},commandName:'vc-roll',memberPermissions:{has:()=>false},
    isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,
    options:{getSubcommand:()=> 'window',getSubcommandGroup:()=>null,getString:k=>k==='json'?JSON.stringify(choice(s)):null},
    reply:async p=>replies.push(p),deferReply:async()=>{},editReply:async p=>replies.push(p),followUp:async p=>replies.push(p)});
  assert(s.offer);await handleCommand(command('trace-pay'),{db:f.db,gm:{}});
  assert.equal(f.db.getCharacter(s.pc.id).data.resources.hope,before.hope-1,JSON.stringify(replies));
  const result=inspectEnvironmentTraceResult(f.db,f.guild,`${s.offer.record_key}:result`,s.pc.owner_user_id);
  assert.equal(result.data.trace,'suppressed');assert.equal(result.data.hope_spent,1);
  f.restart();await handleCommand(command('trace-pay-restart'),{db:f.db,gm:{}});
  assert.equal(f.db.getCharacter(s.pc.id).data.resources.hope,before.hope-1);assert.equal(f.db.getCampaign(f.guild).fear,fear);
  assert.deepEqual(f.db.getCityRecord(f.guild,'roll_request',saved.record_key).data.result,saved.data.result);
}));
test('leaving the trace is an explicit owner choice with no optional payment or extra resource effects',()=>nativeFixture(f=>{
  const s=fixture(f),before=structuredClone(f.db.getCharacter(s.pc.id).data.resources),result=choose(f,s,choice(s,'leave_trace'));
  assert.equal(result.data.trace,'recorded');assert.equal(result.data.hope_spent,0);assert.deepEqual(result.data.after,before);
  assert.equal(f.db.getCityRecord(f.guild,'native_environment_trace_offer',s.offer.record_key).status,'resolved');
  assert.throws(()=>choose(f,s,choice(s,'pay_hope')));assert.deepEqual(f.db.getCharacter(s.pc.id).data.resources,before);
}));
test('credible suppression requires the exact owner action targeting this trace and a native success/no-roll receipt',()=>nativeFixture(f=>{
  const s=fixture(f),a=actionFixture(f,'I suppress this trace using the accessible local console controls.',{privateScene:true});
  Object.assign(a.intent,{operation:'suppress_trace',target_key:s.offer.record_key,resolution:'auto'});
  Object.assign(a.ruling,{disposition:'narrative_no_roll',trait:null,difficulty:null,risk:'none',stakes:'none'});
  const mutation=a.run(),action=mutation.typedIntents.find(r=>r.data.operation==='suppress_trace'),current=f.db.getCityRecord(f.guild,'typed_intent',action.record_key),
    input={...choice(s,'native_suppression'),accepted_intent:current.record_key,prerequisite:current.data.outcome_receipt},
    before=structuredClone(f.db.getCharacter(s.pc.id).data.resources),row=choose(f,s,input);
  assert.equal(row.data.trace,'suppressed');assert.equal(row.data.hope_spent,0);assert.deepEqual(row.data.after,before);
  assert(inspectEnvironmentTraceResult(f.db,f.guild,row.record_key,s.pc.owner_user_id));
}));
for(const change of ['wrong-owner','stale-terms','revoked-origin','fake-role','no-native-suppression'])
test(`native trace choice rejects ${change} without optional spending`,()=>nativeFixture(f=>{
  const s=fixture(f);let input=choice(s),user=s.pc.owner_user_id;
  if(change==='wrong-owner')user=f.pcs[1].owner_user_id;
  if(change==='stale-terms')input.revision='stale';
  if(change==='revoked-origin')indexWorldEvent(f.db,f.guild,{key:s.sourceRef,status:'retracted'});
  if(change==='fake-role')input={...input,gm:true};
  if(change==='no-native-suppression')input={...input,choice:'native_suppression',accepted_intent:s.action.record_key,prerequisite:'fake-result'};
  const before=changes(f),pcs=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  assert.throws(()=>choose(f,s,input,user));assert.equal(changes(f),before);assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),pcs);
}));
test('source-bound trace notice stays private, excludes GM classification and revalidates owner/source after restart',()=>nativeFixture(f=>{
  const s=fixture(f),notice=nativeGmNotice(f.db,f.guild,s.decision.record_key,s.scope);
  assert.match(notice.text,/exactly 1 Hope/);assert(!notice.text.includes(s.offer.data.classification));
  assert.throws(()=>nativeGmNotice(f.db,f.guild,s.decision.record_key,{...s.scope,mode:'party'}));
  assert.throws(()=>nativeGmNotice(f.db,f.guild,s.decision.record_key,{...s.scope,actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id}));
  f.restart();indexWorldEvent(f.db,f.guild,{key:s.offer.source_event,status:'retracted'});
  assert.throws(()=>inspectEnvironmentTrace(f.db,f.guild,s.offer.record_key));
}));
