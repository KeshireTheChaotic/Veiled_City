import {createFunctionPort} from '../../../kernel/function-port.js';

/** Intent checks owner action terminal overlap through the original Session reader. */
export const intentOwnerActionTerminal=createFunctionPort(['overlapsOwnerActionTerminal'],{
 code:'INTENT_OWNER_ACTION_TERMINAL_COMPOSITION',label:'Intent Session owner action terminal'
});
