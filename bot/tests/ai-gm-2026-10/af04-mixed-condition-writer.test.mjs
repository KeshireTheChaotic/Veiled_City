import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createMixedConditionRules} from '../../src/frameworks/daggerheart/mixed-condition-rules.js';
import {createGroupFeatureExecutionRules} from '../../src/frameworks/daggerheart/group-feature-execution-rules.js';
import {createConditionRecoveryRules} from '../../src/frameworks/daggerheart/condition-recovery-rules.js';

function fixture(kind){
  const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE rows(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key));');
  const put=(kind,key,value)=>{sql.prepare('INSERT OR REPLACE INTO rows VALUES(?,?,?)').run(kind,key,JSON.stringify(value));return value;},
    get=(kind,key)=>{const r=sql.prepare('SELECT body FROM rows WHERE kind=? AND key=?').get(kind,key);return r?JSON.parse(r.body):null;};
  const target={kind,key:'actor',...(kind==='character'?{owner:'owner'}:{})},binding={execution:'execution',cohort_hash:'cohort',target:`${kind}:actor`,proof:'native-reaction-failure',outcome:'failure'},
    cause={feature:'source-feature',source_hash:'source-hash',template_hash:'template-hash',scene:'scene',session:'session',condition:'Restrained',expiry:'until_freed',spellcast_disadvantage:true};
  let failSave=false,authorized=true,updates=0,mutationId=0,recovery=null;
  put('target','actor',{conditions:[]});
  const db={getCityRecord:(_g,k,key)=>get(k,key),getWorldEvent:(_g,key)=>get('event',key),getMutation:(_g,key)=>get('mutation',key),
    listCityRecords:(_g,{kind,actor,limit,offset})=>sql.prepare('SELECT body FROM rows WHERE kind=? LIMIT ? OFFSET ?').all(kind,limit,offset).map(r=>JSON.parse(r.body)).filter(r=>r.actor_key===actor),
    transaction:fn=>{sql.exec('SAVEPOINT effect');try{const r=fn();sql.exec('RELEASE effect');return r;}catch(e){sql.exec('ROLLBACK TO effect; RELEASE effect');throw e;}},
    saveCityRecord:(_g,r)=>{if(failSave)throw Error('injected record failure');return put(r.kind,r.key,{...r,record_key:r.key});},
    getCharacter:key=>({id:key,owner_user_id:'owner',data:get('target',key)}),
    updateCharacterData:(key,fn)=>{const data=get('target',key);fn(data);put('target',key,data);},
    recordMutation:(_g,v)=>{const id=`mutation-${++mutationId}`;return put('mutation',id,{id,actor_type:v.actorType,actor_id:v.actorId,source_layer:v.sourceLayer,
      mutation_type:v.mutationType,entity_key:v.entityKey,session_id:v.sessionId,visibility:v.visibility,before_json:JSON.stringify(v.before),after_json:JSON.stringify(v.after)});}};
  const rules=createMixedConditionRules({inspectCause:(_db,_g,b,t)=>{assert.deepEqual(b,binding);assert.deepEqual(t,target);if(!authorized)throw Error('retracted reaction');return cause;},
    readTarget:()=>get('target','actor'),writeTarget:(_db,_g,t,state,conditions)=>{updates++;assert.deepEqual(state,get('target','actor'));put('target',t.key,{...state,conditions});},
    indexWorldEvent:(_db,_g,event)=>put('event',event.key,{...event,event_key:event.key,status:'active'}),
    inspectNativeConditionClearAncestry:(...args)=>{if(!recovery)throw Error('release host missing');return recovery.inspectNativeConditionClearAncestry(...args);}});
  return {db,rules,target,binding,sql,get,put,setRecovery:value=>recovery=value,fail:()=>failSave=true,retract:()=>authorized=false,updates:()=>updates,close:()=>sql.close()};
}

for(const kind of ['character','npc'])test(`mixed ${kind} condition writes exactly its native marker and replays without another write`,()=>{
  const f=fixture(kind);try{
    const row=f.rules.applyMixedCondition(f.db,'guild',f.binding,f.target);
    assert.equal(row.visibility,kind==='character'?'character':'gm');
    assert.deepEqual(f.get('target','actor').conditions,kind==='character'?[{name:'Restrained',native_ref:row.record_key,active:true}]:['Restrained']);
    assert.deepEqual(f.rules.applyMixedCondition(f.db,'guild',f.binding,f.target),row);assert.equal(f.updates(),1);
    const event=f.get('event',row.source_event);event.details.payload_hash='tampered';f.put('event',event.event_key,event);
    assert.throws(()=>f.rules.inspectMixedCondition(f.db,'guild',row.record_key));
  }finally{f.close();}
});

