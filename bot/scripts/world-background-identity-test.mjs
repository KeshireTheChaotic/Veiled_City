/** W2 background identities use the existing native GM issuer, not actor stats or player assertions. */
import test from 'node:test';
import {narrativeResponseSchema} from '../src/gm-fiction-schema.js';
import {narrativeResponseV9Schema} from '../src/narrative-writer-v9.js';

import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,run,unit} from './narrative-fixtures.mjs';
import {ContentIndex} from '../src/content.js';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {establishNarrativeEntity} from '../src/autonomous-world.js';
import {worldIdentityOrigin} from '../src/world-authorship.js';
import {createArbitrationOrigin,buildSceneIntentBoard} from '../src/scene-intent-board.js';
test('current background authoring preserves the frozen historical v8 schema',()=>{
  assert.deepEqual(narrativeResponseSchema.properties.fiction_delta.items.properties.kind.enum,['location','npc']);
  assert.deepEqual(narrativeResponseV9Schema.properties.fiction_delta.items.properties.kind.enum,
    ['location','npc','faction','organization','district']);
  assert.notEqual(narrativeResponseSchema.properties.fiction_delta,narrativeResponseV9Schema.properties.fiction_delta);
});
const content=new ContentIndex(path.resolve('../content'));
const definition=kind=>({kind,key:`copper-sparrow-${kind}`,name:'Copper Sparrow',summary:'A small ordinary local community identity.',
  aliases:['Sparrow Fellowship'],role:'local community',location_key:'',parent_location_key:''});
