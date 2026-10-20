/** W3 native operational-flag migration fixtures; authored only until complete phase freeze. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {configureDelegation,dispatchAiIntents,delegateConsequence,delegateWorldGoal,stateRevision as state} from '../src/ai-intents.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {configureSimulationEntity} from '../src/simulation.js';
import {submitInstitutionAction} from '../src/city-core.js';
import {prepareNativeWorldOperation,nativeWorldOperationAllows,inspectNativeWorldOperationReceipt} from '../src/native-world-operations.js';
import {updateCityCivic} from '../src/city-civic.js';
import {subscribeConsequence,coordinateConsequences} from '../src/city-consequences.js';
import {runMotivationCycle} from '../src/simulation-motivation.js';
import {updateCityCore,fileInstitutionReport,assignDistrictLocation} from '../src/city-core.js';
function setup(f){
  const {db,guild}=f;
  db.setCityCalendar(guild,{flags:{...db.getCityCalendar(guild).flags,narrative_authority:true,playable_narration:true,emergent_goals:false}});
  const source=indexWorldEvent(db,guild,{key:'world-goal-context',kind:'observation',title:'Native established courier circumstances',
    source_id:'human_gm',visibility:'gm'},'fixture-gm');
  db.upsertNpcProfile(guild,{npcKey:'courier',displayName:'Courier'});
  configureSimulationEntity(db,guild,'npc','courier',{location_key:'terminal',resources:{information:2}});
  db.upsertNpcKnowledge(guild,{npcKey:'courier',knowledgeKey:'delivery',content:'A parcel awaits collection.',beliefState:'known',
    sourceRef:source.event_key,confidence:90});
  const policy=configureDelegation(db,guild,{mode:'routine_delegated',allow:['goal.propose','goal.reprioritize','goal.pause','goal.resume'],
    max_operations:4,max_cost:0,expires_minute:100},'fixture-gm'),
    intent={version:1,feature:'goal',target_key:'',expected_revision:'absent',policy_revision:policy.data.revision,source_prerequisites:[],
      payload:{actor_type:'npc',actor_key:'courier',information_key:'delivery',source_event:source.event_key,op:'propose',goal_key:'collect',
        new_goal_key:'',objective:'Arrange collection of the parcel.',reason:'Existing sourced duty.',priority:50,confidence:80,horizon:'near',
        dependencies:[],acceptable_methods:['observe','prepare'],conflicts:[]}},
    context={origin:'native-world-fixture',scope:{mode:'party'},sessionId:f.session.id};
  return {source,policy,intent,context};
}
test('W3 delegated source-grounded native goal needs no extra operational feature toggle or human review',()=>nativeFixture(f=>{
  const x=setup(f),before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),
    receipt=dispatchAiIntents(f.db,f.guild,[x.intent],x.context)[0];
  assert.equal(receipt.status,'accepted');assert.equal(receipt.data.authority_origin.kind,'native_ai_gm');
  assert.equal(f.db.getNpcGoal(f.guild,'courier','collect').status,'active');
  assert.equal(f.db.getCityCalendar(f.guild).flags.emergent_goals,false,'No persistent flag rewrite');
  assert.equal(f.db.listCityRecords(f.guild,{kind:'goal_transition',includeGM:true})[0].status,'approved');
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
}));
test('W3 opaque native grant cannot be cloned, switched to another actor, expired or forged by JSON',()=>nativeFixture(f=>{
  const x=setup(f),grant=prepareNativeWorldOperation(f.db,f.guild,x.intent,x.context);
  assert(grant);assert(nativeWorldOperationAllows(f.db,f.guild,grant,'goal','propose',x.intent.payload));
  for(const fake of [{...grant},{gm:true},null])assert.equal(nativeWorldOperationAllows(f.db,f.guild,fake,'goal','propose',x.intent.payload),false);
  assert.equal(nativeWorldOperationAllows(f.db,f.guild,grant,'goal','propose',{...x.intent.payload,actor_key:'another'}),false);
  f.db.advanceSimulationClock(f.guild,{minutes:100});
  assert.equal(nativeWorldOperationAllows(f.db,f.guild,grant,'goal','propose',x.intent.payload),false);
}));
for(const change of ['pause','manual','revoked-source','player-control','policy'])test(`W3 native goal migration preserves ${change} authority boundary`,()=>nativeFixture(f=>{
  const x=setup(f);
  if(change==='pause')f.db.setDirectorPaused(f.guild,true);
  if(change==='manual')f.db.saveCityRecord(f.guild,{kind:'gm_authority',key:'campaign',source_event:x.source.event_key,data:{gm_authority_mode:'manual'}});
  if(change==='revoked-source')f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.source.event_key);
  if(change==='player-control')configureSimulationEntity(f.db,f.guild,'npc','courier',{owner_control_type:'player'});
  if(change==='policy')x.intent.policy_revision++;
  const receipt=dispatchAiIntents(f.db,f.guild,[x.intent],x.context)[0];
  assert.notEqual(receipt.status,'accepted');assert.equal(f.db.getNpcGoal(f.guild,'courier','collect'),null);
}));
test('W3 native goal receipt remains exact read-only history after policy expiry/restart, without reexecuting transition',()=>nativeFixture(f=>{
  const x=setup(f),receipt=dispatchAiIntents(f.db,f.guild,[x.intent],x.context)[0];assert.equal(receipt.status,'accepted');
  f.db.advanceSimulationClock(f.guild,{minutes:100});f.restart();const before=f.db.db.prepare('SELECT total_changes() n').get().n;
  assert.deepEqual(dispatchAiIntents(f.db,f.guild,[x.intent],x.context)[0],receipt);
  assert.equal(f.db.db.prepare('SELECT total_changes() n').get().n,before);
  assert(inspectNativeWorldOperationReceipt(f.db,f.guild,receipt));
  const changed={...receipt,data:{...receipt.data,authority_origin:{...receipt.data.authority_origin,operation:'complete'}}};
  assert.throws(()=>inspectNativeWorldOperationReceipt(f.db,f.guild,changed),/ancestry changed/);
}));

test('W3 actual deterministic motivation coordinator executes an entitled subjective goal once, not one model job per actor',()=>nativeFixture(f=>{
  setup(f);const budget={operations:0,cost:0},run=()=>runMotivationCycle(f.db,f.guild,4,
    {onNativeProposal:payload=>delegateWorldGoal(f.db,f.guild,payload,budget)});
  const first=run();assert.equal(first.length,1);assert.equal(first[0].status,'accepted');
  assert.equal(first[0].data.authority_origin.kind,'native_ai_gm');
  assert.match(f.db.getNpcGoal(f.guild,'courier',first[0].data.intent.payload.goal_key).objective,/Investigate the report/);
  assert.deepEqual(run(),[]);f.restart();assert.deepEqual(run(),[]);
}));

function service(f){
  const x=setup(f);configureSimulationEntity(f.db,f.guild,'location','terminal',{name:'Terminal'});
  configureDelegation(f.db,f.guild,{mode:'routine_delegated',allow:['consequence.apply','consequence.subscribe','consequence.unsubscribe'],
    max_operations:4,max_cost:10,expires_minute:100},'fixture-gm');
  updateCityCore(f.db,f.guild,{kind:'institution',key:'utility',source_event:x.source.event_key,
    data:{name:'Established utility operator',mandate:'Maintain local water',public_policy:'Service maintenance',private_objectives:[],
      jurisdictions:[],procedures:['inspect_request'],capacity:2}},'fixture-gm');
  updateCityCivic(f.db,f.guild,{kind:'infrastructure',key:'terminal-water',source_event:x.source.event_key,
    data:{name:'Terminal water',service:'water',native_condition:80,operator:'utility',locations:['terminal'],repair_requirements:['Technician']}},'fixture-gm');
  const subscription=subscribeConsequence(f.db,f.guild,{op:'subscribe',key:'physical-water',source_event:x.source.event_key,handler:'service',
    entity_key:'terminal-water',event_kinds:['infrastructure_damage'],location_key:'terminal',payload:{delta:-3}},'fixture-gm');
  const event=indexWorldEvent(f.db,f.guild,{key:'native-broken-pipe',kind:'infrastructure_damage',title:'Established broken supply pipe',
    source_id:'human_gm',location_key:'terminal',visibility:'gm'},'fixture-gm');
  return {subscription,event};
}
test('W3 existing native causal coordinator applies a source-matched service consequence without a routine flag or double effect',()=>nativeFixture(f=>{
  service(f);const budget={operations:0,cost:0},run=()=>coordinateConsequences(f.db,f.guild,4,{onProposed:r=>delegateConsequence(f.db,f.guild,r,budget)}),
    rows=run();assert.equal(rows.length,1);assert.equal(rows[0].status,'completed');
  assert.equal(f.db.getCityRecord(f.guild,'infrastructure','terminal-water').data.native_condition,77);
  assert.deepEqual(run(),[]);f.restart();assert.deepEqual(run(),[]);
  assert.equal(f.db.getCityRecord(f.guild,'infrastructure','terminal-water').data.native_condition,77);
  assert.equal(f.db.getCityCalendar(f.guild).flags.consequences===true,false,'No persistent operational-flag rewrite');
}));
test('W3 cancelled subscription cannot authorize a previously queued native service effect',()=>nativeFixture(f=>{
  const x=service(f),rows=coordinateConsequences(f.db,f.guild,4);assert.equal(rows.length,1);
  subscribeConsequence(f.db,f.guild,{op:'unsubscribe',key:x.subscription.record_key,source_event:x.subscription.source_event},'fixture-gm');
  const attempted=delegateConsequence(f.db,f.guild,rows[0]);assert.notEqual(attempted.status,'accepted');
  assert.equal(f.db.getCityRecord(f.guild,'infrastructure','terminal-water').data.native_condition,80);
  assert.equal(f.db.getCityRecord(f.guild,'consequence',rows[0].record_key).status,'pending');
}));

function group(f){
  const x=setup(f);f.db.upsertNpcProfile(f.guild,{npcKey:'porter',displayName:'Porter'});
  configureSimulationEntity(f.db,f.guild,'npc','porter',{location_key:'terminal',resources:{information:2}});
  f.db.upsertNpcKnowledge(f.guild,{npcKey:'porter',knowledgeKey:'delivery',content:'A parcel awaits collection.',beliefState:'known',sourceRef:x.source.event_key});
  const policy=configureDelegation(f.db,f.guild,{mode:'routine_delegated',allow:['group.propose','group.respond'],max_operations:4,max_cost:0,expires_minute:100},'fixture-gm');
  const payload={source_event:x.source.event_key,op:'propose',operation:'form',group_key:'parcel-crew',name:'Parcel crew',members:['courier','porter'],
    from_groups:[],shared_projects:[],member:'courier',decision:'',information_key:'delivery',reason:'Existing NPCs consider cooperating.'};
  return {...x,intent:{version:1,feature:'group',target_key:'',expected_revision:'absent',policy_revision:policy.data.revision,source_prerequisites:[],payload}};
}
test('W3 native group producer waits for independently sourced NPC responses and creates no capacity or player membership',()=>nativeFixture(f=>{
  const x=group(f),proposal=dispatchAiIntents(f.db,f.guild,[x.intent],x.context)[0];assert.equal(proposal.status,'accepted');
  const key=proposal.data.result.record_key;assert.equal(f.db.getCityRecord(f.guild,'community','parcel-crew'),null);
  let receipt;
  for(const member of ['courier','porter']){
    const row=f.db.getCityRecord(f.guild,'group_transition',key);
    receipt=dispatchAiIntents(f.db,f.guild,[{...x.intent,target_key:key,expected_revision:state(row),payload:{...x.intent.payload,op:'respond',member,decision:'accept'}}],
      {...x.context,origin:`native-group:${member}`})[0];assert.equal(receipt.status,'accepted');
  }
  const community=f.db.getCityRecord(f.guild,'community','parcel-crew');assert(community);assert.equal(community.data.capacity,0);
  assert.deepEqual(community.data.members.sort(),['courier','porter']);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'community_membership',includeGM:true}).length,0);
  f.restart();assert.deepEqual(dispatchAiIntents(f.db,f.guild,[x.intent],x.context)[0],proposal);
}));
test('W3 player-participating community cannot be reassigned by NPC group votes',()=>nativeFixture(f=>{
  const x=group(f);
  updateCityCivic(f.db,f.guild,{kind:'community',key:'parcel-crew',source_event:x.source.event_key,
    data:{name:'Existing PC community',capacity:0,members:[],priorities:[],shared_history:[]}},'fixture-gm');
  f.db.saveCityRecord(f.guild,{kind:'community_membership',key:`${f.pcs[0].id}:parcel-crew`,status:'active',actor_key:'community:parcel-crew',
    subject_key:f.pcs[0].id,source_event:x.source.event_key,data:{role:'founder'}});
  const before=f.db.getCityRecord(f.guild,'community','parcel-crew');
  const attempted=dispatchAiIntents(f.db,f.guild,[{...x.intent,payload:{...x.intent.payload,operation:'join'}}],x.context)[0];
  assert.notEqual(attempted.status,'accepted');assert.deepEqual(f.db.getCityRecord(f.guild,'community','parcel-crew'),before);
}));

function institution(f,type='document_request'){
  const x=setup(f);configureSimulationEntity(f.db,f.guild,'location','terminal',{name:'Terminal'});
  updateCityCore(f.db,f.guild,{kind:'district',key:'north',source_event:x.source.event_key,data:{name:'North',indices:{},connections:[]}},'fixture-gm');
  assignDistrictLocation(f.db,f.guild,{district:'north',location:'terminal',source_event:x.source.event_key},'fixture-gm');
  updateCityCore(f.db,f.guild,{kind:'institution',key:'parcel-office',source_event:x.source.event_key,
    data:{name:'Parcel office',mandate:'Process lawful parcel inquiries',public_policy:'Requests receive native review.',private_objectives:[],
      jurisdictions:['north'],procedures:['document_request','seek_warrant','issue_policy'],capacity:3}},'fixture-gm');
  fileInstitutionReport(f.db,f.guild,{key:'parcel-report',institution:'parcel-office',source_event:x.source.event_key,
    from_type:'npc',from_key:'courier',information_key:'delivery',authorized:true},'fixture-gm');
  const policy=configureDelegation(f.db,f.guild,{mode:'routine_delegated',allow:['institution.act'],max_operations:4,max_cost:4,expires_minute:100},'fixture-gm');
  const payload={op:'act',source_event:x.source.event_key,institution:'parcel-office',information_key:'parcel-report',jurisdiction:'north',
    type,target_type:'location',target_key:'terminal',report_keys:['parcel-report'],personnel_key:''};
  return {...x,intent:{version:1,feature:'institution',target_key:'',expected_revision:'absent',policy_revision:policy.data.revision,source_prerequisites:[],payload}};
}
for(const type of ['document_request','seek_warrant'])test(`W3 native institution ${type} files one real request, never PC capture or a granted warrant`,()=>nativeFixture(f=>{
  const x=institution(f,type),before=f.pcs.map(pc=>f.db.getCharacter(pc.id)),receipt=dispatchAiIntents(f.db,f.guild,[x.intent],x.context)[0];
  assert.equal(receipt.status,'accepted');assert.equal(receipt.data.result.status,'completed');
  assert.equal(f.db.getCityRecord(f.guild,'institution','parcel-office').data.capacity,2);
  const event=f.db.getWorldEvent(f.guild,`institution:${receipt.data.result.record_key}`);assert.equal(event.details.request_only,true);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id)),before);
  f.restart();assert.deepEqual(dispatchAiIntents(f.db,f.guild,[x.intent],x.context)[0],receipt);
  assert.equal(f.db.getCityRecord(f.guild,'institution','parcel-office').data.capacity,2);
}));

test('existing pending institutional request needs its exact source-bound act grant before one capacity debit',()=>nativeFixture(f=>{
  const x=institution(f,'seek_warrant'),{op,...action}=x.intent.payload,
    pending=submitInstitutionAction(f.db,f.guild,{...action,key:'existing-native-request'},'fixture-gm');
  assert.equal(pending.status,'pending');
  const intent={...x.intent,target_key:pending.record_key,expected_revision:state(pending)};
  const changed=dispatchAiIntents(f.db,f.guild,[{...intent,payload:{...intent.payload,type:'document_request'}}],
    {...x.context,origin:'changed-existing-procedure'})[0];
  assert.notEqual(changed.status,'accepted');
  assert.equal(f.db.getCityRecord(f.guild,'institution','parcel-office').data.capacity,3);
  const accepted=dispatchAiIntents(f.db,f.guild,[intent],{...x.context,origin:'exact-existing-procedure'})[0];
  assert.equal(accepted.status,'accepted');assert.equal(accepted.data.result.record_key,pending.record_key);
  assert.equal(f.db.getCityRecord(f.guild,'institution','parcel-office').data.capacity,2);
  f.restart();assert.deepEqual(dispatchAiIntents(f.db,f.guild,[intent],{...x.context,origin:'exact-existing-procedure'})[0],accepted);
  assert.equal(f.db.getCityRecord(f.guild,'institution','parcel-office').data.capacity,2);
  assert.equal(f.db.getWorldEvent(f.guild,`institution:${pending.record_key}`).details.request_only,true);
}));
for(const change of ['report','jurisdiction','capacity','player-target','policy'])test(`W3 institutional ${change} mismatch cannot spend or assert a fictional outcome`,()=>nativeFixture(f=>{
  const x=institution(f);
  if(change==='report')f.db.saveCityRecord(f.guild,{...f.db.getCityRecord(f.guild,'report','parcel-report'),key:'parcel-report',status:'retracted'});
  if(change==='jurisdiction')x.intent.payload.jurisdiction='unestablished';
  if(change==='capacity'){
    const old=f.db.getCityRecord(f.guild,'institution','parcel-office');f.db.saveCityRecord(f.guild,{...old,key:old.record_key,data:{...old.data,capacity:0}});
  }
  if(change==='player-target'){x.intent.payload.target_type='character';x.intent.payload.target_key=f.pcs[0].id;}
  if(change==='policy')x.intent.policy_revision++;
  assert.notEqual(dispatchAiIntents(f.db,f.guild,[x.intent],x.context)[0].status,'accepted');
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).filter(e=>e.event_key.startsWith('institution:')).length,0);
}));
