import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {createNpcMotivationRules,motivationKey} from '../../src/frameworks/npc/public.js';
import {createWorldAvailability,requireCitySource,cityObject,cityKey,cityInteger,cityAudit,indexWorldEvent} from '../../src/frameworks/world/public.js';
import {createActorControlRules} from '../../src/frameworks/daggerheart/public.js';
import {jsonHash} from '../../src/kernel/json-hash.js';
import * as original from '../../src/simulation-motivation.js';

function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'rf04-npc-motives-')),file=join(dir,'motives.sqlite'),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));let db=new VeiledDB(file,schema),proxy=false,nativeReady=false,transfer=null;
 db.ensureCampaign('g');db.setCityCalendar('g',{flags:{emergent_goals:true}});db.upsertNpcProfile('g',{npcKey:'courier',displayName:'Courier',decisionProfile:{lawfulness:50,violence_threshold:70}});db.setSimulationEntity('g','npc','courier',{activity_tier:'supporting',location_key:'harbor',resources:{information:2,materials:4}});indexWorldEvent(db,'g',{key:'evidence',title:'A report about the dock',source_id:'gm:report',visibility:'gm'});
 const know=(patch={})=>db.upsertNpcKnowledge('g',{npcKey:'courier',knowledgeKey:'dock-report',content:'A witness suspects an ordinary delivery was delayed.',beliefState:'rumor',confidence:65,sourceType:'told_by_npc',sourceRef:'evidence',isSecret:true,...patch});know();
 const activeCityProxy=()=>proxy?{discord_user_id:'human-controller'}:null,native=createActorControlRules({capabilities:{activeCityProxy}}),world=createWorldAvailability({nativeActorControl:native.nativeActorControl,activeCityProxy,delegationPolicy:()=>{throw Error('unexpected strategy delegation');},nativeWorldStrategyStepAllowed:()=>false});
 const api=createNpcMotivationRules({cityObject,cityKey,cityInteger,cityAudit,requireCitySource,activeCityProxy,assertNpcAvailability:world.assertNpcAvailability,assertWorldActorControl:world.assertWorldActorControl,nativeWorldOperationAllows:()=>false,nativeWorldCoordinatorReady:()=>nativeReady,inspectWorldInformationTransfer:()=>transfer||{status:'held_source'}});
 const evidence=(patch={})=>({actor_type:'npc',actor_key:'courier',information_key:'dock-report',source_event:'evidence',...patch}),input=(patch={})=>({...evidence(),key:'change',op:'propose',goal_key:'investigate',objective:'Investigate the reported delivery delay.',priority:50,confidence:65,horizon:'near',dependencies:[],acceptable_methods:['investigate'],...patch});
 const approve=(patch={})=>{const row=api.proposeGoalTransition(db,'g',input(patch),'gm');return api.reviewGoalTransition(db,'g',{key:row.record_key,decision:'approve'},'gm');};
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});return {get db(){return db;},api,evidence,input,approve,know,setProxy:v=>proxy=v,setNativeReady:v=>nativeReady=v,setTransfer:v=>transfer=v,reopen(){db.close();db=new VeiledDB(file,schema);}};
}

test('stable motivation keys keep original export identity and exact kernel hash bytes',()=>{
 assert.equal(original.motivationKey,motivationKey);assert.equal(motivationKey(['npc','courier','evidence']),jsonHash(['npc','courier','evidence']).slice(0,32));
});

test('actor evidence stays subjective and secret, never canon or another actor knowledge',t=>{
 const f=fixture(t),proof=f.api.actorSource(f.db,'g',f.evidence());assert.equal(proof.evidence.belief_state,'rumor');assert.equal(proof.evidence.is_secret,1);assert.equal(proof.evidence.confidence,65);assert.equal(f.db.listCanon('g',{includeGM:true}).length,0);assert.equal(f.db.getNpcKnowledge('g','unrelated','dock-report'),undefined);assert.equal(f.db.getSimulationEntity('g','npc','courier').state.resources.information,2);
});

