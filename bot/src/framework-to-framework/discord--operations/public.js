import {fetchDiagnosticChannel,assertGmOnlyChannel,assertPlayerPrivateChannel} from '../../frameworks/discord/public.js';
import {operationsDiscordDiagnostics} from '../../frameworks/operations/public.js';
/** Original read-only Discord capabilities only; no permission mutation or sends. */
export function connectOperationsDiscordDiagnostics(){return operationsDiscordDiagnostics.bind({fetchDiagnosticChannel,assertGmOnlyChannel,assertPlayerPrivateChannel});}

import {replyWithDiagnosticLines} from '../../frameworks/discord/public.js';
import {runCampaignDiagnostics,formatDiagnostics} from '../../frameworks/operations/public.js';
/** Called only after the application's existing GM guard; read-only original diagnostic service. */
export async function handleDoctorCommand(interaction,db){
  const report=await runCampaignDiagnostics({db,guild:interaction.guild});
  return replyWithDiagnosticLines(interaction,formatDiagnostics(report));
}

import {replyWithCampaignStatus} from '../../frameworks/discord/public.js';
import {validateChannelRouting} from '../../frameworks/operations/public.js';
/** Original status initialization/reads; application composes the restricted Persistence view. */
export function handleCampaignStatusCommand(interaction,store){return replyWithCampaignStatus(interaction,{store,validateChannelRouting});}

import {buildGmOverview,formatGmOverview} from '../../frameworks/operations/public.js';
/** Application retains the original GM guard and fact formatter; Discord retains ordered private replies. */
export async function handleGmOverviewCommand(interaction,db,formatFact){
  return replyWithDiagnosticLines(interaction,formatGmOverview(buildGmOverview(db,interaction.guildId),{formatFact}));
}
