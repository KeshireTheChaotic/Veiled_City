import {createFunctionPort} from '../../../kernel/function-port.js';
/** World asks Session for pacing advice and mystery configuration without owning story rules. */
export const worldStoryContinuity=createFunctionPort(['pacingAdvice','configureMystery'],{code:'WORLD_STORY_CONTINUITY_COMPOSITION',label:'World story continuity'});
