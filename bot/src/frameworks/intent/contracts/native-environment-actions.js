import {createFunctionPort} from '../../../kernel/function-port.js';
/** Original Native profile proposal and dispatch services; Intent gains no mechanical policy. */
export const intentNativeEnvironmentActions=createFunctionPort(['applyNativeEnvironmentProfileProposals','executeEnvironmentProposal'],{code:'INTENT_NATIVE_ENVIRONMENT_ACTIONS_COMPOSITION',label:'Intent native environment actions'});
