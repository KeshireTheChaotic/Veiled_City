/** Printed nightclub acoustics: native recovery and odds ancestry, never PC narration or invented resources. */
import {inspectNativeEnvironmentInstance} from './native-environment-instance.js';
import {featureDisposition} from './native-feature-catalog.js';
import {nativeAccessOrdinaryProof} from './contracts/environment-access-peers.js';
const {ordinaryActionProof,ordinaryPrerequisite}=nativeAccessOrdinaryProof;
import {nativeActionConsentSource} from './contracts/action-consent-source.js';
const {historicalActionSource}=nativeActionConsentSource;
import {nativeWorldEvents} from './contracts/world-events.js';
function indexWorldEvent(...args){return nativeWorldEvents.indexWorldEvent(...args);}
import {nativeArbitrationOrigin} from './contracts/environment-sources.js';
const {inspectArbitrationOrigin}=nativeArbitrationOrigin;
import {nativeEnvironmentInstanceForScope} from './native-environment-instance.js';
import {environmentProposalContract} from './native-environment-capabilities.js';
import {captureCountdownActionAncestry,inspectCountdownActionAncestry} from './native-environment-countdown.js';

import {createEnvironmentAcousticRules} from './environment-acoustic-rules.js';
let nativeRules;
function rules(){return nativeRules??=createEnvironmentAcousticRules({capabilities:{inspectNativeEnvironmentInstance:(...args)=>inspectNativeEnvironmentInstance(...args),featureDisposition:(...args)=>featureDisposition(...args),ordinaryActionProof:(...args)=>ordinaryActionProof(...args),ordinaryPrerequisite:(...args)=>ordinaryPrerequisite(...args),historicalActionSource:(...args)=>historicalActionSource(...args),indexWorldEvent:(...args)=>indexWorldEvent(...args),inspectArbitrationOrigin:(...args)=>inspectArbitrationOrigin(...args),nativeEnvironmentInstanceForScope:(...args)=>nativeEnvironmentInstanceForScope(...args),environmentProposalContract:(...args)=>environmentProposalContract(...args),captureCountdownActionAncestry:(...args)=>captureCountdownActionAncestry(...args),inspectCountdownActionAncestry:(...args)=>inspectCountdownActionAncestry(...args)}});}
export function validateEnvironmentOddsProposal(...args){return rules().validateEnvironmentOddsProposal(...args);}
export function clearNativeEnvironmentNoise(...args){return rules().clearNativeEnvironmentNoise(...args);}
export function inspectNativeEnvironmentNoiseClear(...args){return rules().inspectNativeEnvironmentNoiseClear(...args);}
export function nativeEnvironmentNoiseState(...args){return rules().nativeEnvironmentNoiseState(...args);}
export function prepareEnvironmentNoiseOdds(...args){return rules().prepareEnvironmentNoiseOdds(...args);}
export function prepareEnvironmentMemoryOdds(...args){return rules().prepareEnvironmentMemoryOdds(...args);}
export function inspectEnvironmentNoiseOdds(...args){return rules().inspectEnvironmentNoiseOdds(...args);}
