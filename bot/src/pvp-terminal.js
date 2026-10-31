/** Native terminal receipt provider; preserves the caller's transaction. */
import {pvpAttemptKey} from './pvp-authority.js';
import {nativeIntentActionPlan} from './frameworks/daggerheart/public.js';
function transitionAction(...args){return nativeIntentActionPlan.transitionAction(...args);}
import {pendingPvpFear} from './pvp-fear-gate.js';
import {createPvpTerminalRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createPvpTerminalRules({capabilities:{pvpAttemptKey:(...args)=>pvpAttemptKey(...args),transitionAction:(...args)=>transitionAction(...args),pendingPvpFear:(...args)=>pendingPvpFear(...args)}});}
export function settlePvpWindow(...args){return rules().settlePvpWindow(...args);}

import {nativeFearTerminalSource} from './frameworks/daggerheart/public.js';
// Original provider remains fixed; registration executes before runtime Fear calls.
nativeFearTerminalSource.bind({settlePvpWindow});
