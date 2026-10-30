import {fetchDiagnosticChannel,assertGmOnlyChannel,assertPlayerPrivateChannel} from '../../frameworks/discord/public.js';
import {operationsDiscordDiagnostics} from '../../frameworks/operations/public.js';
/** Original read-only Discord capabilities only; no permission mutation or sends. */
export function connectOperationsDiscordDiagnostics(){return operationsDiscordDiagnostics.bind({fetchDiagnosticChannel,assertGmOnlyChannel,assertPlayerPrivateChannel});}
