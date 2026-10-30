/** Schema-only Discord registration; importing this module creates no client or connection. */
import { REST, Routes } from 'discord.js';
import { buildCommands } from './command-definitions.js';
import { assertValidCommandSchema } from './command-schema.js';

export async function registerCommands({env=process.env,Rest=REST,routes=Routes,log=console.log}={}){
  const token=env.DISCORD_TOKEN;
  const appId=env.DISCORD_CLIENT_ID;
  const guildId=env.DISCORD_GUILD_ID;
  if(!token||!appId)throw new Error('Set DISCORD_TOKEN and DISCORD_CLIENT_ID in .env.');

  const rest=new Rest({version:'10'}).setToken(token);
  const commands=buildCommands();
  assertValidCommandSchema(commands);

  if(guildId){
    await rest.put(routes.applicationGuildCommands(appId,guildId),{body:commands});
    log(`Registered ${commands.length} root command(s) to guild ${guildId}.`);
  }else{
    await rest.put(routes.applicationCommands(appId),{body:commands});
    log(`Registered ${commands.length} global root command(s). Global propagation can take longer.`);
  }
}
