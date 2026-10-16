/** Unified arbitration compact offline table; preserves prior uncommitted GM assertions. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup} from './narrative-fixtures.mjs';
import {sceneFictionHash as hash} from '../src/scene-fiction-context.js';
import {nativeMechanicalOutput,nativeMechanicalInput} from '../src/mechanical-native-v9.js';
import {persistPlayerIntents} from '../src/typed-intents.js';
import {candidate} from './narrative-fixtures.mjs';
import {unifiedArbitrationSchema,matchesArbitrationSchema,ARBITRATION_DISPOSITIONS} from '../src/gm-arbitration-contract.js';
import {createArbitrationOrigin,buildSceneIntentBoard,arbitrationPromptBoard} from '../src/scene-intent-board.js';
function boardFixture(f,{privateScene=false}={}){
  const x=setup(f,{text:'I inspect the counter.',privateScene});f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,roll_collaboration:true}});npc(f);
  const i={...candidate(x.text).player_intents[0],type:'search',operation:'inspect'},rows=persistPlayerIntents(f.db,f.guild,[i],x.scope,{messageId:x.messageId});
  const origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef),proposal={actor_key:'attendant',operation:'speak',target_refs:[],objective_ref:'',source_refs:[],dependencies:[]};
  return {...x,rows,origin,proposal};
}
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {mintNarrativeAudience} from '../src/audience-native-v9.js';
import {gmD20Roll,gmAttackDamage} from '../src/dice.js';
import {prepareIncomingAttack,reviewIncomingAttack,confirmIncomingDefense,rollIncomingAttack,incomingAttackEvidence} from '../src/pc-incoming.js';
import {EncounterLibrary} from '../src/encounter.js';
import {buildCombatants} from '../src/combat.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';
import {projectNativeGmProposal} from '../src/gm-mechanical-v9.js';
function npc(f,key='attendant',location='terminal'){f.db.upsertNpcProfile(f.guild,{npcKey:key,displayName:'Inez',role:'attendant',publicIdentity:'A local attendant.'});f.db.setSimulationEntity(f.guild,'npc',key,{name:'Inez',location_key:location,visibility:'party'});}
function incoming(f){
  const x=setup(f,{privateScene:true}),library=new EncounterLibrary('../content'),scene=currentScene(f.db,f.guild);npc(f,'guard');
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_encounters:true}});
  f.db.updateCharacterData(x.pc.id,d=>{d.evasion=12;d.thresholds={major:7,severe:14};});
  const source=indexWorldEvent(f.db,f.guild,{key:'af-guard-source',kind:'observation',source_id:'gm',title:'Native guard encounter',session_id:f.session.id,scene:scene.key,location_key:'terminal',visibility:'party'},'gm');
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:'guard',source_event:source.event_key,location_key:'terminal',zone:'interior',range:'Close',visibility:'party',accepted_by:'gm'},'gm');
  const encounter=f.db.createEncounter(f.guild,f.session.id,{status:'active',tier:1,pc_count:4,base_bp:14,budget_bp:14,composition:[{name:'Aster Vale Contractor',quantity:1}]}),c=f.db.initializeCombatants(encounter.id,buildCombatants(encounter,library))[0];
  f.db.saveCityRecord(f.guild,{kind:'encounter_binding',key:encounter.id,source_event:source.event_key,data:{combatants:[{actor:'guard',id:c.id}]}});
  f.db.upsertRulesRuling(f.guild,{key:'af-standard',ruling:'Current standard attack; no unreviewed feature or extra spotlight.',createdBy:'gm'});
  const input={npc:'guard',combatant:c.id,character:x.pc.id,source:source.event_key,ruling:'af-standard',defenses:{resistance:'none',armor_reduction:1,armor_allowed:true,source:'base'}};
  const row=prepareIncomingAttack(f.db,f.guild,'gm',input,{gm:true,interactionId:'af-attack',library});reviewIncomingAttack(f.db,f.guild,x.pc.owner_user_id,row.record_key,{library});confirmIncomingDefense(f.db,f.guild,x.pc.owner_user_id,row.record_key);
  return {...x,library,row};
}

const cases=[
 ['AR1','03','accepted occurrence identity is independent of mutable adjudication status',f=>{const x=boardFixture(f),first=buildSceneIntentBoard(f.db,f.guild,x.origin,x.rows,[]),row=x.rows[0];
   f.db.saveCityRecord(f.guild,{...row,key:row.record_key,status:'resolved',data:{...row.data,outcome_receipt:'native-test-terminal'}});
   assert.equal(buildSceneIntentBoard(f.db,f.guild,x.origin,[f.db.getCityRecord(f.guild,'typed_intent',row.record_key)],[]).record_key,first.record_key);}],
 ['AR1','01','one native board retains owner and NPC sources without leaking private motives',f=>{const x=boardFixture(f),packet=arbitrationPromptBoard(f.db,f.guild,x.origin),board=buildSceneIntentBoard(f.db,f.guild,x.origin,x.rows,[x.proposal]);
   assert.equal(board.data.entries.length,2);assert.equal(board.data.entries[0].actor.controller,'owner');assert.equal(board.data.entries[1].actor.controller,'ai_gm');
   assert.notEqual(board.data.entries[0].source_ref,board.data.entries[1].source_ref);assert(!JSON.stringify(packet).includes('resources'));assert.equal(buildSceneIntentBoard(f.db,f.guild,x.origin,x.rows,[x.proposal]).record_key,board.record_key);
   assert.throws(()=>buildSceneIntentBoard(f.db,f.guild,{},x.rows,[]));}],
 ['AR1','02','revocation and cross-owner private inputs cannot enter current board',f=>{const x=boardFixture(f,{privateScene:true});
   const foreign=f.accepted(1,'I whisper a secret.',null,{type:'search',operation:'inspect'});assert.throws(()=>buildSceneIntentBoard(f.db,f.guild,x.origin,[foreign],[]));
   f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.sourceRef);assert.throws(()=>buildSceneIntentBoard(f.db,f.guild,x.origin,x.rows,[x.proposal]));}],
 ['AR0','00','closed arbitration schema carries no executable dice or role waiver',()=>{const value={version:1,npc_intents:[],decisions:[]};assert(matchesArbitrationSchema(unifiedArbitrationSchema,value));
   assert(!matchesArbitrationSchema(unifiedArbitrationSchema,{...value,gm:true}));assert(ARBITRATION_DISPOSITIONS.includes('gm_attack_roll'));assert(ARBITRATION_DISPOSITIONS.includes('request_pc_reaction_roll'));}],
 ['F2-GM','31','revoked current query invalidates mechanical grant without rolling',f=>{const x=setup(f,{privateScene:true,text:'Can I roll?'}),i={...candidate(x.text).player_intents[0],type:'roll',operation:'request_roll'};
   const [a]=persistPlayerIntents(f.db,f.guild,[i],x.scope,{messageId:x.messageId}),g=mintNarrativeAudience(buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef));
   assert.equal(nativeMechanicalInput(f.db,f.guild,g,a.record_key).executed,false);
   f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.sourceRef);
   assert.throws(()=>nativeMechanicalInput(f.db,f.guild,g,a.record_key));assert.equal(f.db.listCityRecords(f.guild,{kind:'roll_operation',includeGM:true}).length,0);}],
 ['F2-GM','25','untrusted AI GM role cannot promote ordinary human attack approval to autonomous opportunity',f=>{const x=incoming(f),o=x.row.data.offer;
   assert.throws(()=>projectNativeGmProposal(f.db,f.guild,{version:9,kind:'mechanical_input',initiator_class:'ai_gm',intent_kind:'adversary_attack',actor_ref:{kind:'adversary',id:'guard'},
     target_refs:[{kind:'character',id:x.pc.id}],stat_block_ref:o.snapshot.template,feature_ref:'standard_attack',source_task_id:`gm-task:${hash([x.row.source_event,x.row.record_key])}`,request_id:x.row.record_key},{library:x.library}),/PvP Fear source/);
   assert.equal(f.db.getCityRecord(f.guild,'pc_incoming_attack',x.row.record_key).status,'ready');}],
 ['F2-GM','26','unimplemented environment feature is held not generic d20 or fabricated player source',f=>{const x=setup(f),fear=f.db.getCampaign(f.guild).fear;
   assert.throws(()=>projectNativeGmProposal(f.db,f.guild,{version:9,kind:'mechanical_input',initiator_class:'environment',intent_kind:'apply_world_feature',actor_ref:{kind:'environment',id:'terminal'},target_refs:[],stat_block_ref:'unknown',feature_ref:'made-up',source_task_id:'unknown',request_id:'unknown'}),/not_implemented/);
   assert.equal(f.db.getCampaign(f.guild).fear,fear);assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);}],
 ['F2-GM','18','GM d20 differs from Duality and has no automatic natural-one failure',()=>{assert.equal(gmD20Roll({modifier:20,difficulty:10},()=>1).success,true);const r=gmD20Roll({modifier:2,difficulty:12},()=>11);assert.equal(r.total,13);assert.equal(r.success,true);assert(!('hope' in r));assert(!('fear' in r));}],
 ['F2-GM','19','native 3d6+2 natural-20 damage adds eighteen not another flat modifier',()=>{let n=0;const r=gmD20Roll({kind:'attack',difficulty:99},()=>20),damage=gmAttackDamage(r,'3d6+2',()=>[1,2,3][n++]);assert.equal(damage.total,26);assert.equal(damage.critical_bonus,18);assert.equal(damage.modifier,2);assert.equal(n,3);assert.equal(gmAttackDamage(gmD20Roll({kind:'attack',difficulty:10},()=>19),'3d6+2',()=>1).total,5);}],
 ['F2-GM','20','adversary advantage and disadvantage select among two d20 not d6',()=>{for(const [advantage,disadvantage,face] of [[true,false,20],[false,true,4]]){const sides=[];let n=0;const r=gmD20Roll({advantage,disadvantage,kind:'attack',difficulty:15},s=>{sides.push(s);return [4,20][n++];});assert.deepEqual(sides,[20,20]);assert.equal(r.selected,face);}}],
 ['F2-GM','21','GM reaction natural twenty succeeds but cannot request attack critical damage',()=>{const r=gmD20Roll({kind:'reaction',difficulty:100},()=>20);assert.equal(r.success,true);assert.equal(r.critical,'reaction_success');assert.throws(()=>gmAttackDamage(r,'3d6+2',()=>assert.fail('no reaction damage')));}],
 ['F2-GM','22','miss never samples damage and native incoming replay never rerolls',f=>{const x=incoming(f),before=structuredClone(f.db.getCharacter(x.pc.id).data.resources),fear=f.db.getCampaign(f.guild).fear;
   let calls=0;const result=rollIncomingAttack(f.db,f.guild,'gm',x.row.record_key,{gm:true,library:x.library,rng:s=>{calls++;assert.equal(s,20);return 1;}});assert.equal(result.data.hit,false);assert.equal(result.data.damage,null);assert.equal(calls,1);
   f.restart();const replay=rollIncomingAttack(f.db,f.guild,'gm',x.row.record_key,{gm:true,library:x.library,rng:()=>assert.fail('no replay RNG')});assert.equal(replay.record_key,result.record_key);assert.deepEqual(f.db.getCharacter(x.pc.id).data.resources,before);assert.equal(f.db.getCampaign(f.guild).fear,fear);}],
 ['F2-GM','23','typed native output can name an adversary rather than pretend it is a PC',f=>{const x=incoming(f);let n=0;const receipt=rollIncomingAttack(f.db,f.guild,'gm',x.row.record_key,{gm:true,library:x.library,rng:()=>[20,8][n++]});
   const g=mintNarrativeAudience(buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef));
   const output=nativeMechanicalOutput(f.db,f.guild,g,{version:9,kind:'mechanical_output',receipt_kind:'npc_attack_roll_receipt',ref:receipt.record_key});assert.deepEqual(output.subject,{kind:'adversary',id:'guard'});
   assert.equal(output.native_detail.selected_d20,20);assert.equal(output.native_detail.damage.total,19);assert(output.text.includes('awaiting_armor'));assert.equal(f.db.getCharacter(x.pc.id).data.resources.hp.current,0);}],
 ['F2-GM','24','stale native attack source denies before GM RNG',f=>{const x=incoming(f);f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.row.data.offer.input.source);assert.throws(()=>rollIncomingAttack(f.db,f.guild,'gm',x.row.record_key,{gm:true,library:x.library,rng:()=>assert.fail('no unauthorized RNG')}));}],

];
for(const [phase,id,name,body] of cases)test(`${phase} AF${id} ${name}`,()=>nativeFixture(body));
