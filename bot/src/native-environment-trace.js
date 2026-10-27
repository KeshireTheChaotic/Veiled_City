import {inspectArbitrationOrigin,createArbitrationOrigin} from './scene-intent-board.js';
import {buildNarrativeContext} from './narrative-authority-context.js';
import {inspectNativeEnvironmentInstance,nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {featureDisposition} from './native-feature-catalog.js';
import {nativeHouseErratum} from './native-house-errata.js';
import {historicalActionSource,consentAction} from './action-consent.js';
import {ordinaryActionProof,ordinaryPrerequisite} from './ordinary-effect-proof.js';
import {typedRollProof} from './typed-roll-proof.js';
import {conversationPrincipal} from './conversation-principal.js';
import {assertPcCanAct,hopeCap} from './pc-native-eligibility.js';
import {nativeWorldEvents} from './frameworks/daggerheart/public.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {jsonHash as hash} from './kernel/json-hash.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {reserveGmArbitrationNotice} from './native-publications.js';
import {captureCountdownActionAncestry,inspectCountdownActionAncestry} from './native-environment-countdown.js';
import {createEnvironmentTraceRules} from './frameworks/daggerheart/public.js';
let nativeRules;
function nativeTrace(){return nativeRules??=createEnvironmentTraceRules({capabilities:{inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),createArbitrationOrigin:(...args)=>createArbitrationOrigin(...args),buildNarrativeContext:(...args)=>buildNarrativeContext(...args),inspectNativeEnvironmentInstance:(...args)=>inspectNativeEnvironmentInstance(...args),nativeEnvironmentInstanceForScope:(...args)=>nativeEnvironmentInstanceForScope(...args),featureDisposition:(...args)=>featureDisposition(...args),nativeHouseErratum:(...args)=>nativeHouseErratum(...args),historicalActionSource:(...args)=>historicalActionSource(...args),consentAction:(...args)=>consentAction(...args),ordinaryActionProof:(...args)=>ordinaryActionProof(...args),ordinaryPrerequisite:(...args)=>ordinaryPrerequisite(...args),typedRollProof:(...args)=>typedRollProof(...args),conversationPrincipal:(...args)=>conversationPrincipal(...args),assertPcCanAct:(...args)=>assertPcCanAct(...args),hopeCap:(...args)=>hopeCap(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),hash:(...args)=>hash(...args),fail:(...args)=>fail(...args),reserveGmArbitrationNotice:(...args)=>reserveGmArbitrationNotice(...args),captureCountdownActionAncestry:(...args)=>captureCountdownActionAncestry(...args),inspectCountdownActionAncestry:(...args)=>inspectCountdownActionAncestry(...args)}});}
export function registerEnvironmentTraceRisk(...args){return nativeTrace().registerEnvironmentTraceRisk(...args);}
export function captureEnvironmentTrace(...args){return nativeTrace().captureEnvironmentTrace(...args);}
export function traceOfferForRisk(...args){return nativeTrace().traceOfferForRisk(...args);}
export function traceDecisionForOffer(...args){return nativeTrace().traceDecisionForOffer(...args);}
export function prepareEnvironmentTrace(...args){return nativeTrace().prepareEnvironmentTrace(...args);}
export function inspectEnvironmentTrace(...args){return nativeTrace().inspectEnvironmentTrace(...args);}
export function chooseEnvironmentTrace(...args){return nativeTrace().chooseEnvironmentTrace(...args);}
export function inspectEnvironmentTraceResult(...args){return nativeTrace().inspectEnvironmentTraceResult(...args);}
