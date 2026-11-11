import {pathToFileURL} from 'node:url';
import {REST,Routes} from 'discord.js';
import {buildNativeCommands} from './command-definitions.js';

/** Explicit native, guild-only registration; importing performs no network I/O. */
export async function registerNativeCommands({env=process.env,Rest=REST,routes=Routes,log=console.log,loadEnvFile=process.loadEnvFile.bind(process)}={}){
  if(env.VK2_NATIVE!=='1')throw new Error('Native registration requires VK2_NATIVE=1');
  if(env.VK2_ENV_FILE)loadEnvFile(env.VK2_ENV_FILE);
  const {DISCORD_TOKEN:token,DISCORD_CLIENT_ID:appId,DISCORD_GUILD_ID:guildId,VK2_ALLOWED_GUILD_ID:allowed}=env;
  if(!token||!/^\d{5,25}$/.test(appId??'')||!/^\d{5,25}$/.test(guildId??'')||guildId!==allowed)throw new Error('Native registration requires DISCORD_TOKEN, DISCORD_CLIENT_ID and DISCORD_GUILD_ID matching VK2_ALLOWED_GUILD_ID');
  const commands=buildNativeCommands(),rest=new Rest({version:'10'}).setToken(token);
  await rest.put(routes.applicationGuildCommands(appId,guildId),{body:commands});
  log(`Registered ${commands.length} native root command(s) to guild ${guildId}.`);
  return {guildId,count:commands.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await registerNativeCommands();
