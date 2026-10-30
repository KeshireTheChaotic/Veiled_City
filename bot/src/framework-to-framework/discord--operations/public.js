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
