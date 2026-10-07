import path from "node:path";

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
  return {
    discordToken:need("DISCORD_TOKEN"),
    discordClientId:need("DISCORD_CLIENT_ID"),
    openaiKey:need("OPENAI_API_KEY"),
    gmModel:process.env.OPENAI_GM_MODEL||"gpt-6.1-sol",
    routerModel:process.env.OPENAI_ROUTER_MODEL||"gpt-6-luna",
    summaryModel:process.env.OPENAI_SUMMARY_MODEL||"gpt-6-luna",
    rulesModel:process.env.OPENAI_RULES_MODEL||process.env.OPENAI_ROUTER_MODEL||"gpt-6-luna",
    assemblyModel:process.env.OPENAI_ASSEMBLY_MODEL||process.env.OPENAI_ROUTER_MODEL||"gpt-6-luna",
    npcProxyModel:process.env.OPENAI_NPC_PROXY_MODEL||process.env.OPENAI_ASSEMBLY_MODEL||process.env.OPENAI_ROUTER_MODEL||"gpt-6-luna",
    downtimeModel:process.env.OPENAI_DOWNTIME_MODEL||process.env.OPENAI_GM_MODEL||"gpt-6.1-sol",
    handoutModel:process.env.OPENAI_HANDOUT_MODEL||process.env.OPENAI_ROUTER_MODEL||"gpt-6-luna",
    aftermathModel:process.env.OPENAI_AFTERMATH_MODEL||process.env.OPENAI_SUMMARY_MODEL||process.env.OPENAI_ROUTER_MODEL||"gpt-6-luna",
    reasoningEffort:process.env.OPENAI_REASONING_EFFORT||"low",
    dbPath:path.resolve(cwd,process.env.DATABASE_PATH||"./data/veiled_city.sqlite"),
    contentRoot:path.resolve(cwd,process.env.CONTENT_ROOT||"../content"),
    maxRecentMessages:Number(process.env.MAX_RECENT_MESSAGES||28),
    maxContentChunks:Number(process.env.MAX_CONTENT_CHUNKS||8),
    maxRulesChunks:Number(process.env.MAX_RULES_CHUNKS||6),
    rulesMaxOutputTokens:Number(process.env.RULES_MAX_OUTPUT_TOKENS||500),
    assemblyMaxOutputTokens:Number(process.env.ASSEMBLY_MAX_OUTPUT_TOKENS||1200),
    npcProxyMaxOutputTokens:Number(process.env.NPC_PROXY_MAX_OUTPUT_TOKENS||1200),
    structuredRetryMaxTokens:Number(process.env.STRUCTURED_JSON_RETRY_MAX_TOKENS||6000),
    downtimeMaxOutputTokens:Number(process.env.DOWNTIME_MAX_OUTPUT_TOKENS||1800),
    handoutMaxOutputTokens:Number(process.env.HANDOUT_MAX_OUTPUT_TOKENS||1200),
    aftermathMaxOutputTokens:Number(process.env.AFTERMATH_MAX_OUTPUT_TOKENS||1800),
    encounterAftermathMode:process.env.ENCOUNTER_AFTERMATH_MODE||"auto",
    voiceEnabled:/^(1|true|yes|on)$/i.test(process.env.VOICE_ENABLED||"false"),
    voiceModel:String(process.env.OPENAI_VOICE_MODEL||"gpt-4o-mini-tts").trim(),
    voiceMode:enumEnv("VOICE_MODE","narrative",["off","narrative","full"]),
    voiceName:voiceNameEnv(),
    voiceInstructions:String(process.env.VOICE_INSTRUCTIONS||"Low-key occult noir narrator. Measured pace, restrained emotion, clear diction, cinematic but never melodramatic.").trim().slice(0,4096),
    voiceSpeed:numberEnv("VOICE_SPEED",1,{min:0.25,max:4}),
    voiceMaxCharsPerTurn:numberEnv("VOICE_MAX_CHARS_PER_TURN",12000,{min:100,max:40000,integer:true}),
    voiceMaxQueue:numberEnv("VOICE_MAX_QUEUE",8,{min:1,max:100,integer:true}),
    voiceRepeatCooldownMs:numberEnv("VOICE_REPEAT_COOLDOWN_SECONDS",8,{min:0,max:300})*1000,
    defaultResponseMode:process.env.DEFAULT_RESPONSE_MODE||"assisted"
  };
}
