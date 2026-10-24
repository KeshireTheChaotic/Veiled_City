import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createFeatureWindowRules,FEATURE_PHASES,MAX_FEATURE_DEPTH} from '../../src/frameworks/daggerheart/feature-window-rules.js';
import {jsonHash as hash} from '../../src/kernel/json-hash.js';

function fixture(t,{feedback=false}={}){
  const dir=mkdtempSync(join(tmpdir(),'vc-window-c16-')),file=join(dir,'windows.sqlite');let sql=new DatabaseSync(file),failReceipt=false,proxy=false,owner='owner-c16';
  t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});
  sql.exec('CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key)); CREATE TABLE events(key TEXT PRIMARY KEY,body TEXT); CREATE TABLE mutations(id INTEGER PRIMARY KEY,body TEXT); CREATE TABLE combatants(id TEXT PRIMARY KEY,body TEXT);');
  const guild='guild-c16',scene={key:'scene-c16',session_id:'session-c16'},template={name:'Knight C16',attack:2};
  const feature={feature_key:feedback?'adversary:static-wraith:feedback':'adversary:pale-court-knight:blood-rush',actor_name:template.name,template_hash:hash(template),native_handler:feedback?'feedback':'blood_rush_hold_position',costs:feedback?[{resource:'fear',amount:1},{resource:'npc_stress',amount:1}]:[]};let fear=4;
  const db={
    getCityRecord(_g,kind,key){const r=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key??'');return r?JSON.parse(r.body):null;},
    saveCityRecord(_g,v){if(failReceipt&&['gm_feature_use_receipt','gm_action_cost_receipt'].includes(v.kind))throw Error('injected feature receipt failure');const row={...v,record_key:v.key};sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(v.kind,v.key,JSON.stringify(row));return row;},
    listCityRecords(_g,{kind,status,offset=0,limit=100}){return sql.prepare('SELECT body FROM records WHERE kind=?').all(kind).map(r=>JSON.parse(r.body)).filter(r=>!status||r.status===status).slice(offset,offset+limit);},
    getWorldEvent(_g,key){const r=sql.prepare('SELECT body FROM events WHERE key=?').get(key??'');return r?JSON.parse(r.body):null;},
    recordMutation(_g,v){const data={source_layer:v.sourceLayer,entity_key:v.entityKey,before_json:JSON.stringify(v.before),after_json:JSON.stringify(v.after)};return {...data,id:Number(sql.prepare('INSERT INTO mutations(body) VALUES(?)').run(JSON.stringify(data)).lastInsertRowid)};},
    getMutation(_g,id){const r=sql.prepare('SELECT body FROM mutations WHERE id=?').get(id);return r?{id,...JSON.parse(r.body)}:null;},
    getCurrentEncounter(){return {id:'encounter-c16',status:'active'};},
    listCombatants(){return sql.prepare('SELECT body FROM combatants').all().map(r=>JSON.parse(r.body));},
    updateCombatant(id,patch){const value={id,...this.listCombatants().find(v=>v.id===id),...patch};sql.prepare('INSERT OR REPLACE INTO combatants VALUES(?,?)').run(id,JSON.stringify(value));return value;},
    getSimulationEntity(){return {state:{location_key:'tower-c16'}};},getNpcProfile(){return {role:'knight'};},listNpcProxies(){return [];},
    getCharacter(){return {id:'pc-c16',owner_user_id:owner,data:{inventory:feedback?[{id:'device-c16',category:'electronic_device',equipped:true}]:[],resources:{stress:{current:0,max:6}}}};},getCampaign(){return {fear};},changeFear(_g,delta){fear+=delta;return fear;},
    transaction(fn){const oldFear=fear;sql.exec('BEGIN IMMEDIATE');try{const v=fn();sql.exec('COMMIT');return v;}catch(e){fear=oldFear;sql.exec('ROLLBACK');throw e;}}
  };
  const save=(kind,key,data,status='active',extra={})=>db.saveCityRecord(guild,{kind,key,data,status,...extra});
  const event=(_d,_g,v)=>{const row={...v,event_key:v.key,status:'active'};sql.prepare('INSERT OR REPLACE INTO events VALUES(?,?)').run(v.key,JSON.stringify(row));return row;};
  for(const key of ['binding-source-c16','npc-presence-c16','pc-presence-c16','damage-source-c16'])event(db,guild,{key,scene:scene.key,session_id:scene.session_id});
  const npcPresence={source_event:'npc-presence-c16',location_key:'tower-c16',data:{scene:scene.key,state:'actually_present',zone:'zone-c16'}},pcPresence={source_event:'pc-presence-c16',location_key:'tower-c16',data:{scene:scene.key,state:'actually_present',zone:'zone-c16'}};
  save('encounter_binding','encounter-c16',{combatants:[{actor:'npc-c16',id:'combatant-c16'}]},'active',{source_event:'binding-source-c16'});
  db.updateCombatant('combatant-c16',{base_name:template.name,status:'active',hp_current:4,stress_current:3,stress_max:6});
  const damage=save('pc_effect_receipt','damage-c16',{hp_marks:2,roll:'attack-c16:roll'},'resolved',{source_event:'damage-source-c16',subject_key:'pc-c16',visibility:'character'});
  class Library{findAdversary(){return structuredClone(template);}}
  const rules=createFeatureWindowRules({catalog:{compileNativeFeatures:()=>[feature],executableNativeFeatures:()=>[feature],featureDisposition:()=>({status:'supported',feature})},sources:{currentScene:()=>scene,scenePresence:(_d,_g,type)=>type==='npc'?npcPresence:pcPresence,sceneAccess:()=>true,activeCityProxy:()=>proxy,indexWorldEvent:event,EncounterLibrary:Library},mechanics:{validateIncomingDamageApplication:()=>db.getCityRecord(guild,'pc_effect_receipt',damage.record_key),incomingAttackEvidence:()=>({offer:{input:{npc:'npc-c16'}}}),typedRollProof:()=>({outcome:'success',accepted:{record_key:'accepted-c16',source_event:'damage-source-c16',data:{outcome_receipt:'pc-outcome-c16',actor:'pc-c16'}}}),isPvpIntent:()=>false,inspectNativeGmDecision:(_d,_g,key)=>({row:db.getCityRecord(guild,'gm_arbitration_decision',key),entry}),nativeReactionTarget:()=>({principal:'principal-c16'}),historicalActionSource:()=>({}),assertPcCanAct:()=>true}});
  const origin={binding:{scene:scene.key,session:scene.session_id,location:'tower-c16'},scope:{mode:'private',actorUserId:owner,actorCharacterId:'pc-c16'}},entry={actor:{type:'npc',key:'npc-c16'},operation:'reaction',target_refs:['pc-c16']};
  const capture=()=>rules.captureIncomingFeatureWindows(db,guild,damage.record_key);
  function decision(window,key='decision-c16'){
    const proposal={proposal_version:2,disposition:'native_feature_resolution',stakes_kind:'native_feature',difficulty:feedback?12:null,trait:feedback?'Instinct':null,trigger_ref:window.record_key};
    const native=rules.authorizeFeatureChoice(db,guild,origin,entry,proposal,feature);return save('gm_arbitration_decision',key,{origin:origin.binding,scope:origin.scope,proposal,native},'pending',{source_event:'decision-source-c16'});
  }
  return {db,guild,feature,scene,damage,origin,entry,rules,capture,save,event,decision,setProxy:v=>proxy=v,setOwner:v=>owner=v,setFailure:v=>failReceipt=v,reopen(){sql.close();sql=new DatabaseSync(file);}};
}

