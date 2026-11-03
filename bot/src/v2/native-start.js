import {pathToFileURL} from 'node:url';
import {existsSync,mkdirSync,readdirSync} from 'node:fs';
import {randomInt} from 'node:crypto';
import {Client,GatewayIntentBits} from 'discord.js';
import {openLegacyReadOnlyRepository} from './legacy-readonly-repository.js';
import {createNativeRoot} from './native-root.js';
import {createOpenAIResponsesProvider} from './openai-provider.js';
import {createCallBudget} from './provider-budget.js';
/** Inference is a second opt-in: VK2_INFERENCE=1 with OPENAI_API_KEY, VK2_MODEL and VK2_MAX_TURNS
 * (1-100, default 10). Turns become withheld drafts; nothing is sent to Discord.
 */
export async function createOpenAIProviderFromEnv(env){
  const chatgpt=String(env.AI_AUTH_MODE??'').trim().toLowerCase()==='chatgpt',{OPENAI_API_KEY:apiKey}=env,model=env.VK2_MODEL||(chatgpt?env.OPENAI_GM_MODEL:null),maxCalls=Number(env.VK2_MAX_TURNS??10);
  if(!model||!chatgpt&&!apiKey)throw new Error(chatgpt?'AI_AUTH_MODE=chatgpt requires VK2_MODEL or OPENAI_GM_MODEL':'VK2_INFERENCE=1 requires OPENAI_API_KEY and VK2_MODEL');
  if(!Number.isSafeInteger(maxCalls)||maxCalls<1||maxCalls>100)throw new Error('VK2_MAX_TURNS must be 1-100');
  // ChatGPT mode reuses the legacy Codex-login client: local testing only, no API key or spend.
  const client=chatgpt?(await import('../frameworks/ai-provider/public.js')).createChatGptClient({timeoutMs:60000}):new (await import('openai')).default({apiKey});
  return createCallBudget(createOpenAIResponsesProvider({client,model,maxOutputTokens:1024,timeoutMs:60000}),{maxCalls});
}
/** Explicit GM configuration for campaigns whose record names no GM role: VK2_GM_ROLE_ID, VK2_GM_USER_IDS
 * (comma-separated user ids) and/or VK2_GM_ALLOW_ADMINISTRATORS=1. All are opt-in; none is inferred.
 */
export function gmPolicyFromEnv(env){
  const ids=String(env.VK2_GM_USER_IDS??'').split(',').map(v=>v.trim()).filter(Boolean),role=env.VK2_GM_ROLE_ID?.trim()||null;
  if(role&&!/^\d{5,25}$/.test(role)||ids.some(v=>!/^\d{5,25}$/.test(v)))throw new Error('VK2_GM_ROLE_ID and VK2_GM_USER_IDS must be Discord ids');
  return {gmRoleId:role,gmUserIds:ids,allowAdministrators:env.VK2_GM_ALLOW_ADMINISTRATORS==='1'};
}
/** Explicit opt-in native start. It never touches the legacy runtime: the legacy database is opened
 * read-only and the native stores must live in a new or empty directory.
 * Required: VK2_NATIVE=1, VK2_NATIVE_DIR, VK2_LEGACY_DB, DISCORD_TOKEN (may come from the legacy .env named by
 * VK2_ENV_FILE) and VK2_ALLOWED_GUILD_ID: events from any other guild are ignored.
 * Natural-message intake and live inference are not part of this entry point yet.
 */
export async function startNative({env=process.env,createClient=()=>new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent]}),openRepository=openLegacyReadOnlyRepository,createRoot=createNativeRoot,createProvider=createOpenAIProviderFromEnv,loadEnvFile=process.loadEnvFile.bind(process),rng=sides=>randomInt(1,sides+1),onError=error=>console.error('native-error',error?.message)}={}){
  if(env.VK2_NATIVE!=='1')throw new Error('Native start requires VK2_NATIVE=1; the legacy runtime is unchanged');
  // Optional legacy .env: loaded by path, never read, printed or copied; existing environment values win.
  if(env.VK2_ENV_FILE)loadEnvFile(env.VK2_ENV_FILE);
  const {VK2_NATIVE_DIR:directory,VK2_LEGACY_DB:legacyDb,DISCORD_TOKEN:token,VK2_ALLOWED_GUILD_ID:guildId}=env;
  if(!directory||!legacyDb||!token)throw new Error('VK2_NATIVE_DIR, VK2_LEGACY_DB and DISCORD_TOKEN are required');
  if(!/^\d{5,25}$/.test(guildId??''))throw new Error('VK2_ALLOWED_GUILD_ID (the single guild to serve) is required');
  if(existsSync(directory)&&readdirSync(directory).length)throw new Error('Native stores need a new or empty directory, never an existing database');
  mkdirSync(directory,{recursive:true});
  const provider=env.VK2_INFERENCE==='1'?await createProvider(env):null;
  const repository=openRepository(legacyDb),client=createClient();let root;
  try{
    root=createRoot({client,directory,characterRepository:repository,campaignRepository:repository,rng,provider,allowedGuildIds:new Set([guildId]),gmPolicy:gmPolicyFromEnv(env),onDraft:(draft,request)=>console.log('native-draft-withheld',request.messageId),onError,handleOtherCommand:async()=>false,handleOtherComponent:async()=>false});
    await client.login(token);
  }catch(error){root?.close();repository.close();client.destroy?.();throw error;}
  let closed=false;
  return Object.freeze({client,root,async close(){if(closed)return;closed=true;root.close();repository.close();await client.destroy?.();}});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const app=await startNative();
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void app.close().finally(()=>process.exit(0));});
}
