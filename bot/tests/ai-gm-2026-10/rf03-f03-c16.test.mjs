import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createPcDeathRules} from '../../src/frameworks/daggerheart/public.js';

const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function deathCase(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'rf03-death-lifecycle-')),file=path.join(root,'death.sqlite');let sql,depth=0;
  function open(){sql=new DatabaseSync(file);sql.exec('CREATE TABLE IF NOT EXISTS state(bucket TEXT,id TEXT,value TEXT,PRIMARY KEY(bucket,id));');}
  open();t.after(()=>{sql.close();fs.rmSync(root,{recursive:true,force:true});});
  const store=(bucket,id,value)=>{sql.prepare('INSERT OR REPLACE INTO state VALUES(?,?,?)').run(bucket,id,JSON.stringify(value));return value;};
  const fetch=(bucket,id)=>{const v=sql.prepare('SELECT value FROM state WHERE bucket=? AND id=?').get(bucket,id);return v?JSON.parse(v.value):null;};
  const rows=bucket=>sql.prepare('SELECT value FROM state WHERE bucket=?').all(bucket).map(r=>JSON.parse(r.value));
  const key='incoming:gate:death',character='pc:inez',user='player:inez',scene={key:'scene:gate',session_id:'session:gate'},state={principal:'principal:one',failOutcome:false};
  const original={id:character,guild_id:'g',owner_user_id:user,status:'active',data:{level:2,inventory:[],domain_cards:[],features:[],
    resources:{hp:{current:6,max:6},stress:{current:3,max:6},hope:3,hope_max:6}}};store('pc',character,original);
  store('pc_effect_receipt','cause',{kind:'pc_effect_receipt',record_key:'cause',status:'resolved',subject_key:character,source_event:'source:incoming',
    data:{cause_type:'verified_npc_attack',roll:'incoming:gate:roll',after:structuredClone(original.data.resources)}});
  const material={version:2,character,owner:user,principal:state.principal,session:scene.session_id,scene:scene.key,cause:'cause'};
  store('pc_death_move_request',key,{kind:'pc_death_move_request',record_key:key,status:'awaiting_owner',visibility:'character',subject_key:character,
    source_event:'source:incoming',data:{...material,digest:hash(material)}});
  const db={getCityRecord:(_g,kind,id)=>fetch(kind,id),saveCityRecord:(_g,v)=>{if(state.failOutcome&&v.kind==='pc_death_outcome')throw new Error('injected outcome write failure');
      const row={...v,record_key:v.key};delete row.key;return store(v.kind,v.key,row);},
    listCityRecords:(_g,{kind})=>rows(kind),getCharacter:id=>fetch('pc',id),updateCharacterData:(id,fn)=>{const pc=fetch('pc',id);fn(pc.data);return store('pc',id,pc);},
    setCharacterStatus:(id,status)=>{const pc=fetch('pc',id);pc.status=status;store('pc',id,pc);},
    getWorldEvent:(_g,id)=>fetch('event',id),ownerAuthoredSource:(_g,id,owner)=>fetch('author',id)===owner,
    recordMutation:(_g,v)=>{const id=`mutation:${rows('mutation').length+1}`;return store('mutation',id,{id,source_layer:v.sourceLayer,entity_key:v.entityKey,
      actor_type:v.actorType,actor_id:v.actorId,before_json:JSON.stringify(v.before),after_json:JSON.stringify(v.after)});},
    getMutation:(_g,id)=>fetch('mutation',id),addRoll:(_g,session,owner,pc,type,payload)=>{const id=`roll:${rows('roll').length+1}`;
      store('roll',id,{id,session_id:session,discord_user_id:owner,character_id:pc,roll_type:type,payload});return id;},getSavedRoll:(_g,id)=>fetch('roll',id),
    getRulesRuling:()=>({id:'saved-ruling',created_by:'human-gm'}),
    transaction:fn=>{const level=depth++,sp=`nested_${level}`;sql.exec(level?`SAVEPOINT ${sp}`:'BEGIN IMMEDIATE');try{
        const value=fn();assert.equal(typeof value?.then,'undefined');sql.exec(level?`RELEASE ${sp}`:'COMMIT');return value;
      }catch(error){sql.exec(level?`ROLLBACK TO ${sp}`:'ROLLBACK');if(level)sql.exec(`RELEASE ${sp}`);throw error;}finally{depth--;}}
  };
  const sources={historicalOwnerPrincipal:()=>({revision:state.principal}),currentScene:()=>scene,
    indexWorldEvent:(_db,_g,v,owner)=>{store('author',v.key,owner);return store('event',v.key,{...v,event_key:v.key,status:'active'});}};
  const unexpected=()=>{throw new Error('unexercised upstream verifier');};
  const mechanics={validatePvpDamageApplication:unexpected,settlePvpDamageAction:unexpected,
    historicalActionSource:(_db,_g,id)=>({row:fetch('typed_intent',id),scene}),consentAction:(_db,_g,id)=>({row:fetch('typed_intent',id),scene}),
    validateIncomingDamageApplication:(_db,_g,id)=>{const receipt=fetch('pc_effect_receipt',id);if(receipt?.status!=='resolved')throw new Error('invalid incoming cause');return receipt;},
    validateAllyHealingApplication:(_db,_g,id)=>fetch('healing',id),settlePreRollFearForIncoming:(_db,_g,id)=>store('settled',id,{id})};
  const rules=createPcDeathRules({sources,mechanics});
  function choose(move,faces=[6,6]){rules.reviewPcDeathMove(db,'g',user,key);const values=[...faces];return rules.choosePcDeathMove(db,'g',user,
    {request:key,expected_revision:fetch('pc_death_move_request',key).data.digest,move},{interactionId:`choose:${move}`,rng:()=>{assert.ok(values.length,'unexpected native die');return values.shift();}});}
  return {db,rules,key,user,character,original,state,scene,store,fetch,rows,choose,reopen:()=>{sql.close();open();}};
}

