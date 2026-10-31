/** Original runtime Discord client construction only; startup retains login and all lifecycle services. */
import { Client, GatewayIntentBits, Partials } from "discord.js";
export function createDiscordClient(){return new Client({
  intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.DirectMessages,GatewayIntentBits.GuildVoiceStates],
  partials:[Partials.Channel]
});}
