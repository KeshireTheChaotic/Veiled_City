import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createIncomingAttackRules} from '../../src/frameworks/daggerheart/incoming-attack-rules.js';
import {incomingConditionOdds} from '../../src/frameworks/daggerheart/native-condition-rules.js';
import {jsonHash as hash} from '../../src/kernel/json-hash.js';

function fixture(t,{hp=0}={}){
  const dir=mkdtempSync(join(tmpdir(),'vc-incoming-c12-')),file=join(dir,'incoming.sqlite');let sql=new DatabaseSync(file),depth=0,failEffect=false,principal='principal-c12',proxy=false;
  t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});
  sql.exec('CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key)); CREATE TABLE characters(id TEXT PRIMARY KEY,body TEXT); CREATE TABLE events(key TEXT PRIMARY KEY,body TEXT); CREATE TABLE auth(key TEXT PRIMARY KEY,user TEXT); CREATE TABLE mutations(id INTEGER PRIMARY KEY,body TEXT); CREATE TABLE rolls(id INTEGER PRIMARY KEY,body TEXT); CREATE TABLE campaign(fear INTEGER); INSERT INTO campaign VALUES(4);');
  const guild='guild-incoming-c12',scene={key:'scene-incoming-c12',session_id:'session-incoming-c12'},template={name:'NPC C12',standard:'Claws — Melee — 2d6 physical',attack:3},combatant={id:'combatant-c12',status:'active',base_name:template.name,hp_current:5};
  const db={
    getCityRecord(_g,kind,key){const r=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key??'');return r?JSON.parse(r.body):null;},saveCityRecord(_g,v){if(failEffect&&v.kind==='pc_effect_receipt')throw Error('injected incoming effect failure');const r={...v,record_key:v.key};sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(v.kind,v.key,JSON.stringify(r));return r;},
    getCharacter(id){const r=sql.prepare('SELECT body FROM characters WHERE id=?').get(id);return r?JSON.parse(r.body):null;},updateCharacterData(id,fn){const pc=this.getCharacter(id);fn(pc.data);sql.prepare('UPDATE characters SET body=? WHERE id=?').run(JSON.stringify(pc),id);},
    getWorldEvent(_g,key){const r=sql.prepare('SELECT body FROM events WHERE key=?').get(key??'');return r?JSON.parse(r.body):null;},ownerAuthoredSource(_g,key,user){return sql.prepare('SELECT user FROM auth WHERE key=?').get(key)?.user===user;},
    getCurrentEncounter(){return {id:'encounter-c12',status:'active'};},listCombatants(){return [structuredClone(combatant)];},getNpcProfile(){return {npc_key:'npc-c12'};},getSimulationEntity(){return {state:{location_key:'tower-c12'}};},getRulesRuling(){return {created_by:'gm-c12'};},
    recordMutation(_g,v){const r={source_layer:v.sourceLayer,entity_key:v.entityKey,before_json:JSON.stringify(v.before),after_json:JSON.stringify(v.after)};return {...r,id:Number(sql.prepare('INSERT INTO mutations(body) VALUES(?)').run(JSON.stringify(r)).lastInsertRowid)};},getMutation(_g,id){const r=sql.prepare('SELECT body FROM mutations WHERE id=?').get(id);return r?{...JSON.parse(r.body),id}:null;},
    addRoll(_g,session,user,character,roll_type,payload){return Number(sql.prepare('INSERT INTO rolls(body) VALUES(?)').run(JSON.stringify({session_id:session,discord_user_id:user,character_id:character,roll_type,payload})).lastInsertRowid);},getSavedRoll(_g,id){const r=sql.prepare('SELECT body FROM rolls WHERE id=?').get(id);return r?{id,...JSON.parse(r.body)}:null;},
    latestPcHpEffect(_g,character){return sql.prepare("SELECT body FROM records WHERE kind='pc_effect_receipt'").all().map(r=>JSON.parse(r.body)).filter(r=>r.subject_key===character).at(-1);},
    transaction(fn){const level=depth++,name=`incoming_${level}`;sql.exec(level?`SAVEPOINT ${name}`:'BEGIN IMMEDIATE');try{const v=fn();sql.exec(level?`RELEASE ${name}`:'COMMIT');return v;}catch(e){sql.exec(level?`ROLLBACK TO ${name}`:'ROLLBACK');if(level)sql.exec(`RELEASE ${name}`);throw e;}finally{depth--;}}
  };
  const pcs=['a','b'].map(suffix=>({id:`pc-${suffix}-c12`,guild_id:guild,owner_user_id:`owner-${suffix}-c12`,data:{location:'tower-c12',evasion:10,thresholds:{major:7,severe:14},domain_cards:[],inventory:[],conditions:[],resources:{hp:{current:hp,max:6},armor:{current:0,max:3},hope:3}}}));
  for(const pc of pcs)sql.prepare('INSERT INTO characters VALUES(?,?)').run(pc.id,JSON.stringify(pc));
  const save=(kind,key,data,status='resolved',extra={})=>db.saveCityRecord(guild,{kind,key,status,data,...extra}),event=(_d,_g,v,user)=>{const r={...v,event_key:v.key,status:v.status??'active'};sql.prepare('INSERT OR REPLACE INTO events VALUES(?,?)').run(v.key,JSON.stringify(r));if(user)sql.prepare('INSERT OR REPLACE INTO auth VALUES(?,?)').run(v.key,user);return r;};
  for(const key of ['binding-source-c12','npc-presence-c12',...pcs.map(pc=>`presence:${pc.id}`)])event(null,null,{key});
  const source=event(null,null,{key:'gm-source-c12',session_id:scene.session_id,scene:scene.key,details:{action:'source-established NPC attack'}},'gm-c12');
  save('encounter_binding','encounter-c12',{combatants:[{actor:'npc-c12',id:combatant.id}]},'active',{source_event:'binding-source-c12'});
  const presence=(_d,_g,type,key)=>({status:'active',source_event:type==='npc'?'npc-presence-c12':`presence:${key}`,location_key:'tower-c12',data:{state:'actually_present',zone:'same',scene:scene.key}});
  const inputFor=pc=>({npc:'npc-c12',combatant:combatant.id,character:pc.id,source:source.event_key,ruling:'ruling-c12',defenses:{source:'base',resistance:'none',armor_reduction:1,armor_allowed:true}}),library={findAdversary:()=>structuredClone(template)},feature={feature_key:'adversary:ritual-enforcement-team:coordinated-volley',native_handler:'coordinated_volley',template_hash:hash(template)};
  const inspectDecision=(_d,_g,key)=>({row:db.getCityRecord(guild,'gm_arbitration_decision',key),entry:{actor:{type:'npc',key:'npc-c12'},target_refs:pcs.map(pc=>pc.id)}});
  const unexpected=()=>{throw Error('Unexercised peer capability');};
  const rules=createIncomingAttackRules({capabilities:{indexWorldEvent:event,currentScene:()=>scene,scenePresence:presence,sceneAccess:()=>true,activeCityProxy:()=>proxy,personalCharacter:(_d,_g,user,id)=>{const pc=db.getCharacter(id);if(pc?.owner_user_id!==user)throw Error('Current affected owner required');return pc;},conversationPrincipal:()=>({revision:principal}),historicalOwnerPrincipal:()=>({revision:principal}),assertNonPvpCombatant:(_d,_g,target)=>{if(target.actor_key?.startsWith('pc-'))throw Error('PC target rejected');},assertPcAttackable:()=>{},assertFearIncomingExecution:()=>{},inspectNativeGmDecision:inspectDecision,inspectCommittedGmDecision:inspectDecision,commitGmActionCost:(_d,_g,key)=>{const prior=db.getCityRecord(guild,'gm_action_cost_receipt','cost-c12');if(prior)return prior;sql.exec('UPDATE campaign SET fear=fear-1');return save('gm_action_cost_receipt','cost-c12',{decision:key,before:4,after:3,amount:1},'committed',{source_event:db.getCityRecord(guild,'gm_arbitration_decision',key).source_event});},captureIncomingFeatureWindows:()=>[],nativeAttackPassives:()=>[],nativeStandardDamage:()=>null,nativeDamageBonusExpression:unexpected,compileNativeFeatures:()=>[feature],nativeHouseErratum:unexpected,nativeHitFeatureCandidates:()=>[],applyManyDeathsAfterIncoming:()=>null,nativeIncomingConditions:()=>[],validateIncomingConditions:()=>{},incomingConditionOdds,nativeAttackExpiryRevision:()=>false,settlePreRollFearForIncoming:()=>null,professionalEntryRollState:unexpected,commitProfessionalEntryUse:unexpected,inspectProfessionalEntryUse:unexpected,RANGE_BANDS:['Melee','Very Close','Close','Far','Very Far'],PROFESSIONAL_ENTRY:'adversary:aster-vale-contractor:professional-entry'}});
  const prepare=()=>rules.prepareIncomingAttack(db,guild,'gm-c12',inputFor(pcs[0]),{gm:true,interactionId:'gm-offer-c12',library}),review=row=>rules.reviewIncomingAttack(db,guild,pcs[0].owner_user_id,row.record_key,{library}),confirm=row=>rules.confirmIncomingDefense(db,guild,pcs[0].owner_user_id,row.record_key),roll=(row,rng=()=>6)=>rules.rollIncomingAttack(db,guild,'gm-c12',row.record_key,{gm:true,library,rng}),resolve=(row,armor=true)=>rules.resolveIncomingDamage(db,guild,pcs[0].owner_user_id,row.record_key,{armor,library});
  function volley(){
    const origin={binding:{source:source.event_key,session:scene.session_id,scene:scene.key},scope:{mode:'party'}},entry={actor:{type:'npc',key:'npc-c12'},operation:'attack',target_refs:pcs.map(pc=>pc.id)},proposal={disposition:'gm_attack_roll',stakes_kind:'native_attack',rule_basis_refs:['srd:adversary-attacks'],difficulty:null,trait:null,experience_ref:'',advantage:false,disadvantage:false,stakes:'Only exact native targets.'};
    const n=rules.inspectVolleyCandidate(db,guild,origin,entry,proposal,feature,{library,opportunity:{key:'spotlight-c12'}}),decision=save('gm_arbitration_decision','volley-decision-c12',{origin:origin.binding,native:n,proposal},'gm_action_ready',{source_event:'volley-decision-source-c12'});event(null,null,{key:decision.source_event,session_id:scene.session_id,scene:scene.key});return rules.prepareArbitratedVolley(db,guild,decision.record_key,{library});
  }
  return {db,guild,pcs,source,inputFor,library,rules,prepare,review,confirm,roll,resolve,volley,save,event,setPrincipal:v=>principal=v,setProxy:v=>proxy=v,setFailure:v=>failEffect=v,count:table=>Number(sql.prepare(`SELECT count(*) n FROM ${table}`).get().n),fear:()=>sql.prepare('SELECT fear FROM campaign').get().fear,reopen(){sql.close();sql=new DatabaseSync(file);}};
}
test('NPC attack preparation stays private and unrolled until affected owner review and defense confirmation',t=>{
  const f=fixture(t),row=f.prepare();assert.equal(row.status,'awaiting_defense');assert.equal(row.visibility,'character');assert.equal(row.subject_key,f.pcs[0].id);assert.equal(f.count('rolls'),0);
  assert.throws(()=>f.roll(row),/defense choice/);assert.throws(()=>f.confirm(row),/Privately review/);f.review(row);assert.equal(f.confirm(row).status,'ready');assert.equal(f.count('rolls'),0);
});
test('natural20 NPC attack saves Critical damage and only target owner chooses Armor/HP',t=>{
  const f=fixture(t),row=f.prepare();f.review(row);f.confirm(row);const faces=[20,6,6],receipt=f.roll(row,()=>faces.shift());assert.equal(receipt.data.hit,true);assert.equal(receipt.data.damage.total,24);assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.hp.current,0);
  const effect=f.resolve(row);assert.equal(effect.data.hp_marks,2);assert.equal(effect.data.after.armor.current,1);assert.equal(f.rules.validateIncomingDamageApplication(f.db,f.guild,effect.record_key).record_key,effect.record_key);assert.equal(f.rules.visibleIncomingInjury(f.db,f.guild,effect.record_key,f.pcs[0].id).record_key,effect.record_key);
  f.reopen();assert.deepEqual(f.resolve(row),effect);assert.equal(f.count('rolls'),1);assert.equal(f.fear(),4);
});
test('native miss saves no damage and cannot manufacture Armor/HP or reroll on replay',t=>{
  const f=fixture(t),row=f.prepare();f.review(row);f.confirm(row);const miss=f.roll(row,()=>1);assert.equal(miss.data.hit,false);assert.equal(miss.data.damage,null);assert.deepEqual(f.roll(row,()=>{throw Error('No reroll');}),miss);assert.throws(()=>f.resolve(row),/Actual hit/);assert.equal(f.db.getCharacter(f.pcs[0].id).data.resources.hp.current,0);
});
test('changed owner principal/source/proxy guards reject execution before NPC dice',t=>{
  const f=fixture(t),row=f.prepare();f.review(row);f.confirm(row);f.setPrincipal('new');assert.throws(()=>f.roll(row),/owner\/principal changed/);f.setPrincipal('principal-c12');f.setProxy(true);assert.throws(()=>f.roll(row),/target legality/);f.setProxy(false);
  f.event(null,null,{...f.source,key:f.source.event_key,status:'revoked'});assert.throws(()=>f.roll(row),/target legality/);assert.equal(f.count('rolls'),0);
});
test('failed incoming damage receipt rolls HP/Armor/owner choice and mutation back',t=>{
  const f=fixture(t),row=f.prepare();f.review(row);f.confirm(row);const faces=[10,6,6];f.roll(row,()=>faces.shift());f.setFailure(true);assert.throws(()=>f.resolve(row),/injected incoming effect failure/);const pc=f.db.getCharacter(f.pcs[0].id);assert.equal(pc.data.resources.hp.current,0);assert.equal(pc.data.resources.armor.current,0);assert.equal(f.db.getWorldEvent(f.guild,`${row.record_key}:armor`),null);assert.equal(f.count('mutations'),0);
});
test('final HP leaves the native death choice pending with the affected owner',t=>{
  const f=fixture(t,{hp:5}),row=f.prepare();f.review(row);f.confirm(row);const faces=[10,6,6];f.roll(row,()=>faces.shift());f.resolve(row,false);const death=f.db.getCityRecord(f.guild,'pc_death_move_request',`${row.record_key}:death`);assert.equal(death.status,'awaiting_owner');assert.equal(death.subject_key,f.pcs[0].id);assert.equal(f.db.getCharacter(f.pcs[0].id).data.death_state.status,'pending_choice');
});
test('shared Volley saves one attack/damage draw and independent owner targets without repeated Fear',t=>{
  const f=fixture(t),parent=f.volley(),children=parent.data.targets.map(c=>f.db.getCityRecord(f.guild,'pc_incoming_attack',c.attack));
  for(const [i,child]of children.entries()){f.rules.reviewIncomingAttack(f.db,f.guild,f.pcs[i].owner_user_id,child.record_key,{library:f.library});f.rules.confirmIncomingDefense(f.db,f.guild,f.pcs[i].owner_user_id,child.record_key);}
  let calls=0;const rng=sides=>{calls++;return sides===20?10:6;};f.rules.rollArbitratedIncomingAttack(f.db,f.guild,children[0].record_key,{library:f.library,rng});assert.equal(calls,3);assert.equal(f.count('rolls'),2);assert.equal(f.fear(),3);
  f.reopen();f.rules.rollArbitratedIncomingAttack(f.db,f.guild,children[1].record_key,{library:f.library,rng:()=>{throw Error('No shared reroll');}});assert.equal(f.count('rolls'),2);assert.equal(f.fear(),3);assert.equal(f.rules.inspectVolley(f.db,f.guild,parent.record_key).children.length,2);
});
test('a withheld Volley defense stays owned and does not force that PC to confirm or spend Armor',t=>{
  const f=fixture(t),parent=f.volley(),child=parent.data.targets[1];const held=f.rules.withholdIncomingDefense(f.db,f.guild,f.pcs[1].owner_user_id,child.attack,{library:f.library,interactionId:'withhold-c12'});assert.equal(held.status,'hold_for_owner');assert.equal(f.db.getCharacter(f.pcs[1].id).data.resources.armor.current,0);assert.equal(f.count('rolls'),0);
  assert.throws(()=>f.rules.withholdIncomingDefense(f.db,f.guild,f.pcs[0].owner_user_id,child.attack,{library:f.library,interactionId:'foreign'}),/affected owner/);
});
test('actual incoming provider cold-imports with current receipt and owner-defense APIs',async()=>{
  const p=await import('../../src/pc-incoming.js');for(const name of ['prepareIncomingAttack','prepareArbitratedVolley','confirmIncomingDefense','resolveIncomingDamage','validateIncomingDamageApplication','incomingAttackEvidence','incomingRollProjection'])assert.equal(typeof p[name],'function');
});
