import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB,createCampaignConfigurationStore} from '../../src/frameworks/persistence/public.js';
import {handleCampaignSetupCommand,assertCampaignConfigurationStore} from '../../src/frameworks/discord/public.js';
import {connectDiscordCampaignConfiguration} from '../../src/framework-to-framework/discord--persistence/public.js';
import {connectPersistenceOperations} from '../../src/framework-to-framework/operations--persistence/public.js';
connectPersistenceOperations();
const schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));
function fixture(t){const dir=mkdtempSync(join(tmpdir(),'veiled-rf06-r27-')),db=new VeiledDB(join(dir,'synthetic.sqlite'),schema),events=[],values={channel:{id:'play'},role:{id:'gm'},mode:'mention'},interaction={guildId:'guild',options:{getChannel:(name,required)=>{events.push(['channel',name,required]);return values.channel;},getRole:name=>{events.push(['role',name]);return values.role;},getString:name=>{events.push(['mode',name]);return values.mode;}},reply:async value=>events.push(['reply',value])};t.after(()=>{db.close();assert.equal(dirname(dir),resolve(tmpdir()));assert.ok(dir.startsWith(join(resolve(tmpdir()),'veiled-rf06-r27-')));rmSync(dir,{recursive:true,force:true});});return {db,events,values,interaction,store:connectDiscordCampaignConfiguration(db),isGm:()=>{events.push(['gm']);return true;}};}

test('one-method configuration capability validates shape and forwards current receiver/result/error only',()=>{
  assert.throws(()=>createCampaignConfigurationStore({}),TypeError);assert.throws(()=>assertCampaignConfigurationStore({}),TypeError);const value={},error=new Error('config'),db={configureCampaign(...args){assert.equal(this,db);assert.deepEqual(args,['guild',{a:1}]);return value;}};const store=connectDiscordCampaignConfiguration(db);assert.ok(Object.isFrozen(store));assert.deepEqual(Object.keys(store),['configureCampaign']);assert.equal(store.db,undefined);assert.equal(store.configureCampaign('guild',{a:1}),value);db.configureCampaign=function(){assert.equal(this,db);throw error;};assert.throws(()=>store.configureCampaign(),e=>e===error);
});
test('original deferred GM guard rejects before options, campaign initialization or response',async t=>{
  const f=fixture(t);await assert.rejects(handleCampaignSetupCommand(f.interaction,{store:f.store,isGm:()=>{f.events.push(['gm']);return false;}}),{message:'Manage Server or the configured GM role is required.'});assert.deepEqual(f.events,[['gm']]);assert.equal(f.db.getCampaign('guild'),undefined);
});
test('actual setup preserves required option order, native routing fields and private success response',async t=>{
  const f=fixture(t);assert.equal(await handleCampaignSetupCommand(f.interaction,f),true);assert.deepEqual(f.events.slice(0,4),[['gm'],['channel','play_channel',true],['role','gm_role'],['mode','mode']]);const campaign=f.db.getCampaign('guild');assert.equal(campaign.play_channel_id,'play');assert.equal(campaign.gm_role_id,'gm');assert.equal(campaign.response_mode,'mention');assert.deepEqual(f.events.at(-1),['reply',{content:'Configured **Veiled City**. Play channel: <#play>. Response mode: **mention**.',ephemeral:true}]);
});
test('original mode option/environment/assisted fallback and nullable role preserve existing SQL coalesce',async t=>{
  const saved=process.env.DEFAULT_RESPONSE_MODE;t.after(()=>{if(saved===undefined)delete process.env.DEFAULT_RESPONSE_MODE;else process.env.DEFAULT_RESPONSE_MODE=saved;});const f=fixture(t);f.values.mode='';f.values.role=null;process.env.DEFAULT_RESPONSE_MODE='active';await handleCampaignSetupCommand(f.interaction,f);assert.equal(f.db.getCampaign('guild').response_mode,'active');assert.equal(f.db.getCampaign('guild').gm_role_id,null);delete process.env.DEFAULT_RESPONSE_MODE;await handleCampaignSetupCommand(f.interaction,f);assert.equal(f.db.getCampaign('guild').response_mode,'assisted');f.db.db.prepare('UPDATE campaigns SET gm_role_id=? WHERE guild_id=?').run('retained-role','guild');f.values.mode='mention';process.env.DEFAULT_RESPONSE_MODE='active';await handleCampaignSetupCommand(f.interaction,f);assert.equal(f.db.getCampaign('guild').response_mode,'mention');assert.equal(f.db.getCampaign('guild').gm_role_id,'retained-role');
});
test('original channel conflict and invalid mode errors send nothing and preserve existing campaign fields',async t=>{
  const f=fixture(t);f.db.ensureCampaign('guild');f.db.configureChannels('guild',{rulesChannelId:'play'});await assert.rejects(handleCampaignSetupCommand(f.interaction,f),/Channel routing conflict/);assert.ok(!f.events.some(e=>e[0]==='reply'));assert.equal(f.db.getCampaign('guild').play_channel_id,null);f.values.channel={id:'safe'};f.values.mode='unsupported';await assert.rejects(handleCampaignSetupCommand(f.interaction,f),/CHECK constraint failed/);assert.equal(f.db.getCampaign('guild').play_channel_id,null);
});
test('caller transaction owns configuration rollback and failed response preserves original already-written setup without retry',async t=>{
  const f=fixture(t),error=new Error('caller rollback');f.db.ensureCampaign('guild');assert.throws(()=>f.db.transaction(()=>{const row=f.store.configureCampaign('guild',{playChannelId:'temporary',responseMode:'mention'});assert.equal(row.play_channel_id,'temporary');throw error;}),e=>e===error);assert.equal(f.db.getCampaign('guild').play_channel_id,null);let replies=0;f.interaction.reply=async()=>{replies++;throw error;};await assert.rejects(handleCampaignSetupCommand(f.interaction,f),e=>e===error);assert.equal(replies,1);assert.equal(f.db.getCampaign('guild').play_channel_id,'play');assert.equal(f.db._transactionDepth,0);
});
test('option failure precedes persistence and root awaits setup inside unchanged receipt finally',async t=>{
  const f=fixture(t),error=new Error('required channel missing');f.interaction.options.getChannel=()=>{throw error;};await assert.rejects(handleCampaignSetupCommand(f.interaction,f),e=>e===error);assert.equal(f.db.getCampaign('guild'),undefined);assert.ok(!f.events.some(e=>e[0]==='reply'));const source=readFileSync(new URL('../../src/commands.js',import.meta.url),'utf8'),at=source.indexOf('return await handleCampaignSetupCommand(');assert.ok(at>source.indexOf('const restoreReceiptCapture='));assert.ok(at<source.lastIndexOf('restoreReceiptCapture();'));assert.match(source.slice(at,at+190),/isGm:\(\)=>isGM\(db,interaction\)/);
});
