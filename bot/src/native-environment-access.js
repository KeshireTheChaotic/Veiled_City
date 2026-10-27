import {inspectNativeEnvironmentInstance} from './frameworks/daggerheart/public.js';
import {featureDisposition} from './native-feature-catalog.js';
import {ordinaryActionProof,ordinaryPrerequisite} from './ordinary-effect-proof.js';
import {captureCountdownActionAncestry,inspectCountdownActionAncestry} from './native-environment-countdown.js';
import {nativeWorldEstablishedEvidence} from './frameworks/daggerheart/public.js';
const {nativeEstablishedFact}=nativeWorldEstablishedEvidence;
import {nativePrincipals} from './frameworks/daggerheart/public.js';
function conversationPrincipal(...args){return nativePrincipals.conversationPrincipal(...args);}
import {nativeScenes} from './frameworks/daggerheart/public.js';
function currentScene(...args){return nativeScenes.currentScene(...args);}
import {stateRevision} from './kernel/state-revision.js';
import {jsonHash as hash} from './kernel/json-hash.js';
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {createEnvironmentAccessRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentAccessRules({capabilities:{inspectNativeEnvironmentInstance:(...args)=>inspectNativeEnvironmentInstance(...args),featureDisposition:(...args)=>featureDisposition(...args),ordinaryActionProof:(...args)=>ordinaryActionProof(...args),ordinaryPrerequisite:(...args)=>ordinaryPrerequisite(...args),captureCountdownActionAncestry:(...args)=>captureCountdownActionAncestry(...args),inspectCountdownActionAncestry:(...args)=>inspectCountdownActionAncestry(...args),nativeEstablishedFact:(...args)=>nativeEstablishedFact(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),currentScene:(...args)=>currentScene(...args),stateRevision:(...args)=>stateRevision(...args),hash:(...args)=>hash(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),fail:(...args)=>fail(...args)}});}
export function establishEnvironmentAdmission(...args){return rules().establishEnvironmentAdmission(...args);}
export function inspectEnvironmentAdmission(...args){return rules().inspectEnvironmentAdmission(...args);}
export function nativeVipAdmission(...args){return rules().nativeVipAdmission(...args);}
