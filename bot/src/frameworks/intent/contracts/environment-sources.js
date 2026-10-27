/** Intent's original arbitration origin reader, provided by its composing module at load, and Daggerheart's native environment instance lookup for Intent. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const intentArbitrationOrigin=createFunctionPort(['inspectArbitrationOrigin'],{code:'INTENT_ARBITRATION_ORIGIN_COMPOSITION',label:'Intent arbitration origin'});
export const intentNativeEnvironment=createFunctionPort(['nativeEnvironmentInstanceForScope'],{code:'INTENT_NATIVE_ENVIRONMENT_COMPOSITION',label:'Intent native environment'});
