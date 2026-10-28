import {createFunctionPort} from '../../../kernel/function-port.js';

/** Native rules read World's original autonomous authority, narrative entity creation and input key without changing World's authority. */
export const nativeWorldAutonomy=createFunctionPort(['worldAuthority','establishNarrativeEntity','worldInputKey'],{
 code:'NATIVE_WORLD_AUTONOMY_COMPOSITION',label:'Native World autonomy'
});
