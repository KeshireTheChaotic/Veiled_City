import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createGroupFeatureExecutionRules} from '../../src/frameworks/daggerheart/group-feature-execution-rules.js';
import {FLASH,LANES,REGENT,groupFeaturePolicies} from '../../src/frameworks/daggerheart/group-feature-rules.js';
import {jsonHash as hash} from '../../src/kernel/json-hash.js';

function fixture(t,{featureKey=FLASH}={}){
  const dir=mkdtempSync(join(tmpdir(),'vc-group-c13-')),file=join(dir,'group.sqlite');let sql=new DatabaseSync(file),depth=0,failEffect=false;
  t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});
  sql.exec('CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key)); CREATE TABLE characters(id TEXT PRIMARY KEY,body TEXT); CREATE TABLE events(key TEXT PRIMARY KEY,body TEXT); CREATE TABLE auth(key TEXT PRIMARY KEY,user TEXT); CREATE TABLE mutations(id INTEGER PRIMARY KEY,body TEXT); CREATE TABLE rolls(id INTEGER PRIMARY KEY,body TEXT);');
  const guild='guild-group-c13',scene={key:'scene-group-c13',session_id:'session-group-c13'},template={name:'NPC group C13'},policy=groupFeaturePolicies[featureKey],feature={feature_key:featureKey,template_hash:hash(template),costs:[]};
  const pcs=['a','b'].map(suffix=>({id:`pc-${suffix}-c13`,guild_id:guild,owner_user_id:`owner-${suffix}-c13`,data:{conditions:[],resources:{stress:{current:0,max:6},hope:3}}}));for(const pc of pcs)sql.prepare('INSERT INTO characters VALUES(?,?)').run(pc.id,JSON.stringify(pc));
  const db={
    getCityRecord(_g,kind,key){const r=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key??'');return r?JSON.parse(r.body):null;},saveCityRecord(_g,v){if(failEffect&&v.kind==='gm_group_feature_effect')throw Error('injected group effect failure');const r={...v,record_key:v.key};sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(v.kind,v.key,JSON.stringify(r));return r;},
    listCityRecords(_g,{kind,status,actor,offset=0,limit=100}){return sql.prepare('SELECT body FROM records WHERE kind=?').all(kind).map(r=>JSON.parse(r.body)).filter(r=>(!status||r.status===status)&&(!actor||r.actor_key===actor)).slice(offset,offset+limit);},
    getCharacter(id){const r=sql.prepare('SELECT body FROM characters WHERE id=?').get(id);return r?JSON.parse(r.body):null;},updateCharacterData(id,fn){const pc=this.getCharacter(id);fn(pc.data);sql.prepare('UPDATE characters SET body=? WHERE id=?').run(JSON.stringify(pc),id);},
    getWorldEvent(_g,key){const r=sql.prepare('SELECT body FROM events WHERE key=?').get(key??'');return r?JSON.parse(r.body):null;},ownerAuthoredSource(_g,key,user){return sql.prepare('SELECT user FROM auth WHERE key=?').get(key)?.user===user;},
    getCurrentEncounter(){return {id:'encounter-c13',status:'active'};},listCombatants(){return [{id:'combatant-c13',base_name:template.name,status:'active',hp_current:5,stress_current:0,stress_max:6}];},roster(){return pcs.map(pc=>({character_id:pc.id,presence:'present'}));},getCampaign(){return {fear:4};},
    recordMutation(_g,v){const r={source_layer:v.sourceLayer,entity_key:v.entityKey,before_json:JSON.stringify(v.before),after_json:JSON.stringify(v.after)};return {...r,id:Number(sql.prepare('INSERT INTO mutations(body) VALUES(?)').run(JSON.stringify(r)).lastInsertRowid)};},getMutation(_g,id){const r=sql.prepare('SELECT body FROM mutations WHERE id=?').get(id);return r?{...JSON.parse(r.body),id}:null;},
    getSavedRoll(_g,id){const r=sql.prepare('SELECT body FROM rolls WHERE id=?').get(id);return r?{id,...JSON.parse(r.body)}:null;},
    transaction(fn){const level=depth++,name=`group_${level}`;sql.exec(level?`SAVEPOINT ${name}`:'BEGIN IMMEDIATE');try{const value=fn();sql.exec(level?`RELEASE ${name}`:'COMMIT');return value;}catch(e){sql.exec(level?`ROLLBACK TO ${name}`:'ROLLBACK');if(level)sql.exec(`RELEASE ${name}`);throw e;}finally{depth--;}}
  };
  const save=(kind,key,data,status='resolved',extra={})=>db.saveCityRecord(guild,{kind,key,data,status,...extra}),event=(_d,_g,v,user)=>{const r={...v,event_key:v.key,status:'active'};sql.prepare('INSERT OR REPLACE INTO events VALUES(?,?)').run(v.key,JSON.stringify(r));if(user)sql.prepare('INSERT OR REPLACE INTO auth VALUES(?,?)').run(v.key,user);return r;};
  const presence=(_d,_g,type,key)=>({source_event:type==='npc'?'npc-presence-c13':`presence:${key}`,location_key:'tower-c13',data:{state:'actually_present',scene:scene.key,zone:'same'}});
  for(const key of ['npc-presence-c13','binding-c13',...pcs.map(pc=>`presence:${pc.id}`)])event(null,null,{key});
  save('encounter_binding','encounter-c13',{combatants:[{actor:'npc-c13',id:'combatant-c13'}]},'active',{source_event:'binding-c13'});
  const origin={binding:{scene:scene.key,session:scene.session_id,location:'tower-c13'},scope:{mode:'party'}},entry={intent_ref:'npc-feature-c13',actor:{type:'npc',key:'npc-c13'},operation:'feature',target_refs:featureKey===LANES?pcs.map(pc=>pc.id):[pcs[0].id]},proposal={disposition:'native_feature_resolution',stakes_kind:'native_feature',trait:policy.trait,difficulty:policy.difficulty,experience_ref:'',advantage:false,disadvantage:false,rule_basis_refs:['srd:reaction-rolls']};
  class Library{findAdversary(){return template;}}let rules;
  const inspectParent=()=>({row:db.getCityRecord(guild,'gm_arbitration_decision','parent-c13'),entry});
  rules=createGroupFeatureExecutionRules({capabilities:{narrativeSourceVisible:()=>true,compileNativeFeatures:()=>[feature],inspectNativeGmDecision:inspectParent,inspectCommittedGmDecision:inspectParent,nativeReactionTarget:(_d,_g,_o,pc)=>({principal:'principal-c13',target:hash(presence(null,null,'character',pc.id))}),commitGmActionCost:()=>{const prior=db.getCityRecord(guild,'gm_action_cost_receipt','cost-c13');if(prior)return prior;const cost=save('gm_action_cost_receipt','cost-c13',{decision:'parent-c13',spotlight:rules.planNativeSpotlight(db,guild,'npc-c13',scene.key,'cost-c13')},'committed',{source_event:'parent-source-c13'});rules.recordNativeSpotlight(db,guild,cost);return cost;},currentScene:()=>scene,scenePresence:presence,sceneAccess:()=>true,RANGE_BANDS:['Melee','Very Close','Close','Far','Very Far'],activeCityProxy:()=>false,conversationPrincipal:()=>({kind:'owner',revision:'principal-c13'}),personalCharacter:(_d,_g,user,id)=>{const pc=db.getCharacter(id);if(pc?.owner_user_id!==user)throw Error('wrong current owner');return pc;},indexWorldEvent:event,typedRollProof:(_d,_g,q)=>({difficulty:q.data.breakdown.difficulty,outcome:q.data.result.duality==='Critical'||q.data.result.total>=q.data.breakdown.difficulty?'success':'failure'}),EncounterLibrary:Library,reserveGmArbitrationNotice:()=>{},applyNativeStressPassive:()=>{},inspectNativeConditionClearAncestry:()=>{throw Error('Clear proof outside fixture');}}});
  const native=rules.planGroupFeature(db,guild,origin,entry,proposal,feature,{library:new Library(),opportunity:{key:'opportunity-c13'}});save('gm_arbitration_decision','parent-c13',{origin:origin.binding,scope:origin.scope,proposal,native,board:'board-c13'},'gm_action_ready',{source_event:'parent-source-c13'});
  const prepare=()=>rules.prepareGroupFeature(db,guild,'parent-c13'),child=execution=>db.getCityRecord(guild,'gm_arbitration_decision',execution.data.children[0].decision);
  function submit(row,{success=false,critical=false}={}){
    const user=row.data.native.owner,source=event(null,null,{key:`owner-source:${row.record_key}`,kind:'authored_turn',visibility:'character',subject_key:row.data.native.character},user),result={total:success?policy.difficulty+2:policy.difficulty-2,duality:critical?'Critical':'Hope'},roll=Number(sql.prepare('INSERT INTO rolls(body) VALUES(?)').run(JSON.stringify({payload:result})).lastInsertRowid),q=save('roll_request',`request:${row.record_key}`,{kind:'reaction',owner_user_id:user,input:{gm_invitation:row.record_key},breakdown:{difficulty:policy.difficulty},result,roll_id:roll},'resolved',{subject_key:row.data.native.character,source_event:source.event_key});
    save('gm_reaction_submission',`gm-reaction-submit:${hash([row.record_key,user])}`,{request:q.record_key,owner:user,invitation:row.record_key,invitation_hash:hash(row.data)},'resolved',{visibility:'character',subject_key:row.data.native.character,source_event:source.event_key});return q;
  }
  function choose(row,choice,user=row.data.native.owner){const input={op:'gm-reaction-choice',request:row.record_key,revision:hash(row.data),choice};return rules.chooseGroupReactionOutcome(db,guild,user,input,{interactionId:`choice-${choice}-c13`,authoredText:JSON.stringify(input)});}
  return {guild,db,pcs,scene,entry,origin,proposal,feature,rules,prepare,child,submit,choose,save,event,apply:(row,q)=>rules.applyGroupReactionOutcome(db,guild,row,q),setFailure:v=>failEffect=v,setOwner(id,user){const pc=db.getCharacter(id);pc.owner_user_id=user;sql.prepare("UPDATE characters SET body=? WHERE id=?").run(JSON.stringify(pc),id);},count:table=>Number(sql.prepare(`SELECT count(*) n FROM ${table}`).get().n),reopen(){sql.close();sql=new DatabaseSync(file);}};
}
test('native group preparation saves exact independent owner invitation without reaction dice or effects',t=>{
  const f=fixture(t),execution=f.prepare(),row=f.child(execution);assert.equal(execution.status,'awaiting_owners');assert.equal(row.data.native.owner,f.pcs[0].owner_user_id);assert.equal(row.data.native.character,f.pcs[0].id);assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.stress.current,0);assert.equal(f.count('rolls'),0);f.reopen();assert.deepEqual(f.prepare(),execution);
});
test('failed Flashbang reaction commits one private Stress/condition receipt and reopens without reapplication',t=>{
  const f=fixture(t),row=f.child(f.prepare()),q=f.submit(row),effect=f.apply(row,q);assert.equal(effect.status,'resolved');assert.equal(effect.visibility,'character');assert.equal(effect.data.stress,1);assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.stress.current,1);
  assert.equal(f.rules.nativeIncomingConditions(f.db,f.guild,f.pcs[0].id)[0].condition,'Vulnerable');f.reopen();assert.deepEqual(f.apply(row,q),effect);assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.stress.current,1);
});
test('ordinary Flashbang success waits for the exact owner choice before applying any consequence',t=>{
  const f=fixture(t),row=f.child(f.prepare()),q=f.submit(row,{success:true});assert.equal(f.apply(row,q).status,'awaiting_owner');assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.stress.current,0);assert.throws(()=>f.choose(row,'stress',f.pcs[1].owner_user_id),/owner_revision/);
  const effect=f.choose(row,'stress');assert.equal(effect.data.stress,1);assert.equal(effect.data.condition,null);assert.equal(f.db.getCharacter(f.pcs[0].id).data.conditions.length,0);
});
test('native Critical Flashbang reaction ignores both feature effects without Hope/Fear changes',t=>{
  const f=fixture(t),row=f.child(f.prepare()),q=f.submit(row,{critical:true}),effect=f.apply(row,q);assert.equal(effect.data.version,3);assert.equal(effect.data.stress,0);assert.equal(effect.data.condition,null);assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.hope,3);
});
test('failed group effect write restores PC state, mutation, condition and child progress',t=>{
  const f=fixture(t),row=f.child(f.prepare()),q=f.submit(row);f.setFailure(true);assert.throws(()=>f.apply(row,q),/injected group effect failure/);assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.stress.current,0);assert.equal(f.db.getCharacter(f.pcs[0].id).data.conditions.length,0);assert.equal(f.count('mutations'),0);
});
test('All Lanes Stop requires the independently observed exact cohort and preserves independent current owners',t=>{
  const f=fixture(t,{featureKey:LANES});assert.throws(()=>f.rules.planGroupFeature(f.db,f.guild,f.origin,{...f.entry,target_refs:[f.pcs[0].id]},f.proposal,f.feature,{library:{findAdversary:()=>({name:'NPC group C13'})}}),/exact_target_cohort/);
  const execution=f.prepare(),row=f.child(execution),q=f.submit(row);f.setOwner(f.pcs[1].id,'changed-owner');
  assert.equal(f.apply(row,q).data.character,f.pcs[0].id);assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.stress.current,0);
});
test('native spotlight expiry ends only the source-bound All Lanes Stop duration and remains replayable',t=>{
  const f=fixture(t,{featureKey:LANES}),row=f.child(f.prepare()),q=f.submit(row),effect=f.apply(row,q);assert.equal(f.rules.nativeMovementConditionIssue(f.db,f.guild,f.pcs[0].id,{range:'Far'}),'NATIVE_MOVEMENT_LIMIT_VERY_CLOSE');
  const spotlight=f.rules.planNativeSpotlight(f.db,f.guild,'npc-c13',f.scene.key,'next-cost-c13'),cost=f.save('gm_action_cost_receipt','next-cost-c13',{decision:'parent-c13',spotlight},'committed',{source_event:'parent-source-c13'});f.rules.recordNativeSpotlight(f.db,f.guild,cost);assert.equal(f.rules.validateNativeCondition(f.db,f.guild,effect.data.condition).status,'expired');assert.equal(f.rules.nativeMovementConditionIssue(f.db,f.guild,f.pcs[0].id,{range:'Far'}),null);
  f.reopen();assert.equal(f.rules.recordNativeSpotlight(f.db,f.guild,cost).data.index,2);
});
test('Command the Blood requires owner choice; command remains held while exact Hope payment is explicit',t=>{
  const f=fixture(t,{featureKey:REGENT}),row=f.child(f.prepare()),q=f.submit(row);assert.equal(f.apply(row,q).status,'awaiting_owner');assert.equal(f.choose(row,'command').status,'needs_rules_review');assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.hope,3);
  const g=fixture(t,{featureKey:REGENT}),other=g.child(g.prepare()),request=g.submit(other);g.apply(other,request);const effect=g.choose(other,'hope');assert.equal(effect.data.hope,2);assert.equal(g.db.getCharacter(g.pcs[0].id).data.resources.hope,1);
});
test('actual group provider cold-imports with unchanged condition, choice and spotlight APIs',async()=>{
  const p=await import('../../src/native-group-features.js');for(const name of ['prepareGroupFeature','applyGroupReactionOutcome','chooseGroupReactionOutcome','validateNativeCondition','nativeIncomingConditions','recordNativeSpotlight','nativeAttackExpiryRevision'])assert.equal(typeof p[name],'function');
});
