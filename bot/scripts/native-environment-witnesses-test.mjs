/** W6 producer/output/negative/restart fixtures. Intentionally UNRUN during construction freeze. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,candidate,unit} from './narrative-fixtures.mjs';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';
import {establishFact} from '../src/epistemic.js';
import {authorNarrativeRequests,establishNarrativeUnits} from '../src/narrative-authority.js';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {establishNativeEnvironmentInstance} from '../src/native-environment-instance.js';
import {createArbitrationOrigin,buildSceneIntentBoard} from '../src/scene-intent-board.js';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {applyEnvironmentWitnessAccounts,inspectEnvironmentWitnessAccounts,environmentWitnessAccountsProjection} from '../src/native-environment-witnesses.js';
const FEATURE='environment:haunted-nightclub:everybody-saw-something-different';
const changes=f=>f.db.db.prepare('SELECT total_changes() n').get().n;
async function fixture(f,{privateScene=false}={}){
  const x=setup(f,{text:'What is happening here?',privateScene,messageId:'nightclub-witnesses'}),scene=currentScene(f.db,f.guild);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,authoring:true}});
  const visibility=privateScene?'character':'party',subject=privateScene?x.pc.id:null;
  const event=(key,details={})=>indexWorldEvent(f.db,f.guild,{key,kind:'observation',title:'Synthetic authenticated GM observation',
    source_id:'human_gm',truth_status:'observed',visibility,subject_key:subject,session_id:scene.session_id,
    scene:scene.key,location_key:'terminal',details},'offline-gm');
  const establish=(category,content,prior)=>{
    const id=f.db.addFact(f.guild,{category,content,visibility,subjectCharacterId:subject,source:'human_gm',
      provenance:{epistemic:{kind:'observation',source_refs:[prior.event_key],perspective:'gm:offline-gm'}}});
    establishFact(f.db,f.guild,id,'offline-gm');return id;
  };
  const actual=event('nightclub-independent-incident',{observation:'A spectral figure crossed the closed stage door.'}),
    incident=establish('supernatural_incident','A spectral figure crossed the closed stage door.',actual),
    details=['The stage lamp was blue.','The floor tiles were wet.','The music stopped briefly.'],
    assertions=['The figure entered through the north door.','The figure entered through the south door.','The figure entered through the west door.'];
  const accountInputs=details.map((detail,i)=>{
    const npc=`nightclub-witness-${i}`;
    f.db.upsertNpcProfile(f.guild,{npcKey:npc,displayName:`Witness ${i+1}`,role:'club witness'});
    f.db.setSimulationEntity(f.guild,'npc',npc,{location_key:'terminal',visibility:'party'});
    const source=event(`${npc}:observation`,{npc_key:npc,quote:detail,observation:detail});
    recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:npc,location_key:'terminal',zone:'interior',state:'actually_present',
      visibility,subject_key:subject,source_event:source.event_key},'offline-gm');
    f.db.upsertNpcKnowledge(f.guild,{npcKey:npc,knowledgeKey:'own-detail',content:detail,sourceRef:source.event_key,beliefState:'known',isSecret:false});
    return {npc,evidence_ref:source.event_key,truth_ref:establish('clue',detail,source)};
  });
  const request={version:8,kind:'narrative_request',operation:'describe_scene',source_refs:[]},
    result={...candidate(x.text),gm_world_parts:[request]};
  await authorNarrativeRequests({db:f.db,guild:f.guild,result,scope:x.scope,sourceRef:x.sourceRef,budget:{used:false},
    generate:async()=>({fiction_delta:[],narrative_units:accountInputs.map((a,i)=>unit(`witness-${i}`,'npc_speech',`${details[i]} ${assertions[i]}`,
      {subject_key:a.npc,visibility,epistemic:'testimony',source_refs:[a.evidence_ref]}))})});
  const units=establishNarrativeUnits(f.db,f.guild,request,x.scope,x.sourceRef);
  assert.equal(units.length,3,'fixture requires three actually validated native NPC utterances');
  const profile=establishNativeEnvironmentInstance(f.db,f.guild,buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),
    {version:1,environment:'environment:haunted-nightclub',location:'terminal'}),
    [accepted]=persistPlayerIntents(f.db,f.guild,candidate(x.text).player_intents,x.scope,{messageId:x.messageId}),
    origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),board=buildSceneIntentBoard(f.db,f.guild,origin,[accepted],[]),
    proposal={version:1,feature_ref:FEATURE,environment:profile.record_key,incident_ref:incident,
      accounts:accountInputs.map(a=>({...a,unit_ref:units.find(u=>u.data.unit.subject_key===a.npc).record_key})),
      inconsistency:[[0,1],[0,2],[1,2]].map(([left,right])=>({left:assertions[left],right:assertions[right]}))};
  return {...x,origin,board,proposal,details};
}
test('real native producer emits exactly three attributed accounts; replay and restart preserve receipt without PC/Fear changes',()=>nativeFixture(async f=>{
  const x=await fixture(f),pcs=f.pcs.map(p=>f.db.getCharacter(p.id)),fear=f.db.getCampaign(f.guild).fear,
    row=applyEnvironmentWitnessAccounts(f.db,f.guild,x.origin,x.board,x.proposal),view=environmentWitnessAccountsProjection(f.db,f.guild,row.record_key,x.scope);
  assert.equal(row.status,'resolved');assert.equal(row.data.accounts.length,3);assert.equal(row.data.judgment.truth_promotion,false);
  assert.equal((view.text.match(/Witness \d:/g)||[]).length,3);
  for(const detail of x.details)assert(view.text.includes(detail));
  assert(!view.text.includes('supernatural_incident'));assert(!view.text.includes('gm_fact_ruling'));
  assert.deepEqual(f.pcs.map(p=>f.db.getCharacter(p.id)),pcs);assert.equal(f.db.getCampaign(f.guild).fear,fear);
  const written=changes(f);assert.deepEqual(applyEnvironmentWitnessAccounts(f.db,f.guild,x.origin,x.board,x.proposal),row);assert.equal(changes(f),written);
  f.restart();const restarted=changes(f);assert.deepEqual(inspectEnvironmentWitnessAccounts(f.db,f.guild,row.record_key,x.scope),row);
  assert.deepEqual(environmentWitnessAccountsProjection(f.db,f.guild,row.record_key,x.scope),view);assert.equal(changes(f),restarted);
  f.db.endSession(f.guild,'');f.restart();
  assert.deepEqual(inspectEnvironmentWitnessAccounts(f.db,f.guild,row.record_key,x.scope),row);
  assert.throws(()=>environmentWitnessAccountsProjection(f.db,f.guild,row.record_key,x.scope));
}));
for(const variation of ['role_flag','duplicate_actor','unestablished_incident','unsupported_native_incident','foreign_evidence','foreign_truth','false_pair','forged_board'])
  test(`witness producer holds ${variation} before mutation`,()=>nativeFixture(async f=>{
    const x=await fixture(f),p=structuredClone(x.proposal);let board=x.board;
    if(variation==='role_flag')p.gm=true;
    if(variation==='duplicate_actor')p.accounts[1].npc=p.accounts[0].npc;
    if(variation==='unestablished_incident')p.incident_ref=f.db.addFact(f.guild,{category:'supernatural_incident',content:'Unestablished model claim',source:'ai_gm'});
    if(variation==='unsupported_native_incident')p.incident_ref='native:unsupported-supernatural-flag';
    if(variation==='foreign_evidence')p.accounts[0].evidence_ref=p.accounts[1].evidence_ref;
    if(variation==='foreign_truth')p.accounts[0].truth_ref=p.accounts[1].truth_ref;
    if(variation==='false_pair')p.inconsistency[0].left='Words nobody said';
    if(variation==='forged_board')board={...x.board,data:{...x.board.data,entries:[]}};
    const before=changes(f);assert.throws(()=>applyEnvironmentWitnessAccounts(f.db,f.guild,x.origin,board,p));assert.equal(changes(f),before);
  }));
test('serialized GM role cannot produce accounts',()=>nativeFixture(async f=>{
  const x=await fixture(f),before=changes(f);
  assert.throws(()=>applyEnvironmentWitnessAccounts(f.db,f.guild,{gm:true},x.board,x.proposal));assert.equal(changes(f),before);
}));
test('private native speech cannot change recipients; retracted own evidence holds projection across restart',()=>nativeFixture(async f=>{
  const x=await fixture(f,{privateScene:true}),row=applyEnvironmentWitnessAccounts(f.db,f.guild,x.origin,x.board,x.proposal);
  assert.throws(()=>environmentWitnessAccountsProjection(f.db,f.guild,row.record_key,{...x.scope,mode:'party'}));
  assert.throws(()=>environmentWitnessAccountsProjection(f.db,f.guild,row.record_key,{mode:'private',actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id}));
  const source=f.db.getWorldEvent(f.guild,x.proposal.accounts[0].evidence_ref);
  indexWorldEvent(f.db,f.guild,{...source,key:source.event_key,status:'retracted'},'offline-gm');
  f.restart();const before=changes(f);assert.throws(()=>environmentWitnessAccountsProjection(f.db,f.guild,row.record_key,x.scope));
  assert.equal(changes(f),before);assert.equal(f.db.getCityRecord(f.guild,row.kind,row.record_key).status,'resolved');
}));
test('departed witness holds new output without deleting historical testimony',()=>nativeFixture(async f=>{
  const x=await fixture(f),row=applyEnvironmentWitnessAccounts(f.db,f.guild,x.origin,x.board,x.proposal),npc=x.proposal.accounts[0].npc;
  f.db.setSimulationEntity(f.guild,'npc',npc,{location_key:'elsewhere',visibility:'party'});
  const before=changes(f);assert.deepEqual(inspectEnvironmentWitnessAccounts(f.db,f.guild,row.record_key,x.scope),row);
  assert.throws(()=>environmentWitnessAccountsProjection(f.db,f.guild,row.record_key,x.scope));assert.equal(changes(f),before);
}));