test('native two-HP damage creates one private occurrence and exact eligible choice, without an effect',t=>{
  const f=fixture(t),[row]=f.capture();assert.equal(row.visibility,'gm');assert.equal(row.data.phase,'after_damage');assert.equal(row.data.authority.includes('no PC action'),true);
  assert.equal(f.db.listCombatants()[0].stress_current,3);assert.deepEqual(f.capture(),[row]);
  assert.deepEqual(f.rules.featureWindowChoices(f.db,f.guild,{mode:'public'}),[]);
  assert.equal(f.rules.featureWindowChoices(f.db,f.guild,f.origin.scope)[0].trigger_ref,row.record_key);
  assert.equal(MAX_FEATURE_DEPTH,3);assert.equal(FEATURE_PHASES.includes(row.data.phase),true);
});
test('Blood Rush commits exactly one NPC Stress recovery, immutable receipt and restart replay',t=>{
  const f=fixture(t),[window]=f.capture(),decision=f.decision(window),done=f.rules.commitFeatureChoice(f.db,f.guild,decision.record_key);
  assert.equal(f.db.listCombatants()[0].stress_current,2);assert.equal(done.data.position_choice,'retain_current_position');assert.equal(done.data.cost.fear,0);
  assert.equal(f.db.getCityRecord(f.guild,'native_feature_window',window.record_key).status,'resolved');
  f.reopen();assert.deepEqual(f.rules.commitFeatureChoice(f.db,f.guild,decision.record_key),done);assert.equal(f.db.listCombatants()[0].stress_current,2);
});
test('failure after Stress and mutation writes rolls the complete native execution back',t=>{
  const f=fixture(t),[window]=f.capture(),decision=f.decision(window);f.setFailure(true);
  assert.throws(()=>f.rules.commitFeatureChoice(f.db,f.guild,decision.record_key),/injected feature receipt failure/);
  assert.equal(f.db.listCombatants()[0].stress_current,3);assert.equal(f.db.getCityRecord(f.guild,'native_feature_window',window.record_key).status,'pending');
  assert.equal(f.db.getWorldEvent(f.guild,`feature-use:${hash(decision.record_key)}:source`),null);
});
test('source/recipient/control or occurrence depth changes cannot authorize execution',t=>{
  const f=fixture(t),[window]=f.capture();f.setOwner('new-owner');assert.throws(()=>f.rules.inspectFeatureWindow(f.db,f.guild,window.record_key),/source_target_or_control/);f.setOwner('owner-c16');
  f.setProxy(true);assert.throws(()=>f.rules.inspectFeatureWindow(f.db,f.guild,window.record_key),/binding_control_presence/);f.setProxy(false);
  f.save('native_feature_window',window.record_key,{...window.data,depth:4},'pending',{visibility:'gm',source_event:window.source_event});
  assert.throws(()=>f.rules.inspectFeatureWindow(f.db,f.guild,window.record_key),/provenance_depth/);
});
test('one occurrence cannot be reserved by two decisions, and nonreaction operation cannot pay',t=>{
  const f=fixture(t),[window]=f.capture(),one=f.decision(window),two=f.decision(window,'decision-two-c16');
  const reservation=f.rules.reserveFeatureWindow(f.db,f.guild,one.record_key);assert.deepEqual(f.rules.reserveFeatureWindow(f.db,f.guild,one.record_key),reservation);
  assert.throws(()=>f.rules.reserveFeatureWindow(f.db,f.guild,two.record_key),/already_reserved/);
  assert.throws(()=>f.rules.commitFeatureReactionCost(f.db,f.guild,one.record_key),/reaction_cost/);
});
test('private PC action results never become NPC trigger knowledge and optional invalid NPC cannot undo damage',t=>{
  const f=fixture(t);f.save('action_outcome_receipt','pc-outcome-c16',{request:'pc-request-c16',action_id:'accepted-c16',native_roll_refs:['roll-c16']},'resolved',{source_event:'damage-source-c16',visibility:'character',subject_key:'pc-c16'});
  f.save('roll_request','pc-request-c16',{kind:'action',roll_id:'roll-c16',result:{duality:'Fear'}},'resolved');
  assert.deepEqual(f.rules.captureActionFeatureWindows(f.db,f.guild,'pc-outcome-c16'),[]);
  assert.deepEqual(f.rules.captureNoRollFeatureWindows(f.db,f.guild,'pc-outcome-c16'),[]);
  f.setProxy(true);assert.deepEqual(f.capture(),[]);assert.equal(f.db.getCityRecord(f.guild,'pc_effect_receipt','damage-c16').status,'resolved');
});
test('actual legacy provider uses native factory and retains current public phase/cost APIs',async()=>{
  const provider=await import('../../src/native-feature-windows.js');assert.deepEqual(provider.FEATURE_PHASES,FEATURE_PHASES);assert.equal(provider.MAX_FEATURE_DEPTH,MAX_FEATURE_DEPTH);
  assert.equal(typeof provider.commitFeatureChoice,'function');assert.equal(typeof provider.featureCostPlan,'function');
});

