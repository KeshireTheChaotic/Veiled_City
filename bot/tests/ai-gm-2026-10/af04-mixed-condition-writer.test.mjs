import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createMixedConditionRules} from '../../src/frameworks/daggerheart/mixed-condition-rules.js';

function fixture(kind){
  const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE rows(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key));');
  const put=(kind,key,value)=>{sql.prepare('INSERT OR REPLACE INTO rows VALUES(?,?,?)').run(kind,key,JSON.stringify(value));return value;},
    get=(kind,key)=>{const r=sql.prepare('SELECT body FROM rows WHERE kind=? AND key=?').get(kind,key);return r?JSON.parse(r.body):null;};
  const target={kind,key:'actor'},binding={execution:'execution',cohort_hash:'cohort',target:`${kind}:actor`,proof:'native-reaction-failure',outcome:'failure'},
    cause={feature:'source-feature',source_hash:'source-hash',template_hash:'template-hash',scene:'scene',session:'session',condition:'Restrained',expiry:'until_freed',spellcast_disadvantage:true};
  let failSave=false,authorized=true,updates=0;
  put('target','actor',{conditions:[]});
  const db={getCityRecord:(_g,k,key)=>get(k,key),getWorldEvent:(_g,key)=>get('event',key),getMutation:(_g,key)=>get('mutation',key),
    transaction:fn=>{sql.exec('SAVEPOINT effect');try{const r=fn();sql.exec('RELEASE effect');return r;}catch(e){sql.exec('ROLLBACK TO effect; RELEASE effect');throw e;}},
    saveCityRecord:(_g,r)=>{if(failSave)throw Error('injected record failure');return put(r.kind,r.key,{...r,record_key:r.key});},
    recordMutation:(_g,v)=>put('mutation','mutation',{id:'mutation',actor_type:v.actorType,actor_id:v.actorId,source_layer:v.sourceLayer,
      mutation_type:v.mutationType,entity_key:v.entityKey,session_id:v.sessionId,visibility:v.visibility,before_json:JSON.stringify(v.before),after_json:JSON.stringify(v.after)})};
  const rules=createMixedConditionRules({inspectCause:(_db,_g,b,t)=>{assert.deepEqual(b,binding);assert.deepEqual(t,target);if(!authorized)throw Error('retracted reaction');return cause;},
    readTarget:()=>get('target','actor'),writeTarget:(_db,_g,t,state,conditions)=>{updates++;assert.deepEqual(state,get('target','actor'));put('target',t.key,{...state,conditions});},
    indexWorldEvent:(_db,_g,event)=>put('event',event.key,{...event,event_key:event.key,status:'active'})});
  return {db,rules,target,binding,sql,get,put,fail:()=>failSave=true,retract:()=>authorized=false,updates:()=>updates,close:()=>sql.close()};
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