test('imported knowledge mapping requires exact actor, original source and current content hash',t=>{
 const f=fixture(t),known=f.know({sourceRef:'packaged:ordinary-report'}),key='source-link:'+motivationKey(['courier',known.knowledge_key]);assert.equal(f.api.ownedKnowledgeSource(f.db,'g','courier',known),null);f.db.saveCityRecord('g',{kind:'seed_knowledge_source',key,actor_key:'npc:courier',source_event:'evidence',data:{original_source_ref:known.source_ref,content_hash:motivationKey([known.content,known.belief_state,known.source_ref])}});assert.equal(f.api.ownedKnowledgeSource(f.db,'g','courier',known).event_key,'evidence');assert.equal(f.api.actorSource(f.db,'g',f.evidence()).event.event_key,'evidence');assert.equal(f.api.ownedKnowledgeSource(f.db,'g','courier',{...known,content:'changed assertion'}),null);
});

test('current native PC/proxy ownership and removed actor state block autonomous evidence use',t=>{
 const f=fixture(t),pc=f.db.createCharacter('g','owner','Player');assert.throws(()=>f.api.actorSource(f.db,'g',f.evidence({actor_key:pc.id})),/Player characters/);f.setProxy(true);assert.throws(()=>f.api.actorSource(f.db,'g',f.evidence()),/rightful principal|non-proxied/);f.setProxy(false);f.db.setSimulationEntity('g','npc','courier',{activity_tier:'dormant',resources:{information:2}});assert.throws(()=>f.api.actorSource(f.db,'g',f.evidence()),/unavailable/);
});

test('source retraction, unknown belief and finite investigative feasibility are independent current checks',t=>{
 const f=fixture(t);f.know({beliefState:'unknown'});assert.throws(()=>f.api.actorSource(f.db,'g',f.evidence()),/legitimately acquired/);f.know();f.db.setSimulationEntity('g','npc','courier',{activity_tier:'supporting',resources:{information:0}});assert.throws(()=>f.api.actorSource(f.db,'g',f.evidence()),/feasible investigative/);assert.doesNotThrow(()=>f.api.actorSource(f.db,'g',f.evidence(),{requireResources:false}));indexWorldEvent(f.db,'g',{key:'evidence',status:'retracted'});assert.throws(()=>f.api.actorSource(f.db,'g',f.evidence(),{requireResources:false}),/active source event/);
});

test('faction awareness and institutional reports require their own acquired source evidence',t=>{
 const f=fixture(t);f.db.setSimulationEntity('g','faction','guild',{activity_tier:'supporting',resources:{information:2}});assert.throws(()=>f.api.actorSource(f.db,'g',f.evidence({actor_type:'faction',actor_key:'guild'})),/legitimately acquired/);f.db.putSimulationRecord('g',{kind:'awareness',entityKey:'faction:guild',data:{information_key:'dock-report',content:'Attributed faction report',belief_state:'suspected',confidence:60,source_ref:'evidence'}});assert.equal(f.api.actorSource(f.db,'g',f.evidence({actor_type:'faction',actor_key:'guild'})).evidence.belief_state,'suspected');
 f.db.saveCityRecord('g',{kind:'institution',key:'watch',source_event:'evidence',data:{capacity:2,procedures:['investigate']}});f.db.saveCityRecord('g',{kind:'report',key:'dock-report',actor_key:'other',source_event:'evidence',data:{content:'Subjective report',belief_state:'rumor',confidence:60}});assert.throws(()=>f.api.actorSource(f.db,'g',f.evidence({actor_type:'institution',actor_key:'watch'})),/legitimately acquired/);f.db.saveCityRecord('g',{kind:'report',key:'dock-report',actor_key:'watch',source_event:'evidence',data:{content:'Subjective report',belief_state:'rumor',confidence:60}});assert.equal(f.api.actorSource(f.db,'g',f.evidence({actor_type:'institution',actor_key:'watch'})).evidence.belief_state,'rumor');
});

