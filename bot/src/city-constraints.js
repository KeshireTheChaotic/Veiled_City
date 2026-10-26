/** Shared availability/delegation guards; preferences never move NPCs or override a human-controlled proxy. */
import { delegationPolicy } from "./ai-intents.js";
import {StateConflictError} from "./kernel/errors.js";
import {nativeWorldStrategyStepAllowed} from './native-world-operations.js';
import {activeCityProxy,worldNativeActorControl} from './frameworks/world/public.js';
export {activeCityProxy} from './frameworks/world/public.js';
/** Negative ownership boundary, not an execution grant. Native domain/source/cost checks remain mandatory. */
export function worldActorControl(...args){return availability().worldActorControl(...args);}
export function assertWorldActorControl(...args){return availability().assertWorldActorControl(...args);}
export function assertNpcAvailability(...args){return availability().assertNpcAvailability(...args);}
export function npcAvailability(...args){return availability().npcAvailability(...args);}
export function assertInstitutionDelegation(...args){return availability().assertInstitutionDelegation(...args);}
/** Chronological exclusion, not a new reservation/currency manager; physical travel never resolves contested title. */
export function assertQueuedCompatibility(...args){return availability().assertQueuedCompatibility(...args);}

import {createWorldAvailability} from './frameworks/world/public.js';
let worldAvailability;
function availability(){return worldAvailability??=createWorldAvailability({nativeActorControl:(...args)=>worldNativeActorControl.nativeActorControl(...args),activeCityProxy:(...args)=>activeCityProxy(...args),delegationPolicy:(...args)=>delegationPolicy(...args),nativeWorldStrategyStepAllowed:(...args)=>nativeWorldStrategyStepAllowed(...args)});}
