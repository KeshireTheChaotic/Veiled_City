/** Receipt-selected output only. No creation, spending, dice or model prose at a publication sink. */
import {inspectEnvironmentArrival} from './native-environment-arrivals.js';
import {environmentSceneProjection} from './frameworks/daggerheart/public.js';
import {jsonHash as hash} from './kernel/json-hash.js';
import {nativeScenes} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {assertEnvironmentAudience} from './frameworks/daggerheart/public.js';
import {environmentCountdownProjection} from './native-environment-countdown.js';
import {environmentWitnessAccountsProjection} from './native-environment-witnesses.js';
import {createEnvironmentOutputRules} from './frameworks/daggerheart/public.js';
export {environmentOutcomeKinds} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentOutputRules({capabilities:{inspectEnvironmentArrival:(...args)=>inspectEnvironmentArrival(...args),environmentSceneProjection:(...args)=>environmentSceneProjection(...args),hash:(...args)=>hash(...args),currentScene:(...args)=>currentScene(...args),fail:(...args)=>fail(...args),assertEnvironmentAudience:(...args)=>assertEnvironmentAudience(...args),environmentCountdownProjection:(...args)=>environmentCountdownProjection(...args),environmentWitnessAccountsProjection:(...args)=>environmentWitnessAccountsProjection(...args)}});}
export function nativeEnvironmentOutputCandidates(...args){return rules().nativeEnvironmentOutputCandidates(...args);}
export function nativeEnvironmentOutput(...args){return rules().nativeEnvironmentOutput(...args);}
