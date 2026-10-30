import {createFunctionPort} from '../../../kernel/function-port.js';
/** Read-only Discord channel inspection; Operations retains diagnostic issue classification. */
export const operationsDiscordDiagnostics=createFunctionPort(['fetchDiagnosticChannel','assertGmOnlyChannel','assertPlayerPrivateChannel'],{code:'OPERATIONS_DISCORD_DIAGNOSTICS_COMPOSITION',label:'Operations Discord diagnostics'});
