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
    reasoningEffort:process.env.OPENAI_REASONING_EFFORT||"low",
    dbPath:path.resolve(cwd,process.env.DATABASE_PATH||"./data/veiled_city.sqlite"),
    contentRoot:path.resolve(cwd,process.env.CONTENT_ROOT||"../content"),
    maxRecentMessages:Number(process.env.MAX_RECENT_MESSAGES||28),
    maxContentChunks:Number(process.env.MAX_CONTENT_CHUNKS||8),
    maxRulesChunks:Number(process.env.MAX_RULES_CHUNKS||6),
    rulesMaxOutputTokens:Number(process.env.RULES_MAX_OUTPUT_TOKENS||500),
    assemblyMaxOutputTokens:Number(process.env.ASSEMBLY_MAX_OUTPUT_TOKENS||1200),
    npcProxyMaxOutputTokens:Number(process.env.NPC_PROXY_MAX_OUTPUT_TOKENS||1200),
    defaultResponseMode:process.env.DEFAULT_RESPONSE_MODE||"assisted"
  };
}