test('native information transfer requires its inspector and exact current report contents',t=>{
 const f=fixture(t);indexWorldEvent(f.db,'g',{key:'transfer',kind:'native_world_information_transfer',title:'Native transfer fixture',source_id:'native:transfer',details:{receipt_ref:'receipt'}});const known=f.know({sourceRef:'transfer'}),input=f.evidence({source_event:'transfer'});assert.throws(()=>f.api.actorSource(f.db,'g',input),/exact current native transfer/);f.setTransfer({status:'verified_native_transfer',report:known});assert.equal(f.api.actorSource(f.db,'g',input).evidence.content,known.content);f.setTransfer({status:'verified_native_transfer',report:{...known,confidence:66}});assert.throws(()=>f.api.actorSource(f.db,'g',input),/exact current native transfer/);
});

test('goal proposal records source belief privately without committing goal, canon, PC action or resource outcome',t=>{
 const f=fixture(t),row=f.api.proposeGoalTransition(f.db,'g',f.input(),'gm');assert.equal(row.status,'pending');assert.equal(row.visibility,'gm');assert.equal(row.data.source_belief,'rumor');assert.equal(row.data.source_confidence,65);assert.equal(f.db.getNpcGoal('g','courier','investigate'),null);assert.equal(f.db.listCanon('g',{includeGM:true}).length,0);assert.equal(f.db.getSimulationEntity('g','npc','courier').state.resources.information,2);assert.deepEqual(f.api.proposeGoalTransition(f.db,'g',f.input(),'other'),row);
});

test('disabled feature and stale native grant do not authorize proposal or approval',t=>{
 const f=fixture(t);f.db.setCityCalendar('g',{flags:{}});assert.throws(()=>f.api.proposeGoalTransition(f.db,'g',f.input(),'gm'),/existing opt-in or exact native/);f.db.setCityCalendar('g',{flags:{emergent_goals:true}});const row=f.api.proposeGoalTransition(f.db,'g',f.input(),'gm');assert.throws(()=>f.api.reviewGoalTransition(f.db,'g',{key:row.record_key,decision:'approve'},'native',{nativeAuthority:{}}),/authority changed/);assert.equal(f.db.getCityRecord('g','goal_transition','change').status,'pending');assert.equal(f.db.getNpcGoal('g','courier','investigate'),null);
});

test('approved source-bound goal persists and replays once across SQLite reopen without resource spend',t=>{
 const f=fixture(t),row=f.approve();assert.equal(row.status,'approved');assert.equal(f.db.getNpcGoal('g','courier','investigate').status,'active');assert.equal(f.db.mutationsForEntity('g','change').length,2);f.reopen();assert.deepEqual(f.api.reviewGoalTransition(f.db,'g',{key:'change',decision:'approve'},'gm'),row);assert.equal(f.db.mutationsForEntity('g','change').length,2);assert.equal(f.db.getSimulationEntity('g','npc','courier').state.resources.information,2);
});

test('rejected goal remains a historical proposal and never enters active NPC motives',t=>{
 const f=fixture(t);f.api.proposeGoalTransition(f.db,'g',f.input(),'gm');const result=f.api.reviewGoalTransition(f.db,'g',{key:'change',decision:'reject'},'gm');assert.equal(result.status,'rejected');assert.equal(f.db.getNpcGoal('g','courier','investigate'),null);assert.deepEqual(f.api.reviewGoalTransition(f.db,'g',{key:'change',decision:'approve'},'gm'),result);
});

test('source or prior-goal changes and missing dependencies hold approval before any new goal state',t=>{
 const f=fixture(t);f.api.proposeGoalTransition(f.db,'g',f.input({dependencies:['missing']}),'gm');assert.throws(()=>f.api.reviewGoalTransition(f.db,'g',{key:'change',decision:'approve'},'gm'),/Goal dependency not found/);assert.equal(f.db.getNpcGoal('g','courier','investigate'),null);f.db.upsertNpcGoal('g',{npcKey:'courier',goalKey:'investigate',objective:'Already established distinct objective'});assert.throws(()=>f.api.reviewGoalTransition(f.db,'g',{key:'change',decision:'approve'},'gm'),/Goal changed since proposal/);indexWorldEvent(f.db,'g',{key:'evidence',status:'retracted'});assert.throws(()=>f.api.reviewGoalTransition(f.db,'g',{key:'change',decision:'approve'},'gm'),/active source event/);
});

