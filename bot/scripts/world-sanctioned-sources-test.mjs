/** Sanctioned GM imports remain private seeds, never player-created world truth. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {handleCommand} from '../src/commands.js';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {narrativeSourceVisible} from '../src/scene-fiction-context.js';
import * as worldAuthorship from '../src/world-authorship.js';
import {setup,run,candidate,unit} from './narrative-fixtures.mjs';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {establishNarrativeEntity} from '../src/autonomous-world.js';
import {createPrivateSeedOrigin,bindPrivateSeedTurn,applyPrivateSeedTurn} from '../src/world-private-seeds.js';
import {applyAuthoritativeMutation,previewAuthoritativeMutation} from '../src/state.js';
import {renderWorldObservation} from '../src/frameworks/world/observation-reader.js';
const packet=pc=>({character_name:pc.name,hooks:[{key:'rival',title:'Private rival',premise:'A Copper Sparrow contact may seek the character.',permission:'open_question'}]});
let sequence=0;
function interaction(f){
  return {id:`sanctioned-import-${sequence++}`,guildId:f.guild,guild:{id:f.guild},user:{id:'gm',username:'gm'},memberPermissions:{has:()=>true},
    commandName:'vc-character',isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,
    options:{getSubcommandGroup:()=>null,getSubcommand:()=> 'import-gm-hooks',getAttachment:key=>key==='file'?{name:'hooks.json',url:'https://invalid.example/synthetic-hook'}:null,
      getString:key=>key==='character'?f.pcs[0].name:null},reply:async()=>{}};
}
async function commandImport(f,value=packet(f.pcs[0])){
  const original=globalThis.fetch;globalThis.fetch=async url=>{
    assert.equal(url,'https://invalid.example/synthetic-hook');return {ok:true,json:async()=>value};
  };
  try{await handleCommand(interaction(f),{db:f.db,gm:{}});}finally{globalThis.fetch=original;}
}
const context=f=>new GMService({db:f.db,content:new ContentIndex(path.resolve('../content')),ai:null,
  config:{gmModel:'offline',maxRecentMessages:2,maxContentChunks:1}}).buildContext(f.guild,f.pcs[0].owner_user_id,'Set the scene');
function seedContext(f,x){
  const seed=f.db.listCityRecords(f.guild,{kind:'world_authoring_seed',includeGM:true})[0];
  return worldAuthorship.createSeededWorldContext(f.db,f.guild,buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),seed.source_event);
}
const privateNpc=()=>({kind:'npc',key:'copper-sparrow-contact',name:'Copper Sparrow Contact',summary:'A private ordinary contact seeking a conversation.',
  aliases:[],role:'ordinary contact',location_key:'terminal',parent_location_key:''});

test('WD2A sanctioned hook materializes a bounded GM-private identity through the genuine native factory, never player disclosure',()=>nativeFixture(async f=>{
  const x=setup(f);await commandImport(f);const content=new ContentIndex(path.resolve('../content')),
    ctx=seedContext(f,x),row=establishNarrativeEntity(f.db,f.guild,privateNpc(),ctx,{content});
  assert.equal(row.visibility,'gm');assert.equal(row.subject_key,null);
  assert.equal(f.db.getWorldEvent(f.guild,row.source_event).details.authorship_origin.kind,'gm_private_hook');
  assert.equal(worldAuthorship.privateWorldIdentityForGm(f.db,f.guild,row)?.version,2);
  assert.equal(f.db.getSimulationEntity(f.guild,'npc',row.data.key).state.visibility,'gm');
  assert.equal(f.db.getNpcProfile(f.guild,row.data.key).activity_tier,'background');
  const observation=renderWorldObservation(f.db,f.guild,{target_type:'npc',target:row.data.key,observer:x.pc.id,operation:'appearance',
    scene:f.db.getWorldEvent(f.guild,x.sourceRef).scene,session:f.session.id},x.scope);
  assert.equal(observation.canSee,false,'GM-private seed presence must not become a visible actor merely through sceneAccess');
  assert(!observation.text.includes('Copper Sparrow'));
  assert.equal(f.db.getCurrentEncounter(f.session.id),null);
  for(const scope of [{mode:'party'},...f.pcs.map(pc=>({mode:'private',actorCharacterId:pc.id,actorUserId:pc.owner_user_id}))]){
    assert.equal(worldAuthorship.worldIdentityOrigin(f.db,f.guild,row,scope),null);
    assert.equal(narrativeSourceVisible(f.db,f.guild,row.source_event,scope),false);
  }
  assert.equal(establishNarrativeEntity(f.db,f.guild,privateNpc(),ctx,{content}).record_key,row.record_key);
  f.restart();assert.equal(establishNarrativeEntity(f.db,f.guild,privateNpc(),seedContext(f,x),{content}).record_key,row.record_key);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'autonomous_entity',includeGM:true}).length,1);
}));

test('WD2A hook creation requires both authentic GM seed and opaque current frame; labels and another owner cannot mint it',()=>nativeFixture(async f=>{
  const x=setup(f);await commandImport(f);const seed=f.db.listCityRecords(f.guild,{kind:'world_authoring_seed',includeGM:true})[0],
    frame=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),content=new ContentIndex(path.resolve('../content'));
  assert.throws(()=>worldAuthorship.createSeededWorldContext(f.db,f.guild,{...frame},seed.source_event));
  assert.throws(()=>worldAuthorship.createSeededWorldContext(f.db,f.guild,frame,'model:gm:true'));
  assert.throws(()=>establishNarrativeEntity(f.db,f.guild,privateNpc(),{...frame,private_seed:seed.data,gm:true},{content}));
  const own=f.db.getCharacter(f.pcs[1].id);f.db.db.prepare('UPDATE character_gm_hooks SET character_id=? WHERE id=?').run(own.id,seed.data.hook_id);
  assert.throws(()=>worldAuthorship.createSeededWorldContext(f.db,f.guild,frame,seed.source_event));
  assert.equal(f.db.listCityRecords(f.guild,{kind:'autonomous_entity',includeGM:true}).length,0);
}));

test('WD2A retracted private seed holds further use without erasing saved identities or PC outcomes',()=>nativeFixture(async f=>{
  const x=setup(f);await commandImport(f);const content=new ContentIndex(path.resolve('../content')),ctx=seedContext(f,x),
    row=establishNarrativeEntity(f.db,f.guild,privateNpc(),ctx,{content}),before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),
    seed=f.db.listCityRecords(f.guild,{kind:'world_authoring_seed',includeGM:true})[0];
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,seed.source_event);
  assert.equal(worldAuthorship.privateWorldIdentityForGm(f.db,f.guild,row),null);
  assert.throws(()=>establishNarrativeEntity(f.db,f.guild,{...privateNpc(),key:'another-contact'},ctx,{content}));
  assert.deepEqual(f.db.getCityRecord(f.guild,'autonomous_entity',row.record_key),row);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
}));

test('WD2A existing combined GM request materializes a hidden hook identity without another provider roundtrip or public disclosure',()=>nativeFixture(async f=>{
  const x=setup(f);await commandImport(f);const seed=f.db.listCityRecords(f.guild,{kind:'world_authoring_seed',includeGM:true})[0],r=candidate(x.text);
  r.private_world_seeds=[{seed_ref:seed.source_event,identity:privateNpc()}];
  const o=await run(f,x,{fiction_delta:[],narrative_units:[unit('scenery','scene','The parcel counter is quiet.')]},r);
  assert.equal(o.ai.requests.length,2,'Existing GM planner + existing narrative writer; no seed-only call');
  const request=o.ai.requests[0];assert(request.text.format.schema.required.includes('private_world_seeds'));
  assert(JSON.stringify(request.input).includes(seed.source_event));
  const row=f.db.getCityRecord(f.guild,'autonomous_entity','npc:copper-sparrow-contact');assert(row);assert.equal(row.visibility,'gm');
  assert(o.mutation.privateWorldSeeds.some(p=>p.status==='materialized_private_identity'));
  assert(!o.rows.some(p=>p.payload.includes('Copper Sparrow')));assert(o.rows.some(p=>p.payload.includes('parcel counter')));
  assert(!JSON.stringify(o.ai.requests[1].input).includes('Copper Sparrow Contact'));
}));

test('WD2A private seed stage holds unsupported siblings, preserves independent native fiction and cannot revive serialized capability',()=>nativeFixture(async f=>{
  const x=setup(f);await commandImport(f);const seed=f.db.listCityRecords(f.guild,{kind:'world_authoring_seed',includeGM:true})[0],
    origin=createPrivateSeedOrigin(f.db,f.guild,x.scope,x.sourceRef),result=bindPrivateSeedTurn({private_world_seeds:[
      {seed_ref:'model:gm:true',identity:privateNpc()},
      {seed_ref:seed.source_event,identity:{...privateNpc(),key:'armed-contact',hp:20}},
      {seed_ref:seed.source_event,identity:privateNpc()}]},origin),content=new ContentIndex(path.resolve('../content'));
  assert.throws(()=>applyPrivateSeedTurn(f.db,f.guild,structuredClone(result),{content}));
  const rows=applyPrivateSeedTurn(f.db,f.guild,result,{content});
  assert.deepEqual(rows.map(row=>row.status),['needs_review','needs_review','materialized_private_identity']);
  assert(f.db.listCityRecords(f.guild,{kind:'world_private_seed_review',includeGM:true}).every(row=>row.visibility==='gm'));
  assert.equal(f.db.getNpcProfile(f.guild,'armed-contact'),null);assert.equal(f.db.listCombatants('not-an-encounter').length,0);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'autonomous_entity',includeGM:true}).length,1);
  assert.deepEqual(applyPrivateSeedTurn(f.db,f.guild,result,{content}),rows);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'world_private_seed_review',includeGM:true}).length,2);
}));

test('WD2A source-stale and disabled authoring preserve private review, not identity invention or PC changes',()=>nativeFixture(async f=>{
  const x=setup(f);await commandImport(f);const seed=f.db.listCityRecords(f.guild,{kind:'world_authoring_seed',includeGM:true})[0],
    result=bindPrivateSeedTurn({private_world_seeds:[{seed_ref:seed.source_event,identity:privateNpc()}]},createPrivateSeedOrigin(f.db,f.guild,x.scope,x.sourceRef)),
    content=new ContentIndex(path.resolve('../content')),before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  f.db.setCityCalendar(f.guild,{flags:{narrative_authority:false}});
  assert.equal(applyPrivateSeedTurn(f.db,f.guild,result,{content})[0].status,'needs_review');
  f.db.setCityCalendar(f.guild,{flags:{narrative_authority:true}});
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,seed.source_event);
  assert.equal(applyPrivateSeedTurn(f.db,f.guild,result,{content})[0].status,'needs_review');
  assert.equal(f.db.listCityRecords(f.guild,{kind:'autonomous_entity',includeGM:true}).length,0);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
}));

test('WD2A private seed preview rolls back its identity; final commit is once-only and independent public fiction survives',()=>nativeFixture(async f=>{
  const x=setup(f);await commandImport(f);const seed=f.db.listCityRecords(f.guild,{kind:'world_authoring_seed',includeGM:true})[0],
    narrative=bindPrivateSeedTurn({...candidate(x.text),private_world_seeds:[{seed_ref:seed.source_event,identity:privateNpc()}]},
      createPrivateSeedOrigin(f.db,f.guild,x.scope,x.sourceRef)),content=new ContentIndex(path.resolve('../content')),
    args={guildId:f.guild,sessionId:f.session.id,narrative,scope:x.scope,provenance:{messageId:x.messageId},content};
  previewAuthoritativeMutation(f.db,args);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'autonomous_entity',includeGM:true}).length,0);
  applyAuthoritativeMutation(f.db,args);applyAuthoritativeMutation(f.db,args);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'autonomous_entity',includeGM:true}).length,1);
  assert.equal(f.db.listNpcProfiles(f.guild).filter(p=>p.npc_key==='copper-sparrow-contact').length,1);
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).filter(e=>e.kind==='native_narrative_entity').length,1);
}));

test('WD2A neither an unrelated sanctioned hook nor its private materialization can launder the player named identity',()=>nativeFixture(async f=>{
  const x=setup(f,{text:'My Copper Sparrow Contact is here.'});await commandImport(f);
  assert.throws(()=>establishNarrativeEntity(f.db,f.guild,privateNpc(),seedContext(f,x),{content:new ContentIndex(path.resolve('../content'))}),/owner_named_identity/);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'autonomous_entity',includeGM:true}).length,0);
}));

test('WD2A private hook location, local NPC and background identities share native provenance without public topology or actor powers',()=>nativeFixture(async f=>{
  const x=setup(f);await commandImport(f);const seed=f.db.listCityRecords(f.guild,{kind:'world_authoring_seed',includeGM:true})[0],
    frame=buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef),content=new ContentIndex(path.resolve('../content')),
    ctx=worldAuthorship.createSeededWorldContext(f.db,f.guild,frame,seed.source_event),
    location={...privateNpc(),kind:'location',key:'sparrow-office',name:'Sparrow Office',role:'small office',location_key:'',parent_location_key:'terminal'};
  const place=establishNarrativeEntity(f.db,f.guild,location,ctx,{content});assert.equal(place.visibility,'gm');
  const npc=establishNarrativeEntity(f.db,f.guild,{...privateNpc(),location_key:location.key},ctx,{content});assert.equal(npc.location_key,location.key);
  for(const kind of ['faction','organization','district']){
    const row=establishNarrativeEntity(f.db,f.guild,{...privateNpc(),kind,key:`hidden-${kind}`,name:`Hidden ${kind}`,location_key:'',role:''},ctx,{content});
    assert.equal(row.visibility,'gm');assert.equal(row.data.identity_layer,'background_only');
    assert.equal(worldAuthorship.privateWorldIdentityForGm(f.db,f.guild,row)?.version,2);
    assert.equal(f.db.getSimulationEntity(f.guild,kind,row.data.key),null);
  }
  assert.equal(buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef).packet.background_identities.length,0);
  assert.equal(buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef).packet.npcs.length,0);
  assert.equal(f.db.getCharacter(f.pcs[0].id).data.location,'terminal');
}));
async function nativeCommand(f,group,sub,values){
  const i=interaction(f);i.commandName=`vc-${group}`;
  i.options={getSubcommandGroup:()=>null,getSubcommand:()=>sub,getString:key=>values[key]??null,
    getInteger:key=>values[key]??null,getBoolean:()=>null};
  await handleCommand(i,{db:f.db,gm:{}});
}
test('WD2A authentic GM hook command creates an immutable private seed receipt, not an active actor or public fact',()=>nativeFixture(async f=>{
  await commandImport(f);
  const rows=f.db.listCityRecords(f.guild,{kind:'world_authoring_seed',includeGM:true});assert.equal(rows.length,1);
  assert.equal(rows[0].visibility,'gm');assert.equal(rows[0].data.origin,'gm_private_hook');
  assert.equal(rows[0].data.execution_authority,false);assert.equal(rows[0].data.publication_authority,false);
  for(const pc of f.pcs)assert.equal(narrativeSourceVisible(f.db,f.guild,rows[0].source_event,
    {mode:'private',actorUserId:pc.owner_user_id,actorCharacterId:pc.id}),false);
  assert.equal(narrativeSourceVisible(f.db,f.guild,rows[0].source_event,{mode:'party'}),false);
  const h=context(f).gm_character_hooks[0];assert.equal(h.authorship.status,'verified_private_seed');
  assert.equal(h.authorship.source_ref,rows[0].source_event);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'autonomous_entity',includeGM:true}).length,0);
  assert.equal(f.db.listSimulationEntities(f.guild,'faction').length,0);assert.equal(f.db.listCanon(f.guild,{includeGM:true}).length,0);
}));
test('WD2A imported source labels and owner gm:true fields cannot authenticate a GM seed',()=>nativeFixture(f=>{
  const value=packet(f.pcs[0]);value.hooks[0].source='human_gm';value.hooks[0].gm=true;
  f.db.importCharacterGmHooks(f.guild,f.pcs[0],value);
  const h=context(f).gm_character_hooks[0];assert.equal(h.authorship.status,'legacy_unverified_proposal');
  assert.equal(h.authorship.source_ref,null);assert.equal(h.authorship.execution_authority,false);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'world_authoring_seed',includeGM:true}).length,0);
}));
test('WD2A reimport certifies the exact new hook revision without rewriting its old native receipt',()=>nativeFixture(async f=>{
  await commandImport(f);const old=f.db.listCityRecords(f.guild,{kind:'world_authoring_seed',includeGM:true})[0];assert(old);
  const value=packet(f.pcs[0]);value.hooks[0].premise='A different private premise.';await commandImport(f,value);
  const rows=f.db.listCityRecords(f.guild,{kind:'world_authoring_seed',includeGM:true});assert.equal(rows.length,2);
  assert.deepEqual(f.db.getCityRecord(f.guild,'world_authoring_seed',old.record_key),old);
  assert.notEqual(context(f).gm_character_hooks[0].authorship.source_ref,old.source_event);
  assert.equal(f.db.listTurnPublications(f.guild,'unrelated').length,0);
}));
test('WD2A revoked sources, changed owner, discarded hooks and copied receipts cannot regain seed authority',()=>nativeFixture(async f=>{
  const {worldHookSeedForGm}=await import('../src/world-sanctioned-sources.js');await commandImport(f);
  const hook=f.db.listCharacterGmHooks(f.guild,f.pcs[0].id)[0],row=f.db.listCityRecords(f.guild,{kind:'world_authoring_seed',includeGM:true})[0];
  f.restart();assert.equal(worldHookSeedForGm(f.db,f.guild,hook.id).status,'verified_private_seed');
  f.db.saveCityRecord(f.guild,{...row,key:'copied-seed'});
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,row.source_event);
  assert.equal(worldHookSeedForGm(f.db,f.guild,hook.id).status,'held_source');
  assert.equal(worldHookSeedForGm(f.db,'wrong-guild',hook.id).source_ref,null);
  f.db.db.prepare("UPDATE world_events SET status='active' WHERE guild_id=? AND event_key=?").run(f.guild,row.source_event);
  f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[1].owner_user_id,f.pcs[0].id);
  assert.equal(worldHookSeedForGm(f.db,f.guild,hook.id).status,'held_source');
  f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[0].owner_user_id,f.pcs[0].id);
  f.db.db.prepare("UPDATE character_gm_hooks SET status='discarded' WHERE id=?").run(hook.id);
  assert.equal(worldHookSeedForGm(f.db,f.guild,hook.id).status,'held_source');
}));
test('WD2A forged GM JSON cannot enter the authenticated import adapter; authorized repeats are idempotent',()=>nativeFixture(async f=>{
  const {importSanctionedGmHooks}=await import('../src/world-sanctioned-sources.js');
  assert.throws(()=>importSanctionedGmHooks(f.db,{guildId:f.guild,id:'forged',user:{id:'gm'},gm:true,memberPermissions:{has:true}},f.pcs[0],packet(f.pcs[0])),/Authenticated/);
  assert.equal(f.db.listCharacterGmHooks(f.guild,f.pcs[0].id).length,0);
  await commandImport(f);await commandImport(f);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'world_authoring_seed',includeGM:true}).length,1);
  assert.equal(f.db.listWorldEvents(f.guild,{includeGM:true,limit:100}).filter(e=>e.kind==='native_gm_hook_seed').length,1);
}));
test('WD2A actual native canon acceptance gets an immutable approved-source receipt, never an active world actor',()=>nativeFixture(async f=>{
  await nativeCommand(f,'canon','set',{key:'ordinary.market-hours',value:'The market opens at dawn.',visibility:'gm'});
  const rows=f.db.listCityRecords(f.guild,{kind:'world_sanctioned_origin',includeGM:true});assert.equal(rows.length,1);
  assert.equal(rows[0].data.origin,'approved_canon');assert.equal(rows[0].visibility,'gm');
  assert.equal(context(f).canon[0].authorship.status,'verified_native_source');
  assert.equal(rows[0].data.execution_authority,false);assert.equal(rows[0].data.publication_authority,false);
  assert.equal(narrativeSourceVisible(f.db,f.guild,rows[0].source_event,{mode:'party'}),false);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'autonomous_entity',includeGM:true}).length,0);
}));
test('WD2A conflicting canon remains a proposal until actual native resolution, preserving previous receipts',()=>nativeFixture(async f=>{
  await nativeCommand(f,'canon','set',{key:'ordinary.market-hours',value:'Dawn.',visibility:'party'});
  const before=f.db.listCityRecords(f.guild,{kind:'world_sanctioned_origin',includeGM:true})[0];assert(before);
  await nativeCommand(f,'canon','set',{key:'ordinary.market-hours',value:'Dusk.',visibility:'party'});
  assert.equal(f.db.listCityRecords(f.guild,{kind:'world_sanctioned_origin',includeGM:true}).length,1);
  assert.equal(f.db.currentCanon(f.guild,'ordinary.market-hours').value,'Dawn.');
  const conflict=f.db.listCanonConflicts(f.guild)[0];await nativeCommand(f,'canon','resolve',{conflict_id:conflict.id,resolution:'proposed'});
  assert.equal(f.db.listCityRecords(f.guild,{kind:'world_sanctioned_origin',includeGM:true}).length,2);
  assert.equal(context(f).canon[0].authorship.status,'verified_native_source');
  assert.equal(f.db.currentCanon(f.guild,'ordinary.market-hours').value,'Dusk.');
  assert.deepEqual(f.db.getCityRecord(f.guild,'world_sanctioned_origin',before.record_key),before);
}));
test('WD2A native GM relationship review certifies only the scoped directional edge, not emotions, agency or a phantom NPC',()=>nativeFixture(async f=>{
  const before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  await nativeCommand(f,'relationship','set',{from_type:'character',from:f.pcs[0].name,to_type:'entity',to:'Mara',relation:'family',score:1,visibility:'gm',note:'A reviewed backstory connection.'});
  const rows=f.db.listCityRecords(f.guild,{kind:'world_sanctioned_origin',includeGM:true});assert.equal(rows.length,1);
  assert.equal(rows[0].data.origin,'authorized_relationship');assert.equal(rows[0].data.effect_scope,'directional_connection_only');
  assert.equal(context(f).gm_relationships.graph[0].authorship.status,'verified_native_source');
  assert.equal(f.db.getNpcProfile(f.guild,'mara'),null);assert.equal(f.db.listSimulationEntities(f.guild,'npc').length,0);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
  assert.equal(rows[0].data.execution_authority,false);assert.equal(rows[0].data.publication_authority,false);
}));
test('WD2A legacy human_gm labels alone do not certify fresh canon or relationship provenance',()=>nativeFixture(f=>{
  f.db.proposeCanon(f.guild,{key:'legacy.setting',value:'An old native entry.',sourceType:'human_gm',sourceId:'gm'});
  f.db.upsertRelationship(f.guild,{fromType:'character',fromKey:f.pcs[0].id,toType:'entity',toKey:'legacy-target',source:'human_gm'});
  const ctx=context(f);assert.equal(ctx.canon[0].authorship.status,'legacy_unverified_source');
  assert.equal(ctx.gm_relationships.graph[0].authorship.status,'legacy_unverified_source');
  assert.equal(f.db.listCityRecords(f.guild,{kind:'world_sanctioned_origin',includeGM:true}).length,0);
}));
test('WD2A approved imported canon uses its actual native acceptance; later source retraction does not erase the saved outcome',()=>nativeFixture(async f=>{
  const value=packet(f.pcs[0]);value.canon_suggestions=[{key:'ordinary.private-premise',value:'The archive opens at dusk.',visibility:'gm'}];
  await commandImport(f,value);const proposal=f.db.listCanonProposals(f.guild,{status:'pending'})[0];
  assert.equal(f.db.currentCanon(f.guild,proposal.canon_key),undefined);
  await nativeCommand(f,'canon','proposal-resolve',{proposal_id:proposal.id,resolution:'accept'});
  const saved=f.db.currentCanon(f.guild,proposal.canon_key),row=f.db.listCityRecords(f.guild,{kind:'world_sanctioned_origin',includeGM:true})[0];assert(row);
  const seed=f.db.listCityRecords(f.guild,{kind:'world_authoring_seed',includeGM:true})[0];
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,seed.source_event);f.restart();
  assert.deepEqual(f.db.currentCanon(f.guild,proposal.canon_key),saved);
  assert.equal(context(f).canon[0].authorship.status,'verified_native_source');
  assert.equal(narrativeSourceVisible(f.db,f.guild,row.source_event,{mode:'party'}),false);
}));
test('WD2A accepted source readers reject copied/revoked proof and changed PC ownership without rewriting relationship history',()=>nativeFixture(async f=>{
  await nativeCommand(f,'relationship','set',{from_type:'character',from:f.pcs[0].name,to_type:'entity',to:'Mara',relation:'family',score:1,visibility:'gm'});
  const row=f.db.listCityRecords(f.guild,{kind:'world_sanctioned_origin',includeGM:true})[0],edge=f.db.listRelationships(f.guild,{includeGM:true})[0];
  f.db.saveCityRecord(f.guild,{...row,key:'copied-origin'});f.restart();
  assert.equal(context(f).gm_relationships.graph[0].authorship.status,'verified_native_source');
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,row.source_event);
  assert.equal(context(f).gm_relationships.graph[0].authorship.status,'held_source');
  f.db.db.prepare("UPDATE world_events SET status='active' WHERE guild_id=? AND event_key=?").run(f.guild,row.source_event);
  f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[1].owner_user_id,f.pcs[0].id);
  const {worldRecordOriginForGm,sanctionedWorldMutation}=await import('../src/world-sanctioned-sources.js');
  assert.equal(worldRecordOriginForGm(f.db,f.guild,'relationship',edge.id).status,'held_source');
  assert.deepEqual(f.db.getRelationship(edge.id),edge);
  let invoked=false;assert.throws(()=>sanctionedWorldMutation(f.db,interaction(f),true,'relationship',()=>{invoked=true;}),/Authenticated/);
  assert.equal(invoked,false);
}));
