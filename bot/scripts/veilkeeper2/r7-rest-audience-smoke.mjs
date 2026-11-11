import {performance} from 'node:perf_hooks';
import {Client,GatewayIntentBits,Events,ChannelType} from 'discord.js';
import {createDiscordAudienceReader} from '../../src/v2/discord-audience-reader.js';

// Read-only qualification connection. No runtime root, database, inference or publication.
const guildId='1467249344947159291';
if(process.env.VK2_NATIVE!=='1'||process.env.VK2_ALLOWED_GUILD_ID!==guildId)throw new Error('Explicit test-guild native opt-in required');
if(process.env.VK2_ENV_FILE)process.loadEnvFile(process.env.VK2_ENV_FILE);
if(process.env.DISCORD_GUILD_ID!==guildId||!process.env.DISCORD_TOKEN)throw new Error('Test-guild credential configuration required');
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers],rest:{timeout:10000,retries:0}});
const controller=new AbortController(),timer=setTimeout(()=>{controller.abort();client.destroy();},30000);
try{
  const ready=new Promise((resolve,reject)=>{
    client.once(Events.ClientReady,resolve);client.once(Events.Error,reject);
    controller.signal.addEventListener('abort',()=>reject(new Error('Read-only qualification timed out')),{once:true});
  });
  await client.login(process.env.DISCORD_TOKEN);await ready;
  const guild=await client.guilds.fetch({guild:guildId,force:true}),channels=await guild.channels.fetch();
  const channel=[...channels.values()].filter(ch=>ch?.guildId===guildId&&ch.type===ChannelType.GuildText).sort((a,b)=>a.id.localeCompare(b.id))[0];
  if(!channel)throw new Error('Test-guild text channel required');
  const reader=createDiscordAudienceReader({client}),measurements=[],proofs=[];
  for(let n=0;n<2;n++){
    controller.signal.throwIfAborted();const start=performance.now();
    const proof=await reader.read({guildId,channelId:channel.id,sceneId:'read-only-qualification',mode:'party'},{signal:controller.signal});
    measurements.push(Math.round((performance.now()-start)*100)/100);proofs.push(proof);
  }
  console.log(JSON.stringify({guildId,channelId:channel.id,memberCount:guild.memberCount,recipientCount:proofs[1].channelRecord.recipientIds.length,readMilliseconds:measurements,matchingFingerprints:proofs[0].fingerprint===proofs[1].fingerprint,modelCalls:0,messagesSent:0,databaseOpened:false}));
}catch(error){
  console.error(JSON.stringify({status:'failed',name:error?.name??'Error',code:typeof error?.code==='string'||typeof error?.code==='number'?error.code:null}));process.exitCode=1;
}finally{clearTimeout(timer);client.destroy();}