test('only the current affected owner may choose a privately reviewed current death request',t=>{
  const f=deathCase(t),input={request:f.key,expected_revision:f.fetch('pc_death_move_request',f.key).data.digest,move:'risk_it_all'};
  const options={interactionId:'choice',rng:()=>{throw new Error('unauthorized die');}};
  assert.throws(()=>f.rules.choosePcDeathMove(f.db,'g','other-player',input,options),/Only the current affected owner/);
  assert.throws(()=>f.rules.choosePcDeathMove(f.db,'g',f.user,input,options),/Privately review/);
  f.rules.reviewPcDeathMove(f.db,'g',f.user,f.key);
  assert.throws(()=>f.rules.choosePcDeathMove(f.db,'g',f.user,{...input,expected_revision:'stale'},options),/revision is stale/);
  f.state.principal='principal:changed';assert.throws(()=>f.rules.choosePcDeathMove(f.db,'g',f.user,input,options),/principal\/scene changed/);
  assert.equal(f.rows('roll').length,0);assert.equal(f.rows('pc_death_outcome').length,0);
});

test('Risk It All native Critical fully recovers once and saved ancestry survives reopen',t=>{
  const f=deathCase(t),outcome=f.choose('risk_it_all',[7,7]);
  assert.equal(outcome.data.result,'recovered');assert.equal(outcome.status,'resolved');
  assert.deepEqual(f.db.getCharacter(f.character).data.resources,{hp:{current:0,max:6},stress:{current:0,max:6},hope:3,hope_max:6});
  assert.equal(outcome.visibility,'character');assert.equal(f.rows('roll').length,1);f.reopen();
  assert.deepEqual(f.rules.validatePcDeathOutcome(f.db,'g',outcome.record_key),outcome);
  const request=f.fetch('pc_death_move_request',f.key);
  assert.deepEqual(f.rules.choosePcDeathMove(f.db,'g',f.user,{request:f.key,expected_revision:request.data.digest,move:'risk_it_all'},
    {interactionId:'redelivery',rng:()=>{throw new Error('reroll forbidden');}}),outcome);
  assert.equal(f.rows('roll').length,1);assert.throws(()=>f.rules.choosePcDeathMove(f.db,'g',f.user,{request:f.key,expected_revision:request.data.digest,move:'avoid_death'},
    {interactionId:'different-choice'}),/cannot change or reroll/);
});

