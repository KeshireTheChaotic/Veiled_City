import {consentAction} from './action-consent.js';
import {pendingRollRequests} from './roll-requests.js';
import {nativeOutcomeProjection} from './native-outcome-output.js';
import {sceneFictionHash as hash,sceneFictionFailure as fail} from './scene-fiction-context.js';
import {isPvpIntent} from './pvp-authority.js';
import {incomingRollProjection} from './pc-incoming.js';
import {revalidateNarrativeAudience} from './audience-native-v9.js';
import {createMechanicalProjectionRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createMechanicalProjectionRules({capabilities:{consentAction:(...args)=>consentAction(...args),pendingRollRequests:(...args)=>pendingRollRequests(...args),nativeOutcomeProjection:(...args)=>nativeOutcomeProjection(...args),hash:(...args)=>hash(...args),fail:(...args)=>fail(...args),isPvpIntent:(...args)=>isPvpIntent(...args),incomingRollProjection:(...args)=>incomingRollProjection(...args),revalidateNarrativeAudience:(...args)=>revalidateNarrativeAudience(...args)}});}
export function exactTypedRollSelection(...args){return rules().exactTypedRollSelection(...args);}
export function exactTypedPvpSelection(...args){return rules().exactTypedPvpSelection(...args);}
export function nativeMechanicalInput(...args){return rules().nativeMechanicalInput(...args);}
export function nativeMechanicalOutput(...args){return rules().nativeMechanicalOutput(...args);}
