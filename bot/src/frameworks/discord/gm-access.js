import {PermissionFlagsBits} from 'discord.js';
/** Original GM predicate only; caller retains all existing command/session/source controls. */
export function hasGmAccess(store,interaction){
  if(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  const c=store.getCampaign(interaction.guildId);
  return !!(c?.gm_role_id && interaction.member?.roles?.cache?.has(c.gm_role_id));
}
