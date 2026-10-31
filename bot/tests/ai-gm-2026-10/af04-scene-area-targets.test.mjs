import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {sceneAreaTargetCandidates,sceneIntentTargetsValid} from '../../src/frameworks/intent/scene-intent-board.js';

function fixture(){
  const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE presence(key TEXT PRIMARY KEY, body TEXT); CREATE TABLE events(key TEXT PRIMARY KEY, body TEXT);');
  const origin={binding:{scene:'scene',session:'session',location:'room'},scope:{mode:'party'}},options={sourceVisible:(_db,_g,key)=>key!=='hidden'};
  const db={listCityRecords:(_g,{offset,limit})=>sql.prepare('SELECT body FROM presence ORDER BY key LIMIT ? OFFSET ?').all(limit,offset).map(r=>JSON.parse(r.body)),
    getWorldEvent:(_g,key)=>{const r=sql.prepare('SELECT body FROM events WHERE key=?').get(key);return r?JSON.parse(r.body):null;},
    getCharacter:key=>key==='pc'?{id:key}:null,getNpcProfile:(_g,key)=>key==='npc'?{npc_key:key}:null,
    getSimulationEntity:(_g,kind,key)=>kind==='location'&&key==='room'?{key}:null};
  function add(key,patch={},eventPatch={}){
    const row={record_key:key,status:'active',visibility:'party',location_key:'room',source_event:key,data:{entity_type:'hazard',state:'actually_present',zone:'doorway',scene:'scene',session_id:'session'},...patch};
    const event={event_key:key,status:'active',location_key:'room',scene:'scene',session_id:'session',...eventPatch};
    sql.prepare('INSERT OR REPLACE INTO presence VALUES(?,?)').run(key,JSON.stringify(row));sql.prepare('INSERT OR REPLACE INTO events VALUES(?,?)').run(key,JSON.stringify(event));
  }
  return {sql,db,origin,options,add,close:()=>sql.close()};
}

test('scene feature targets admit established visible local areas only, preserving ordinary identities',()=>{
  const f=fixture();try{
    f.add('area');f.add('hidden');f.add('expired',{}, {status:'retracted'});f.add('elsewhere',{location_key:'other'});
    f.add('private-row',{visibility:'gm'});
    f.add('old-scene',{}, {scene:'old'});f.add('no-local-zone',{data:{entity_type:'hazard',state:'actually_present',zone:'scene',scene:'scene',session_id:'session'}});
    assert.deepEqual(sceneAreaTargetCandidates(f.db,'g',f.origin,f.options).map(a=>a.ref),['area']);
    assert.equal(sceneIntentTargetsValid(f.db,'g',f.origin,'feature',['area'],f.options),true);
    for(const operation of ['attack','move','speak','reaction'])assert.equal(sceneIntentTargetsValid(f.db,'g',f.origin,operation,['area'],f.options),false);
    assert.equal(sceneIntentTargetsValid(f.db,'g',f.origin,'feature',['area','area'],f.options),false);
    assert.equal(sceneIntentTargetsValid(f.db,'g',f.origin,'attack',['pc','npc','room'],f.options),true);
    assert.equal(sceneIntentTargetsValid(f.db,'g',f.origin,'feature',['hidden'],f.options),false);
    const prior=sceneAreaTargetCandidates(f.db,'g',f.origin,f.options)[0];f.add('area',{data:{entity_type:'hazard',state:'actually_present',zone:'new-zone',scene:'scene',session_id:'session'}});
    assert.notEqual(sceneAreaTargetCandidates(f.db,'g',f.origin,f.options)[0].presence_hash,prior.presence_hash);
  }finally{f.close();}
});

test('area discovery inspects later pages and bounds the prompt without granting execution',()=>{
  const f=fixture();try{
    for(let i=0;i<105;i++)f.add(`a${String(i).padStart(3,'0')}`,{}, {status:'retracted'});
    f.add('z-area');assert.equal(sceneAreaTargetCandidates(f.db,'g',f.origin,f.options)[0].ref,'z-area');
    for(let i=0;i<20;i++)f.add(`visible-${i}`);
    const candidates=sceneAreaTargetCandidates(f.db,'g',f.origin,f.options);assert.equal(candidates.length,16);
    assert.ok(candidates.every(a=>a.execution_authorized===false));
  }finally{f.close();}
});
