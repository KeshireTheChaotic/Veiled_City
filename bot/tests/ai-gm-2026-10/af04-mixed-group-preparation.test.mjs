import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {createGroupFeatureExecutionRules} from '../../src/frameworks/daggerheart/group-feature-execution-rules.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

function fixture({area=true}={}){
  const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key));');
  const put=(kind,key,v)=>{sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(kind,key,JSON.stringify(v));return v;},
    get=(kind,key)=>{const r=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key);return r?JSON.parse(r.body):null;};
  const template={name:'Ritual Enforcement Team',features:['exact source'],experiences:[]},pc={id:'pc',owner_user_id:'owner',data:{resources:{hope:2}}},
    actor={source_event:'actor-source',location_key:'room',data:{state:'actually_present'}},presence={source_event:'pc-source',location_key:'room',data:{state:'actually_present'}},
    origin={session:'session',scene:'scene',location:'room'},scope={mode:'party'},entry={intent_ref:'intent',actor:{type:'npc',key:'caster'},operation:'feature',target_refs:['area']},
    proposal={disposition:'native_feature_resolution',stakes_kind:'native_feature',trait:'Agility',difficulty:14,rule_basis_refs:['srd:reaction-rolls']},
    feature={feature_key:'adversary:ritual-enforcement-team:null-foam',source_hash:'exact-feature-source',template_hash:hash(template),costs:[{resource:'npc_stress',amount:1}]},library={findAdversary:()=>template};
  put('combatant','npc',{id:'npc',base_name:template.name,status:'active',hp_current:3,stress_current:0,stress_max:2});
  let nesting=0,fail=false,rolls=0,mutationId=0,conditionFail=false;
  const db={transaction:fn=>{const id=`t${++nesting}`;sql.exec(`SAVEPOINT ${id}`);try{const r=fn();sql.exec(`RELEASE ${id}`);return r;}catch(e){sql.exec(`ROLLBACK TO ${id}; RELEASE ${id}`);throw e;}},
    getCityRecord:(_g,kind,key)=>kind==='encounter_binding'?{source_event:'binding-source',data:{combatants:[{actor:'caster',id:'npc'}]}}:get(kind,key),
    getMutation:(_g,id)=>get('mutation',id),
    saveCityRecord:(_g,r)=>{if(fail&&r.kind==='gm_group_feature_execution')throw Error('injected execution storage failure');
      if(conditionFail&&r.kind==='native_mixed_condition')throw Error('injected condition storage failure');return put(r.kind,r.key,{...r,record_key:r.key});},
    listCityRecords:(_g,{kind,actor,limit,offset})=>sql.prepare('SELECT body FROM records WHERE kind=? LIMIT ? OFFSET ?').all(kind,limit,offset).map(r=>JSON.parse(r.body)).filter(r=>r.actor_key===actor),
    updateCombatant:(_id,patch)=>put('combatant','npc',{...get('combatant','npc'),...patch}),
    recordMutation:(_g,v)=>{const id=`mutation-${++mutationId}`;return put('mutation',id,{id,actor_type:v.actorType,actor_id:v.actorId,source_layer:v.sourceLayer,
      mutation_type:v.mutationType,entity_key:v.entityKey,session_id:v.sessionId,visibility:v.visibility,before_json:JSON.stringify(v.before),after_json:JSON.stringify(v.after)});},
    getCurrentEncounter:()=>({id:'encounter',status:'active'}),listCombatants:()=>[get('combatant','npc')],getCampaign:()=>({fear:2}),
    getWorldEvent:(_g,key)=>get('event',key)||{event_key:key,status:'active'},getCharacter:()=>pc,roster:()=>[{character_id:'pc',presence:'present'}]};
  const names=['narrativeSourceVisible','compileNativeFeatures','inspectNativeGmDecision','inspectCommittedGmDecision','nativeReactionTarget','commitGmActionCost',
    'currentScene','scenePresence','sceneAccess','activeCityProxy','conversationPrincipal','personalCharacter','indexWorldEvent','typedRollProof','EncounterLibrary',
    'reserveGmArbitrationNotice','applyNativeStressPassive','inspectNativeConditionClearAncestry'];
  const caps=Object.fromEntries(names.map(n=>[n,()=>{throw Error(`unexpected ${n}`);} ]));
  Object.assign(caps,{currentScene:()=>({session_id:'session'}),scenePresence:(_d,_g,kind)=>kind==='npc'?actor:presence,activeCityProxy:()=>false,
    personalCharacter:()=>pc,conversationPrincipal:()=>({kind:'owner',revision:'principal'}),compileNativeFeatures:()=>[feature],
    narrativeSourceVisible:()=>true,sceneAccess:()=>true,nativeReactionTarget:()=>({principal:'principal',target:hash(presence)}),
    inspectNativeGmDecision:()=>({row:get('decision','decision'),entry}),inspectCommittedGmDecision:()=>({row:get('decision','decision'),entry}),
    commitGmActionCost:()=>{const c=get('combatant','npc');c.stress_current++;put('combatant','npc',c);return put('gm_action_cost_receipt','cost',
      {record_key:'cost',status:'committed',source_event:'parent-source',data:{decision:'decision'}});},
    planNativeAreaCohort:()=>({area_hash:'area-hash',targets:[{kind:'character',key:'pc',owner:'owner',presence_hash:hash(presence)},
      {kind:'npc',key:'caster',presence_hash:hash(actor),control_hash:'gm-control'}]}),
    indexWorldEvent:(_d,_g,event)=>put('event',event.key,{...event,event_key:event.key,status:'active'}),
    RANGE_BANDS:['Melee','Very Close','Close','Far','Very Far']});
  if(!area){feature.feature_key='adversary:aster-vale-contractor:flashbang';proposal.trait='Instinct';proposal.difficulty=12;entry.target_refs=['pc'];}
  const rules=createGroupFeatureExecutionRules({capabilities:caps}),native=rules.planGroupFeature(db,'guild',{binding:origin,scope},entry,proposal,feature,{library});
  put('decision','decision',{record_key:'decision',source_event:'parent-source',data:{native,origin,scope,proposal,board:'board'}});
  return {sql,db,rules,get,put,prepare:()=>rules.prepareGroupFeature(db,'guild','decision',{library,rng:()=>{rolls++;return 2;}}),
    setFailure:v=>fail=v,setConditionFailure:v=>conditionFail=v,rolls:()=>rolls,close:()=>sql.close()};
}

