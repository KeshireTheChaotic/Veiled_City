import {createFunctionPort} from '../../../kernel/function-port.js';
/** Original native peer proofs, registered by their existing source modules. */
export const nativeAccessOrdinaryProof=createFunctionPort(['ordinaryActionProof','ordinaryPrerequisite'],{code:'NATIVE_ACCESS_ORDINARY_COMPOSITION',label:'Native access ordinary proof'});
export const nativeAccessCountdownAncestry=createFunctionPort(['captureCountdownActionAncestry','inspectCountdownActionAncestry'],{code:'NATIVE_ACCESS_COUNTDOWN_COMPOSITION',label:'Native access countdown ancestry'});
