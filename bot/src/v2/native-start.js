import {pathToFileURL} from 'node:url';
import {existsSync,mkdirSync,readdirSync} from 'node:fs';
import {randomInt} from 'node:crypto';
import {Client,GatewayIntentBits} from 'discord.js';
import {openLegacyReadOnlyRepository} from './legacy-readonly-repository.js';
import {createNativeRoot} from './native-root.js';
/** Explicit opt-in native start. It never touches the legacy runtime: the legacy database is opened
 * read-only and the native stores must live in a new or empty directory.
 * Required: VK2_NATIVE=1, VK2_NATIVE_DIR, VK2_LEGACY_DB, DISCORD_TOKEN.
 * Natural-message intake and live inference are not part of this entry point yet.
 */
export async function startNative({env=process.env,createClient=()=>new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent]}),openRepository=openLegacyReadOnlyRepository,createRoot=createNativeRoot,rng=sides=>randomInt(1,sides+1),onError=error=>console.error('native-error',error?.message)}={}){
  if(env.VK2_NATIVE!=='1')throw new Error('Native start requires VK2_NATIVE=1; the legacy runtime is unchanged');
  const {VK2_NATIVE_DIR:directory,VK2_LEGACY_DB:legacyDb,DISCORD_TOKEN:token}=env;
  if(!directory||!legacyDb||!token)throw new Error('VK2_NATIVE_DIR, VK2_LEGACY_DB and DISCORD_TOKEN are required');
  if(existsSync(directory)&&readdirSync(directory).length)throw new Error('Native stores need a new or empty directory, never an existing database');
  mkdirSync(directory,{recursive:true});
  const repository=openRepository(legacyDb),client=createClient();let root;
  try{
    root=createRoot({client,directory,characterRepository:repository,campaignRepository:repository,rng,onError,handleOtherCommand:async()=>false,handleOtherComponent:async()=>false});
    await client.login(token);
  }catch(error){root?.close();repository.close();client.destroy?.();throw error;}
  let closed=false;
  return Object.freeze({client,root,async close(){if(closed)return;closed=true;root.close();repository.close();await client.destroy?.();}});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const app=await startNative();
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void app.close().finally(()=>process.exit(0));});
}
