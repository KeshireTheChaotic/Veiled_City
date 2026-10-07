/**
 * Discord permission-boundary validation for GM-only and player-private
 * channels. The database visibility model is authoritative for stored data;
 * this module ensures Discord channel configuration does not undermine it.
 */
import { PermissionFlagsBits } from "discord.js";
import { PermissionError } from "../errors.js";

function has(permissionSet, permission) {
  try { return Boolean(permissionSet?.has?.(permission)); } catch { return false; }
}

function roleIsPrivileged(role, gmRoleId) {
  return role?.id === gmRoleId || has(role?.permissions, PermissionFlagsBits.Administrator) || has(role?.permissions, PermissionFlagsBits.ManageGuild);
}

function memberIsPrivileged(member, gmRoleId) {
  return has(member?.permissions, PermissionFlagsBits.Administrator) || has(member?.permissions, PermissionFlagsBits.ManageGuild) || Boolean(gmRoleId && member?.roles?.cache?.has?.(gmRoleId));
}

function effectiveCanView(channel, subject) {
  return has(channel?.permissionsFor?.(subject), PermissionFlagsBits.ViewChannel);
}

function effectiveCanSend(channel, subject) {
  return has(channel?.permissionsFor?.(subject), PermissionFlagsBits.SendMessages);
}

/**
 * Validate that a configured operational channel is not visible through any
 * ordinary guild role. Administrator/Manage Guild roles and the configured GM
 * role are accepted as privileged. Member-specific ViewChannel grants are
 * rejected unless they resolve to a privileged member or the bot itself.
 */
export function assertGmOnlyChannel({ guild, channel, gmRoleId = null, allowedMemberIds = [] }) {
  if (typeof channel?.isTextBased === "function" && !channel.isTextBased()) throw new PermissionError("GM operational channels must be text-based.", { code: "UNSAFE_GM_CHANNEL" });
  const everyone = guild?.roles?.everyone;
  if (everyone && effectiveCanView(channel, everyone)) {
    throw new PermissionError(`${channel} is visible to @everyone. Deny View Channel to @everyone before configuring it as a GM-only channel.`, { code: "UNSAFE_GM_CHANNEL" });
  }

  for (const role of guild?.roles?.cache?.values?.() ?? []) {
    if (role?.id === everyone?.id || roleIsPrivileged(role, gmRoleId)) continue;
    if (effectiveCanView(channel, role)) {
      throw new PermissionError(`${channel} is visible to non-GM role @${role.name}. Remove that role's View Channel access before configuring it as GM-only.`, { code: "UNSAFE_GM_CHANNEL" });
    }
  }

  if (gmRoleId) {
    const gmRole = guild?.roles?.cache?.get?.(gmRoleId);
    if (gmRole && !effectiveCanView(channel, gmRole)) {
      throw new PermissionError(`${channel} is not visible to the configured GM role @${gmRole.name}.`, { code: "GM_CHANNEL_ACCESS" });
    }
  }

  const botMember = guild?.members?.me;
  for (const overwrite of channel?.permissionOverwrites?.cache?.values?.() ?? []) {
    if (Number(overwrite?.type) !== 1 || !has(overwrite?.allow, PermissionFlagsBits.ViewChannel)) continue;
    if (overwrite.id === botMember?.id || allowedMemberIds.includes(overwrite.id)) continue;
    const member = guild?.members?.cache?.get?.(overwrite.id);
    if (!member || !memberIsPrivileged(member, gmRoleId)) {
      throw new PermissionError(`${channel} has a member-specific View Channel grant for a non-GM account. Remove it before using this as a GM-only channel.`, { code: "UNSAFE_GM_CHANNEL" });
    }
  }

  if (botMember && (!effectiveCanView(channel, botMember) || !effectiveCanSend(channel, botMember))) {
    throw new PermissionError(`Veilkeeper cannot view and send messages in ${channel}.`, { code: "BOT_CHANNEL_ACCESS" });
  }
  return true;
}

/**
 * Validate a player's registered private channel. It must be hidden from
 * ordinary guild roles while remaining readable by the player, bot, and GM
 * roles/admins. This function validates; it never mutates Discord permissions.
 */
export function assertPlayerPrivateChannel({ guild, channel, userId, gmRoleId = null }) {
  assertGmOnlyChannel({ guild, channel, gmRoleId, allowedMemberIds: [userId] });
  const member = guild?.members?.cache?.get?.(userId);
  if (member && !effectiveCanView(channel, member)) {
    throw new PermissionError(`${channel} is not visible to you. Grant yourself View Channel before registering it as your private channel.`, { code: "PRIVATE_CHANNEL_ACCESS" });
  }
  return true;
}
