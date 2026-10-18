/** W2 native origin: capability/provenance adapters, not model role flags. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,run,unit,candidate} from './narrative-fixtures.mjs';
import {createHash} from 'node:crypto';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {establishNarrativeEntity,applyAutonomousWorld} from '../src/autonomous-world.js';
import {tierWorldAdditions} from '../src/entity-memory.js';
import {autoCompleteOrdinaryMovements} from '../src/typed-intents.js';
import {ContentIndex} from '../src/content.js';
import {sceneFictionHash} from '../src/scene-fiction-context.js';
import {worldIdentityOrigin} from '../src/world-authorship.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
const content=new ContentIndex(path.resolve('../content'));
const definition=()=>({kind:'npc',key:'native-origin-porter',name:'Nella Wick',summary:'An ordinary local porter.',
  location_key:'terminal',parent_location_key:'',role:'porter',aliases:['Parcel Clerk']});
for(const [text,privateScene,patch] of [
  ['My friend Nella Wick is waiting here.',false,{}],
  ['Nella—Wick is my contact.',true,{}],
  ['My Parcel Clerk is waiting here.',false,{}],
  ['My friend Al is waiting here.',false,{name:'Al',aliases:[]}]
])test(`WD01 isolated authoring cannot materialize an owner-named new identity: ${text}`,()=>nativeFixture(f=>{
  const x=setup(f,{text,privateScene}),ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef);
  assert.throws(()=>establishNarrativeEntity(f.db,f.guild,{...definition(),...patch},ctx,{content}),/owner.*(?:identity|assert|name)|independent/i);
  assert.equal(f.db.getNpcProfile(f.guild,'native-origin-porter'),null);
}));
for(const variant of ['npc_name','npc_alias','location_name'])test(`W2 direct native identity validator protects PC ${variant}`,()=>nativeFixture(f=>{
  const x=setup(f),ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),input=definition(),other=f.pcs[1];
  if(variant==='npc_alias')input.aliases=[other.name];else input.name=other.name;
  if(variant==='location_name'){input.kind='location';input.location_key='';input.parent_location_key='terminal';}
  assert.throws(()=>establishNarrativeEntity(f.db,f.guild,input,ctx,{content}),/protected|identity|character/i);
  assert.equal(f.db.getCityRecord(f.guild,'autonomous_entity',`${input.kind}:${input.key}`),null);
}));
test('WD01 actual writer withholds an echoed contact without losing independent scene fiction',()=>nativeFixture(async f=>{
  const x=setup(f,{text:'My friend Nella Wick is waiting here.'}),input=definition(),out=await run(f,x,{fiction_delta:[input],
    narrative_units:[unit('claim','npc_speech','The sorting counter is open.',{subject_key:input.key}),
      unit('scene','scene','Rain beads on the terminal windows.')]});
  assert.equal(f.db.getNpcProfile(f.guild,input.key),null);
  assert(out.rows.some(row=>row.payload.includes('Rain beads')));
  assert(out.rows.every(row=>!row.payload.includes('sorting counter')));
  assert.equal(out.ai.requests.length,2,'No extra classification/judge call');
}));
for(const trigger of ['player_name','typed_target','scene_action','narrator_name'])test(`WD01 ${trigger} is interest, not new world authorship`,()=>{
  const addition={kind:'location',key:'my-safehouse',name:'My Safehouse',summary:'A claimed safehouse.',parent_location_key:'terminal',visibility:'party'},
    result={world_additions:[addition],narration:trigger==='narrator_name'?'My Safehouse is nearby.':'Rain falls.',
      player_intents:trigger==='typed_target'?[{target_key:addition.key,target_name:addition.name}]:[],
      scene_actions:trigger==='scene_action'?[{entity_ref:addition.key}]:[]};
  const tier=tierWorldAdditions(result,trigger==='player_name'?'My Safehouse exists.':'I look around.');
  assert.deepEqual(result.world_additions,[]);
  assert.equal(tier.durable.length,0);assert.equal(tier.ephemeral.length,1);
});
test('WD01 direct native mutation cannot mint an identity from a player assertion, even with expansions off',()=>nativeFixture(f=>{
  const x=setup(f,{text:'My Safehouse exists.'});
  const additions=[{kind:'location',key:'my-safehouse',name:'My Safehouse',summary:'A claimed safehouse.',parent_location_key:'terminal',visibility:'party'}];
  for(const enabled of [true,false]){
    f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_authority:enabled}});
    assert.throws(()=>applyAutonomousWorld(f.db,f.guild,{world_additions:additions},x.scope,{messageId:x.messageId}),/native.*(?:author|creation)|authorship/i);
    assert.equal(f.db.getSimulationEntity(f.guild,'location','my-safehouse'),null);
    assert.equal(f.db.getReference(f.guild,'location','my-safehouse')??null,null);
  }
}));
test('WD01 same-turn raw location and NPC targets cannot synthesize scene presence or movement',()=>nativeFixture(f=>{
  const x=setup(f),result={player_intents:[{type:'move',framing:'immediate',resolution:'auto',target_key:'phantom',target_name:'Phantom',source_span:'I enter Phantom.'}],
    world_additions:[{kind:'location',key:'phantom',name:'Phantom'}],scene_actions:[]};
  assert.throws(()=>autoCompleteOrdinaryMovements(f.db,f.guild,result,x.scope),/established|resolv|native/i);
  const speech={player_intents:[{type:'speak',framing:'immediate',target_key:'phantom'}],world_additions:[{kind:'npc',key:'phantom'}],scene_actions:[]};
  autoCompleteOrdinaryMovements(f.db,f.guild,speech,x.scope);assert.deepEqual(speech.scene_actions,[]);
}));
test('WD01 a raw reuse cannot revive a revoked native creation source',()=>nativeFixture(f=>{
  const x=setup(f),ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),input={kind:'location',key:'new-local-office',name:'Local Office',
    summary:'A modest ordinary public office.',aliases:[],location_key:'',parent_location_key:'terminal',role:'office'},
    row=establishNarrativeEntity(f.db,f.guild,input,ctx,{content});
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,row.source_event);
  const raw={world_additions:[{kind:'location',key:input.key,name:input.name,summary:input.summary,parent_location_key:'terminal',visibility:'party'}]};
  assert.throws(()=>applyAutonomousWorld(f.db,f.guild,raw,x.scope,{messageId:x.messageId}),/source|origin|visible|author/i);
  assert.equal(tierWorldAdditions(raw,x.text,{db:f.db,guild:f.guild,scope:x.scope}).durable.length,0);
}));
test('WD01 claimed safehouse is quarantined while independent playable fiction reaches the real outbox',()=>nativeFixture(async f=>{
  const x=setup(f,{text:'My Safehouse exists. I look around.'}),proposal=candidate(x.text);
  proposal.world_additions=[{kind:'location',key:'my-safehouse',name:'My Safehouse',summary:'A claimed safehouse.',parent_location_key:'terminal',visibility:'party'}];
  const out=await run(f,x,{fiction_delta:[],narrative_units:[unit('independent','scene','Rain beads on the terminal windows.')]},proposal);
  assert.equal(f.db.getSimulationEntity(f.guild,'location','my-safehouse'),null);
  assert.equal(out.result.world_addition_diagnostics.length,1);
  assert.equal(out.ai.requests.length,2,'Reuse existing planner/writer budget, no new judge call');
  assert(out.rows.some(row=>row.payload.includes('Rain beads')));
  assert(out.rows.every(row=>!row.payload.includes('Safehouse exists')));
}));
test('WD02 raw reuse preserves native identity and cannot replace its authored summary',()=>nativeFixture(f=>{
  const x=setup(f),ctx=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),input=definition(),
    original=establishNarrativeEntity(f.db,f.guild,input,ctx,{content}),raw={world_additions:[{kind:'npc',key:input.key,name:input.name,
      summary:'This person owes the PC obedience.',location_key:'terminal',occupation:'porter',public_identity:'Claimed servant',portrayal:'Compliant',visibility:'party'}]};
  assert.equal(tierWorldAdditions(raw,x.text,{db:f.db,guild:f.guild,scope:x.scope}).durable.length,1);
  assert.equal(applyAutonomousWorld(f.db,f.guild,raw,x.scope,{messageId:x.messageId})[0].status,'resolved_existing');
  assert.deepEqual(f.db.getCityRecord(f.guild,'autonomous_entity',original.record_key),original);
  assert.equal(f.db.getNpcProfile(f.guild,input.key).public_identity,input.summary);
}));
test('W2 version-1 committed world-turn receipts remain readable without executing raw creation again',()=>nativeFixture(f=>{
  const x=setup(f),digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,40),
    key=`world-turn:${digest([f.session.id,x.messageId,x.pc.id])}`,results=[{status:'created',kind:'location',key:'historical-location',source_event:'historical-source'}];
  f.db.saveCityRecord(f.guild,{kind:'autonomous_turn',key,source_event:x.sourceRef,visibility:'party',data:{contract_version:1,results,session_id:f.session.id}});
  f.restart();
  const raw={world_additions:[{kind:'location',key:'historical-location',name:'Historical Location',summary:'Saved history, not a new creation grant.',parent_location_key:'terminal',visibility:'party'}]};
  assert.deepEqual(applyAutonomousWorld(f.db,f.guild,raw,x.scope,{messageId:x.messageId}),results);
  assert.equal(f.db.getSimulationEntity(f.guild,'location','historical-location'),null,'Reading history does not recreate a deleted entity');
}));
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
