/** Runtime configuration loader with fail-fast type/range validation. */
import path from "node:path";
import {resolveContentRoot} from '../frameworks/content/public.js';
import {parseModelPricing} from '../frameworks/operations/public.js';

const BUILTIN_VOICES=new Set(["alloy","ash","ballad","coral","echo","fable","nova","onyx","sage","shimmer","verse","marin","cedar"]);

function numberEnv(name,fallback,{min=-Infinity,max=Infinity,integer=false}={}){
  const raw=process.env[name];
  const n=raw==null||raw===""?fallback:Number(raw);
  if(!Number.isFinite(n)) throw new Error(`${name} must be a finite number.`);
  if(integer&&!Number.isInteger(n)) throw new Error(`${name} must be an integer.`);
  if(n<min||n>max) throw new Error(`${name} must be between ${min} and ${max}.`);
  return n;
}

function enumEnv(name,fallback,allowed){
  const value=String(process.env[name]||fallback).trim().toLowerCase();
  if(!allowed.includes(value)) throw new Error(`${name} must be one of: ${allowed.join(", ")}.`);
  return value;
}

function voiceNameEnv(){
  const value=String(process.env.VOICE_NAME||process.env.VOICE_CUSTOM_ID||"cedar").trim();
  if(!BUILTIN_VOICES.has(value)&&!value.startsWith("voice_")) throw new Error("VOICE_NAME must be a supported built-in voice or a custom voice ID beginning with voice_.");
  return value;
}