test('existing group transaction pays once, retains owner dice pending and saves native NPC reactions with replay ancestry',()=>{
  const f=fixture();try{
    const first=f.prepare();assert.equal(first.data.children.length,1);assert.equal(first.data.mixed.reactions.length,2);
    assert.equal(first.data.mixed.reactions[0].kind,'character');assert.equal(first.data.mixed.reactions[1].receipt.result.success,false);
    assert.equal(f.get('combatant','npc').stress_current,1);assert.equal(f.rolls(),1);
    assert.deepEqual(f.get('combatant','npc').conditions,['Restrained']);
    const conditions=f.rules.activeNativeConditions(f.db,'guild','caster',{kind:'npc'});assert.equal(conditions.length,1);
    assert.equal(conditions[0].data.cause.spellcast_disadvantage,true);
    assert.equal(f.rules.nativeMovementConditionIssue(f.db,'guild','caster',{kind:'npc',range:'Melee'}),'NATIVE_MOVEMENT_RESTRAINED');
    const invitation=f.get('gm_arbitration_decision',first.data.children[0].decision);assert.equal(invitation.status,'pending_pc_reaction');
    assert.equal(invitation.data.native.owner,'owner');assert.equal(invitation.data.result,undefined);
    assert.deepEqual(f.prepare(),first);assert.equal(f.get('combatant','npc').stress_current,1);assert.equal(f.rolls(),1);
    assert.throws(()=>f.rules.settleGroupFeature(f.db,'guild',first.record_key),/condition_settlement_not_qualified/);
  }finally{f.close();}
});

test('failure after NPC dice rolls rolls back costs, invitations and NPC receipts; retry saves once',()=>{
  const f=fixture();try{
    f.setFailure(true);assert.throws(f.prepare,/injected execution storage failure/);
    assert.equal(f.get('combatant','npc').stress_current,0);
    assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM records WHERE kind IN ('gm_action_cost_receipt','gm_arbitration_decision','native_npc_reaction','event')").get().n,0);
    f.setFailure(false);const saved=f.prepare();assert.equal(f.rolls(),2);assert.equal(f.get('combatant','npc').stress_current,1);
    assert.deepEqual(f.prepare(),saved);assert.equal(f.rolls(),2);
  }finally{f.close();}
});

test('saved NPC receipt drift blocks replay without another cost or RNG call',()=>{
  const f=fixture();try{
    f.prepare();const stored=JSON.parse(f.sql.prepare("SELECT body FROM records WHERE kind='native_npc_reaction'").get().body);
    stored.data.result.total=100;f.put(stored.kind,stored.record_key,stored);
    assert.throws(f.prepare);assert.equal(f.rolls(),1);assert.equal(f.get('combatant','npc').stress_current,1);
  }finally{f.close();}
});

test('original group feature preparation keeps its child contract and never rolls NPC dice',()=>{
  const f=fixture({area:false});try{
    const saved=f.prepare();assert.equal(saved.data.children.length,1);assert.equal(saved.data.mixed,undefined);
    const child=f.get('gm_arbitration_decision',saved.data.children[0].decision);
    assert.equal(child.data.native.operation,'request_group_feature_reaction');assert.equal(child.data.native.feature,'adversary:aster-vale-contractor:flashbang');
    assert.equal(child.data.native.owner,'owner');assert.equal(f.rolls(),0);
    assert.deepEqual(f.prepare(),saved);assert.equal(f.get('combatant','npc').stress_current,1);assert.equal(f.rolls(),0);
  }finally{f.close();}
});

test('NPC condition storage failure rolls back the parent, dice receipts and cost, and replay never resurrects a missing condition',()=>{
  const f=fixture();try{
    f.setConditionFailure(true);assert.throws(f.prepare,/injected condition storage failure/);
    assert.equal(f.get('combatant','npc').stress_current,0);assert.equal(f.get('combatant','npc').conditions,undefined);
    assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM records WHERE kind IN ('gm_group_feature_execution','native_npc_reaction','native_mixed_condition')").get().n,0);
    f.setConditionFailure(false);f.prepare();const priorRolls=f.rolls();
    f.sql.exec("DELETE FROM records WHERE kind='native_mixed_condition'");assert.throws(f.prepare);
    assert.equal(f.rolls(),priorRolls);assert.equal(f.get('combatant','npc').stress_current,1);
  }finally{f.close();}
});
