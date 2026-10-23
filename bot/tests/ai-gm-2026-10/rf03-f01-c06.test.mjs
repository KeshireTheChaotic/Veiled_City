import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createRollRequestRules} from '../../src/frameworks/daggerheart/public.js';

function fixture(t){
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'rf03-roll-prepare-')),file=path.join(folder,'local.sqlite');
  let sql;
  const open=()=>{sql=new DatabaseSync(file);sql.exec('CREATE TABLE IF NOT EXISTS records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key));');};
  open();t.after(()=>{sql.close();fs.rmSync(folder,{recursive:true,force:true});});
  const pc={id:'pc:rhea',guild_id:'g',owner_user_id:'owner',name:'Rhea',status:'active',
    data:{traits:{Instinct:2},resources:{hope:3,stress:{current:0,max:6}},inventory:[]}};
  const scene={key:'scene:rain',session_id:'session:one'},session={id:'session:one'};
  const events=new Map([['declaration',{event_key:'declaration',status:'active',kind:'authored_turn',source_id:'player:owner',
    session_id:session.id,scene:scene.key,visibility:'party',details:{author:'owner',character_id:pc.id,raw_text:'I inspect the lock.'}}]]);
  const accepted={kind:'typed_intent',record_key:'action:lock',status:'accepted_for_adjudication',source_event:'declaration',
    visibility:'party',subject_key:null,data:{actor:pc.id,owner_user_id:'owner',source_hash:'source:lock',type:'search',start:0,end:19}};
  const save=(kind,key,body)=>sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(kind,key,JSON.stringify(body));
  const get=(kind,key)=>{const r=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key);return r?JSON.parse(r.body):null;};
  save(accepted.kind,accepted.record_key,accepted);
  const state={withdrawn:false,pvp:false,reservationFailure:false,adjudicationCalls:[],aura:null,formation:null,veil:null};
  const db={
    getCityRecord:(_g,kind,key)=>get(kind,key),
    saveCityRecord:(_g,v)=>{const row={...v,record_key:v.key};delete row.key;save(v.kind,v.key,row);return row;},
    getCityCalendar:()=>({flags:{roll_requests:true}}),getActiveSession:()=>session,
    getWorldEvent:(_g,key)=>events.get(key),ownerAuthoredSource:(_g,key,user)=>events.get(key)?.details.author===user,
    getCharacter:key=>key===pc.id?pc:null,getRulesRuling:()=>({id:'ruling'}),
    rollModifierSources:()=>[...events.values()].filter(e=>e.details.roll_modifier),
    ownedRollRequests:()=>sql.prepare("SELECT body FROM records WHERE kind='roll_request'").all().map(r=>JSON.parse(r.body)),
    getCurrentEncounter:()=>({id:'encounter:one',status:'active'}),listCombatants:()=>[{id:'target:one',status:'active',difficulty:13}],
    transaction:fn=>{sql.exec('BEGIN IMMEDIATE');try{const result=fn();assert.equal(typeof result?.then,'undefined');sql.exec('COMMIT');return result;}
      catch(error){sql.exec('ROLLBACK');throw error;}}
  };
  const sources={
    personalCharacter:(_db,g,user,key=pc.id)=>{if(g!=='g'||user!==pc.owner_user_id||key!==pc.id)throw new Error('current owner required');return pc;},
    currentScene:()=>scene,
    requireCitySource:(_db,_g,key)=>{const e=events.get(key);if(e?.status!=='active')throw new Error('source inactive');return e;},
    cityAudit:(_db,_g,operation,key)=>save('audit',key,{operation}),cityKey:key=>key,
    overlapsOwnerActionTerminal:()=>state.withdrawn
  };
  const mechanics={isPvpIntent:()=>state.pvp,assertNonPvpCombatant:()=>{},assertPcCanAct:()=>{},blazeActionAuthorization:()=>false,
    nativeDefenseAura:()=>state.aura,persistNativeDefenseAura:()=>{},nativeFormationDefense:()=>state.formation,
    persistNativeFormationDefense:()=>{},nativeVeilExposureDefense:()=>state.veil,
    inspectNativeUnarmedAttack:()=>{state.adjudicationCalls.push('unarmed');return {attack:{weapon:'unarmed',damage:'2d4',damage_type:'physical',target_id:'target:one',encounter_id:'encounter:one',difficulty:13}};},
    inspectOrdinaryRollModifier:()=>{throw new Error('unexpected native modifier');},inspectNativeEquippedAttack:()=>{throw new Error('unexpected equipped attack');}};
  const reserveRollAmendment=(_db,_g,row)=>{save('notice',row.record_key,{request:row.record_key,owner:row.data.owner_user_id});
    if(state.reservationFailure)throw new Error('injected reservation failure');};
  const rules=createRollRequestRules({sources,mechanics,traits:['Instinct','Strength','Finesse'],reserveRollAmendment});
  const input={source_event:'declaration',accepted_intent:accepted.record_key,character_id:pc.id,kind:'action',trait:'Instinct',
    adjudication:'Inspect the existing lock carefully.',modifier_keys:[]};
  return {db,pc,scene,session,events,accepted,state,sources,mechanics,rules,input,get,save,
    reopen:()=>{sql.close();open();},count:kind=>sql.prepare('SELECT count(*) AS n FROM records WHERE kind=?').get(kind).n};
}