test('Risk It All Hope awaits an exact owner allocation and its replay never allocates again',t=>{
  const f=deathCase(t),outcome=f.choose('risk_it_all',[4,2]);assert.equal(outcome.status,'awaiting_allocation');
  assert.equal(f.db.getCharacter(f.character).data.resources.hp.current,6);
  const input={request:f.key,expected_revision:outcome.data.digest,hp:2,stress:2};
  assert.throws(()=>f.rules.allocatePcDeathRecovery(f.db,'g',f.user,{...input,hp:5},{interactionId:'bad-allocation'}),/Exact owner allocation/);
  const allocated=f.rules.allocatePcDeathRecovery(f.db,'g',f.user,input,{interactionId:'allocate'});
  assert.equal(allocated.status,'resolved');assert.equal(f.db.getCharacter(f.character).data.resources.hp.current,4);
  assert.equal(f.db.getCharacter(f.character).data.resources.stress.current,1);f.reopen();
  assert.deepEqual(f.rules.allocatePcDeathRecovery(f.db,'g',f.user,input,{interactionId:'repeat'}),allocated);
  assert.equal(f.rows('mutation').length,2);assert.equal(f.rules.validatePcDeathOutcome(f.db,'g',allocated.record_key).data.allocation.hp,2);
});

test('Risk It All Fear commits death with no generic Hope or Fear award',t=>{
  const f=deathCase(t),outcome=f.choose('risk_it_all',[2,9]);assert.equal(outcome.data.result,'dead');
  assert.equal(f.db.getCharacter(f.character).status,'dead');assert.equal(f.db.getCharacter(f.character).data.resources.hope,3);
  assert.equal(f.rows('roll')[0].roll_type,'pc_death');assert.equal(f.rules.validatePcDeathOutcome(f.db,'g',outcome.record_key).data.result,'dead');
});

test('Avoid Death uses its one native Hope die and preserves permanent-slot scar and private history',t=>{
  const f=deathCase(t),outcome=f.choose('avoid_death',[1]);assert.equal(outcome.data.scar,true);assert.equal(outcome.data.result,'unconscious');
  assert.equal(f.db.getCharacter(f.character).data.resources.hope_max,5);assert.equal(f.db.getCharacter(f.character).data.resources.hp.current,6);
  assert.equal(f.rows('roll').length,1);assert.equal(f.rows('roll')[0].payload.fear,undefined);f.reopen();
  assert.equal(f.rules.validatePcDeathOutcome(f.db,'g',outcome.record_key).data.scar,true);
  const event=f.db.getWorldEvent('g',outcome.data.choice);f.store('event',event.event_key,{...event,status:'retracted'});
  assert.throws(()=>f.rules.validatePcDeathOutcome(f.db,'g',outcome.record_key),/owner death choice/);
});

test('failure after owner choice, native dice and mutation rolls the whole transaction back',t=>{
  const f=deathCase(t);f.rules.reviewPcDeathMove(f.db,'g',f.user,f.key);f.state.failOutcome=true;
  const material=f.fetch('pc_death_move_request',f.key).data;
  assert.throws(()=>f.rules.choosePcDeathMove(f.db,'g',f.user,{request:f.key,expected_revision:material.digest,move:'avoid_death'},
    {interactionId:'failed',rng:()=>1}),/injected outcome write/);
  assert.deepEqual(f.db.getCharacter(f.character),f.original);assert.equal(f.rows('roll').length,0);
  assert.equal(f.rows('event').length,0);assert.equal(f.rows('mutation').length,0);assert.equal(f.fetch('pc_death_move_request',f.key).status,'awaiting_owner');
});

