/** Mundane identity persistence is a native scoped transition, not truth inferred from repetition. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,run,unit,candidate} from './narrative-fixtures.mjs';
import {ContentIndex} from '../src/content.js';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {establishNarrativeEntity,captureWorldInput,worldInputKey,configureWorldAuthority} from '../src/autonomous-world.js';
import {noteNarrativeInterest,narrativeImportance,maintainNarrativeSalience} from '../src/narrative-salience.js';
function fixture(f,privateScene=false,kind='faction'){
  const x=setup(f,{privateScene,messageId:'persistence-origin'}),definition={kind,key:'copper-sparrow',name:'Copper Sparrow',
    aliases:['Sparrow Fellowship'],summary:'An ordinary local identity.',role:'local community',location_key:kind==='npc'?'terminal':'',parent_location_key:''};
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_salience:true}});
  const identity=establishNarrativeEntity(f.db,f.guild,definition,buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),{content:new ContentIndex(path.resolve('../content'))});
  let seq=0;
  const mention=(text='What about Copper Sparrow?')=>{
    const id=`persistence-input-${seq++}`;
    captureWorldInput(f.db,f.guild,x.pc.owner_user_id,x.pc.id,id,text,{privateScene});
    const source=worldInputKey(id,x.pc.id);noteNarrativeInterest(f.db,f.guild,x.scope,source);return source;
  };
  return {...x,identity,mention};
}
const promotions=f=>f.db.listCityRecords(f.guild,{kind:'world_identity_promotion',includeGM:true});
test('WD02 seven distinct grounded interests natively persist one mundane identity; replay/restart never duplicate it',()=>nativeFixture(async f=>{
  const x=fixture(f),resources=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);let source;
  for(let i=0;i<6;i++)source=x.mention();assert.equal(promotions(f).length,0);
  source=x.mention();const rows=promotions(f);assert.equal(rows.length,1);
  assert.equal(rows[0].data.identity_ref,x.identity.record_key);assert.equal(rows[0].data.canonical_scope,'mundane_identity_only');
  assert.equal(rows[0].data.execution_authority,false);assert.equal(rows[0].data.publication_authority,false);
  noteNarrativeInterest(f.db,f.guild,x.scope,source);f.restart();x.mention();assert.equal(promotions(f).length,1);
  assert.equal(f.db.getSimulationEntity(f.guild,'faction','copper-sparrow'),null);
  assert.equal(f.db.listCanon(f.guild,{includeGM:true}).length,0,'No broad/global claim is written to the canon ledger');
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),resources);
}));
test('WD03 repeated allegations can persist an already GM-created identity, never the alleged fact or a nonexistent faction',()=>nativeFixture(f=>{
  const x=fixture(f);
  for(let i=0;i<7;i++)x.mention('Copper Sparrow controls every district. An Uncreated Circle owns everything.');
  const rows=promotions(f);assert.equal(rows.length,1);assert(!JSON.stringify(rows[0].data).includes('controls every'));
  assert.equal(f.db.getCityRecord(f.guild,'autonomous_entity','faction:uncreated-circle'),null);
  assert.equal(f.db.listFactsForGM(f.guild).length,0);assert.equal(f.db.listCanon(f.guild,{includeGM:true}).length,0);
}));
test('WD01 OOC repetition cannot create weighted fictional persistence or new interest',()=>nativeFixture(f=>{
  const x=fixture(f);for(let i=0;i<8;i++)x.mention('OOC: Copper Sparrow should matter.');
  assert.equal(narrativeImportance(f.db,f.guild,x.identity.record_key,x.scope),null);assert.equal(promotions(f).length,0);
}));
test('WD06 private persistence stays private and dormant identity can return without new world creation',()=>nativeFixture(async f=>{
  const x=fixture(f,true);for(let i=0;i<7;i++)x.mention();const row=promotions(f)[0];assert(row);
  const {verifiedIdentityPersistence}=await import('../src/world-identity-persistence.js');
  assert(verifiedIdentityPersistence(f.db,f.guild,row.record_key,x.scope));
  assert.equal(verifiedIdentityPersistence(f.db,f.guild,row.record_key,{mode:'party'}),null);
  assert.equal(verifiedIdentityPersistence(f.db,f.guild,row.record_key,{mode:'private',actorCharacterId:f.pcs[1].id,actorUserId:f.pcs[1].owner_user_id}),null);
  assert.equal(verifiedIdentityPersistence(f.db,f.guild,row.record_key,{mode:'private',actorCharacterId:x.pc.id,actorUserId:f.pcs[1].owner_user_id}),null);
  f.db.advanceSimulationClock(f.guild,{ticks:30});maintainNarrativeSalience(f.db,f.guild);
  assert.equal(narrativeImportance(f.db,f.guild,x.identity.record_key,x.scope).status,'prompt_archived');
  f.restart();x.mention('What about Sparrow Fellowship?');assert.equal(narrativeImportance(f.db,f.guild,x.identity.record_key,x.scope).status,'active');
  assert.equal(promotions(f).length,1);assert.equal(f.db.listCityRecords(f.guild,{kind:'autonomous_entity',includeGM:true}).length,1);
}));
test('W2 manual world-authority policy prevents automatic persistence without blocking owner interest',()=>nativeFixture(f=>{
  const x=fixture(f);configureWorldAuthority(f.db,f.guild,{gm_authority_mode:'manual'},'fixture-gm');
  for(let i=0;i<7;i++)x.mention();assert.equal(narrativeImportance(f.db,f.guild,x.identity.record_key,x.scope).score,21);
  assert.equal(promotions(f).length,0);
}));
test('W2 revoked native birth holds persistence proof but preserves saved identities and PC outcomes',()=>nativeFixture(async f=>{
  const x=fixture(f);for(let i=0;i<7;i++)x.mention();const row=promotions(f)[0];assert(row);
  const {verifiedIdentityPersistence}=await import('../src/world-identity-persistence.js'),before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,x.identity.source_event);
  assert.equal(verifiedIdentityPersistence(f.db,f.guild,row.record_key,x.scope),null);
  assert(f.db.getCityRecord(f.guild,'autonomous_entity',x.identity.record_key));assert.equal(promotions(f).length,1);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
}));
test('W2 copied native contexts and inflated heuristic scores cannot authorize persistence',()=>nativeFixture(async f=>{
  const x=fixture(f),source=x.mention(),ctx=buildNarrativeContext(f.db,f.guild,x.scope,source),
    {promoteWorldIdentity}=await import('../src/world-identity-persistence.js');
  const interest=f.db.listCityRecords(f.guild,{kind:'narrative_interest',includeGM:true})[0];
  f.db.saveCityRecord(f.guild,{...interest,key:interest.record_key,data:{...interest.data,weight:1000}});
  assert.throws(()=>promoteWorldIdentity(f.db,f.guild,{...ctx,gm:true,score:1000},x.identity.record_key),/native|audience|context/i);
  assert.equal(promoteWorldIdentity(f.db,f.guild,ctx,x.identity.record_key),null);
  assert.equal(promotions(f).length,0);
}));
test('WD04 one authenticated causal source cannot gain canonical weight twice through different audience profiles',()=>nativeFixture(async f=>{
  const x=fixture(f),source=x.mention(),scope={...x.scope,mode:'private'};
  noteNarrativeInterest(f.db,f.guild,scope,source);
  const {canonicalInterestEvidence}=await import('../src/narrative-salience.js');
  assert.equal(canonicalInterestEvidence(f.db,f.guild,x.identity.record_key,scope).reduce((sum,e)=>sum+e.weight,0),3);
  assert.equal(promotions(f).length,0);
}));
test('WD04 actual native NPC dialogue and its owner interaction share one causal contribution; recurrence preserves the NPC identity',()=>nativeFixture(async f=>{
  const x=fixture(f,false,'npc'),next=setup(f,{text:'Copper Sparrow, where is the sorting desk?',messageId:'persistence-dialogue'}),turn=candidate(next.text);
  turn.player_intents=[{...turn.player_intents[0],type:'speak',operation:'dialogue',target_key:'copper-sparrow',target_name:'Copper Sparrow',utterance:next.text,resolution:'auto'}];
  const out=await run(f,next,{fiction_delta:[],narrative_units:[unit('answer','npc_speech','The sorting desk is by the counter.',{subject_key:'copper-sparrow'})]},turn);
  assert(out.rows.some(row=>row.payload.includes('sorting desk')));
  const {canonicalInterestEvidence}=await import('../src/narrative-salience.js');
  assert.equal(canonicalInterestEvidence(f.db,f.guild,x.identity.record_key,x.scope).reduce((sum,e)=>sum+e.weight,0),5);
  for(let i=0;i<5;i++)x.mention();assert.equal(promotions(f).length,1);
  f.restart();x.mention();assert.equal(promotions(f).length,1);
  assert.equal(f.db.getCityRecord(f.guild,'autonomous_entity',x.identity.record_key).source_event,x.identity.source_event);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'autonomous_entity',includeGM:true}).length,1);
}));
test('W2 historical v1 heuristic interest stays readable but cannot mint new canonical identity receipts',()=>nativeFixture(async f=>{
  const x=fixture(f);configureWorldAuthority(f.db,f.guild,{gm_authority_mode:'manual'},'fixture-gm');let source;
  for(let i=0;i<7;i++)source=x.mention();
  for(const row of f.db.listCityRecords(f.guild,{kind:'narrative_interest',includeGM:true}))
    f.db.saveCityRecord(f.guild,{...row,key:row.record_key,data:{...row.data,version:1}});
  configureWorldAuthority(f.db,f.guild,{gm_authority_mode:'autonomous'},'fixture-gm');
  const {promoteWorldIdentity}=await import('../src/world-identity-persistence.js');
  assert.equal(narrativeImportance(f.db,f.guild,x.identity.record_key,x.scope).score,21);
  assert.equal(promoteWorldIdentity(f.db,f.guild,buildNarrativeContext(f.db,f.guild,x.scope,source),x.identity.record_key),null);
}));
test('W2 retracted interest is reconciled by a new native receipt, never by rewriting the old receipt or world identity',()=>nativeFixture(async f=>{
  const x=fixture(f),sources=[];for(let i=0;i<7;i++)sources.push(x.mention());const old=promotions(f)[0];assert(old);
  const {verifiedIdentityPersistence}=await import('../src/world-identity-persistence.js');
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,sources[0]);
  assert.equal(verifiedIdentityPersistence(f.db,f.guild,old.record_key,x.scope),null);
  x.mention();const current=promotions(f).find(row=>row.record_key!==old.record_key);
  assert(current);assert.equal(current.data.previous,old.record_key);
  assert(verifiedIdentityPersistence(f.db,f.guild,current.record_key,x.scope));
  assert.deepEqual(f.db.getCityRecord(f.guild,'world_identity_promotion',old.record_key),old);
  const copied=f.db.saveCityRecord(f.guild,{...current,key:'copied-promotion'});
  assert.equal(verifiedIdentityPersistence(f.db,f.guild,copied.record_key,x.scope),null);
}));
