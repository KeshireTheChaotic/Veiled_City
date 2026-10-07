/** Discord application-command registration entry point. */
import "dotenv/config";
import { REST, Routes } from "discord.js";
import { buildCommands } from "./commands.js";
import { assertValidCommandSchema } from "./command-schema.js";

const token=process.env.DISCORD_TOKEN;
const appId=process.env.DISCORD_CLIENT_ID;
const guildId=process.env.DISCORD_GUILD_ID;
if(!token||!appId) throw new Error("Set DISCORD_TOKEN and DISCORD_CLIENT_ID in .env.");

const rest=new REST({version:"10"}).setToken(token);
const commands=buildCommands();
assertValidCommandSchema(commands);

if(guildId){
  await rest.put(Routes.applicationGuildCommands(appId,guildId),{body:commands});
  console.log(`Registered ${commands.length} root command(s) to guild ${guildId}.`);
}else{
  await rest.put(Routes.applicationCommands(appId),{body:commands});
  console.log(`Registered ${commands.length} global root command(s). Global propagation can take longer.`);
}
