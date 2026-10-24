import {inspectNativeEnvironmentInstance} from './native-environment-instance.js';
import {featureDisposition} from './native-feature-catalog.js';
import {ordinaryActionProof,ordinaryPrerequisite} from './ordinary-effect-proof.js';
import {captureCountdownActionAncestry,inspectCountdownActionAncestry} from './native-environment-countdown.js';
import {nativeEstablishedFact} from './native-established-fact.js';
import {conversationPrincipal} from './conversation-principal.js';
import {currentScene} from './scene-continuity.js';
import {stateRevision} from './ai-intents.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {indexWorldEvent} from './city-calendar.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {createEnvironmentAccessRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentAccessRules({capabilities:{inspectNativeEnvironmentInstance:(...args)=>inspectNativeEnvironmentInstance(...args),featureDisposition:(...args)=>featureDisposition(...args),ordinaryActionProof:(...args)=>ordinaryActionProof(...args),ordinaryPrerequisite:(...args)=>ordinaryPrerequisite(...args),captureCountdownActionAncestry:(...args)=>captureCountdownActionAncestry(...args),inspectCountdownActionAncestry:(...args)=>inspectCountdownActionAncestry(...args),nativeEstablishedFact:(...args)=>nativeEstablishedFact(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),currentScene:(...args)=>currentScene(...args),stateRevision:(...args)=>stateRevision(...args),hash:(...args)=>hash(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),fail:(...args)=>fail(...args)}});}
export function establishEnvironmentAdmission(...args){return rules().establishEnvironmentAdmission(...args);}
export function inspectEnvironmentAdmission(...args){return rules().inspectEnvironmentAdmission(...args);}
export function nativeVipAdmission(...args){return rules().nativeVipAdmission(...args);}