for(const kind of ['faction','organization','district'])test(`W2 native provisional ${kind} has immutable identity, no active actor powers or geography`,()=>nativeFixture(f=>{
  const x=setup(f),input=definition(kind),ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),
    created=establishNarrativeEntity(f.db,f.guild,input,ctx,{content});
  assert.equal(created.data.identity_layer,'background_only');
  assert.equal(worldIdentityOrigin(f.db,f.guild,created,x.scope).version,1);
  assert.equal(f.db.getSimulationEntity(f.guild,'faction',input.key),null);
  assert.equal(f.db.getSimulationEntity(f.guild,'location',input.key),null);
  assert.equal(f.db.getCityRecord(f.guild,'institution',input.key),null);
  assert.equal(f.db.getCityRecord(f.guild,'district',input.key),null,'No district indices, jurisdiction or map connectivity');
  assert.equal(f.db.getNpcProfile(f.guild,input.key),null);
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true}});
  const origin=createArbitrationOrigin(f.db,f.guild,x.scope,x.sourceRef);
  assert.throws(()=>buildSceneIntentBoard(f.db,f.guild,origin,[],[{actor_key:input.key,operation:'prepare',target_refs:[],objective_ref:'',source_refs:[],dependencies:[]}]),
    /npc_current_local_control/,'A background name cannot act as a native NPC');
  f.restart();
  assert.equal(establishNarrativeEntity(f.db,f.guild,input,buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),{content}).source_event,created.source_event);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
}));
test('W2 actual isolated writer establishes and recalls bounded background identities within its existing request budget',()=>nativeFixture(async f=>{
  const x=setup(f),out=await run(f,x,{fiction_delta:[definition('organization')],narrative_units:[unit('scene','scene','A copper-colored pennant hangs above the sorting desk.')]});
  assert(out.rows.some(row=>row.payload.includes('pennant')));assert.equal(out.ai.requests.length,2);
  const next=setup(f,{messageId:'background-recall'}),packet=buildNarrativeContext(f.db,f.guild,next.scope,next.sourceRef).packet;
  assert.equal(packet.background_identities.length,1);
  assert.equal(packet.background_identities[0].name,'Copper Sparrow');
  assert.equal(packet.background_identities[0].authority,'identity_only_not_knowledge_resources_or_control');
}));
test('W2 private background provenance never enters another recipient or party packet, including restart',()=>nativeFixture(f=>{
  const x=setup(f,{privateScene:true}),created=establishNarrativeEntity(f.db,f.guild,definition('faction'),buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),{content});
  f.restart();const other=setup(f,{messageId:'party-background-reader'});
  assert.equal(worldIdentityOrigin(f.db,f.guild,created,other.scope),null);
  assert.deepEqual(buildNarrativeContext(f.db,f.guild,other.scope,other.sourceRef).packet.background_identities,[]);
  assert.equal(worldIdentityOrigin(f.db,f.guild,created,{mode:'private',actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id}),null);
}));
test('W2 background creation rejects packaged protected identity and forged powers or topology',()=>nativeFixture(f=>{
  const x=setup(f),ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef);
  assert.throws(()=>establishNarrativeEntity(f.db,f.guild,{...definition('faction'),name:'The Concord'},ctx,{content}),/protected|existing|canon/i);
  assert.throws(()=>establishNarrativeEntity(f.db,f.guild,{...definition('organization'),resources:{influence:10}},ctx,{content}),/bounded|identity|fields/i);
  assert.throws(()=>establishNarrativeEntity(f.db,f.guild,{...definition('district'),parent_location_key:'terminal'},ctx,{content}),/geography|identity.only|background/i);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'autonomous_entity',includeGM:true}).length,0);
}));
test('W2 a private imported profile without simulation cannot be replaced by a background organization',()=>nativeFixture(f=>{
  const x=setup(f),ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef);
  f.db.upsertNpcProfile(f.guild,{npcKey:'existing-profile-only',displayName:'Copper Sparrow',role:'private native fixture'});
  f.db.upsertReference(f.guild,{kind:'npc',key:'existing-profile-only',name:'Copper Sparrow',summary:'Private imported profile.',visibility:'gm'});
  assert.throws(()=>establishNarrativeEntity(f.db,f.guild,definition('organization'),ctx,{content}),/protected|existing|identity/i);
  assert.equal(f.db.getCityRecord(f.guild,'autonomous_entity','organization:copper-sparrow-organization'),null);
}));
test('W2 protected civic identities beyond the city-record first page cannot be shadowed',()=>nativeFixture(f=>{
  const x=setup(f),ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef);
  f.db.transaction(()=>{
    f.db.saveCityRecord(f.guild,{kind:'organization',key:'old-private-organization',visibility:'gm',source_event:x.sourceRef,data:{name:'Copper Sparrow'}});
    for(let i=0;i<100;i++)f.db.saveCityRecord(f.guild,{kind:'organization',key:`newer-${i}`,visibility:'gm',source_event:x.sourceRef,data:{name:`Other Organization ${i}`}});
  });
  assert.throws(()=>establishNarrativeEntity(f.db,f.guild,definition('organization'),ctx,{content}),/protected|existing|identity/i);
}));
test('W2 older entitled background identities remain retrievable beyond one hundred unrelated records',()=>nativeFixture(f=>{
  const x=setup(f),ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef);
  establishNarrativeEntity(f.db,f.guild,definition('district'),ctx,{content});
  f.db.transaction(()=>{for(let i=0;i<100;i++)f.db.saveCityRecord(f.guild,{kind:'autonomous_entity',key:`unrelated:${i}`,visibility:'party',source_event:x.sourceRef,
    data:{kind:'unrelated_fixture',key:`unrelated-${i}`,name:`Unrelated ${i}`}});});
  assert.equal(buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef).packet.background_identities.length,1);
}));
test('W2 profile collision beyond five hundred does not shadow a private NPC or globally freeze independent invention',()=>nativeFixture(f=>{
  const x=setup(f),ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef);
  f.db.transaction(()=>{
    for(let i=0;i<500;i++)f.db.upsertNpcProfile(f.guild,{npcKey:`filler-${i}`,displayName:`A Profile ${String(i).padStart(3,'0')}`,role:'fixture'});
    f.db.upsertNpcProfile(f.guild,{npcKey:'last-private-profile',displayName:'Zzz Copper Sparrow',role:'private fixture'});
  });
  assert.throws(()=>establishNarrativeEntity(f.db,f.guild,{...definition('faction'),name:'Zzz Copper Sparrow'},ctx,{content}),/protected|existing|identity/i);
  assert.equal(establishNarrativeEntity(f.db,f.guild,{...definition('faction'),name:'Independent Silver Kite'},ctx,{content}).data.name,'Independent Silver Kite');
}));