test('pause, resume and reprioritization use authoritative lifecycle status without losing the existing goal',t=>{
 const f=fixture(t);f.approve();f.approve({key:'pause',op:'pause'});assert.equal(f.db.getNpcGoal('g','courier','investigate').status,'paused');assert.throws(()=>f.api.proposeGoalTransition(f.db,'g',f.input({key:'pause-again',op:'pause'}),'gm'),/lifecycle/);f.approve({key:'priority',op:'reprioritize',priority:75});assert.equal(f.db.getNpcGoal('g','courier','investigate').priority,75);assert.equal(f.db.getNpcGoal('g','courier','investigate').status,'paused');f.approve({key:'resume',op:'resume'});assert.equal(f.db.getNpcGoal('g','courier','investigate').status,'active');
});

test('supersession retains old goal as superseded and creates only the specified new goal',t=>{
 const f=fixture(t);f.approve();f.approve({key:'supersede',op:'supersede',new_goal_key:'reconsider',objective:'Reconsider the attributed report.'});assert.equal(f.db.getNpcGoal('g','courier','investigate').status,'superseded');assert.equal(f.db.getNpcGoal('g','courier','reconsider').status,'active');assert.equal(f.db.getNpcGoal('g','courier','reconsider').objective,'Reconsider the attributed report.');assert.equal(f.db.getSimulationEntity('g','npc','courier').state.resources.materials,4);
});

test('goal approval audit failure rolls goal, lifecycle and receipt status back in actual SQLite',t=>{
 const f=fixture(t);f.api.proposeGoalTransition(f.db,'g',f.input(),'gm');const originalMutation=f.db.recordMutation;f.db.recordMutation=()=>{throw Error('injected NPC goal audit failure');};assert.throws(()=>f.api.reviewGoalTransition(f.db,'g',{key:'change',decision:'approve'},'gm'),/injected NPC goal audit/);f.db.recordMutation=originalMutation;assert.equal(f.db.getNpcGoal('g','courier','investigate'),null);assert.equal(f.db.getCityRecord('g','goal_state',JSON.stringify(['npc','courier','investigate'])),null);assert.equal(f.db.getCityRecord('g','goal_transition','change').status,'pending');
});

test('bounded motivation cycle proposes from actual subjective evidence, replays none and honors Director pause',t=>{
 const f=fixture(t);const rows=f.api.runMotivationCycle(f.db,'g',1);assert.equal(rows.length,1);assert.equal(rows[0].status,'pending');assert.equal(rows[0].data.source_belief,'rumor');assert.equal(f.db.listNpcGoals('g','courier').length,0);assert.deepEqual(f.api.runMotivationCycle(f.db,'g',1),[]);f.db.setDirectorPaused('g',true);assert.deepEqual(f.api.runMotivationCycle(f.db,'g',4),[]);assert.equal(f.db.listCanon('g',{includeGM:true}).length,0);
});

test('native callback cycle emits an exact source proposal and does not manufacture its domain commitment',t=>{
 const f=fixture(t),seen=[];f.db.setCityCalendar('g',{flags:{}});f.setNativeReady(true);const result=f.api.runMotivationCycle(f.db,'g',1,{onNativeProposal:proposal=>{seen.push(proposal);return {status:'accepted',fixture_receipt:'mock-native-dispatch'};}});assert.equal(result.length,1);assert.equal(seen.length,1);assert.equal(seen[0].actor_type,'npc');assert.equal(seen[0].actor_key,'courier');assert.equal(seen[0].source_event,'evidence');assert.equal(seen[0].information_key,'dock-report');assert.equal(f.db.listNpcGoals('g','courier').length,0);assert.equal(f.db.listCityRecords('g',{kind:'goal_transition',includeGM:true}).length,0);
});

test('actual original NPC source reaches extracted actor evidence, proposal and private audit policy',t=>{
 const f=fixture(t);assert.equal(original.actorSource(f.db,'g',f.evidence()).evidence.belief_state,'rumor');const row=original.proposeGoalTransition(f.db,'g',f.input(),'gm');assert.equal(row.status,'pending');assert.equal(row.visibility,'gm');assert.equal(f.db.getNpcGoal('g','courier','investigate'),null);
});
