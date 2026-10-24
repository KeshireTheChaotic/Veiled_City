import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createActorControlRules} from '../../src/frameworks/daggerheart/actor-control-rules.js';
import {createGmCapabilityRules} from '../../src/frameworks/daggerheart/gm-capability-rules.js';
import {createGmExecutionRules} from '../../src/frameworks/daggerheart/gm-execution-rules.js';
import {jsonHash as hash} from '../../src/kernel/json-hash.js';

// Newly authored synchronous repository with real SQLite rollback/reopen.
// Source-context authentication and unrelated feature/incoming-attack rules are
// explicit ports. Actual extracted control, decision, cost, executor and dice run.
function fixture(t,{reaction=false}={}){
  const dir=mkdtempSync(join(tmpdir(),'vc-native-gm-c09-')),file=join(dir,'gm.sqlite');let sql=new DatabaseSync(file),proxy=null,manual=false,visible=true,failReceipt=false,principal='principal-c09';
  t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});
  sql.exec('CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key)); CREATE TABLE events(key TEXT PRIMARY KEY,body TEXT); CREATE TABLE auth(key TEXT PRIMARY KEY,user TEXT); CREATE TABLE rolls(id INTEGER PRIMARY KEY,body TEXT); CREATE TABLE campaign(fear INTEGER); INSERT INTO campaign VALUES(4);');
  const guild='guild-c09',scene='scene-c09',session='session-c09',location='tower-c09',pc={id:'pc-c09',guild_id:guild,owner_user_id:'owner-c09',status:'active'};
  const entity={entity_key:'npc-c09',state:{location_key:location}},profile={npc_key:'npc-c09'},template={name:'Native C09',attack:3};
  const npcPresence={source_event:'npc-presence-c09',location_key:location,data:{state:'actually_present',zone:'same'}},pcPresence={source_event:'pc-presence-c09',location_key:location,data:{state:'actually_present',zone:'same'}};
  const db={
    getCityRecord(_g,kind,key){const r=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key??'');return r?JSON.parse(r.body):null;},
    saveCityRecord(_g,v){if(failReceipt&&v.kind==='gm_native_roll_receipt')throw Error('injected GM receipt failure');const r={...v,record_key:v.key};sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(v.kind,v.key,JSON.stringify(r));return r;},
    listCityRecords(_g,{kind,status,offset=0,limit=100}){return sql.prepare('SELECT body FROM records WHERE kind=?').all(kind).map(r=>JSON.parse(r.body)).filter(r=>!status||r.status===status).slice(offset,offset+limit);},
    getWorldEvent(_g,key){const r=sql.prepare('SELECT body FROM events WHERE key=?').get(key??'');return r?JSON.parse(r.body):null;},
    getCharacter(key){return key===pc.id?structuredClone(pc):null;},getSimulationEntity(_g,type,key){return type==='npc'&&key==='npc-c09'?structuredClone(entity):null;},getNpcProfile(){return structuredClone(profile);},listNpcProxies(){return proxy?[proxy]:[];},
    listNpcGoals(){return [];},getCityCalendar(){return {flags:{gm_discretion:!manual}};},getCampaign(){return sql.prepare('SELECT fear FROM campaign').get();},changeFear(_g,delta){sql.prepare('UPDATE campaign SET fear=fear+?').run(delta);return this.getCampaign().fear;},
    getCurrentEncounter(){return {id:'encounter-c09'};},listCombatants(){return [{id:'combatant-c09',base_name:template.name,status:'active'}];},
    addRoll(_g,_s,_u,_pc,roll_type,payload){return Number(sql.prepare('INSERT INTO rolls(body) VALUES(?)').run(JSON.stringify({roll_type,payload})).lastInsertRowid);},
    getSavedRoll(_g,id){const r=sql.prepare('SELECT body FROM rolls WHERE id=?').get(id);return r?{id,...JSON.parse(r.body)}:null;},
    ownerAuthoredSource(_g,key,user){return sql.prepare('SELECT user FROM auth WHERE key=?').get(key)?.user===user;},
    transaction(fn){sql.exec('BEGIN IMMEDIATE');try{const v=fn();sql.exec('COMMIT');return v;}catch(e){sql.exec('ROLLBACK');throw e;}}
  };
  const save=(kind,key,data,status='active',extra={})=>db.saveCityRecord(guild,{kind,key,data,status,...extra});
  const event=(_d,_g,v,user)=>{const r={...v,event_key:v.key,status:v.status??'active'};sql.prepare('INSERT OR REPLACE INTO events VALUES(?,?)').run(v.key,JSON.stringify(r));if(user)sql.prepare('INSERT OR REPLACE INTO auth VALUES(?,?)').run(v.key,user);return r;};
  for(const key of ['npc-presence-c09','pc-presence-c09'])event(db,guild,{key});
  const originSource=event(db,guild,{key:'origin-c09',details:{camera:'tower'}}),origin={source:originSource.event_key,source_hash:hash(originSource.details),scene,session,location},scope={mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  const context=()=>({binding:origin,packet:{npcs:[{key:'npc-c09',human_controlled:false}]}}),presence=(_d,_g,type)=>type==='npc'?npcPresence:pcPresence;
  const actorRules=createActorControlRules({capabilities:{activeCityProxy:()=>proxy}});
  const capability=createGmCapabilityRules({capabilities:{buildNarrativeContext:context,activeCityProxy:()=>proxy,consentAction:()=>({}),historicalActionSource:()=>({}),scenePresence:presence,sceneAccess:()=>true,RANGE_BANDS:['Melee','Very Close','Close','Far','Very Far'],conversationPrincipal:()=>({kind:'owner',revision:principal}),actorReferenceVisible:()=>true,typedRollProof:()=>({outcome:'success'}),isPvpIntent:()=>false,narrativeSourceVisible:()=>visible,compileNativeFeatures:()=>[],inspectGroupFeatureChild:()=>{throw Error('group port not exercised');},planNativeSpotlight:()=>({count:1}),recordNativeSpotlight:()=>{},nativeActorControl:actorRules.nativeActorControl,preRollFearOpportunity:()=>null,commitPreRollFearCost:()=>{throw Error('interrupt port not exercised');}}});
  const material={intent_ref:'npc-intent-c09',actor:{type:'npc',key:'npc-c09',owner_control_type:'ai_world'},operation:'exceptional_action',dependencies:[],snapshot:hash([entity,profile,npcPresence,[]]),knowledge_refs:[],objective_ref:''};
  const npcSource=event(db,guild,{key:'npc-intent-source-c09',kind:'native_npc_scene_intent',source_id:'native:unified-gm',details:{entry_hash:hash(material),input_source:origin.source}}),entry={...material,source_ref:npcSource.event_key,source_hash:hash(npcSource.details)};
  const ownerEntry={intent_ref:'owner-intent-c09',actor:{type:'character',key:pc.id},operation:'describe_scene'};
  save('typed_intent',ownerEntry.intent_ref,{type:'other',framing:'immediate',resolution:'conversational'},'accepted_for_adjudication',{source_event:origin.source});
  const board=save('scene_intent_board','board-c09',{version:2,origin,entries:[entry,ownerEntry]},'active',{source_event:'board-source-c09'});
  event(db,guild,{key:board.source_event,kind:'native_scene_intent_board',source_id:'native:unified-gm',details:{payload_hash:hash(board.data)}});
  const opportunity={source:origin.source,intent:ownerEntry.intent_ref,key:`gm-opportunity:${hash([origin.source,origin.scene])}`};
  const native=reaction?{operation:'request_pc_reaction_roll',character:pc.id,owner:pc.owner_user_id,principal,target_snapshot:capability.nativeReactionTarget(db,guild,{binding:origin,scope},pc,'npc-c09'),opportunity}:{operation:'commit_exceptional_adversary_action',combatant:'combatant-c09',template_hash:hash(template),experience:{modifier:2},opportunity};
  const proposal={difficulty:13,trait:'Instinct',feature_ref:'',advantage:false,disadvantage:false};
  const decision=save('gm_arbitration_decision','decision-c09',{board:board.record_key,entry:entry.intent_ref,entry_hash:hash(entry),origin,scope,proposal,proposal_hash:hash(proposal),native},reaction?'pending_pc_reaction':'gm_action_ready',{visibility:'gm',source_event:'decision-source-c09'});
  event(db,guild,{key:decision.source_event,kind:'native_gm_arbitration',source_id:'native:unified-gm',details:{payload_hash:hash(decision.data)}});
  const unexpected=()=>{throw Error('Unexercised peer capability');};class Library{findAdversary(){return structuredClone(template);}}
  const execution=createGmExecutionRules({capabilities:{inspectNativeGmDecision:capability.inspectNativeGmDecision,commitGmActionCost:capability.commitGmActionCost,prepareArbitratedIncomingAttack:unexpected,prepareArbitratedVolley:unexpected,inspectVolley:unexpected,EncounterLibrary:Library,personalCharacter:(_d,_g,user)=>{if(user!==pc.owner_user_id)throw Object.assign(Error('wrong current owner'),{code:'GM_ARBITRATION'});return pc;},conversationPrincipal:()=>({revision:principal}),captureWorldInput:unexpected,persistPlayerIntents:unexpected,adjudicateAcceptedIntent:unexpected,contributeRoll:unexpected,rollRevision:unexpected,consentAction:()=>({}),historicalActionSource:()=>({}),typedRollProof:()=>({outcome:'success'}),indexWorldEvent:event,commitFeatureChoice:unexpected,commitFeatureReactionCost:unexpected,applyFeatureReactionOutcome:unexpected,validateFeatureInvitation:unexpected,featureReactionStakes:unexpected,cancelFeatureReaction:unexpected,commitNativeNpcAlliance:unexpected,prepareGroupFeature:unexpected,inspectGroupFeature:unexpected,groupReactionState:unexpected,groupReactionDetails:unexpected,groupReactionOptions:unexpected,PROFESSIONAL_ENTRY:'adversary:aster-vale-contractor:professional-entry',professionalEntryRollState:unexpected,commitProfessionalEntryUse:unexpected,inspectProfessionalEntryUse:unexpected}});
  return {db,guild,pc,entity,origin,scope,entry,board,decision,save,event,actorRules,capability,execution,setProxy:v=>proxy=v,setManual:v=>manual=v,setVisible:v=>visible=v,setPrincipal:v=>principal=v,setFailure:v=>failReceipt=v,countRolls:()=>Number(sql.prepare('SELECT count(*) n FROM rolls').get().n),reopen(){sql.close();sql=new DatabaseSync(file);}};
}

