import path from "node:path";

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
    voiceModel:process.env.OPENAI_VOICE_MODEL||"gpt-4o-mini-tts",
    voiceMode:process.env.VOICE_MODE||"narrative",
    voiceName:process.env.VOICE_NAME||process.env.VOICE_CUSTOM_ID||"cedar",
    voiceInstructions:process.env.VOICE_INSTRUCTIONS||"Low-key occult noir narrator. Measured pace, restrained emotion, clear diction, cinematic but never melodramatic.",
    voiceSpeed:Number(process.env.VOICE_SPEED||1),
    voiceMaxCharsPerTurn:Number(process.env.VOICE_MAX_CHARS_PER_TURN||12000),
    voiceMaxQueue:Number(process.env.VOICE_MAX_QUEUE||8),
    defaultResponseMode:process.env.DEFAULT_RESPONSE_MODE||"assisted"
  };
}