export function loadConfig(){
  const cwd=process.cwd();
  const need=(k)=>{
    const v=process.env[k];
    if(!v) throw new Error(`Missing required environment variable ${k}`);
    return v;
  };
  // "chatgpt" signs model calls in through the Codex CLI's ChatGPT login: local testing only, never live.
  const aiAuthMode=enumEnv("AI_AUTH_MODE","api_key",["api_key","chatgpt"]);
  const voiceEnabled=/^(1|true|yes|on)$/i.test(process.env.VOICE_ENABLED||"false");
  return {
    discordToken:need("DISCORD_TOKEN"),
    discordClientId:need("DISCORD_CLIENT_ID"),
    aiAuthMode,
    // Text-to-speech has no ChatGPT sign-in route, so voice still needs an API key.
    openaiKey:aiAuthMode==="api_key"||voiceEnabled?need("OPENAI_API_KEY"):process.env.OPENAI_API_KEY||null,
    modelPricing:parseModelPricing(process.env.MODEL_PRICING_JSON||'{}'),
    gmModel:process.env.OPENAI_GM_MODEL||"gpt-6.1-sol",
    narrativeModel:process.env.OPENAI_NARRATIVE_MODEL||null,
    narrativeFastModel:process.env.OPENAI_NARRATIVE_FAST_MODEL||null,
    routerModel:process.env.OPENAI_ROUTER_MODEL||"gpt-6-luna",
    routerDecisionsShadow:enumEnv('ROUTER_DECISIONS_SHADOW','false',['true','false'])==='true',
    routerShadowDeadlineMs:numberEnv('ROUTER_SHADOW_DEADLINE_MS',1000,{min:50,max:2000,integer:true}),
    routineGmModel:process.env.OPENAI_ROUTINE_GM_MODEL||process.env.OPENAI_ROUTER_MODEL||"gpt-6-luna",
    summaryModel:process.env.OPENAI_SUMMARY_MODEL||"gpt-6-luna",
    rulesModel:process.env.OPENAI_RULES_MODEL||process.env.OPENAI_ROUTER_MODEL||"gpt-6-luna",
    assemblyModel:process.env.OPENAI_ASSEMBLY_MODEL||process.env.OPENAI_ROUTER_MODEL||"gpt-6-luna",
    npcProxyModel:process.env.OPENAI_NPC_PROXY_MODEL||process.env.OPENAI_ASSEMBLY_MODEL||process.env.OPENAI_ROUTER_MODEL||"gpt-6-luna",
    downtimeModel:process.env.OPENAI_DOWNTIME_MODEL||process.env.OPENAI_GM_MODEL||"gpt-6.1-sol",
    handoutModel:process.env.OPENAI_HANDOUT_MODEL||process.env.OPENAI_ROUTER_MODEL||"gpt-6-luna",
    aftermathModel:process.env.OPENAI_AFTERMATH_MODEL||process.env.OPENAI_SUMMARY_MODEL||process.env.OPENAI_ROUTER_MODEL||"gpt-6-luna",
    reasoningEffort:process.env.OPENAI_REASONING_EFFORT||"low",
    openaiRequestTimeoutMs:numberEnv("OPENAI_REQUEST_TIMEOUT_MS",60000,{min:5000,max:600000,integer:true}),
    openaiMaxRetries:numberEnv("OPENAI_MAX_RETRIES",1,{min:0,max:5,integer:true}),
    // Whole GM turn prompt (instructions + context) in characters; each enabled city feature adds mandatory context.
    turnPromptMaxChars:numberEnv("TURN_PROMPT_MAX_CHARS",200000,{min:60000,max:800000,integer:true}),
    aiOperationDeadlineMs:numberEnv("AI_OPERATION_DEADLINE_MS",120000,{min:5000,max:900000,integer:true}),
    gmTurnDeadlineMs:numberEnv("GM_TURN_DEADLINE_MS",120000,{min:10000,max:900000,integer:true}),
    routerDeadlineMs:numberEnv("ROUTER_DEADLINE_MS",20000,{min:1000,max:120000,integer:true}),
    gmProgressAfterMs:numberEnv("GM_PROGRESS_AFTER_MS",20000,{min:5000,max:120000,integer:true}),
    gmProgressEnabled:enumEnv('GM_PROGRESS_ENABLED','false',['true','false'])==='true',
    typingRefreshMs:numberEnv("GM_TYPING_REFRESH_MS",8000,{min:4000,max:30000,integer:true}),
    dbPath:path.resolve(cwd,process.env.DATABASE_PATH||"./data/veiled_city.sqlite"),
    contentRoot:resolveContentRoot({cwd}),
    maxRecentMessages:numberEnv("MAX_RECENT_MESSAGES",28,{min:1,max:500,integer:true}),
    maxContentChunks:numberEnv("MAX_CONTENT_CHUNKS",8,{min:1,max:100,integer:true}),
    maxRulesChunks:numberEnv("MAX_RULES_CHUNKS",6,{min:1,max:100,integer:true}),
    rulesOnlineSrd:enumEnv("RULES_ONLINE_SRD","true",["true","false"])==="true",
    rulesMaxOutputTokens:numberEnv("RULES_MAX_OUTPUT_TOKENS",500,{min:64,max:32000,integer:true}),
    assemblyMaxOutputTokens:numberEnv("ASSEMBLY_MAX_OUTPUT_TOKENS",1200,{min:64,max:32000,integer:true}),
    npcProxyMaxOutputTokens:numberEnv("NPC_PROXY_MAX_OUTPUT_TOKENS",1200,{min:64,max:32000,integer:true}),
    structuredRetryMaxTokens:numberEnv("STRUCTURED_JSON_RETRY_MAX_TOKENS",6000,{min:256,max:64000,integer:true}),
    downtimeMaxOutputTokens:numberEnv("DOWNTIME_MAX_OUTPUT_TOKENS",1800,{min:64,max:32000,integer:true}),
    handoutMaxOutputTokens:numberEnv("HANDOUT_MAX_OUTPUT_TOKENS",1200,{min:64,max:32000,integer:true}),
    aftermathMaxOutputTokens:numberEnv("AFTERMATH_MAX_OUTPUT_TOKENS",1800,{min:64,max:32000,integer:true}),
    encounterAftermathMode:enumEnv("ENCOUNTER_AFTERMATH_MODE","auto",["auto","confirm","none"]),
    voiceEnabled,
    voiceModel:String(process.env.OPENAI_VOICE_MODEL||"gpt-4o-mini-tts").trim(),
    voiceMode:enumEnv("VOICE_MODE","narrative",["off","narrative","full"]),
    voiceName:voiceNameEnv(),
    voiceInstructions:String(process.env.VOICE_INSTRUCTIONS||"Low-key occult noir narrator. Measured pace, restrained emotion, clear diction, cinematic but never melodramatic.").trim().slice(0,4096),
    voiceSpeed:numberEnv("VOICE_SPEED",1,{min:0.25,max:4}),
    voiceMaxCharsPerTurn:numberEnv("VOICE_MAX_CHARS_PER_TURN",12000,{min:100,max:40000,integer:true}),
    voiceMaxQueue:numberEnv("VOICE_MAX_QUEUE",8,{min:1,max:100,integer:true}),
    voiceRepeatCooldownMs:numberEnv("VOICE_REPEAT_COOLDOWN_SECONDS",8,{min:0,max:300})*1000,
    defaultResponseMode:enumEnv("DEFAULT_RESPONSE_MODE","assisted",["active","assisted","mention"]),
    logLevel:enumEnv("LOG_LEVEL","info",["debug","info","warn","error"])
  };
}