test('Blaze needs an independently owned action and GM ruling, then consumes one actual saved final action',t=>{
  const f=deathCase(t),outcome=f.choose('blaze_of_glory',[]);assert.equal(outcome.status,'awaiting_final_action');assert.equal(f.rows('roll').length,0);
  const action={kind:'typed_intent',record_key:'action:final',status:'accepted_for_adjudication',source_event:'owner:final',data:{actor:f.character}};
  f.store('typed_intent',action.record_key,action);
  const input={request:f.key,accepted_intent:action.record_key,ruling:'saved-ruling'};
  assert.throws(()=>f.rules.approveBlazeAction(f.db,'g','human-gm',input,{interactionId:'approval'}),/Authenticated GM/);
  const approval=f.rules.approveBlazeAction(f.db,'g','human-gm',input,{gm:true,interactionId:'approval'});
  const result=f.rules.blazeCriticalResult(f.db,'g',f.character,action.record_key);assert.equal(result.total,null);assert.equal(result.hope,undefined);assert.equal(result.fear,undefined);
  const roll=f.db.addRoll('g','session:gate',f.user,f.character,'blaze_final_action',result);
  f.store('roll_request','final-roll',{record_key:'final-roll',status:'resolved',data:{roll_id:roll,input:{accepted_intent:action.record_key},result}});
  assert.equal(f.rules.validateBlazeSavedRoll(f.db,'g',roll).record_key,approval.record_key);
  const complete=f.rules.completeBlazeAction(f.db,'g',f.character,action.record_key,{request:'final-roll',roll});
  assert.equal(complete.status,'resolved');assert.equal(f.db.getCharacter(f.character).status,'dead');
  assert.deepEqual(f.rules.completeBlazeAction(f.db,'g',f.character,action.record_key,{request:'final-roll',roll}),complete);
  assert.equal(f.rows('pc_blaze_action').length,1);assert.throws(()=>f.rules.blazeCriticalResult(f.db,'g',f.character,action.record_key),/consumed/);
});

test('Avoid Death consciousness recovery requires the exact verified ally-healing receipt and replays once',t=>{
  const f=deathCase(t);f.choose('avoid_death',[10]);f.db.updateCharacterData(f.character,data=>{data.resources.hp.current=5;});
  f.store('healing','heal:one',{status:'resolved',subject_key:f.character,source_event:'source:healing',data:{before:6,after:5}});
  const result=f.rules.wakeAfterNativeAllyHealing(f.db,'g','heal:one');assert.equal(f.db.getCharacter(f.character).data.death_state.status,'recovered');
  f.reopen();assert.deepEqual(f.rules.wakeAfterNativeAllyHealing(f.db,'g','heal:one'),result);
  assert.equal(f.rows('pc_consciousness_receipt').length,1);assert.equal(f.rules.validatePcConsciousness(f.db,'g',result.record_key).status,'resolved');
});

test('saved native outcome rejects altered mutation ancestry without changing the PC again',t=>{
  const f=deathCase(t),outcome=f.choose('risk_it_all',[5,5]),pc=f.db.getCharacter(f.character),mutation=f.db.getMutation('g',outcome.data.mutation);
  f.store('mutation',mutation.id,{...mutation,after_json:'{}'});
  assert.throws(()=>f.rules.validatePcDeathOutcome(f.db,'g',outcome.record_key),/transactional mutation proof/);assert.deepEqual(f.db.getCharacter(f.character),pc);
});

test('existing death provider cold-imports and keeps its public non-choice authorization reader',async()=>{
  const provider=await import('../../src/pc-death.js');assert.equal(provider.blazeActionAuthorization({},'g','pc',null),null);
  assert.equal(typeof provider.choosePcDeathMove,'function');assert.equal(provider.hopeCap({resources:{hope_max:4}}),4);
});
