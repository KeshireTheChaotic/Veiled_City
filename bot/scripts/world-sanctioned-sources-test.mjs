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