test('mixed PC records use the existing active-condition and movement readers, and require their native inspector',()=>{
  const f=fixture('character');try{
    const row=f.rules.applyMixedCondition(f.db,'guild',f.binding,f.target);
    assert.equal(row.kind,'pc_native_condition');assert.equal(row.data.version,2);
    const names=['narrativeSourceVisible','compileNativeFeatures','inspectNativeGmDecision','inspectCommittedGmDecision','nativeReactionTarget',
      'commitGmActionCost','currentScene','scenePresence','sceneAccess','activeCityProxy','conversationPrincipal','personalCharacter','indexWorldEvent',
      'typedRollProof','EncounterLibrary','reserveGmArbitrationNotice','applyNativeStressPassive','inspectNativeConditionClearAncestry'];
    const capabilities=Object.fromEntries(names.map(name=>[name,()=>{throw Error(`unused capability ${name}`);} ]));
    capabilities.RANGE_BANDS=['Melee','Very Close','Close','Far','Very Far'];
    const unavailable=createGroupFeatureExecutionRules({capabilities});
    assert.throws(()=>unavailable.activeNativeConditions(f.db,'guild','actor'),/mixed_host_unavailable/);
    const native=createGroupFeatureExecutionRules({capabilities:{...capabilities,inspectMixedCondition:f.rules.inspectMixedCondition}});
    assert.deepEqual(native.activeNativeConditions(f.db,'guild','actor'),[row]);
    assert.equal(native.nativeMovementConditionIssue(f.db,'guild','actor',{range:'Melee'}),'NATIVE_MOVEMENT_RESTRAINED');
    assert.deepEqual(native.nativeIncomingConditions(f.db,'guild','actor'),[]);
    const forged=createGroupFeatureExecutionRules({capabilities:{...capabilities,inspectMixedCondition:()=>({...row,status:'cleared'})}});
    assert.throws(()=>forged.activeNativeConditions(f.db,'guild','actor'),/mixed_reader_source/);
  }finally{f.close();}
});

test('condition persistence failure rolls back state and existing foreign conditions are held',()=>{
  const f=fixture('npc');try{
    f.fail();assert.throws(()=>f.rules.applyMixedCondition(f.db,'guild',f.binding,f.target),/injected record failure/);
    assert.deepEqual(f.get('target','actor').conditions,[]);
    assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM rows WHERE kind IN ('event','mutation')").get().n,0);
    f.put('target','actor',{conditions:['Restrained']});
    assert.throws(()=>f.rules.applyMixedCondition(f.db,'guild',f.binding,f.target));
    assert.deepEqual(f.get('target','actor').conditions,['Restrained']);
  }finally{f.close();}
});

test('successful, pending and retracted reactions cannot produce condition state',()=>{
  const f=fixture('character');try{
    for(const outcome of ['success','pending','withdrawn'])assert.throws(()=>f.rules.applyMixedCondition(f.db,'guild',{...f.binding,outcome},f.target));
    f.retract();assert.throws(()=>f.rules.applyMixedCondition(f.db,'guild',f.binding,f.target),/retracted reaction/);
    assert.deepEqual(f.get('target','actor').conditions,[]);assert.equal(f.updates(),0);
  }finally{f.close();}
});

test('existing owner-action recovery clears a mixed Restrained condition once and validates its saved release',()=>{
  const f=fixture('character');try{
    const row=f.rules.applyMixedCondition(f.db,'guild',f.binding,f.target),scope={mode:'private',actorUserId:'owner',actorCharacterId:'actor'};
    const action={record_key:'free-action',source_event:'owner-source',data:{type:'interact',operation:'clear_condition',target_key:row.record_key,
      actor:'actor',owner_user_id:'owner',actor_principal_revision:'principal',scene:'scene',session_id:'session',source_hash:'source',start:0,end:20,framing:'immediate'}},
      result={record_key:'native-success',data:{outcome:'success'}};
    const recovery=createConditionRecoveryRules({capabilities:{
      ordinaryActionProof:(_db,_g,key,s)=>{assert.equal(key,action.record_key);assert.deepEqual(s,scope);return {row:action,pc:f.db.getCharacter('actor'),principal:{user:'owner',revision:'principal'},scene:{key:'scene',session_id:'session'},scope};},
      ordinaryPrerequisite:(_db,_g,p)=>{assert.equal(p.prerequisite_ref,result.record_key);return {receipt:result};},
      validateNativeCondition:f.rules.inspectMixedCondition,assertPcCanAct:()=>{},
      indexWorldEvent:(_db,_g,event)=>f.put('event',event.key,{...event,event_key:event.key,status:'active'})}});
    f.setRecovery(recovery);
    const input={condition:row.record_key,accepted_intent:action.record_key,prerequisite:result.record_key};
    result.data.outcome='failure';assert.throws(()=>recovery.clearNativeConditionFromOutcome(f.db,'guild',input,scope));
    assert.equal(f.get('target','actor').conditions[0].active,true);
    result.data.outcome='success';
    const cleared=recovery.clearNativeConditionFromOutcome(f.db,'guild',input,scope);
    assert.equal(f.get('target','actor').conditions[0].active,false);
    assert.equal(f.rules.inspectMixedCondition(f.db,'guild',row.record_key).status,'cleared');
    assert.deepEqual(recovery.clearNativeConditionFromOutcome(f.db,'guild',input,scope),cleared);
    assert.throws(()=>recovery.clearNativeConditionFromOutcome(f.db,'guild',input,{...scope,actorUserId:'other'}));
    const stored=f.get('pc_native_condition',row.record_key);stored.data.owner='other';f.put(stored.kind,stored.record_key,stored);
    assert.throws(()=>f.rules.inspectMixedCondition(f.db,'guild',row.record_key));
  }finally{f.close();}
});
