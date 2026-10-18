/** W2 native origin: capability/provenance adapters, not model role flags. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,run,unit} from './narrative-fixtures.mjs';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {establishNarrativeEntity} from '../src/autonomous-world.js';
import {ContentIndex} from '../src/content.js';
import {sceneFictionHash} from '../src/scene-fiction-context.js';
import {worldIdentityOrigin} from '../src/world-authorship.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
const content=new ContentIndex(path.resolve('../content'));
const definition=()=>({kind:'npc',key:'native-origin-porter',name:'Nella Wick',summary:'An ordinary local porter.',
  location_key:'terminal',parent_location_key:'',role:'porter',aliases:['Parcel Clerk']});
for(const kind of ['copied_context','relabelled_audience','wrong_character'])test(`W2 native GM creation rejects ${kind}, including model gm:true`,()=>nativeFixture(f=>{
  const x=setup(f),original=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef);
  let ctx=original;
  if(kind==='copied_context')ctx={...original,gm:true,native_ai_gm:true};
  if(kind==='relabelled_audience')ctx.scope={...ctx.scope,mode:'private'};
  if(kind==='wrong_character')ctx.scope={...ctx.scope,actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id};
  assert.throws(()=>f.db.transaction(()=>establishNarrativeEntity(f.db,f.guild,definition(),ctx,{content})),/native|audience|scope|context|owner/i);
  assert.equal(f.db.getCityRecord(f.guild,'autonomous_entity','npc:native-origin-porter'),null);
  assert.equal(f.db.getNpcProfile(f.guild,'native-origin-porter'),null);
}));
test('W2 identical native replay survives restart and property order; a changed definition cannot reuse the receipt',()=>nativeFixture(f=>{
  const x=setup(f),input=definition(),ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),
    original=f.db.transaction(()=>establishNarrativeEntity(f.db,f.guild,input,ctx,{content}));
  f.restart();const current=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef);
  const reordered=Object.fromEntries(Object.entries(input).reverse());
  const replay=f.db.transaction(()=>establishNarrativeEntity(f.db,f.guild,reordered,current,{content}));
  assert.equal(replay.record_key,original.record_key);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'autonomous_entity',includeGM:true}).length,1);
  assert.throws(()=>f.db.transaction(()=>establishNarrativeEntity(f.db,f.guild,{...input,summary:'A different invented history.'},current,{content})),/immutable|altered/i);
}));
test('W2 direct native creation is atomic when packaged identity authority is unavailable',()=>nativeFixture(f=>{
  const x=setup(f),ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),before=f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).length;
  assert.throws(()=>establishNarrativeEntity(f.db,f.guild,definition(),ctx),/Packaged NPC canon/);
  assert.equal(f.db.getNpcProfile(f.guild,'native-origin-porter'),null);
  assert.equal(f.db.getCityRecord(f.guild,'autonomous_entity','npc:native-origin-porter'),null);
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).length,before,'No orphan native creation/origin event may survive.');
}));
test('W2 a scene authoring grant cannot mint offscene NPC presence',()=>nativeFixture(f=>{
  const x=setup(f),ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef);
  f.db.setSimulationEntity(f.guild,'location','remote-office',{name:'A remote office',visibility:'party'});
  assert.throws(()=>establishNarrativeEntity(f.db,f.guild,{...definition(),location_key:'remote-office'},ctx,{content}),/scene|camera|scope|local/i);
  assert.equal(f.db.getCityRecord(f.guild,'autonomous_entity','npc:native-origin-porter'),null);
}));
test('W2 private creation receipt is not a cross-audience grant; identity tampering cannot authorize recall or speech',()=>nativeFixture(async f=>{
  const x=setup(f,{privateScene:true}),input=definition(),out=await run(f,x,{fiction_delta:[input],
    narrative_units:[unit('private-offer','npc_speech','There is a sorting shift open.',{subject_key:input.key,visibility:'character'})]}),
    row=f.db.getCityRecord(f.guild,'autonomous_entity','npc:'+input.key);
  assert(out.rows.some(p=>p.payload.includes('sorting shift')));
  assert.equal(worldIdentityOrigin(f.db,f.guild,row,x.scope).execution_authority,false);
  assert.equal(worldIdentityOrigin(f.db,f.guild,row,{...x.scope,mode:'party'}),null);
  assert.equal(worldIdentityOrigin(f.db,f.guild,row,{mode:'private',actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id}),null);
  const changed=f.db.saveCityRecord(f.guild,{...row,key:row.record_key,data:{...row.data,aliases:['Forged Alias']}});
  assert.equal(worldIdentityOrigin(f.db,f.guild,changed,x.scope),null);
  f.restart();let sends=0;await deliverTurnOutbox(f.db,f.guild,out.attempt.turn_id,async()=>{sends++;return{messageId:'bad'};});
  assert.equal(sends,0);
  f.db.saveCityRecord(f.guild,{...row,key:row.record_key});
  f.db.upsertNpcProfile(f.guild,{npcKey:input.key,displayName:f.pcs[1].name,role:'porter'});
  assert.equal(worldIdentityOrigin(f.db,f.guild,f.db.getCityRecord(f.guild,'autonomous_entity',row.record_key),x.scope),null,
    'The original native identity cannot certify a later PC-name substitution.');
}));
test('W2 historical native identities are read-only; a new receipt cannot downgrade by dropping its origin',()=>nativeFixture(f=>{
  const x=setup(f),input=definition(),ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),
    row=f.db.transaction(()=>establishNarrativeEntity(f.db,f.guild,input,ctx,{content})),source=f.db.getWorldEvent(f.guild,row.source_event);
  const legacyData={...row.data},oldDetails={...source.details};delete legacyData.authorship_ref;
  delete oldDetails.authorship_origin;delete oldDetails.identity_definition;
  const legacy=f.db.saveCityRecord(f.guild,{...row,key:row.record_key,data:legacyData});
  f.db.db.prepare('UPDATE world_events SET details_json=? WHERE guild_id=? AND event_key=?').run(JSON.stringify(oldDetails),f.guild,source.event_key);
  assert.equal(worldIdentityOrigin(f.db,f.guild,legacy,x.scope),null,'version marker forbids a new receipt downgrade');
  delete oldDetails.authorship_version;
  f.db.db.prepare('UPDATE world_events SET details_json=? WHERE guild_id=? AND event_key=?').run(JSON.stringify(oldDetails),f.guild,source.event_key);
  assert.deepEqual(worldIdentityOrigin(f.db,f.guild,legacy,x.scope),{version:0,kind:'native_ai_gm',receipt:source.event_key,execution_authority:false});
  assert.throws(()=>establishNarrativeEntity(f.db,f.guild,input,{...ctx,...oldDetails,gm:true},{content}),/context|audience/i);
}));
test('W2 actual isolated GM stage establishes an audience-bound immutable origin, never combat statistics or PC choices',()=>nativeFixture(async f=>{
  const x=setup(f,{text:'I look for work.'}),input=definition(),before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  const result=await run(f,x,{fiction_delta:[input],narrative_units:[unit('offer','npc_speech','There is a sorting shift open if you are interested.',{subject_key:input.key})]});
  assert(result.rows.some(row=>row.payload.includes('sorting shift')));
  const row=f.db.getCityRecord(f.guild,'autonomous_entity','npc:'+input.key),event=f.db.getWorldEvent(f.guild,row.source_event);
  assert.equal(event.details.authorship_origin?.version,1);
  assert.equal(event.details.authorship_origin?.kind,'native_ai_gm');
  assert.equal(event.details.authorship_origin?.source_ref,x.sourceRef);
  assert.equal(event.details.authorship_origin?.identity_hash,sceneFictionHash(input));
  assert.equal(row.data.authorship_ref,event.event_key);
  assert.deepEqual(event.details.identity_definition,input);
  assert.equal(f.db.getCurrentEncounter(f.session.id),null);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
  assert(Object.values(f.db.getSimulationEntity(f.guild,'npc',input.key).state.resources).every(v=>v===0));
}));