function feedbackFixture(t){
  const f=fixture(t,{feedback:true});
  f.save('typed_intent','device-action-c16',{actor:'pc-c16',type:'interact',operation:'use_device',target_key:'device-c16',framing:'immediate',outcome_receipt:'device-outcome-c16',world_source_event:'device-fiction-c16'},'resolved',{source_event:'damage-source-c16'});
  f.save('action_outcome_receipt','device-outcome-c16',{action_id:'device-action-c16',outcome:'resolved_no_roll',native_roll_refs:[],state_mutations:[]},'resolved',{visibility:'party',source_event:'damage-source-c16'});
  f.save('native_adjudication','device-adjudication-c16',{action_id:'device-action-c16',receipts:['device-outcome-c16'],rule_basis:{kind:'native'}},'resolved');
  const [window]=f.rules.captureNoRollFeatureWindows(f.db,f.guild,'device-outcome-c16');
  return {...f,window};
}
test('Feedback payment uses a verified visible device occurrence and commits once before private owner reaction',t=>{
  const f=feedbackFixture(t),decision=f.decision(f.window),receipt=f.rules.commitFeatureReactionCost(f.db,f.guild,decision.record_key);
  assert.equal(receipt.status,'committed');assert.equal(f.db.getCampaign().fear,3);assert.equal(f.db.listCombatants()[0].stress_current,4);
  assert.equal(f.db.getCityRecord(f.guild,'native_feature_window',f.window.record_key).status,'hold_for_owner');
  assert.deepEqual(f.rules.commitFeatureReactionCost(f.db,f.guild,decision.record_key),receipt);assert.equal(f.db.getCampaign().fear,3);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'gm_feature_use_receipt'}).length,0);
});
test('Feedback payment failure restores Fear, NPC Stress, reservation and owner-hold state',t=>{
  const f=feedbackFixture(t),decision=f.decision(f.window);f.setFailure(true);
  assert.throws(()=>f.rules.commitFeatureReactionCost(f.db,f.guild,decision.record_key),/injected feature receipt failure/);
  assert.equal(f.db.getCampaign().fear,4);assert.equal(f.db.listCombatants()[0].stress_current,3);
  assert.equal(f.db.getCityRecord(f.guild,'native_feature_window',f.window.record_key).status,'pending');assert.equal(f.db.listCityRecords(f.guild,{kind:'native_feature_reservation'}).length,0);
});
