/** Sanctioned GM imports remain private seeds, never player-created world truth. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {handleCommand} from '../src/commands.js';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {narrativeSourceVisible} from '../src/scene-fiction-context.js';
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