test('actual native decision/cost/executor preserves d20 family and exact Fear before receipt replay',t=>{
  const f=fixture(t);let dice=0;const rng=sides=>{dice++;assert.equal(sides,20);return 12;};
  const [receipt]=f.execution.executeUnifiedGmActions(f.db,f.guild,[f.decision],{rng});assert.equal(receipt.status,'resolved');assert.equal(receipt.data.result.total,14);assert.equal(receipt.data.result.family,'gm_d20');assert.equal(f.db.getCampaign().fear,3);
  assert.equal(f.countRolls(),1);assert.equal(dice,1);f.reopen();assert.deepEqual(f.execution.executeUnifiedGmActions(f.db,f.guild,[f.decision],{rng})[0],receipt);assert.equal(dice,1);assert.equal(f.db.getCampaign().fear,3);
});
test('receipt write failure rolls native cost and saved roll back together',t=>{
  const f=fixture(t);f.setFailure(true);assert.throws(()=>f.execution.executeUnifiedGmActions(f.db,f.guild,[f.decision],{rng:()=>9}),/injected GM receipt failure/);
  assert.equal(f.db.getCampaign().fear,4);assert.equal(f.countRolls(),0);assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_action_cost_receipt'}).length,0);
});
test('manual authority, private range and proxied NPC hold before dice or spend',t=>{
  const f=fixture(t);let dice=0;f.setManual(true);const [held]=f.execution.executeUnifiedGmActions(f.db,f.guild,[f.decision],{rng:()=>{dice++;return 10;}});assert.equal(held.kind,'gm_execution_review');assert.equal(dice,0);assert.equal(f.db.getCampaign().fear,4);
  f.setManual(false);f.setProxy({owner_user_id:'human-proxy'});assert.throws(()=>f.capability.inspectNativeGmDecision(f.db,f.guild,f.decision.record_key),/control_or_locality/);
  f.setProxy(null);f.setVisible(false);assert.throws(()=>f.capability.nativeReactionTarget(f.db,f.guild,{binding:f.origin,scope:f.scope},f.pc,'npc-c09'),/range_audience/);
});
test('committed decision proof is historical provenance, and altered immutable NPC source fails',t=>{
  const f=fixture(t);f.setManual(true);assert.equal(f.capability.inspectCommittedGmDecision(f.db,f.guild,f.decision.record_key).row.record_key,f.decision.record_key);
  const source=f.db.getWorldEvent(f.guild,f.entry.source_ref);f.event(null,null,{...source,key:source.event_key,details:{...source.details,entry_hash:'forged'}});
  assert.throws(()=>f.capability.inspectCommittedGmDecision(f.db,f.guild,f.decision.record_key),/committed_npc_source/);
});
test('native actor classification recognizes PC, proxy, autonomous NPC and unsupported actor without authority',t=>{
  const f=fixture(t);const read=(type,key)=>f.actorRules.nativeActorControl(f.db,f.guild,type,key);
  assert.equal(read('npc',f.pc.id).owner_control_type,'player');assert.equal(read('npc','npc-c09').owner_control_type,'ai_world');
  f.setProxy({user:'human'});assert.equal(read('npc','npc-c09').owner_control_type,'proxy');assert.equal(read('not-a-native-type','unverified').owner_control_type,'admin');assert.equal(read('npc','npc-c09').execution_authority,false);
});
test('unresolved dependencies create a continuation without RNG, costs or invented success',t=>{
  const f=fixture(t),entry={...f.entry,dependencies:['dependency-c09']};f.save('typed_intent','dependency-c09',{},'accepted_for_adjudication');
  const board={...f.board,data:{...f.board.data,entries:[entry,...f.board.data.entries.slice(1)]}};f.db.saveCityRecord(f.guild,board);f.event(null,null,{key:board.source_event,kind:'native_scene_intent_board',source_id:'native:unified-gm',details:{payload_hash:hash(board.data)}});
  const source=f.db.getWorldEvent(f.guild,entry.source_ref),{source_ref,source_hash,...material}=entry;source.details.entry_hash=hash(material);f.event(null,null,{...source,key:source.event_key});entry.source_hash=hash(source.details);
  board.data.entries[0]=entry;f.db.saveCityRecord(f.guild,board);f.event(null,null,{key:board.source_event,kind:'native_scene_intent_board',source_id:'native:unified-gm',details:{payload_hash:hash(board.data)}});
  const d={...f.decision,data:{...f.decision.data,entry_hash:hash(entry)}};f.db.saveCityRecord(f.guild,d);f.event(null,null,{key:d.source_event,kind:'native_gm_arbitration',source_id:'native:unified-gm',details:{payload_hash:hash(d.data)}});
  const [pending]=f.execution.executeUnifiedGmActions(f.db,f.guild,[d],{rng:()=>{throw Error('must not roll');}});assert.equal(pending.kind,'gm_action_continuation');assert.equal(pending.status,'pending');assert.equal(f.db.getCampaign().fear,4);
});
test('owner reaction invitation is pending, exact and privately withdrawable without inferred dice',t=>{
  const f=fixture(t,{reaction:true});f.capability.commitGmActionCost(f.db,f.guild,f.decision.record_key);
  const {terms}=f.execution.inspectGmReactionInvitation(f.db,f.guild,f.pc.owner_user_id,f.decision.record_key);assert.equal(terms.status,'pending');assert.equal(terms.authority.includes('no roll'),true);
  assert.throws(()=>f.execution.inspectGmReactionInvitation(f.db,f.guild,'another-owner',f.decision.record_key),/wrong current owner/);
  const input={op:'gm-reaction-withdraw',request:f.decision.record_key,revision:terms.revision},auth={interactionId:'withdraw-c09',authoredText:JSON.stringify(input)};
  const saved=f.execution.withdrawGmReactionInvitation(f.db,f.guild,f.pc.owner_user_id,input,auth);assert.equal(saved.status,'withdrawn');f.reopen();assert.deepEqual(f.execution.withdrawGmReactionInvitation(f.db,f.guild,f.pc.owner_user_id,input,auth),saved);assert.equal(f.countRolls(),0);
  assert.throws(()=>f.execution.submitGmReactionInvitation(f.db,f.guild,f.pc.owner_user_id,{...input,op:'gm-reaction-roll'},{...auth,authoredText:JSON.stringify({...input,op:'gm-reaction-roll'})}),/withdrawn/);
});
test('owner principal change and unauthenticated model reaction input cannot execute dice',t=>{
  const f=fixture(t,{reaction:true});f.capability.commitGmActionCost(f.db,f.guild,f.decision.record_key);f.setPrincipal('new-principal');assert.throws(()=>f.execution.inspectGmReactionInvitation(f.db,f.guild,f.pc.owner_user_id,f.decision.record_key),/snapshot_changed|owner_changed/);
  assert.throws(()=>f.execution.submitGmReactionInvitation(f.db,f.guild,f.pc.owner_user_id,{op:'gm-reaction-roll',request:f.decision.record_key,revision:'forged'},{authoredText:'{}'}),/authenticated_exact/);assert.equal(f.countRolls(),0);
});
test('native receipt arithmetic rejects fabricated saved result and actual providers cold-import',async t=>{
  const f=fixture(t),[receipt]=f.execution.executeUnifiedGmActions(f.db,f.guild,[f.decision],{rng:()=>12});f.db.saveCityRecord(f.guild,{...receipt,data:{...receipt.data,result:{...receipt.data.result,total:99}}});assert.throws(()=>f.execution.inspectGmRollReceipt(f.db,f.guild,receipt.record_key),/ancestry/);
  for(const path of ['native-actor-control','gm-action-capability','gm-native-rolls']){const p=await import(`../../src/${path}.js`);assert.equal(Object.keys(p).length>0,true);}
});
