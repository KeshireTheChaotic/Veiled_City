import assert from 'node:assert/strict';
import {mkdirSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {Client,GatewayIntentBits,Events,Routes} from 'discord.js';
import {randomUUID} from 'node:crypto';
import {createDiscordAudienceReader} from '../../src/v2/discord-audience-reader.js';
import {createDiscordMessageReader} from '../../src/v2/discord-message-reader.js';

const guildId='1467249344947159291',channelId='1467249346054721558';
if(process.env.VK2_ONLINE_TEST!=='1'||process.env.VK2_AUTONOMOUS_TEST_SEND!=='1'||!process.env.VK2_ENV_FILE)throw new Error('Explicit test-guild online/send opt-in required');
process.loadEnvFile(process.env.VK2_ENV_FILE);
if(process.env.DISCORD_GUILD_ID!==guildId||!process.env.DISCORD_TOKEN||!process.env.DISCORD_CLIENT_ID)throw new Error('Test-guild credential configuration required');
const directory=fileURLToPath(new URL('../../../.reports/autonomous-discord-20261110/',import.meta.url));mkdirSync(directory,{recursive:true});
const receiptPath=directory+'receipt.json';
if(existsSync(receiptPath))throw new Error('Existing test receipt requires inspection; never automatically repeat a send');
const receipt={guildId,channelId,nonce:randomUUID().replaceAll('-','').slice(0,20),stage:'preparing',checks:[],modelCalls:0};
const save=()=>writeFileSync(receiptPath,JSON.stringify(receipt,null,2));save();
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers],rest:{timeout:10000,retries:0}});
let timer;
try{
  const ready=new Promise((resolve,reject)=>{client.once(Events.ClientReady,resolve);client.once(Events.Error,reject);timer=setTimeout(()=>reject(new Error('Discord ready timeout')),30000);});
  await client.login(process.env.DISCORD_TOKEN);await ready;clearTimeout(timer);
  const commands=await client.rest.get(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID,guildId));
  for(const [root,sub] of [['vc-gm','register-character'],['vc-gm','publish-draft'],['vc-player','private-channel'],['vc-player','death-review'],['vc-session','start']])assert.ok(commands.find(c=>c.name===root)?.options.some(o=>o.name===sub),`${root}/${sub} schema missing`);
  receipt.checks.push({name:'live-native-command-schema',status:'passed',rootCount:commands.length});save();
  const guild=await client.guilds.fetch({guild:guildId,force:true}),channel=await guild.channels.fetch(channelId,{force:true});assert.equal(channel.guildId,guildId);
  const reader=createDiscordAudienceReader({client}),scope={guildId,channelId,sceneId:'autonomous-connection-check',mode:'party'},start=performance.now();
  const first=await reader.read(scope),second=await reader.read(scope);assert.equal(first.fingerprint,second.fingerprint);
  receipt.checks.push({name:'fresh-exact-audience',status:'passed',memberCount:guild.memberCount,recipientCount:second.channelRecord.recipientIds.length,twoReadMilliseconds:Math.round(performance.now()-start)});save();
  await assert.rejects(reader.read({...scope,mode:'private',ownerUserId:second.channelRecord.recipientIds[0]}),/private_channel_audience_mismatch/);
  receipt.checks.push({name:'shared-channel-refused-as-private',status:'passed'});save();
  receipt.stage='sending';save();
  const content='Veilkeeper autonomous connection test: bot-authored input must not create player authority. No game effects.';
  const sent=await channel.send({content,allowedMentions:{parse:[]},nonce:receipt.nonce,enforceNonce:true});receipt.messageId=sent.id;receipt.stage='sent';save();
  const fetched=await channel.messages.fetch({message:sent.id,force:true});assert.equal(fetched.content,content);assert.equal(fetched.author.id,client.user.id);assert.equal(fetched.author.bot,true);
  receipt.checks.push({name:'real-bot-send-and-readback',status:'passed',messageId:sent.id});save();
  const messageReader=createDiscordMessageReader({client});
  for(const userId of [client.user.id,second.channelRecord.recipientIds[0]])await assert.rejects(messageReader.read({...scope,messageId:sent.id,userId}),/Authenticated authored Discord message required/);
  receipt.checks.push({name:'bot-and-substituted-human-source-refused',status:'passed'});receipt.stage='completed';save();
  console.log(JSON.stringify(receipt));
}catch(error){
  receipt.error={name:error?.name??'Error',code:error?.code??null};receipt.requiresReview=true;save();
  console.error(JSON.stringify({stage:receipt.stage,error:receipt.error,requiresReview:true}));process.exitCode=1;
}finally{clearTimeout(timer);client.destroy();}
