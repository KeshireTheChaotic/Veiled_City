import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadConfig} from '../../src/bootstrap/config.js';
const loaderSource=readFileSync(new URL('../../src/bootstrap/config.js',import.meta.url),'utf8'),names=new Set([
  ...[...loaderSource.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)].map(m=>m[1]),
  ...[...loaderSource.matchAll(/(?:numberEnv|enumEnv|need)\(["']([A-Z][A-Z0-9_]*)["']/g)].map(m=>m[1])
]),botRoot=fileURLToPath(new URL('../../',import.meta.url));
function withEnv(values,fn){
  const keys=new Set([...names,...Object.keys(values)]),saved=new Map([...keys].map(k=>[k,process.env[k]])),cwd=process.cwd();
  try{for(const key of keys)delete process.env[key];Object.assign(process.env,{DISCORD_TOKEN:'synthetic-token',DISCORD_CLIENT_ID:'synthetic-app',OPENAI_API_KEY:'synthetic-key'});for(const [key,value]of Object.entries(values)){if(value===undefined)delete process.env[key];else process.env[key]=String(value);}process.chdir(botRoot);return fn();}
  finally{process.chdir(cwd);for(const [key,value]of saved){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
}

test('stable executable/package paths use final config location without importing runtime',()=>{
  const index=readFileSync(new URL('../../src/index.js',import.meta.url),'utf8'),pkg=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url),'utf8'));
  assert.match(index,/loadConfig \} from ["']\.\/bootstrap\/config\.js/);assert.equal(pkg.scripts.start,'node src/index.js');assert.equal(pkg.scripts.register,'node src/register-commands.js');assert.equal(existsSync(new URL('../../src/config.js',import.meta.url)),false);
});
test('original defaults and cwd-based storage/content paths remain exact without opening either',()=>withEnv({},()=>{
  const config=loadConfig();assert.equal(config.dbPath,resolve(botRoot,'data/veiled_city.sqlite'));assert.equal(config.contentRoot,resolve(botRoot,'../content'));assert.equal(config.gmModel,'gpt-6.1-sol');assert.equal(config.routerModel,'gpt-6-luna');assert.equal(config.defaultResponseMode,'assisted');assert.equal(config.voiceEnabled,false);assert.equal(config.voiceName,'cedar');assert.equal(config.voiceMode,'narrative');assert.equal(config.openaiMaxRetries,1);
}));
test('explicit paths, configured model fallbacks and normalized enums preserve original mapping',()=>withEnv({DATABASE_PATH:'fixture/db.sqlite',CONTENT_ROOT:'fixture/content',OPENAI_GM_MODEL:'synthetic-gm',OPENAI_ROUTER_MODEL:'synthetic-router',DEFAULT_RESPONSE_MODE:' Mention '},()=>{
  const config=loadConfig();assert.equal(config.dbPath,resolve(botRoot,'fixture/db.sqlite'));assert.equal(config.contentRoot,resolve(botRoot,'fixture/content'));assert.equal(config.routineGmModel,'synthetic-router');assert.equal(config.rulesModel,'synthetic-router');assert.equal(config.npcProxyModel,'synthetic-router');assert.equal(config.downtimeModel,'synthetic-gm');assert.equal(config.defaultResponseMode,'mention');
}));
test('original missing-credential messages remain unchanged with no real credentials loaded',()=>{
  for(const key of ['DISCORD_TOKEN','DISCORD_CLIENT_ID','OPENAI_API_KEY'])withEnv({[key]:undefined},()=>assert.throws(()=>loadConfig(),{message:`Missing required environment variable ${key}`}));
});
test('ChatGPT local auth keeps original key optionality and enabled voice still requires API key',()=>{
  withEnv({AI_AUTH_MODE:'chatgpt',OPENAI_API_KEY:undefined},()=>{const config=loadConfig();assert.equal(config.openaiKey,null);assert.equal(config.aiAuthMode,'chatgpt');});
  withEnv({AI_AUTH_MODE:'chatgpt',OPENAI_API_KEY:undefined,VOICE_ENABLED:'yes'},()=>assert.throws(()=>loadConfig(),{message:'Missing required environment variable OPENAI_API_KEY'}));
});
test('zero values and numeric boundaries retain exact original handling',()=>withEnv({OPENAI_MAX_RETRIES:'0',VOICE_REPEAT_COOLDOWN_SECONDS:'0',VOICE_SPEED:'0.25',VOICE_MAX_QUEUE:'1'},()=>{
  const config=loadConfig();assert.equal(config.openaiMaxRetries,0);assert.equal(config.voiceRepeatCooldownMs,0);assert.equal(config.voiceSpeed,0.25);assert.equal(config.voiceMaxQueue,1);
}));
test('invalid numeric and enum configuration retains original validation errors',()=>{
  for(const [values,pattern]of [[{OPENAI_REQUEST_TIMEOUT_MS:'bad'},/OPENAI_REQUEST_TIMEOUT_MS must be a finite number/],[{OPENAI_REQUEST_TIMEOUT_MS:'5000.5'},/OPENAI_REQUEST_TIMEOUT_MS must be an integer/],[{OPENAI_MAX_RETRIES:'99'},/OPENAI_MAX_RETRIES must be between 0 and 5/],[{VOICE_MAX_QUEUE:'0'},/VOICE_MAX_QUEUE must be between 1 and 100/],[{GM_PROGRESS_ENABLED:'truthy'},/GM_PROGRESS_ENABLED must be one of: true, false/]])withEnv(values,()=>assert.throws(()=>loadConfig(),pattern));
});
test('original voice ID and model-pricing validation are preserved without generation or billing calls',()=>{
  withEnv({VOICE_NAME:'voice_synthetic',MODEL_PRICING_JSON:'{"synthetic-model":{"input":1,"output":2}}'},()=>{const config=loadConfig();assert.equal(config.voiceName,'voice_synthetic');assert.equal(config.modelPricing['synthetic-model'].input,1);});
  withEnv({VOICE_NAME:'unsupported'},()=>assert.throws(()=>loadConfig(),/VOICE_NAME must be a supported built-in voice/));withEnv({MODEL_PRICING_JSON:'{'},()=>assert.throws(()=>loadConfig(),/MODEL_PRICING_JSON must be valid JSON/));
});