test('native preparation commits exact private request and reservation without rolling or spending',t=>{
  const f=fixture(t),before=structuredClone(f.pc.data.resources);
  f.events.set('difficulty',{event_key:'difficulty',status:'active',kind:'roll_adjudication',source_kind:'gm',visibility:'character',subject_key:f.pc.id,
    details:{human_reviewed:true,roll_difficulty:{declaration:'declaration',value:14}}});
  const row=f.rules.prepareRollRequest(f.db,'g',{...f.input,difficulty_source:'difficulty'},'gm');
  assert.equal(row.status,'pending');assert.equal(row.visibility,'character');assert.equal(row.subject_key,f.pc.id);
  assert.equal(row.data.breakdown.difficulty,14);assert.equal(row.data.breakdown.subtotal,2);assert.equal(row.data.revision,1);
  assert.equal(row.data.input.accepted_intent,'action:lock');assert.equal(row.data.roll_id,undefined);
  assert.deepEqual(f.pc.data.resources,before);assert.equal(f.count('notice'),1);assert.equal(f.count('audit'),1);
});

test('saved request survives database reopen and duplicate preparation reserves once',t=>{
  const f=fixture(t),first=f.rules.prepareRollRequest(f.db,'g',f.input,'gm');f.reopen();
  const replay=f.rules.prepareRollRequest(f.db,'g',f.input,'gm');
  assert.deepEqual(replay,first);assert.equal(f.count('roll_request'),1);assert.equal(f.count('notice'),1);assert.equal(f.count('audit'),1);
});

test('reservation failure rolls request, audit and reserved notice back atomically',t=>{
  const f=fixture(t);f.state.reservationFailure=true;
  assert.throws(()=>f.rules.prepareRollRequest(f.db,'g',f.input,'gm'),/injected reservation failure/);
  assert.equal(f.count('roll_request'),0);assert.equal(f.count('notice'),0);assert.equal(f.count('audit'),0);
  assert.equal(f.get('typed_intent','action:lock').status,'accepted_for_adjudication');
});

