/** World's original verified authoring context, provided by its composing module at load; World keeps every authorship rule. */
import {createFunctionPort} from '../../../kernel/function-port.js';
export const worldAuthoringContext=createFunctionPort(['verifiedWorldAuthoringContext'],{code:'WORLD_AUTHORING_CONTEXT_COMPOSITION',label:'World authoring context'});
