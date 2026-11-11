import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {Client,GatewayIntentBits,REST,Routes,Events} from 'discord.js';
import {startNative} from '../../src/v2/native-start.js';
import {createNativeRoot} from '../../src/v2/native-root.js';
import {registerNativeCommands} from '../../src/v2/register-commands.js';

const guildId='1467249344947159291';
if(process.env.VK2_ONLINE_TEST!=='1'||!process.env.VK2_ENV_FILE)throw new Error('Explicit online-test opt-in and credential-file path required');
process.loadEnvFile(process.env.VK2_ENV_FILE);
if(process.env.DISCORD_GUILD_ID!==guildId||!process.env.DATABASE_PATH)throw new Error('Authorized test guild and source database configuration required');
const repository=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const directory=join(repository,'.reports',`online-${randomUUID()}`);mkdirSync(directory,{recursive:true});
const sourcePath=resolve(dirname(process.env.VK2_ENV_FILE),process.env.DATABASE_PATH),copyPath=join(directory,'legacy-copy.sqlite');
const source=new DatabaseSync(sourcePath,{readOnly:true});
try{await backup(source,copyPath);}finally{source.close();}
const rest=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);
const prior=await rest.get(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID,guildId));
writeFileSync(join(directory,'commands-before.json'),JSON.stringify(prior,null,2));
const env={...process.env,VK2_NATIVE:'1',VK2_ALLOWED_GUILD_ID:guildId,VK2_NATIVE_DIR:join(directory,'native'),VK2_LEGACY_DB:copyPath,VK2_INFERENCE:'1',VK2_PROVIDER:'ollama',VK2_MODEL:'qwen3.5:4b',VK2_MAX_TURNS:'10',VK2_GM_ALLOW_ADMINISTRATORS:'1'};
await registerNativeCommands({env,loadEnvFile:()=>{}});
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent]});
client.once(Events.ClientReady,()=>console.log(JSON.stringify({event:'ready',guildId,directory,model:env.VK2_MODEL,callCap:10,storesPreservedOnClose:true})));
const app=await startNative({env,createClient:()=>client,loadEnvFile:()=>{},createRoot:options=>createNativeRoot({...options,onDraft:(draft,request)=>console.log(JSON.stringify({event:'draft-withheld',messageId:request.messageId,publicationId:draft.publication?.id,metrics:draft.metrics}))})});
console.log(JSON.stringify({event:'online-test-running',guildId,directory}));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void app.root.drain().finally(()=>app.close()).finally(()=>process.exit(0));});
