import {pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {prepareRuntimeDirectory} from './runtime-directory.js';
import {acquireGuildRuntimeLease,defaultGuildLeaseDirectory} from './guild-runtime-lease.js';
import {randomInt} from 'node:crypto';
import {Client,GatewayIntentBits} from 'discord.js';
import {openLegacyReadOnlyRepository} from './legacy-readonly-repository.js';
import {createNativeRoot} from './native-root.js';
import {createOpenAIResponsesProvider} from './openai-provider.js';
import {createOllamaProvider} from './ollama-provider.js';
import {createCallBudget} from './provider-budget.js';
/** Inference is a second opt-in: VK2_INFERENCE=1; model-config.json defaults to local Ollama.
 * VK2_PROVIDER=openai explicitly selects the existing remote/ChatGPT path. Both retain
 * VK2_MAX_TURNS (1-100, default 10). Turns become withheld drafts; nothing is sent to Discord.
 */
export async function createOpenAIProviderFromEnv(env){
  const chatgpt=String(env.AI_AUTH_MODE??'').trim().toLowerCase()==='chatgpt',{OPENAI_API_KEY:apiKey}=env,model=env.VK2_MODEL||(chatgpt?env.OPENAI_GM_MODEL:null),maxCalls=Number(env.VK2_MAX_TURNS??10);
  if(!model||!chatgpt&&!apiKey)throw new Error(chatgpt?'AI_AUTH_MODE=chatgpt requires VK2_MODEL or OPENAI_GM_MODEL':'VK2_INFERENCE=1 requires OPENAI_API_KEY and VK2_MODEL');
  if(!Number.isSafeInteger(maxCalls)||maxCalls<1||maxCalls>100)throw new Error('VK2_MAX_TURNS must be 1-100');
  // ChatGPT mode reuses the legacy Codex-login client: local testing only, no API key or spend.
  const client=chatgpt?(await import('../frameworks/ai-provider/public.js')).createChatGptClient({timeoutMs:60000}):new (await import('openai')).default({apiKey});
  return createCallBudget(createOpenAIResponsesProvider({client,model,maxOutputTokens:1024,timeoutMs:60000}),{maxCalls});
}
/** Rebuild default is the locally configured Ollama model; remote providers require explicit selection. */
export async function createProviderFromEnv(env){
  const config=JSON.parse(readFileSync(new URL('./model-config.json',import.meta.url),'utf8'));
  const provider=String(env.VK2_PROVIDER??config.provider).trim().toLowerCase();
  if(provider==='openai')return createOpenAIProviderFromEnv(env);
  if(provider!=='ollama')throw new Error('VK2_PROVIDER must be ollama or openai');
  const maxCalls=Number(env.VK2_MAX_TURNS??10);
  if(!Number.isSafeInteger(maxCalls)||maxCalls<1||maxCalls>100)throw new Error('VK2_MAX_TURNS must be 1-100');
  return createCallBudget(createOllamaProvider({model:env.VK2_MODEL||env.OLLAMA_MODEL||config.model,baseUrl:env.OLLAMA_HOST||config.baseUrl,thinking:config.thinking??false,maxOutputTokens:config.maxOutputTokens??1024,timeoutMs:config.timeoutMs??120000}),{maxCalls});
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
 * read-only. Stores start in a new/empty directory; VK2_RESUME=1 verifies an existing native manifest.
 * Required: VK2_NATIVE=1, VK2_NATIVE_DIR, VK2_LEGACY_DB, DISCORD_TOKEN (may come from the legacy .env named by
 * VK2_ENV_FILE) and VK2_ALLOWED_GUILD_ID: events from any other guild are ignored.
 * Optional natural-message inference produces withheld drafts; publication is separate.
 * Native launchers share a local guild lease across worktrees/data directories.
 * Packaged/custom layouts require VK2_GUILD_LEASE_DIR, identical for all launchers.
 */
export async function startNative({env=process.env,createClient=()=>new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent]}),openRepository=openLegacyReadOnlyRepository,createRoot=createNativeRoot,createProvider=createProviderFromEnv,loadEnvFile=process.loadEnvFile.bind(process),rng=sides=>randomInt(1,sides+1),onError=error=>console.error('native-error',error?.message)}={}){
  if(env.VK2_NATIVE!=='1')throw new Error('Native start requires VK2_NATIVE=1; the legacy runtime is unchanged');
  // Optional legacy .env: loaded by path, never read, printed or copied; existing environment values win.
  if(env.VK2_ENV_FILE)loadEnvFile(env.VK2_ENV_FILE);
  const {VK2_NATIVE_DIR:directory,VK2_LEGACY_DB:legacyDb,DISCORD_TOKEN:token,VK2_ALLOWED_GUILD_ID:guildId}=env;
  if(!directory||!legacyDb||!token)throw new Error('VK2_NATIVE_DIR, VK2_LEGACY_DB and DISCORD_TOKEN are required');
  if(!/^\d{5,25}$/.test(guildId??''))throw new Error('VK2_ALLOWED_GUILD_ID (the single guild to serve) is required');
  const guildLease=acquireGuildRuntimeLease({guildId,directory:env.VK2_GUILD_LEASE_DIR??defaultGuildLeaseDirectory()});let runtime;
  try{runtime=prepareRuntimeDirectory({directory,legacyDb,guildId,resume:env.VK2_RESUME==='1'});}catch(error){guildLease.close();throw error;}
  let repository,client,root;
  async function closeResources(){try{root?.close();}finally{try{repository?.close();}finally{try{await client?.destroy?.();}finally{try{runtime.close();}finally{guildLease.close();}}}}}
  try{
    const provider=env.VK2_INFERENCE==='1'?await createProvider(env):null;
    repository=openRepository(legacyDb);client=createClient();
    root=createRoot({client,directory:runtime.directory,characterRepository:repository,campaignRepository:repository,rng,provider,allowedGuildIds:new Set([guildId]),gmPolicy:gmPolicyFromEnv(env),onDraft:(draft,request)=>console.log('native-draft-withheld',request.messageId),onError,handleOtherCommand:async()=>false,handleOtherComponent:async()=>false});
    runtime.seal();await client.login(token);
  }catch(error){await closeResources();throw error;}
  let closed=false;
  return Object.freeze({client,root,runId:runtime.runId,async close(){if(closed)return;closed=true;await closeResources();}});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const app=await startNative();
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void app.close().finally(()=>process.exit(0));});
}