test('current owner, scene, withdrawal, PvP and private scope remain mandatory before preparation',t=>{
  const f=fixture(t);
  f.state.withdrawn=true;assert.throws(()=>f.rules.prepareRollRequest(f.db,'g',f.input,'gm'),/withdrew/);f.state.withdrawn=false;
  f.state.pvp=true;assert.throws(()=>f.rules.prepareRollRequest(f.db,'g',f.input,'gm'),/PC conflict/);f.state.pvp=false;
  f.pc.owner_user_id='new-owner';assert.throws(()=>f.rules.prepareRollRequest(f.db,'g',f.input,'gm'),/current owner/);f.pc.owner_user_id='owner';
  f.scene.key='scene:elsewhere';assert.throws(()=>f.rules.prepareRollRequest(f.db,'g',f.input,'gm'),/current authenticated owner/);f.scene.key='scene:rain';
  assert.throws(()=>f.rules.prepareRollRequest(f.db,'g',f.input,'gm',{scope:{mode:'private',actorUserId:'other',actorCharacterId:f.pc.id}}),/Private requests/);
  assert.equal(f.count('roll_request'),0);
});

test('all scoped modifier sources and exact Difficulty provenance are retained',t=>{
  const f=fixture(t),mod={event_key:'modifier',status:'active',kind:'roll_adjudication',source_kind:'gm',session_id:f.session.id,scene:f.scene.key,
    visibility:'character',subject_key:f.pc.id,details:{human_reviewed:true,roll_modifier:{trait:'Instinct',roll_kind:'action',kind:'flat',amount:2,name:'Clear view',ruling_key:'ruling'}}};
  f.events.set(mod.event_key,mod);
  assert.throws(()=>f.rules.rollBreakdown(f.db,'g',f.input,f.pc),/Every active scoped modifier/);
  const input={...f.input,modifier_keys:['modifier']};assert.equal(f.rules.rollBreakdown(f.db,'g',input,f.pc).subtotal,4);
  mod.visibility='gm';assert.throws(()=>f.rules.rollBreakdown(f.db,'g',input,f.pc),/character-scoped/);mod.visibility='character';
  f.events.set('difficulty',{event_key:'difficulty',status:'active',kind:'roll_adjudication',source_kind:'gm',visibility:'character',subject_key:f.pc.id,
    details:{human_reviewed:true,roll_difficulty:{declaration:'another-source',value:14}}});
  assert.throws(()=>f.rules.rollBreakdown(f.db,'g',{...input,difficulty_source:'difficulty'},f.pc),/Difficulty requires/);
});

test('missing sheet trait produces review while current-owner pending readers stay scoped',t=>{
  const f=fixture(t);delete f.pc.data.traits.Instinct;
  const row=f.rules.prepareRollRequest(f.db,'g',f.input,'gm');assert.equal(row.status,'needs_review');
  assert.deepEqual(f.rules.pendingRollRequests(f.db,'g','owner').map(r=>r.record_key),[row.record_key]);
  assert.equal(f.rules.ownedRollRequest(f.db,'g','owner',row.record_key).record_key,row.record_key);
  assert.throws(()=>f.rules.ownedRollRequest(f.db,'g','other',row.record_key),/current owner/);
  f.scene.key='scene:new';assert.deepEqual(f.rules.pendingRollRequests(f.db,'g','owner'),[]);
});

test('native attack verifier and exact defensive source adjustments are invoked in the original order',t=>{
  const f=fixture(t);f.events.set('attack',{event_key:'attack',status:'active',kind:'native_unarmed_attack',details:{}});
  const input={...f.input,kind:'attack',attack_source:'attack'};
  f.state.aura={proof:'aura-proof'};
  assert.equal(f.rules.rollBreakdown(f.db,'g',input,f.pc).attack.difficulty,14);assert.deepEqual(f.state.adjudicationCalls,['unarmed']);
  f.state.formation={detail:{bonus:2},proof:'formation-proof'};
  assert.throws(()=>f.rules.rollBreakdown(f.db,'g',input,f.pc),/Combined defensive/);
});

test('actual existing provider cold-imports and calls the new native trait breakdown engine',async()=>{
  const provider=await import('../../src/roll-requests.js');
  const row=provider.rollTraitBreakdown({rollModifierSources:()=>[]},'g',{trait:'Instinct',kind:'action',adjudication:'Look at the door.',modifier_keys:[]},
    {data:{traits:{Instinct:3}}});
  assert.equal(row.subtotal,3);assert.deepEqual(row.unresolved,[]);
});
