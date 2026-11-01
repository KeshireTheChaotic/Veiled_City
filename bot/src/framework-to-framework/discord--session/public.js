
import {discordSessionPrincipal} from '../../frameworks/discord/public.js';
import {conversationPrincipal} from '../../frameworks/session/public.js';
/** Bind the original Session reader without evaluating player state. */
export function connectDiscordSessionPrincipal(){return discordSessionPrincipal.bind({conversationPrincipal});}

import {discordSessionScene} from '../../frameworks/discord/public.js';
import {currentScene} from '../../frameworks/session/public.js';
export function connectDiscordSessionScene(){return discordSessionScene.bind({currentScene});}

import {replyWithPrivateChunks} from '../../frameworks/discord/public.js';
import {buildSessionRosterReport,chunkRosterReport} from '../../frameworks/session/public.js';
/** Application retains original GM/session guards and receipt lifecycle. */
export async function handleSessionRosterCommand(interaction,db,session){
  const lines=buildSessionRosterReport(db,interaction.guildId,session);
  const chunks=chunkRosterReport(lines);
  return replyWithPrivateChunks(interaction,chunks);
}

import {sessionBrief,formatSessionBrief} from '../../frameworks/session/public.js';
import {replyWithSessionBrief} from '../../frameworks/discord/public.js';
/** Original opt-in scoped packet and formatting; Application retains route flag/mode and receipt lifecycle. */
export async function handleSessionBriefCommand(interaction,{db,mode}){
  const packet=sessionBrief(db,interaction.guildId,{mode,user:interaction.user.id});
  return replyWithSessionBrief(interaction,packet,formatSessionBrief(packet));
}
