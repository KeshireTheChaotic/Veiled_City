import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB,createPlayerSettingsStore} from '../../src/frameworks/persistence/public.js';
import {handlePlayerSettingsCommand,assertPlayerSettingsStore} from '../../src/frameworks/discord/public.js';
import {connectDiscordPlayerSettings} from '../../src/framework-to-framework/discord--persistence/public.js';
const schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url)),VIEW=1024n,SEND=2048n,permissions=(...bits)=>({has:flag=>bits.includes(flag)});
function fixture(t,{unsafe=false,strings={},reader=null,replyError=null}={}){
  const dir=mkdtempSync(join(tmpdir(),'veiled-rf06-r18-')),db=new VeiledDB(join(dir,'synthetic.sqlite'),schema);db.ensureCampaign('guild');db.upsertPlayer('guild','owner','Mara');db.db.prepare("UPDATE campaigns SET gm_role_id='gm' WHERE guild_id='guild'").run();
  t.after(()=>{db.close();assert.equal(dirname(dir),resolve(tmpdir()));assert.ok(dir.startsWith(join(resolve(tmpdir()),'veiled-rf06-r18-')));rmSync(dir,{recursive:true,force:true});});
  const everyone={id:'everyone'},gm={id:'gm',name:'GM'},owner={id:'owner'},bot={id:'bot'},events=[],guild={id:'guild',roles:{everyone,cache:new Map([['everyone',everyone],['gm',gm]])},members:{me:bot,cache:new Map([['owner',owner],['bot',bot]])}},channel={id:'private',isTextBased:()=>true,permissionOverwrites:{cache:new Map()},permissionsFor:subject=>subject.id==='bot'?permissions(VIEW,SEND):['owner','gm'].includes(subject.id)||unsafe&&subject.id==='everyone'?permissions(VIEW):permissions(),toString:()=>'<private>'};
  const interaction={guildId:'guild',guild,channel,channelId:'private',user:{id:'owner'},options:{getString:name=>strings[name]??null,getBoolean:name=>reader},reply:async payload=>{events.push({payload,player:db.getPlayer('guild','owner')});if(replyError)throw replyError;}};
  return {db,interaction,events,store:connectDiscordPlayerSettings(db)};
}

test('narrow preference interface checks shape and preserves original receiver/result/error without raw DB exposure',()=>{
  assert.throws(()=>assertPlayerSettingsStore({}),TypeError);assert.throws(()=>createPlayerSettingsStore({}),TypeError);const result={},error=new Error('synthetic storage error');
  const db={getCampaign(guild){assert.equal(this,db);assert.equal(guild,'guild');return result;},setPrivateChannel(){throw error;},setAccessibility(){return result;}};
  const store=connectDiscordPlayerSettings(db);assert.ok(Object.isFrozen(store));assert.equal(store.db,undefined);assert.equal(assertPlayerSettingsStore(store),store);assert.equal(store.getCampaign('guild'),result);assert.throws(()=>store.setPrivateChannel(),actual=>actual===error);
});
test('native privacy validation precedes actual SQLite preferred-channel write and private response',async t=>{
  const f=fixture(t);assert.equal(await handlePlayerSettingsCommand(f.interaction,{sub:'private-channel',store:f.store}),true);
  assert.equal(f.db.getPlayer('guild','owner').private_channel_id,'private');assert.equal(f.events[0].player.private_channel_id,'private');assert.deepEqual(f.events[0].payload,{content:"This channel passed Veilkeeper's privacy validation and is now your preferred private GM channel.",ephemeral:true});
});
test('unsafe current channel is rejected without preference write or response',async t=>{
  const f=fixture(t,{unsafe:true}),before=f.db.getPlayer('guild','owner').private_channel_id;await assert.rejects(handlePlayerSettingsCommand(f.interaction,{sub:'private-channel',store:f.store}),error=>error.code==='UNSAFE_GM_CHANNEL');assert.equal(f.db.getPlayer('guild','owner').private_channel_id,before);assert.deepEqual(f.events,[]);
});
test('actual accessibility merge preserves legacy fields, explicit false and original response JSON',async t=>{
  const f=fixture(t,{strings:{length:'compact',mechanics:'inline'},reader:false});f.db.setAccessibility('guild','owner',{legacy_option:'preserved',screen_reader:true});
  assert.equal(await handlePlayerSettingsCommand(f.interaction,{sub:'accessibility',store:f.store}),true);
  const stored=JSON.parse(f.db.getPlayer('guild','owner').accessibility_json);assert.deepEqual(stored,{legacy_option:'preserved',screen_reader:false,response_length:'compact',mechanics:'inline'});assert.deepEqual(JSON.parse(f.events[0].player.accessibility_json),stored);assert.equal(f.events[0].payload.content,`Accessibility preferences: \`${JSON.stringify(stored)}\``);
});
test('null options preserve existing preferences and original missing-player error',async t=>{
  const f=fixture(t);f.db.setAccessibility('guild','owner',{screen_reader:true,response_length:'expanded'});await handlePlayerSettingsCommand(f.interaction,{sub:'accessibility',store:f.store});assert.deepEqual(JSON.parse(f.db.getPlayer('guild','owner').accessibility_json),{screen_reader:true,response_length:'expanded',mechanics:'standard'});
  f.interaction.user.id='missing';await assert.rejects(handlePlayerSettingsCommand(f.interaction,{sub:'accessibility',store:f.store}),{message:'Player not registered.'});assert.equal(f.events.length,1);
});
test('failed response preserves already-written original preference without retry',async t=>{
  const error=new Error('synthetic reply failure'),f=fixture(t,{reader:false,replyError:error});await assert.rejects(handlePlayerSettingsCommand(f.interaction,{sub:'accessibility',store:f.store}),actual=>actual===error);assert.equal(JSON.parse(f.db.getPlayer('guild','owner').accessibility_json).screen_reader,false);assert.equal(f.events.length,1);
});
test('unsupported player subcommand returns false without touching its store',async()=>{
  const store=new Proxy({},{get(){throw Error('Unexpected storage read');}});assert.equal(await handlePlayerSettingsCommand({}, {sub:'unknown',store}),false);
});
